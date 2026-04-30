import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Save, Calculator, DollarSign, Calendar, TrendingDown, AlertCircle, PlusCircle, Wallet, CreditCard, ArrowRightLeft, CheckCircle, X, Send, MessageSquare, Clock, Plus, Lock, Unlock, BarChart2, ArrowUp, Filter, Eye, ChevronRight, ChevronLeft, RefreshCw, Database, Server, ShieldCheck, Smartphone, ChevronDown, ChevronUp, AlertTriangle, Check, History, Maximize2, Minimize2, Edit3, Printer, Cloud, CloudOff } from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { useProducts } from '../contexts/ProductContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { useLayout } from '../contexts/LayoutContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, ClosureStatus, StockOperationLog } from '../types';
import { hasPermission } from '../src/utils/permissions';
import { formatDisplayDate, formatDateISO, generateUUID } from '../src/utils';
import SyncStatus from '../components/SyncStatus';

interface DailyReport {
  id: string;
  dateISO: string; 
  displayDate: string;
  weekday: string;
  generatedAt: string;
  totals: {
    expected: number;
    lifted: number;
    discrepancy: number;
    soldStock: number;
    profit?: number;
  };
  financials: {
    cash: number;
    transfer: number;
    ticket: number;
    lunch: number;
    justification: string;
  };
  topProducts: { name: string; qty: number; total: number }[];
  itemsSnapshot: any[];
  closedBy: string;
  stockSnapshot?: {
    initial: Record<string, string>;
    final: Record<string, string>;
  };
  notes?: string;
  status?: ClosureStatus;
  confirmedBy?: string;
  confirmationTimestamp?: number;
  unilateralAdminConfirmation?: boolean;
  timestamp?: number;
  editedBy?: string;
  date?: string;
  itemsSummary?: { name: string; qty: number; total: number }[];
  totalLifted?: number;
  cash?: number;
  tpa?: number;
  transfer?: number;
  lunchExpense?: number;
  discrepancy?: number;
  profit?: number;
}

// ==================== APP-3: MODAIS FORA DO COMPONENTE PRINCIPAL ====================

interface ManualHistoryModalProps {
  show: boolean;
  onClose: () => void;
  stockOperationHistory: StockOperationLog[];
}

