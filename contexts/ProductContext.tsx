
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Product, PurchaseRecord, Transaction, SalesReport, Expense, InventoryLog, PriceHistoryLog, Equipment, Card, StockOperationLog, AuditLog } from '../types';

const INITIAL_PRODUCTS: Product[] = [
  { id: 'pepsi', name: 'Pepsi', sellPrice: 500, buyPrice: 250, stock: 0, minStock: 24, category: 'Refrigerantes', packSize: 24, packType: 'Grade' },
  { id: 'sumol', name: 'Sumol', sellPrice: 500, buyPrice: 250, stock: 0, minStock: 24, category: 'Refrigerantes', packSize: 24, packType: 'Grade' },
  { id: 'top', name: 'Top', sellPrice: 500, buyPrice: 250, stock: 0, minStock: 24, category: 'Refrigerantes', packSize: 24, packType: 'Grade' },
  { id: 'yala', name: 'Yala', sellPrice: 800, buyPrice: 400, stock: 0, minStock: 5, category: 'Refrigerantes — Bidon', packSize: 12, packType: 'Embalagem' },
  { id: 'cuca', name: 'Cuca', sellPrice: 300, buyPrice: 150, stock: 0, minStock: 24, category: 'Cervejas', packSize: 24, packType: 'Grade' },
  { id: 'nocal', name: 'Nocal', sellPrice: 300, buyPrice: 150, stock: 0, minStock: 24, category: 'Cervejas', packSize: 24, packType: 'Grade' },
  { id: 'doppel', name: 'Doppel', sellPrice: 400, buyPrice: 200, stock: 0, minStock: 24, category: 'Cervejas', packSize: 24, packType: 'Grade' },
  { id: 'eka', name: 'Eka', sellPrice: 300, buyPrice: 150, stock: 0, minStock: 24, category: 'Cervejas', packSize: 24, packType: 'Grade' },
  { id: 'booster', name: 'Booster', sellPrice: 400, buyPrice: 200, stock: 0, minStock: 24, category: 'Cervejas', packSize: 24, packType: 'Grade' },
  { id: 'cuca_lata', name: 'Cuca em Lata', sellPrice: 250, buyPrice: 125, stock: 0, minStock: 24, category: 'Cervejas — Lata', packSize: 24, packType: 'Grade' },
  { id: 'booster_lata', name: 'Booster em Lata', sellPrice: 500, buyPrice: 375, stock: 0, minStock: 24, category: 'Cervejas — Lata', packSize: 24, packType: 'Grade' },
  { id: 'vinho_pct', name: 'Vinho Fresco Pacote', sellPrice: 200, buyPrice: 100, stock: 0, minStock: 10, category: 'Vinhos', packSize: 24, packType: 'Grade' },
  { id: 'vinho_bidon', name: 'Vinho Fresco Bidon', sellPrice: 1000, buyPrice: 500, stock: 0, minStock: 5, category: 'Vinhos', packSize: 12, packType: 'Embalagem' },
  { id: 'vinho_festa', name: 'Vinho Festa da Vida', sellPrice: 1200, buyPrice: 600, stock: 0, minStock: 5, category: 'Vinhos', packSize: 24, packType: 'Embalagem' },
  { id: 'vinho_forte', name: 'Vinho Forte', sellPrice: 1200, buyPrice: 600, stock: 0, minStock: 5, category: 'Vinhos', packSize: 12, packType: 'Caixa' },
  { id: 'valmonte', name: 'Valmonte', sellPrice: 1500, buyPrice: 750, stock: 0, minStock: 5, category: 'Vinhos', packSize: 24, packType: 'Grade' },
  { id: 'nkolo', name: 'Nkolo Mboka', sellPrice: 1500, buyPrice: 750, stock: 0, minStock: 5, category: 'Vinhos', packSize: 24, packType: 'Grade' },
  { id: 'caporroto', name: 'Caporroto', sellPrice: 500, buyPrice: 250, stock: 0, minStock: 10, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'chefe_grande', name: 'Chefe Grande', sellPrice: 800, buyPrice: 400, stock: 0, minStock: 10, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'palanca', name: 'Palanca', sellPrice: 800, buyPrice: 400, stock: 0, minStock: 10, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'dr_gin', name: 'Dr. Gin', sellPrice: 1200, buyPrice: 600, stock: 0, minStock: 5, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'cavalo', name: 'Cavalo Famoso', sellPrice: 1000, buyPrice: 500, stock: 0, minStock: 5, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'indica_peq', name: 'Indica Pequeno', sellPrice: 150, buyPrice: 75, stock: 0, minStock: 10, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'indica_grd', name: 'Indica Grande', sellPrice: 300, buyPrice: 150, stock: 0, minStock: 10, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'dia_noite', name: 'Dia e Noite', sellPrice: 800, buyPrice: 400, stock: 0, minStock: 5, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'festa', name: 'Festa', sellPrice: 1500, buyPrice: 750, stock: 0, minStock: 5, category: 'Espirituosas', packSize: 24, packType: 'Embalagem' },
  { id: 'fast_peq', name: 'Fast Pequeno', sellPrice: 200, buyPrice: 100, stock: 0, minStock: 24, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'fast_grd', name: 'Fast Grande', sellPrice: 400, buyPrice: 200, stock: 0, minStock: 24, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'gin_gordons', name: 'Gin Gordons', sellPrice: 3000, buyPrice: 1500, stock: 0, minStock: 2, category: 'Gin & Vodka', packSize: 24, packType: 'Grade' },
  { id: 'smirnoff', name: 'Smirnoff', sellPrice: 2500, buyPrice: 1250, stock: 0, minStock: 2, category: 'Gin & Vodka', packSize: 24, packType: 'Grade' },
  { id: 'agua', name: 'Água', sellPrice: 100, buyPrice: 50, stock: 0, minStock: 24, category: 'Águas', packSize: 24, packType: 'Embalagem' },
  { id: 'speed', name: 'Speed', sellPrice: 400, buyPrice: 200, stock: 0, minStock: 24, category: 'Energéticos', packSize: 12, packType: 'Embalagem' },
  { id: 'kombucha', name: 'Kombucha', sellPrice: 500, buyPrice: 250, stock: 0, minStock: 10, category: 'Energéticos', packSize: 24, packType: 'Grade' },
  { id: 'copos_peq', name: 'Copos Pequenos', sellPrice: 50, buyPrice: 25, stock: 0, minStock: 50, category: 'Descartáveis', packSize: 50, packType: 'Embalagem' },
  { id: 'copos_grd', name: 'Copos Grandes', sellPrice: 100, buyPrice: 50, stock: 0, minStock: 50, category: 'Descartáveis', packSize: 50, packType: 'Embalagem' },
];

