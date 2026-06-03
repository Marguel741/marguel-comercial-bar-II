import { db } from '../src/firebase';
import { doc, setDoc, collection, onSnapshot, deleteDoc, runTransaction } from 'firebase/firestore';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import {
  Transaction, SalesReport, Expense, Card,
  ExpenseCategory, AuditLog, ClosureStatus, UserPermissions, ReserveTransfer
} from '../types';
import { useAuth } from './AuthContext';
import { useAudit } from './AuditContext';
import { hasPermission } from '../src/utils/permissions';
import { cleanDate, formatDateISO, generateUUID } from '../src/utils';

// ─── Caminhos Firestore ───────────────────────────────────────────────────────
const COL_FIN = {
  expenses:          'appdata/expenses/records',
  expenseCategories: 'appdata/expense_categories/records',
  transactions:      'appdata/transactions/records',
  salesReports:      'appdata/sales_reports/records',
  cards:             'appdata/cards/records',
  notifications:     'appdata/notifications/records',
  products:          'products',
};

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

const INITIAL_CARDS: Card[] = [
  { id: 'main', name: 'Conta Bancária', holder: 'Marguel Bar', balance: 0, color: 'bg-gradient-to-bl from-[#003366] via-[#004488] to-[#0054A6]', type: 'Corrente', validity: '12/28' },
  { id: 'cash_in_hand', name: 'Em Mão', holder: 'Marguel Bar', balance: 0, color: 'bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900', type: 'Corrente', validity: '12/28' },
  { id: 'savings', name: 'Marguel Reserve', holder: 'Marguel Reserve', balance: 0, color: 'bg-gradient-to-br from-[#F5DF4D] via-[#D4AF37] to-[#AA6C39]', type: 'Poupança', validity: '06/30' },
];

// ─── Tipo do contexto ─────────────────────────────────────────────────────────
export interface FinanceContextType {
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  transactions: Transaction[];
  salesReports: SalesReport[];
  cards: Card[];
  notifications: any[];
  currentBalance: number;
  savingsBalance: number;
  cashBalance: number;
  tpaBalance: number;
  cashInHandBalance: number;
  totalBalance: number;

  addExpense: (expense: Expense) => void;
  deleteExpense: (id: string, deletedBy: string) => void;
  updateExpense: (updated: Expense) => void;
  addExpenseCategory: (category: Omit<ExpenseCategory, 'id'>) => void;
  updateExpenseCategory: (id: string, updates: Partial<ExpenseCategory>) => void;
  deleteExpenseCategory: (id: string) => void;
  processTransaction: (type: 'deposit' | 'withdraw', account: string, amount: number, description: string, category?: string, referenceId?: string, referenceType?: Transaction['referenceType'], performedBy?: string, date?: string) => void;
  processCashTPADebit: (origin: 'Cash' | 'TPA', amount: number, note: string, referenceId?: string, referenceType?: Transaction['referenceType'], performedBy?: string, date?: string) => void;
  transferBetweenCards: (fromId: string, toId: string, amount: number, note: string, performedBy: string) => void;
  addCard: (card: Omit<Card, 'id'>) => void;
  updateCard: (id: string, updates: Partial<Card>) => void;
  deleteCard: (id: string) => void;
  addSalesReport: (report: SalesReport) => void;
  updateSalesReport: (reportId: string, updates: Partial<SalesReport>) => void;
  updateSalesReportJustification: (reportId: string, justificationData: any) => void;
  confirmSalesReport: (reportId: string, confirmedBy: string, isUnilateral?: boolean, reportData?: SalesReport) => void;
  getConfirmedSalesReports: () => SalesReport[];
  registrarDespesaGlobal: (data: { tipo: string; origem: string; descricao: string; nota: string; valor: number; usuario: string; data_operacional: string; referenceId?: string; }) => void;
  registrarAlmocoBlindado: (report: SalesReport) => void;
  addNotification: (notif: any) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  resolveNotification: (id: string, resolvedBy: string, note?: string) => void;
  resetFinanceData: () => void;
  ignoreLockedDayWithoutClosure: (dateStr: string) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────
export const FinanceProvider: React.FC<{
  children: ReactNode;
  // Injectado pelo ProductProvider (evita dependência circular)
  getSystemDate: () => Date;
  isDayLocked: (date: string | Date) => boolean;
  checkDayLock: (date: string | Date) => void;
  validateAction: (type: string, payload: any) => boolean;
  addAuditLog: (log: any) => void;
  checkPermission: (permission: keyof UserPermissions) => boolean;
  // Dados de Stock necessários em confirmSalesReport e registrarAlmocoBlindado
  products: any[];
  handleStockMovement: (productId: string, quantity: number, type: 'SALE' | 'PURCHASE' | 'ADJUSTMENT', performedBy: string, reason: string, referenceId?: string) => void;
}> = ({
  children,
  getSystemDate, isDayLocked, checkDayLock,
  validateAction, addAuditLog, checkPermission,
  products, handleStockMovement,
}) => {
  const { user } = useAuth();
  const { addLog } = useAudit();

  // ── Estados ───────────────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [salesReports, setSalesReports] = useState<SalesReport[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [tpaBalance, setTPABalance] = useState(0);
  const [cashInHandBalance, setCashInHandBalance] = useState(0);

  // ── Listeners Firestore ───────────────────────────────────────────────────
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(collection(db, COL_FIN.expenses), snap => {
      setExpenses(snap.docs.map(d => d.data() as Expense).sort((a, b) => b.timestamp - a.timestamp));
    }));

