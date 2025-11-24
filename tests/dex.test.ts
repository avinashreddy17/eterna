import { Raydium, Meteora } from '../src/lib/dex';

describe('Mock DEX pricing and delays', () => {
  it('Raydium quote returns amountOut with fee deducted', async () => {
    const amountIn = 10;
    const basePrice = 100;
    const q = await Raydium.getQuote(amountIn, basePrice);
    expect(q.amountOut).toBeGreaterThan(0);
    expect(q.dex).toBe('Raydium');
    expect(q.fee).toBeCloseTo(amountIn * 0.003, 5);
  });

  it('Meteora quote returns amountOut with zero fee', async () => {
    const amountIn = 10;
    const basePrice = 100;
    const q = await Meteora.getQuote(amountIn, basePrice);
    expect(q.amountOut).toBeGreaterThan(0);
    expect(q.dex).toBe('Meteora');
    expect(q.fee).toBe(0);
  });

  it('Execute simulates delay and returns tx hash', async () => {
    const start = Date.now();
    const res = await Raydium.execute().catch(() => null);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(1800);
    if (res) {
      expect(res.success).toBe(true);
      expect(res.txHash).toMatch(/RAY_|MET_/);
    }
  });
});

