// src/services/db.ts
// F6: Migrado de IndexedDB para Firestore puro
import { db } from '../firebase';
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';

const COL_DIRECT_SALES = 'appdata/direct_sales/records';

export interface CartItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
}

export interface DirectSale {
  id: string;
  uuid: string;
  date: string;
  time: string;
  timestamp: number;
  serverTimestamp?: number;
  attendant: string;
  userId: string;
  deviceId?: string;
  total: number;
  items: CartItem[];
  paymentMethod: 'cash' | 'tpa' | 'transfer';
  statusSync: 'pending' | 'synced' | 'cancelled';
  syncError?: string;
  totalDiscount?: number;
  isSyncTime?: boolean;
}

// Substituição directa das funções IndexedDB por Firestore

export const dbAddSale = async (sale: DirectSale): Promise<void> => {
  const docId = sale.uuid || sale.id;
  await setDoc(doc(db, COL_DIRECT_SALES, docId), {
    ...sale,
    statusSync: 'synced',
    syncedAt: Date.now(),
  });
};

export const dbGetAllSales = async (daysLimit = 40): Promise<DirectSale[]> => {
  const limitTimestamp = Date.now() - (daysLimit * 24 * 60 * 60 * 1000);
  try {
    const q = query(
      collection(db, COL_DIRECT_SALES),
      where('timestamp', '>=', limitTimestamp),
      orderBy('timestamp', 'desc'),
      limit(200)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DirectSale);
  } catch {
    // Fallback sem orderBy (índice pode não existir ainda)
    const snap = await getDocs(collection(db, COL_DIRECT_SALES));
    return snap.docs
      .map(d => d.data() as DirectSale)
      .filter(s => s.timestamp >= limitTimestamp)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
};

export const dbUpdateSale = async (sale: DirectSale): Promise<void> => {
  await setDoc(doc(db, COL_DIRECT_SALES, sale.uuid), {
    ...sale,
    updatedAt: Date.now(),
  });
};

export const dbDeleteSale = async (id: string): Promise<void> => {
  // id pode ser o uuid ou o id local — tentar ambos
  try {
    await deleteDoc(doc(db, COL_DIRECT_SALES, id));
  } catch {
    // Se não encontrar por id, ignorar
  }
};

// openDB mantido como no-op para compatibilidade com código que ainda o chama
export const openDB = async (): Promise<any> => ({ _firestore: true });
