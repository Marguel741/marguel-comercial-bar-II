import { db } from '../src/firebase';
import { doc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import {
  Product, PurchaseRecord, Transaction, SalesReport, Expense, InventoryLog,
  PriceHistoryLog, Equipment, Card, StockOperationLog, AuditLog,
  ExpenseCategory, UserPermissions, ReserveTransfer
} from '../types';
import { useAuth } from './AuthContext';
import { useAudit } from './AuditContext';
import { StockProvider, useStock } from './StockContext';
import { FinanceProvider, useFinance } from './FinanceContext';
import { hasPermission } from '../src/utils/permissions';
import { cleanDate, formatDateISO, generateUUID } from '../src/utils';

// ─── Caminhos que ainda ficam aqui (System) ───────────────────────────────────
const COL_SYS = {
  products:  'products',
  purchases: 'appdata/purchases/records',
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

// ─── Interface pública (idêntica ao original — nenhuma página muda) ───────────
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
  addPurchase: (items: Record<string, number>, source: 'Prices' | 'Inventory' | 'Sales', completedBy: string, attachments?: string[], supplier?: string, purchaseDate?: string, sourceAccount?: 'main' | 'cash_in_hand', barItems?: Record<string, number>, reserveItems?: Record<string, number>) => void;
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
  reserveTransfers: ReserveTransfer[];
  transferReserveToBar: (items: Record<string, number>, date: string, performedBy: string, notes?: string) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

// ─── Inner: tem acesso ao Stock + Finance ─────────────────────────────────────
const ProductProviderInner: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { addLog } = useAudit();

  // ── Stock ─────────────────────────────────────────────────────────────────
  const {
    products, categories, purchases, inventoryHistory, stockOperationHistory,
    priceHistory, equipments, proposals, reserveTransfers,
    handleStockMovement, addProduct, updateProduct, deleteProduct,
    addCategory, editCategory, removeCategory, addInventoryLog,
    addEquipment, updateEquipment, updateEquipmentQty, removeEquipment,
    addProposal, deleteProposal, transferReserveToBar,
    getPurchasesByDate, getTodayPurchases,
  } = useStock();

  // ── Finance ───────────────────────────────────────────────────────────────
  const {
    expenses, expenseCategories, transactions, salesReports, cards, notifications,
    currentBalance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance, totalBalance,
    addExpense, deleteExpense, updateExpense,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    processTransaction, processCashTPADebit, transferBetweenCards,
    addCard, updateCard, deleteCard,
    addSalesReport, updateSalesReport, updateSalesReportJustification, confirmSalesReport,
    getConfirmedSalesReports, registrarDespesaGlobal, registrarAlmocoBlindado,
    addNotification, markNotificationRead, clearNotifications, resolveNotification,
    resetFinanceData, ignoreLockedDayWithoutClosure,
  } = useFinance();

  // ── System (data, dias bloqueados) — fica no ProductContext ───────────────
  const [lockedDays, setLockedDays] = useState<string[]>([]);
  const [systemDate, setSystemDateState] = useState<Date>(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0); return now;
  });
  const [isSyncing] = useState(false);
  const [hasPendingChanges] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'appdata', 'locked_days'), snap => {
      if (snap.exists()) setLockedDays(snap.data().days ?? []);
    });
    return () => unsub();
  }, []);

  const getSystemDate = useCallback(() => {
    const now = new Date();
    const date = new Date(systemDate);
    date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return date;
  }, [systemDate]);

  const getSystemDateStr = useCallback(() => formatDateISO(getSystemDate()), [getSystemDate]);

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

  const checkPermission = useCallback((permission: keyof UserPermissions) => {
    if (!hasPermission(user, permission)) {
      console.error(`Acesso negado: ${permission}`);
      return false;
    }
    return true;
  }, [user]);

  const isDayLocked = useCallback((date: string | Date) => {
    if (!date) return false;
    const dateStr = date instanceof Date ? formatDateISO(date) : date;
    return lockedDays.map(d => cleanDate(d)).includes(cleanDate(dateStr));
  }, [lockedDays]);

  const validateAction = useCallback((type: string, payload: any) => {
    const isHistoricalClosure = type === 'SALES_CLOSURE' || payload?.isHistorical === true;
    if (!isHistoricalClosure && isDayLocked(getSystemDate())) throw new Error('Operação Negada: O dia actual está bloqueado.');
    if (type === 'SALE' || type === 'SALES_REPORT' || type === 'UPDATE_STOCK') {
      const items = payload.items || (payload.productId ? [{ productId: payload.productId, qty: payload.qty }] : []);
      for (const item of items) {
        const product = products.find((p: any) => p.id === item.productId || p.name === item.name);
        if (product) {
          const finalStock = (type === 'SALE' || type === 'SALES_REPORT') ? product.stock - item.qty : product.stock + item.qty;
          if (finalStock < 0) console.warn(`Stock insuficiente para ${product.name}. Permitindo stock negativo.`);
        }
      }
    }
    if (payload.price !== undefined && payload.price < 0) throw new Error('Preço inválido: O valor não pode ser negativo.');
    return true;
  }, [products, isDayLocked, getSystemDate]);

  const setSystemDate = useCallback((date: Date) => {
    const oldDate = systemDate;
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    setSystemDateState(dateOnly);
    addAuditLog({ action: 'ALTERAR_DATA_SISTEMA', module: 'SISTEMA', description: `Data do sistema alterada de ${formatDateISO(oldDate)} para ${formatDateISO(dateOnly)}`, previousValue: formatDateISO(oldDate), newValue: formatDateISO(dateOnly) });
  }, [systemDate, addAuditLog]);

  const lockDay = useCallback((dateStr: string, performedBy: string) => {
    const cleanTarget = cleanDate(dateStr);
    const newDays = lockedDays.includes(cleanTarget) ? lockedDays : [...lockedDays, cleanTarget];
    setLockedDays(newDays);
    setDoc(doc(db, 'appdata', 'locked_days'), { days: newDays });
    ignoreLockedDayWithoutClosure(dateStr);
    addAuditLog({ action: 'BLOQUEAR_DIA', module: 'CALENDÁRIO', entityId: cleanTarget, description: `Dia ${cleanTarget} bloqueado.`, performedBy });
  }, [lockedDays, addAuditLog, ignoreLockedDayWithoutClosure]);

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
      throw new Error('Dia bloqueado. Contacte administrador');
    }
  }, [isDayLocked, addAuditLog, user]);

  // ── addPurchase — depende de processTransaction + handleStockMovement ──────
  const addPurchase = useCallback((items: Record<string, number>, source: 'Prices' | 'Inventory' | 'Sales', completedBy: string, attachments?: string[], supplier?: string, purchaseDate?: string, sourceAccount: 'main' | 'cash_in_hand' = 'main', barItemsParam?: Record<string, number>, reserveItemsParam?: Record<string, number>) => {
    try {
      if (!checkPermission('purchases_execute')) return;
      validateAction('PURCHASE', { date: systemDate });
      let totalValue = 0;
      const purchaseId = generateUUID();
      products.forEach(p => { if (items[p.id]) totalValue += p.buyPrice * (p.packSize || 1) * items[p.id]; });
      if (user?.permissions?.purchases_limit && totalValue > user.permissions.purchases_limit) { console.warn(`Limite de compra excedido!`); return; }
      Object.entries(items).forEach(([productId, qtyPacks]) => {
        if (qtyPacks > 0) {
          const p = products.find(prod => prod.id === productId);
          if (!p) return;
          const barQty = barItemsParam?.[productId] ?? qtyPacks;
          const reserveQty = (barItemsParam ? qtyPacks - barQty : 0);
          if (barQty > 0) handleStockMovement(productId, barQty * (p.packSize || 1), 'PURCHASE', completedBy, 'Compra de Stock', purchaseId);
          if (reserveQty > 0) {
            const newReserveStock = (p.reserveStock ?? 0) + reserveQty * (p.packSize || 1);
            // Calcular também o novo stock do Bar para não sobrescrever o que handleStockMovement gravou
            const newBarStock = p.stock + barQty * (p.packSize || 1);
            setDoc(doc(db, COL_SYS.products, productId), { ...p, stock: newBarStock, reserveStock: newReserveStock });
          }
        }
      });
      const targetDateStr = purchaseDate || getSystemDateStr();
      const packSizeSnapshot: Record<string, number> = {};
      const barItemsMap: Record<string, number> = {};
      const reserveItemsMap: Record<string, number> = {};
      products.forEach(p => { if (items[p.id]) packSizeSnapshot[p.id] = p.packSize || 1; });
      Object.entries(items).forEach(([id, qty]) => {
        const barQty = barItemsParam?.[id] ?? qty;
        const reserveQty = reserveItemsParam?.[id] ?? (qty - barQty);
        barItemsMap[id] = barQty;
        reserveItemsMap[id] = reserveQty;
      });
      const newRecord: PurchaseRecord = { id: purchaseId, name: source === 'Inventory' ? 'Ajuste de Stock (Inventário)' : source === 'Sales' ? 'Compra Rápida (Vendas)' : 'Compra Efectuada', date: targetDateStr, items, total: totalValue, completedBy, supplier, timestamp: getSystemDate().getTime(), source, attachments, synced: true, sourceAccount, packSizeSnapshot, barItems: barItemsMap, reserveItems: reserveItemsMap };
      setDoc(doc(db, COL_SYS.purchases, purchaseId), newRecord);
      if (totalValue > 0) processTransaction('withdraw', sourceAccount, totalValue, `Compra de estoque (${targetDateStr})`, 'Compra de Estoque', purchaseId, 'purchase', completedBy, targetDateStr);
      addAuditLog({ action: 'CRIAR_COMPRA', module: 'COMPRAS', entityId: purchaseId, description: `Compra: ${totalValue.toLocaleString('pt-AO')} Kz. Origem: ${source}`, performedBy: completedBy });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({ action: 'ERROR' as any, module: 'COMPRAS', description: `ERRO: ${msg}`, entityId: source }, user);
      throw error;
    }
  }, [checkPermission, validateAction, products, user, systemDate, getSystemDate, getSystemDateStr, handleStockMovement, processTransaction, addAuditLog, addLog]);

  const resetTestData = useCallback(() => {
    if (!checkPermission('admin_global_admin')) return;
    INITIAL_PRODUCTS.forEach(p => setDoc(doc(db, COL_SYS.products, p.id), p));
    setDoc(doc(db, 'appdata', 'locked_days'), { days: [] });
    resetFinanceData();
    addAuditLog({ action: 'RESET_SISTEMA', module: 'SISTEMA', entityId: 'ALL', description: 'Sistema resetado.', performedBy: user?.name || 'Admin' });
  }, [checkPermission, addAuditLog, user, resetFinanceData]);

  const syncData = useCallback(async () => {
    console.log('Firestore em tempo real — sem necessidade de sincronização manual.');
  }, []);

  const runSystemDiagnostic = useCallback(() => {
    console.log('Sistema a operar com Firestore em tempo real.');
  }, []);

  // ── Value agregado (Stock + Finance + System) ─────────────────────────────
  const value = useMemo(() => ({
    // Stock
    products, categories, purchases, inventoryHistory, stockOperationHistory,
    priceHistory, equipments, proposals, reserveTransfers,
    addProduct, updateProduct, deleteProduct,
    addCategory, editCategory, removeCategory, addInventoryLog, handleStockMovement,
    addEquipment, updateEquipment, updateEquipmentQty, removeEquipment,
    addProposal, deleteProposal, transferReserveToBar,
    getPurchasesByDate, getTodayPurchases,
    // Finance
    expenses, expenseCategories, transactions, salesReports, cards, notifications,
    currentBalance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance, totalBalance,
    addExpense, deleteExpense, updateExpense,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    processTransaction, processCashTPADebit, transferBetweenCards,
    addCard, updateCard, deleteCard,
    addSalesReport, updateSalesReport, updateSalesReportJustification, confirmSalesReport,
    getConfirmedSalesReports, registrarDespesaGlobal, registrarAlmocoBlindado,
    addNotification, markNotificationRead, clearNotifications, resolveNotification,
    ignoreLockedDayWithoutClosure,
    // System
    systemDate, getSystemDate, setSystemDate, lockedDays, isDayLocked, lockDay, unlockDay, checkDayLock,
    addAuditLog, addPurchase,
    isSyncing, hasPendingChanges, syncData, runSystemDiagnostic, resetTestData,
  }), [
    products, categories, purchases, inventoryHistory, stockOperationHistory,
    priceHistory, equipments, proposals, reserveTransfers,
    addProduct, updateProduct, deleteProduct,
    addCategory, editCategory, removeCategory, addInventoryLog, handleStockMovement,
    addEquipment, updateEquipment, updateEquipmentQty, removeEquipment,
    addProposal, deleteProposal, transferReserveToBar,
    getPurchasesByDate, getTodayPurchases,
    expenses, expenseCategories, transactions, salesReports, cards, notifications,
    currentBalance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance, totalBalance,
    addExpense, deleteExpense, updateExpense,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    processTransaction, processCashTPADebit, transferBetweenCards,
    addCard, updateCard, deleteCard,
    addSalesReport, updateSalesReport, updateSalesReportJustification, confirmSalesReport,
    getConfirmedSalesReports, registrarDespesaGlobal, registrarAlmocoBlindado,
    addNotification, markNotificationRead, clearNotifications, resolveNotification,
    ignoreLockedDayWithoutClosure,
    systemDate, getSystemDate, setSystemDate, lockedDays, isDayLocked, lockDay, unlockDay, checkDayLock,
    addAuditLog, addPurchase,
    isSyncing, hasPendingChanges, syncData, runSystemDiagnostic, resetTestData,
  ]);

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

