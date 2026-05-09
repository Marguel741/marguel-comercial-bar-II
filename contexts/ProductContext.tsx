import { db } from '../src/firebase';
import { doc, setDoc, getDoc, collection, onSnapshot, deleteDoc } from 'firebase/firestore';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { Product, PurchaseRecord, Transaction, SalesReport, Expense, InventoryLog, PriceHistoryLog, Equipment, Card, StockOperationLog, AuditLog, ClosureStatus, ExpenseCategory, UserPermissions, UserRole } from '../types';
import { useAuth } from './AuthContext';
import { useAudit } from './AuditContext';
import { hasPermission } from '../src/utils/permissions';
import { cleanDate, formatDateISO, generateUUID } from '../src/utils';

const COL = {
  products:             'products',
  purchases:            'appdata/purchases/records',
  expenses:             'appdata/expenses/records',
  expenseCategories:    'appdata/expense_categories/records',
  inventoryHistory:     'appdata/inventory_history/records',
  stockOperationHistory:'appdata/stock_operations/records',
  transactions:         'appdata/transactions/records',
  salesReports:         'appdata/sales_reports/records',
  cards:                'appdata/cards/records',
  equipments:           'appdata/equipments/records',
  priceHistory:         'appdata/price_history/records',
  balances:             'appdata/balances',
  lockedDays:           'appdata/locked_days',
  notifications:        'appdata/notifications/records',
  proposals:            'appdata/proposals/records',
};

const fsSet = async (path: string, id: string, data: any) => {
  await setDoc(doc(db, path, id), data);
};

const fsSetFixed = async (docPath: string, data: any) => {
  const parts = docPath.split('/');
  const id = parts.pop()!;
  const col = parts.join('/');
  await setDoc(doc(db, col, id), data);
};

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

// PROD-3: Conta Corrente → Conta Bancária, novo cartão Em Mão
const INITIAL_CARDS: Card[] = [
  { id: 'main', name: 'Conta Bancária', holder: 'Marguel Bar', balance: 0, color: 'bg-gradient-to-bl from-[#003366] via-[#004488] to-[#0054A6]', type: 'Corrente', validity: '12/28' },
  { id: 'cash_in_hand', name: 'Em Mão', holder: 'Marguel Bar', balance: 0, color: 'bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900', type: 'Corrente', validity: '12/28' },
  { id: 'savings', name: 'Marguel Reserve', holder: 'Marguel Reserve', balance: 0, color: 'bg-gradient-to-br from-[#F5DF4D] via-[#D4AF37] to-[#AA6C39]', type: 'Poupança', validity: '06/30' },
];

const INITIAL_EQUIPMENTS: Equipment[] = [
  { id: '1', name: 'Mesas', qty: 20, prevQty: 20, status: 'Operacional' },
  { id: '2', name: 'Cadeiras', qty: 80, prevQty: 80, status: 'Operacional' },
  { id: '3', name: 'Grades (Vazias)', qty: 50, prevQty: 48, status: 'Operacional' },
  { id: '4', name: 'Vasilhames', qty: 1200, prevQty: 1200, status: 'Operacional' },
  { id: '5', name: 'Chaves de Abrir', qty: 10, prevQty: 12, status: 'Operacional' },
  { id: '6', name: 'Freezer Vertical', qty: 3, prevQty: 3, status: 'Operacional' },
];

interface ProductContextType {
  products: Product[];
  categories: string[];
  purchases: PurchaseRecord[];
  currentBalance: number;
  savingsBalance: number;
  cashBalance: number;
  tpaBalance: number;
  cashInHandBalance: number;
  totalBalance: number;
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
  addPurchase: (items: Record<string, number>, source: 'Prices' | 'Inventory' | 'Sales', completedBy: string, attachments?: string[], supplier?: string, purchaseDate?: string) => void;
  getPurchasesByDate: (dateStr: string) => Record<string, number>;
  getTodayPurchases: () => Record<string, number>;
  processTransaction: (type: 'deposit' | 'withdraw', account: 'main' | 'savings' | string, amount: number, description: string, category?: string, referenceId?: string, referenceType?: Transaction['referenceType'], performedBy?: string) => void;
  processCashTPADebit: (origin: 'Cash' | 'TPA', amount: number, note: string, referenceId?: string, referenceType?: Transaction['referenceType'], performedBy?: string) => void;
  addSalesReport: (report: SalesReport) => void;
  getConfirmedSalesReports: () => SalesReport[];
  registrarDespesaGlobal: (data: { tipo: string; origem: string; descricao: string; nota: string; valor: number; usuario: string; data_operacional: string; referenceId?: string; }) => void;
  registrarAlmocoBlindado: (report: SalesReport) => void;
  updateSalesReport: (reportId: string, updates: Partial<SalesReport>) => void;
  updateSalesReportJustification: (reportId: string, justificationData: any) => void;
  confirmSalesReport: (reportId: string, confirmedBy: string, isUnilateral?: boolean, reportData?: SalesReport) => void;
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
  runSystemDiagnostic: () => void;
  ignoreLockedDayWithoutClosure: (dateStr: string) => void;
  notifications: any[];
  proposals: any[];
  addProposal: (p: any) => void;
  deleteProposal: (id: string) => void;
  addNotification: (notif: any) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  resolveNotification: (id: string, resolvedBy: string, note?: string) => void;
  transferBetweenCards: (fromId: string, toId: string, amount: number, note: string, performedBy: string) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { addLog } = useAudit();

