import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { WebSocketServer } from 'ws';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { orderQueue } from '../lib/queue';
import { pool } from '../db';
import { redisSub } from '../lib/redis';

const fastify = Fastify({ logger: true });

fastify.register(cors);
fastify.register(websocket);

const wss = new WebSocketServer({ noServer: true });
fastify.server.on('upgrade', (request: any, socket: any, head: any) => {
  const urlStr: string = typeof request.url === 'string' ? request.url : '';
  if (!urlStr.startsWith('/ws/orders/')) return;
  wss.handleUpgrade(request, socket, head, (ws: any) => {
    const slashIdx = urlStr.lastIndexOf('/');
    const rawId = slashIdx >= 0 ? urlStr.substring(slashIdx + 1) : '';
    const qIdx = rawId.indexOf('?');
    const orderId = qIdx >= 0 ? rawId.substring(0, qIdx) : rawId;
    const channel = `order:${orderId}`;
    (async () => {
      const existing = await pool.query('SELECT status, details, timestamp FROM order_events WHERE order_id = $1 ORDER BY timestamp ASC', [orderId]);
      for (const row of existing.rows) {
        ws.send(JSON.stringify({ orderId, status: row.status, details: row.details || {}, timestamp: row.timestamp }));
      }
      await redisSub.subscribe(channel);
      const onMessage = (chan: string, message: string) => {
        if (chan === channel) ws.send(message);
      };
      redisSub.on('message', onMessage);
      ws.on('close', async () => {
        if ((redisSub as any).off) {
          (redisSub as any).off('message', onMessage);
        } else {
          (redisSub as any).removeListener('message', onMessage);
        }
        await redisSub.unsubscribe(channel);
      });
    })();
  });
});

const orderSchema = z.object({
  tokenIn: z.string(),
  tokenOut: z.string(),
  amountIn: z.number().positive(),
  slippagePct: z.number().min(0).max(100)
});

fastify.post('/api/orders/execute', async (request, reply) => {
  const result = orderSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send(result.error);
  }

  const { tokenIn, tokenOut, amountIn, slippagePct } = result.data;
  const orderId = uuidv4();

  await pool.query(
    'INSERT INTO orders (id, token_in, token_out, amount_in, slippage_pct, status) VALUES ($1, $2, $3, $4, $5, $6)',
    [orderId, tokenIn, tokenOut, amountIn, slippagePct, 'pending']
  );

  await orderQueue.add('execute-order', {
    orderId,
    tokenIn,
    tokenOut,
    amountIn
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  });

  return { orderId, status: 'pending' };
});

fastify.get('/ws/orders/:orderId', { websocket: true }, () => {});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
