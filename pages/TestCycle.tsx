
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Play, 
  ShoppingCart, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle, 
  AlertTriangle, 
  History, 
  Database,
  FlaskConical,
  RefreshCw,
  Trash2,
  ChevronRight,
  Package,
  SkipForward
} from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { useProducts } from '../contexts/ProductContext';
import { useLayout } from '../contexts/LayoutContext';
import { SalesReport } from '../types';

const TestCycle: React.FC = () => {
  const { 
    products, 
    updateProduct, 
    processTransaction, 
    addSalesReport, 
    currentBalance,
    addPurchase,
    salesReports,
    systemDate, // Data GLOBAL
    setSystemDate // Setter GLOBAL
  } = useProducts();
  const { sidebarMode, triggerHaptic } = useLayout();

  // Logs locais apenas para feedback visual
  const [dailyLog, setDailyLog] = useState<string[]>([]);
  
  // Format Date for Display
  const dateStr = systemDate.toLocaleDateString('pt-AO');

  // --- ACTIONS ---

  const logAction = (action: string) => {
    const time = new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDailyLog(prev => [`[${dateStr} ${time}] ${action}`, ...prev]);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = new Date(e.target.value);
      if (!isNaN(newDate.getTime())) {
          setSystemDate(newDate);
          triggerHaptic('selection');
          logAction(`📅 Data do Sistema alterada para: ${newDate.toLocaleDateString('pt-AO')}`);
      }
  };

  const advanceOneDay = () => {
      triggerHaptic('success');
      const nextDay = new Date(systemDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setSystemDate(nextDay);
      logAction(`⏩ Avançado para o dia seguinte.`);
  };

  // --- SIMULAÇÃO DE AÇÕES RÁPIDAS (Usando agora a data GLOBAL via Contexto) ---
  const simulateRandomSale = () => {
    triggerHaptic('impact');
    // 1. Pick a random product with stock
    const availableProducts = products.filter(p => p.stock > 0);
    if (availableProducts.length === 0) {
        logAction("❌ Falha na Venda: Sem produtos com stock.");
        return;
    }
    const product = availableProducts[Math.floor(Math.random() * availableProducts.length)];
    
    // 2. Determine random quantity (1 to 5)
    const qty = Math.min(product.stock, Math.floor(Math.random() * 5) + 1);
    const totalValue = qty * product.sellPrice;

    // 3. Update Real Context Data (Uses System Date internally in processTransaction)
    updateProduct(product.id, { stock: product.stock - qty });
    processTransaction('deposit', 'main', totalValue, `[SIMULADOR] Venda de ${qty}x ${product.name}`);

    logAction(`💰 Venda Simulada: ${qty}x ${product.name} (+${totalValue.toLocaleString()} Kz)`);
  };

  const simulateExpense = () => {
    triggerHaptic('impact');
    const amount = Math.floor(Math.random() * 10000) + 1000; // 1000 to 11000
    
    // Uses System Date internally
    processTransaction('withdraw', 'main', amount, `[SIMULADOR] Despesa Diversa`);
    
    logAction(`💸 Despesa Simulada: Pagamento diverso (-${amount.toLocaleString()} Kz)`);
  };

  const simulatePurchase = () => {
    triggerHaptic('impact');
    // Pick random product
    const product = products[Math.floor(Math.random() * products.length)];
    const packQty = Math.floor(Math.random() * 3) + 1; // 1 to 3 packs
    
    // Uses System Date internally
    addPurchase(
        { [product.id]: packQty }, 
        'Prices', 
        'Simulador',
        []
    );
    
    const cost = packQty * product.buyPrice * (product.packSize || 1);
    logAction(`📦 Compra Simulada: ${packQty} Packs de ${product.name} (-${cost.toLocaleString()} Kz)`);
  };

  const resetToToday = () => {
      if(confirm("Voltar para a data real de hoje?")) {
          setSystemDate(new Date());
          logAction("🔄 Data do sistema sincronizada com tempo real.");
      }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-32">
        
        {/* WARNING HEADER */}
        <div className="bg-[#003366] border-l-8 border-amber-400 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="bg-white/10 p-3 rounded-full animate-pulse">
                    <FlaskConical size={32} className="text-amber-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">MÁQUINA DO TEMPO / SIMULADOR</h2>
                    <p className="text-blue-100 opacity-80 max-w-xl">
                        Esta página controla a <strong className="text-white underline">Data do Sistema</strong>. 
                        Ao alterar a data aqui, o Dashboard, Controle de Vendas, Despesas e Inventário se comportarão como se fosse esse dia.
                    </p>
                </div>
            </div>
            <button onClick={resetToToday} className="whitespace-nowrap px-4 py-2 bg-amber-400 text-[#003366] font-bold rounded-xl hover:bg-amber-300 transition-colors shadow-lg">
                Voltar para Hoje (Real)
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUMN 1: TIME CONTROL */}
            <SoftCard className="space-y-6 border-t-4 border-blue-500 lg:col-span-1">
                <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                    <Calendar size={20} className="text-blue-500" /> Controle de Data
                </h3>
                
                <div className="p-6 bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-600 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Data Atual do Sistema</p>
                    <input 
                        type="date" 
                        value={systemDate.toISOString().split('T')[0]}
                        onChange={handleDateChange}
                        className="text-3xl font-black text-[#003366] dark:text-white bg-transparent text-center outline-none w-full cursor-pointer hover:bg-black/5 rounded-lg transition-colors"
                    />
                    <p className="text-xs text-slate-400 mt-2">Toque na data para alterar manualmente</p>
                </div>

                <button 
                    onClick={advanceOneDay}
                    className="w-full py-4 bg-[#003366] text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <SkipForward size={24} /> Avançar 1 Dia
                </button>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-800 dark:text-blue-200">
                    <strong>Dica:</strong> Defina a data aqui e vá até a página <em>Controle de Vendas</em> para fazer o fecho do dia selecionado.
                </div>
            </SoftCard>

            {/* COLUMN 2: QUICK ACTIONS */}
            <SoftCard className="space-y-6 border-t-4 border-amber-500 lg:col-span-1">
                <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                    <Play size={20} className="text-amber-500" /> Ações Rápidas (Nesta Data)
                </h3>
                <p className="text-xs text-slate-500">Gera movimentações instantâneas na data selecionada acima.</p>

                <div className="grid grid-cols-1 gap-3">
                    <button onClick={simulateRandomSale} className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl font-bold flex items-center gap-3 hover:bg-green-100 dark:hover:bg-green-900/40 transition-all text-left border border-green-100 dark:border-green-900/30">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm"><ShoppingCart size={18} /></div>
                        <div>
                            <span className="block">Gerar Venda Aleatória</span>
                            <span className="text-[10px] opacity-70 font-normal">Entra dinheiro no dia selecionado</span>
                        </div>
                    </button>

                    <button onClick={simulatePurchase} className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl font-bold flex items-center gap-3 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all text-left border border-blue-100 dark:border-blue-900/30">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm"><Package size={18} /></div>
                        <div>
                            <span className="block">Gerar Compra Aleatória</span>
                            <span className="text-[10px] opacity-70 font-normal">Sai dinheiro do dia selecionado</span>
                        </div>
                    </button>

                    <button onClick={simulateExpense} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl font-bold flex items-center gap-3 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all text-left border border-red-100 dark:border-red-900/30">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm"><ArrowDownLeft size={18} /></div>
                        <div>
                            <span className="block">Gerar Despesa Aleatória</span>
                            <span className="text-[10px] opacity-70 font-normal">Pagamento operacional nesta data</span>
                        </div>
                    </button>
                </div>
            </SoftCard>

            {/* COLUMN 3: LOG & HISTORY */}
            <div className="space-y-6 lg:col-span-1">
                <SoftCard className="h-full flex flex-col border-t-4 border-slate-400">
                    <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2 mb-4">
                        <History size={20} className="text-slate-400" /> Log de Eventos (Sessão)
                    </h3>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl p-4 overflow-y-auto custom-scrollbar max-h-[400px] border border-slate-100 dark:border-slate-700 font-mono text-xs space-y-2">
                        {dailyLog.length === 0 && <p className="text-slate-400 italic text-center mt-10">Aguardando ações...</p>}
                        {dailyLog.map((log, i) => (
                            <div key={i} className="border-b border-slate-200 dark:border-slate-800 pb-1 last:border-0">
                                {log}
                            </div>
                        ))}
                    </div>
                </SoftCard>
            </div>

        </div>

        {/* PREVIOUS DAYS SUMMARY */}
        <div className="mt-8">
            <h3 className="text-xl font-bold text-[#003366] dark:text-white mb-4">Histórico Global de Relatórios</h3>
            <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4">
                {salesReports.length === 0 ? (
                    <div className="w-full text-center py-8 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                        Nenhum relatório de fecho encontrado.
                    </div>
                ) : (
                    salesReports
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map(report => (
                            <div key={report.id} className="min-w-[200px] bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-[#003366] dark:text-white">{report.date}</span>
                                    <CheckCircle size={14} className="text-green-500" />
                                </div>
                                <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
                                    <div className="flex justify-between"><span>Vendas:</span> <span className="font-bold text-slate-700 dark:text-slate-200">{report.totalExpected.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span>Despesas:</span> <span className="font-bold text-red-500">{report.lunchExpense.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-t border-slate-100 dark:border-slate-700 pt-1 mt-1"><span>Líquido:</span> <span className="font-bold text-green-600">{report.totalLifted.toLocaleString()}</span></div>
                                </div>
                            </div>
                        ))
                )}
            </div>
        </div>

    </div>
  );
};

export default TestCycle;