const INITIAL_CATEGORIES = [
  'Refrigerantes', 'Refrigerantes — Bidon', 'Cervejas', 'Cervejas — Lata',
  'Vinhos', 'Espirituosas', 'Gin & Vodka', 'Águas', 'Energéticos', 'Descartáveis'
];

interface PendingAction {
  id: string;
  type: 'ADD_SALE' | 'UPDATE_STOCK' | 'ADD_EXPENSE';
  payload: any;
  timestamp: number;
}

interface ProductContextType {
  products: Product[];
  categories: string[];
  purchases: PurchaseRecord[];
  currentBalance: number;
  savingsBalance: number;
  cashBalance: number;
  tpaBalance: number;
  cards: Card[];
  transactions: Transaction[];
  salesReports: SalesReport[];
  expenses: Expense[];
  inventoryHistory: InventoryLog[];
  auditLogs: AuditLog[];
  stockOperationHistory: StockOperationLog[];
  priceHistory: PriceHistoryLog[];
  systemDate: Date;
  lockedDays: string[];
  equipments: Equipment[];
  
  setSystemDate: (date: Date) => void;
  toggleDayLock: (dateStr: string) => void;
  isDayLocked: (date: Date | string) => boolean;

  addExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  updateExpense: (updated: Expense) => void;
  addInventoryLog: (log: InventoryLog) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addCategory: (category: string) => void;
  editCategory: (oldName: string, newName: string) => Promise<void>;
  removeCategory: (category: string) => void;
  addPurchase: (items: Record<string, number>, source: 'Prices' | 'Inventory' | 'Sales', completedBy: string, attachments?: string[]) => void;
  getPurchasesByDate: (dateStr: string) => Record<string, number>;
  getTodayPurchases: () => Record<string, number>;
  processTransaction: (type: 'deposit' | 'withdraw', account: 'main' | 'savings' | string, amount: number, description: string, category?: string, referenceId?: string, referenceType?: Transaction['referenceType'], performedBy?: string) => void;
  processCashTPADebit: (origin: 'Cash' | 'TPA', amount: number, note: string, referenceId?: string, referenceType?: Transaction['referenceType'], performedBy?: string) => void;
  addSalesReport: (report: SalesReport) => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  addEquipment: (equipment: Omit<Equipment, 'id' | 'prevQty'>) => void;
  updateEquipment: (id: string, updates: Partial<Equipment>) => void;
  updateEquipmentQty: (id: string, newQty: number) => void;
  removeEquipment: (id: string) => void;
  addCard: (card: Omit<Card, 'id'>) => void;
  updateCard: (id: string, updates: Partial<Card>) => void;
  deleteCard: (id: string) => void;
  isSyncing: boolean;
  hasPendingChanges: boolean;
  syncData: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [systemDate, setSystemDateState] = useState<Date>(() => {
    const saved = localStorage.getItem('mg_system_date');
    return saved ? new Date(saved) : new Date();
  });