// ─── ProductProvider público — hierarquia: Stock → Finance → ProductInner ─────
export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { addLog } = useAudit();

  // Utilitários mínimos para passar ao StockProvider e FinanceProvider por props
  const [_lockedDays, _setLockedDays] = useState<string[]>([]);
  const [_systemDate] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'appdata', 'locked_days'), snap => {
      if (snap.exists()) _setLockedDays(snap.data().days ?? []);
    });
    return () => unsub();
  }, []);

  const _getSystemDate = useCallback(() => {
    const now = new Date(); const d = new Date(_systemDate);
    d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()); return d;
  }, [_systemDate]);

  const _getSystemDateStr = useCallback(() => formatDateISO(_getSystemDate()), [_getSystemDate]);

  const _isDayLocked = useCallback((date: string | Date) => {
    if (!date) return false;
    const dateStr = date instanceof Date ? formatDateISO(date) : date;
    return _lockedDays.map(d => cleanDate(d)).includes(cleanDate(dateStr));
  }, [_lockedDays]);

  const _validateAction = useCallback((type: string, payload: any) => {
    // Operações históricas (fechos passados) nunca são bloqueadas
    if (payload?.isHistorical === true) return true;
    // Bloquear operações no dia actual se estiver bloqueado
    const today = formatDateISO(_getSystemDate());
    if (_isDayLocked(today)) {
      throw new Error('Operação Negada: O dia actual está bloqueado.');
    }
    return true;
  }, [_isDayLocked, _getSystemDate]);

  const _addAuditLog = useCallback((log: any) => {
    addLog({ action: log.action || 'ACÇÃO', module: log.module || 'SISTEMA', entityId: log.entityId || null, description: log.description || '', previousValue: null, newValue: null }, user);
  }, [addLog, user]);

  const _checkPermission = useCallback((permission: keyof any) => {
    return hasPermission(user, permission as any);
  }, [user]);

  return (
    <StockProvider
      getSystemDate={_getSystemDate}
      getSystemDateStr={_getSystemDateStr}
      validateAction={_validateAction}
      addAuditLog={_addAuditLog}
    >
      <FinanceProviderBridge
        getSystemDate={_getSystemDate}
        isDayLocked={_isDayLocked}
        validateAction={_validateAction}
        addAuditLog={_addAuditLog}
        checkPermission={_checkPermission}
      >
        <ProductProviderInner>
          {children}
        </ProductProviderInner>
      </FinanceProviderBridge>
    </StockProvider>
  );
};

// Bridge: monta o FinanceProvider depois de ter acesso ao StockContext
const FinanceProviderBridge: React.FC<{
  children: ReactNode;
  getSystemDate: () => Date;
  isDayLocked: (date: string | Date) => boolean;
  validateAction: (type: string, payload: any) => boolean;
  addAuditLog: (log: any) => void;
  checkPermission: (permission: keyof UserPermissions) => boolean;
}> = ({ children, getSystemDate, isDayLocked, validateAction, addAuditLog, checkPermission }) => {
  const { products, handleStockMovement } = useStock();

  // checkDayLock necessário pelo FinanceProvider
  const checkDayLock = useCallback((date: string | Date) => {
    if (isDayLocked(date)) throw new Error('Dia bloqueado. Contacte administrador');
  }, [isDayLocked]);

  return (
    <FinanceProvider
      getSystemDate={getSystemDate}
      isDayLocked={isDayLocked}
      checkDayLock={checkDayLock}
      validateAction={validateAction}
      addAuditLog={addAuditLog}
      checkPermission={checkPermission}
      products={products}
      handleStockMovement={handleStockMovement}
    >
      {children}
    </FinanceProvider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) throw new Error('useProducts must be used within a ProductProvider');
  return context;
};