  const checkPermission = useCallback((permission: keyof UserPermissions) => {
    if (!hasPermission(user, permission)) {
      console.error(`Acesso negado: ${permission}`);
      console.warn(`Sem permissão para executar esta acção: ${permission}`);
      return false;
    }
    return true;
  }, [user]);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventoryHistory, setInventoryHistory] = useState<InventoryLog[]>([]);
  const [stockOperationHistory, setStockOperationHistory] = useState<StockOperationLog[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [salesReports, setSalesReports] = useState<SalesReport[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [savingsBalance, setSavingsBalance] = useState<number>(0);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [tpaBalance, setTPABalance] = useState<number>(0);
  const [cashInHandBalance, setCashInHandBalance] = useState<number>(0);
  const [lockedDays, setLockedDays] = useState<string[]>([]);
  const [systemDate, setSystemDateState] = useState<Date>(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0); return now;
  });
  const [isSyncing] = useState(false);
  const [hasPendingChanges] = useState(false);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(collection(db, COL.products), snap => {
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
      if (data.length > 0) setProducts(data);
      else {
        INITIAL_PRODUCTS.forEach(p => setDoc(doc(db, COL.products, p.id), p));
        setProducts(INITIAL_PRODUCTS);
      }
    }));

    unsubs.push(onSnapshot(collection(db, COL.purchases), snap => {
      setPurchases(snap.docs.map(d => d.data() as PurchaseRecord).sort((a,b) => b.timestamp - a.timestamp));
    }));

    unsubs.push(onSnapshot(collection(db, COL.expenses), snap => {
      setExpenses(snap.docs.map(d => d.data() as Expense).sort((a,b) => b.timestamp - a.timestamp));
    }));

    unsubs.push(onSnapshot(collection(db, COL.expenseCategories), snap => {
      const data = snap.docs.map(d => d.data() as ExpenseCategory);
      if (data.length > 0) setExpenseCategories(data);
      else {
        INITIAL_EXPENSE_CATEGORIES.forEach(c => setDoc(doc(db, COL.expenseCategories, c.id), c));
        setExpenseCategories(INITIAL_EXPENSE_CATEGORIES);
      }
    }));

    unsubs.push(onSnapshot(collection(db, COL.inventoryHistory), snap => {
      setInventoryHistory(snap.docs.map(d => d.data() as InventoryLog));
    }));

    unsubs.push(onSnapshot(collection(db, COL.stockOperationHistory), snap => {
      setStockOperationHistory(snap.docs.map(d => d.data() as StockOperationLog).sort((a,b) => b.timestamp - a.timestamp));
    }));

    unsubs.push(onSnapshot(collection(db, COL.priceHistory), snap => {
      setPriceHistory(snap.docs.map(d => d.data() as PriceHistoryLog).sort((a,b) => b.timestamp - a.timestamp));
    }));

    unsubs.push(onSnapshot(collection(db, COL.transactions), snap => {
      setTransactions(snap.docs.map(d => d.data() as Transaction).sort((a,b) => {
        const da = new Date(a.date).getTime(); const db2 = new Date(b.date).getTime();
        return db2 - da;
      }));
    }));

    unsubs.push(onSnapshot(collection(db, COL.salesReports), snap => {
      setSalesReports(snap.docs.map(d => d.data() as SalesReport).sort((a,b) => b.timestamp - a.timestamp));
    }));

    unsubs.push(onSnapshot(collection(db, COL.cards), snap => {
      const data = snap.docs.map(d => d.data() as Card);
      if (data.length > 0) {
        setCards(data);
        // PROD-3: criar cartão Em Mão se não existir
        if (!data.find(c => c.id === 'cash_in_hand')) {
          const cashCard = INITIAL_CARDS.find(c => c.id === 'cash_in_hand')!;
          setDoc(doc(db, COL.cards, 'cash_in_hand'), cashCard);
        }
        // Renomear Conta Corrente → Conta Bancária se necessário
        const mainCard = data.find(c => c.id === 'main');
        if (mainCard && mainCard.name === 'Conta Corrente') {
          setDoc(doc(db, COL.cards, 'main'), { ...mainCard, name: 'Conta Bancária' });
        }
      } else {
        INITIAL_CARDS.forEach(c => setDoc(doc(db, COL.cards, c.id), c));
        setCards(INITIAL_CARDS);
      }
    }));

    unsubs.push(onSnapshot(collection(db, COL.equipments), snap => {
      const data = snap.docs.map(d => d.data() as Equipment);
      if (data.length > 0) setEquipments(data);
      else {
        INITIAL_EQUIPMENTS.forEach(e => setDoc(doc(db, COL.equipments, e.id), e));
        setEquipments(INITIAL_EQUIPMENTS);
      }
    }));

    
    unsubs.push(onSnapshot(collection(db, COL.proposals), snap => {
      setProposals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));
    unsubs.push(onSnapshot(collection(db, COL.notifications), snap => {
      setNotifications(snap.docs.map(d => d.data()).sort((a,b) => b.timestamp - a.timestamp));
    }));

    unsubs.push(onSnapshot(doc(db, 'appdata', 'balances'), snap => {
      if (snap.exists()) {
        const d = snap.data();
        setCurrentBalance(d.currentBalance ?? 0);
        setSavingsBalance(d.savingsBalance ?? 0);
        setCashBalance(d.cashBalance ?? 0);
        setTPABalance(d.tpaBalance ?? 0);
        setCashInHandBalance(d.cashInHandBalance ?? 0);
        // setCards removido — os cartões já são actualizados pelo listener de COL.cards
        // evita redesenho duplo por cada operação financeira
      }
    }));

    unsubs.push(onSnapshot(doc(db, 'appdata', 'locked_days'), snap => {
      if (snap.exists()) setLockedDays(snap.data().days ?? []);
    }));

    return () => unsubs.forEach(u => u());
  }, []);

  const syncData = useCallback(async () => {
    console.log('Firestore em tempo real — sem necessidade de sincronização manual.');
  }, []);

  const getSystemDate = useCallback(() => {
    const now = new Date();
    const date = new Date(systemDate);
    date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return date;
  }, [systemDate]);

  const getSystemDateStr = () => formatDateISO(getSystemDate());

  const setSystemDate = (date: Date) => {
    const oldDate = systemDate;
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    setSystemDateState(dateOnly);
    addAuditLog({ action: 'ALTERAR_DATA_SISTEMA', module: 'SISTEMA', description: `Data do sistema alterada de ${formatDateISO(oldDate)} para ${formatDateISO(dateOnly)}`, previousValue: formatDateISO(oldDate), newValue: formatDateISO(dateOnly) });
  };

  const addAuditLog = useCallback((log: any) => {
    addLog({
      action: log.action || 'ACÇÃO_DESCONHECIDA',
      module: log.module || 'SISTEMA',
      entityId: log.entityId || null,
      description: log.details || log.description || 'Sem descrição',
      previousValue: log.previousValue || null,
      newValue: log.newValue || null,
    }, user);
  }, [addLog, user]);

  const isDayLocked = useCallback((date: string | Date) => {
    if (!date) return false;
    const dateStr = date instanceof Date ? formatDateISO(date) : date;
    return lockedDays.map(d => cleanDate(d)).includes(cleanDate(dateStr));
  }, [lockedDays]);

  const validateAction = useCallback((type: string, payload: any) => {
    // Só bloquear se for uma operação do dia actual E o dia actual estiver bloqueado
    // Fechos de dias históricos (SALES_CLOSURE) nunca são bloqueados por esta validação
    const isHistoricalClosure = type === 'SALES_CLOSURE' || payload?.isHistorical === true;
    if (!isHistoricalClosure && isDayLocked(getSystemDate())) {
      throw new Error('Operação Negada: O dia actual está bloqueado.');
    }
    if (type === 'SALE' || type === 'SALES_REPORT' || type === 'UPDATE_STOCK') {
      const items = payload.items || (payload.productId ? [{ productId: payload.productId, qty: payload.qty }] : []);
      for (const item of items) {
        const product = products.find(p => p.id === item.productId || p.name === item.name);
        if (product) {
          const finalStock = (type === 'SALE' || type === 'SALES_REPORT') ? product.stock - item.qty : product.stock + item.qty;
          if (finalStock < 0) {
            // Vendas e fechos sempre permitem stock negativo com aviso
            console.warn(`Stock insuficiente para ${product.name}. Stock actual: ${product.stock}. Permitindo stock negativo.`);
          }
        }
      }
    }
    if (payload.price !== undefined && payload.price < 0) throw new Error('Preço inválido: O valor não pode ser negativo.');
    return true;
  }, [products, isDayLocked, getSystemDate]);

  const handleStockMovement = useCallback((productId: string, quantity: number, type: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'MANUAL_ADJUSTMENT', performedBy: string, reason: string, referenceId?: string) => {
    try {
      if ((type === 'ADJUSTMENT' || type === 'MANUAL_ADJUSTMENT') && !reason) throw new Error('Um motivo é obrigatório para ajustes manuais de stock.');
     validateAction('UPDATE_STOCK', { productId, qty: type === 'SALE' ? -quantity : quantity, isHistorical: true });
      const product = products.find(p => p.id === productId);
      if (!product) return;

      let qtyBefore = product.stock;
      let existingLogId: string | null = null;
      if (referenceId) {
        const existingLog = stockOperationHistory.find(l => l.referenceId === referenceId && l.productId === productId);
        if (existingLog) {
          // PC-5: verificar se já foi aplicado — se qtyAdded já está reflectido no stock actual,
          // deduzir evita double-count. Se não está (estado stale), não deduzir.
          const stockAfterLog = existingLog.qtyAfter;
          const currentMatchesLog = Math.abs(product.stock - stockAfterLog) < 2; // tolerância de 1
          if (currentMatchesLog) {
            qtyBefore = qtyBefore - existingLog.qtyAdded;
          }
          existingLogId = existingLog.id;
        }
      }
      let qtyAdded = type === 'SALE' ? -quantity : type === 'PURCHASE' ? quantity : quantity;
      const qtyAfter = Math.max(0, qtyBefore + qtyAdded);
      const isManual = type === 'ADJUSTMENT' || type === 'MANUAL_ADJUSTMENT' || (!referenceId && (type === 'SALE' || type === 'PURCHASE'));

      setDoc(doc(db, COL.products, productId), { ...product, stock: qtyAfter });

      const log: StockOperationLog = {
        id: existingLogId || generateUUID(), productId, productName: product.name,
        type: (isManual ? 'MANUAL_ADJUSTMENT' : type) as any,
        qtyBefore, qtyAdded, qtyAfter, previousStock: qtyBefore, newStock: qtyAfter,
        qtyChanged: qtyAdded, responsible: performedBy, timestamp: Date.now(), performedBy,
        reason: reason || (isManual ? 'Ajuste Manual via Sistema' : 'Movimentação de Stock'),
        referenceId: referenceId ?? null
      };
      setDoc(doc(db, COL.stockOperationHistory, log.id), log);

      addLog({ action: isManual ? 'AJUSTE_MANUAL_STOCK' : (type === 'SALE' ? 'VENDA_STOCK' : 'COMPRA_STOCK'), module: 'STOCK', description: `${Math.abs(quantity)} unidades de ${product.name}. Stock: ${qtyBefore} -> ${qtyAfter}`, entityId: productId, previousValue: qtyBefore, newValue: qtyAfter }, user);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({ action: 'ERROR' as any, module: 'STOCK', description: `ERRO: ${msg}`, entityId: productId }, user);
      throw error;
    }
  }, [user, addLog, validateAction, products, stockOperationHistory]);

  const processTransaction = useCallback((
    type: 'deposit' | 'withdraw',
    account: 'main' | 'savings' | 'cash' | 'tpa' | 'cash_in_hand' | string,
    amount: number, description: string, category?: string,
    referenceId?: string, referenceType?: Transaction['referenceType'],
    performedBy?: string, date?: string
  ) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    try {
      const existingTrans = referenceId ? transactions.filter(t => t.referenceId === referenceId && t.referenceType === referenceType) : [];
    // Apagar TODAS as transacções antigas do Firestore (não só reverter saldo)
    if (existingTrans.length > 1) {
      existingTrans.slice(1).forEach(t => deleteDoc(doc(db, COL.transactions, t.id)));
    }
      let newCB = currentBalance, newSB = savingsBalance, newCash = cashBalance, newTPA = tpaBalance, newCashInHand = cashInHandBalance;
      let accountName = '';

      if (existingTrans.length > 0) {
        existingTrans.forEach(t => {
          const amt = t.amount; const isEntry = t.type === 'entrada';
          if (t.accountName === 'Caixa (Dinheiro)') newCash += isEntry ? -amt : amt;
          else if (t.accountName === 'TPA') newTPA += isEntry ? -amt : amt;
          else if (t.accountName === 'Conta Bancária' || t.accountName === 'Conta Corrente') newCB += isEntry ? -amt : amt;
          else if (t.accountName === 'Marguel Reserve' || t.accountName === 'Conta Poupança') newSB += isEntry ? -amt : amt;
          else if (t.accountName === 'Em Mão') newCashInHand += isEntry ? -amt : amt;
        });
      }

      let targetAccount = account;

      if (targetAccount === 'main') { newCB += type === 'deposit' ? amount : -amount; accountName = 'Conta Bancária'; }
      else if (targetAccount === 'savings') { newSB += type === 'deposit' ? amount : -amount; accountName = 'Marguel Reserve'; }
      else if (targetAccount === 'cash') { newCash += type === 'deposit' ? amount : -amount; accountName = 'Caixa (Dinheiro)'; }
      else if (targetAccount === 'tpa') { newTPA += type === 'deposit' ? amount : -amount; accountName = 'TPA'; }
      else if (targetAccount === 'cash_in_hand') { newCashInHand += type === 'deposit' ? amount : -amount; accountName = 'Em Mão'; }
      else {
        const card = cards.find(c => c.id === targetAccount);
        if (card) {
          accountName = card.name;
          if (card.id === 'main') newCB += type === 'deposit' ? amount : -amount;
          else if (card.id === 'savings') newSB += type === 'deposit' ? amount : -amount;
          else if (card.id === 'cash_in_hand') newCashInHand += type === 'deposit' ? amount : -amount;
        }
      }

      setCurrentBalance(newCB); setSavingsBalance(newSB); setCashBalance(newCash); setTPABalance(newTPA); setCashInHandBalance(newCashInHand);
      setDoc(doc(db, 'appdata', 'balances'), { currentBalance: newCB, savingsBalance: newSB, cashBalance: newCash, tpaBalance: newTPA, cashInHandBalance: newCashInHand });
      setCards(prev => prev.map(c => {
        if (c.id === 'main') return { ...c, balance: newCB };
        if (c.id === 'savings') return { ...c, balance: newSB };
        if (c.id === 'cash_in_hand') return { ...c, balance: newCashInHand };
        return c;
      }));
      const mainCard = cards.find(c => c.id === 'main');
const savingsCard = cards.find(c => c.id === 'savings');
const cashCard = cards.find(c => c.id === 'cash_in_hand');
if (mainCard) setDoc(doc(db, COL.cards, 'main'), { ...mainCard, balance: newCB });
if (savingsCard) setDoc(doc(db, COL.cards, 'savings'), { ...savingsCard, balance: newSB });
if (cashCard) setDoc(doc(db, COL.cards, 'cash_in_hand'), { ...cashCard, balance: newCashInHand });
      
      const targetDate = date || formatDateISO(getSystemDate());
      const transId = existingTrans.length > 0 ? existingTrans[0].id : generateUUID();

      const newTrans: Transaction = {
        id: transId,
        type: type === 'deposit' ? 'entrada' : 'saida',
        category: category || accountName || 'Cartão',
        amount,
        date: (date || formatDateISO(getSystemDate())) + ', ' + getSystemDate().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
        description,
        referenceId: referenceId ?? null,
        referenceType: referenceType ?? null,
        performedBy: performedBy ?? null,
        accountName: accountName || 'Conta Desconhecida',
        status: 'ATIVO',
        operationalDay: targetDate,
        timestamp: Date.now()
      };
      setDoc(doc(db, COL.transactions, transId), newTrans);

      if (!referenceType) {
        addAuditLog({ action: 'TRANSACAO_MANUAL', module: 'FINANCEIRO', entityId: transId, description: `${type === 'deposit' ? 'Depósito' : 'Levantamento'} de ${amount.toLocaleString('pt-AO')} Kz em ${accountName}. ${description}`, performedBy: performedBy || user?.name || 'Sistema' });
      }
    } catch (error) {
      console.error('Erro ao processar transacção:', error);
    }
  }, [transactions, cards, user, currentBalance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance, getSystemDate, addAuditLog]);

  const adjustFinancialsForReport = useCallback((oldReport: SalesReport, newReport: SalesReport) => {
    const reportDateStr = (newReport.dateISO || newReport.date || '').split('T')[0];
    const newCash = newReport.cash ?? (newReport as any).financials?.cash ?? 0;
    const newTpa = (newReport.tpa ?? 0) + (newReport.transfer ?? 0) || ((newReport as any).financials?.ticket ?? 0) + ((newReport as any).financials?.transfer ?? 0);
    const totalLifted = newCash + newTpa;
    const timeStr = getSystemDate().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });

    const existingTrans = transactions.filter(t =>
      (t.referenceId === newReport.id ||
       t.referenceId === `${newReport.id}_cash` ||
       t.referenceId === `${newReport.id}_tpa` ||
       t.referenceId === `${newReport.id}_closure`) &&
      t.referenceType === 'day_closure'
    );
    existingTrans.forEach(t => deleteDoc(doc(db, COL.transactions, t.id)));

    let newCB = currentBalance;
    let newCashBal = cashBalance;
    let newTPABal = tpaBalance;
    let newCashInHandBal = cashInHandBalance;
    existingTrans.forEach(t => {
      const isEntry = t.type === 'entrada';
      if (t.accountName === 'Conta Bancária' || t.accountName === 'Conta Corrente') newCB += isEntry ? -t.amount : t.amount;
      if (t.accountName === 'Caixa (Dinheiro)') newCashBal += isEntry ? -t.amount : t.amount;
      else if (t.accountName === 'TPA') newTPABal += isEntry ? -t.amount : t.amount;
      else if (t.accountName === 'Em Mão') newCashInHandBal += isEntry ? -t.amount : t.amount;
    });

    // PROD-3: TPA+Transfer → Conta Bancária, Cash → Em Mão
    newCB = newCB + newTpa;
    // NÃO somar ao newCashBal — evita duplicação (igual ao confirmSalesReport)
    newTPABal = newTPABal + newTpa;
    newCashInHandBal = newCashInHandBal + newCash;
    setCurrentBalance(newCB);
    setCashBalance(newCashBal);
    setTPABalance(newTPABal);
    setCashInHandBalance(newCashInHandBal);
    setCards(prev => prev.map(c => {
      if (c.id === 'main') return { ...c, balance: newCB };
      if (c.id === 'cash_in_hand') return { ...c, balance: newCashInHandBal };
      return c;
    }));
    setDoc(doc(db, 'appdata', 'balances'), { currentBalance: newCB, savingsBalance, cashBalance: newCashBal, tpaBalance: newTPABal, cashInHandBalance: newCashInHandBal });
    const mainCard2 = cards.find(c => c.id === 'main');
    const cashCard2 = cards.find(c => c.id === 'cash_in_hand');
    if (mainCard2) setDoc(doc(db, COL.cards, 'main'), { ...mainCard2, balance: newCB });
    if (cashCard2) setDoc(doc(db, COL.cards, 'cash_in_hand'), { ...cashCard2, balance: newCashInHandBal });
    
    if (totalLifted > 0) {
      setDoc(doc(db, COL.transactions, `${newReport.id}_closure`), {
        id: `${newReport.id}_closure`, type: 'entrada', category: 'Fecho de Caixa', amount: totalLifted,
        date: `${reportDateStr}, ${timeStr}`,
        description: `Fecho Editado (${reportDateStr}) — Cash: ${newCash.toLocaleString('pt-AO')} Kz | TPA: ${newTpa.toLocaleString('pt-AO')} Kz`,
        referenceId: newReport.id, referenceType: 'day_closure', performedBy: user?.name || 'Sistema',
        accountName: 'Conta Bancária', status: 'ATIVO', operationalDay: reportDateStr, timestamp: Date.now()
      });
    }
  }, [user, transactions, currentBalance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance, cards, getSystemDate]);

  // PROD-3: transferência entre cartões — 1 registo com referência cruzada
  const transferBetweenCards = useCallback((fromId: string, toId: string, amount: number, note: string, performedBy: string) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const fromCard = cards.find(c => c.id === fromId);
    const toCard = cards.find(c => c.id === toId);
    if (!fromCard || !toCard) return;

    const transId = generateUUID();
    const targetDate = formatDateISO(getSystemDate());
    const timeStr = getSystemDate().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
    const description = `Transferência ${fromCard.name} → ${toCard.name} — ${amount.toLocaleString('pt-AO')} Kz`;

    const newFromBalance = fromCard.balance - amount;
    const newToBalance = toCard.balance + amount;
    setDoc(doc(db, COL.cards, fromId), { ...fromCard, balance: newFromBalance });
    setDoc(doc(db, COL.cards, toId), { ...toCard, balance: newToBalance });

    setCards(prev => prev.map(c => {
      if (c.id === fromId) return { ...c, balance: newFromBalance };
      if (c.id === toId) return { ...c, balance: newToBalance };
      return c;
    }));

    const balanceUpdate: any = {
      currentBalance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance
    };
    if (fromId === 'main') balanceUpdate.currentBalance = newFromBalance;
    if (fromId === 'cash_in_hand') balanceUpdate.cashInHandBalance = newFromBalance;
    if (fromId === 'savings') balanceUpdate.savingsBalance = newFromBalance;
    if (toId === 'main') balanceUpdate.currentBalance = newToBalance;
    if (toId === 'cash_in_hand') balanceUpdate.cashInHandBalance = newToBalance;
    if (toId === 'savings') balanceUpdate.savingsBalance = newToBalance;
    setDoc(doc(db, 'appdata', 'balances'), balanceUpdate);

    if (fromId === 'main') setCurrentBalance(newFromBalance);
    if (fromId === 'cash_in_hand') setCashInHandBalance(newFromBalance);
    if (fromId === 'savings') setSavingsBalance(newFromBalance);
    if (toId === 'main') setCurrentBalance(newToBalance);
    if (toId === 'cash_in_hand') setCashInHandBalance(newToBalance);
    if (toId === 'savings') setSavingsBalance(newToBalance);

    const trans: Transaction = {
      id: transId,
      type: 'saida',
      category: 'Transferência',
      amount,
      date: `${targetDate}, ${timeStr}`,
      description,
      referenceId: transId,
      referenceType: 'withdrawal',
      performedBy,
      accountName: fromCard.name,
      status: 'ATIVO',
      operationalDay: targetDate,
      timestamp: Date.now(),
      isTransfer: true,
      transferCounterpartId: toId,
    };
    setDoc(doc(db, COL.transactions, transId), trans);

    addAuditLog({
      action: 'TRANSFERENCIA_CARTOES',
      module: 'FINANCEIRO',
      entityId: transId,
      description: `${description}. Por: ${performedBy}`,
      performedBy,
    });
  }, [cards, getSystemDate, currentBalance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance, addAuditLog]);

  const addProposal = useCallback((p: any) => {
    const doc_id = p.id || generateUUID();
    setDoc(doc(db, COL.proposals, doc_id), { ...p, id: doc_id });
  }, []);

  const deleteProposal = useCallback((id: string) => {
    deleteDoc(doc(db, COL.proposals, id));
  }, []);

  const addNotification = useCallback((notif: any) => {
    const newNotif = { ...notif, id: generateUUID(), timestamp: Date.now(), read: false };
    // PROD-7: setDoc primeiro — onSnapshot actualiza estado automaticamente
    setDoc(doc(db, COL.notifications, newNotif.id), newNotif);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (notif) setDoc(doc(db, COL.notifications, id), { ...notif, read: true });
  }, [notifications]);

  const resolveNotification = useCallback((id: string, resolvedBy: string, note?: string) => {
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;
    setDoc(doc(db, COL.notifications, id), {
      ...notif,
      resolved: true,
      resolvedBy,
      resolvedAt: Date.now(),
      resolvedNote: note ?? null,
    });
  }, [notifications]);

  const clearNotifications = useCallback(() => {
    notifications.forEach(n => deleteDoc(doc(db, COL.notifications, n.id)));
  }, [notifications]);

  const lockDay = useCallback((dateStr: string, performedBy: string) => {
    const cleanTarget = cleanDate(dateStr);
    const newDays = lockedDays.includes(cleanTarget) ? lockedDays : [...lockedDays, cleanTarget];
    setLockedDays(newDays);
    setDoc(doc(db, 'appdata', 'locked_days'), { days: newDays });
    ignoreLockedDayWithoutClosure(dateStr);
    addAuditLog({ action: 'BLOQUEAR_DIA', module: 'CALENDÁRIO', entityId: cleanTarget, description: `Dia ${cleanTarget} bloqueado.`, performedBy });
  }, [lockedDays, addAuditLog]);

  const unlockDay = useCallback((dateStr: string, reason: string) => {
    if (!hasPermission(user, 'calendar_unlock')) { console.warn('Sem permissão para desbloquear dias.'); return; }
    const cleanTarget = cleanDate(dateStr);
    const newDays = lockedDays.filter(d => cleanDate(d) !== cleanTarget);
    setLockedDays(newDays);
    setDoc(doc(db, 'appdata', 'locked_days'), { days: newDays });
    addAuditLog({ action: 'DESBLOQUEAR_DIA', module: 'CALENDÁRIO', entityId: cleanTarget, description: `Dia ${cleanTarget} desbloqueado. Motivo: ${reason}`, performedBy: user?.name || 'Sistema' });
  }, [lockedDays, user, addAuditLog]);

  const checkDayLock = useCallback((date: Date | string) => {
    if (isDayLocked(date)) {
      const dateStr = typeof date === 'string' ? date : formatDateISO(date);
      addAuditLog({ action: 'TENTATIVA_EDICAO_BLOQUEADA', module: 'SISTEMA', entityId: dateStr, description: `Tentativa de edição em dia bloqueado por ${user?.name || 'Desconhecido'}.`, performedBy: user?.name || 'Sistema' });
      console.warn('Dia bloqueado. Contacte administrador');
      throw new Error('Dia bloqueado. Contacte administrador');
    }
  }, [isDayLocked, addAuditLog, user]);

  const ignoreLockedDayWithoutClosure = useCallback((dateStr: string) => {
    const clean = cleanDate(dateStr);
    if (isDayLocked(dateStr)) {
      const hasConfirmedReport = salesReports.some(r => cleanDate(r.dateISO || r.date) === clean && r.status === ClosureStatus.FECHO_CONFIRMADO);
      if (!hasConfirmedReport) {
        transactions.filter(t => cleanDate(t.operationalDay || t.date) === clean).forEach(t => deleteDoc(doc(db, COL.transactions, t.id)));
      }
      salesReports.filter(r => {
        const isSameDay = cleanDate(r.dateISO || r.date) === clean;
        const isConfirmedOrPartial = r.status === ClosureStatus.FECHO_CONFIRMADO || r.status === ClosureStatus.FECHO_PARCIAL;
        return isSameDay && !isConfirmedOrPartial;
      }).forEach(r => deleteDoc(doc(db, COL.salesReports, r.id)));
      addAuditLog({ action: 'LIMPEZA_DIA_BLOQUEADO', module: 'VENDAS', entityId: clean, description: `Limpeza de segurança no dia ${clean}.`, performedBy: 'Sistema' });
    }
  }, [isDayLocked, salesReports, transactions, addAuditLog]);

  const addExpense = useCallback((expense: Expense) => {
    if (!checkPermission('expenses_execute')) return;
    setDoc(doc(db, COL.expenses, expense.id), expense);
    addAuditLog({ action: 'ADICIONAR_DESPESA', module: 'FINANCEIRO', entityId: expense.id, description: `Despesa: ${expense.title} (${expense.amount.toLocaleString('pt-AO')} Kz)`, performedBy: expense.user });
    if (expense.amount > 0) processTransaction('withdraw', 'main', expense.amount, `Despesa: ${expense.title}`, expense.category, expense.id, 'expense', expense.user);
  }, [checkPermission, addAuditLog, processTransaction]);

  const deleteExpense = useCallback((id: string, deletedBy: string) => {
    if (!checkPermission('expenses_execute')) return;
    const expense = expenses.find(e => e.id === id);
    if (!expense || expense.status === 'REVERSED' || expense.isReverted) return;
    // PROD-6: despesas informativas não criam estorno financeiro
    if (expense.isInformativeOnly) {
      deleteDoc(doc(db, COL.expenses, id));
      addAuditLog({ action: 'REMOVER_DESPESA_INFORMATIVA', module: 'FINANCEIRO', entityId: id, description: `Despesa informativa "${expense.title}" removida por ${deletedBy}. Sem impacto financeiro.`, performedBy: deletedBy });
      return;
    }
    setDoc(doc(db, COL.expenses, id), { ...expense, status: 'REVERSED', isReverted: true });
    const reversalExpense: Expense = { ...expense, id: `rev_${expense.id}_${generateUUID()}`, title: `ESTORNO: ${expense.title}`, amount: -expense.amount, notes: `Estorno por ${deletedBy}. Ref: ${expense.id}`, timestamp: getSystemDate().getTime(), user: deletedBy, status: 'REVERSAL', isReverted: true };
    setDoc(doc(db, COL.expenses, reversalExpense.id), reversalExpense);
    if (expense.amount > 0) processTransaction('deposit', 'main', expense.amount, `Estorno: ${expense.title}`, 'Estorno', expense.id, 'reversal', deletedBy);
    addAuditLog({ action: 'ESTORNO_DESPESA', module: 'FINANCEIRO', entityId: id, description: `Estorno de ${expense.title} por ${deletedBy}`, performedBy: deletedBy });
  }, [checkPermission, expenses, getSystemDate, processTransaction, addAuditLog]);

  const updateExpense = useCallback((updated: Expense) => {
    setDoc(doc(db, COL.expenses, updated.id), updated);
    addAuditLog({ action: 'EDITAR_DESPESA', module: 'FINANCEIRO', entityId: updated.id, description: `Despesa editada: ${updated.title}`, performedBy: user?.name || 'Sistema' });
  }, [addAuditLog, user]);

  const addExpenseCategory = useCallback((category: Omit<ExpenseCategory, 'id'>) => {
    if (!checkPermission('expenses_category_manage')) return;
    const newCat = { ...category, id: Math.random().toString(36).substr(2, 9) };
    setDoc(doc(db, COL.expenseCategories, newCat.id), newCat);
    addAuditLog({ action: 'CRIAR_CATEGORIA_DESPESA', module: 'FINANCEIRO', entityId: newCat.id, description: `Categoria criada: ${newCat.name}`, performedBy: user?.name || 'Sistema' });
  }, [checkPermission, addAuditLog, user]);

  const updateExpenseCategory = useCallback((id: string, updates: Partial<ExpenseCategory>) => {
    if (!checkPermission('expenses_category_manage')) return;
    const cat = expenseCategories.find(c => c.id === id);
    if (cat) setDoc(doc(db, COL.expenseCategories, id), { ...cat, ...updates });
    addAuditLog({ action: 'EDITAR_CATEGORIA_DESPESA', module: 'FINANCEIRO', entityId: id, description: `Categoria actualizada: ${id}`, performedBy: user?.name || 'Sistema' });
  }, [checkPermission, expenseCategories, addAuditLog, user]);

  const deleteExpenseCategory = useCallback((id: string) => {
    if (!checkPermission('expenses_category_manage')) return;
    const cat = expenseCategories.find(c => c.id === id);
    deleteDoc(doc(db, COL.expenseCategories, id));
    addAuditLog({ action: 'REMOVER_CATEGORIA_DESPESA', module: 'FINANCEIRO', entityId: id, description: `Categoria removida: ${cat?.name || id}`, performedBy: user?.name || 'Sistema' });
  }, [checkPermission, expenseCategories, addAuditLog, user]);

  const addInventoryLog = useCallback((log: InventoryLog) => {
    try {
      validateAction('INVENTORY_LOG', {});
      setDoc(doc(db, COL.inventoryHistory, log.id), log);
      addAuditLog({ action: 'REGISTRO_INVENTARIO', module: 'INVENTARIO', entityId: log.id, description: `Inventário registado. Status: ${log.status}`, performedBy: log.performedBy });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({ action: 'ERROR' as any, module: 'INVENTARIO', description: `ERRO: ${msg}`, entityId: log.id }, user);
      throw error;
    }
  }, [validateAction, addAuditLog, addLog, user]);

  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    try {
      if (!checkPermission('inventory_product_create')) return;
      validateAction('ADD_PRODUCT', {});
      const newProduct = { ...product, id: generateUUID() };
      setDoc(doc(db, COL.products, newProduct.id), newProduct);
      addAuditLog({ action: 'CRIAR_PRODUTO', module: 'INVENTARIO', entityId: newProduct.id, description: `Produto ${newProduct.name} criado.`, performedBy: user?.name || 'Sistema' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({ action: 'ERROR' as any, module: 'INVENTARIO', description: `ERRO: ${msg}`, entityId: product.name }, user);
      throw error;
    }
  }, [checkPermission, validateAction, addAuditLog, addLog, user]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>): Promise<void> => {
    try {
      if (!checkPermission('inventory_product_edit')) return;
      validateAction('UPDATE_PRODUCT', {});
      const product = products.find(p => p.id === id);
      if (!product) return;

      // PC-1: sanitizar NaN antes de escrever no Firestore
      const sanitized: Partial<Product> = {};
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined) continue;
        if (typeof v === 'number' && isNaN(v)) continue; // bloquear NaN
        (sanitized as any)[k] = v;
      }

      if (
        (sanitized.sellPrice !== undefined && sanitized.sellPrice !== product.sellPrice) ||
        (sanitized.buyPrice !== undefined && sanitized.buyPrice !== product.buyPrice)
      ) {
        const priceLog: PriceHistoryLog = {
          id: generateUUID(), productId: id, productName: product.name,
          oldSellPrice: product.sellPrice, newSellPrice: sanitized.sellPrice ?? product.sellPrice,
          oldBuyPrice: product.buyPrice, newBuyPrice: sanitized.buyPrice ?? product.buyPrice,
          changedBy: user?.name || 'Sistema', timestamp: Date.now(),
          date: formatDateISO(getSystemDate()), reason: 'Actualização manual de preço',
        };
        await setDoc(doc(db, COL.priceHistory, priceLog.id), priceLog);
      }

      if (sanitized.stock !== undefined && sanitized.stock !== product.stock) {
        const diff = sanitized.stock - product.stock;
        handleStockMovement(id, diff, 'MANUAL_ADJUSTMENT', user?.name || 'Sistema', 'Ajuste via Edição de Produto');
        const { stock, ...otherUpdates } = sanitized;
        if (Object.keys(otherUpdates).length > 0) {
          await setDoc(doc(db, COL.products, id), { ...product, ...otherUpdates });
        }
      } else {
        await setDoc(doc(db, COL.products, id), { ...product, ...sanitized });
      }
      addAuditLog({ action: 'EDITAR_PRODUTO', module: 'INVENTARIO', entityId: id, description: `Produto ${product.name} actualizado.`, performedBy: user?.name || 'Sistema' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({ action: 'ERROR' as any, module: 'INVENTARIO', description: `ERRO: ${msg}`, entityId: id }, user);
      throw error;
    }
  }, [checkPermission, validateAction, products, handleStockMovement, addAuditLog, addLog, user, getSystemDate]);

  const deleteProduct = useCallback((id: string) => {
    try {
      if (!checkPermission('inventory_product_delete')) return;
      validateAction('DELETE_PRODUCT', {});
      const product = products.find(p => p.id === id);
      setDoc(doc(db, COL.products, id), { ...product, isArchived: true });
      addAuditLog({ action: 'ARQUIVAR_PRODUTO', module: 'INVENTARIO', entityId: id, description: `Produto ${product?.name || id} arquivado.`, performedBy: user?.name || 'Sistema' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({ action: 'ERROR' as any, module: 'INVENTARIO', description: `ERRO: ${msg}`, entityId: id }, user);
      throw error;
    }
  }, [checkPermission, validateAction, products, addAuditLog, addLog, user]);

  const addCategory = useCallback((category: string) => {
    if (!checkPermission('inventory_category_manage')) return;
    if (!categories.includes(category)) {
      setCategories(prev => [...prev, category].sort());
      addAuditLog({ action: 'CRIAR_CATEGORIA', module: 'INVENTARIO', description: `Categoria ${category} criada.`, performedBy: user?.name || 'Sistema' });
    }
  }, [checkPermission, categories, addAuditLog, user]);

  const editCategory = useCallback(async (oldName: string, newName: string) => {
    if (!checkPermission('inventory_category_manage')) return;
    if (!newName || oldName === newName) return;
    setCategories(prev => prev.map(c => c === oldName ? newName : c));
    products.filter(p => p.category === oldName).forEach(p => setDoc(doc(db, COL.products, p.id), { ...p, category: newName }));
    addAuditLog({ action: 'EDITAR_CATEGORIA', module: 'INVENTARIO', description: `Categoria ${oldName} → ${newName}.`, performedBy: user?.name || 'Sistema' });
  }, [checkPermission, products, addAuditLog, user]);

  const removeCategory = useCallback((category: string) => {
    if (!checkPermission('inventory_category_manage')) return;
    setCategories(prev => prev.filter(c => c !== category));
    addAuditLog({ action: 'REMOVER_CATEGORIA', module: 'INVENTARIO', description: `Categoria ${category} removida.`, performedBy: user?.name || 'Sistema' });
  }, [checkPermission, addAuditLog, user]);

  const addPurchase = useCallback((items: Record<string, number>, source: 'Prices' | 'Inventory' | 'Sales', completedBy: string, attachments?: string[], supplier?: string, purchaseDate?: string) => {
    try {
      if (!checkPermission('purchases_execute')) return;
      validateAction('PURCHASE', { date: systemDate });
      let totalValue = 0;
      const purchaseId = generateUUID();
      products.forEach(p => {
        if (items[p.id]) totalValue += p.buyPrice * (p.packSize || 1) * items[p.id];
      });
       if (user?.permissions?.purchases_limit && totalValue > user.permissions.purchases_limit) { console.warn(`Limite de compra excedido!`); return; }
      Object.entries(items).forEach(([productId, qtyPacks]) => {
        if (qtyPacks > 0) {
          const p = products.find(prod => prod.id === productId);
          if (p) handleStockMovement(productId, qtyPacks * (p.packSize || 1), 'PURCHASE', completedBy, 'Compra de Stock', purchaseId);
        }
      });
      const targetDateStr = purchaseDate || getSystemDateStr();
      const newRecord: PurchaseRecord = { id: purchaseId, name: source === 'Inventory' ? 'Ajuste de Stock (Inventário)' : source === 'Sales' ? 'Compra Rápida (Vendas)' : 'Compra Efectuada', date: targetDateStr, items, total: totalValue, completedBy, supplier, timestamp: getSystemDate().getTime(), source, attachments, synced: true };
      setDoc(doc(db, COL.purchases, purchaseId), newRecord);
      if (totalValue > 0) processTransaction('withdraw', 'main', totalValue, `Compra de estoque (${targetDateStr})`, 'Compra de Estoque', purchaseId, 'purchase', completedBy, targetDateStr);
      addAuditLog({ action: 'CRIAR_COMPRA', module: 'COMPRAS', entityId: purchaseId, description: `Compra: ${totalValue.toLocaleString('pt-AO')} Kz. Origem: ${source}`, performedBy: completedBy });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({ action: 'ERROR' as any, module: 'COMPRAS', description: `ERRO: ${msg}`, entityId: source }, user);
      throw error;
    }
  }, [checkPermission, validateAction, products, user, systemDate, getSystemDate, getSystemDateStr, handleStockMovement, processTransaction, addAuditLog, addLog]);

  const getPurchasesByDate = useCallback((dateStr: string) => {
    const totals: Record<string, number> = {};
    purchases.filter(p => p.date === dateStr).forEach(record => {
      Object.entries(record.items).forEach(([id, qtyPacks]) => {
        const p = products.find(prod => prod.id === id);
        totals[id] = (totals[id] || 0) + Number(qtyPacks) * (p?.packSize || 1);
      });
    });
    return totals;
  }, [purchases, products]);

  const getTodayPurchases = useCallback(() => getPurchasesByDate(getSystemDateStr()), [getPurchasesByDate, getSystemDateStr]);

  const processCashTPADebit = useCallback((origin: 'Cash' | 'TPA', amount: number, note: string, referenceId?: string, referenceType?: Transaction['referenceType'], performedBy?: string, date?: string) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    validateAction('TRANSACTION', { date: date || formatDateISO(getSystemDate()), amount });
    const newCash = origin === 'Cash' ? cashBalance - amount : cashBalance;
    const newTPA = origin === 'TPA' ? tpaBalance - amount : tpaBalance;
    setCashBalance(newCash); setTPABalance(newTPA);
    setDoc(doc(db, 'appdata', 'balances'), { currentBalance, savingsBalance, cashBalance: newCash, tpaBalance: newTPA, cashInHandBalance });
    const transId = generateUUID();
    const targetDate = date || formatDateISO(getSystemDate());
    const newTrans: Transaction = {
      id: transId, type: 'saida', category: `Débito ${origin}`, amount,
      date: targetDate + ', ' + getSystemDate().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
      description: note,
      referenceId: referenceId ?? null,
      referenceType: referenceType ?? null,
      performedBy: performedBy ?? null,
      accountName: origin === 'Cash' ? 'Caixa (Dinheiro)' : 'TPA',
      status: 'ATIVO',
      operationalDay: targetDate,
      timestamp: Date.now()
    };
    setDoc(doc(db, COL.transactions, transId), newTrans);
    addAuditLog({ action: 'DEBITO_CASH_TPA', module: 'FINANCEIRO', entityId: transId, description: `Débito ${origin}: ${amount.toLocaleString('pt-AO')} Kz. ${note}`, performedBy: performedBy || user?.name || 'Sistema' });
  }, [validateAction, getSystemDate, cashBalance, tpaBalance, currentBalance, savingsBalance, cashInHandBalance, addAuditLog, user]);

  const registrarDespesaGlobal = useCallback((data: { tipo: string; origem: string; descricao: string; nota: string; valor: number; usuario: string; data_operacional: string; referenceId?: string; }) => {
    try {
      validateAction('EXPENSE', { date: data.data_operacional, amount: data.valor });
      const existingExpense = data.referenceId
        ? expenses.find(e => e.id === data.referenceId || e.notes?.includes(data.referenceId!))
        : expenses.find(e => e.title === data.descricao && e.date === data.data_operacional && e.origin === data.origem);
      if (existingExpense) {
        if (existingExpense.amount !== data.valor || existingExpense.title !== data.descricao) {
          setDoc(doc(db, COL.expenses, existingExpense.id), { ...existingExpense, amount: data.valor, title: data.descricao, notes: data.nota });
          processTransaction('withdraw', 'main', data.valor, `Despesa (${data.origem}): ${data.descricao}`, data.tipo, existingExpense.id, 'expense', data.usuario, data.data_operacional);
          addAuditLog({ action: 'EDITAR_DESPESA', module: 'FINANCEIRO', entityId: existingExpense.id, description: `Despesa actualizada (${data.origem}): ${data.descricao}`, performedBy: data.usuario });
        }
        return;
      }
      const newExpense: Expense = { id: data.referenceId || generateUUID(), title: data.descricao, amount: data.valor, category: data.tipo, date: data.data_operacional, timestamp: getSystemDate().getTime(), user: data.usuario, notes: data.nota, origin: data.origem, attachments: [] };
      setDoc(doc(db, COL.expenses, newExpense.id), newExpense);
      if (newExpense.amount > 0) processTransaction('withdraw', 'main', newExpense.amount, `Despesa (${data.origem}): ${newExpense.title}`, newExpense.category, newExpense.id, 'expense', newExpense.user, data.data_operacional);
      addAuditLog({ action: 'ADICIONAR_DESPESA', module: 'FINANCEIRO', entityId: newExpense.id, description: `Despesa global (${data.origem}): ${data.descricao}`, performedBy: data.usuario });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({ action: 'ERROR' as any, module: 'FINANCEIRO', description: `ERRO: ${msg}`, entityId: data.origem }, user);
      throw error;
    }
  }, [validateAction, expenses, getSystemDate, processTransaction, addAuditLog, addLog, user]);

  const registrarAlmocoBlindado = useCallback((report: SalesReport) => {
    const lunchVal = report.lunchExpense ?? (report as any).financials?.lunch ?? 0;
    const isFinal = report.isFinalClosure || report.type === 'FINAL' || report.status === ClosureStatus.FECHO_CONFIRMADO;
    if (lunchVal > 0 && isFinal && !report.lunchProcessed) {
      const dateKey = new Date(report.dateISO || report.date).toISOString().split('T')[0];
      const lunchRefId = `LUNCH_EXPENSE_${dateKey}`;
      if (!expenses.find(e => e.id === lunchRefId)) {
        const lunchRecord: Expense = { id: lunchRefId, title: `Almoço (${dateKey})`, amount: lunchVal, category: 'DESPESA_OPERACIONAL', date: dateKey, timestamp: getSystemDate().getTime(), user: report.closedBy || 'Sistema', notes: 'Despesa operacional — apenas informativo.', origin: 'CONTROLE_VENDAS', attachments: [], isInformativeOnly: true };
        setDoc(doc(db, COL.expenses, lunchRefId), lunchRecord);
      }
    }
  }, [expenses, getSystemDate]);

  const getConfirmedSalesReports = useCallback(() => salesReports.filter(r => r.status === ClosureStatus.FECHO_CONFIRMADO), [salesReports]);

  const addSalesReport = useCallback((report: SalesReport) => {
    try {
      if (!checkPermission('sales_execute')) return;
      validateAction('SALES_REPORT', { date: report.date, items: report.itemsSummary });
      const finalReport = { ...report, id: report.id || generateUUID(), synced: true, stockUpdated: false };
      const existingReport = salesReports.find(r => {
        const rDate = ((r as any).dateISO ? (r as any).dateISO.split('T')[0] : r.date) || '';
        const repDate = ((report as any).dateISO ? (report as any).dateISO.split('T')[0] : report.date) || '';
        return rDate && repDate && rDate === repDate;
      });
      if (existingReport) {
        if (existingReport.status === ClosureStatus.BLOQUEADO || existingReport.status === ClosureStatus.DIA_BLOQUEADO) return;
        if (existingReport.status === ClosureStatus.FECHO_CONFIRMADO && existingReport.processedFinancials) {
          adjustFinancialsForReport(existingReport, finalReport as SalesReport);
          finalReport.status = existingReport.status;
          (finalReport as any).processedFinancials = existingReport.processedFinancials;
          (finalReport as any).stockUpdated = existingReport.stockUpdated;
        }
      }
      setDoc(doc(db, COL.salesReports, finalReport.id), finalReport);
      if (finalReport.lunchExpense > 0 && !finalReport.lunchProcessed) { registrarAlmocoBlindado(finalReport as SalesReport); finalReport.lunchProcessed = true; }
      addAuditLog({ action: 'CRIAR_RELATORIO_VENDAS', module: 'VENDAS', entityId: finalReport.id, description: `Relatório criado/actualizado para ${finalReport.date}`, performedBy: finalReport.closedBy });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({ action: 'ERROR' as any, module: 'VENDAS', description: `ERRO: ${msg}`, entityId: report.date }, user);
      throw error;
    }
  }, [checkPermission, validateAction, salesReports, adjustFinancialsForReport, registrarAlmocoBlindado, addAuditLog, addLog, user]);

  const updateSalesReport = useCallback((reportId: string, updates: Partial<SalesReport>) => {
    try {
      const report = salesReports.find(r => r.id === reportId);
      if (!report) return;
      validateAction('SALES_REPORT', { date: report.dateISO || report.date, items: updates.itemsSummary || report.itemsSummary });
      if (report.status === ClosureStatus.FECHO_CONFIRMADO && report.processedFinancials) {
        const hasFinancialChanges = updates.cash !== undefined || updates.tpa !== undefined || updates.transfer !== undefined || updates.totalLifted !== undefined;
        if (hasFinancialChanges) { adjustFinancialsForReport(report, { ...report, ...updates }); addAuditLog({ action: 'AJUSTE_FINANCEIRO_FECHO', module: 'VENDAS', entityId: reportId, description: `Valores ajustados.`, performedBy: user?.name || 'Sistema' }); }
      }
      setDoc(doc(db, COL.salesReports, reportId), { ...report, ...updates });
      const finalUpdatedReport = { ...report, ...updates };
      if (finalUpdatedReport.lunchExpense > 0 && !finalUpdatedReport.lunchProcessed) registrarAlmocoBlindado(finalUpdatedReport as SalesReport);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({ action: 'ERROR' as any, module: 'VENDAS', description: `ERRO: ${msg}`, entityId: reportId }, user);
      throw error;
    }
  }, [salesReports, validateAction, adjustFinancialsForReport, registrarAlmocoBlindado, addAuditLog, addLog, user]);

  const updateSalesReportJustification = useCallback((reportId: string, justificationData: any) => {
    const report = salesReports.find(r => r.id === reportId);
    if (!report) return;
    checkDayLock(report.dateISO || report.date);
    setDoc(doc(db, COL.salesReports, reportId), { ...report, justificationLog: justificationData, financials: report.financials ? { ...report.financials, justification: justificationData.justificativa } : undefined });
    addAuditLog({ action: 'JUSTIFICAR_FECHO', module: 'VENDAS', entityId: reportId, description: `Justificativa adicionada ao relatório ${reportId}`, performedBy: user?.name || 'Sistema' });
  }, [salesReports, checkDayLock, addAuditLog, user]);

  const confirmSalesReport = useCallback((reportId: string, confirmedBy: string, isUnilateral: boolean = false, reportData?: SalesReport) => {
    if (!checkPermission('sales_closure')) return;
    const report = reportData ?? salesReports.find(r => r.id === reportId);
    if (!report) return;
    const liveReport = salesReports.find(r => r.id === reportId);
    const isForceReprocess = reportData && reportData.processedFinancials === false;
    if (!isForceReprocess && liveReport?.status === ClosureStatus.FECHO_CONFIRMADO && liveReport?.processedFinancials) { console.warn(`[confirmSalesReport] Bloqueado: já confirmado.`); return; }
   const wasAlreadyProcessed = report.processedFinancials === true && !isForceReprocess;
    const wasStockUpdated = report.stockUpdated === true && !isForceReprocess;
    const reportDateStr = report.dateISO || report.date;
    const priceSnapshotAtClosure: Record<string, { sellPrice: number; buyPrice: number }> = {};
    products.forEach(p => {
      priceSnapshotAtClosure[p.id] = { sellPrice: p.sellPrice, buyPrice: p.buyPrice };
    });
    const finalReport: SalesReport = {
      ...report,
      status: ClosureStatus.FECHO_CONFIRMADO,
      confirmedBy,
      confirmationTimestamp: getSystemDate().getTime(),
      unilateralAdminConfirmation: isUnilateral,
      processedFinancials: true,
      stockUpdated: true,
      lunchProcessed: true,
      isFinalClosure: true,
      priceSnapshotAtClosure, // snapshot de preços para auditoria
    };

    if (!wasStockUpdated && !report.stockUpdated) {
      (report.itemsSnapshot || report.itemsSummary || []).forEach((item: any) => {
        const p = products.find(prod => (item.productId && item.productId === prod.id) || item.id === prod.id || item.name === prod.name);
        const qty = item.soldQty ?? item.qty ?? 0;
        if (p && qty > 0) {
          const stockRefId = `confirm_${reportId}_${p.id}_${finalReport.confirmationTimestamp}`;
          handleStockMovement(p.id, qty, 'SALE', confirmedBy, `Fecho Confirmado: ${reportDateStr}`, stockRefId);
        }
      });
    }

    if (!wasAlreadyProcessed && !report.processedFinancials) {
      const cash = (finalReport as any).cash ?? (finalReport as any).financials?.cash ?? 0;
      const tpaFinal = (finalReport as any).financials?.ticket ?? (finalReport as any).tpa ?? 0;
      const transferFinal = (finalReport as any).financials?.transfer ?? (finalReport as any).transfer ?? 0;
      const totalLifted = cash + tpaFinal + transferFinal;
      const targetDate = reportDateStr.split('T')[0];
      const timeStr = getSystemDate().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });

      const existingClosureTrans = transactions.filter(t =>
        (t.referenceId === reportId ||
         t.referenceId === `${reportId}_cash` ||
         t.referenceId === `${reportId}_tpa` ||
         t.referenceId === `${reportId}_closure`) &&
        t.referenceType === 'day_closure'
      );
      existingClosureTrans.forEach(t => deleteDoc(doc(db, COL.transactions, t.id)));

      let newCB = currentBalance;
      let newCashBal = cashBalance;
      let newTPABal = tpaBalance;
      let newCashInHandBal = cashInHandBalance;
      existingClosureTrans.forEach(t => {
        const isEntry = t.type === 'entrada';
        if (t.accountName === 'Conta Bancária' || t.accountName === 'Conta Corrente') newCB += isEntry ? -t.amount : t.amount;
        if (t.accountName === 'Caixa (Dinheiro)') newCashBal += isEntry ? -t.amount : t.amount;
        else if (t.accountName === 'TPA') newTPABal += isEntry ? -t.amount : t.amount;
        else if (t.accountName === 'Em Mão') newCashInHandBal += isEntry ? -t.amount : t.amount;
      });

      // PROD-3: Cash → Em Mão, TPA+Transfer → Conta Bancária
      // Cash físico vai para Em Mão. TPA+Transfer vai para Conta Bancária.
      // cashBalance é um contador auxiliar — não afecta os cartões directamente
      newCB = newCB + (tpaFinal + transferFinal);
      newCashInHandBal = newCashInHandBal + cash;
      // NÃO somar ao newCashBal para evitar duplicação na Conta Bancária

      setCurrentBalance(newCB);
      setCashBalance(newCashBal);
      setTPABalance(newTPABal);
      setCashInHandBalance(newCashInHandBal);
      setCards(prev => prev.map(c => {
        if (c.id === 'main') return { ...c, balance: newCB };
        if (c.id === 'cash_in_hand') return { ...c, balance: newCashInHandBal };
        return c;
      }));
      setDoc(doc(db, 'appdata', 'balances'), { currentBalance: newCB, savingsBalance, cashBalance: newCashBal, tpaBalance: newTPABal, cashInHandBalance: newCashInHandBal });
      const mainCard3 = cards.find(c => c.id === 'main');
      const cashCard3 = cards.find(c => c.id === 'cash_in_hand');
      if (mainCard3) setDoc(doc(db, COL.cards, 'main'), { ...mainCard3, balance: newCB });
      if (cashCard3) setDoc(doc(db, COL.cards, 'cash_in_hand'), { ...cashCard3, balance: newCashInHandBal });
      
      if (totalLifted > 0) {
        setDoc(doc(db, COL.transactions, `${reportId}_closure`), {
          id: `${reportId}_closure`, type: 'entrada', category: 'Fecho de Caixa', amount: totalLifted,
          date: `${targetDate}, ${timeStr}`,
          description: `Fecho (${targetDate}) — Cash: ${cash.toLocaleString('pt-AO')} Kz | TPA: ${(tpaFinal + transferFinal).toLocaleString('pt-AO')} Kz`,
          referenceId: reportId, referenceType: 'day_closure', performedBy: confirmedBy,
          accountName: 'Conta Bancária', status: 'ATIVO', operationalDay: targetDate, timestamp: Date.now()
        });
      }
    }

    const lunchVal = (finalReport as any).lunchExpense ?? (finalReport as any).financials?.lunch ?? 0;
    if (lunchVal > 0 && !report.lunchProcessed) registrarAlmocoBlindado({ ...finalReport, lunchExpense: lunchVal } as SalesReport);
    setDoc(doc(db, COL.salesReports, reportId), finalReport);
    addAuditLog({ action: isUnilateral ? 'CONFIRMAÇÃO_UNILATERAL_FECHO' : 'CONFIRMAÇÃO_FINAL_FECHO', module: 'VENDAS', entityId: reportId, description: `Fecho confirmado para ${reportDateStr}.`, performedBy: confirmedBy });
  }, [checkPermission, salesReports, products, getSystemDate, cashBalance, tpaBalance, currentBalance, savingsBalance, cashInHandBalance, transactions, cards, handleStockMovement, registrarAlmocoBlindado, addAuditLog]);

  const addEquipment = useCallback((equipment: Omit<Equipment, 'id' | 'prevQty'>) => {
    try {
      validateAction('EQUIPMENT', {});
      const newEquip: Equipment = { ...equipment, id: generateUUID(), prevQty: equipment.qty };
      setDoc(doc(db, COL.equipments, newEquip.id), newEquip);
      addAuditLog({ action: 'ADICIONAR_EQUIPAMENTO', module: 'INVENTARIO', entityId: newEquip.id, description: `Equipamento ${newEquip.name} adicionado.`, performedBy: user?.name || 'Sistema' });
    } catch (error) { const msg = error instanceof Error ? error.message : 'Erro'; addLog({ action: 'ERROR' as any, module: 'INVENTARIO', description: `ERRO: ${msg}`, entityId: equipment.name }, user); throw error; }
  }, [validateAction, addAuditLog, addLog, user]);

  const updateEquipment = useCallback((id: string, updates: Partial<Equipment>) => {
    try {
      validateAction('EQUIPMENT', {});
      const equip = equipments.find(e => e.id === id);
      if (equip) {
        setDoc(doc(db, COL.equipments, id), { ...equip, ...updates });
        const historyLog = {
          id: generateUUID(), timestamp: Date.now(), date: formatDateISO(new Date()),
          performedBy: user?.name || 'Sistema', totalItems: updates.qty ?? equip.qty,
          discrepancies: [], status: 'OK' as const,
          justification: `Edição manual: ${equip.name} — Qtd: ${equip.qty} → ${updates.qty ?? equip.qty}`
        };
        setDoc(doc(db, COL.inventoryHistory, historyLog.id), historyLog);
      }
      addAuditLog({ action: 'EDITAR_EQUIPAMENTO', module: 'INVENTARIO', entityId: id, description: `Equipamento ${id} actualizado.`, performedBy: user?.name || 'Sistema' });
    } catch (error) { const msg = error instanceof Error ? error.message : 'Erro'; addLog({ action: 'ERROR' as any, module: 'INVENTARIO', description: `ERRO: ${msg}`, entityId: id }, user); throw error; }
  }, [validateAction, equipments, addAuditLog, addLog, user]);

  const updateEquipmentQty = useCallback((id: string, newQty: number) => {
    try {
      validateAction('EQUIPMENT', {});
      const equip = equipments.find(e => e.id === id);
      if (equip) {
        setDoc(doc(db, COL.equipments, id), { ...equip, prevQty: equip.qty, qty: newQty });
        const historyLog = {
          id: generateUUID(), timestamp: Date.now(), date: formatDateISO(new Date()),
          performedBy: user?.name || 'Sistema', totalItems: newQty,
          discrepancies: equip.qty !== newQty ? [{ name: equip.name, diff: newQty - equip.qty }] : [],
          status: (equip.qty !== newQty ? 'DIVERGENTE' : 'OK') as const,
          justification: `Contagem: ${equip.name} — ${equip.qty} → ${newQty}`
        };
        setDoc(doc(db, COL.inventoryHistory, historyLog.id), historyLog);
      }
      addAuditLog({ action: 'AJUSTE_QTD_EQUIPAMENTO', module: 'INVENTARIO', entityId: id, description: `Quantidade de ${equip?.name || id}: ${equip?.qty} → ${newQty}`, performedBy: user?.name || 'Sistema' });
    } catch (error) { const msg = error instanceof Error ? error.message : 'Erro'; addLog({ action: 'ERROR' as any, module: 'INVENTARIO', description: `ERRO: ${msg}`, entityId: id }, user); throw error; }
  }, [validateAction, equipments, addAuditLog, addLog, user]);

  const removeEquipment = useCallback((id: string) => {
    try {
      validateAction('EQUIPMENT', {});
      const equip = equipments.find(e => e.id === id);
      deleteDoc(doc(db, COL.equipments, id));
      addAuditLog({ action: 'REMOVER_EQUIPAMENTO', module: 'INVENTARIO', entityId: id, description: `Equipamento ${equip?.name || id} removido.`, performedBy: user?.name || 'Sistema' });
    } catch (error) { const msg = error instanceof Error ? error.message : 'Erro'; addLog({ action: 'ERROR' as any, module: 'INVENTARIO', description: `ERRO: ${msg}`, entityId: id }, user); throw error; }
  }, [validateAction, equipments, addAuditLog, addLog, user]);

  const addCard = useCallback((card: Omit<Card, 'id'>) => {
    if (!checkPermission('finance_card_create')) return;
    const newCard: Card = { ...card, id: Math.random().toString(36).substr(2, 9) };
    setDoc(doc(db, COL.cards, newCard.id), newCard);
    addAuditLog({ action: 'CRIAR_CARTAO', module: 'FINANCEIRO', entityId: newCard.id, description: `Cartão criado: ${newCard.name}`, performedBy: user?.name || 'Sistema' });
  }, [checkPermission, addAuditLog, user]);

  const updateCard = useCallback((id: string, updates: Partial<Card>) => {
    const card = cards.find(c => c.id === id);
    if (card) setDoc(doc(db, COL.cards, id), { ...card, ...updates });
    if (id === 'main' && updates.balance !== undefined) { setCurrentBalance(updates.balance); setDoc(doc(db, 'appdata', 'balances'), { currentBalance: updates.balance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance }); }
    if (id === 'savings' && updates.balance !== undefined) { setSavingsBalance(updates.balance); setDoc(doc(db, 'appdata', 'balances'), { currentBalance, savingsBalance: updates.balance, cashBalance, tpaBalance, cashInHandBalance }); }
    if (id === 'cash_in_hand' && updates.balance !== undefined) { setCashInHandBalance(updates.balance); setDoc(doc(db, 'appdata', 'balances'), { currentBalance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance: updates.balance }); }
    addAuditLog({ action: 'EDITAR_CARTAO', module: 'FINANCEIRO', entityId: id, description: `Cartão actualizado: ${id}`, performedBy: user?.name || 'Sistema' });
  }, [cards, currentBalance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance, addAuditLog, user]);

  const deleteCard = useCallback((id: string) => {
    if (!checkPermission('finance_card_delete')) return;
    // PROD-3: proteger cartões do sistema
    if (id === 'main' || id === 'savings' || id === 'cash_in_hand') return;
    const card = cards.find(c => c.id === id);
    deleteDoc(doc(db, COL.cards, id));
    addAuditLog({ action: 'REMOVER_CARTAO', module: 'FINANCEIRO', entityId: id, description: `Cartão removido: ${card?.name || id}`, performedBy: user?.name || 'Sistema' });
  }, [checkPermission, cards, addAuditLog, user]);

  const resetTestData = useCallback(() => {
    if (!checkPermission('admin_global_admin')) return;
    INITIAL_PRODUCTS.forEach(p => setDoc(doc(db, COL.products, p.id), p));
    setDoc(doc(db, 'appdata', 'balances'), { currentBalance: 0, savingsBalance: 0, cashBalance: 0, tpaBalance: 0, cashInHandBalance: 0 });
    setDoc(doc(db, 'appdata', 'locked_days'), { days: [] });
    INITIAL_CARDS.forEach(c => setDoc(doc(db, COL.cards, c.id), { ...c, balance: 0 }));
    addAuditLog({ action: 'RESET_SISTEMA', module: 'SISTEMA', entityId: 'ALL', description: 'Sistema resetado.', performedBy: user?.name || 'Admin' });
  }, [checkPermission, addAuditLog, user]);

  const runSystemDiagnostic = useCallback(() => {
    console.log('Sistema a operar com Firestore em tempo real.');
  }, []);

  const value = useMemo(() => ({
    products: products.filter(p => !p.isArchived).sort((a, b) => a.name.localeCompare(b.name, 'pt')),
    categories, purchases, currentBalance, savingsBalance, cashBalance, tpaBalance,
    cashInHandBalance, totalBalance: currentBalance + cashInHandBalance,
    cards, transactions, salesReports,
    expenses, expenseCategories, inventoryHistory, priceHistory, lockedDays, systemDate,
    getSystemDate, setSystemDate, unlockDay, lockDay, isDayLocked, checkDayLock,
    addExpense, deleteExpense, updateExpense,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    addInventoryLog, addProduct, updateProduct, deleteProduct, addCategory, editCategory, removeCategory,
    addPurchase, getPurchasesByDate, getTodayPurchases, processTransaction, processCashTPADebit,
    addSalesReport, getConfirmedSalesReports, registrarDespesaGlobal, registrarAlmocoBlindado,
    updateSalesReport, updateSalesReportJustification, confirmSalesReport,
    addAuditLog, stockOperationHistory,
    equipments, addEquipment, updateEquipment, updateEquipmentQty, removeEquipment,
    addCard, updateCard, deleteCard, resetTestData, runSystemDiagnostic,
    isSyncing, hasPendingChanges, handleStockMovement,
    ignoreLockedDayWithoutClosure,
    notifications, addNotification, markNotificationRead, clearNotifications, resolveNotification,
    proposals, addProposal, deleteProposal,
    transferBetweenCards,
  }), [
    products, categories, purchases, currentBalance, savingsBalance, cashBalance, tpaBalance,
    cashInHandBalance, cards, transactions, salesReports,
    expenses, expenseCategories, inventoryHistory, priceHistory, lockedDays, systemDate,
    getSystemDate, unlockDay, lockDay, isDayLocked, checkDayLock,
    addExpense, deleteExpense, updateExpense,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    addInventoryLog, addProduct, updateProduct, deleteProduct, addCategory, editCategory, removeCategory,
    addPurchase, getPurchasesByDate, getTodayPurchases, processTransaction, processCashTPADebit,
    addSalesReport, getConfirmedSalesReports, registrarDespesaGlobal, registrarAlmocoBlindado,
    updateSalesReport, updateSalesReportJustification, confirmSalesReport,
    addAuditLog, stockOperationHistory,
    equipments, addEquipment, updateEquipment, updateEquipmentQty, removeEquipment,
    addCard, updateCard, deleteCard, resetTestData, runSystemDiagnostic,
    isSyncing, hasPendingChanges, handleStockMovement,
    ignoreLockedDayWithoutClosure,
    notifications, addNotification, markNotificationRead, clearNotifications, resolveNotification,
    proposals, addProposal, deleteProposal,
    transferBetweenCards,
  ]);

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) throw new Error('useProducts must be used within a ProductProvider');
  return context;
};
