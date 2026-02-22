
import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, DollarSign, ArrowUpRight, TrendingUp, 
  Lock, Unlock, FileText, ShoppingBag, Package, Wallet, CheckCircle, AlertTriangle, AlertCircle, Eye, X 
} from 'lucide-react';
import { useProducts } from '../contexts/ProductContext';
import { useLayout } from '../contexts/LayoutContext';
import { useAuth } from '../App';
import { UserRole } from '../types';
import SoftCard from '../components/SoftCard';

const GlobalCalendar: React.FC = () => {
  const { 
    salesReports, 
    purchases, 
    expenses, 
    inventoryHistory, 
    transactions,
    isDayLocked,
    toggleDayLock,
    priceHistory
  } = useProducts();
  const { triggerHaptic } = useLayout();
  const { user } = useAuth();
  
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null); // "DD/MM/YYYY"
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'inventory' | 'finance' | 'purchases'>('overview');

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const monthName = viewDate.toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' });

  const isAdminOrOwner = user?.role === UserRole.ADMIN_GERAL || user?.role === UserRole.PROPRIETARIO;

  const handleNav = (direction: number) => {
    triggerHaptic('selection');
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setViewDate(newDate);
  };

  const handleDayClick = (day: number) => {
    triggerHaptic('selection');
    const dateStr = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toLocaleDateString('pt-AO');
    setSelectedDayDetail(dateStr);
    setActiveTab('overview');
  };

  // --- DATA AGGREGATION FOR SELECTED DAY ---
  const dayData = useMemo(() => {
    if (!selectedDayDetail) return null;

    const report = salesReports.find(r => r.date === selectedDayDetail);
    const dayPurchases = purchases.filter(p => p.date === selectedDayDetail);
    const dayExpenses = expenses.filter(e => e.date === selectedDayDetail);
    const dayInventoryLog = inventoryHistory.find(l => l.date === selectedDayDetail); // Assuming one per day usually
    // Filter transactions by string match date
    const dayTrans = transactions.filter(t => t.date.includes(selectedDayDetail.substring(0, 5))); // Simple match Day/Month
    // Price history usually has full timestamp, filter by string match
    const dayPriceChanges = priceHistory?.filter(l => new Date(parseInt(l.id)).toLocaleDateString('pt-AO') === selectedDayDetail) || [];

    const totalPurchased = dayPurchases.reduce((acc, p) => acc + p.total, 0);
    const totalExpenses = dayExpenses.reduce((acc, e) => acc + e.amount, 0);

    return {
      report,
      purchases: dayPurchases,
      expenses: dayExpenses,
      inventory: dayInventoryLog,
      transactions: dayTrans,
      priceChanges: dayPriceChanges,
      totalPurchased,
      totalExpenses,
      isLocked: isDayLocked(selectedDayDetail)
    };
  }, [selectedDayDetail, salesReports, purchases, expenses, inventoryHistory, transactions, priceHistory, isDayLocked]);

  // Stats for current month view
  const monthStats = useMemo(() => {
     let total = 0;
     let count = 0;
     for(let i = 1; i <= daysInMonth; i++) {
        const dateStr = new Date(viewDate.getFullYear(), viewDate.getMonth(), i).toLocaleDateString('pt-AO');
        const r = salesReports.find(rep => rep.date === dateStr);
        if(r) {
            total += r.totalLifted;
            count++;
        }
     }
     return { total, count };
  }, [viewDate, salesReports, daysInMonth]);

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-24 relative">
       
       <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
             <h1 className="text-3xl font-bold text-[#003366] dark:text-white flex items-center gap-3">
                <Calendar size={32} /> Calendário Marguel
             </h1>
             <p className="text-slate-500 dark:text-slate-400">Relatório Geral Completo do Sistema</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
             <button onClick={() => handleNav(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-300"><ChevronLeft size={24}/></button>
             <span className="font-bold text-lg text-[#003366] dark:text-white w-40 text-center capitalize">{monthName}</span>
             <button onClick={() => handleNav(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-300"><ChevronRight size={24}/></button>
          </div>
       </header>

       <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Calendar Grid */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-xl border border-slate-100 dark:border-slate-700">
             <div className="grid grid-cols-7 mb-4">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                   <div key={d} className="text-center font-bold text-slate-400 uppercase text-xs">{d}</div>
                ))}
             </div>
             
             <div className="grid grid-cols-7 gap-2 md:gap-4">
                {/* Empty slots */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                   <div key={`empty-${i}`} className="aspect-square"></div>
                ))}

                {/* Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                   const day = i + 1;
                   const dateStr = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toLocaleDateString('pt-AO');
                   const report = salesReports.find(r => r.date === dateStr);
                   const isLocked = isDayLocked(dateStr);
                   const isToday = new Date().toDateString() === new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toDateString();

                   return (
                      <div 
                        key={day} 
                        onClick={() => handleDayClick(day)}
                        className={`
                           aspect-square rounded-2xl p-2 flex flex-col justify-between relative border transition-all cursor-pointer hover:shadow-md hover:scale-[1.02]
                           ${report 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                              : 'bg-slate-50 dark:bg-slate-700/30 border-transparent text-slate-400'}
                           ${isToday ? 'ring-2 ring-amber-400' : ''}
                           ${isLocked ? 'opacity-90' : ''}
                        `}
                      >
                         <div className="flex justify-between items-start">
                            <span className={`text-sm font-bold ${report ? 'text-[#003366] dark:text-blue-300' : 'text-slate-400'}`}>{day}</span>
                            {isLocked && <Lock size={12} className="text-red-500" />}
                            {!isLocked && report && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                         </div>
                         
                         {report ? (
                            <div className="text-right">
                               <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Venda</p>
                               <p className="text-xs md:text-sm font-black text-[#003366] dark:text-white">
                                  {(report.totalLifted / 1000).toFixed(1)}k
                               </p>
                            </div>
                         ) : (
                            <div className="h-full flex items-center justify-center opacity-10">
                               <DollarSign size={20} />
                            </div>
                         )}
                      </div>
                   );
                })}
             </div>
          </div>

          {/* Monthly Summary Side Panel */}
          <div className="space-y-6">
             <SoftCard className="bg-[#003366] text-white">
                <h3 className="font-bold text-blue-200 text-sm uppercase mb-1">Total Faturado ({monthName})</h3>
                <p className="text-4xl font-black">{monthStats.total.toLocaleString('pt-AO')} Kz</p>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                   <span className="text-xs font-medium opacity-70">Dias com Venda</span>
                   <span className="font-bold text-xl">{monthStats.count}</span>
                </div>
             </SoftCard>

             <div className="space-y-3">
                <h4 className="font-bold text-slate-600 dark:text-slate-300 text-sm uppercase px-2">Destaques do Mês</h4>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <TrendingUp size={20} />
                   </div>
                   <div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Média Diária</p>
                      <p className="font-bold text-slate-800 dark:text-white">
                         {monthStats.count > 0 ? (monthStats.total / monthStats.count).toLocaleString('pt-AO', {maximumFractionDigits: 0}) : 0} Kz
                      </p>
                   </div>
                </div>
             </div>
          </div>
       </div>

       {/* --- DETAILED DAY REPORT MODAL --- */}
       {selectedDayDetail && dayData && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedDayDetail(null)}>
            <div className="bg-[#F8FAFC] dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>
               
               {/* MODAL HEADER */}
               <div className="bg-white dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
                  <div>
                     <h2 className="text-2xl font-black text-[#003366] dark:text-white flex items-center gap-3">
                        <Calendar size={28} /> Relatório de {selectedDayDetail}
                     </h2>
                     <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {dayData.isLocked ? <span className="text-red-500 font-bold flex items-center gap-1"><Lock size={12} /> Dia Bloqueado</span> : <span className="text-green-500 font-bold flex items-center gap-1"><Unlock size={12} /> Dia Aberto</span>}
                     </p>
                  </div>
                  <div className="flex gap-3">
                     {isAdminOrOwner && (
                        <button 
                           onClick={() => {
                              triggerHaptic(dayData.isLocked ? 'success' : 'warning');
                              toggleDayLock(selectedDayDetail);
                           }}
                           className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${dayData.isLocked ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                        >
                           {dayData.isLocked ? <><Unlock size={16} /> Desbloquear Dia</> : <><Lock size={16} /> Bloquear Dia</>}
                        </button>
                     )}
                     <button onClick={() => setSelectedDayDetail(null)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                     </button>
                  </div>
               </div>

               {/* TABS */}
               <div className="flex bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 gap-6 overflow-x-auto shrink-0">
                  {[
                     { id: 'overview', label: 'Visão Geral', icon: FileText },
                     { id: 'sales', label: 'Controle de Vendas', icon: DollarSign },
                     { id: 'inventory', label: 'Inventário', icon: Package },
                     { id: 'finance', label: 'Financeiro', icon: Wallet },
                     { id: 'purchases', label: 'Preços & Compras', icon: ShoppingBag },
                  ].map(tab => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-4 px-2 font-bold text-sm flex items-center gap-2 border-b-4 transition-all ${activeTab === tab.id ? 'border-[#003366] text-[#003366] dark:border-blue-500 dark:text-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                     >
                        <tab.icon size={16} /> {tab.label}
                     </button>
                  ))}
               </div>

               {/* CONTENT AREA */}
               <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
                  
                  {/* TAB: OVERVIEW */}
                  {activeTab === 'overview' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                           <h3 className="font-bold text-[#003366] dark:text-white mb-4">Resumo do Dia</h3>
                           <div className="space-y-4">
                              <div className="flex justify-between border-b border-slate-50 dark:border-slate-700 pb-2">
                                 <span className="text-slate-500">Total Vendas (Levantado)</span>
                                 <span className="font-bold text-[#003366] dark:text-white">{dayData.report?.totalLifted.toLocaleString('pt-AO') || 0} Kz</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-50 dark:border-slate-700 pb-2">
                                 <span className="text-slate-500">Total Compras</span>
                                 <span className="font-bold text-blue-500">{dayData.totalPurchased.toLocaleString('pt-AO')} Kz</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-50 dark:border-slate-700 pb-2">
                                 <span className="text-slate-500">Despesas Totais</span>
                                 <span className="font-bold text-red-500">{dayData.totalExpenses.toLocaleString('pt-AO')} Kz</span>
                              </div>
                              <div className="flex justify-between pt-2">
                                 <span className="text-slate-500 font-bold">Saldo Líquido Est.</span>
                                 <span className="font-black text-green-600">
                                    {((dayData.report?.totalLifted || 0) - dayData.totalPurchased - dayData.totalExpenses).toLocaleString('pt-AO')} Kz
                                 </span>
                              </div>
                           </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                           <h3 className="font-bold text-[#003366] dark:text-white mb-4">Eventos Importantes</h3>
                           <div className="space-y-3">
                              {dayData.report?.discrepancy !== 0 && (
                                 <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center gap-2">
                                    <AlertTriangle size={16} /> Divergência de Caixa: {dayData.report?.discrepancy.toLocaleString()} Kz
                                 </div>
                              )}
                              {dayData.inventory?.status === 'DIVERGENTE' && (
                                 <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold flex items-center gap-2">
                                    <AlertCircle size={16} /> Inventário com Perdas
                                 </div>
                              )}
                              {dayData.priceChanges.length > 0 && (
                                 <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center gap-2">
                                    <DollarSign size={16} /> {dayData.priceChanges.length} Alterações de Preço
                                 </div>
                              )}
                              {!dayData.report && !dayData.inventory && dayData.transactions.length === 0 && (
                                 <p className="text-slate-400 italic text-sm">Nenhum evento crítico registrado.</p>
                              )}
                           </div>
                        </div>
                     </div>
                  )}

                  {/* TAB: SALES */}
                  {activeTab === 'sales' && (
                     <div className="space-y-6">
                        {dayData.report ? (
                           <>
                              <div className="grid grid-cols-3 gap-4">
                                 <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl border border-green-100 dark:border-green-800">
                                    <p className="text-xs text-green-700 dark:text-green-300 font-bold uppercase">Cash</p>
                                    <p className="text-xl font-black text-[#003366] dark:text-white">{dayData.report.cash.toLocaleString()} Kz</p>
                                 </div>
                                 <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                                    <p className="text-xs text-blue-700 dark:text-blue-300 font-bold uppercase">TPA</p>
                                    <p className="text-xl font-black text-[#003366] dark:text-white">{dayData.report.tpa.toLocaleString()} Kz</p>
                                 </div>
                                 <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-800">
                                    <p className="text-xs text-purple-700 dark:text-purple-300 font-bold uppercase">Transf.</p>
                                    <p className="text-xl font-black text-[#003366] dark:text-white">{dayData.report.transfer.toLocaleString()} Kz</p>
                                 </div>
                              </div>
                              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
                                 <h4 className="font-bold mb-4">Produtos Vendidos</h4>
                                 <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-sm">
                                       <thead className="text-left text-slate-400 text-xs uppercase sticky top-0 bg-white dark:bg-slate-800">
                                          <tr><th className="pb-2">Produto</th><th className="pb-2 text-center">Qtd</th><th className="pb-2 text-right">Total</th></tr>
                                       </thead>
                                       <tbody>
                                          {dayData.report.itemsSummary.map((item, idx) => (
                                             <tr key={idx} className="border-t border-slate-50 dark:border-slate-700">
                                                <td className="py-2 font-medium">{item.name}</td>
                                                <td className="py-2 text-center font-bold">{item.qty}</td>
                                                <td className="py-2 text-right">{item.total.toLocaleString()}</td>
                                             </tr>
                                          ))}
                                       </tbody>
                                    </table>
                                 </div>
                              </div>
                              {dayData.report.notes && (
                                 <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800">
                                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase mb-1">Observações do Fecho</p>
                                    <p className="text-sm italic text-slate-700 dark:text-slate-300">"{dayData.report.notes}"</p>
                                 </div>
                              )}
                           </>
                        ) : (
                           <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
                              Nenhum relatório de vendas fechado para este dia.
                           </div>
                        )}
                     </div>
                  )}

                  {/* TAB: INVENTORY */}
                  {activeTab === 'inventory' && (
                     <div className="space-y-6">
                        {dayData.inventory ? (
                           <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
                              <div className="flex justify-between mb-4">
                                 <h3 className="font-bold">Registro de Contagem</h3>
                                 <span className={`px-2 py-1 rounded-lg text-xs font-bold ${dayData.inventory.status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {dayData.inventory.status}
                                 </span>
                              </div>
                              <p className="text-sm mb-4">Realizado por: <strong>{dayData.inventory.performedBy}</strong></p>
                              {dayData.inventory.discrepancies.length > 0 && (
                                 <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl mb-4">
                                    <p className="text-xs font-bold text-red-600 mb-2">Divergências Encontradas:</p>
                                    {dayData.inventory.discrepancies.map((d, i) => (
                                       <div key={i} className="flex justify-between text-sm text-red-700">
                                          <span>{d.name}</span>
                                          <span className="font-bold">{d.diff}</span>
                                       </div>
                                    ))}
                                    {dayData.inventory.justification && (
                                       <p className="mt-2 text-xs italic opacity-80 border-t border-red-200 pt-2">"{dayData.inventory.justification}"</p>
                                    )}
                                 </div>
                              )}
                           </div>
                        ) : (
                           <p className="text-center text-slate-400 py-8">Nenhuma contagem de equipamento realizada neste dia.</p>
                        )}
                        
                        {/* Placeholder for Product Stock Snapshot if available in future */}
                        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-3xl text-center">
                           <Package size={32} className="mx-auto text-slate-300 mb-2" />
                           <p className="text-slate-500 text-sm">Histórico detalhado de estoque de produtos disponível no relatório de vendas.</p>
                        </div>
                     </div>
                  )}

                  {/* TAB: PURCHASES & PRICES */}
                  {activeTab === 'purchases' && (
                     <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
                           <h3 className="font-bold mb-4 flex items-center gap-2"><ShoppingBag size={18} /> Compras Efetuadas</h3>
                           {dayData.purchases.length > 0 ? (
                              <div className="space-y-3">
                                 {dayData.purchases.map(p => (
                                    <div key={p.id} className="p-3 border border-slate-100 dark:border-slate-700 rounded-xl flex justify-between items-center">
                                       <div>
                                          <p className="font-bold text-sm">{p.name}</p>
                                          <p className="text-xs text-slate-400">{Object.keys(p.items).length} itens • {p.completedBy}</p>
                                       </div>
                                       <div className="text-right">
                                          <p className="font-bold text-[#003366] dark:text-white">{p.total.toLocaleString()} Kz</p>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           ) : (
                              <p className="text-slate-400 text-sm italic">Nenhuma compra registrada.</p>
                           )}
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
                           <h3 className="font-bold mb-4 flex items-center gap-2"><DollarSign size={18} /> Alterações de Preço</h3>
                           {dayData.priceChanges.length > 0 ? (
                              <div className="space-y-3">
                                 {dayData.priceChanges.map(log => (
                                    <div key={log.id} className="text-sm p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                       <span className="font-bold">{log.productName}</span>: 
                                       <span className="text-slate-400 line-through mx-2">{log.oldSell}</span> 
                                       <ArrowUpRight size={12} className="inline mx-1" />
                                       <span className="font-bold text-green-600">{log.newSell} Kz</span>
                                    </div>
                                 ))}
                              </div>
                           ) : (
                              <p className="text-slate-400 text-sm italic">Nenhuma alteração de preço.</p>
                           )}
                        </div>
                     </div>
                  )}

                  {/* TAB: FINANCE */}
                  {activeTab === 'finance' && (
                     <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
                           <h3 className="font-bold mb-4">Despesas Registradas</h3>
                           {dayData.expenses.length > 0 ? (
                              <div className="space-y-3">
                                 {dayData.expenses.map(ex => (
                                    <div key={ex.id} className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/10 rounded-xl">
                                       <div>
                                          <p className="font-bold text-slate-700 dark:text-white text-sm">{ex.title}</p>
                                          <p className="text-xs text-slate-500 uppercase">{ex.category}</p>
                                       </div>
                                       <span className="font-bold text-red-500">-{ex.amount.toLocaleString()} Kz</span>
                                    </div>
                                 ))}
                              </div>
                           ) : (
                              <p className="text-slate-400 text-sm italic">Sem despesas.</p>
                           )}
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
                           <h3 className="font-bold mb-4">Movimentos de Conta</h3>
                           {dayData.transactions.length > 0 ? (
                              <div className="space-y-3">
                                 {dayData.transactions.map(t => (
                                    <div key={t.id} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-700 rounded-xl">
                                       <div>
                                          <p className="font-bold text-sm">{t.category}</p>
                                          <p className="text-xs text-slate-400">{t.description}</p>
                                       </div>
                                       <span className={`font-bold ${t.type === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>
                                          {t.type === 'entrada' ? '+' : '-'}{t.amount.toLocaleString()} Kz
                                       </span>
                                    </div>
                                 ))}
                              </div>
                           ) : (
                              <p className="text-slate-400 text-sm italic">Sem transações bancárias diretas.</p>
                           )}
                        </div>
                     </div>
                  )}

               </div>
            </div>
         </div>
       )}

        {/* Footer */}
        <footer className="mt-16 py-10 px-6 bg-white rounded-2xl text-center flex flex-col gap-4 font-sans">
            <p className="text-sm font-bold tracking-[-0.01em] text-[#003366]">
                Marguel Sistema de Gestão Interna
            </p>
            <div className="flex flex-col items-center">
                <span className="text-xs text-[#6B7280] mb-1">Desenvolvido por</span>
                <div className="text-xs tracking-[0.5px]">
                    <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>DC - Comercial</span>
                    <span className="text-[#6B7280] font-normal mx-1">&</span>
                    <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>Marguel Group</span>
                </div>
            </div>
        </footer>
    </div>
  );
};

export default GlobalCalendar;
