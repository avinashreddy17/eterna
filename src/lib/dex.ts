import { setTimeout } from 'timers/promises';

export interface Quote {
  dex: 'Raydium' | 'Meteora';
  price: number;
  fee: number;
  amountOut: number;
}

export const Raydium = {
  async getQuote(amountIn: number, basePrice: number): Promise<Quote> {
    await setTimeout(200 + Math.random() * 200);
    const priceVar = 0.98 + Math.random() * 0.04;
    const price = basePrice * priceVar;
    const fee = amountIn * 0.003;
    return {
      dex: 'Raydium',
      price,
      fee,
      amountOut: (amountIn * price) - fee
    };
  },

  async execute(): Promise<{ success: boolean; txHash: string }> {
    await setTimeout(2000 + Math.random() * 1000);
    if (Math.random() < 0.05) throw new Error('Raydium execution failed');
    return { success: true, txHash: 'RAY_' + Math.random().toString(36).substring(7) };
  }
};

export const Meteora = {
  async getQuote(amountIn: number, basePrice: number): Promise<Quote> {
    await setTimeout(200 + Math.random() * 200);
    const priceVar = 0.98 + Math.random() * 0.04;
    const price = basePrice * priceVar;
    const fee = 0;
    return {
      dex: 'Meteora',
      price,
      fee,
      amountOut: amountIn * price
    };
  },

  async execute(): Promise<{ success: boolean; txHash: string }> {
    await setTimeout(2000 + Math.random() * 1000);
    if (Math.random() < 0.03) throw new Error('Meteora execution failed');
    return { success: true, txHash: 'MET_' + Math.random().toString(36).substring(7) };
  }
};