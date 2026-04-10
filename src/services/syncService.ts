import { DirectSale } from './db';

export let serverTimeOffset = 0;

// const API_URL = 'https://api.example.com/v1/sales/sync'; // Placeholder for real API

export const processSync = async (sales: DirectSale[]): Promise<DirectSale[]> => {
  // Processar em paralelo para rapidez
  const results = await Promise.all(sales.map(async (sale) => {
    try {
      // Simulação — em produção seria fetch para API real
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        ...sale,
        statusSync: 'synced' as const,
        serverTimestamp: Date.now(),
        syncError: undefined
      };
    } catch (error) {
      return {
        ...sale,
        syncError: error instanceof Error ? error.message : 'Falha na conexão'
      };
    }
  }));
  return results;
};
