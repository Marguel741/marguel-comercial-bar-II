import { DirectSale } from './db';

export let serverTimeOffset = 0;

// const API_URL = 'https://api.example.com/v1/sales/sync'; // Placeholder for real API

export const processSync = async (sales: DirectSale[]): Promise<DirectSale[]> => {
  const results: DirectSale[] = [];
  for (const sale of sales) {
    try {
      // Simulação — em produção seria fetch para API real
      await new Promise(resolve => setTimeout(resolve, 100));
      results.push({
        ...sale,
        statusSync: 'synced',
        serverTimestamp: Date.now(),
        syncError: undefined
      });
    } catch (error) {
      results.push({
        ...sale,
        syncError: error instanceof Error ? error.message : 'Falha na conexão'
      });
    }
  }
  return results;
};
