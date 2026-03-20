
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { Product, PurchaseRecord, Transaction, SalesReport, Expense, InventoryLog, PriceHistoryLog, Equipment, Card, StockOperationLog, AuditLog, ClosureStatus, ExpenseCategory, UserPermissions, UserRole } from '../types';
import { useAuth } from './AuthContext';
import { useAudit } from './AuditContext';
import { hasPermission } from '../src/utils/permissions';
import { cleanDate, formatDateISO } from '../src/utils';

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

const INITIAL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: '1', name: 'Operacionais', isActive: true },
  { id: '2', name: 'Manutenção', isActive: true },
  { id: '3', name: 'Energia e Água', isActive: true },
  { id: '4', name: 'Salários', isActive: true },
  { id: '5', name: 'Transporte', isActive: true },
  { id: '6', name: 'Impostos', isActive: true },
  { id: '7', name: 'Serviços', isActive: true },
  { id: '8', name: 'Outros', isActive: true },
  { id: '9', name: 'DESPESA_OPERACIONAL', isActive: true },
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
  expenseCategories: ExpenseCategory[];
  inventoryHistory: InventoryLog[];
  stockOperationHistory: StockOperationLog[];
  priceHistory: PriceHistoryLog[];
  systemDate: Date;
  getSystemDate: () => Date;
  lockedDays: string[];
  equipments: Equipment[];
  
  setSystemDate: (date: Date) => void;
  unlockDay: (dateStr: string, reason: string) => void;
  lockDay: (dateStr: string, performedBy: string) => void;
  isDayLocked: (date: Date | string) => boolean;
  checkDayLock: (date: Date | string) => void;

  addExpense: (expense: Expense) => void;
  deleteExpense: (id: string, deletedBy: string) => void;
  updateExpense: (updated: Expense) => void;
  addExpenseCategory: (category: Omit<ExpenseCategory, 'id'>) => void;
  updateExpenseCategory: (id: string, updates: Partial<ExpenseCategory>) => void;
  deleteExpenseCategory: (id: string) => void;
  addInventoryLog: (log: InventoryLog) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addCategory: (category: string) => void;
  editCategory: (oldName: string, newName: string) => Promise<void>;
  removeCategory: (category: string) => void;
  addPurchase: (items: Record<string, number>, source: 'Prices' | 'Inventory' | 'Sales', completedBy: string, attachments?: string[], supplier?: string) => void;
  getPurchasesByDate: (dateStr: string) => Record<string, number>;
  getTodayPurchases: () => Record<string, number>;
  processTransaction: (type: 'deposit' | 'withdraw', account: 'main' | 'savings' | string, amount: number, description: string, category?: string, referenceId?: string, referenceType?: Transaction['referenceType'], performedBy?: string) => void;
  processCashTPADebit: (origin: 'Cash' | 'TPA', amount: number, note: string, referenceId?: string, referenceType?: Transaction['referenceType'], performedBy?: string) => void;
  addSalesReport: (report: SalesReport) => void;
  registrarDespesaGlobal: (data: {
    tipo: string;
    origem: string;
    descricao: string;
    nota: string;
    valor: number;
    usuario: string;
    data_operacional: string;
  }) => void;
  updateSalesReport: (reportId: string, updates: Partial<SalesReport>) => void;
  updateSalesReportJustification: (reportId: string, justificationData: any) => void;
  confirmSalesReport: (reportId: string, confirmedBy: string, isUnilateral?: boolean) => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  addEquipment: (equipment: Omit<Equipment, 'id' | 'prevQty'>) => void;
  updateEquipment: (id: string, updates: Partial<Equipment>) => void;
  updateEquipmentQty: (id: string, newQty: number) => void;
  removeEquipment: (id: string) => void;
  addCard: (card: Omit<Card, 'id'>) => void;
  updateCard: (id: string, updates: Partial<Card>) => void;
  deleteCard: (id: string) => void;
  resetTestData: () => void;
  isSyncing: boolean;
  hasPendingChanges: boolean;
  syncData: () => Promise<void>;
  handleStockMovement: (productId: string, quantity: number, type: 'SALE' | 'PURCHASE' | 'ADJUSTMENT', performedBy: string, reason: string, referenceId?: string) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { addLog } = useAudit();

  const checkPermission = useCallback((permission: keyof UserPermissions) => {
    if (!hasPermission(user, permission)) {
      // In a real app, we'd return a rejected promise or show a global error
      console.error(`Acesso negado: ${permission}`);
      alert(`Sem permissão para executar esta ação: ${permission}`);
      return false;
    }
    return true;
  }, [user]);

  const [systemDate, setSystemDateState] = useState<Date>(() => {
    const saved = localStorage.getItem('mg_system_date');
    if (saved) return new Date(saved);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });

  const setSystemDate = (date: Date) => {
    const oldDate = systemDate;
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    setSystemDateState(dateOnly);
    localStorage.setItem('mg_system_date', dateOnly.toISOString());
    
    addAuditLog({
      action: 'ALTERAR_DATA_SISTEMA',
      module: 'SISTEMA',
      description: `Data do sistema alterada de ${formatDateISO(oldDate)} para ${formatDateISO(dateOnly)}`,
      previousValue: formatDateISO(oldDate),
      newValue: formatDateISO(dateOnly)
    });
  };

  const getSystemDate = useCallback(() => {
    const now = new Date();
    const date = new Date(systemDate);
    date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return date;
  }, [systemDate]);

  const getSystemDateStr = () => formatDateISO(getSystemDate());

  const [lockedDays, setLockedDays] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mg_locked_days');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('mg_locked_days', JSON.stringify(lockedDays)); }, [lockedDays]);



  const addAuditLog = useCallback((log: any) => {
    addLog({
      action: log.action || 'AÇÃO_DESCONHECIDA',
      module: log.module || 'SISTEMA',
      entityId: log.entityId || null,
      description: log.details || log.description || 'Sem descrição',
      previousValue: log.previousValue || null,
      newValue: log.newValue || null,
    }, user);
  }, [addLog, user]);

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

  // Removed automatic sync background process to focus on manual user actions
  
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('mg_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch { return INITIAL_PRODUCTS; }
  });

  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(() => {
    try {
      const saved = localStorage.getItem('mg_expense_categories');
      return saved ? JSON.parse(saved) : INITIAL_EXPENSE_CATEGORIES;
    } catch { return INITIAL_EXPENSE_CATEGORIES; }
  });
  
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

  const [stockOperationHistory, setStockOperationHistory] = useState<StockOperationLog[]>(() => {
    try {
      const saved = localStorage.getItem('mg_stock_operation_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const isDayLocked = useCallback((date: string | Date) => {
    if (!date) return false;
    const dateStr = date instanceof Date ? formatDateISO(date) : date;
    const cleanTarget = cleanDate(dateStr);
    return lockedDays
      .map(d => cleanDate(d))
      .includes(cleanTarget);
  }, [lockedDays]);

  const validateAction = useCallback((type: string, payload: any) => {
    // 1. Day Lock Check
    if (isDayLocked(getSystemDate())) {
      throw new Error('Operação Negada: O dia atual está bloqueado.');
    }

    // 2. Stock validation (Cannot go negative for sales)
    if (type === 'SALE' || type === 'SALES_REPORT' || type === 'UPDATE_STOCK') {
      const items = payload.items || (payload.productId ? [{ productId: payload.productId, qty: payload.qty }] : []);
      for (const item of items) {
        const product = products.find(p => p.id === item.productId || p.name === item.name);
        if (product) {
          const currentStock = product.stock;
          const change = item.qty;
          // If it's a SALE or SALES_REPORT, change is positive but we subtract it
          // If it's UPDATE_STOCK, change is the delta
          const finalStock = (type === 'SALE' || type === 'SALES_REPORT') ? currentStock - change : currentStock + change;
          
          if (finalStock < 0) {
            // Permite stock negativo para vendas e relatórios de vendas para evitar bloqueios operacionais.
            // O administrador pode corrigir o stock posteriormente com uma compra ou ajuste manual.
            const isSaleRelated = type === 'SALE' || type === 'SALES_REPORT' || (type === 'UPDATE_STOCK' && item.qty < 0);
            
            if (!isSaleRelated) {
              throw new Error(`Stock insuficiente para ${product.name}. Disponível: ${currentStock}`);
            } else {
              console.warn(`Stock insuficiente para ${product.name}. Permitindo stock negativo para não bloquear a operação.`);
            }
          }
        }
      }
    }

    // 3. Price validation (Must be positive)
    if (payload.price !== undefined && payload.price <= 0) {
      throw new Error('Preço inválido: O valor deve ser maior que zero.');
    }

    return true;
  }, [products, isDayLocked, getSystemDate]);

  const handleStockMovement = useCallback((productId: string, quantity: number, type: 'SALE' | 'PURCHASE' | 'ADJUSTMENT', performedBy: string, reason: string, referenceId?: string) => {
    try {
      if (type === 'ADJUSTMENT' && !reason) {
        throw new Error('Um motivo é obrigatório para ajustes manuais de stock.');
      }

      // Active Protection: Validate before processing
      validateAction('UPDATE_STOCK', { productId, qty: type === 'SALE' ? -quantity : quantity });

      let qtyBefore = 0;
      let qtyAfter = 0;
      let productName = '';

      setProducts(prevProducts => {
        const productIndex = prevProducts.findIndex(p => p.id === productId);
        if (productIndex === -1) return prevProducts;

        const product = prevProducts[productIndex];
        productName = product.name;
        qtyBefore = product.stock;
        
        let qtyAdded = 0;
        if (type === 'SALE') qtyAdded = -quantity;
        else if (type === 'PURCHASE') qtyAdded = quantity;
        else if (type === 'ADJUSTMENT') qtyAdded = quantity;

        qtyAfter = Math.max(0, qtyBefore + qtyAdded);

        const updatedProducts = [...prevProducts];
        updatedProducts[productIndex] = { ...product, stock: qtyAfter };
        return updatedProducts;
      });

      // Update Audit Log (StockOperationLog) - Move outside setProducts
      const log: StockOperationLog = {
        id: crypto.randomUUID(),
        productId,
        productName,
        type: type as any,
        qtyBefore,
        qtyAdded: type === 'SALE' ? -quantity : quantity,
        qtyAfter,
        timestamp: Date.now(),
        performedBy,
        reason,
        referenceId
      };
      setStockOperationHistory(prev => [log, ...prev]);

      // Update Audit Context - Move outside setProducts
      addLog({
        action: type === 'SALE' ? 'VENDA_STOCK' : (type === 'PURCHASE' ? 'COMPRA_STOCK' : 'AJUSTE_STOCK'),
        module: 'STOCK',
        description: `${type === 'SALE' ? 'Venda' : (type === 'PURCHASE' ? 'Compra' : 'Ajuste')} de ${Math.abs(quantity)} unidades de ${productName}. Stock: ${qtyBefore} -> ${qtyAfter}. Motivo: ${reason || 'Ajuste Manual'}`,
        entityId: productId,
        previousValue: qtyBefore,
        newValue: qtyAfter
      }, user);

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'STOCK',
        description: `ERRO: ${msg}`,
        entityId: productId
      }, user);
      throw error;
    }
  }, [user, addLog, validateAction]);

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

  // Consolidate localStorage persistence to reduce overhead
  useEffect(() => {
    const data = {
      mg_products: products,
      mg_purchases: purchases,
      mg_expenses: expenses,
      mg_expense_categories: expenseCategories,
      mg_inventory_history: inventoryHistory,
      mg_stock_operation_history: stockOperationHistory,
      mg_current_balance: currentBalance,
      mg_savings_balance: savingsBalance,
      mg_cash_balance: cashBalance,
      mg_tpa_balance: tpaBalance,
      mg_cards: cards,
      mg_transactions: transactions,
      mg_sales_reports: salesReports
    };

    Object.entries(data).forEach(([key, value]) => {
      localStorage.setItem(key, typeof value === 'string' || typeof value === 'number' ? value.toString() : JSON.stringify(value));
    });
  }, [
    products, purchases, expenses, expenseCategories, inventoryHistory, 
    stockOperationHistory, currentBalance, savingsBalance, cashBalance, 
    tpaBalance, cards, transactions, salesReports
  ]);
  
  const lockDay = (dateStr: string, performedBy: string) => {
    const cleanTarget = cleanDate(dateStr);

    setLockedDays(prev => {
      if (prev.includes(cleanTarget)) return prev;
      return [...prev, cleanTarget];
    });

    addAuditLog({
      action: 'BLOQUEAR_DIA',
      module: 'CALENDÁRIO',
      entityId: cleanTarget,
      description: `Dia ${cleanTarget} confirmado (fecho finalizado)`,
      performedBy
    });

    // Also update sales report status if it exists
    setSalesReports(prevReports => prevReports.map(report => {
      const reportDate = report.dateISO ? report.dateISO.split('T')[0] : report.date;
      if (cleanDate(reportDate) === cleanTarget) {
        return { ...report, status: ClosureStatus.BLOQUEADO };
      }
      return report;
    }));
  };

  const unlockDay = (dateStr: string, reason: string) => {
    if (!hasPermission(user, 'calendar_unlock')) {
      alert("Sem permissão para desbloquear dias.");
      return;
    }

    const cleanTarget = cleanDate(dateStr);

    setLockedDays(prev => prev.filter(d => cleanDate(d) !== cleanTarget));

    addAuditLog({
      action: 'DESBLOQUEAR_DIA',
      module: 'CALENDÁRIO',
      entityId: cleanTarget,
      description: `Dia ${cleanTarget} desbloqueado. Motivo: ${reason}`,
      performedBy: user?.name || 'Sistema'
    });

    // Revert sales report status to FECHO_CONFIRMADO
    setSalesReports(prevReports => prevReports.map(report => {
      const reportDate = report.dateISO ? report.dateISO.split('T')[0] : report.date;
      if (cleanDate(reportDate) === cleanTarget) {
        return { ...report, status: ClosureStatus.FECHO_CONFIRMADO };
      }
      return report;
    }));
  };

  const checkDayLock = useCallback((date: Date | string) => {
    if (isDayLocked(date)) {
      const dateStr = typeof date === 'string' ? date : formatDateISO(date);
      
      // Log the attempt
      addAuditLog({
        action: 'TENTATIVA_EDICAO_BLOQUEADA',
        entity: 'Day',
        entityId: dateStr,
        details: `Tentativa de edição em dia bloqueado por ${user?.name || 'Desconhecido'}.`,
        performedBy: user?.name || 'Sistema'
      });

      const msg = "Dia bloqueado. Contacte administrador";
      if (typeof window !== 'undefined') {
        window.alert(msg);
      }
      throw new Error(msg);
    }
  }, [isDayLocked, addAuditLog, user]);
  
  useEffect(() => {
      const handleStorage = () => {
          const saved = localStorage.getItem('mg_price_history');
          if(saved) setPriceHistory(JSON.parse(saved));
      };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addExpense = (expense: Expense) => {
    if (!checkPermission('expenses_execute')) return;
    
    // 1. Register Expense
    setExpenses(prev => [expense, ...prev]);
    
    addAuditLog({
      action: 'ADICIONAR_DESPESA',
      module: 'FINANCEIRO',
      entityId: expense.id,
      description: `Despesa registada: ${expense.title} (${expense.amount.toLocaleString('pt-AO')} Kz). Categoria: ${expense.category}`,
      performedBy: expense.user
    });
    
    // 2. Financial Debit
    if (expense.amount > 0) {
      processTransaction(
        'withdraw', 
        'main', 
        expense.amount, 
        `Despesa: ${expense.title}`, 
        expense.category, 
        expense.id, 
        'expense', 
        expense.user
      );
    }
  };

  const deleteExpense = (id: string, deletedBy: string) => {
    if (!checkPermission('expenses_execute')) return;
    
    const expense = expenses.find(e => e.id === id);
    if (!expense || expense.status === 'REVERSED') return;
    
    // 1. Mark original as reversed (Immutable History)
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'REVERSED' } : e));

    // 2. Create Reversal Entry (Negative value entry)
    const reversalExpense: Expense = {
      ...expense,
      id: `rev_${expense.id}_${Date.now()}`,
      title: `ESTORNO: ${expense.title}`,
      amount: -expense.amount,
      notes: `Estorno de despesa realizado por ${deletedBy}. Referência Original: ${expense.id}`,
      timestamp: getSystemDate().getTime(),
      user: deletedBy,
      status: 'REVERSAL'
    };
    setExpenses(prev => [reversalExpense, ...prev]);

    // 3. Financial Refund (Reversal)
    if (expense.amount > 0) {
      processTransaction(
        'deposit', 
        'main', 
        expense.amount, 
        `Estorno de despesa: ${expense.title}`, 
        'Estorno', 
        expense.id, 
        'reversal', 
        deletedBy
      );
    }

    addAuditLog({
      action: 'ESTORNO_DESPESA',
      module: 'FINANCEIRO',
      entityId: id,
      description: `Estorno de despesa: ${expense.title}. Realizado por ${deletedBy}`,
      performedBy: deletedBy
    });
  };
  const updateExpense = (updated: Expense) => {
    setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
    
    addAuditLog({
      action: 'EDITAR_DESPESA',
      module: 'FINANCEIRO',
      entityId: updated.id,
      description: `Despesa editada: ${updated.title}`,
      performedBy: user?.name || 'Sistema'
    });
  };

  const addExpenseCategory = (category: Omit<ExpenseCategory, 'id'>) => {
    if (!checkPermission('expenses_category_manage')) return;
    const newCat = { ...category, id: Math.random().toString(36).substr(2, 9) };
    setExpenseCategories(prev => [...prev, newCat]);
    
    addAuditLog({
      action: 'CRIAR_CATEGORIA_DESPESA',
      module: 'FINANCEIRO',
      entityId: newCat.id,
      description: `Categoria de despesa criada: ${newCat.name}`,
      performedBy: user?.name || 'Sistema'
    });
  };

  const updateExpenseCategory = (id: string, updates: Partial<ExpenseCategory>) => {
    if (!checkPermission('expenses_category_manage')) return;
    setExpenseCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    
    addAuditLog({
      action: 'EDITAR_CATEGORIA_DESPESA',
      module: 'FINANCEIRO',
      entityId: id,
      description: `Categoria de despesa atualizada: ${id}`,
      performedBy: user?.name || 'Sistema'
    });
  };

  const deleteExpenseCategory = (id: string) => {
    if (!checkPermission('expenses_category_manage')) return;
    const cat = expenseCategories.find(c => c.id === id);
    setExpenseCategories(prev => prev.filter(c => c.id !== id));
    
    addAuditLog({
      action: 'REMOVER_CATEGORIA_DESPESA',
      module: 'FINANCEIRO',
      entityId: id,
      description: `Categoria de despesa removida: ${cat?.name || id}`,
      performedBy: user?.name || 'Sistema'
    });
  };

  const addInventoryLog = (log: InventoryLog) => {
    try {
      validateAction('INVENTORY_LOG', {});
      setInventoryHistory(prev => [log, ...prev]);
      
      addAuditLog({
        action: 'REGISTRO_INVENTARIO',
        module: 'INVENTARIO',
        entityId: log.id,
        description: `Relatório de inventário registado. Status: ${log.status}`,
        performedBy: log.performedBy
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'INVENTARIO',
        description: `ERRO: ${msg}`,
        entityId: log.id
      }, user);
      throw error;
    }
  };

  const addProduct = (product: Omit<Product, 'id'>) => {
    try {
      if (!checkPermission('inventory_product_create')) return;
      validateAction('ADD_PRODUCT', { price: product.sellPrice });
      const newProduct = { ...product, id: Math.random().toString(36).substr(2, 9) };
      setProducts(prev => [...prev, newProduct]);
      
      addAuditLog({
        action: 'CRIAR_PRODUTO',
        module: 'INVENTARIO',
        entityId: newProduct.id,
        description: `Produto ${newProduct.name} criado.`,
        performedBy: user?.name || 'Sistema'
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'INVENTARIO',
        description: `ERRO: ${msg}`,
        entityId: product.name
      }, user);
      throw error;
    }
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    try {
      if (!checkPermission('inventory_product_edit')) return;
      validateAction('UPDATE_PRODUCT', { price: updates.sellPrice });
      
      const product = products.find(p => p.id === id);
      setProducts(prevProducts => prevProducts.map(p => p.id === id ? { ...p, ...updates } : p));
      
      addAuditLog({
        action: 'EDITAR_PRODUTO',
        module: 'INVENTARIO',
        entityId: id,
        description: `Produto ${product?.name || id} atualizado.`,
        performedBy: user?.name || 'Sistema'
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'INVENTARIO',
        description: `ERRO: ${msg}`,
        entityId: id
      }, user);
      throw error;
    }
  };

  const deleteProduct = (id: string) => {
    try {
      if (!checkPermission('inventory_product_delete')) return;
      validateAction('DELETE_PRODUCT', {});
      
      const product = products.find(p => p.id === id);
      // Instead of deleting, we mark as archived to preserve history
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isArchived: true } : p));
      
      addAuditLog({
        action: 'ARQUIVAR_PRODUTO',
        module: 'INVENTARIO',
        entityId: id,
        description: `Produto ${product?.name || id} arquivado para preservar histórico.`,
        performedBy: user?.name || 'Sistema'
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'INVENTARIO',
        description: `ERRO: ${msg}`,
        entityId: id
      }, user);
      throw error;
    }
  };

  const addCategory = (category: string) => {
    try {
      if (!checkPermission('inventory_category_manage')) return;
      // Removed validateAction to allow category management even on locked days
      if (!categories.includes(category)) {
        setCategories([...categories, category].sort());
        addAuditLog({
          action: 'CRIAR_CATEGORIA',
          module: 'INVENTARIO',
          description: `Categoria ${category} criada.`,
          performedBy: user?.name || 'Sistema'
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'INVENTARIO',
        description: `ERRO: ${msg}`,
        entityId: category
      }, user);
      throw error;
    }
  };

  const editCategory = useCallback(async (oldName: string, newName: string) => {
    try {
      if (!checkPermission('inventory_category_manage')) return;
      if (!newName || oldName === newName) return;
      // Removed validateAction to allow category management even on locked days

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
      
      addAuditLog({
        action: 'EDITAR_CATEGORIA',
        module: 'INVENTARIO',
        description: `Categoria ${oldName} alterada para ${newName}.`,
        performedBy: user?.name || 'Sistema'
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'INVENTARIO',
        description: `ERRO: ${msg}`,
        entityId: oldName
      }, user);
      throw error;
    }
  }, [setCategories, setProducts, checkPermission, user, addAuditLog, addLog]);

  const removeCategory = (category: string) => {
    try {
      if (!checkPermission('inventory_category_manage')) return;
      // Removed validateAction to allow category management even on locked days
      setCategories(categories.filter(c => c !== category));
      
      addAuditLog({
        action: 'REMOVER_CATEGORIA',
        module: 'INVENTARIO',
        description: `Categoria ${category} removida.`,
        performedBy: user?.name || 'Sistema'
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'INVENTARIO',
        description: `ERRO: ${msg}`,
        entityId: category
      }, user);
      throw error;
    }
  };

  const processTransaction = (
    type: 'deposit' | 'withdraw', 
    account: 'main' | 'savings' | string, 
    amount: number, 
    description: string, 
    category?: string, 
    referenceId?: string, 
    referenceType?: Transaction['referenceType'],
    performedBy?: string,
    date?: string 
  ) => {
    try {
      // Duplicate prevention: Check if this referenceId already exists for this type
      if (referenceId && (referenceType === 'expense' || referenceType === 'sales_report' || referenceType === 'day_closure')) {
        const isDuplicate = transactions.some(t => t.referenceId === referenceId && t.type === (type === 'deposit' ? 'entrada' : 'saida'));
        if (isDuplicate) {
          console.warn(`Transação duplicada detectada para referenceId: ${referenceId}. Ignorando.`);
          return;
        }
      }

      const targetDate = date || formatDateISO(getSystemDate());

      let accountName = '';
      
      if (account === 'main') {
        setCurrentBalance(prev => type === 'deposit' ? prev + amount : prev - amount);
        accountName = 'Conta Corrente';
        setCards(prev => prev.map(c => c.id === 'main' ? { ...c, balance: type === 'deposit' ? c.balance + amount : c.balance - amount } : c));
      } else if (account === 'savings') {
        setSavingsBalance(prev => type === 'deposit' ? prev + amount : prev - amount);
        accountName = 'Conta Poupança';
        setCards(prev => prev.map(c => c.id === 'savings' ? { ...c, balance: type === 'deposit' ? c.balance + amount : c.balance - amount } : c));
      } else {
        setCards(prev => prev.map(c => {
          if (c.id === account) {
            accountName = c.name;
            return { ...c, balance: type === 'deposit' ? c.balance + amount : c.balance - amount };
          }
          return c;
        }));
      }

      // TPA Balance Rule: Any value marked as 'Transferência' reflects in TPA balance
      if (category === 'Transferência' || category === 'TRANSFER' || description.toLowerCase().includes('transferência')) {
        setTPABalance(prev => type === 'deposit' ? prev + amount : prev - amount);
      }

      const newTrans: Transaction = {
        id: Date.now().toString(),
        type: type === 'deposit' ? 'entrada' : 'saida',
        category: category || accountName || 'Cartão',
        amount: amount,
        date: date ? (date + ', ' + getSystemDate().toLocaleTimeString('pt-AO', {hour:'2-digit', minute:'2-digit'})) : (formatDateISO(getSystemDate()) + ', ' + getSystemDate().toLocaleTimeString('pt-AO', {hour:'2-digit', minute:'2-digit'})),
        description: description,
        referenceId,
        referenceType,
        performedBy,
        accountName: accountName || 'Conta Desconhecida',
        status: 'ATIVO',
        operationalDay: targetDate
      };

      setTransactions(prev => [newTrans, ...prev]);

      // Log manual transactions
      if (!referenceType) {
        addAuditLog({
          action: 'TRANSACAO_MANUAL',
          module: 'FINANCEIRO',
          entityId: newTrans.id,
          description: `Transação manual: ${type === 'deposit' ? 'Depósito' : 'Levantamento'} de ${amount.toLocaleString('pt-AO')} Kz em ${accountName}. Descrição: ${description}`,
          performedBy: performedBy || user?.name || 'Sistema'
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'FINANCEIRO',
        description: `ERRO: ${msg}`,
        entityId: referenceId
      }, user);
      throw error;
    }
  };

  const processCashTPADebit = (origin: 'Cash' | 'TPA', amount: number, note: string, referenceId?: string, referenceType?: Transaction['referenceType'], performedBy?: string, date?: string) => {
    const targetDate = date || formatDateISO(getSystemDate());
    validateAction('TRANSACTION', { date: targetDate, amount });

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
      date: date ? (date + ', ' + getSystemDate().toLocaleTimeString('pt-AO', {hour:'2-digit', minute:'2-digit'})) : (formatDateISO(getSystemDate()) + ', ' + getSystemDate().toLocaleTimeString('pt-AO', {hour:'2-digit', minute:'2-digit'})),
      description: note,
      referenceId,
      referenceType,
      performedBy,
      accountName: origin === 'Cash' ? 'Cash (Mão)' : 'TPA (Banco)',
      status: 'ATIVO',
      operationalDay: targetDate
    };

    setTransactions(prev => [newTrans, ...prev]);

    addAuditLog({
      action: 'DEBITO_CASH_TPA',
      module: 'FINANCEIRO',
      entityId: newTrans.id,
      description: `Débito de ${origin}: ${amount.toLocaleString('pt-AO')} Kz. Nota: ${note}`,
      performedBy: performedBy || user?.name || 'Sistema'
    });
  };

  const addPurchase = (items: Record<string, number>, source: 'Prices' | 'Inventory' | 'Sales', completedBy: string, attachments?: string[], supplier?: string) => {
    try {
      if (!checkPermission('purchases_execute')) return;
      validateAction('PURCHASE', { date: systemDate });
      let totalValue = 0;
      const purchaseId = crypto.randomUUID();
      
      // 1. Calcular total
      products.forEach(p => {
        if (items[p.id]) {
          const qtyPacks = items[p.id];
          const packSize = p.packSize || 1;
          const packCost = p.buyPrice * packSize;
          totalValue += packCost * qtyPacks;
        }
      });

      if (user?.permissions?.purchases_limit && totalValue > user.permissions.purchases_limit) {
        alert(`Limite de compra excedido! Limite: ${user.permissions.purchases_limit.toLocaleString('pt-AO')} Kz, Total: ${totalValue.toLocaleString('pt-AO')} Kz`);
        return;
      }

      // 2. Atualização de Estoque via handleStockMovement
      Object.entries(items).forEach(([productId, qtyPacks]) => {
        if (qtyPacks > 0) {
          const p = products.find(prod => prod.id === productId);
          if (p) {
            const packSize = p.packSize || 1;
            const unitsToAdd = qtyPacks * packSize;
            handleStockMovement(productId, unitsToAdd, 'PURCHASE', completedBy, 'Compra de Stock', purchaseId);
          }
        }
      });

      // 3. Registro da Compra
      const newRecord: PurchaseRecord = {
        id: purchaseId,
        name: source === 'Inventory' ? 'Ajuste de Stock (Inventário)' : source === 'Sales' ? 'Compra Rápida (Vendas)' : `Compra Efectuada`,
        date: getSystemDateStr(),
        items, 
        total: totalValue,
        completedBy,
        supplier,
        timestamp: getSystemDate().getTime(),
        source,
        attachments,
        synced: false
      };

      setPurchases(prev => [newRecord, ...prev]);

      // 4. Débito Financeiro
      if (totalValue > 0) {
          processTransaction('withdraw', 'main', totalValue, 'Compra de estoque', 'Compra de Estoque', purchaseId, 'purchase', completedBy);
      }

      // 5. Fila de Sincronização
      setSyncQueue(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'UPDATE_STOCK',
        payload: newRecord,
        timestamp: getSystemDate().getTime()
      }]);

      addAuditLog({
        action: 'CRIAR_COMPRA',
        module: 'COMPRAS',
        entityId: purchaseId,
        description: `Compra registada: ${totalValue.toLocaleString('pt-AO')} Kz. Origem: ${source}`,
        performedBy: completedBy
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'COMPRAS',
        description: `ERRO: ${msg}`,
        entityId: source
      }, user);
      throw error;
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

  const getTodayPurchases = () => getPurchasesByDate(getSystemDateStr());

  const registrarDespesaGlobal = (data: {
    tipo: string;
    origem: string;
    descricao: string;
    nota: string;
    valor: number;
    usuario: string;
    data_operacional: string;
    referenceId?: string; // Added referenceId
  }) => {
    try {
      validateAction('EXPENSE', { date: data.data_operacional, amount: data.valor });

      // Robust duplicate prevention and update logic
      const existingExpense = data.referenceId 
        ? expenses.find(e => e.id === data.referenceId || e.notes?.includes(data.referenceId!))
        : expenses.find(e => 
            e.title === data.descricao && 
            e.date === data.data_operacional &&
            e.origin === data.origem
          );

      if (existingExpense) {
        // If it exists but amount is different, update it
        if (existingExpense.amount !== data.valor) {
          setExpenses(prev => prev.map(e => e.id === existingExpense.id ? { ...e, amount: data.valor, title: data.descricao, notes: data.nota } : e));
          
          // Also update the associated transaction
          setTransactions(prev => prev.map(t => t.referenceId === existingExpense.id ? { 
            ...t, 
            amount: data.valor, 
            description: `Despesa (${data.origem}): ${data.descricao}`,
            operationalDay: data.data_operacional
          } : t));

          // Update balances if necessary
          const diff = data.valor - existingExpense.amount;
          setCurrentBalance(prev => prev - diff);
          setCards(prev => prev.map(c => c.id === 'main' ? { ...c, balance: c.balance - diff } : c));

          addAuditLog({
            action: 'EDITAR_DESPESA',
            module: 'FINANCEIRO',
            entityId: existingExpense.id,
            description: `Despesa global atualizada (${data.origem}): ${data.descricao}. Valor: ${existingExpense.amount} -> ${data.valor}`,
            performedBy: data.usuario
          });
        } else {
          console.log(`Despesa já existe com o mesmo valor: ${data.descricao}. Ignorando.`);
        }
        return;
      }

      const newExpense: Expense = {
        id: data.referenceId || crypto.randomUUID(),
        title: data.descricao,
        amount: data.valor,
        category: data.tipo,
        date: data.data_operacional,
        timestamp: getSystemDate().getTime(),
        user: data.usuario,
        notes: data.nota,
        origin: data.origem,
        attachments: []
      };
      
      setExpenses(prev => [newExpense, ...prev]);
      
      if (newExpense.amount > 0) {
        processTransaction(
          'withdraw',
          'main',
          newExpense.amount,
          `Despesa (${data.origem}): ${newExpense.title}`,
          newExpense.category,
          newExpense.id,
          'expense',
          newExpense.user,
          data.data_operacional
        );
      }

      addAuditLog({
        action: 'ADICIONAR_DESPESA',
        module: 'FINANCEIRO',
        entityId: newExpense.id,
        description: `Despesa global registada (${data.origem}): ${data.descricao}`,
        performedBy: data.usuario
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'FINANCEIRO',
        description: `ERRO: ${msg}`,
        entityId: data.origem
      }, user);
      throw error;
    }
  };

  const deductStockFromReport = (report: SalesReport) => {
    if (!report.itemsSummary || report.stockUpdated) return false;
    
    validateAction('SALES_REPORT', { date: report.date, items: report.itemsSummary });

    const itemsToDeduct = report.itemsSummary.filter(i => i.qty > 0);
    if (itemsToDeduct.length === 0) return true; // Nothing to deduct, but mark as updated

    itemsToDeduct.forEach(item => {
      const product = products.find(p => p.name === item.name);
      if (product) {
        handleStockMovement(product.id, item.qty, 'SALE', report.closedBy || 'Sistema', `Fecho de Vendas: ${report.date}`, report.id);
      }
    });

    return true;
  };

  const addSalesReport = (report: SalesReport) => {
    try {
      // Any user can initiate a partial or final closure as requested
      // if (!checkPermission('sales_closure')) return;
      if (!checkPermission('sales_execute')) return;
      validateAction('SALES_REPORT', { date: report.date, items: report.itemsSummary });

      // Deduct stock automatically
      const stockUpdated = deductStockFromReport(report);

      const finalReport = { 
        ...report, 
        id: report.id || crypto.randomUUID(),
        synced: false,
        stockUpdated
      };

      setSalesReports(prev => {
        const existingIdx = prev.findIndex(r => r.date === report.date);
        if (existingIdx !== -1 && 
            prev[existingIdx].status !== ClosureStatus.FECHO_CONFIRMADO && 
            prev[existingIdx].status !== ClosureStatus.BLOQUEADO &&
            prev[existingIdx].status !== ClosureStatus.DIA_BLOQUEADO) {
          const updated = [...prev];
          updated[existingIdx] = finalReport;
          return updated;
        }
        return [finalReport, ...prev];
      });

      if (finalReport.lunchExpense > 0) {
        registrarDespesaGlobal({
          tipo: "DESPESA_OPERACIONAL",
          origem: "CONTROLE_VENDAS",
          descricao: `Almoço (${finalReport.date})`,
          nota: `Despesa de almoço registada no fecho de vendas de ${finalReport.date}`,
          valor: finalReport.lunchExpense,
          usuario: finalReport.closedBy,
          data_operacional: finalReport.date,
          referenceId: `lunch_${finalReport.id}`
        });
      }

      const action: PendingAction = {
        id: crypto.randomUUID(),
        type: 'ADD_SALE',
        payload: finalReport,
        timestamp: getSystemDate().getTime()
      };
      setSyncQueue(prev => [...prev, action]);

      addAuditLog({
        action: 'CRIAR_RELATORIO_VENDAS',
        module: 'VENDAS',
        entityId: finalReport.id,
        description: `Relatório de vendas criado/atualizado para ${finalReport.date}`,
        performedBy: finalReport.closedBy
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'VENDAS',
        description: `ERRO: ${msg}`,
        entityId: report.date
      }, user);
      throw error;
    }
  };

  const updateSalesReport = (reportId: string, updates: Partial<SalesReport>) => {
    try {
      const report = salesReports.find(r => r.id === reportId);
      if (report) {
        const reportDateStr = report.dateISO ? report.dateISO : report.date;
        validateAction('SALES_REPORT', { 
          date: reportDateStr, 
          items: updates.itemsSummary || report.itemsSummary 
        });

        // If report is already confirmed and processed, we need to handle financial adjustments
        if (report.status === ClosureStatus.FECHO_CONFIRMADO && report.processedFinancials) {
          const hasFinancialChanges = 
            updates.cash !== undefined || 
            updates.tpa !== undefined || 
            updates.totalLifted !== undefined;

          if (hasFinancialChanges) {
            // 1. Reverse old values
            const oldCash = report.cash || 0;
            const oldTpa = report.tpa || 0;
            const oldTotalLifted = report.totalLifted || 0;

            setCashBalance(prev => prev - oldCash);
            setTPABalance(prev => prev - oldTpa);
            if (oldTotalLifted > 0) {
              processTransaction('withdraw', 'main', oldTotalLifted, `Estorno Fecho (Edição): ${reportDateStr}`, 'Ajuste', reportId, 'reversal', user?.name || 'Sistema');
            }

            // 2. Apply new values (merged)
            const newCash = updates.cash !== undefined ? updates.cash : oldCash;
            const newTpa = updates.tpa !== undefined ? updates.tpa : oldTpa;
            const newTotalLifted = updates.totalLifted !== undefined ? updates.totalLifted : oldTotalLifted;

            setCashBalance(prev => prev + newCash);
            setTPABalance(prev => prev + newTpa);
            if (newTotalLifted > 0) {
              processTransaction('deposit', 'main', newTotalLifted, `Novo Valor Fecho (Edição): ${reportDateStr}`, 'Fecho de Caixa', reportId, 'day_closure', user?.name || 'Sistema');
            }

            addAuditLog({
              action: 'AJUSTE_FINANCEIRO_FECHO',
              entity: 'SalesReport',
              entityId: reportId,
              details: `Valores ajustados: Total Levantado(${oldTotalLifted}->${newTotalLifted}), Cash(${oldCash}->${newCash}), TPA(${oldTpa}->${newTpa})`,
              performedBy: user?.name || 'Sistema'
            });
          }
        }
      }
      setSalesReports(prev => prev.map(r => r.id === reportId ? { ...r, ...updates } : r));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'VENDAS',
        description: `ERRO: ${msg}`,
        entityId: reportId
      }, user);
      throw error;
    }
  };

  const updateSalesReportJustification = (reportId: string, justificationData: any) => {
    const report = salesReports.find(r => r.id === reportId);
    if (report) {
      const reportDateStr = report.dateISO ? report.dateISO : report.date;
      checkDayLock(reportDateStr);
    }
    setSalesReports(prev => prev.map(r => r.id === reportId ? { 
      ...r, 
      justificationLog: justificationData,
      financials: r.financials ? { ...r.financials, justification: justificationData.justificativa } : undefined
    } : r));

    addAuditLog({
      action: 'JUSTIFICAR_FECHO',
      module: 'VENDAS',
      entityId: reportId,
      description: `Justificativa de fecho adicionada/atualizada para o relatório ${reportId}`,
      performedBy: user?.name || 'Sistema'
    });
  };

  const confirmSalesReport = (reportId: string, confirmedBy: string, isUnilateral: boolean = false) => {
    if (!checkPermission('sales_closure')) return;
    const report = salesReports.find(r => r.id === reportId);
    if (!report) return;

    const reportDateStr = report.dateISO ? report.dateISO : report.date;
    validateAction('SALES_REPORT', { date: reportDateStr, items: report.itemsSummary });

    // 1. Update report status and stock flag
    let updatedReport: SalesReport = {
      ...report,
      status: ClosureStatus.FECHO_CONFIRMADO,
      confirmedBy,
      confirmationTimestamp: getSystemDate().getTime(),
      unilateralAdminConfirmation: isUnilateral,
      processedFinancials: true
    };

    // 2. Financial Integration (Estado de Conta)
    // Only process if not already processed to prevent duplication
    if (!report.processedFinancials) {
      const cash = updatedReport.cash || 0;
      const tpa = updatedReport.tpa || 0;
      const transfer = updatedReport.transfer || 0;
      const totalLifted = updatedReport.totalLifted || 0;

      // Update accumulators
      setCashBalance(prev => prev + cash);
      setTPABalance(prev => prev + tpa + transfer); // Transfer added to TPA balance

      // Total Lifted goes to main account (Conta Corrente)
      if (totalLifted > 0) {
        processTransaction(
          'deposit', 
          'main', 
          totalLifted, 
          `Fecho Confirmado (${reportDateStr}) - Total Levantado: ${totalLifted.toLocaleString('pt-AO')} Kz`, 
          'Fecho de Caixa', 
          reportId, 
          'day_closure', 
          confirmedBy
        );
      }

      addAuditLog({
        action: 'INTEGRAÇÃO_FINANCEIRA_FECHO',
        entity: 'SalesReport',
        entityId: reportId,
        details: `Valores de fecho integrados: Total Levantado(+${totalLifted}), Cash(+${cash}), TPA(+${tpa}), Transferência(+${transfer})`,
        performedBy: confirmedBy
      });
    }

    // 3. Register Global Expense if exists (Sync)
    if (updatedReport.lunchExpense > 0) {
      registrarDespesaGlobal({
        tipo: "DESPESA_OPERACIONAL",
        origem: "CONTROLE_VENDAS",
        descricao: `Almoço (${reportDateStr})`,
        nota: `Despesa de almoço registada no fecho de vendas de ${reportDateStr}`,
        valor: updatedReport.lunchExpense,
        usuario: confirmedBy,
        data_operacional: reportDateStr,
        referenceId: `lunch_${reportId}` // Added referenceId for duplicate prevention
      });
    }

    // 4. Update Stock (Only if not already updated)
    if (updatedReport.itemsSummary && !updatedReport.stockUpdated) {
      setProducts(prevProducts => prevProducts.map(p => {
        const soldItem = updatedReport.itemsSummary.find(item => item.name === p.name);
        if (soldItem && soldItem.qty > 0) {
          return { ...p, stock: Math.max(0, p.stock - soldItem.qty) };
        }
        return p;
      }));
      updatedReport = { ...updatedReport, stockUpdated: true };
    }

    // 5. Update salesReports state
    const newSalesReports = salesReports.map(r => r.id === reportId ? updatedReport : r);
    setSalesReports(newSalesReports);
    
    // 6. Explicitly save to localStorage as requested
    localStorage.setItem('mg_sales_reports', JSON.stringify(newSalesReports));

    addAuditLog({
      action: isUnilateral ? 'CONFIRMAÇÃO_UNILATERAL_FECHO' : 'VALIDAÇÃO_FINAL_FECHO',
      entity: 'SalesReport',
      entityId: reportId,
      details: `Validação final do fecho de ${reportDateStr} realizada por ${confirmedBy}${isUnilateral ? ' (Unilateral)' : ''}. Financeiro e Stock integrados.`,
      performedBy: confirmedBy
    });
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
    try {
      validateAction('EQUIPMENT', {});
      const newEquip: Equipment = {
          ...equipment,
          id: Date.now().toString(),
          prevQty: equipment.qty
      };
      setEquipments(prev => [...prev, newEquip]);
      markAsPending();
      
      addAuditLog({
        action: 'ADICIONAR_EQUIPAMENTO',
        module: 'INVENTARIO',
        entityId: newEquip.id,
        description: `Equipamento ${newEquip.name} adicionado.`,
        performedBy: user?.name || 'Sistema'
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'INVENTARIO',
        description: `ERRO: ${msg}`,
        entityId: equipment.name
      }, user);
      throw error;
    }
  };

  const updateEquipment = (id: string, updates: Partial<Equipment>) => {
    try {
      validateAction('EQUIPMENT', {});
      setEquipments(prev => prev.map(eq => 
          eq.id === id ? { ...eq, ...updates } : eq
      ));
      markAsPending();
      
      addAuditLog({
        action: 'EDITAR_EQUIPAMENTO',
        module: 'INVENTARIO',
        entityId: id,
        description: `Equipamento ${id} atualizado.`,
        performedBy: user?.name || 'Sistema'
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'INVENTARIO',
        description: `ERRO: ${msg}`,
        entityId: id
      }, user);
      throw error;
    }
  };

  const updateEquipmentQty = (id: string, newQty: number) => {
    try {
      validateAction('EQUIPMENT', {});
      const equip = equipments.find(e => e.id === id);
      setEquipments(prev => prev.map(eq => 
          eq.id === id ? { ...eq, prevQty: eq.qty, qty: newQty } : eq
      ));
      markAsPending();

      addAuditLog({
        action: 'AJUSTE_QTD_EQUIPAMENTO',
        module: 'INVENTARIO',
        entityId: id,
        description: `Quantidade de ${equip?.name || id} alterada de ${equip?.qty} para ${newQty}`,
        performedBy: user?.name || 'Sistema'
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'INVENTARIO',
        description: `ERRO: ${msg}`,
        entityId: id
      }, user);
      throw error;
    }
  };

  const removeEquipment = (id: string) => {
    try {
      validateAction('EQUIPMENT', {});
      const equip = equipments.find(e => e.id === id);
      setEquipments(prev => prev.filter(eq => eq.id !== id));
      markAsPending();
      
      addAuditLog({
        action: 'REMOVER_EQUIPAMENTO',
        module: 'INVENTARIO',
        entityId: id,
        description: `Equipamento ${equip?.name || id} removido.`,
        performedBy: user?.name || 'Sistema'
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({
        action: 'ERROR' as any,
        module: 'INVENTARIO',
        description: `ERRO: ${msg}`,
        entityId: id
      }, user);
      throw error;
    }
  };

  const addCard = (card: Omit<Card, 'id'>) => {
    if (!checkPermission('finance_card_create')) return;
    const newCard: Card = {
      ...card,
      id: Math.random().toString(36).substr(2, 9)
    };
    setCards(prev => [...prev, newCard]);
    
    addAuditLog({
      action: 'CRIAR_CARTAO',
      module: 'FINANCEIRO',
      entityId: newCard.id,
      description: `Novo cartão/conta criado: ${newCard.name}`,
      performedBy: user?.name || 'Sistema'
    });
  };

  const updateCard = (id: string, updates: Partial<Card>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    
    // Sync legacy balances if needed
    if (id === 'main' && updates.balance !== undefined) setCurrentBalance(updates.balance);
    if (id === 'savings' && updates.balance !== undefined) setSavingsBalance(updates.balance);

    addAuditLog({
      action: 'EDITAR_CARTAO',
      module: 'FINANCEIRO',
      entityId: id,
      description: `Cartão/conta atualizado: ${id}`,
      performedBy: user?.name || 'Sistema'
    });
  };

  const deleteCard = (id: string) => {
    if (!checkPermission('finance_card_delete')) return;
    if (id === 'main' || id === 'savings') return; // Protect default cards
    const card = cards.find(c => c.id === id);
    setCards(prev => prev.filter(c => c.id !== id));

    addAuditLog({
      action: 'REMOVER_CARTAO',
      module: 'FINANCEIRO',
      entityId: id,
      description: `Cartão/conta removido: ${card?.name || id}`,
      performedBy: user?.name || 'Sistema'
    });
  };

  const resetTestData = () => {
    if (!checkPermission('admin_global_admin')) return;
    
    setProducts(INITIAL_PRODUCTS);
    setPurchases([]);
    setExpenses([]);
    setTransactions([]);
    setSalesReports([]);
    setInventoryHistory([]);
    setStockOperationHistory([]);
    setLockedDays([]);
    setCurrentBalance(1250000);
    setSavingsBalance(500000);
    setCashBalance(850000);
    setTPABalance(400000);
    setCards([
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
    ]);
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setSystemDate(now);
    
    // Clear specific localStorage keys to avoid clearing auth
    const keysToClear = [
      'mg_products', 'mg_purchases', 'mg_expenses', 'mg_expense_categories',
      'mg_inventory_history', 'mg_stock_operation_history', 'mg_current_balance',
      'mg_savings_balance', 'mg_cash_balance', 'mg_tpa_balance', 'mg_cards',
      'mg_transactions', 'mg_sales_reports', 'mg_locked_days', 'mg_system_date'
    ];
    keysToClear.forEach(key => localStorage.removeItem(key));
    
    addAuditLog({
      action: 'RESET_SISTEMA',
      module: 'SISTEMA',
      description: 'Todos os dados de teste foram limpos.',
      performedBy: user?.name || 'Sistema'
    });
  };

  const value = useMemo(() => ({ 
    products, categories, purchases, currentBalance, savingsBalance, cashBalance, tpaBalance, cards, transactions, salesReports, 
    expenses, expenseCategories, inventoryHistory, priceHistory, lockedDays, systemDate,
    getSystemDate, setSystemDate, unlockDay, lockDay, isDayLocked, checkDayLock,
    addExpense, deleteExpense, updateExpense,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    addInventoryLog, addProduct, updateProduct, deleteProduct, addCategory, editCategory, removeCategory,
    addPurchase, getPurchasesByDate, getTodayPurchases, processTransaction, processCashTPADebit,
    addSalesReport, 
    registrarDespesaGlobal,
    updateSalesReport, 
    updateSalesReportJustification, 
    confirmSalesReport, 
    addAuditLog, 
    stockOperationHistory, 
    equipments, addEquipment, updateEquipment, updateEquipmentQty, removeEquipment,
    addCard, updateCard, deleteCard, resetTestData,
    isSyncing, hasPendingChanges, syncData, handleStockMovement
  }), [
    products, categories, purchases, currentBalance, savingsBalance, cashBalance, tpaBalance, cards, transactions, salesReports, 
    expenses, expenseCategories, inventoryHistory, priceHistory, lockedDays, systemDate,
    getSystemDate, setSystemDate, unlockDay, lockDay, isDayLocked, checkDayLock,
    addExpense, deleteExpense, updateExpense,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    addInventoryLog, addProduct, updateProduct, deleteProduct, addCategory, editCategory, removeCategory,
    addPurchase, getPurchasesByDate, getTodayPurchases, processTransaction, processCashTPADebit,
    addSalesReport, 
    registrarDespesaGlobal,
    updateSalesReport, 
    updateSalesReportJustification, 
    confirmSalesReport, 
    addAuditLog, 
    stockOperationHistory, 
    equipments, addEquipment, updateEquipment, updateEquipmentQty, removeEquipment,
    addCard, updateCard, deleteCard, resetTestData,
    isSyncing, hasPendingChanges, syncData, handleStockMovement
  ]);

  return (
    <ProductContext.Provider value={value}>
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
