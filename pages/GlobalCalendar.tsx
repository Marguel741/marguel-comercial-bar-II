
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, DollarSign, ArrowUpRight, TrendingUp, 
  Lock, Unlock, FileText, ShoppingBag, Package, Wallet, CheckCircle, AlertTriangle, AlertCircle, Eye, X, Info, Clock,
  Loader2, Wifi, WifiOff // Novos ícones para o status
} from 'lucide-react';
import { useProducts } from '../contexts/ProductContext';
import { useLayout } from '../contexts/LayoutContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, ClosureStatus } from '../types';
import SoftCard from '../components/SoftCard';
import { formatKz, roundKz } from '../src/utils';
import { hasPermission } from '../src/utils/permissions';
import AccessDenied from './AccessDenied';

const GlobalCalendar: React.FC = () => {
  const { 
    products,
    salesReports, 
    purchases, 
    expenses, 
    inventoryHistory, 
    transactions,
    isDayLocked,
    toggleDayLock,
    lockDayManually,
    reopenDay,
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
      const handleStatusChange = () => {
          setIsOnline(navigator.onLine);
          if (navigator.onLine && hasPendingChanges) {
              syncData();
          }
      };
      window.addEventListener('online', handleStatusChange);
      window.addEventListener('offline', handleStatusChange);
      return () => {
          window.removeEventListener('online', handleStatusChange);
          window.removeEventListener('offline', handleStatusChange);
      };
  }, [hasPendingChanges, syncData]);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const monthName = viewDate.toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' });

  const canManageLocks = hasPermission(user, 'calendar_unlock');

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

  const salesMap = useMemo(() => new Map(salesReports.map(r => [r.date, r])), [salesReports]);
  const inventoryMap = useMemo(() => new Map(inventoryHistory.map(h => [h.date, h])), [inventoryHistory]);

  const monthStats = useMemo(() => {
    let total = 0;
    let count = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = new Date(viewDate.getFullYear(), viewDate.getMonth(), i).toLocaleDateString('pt-AO');
      const r = salesMap.get(dateStr);
      if (r && (r.status === ClosureStatus.FECHO_CONFIRMADO || r.status === ClosureStatus.BLOQUEADO)) {
        total = roundKz(total + r.totalLifted);
        count++;
      }
    }
    return { total, count };
  }, [viewDate, salesMap, daysInMonth]);

  const calendarDays = useMemo(() => {
    return Array.from({ length: daysInMonth }).map((_, i) => {
      const day = i + 1;
      const dateStr = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toLocaleDateString('pt-AO');
      const report = salesMap.get(dateStr);
      const isLocked = isDayLocked(dateStr);
      const isToday = getSystemDate().toLocaleDateString('pt-AO') === dateStr;
      
      return {
        day,
        dateStr,
        report,
        isLocked,
        isToday
      };
    });
  }, [viewDate, daysInMonth, salesMap, isDayLocked, lockedDays, getSystemDate]);

  const dayData = useMemo(() => {
    if (!selectedDayDetail) return null;

    const report = salesMap.get(selectedDayDetail);
    const dayPurchases = purchases.filter(p => p.date === selectedDayDetail);
    const dayExpenses = expenses.filter(e => e.date === selectedDayDetail);
    const dayInventoryLog = inventoryMap.get(selectedDayDetail);
    const dayTrans = transactions.filter(t => t.date.includes(selectedDayDetail.substring(0, 5)));
    
    const dayPriceChanges = priceHistory?.filter(l => {
        const logDate = new Date(parseInt(l.id)).toLocaleDateString('pt-AO');
        return logDate === selectedDayDetail;
    }) || [];

    const isConfirmed = report?.status === ClosureStatus.FECHO_CONFIRMADO || report?.status === ClosureStatus.BLOQUEADO;
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
                               {report.status === ClosureStatus.FECHO_CONFIRMADO || report.status === ClosureStatus.BLOQUEADO ? (
                                  <p className="text-[9px] font-black text-[#003366] dark:text-blue-400 truncate">
                                     {roundKz(report.totalLifted / 1000)}k
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

       {/* MODAL DETALHADO (Mantido conforme original) */}
       {selectedDayDetail && dayData && (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedDayDetail(null)}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-white/20" onClick={e => e.stopPropagation()}>
               
               {/* HEADER: Auditoria de Status */}
               <div className="p-6 md:p-8 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-4">
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${dayData.isLocked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {dayData.isLocked ? <Lock size={28} /> : <Unlock size={28} />}
                     </div>
                     <div>
                        <h2 className="text-2xl font-black text-[#003366] dark:text-white">{selectedDayDetail}</h2>
                        <div className="mt-1">
                            {dayData.isLocked && (
                              <div className="flex flex-col gap-1">
                                <span className="text-red-500 font-bold">Dia Bloqueado</span>
                              </div>
                            )}
                            {!dayData.isLocked && (
                              <div className="flex gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-green-500 text-white">
                                    DIA ABERTO PARA EDIÇÃO
                                </span>
                                {dayData.report && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${dayData.report.status === ClosureStatus.BLOQUEADO ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {dayData.report.status === ClosureStatus.BLOQUEADO ? 'Gestão Bloqueada' : 'Caixa Fechado'}
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

                              if (dayData.isLocked) {
                                 if (window.confirm(`Deseja DESBLOQUEAR o dia ${dateToOperate}?`)) {
                                    reopenDay(dateToOperate, "Desbloqueio via Celular");
                                    triggerHaptic('success');
                                 }
                              } else {
                                 if (window.confirm(`Deseja BLOQUEAR o dia ${dateToOperate}?`)) {
                                    lockDayManually(dateToOperate, user?.name || 'Admin');
                                    triggerHaptic('warning');
                                 }
                              }
                           }}
                           className={`h-12 px-6 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${
                              dayData.isLocked 
                              ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/20' 
                              : 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                           }`}
                        >
                           {dayData.isLocked ? <><Unlock size={18} /> Desbloquear dia</> : <><Lock size={18} /> Bloquear dia</>}
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
                                    <span className="text-slate-500 font-medium">Vendas (Entrada Bruta)</span>
                                    <span className={`font-bold ${dayData.isConfirmed ? 'text-[#003366] dark:text-white' : 'text-amber-600 italic'}`}>
                                        {dayData.isConfirmed ? formatKz(dayData.report?.totalLifted || 0) : 'Aguardando Confirmação'}
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
                                    <span className="text-slate-900 dark:text-white font-black">SALDO ESTIMADO</span>
                                    <span className={`text-xl font-black ${dayData.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatKz(dayData.netBalance)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500 font-bold">Margem de Lucro</span>
                                    <span className={`font-black ${dayData.isConfirmed ? (dayData.report?.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600' : 'text-slate-400 italic'}`}>
                                        {dayData.isConfirmed ? formatKz(dayData.report?.profit || 0) : 'N/A'}
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
                                                    {new Date(parseInt(dayData.inventory.id)).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
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
                              {dayData.report?.discrepancy !== 0 && (
                                 <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-2xl border border-amber-100 dark:border-amber-800/30 flex items-center gap-3">
                                    <AlertTriangle size={20} className="shrink-0" />
                                    <div>
                                        <p className="text-xs font-black uppercase">Quebra de Caixa</p>
                                        <p className="text-sm font-bold">{formatKz(dayData.report?.discrepancy || 0)} detectados no fecho.</p>
                                    </div>
                                 </div>
                              )}
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
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                 {[
                                     { label: 'Dinheiro (Cash)', value: dayData.report.cash, color: 'text-green-600', bg: 'bg-green-50' },
                                     { label: 'Multicaixa (TPA)', value: dayData.report.tpa, color: 'text-blue-600', bg: 'bg-blue-50' },
                                     { label: 'Transferências', value: dayData.report.transfer, color: 'text-purple-600', bg: 'bg-purple-50' }
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
                                       {dayData.report.itemsSummary.map((item, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800 transition-colors">
                                             <td className="px-6 py-4 font-bold text-sm text-slate-700 dark:text-slate-300">{item.name}</td>
                                             <td className="px-6 py-4 text-center font-black text-blue-600">{item.qty}</td>
                                             <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">{formatKz(item.total)}</td>
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
                              <h3 className="font-black text-[#003366] dark:text-white mb-6 uppercase text-xs tracking-widest">Trabalho Operacional (Contagem)</h3>
                              {dayData.inventory ? (
                                  <div className="space-y-6">
                                      <div className={`p-6 rounded-[24px] border ${dayData.inventory.status === 'OK' ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/20' : 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20'}`}>
                                          <div className="flex justify-between items-center mb-4">
                                              <div className="flex items-center gap-3">
                                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dayData.inventory.status === 'OK' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
                                                      {dayData.inventory.status === 'OK' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                                                  </div>
                                                  <div>
                                                      <p className="text-xs font-black text-slate-400 uppercase">Status da Contagem</p>
                                                      <p className={`font-black uppercase ${dayData.inventory.status === 'OK' ? 'text-green-600' : 'text-amber-600'}`}>
                                                          {dayData.inventory.status === 'OK' ? 'Equipamentos OK' : 'Divergência Detectada'}
                                                      </p>
                                                  </div>
                                              </div>
                                              <div className="text-right">
                                                  <p className="text-xs font-black text-slate-400 uppercase">Itens Conferidos</p>
                                                  <p className="font-black text-slate-900 dark:text-white">{dayData.inventory.totalItems}</p>
                                              </div>
                                          </div>

                                          {dayData.inventory.discrepancies.length > 0 && (
                                              <div className="mt-4 space-y-2">
                                                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Detalhes das Divergências:</p>
                                                  {dayData.inventory.discrepancies.map((d, idx) => (
                                                      <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-slate-800 rounded-lg">
                                                          <span className="font-medium text-slate-700 dark:text-slate-300">{d.name}</span>
                                                          <span className={`font-bold ${d.diff < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                              {d.diff > 0 ? '+' : ''}{d.diff} unidades
                                                          </span>
                                                      </div>
                                                  ))}
                                              </div>
                                          )}

                                          {dayData.inventory.justification && (
                                              <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Justificação:</p>
                                                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{dayData.inventory.justification}"</p>
                                              </div>
                                          )}

                                          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                                                  <Clock size={12} />
                                                  {/* Assuming ID is timestamp if no generatedAt is present in InventoryLog */}
                                                  {new Date(parseInt(dayData.inventory.id)).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                                              </div>
                                              <div className="text-[10px] text-slate-400 font-bold uppercase">
                                                  Realizado por: {dayData.inventory.performedBy}
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-50">
                                      <Package size={64} className="mb-4" />
                                      <p className="font-bold">Nenhuma contagem de equipamentos realizada nesta data.</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}

               </div>
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
