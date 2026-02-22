
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Product, PurchaseRecord, Transaction, SalesReport, Expense, InventoryLog, PriceHistoryLog } from '../types';

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

interface ProductContextType {
  products: Product[];
  categories: string[];
  purchases: PurchaseRecord[];
  currentBalance: number;
  savingsBalance: number;
  transactions: Transaction[];
  salesReports: SalesReport[];
  expenses: Expense[];
  inventoryHistory: InventoryLog[];
  priceHistory: PriceHistoryLog[];
  systemDate: Date;
  lockedDays: string[];
  
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
  removeCategory: (category: string) => void;
  addPurchase: (items: Record<string, number>, source: 'Prices' | 'Inventory' | 'Sales', completedBy: string, attachments?: string[]) => void;
  getPurchasesByDate: (dateStr: string) => Record<string, number>;
  processTransaction: (type: 'deposit' | 'withdraw', account: 'main' | 'savings', amount: number, description: string) => void;
  addSalesReport: (report: SalesReport) => void;
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

  useEffect(() => { localStorage.setItem('mg_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('mg_purchases', JSON.stringify(purchases)); }, [purchases]);
  useEffect(() => { localStorage.setItem('mg_expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('mg_inventory_history', JSON.stringify(inventoryHistory)); }, [inventoryHistory]);
  useEffect(() => { localStorage.setItem('mg_current_balance', currentBalance.toString()); }, [currentBalance]);
  useEffect(() => { localStorage.setItem('mg_savings_balance', savingsBalance.toString()); }, [savingsBalance]);
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

  const removeCategory = (category: string) => {
    setCategories(categories.filter(c => c !== category));
  };

  const processTransaction = (type: 'deposit' | 'withdraw', account: 'main' | 'savings', amount: number, description: string) => {
    if (account === 'main') {
      setCurrentBalance(prev => type === 'deposit' ? prev + amount : prev - amount);
    } else {
      setSavingsBalance(prev => type === 'deposit' ? prev + amount : prev - amount);
    }

    const newTrans: Transaction = {
      id: Date.now().toString(),
      type: type === 'deposit' ? 'entrada' : 'saida',
      category: account === 'main' ? 'Conta Corrente' : 'Conta Poupança',
      amount: amount,
      date: systemDate.toLocaleDateString('pt-AO', {day:'2-digit', month:'short'}) + ', ' + systemDate.toLocaleTimeString('pt-AO', {hour:'2-digit', minute:'2-digit'}),
      description: description
    };

    setTransactions(prev => [newTrans, ...prev]);
  };

  const addPurchase = (items: Record<string, number>, source: 'Prices' | 'Inventory' | 'Sales', completedBy: string, attachments?: string[]) => {
    let totalValue = 0;
    Object.entries(items).forEach(([id, qty]) => {
      const p = products.find(prod => prod.id === id);
      if (p) {
        const packCost = p.buyPrice * (p.packSize || 1);
        totalValue += packCost * qty;
      }
    });

    const now = new Date();
    const purchaseDate = new Date(systemDate);
    purchaseDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const newRecord: PurchaseRecord = {
      id: Date.now().toString(),
      name: source === 'Inventory' ? 'Ajuste de Stock (Inventário)' : source === 'Sales' ? 'Compra Rápida (Vendas)' : `Compra Efectuada`,
      date: getSystemDateStr(),
      items, 
      total: totalValue,
      completedBy,
      timestamp: purchaseDate.getTime(),
      source,
      attachments
    };

    setPurchases(prev => [newRecord, ...prev]);

    setProducts(prevProducts => prevProducts.map(p => {
      if (items[p.id]) {
        const qtyPacks = items[p.id];
        const unitsToAdd = qtyPacks * (p.packSize || 1);
        return { ...p, stock: p.stock + unitsToAdd };
      }
      return p;
    }));

    if (totalValue > 0) {
        processTransaction('withdraw', 'main', totalValue, `Compra de Stock (${source}): ${Object.keys(items).length} itens`);
    }
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

  const addSalesReport = (report: SalesReport) => {
    setSalesReports(prev => [report, ...prev]);
  };

  return (
    <ProductContext.Provider value={{ 
      products, categories, purchases, currentBalance, savingsBalance, transactions, salesReports, 
      expenses, inventoryHistory, priceHistory, lockedDays, systemDate,
      setSystemDate, toggleDayLock, isDayLocked,
      addExpense, deleteExpense, updateExpense,
      addInventoryLog, addProduct, updateProduct, deleteProduct, addCategory, removeCategory,
      addPurchase, getPurchasesByDate, processTransaction, 
      addSalesReport
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
