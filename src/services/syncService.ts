
import { DirectSale } from './db';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export let serverTimeOffset = 0;

export const processSync = async (sales: DirectSale[]): Promise<DirectSale[]> => {
  const results = await Promise.all(sales.map(async (sale) => {
    try {
      await setDoc(doc(db, 'appdata/direct_sales/records', sale.uuid), {
        ...sale,
        syncedAt: Date.now(),
      });
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
