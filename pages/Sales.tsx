import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Save, Calculator, DollarSign, Calendar, TrendingDown, AlertCircle, PlusCircle, Wallet, CreditCard, ArrowRightLeft, CheckCircle, X, Send, MessageSquare, Clock, Plus, Printer, Lock, Unlock, BarChart2, ArrowUp, Filter, Eye, ChevronRight, RefreshCw, Database, Server, ShieldCheck, Smartphone, ChevronDown, ChevronUp, AlertTriangle, Check } from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { useProducts } from '../contexts/ProductContext';
import { MGLogo } from '../constants';
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
import { UserRole, ClosureStatus } from '../types';
import { hasPermission } from '../src/utils/permissions';
import { useFinance } from '../contexts/FinanceContext';
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
  
  // Compatibility fields for Dashboard
  date?: string;
  itemsSummary?: { name: string; qty: number; total: number }[];
  totalLifted?: number;
  cash?: number;
  tpa?: number;
  transfer?: number;
  lunchExpense?: number;
  discrepancy?: number;
}

const Sales: React.FC = () => {
  const { products, addProduct, updateProduct, getPurchasesByDate, getTodayPurchases, addPurchase, salesReports: contextSalesReports, addSalesReport, confirmSalesReport, isDayLocked, reopenDay } = useProducts();
  const { sidebarMode, triggerHaptic } = useLayout();
  const { user } = useAuth();
  const { addTransaction } = useFinance();

  // Use context reports, cast to DailyReport[] if needed
  const salesReports = contextSalesReports as unknown as DailyReport[];

  const pageTopRef = useRef<HTMLDivElement>(null);
  const todayISO = new Date().toISOString().split('T')[0];
  const [reportDate, setReportDate] = useState(todayISO);

  // Bloqueio de datas futuras
  useEffect(() => {
    if (reportDate > todayISO) {
      setReportDate(todayISO);
    }
  }, [reportDate, todayISO]);

  const [initialStock, setInitialStock] = useState<Record<string, string>>({});
  const [endingStock, setEndingStock] = useState<Record<string, string>>({});
  
  // Effect to handle Initial Stock Snapshot and Report Loading
  useEffect(() => {
    // 1. Check if a finalized report exists for this date in the context
    const existingReport = salesReports.find(r => {
      const reportDateISO = r.dateISO ? r.dateISO.split('T')[0] : r.date;
      return reportDateISO === reportDate;
    });
    
    if (existingReport) {
      const init: Record<string, string> = {};
      const end: Record<string, string> = {};
      const bds: Record<string, any> = {};
      
      // Load from itemsSnapshot if available, otherwise from stockSnapshot
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
      
      setInitialStock(init);
      setEndingStock(end);
      setBreakdowns(bds);
      setIsDayClosed(true);
      setIsFinancialsConfirmed(true);
      
      const fin = existingReport.financials || {
        cash: existingReport.cash || 0,
        transfer: existingReport.transfer || 0,
        ticket: 0,
        lunch: existingReport.lunchExpense || 0,
        justification: existingReport.notes || ''
      };

      setFinancials({
        cash: fin.cash.toString(),
        transfer: fin.transfer.toString(),
        ticket: (fin as any).ticket?.toString() || '0',
        lunch: fin.lunch.toString(),
        discrepancyJustification: fin.justification || ''
      });
      return;
    }

    // 2. If no finalized report, handle snapshot logic
    setIsDayClosed(false);
    setIsFinancialsConfirmed(false);
    setEndingStock({});
    setBreakdowns({});
    setFinancials({ cash: '', transfer: '', ticket: '', lunch: '', discrepancyJustification: '' });

    const snapshotKey = `mg_initial_stock_v2_${reportDate}`;
    const savedSnapshot = localStorage.getItem(snapshotKey);
    
    if (savedSnapshot) {
      setInitialStock(JSON.parse(savedSnapshot));
    } else {
      // Create new snapshot from current inventory
      // This happens the first time the page is opened for a specific date
      const newSnapshot: Record<string, string> = {};
      products.forEach(p => {
        newSnapshot[p.id] = p.stock.toString();
      });
      setInitialStock(newSnapshot);
      localStorage.setItem(snapshotKey, JSON.stringify(newSnapshot));
    }
  }, [reportDate, salesReports, products]);

  const purchasedStock = useMemo(() => {
    // Convert reportDate (YYYY-MM-DD) to pt-AO format for matching purchases
    const d = new Date(reportDate + 'T12:00:00');
    return getPurchasesByDate(d.toLocaleDateString('pt-AO'));
  }, [getPurchasesByDate, products, reportDate]);

  const [quickPurchaseModal, setQuickPurchaseModal] = useState<{isOpen: boolean, productId: string | null}>({isOpen: false, productId: null});
  const [quickPurchaseQty, setQuickPurchaseQty] = useState('');
  
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  
  const [financials, setFinancials] = useState({
    cash: '',
    transfer: '',
    ticket: '',
    lunch: '',
    discrepancyJustification: ''
  });

  const [isFinancialsConfirmed, setIsFinancialsConfirmed] = useState(false);
  const [syncState, setSyncState] = useState<{
    status: 'idle' | 'syncing' | 'success' | 'error';
    currentStep: number;
    completedSteps: string[];
  }>({ status: 'idle', currentStep: -1, completedSteps: [] });

  const [isDayClosed, setIsDayClosed] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  
  const [historyFilter, setHistoryFilter] = useState<'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year' | 'all'>('week');
  const [viewHistoryReport, setViewHistoryReport] = useState<DailyReport | null>(null);

  const [toast, setToast] = useState<{show: boolean, message: string}>({ show: false, message: '' });
  
  // States for Breakdown (Mix & Match)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [breakdowns, setBreakdowns] = useState<Record<string, { packs: number, singles: number, waste: number }>>({});

  const canEditInitialStock = hasPermission(user, 'sales_edit') && !isDayLocked(reportDate);
  const canExecuteSales = hasPermission(user, 'sales_execute');
  const canCloseDay = hasPermission(user, 'sales_closure');
  const canReopenDay = hasPermission(user, 'sales_reopen');
  
  const isReadOnly = !canExecuteSales || isDayLocked(reportDate);
  const isLocked = isDayLocked(reportDate);

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const handleAddNewProduct = () => {
    if (isReadOnly) return;
    if (!newProductName || !newProductPrice) return;
    
    addProduct({
      name: newProductName,
      sellPrice: parseFloat(newProductPrice),
      buyPrice: parseFloat(newProductPrice) * 0.5,
      stock: 0,
      minStock: 10,
      category: 'Geral'
    });

    setNewProductName('');
    setNewProductPrice('');
    setShowAddProduct(false);
    triggerHaptic('success');
    showToast('Produto adicionado à lista!');
  };

  const handleQuickPurchase = () => {
    if (isReadOnly) return;
    if (!quickPurchaseModal.productId || !quickPurchaseQty) return;
    
    const qty = parseFloat(quickPurchaseQty);
    if (isNaN(qty) || qty <= 0) return;

    triggerHaptic('success');
    addPurchase({ [quickPurchaseModal.productId]: qty }, 'Sales', user?.name || 'Vendas');

    setQuickPurchaseQty('');
    setQuickPurchaseModal({ isOpen: false, productId: null });
    showToast('Compra adicionada ao histórico e stock!');
  };

  const toggleRow = (id: string) => {
    if (isReadOnly) return;
    triggerHaptic('selection');
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleBreakdownChange = (id: string, field: 'packs' | 'singles' | 'waste', value: string, currentBreakdown: any) => {
    if (isReadOnly) return;
    const num = parseInt(value) || 0;
    setBreakdowns(prev => {
        // If no manual entry yet, start with the current (default) breakdown
        const base = prev[id] || { packs: currentBreakdown.packs, singles: currentBreakdown.singles, waste: currentBreakdown.waste };
        return { ...prev, [id]: { ...base, [field]: num } };
    });
  };

  const calculatedData = useMemo(() => {
    let totalTheoreticalRevenue = 0;
    let hasStockError = false;

    const items = products.map(product => {
      const init = parseInt(initialStock[product.id] || '0') || 0;
      const buy = purchasedStock[product.id] || 0;
      const end = parseInt(endingStock[product.id] || '0') || 0;
      
      const soldQty = init + buy - end;
      
      if (soldQty < 0) hasStockError = true;

      // Mix & Match / Breakdown Logic
      const isPromo = product.category === 'Cervejas' || (product as any).isPromoActive;
      const promoQty = (product as any).promoQty || 3;
      const promoPrice = (product as any).promoPrice || 1000;
      
      let revenue = 0;
      let breakdown = { packs: 0, singles: 0, waste: 0 };
      let isBalanced = true;

      if (isPromo && soldQty > 0) {
          const manual = breakdowns[product.id];
          if (manual) {
              // Use manual breakdown
              const totalUnits = (manual.packs * promoQty) + manual.singles + manual.waste;
              isBalanced = totalUnits === soldQty;
              revenue = (manual.packs * promoPrice) + (manual.singles * product.sellPrice);
              breakdown = manual;
          } else {
              // Default breakdown (Auto-suggest)
              const packs = Math.floor(soldQty / promoQty);
              const singles = soldQty % promoQty;
              revenue = (packs * promoPrice) + (singles * product.sellPrice);
              breakdown = { packs, singles, waste: 0 };
          }
      } else {
          // Standard calculation
          revenue = soldQty * product.sellPrice;
      }

      totalTheoreticalRevenue += revenue;

      return { ...product, init, buy, end, soldQty, revenue, isPromo, breakdown, isBalanced, promoQty, promoPrice };
    });

    const salesChartData = items
      .filter(item => item.soldQty > 0)
      .sort((a, b) => b.soldQty - a.soldQty)
      .map(item => ({
        name: item.name,
        Quantidade: item.soldQty,
        Total: item.revenue,
        category: item.category
      }));

    return { items, totalTheoreticalRevenue, salesChartData, hasStockError };
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
    if (totalLifted === 0) {
        triggerHaptic('warning');
        alert("⚠️ Atenção!\n\nVocê ainda não inseriu nenhum valor.");
        return;
    }
    triggerHaptic('success');
    setIsFinancialsConfirmed(true);
    showToast("Valores confirmados.");
  };

  const handleUnlockFinancials = () => {
    if (isReadOnly) return;
    triggerHaptic('selection');
    setIsFinancialsConfirmed(false);
  };

  const handleInitialClose = () => {
    if (!canCloseDay) {
        triggerHaptic('error');
        showToast("Sem permissão para realizar fecho.");
        return;
    }
    if (isReadOnly) return;
    if (reportDate > todayISO) {
        triggerHaptic('error');
        alert("❌ DATA INVÁLIDA\n\nNão é permitido fechar dias futuros.");
        return;
    }
    if (calculatedData.hasStockError) {
        triggerHaptic('error');
        alert("⛔ IMPEDIMENTO DE FECHO\n\nExistem produtos com Stock Negativo.");
        return;
    }
    if (totalLifted === 0 || !isFinancialsConfirmed) {
        triggerHaptic('warning');
        alert("⚠️ Por favor, confirme os valores levantados antes de fechar.");
        return;
    }
    triggerHaptic('selection');
    setShowCloseModal(true);
  };

  const confirmCloseDay = async () => {
    if (hasDiscrepancy && !financials.discrepancyJustification) {
      triggerHaptic('error');
      showToast("Justifique a divergência.");
      return;
    }
    
    setShowCloseModal(false);
    triggerHaptic('impact');
    setSyncState({ status: 'syncing', currentStep: 0, completedSteps: [] });

    // Step 1: Sincronização Segura
    await new Promise(resolve => setTimeout(resolve, 1200));
    setSyncState(prev => ({ ...prev, completedSteps: [...prev.completedSteps, 'security'], currentStep: 1 }));
    
    // Step 2: Dados do Sistema
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSyncState(prev => ({ ...prev, completedSteps: [...prev.completedSteps, 'database'], currentStep: 2 }));
    
    if (reportDate > todayISO) {
        setSyncState(prev => ({ ...prev, status: 'error' }));
        triggerHaptic('error');
        alert("O servidor rejeitou o fecho: Datas futuras não são permitidas.");
        return;
    }

    // Step 3: Servidores
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSyncState(prev => ({ ...prev, completedSteps: [...prev.completedSteps, 'server'], currentStep: 3 }));

    // Step 4: Usuários e Admin
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSyncState(prev => ({ ...prev, completedSteps: [...prev.completedSteps, 'users'], currentStep: 4 }));

    // Step 5: Sistema Financeiro
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSyncState(prev => ({ ...prev, completedSteps: [...prev.completedSteps, 'finance'], currentStep: 5 }));

    await new Promise(resolve => setTimeout(resolve, 800));

    const reportId = Date.now().toString();
    const performer = user?.name || 'Sistema';

    const initialStatus = 
      user?.role === UserRole.GERENTE ? ClosureStatus.FECHO_PARCIAL_GERENTE :
      user?.role === UserRole.ADMIN_GERAL || user?.role === UserRole.PROPRIETARIO ? ClosureStatus.FECHO_PARCIAL_ADMIN :
      ClosureStatus.FECHO_PARCIAL_FUNCIONARIO;

    const reportTimestamp = new Date(reportDate + 'T12:00:00'); 
    const newReport: DailyReport & { status: ClosureStatus } = {
      id: reportId,
      dateISO: reportTimestamp.toISOString(),
      displayDate: reportTimestamp.toLocaleDateString('pt-AO', { year: 'numeric', month: 'long', day: 'numeric' }),
      weekday: reportTimestamp.toLocaleDateString('pt-AO', { weekday: 'long' }),
      generatedAt: new Date().toLocaleTimeString('pt-AO'),
      totals: {
        expected: totalExpected,
        lifted: totalLifted,
        discrepancy: discrepancy,
        soldStock: calculatedData.totalTheoreticalRevenue
      },
      financials: {
        cash: declaredCash,
        transfer: declaredTransfer,
        ticket: declaredTicket,
        lunch: lunchExpense,
        justification: financials.discrepancyJustification
      },
      topProducts: calculatedData.salesChartData.slice(0, 5).map(i => ({ name: i.name, qty: i.Quantidade, total: i.Total })),
      itemsSnapshot: calculatedData.items.filter(i => i.soldQty !== 0 || i.init !== 0 || i.end !== 0),
      closedBy: user?.name || 'Sistema',
      status: initialStatus,
      timestamp: reportTimestamp.getTime(),
      
      // Compatibility fields for Dashboard
      date: reportTimestamp.toLocaleDateString('pt-AO'),
      itemsSummary: calculatedData.items.filter(i => i.soldQty > 0).map(i => ({
          name: i.name,
          qty: i.soldQty,
          total: i.revenue
      })),
      totalLifted: totalLifted,
      cash: declaredCash,
      tpa: declaredTicket,
      transfer: declaredTransfer,
      lunchExpense: lunchExpense,
      discrepancy: discrepancy
    };

    // Save snapshot to report for persistence
    (newReport as any).stockSnapshot = {
      initial: initialStock,
      final: endingStock
    };

    addSalesReport(newReport as any);
    
    setSyncState(prev => ({ ...prev, status: 'success' }));
    triggerHaptic('success');

    setTimeout(() => {
        setSyncState({ status: 'idle', currentStep: -1, completedSteps: [] });
        setIsDayClosed(true);
        pageTopRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 2500);
  };

  const getCloseButtonColor = () => {
    if (calculatedData.hasStockError) return 'bg-red-500 text-white';
    if (!isFinancialsConfirmed) return 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300';
    return 'bg-[#003366] text-white hover:opacity-90 shadow-blue-200';
  };

  const handleReopenDay = () => {
    if (!canReopenDay) {
        triggerHaptic('error');
        showToast("Sem permissão para reabrir o dia.");
        return;
    }
    if (confirm("Deseja realmente reabrir este dia operacional? Isso permitirá novas alterações.")) {
        reopenDay(reportDate);
        showToast("Dia reaberto com sucesso!");
        triggerHaptic('success');
    }
  };

  const getCloseButtonText = () => {
    if (isLocked) return 'Dia Encerrado';
    if (calculatedData.hasStockError) return 'Erro de Stock';
    if (!isFinancialsConfirmed) return 'Confirmar Valores';
    return 'Fechar o Dia';
  };

  const INACTIVITY_THRESHOLD_HOURS = 24;

  const getReportData = (report: any) => {
      if (!report) return {
          totals: { expected: 0, lifted: 0, discrepancy: 0, soldStock: 0 },
          financials: { cash: 0, transfer: 0, ticket: 0, lunch: 0, justification: '' },
          itemsSnapshot: [],
          status: ClosureStatus.FECHO_PARCIAL_FUNCIONARIO,
          displayDate: '',
          weekday: '',
          generatedAt: ''
      };
      if (report.totals) return report; // New format
      
      // Old format (SalesReport)
      return {
          ...report,
          displayDate: report.date || '', 
          status: report.status || ClosureStatus.FECHO_CONFIRMADO, // Assume old ones are confirmed
          totals: {
              soldStock: report.totalExpected || 0,
              lifted: report.totalLifted || 0,
              discrepancy: report.discrepancy || 0,
              expected: report.totalExpected || 0
          },
          financials: {
              cash: report.cash || 0,
              transfer: report.transfer || 0,
              ticket: report.tpa || 0,
              lunch: report.lunchExpense || 0,
              justification: report.notes || ''
          },
          topProducts: report.itemsSummary || [],
          itemsSnapshot: [] 
      };
  };

  if (isDayClosed || viewHistoryReport) {
    const rawReport = viewHistoryReport || salesReports.find(r => {
      const reportDateISO = (r as any).dateISO ? (r as any).dateISO.split('T')[0] : r.date;
      return reportDateISO === reportDate;
    });
    
    const reportData = getReportData(rawReport);
    
    const isConfirmed = reportData.status === ClosureStatus.FECHO_CONFIRMADO;
    const canConfirm = !isConfirmed && (
      (user?.role === UserRole.ADMIN_GERAL || user?.role === UserRole.PROPRIETARIO) ||
      (user?.role === UserRole.GERENTE && reportData.closedBy !== user.name)
    );

    const hoursSinceClosure = (Date.now() - (reportData.timestamp || Date.now())) / (1000 * 60 * 60);
    const isUnilateralAllowed = !isConfirmed && hoursSinceClosure > INACTIVITY_THRESHOLD_HOURS && (user?.role === UserRole.ADMIN_GERAL || user?.role === UserRole.PROPRIETARIO);

    const handleFinalConfirmation = () => {
      if (!canConfirm && !isUnilateralAllowed) return;
      confirmSalesReport(reportData.id, user?.name || 'Admin', isUnilateralAllowed);
      showToast("Fecho confirmado com sucesso!");
      triggerHaptic('success');
    };

    return (
        <div ref={pageTopRef} className="p-4 md:p-8 space-y-8 animate-fade-in pb-32 bg-[#F8FAFC] dark:bg-slate-900 min-h-screen">
            {toast.show && (
              <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-slide-up">
                 <div className="bg-[#003366] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold text-sm"><CheckCircle size={18} className="text-green-400" /> {toast.message}</div>
              </div>
            )}
            <div className="max-w-5xl mx-auto print:max-w-none">
                <div className="flex justify-between items-center mb-8">
                    <button onClick={() => { viewHistoryReport ? setViewHistoryReport(null) : setIsDayClosed(false); }} className="text-slate-500 dark:text-slate-400 font-bold hover:text-[#003366] dark:hover:text-blue-400">← Voltar</button>
                    <button onClick={() => window.print()} className="pill-button px-6 py-3 bg-[#003366] text-white font-bold flex items-center gap-2 shadow-lg hover:opacity-90"><Printer size={20} /> Imprimir / PDF</button>
                </div>
                
                <SoftCard className="p-8 mb-6">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                      <div>
                        <h1 className="text-2xl font-black text-[#003366] dark:text-white uppercase">Relatório de Fecho - {reportData.displayDate}</h1>
                        <p className="text-slate-500 font-medium">Iniciado por {reportData.closedBy} às {reportData.generatedAt}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 ${
                          reportData.status === ClosureStatus.BLOQUEADO ? 'bg-red-100 text-red-700' :
                          isConfirmed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {reportData.status === ClosureStatus.BLOQUEADO ? <Lock size={18} /> :
                           isConfirmed ? <ShieldCheck size={18} /> : <Clock size={18} />}
                          {reportData.status === ClosureStatus.BLOQUEADO ? 'DIA BLOQUEADO (IMUTÁVEL)' :
                           isConfirmed ? 'FECHO CONFIRMADO' : 'AGUARDANDO CONFIRMAÇÃO'}
                        </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="p-6 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-400 uppercase">Total Vendido</p>
                            <p className="text-2xl font-black text-[#003366] dark:text-white">{(reportData.totals?.soldStock || 0).toLocaleString('pt-AO')} Kz</p>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-400 uppercase">Total Levantado</p>
                            <p className="text-2xl font-black text-[#003366] dark:text-white">{(reportData.totals?.lifted || 0).toLocaleString('pt-AO')} Kz</p>
                        </div>
                         <div className={`p-6 rounded-2xl border ${(reportData.totals?.discrepancy || 0) !== 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                            <p className="text-xs font-bold text-slate-400 uppercase">Divergência</p>
                            <p className={`text-2xl font-black ${(reportData.totals?.discrepancy || 0) < 0 ? 'text-red-600' : (reportData.totals?.discrepancy || 0) > 0 ? 'text-green-600' : 'text-slate-600'}`}>
                              {(reportData.totals?.discrepancy || 0).toLocaleString('pt-AO')} Kz
                            </p>
                        </div>
                   </div>

                   {!isConfirmed && (
                     <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800/50">
                        <div className="flex items-start gap-4">
                           <div className="p-3 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-2xl">
                              <ShieldCheck size={24} />
                           </div>
                           <div className="flex-1">
                              <h3 className="font-bold text-[#003366] dark:text-blue-300">Segunda Confirmação Necessária</h3>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                 Este fecho foi registado como <strong>{reportData.status.replace(/_/g, ' ')}</strong>. 
                                 Para que o stock e o financeiro sejam atualizados globalmente, é necessária uma segunda confirmação por um administrador ou gerente diferente.
                              </p>
                              
                              {(canConfirm || isUnilateralAllowed) && (
                                <button 
                                  onClick={handleFinalConfirmation}
                                  className="mt-4 px-6 py-3 bg-[#003366] text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center gap-2"
                                >
                                  <CheckCircle size={20} />
                                  {isUnilateralAllowed ? 'Confirmar Unilateralmente (Admin)' : 'Confirmar Fecho Definitivo'}
                                </button>
                              )}
                              
                              {!canConfirm && !isUnilateralAllowed && (
                                <p className="mt-4 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg border border-amber-100 dark:border-amber-800 inline-block">
                                   Aguardando confirmação de outro responsável.
                                </p>
                              )}
                           </div>
                        </div>
                     </div>
                   )}

                   {isConfirmed && (
                     <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800/50 flex items-center gap-3">
                        <CheckCircle size={20} className="text-green-600" />
                        <p className="text-sm font-bold text-green-700 dark:text-green-400">
                           Fecho confirmado por {reportData.confirmedBy} em {new Date(reportData.confirmationTimestamp).toLocaleString('pt-AO')}
                           {reportData.unilateralAdminConfirmation && ' (Intervenção Administrativa)'}
                        </p>
                     </div>
                   )}
                </SoftCard>

                {/* Detailed Breakdown Section */}
                <SoftCard className="p-0 overflow-hidden">
                   <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="font-bold text-[#003366] dark:text-white">Resumo de Vendas</h3>
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
                                  <td className="p-4 text-right font-bold text-[#003366] dark:text-blue-300">{item.revenue.toLocaleString('pt-AO')} Kz</td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </SoftCard>
            </div>
        </div>
    );
  }

  return (
    <div ref={pageTopRef} className="p-4 md:p-8 space-y-8 animate-fade-in pb-32 relative min-h-screen">
      {syncState.status !== 'idle' && (
        <div className="fixed inset-0 z-[200] bg-[#001A33] flex items-center justify-center p-4 md:p-8 animate-fade-in overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] animate-pulse delay-700" />
          </div>

          <div className="w-full max-w-2xl bg-white/5 backdrop-blur-2xl rounded-[40px] border border-white/10 p-8 md:p-12 shadow-2xl relative z-10 flex flex-col items-center">
            {syncState.status === 'success' ? (
              <div className="text-center animate-fade-slide-up">
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
                  <CheckCircle size={48} className="text-white" />
                </div>
                <h2 className="text-4xl font-black text-white mb-2">Fecho Realizado!</h2>
                <p className="text-blue-200 text-lg font-medium">Sincronização concluída com sucesso.</p>
              </div>
            ) : syncState.status === 'error' ? (
              <div className="text-center animate-fade-slide-up">
                <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/20">
                  <AlertCircle size={48} className="text-white" />
                </div>
                <h2 className="text-4xl font-black text-white mb-2">Erro no Fecho</h2>
                <p className="text-red-200 text-lg font-medium">A sincronização falhou. Tente novamente.</p>
                <button 
                  onClick={() => setSyncState({ status: 'idle', currentStep: -1, completedSteps: [] })}
                  className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all"
                >
                  Voltar
                </button>
              </div>
            ) : (
              <div className="w-full space-y-8">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 rounded-full text-blue-300 text-xs font-black uppercase tracking-widest mb-4 border border-blue-500/30">
                    <RefreshCw size={14} className="animate-spin" /> Sincronização em Curso
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-white">Processando Fecho</h2>
                  <p className="text-blue-300/60 font-medium mt-2">Aguarde enquanto validamos e salvamos os dados do dia.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 'security', label: 'Sincronização Segura', desc: 'Validando integridade de dados', icon: ShieldCheck },
                    { id: 'database', label: 'Dados do Sistema', desc: 'Salvando registros do dia', icon: Database },
                    { id: 'server', label: 'Servidores', desc: 'Atualizando servidores remotos', icon: Server },
                    { id: 'users', label: 'Usuários e Admin', desc: 'Notificando responsáveis', icon: Smartphone },
                    { id: 'finance', label: 'Sistema Financeiro', desc: 'Atualizando fluxos de caixa', icon: CreditCard },
                  ].map((step, idx) => {
                    const isCompleted = syncState.completedSteps.includes(step.id);
                    const isCurrent = syncState.currentStep === idx;
                    const isPending = !isCompleted && !isCurrent;

                    return (
                      <div 
                        key={step.id}
                        className={`flex items-center gap-4 p-4 rounded-3xl transition-all duration-500 border ${
                          isCompleted 
                            ? 'bg-green-500/10 border-green-500/20 opacity-100' 
                            : isCurrent 
                              ? 'bg-blue-500/20 border-blue-500/30 opacity-100 scale-[1.02] shadow-lg shadow-blue-500/10' 
                              : 'bg-white/5 border-transparent opacity-40'
                        }`}
                      >
                        <div className={`p-3 rounded-2xl transition-all duration-500 ${
                          isCompleted 
                            ? 'bg-green-500 text-white' 
                            : isCurrent 
                              ? 'bg-blue-500 text-white animate-pulse' 
                              : 'bg-white/10 text-white/40'
                        }`}>
                          <step.icon size={24} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`font-bold transition-colors ${isPending ? 'text-white/40' : 'text-white'}`}>
                              {step.label}
                            </h4>
                            {isCompleted ? (
                              <span className="text-[10px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1">
                                <Check size={12} /> Concluído
                              </span>
                            ) : isCurrent ? (
                              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest animate-pulse">
                                Processando...
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                                Pendente
                              </span>
                            )}
                          </div>
                          <p className={`text-xs transition-colors ${isPending ? 'text-white/20' : 'text-white/60'}`}>
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Overall Progress Bar */}
                <div className="pt-6">
                  <div className="flex justify-between text-[10px] font-black text-blue-300/40 uppercase tracking-widest mb-2">
                    <span>Progresso Geral</span>
                    <span>{Math.round((syncState.completedSteps.length / 5) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-1000 ease-out"
                      style={{ width: `${(syncState.completedSteps.length / 5) * 100}%` }}
                    />
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
          <h1 className="text-3xl font-bold text-[#003366] dark:text-white">Controle de Vendas</h1>
          <div className="flex items-center gap-3 mt-1 group">
             <Calendar size={18} className="text-[#003366] dark:text-blue-400" />
             <input 
               type="date" 
               value={reportDate} 
               max={todayISO}
               onChange={(e) => setReportDate(e.target.value)} 
               className="bg-transparent text-[#003366] dark:text-blue-400 font-bold outline-none cursor-pointer" 
             />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center md:justify-end w-full md:w-auto gap-4">
          <SyncStatus />
          {isLocked && canReopenDay && (
            <button onClick={handleReopenDay} className="pill-button px-6 py-3 font-bold flex items-center justify-center gap-2 shadow-lg transition-all bg-amber-500 text-white hover:bg-amber-600">
              <Unlock size={20} /> Reabrir Dia
            </button>
          )}
          <button onClick={handleInitialClose} disabled={isReadOnly && !isLocked} className={`pill-button px-6 py-3 font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${isReadOnly && !isLocked ? 'bg-slate-300 cursor-not-allowed text-slate-500' : getCloseButtonColor()}`}>
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
                              <button 
                                onClick={() => toggleRow(item.id)}
                                className={`p-1 rounded-full transition-all ${expandedRows[item.id] ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}
                              >
                                  {expandedRows[item.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                          )}
                          {!item.isBalanced && <AlertTriangle size={16} className="text-red-500 animate-pulse" />}
                      </div>
                  </td>
                  <td className="p-2 bg-blue-50/30 dark:bg-blue-900/10">
                    <input type="number" disabled={!canEditInitialStock || isReadOnly} placeholder="0" value={initialStock[item.id] || ''} onChange={(e) => handleStockChange(setInitialStock, item.id, e.target.value)} className="w-full text-center border rounded-lg py-2 focus:ring-2 focus:ring-blue-500 outline-none font-medium dark:bg-slate-700 dark:text-white" />
                  </td>
                  <td className="p-2 bg-green-50/30 dark:bg-green-900/10">
                       <input type="number" value={purchasedStock[item.id] || 0} readOnly className="w-full text-center bg-white/50 dark:bg-slate-700/50 border border-green-200 dark:border-green-800 rounded-lg py-2 text-green-700 dark:text-green-400 font-bold cursor-default" />
                  </td>
                  <td className="p-2 bg-red-50/30 dark:bg-red-900/10">
                    <input type="number" disabled={isReadOnly} placeholder="0" value={endingStock[item.id] || ''} onChange={(e) => handleStockChange(setEndingStock, item.id, e.target.value)} className="w-full text-center border rounded-lg py-2 outline-none font-medium dark:text-white bg-white dark:bg-slate-700 focus:ring-2 focus:ring-red-500" />
                  </td>
                  <td className="p-2 bg-slate-100/50 dark:bg-slate-700/30">
                    <div className="text-center font-bold py-2 text-slate-700 dark:text-slate-200">{item.soldQty}</div>
                  </td>
                  <td className="p-3 md:p-4 text-right font-bold text-[#003366] dark:text-blue-300">{item.revenue.toLocaleString('pt-AO')}</td>
                </tr>
                {expandedRows[item.id] && item.isPromo && item.soldQty > 0 && (
                    <tr className="bg-slate-50 dark:bg-slate-800/50 animate-fade-in">
                        <td colSpan={6} className="p-4">
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-inner">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2">
                                        <Calculator size={14} /> Detalhe da Venda (Mix & Match)
                                    </h4>
                                    {!item.isBalanced && (
                                        <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                                            <AlertTriangle size={12} /> Soma incorreta ({((item.breakdown?.packs || 0) * item.promoQty + (item.breakdown?.singles || 0) + (item.breakdown?.waste || 0))} vs {item.soldQty})
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                        <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1 block">
                                            Packs de {item.promoQty} ({item.promoPrice} Kz)
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                value={item.breakdown?.packs || 0}
                                                onChange={(e) => handleBreakdownChange(item.id, 'packs', e.target.value, item.breakdown)}
                                                className="w-16 p-1 text-center font-bold rounded border-none outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                                            />
                                            <span className="text-xs font-medium text-slate-500">= {((item.breakdown?.packs || 0) * item.promoPrice).toLocaleString()} Kz</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">
                                            Avulsas ({item.sellPrice} Kz)
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                value={item.breakdown?.singles || 0}
                                                onChange={(e) => handleBreakdownChange(item.id, 'singles', e.target.value, item.breakdown)}
                                                className="w-16 p-1 text-center font-bold rounded border-none outline-none focus:ring-1 focus:ring-slate-500 dark:bg-slate-600 dark:text-white"
                                            />
                                            <span className="text-xs font-medium text-slate-500">= {((item.breakdown?.singles || 0) * item.sellPrice).toLocaleString()} Kz</span>
                                        </div>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-800">
                                        <label className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase mb-1 block">
                                            Quebras (0 Kz)
                                        </label>
                                        <input 
                                            type="number" 
                                            value={item.breakdown?.waste || 0}
                                            onChange={(e) => handleBreakdownChange(item.id, 'waste', e.target.value, item.breakdown)}
                                            className="w-full p-1 text-center font-bold rounded border-none outline-none focus:ring-1 focus:ring-red-500 text-red-600 dark:bg-slate-700 dark:text-red-400"
                                        />
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                )}
                </React.Fragment>
              ))}
              <tr>
                <td colSpan={6} className="p-2">
                  {!showAddProduct ? (
                    <button onClick={() => setShowAddProduct(true)} disabled={isReadOnly} className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-400 font-bold flex items-center justify-center gap-2 hover:border-[#003366] dark:hover:border-blue-400 hover:text-[#003366] dark:hover:text-blue-400"><PlusCircle size={18} /> Adicionar Novo Produto</button>
                  ) : (
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl">
                      <input type="text" placeholder="Nome do Produto" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="flex-1 p-2 rounded-lg border-none dark:bg-slate-700 dark:text-white" autoFocus />
                      <input type="number" placeholder="Preço Venda (Kz)" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="w-32 p-2 rounded-lg border-none dark:bg-slate-700 dark:text-white" />
                      <button onClick={handleAddNewProduct} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold">Salvar</button>
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-[#003366] text-white">
              <tr><td colSpan={5} className="p-4 text-right font-bold uppercase tracking-wider">Total Calculado (Stock):</td><td className="p-4 text-right font-black text-lg">{calculatedData.totalTheoreticalRevenue.toLocaleString('pt-AO')} Kz</td></tr>
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
               <input type="number" value={financials.lunch} disabled={isFinancialsConfirmed || isReadOnly} onChange={(e) => handleFinancialChange('lunch', e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-800 font-bold text-red-600 dark:text-red-400" placeholder="0" />
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
                <p className="text-sm font-bold text-[#003366] dark:text-blue-400 mb-4 uppercase tracking-widest">Valores Levantados (Gaveta)</p>
                <div>
                   <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><Wallet size={14} /> Total em Cash</label>
                   <input type="number" value={financials.cash} disabled={isFinancialsConfirmed || isReadOnly} onChange={(e) => handleFinancialChange('cash', e.target.value)} className="w-full p-4 rounded-2xl soft-ui-inset font-bold text-green-700 bg-white dark:bg-slate-800 outline-none" placeholder="0" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><ArrowRightLeft size={14} /> Transferência</label>
                      <input type="number" value={financials.transfer} disabled={isFinancialsConfirmed || isReadOnly} onChange={(e) => handleFinancialChange('transfer', e.target.value)} className="w-full p-4 rounded-2xl soft-ui-inset font-bold text-blue-700 bg-white dark:bg-slate-800 outline-none" placeholder="0" />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><CreditCard size={14} /> TPA / Ticket</label>
                      <input type="number" value={financials.ticket} disabled={isFinancialsConfirmed || isReadOnly} onChange={(e) => handleFinancialChange('ticket', e.target.value)} className="w-full p-4 rounded-2xl soft-ui-inset font-bold text-purple-700 bg-white dark:bg-slate-800 outline-none" placeholder="0" />
                   </div>
                </div>
                {!isFinancialsConfirmed ? (
                    <button onClick={handleConfirmFinancials} disabled={isReadOnly} className="w-full py-4 bg-[#003366] text-white font-bold rounded-2xl shadow-lg mt-4">Confirmar Levantar Valores</button>
                ) : (
                    <div className="w-full py-4 bg-green-50 dark:bg-green-900/20 border border-green-100 text-green-700 font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer" onClick={handleUnlockFinancials}><Lock size={20} /> Valores Confirmados (Editar)</div>
                )}
            </div>
          </div>
        </SoftCard>

        <div className="space-y-6">
          <SoftCard className="bg-[#003366] text-white">
            <h3 className="font-bold text-white/90 mb-6">Apuramento do Gestor</h3>
            <div className="space-y-4">
              <div className="pb-4 border-b border-white/10 flex justify-between items-center"><span className="text-sm opacity-70">Total Venda (Stock)</span><span className="font-bold">{calculatedData.totalTheoreticalRevenue.toLocaleString('pt-AO')} Kz</span></div>
              <div className="pt-2 flex justify-between items-center"><span className="text-lg opacity-90 font-bold uppercase">Total Levantado</span><span className="font-black text-3xl text-white">{totalLifted.toLocaleString('pt-AO')} Kz</span></div>
            </div>
          </SoftCard>
          {hasDiscrepancy && (
            <div className={`p-6 rounded-3xl text-white ${discrepancy < 0 ? 'bg-red-500' : 'bg-green-500'}`}>
                <h4 className="font-black uppercase mb-1">{discrepancy < 0 ? 'Quebra de Caixa' : 'Sobra de Caixa'}</h4>
                <p className="text-3xl font-black mb-4">{(discrepancy || 0).toLocaleString('pt-AO')} Kz</p>
                <textarea value={financials.discrepancyJustification} disabled={isReadOnly} onChange={(e) => setFinancials({...financials, discrepancyJustification: e.target.value})} className="w-full p-3 bg-white text-slate-800 rounded-xl font-medium outline-none" placeholder="Justifique a divergência..." rows={3} />
            </div>
          )}
        </div>
      </div>

      {showCloseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 w-full max-w-md shadow-2xl relative">
              <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-[#003366] dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} />
                 </div>
                 <h2 className="text-2xl font-black text-[#003366] dark:text-white">Confirmar Fecho</h2>
                 <p className="text-slate-500 dark:text-slate-400 mt-2">Deseja realmente encerrar o dia e atualizar o stock?</p>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 mb-6 space-y-2">
                 <div className="flex justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">Total Vendas:</span><span className="font-bold dark:text-white">{(calculatedData.totalTheoreticalRevenue || 0).toLocaleString('pt-AO')} Kz</span></div>
                 <div className="flex justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">Total Levantado:</span><span className="font-bold dark:text-white">{(totalLifted || 0).toLocaleString('pt-AO')} Kz</span></div>
                 <div className={`flex justify-between text-sm font-bold ${discrepancy < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    <span>Divergência:</span>
                    <span>{discrepancy.toLocaleString('pt-AO')} Kz</span>
                 </div>
              </div>

              <div className="flex gap-4">
                 <button onClick={() => setShowCloseModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold rounded-2xl">Cancelar</button>
                 <button onClick={confirmCloseDay} className="flex-1 py-4 bg-[#003366] text-white font-bold rounded-2xl shadow-lg">Confirmar</button>
              </div>
           </div>
        </div>
      )}

      {/* Rodapé Atualizado */}
      <footer className="mt-16 py-10 px-6 bg-white rounded-2xl text-center flex flex-col gap-4 font-sans border border-slate-100">
          <p className="text-sm font-bold tracking-[-0.01em] text-[#003366]">
              Marguel Sistema de Gestão Interna
          </p>
          <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Desenvolvido por</span>
              <div className="text-xs tracking-[0.5px]">
                  <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>DC - Comercial</span>
                  <span className="text-[#6B7280] font-normal mx-1">&</span>
                  <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>Marguel CGPS (SU) Lda</span>
              </div>
          </div>
      </footer>
    </div>
  );
};

export default Sales;