const ManualHistoryModal: React.FC<ManualHistoryModalProps> = ({ show, onClose, stockOperationHistory }) => {
  const manualHistory = useMemo(() => {
    return stockOperationHistory
      .filter(log => log.type === 'MANUAL_ADJUSTMENT')
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [stockOperationHistory]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <History size={24} />
            </div>
            <div>
              <h3 className="font-black text-xl dark:text-white uppercase">Histórico de Alterações Manuais</h3>
              <p className="text-xs font-bold text-slate-500 uppercase">Rastreabilidade total de ajustes de stock</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {manualHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Database size={48} className="mb-4 opacity-20" />
              <p className="font-bold">Nenhum ajuste manual registado até ao momento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {manualHistory.map((log) => (
                <div key={log.id} className="p-5 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-900/50 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-[#003366] dark:text-white uppercase">{log.productName}</span>
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-md uppercase">Ajuste Manual</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(log.timestamp).toLocaleString('pt-AO')}
                        </div>
                        <div className="flex items-center gap-1">
                          <ShieldCheck size={14} />
                          Resp: {log.responsible || log.performedBy || 'Sistema'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Anterior</p>
                        <p className="font-black text-slate-600 dark:text-slate-300">{log.previousStock ?? log.qtyBefore}</p>
                      </div>
                      <div className="flex items-center text-blue-400"><ChevronRight size={20} /></div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Actual</p>
                        <p className="font-black text-[#003366] dark:text-white">{log.newStock ?? log.qtyAfter}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-xl font-black text-sm min-w-[80px] text-center ${(log.qtyChanged ?? log.qtyAdded) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {(log.qtyChanged ?? log.qtyAdded) > 0 ? '+' : ''}{log.qtyChanged ?? log.qtyAdded}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-sm italic text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <MessageSquare size={16} className="mt-0.5 shrink-0 text-slate-400" />
                    <span>Motivo: {log.reason || 'Não especificado'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button onClick={onClose} className="px-8 py-3 bg-[#003366] text-white font-black rounded-2xl shadow-lg hover:opacity-90 transition-all uppercase text-sm">
            Fechar Histórico
          </button>
        </div>
      </div>
    </div>
  );
};

interface MixMatchModalProps {
  show: boolean;
  onClose: () => void;
  product: any;
  breakdowns: Record<string, { packs: number; singles: number; waste: number }>;
  onBreakdownChange: (id: string, field: 'packs' | 'singles', value: string, soldQty: number, promoQty: number) => void;
}

const MixMatchModal: React.FC<MixMatchModalProps> = ({ show, onClose, product, breakdowns, onBreakdownChange }) => {
  if (!show || !product) return null;

  const soldQty = product.soldQty;
  const promoQty = product.promoQty;
  const currentSingles = breakdowns[product.id]?.singles ?? (soldQty % promoQty);
  const remainingForMix = soldQty - currentSingles;
  const isValid = currentSingles >= 0 && remainingForMix >= 0 && remainingForMix % promoQty === 0;
  const packs = Math.floor(remainingForMix / promoQty);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-black text-lg dark:text-white uppercase">Mix & Match</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700">
            <span className="text-xs font-black text-slate-500 uppercase">Total Vendido</span>
            <span className="text-xl font-black text-[#003366] dark:text-white">{soldQty} un</span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-blue-100 dark:border-blue-900/30 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase">Unidades Avulsas</label>
                <span className="text-[10px] font-bold text-slate-400">{product.sellPrice.toLocaleString()} Kz/un</span>
              </div>
              <input type="text" inputMode="decimal" value={currentSingles || ''}
                onChange={(e) => onBreakdownChange(product.id, 'singles', e.target.value, soldQty, promoQty)}
                className="w-full p-4 text-center font-black text-3xl rounded-2xl bg-slate-50 dark:bg-slate-700 border-none outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all" autoFocus />
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-purple-100 dark:border-purple-900/30 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase">Grupos de Mix Match</label>
                <span className="text-[10px] font-bold text-slate-400">{product.promoPrice.toLocaleString()} Kz/grupo</span>
              </div>
              <input type="text" inputMode="decimal" value={packs || ''}
                onChange={(e) => onBreakdownChange(product.id, 'packs', e.target.value, soldQty, promoQty)}
                className="w-full p-4 text-center font-black text-3xl rounded-2xl bg-slate-50 dark:bg-slate-700 border-none outline-none focus:ring-2 focus:ring-purple-500 dark:text-white transition-all" />
            </div>
          </div>

          <div className={`p-4 rounded-2xl flex items-center gap-3 border ${isValid ? 'bg-green-100/50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' : 'bg-red-100/50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'}`}>
            {isValid ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            <span className="text-xs font-black uppercase tracking-tight">
              {isValid ? `Definido ${packs} grupos de Mix Match (${packs * promoQty} un)` : remainingForMix < 0 ? 'Quantidade de avulsas excede o total vendido' : `Faltam ${promoQty - (remainingForMix % promoQty)} unidades para completar Mix Match`}
            </span>
          </div>

          <button onClick={onClose} disabled={!isValid}
            className={`w-full py-5 font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest ${isValid ? 'bg-[#003366] text-white hover:opacity-90 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
            Confirmar Ajuste
          </button>
        </div>
      </div>
    </div>
  );
};

interface ConfirmEditModalProps {
  show: boolean;
  onClose: () => void;
  reportData: any;
  user: any;
  salesReports: DailyReport[];
  confirmSalesReport: (id: string, by: string, unilateral: boolean, data: any) => void;
  showToast: (msg: string) => void;
  triggerHaptic: (type: string) => void;
  setForceEditMode: (v: boolean) => void;
}

const ConfirmEditModal: React.FC<ConfirmEditModalProps> = ({ show, onClose, reportData, user, salesReports, confirmSalesReport, showToast, triggerHaptic, setForceEditMode }) => {
  if (!show || !reportData?.id) return null;

  const lastActor = reportData?.editedBy || reportData?.closedBy || 'Desconhecido';
  const isSameUser = user?.name && user.name === lastActor;
  const isAdminOrOwner = user?.role === UserRole.PROPRIETARIO || user?.role === UserRole.ADMIN_GERAL;
  const hasClosurePermission = hasPermission(user, 'sales_closure');
  const canConfirm = hasClosurePermission && (!isSameUser || isAdminOrOwner);
  const isUnilateralAllowed = isAdminOrOwner;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-[40px] p-10 w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-700 text-center relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>

        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={40} />
        </div>

        <h2 className="text-2xl font-black text-[#003366] dark:text-white uppercase mb-4">Segunda Confirmação Necessária</h2>

        <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-3xl mb-8 border border-slate-100 dark:border-slate-600">
          <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-4">
            Esta edição foi realizada por <strong className="text-[#003366] dark:text-blue-400">{lastActor}</strong>.
          </p>
          {isAdminOrOwner ? (
            <p className="text-sm text-green-600 dark:text-green-500 font-bold italic">Como Administrador/Proprietário, tem permissão para realizar a confirmação unilateral desta alteração.</p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">Para garantir a integridade, a confirmação final deve ser feita por um utilizador diferente daquele que realizou a edição.</p>
          )}
        </div>

        {!canConfirm && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl flex items-center gap-3 text-left">
            <AlertTriangle size={20} className="text-red-500 shrink-0" />
            <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Não pode confirmar a sua própria edição. Solicite a validação de outro colega ou administrador.</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button disabled={!canConfirm} onClick={async () => {
            if (!reportData?.id) return;
            const currentReport = salesReports.find(r => r.id === reportData.id);
            if (currentReport?.status === ClosureStatus.FECHO_CONFIRMADO) {
              showToast("Este fecho já foi confirmado anteriormente.");
              onClose();
              return;
            }
            const finalReport = {
              ...reportData, status: ClosureStatus.FECHO_CONFIRMADO,
              confirmedBy: user?.name || 'Sistema', confirmationTimestamp: Date.now(),
              unilateralAdminConfirmation: isUnilateralAllowed, stockUpdated: false,
              processedFinancials: false, _deltaApplied: false, isFinalClosure: true,
              editedBy: reportData.editedBy || user?.name || 'Admin',
              totalLifted: reportData.totals?.lifted, cash: reportData.financials?.cash,
              tpa: reportData.financials?.ticket, transfer: reportData.financials?.transfer,
              lunchExpense: reportData.financials?.lunch,
            };
            await confirmSalesReport(finalReport.id, user?.name || 'Sistema', isUnilateralAllowed, finalReport);
            onClose();
            setForceEditMode(false);
            showToast("✅ Fecho confirmado e propagado para todo o sistema!");
            triggerHaptic('success');
          }}
            className={`w-full py-5 font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest ${canConfirm ? 'bg-[#003366] text-white hover:opacity-90 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
            Confirmar Fecho Definitivo
          </button>
          <button onClick={() => { onClose(); setForceEditMode(true); }} className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase text-sm">
            Voltar e Corrigir
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================

const Sales: React.FC = () => {
  const { 
    products, addProduct, updateProduct,
    getPurchasesByDate, getTodayPurchases, addPurchase,
    salesReports: contextSalesReports,
    addSalesReport, updateSalesReport, updateSalesReportJustification, confirmSalesReport,
    isDayLocked, getSystemDate, stockOperationHistory
  } = useProducts();
  const { sidebarMode, triggerHaptic } = useLayout();
  const { user } = useAuth();

  const salesReports = contextSalesReports as unknown as DailyReport[];

  const pageTopRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const todayISO = getSystemDate().toISOString().split('T')[0];
  const [reportDate, setReportDate] = useState(todayISO);
  const [isSummaryFullscreen, setIsSummaryFullscreen] = useState(false);

  const existingReport = salesReports.find(r => {
    const reportDateISO = (r as any).dateISO ? (r as any).dateISO.split('T')[0] : r.date;
    return reportDateISO === reportDate;
  });

  useEffect(() => { setReportDate(todayISO); }, []);

  useEffect(() => {
    if (reportDate > todayISO) setReportDate(todayISO);
    const year = reportDate.split('-')[0];
    if (year && parseInt(year) < 2025) setReportDate('2025-01-01');
    setHasManuallyOpened(false);
    setForceEditMode(false);
  }, [reportDate, todayISO]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsSummaryFullscreen(false); };
    if (isSummaryFullscreen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isSummaryFullscreen]);

  const [initialStock, setInitialStock] = useState<Record<string, string>>({});
  const [endingStock, setEndingStock] = useState<Record<string, string>>({});

  const purchasedStock = useMemo(() => {
    const d = new Date(reportDate + 'T12:00:00');
    return getPurchasesByDate(formatDateISO(d));
  }, [getPurchasesByDate, products, reportDate]);

  useEffect(() => {
    if (hasManuallyOpened) return;
    const dateChanged = prevDateRef.current !== reportDate;
    prevDateRef.current = reportDate;

    const existingReport = salesReports.find(r => {
      const reportDateISO = r.dateISO ? r.dateISO.split('T')[0] : r.date;
      return reportDateISO === reportDate;
    });

    if (existingReport) {
      const init: Record<string, string> = {};
      const end: Record<string, string> = {};
      const bds: Record<string, any> = {};
      if (existingReport.itemsSnapshot) {
        existingReport.itemsSnapshot.forEach((item: any) => {
          init[item.id] = item.init.toString();
          end[item.id] = item.end.toString();
          if (item.breakdown) bds[item.id] = item.breakdown;
        });
      } else if (existingReport.stockSnapshot) {
        Object.assign(init, existingReport.stockSnapshot.initial);
        Object.assign(end, existingReport.stockSnapshot.final);
      }
      setInitialStock(init); setEndingStock(end); setBreakdowns(bds);
      setCurrentReportId(existingReport.id); setIsFinancialsConfirmed(true);
      if (dateChanged || (financials.cash === '' && financials.transfer === '')) {
        const fin = existingReport.financials || {
          cash: existingReport.cash || 0, transfer: existingReport.transfer || 0,
          ticket: existingReport.tpa || 0, lunch: existingReport.lunchExpense || 0,
          justification: existingReport.notes || ''
        };
        setFinancials({ cash: fin.cash.toString(), transfer: fin.transfer.toString(), ticket: fin.ticket.toString(), lunch: fin.lunch.toString(), discrepancyJustification: fin.justification || '' });
      }
      return;
    }

    if (dateChanged) {
      setCurrentReportId(null); setIsFinancialsConfirmed(false);
      setEndingStock({}); setBreakdowns({});
      setFinancials({ cash: '', transfer: '', ticket: '', lunch: '', discrepancyJustification: '' });
    }

    const isToday = reportDate === todayISO;
    const snapshotKey = `mg_initial_stock_v2_${reportDate}`;
    const savedSnapshot = localStorage.getItem(snapshotKey);

    if (isToday) {
      const dynamicInitial: Record<string, string> = {};
      products.forEach(p => { const buy = purchasedStock[p.id] || 0; dynamicInitial[p.id] = Math.max(0, p.stock - buy).toString(); });
      setInitialStock(dynamicInitial);
      localStorage.setItem(snapshotKey, JSON.stringify(dynamicInitial));
    } else if (savedSnapshot) {
      setInitialStock(JSON.parse(savedSnapshot));
    } else if (dateChanged) {
      const newSnapshot: Record<string, string> = {};
      products.forEach(p => { newSnapshot[p.id] = p.stock.toString(); });
      setInitialStock(newSnapshot);
      localStorage.setItem(snapshotKey, JSON.stringify(newSnapshot));
    }
  }, [reportDate, salesReports, products, todayISO, purchasedStock]);

  const [quickPurchaseModal, setQuickPurchaseModal] = useState<{isOpen: boolean, productId: string | null}>({isOpen: false, productId: null});
  const [quickPurchaseQty, setQuickPurchaseQty] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [financials, setFinancials] = useState({ cash: '', transfer: '', ticket: '', lunch: '', discrepancyJustification: '' });
  const [formValues, setFormValues] = useState({ cash: 0, tpa: 0, transfer: 0, lunch: 0, justification: '' });
  const prevDateRef = useRef(reportDate);
  const [isFinancialsConfirmed, setIsFinancialsConfirmed] = useState(false);
  const [syncState, setSyncState] = useState<{ status: 'idle' | 'syncing' | 'success' | 'error'; currentStep: number; completedSteps: string[]; }>({ status: 'idle', currentStep: -1, completedSteps: [] });
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [hasManuallyOpened, setHasManuallyOpened] = useState(false);
  const [forceEditMode, setForceEditMode] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [viewHistoryReport, setViewHistoryReport] = useState<DailyReport | null>(null);
  const [toast, setToast] = useState<{show: boolean, message: string}>({ show: false, message: '' });
  const [showMixMatchModal, setShowMixMatchModal] = useState(false);
  const [selectedProductForMix, setSelectedProductForMix] = useState<any>(null);
  const [showManualHistoryModal, setShowManualHistoryModal] = useState(false);
  const [showConfirmEditModal, setShowConfirmEditModal] = useState(false);
  const [editConfirmationData, setEditConfirmationData] = useState<any>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [breakdowns, setBreakdowns] = useState<Record<string, { packs: number, singles: number, waste: number }>>({});

  const isAdminOrOwner = user?.role === UserRole.PROPRIETARIO || user?.role === UserRole.ADMIN_GERAL;
  const canEditInitialStock = hasPermission(user, 'sales_edit') && (!isDayLocked(reportDate) || isAdminOrOwner);
  const canExecuteSales = hasPermission(user, 'sales_execute');
  const canCloseDay = true;
  const canViewMargins = hasPermission(user, 'sales_view_margins');
  const isLocked = isDayLocked(reportDate);
  const isNotToday = reportDate !== todayISO;

  const hasConfirmedClosureAfter = useMemo(() => {
    return contextSalesReports.some(r => {
      const rDate = (r as any).dateISO ? (r as any).dateISO.split('T')[0] : r.date;
      return rDate > reportDate && r.status === ClosureStatus.FECHO_CONFIRMADO;
    });
  }, [contextSalesReports, reportDate]);

  const isReadOnly = isLocked

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  // PROD-5: navegar entre dias com setas
  const navigateDay = (direction: 'prev' | 'next') => {
    const d = new Date(reportDate + 'T12:00:00');
    d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
    const newDate = formatDateISO(d);
    if (newDate > todayISO) return;
    const year = newDate.split('-')[0];
    if (parseInt(year) < 2025) return;
    setReportDate(newDate);
    triggerHaptic('selection');
  };

  const openMixMatchModal = (product: any) => {
    setSelectedProductForMix(product);
    setShowMixMatchModal(true);
  };

  const handleBreakdownChange = (id: string, field: 'packs' | 'singles', value: string, soldQty: number, promoQty: number) => {
    if (isReadOnly) return;
    const num = parseInt(value) || 0;
    setBreakdowns(prev => {
      let newPacks = 0, newSingles = 0;
      if (field === 'singles') { newSingles = num; newPacks = Math.floor((soldQty - newSingles) / promoQty); }
      else { newPacks = num; newSingles = soldQty - (newPacks * promoQty); }
      return { ...prev, [id]: { packs: newPacks, singles: newSingles, waste: 0 } };
    });
  };

  const calculatedData = useMemo(() => {
    let totalTheoreticalRevenue = 0, hasStockError = false, allMixMatchValid = true;

    const items = products.map(product => {
      const init = parseInt(initialStock[product.id] || '0') || 0;
      const buy = purchasedStock[product.id] || 0;
      const end = parseInt(endingStock[product.id] || '0') || 0;
      const soldQty = init + buy - end;
      if (soldQty < 0) hasStockError = true;

      const isPromo = !!(product.isMixMatchActive || (product as any).isPromoActive);
      const promoQty = product.mixMatchQty || (product as any).promoQty || 3;
      const promoPrice = product.mixMatchPrice || (product as any).promoPrice || 1000;

      let revenue = 0, breakdown = { packs: 0, singles: 0, waste: 0 }, isBalanced = true;

      if (isPromo && soldQty > 0) {
        const manual = breakdowns[product.id];
        const singles = manual ? manual.singles : (soldQty % promoQty);
        const remainingForMix = soldQty - singles;
        isBalanced = singles >= 0 && remainingForMix >= 0 && remainingForMix % promoQty === 0;
        const packs = Math.floor(remainingForMix / promoQty);
        if (!isBalanced) allMixMatchValid = false;
        revenue = (packs * promoPrice) + (singles * product.sellPrice);
        breakdown = { packs, singles, waste: 0 };
      } else {
        revenue = soldQty * product.sellPrice;
      }

      totalTheoreticalRevenue += revenue;
      const profit = revenue - (soldQty * product.buyPrice);
      const discountAmount = isPromo ? ((product.sellPrice * soldQty) - revenue) : 0;
      const mixMatchQtyUsed = isPromo && breakdown.packs ? (breakdown.packs * promoQty) : 0;
      const avulsaQty = isPromo ? (breakdown.singles || 0) : soldQty;

      return { ...product, init, buy, end, soldQty, revenue, profit, isPromo, breakdown, isBalanced, promoQty, promoPrice, discountAmount, mixMatchQtyUsed, avulsaQty };
    });

    const totalTheoreticalProfit = items.reduce((acc, item) => acc + (item.profit || 0), 0);
    const salesChartData = items.filter(item => item.soldQty > 0).sort((a, b) => b.soldQty - a.soldQty)
      .map(item => ({ name: item.name, Quantidade: item.soldQty, Total: item.revenue, category: item.category }));

    return { items, totalTheoreticalRevenue, totalTheoreticalProfit, salesChartData, hasStockError, allMixMatchValid };
  }, [initialStock, purchasedStock, endingStock, products, breakdowns]);

  const declaredCash = parseFloat(financials.cash) || 0;
  const declaredTransfer = parseFloat(financials.transfer) || 0;
  const declaredTicket = parseFloat(financials.ticket) || 0;
  const lunchExpense = parseFloat(financials.lunch) || 0;
  const totalLifted = declaredCash + declaredTransfer + declaredTicket;
  const totalExpected = calculatedData.totalTheoreticalRevenue - lunchExpense;
  const discrepancy = totalLifted - totalExpected;
  const hasDiscrepancy = Math.abs(discrepancy) > 0;

  const handleStockChange = (setter: React.Dispatch<React.SetStateAction<Record<string, string>>>, id: string, value: string) => {
    if (isReadOnly) return;
    setter(prev => ({ ...prev, [id]: value }));
  };

  const handleFinancialChange = (field: string, value: string) => {
    if (isReadOnly) return;
    setFinancials(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirmFinancials = () => {
    if (isReadOnly) return;
    if (totalLifted === 0) { triggerHaptic('warning'); alert("⚠️ Atenção!\n\nAinda não inseriu nenhum valor."); return; }
    triggerHaptic('success'); setIsFinancialsConfirmed(true); showToast("Valores confirmados.");
  };

  const handleUnlockFinancials = () => {
    if (isReadOnly) return;
    triggerHaptic('selection'); setIsFinancialsConfirmed(false);
  };

  // PROD-4: verificar se dia anterior tem fecho registado
  const handleInitialClose = () => {
    const yesterday = new Date(reportDate + 'T12:00:00');
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateISO(yesterday);
    const hasYesterdayReport = contextSalesReports.some(r => {
      const rDate = (r as any).dateISO ? (r as any).dateISO.split('T')[0] : r.date;
      return rDate === yesterdayStr;
    });
    if (!hasYesterdayReport) {
      const continuar = window.confirm(`Atenção: o dia de ontem (${yesterdayStr}) não tem fecho registado.\n\nTens a certeza que queres fazer o fecho de hoje?\n\nPodes cancelar e registar o dia de ontem primeiro.`);
      if (!continuar) return;
    }
    if (!canCloseDay) { triggerHaptic('error'); showToast("Sem permissão para realizar fecho."); return; }
    if (!canExecuteSales) { triggerHaptic('error'); showToast("Sem permissão de execução de vendas para realizar fecho."); return; }
    if (isReadOnly) return;
    if (reportDate > todayISO) { triggerHaptic('error'); alert("❌ DATA INVÁLIDA\n\nNão é permitido fechar dias futuros."); return; }
    if (calculatedData.hasStockError) { triggerHaptic('error'); alert("⛔ IMPEDIMENTO DE FECHO\n\nExistem produtos com Stock Negativo."); return; }
    if (!calculatedData.allMixMatchValid) { triggerHaptic('error'); alert("⛔ IMPEDIMENTO DE FECHO\n\nExistem produtos com Mix Match inválido. Ajuste as unidades avulsas."); return; }
    if (totalLifted === 0 || !isFinancialsConfirmed) { triggerHaptic('warning'); alert("⚠️ Por favor, confirme os valores levantados antes de fechar."); return; }
    setFormValues({ cash: Number(financials.cash) || 0, tpa: Number(financials.ticket) || 0, transfer: Number(financials.transfer) || 0, lunch: Number(financials.lunch) || 0, justification: financials.discrepancyJustification || '' });
    triggerHaptic('selection'); setShowCloseModal(true);
  };

  const handleDayClosureSubmit = async () => {
    if (isDayLocked(reportDate)) { triggerHaptic('error'); showToast('Este dia está bloqueado.'); return; }
    const modalTotalLifted = formValues.cash + formValues.tpa + formValues.transfer;
    const modalTotalExpected = calculatedData.totalTheoreticalRevenue - formValues.lunch;
    const modalDiscrepancy = modalTotalLifted - modalTotalExpected;
    if (modalDiscrepancy !== 0 && !formValues.justification) { triggerHaptic('error'); showToast("Justifique a divergência."); return; }
    if (!calculatedData.allMixMatchValid) { showToast("Existem produtos com Mix Match inválido. Por favor, ajuste antes de fechar."); triggerHaptic('error'); return; }

    const newReport: DailyReport = {
      id: existingReport?.id || generateUUID(), dateISO: reportDate,
      displayDate: formatDisplayDate(reportDate),
      weekday: new Date(reportDate + 'T12:00:00').toLocaleDateString('pt-AO', { weekday: 'long' }),
      generatedAt: new Date().toLocaleTimeString('pt-AO'),
      totals: { expected: calculatedData.totalTheoreticalRevenue, lifted: modalTotalLifted, discrepancy: modalDiscrepancy, soldStock: calculatedData.totalTheoreticalRevenue, profit: calculatedData.totalTheoreticalProfit },
      financials: { cash: formValues.cash, transfer: formValues.transfer, ticket: formValues.tpa, lunch: formValues.lunch, justification: formValues.justification },
      topProducts: calculatedData.salesChartData.slice(0, 5).map(i => ({ name: i.name, qty: i.Quantidade, total: i.Total })),
      itemsSnapshot: calculatedData.items.map(item => ({ id: item.id, name: item.name, init: item.init, buy: item.buy, end: item.end, soldQty: item.soldQty, revenue: item.revenue, isPromo: item.isPromo, breakdown: item.breakdown, mixMatchQtyUsed: item.mixMatchQtyUsed, avulsaQty: item.avulsaQty, discountAmount: item.discountAmount })),
      closedBy: user?.name || 'Vendedor', status: ClosureStatus.FECHO_PARCIAL_FUNCIONARIO,
      timestamp: Date.now(), editedBy: existingReport ? (user?.name || 'Sistema') : null
    };
    setShowCloseModal(false);
    await executeSync(newReport);
  };

  const executeSync = async (reportData: any) => {
    triggerHaptic('impact');
    setSyncState({ status: 'syncing', currentStep: 0, completedSteps: [] });
    await new Promise(resolve => setTimeout(resolve, 1200));
    setSyncState(prev => ({ ...prev, completedSteps: [...prev.completedSteps, 'security'], currentStep: 1 }));
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSyncState(prev => ({ ...prev, completedSteps: [...prev.completedSteps, 'database'], currentStep: 2 }));
    if (reportDate > todayISO) { setSyncState(prev => ({ ...prev, status: 'error' })); triggerHaptic('error'); alert("O servidor rejeitou o fecho: Datas futuras não são permitidas."); return; }
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSyncState(prev => ({ ...prev, completedSteps: [...prev.completedSteps, 'server'], currentStep: 3 }));
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSyncState(prev => ({ ...prev, completedSteps: [...prev.completedSteps, 'users'], currentStep: 4 }));
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSyncState(prev => ({ ...prev, completedSteps: [...prev.completedSteps, 'finance'], currentStep: 5 }));
    await new Promise(resolve => setTimeout(resolve, 800));
    try {
      if (existingReport) updateSalesReport(reportData.id, reportData);
      else addSalesReport(reportData);
      setSyncState(prev => ({ ...prev, status: 'success' }));
      triggerHaptic('success');
      showToast('Fecho realizado como parcial. Aguarda confirmação de outro responsável.');
      setTimeout(() => {
        setSyncState({ status: 'idle', currentStep: -1, completedSteps: [] });
        setForceEditMode(false); setViewHistoryReport(null);
        setEditConfirmationData(null); setShowConfirmEditModal(false);
        pageTopRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 1500);
    } catch (error: any) {
      console.error('ERRO NO FECHO:', error);
      setSyncState(prev => ({ ...prev, status: 'error' }));
      triggerHaptic('error'); alert("Não foi possível completar a acção. Verifique os dados.");
    }
  };

  const getCloseButtonColor = () => {
    if (isNotToday) return 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500';
    if (calculatedData.hasStockError) return 'bg-red-500 text-white';
    if (!isFinancialsConfirmed) return 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300';
    return 'bg-[#003366] text-white hover:opacity-90 shadow-blue-200';
  };

 const getCloseButtonText = () => {
    if (isLocked) return 'Dia Encerrado';
    if (calculatedData.hasStockError) return 'Erro de Stock';
    if (!isFinancialsConfirmed) return 'Confirmar Valores';
    return 'Fechar o Dia';
  };

  const getReportData = (report: any) => {
    if (!report) return { totals: { expected: 0, lifted: 0, discrepancy: 0, soldStock: 0 }, financials: { cash: 0, transfer: 0, ticket: 0, lunch: 0, justification: '' }, itemsSnapshot: [], status: ClosureStatus.FECHO_PARCIAL_FUNCIONARIO, displayDate: '', weekday: '', generatedAt: '' };
    if (report.totals) return report;
    return {
      ...report, displayDate: report.date || '', status: report.status || ClosureStatus.FECHO_CONFIRMADO,
      totals: { soldStock: report.totalExpected || 0, lifted: report.totalLifted || 0, discrepancy: report.discrepancy || 0, expected: report.totalExpected || 0 },
      financials: { cash: report.cash || 0, transfer: report.transfer || 0, ticket: report.tpa || 0, lunch: report.lunchExpense || 0, justification: report.notes || '' },
      topProducts: report.itemsSummary || [], itemsSnapshot: []
    };
  };

  const isPartialClosure = existingReport && (
    existingReport.status === ClosureStatus.FECHO_PARCIAL_FUNCIONARIO ||
    existingReport.status === ClosureStatus.FECHO_PARCIAL_GERENTE ||
    existingReport.status === ClosureStatus.FECHO_PARCIAL_ADMIN ||
    existingReport.status === ClosureStatus.FECHO_PARCIAL
  );

  // PROD-5: vista de relatório (fecho existente ou histórico)
 if (viewHistoryReport && !forceEditMode) {
    const reportData = getReportData(viewHistoryReport);
    const isConfirmed = reportData.status === ClosureStatus.FECHO_CONFIRMADO || reportData.status === ClosureStatus.BLOQUEADO;
    const lastActor = reportData.editedBy || reportData.closedBy || reportData.initiatedBy || 'Desconhecido';
    const hasClosurePermission = hasPermission(user, 'sales_closure');
    const canConfirm = !isConfirmed && hasClosurePermission && (!(user?.name === lastActor) || isAdminOrOwner);
    const isUnilateralAllowed = isAdminOrOwner;

    const handleConfirmClose = async () => {
      if (isDayLocked(reportDate)) { triggerHaptic('error'); showToast('Dia bloqueado. Desbloqueie primeiro para confirmar o fecho.'); return; }
      if (!reportDate) return;
      const finalReport = {
        ...reportData, status: ClosureStatus.FECHO_CONFIRMADO,
        confirmedBy: user?.name || 'Sistema', confirmationTimestamp: Date.now(),
        unilateralAdminConfirmation: isUnilateralAllowed, stockUpdated: false, processedFinancials: false,
        totalLifted: reportData.totals?.lifted, cash: reportData.financials?.cash,
        tpa: reportData.financials?.ticket, transfer: reportData.financials?.transfer, lunchExpense: reportData.financials?.lunch,
      };
      await confirmSalesReport(finalReport.id, user?.name || 'Sistema', isUnilateralAllowed, finalReport);
      setForceEditMode(false); showToast("Fecho confirmado e propagado com sucesso!"); triggerHaptic('success');
    };

    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in pb-32">
        {/* PROD-5: banner modo leitura + setas de navegação */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#003366] dark:text-white uppercase tracking-tight ml-8">Relatório de Vendas</h1>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1 ml-8">
              {reportData.displayDate} • Status: <span className={isConfirmed ? 'text-green-600' : 'text-amber-600'}>{reportData.status.replace(/_/g, ' ')}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 ml-8 md:ml-0">
            {/* Setas de navegação PROD-5 */}
            <button onClick={() => navigateDay('prev')} className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 transition-all" title="Dia anterior">
              <ChevronLeft size={20} />
            </button>
            <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl flex items-center gap-2">
              <Eye size={14} className="text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase">Visualização Histórica</span>
            </div>
            <button onClick={() => navigateDay('next')} disabled={reportDate >= todayISO} className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed" title="Dia seguinte">
              <ChevronRight size={20} />
            </button>
            <button onClick={() => setReportDate(todayISO)} className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-md">
              <RefreshCw size={14} /> Voltar ao Hoje
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <SoftCard className="p-8 relative overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl"><BarChart2 size={24} /></div>
                  <h3 className="font-black text-xl text-[#003366] dark:text-white uppercase">Resumo Financeiro</h3>
                </div>
                {/* PROD-2: sempre Sincronizado */}
                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase border border-green-100">
                  <Cloud size={12} /> Sincronizado
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="p-6 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-400 uppercase">Total Vendido</p>
                  <p className="text-2xl font-black text-[#003366] dark:text-white">{(reportData.totals?.soldStock || 0).toLocaleString('pt-AO')} Kz</p>
                </div>
                <div className="p-6 bg-[#003366] text-white rounded-2xl border border-[#003366] shadow-lg">
                  <p className="text-xs font-bold text-white/70 uppercase">Total Levantado</p>
                  <p className="text-3xl font-black">{(reportData.totals?.lifted || 0).toLocaleString('pt-AO')} Kz</p>
                </div>
                <div className={`p-6 rounded-2xl border ${(reportData.totals?.discrepancy || 0) !== 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                  <p className="text-xs font-bold text-slate-400 uppercase">Divergência</p>
                  <p className={`text-2xl font-black ${(reportData.totals?.discrepancy || 0) < 0 ? 'text-red-600' : (reportData.totals?.discrepancy || 0) > 0 ? 'text-green-600' : 'text-slate-600'}`}>
                    {(reportData.totals?.discrepancy || 0).toLocaleString('pt-AO')} Kz
                  </p>
                </div>
                {canViewMargins && (
                  <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Margem de Lucro</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{(reportData.totals?.profit || 0).toLocaleString('pt-AO')} Kz</p>
                  </div>
                )}
              </div>

              {reportData.totals?.discrepancy !== 0 && (
                <div className={`p-6 rounded-3xl mb-8 ${reportData.totals?.discrepancy < 0 ? 'bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20' : 'bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20'}`}>
                  <h4 className={`font-black uppercase mb-2 ${reportData.totals?.discrepancy < 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                    Justificativa de {reportData.totals?.discrepancy < 0 ? 'Quebra' : 'Sobra'}
                  </h4>
                  <textarea value={reportData.financials?.justification || ''} disabled={isConfirmed || reportData.status === ClosureStatus.BLOQUEADO}
                    onChange={(e) => updateSalesReport(reportData.id, { financials: { ...reportData.financials, justification: e.target.value } })}
                    className="w-full p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300 outline-none"
                    placeholder="Descreva o motivo da divergência..." rows={3} />
                  {!isConfirmed && reportData.status !== ClosureStatus.BLOQUEADO && (
                    <button onClick={() => {
                      const justificationData = { tipo: "JUSTIFICATIVA_CAIXA", valor_quebra_ou_sobra: reportData.totals?.discrepancy, justificativa: reportData.financials?.justification, usuario: user?.name || 'Desconhecido', data: reportDate, hora: Date.now() };
                      updateSalesReportJustification(reportData.id, justificationData);
                      showToast("Justificativa registada com sucesso"); triggerHaptic('success');
                    }} className="mt-4 px-6 py-3 bg-[#003366] text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center gap-2">
                      <MessageSquare size={18} /> Submeter Justificativa
                    </button>
                  )}
                </div>
              )}

              {!isConfirmed && reportData.status !== ClosureStatus.BLOQUEADO && (
                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800/50">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-2xl"><ShieldCheck size={24} /></div>
                    <div className="flex-1">
                      <h3 className="font-bold text-[#003366] dark:text-blue-300">Segunda Confirmação Necessária</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Este fecho foi registado como <strong>{reportData.status.replace(/_/g, ' ')}</strong>. Para que o stock e o financeiro sejam actualizados globalmente, é necessária uma segunda confirmação.
                      </p>
                      {(canConfirm || isUnilateralAllowed) && (
                        <button onClick={handleConfirmClose} className="mt-4 px-6 py-3 bg-[#003366] text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center gap-2">
                          <CheckCircle size={20} />
                          {isUnilateralAllowed ? 'Confirmar Unilateralmente (Proprietário)' : 'Confirmar Fecho Definitivo'}
                        </button>
                      )}
                      {!canConfirm && !isUnilateralAllowed && (
                        <p className="mt-4 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg border border-amber-100 dark:border-amber-800 inline-block">Aguardando confirmação de outro responsável.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 mt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <Clock size={16} className="text-slate-400 shrink-0" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    <span className="text-slate-400 uppercase">1º Fecho: </span>
                    {reportData.closedBy || 'Desconhecido'}
                    {reportData.timestamp ? ` · ${new Date(reportData.timestamp).toLocaleTimeString('pt-AO', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}` : ''}
                    {reportData.generatedAt ? ` (${reportData.generatedAt})` : ''}
                  </p>
                </div>
                {isConfirmed && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/50 flex items-center gap-3">
                    <CheckCircle size={16} className="text-green-600 shrink-0" />
                    <p className="text-xs font-bold text-green-700 dark:text-green-400">
                      <span className="uppercase">Confirmado: </span>
                      {reportData.confirmedBy || 'Desconhecido'}
                      {reportData.confirmationTimestamp ? ` · ${new Date(reportData.confirmationTimestamp).toLocaleTimeString('pt-AO', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}` : ''}
                      {reportData.unilateralAdminConfirmation ? ' (Admin)' : ''}
                    </p>
                  </div>
                )}
              </div>
            </SoftCard>

            <SoftCard className="p-0 overflow-hidden relative">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-[#003366] dark:text-white">Resumo de Vendas</h3>
                <button onClick={() => { setIsSummaryFullscreen(true); triggerHaptic('selection'); }} className="p-2 text-slate-400 hover:text-[#003366] dark:hover:text-blue-400 transition-colors" title="Ver em ecrã cheio">
                  <Maximize2 size={18} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      <th className="p-4 font-bold">Produto</th>
                      <th className="p-4 font-bold text-center">Inicial</th>
                      <th className="p-4 font-bold text-center">Compra</th>
                      <th className="p-4 font-bold text-center">Final</th>
                      <th className="p-4 font-bold text-center">Vendido</th>
                      <th className="p-4 font-bold text-right">Detalhes / Desconto</th>
                      <th className="p-4 font-bold text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {reportData.itemsSnapshot?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{item.name}</td>
                        <td className="p-4 text-center text-slate-500">{item.init}</td>
                        <td className="p-4 text-center text-green-600 font-medium">+{item.buy}</td>
                        <td className="p-4 text-center text-slate-500">{item.end}</td>
                        <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-200">{item.soldQty}</td>
                        <td className="p-4 text-right">
                          {item.isPromo && item.soldQty > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-slate-400 uppercase font-bold leading-tight">{item.mixMatchQtyUsed || 0} un (Mix Match) + {item.avulsaQty || 0} un (Avulsa)</span>
                              {item.discountAmount > 0 && <span className="text-xs font-medium text-amber-600">-{item.discountAmount.toLocaleString()} Kz</span>}
                            </div>
                          ) : <span className="text-slate-400">-</span>}
                        </td>
                        <td className="p-4 text-right font-bold text-[#003366] dark:text-blue-300">{(item.revenue || 0).toLocaleString('pt-AO')} Kz</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isSummaryFullscreen && (
                <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 md:p-4 animate-fade-in">
                  <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-none h-full md:h-[95vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl"><BarChart2 size={24} /></div>
                        <div>
                          <h3 className="font-black text-lg md:text-xl text-[#003366] dark:text-white uppercase">Resumo Detalhado de Vendas</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{reportData.displayDate}</p>
                        </div>
                      </div>
                      <button onClick={() => { setIsSummaryFullscreen(false); triggerHaptic('selection'); }} className="p-2 md:p-3 bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-red-500 rounded-2xl transition-all flex items-center gap-2 font-bold uppercase text-[10px] md:text-xs">
                        <Minimize2 size={18} /> Fechar
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto p-2 md:p-4">
                      <table className="w-full text-[11px] md:text-sm text-left table-auto border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 sticky top-0 z-10">
                            <th className="px-2 py-4 font-bold">Produto</th>
                            <th className="px-1 py-4 font-bold text-center">Inicial</th>
                            <th className="px-1 py-4 font-bold text-center">Compra</th>
                            <th className="px-1 py-4 font-bold text-center">Final</th>
                            <th className="px-1 py-4 font-bold text-center">Vendido</th>
                            <th className="px-2 py-4 font-bold text-right">Detalhes / Desconto</th>
                            <th className="px-2 py-4 font-bold text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {reportData.itemsSnapshot?.map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-2 py-4 font-bold text-slate-700 dark:text-slate-300 break-words max-w-[150px] md:max-w-none">{item.name}</td>
                              <td className="px-1 py-4 text-center text-slate-500">{item.init}</td>
                              <td className="px-1 py-4 text-center text-green-600 font-medium">+{item.buy}</td>
                              <td className="px-1 py-4 text-center text-slate-500">{item.end}</td>
                              <td className="px-1 py-4 text-center font-bold text-slate-700 dark:text-slate-200">{item.soldQty}</td>
                              <td className="px-2 py-4 text-right">
                                {item.isPromo && item.soldQty > 0 ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-[9px] md:text-[10px] text-slate-400 uppercase font-bold leading-tight whitespace-nowrap">{item.mixMatchQtyUsed || 0} un (Mix Match)</span>
                                    <span className="text-[9px] md:text-[10px] text-slate-400 uppercase font-bold leading-tight whitespace-nowrap">+ {item.avulsaQty || 0} un (Avulsa)</span>
                                    {item.discountAmount > 0 && <span className="text-[10px] md:text-xs font-medium text-amber-600">-{item.discountAmount.toLocaleString()} Kz</span>}
                                  </div>
                                ) : <span className="text-slate-400">-</span>}
                              </td>
                              <td className="px-2 py-4 text-right font-bold text-[#003366] dark:text-blue-300 whitespace-nowrap">{(item.revenue || 0).toLocaleString('pt-AO')} Kz</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </SoftCard>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={pageTopRef} className="p-4 md:p-8 space-y-8 animate-fade-in pb-32 relative min-h-screen">
      {existingReport && (
        <div className="max-w-5xl mx-auto mb-4">
          <button onClick={() => { setForceEditMode(false); setViewHistoryReport(null); triggerHaptic('selection'); }} className="text-slate-500 dark:text-slate-400 font-bold hover:text-[#003366] dark:hover:text-blue-400 flex items-center gap-2">
            ← Voltar ao Resumo
          </button>
        </div>
      )}

      {syncState.status !== 'idle' && (
        <div className="fixed inset-0 z-[200] bg-[#001A33] flex items-center justify-center p-4 md:p-8 animate-fade-in overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] animate-pulse delay-700" />
          </div>
          <div className="w-full max-w-2xl bg-white/5 backdrop-blur-2xl rounded-[40px] border border-white/10 p-8 md:p-12 shadow-2xl relative z-10 flex flex-col items-center">
            {syncState.status === 'success' ? (
              <div className="text-center animate-fade-slide-up">
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20"><CheckCircle size={48} className="text-white" /></div>
                <h2 className="text-4xl font-black text-white mb-2">Fecho Realizado!</h2>
                <p className="text-blue-200 text-lg font-medium">Sincronização concluída com sucesso.</p>
              </div>
            ) : syncState.status === 'error' ? (
              <div className="text-center animate-fade-slide-up">
                <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/20"><AlertCircle size={48} className="text-white" /></div>
                <h2 className="text-4xl font-black text-white mb-2">Erro no Fecho</h2>
                <p className="text-red-200 text-lg font-medium">A sincronização falhou. Tente novamente.</p>
                <button onClick={() => setSyncState({ status: 'idle', currentStep: -1, completedSteps: [] })} className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all">Voltar</button>
              </div>
            ) : (
              <div className="w-full space-y-8">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 rounded-full text-blue-300 text-xs font-black uppercase tracking-widest mb-4 border border-blue-500/30">
                    <RefreshCw size={14} className="animate-spin" /> Sincronização em Curso
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-white">Processando Fecho</h2>
                  <p className="text-blue-300/60 font-medium mt-2">Aguarde enquanto validamos e guardamos os dados do dia.</p>
                </div>
                <div className="space-y-4">
                  {[
                    { id: 'security', label: 'Sincronização Segura', desc: 'Validando integridade de dados', icon: ShieldCheck },
                    { id: 'database', label: 'Dados do Sistema', desc: 'Guardando registos do dia', icon: Database },
                    { id: 'server', label: 'Servidores', desc: 'Actualizando servidores remotos', icon: Server },
                    { id: 'users', label: 'Utilizadores e Admin', desc: 'Notificando responsáveis', icon: Smartphone },
                    { id: 'finance', label: 'Sistema Financeiro', desc: 'Actualizando fluxos de caixa', icon: CreditCard },
                  ].map((step, idx) => {
                    const isCompleted = syncState.completedSteps.includes(step.id);
                    const isCurrent = syncState.currentStep === idx;
                    const isPending = !isCompleted && !isCurrent;
                    return (
                      <div key={step.id} className={`flex items-center gap-4 p-4 rounded-3xl transition-all duration-500 border ${isCompleted ? 'bg-green-500/10 border-green-500/20' : isCurrent ? 'bg-blue-500/20 border-blue-500/30 scale-[1.02] shadow-lg shadow-blue-500/10' : 'bg-white/5 border-transparent opacity-40'}`}>
                        <div className={`p-3 rounded-2xl transition-all duration-500 ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-blue-500 text-white animate-pulse' : 'bg-white/10 text-white/40'}`}>
                          <step.icon size={24} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`font-bold ${isPending ? 'text-white/40' : 'text-white'}`}>{step.label}</h4>
                            {isCompleted ? <span className="text-[10px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1"><Check size={12} /> Concluído</span>
                              : isCurrent ? <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest animate-pulse">A processar...</span>
                              : <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Pendente</span>}
                          </div>
                          <p className={`text-xs ${isPending ? 'text-white/20' : 'text-white/60'}`}>{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-6">
                  <div className="flex justify-between text-[10px] font-black text-blue-300/40 uppercase tracking-widest mb-2">
                    <span>Progresso Geral</span><span>{Math.round((syncState.completedSteps.length / 5) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-1000 ease-out" style={{ width: `${(syncState.completedSteps.length / 5) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-slide-up">
          <div className="bg-[#003366] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold text-sm"><CheckCircle size={18} className="text-green-400" /> {toast.message}</div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className={`transition-all duration-300 ${sidebarMode === 'hidden' ? 'pl-16 md:pl-20' : ''}`}>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-[#003366] dark:text-white">Controle de Vendas</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => { triggerHaptic('selection'); setShowManualHistoryModal(true); }}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
                <History size={14} /> Histórico Manual
              </button>

              {/* PROD-5: setas de navegação na vista principal também */}
              <button onClick={() => navigateDay('prev')} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 transition-all" title="Dia anterior">
                <ChevronLeft size={16} />
              </button>

              <div className="relative">
                <input type="date" ref={dateInputRef} value={reportDate} onChange={(e) => setReportDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" max={todayISO} />
                <button className="px-3 py-1.5 bg-[#003366] text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-md">
                  <Calendar size={14} /> {isNotToday ? reportDate : 'Ver Outro Dia'}
                </button>
              </div>

              <button onClick={() => navigateDay('next')} disabled={reportDate >= todayISO}
                className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed" title="Dia seguinte">
                <ChevronRight size={16} />
              </button>

              {isNotToday && (
                <button onClick={() => setReportDate(todayISO)}
                  className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-md">
                  <RefreshCw size={14} /> Voltar ao Hoje
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <Calendar size={18} className="text-[#003366] dark:text-blue-400" />
            <span className="text-[#003366] dark:text-blue-400 font-bold">{formatDisplayDate(formatDateISO(new Date(reportDate + 'T12:00:00')))}</span>
            <div className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-tighter rounded border border-blue-200 dark:border-blue-800">
              {isNotToday ? 'Visualização Histórica' : 'Data Operacional'}
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center md:justify-end w-full md:w-auto gap-4">
          <SyncStatus />
          <button onClick={handleInitialClose} disabled={isReadOnly}
            className={`pill-button px-6 py-3 font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${isReadOnly ? 'bg-slate-300 cursor-not-allowed text-slate-500' : getCloseButtonColor()}`}>
            <Save size={20} /> {getCloseButtonText()}
          </button>
        </div>
      </header>

      <SoftCard className="overflow-hidden p-0" id="stock-table-section">
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-[#003366] dark:text-white flex items-center gap-2"><Calculator size={20}/> Contagem de Estoque</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-700 text-[#003366] dark:text-white">
                <th className="p-3 md:p-4 font-bold min-w-[150px]">Designação</th>
                <th className="p-3 md:p-4 font-bold text-center w-24 bg-blue-50/50 dark:bg-blue-900/20">Inicial</th>
                <th className="p-3 md:p-4 font-bold text-center w-28 bg-green-50/50 dark:bg-green-900/20">Comprou</th>
                <th className="p-3 md:p-4 font-bold text-center w-24 bg-purple-50/50 dark:bg-purple-900/20">Stock Sist.</th>
                <th className="p-3 md:p-4 font-bold text-center w-24 bg-red-50/50 dark:bg-red-900/20">Final (Físico)</th>
                <th className="p-3 md:p-4 font-bold text-center w-24 bg-slate-200 dark:bg-slate-600">Vendido</th>
                <th className="p-3 md:p-4 font-bold text-right min-w-[100px]">Total (Kz)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {calculatedData.items.map((item) => (
                <React.Fragment key={item.id}>
                  <tr className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${!item.isBalanced ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                    <td className="p-3 md:p-4 font-bold text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        {item.name}
                        {item.isPromo && item.soldQty > 0 && (
                          <button onClick={() => openMixMatchModal(item)} className={`p-1 rounded-full transition-all ${breakdowns[item.id] ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Calculator size={14} />
                          </button>
                        )}
                        {!item.isBalanced && <AlertTriangle size={16} className="text-red-500 animate-pulse" />}
                      </div>
                    </td>
                    <td className="p-2 bg-blue-50/30 dark:bg-blue-900/10">
                      <input type="text" inputMode="decimal" disabled={!canEditInitialStock || isReadOnly} placeholder="0"
                        value={initialStock[item.id] ?? ''} onChange={(e) => handleStockChange(setInitialStock, item.id, e.target.value)}
                        className="w-full text-center border rounded-lg py-2 focus:ring-2 focus:ring-blue-500 outline-none font-medium dark:bg-slate-700 dark:text-white" />
                    </td>
                    <td className="p-2 bg-green-50/30 dark:bg-green-900/10">
                      <input type="text" inputMode="decimal" value={purchasedStock[item.id] || 0} readOnly className="w-full text-center bg-white/50 dark:bg-slate-700/50 border border-green-200 dark:border-green-800 rounded-lg py-2 text-green-700 dark:text-green-400 font-bold cursor-default" />
                    </td>
                    <td className="p-2 bg-purple-50/30 dark:bg-purple-900/10">
                      <div className="w-full text-center py-2 text-purple-700 dark:text-purple-400 font-bold">{item.stock}</div>
                    </td>
                    <td className="p-2 bg-red-50/30 dark:bg-red-900/10">
                      <input type="text" inputMode="decimal" disabled={isReadOnly} placeholder="0"
                        value={endingStock[item.id] ?? ''} onChange={(e) => handleStockChange(setEndingStock, item.id, e.target.value)}
                        className="w-full text-center border rounded-lg py-2 outline-none font-medium dark:text-white bg-white dark:bg-slate-700 focus:ring-2 focus:ring-red-500" />
                    </td>
                    <td className="p-2 bg-slate-100/50 dark:bg-slate-700/30">
                      <div className="text-center font-bold py-2 text-slate-700 dark:text-slate-200">{item.soldQty}</div>
                    </td>
                    <td className="p-3 md:p-4 text-right font-bold text-[#003366] dark:text-blue-300">{(item.revenue || 0).toLocaleString('pt-AO')}</td>
                  </tr>
                  {expandedRows[item.id] && item.isPromo && item.soldQty > 0 && (
                    <tr className="bg-slate-50 dark:bg-slate-800/50 animate-fade-in">
                      <td colSpan={7} className="p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-inner">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2"><Calculator size={14} /> Detalhe da Venda (Mix & Match)</h4>
                            {!item.isBalanced && <span className="text-xs font-bold text-red-500 flex items-center gap-1"><AlertTriangle size={12} /> Soma incorrecta ({((item.breakdown?.packs || 0) * item.promoQty + (item.breakdown?.singles || 0) + (item.breakdown?.waste || 0))} vs {item.soldQty})</span>}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                              <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1 block">Grupos de Mix Match ({item.promoQty}un por {item.promoPrice} Kz)</label>
                              <div className="flex items-center gap-2">
                                <input type="text" inputMode="decimal" value={item.breakdown?.packs ?? ''}
                                  onChange={(e) => handleBreakdownChange(item.id, 'packs', e.target.value, item.soldQty, item.promoQty)}
                                  className="w-16 p-1 text-center font-bold rounded border-none outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-700 dark:text-white" />
                                <span className="text-xs font-medium text-slate-500">= {(((item.breakdown?.packs || 0) * item.promoPrice) || 0).toLocaleString()} Kz</span>
                              </div>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
                              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Avulsas ({item.sellPrice} Kz)</label>
                              <div className="flex items-center gap-2">
                                <input type="text" inputMode="decimal" value={item.breakdown?.singles ?? ''}
                                  onChange={(e) => handleBreakdownChange(item.id, 'singles', e.target.value, item.soldQty, item.promoQty)}
                                  className="w-16 p-1 text-center font-bold rounded border-none outline-none focus:ring-1 focus:ring-slate-500 dark:bg-slate-600 dark:text-white" />
                                <span className="text-xs font-medium text-slate-500">= {(((item.breakdown?.singles || 0) * item.sellPrice) || 0).toLocaleString()} Kz</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              <tr>
                <td colSpan={7} className="p-2">
                  {!showAddProduct ? (
                    <button onClick={() => setShowAddProduct(true)} disabled={isReadOnly} className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-400 font-bold flex items-center justify-center gap-2 hover:border-[#003366] dark:hover:border-blue-400 hover:text-[#003366] dark:hover:text-blue-400">
                      <PlusCircle size={18} /> Adicionar Novo Produto
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl">
                      <input type="text" placeholder="Nome do Produto" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="flex-1 p-2 rounded-lg border-none dark:bg-slate-700 dark:text-white" autoFocus />
                      <input type="text" inputMode="decimal" placeholder="Preço Venda (Kz)" value={newProductPrice ?? ''} onChange={(e) => setNewProductPrice(e.target.value)} className="w-32 p-2 rounded-lg border-none dark:bg-slate-700 dark:text-white" />
                      <button onClick={() => {
                        if (!newProductName || !newProductPrice) return;
                        addProduct({ name: newProductName, sellPrice: parseFloat(newProductPrice), buyPrice: parseFloat(newProductPrice) * 0.5, stock: 0, minStock: 10, category: 'Geral' });
                        setNewProductName(''); setNewProductPrice(''); setShowAddProduct(false);
                        triggerHaptic('success'); showToast('Produto adicionado à lista!');
                      }} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold">Guardar</button>
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-[#003366] text-white">
              <tr><td colSpan={6} className="p-4 text-right font-bold uppercase tracking-wider">Total Calculado (Stock):</td><td className="p-4 text-right font-black text-lg">{(calculatedData.totalTheoreticalRevenue || 0).toLocaleString('pt-AO')} Kz</td></tr>
            </tfoot>
          </table>
        </div>
      </SoftCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="financial-section">
        <SoftCard className="space-y-6">
          <div className="flex justify-between items-center"><h3 className="font-bold text-[#003366] dark:text-white flex items-center gap-2"><DollarSign size={20} /> Declaração de Valores</h3></div>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
              <label className="text-xs font-bold text-red-500 dark:text-red-400 uppercase block mb-2">Despesa de Almoço (Retirado)</label>
              <input type="text" inputMode="decimal" value={financials.lunch ?? ''} disabled={isFinancialsConfirmed || isReadOnly || isDayLocked(reportDate)}
                onChange={(e) => handleFinancialChange('lunch', e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-800 font-bold text-red-600 dark:text-red-400" placeholder="0" />
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
              <p className="text-sm font-bold text-[#003366] dark:text-blue-400 mb-4 uppercase tracking-widest">Valores Levantados (Gaveta)</p>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><Wallet size={14} /> Total em Cash</label>
                <input type="text" inputMode="decimal" value={financials.cash ?? ''} disabled={isFinancialsConfirmed || isReadOnly || isDayLocked(reportDate)}
                  onChange={(e) => handleFinancialChange('cash', e.target.value)} className="w-full p-4 rounded-2xl soft-ui-inset font-bold text-green-700 bg-white dark:bg-slate-800 outline-none" placeholder="0" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><ArrowRightLeft size={14} /> Transferência</label>
                  <input type="text" inputMode="decimal" value={financials.transfer ?? ''} disabled={isFinancialsConfirmed || isReadOnly || isDayLocked(reportDate)}
                    onChange={(e) => handleFinancialChange('transfer', e.target.value)} className="w-full p-4 rounded-2xl soft-ui-inset font-bold text-blue-700 bg-white dark:bg-slate-800 outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><CreditCard size={14} /> TPA / Ticket</label>
                  <input type="text" inputMode="decimal" value={financials.ticket ?? ''} disabled={isFinancialsConfirmed || isReadOnly || isDayLocked(reportDate)}
                    onChange={(e) => handleFinancialChange('ticket', e.target.value)} className="w-full p-4 rounded-2xl soft-ui-inset font-bold text-purple-700 bg-white dark:bg-slate-800 outline-none" placeholder="0" />
                </div>
              </div>
              {isDayLocked(reportDate) ? (
                <div className="w-full py-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 text-amber-700 font-bold rounded-2xl flex items-center justify-center gap-2 text-center px-4 mt-4">
                  <AlertCircle size={20} /> Este dia encontra-se bloqueado pela gestão. Nenhuma alteração é permitida.
                </div>
              ) : !isFinancialsConfirmed ? (
                <button onClick={handleConfirmFinancials} disabled={isReadOnly} className="w-full py-4 bg-[#003366] text-white font-bold rounded-2xl shadow-lg mt-4">Confirmar Levantar Valores</button>
              ) : (
                <div className="w-full py-4 bg-green-50 dark:bg-green-900/20 border border-green-100 text-green-700 font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer" onClick={handleUnlockFinancials}>
                  <Lock size={20} /> Valores Confirmados (Editar)
                </div>
              )}
            </div>
          </div>
        </SoftCard>

        <div className="space-y-6">
          <SoftCard className="bg-[#003366] text-white">
            <h3 className="font-bold text-white/90 mb-6">Apuramento do Gestor</h3>
            <div className="space-y-4">
              <div className="pb-4 border-b border-white/10 flex justify-between items-center"><span className="text-sm opacity-70">Total Venda (Stock)</span><span className="font-bold">{(calculatedData.totalTheoreticalRevenue || 0).toLocaleString('pt-AO')} Kz</span></div>
              <div className="pt-2 flex justify-between items-center"><span className="text-lg opacity-90 font-bold uppercase">Total Levantado</span><span className="font-black text-4xl text-white">{(totalLifted || 0).toLocaleString('pt-AO')} Kz</span></div>
              {canViewMargins && (
                <div className="pt-4 mt-4 border-t border-white/20 flex justify-between items-center text-emerald-400">
                  <span className="text-lg opacity-90 font-bold uppercase">Margem de Lucro</span>
                  <span className="font-black text-4xl">{(calculatedData.totalTheoreticalProfit || 0).toLocaleString('pt-AO')} Kz</span>
                </div>
              )}
            </div>
          </SoftCard>
          {hasDiscrepancy && (
            <div className={`p-6 rounded-3xl text-white ${discrepancy < 0 ? 'bg-red-500' : 'bg-green-500'}`}>
              <h4 className="font-black uppercase mb-1">{discrepancy < 0 ? 'Quebra de Caixa' : 'Sobra de Caixa'}</h4>
              <p className="text-3xl font-black mb-4">{(discrepancy || 0).toLocaleString('pt-AO')} Kz</p>
              <textarea value={financials.discrepancyJustification} disabled={isReadOnly} onChange={(e) => setFinancials({...financials, discrepancyJustification: e.target.value})}
                className="w-full p-3 bg-white text-slate-800 rounded-xl font-medium outline-none" placeholder="Justifique a divergência..." rows={3} />
              {currentReportId && (
                <button onClick={() => {
                  const justificationData = { tipo: "JUSTIFICATIVA_CAIXA", valor_quebra_ou_sobra: discrepancy, justificativa: financials.discrepancyJustification, usuario: user?.name || 'Desconhecido', data: reportDate, hora: Date.now() };
                  updateSalesReportJustification(currentReportId, justificationData);
                  showToast("Justificativa registada com sucesso"); triggerHaptic('success');
                }} className="mt-4 w-full py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                  <MessageSquare size={18} /> Submeter Justificativa
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showCloseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-[#003366] dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} /></div>
              <h2 className="text-2xl font-black text-[#003366] dark:text-white">Confirmar Fecho</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Valide os valores financeiros para encerrar o dia.</p>
            </div>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Dinheiro (Cash)</label>
                  <input type="text" inputMode="decimal" value={formValues.cash || ''} onChange={(e) => setFormValues(prev => ({ ...prev, cash: Number(e.target.value) || 0 }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 font-bold text-green-600 outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">TPA / Multicaixa</label>
                  <input type="text" inputMode="decimal" value={formValues.tpa || ''} onChange={(e) => setFormValues(prev => ({ ...prev, tpa: Number(e.target.value) || 0 }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 font-bold text-purple-600 outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Transferência</label>
                  <input type="text" inputMode="decimal" value={formValues.transfer || ''} onChange={(e) => setFormValues(prev => ({ ...prev, transfer: Number(e.target.value) || 0 }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Despesa Almoço</label>
                  <input type="text" inputMode="decimal" value={formValues.lunch || ''} onChange={(e) => setFormValues(prev => ({ ...prev, lunch: Number(e.target.value) || 0 }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 font-bold text-red-600 outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-600">
                <div className="flex justify-between text-xs"><span className="text-slate-500 dark:text-slate-400">Total Vendas (Stock):</span><span className="font-bold dark:text-white">{(calculatedData.totalTheoreticalRevenue || 0).toLocaleString('pt-AO')} Kz</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500 dark:text-slate-400">Total Levantado:</span><span className="font-bold dark:text-white">{(formValues.cash + formValues.tpa + formValues.transfer).toLocaleString('pt-AO')} Kz</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500 dark:text-slate-400">Despesa Almoço:</span><span className="font-bold text-red-500">-{formValues.lunch.toLocaleString('pt-AO')} Kz</span></div>
                <div className={`flex justify-between text-sm font-bold pt-2 border-t border-slate-200 dark:border-slate-600 ${((formValues.cash + formValues.tpa + formValues.transfer) - (calculatedData.totalTheoreticalRevenue - formValues.lunch)) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  <span>Divergência:</span>
                  <span>{((formValues.cash + formValues.tpa + formValues.transfer) - (calculatedData.totalTheoreticalRevenue - formValues.lunch)).toLocaleString('pt-AO')} Kz</span>
                </div>
              </div>
              {((formValues.cash + formValues.tpa + formValues.transfer) - (calculatedData.totalTheoreticalRevenue - formValues.lunch)) !== 0 && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Justificativa da Divergência</label>
                  <textarea value={formValues.justification} onChange={(e) => setFormValues(prev => ({ ...prev, justification: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2} placeholder="Descreva o motivo da quebra ou sobra..." />
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowCloseModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={handleDayClosureSubmit} className="flex-1 py-4 bg-[#003366] text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all">Confirmar Fecho</button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-16 py-10 px-6 bg-white rounded-2xl text-center flex flex-col gap-4 font-sans border border-slate-100">
        <p className="text-sm font-bold tracking-[-0.01em] text-[#003366]">Marguel Sistema de Gestão Interna</p>
        <div className="flex flex-col items-center">
          <span className="text-xs text-[#6B7280] mb-1">Desenvolvido por</span>
          <div className="text-xs tracking-[0.5px]">
            <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>DC - Comercial</span>
            <span className="text-[#6B7280] font-normal mx-1">&</span>
            <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>Marguel CGPS (SU) Lda</span>
          </div>
        </div>
      </footer>

      {/* APP-3: modais fora do corpo do componente */}
      <MixMatchModal
        show={showMixMatchModal}
        onClose={() => setShowMixMatchModal(false)}
        product={selectedProductForMix}
        breakdowns={breakdowns}
        onBreakdownChange={handleBreakdownChange}
      />
      <ConfirmEditModal
        show={showConfirmEditModal}
        onClose={() => setShowConfirmEditModal(false)}
        reportData={editConfirmationData}
        user={user}
        salesReports={salesReports}
        confirmSalesReport={confirmSalesReport}
        showToast={showToast}
        triggerHaptic={triggerHaptic}
        setForceEditMode={setForceEditMode}
      />
      <ManualHistoryModal
        show={showManualHistoryModal}
        onClose={() => setShowManualHistoryModal(false)}
        stockOperationHistory={stockOperationHistory}
      />
    </div>
  );
};

export default Sales;