    unsubs.push(onSnapshot(collection(db, COL_FIN.expenseCategories), snap => {
      const data = snap.docs.map(d => d.data() as ExpenseCategory);
      if (data.length > 0) setExpenseCategories(data);
      else {
        INITIAL_EXPENSE_CATEGORIES.forEach(c => setDoc(doc(db, COL_FIN.expenseCategories, c.id), c));
        setExpenseCategories(INITIAL_EXPENSE_CATEGORIES);
      }
    }));

    unsubs.push(onSnapshot(collection(db, COL_FIN.transactions), snap => {
      setTransactions(snap.docs.map(d => d.data() as Transaction).sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db2 = new Date(b.date).getTime();
        return db2 - da;
      }));
    }));

    unsubs.push(onSnapshot(collection(db, COL_FIN.salesReports), snap => {
      setSalesReports(snap.docs.map(d => d.data() as SalesReport).sort((a, b) => b.timestamp - a.timestamp));
    }));

    unsubs.push(onSnapshot(collection(db, COL_FIN.cards), snap => {
      const data = snap.docs.map(d => d.data() as Card);
      if (data.length > 0) {
        setCards(data);
        if (!data.find(c => c.id === 'cash_in_hand')) {
          const cashCard = INITIAL_CARDS.find(c => c.id === 'cash_in_hand')!;
          setDoc(doc(db, COL_FIN.cards, 'cash_in_hand'), cashCard);
        }
        const mainCard = data.find(c => c.id === 'main');
        if (mainCard && mainCard.name === 'Conta Corrente') {
          setDoc(doc(db, COL_FIN.cards, 'main'), { ...mainCard, name: 'Conta Bancária' });
        }
      } else {
        INITIAL_CARDS.forEach(c => setDoc(doc(db, COL_FIN.cards, c.id), c));
        setCards(INITIAL_CARDS);
      }
    }));

    unsubs.push(onSnapshot(collection(db, COL_FIN.notifications), snap => {
      setNotifications(snap.docs.map(d => d.data()).sort((a, b) => b.timestamp - a.timestamp));
    }));

    unsubs.push(onSnapshot(doc(db, 'appdata', 'balances'), snap => {
      if (snap.exists()) {
        const d = snap.data();
        setCurrentBalance(d.currentBalance ?? 0);
        setSavingsBalance(d.savingsBalance ?? 0);
        setCashBalance(d.cashBalance ?? 0);
        setTPABalance(d.tpaBalance ?? 0);
        setCashInHandBalance(d.cashInHandBalance ?? 0);
      }
    }));

    return () => unsubs.forEach(u => u());
  }, []);

  // ── processTransaction ────────────────────────────────────────────────────
  const processTransaction = useCallback((
    type: 'deposit' | 'withdraw',
    account: string,
    amount: number, description: string, category?: string,
    referenceId?: string, referenceType?: Transaction['referenceType'],
    performedBy?: string, date?: string
  ) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    try {
      const existingTrans = referenceId
        ? transactions.filter(t => t.referenceId === referenceId && t.referenceType === referenceType)
        : [];
      if (existingTrans.length > 1) {
        existingTrans.slice(1).forEach(t => deleteDoc(doc(db, COL_FIN.transactions, t.id)));
      }

      let newCB = currentBalance, newSB = savingsBalance, newCash = cashBalance;
      let newTPA = tpaBalance, newCashInHand = cashInHandBalance;
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

      if (account === 'main') { newCB += type === 'deposit' ? amount : -amount; accountName = 'Conta Bancária'; }
      else if (account === 'savings') { newSB += type === 'deposit' ? amount : -amount; accountName = 'Marguel Reserve'; }
      else if (account === 'cash') { newCash += type === 'deposit' ? amount : -amount; accountName = 'Caixa (Dinheiro)'; }
      else if (account === 'tpa') { newTPA += type === 'deposit' ? amount : -amount; accountName = 'TPA'; }
      else if (account === 'cash_in_hand') { newCashInHand += type === 'deposit' ? amount : -amount; accountName = 'Em Mão'; }
      else {
        const card = cards.find(c => c.id === account);
        if (card) {
          accountName = card.name;
          if (card.id === 'main') newCB += type === 'deposit' ? amount : -amount;
          else if (card.id === 'savings') newSB += type === 'deposit' ? amount : -amount;
          else if (card.id === 'cash_in_hand') newCashInHand += type === 'deposit' ? amount : -amount;
        }
      }

      if (newCB !== currentBalance) setCurrentBalance(newCB);
      if (newSB !== savingsBalance) setSavingsBalance(newSB);
      if (newCash !== cashBalance) setCashBalance(newCash);
      if (newTPA !== tpaBalance) setTPABalance(newTPA);
      if (newCashInHand !== cashInHandBalance) setCashInHandBalance(newCashInHand);
      const cardId = account === 'cash' || account === 'tpa' ? 'main' : account;
      setCards(prev => prev.map(c => {
        if (c.id === 'main' && cardId === 'main') return { ...c, balance: newCB };
        if (c.id === 'savings' && cardId === 'savings') return { ...c, balance: newSB };
        if (c.id === 'cash_in_hand' && cardId === 'cash_in_hand') return { ...c, balance: newCashInHand };
        return c;
      }));
      runTransaction(db, async (tx) => {
        const balRef = doc(db, 'appdata', 'balances');
        const cardRef = doc(db, COL_FIN.cards, cardId === 'main' ? 'main' : cardId === 'savings' ? 'savings' : 'cash_in_hand');
        const [balDoc, cardDoc] = await Promise.all([tx.get(balRef), tx.get(cardRef)]);
        const prev = balDoc.exists() ? balDoc.data() : { currentBalance: 0, savingsBalance: 0, cashBalance: 0, tpaBalance: 0, cashInHandBalance: 0 };
        const prevCard = cardDoc.exists() ? cardDoc.data() : null;
        const delta = type === 'deposit' ? amount : -amount;
        tx.set(balRef, {
          currentBalance: account === 'main' || account === 'cash' || account === 'tpa' ? (prev.currentBalance ?? 0) + (account === 'main' ? delta : account === 'tpa' ? delta : 0) : newCB,
          savingsBalance: account === 'savings' ? (prev.savingsBalance ?? 0) + delta : newSB,
          cashBalance: account === 'cash' ? (prev.cashBalance ?? 0) + delta : newCash,
          tpaBalance: account === 'tpa' ? (prev.tpaBalance ?? 0) + delta : newTPA,
          cashInHandBalance: account === 'cash_in_hand' ? (prev.cashInHandBalance ?? 0) + delta : newCashInHand,
        });
        // Cartão actualizado na mesma transacção atómica
        if (prevCard) {
          const newCardBalance = cardId === 'main' ? newCB : cardId === 'savings' ? newSB : newCashInHand;
          tx.set(cardRef, { ...prevCard, balance: newCardBalance });
        }
      }).catch(e => console.error('runTransaction balances+card:', e));

      const targetDate = date || formatDateISO(getSystemDate());
      const transId = existingTrans.length > 0 ? existingTrans[0].id : generateUUID();

      let balanceAfter: number | undefined;
      if (account === 'main') balanceAfter = newCB;
      else if (account === 'savings') balanceAfter = newSB;
      else if (account === 'cash_in_hand') balanceAfter = newCashInHand;
      else {
        const matchCard = cards.find(c => c.id === account);
        if (matchCard) {
          if (matchCard.id === 'main') balanceAfter = newCB;
          else if (matchCard.id === 'savings') balanceAfter = newSB;
          else if (matchCard.id === 'cash_in_hand') balanceAfter = newCashInHand;
        }
      }

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
        timestamp: Date.now(),
        balanceAfter,
      };
      setDoc(doc(db, COL_FIN.transactions, transId), newTrans);

      if (!referenceType) {
        addAuditLog({ action: 'TRANSACAO_MANUAL', module: 'FINANCEIRO', entityId: transId, description: `${type === 'deposit' ? 'Depósito' : 'Levantamento'} de ${amount.toLocaleString('pt-AO')} Kz em ${accountName}. ${description}`, performedBy: performedBy || user?.name || 'Sistema' });
      }
    } catch (error) {
      console.error('Erro ao processar transacção:', error);
    }
  }, [transactions, cards, user, currentBalance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance, getSystemDate, addAuditLog]);

  // ── adjustFinancialsForReport (interno) ───────────────────────────────────
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
    existingTrans.forEach(t => deleteDoc(doc(db, COL_FIN.transactions, t.id)));

    let newCB = currentBalance, newCashBal = cashBalance;
    let newTPABal = tpaBalance, newCashInHandBal = cashInHandBalance;
    existingTrans.forEach(t => {
      const isEntry = t.type === 'entrada';
      if (t.accountName === 'Conta Bancária' || t.accountName === 'Conta Corrente') newCB += isEntry ? -t.amount : t.amount;
      if (t.accountName === 'Caixa (Dinheiro)') newCashBal += isEntry ? -t.amount : t.amount;
      else if (t.accountName === 'TPA') newTPABal += isEntry ? -t.amount : t.amount;
      else if (t.accountName === 'Em Mão') newCashInHandBal += isEntry ? -t.amount : t.amount;
    });

    newCB = newCB + newTpa;
    newTPABal = newTPABal + newTpa;
    newCashInHandBal = newCashInHandBal + newCash;
    setCurrentBalance(newCB); setCashBalance(newCashBal); setTPABalance(newTPABal); setCashInHandBalance(newCashInHandBal);
    setCards(prev => prev.map(c => {
      if (c.id === 'main') return { ...c, balance: newCB };
      if (c.id === 'cash_in_hand') return { ...c, balance: newCashInHandBal };
      return c;
    }));
    setDoc(doc(db, 'appdata', 'balances'), { currentBalance: newCB, savingsBalance, cashBalance: newCashBal, tpaBalance: newTPABal, cashInHandBalance: newCashInHandBal });
    const mainCard = cards.find(c => c.id === 'main');
    const cashCard = cards.find(c => c.id === 'cash_in_hand');
    if (mainCard) setDoc(doc(db, COL_FIN.cards, 'main'), { ...mainCard, balance: newCB });
    if (cashCard) setDoc(doc(db, COL_FIN.cards, 'cash_in_hand'), { ...cashCard, balance: newCashInHandBal });

    if (totalLifted > 0) {
      setDoc(doc(db, COL_FIN.transactions, `${newReport.id}_closure`), {
        id: `${newReport.id}_closure`, type: 'entrada', category: 'Fecho de Caixa', amount: totalLifted,
        date: `${reportDateStr}, ${timeStr}`,
        description: `Fecho Editado (${reportDateStr}) — Cash: ${newCash.toLocaleString('pt-AO')} Kz | TPA: ${newTpa.toLocaleString('pt-AO')} Kz`,
        referenceId: newReport.id, referenceType: 'day_closure', performedBy: user?.name || 'Sistema',
        accountName: 'Conta Bancária', status: 'ATIVO', operationalDay: reportDateStr, timestamp: Date.now()
      });
    }
  }, [user, transactions, currentBalance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance, cards, getSystemDate]);

  // ── transferBetweenCards ──────────────────────────────────────────────────
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
    setDoc(doc(db, COL_FIN.cards, fromId), { ...fromCard, balance: newFromBalance });
    setDoc(doc(db, COL_FIN.cards, toId), { ...toCard, balance: newToBalance });
    setCards(prev => prev.map(c => {
      if (c.id === fromId) return { ...c, balance: newFromBalance };
      if (c.id === toId) return { ...c, balance: newToBalance };
      return c;
    }));

    const balanceUpdate: any = { currentBalance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance };
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
      id: transId, type: 'saida', category: 'Transferência', amount,
      date: `${targetDate}, ${timeStr}`, description,
      referenceId: transId, referenceType: 'withdrawal', performedBy,
      accountName: fromCard.name, status: 'ATIVO', operationalDay: targetDate,
      timestamp: Date.now(), isTransfer: true, transferCounterpartId: toId,
    };
    setDoc(doc(db, COL_FIN.transactions, transId), trans);
    addAuditLog({ action: 'TRANSFERENCIA_CARTOES', module: 'FINANCEIRO', entityId: transId, description: `${description}. Por: ${performedBy}`, performedBy });
  }, [cards, getSystemDate, currentBalance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance, addAuditLog]);

  // ── processCashTPADebit ───────────────────────────────────────────────────
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
      referenceId: referenceId ?? null, referenceType: referenceType ?? null,
      performedBy: performedBy ?? null,
      accountName: origin === 'Cash' ? 'Caixa (Dinheiro)' : 'TPA',
      status: 'ATIVO', operationalDay: targetDate, timestamp: Date.now()
    };
    setDoc(doc(db, COL_FIN.transactions, transId), newTrans);
    addAuditLog({ action: 'DEBITO_CASH_TPA', module: 'FINANCEIRO', entityId: transId, description: `Débito ${origin}: ${amount.toLocaleString('pt-AO')} Kz. ${note}`, performedBy: performedBy || user?.name || 'Sistema' });
  }, [validateAction, getSystemDate, cashBalance, tpaBalance, currentBalance, savingsBalance, cashInHandBalance, addAuditLog, user]);

  // ── Notificações ──────────────────────────────────────────────────────────
  const addNotification = useCallback((notif: any) => {
    const newNotif = { ...notif, id: generateUUID(), timestamp: Date.now(), read: false };
    setDoc(doc(db, COL_FIN.notifications, newNotif.id), newNotif);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (notif) setDoc(doc(db, COL_FIN.notifications, id), { ...notif, read: true });
  }, [notifications]);

  const resolveNotification = useCallback((id: string, resolvedBy: string, note?: string) => {
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;
    setDoc(doc(db, COL_FIN.notifications, id), { ...notif, resolved: true, resolvedBy, resolvedAt: Date.now(), resolvedNote: note ?? null });
  }, [notifications]);

  const clearNotifications = useCallback(() => {
    notifications.forEach(n => deleteDoc(doc(db, COL_FIN.notifications, n.id)));
  }, [notifications]);

  // ── Despesas ──────────────────────────────────────────────────────────────
  const addExpense = useCallback((expense: Expense) => {
    if (!checkPermission('expenses_execute')) return;
    setDoc(doc(db, COL_FIN.expenses, expense.id), expense);
    addAuditLog({ action: 'ADICIONAR_DESPESA', module: 'FINANCEIRO', entityId: expense.id, description: `Despesa: ${expense.title} (${expense.amount.toLocaleString('pt-AO')} Kz)`, performedBy: expense.user });
    if (expense.amount > 0) processTransaction('withdraw', expense.sourceAccount || 'main', expense.amount, `Despesa: ${expense.title}`, expense.category, expense.id, 'expense', expense.user);
  }, [checkPermission, addAuditLog, processTransaction]);

  const deleteExpense = useCallback((id: string, deletedBy: string) => {
    if (!checkPermission('expenses_execute')) return;
    const expense = expenses.find(e => e.id === id);
    if (!expense || expense.status === 'REVERSED' || expense.isReverted) return;
    if (expense.isInformativeOnly) {
      deleteDoc(doc(db, COL_FIN.expenses, id));
      addAuditLog({ action: 'REMOVER_DESPESA_INFORMATIVA', module: 'FINANCEIRO', entityId: id, description: `Despesa informativa "${expense.title}" removida por ${deletedBy}. Sem impacto financeiro.`, performedBy: deletedBy });
      return;
    }
    setDoc(doc(db, COL_FIN.expenses, id), { ...expense, status: 'REVERSED', isReverted: true });
    const reversalExpense: Expense = { ...expense, id: `rev_${expense.id}_${generateUUID()}`, title: `ESTORNO: ${expense.title}`, amount: -expense.amount, notes: `Estorno por ${deletedBy}. Ref: ${expense.id}`, timestamp: getSystemDate().getTime(), user: deletedBy, status: 'REVERSAL', isReverted: true };
    setDoc(doc(db, COL_FIN.expenses, reversalExpense.id), reversalExpense);
    if (expense.amount > 0) processTransaction('deposit', expense.sourceAccount || 'main', expense.amount, `Estorno: ${expense.title}`, 'Estorno', expense.id, 'reversal', deletedBy);
    addAuditLog({ action: 'ESTORNO_DESPESA', module: 'FINANCEIRO', entityId: id, description: `Estorno de ${expense.title} por ${deletedBy}`, performedBy: deletedBy });
  }, [checkPermission, expenses, getSystemDate, processTransaction, addAuditLog]);

  const updateExpense = useCallback((updated: Expense) => {
    setDoc(doc(db, COL_FIN.expenses, updated.id), updated);
    addAuditLog({ action: 'EDITAR_DESPESA', module: 'FINANCEIRO', entityId: updated.id, description: `Despesa editada: ${updated.title}`, performedBy: user?.name || 'Sistema' });
  }, [addAuditLog, user]);

  const addExpenseCategory = useCallback((category: Omit<ExpenseCategory, 'id'>) => {
    if (!checkPermission('expenses_category_manage')) return;
    const newCat = { ...category, id: Math.random().toString(36).substr(2, 9) };
    setDoc(doc(db, COL_FIN.expenseCategories, newCat.id), newCat);
    addAuditLog({ action: 'CRIAR_CATEGORIA_DESPESA', module: 'FINANCEIRO', entityId: newCat.id, description: `Categoria criada: ${newCat.name}`, performedBy: user?.name || 'Sistema' });
  }, [checkPermission, addAuditLog, user]);

  const updateExpenseCategory = useCallback((id: string, updates: Partial<ExpenseCategory>) => {
    if (!checkPermission('expenses_category_manage')) return;
    const cat = expenseCategories.find(c => c.id === id);
    if (cat) setDoc(doc(db, COL_FIN.expenseCategories, id), { ...cat, ...updates });
    addAuditLog({ action: 'EDITAR_CATEGORIA_DESPESA', module: 'FINANCEIRO', entityId: id, description: `Categoria actualizada: ${id}`, performedBy: user?.name || 'Sistema' });
  }, [checkPermission, expenseCategories, addAuditLog, user]);

  const deleteExpenseCategory = useCallback((id: string) => {
    if (!checkPermission('expenses_category_manage')) return;
    const cat = expenseCategories.find(c => c.id === id);
    deleteDoc(doc(db, COL_FIN.expenseCategories, id));
    addAuditLog({ action: 'REMOVER_CATEGORIA_DESPESA', module: 'FINANCEIRO', entityId: id, description: `Categoria removida: ${cat?.name || id}`, performedBy: user?.name || 'Sistema' });
  }, [checkPermission, expenseCategories, addAuditLog, user]);

  // ── Cartões ───────────────────────────────────────────────────────────────
  const addCard = useCallback((card: Omit<Card, 'id'>) => {
    if (!checkPermission('finance_card_create')) return;
    const newCard: Card = { ...card, id: Math.random().toString(36).substr(2, 9) };
    setDoc(doc(db, COL_FIN.cards, newCard.id), newCard);
    addAuditLog({ action: 'CRIAR_CARTAO', module: 'FINANCEIRO', entityId: newCard.id, description: `Cartão criado: ${newCard.name}`, performedBy: user?.name || 'Sistema' });
  }, [checkPermission, addAuditLog, user]);

  const updateCard = useCallback((id: string, updates: Partial<Card>) => {
    const card = cards.find(c => c.id === id);
    if (card) setDoc(doc(db, COL_FIN.cards, id), { ...card, ...updates });
    if (id === 'main' && updates.balance !== undefined) { setCurrentBalance(updates.balance); setDoc(doc(db, 'appdata', 'balances'), { currentBalance: updates.balance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance }); }
    if (id === 'savings' && updates.balance !== undefined) { setSavingsBalance(updates.balance); setDoc(doc(db, 'appdata', 'balances'), { currentBalance, savingsBalance: updates.balance, cashBalance, tpaBalance, cashInHandBalance }); }
    if (id === 'cash_in_hand' && updates.balance !== undefined) { setCashInHandBalance(updates.balance); setDoc(doc(db, 'appdata', 'balances'), { currentBalance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance: updates.balance }); }
    addAuditLog({ action: 'EDITAR_CARTAO', module: 'FINANCEIRO', entityId: id, description: `Cartão actualizado: ${id}`, performedBy: user?.name || 'Sistema' });
  }, [cards, currentBalance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance, addAuditLog, user]);

  const deleteCard = useCallback((id: string) => {
    if (!checkPermission('finance_card_delete')) return;
    if (id === 'main' || id === 'savings' || id === 'cash_in_hand') return;
    const card = cards.find(c => c.id === id);
    deleteDoc(doc(db, COL_FIN.cards, id));
    addAuditLog({ action: 'REMOVER_CARTAO', module: 'FINANCEIRO', entityId: id, description: `Cartão removido: ${card?.name || id}`, performedBy: user?.name || 'Sistema' });
  }, [checkPermission, cards, addAuditLog, user]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetFinanceData = useCallback(() => {
    setDoc(doc(db, 'appdata', 'balances'), { currentBalance: 0, savingsBalance: 0, cashBalance: 0, tpaBalance: 0, cashInHandBalance: 0 });
    INITIAL_CARDS.forEach(c => setDoc(doc(db, COL_FIN.cards, c.id), { ...c, balance: 0 }));
  }, []);

  // ── Relatórios de Vendas ──────────────────────────────────────────────────
  const registrarAlmocoBlindado = useCallback((report: SalesReport) => {
    const lunchVal = report.lunchExpense ?? (report as any).financials?.lunch ?? 0;
    const isFinal = report.isFinalClosure || report.type === 'FINAL' || report.status === ClosureStatus.FECHO_CONFIRMADO;
    if (lunchVal > 0 && isFinal && !report.lunchProcessed) {
      const dateKey = new Date(report.dateISO || report.date).toISOString().split('T')[0];
      const lunchRefId = `LUNCH_EXPENSE_${dateKey}`;
      if (!expenses.find(e => e.id === lunchRefId)) {
        const lunchRecord: Expense = { id: lunchRefId, title: `Almoço (${dateKey})`, amount: lunchVal, category: 'DESPESA_OPERACIONAL', date: dateKey, timestamp: getSystemDate().getTime(), user: report.closedBy || 'Sistema', notes: 'Despesa operacional — apenas informativo.', origin: 'CONTROLE_VENDAS', attachments: [], isInformativeOnly: true };
        setDoc(doc(db, COL_FIN.expenses, lunchRefId), lunchRecord);
      }
    }
  }, [expenses, getSystemDate]);

  const getConfirmedSalesReports = useCallback(() =>
    salesReports.filter(r => r.status === ClosureStatus.FECHO_CONFIRMADO),
  [salesReports]);

  const registrarDespesaGlobal = useCallback((data: { tipo: string; origem: string; descricao: string; nota: string; valor: number; usuario: string; data_operacional: string; referenceId?: string; }) => {
    try {
      validateAction('EXPENSE', { date: data.data_operacional, amount: data.valor });
      const existingExpense = data.referenceId
        ? expenses.find(e => e.id === data.referenceId || e.notes?.includes(data.referenceId!))
        : expenses.find(e => e.title === data.descricao && e.date === data.data_operacional && e.origin === data.origem);
      if (existingExpense) {
        if (existingExpense.amount !== data.valor || existingExpense.title !== data.descricao) {
          setDoc(doc(db, COL_FIN.expenses, existingExpense.id), { ...existingExpense, amount: data.valor, title: data.descricao, notes: data.nota });
          processTransaction('withdraw', 'main', data.valor, `Despesa (${data.origem}): ${data.descricao}`, data.tipo, existingExpense.id, 'expense', data.usuario, data.data_operacional);
          addAuditLog({ action: 'EDITAR_DESPESA', module: 'FINANCEIRO', entityId: existingExpense.id, description: `Despesa actualizada (${data.origem}): ${data.descricao}`, performedBy: data.usuario });
        }
        return;
      }
      const newExpense: Expense = { id: data.referenceId || generateUUID(), title: data.descricao, amount: data.valor, category: data.tipo, date: data.data_operacional, timestamp: getSystemDate().getTime(), user: data.usuario, notes: data.nota, origin: data.origem, attachments: [] };
      setDoc(doc(db, COL_FIN.expenses, newExpense.id), newExpense);
      if (newExpense.amount > 0) processTransaction('withdraw', 'main', newExpense.amount, `Despesa (${data.origem}): ${newExpense.title}`, newExpense.category, newExpense.id, 'expense', newExpense.user, data.data_operacional);
      addAuditLog({ action: 'ADICIONAR_DESPESA', module: 'FINANCEIRO', entityId: newExpense.id, description: `Despesa global (${data.origem}): ${data.descricao}`, performedBy: data.usuario });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({ action: 'ERROR' as any, module: 'FINANCEIRO', description: `ERRO: ${msg}`, entityId: data.origem }, user);
      throw error;
    }
  }, [validateAction, expenses, getSystemDate, processTransaction, addAuditLog, addLog, user]);

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
      setDoc(doc(db, COL_FIN.salesReports, finalReport.id), finalReport);
      if (finalReport.lunchExpense > 0 && !finalReport.lunchProcessed) {
        registrarAlmocoBlindado(finalReport as SalesReport);
        finalReport.lunchProcessed = true;
      }
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
        if (hasFinancialChanges) {
          adjustFinancialsForReport(report, { ...report, ...updates });
          addAuditLog({ action: 'AJUSTE_FINANCEIRO_FECHO', module: 'VENDAS', entityId: reportId, description: `Valores ajustados.`, performedBy: user?.name || 'Sistema' });
        }
      }
      setDoc(doc(db, COL_FIN.salesReports, reportId), { ...report, ...updates });
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
    setDoc(doc(db, COL_FIN.salesReports, reportId), { ...report, justificationLog: justificationData, financials: report.financials ? { ...report.financials, justification: justificationData.justificativa } : undefined });
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
    products.forEach((p: any) => { priceSnapshotAtClosure[p.id] = { sellPrice: p.sellPrice, buyPrice: p.buyPrice }; });
    const finalReport: SalesReport = { ...report, status: ClosureStatus.FECHO_CONFIRMADO, confirmedBy, confirmationTimestamp: getSystemDate().getTime(), unilateralAdminConfirmation: isUnilateral, processedFinancials: true, stockUpdated: true, lunchProcessed: true, isFinalClosure: true, priceSnapshotAtClosure };

    if (!wasStockUpdated && !report.stockUpdated) {
      (report.itemsSnapshot || report.itemsSummary || []).forEach((item: any) => {
        const p = products.find((prod: any) => (item.productId && item.productId === prod.id) || item.id === prod.id || item.name === prod.name);
        const qty = item.soldQty ?? item.qty ?? 0;
        if (p && qty > 0) {
          // ID estável: não depende de timestamp — garante idempotência
          const stockRefId = `confirm_${reportId}_${p.id}`;
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
        (t.referenceId === reportId || t.referenceId === `${reportId}_cash` || t.referenceId === `${reportId}_tpa` || t.referenceId === `${reportId}_closure`) &&
        t.referenceType === 'day_closure'
      );
      existingClosureTrans.forEach(t => deleteDoc(doc(db, COL_FIN.transactions, t.id)));

      let newCB = currentBalance, newCashBal = cashBalance;
      let newTPABal = tpaBalance, newCashInHandBal = cashInHandBalance;
      existingClosureTrans.forEach(t => {
        const isEntry = t.type === 'entrada';
        if (t.accountName === 'Conta Bancária' || t.accountName === 'Conta Corrente') newCB += isEntry ? -t.amount : t.amount;
        if (t.accountName === 'Caixa (Dinheiro)') newCashBal += isEntry ? -t.amount : t.amount;
        else if (t.accountName === 'TPA') newTPABal += isEntry ? -t.amount : t.amount;
        else if (t.accountName === 'Em Mão') newCashInHandBal += isEntry ? -t.amount : t.amount;
      });

      newCB = newCB + (tpaFinal + transferFinal);
      newCashInHandBal = newCashInHandBal + cash;

      setCurrentBalance(newCB); setCashBalance(newCashBal); setTPABalance(newTPABal); setCashInHandBalance(newCashInHandBal);
      setCards(prev => prev.map(c => {
        if (c.id === 'main') return { ...c, balance: newCB };
        if (c.id === 'cash_in_hand') return { ...c, balance: newCashInHandBal };
        return c;
      }));
      setDoc(doc(db, 'appdata', 'balances'), { currentBalance: newCB, savingsBalance, cashBalance: newCashBal, tpaBalance: newTPABal, cashInHandBalance: newCashInHandBal });
      const mainCard3 = cards.find(c => c.id === 'main');
      const cashCard3 = cards.find(c => c.id === 'cash_in_hand');
      if (mainCard3) setDoc(doc(db, COL_FIN.cards, 'main'), { ...mainCard3, balance: newCB });
      if (cashCard3) setDoc(doc(db, COL_FIN.cards, 'cash_in_hand'), { ...cashCard3, balance: newCashInHandBal });

      if (totalLifted > 0) {
        setDoc(doc(db, COL_FIN.transactions, `${reportId}_closure`), {
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
    setDoc(doc(db, COL_FIN.salesReports, reportId), finalReport);
    addAuditLog({ action: isUnilateral ? 'CONFIRMAÇÃO_UNILATERAL_FECHO' : 'CONFIRMAÇÃO_FINAL_FECHO', module: 'VENDAS', entityId: reportId, description: `Fecho confirmado para ${reportDateStr}.`, performedBy: confirmedBy });
  }, [checkPermission, salesReports, products, getSystemDate, cashBalance, tpaBalance, currentBalance, savingsBalance, cashInHandBalance, transactions, cards, handleStockMovement, registrarAlmocoBlindado, addAuditLog]);

  const ignoreLockedDayWithoutClosure = useCallback((dateStr: string) => {
    const clean = cleanDate(dateStr);
    if (isDayLocked(dateStr)) {
      const hasConfirmedReport = salesReports.some(r => cleanDate(r.dateISO || r.date) === clean && r.status === ClosureStatus.FECHO_CONFIRMADO);
      if (!hasConfirmedReport) {
        transactions.filter(t => cleanDate(t.operationalDay || t.date) === clean).forEach(t => deleteDoc(doc(db, COL_FIN.transactions, t.id)));
      }
      salesReports.filter(r => {
        const isSameDay = cleanDate(r.dateISO || r.date) === clean;
        const isConfirmedOrPartial = r.status === ClosureStatus.FECHO_CONFIRMADO || r.status === ClosureStatus.FECHO_PARCIAL;
        return isSameDay && !isConfirmedOrPartial;
      }).forEach(r => deleteDoc(doc(db, COL_FIN.salesReports, r.id)));
      addAuditLog({ action: 'LIMPEZA_DIA_BLOQUEADO', module: 'VENDAS', entityId: clean, description: `Limpeza de segurança no dia ${clean}.`, performedBy: 'Sistema' });
    }
  }, [isDayLocked, salesReports, transactions, addAuditLog]);

  // ── Value ─────────────────────────────────────────────────────────────────
  const value: FinanceContextType = {
    expenses, expenseCategories, transactions, salesReports, cards, notifications,
    currentBalance, savingsBalance, cashBalance, tpaBalance, cashInHandBalance,
    totalBalance: currentBalance + cashInHandBalance,
    addExpense, deleteExpense, updateExpense,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    processTransaction, processCashTPADebit, transferBetweenCards,
    addCard, updateCard, deleteCard,
    addSalesReport, updateSalesReport, updateSalesReportJustification, confirmSalesReport,
    getConfirmedSalesReports, registrarDespesaGlobal, registrarAlmocoBlindado,
    addNotification, markNotificationRead, clearNotifications, resolveNotification,
    resetFinanceData, ignoreLockedDayWithoutClosure,
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
};
