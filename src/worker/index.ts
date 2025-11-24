import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { pool } from '../db';
import { getBestRoute } from '../lib/router';
import { Raydium, Meteora } from '../lib/dex';
import { ORDER_QUEUE_NAME } from '../lib/queue';

interface OrderJob {
  orderId: string;
  amountIn: number;
  tokenIn: string;
  tokenOut: string;
}

async function updateStatus(orderId: string, status: string, details: any = {}) {
  await pool.query(
    'INSERT INTO order_events (order_id, status, details) VALUES ($1, $2, $3)',
    [orderId, status, details]
  );
  
  await pool.query(
    'UPDATE orders SET status = $1 WHERE id = $2',
    [status, orderId]
  );

  await redis.publish(`order:${orderId}`, JSON.stringify({ orderId, status, details, timestamp: new Date() }));
}

const worker = new Worker(ORDER_QUEUE_NAME, async (job: Job<OrderJob>) => {
  const { orderId, amountIn } = job.data;

  try {
    await updateStatus(orderId, 'routing');
    
    const bestQuote = await getBestRoute(amountIn);
    
    await updateStatus(orderId, 'routing_complete', bestQuote);

    await updateStatus(orderId, 'submitted', { dex: bestQuote.dex });

    let txHash;
    if (bestQuote.dex === 'Raydium') {
      const res = await Raydium.execute();
      txHash = res.txHash;
    } else {
      const res = await Meteora.execute();
      txHash = res.txHash;
    }

    await updateStatus(orderId, 'confirmed', { txHash, amountOut: bestQuote.amountOut });
    
    await pool.query(
      'INSERT INTO order_attempts (order_id, attempt_no, result, tx_hash) VALUES ($1, $2, $3, $4)',
      [orderId, job.attemptsMade + 1, 'success', txHash]
    );

  } catch (err: any) {
    await pool.query(
      'INSERT INTO order_attempts (order_id, attempt_no, result, error) VALUES ($1, $2, $3, $4)',
      [orderId, job.attemptsMade + 1, 'failure', err.message]
    );
    throw err; 
  }
}, {
  connection: redis,
  concurrency: 10
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', async (job, err) => {
  console.log(`Job ${job?.id} failed: ${err.message}`);
  if (job) {
     await updateStatus(job.data.orderId, 'failed', { error: err.message });
  }
});

console.log('Worker started');
