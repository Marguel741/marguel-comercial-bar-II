import { DirectSale } from './db';

export let serverTimeOffset = 0;

// const API_URL = 'https://api.example.com/v1/sales/sync'; // Placeholder for real API

export const processSync = async (sales: DirectSale[]): Promise<DirectSale[]> => {
    // Offset real seria calculado com o tempo da resposta do servidor
    // Por agora, mantemos 0 — será corrigido quando houver API real
    serverTimeOffset = 0;

    const results: DirectSale[] = [];

    // Process sequentially to maintain order or handle rate limits, 
    // or use Promise.all for parallel if API supports it.
    // Here we simulate a structure ready for fetch/axios.
    for (const sale of sales) {
        try {
            // STRUCTURE FOR REAL API:
            /*
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sale)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            */

            // SIMULATION (Replace with actual fetch above):
            await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay

            // Success case
            results.push({
                ...sale,
                statusSync: 'synced',
                serverTimestamp: Date.now(),
                syncError: undefined
            });
        } catch (error) {
            // Error case
            results.push({
                ...sale,
                syncError: error instanceof Error ? error.message : 'Falha na conexão'
            });
        }
    }

    return results;
};
