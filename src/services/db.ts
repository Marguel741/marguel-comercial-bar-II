
export interface CartItem {
  name: string;
  qty: number;
  price: number;
}

export interface DirectSale {
  id: string;
  uuid: string; // Unique Immutable ID
  date: string;
  time: string;
  timestamp: number;
  serverTimestamp?: number; // Audit
  attendant: string;
  userId: string; // Audit
  deviceId?: string; // Audit
  total: number;
  items: CartItem[];
  paymentMethod: 'cash' | 'tpa' | 'transfer';
  statusSync: 'pending' | 'synced' | 'cancelled';
  syncError?: string;
  totalDiscount?: number;
  isSyncTime?: boolean;
}

// IndexedDB Helpers
const DB_NAME = 'MarguelDirectSalesDB';
const STORE_NAME = 'sales';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

export const openDB = (retries = 3): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      if (retries > 0) {
        console.warn(`DB Connection failed. Retrying... (${retries} left)`);
        setTimeout(() => {
            openDB(retries - 1).then(resolve).catch(reject);
        }, 500);
      } else {
        const error = new Error("CRITICAL: Failed to open IndexedDB after 3 attempts.");
        if (typeof window !== 'undefined') {
            let event;
            try {
                event = new CustomEvent('db-critical-error', { detail: error });
            } catch (e) {
                event = document.createEvent('CustomEvent');
                (event as any).initCustomEvent('db-critical-error', true, true, error);
            }
            window.dispatchEvent(event);
        }
        reject(error);
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      
      dbInstance.onversionchange = () => {
          dbInstance?.close();
          dbInstance = null;
      };
      
      dbInstance.onclose = () => {
          dbInstance = null;
      };

      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('statusSync', 'statusSync', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

export const dbAddSale = async (sale: DirectSale) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(sale);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const dbGetAllSales = async (daysLimit = 40): Promise<DirectSale[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const limit = Date.now() - (daysLimit * 24 * 60 * 60 * 1000);
    const range = IDBKeyRange.lowerBound(limit);

    const request = index.getAll(range);
    request.onsuccess = () => {
        const results = request.result as DirectSale[];
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

export const dbUpdateSale = async (sale: DirectSale) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(sale);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};
