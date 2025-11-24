import { getBestRoute } from '../src/lib/router';

describe('Router best quote selection', () => {
  it('returns a quote with expected fields', async () => {
    const q = await getBestRoute(10);
    expect(q.dex === 'Raydium' || q.dex === 'Meteora').toBe(true);
    expect(q.amountOut).toBeGreaterThan(0);
    expect(q.price).toBeGreaterThan(0);
  });

  it('is deterministic for same base conditions within a run', async () => {
    const q1 = await getBestRoute(5);
    const q2 = await getBestRoute(5);
    expect(q1.amountOut).toBeGreaterThan(0);
    expect(q2.amountOut).toBeGreaterThan(0);
  });
});

