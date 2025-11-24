import { Raydium, Meteora, Quote } from './dex';

export async function getBestRoute(amountIn: number): Promise<Quote> {
  const basePrice = 100 + Math.random() * 10;

  const [raydiumQuote, meteoraQuote] = await Promise.all([
    Raydium.getQuote(amountIn, basePrice),
    Meteora.getQuote(amountIn, basePrice)
  ]);

  return raydiumQuote.amountOut > meteoraQuote.amountOut ? raydiumQuote : meteoraQuote;
}