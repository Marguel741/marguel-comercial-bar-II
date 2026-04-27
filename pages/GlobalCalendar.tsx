
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, DollarSign, ArrowUpRight, TrendingUp, 
  Lock, Unlock, FileText, ShoppingBag, Package, Wallet, CheckCircle, AlertTriangle, AlertCircle, Eye, X, Info, Clock,
  Loader2, Wifi, WifiOff, Printer, BarChart2
} from 'lucide-react';
import { useProducts } from '../contexts/ProductContext';
import { useLayout } from '../contexts/LayoutContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { UserRole, ClosureStatus } from '../types';
import SoftCard from '../components/SoftCard';
import { formatKz, roundKz, cleanDate, formatDateISO } from '../src/utils';
import { hasPermission } from '../src/utils/permissions';
import AccessDenied from './AccessDenied';

const GlobalCalendar: React.FC = () => {
  const { 
    products,
    salesReports, 
    getConfirmedSalesReports,
    purchases, 
    expenses, 
    inventoryHistory, 
    transactions,
    isDayLocked,
    lockDay,
    unlockDay,
    priceHistory,
    addAuditLog,
    systemDate,
    getSystemDate,
    // Novos estados do context para sincronização
    isSyncing,
    hasPendingChanges,
    syncData,
    lockedDays
  } = useProducts();
  
  const { triggerHaptic } = useLayout();
  const { user } = useAuth();
  const { isOnline } = useSettings();
  
  // Log page access
  useEffect(() => {
    addAuditLog({
      action: 'ACESSO_PAGINA',
      entity: 'Page',
      entityId: 'GlobalCalendar',
      details: `Usuário ${user?.name} acessou o Calendário Marguel.`,
      performedBy: user?.name || 'Sistema'
    });
  }, [user, addAuditLog]);

  if (!hasPermission(user, 'calendar_view')) {
    return <AccessDenied />;
  }

  const [viewDate, setViewDate] = useState(systemDate);

  useEffect(() => {
    setViewDate(systemDate);
  }, [systemDate]);

  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'inventory' | 'finance' | 'purchases'>('overview');
  
  // Estados para o Modal de Impressão
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printPeriod, setPrintPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('day');
  const [printDate, setPrintDate] = useState(formatDateISO(systemDate));

  useEffect(() => {
      if (isOnline && hasPendingChanges) {
          syncData();
      }
  }, [isOnline, hasPendingChanges, syncData]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const monthName = viewDate.toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' });

  const canLock = hasPermission(user, 'calendar_lock');
  const canUnlock = hasPermission(user, 'calendar_unlock');
  const canManageLocks = canLock || canUnlock;

  const handleNav = (direction: number) => {
    triggerHaptic('selection');
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + direction);
    
    // Ano inicial do sistema deve ser 2025
    if (newDate.getFullYear() < 2025) {
      return;
    }
    
    setViewDate(newDate);
    setSelectedDayDetail(null);
  };

  const salesMap = useMemo(() => new Map(getConfirmedSalesReports().map(r => {
    const dateKey = (r as any).dateISO ? (r as any).dateISO.split('T')[0] : r.date;
    return [cleanDate(dateKey), r];
  })), [getConfirmedSalesReports]);
  const inventoryMap = useMemo(() => {
    const map = new Map<string, any[]>();
    inventoryHistory.forEach(h => {
      const key = cleanDate(h.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(h);
    });
    // Ordena para que a ação mais recente do dia apareça no topo
    map.forEach(logs => logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    return map;
  }, [inventoryHistory]);
  
  const monthStats = useMemo(() => {
    let total = 0;
    let count = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = formatDateISO(new Date(viewDate.getFullYear(), viewDate.getMonth(), i));
      const r = salesMap.get(cleanDate(dateStr));
      if (r && r.status === ClosureStatus.FECHO_CONFIRMADO) {
        total = roundKz(total + (r.totalLifted || (r as any).totals?.lifted || 0));
        count++;
      }
    }
    return { total, count };
  }, [viewDate, salesMap, daysInMonth, lockedDays]);

  const calendarDays = useMemo(() => {
    return Array.from({ length: daysInMonth }).map((_, i) => {
      const day = i + 1;
      const dateStr = formatDateISO(new Date(year, month, day));
      const report = salesMap.get(cleanDate(dateStr));
      const isLocked = isDayLocked(dateStr);
      const isToday = formatDateISO(getSystemDate()) === dateStr;
      
      return {
        day,
        dateStr,
        report,
        isLocked,
        isToday
      };
    });
  }, [
    year,
    month,
    daysInMonth,
    salesMap,
    lockedDays,
    isDayLocked
  ]);

  const dayData = useMemo(() => {
    if (!selectedDayDetail) return null;

    const cleanSelected = cleanDate(selectedDayDetail);
    const report = salesMap.get(cleanSelected);
    const dayPurchases = purchases.filter(p => cleanDate(p.date) === cleanSelected);
    const dayExpenses = expenses.filter(e => cleanDate(e.date) === cleanSelected);
    const dayInventoryLog = inventoryMap.get(cleanSelected);
    const dayTrans = transactions.filter(t => cleanDate(t.date) === cleanSelected);
    
    const dayPriceChanges = priceHistory?.filter(l => {
        const logDate = formatDateISO(new Date(parseInt(l.id)));
        return cleanDate(logDate) === cleanSelected;
    }) || [];

    const isConfirmed = report?.status === ClosureStatus.FECHO_CONFIRMADO;
    const totalPurchased = roundKz(dayPurchases.reduce((acc, p) => acc + p.total, 0));
    const totalExpenses = roundKz(dayExpenses.reduce((acc, e) => acc + e.amount, 0));
    const netBalance = roundKz((isConfirmed ? (report?.totalLifted || 0) : 0) - totalPurchased - totalExpenses);

    return {
      report,
      isConfirmed,
      purchases: dayPurchases,
      expenses: dayExpenses,
      inventory: dayInventoryLog,
      transactions: dayTrans,
      priceChanges: dayPriceChanges,
      totalPurchased,
      totalExpenses,
      netBalance,
      isLocked: isDayLocked(selectedDayDetail)
    };
  }, [selectedDayDetail, salesMap, inventoryMap, purchases, expenses, transactions, priceHistory, isDayLocked, lockedDays, salesReports]);

  const handlePrint = () => {
    const periodLabel = printPeriod === 'day' ? 'Diario'
      : printPeriod === 'week' ? 'Semanal'
      : printPeriod === 'month' ? 'Mensal'
      : printPeriod === 'quarter' ? 'Trimestral'
      : 'Anual';

    const refDate = new Date(printDate + 'T12:00:00');
    let periodStr = printDate;
    if (printPeriod === 'week') {
      const dow = refDate.getDay();
      const mon = new Date(refDate); mon.setDate(refDate.getDate() - (dow === 0 ? 6 : dow - 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      periodStr = `${mon.toLocaleDateString('pt-AO')}_${sun.toLocaleDateString('pt-AO')}`;
    } else if (printPeriod === 'month') {
      periodStr = refDate.toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' });
    } else if (printPeriod === 'quarter') {
      const q = Math.floor(refDate.getMonth() / 3) + 1;
      periodStr = `${q}T_${refDate.getFullYear()}`;
    } else if (printPeriod === 'year') {
      periodStr = refDate.getFullYear().toString();
    }

    const filename = `Marguel - Relatorio de Gestao (${periodLabel}) (${periodStr}).pdf`;
    const reportHTML = buildReportHTML(filename);

    const win = window.open('', '_blank');
    if (!win) {
      alert('Activa as popups para este site para gerar o PDF.');
      return;
    }
    win.document.write(reportHTML);
    win.document.close();
    setIsPrintModalOpen(false);
  };

  const buildReportHTML = (pdfFilename: string = 'Marguel-Relatorio.pdf') => {
    // Determinar o intervalo de datas
    const refDate = new Date(printDate + 'T12:00:00');
    let startDate = new Date(refDate);
    let endDate = new Date(refDate);

    if (printPeriod === 'week') {
      const day = refDate.getDay();
      startDate.setDate(refDate.getDate() - day);
      endDate.setDate(startDate.getDate() + 6);
    } else if (printPeriod === 'month') {
      startDate = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
    } else if (printPeriod === 'quarter') {
      const quarter = Math.floor(refDate.getMonth() / 3);
      startDate = new Date(refDate.getFullYear(), quarter * 3, 1);
      endDate = new Date(refDate.getFullYear(), (quarter + 1) * 3, 0);
    } else if (printPeriod === 'year') {
      startDate = new Date(refDate.getFullYear(), 0, 1);
      endDate = new Date(refDate.getFullYear(), 11, 31);
    }

    const startStr = formatDateISO(startDate);
    const endStr = formatDateISO(endDate);

    // Filtrar dados
    const periodReports = getConfirmedSalesReports().filter(r => {
      const d = (r as any).dateISO ? (r as any).dateISO.split('T')[0] : r.date;
      return d >= startStr && d <= endStr;
    });

    const periodPurchases = purchases.filter(p => {
      const d = cleanDate(p.date);
      return d >= startStr && d <= endStr;
    });

    const periodExpenses = expenses.filter(e => {
      const d = cleanDate(e.date);
      return d >= startStr && d <= endStr;
    });

    // Totais
    const totalSales = periodReports.reduce((acc, r) => acc + (r.totalLifted || (r as any).totals?.lifted || 0), 0);
    const totalExpected = periodReports.reduce((acc, r) => acc + ((r as any).totals?.expected || (r as any).totals?.soldStock || r.totalExpected || 0), 0);
    const totalPurchases = periodPurchases.reduce((acc, p) => acc + p.total, 0);
    const totalExpenses = periodExpenses.reduce((acc, e) => acc + e.amount, 0);
    const totalProfit = periodReports.reduce((acc, r) => acc + ((r as any).profit || (r as any).totals?.profit || 0), 0);

    // Agrupar produtos vendidos
    const productSummary: Record<string, { qty: number, revenue: number }> = {};
    periodReports.forEach(r => {
      const items = r.itemsSummary || (r as any).itemsSnapshot || [];
      items.forEach((item: any) => {
        if (!productSummary[item.name]) {
          productSummary[item.name] = { qty: 0, revenue: 0 };
        }
        productSummary[item.name].qty += (item.qty ?? item.soldQty ?? 0);
        productSummary[item.name].revenue += (item.revenue ?? item.total ?? 0);
      });
    });

    const sortedProducts = Object.entries(productSummary)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    return `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Relatorio Marguel - ${printPeriod.toUpperCase()}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
          body { font-family: Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; margin: 0; }
          #loading { position: fixed; inset: 0; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 9999; font-family: Arial, sans-serif; }
          #loading p { color: #003366; font-weight: 900; font-size: 16px; margin-top: 16px; letter-spacing: 2px; text-transform: uppercase; }
          .spinner { width: 48px; height: 48px; border: 5px solid #e2e8f0; border-top-color: #003366; border-radius: 50%; animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #003366; padding-bottom: 20px; }
          .header h1 { color: #003366; margin: 0; text-transform: uppercase; letter-spacing: 2px; font-size: 20px; }
          .header p { margin: 5px 0; color: #64748b; font-weight: bold; font-size: 13px; }
          .summary-grid { display: grid; grid-template-cols: repeat(2, 1fr); gap: 20px; margin-bottom: 40px; }
          .card { padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; background: #f8fafc; }
          .card h3 { margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: #64748b; }
          .card p { margin: 0; font-size: 22px; font-weight: 900; color: #003366; }
          .card-dark { background: #003366; border-color: #003366; grid-column: span 2; }
          .card-dark h3 { color: #94a3b8; }
          .card-dark p { color: #ffffff; font-size: 28px; }
          .section { margin-bottom: 40px; }
          .section h2 { font-size: 15px; text-transform: uppercase; border-left: 4px solid #003366; padding-left: 15px; margin-bottom: 20px; color: #003366; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #64748b; }
          td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
          .text-right { text-align: right; }
          .footer { text-align: center; margin-top: 60px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        </style>
      </head>
      <body>
      <div id="report-content">
        <div class="header">
          <h1>Marguel Sistema De Gestão Interna</h1>
          <p>Relatório de Gestão - ${printPeriod === 'day' ? 'Diário' : printPeriod === 'week' ? 'Semanal' : printPeriod === 'month' ? 'Mensal' : printPeriod === 'quarter' ? 'Trimestral' : 'Anual'}</p>
          <p>Período: ${startStr} até ${endStr}</p>
        </div>

        <div class="summary-grid">
          <div class="card">
            <h3>Total Faturado (Bruto)</h3>
            <p>${formatKz(totalExpected)}</p>
          </div>
          <div class="card">
            <h3>Total Levantado (Líquido)</h3>
            <p>${formatKz(totalSales)}</p>
          </div>
          <div class="card">
            <h3>Total de Compras</h3>
            <p>${formatKz(totalPurchases)}</p>
          </div>
          <div class="card">
            <h3>Total de Despesas</h3>
            <p>${formatKz(totalExpenses)}</p>
          </div>
          <div class="card card-dark">
            <h3>Lucro Estimado do Período</h3>
            <p>${formatKz(totalProfit)}</p>
          </div>
        </div>

        <div class="section">
          <h2>Resumo de Vendas por Produto</h2>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th class="text-right">Quantidade</th>
                <th class="text-right">Total Faturado</th>
              </tr>
            </thead>
            <tbody>
              ${sortedProducts.map(p => `
                <tr>
                  <td>${p.name}</td>
                  <td class="text-right">${p.qty}</td>
                  <td class="text-right">${formatKz(p.revenue)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Gerado em ${new Date().toLocaleString('pt-AO')} por ${user?.name || 'Sistema'}</p>
          <p>Marguel Sistema de Gestao Interna &copy; 2026</p>
        </div>
      </div><!-- fim #report-content -->

      <!-- Overlay de loading -->
      <div id="loading">
        <div class="spinner"></div>
        <p>A gerar PDF...</p>
      </div>

      <script>
        window.addEventListener('load', function() {
          var element = document.getElementById('report-content');
          var opt = {
            margin: [10, 10, 10, 10],
            filename: '${pdfFilename}',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          html2pdf().set(opt).from(element).save().then(function() {
            document.getElementById('loading').style.display = 'none';
            window.close();
          });
        });
      </script>
      </body>
      </html>
    `;
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-24 relative">
       
       <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="ml-20">
             <h1 className="text-3xl font-bold text-[#003366] dark:text-white">
                Calendário Marguel
             </h1>
             <p className="text-slate-500 dark:text-slate-400">Relatório Geral de Gestão</p>
          </div>
          
          <div className="flex items-center gap-4">
              {/* Offline/Online Indicator - Padronizado com Atendimento Directo */}
              <button 
                  onClick={() => isOnline && syncData()}
                  disabled={!isOnline || isSyncing}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      !isOnline 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 cursor-not-allowed'
                          : isSyncing
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 opacity-50 cursor-wait'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 cursor-pointer'
                  }`}>
                  {isSyncing ? (
                      <Loader2 size={14} className="animate-spin" />
                  ) : isOnline ? (
                      <Wifi size={14} />
                  ) : (
                      <WifiOff size={14} />
                  )}
                  <span className="hidden md:inline">
                      {isSyncing ? 'Sincronizando...' : isOnline ? 'Online (Sincronizar)' : 'Offline'}
                  </span>
              </button>

              <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                 <button 
                    onClick={() => {
                        triggerHaptic('selection');
                        setIsPrintModalOpen(true);
                    }}
                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full text-blue-600 transition-colors"
                    title="Gerar Relatório PDF/Impressão"
                 >
                    <Printer size={20} />
                 </button>
                 <div className="w-px h-6 bg-slate-100 dark:bg-slate-700 mx-1"></div>
                 <button onClick={() => handleNav(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"><ChevronLeft size={24}/></button>
                 <span className="font-bold text-lg text-[#003366] dark:text-white w-48 text-center capitalize">{monthName}</span>
                 <button onClick={() => handleNav(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"><ChevronRight size={24}/></button>
              </div>
          </div>
       </header>

       <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Calendar Grid & Monthly Summary (Mesmo do original) */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-xl border border-slate-100 dark:border-slate-700">
             <div className="grid grid-cols-7 mb-4">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                   <div key={d} className="text-center font-bold text-slate-400 uppercase text-[10px] tracking-widest">{d}</div>
                ))}
             </div>
             
             <div className="grid grid-cols-7 gap-2 md:gap-3">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                   <div key={`empty-${i}`} className="aspect-square"></div>
                ))}

                {calendarDays.map(({ day, dateStr, report, isLocked, isToday }) => {
                   return (
                      <button 
                        key={day} 
                        onClick={() => {
                            triggerHaptic('selection');
                            setSelectedDayDetail(dateStr);
                            setActiveTab('overview');
                        }}
                        className={`
                           aspect-square rounded-2xl p-2 flex flex-col justify-between relative border transition-all text-left
                           ${report 
                              ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800' 
                              : 'bg-slate-50 dark:bg-slate-700/20 border-transparent'}
                           ${selectedDayDetail === dateStr ? 'ring-2 ring-blue-500 border-blue-500 shadow-lg scale-95' : 'hover:scale-[1.02]'}
                           ${isToday ? 'bg-amber-50/50 border-amber-200 dark:border-amber-900/50' : ''}
                        `}
                      >
                         <div className="flex justify-between items-start w-full">
                            <span className={`text-sm font-bold ${report ? 'text-[#003366] dark:text-blue-300' : 'text-slate-400'}`}>
                                {day}
                            </span>
                            {isLocked ? (
                                <Lock size={10} className="text-red-500" />
                            ) : report ? (
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                            ) : null}
                         </div>
                         
                         {report && (
                            <div className="overflow-hidden">
                               {report.status === ClosureStatus.FECHO_CONFIRMADO ? (
                                  <p className="text-[9px] font-black text-[#003366] dark:text-blue-400 truncate">
                                     {roundKz((report.totalLifted || 0) / 1000)}k
                                  </p>
                               ) : (
                                  <p className="text-[7px] font-bold text-amber-600 dark:text-amber-400 leading-tight">
                                     Fecho Parcial Registado
                                  </p>
                               )}
                            </div>
                         )}
                      </button>
                   );
                })}
             </div>
          </div>

          <div className="space-y-4">
             <SoftCard className="bg-[#003366] text-white border-none shadow-blue-900/20">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-blue-200 text-[10px] uppercase tracking-wider">Faturado no Mês</h3>
                    <TrendingUp size={16} className="text-blue-300" />
                </div>
                <p className="text-3xl font-black">{formatKz(monthStats.total)}</p>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-end">
                   <div>
                       <p className="text-[10px] opacity-60 uppercase">Dias com Venda</p>
                       <p className="font-bold text-xl">{monthStats.count}</p>
                   </div>
                   <div className="text-right">
                       <p className="text-[10px] opacity-60 uppercase">Média Diária</p>
                       <p className="font-bold text-sm">
                          {formatKz(monthStats.count > 0 ? roundKz(monthStats.total / monthStats.count) : 0)}
                       </p>
                   </div>
                </div>
             </SoftCard>

             <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
                <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                    Clique num dia para auditar o fecho de caixa, inventário de equipamentos e fluxo financeiro detalhado.
                </p>
             </div>
          </div>
       </div>

       {/* MODAL DE IMPRESSÃO / RELATÓRIO */}
       {isPrintModalOpen && (
           <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsPrintModalOpen(false)}>
               <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-white/20" onClick={e => e.stopPropagation()}>
                   <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                       <div className="flex items-center gap-3">
                           <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                               <Printer size={24} />
                           </div>
                           <div>
                               <h3 className="text-xl font-black text-[#003366] dark:text-white uppercase">Relatórios</h3>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gerar PDF para Impressão</p>
                           </div>
                       </div>
                       <button onClick={() => setIsPrintModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                           <X size={20} className="text-slate-400" />
                       </button>
                   </div>

                   <div className="p-8 space-y-6">
                       <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Período do Relatório</label>
                           <div className="grid grid-cols-3 gap-2">
                               {[
                                   { id: 'day', label: 'Dia' },
                                   { id: 'week', label: 'Semana' },
                                   { id: 'month', label: 'Mês' },
                                   { id: 'quarter', label: 'Trimestre' },
                                   { id: 'year', label: 'Ano' }
                               ].map(p => (
                                   <button
                                       key={p.id}
                                       onClick={() => setPrintPeriod(p.id as any)}
                                       className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all border ${
                                           printPeriod === p.id 
                                           ? 'bg-[#003366] text-white border-[#003366] shadow-lg shadow-blue-900/20' 
                                           : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent hover:border-slate-200'
                                       }`}
                                   >
                                       {p.label}
                                   </button>
                               ))}
                           </div>
                       </div>

                       <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Referência</label>
                           <input 
                               type="date" 
                               value={printDate}
                               onChange={(e) => setPrintDate(e.target.value)}
                               className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-white transition-all"
                           />
                       </div>

                       <div className="pt-4">
                           <button 
                               onClick={() => {
                                   triggerHaptic('success');
                                   handlePrint();
                               }}
                               className="w-full py-5 bg-[#003366] text-white rounded-[24px] font-black uppercase tracking-[2px] shadow-xl shadow-blue-900/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3"
                           >
                               <FileText size={20} />
                               Gerar Relatório
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {/* MODAL DETALHADO (Mantido conforme original) */}
       {selectedDayDetail && dayData && (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedDayDetail(null)}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-white/20" onClick={e => e.stopPropagation()}>
               
               {/* HEADER: Auditoria de Status */}
               <div className="p-6 md:p-8 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-4">
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${isDayLocked(selectedDayDetail) ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {isDayLocked(selectedDayDetail) ? <Lock size={28} /> : <Unlock size={28} />}
                     </div>
                     <div>
                        <h2 className="text-2xl font-black text-[#003366] dark:text-white">{selectedDayDetail}</h2>
                        <div className="mt-1">
                            {isDayLocked(selectedDayDetail) && (
                              <div className="flex flex-col gap-1">
                                <span className="text-red-500 font-bold">Dia Bloqueado</span>
                              </div>
                            )}
                            {!isDayLocked(selectedDayDetail) && (
                              <div className="flex gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-green-500 text-white">
                                    DIA ABERTO PARA EDIÇÃO
                                </span>
                                {dayData.report && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-blue-100 text-blue-700">
                                    Caixa Fechado
                                  </span>
                                )}
                              </div>
                            )}
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     {canManageLocks && (
                        <button 
                           onClick={(e) => {
                              e.preventDefault();
                              if (!selectedDayDetail) return;
                              
                              const dateToOperate = selectedDayDetail;
                              const locked = isDayLocked(dateToOperate);

                              if (locked) {
                                 if (!canUnlock) {
                                    alert("Sem permissão para desbloquear dias.");
                                    return;
                                 }
                                 unlockDay(dateToOperate, "Desbloqueio manual");
                              } else {
                                 if (!canLock) {
                                    alert("Sem permissão para bloquear dias.");
                                    return;
                                 }
                                 lockDay(dateToOperate, user?.name || "Admin");
                              }
                           }}
                           className={`h-12 px-6 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${
                              isDayLocked(selectedDayDetail) 
                              ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/20' 
                              : 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                           }`}
                        >
                           {isDayLocked(selectedDayDetail) ? <><Unlock size={18} /> Desbloquear dia</> : <><Lock size={18} /> Bloquear dia</>}
                        </button>
                     )}
                     <button onClick={() => setSelectedDayDetail(null)} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X size={24} className="text-slate-400" />
                     </button>
                  </div>
               </div>

               {/* TAB NAVIGATION: Visual Moderno */}
               <div className="flex px-8 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
                  {[
                     { id: 'overview', label: 'Resumo', icon: FileText },
                     { id: 'sales', label: 'Vendas', icon: DollarSign },
                     { id: 'inventory', label: 'Trabalho Operacional', icon: Package },
                     { id: 'finance', label: 'Financeiro', icon: Wallet },
                     { id: 'purchases', label: 'Compras', icon: ShoppingBag },
                  ].map(tab => (
                     <button
                        key={tab.id}
                        onClick={() => { triggerHaptic('selection'); setActiveTab(tab.id as any); }}
                        className={`py-5 px-4 font-bold text-xs uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all shrink-0 ${activeTab === tab.id ? 'border-[#003366] text-[#003366] dark:border-blue-500 dark:text-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                     >
                        <tab.icon size={14} /> {tab.label}
                     </button>
                  ))}
               </div>

               {/* CONTENT AREA: Focada em Leitura de Dados */}
               <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-white dark:bg-slate-900">
                  
                  {activeTab === 'overview' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-slide-up">
                        <div className="space-y-6">
                            <h3 className="font-black text-[#003366] dark:text-white text-lg flex items-center gap-2">
                                <TrendingUp size={20} className="text-blue-500" /> Balanço do Dia
                            </h3>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Venda Bruta (Total Vendido)</span>
                                    <span className={`font-bold ${dayData.isConfirmed ? 'text-[#003366] dark:text-white' : 'text-amber-600 italic'}`}>
                                        {dayData.isConfirmed 
                                          ? formatKz(
                                              (dayData.report as any)?.totals?.expected ||
                                              (dayData.report as any)?.totals?.soldStock ||
                                              dayData.report?.totalExpected ||
                                              0
                                            ) 
                                          : 'Aguardando Confirmação'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Compras (Saída Stock)</span>
                                    <span className="font-bold text-blue-600">-{formatKz(dayData.totalPurchased)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Despesas Fixas/Variáveis</span>
                                    <span className="font-bold text-red-500">-{formatKz(dayData.totalExpenses)}</span>
                                </div>
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                    <span className="text-slate-900 dark:text-white font-black uppercase text-xs">Total Levantado</span>
                                    <span className={`text-xl font-black ${dayData.isConfirmed ? 'text-[#003366] dark:text-white' : 'text-slate-400 italic'}`}>
                                        {dayData.isConfirmed 
                                          ? formatKz(
                                              dayData.report?.totalLifted ||
                                              (dayData.report as any)?.totals?.lifted ||
                                              0
                                            ) 
                                          : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-900 dark:text-white font-black uppercase text-xs">Margem de Lucro</span>
                                    <span className={`text-2xl font-black ${dayData.isConfirmed ? ((dayData.report as any)?.profit || (dayData.report as any)?.totals?.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600' : 'text-slate-400 italic'}`}>
                                        {dayData.isConfirmed ? formatKz((dayData.report as any)?.profit || (dayData.report as any)?.totals?.profit || 0) : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            {/* 1️⃣ Trabalho Operacional */}
                            <div className="space-y-4">
                                <h3 className="font-black text-[#003366] dark:text-white text-lg flex items-center gap-2">
                                    <Package size={20} className="text-blue-500" /> Trabalho Operacional
                                </h3>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700">
                                    {dayData.inventory ? (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500 font-medium">Contagem de Equipamentos</span>
                                                <span className="font-bold text-green-600">Sim</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500 font-medium">Responsável</span>
                                                <span className="font-bold text-[#003366] dark:text-white">{dayData.inventory.performedBy}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500 font-medium">Hora</span>
                                                <span className="font-bold text-[#003366] dark:text-white">
                                                    {(() => {
                                                      const ts = (dayData.inventory as any).timestamp || parseInt(dayData.inventory.id);
                                                      const d = new Date(ts);
                                                      return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500 font-medium">Contagem de Equipamentos</span>
                                            <span className="font-bold text-red-500">Não</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                           <h3 className="font-black text-[#003366] dark:text-white text-lg flex items-center gap-2">
                               <AlertCircle size={20} className="text-amber-500" /> Alertas de Auditoria
                           </h3>
                           <div className="space-y-3">
                              {(() => {
                                const discVal = 
                                  (dayData.report as any)?.totals?.discrepancy ??
                                  dayData.report?.discrepancy ??
                                  0;
                                if (discVal === 0) return null;
                                const isShortage = discVal < 0;
                                return (
                                  <div className={`p-4 rounded-2xl border flex items-center gap-3 ${isShortage ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30 text-red-800 dark:text-red-300' : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/30 text-green-800 dark:text-green-300'}`}>
                                    <AlertTriangle size={20} className="shrink-0" />
                                    <div>
                                      <p className="text-xs font-black uppercase">
                                        {isShortage ? 'Quebra de Caixa' : 'Sobra de Caixa'}
                                      </p>
                                      <p className="text-sm font-bold">
                                        Divergência de {formatKz(Math.abs(discVal))} detectada no fecho.
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}
                              {dayData.inventory?.status === 'DIVERGENTE' && (
                                 <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-2xl border border-red-100 dark:border-red-800/30 flex items-center gap-3">
                                    <Package size={20} className="shrink-0" />
                                    <div>
                                        <p className="text-xs font-black uppercase">Falta de Material</p>
                                        <p className="text-sm font-bold">Divergência em {dayData.inventory.discrepancies.length} itens de equipamento.</p>
                                    </div>
                                 </div>
                              )}
                              {!dayData.report && (
                                  <div className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl border border-dashed border-slate-300 flex items-center gap-3">
                                      <Clock size={20} />
                                      <p className="text-xs font-bold uppercase italic">Aguardando Fecho de Caixa Final</p>
                                  </div>
                              )}
                           </div>

                           {/* 2️⃣ Compras do Dia */}
                           <div className="space-y-4">
                                <h3 className="font-black text-[#003366] dark:text-white text-lg flex items-center gap-2">
                                    <ShoppingBag size={20} className="text-blue-500" /> Compras do Dia
                                </h3>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700">
                                    {dayData.purchases.length > 0 ? (
                                        <div className="space-y-4">
                                            {dayData.purchases.map(p => (
                                                <div key={p.id} className="text-xs border-b border-slate-200 dark:border-slate-700 pb-2 last:border-0 last:pb-0">
                                                    <div className="flex justify-between font-bold text-[#003366] dark:text-white mb-1">
                                                        <span>{p.name || 'Compra de Stock'}</span>
                                                        <span>{formatKz(p.total)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-slate-500">
                                                        <span>Resp: {p.completedBy}</span>
                                                        <span>{new Date(p.timestamp).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">Nenhuma compra registrada.</p>
                                    )}
                                </div>
                           </div>

                           {/* 3️⃣ Financeiro (Despesas) */}
                           <div className="space-y-4">
                                <h3 className="font-black text-[#003366] dark:text-white text-lg flex items-center gap-2">
                                    <Wallet size={20} className="text-blue-500" /> Financeiro (Despesas)
                                </h3>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700">
                                    {dayData.expenses.length > 0 ? (
                                        <div className="space-y-4">
                                            {dayData.expenses.map(ex => (
                                                <div key={ex.id} className="text-xs border-b border-slate-200 dark:border-slate-700 pb-2 last:border-0 last:pb-0">
                                                    <div className="flex justify-between font-bold text-slate-800 dark:text-white mb-1">
                                                        <span>{ex.title}</span>
                                                        <span className="text-red-500">-{formatKz(ex.amount)}</span>
                                                    </div>
                                                    {ex.notes && <p className="text-[10px] text-slate-400 italic mb-1">"{ex.notes}"</p>}
                                                    <div className="flex justify-between text-slate-500">
                                                        <span>Resp: {ex.user}</span>
                                                        <span>{new Date(ex.timestamp).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">Nenhuma despesa registrada.</p>
                                    )}
                                </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* TAB: SALES (Com Limpeza de Moeda) */}
                  {activeTab === 'sales' && (
                     <div className="space-y-8 animate-slide-up">
                        {dayData.report ? (
                           <>
                              {/* Total Vendido aparece primeiro */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                 <div className="bg-[#003366] text-white p-5 rounded-3xl col-span-1 sm:col-span-1">
                                   <p className="text-[10px] font-black uppercase opacity-60 mb-1">Total Vendido (Stock)</p>
                                   <p className="text-xl font-black">
                                     {formatKz(
                                       (dayData.report as any)?.totals?.expected ||
                                       (dayData.report as any)?.totals?.soldStock ||
                                       dayData.report?.totalExpected ||
                                       0
                                     )}
                                   </p>
                                 </div>
                                 <div className="bg-green-50 dark:bg-green-900/10 p-5 rounded-3xl">
                                   <p className="text-[10px] font-black uppercase opacity-60 mb-1 text-green-700">Total Levantado</p>
                                   <p className="text-xl font-black text-green-700">
                                     {formatKz(dayData.report?.totalLifted || (dayData.report as any)?.totals?.lifted || 0)}
                                   </p>
                                 </div>
                                 <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-3xl">
                                   <p className="text-[10px] font-black uppercase opacity-60 mb-1 text-red-600">Almoço (Despesa Op.)</p>
                                   <p className="text-xl font-black text-red-600">
                                     {formatKz(
                                       dayData.report?.lunchExpense ||
                                       (dayData.report as any)?.financials?.lunch ||
                                       0
                                     )}
                                   </p>
                                 </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 {[
                                     { label: 'Dinheiro (Cash)', value: dayData.report.cash, color: 'text-green-600', bg: 'bg-green-50' },
                                     { label: 'Multicaixa (TPA)', value: (dayData.report.tpa || 0) + (dayData.report.transfer || 0), color: 'text-blue-600', bg: 'bg-blue-50' }
                                 ].map(m => (
                                    <div key={m.label} className={`${m.bg} dark:bg-opacity-10 p-5 rounded-3xl border border-white/50 shadow-sm`}>
                                        <p className="text-[10px] font-black uppercase opacity-60 mb-1">{m.label}</p>
                                        <p className={`text-xl font-black ${m.color}`}>{formatKz(m.value)}</p>
                                    </div>
                                 ))}
                              </div>

                              <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                                 <div className="p-6 border-b border-slate-50 dark:border-slate-700">
                                    <h4 className="font-black text-[#003366] dark:text-white uppercase text-xs tracking-widest">Resumo de Produtos</h4>
                                 </div>
                                 <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                       <tr className="text-[10px] uppercase text-slate-400 font-black">
                                          <th className="px-6 py-4">Produto</th>
                                          <th className="px-6 py-4 text-center">Quant.</th>
                                          <th className="px-6 py-4 text-right">Subtotal</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                       {(dayData.report.itemsSummary || (dayData.report as any).itemsSnapshot || []).map((item: any, idx: number) => (
                                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800 transition-colors">
                                             <td className="px-6 py-4 font-bold text-sm text-slate-700 dark:text-slate-300">{item.name}</td>
                                             <td className="px-6 py-4 text-center font-black text-blue-600">{item.qty ?? item.soldQty ?? 0}</td>
                                             <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                                               {formatKz(item.revenue ?? item.total ?? 0)}
                                             </td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>
                           </>
                        ) : (
                           <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-50">
                              <DollarSign size={64} className="mb-4" />
                              <p className="font-bold">Dados de venda não disponíveis para esta data.</p>
                           </div>
                        )}
                     </div>
                  )}

                  {activeTab === 'finance' && (
                      <div className="space-y-6 animate-slide-up">
                          <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-100 dark:border-slate-700">
                              <h3 className="font-black text-[#003366] dark:text-white mb-6 uppercase text-xs tracking-widest">Saídas de Caixa (Despesas)</h3>
                              {dayData.expenses.length > 0 ? (
                                  <div className="space-y-4">
                                      {dayData.expenses.map(ex => (
                                          <div key={ex.id} className="p-5 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-50 dark:border-red-900/20">
                                              <div className="flex justify-between items-start mb-2">
                                                  <div>
                                                      <p className="font-bold text-slate-800 dark:text-white text-base">{ex.title}</p>
                                                      <p className="text-[10px] font-black text-red-600/60 uppercase">{ex.category}</p>
                                                  </div>
                                                  <span className="font-black text-red-600 text-lg">-{formatKz(ex.amount)}</span>
                                              </div>
                                              {ex.notes && (
                                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 italic">"{ex.notes}"</p>
                                              )}
                                              <div className="flex items-center justify-between pt-3 border-t border-red-100 dark:border-red-900/30">
                                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                                                      <Clock size={12} />
                                                      {new Date(ex.timestamp).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                                                  </div>
                                                  <div className="text-[10px] text-slate-400 font-bold uppercase">
                                                      Resp: {ex.user}
                                                  </div>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <p className="text-slate-400 italic text-center py-10">Nenhuma despesa lançada.</p>
                              )}
                          </div>
                      </div>
                  )}

                  {activeTab === 'purchases' && (
                      <div className="space-y-6 animate-slide-up">
                          <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-100 dark:border-slate-700">
                              <h3 className="font-black text-[#003366] dark:text-white mb-6 uppercase text-xs tracking-widest">Compras do Dia</h3>
                              {dayData.purchases.length > 0 ? (
                                  <div className="space-y-6">
                                      {dayData.purchases.map(purchase => (
                                          <div key={purchase.id} className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-[24px] border border-blue-50 dark:border-blue-900/20">
                                              <div className="flex justify-between items-start mb-4">
                                                  <h4 className="font-black text-[#003366] dark:text-blue-300 uppercase text-sm">{purchase.name || 'Compra de Stock'}</h4>
                                                  <span className="font-black text-blue-600 text-lg">{formatKz(purchase.total)}</span>
                                              </div>
                                              
                                              <div className="space-y-2 mb-4">
                                                  {Object.entries(purchase.items).map(([prodId, qty]) => {
                                                      const prod = products.find(p => p.id === prodId);
                                                      return (
                                                          <div key={prodId} className="flex justify-between text-xs">
                                                              <span className="text-slate-600 dark:text-slate-400 font-medium">{prod?.name || 'Produto Desconhecido'}</span>
                                                              <span className="font-bold text-slate-900 dark:text-white">x{qty}</span>
                                                          </div>
                                                      );
                                                  })}
                                              </div>

                                              <div className="flex items-center justify-between pt-4 border-t border-blue-100 dark:border-blue-900/30">
                                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                                                      <Clock size={12} />
                                                      {new Date(purchase.timestamp).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                                                  </div>
                                                  <div className="text-[10px] text-slate-400 font-bold uppercase">
                                                      Resp: {purchase.completedBy}
                                                  </div>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <p className="text-slate-400 italic text-center py-10">Nenhuma compra registada.</p>
                              )}
                          </div>
                      </div>
                  )}

{activeTab === 'inventory' && (
                      <div className="space-y-6 animate-slide-up">
                          <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-100 dark:border-slate-700">
                              <h3 className="font-black text-[#003366] dark:text-white mb-6 uppercase text-xs tracking-widest flex items-center gap-2">
                                  <Package size={20} /> Histórico de Contagens e Edições
                              </h3>
                              
                              {dayData.inventory && dayData.inventory.length > 0 ? (
                                  <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                                      {dayData.inventory.map((log: any, idx: number) => {
                                          const isManual = log.justification?.toLowerCase().includes('edição');
                                          const title = isManual ? 'Edição Manual de Equipamento' : 'Contagem Mensal';
                                          const iconColor = log.status === 'DIVERGENTE' ? 'text-red-500' : 'text-emerald-500';
                                          
                                          return (
                                              <div key={log.id || idx} className={`p-6 rounded-2xl border ${log.status === 'DIVERGENTE' ? 'bg-red-50/70 border-red-200 dark:bg-red-900/10 dark:border-red-800' : 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800'}`}>
                                                  <div className="flex justify-between items-start mb-4">
                                                      <div className="flex items-center gap-3">
                                                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-white shadow ${iconColor}`}>
                                                              {log.status === 'DIVERGENTE' ? <AlertTriangle size={22} /> : <CheckCircle size={22} />}
                                                          </div>
                                                          <div>
                                                              <p className="font-bold text-lg">{title}</p>
                                                              <p className="text-xs text-slate-500">Por: {log.performedBy || 'Admin'}</p>
                                                          </div>
                                                      </div>
                                                      <div className={`px-4 py-1 rounded-full text-xs font-black ${log.status === 'DIVERGENTE' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                          {log.status}
                                                      </div>
                                                  </div>

                                                  <div className="text-sm mb-4">
                                                      <span className="text-slate-600">Equipamentos no registo:</span>
                                                      <span className="font-bold ml-2 text-[#003366]">{log.totalItems || 0}</span>
                                                  </div>

                                                  {log.discrepancies && log.discrepancies.length > 0 && (
                                                      <div className="mt-4 pt-4 border-t border-red-100 dark:border-red-800">
                                                          <p className="text-xs font-black text-red-600 mb-3 uppercase tracking-tighter">Itens Alterados / Divergentes:</p>
                                                          {log.discrepancies.map((d: any, i: number) => (
                                                              <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl mb-2 text-sm shadow-sm">
                                                                  <span className="font-medium">{d.name || d}</span>
                                                                  <span className={`font-bold ${d.diff < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                      {d.diff > 0 ? '+' : ''}{d.diff} un
                                                                  </span>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  )}

                                                  <div className="mt-5 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Justificação / Detalhes</p>
                                                      <p className="text-sm italic text-slate-600 dark:text-slate-300">
                                                          "{log.justification || 'Contagem realizada sem observações.'}"
                                                      </p>
                                                  </div>

                                                  <div className="text-[10px] text-slate-400 mt-6 flex justify-between items-center border-t border-slate-50 dark:border-slate-800 pt-4">
                                                      <span>{new Date(log.timestamp || Date.now()).toLocaleString('pt-AO')}</span>
                                                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[9px]">ID: {(log.id || '').slice(0,8)}</span>
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              ) : (
                                  <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                                      <Package size={72} className="mb-6 opacity-30" />
                                      <p className="font-bold text-lg">Nenhuma atividade de inventário nesta data.</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}

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

export default GlobalCalendar;
