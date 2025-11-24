import WebSocket from 'ws';

// Use global fetch (Node 18+)
const safeFetch = global.fetch;

async function main() {
  const API_URL = 'http://127.0.0.1:3000';
  const WS_URL = 'ws://127.0.0.1:3000';

  console.log('\n🚀 Starting Order Execution Demo...\n');

  // 1. Submit Order
  const orderPayload = {
    tokenIn: 'SOL',
    tokenOut: 'USDC',
    amountIn: 10 + Math.random() * 5, // Random amount between 10-15
    slippagePct: 0.5
  };

  console.log(`1️⃣  Submitting Order: Sell ${orderPayload.amountIn.toFixed(4)} ${orderPayload.tokenIn} for ${orderPayload.tokenOut}...`);

  try {
    if (!safeFetch) {
      throw new Error('Node.js version is too old, please use Node 18+');
    }

    const res = await safeFetch(`${API_URL}/api/orders/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    if (!res.ok) {
      throw new Error(`API Error: ${res.statusText}`);
    }

    const data: any = await res.json();
    const { orderId } = data;
    console.log(`✅ Order Created! ID: ${orderId}`);
    console.log(`2️⃣  Listening for updates via WebSocket...\n`);

    // 2. Connect to WebSocket
    const ws = new WebSocket(`${WS_URL}/ws/orders/${orderId}`);

    ws.on('open', () => {
      console.log('🔌 WebSocket Connected');
    });

    ws.on('message', (data: any) => {
      const event = JSON.parse(data.toString());
      const { status, details } = event;
      
      const timestamp = new Date(event.timestamp).toLocaleTimeString();

      switch (status) {
        case 'routing':
          console.log(`[${timestamp}] 🔄 Finding best route (Raydium vs Meteora)...`);
          break;
        case 'routing_complete':
          console.log(`[${timestamp}] 🛤️  Route Found: ${details.dex} (Best Price)`);
          console.log(`             Expected Output: ${details.amountOut.toFixed(4)} USDC (Fee: ${details.fee.toFixed(4)})`);
          break;
        case 'submitted':
          console.log(`[${timestamp}] 📤 Transaction Submitted to ${details.dex}...`);
          break;
        case 'confirmed':
          console.log(`[${timestamp}] 🎉 Transaction Confirmed!`);
          console.log(`             Tx Hash: ${details.txHash}`);
          console.log(`             Final Amount: ${details.amountOut.toFixed(4)} USDC\n`);
          ws.close();
          process.exit(0);
          break;
        case 'failed':
          console.log(`[${timestamp}] ❌ Transaction Failed: ${details.error}`);
          console.log(`             Retrying...`);
          break;
      }
    });

    ws.on('error', (err: any) => {
      console.error('WS Error:', err);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

main();