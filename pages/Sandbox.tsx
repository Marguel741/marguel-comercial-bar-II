import React, { useState } from 'react';
import { 
  Calendar, 
  CheckCircle, 
  History, 
  FlaskConical,
  Trash2,
  SkipForward,
  ArrowLeft
} from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { useProducts } from '../contexts/ProductContext';
import { useLayout } from '../contexts/LayoutContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { formatDateISO, formatDisplayDate } from '../src/utils';
import { useNavigate } from 'react-router-dom';

const Sandbox: React.FC = () => {
  const { 
    salesReports,
    systemDate, // Data GLOBAL
    setSystemDate, // Setter GLOBAL
    resetTestData,
    getSystemDate
  } = useProducts();
  const { triggerHaptic } = useLayout();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Logs locais apenas para feedback visual
  const [dailyLog, setDailyLog] = useState<string[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Format Date for Display
  const dateStr = formatDateISO(systemDate);

  // --- ACTIONS ---

  const logAction = (action: string) => {
    const time = getSystemDate().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDailyLog(prev => [`[${dateStr} ${time}] ${action}`, ...prev]);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = new Date(e.target.value);
      if (!isNaN(newDate.getTime())) {
          setSystemDate(newDate);
          triggerHaptic('selection');
          logAction(`📅 Data do Sistema alterada para: ${formatDisplayDate(formatDateISO(newDate))}`);
      }
  };

  const advanceOneDay = () => {
      triggerHaptic('success');
      const nextDay = new Date(systemDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setSystemDate(nextDay);
      logAction(`⏩ Avançado para o dia seguinte.`);
  };

  const resetToToday = () => {
    setSystemDate(new Date());
    triggerHaptic('success');
    logAction("🔄 Data do sistema sincronizada com tempo real.");
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-32">
        
        {/* Banner Sandbox */}
        <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 rounded-2xl">
          <div className="flex items-center gap-3">
            <FlaskConical size={20} className="text-amber-600" />
            <div>
              <p className="font-black text-amber-800 dark:text-amber-300 text-sm uppercase">Ambiente Sandbox</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Modo leitura — nenhuma acção aqui altera dados reais</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white text-xs font-black rounded-xl active:scale-95 transition-all"
          >
            <ArrowLeft size={14} /> Sair do Sandbox
          </button>
        </div>
        
        {/* WARNING HEADER */}
        <div className="bg-[#003366] border-l-8 border-amber-400 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="bg-white/10 p-3 rounded-full animate-pulse">
                    <FlaskConical size={32} className="text-amber-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold uppercase tracking-tighter">Sandbox</h2>
                    <p className="text-blue-100 opacity-80 max-w-xl text-sm">
                        Esta página permite testar o comportamento do sistema em diferentes datas.
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 p-3 rounded-2xl">
              <span className="text-xs font-bold text-amber-700 uppercase">
                Modo Sandbox — Ações de escrita estão desactivadas
              </span>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-[#003366] text-white text-xs font-black rounded-xl hover:bg-[#004080] transition-all active:scale-95"
              >
                Voltar à minha conta
              </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            
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
                    <strong>Dica:</strong> Defina a data aqui e vá até a página <em>Controle de Vendas</em> para ver o estado do sistema nesse dia.
                </div>
            </SoftCard>

            {/* COLUMN 2: LOG & HISTORY */}
            <div className="space-y-6 lg:col-span-2">
                <SoftCard className="h-full flex flex-col border-t-4 border-slate-400">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                            <History size={20} className="text-slate-400" /> Log de Eventos (Sessão)
                        </h3>
                        <button 
                            onClick={() => setShowResetConfirm(true)}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                        >
                            <Trash2 size={12} />
                            Limpar Dados
                        </button>
                    </div>
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
                                    <div className="flex justify-between"><span>Vendas:</span> <span className="font-bold text-slate-700 dark:text-slate-200">{(report.totalExpected || 0).toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span>Despesas:</span> <span className="font-bold text-red-500">{(report.lunchExpense || 0).toLocaleString()}</span></div>
                                    <div className="flex justify-between border-t border-slate-100 dark:border-slate-700 pt-1 mt-1"><span>Líquido:</span> <span className="font-bold text-green-600">{(report.totalLifted || 0).toLocaleString()}</span></div>
                                </div>
                            </div>
                        ))
                )}
            </div>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-white/20 dark:border-slate-700 animate-scale-in">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <p className="font-black text-2xl text-[#003366] dark:text-white mb-4 tracking-tighter">Confirmar Limpeza?</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
                Todos os dados do sistema serão apagados. Esta acção é irreversível e o sistema voltará ao estado inicial.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowResetConfirm(false)} 
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => { 
                    resetTestData(); 
                    setShowResetConfirm(false); 
                    logAction("🧹 Sistema resetado para o estado inicial.");
                    triggerHaptic('impact');
                  }} 
                  className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-200 dark:shadow-none hover:bg-red-600 transition-all"
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Sandbox;