  const setSystemDate = (date: Date) => {
    setSystemDateState(date);
    localStorage.setItem('mg_system_date', date.toISOString());
  };

  const getSystemDateStr = () => systemDate.toLocaleDateString('pt-AO');

  const [lockedDays, setLockedDays] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mg_locked_days');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('mg_locked_days', JSON.stringify(lockedDays)); }, [lockedDays]);

  const toggleDayLock = (dateStr: string) => {
    setLockedDays(prev => {
      if (prev.includes(dateStr)) return prev.filter(d => d !== dateStr);
      return [...prev, dateStr];
    });
  };

  const isDayLocked = (date: Date | string) => {
    let checkDateStr = '';
    if (date instanceof Date) checkDateStr = date.toLocaleDateString('pt-AO');
    else checkDateStr = date.includes('T') ? new Date(date).toLocaleDateString('pt-AO') : date;
    return lockedDays.includes(checkDateStr);
  };

  const [syncQueue, setSyncQueue] = useState<PendingAction[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const savedQueue = localStorage.getItem('mg_sync_queue');
    if (savedQueue) setSyncQueue(JSON.parse(savedQueue));
  }, []);

  useEffect(() => {
    localStorage.setItem('mg_sync_queue', JSON.stringify(syncQueue));
  }, [syncQueue]);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const processSyncQueue = async () => {
    if (syncQueue.length === 0) return;
    console.log('Processing sync queue:', syncQueue);
    // TODO: Implement actual sync logic here
    // For now, we clear the queue to simulate processing
    setSyncQueue([]);
  };

  useEffect(() => {
    if (navigator.onLine && syncQueue.length > 0) {
      processSyncQueue();
    }
  }, [syncQueue, isOnline]);

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('mg_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch { return INITIAL_PRODUCTS; }
  });

  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => {
    try {
      const saved = localStorage.getItem('mg_purchases');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem('mg_expenses');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.map((item: any) => ({
        ...item,
        attachments: item.attachments || (item.attachment ? [item.attachment] : [])
      }));
    } catch { return []; }
  });

  const [inventoryHistory, setInventoryHistory] = useState<InventoryLog[]>(() => {
    try {
      const saved = localStorage.getItem('mg_inventory_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('mg_audit_logs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [stockOperationHistory, setStockOperationHistory] = useState<StockOperationLog[]>(() => {
    try {
      const saved = localStorage.getItem('mg_stock_operation_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [priceHistory, setPriceHistory] = useState<PriceHistoryLog[]>(() => {
      try {
        const saved = localStorage.getItem('mg_price_history');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });

  const [currentBalance, setCurrentBalance] = useState<number>(() => {
    const saved = localStorage.getItem('mg_current_balance');
    return saved ? parseFloat(saved) : 1250000;
  });

  const [savingsBalance, setSavingsBalance] = useState<number>(() => {
    const saved = localStorage.getItem('mg_savings_balance');
    return saved ? parseFloat(saved) : 500000;
  });

  const [cashBalance, setCashBalance] = useState<number>(() => {
    const saved = localStorage.getItem('mg_cash_balance');
    return saved ? parseFloat(saved) : 850000;
  });

  const [tpaBalance, setTPABalance] = useState<number>(() => {
    const saved = localStorage.getItem('mg_tpa_balance');
    return saved ? parseFloat(saved) : 400000;
  });

  const [cards, setCards] = useState<Card[]>(() => {
    try {
      const saved = localStorage.getItem('mg_cards');
      if (saved) return JSON.parse(saved);
      
      // Default cards
      return [
        {
          id: 'main',
          name: 'Conta Corrente',
          holder: 'Marguel Bar',
          balance: 1250000,
          color: 'bg-gradient-to-bl from-[#003366] via-[#004488] to-[#0054A6]',
          type: 'Corrente',
          validity: '12/28'
        },
        {
          id: 'savings',
          name: 'Marguel Reserve',
          holder: 'Marguel Reserve',
          balance: 500000,
          color: 'bg-gradient-to-br from-[#F5DF4D] via-[#D4AF37] to-[#AA6C39]',
          type: 'Poupança',
          validity: '06/30'
        }
      ];
    } catch { return []; }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('mg_transactions');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [salesReports, setSalesReports] = useState<SalesReport[]>(() => {
    try {
      const saved = localStorage.getItem('mg_sales_reports');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('mg_audit_logs', JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem('mg_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('mg_purchases', JSON.stringify(purchases)); }, [purchases]);
  useEffect(() => { localStorage.setItem('mg_expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('mg_inventory_history', JSON.stringify(inventoryHistory)); }, [inventoryHistory]);
  useEffect(() => { localStorage.setItem('mg_stock_operation_history', JSON.stringify(stockOperationHistory)); }, [stockOperationHistory]);
  useEffect(() => { localStorage.setItem('mg_current_balance', currentBalance.toString()); }, [currentBalance]);
  useEffect(() => { localStorage.setItem('mg_savings_balance', savingsBalance.toString()); }, [savingsBalance]);
  useEffect(() => { localStorage.setItem('mg_cash_balance', cashBalance.toString()); }, [cashBalance]);
  useEffect(() => { localStorage.setItem('mg_tpa_balance', tpaBalance.toString()); }, [tpaBalance]);
  useEffect(() => { localStorage.setItem('mg_cards', JSON.stringify(cards)); }, [cards]);
  useEffect(() => { localStorage.setItem('mg_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('mg_sales_reports', JSON.stringify(salesReports)); }, [salesReports]);
  
  useEffect(() => {
      const handleStorage = () => {
          const saved = localStorage.getItem('mg_price_history');
          if(saved) setPriceHistory(JSON.parse(saved));
      };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addExpense = (expense: Expense) => setExpenses(prev => [expense, ...prev]);
  const deleteExpense = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));
  const updateExpense = (updated: Expense) => setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
  const addInventoryLog = (log: InventoryLog) => setInventoryHistory(prev => [log, ...prev]);

  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct = { ...product, id: Math.random().toString(36).substr(2, 9) };
    setProducts(prev => [...prev, newProduct]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prevProducts => prevProducts.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addCategory = (category: string) => {
    if (!categories.includes(category)) setCategories([...categories, category].sort());
  };

  const editCategory = useCallback(async (oldName: string, newName: string) => {
    if (!newName || oldName === newName) return;

    // 1. Atualiza a lista de categorias
    setCategories(prev => prev.map(cat => cat === oldName ? newName : cat));

    // 2. Realoca todos os produtos da categoria antiga para a nova
    setProducts(prevProducts => 
      prevProducts.map(prod => 
        prod.category === oldName ? { ...prod, category: newName } : prod
      )
    );

    // 3. Marcar para sincronização
    setHasPendingChanges(true);
    
    // Aqui você chamaria o dbUpdate para persistir no IndexedDB/Backend
  }, [setCategories, setProducts]);

  const removeCategory = (category: string) => {
    setCategories(categories.filter(c => c !== category));
  };

  const processTransaction = (
    type: 'deposit' | 'withdraw', 
    account: 'main' | 'savings' | string, 
    amount: number, 
    description: string, 
    category?: string, 
    referenceId?: string, 
    referenceType?: Transaction['referenceType'],
    performedBy?: string
  ) => {
    let accountName = '';
    
    if (account === 'main') {
      setCurrentBalance(prev => type === 'deposit' ? prev + amount : prev - amount);
      accountName = 'Conta Corrente';
      // Sync with cards array
      setCards(prev => prev.map(c => c.id === 'main' ? { ...c, balance: type === 'deposit' ? c.balance + amount : c.balance - amount } : c));
    } else if (account === 'savings') {
      setSavingsBalance(prev => type === 'deposit' ? prev + amount : prev - amount);
      accountName = 'Conta Poupança';
      // Sync with cards array
      setCards(prev => prev.map(c => c.id === 'savings' ? { ...c, balance: type === 'deposit' ? c.balance + amount : c.balance - amount } : c));
    } else {
      // Custom card
      setCards(prev => prev.map(c => {
        if (c.id === account) {
          accountName = c.name;
          return { ...c, balance: type === 'deposit' ? c.balance + amount : c.balance - amount };
        }
        return c;
      }));
    }

    const newTrans: Transaction = {
      id: Date.now().toString(),
      type: type === 'deposit' ? 'entrada' : 'saida',
      category: category || accountName || 'Cartão',
      amount: amount,
      date: systemDate.toLocaleDateString('pt-AO', {day:'2-digit', month:'short'}) + ', ' + systemDate.toLocaleTimeString('pt-AO', {hour:'2-digit', minute:'2-digit'}),
      description: description,
      referenceId,
      referenceType,
      performedBy
    };

    setTransactions(prev => [newTrans, ...prev]);
  };

  const processCashTPADebit = (origin: 'Cash' | 'TPA', amount: number, note: string, referenceId?: string, referenceType?: Transaction['referenceType'], performedBy?: string) => {
    if (origin === 'Cash') {
      setCashBalance(prev => prev - amount);
    } else {
      setTPABalance(prev => prev - amount);
    }

    const newTrans: Transaction = {
      id: Date.now().toString(),
      type: 'saida',
      category: `Débito ${origin}`,
      amount: amount,
      date: systemDate.toLocaleDateString('pt-AO', {day:'2-digit', month:'short'}) + ', ' + systemDate.toLocaleTimeString('pt-AO', {hour:'2-digit', minute:'2-digit'}),
      description: note,
      referenceId,
      referenceType,
      performedBy
    };

    setTransactions(prev => [newTrans, ...prev]);
  };

  const addPurchase = (items: Record<string, number>, source: 'Prices' | 'Inventory' | 'Sales', completedBy: string, attachments?: string[]) => {
    let totalValue = 0;
    const purchaseId = crypto.randomUUID();
    const now = new Date();
    const purchaseDate = new Date(systemDate);
    purchaseDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const logs: StockOperationLog[] = [];

    // 1. Calcular total e preparar logs de auditoria (Fórmula Correta e Conversão Controlada)
    products.forEach(p => {
      if (items[p.id]) {
        const qtyPacks = items[p.id];
        const packSize = p.packSize || 1; // Respeita packSize do cadastro
        const unitsToAdd = qtyPacks * packSize;
        const packCost = p.buyPrice * packSize;
        
        totalValue += packCost * qtyPacks;
        
        logs.push({
          id: crypto.randomUUID(),
          productId: p.id,
          productName: p.name,
          type: 'PURCHASE',
          qtyBefore: p.stock,
          qtyAdded: unitsToAdd,
          qtyAfter: p.stock + unitsToAdd,
          timestamp: purchaseDate.getTime(),
          performedBy: completedBy,
          referenceId: purchaseId
        });
      }
    });

    // 2. Atualização de Estoque (Atómica via State Update)
    setProducts(prevProducts => prevProducts.map(p => {
      if (items[p.id]) {
        const qtyPacks = items[p.id];
        const packSize = p.packSize || 1;
        const unitsToAdd = qtyPacks * packSize;
        return { ...p, stock: p.stock + unitsToAdd };
      }
      return p;
    }));

    // 3. Registro da Compra
    const newRecord: PurchaseRecord = {
      id: purchaseId,
      name: source === 'Inventory' ? 'Ajuste de Stock (Inventário)' : source === 'Sales' ? 'Compra Rápida (Vendas)' : `Compra Efectuada`,
      date: getSystemDateStr(),
      items, 
      total: totalValue,
      completedBy,
      timestamp: purchaseDate.getTime(),
      source,
      attachments,
      synced: false
    };

    setPurchases(prev => [newRecord, ...prev]);
    setStockOperationHistory(prev => [...logs, ...prev]);

    // 4. Débito Financeiro
    if (totalValue > 0) {
        processTransaction('withdraw', 'main', totalValue, 'Compra de estoque', 'Compra de Estoque', purchaseId, 'purchase', completedBy);
    }

    // 5. Fila de Sincronização
    setSyncQueue(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'UPDATE_STOCK',
      payload: newRecord,
      timestamp: Date.now()
    }]);
  };

  const getPurchasesByDate = (dateStr: string) => {
    const targetDate = dateStr;
    const records = purchases.filter(p => p.date === targetDate);
    const totals: Record<string, number> = {};
    records.forEach(record => {
      Object.entries(record.items).forEach(([id, qtyPacks]) => {
        const p = products.find(prod => prod.id === id);
        const units = Number(qtyPacks) * (p?.packSize || 1);
        totals[id] = (totals[id] || 0) + units;
      });
    });
    return totals;
  };

  const getTodayPurchases = () => getPurchasesByDate(getSystemDateStr());

  const addSalesReport = (report: SalesReport) => {
    const finalReport = { 
      ...report, 
      id: report.id || crypto.randomUUID(),
      synced: false 
    };

    setSalesReports(prev => [finalReport, ...prev]);

    const action: PendingAction = {
      id: crypto.randomUUID(),
      type: 'ADD_SALE',
      payload: finalReport,
      timestamp: Date.now()
    };
    setSyncQueue(prev => [...prev, action]);
  };

  const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const newLog: AuditLog = {
      ...log,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const [equipments, setEquipments] = useState<Equipment[]>(() => {
    try {
        const saved = localStorage.getItem('@Marguel:equipments');
        return saved ? JSON.parse(saved) : [
            { id: '1', name: 'Mesas', qty: 20, prevQty: 20, status: 'Operacional' },
            { id: '2', name: 'Cadeiras', qty: 80, prevQty: 80, status: 'Operacional' },
            { id: '3', name: 'Grades (Vazias)', qty: 50, prevQty: 48, status: 'Operacional' },
            { id: '4', name: 'Vasilhames', qty: 1200, prevQty: 1200, status: 'Operacional' },
            { id: '5', name: 'Chaves de Abrir', qty: 10, prevQty: 12, status: 'Operacional' },
            { id: '6', name: 'Freezer Vertical', qty: 3, prevQty: 3, status: 'Operacional' }
        ];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('@Marguel:equipments', JSON.stringify(equipments));
  }, [equipments]);

  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const markAsPending = () => {
    if (!navigator.onLine) {
      setHasPendingChanges(true);
      localStorage.setItem('@Marguel:needsSync', 'true');
    }
  };

  const syncData = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      // SUBSTITUIR PELO SEU FETCH NO FUTURO:
      // const response = await fetch('/api/sync', { method: 'POST', body: JSON.stringify(products) });
      // if (!response.ok) throw new Error();
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulação
      setHasPendingChanges(false);
    } catch (error) {
      console.error("Erro ao sincronizar", error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, products]);

  const addEquipment = (equipment: Omit<Equipment, 'id' | 'prevQty'>) => {
    const newEquip: Equipment = {
        ...equipment,
        id: Date.now().toString(),
        prevQty: equipment.qty
    };
    setEquipments(prev => [...prev, newEquip]);
    markAsPending();
  };

  const updateEquipment = (id: string, updates: Partial<Equipment>) => {
    setEquipments(prev => prev.map(eq => 
        eq.id === id ? { ...eq, ...updates } : eq
    ));
    markAsPending();
  };

  const updateEquipmentQty = (id: string, newQty: number) => {
    setEquipments(prev => prev.map(eq => 
        eq.id === id ? { ...eq, prevQty: eq.qty, qty: newQty } : eq
    ));
    markAsPending();
  };

  const removeEquipment = (id: string) => {
    setEquipments(prev => prev.filter(eq => eq.id !== id));
    markAsPending();
  };

  const addCard = (card: Omit<Card, 'id'>) => {
    const newCard: Card = {
      ...card,
      id: Math.random().toString(36).substr(2, 9)
    };
    setCards(prev => [...prev, newCard]);
  };

  const updateCard = (id: string, updates: Partial<Card>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    
    // Sync legacy balances if needed
    if (id === 'main' && updates.balance !== undefined) setCurrentBalance(updates.balance);
    if (id === 'savings' && updates.balance !== undefined) setSavingsBalance(updates.balance);
  };

  const deleteCard = (id: string) => {
    if (id === 'main' || id === 'savings') return; // Protect default cards
    setCards(prev => prev.filter(c => c.id !== id));
  };

  return (
    <ProductContext.Provider value={{ 
      products, categories, purchases, currentBalance, savingsBalance, cashBalance, tpaBalance, cards, transactions, salesReports, 
      expenses, inventoryHistory, priceHistory, lockedDays, systemDate,
      setSystemDate, toggleDayLock, isDayLocked,
      addExpense, deleteExpense, updateExpense,
      addInventoryLog, addProduct, updateProduct, deleteProduct, addCategory, editCategory, removeCategory,
      addPurchase, getPurchasesByDate, getTodayPurchases, processTransaction, processCashTPADebit,
      addSalesReport, addAuditLog, stockOperationHistory, auditLogs,
      equipments, addEquipment, updateEquipment, updateEquipmentQty, removeEquipment,
      addCard, updateCard, deleteCard,
      isSyncing, hasPendingChanges, syncData
    }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
