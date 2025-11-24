## Order Execution Engine — Mock

Minimal order-execution pipeline that simulates DEX routing and streams live order status over WebSockets. Built to demonstrate routing, queueing, retries, persistence, and real‑time UX.

### What it does
- Market order submission via `POST /api/orders/execute`
- Parallel mock quotes (Raydium, Meteora), pick best after fees
- Simulated execution latency (~2–3s), random failures with retries
- Events persisted in Postgres and streamed over WebSocket per order
- Queue/worker concurrency with BullMQ (Redis/Valkey)

## Design decisions (brief)
- **Market orders**: simplest flow to showcase routing + execution.
- **Mock DEXs**: controlled variance, deterministic tests, no on‑chain deps.
- **BullMQ + Redis**: robust job/retry semantics, scalable workers.
- **Postgres**: audit trail (`orders`, `order_events`, `order_attempts`).
- **WS upgrade (ws)**: direct upgrade avoids framework-version quirks; includes event replay for late subscribers.

## Architecture (high level)
- API (Fastify)
  - `POST /api/orders/execute` → validate → persist → enqueue
  - `wss:/ws/orders/:orderId` → stream events (replay + live)
- Worker (BullMQ)
  - lifecycle: pending → routing → routing_complete → submitted → confirmed/failed(+retries)
  - publishes every step to Redis pub/sub and DB

## Data model (minimal)
- `orders(id, token_in, token_out, amount_in, slippage_pct, status, created_at)`
- `order_events(id, order_id, status, details, timestamp)`
- `order_attempts(id, order_id, attempt_no, result, tx_hash, error, timestamp)`

## Local setup
1) Prereqs: Node 18+, Postgres, Redis (or Valkey).  
2) Env (`.env` or Render env vars):
   - `PORT=3000`
   - `DATABASE_URL=postgres://…`
   - Prefer one of:
     - `REDIS_URL=rediss://default:PASSWORD@HOST:PORT`
     - or `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS=true`
3) Install & run:
   - `npm install`
   - `npm run build`
   - Create schema once: `node dist/db/setup.js`
   - Start both (dev, separate):
     - API: `npm run dev`
     - Worker: `npm run worker`

## API
- POST `/api/orders/execute`
  - body:
    - `{"tokenIn":"SOL","tokenOut":"USDC","amountIn":10,"slippagePct":0.5}`
  - response: `{"orderId":"..." , "status":"pending"}`

- WS `wss:/ws/orders/:orderId`
  - messages:
    - `{"orderId":"...","status":"routing","details":{},"timestamp":"..."}`
    - `{"status":"routing_complete","details":{"dex":"Raydium|Meteora","amountOut":...,"fee":...}}`
    - `{"status":"submitted","details":{"dex":"..."}}`
    - `{"status":"confirmed","details":{"txHash":"...","amountOut":...}}`
  - Expect ~200–400ms to routing_complete; ~2–3s to confirmed.

## Tests
- `npm test` (Jest + ts‑jest).  
  Covers mock pricing behaviour and best‑route selection.

## Deploy on Render (Free, single service)
- Build: `npm install --include=dev --no-audit --no-fund && npm run build`
- Start: `sh -c "node dist/db/setup.js && node dist/worker/index.js & node dist/api/server.js"`
- Env:
  - `DATABASE_URL` = Render Postgres External URL
  - `REDIS_URL` = Valkey External (or Internal) URL including password
  - `NODE_ENV=production`
- Valkey (Render Key‑Value):
  - EITHER allow external (add your service outbound CIDRs) and use External URL
  - OR place both services on the same private network and use Internal URL

## Demo checklist
- Submit order in Postman → copy `orderId`
- Connect WS (Postman WS / wscat) to `/ws/orders/:orderId`
- Watch: routing → routing_complete → submitted → confirmed
- Show worker logs (“Job … completed”) and DB rows (`orders`, `order_events`)

## Limitations & next steps
- Prices/latency are simulated; no on‑chain or AMM math.
- No auth/rate‑limits; add if exposing publicly.
- Add `/healthz`, richer metrics, and configurable slippage/risk limits.
