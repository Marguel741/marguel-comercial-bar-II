
import React, { useState } from 'react';
import { Landmark, Wallet, CreditCard, History, PlusCircle, X, ArrowUpRight, ArrowDownLeft, Calendar, Wifi, Chip, TrendingUp, TrendingDown, MinusCircle, FileText } from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { useLayout } from '../contexts/LayoutContext';
import { useProducts } from '../contexts/ProductContext';
import { MGLogo } from '../constants';

const AccountStatus: React.FC = () => {
  const { sidebarMode, triggerHaptic } = useLayout();
  const { currentBalance, savingsBalance, transactions, processTransaction } = useProducts();

  // Modals
  const [showTransModal, setShowTransModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  
  // Transaction State
  const [transType, setTransType] = useState<'deposit' | 'withdraw'>('deposit');
  const [targetAccount, setTargetAccount] = useState<'main' | 'savings'>('main');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const openTransactionModal = (type: 'deposit' | 'withdraw', account: 'main' | 'savings') => {
    setTransType(type);
    setTargetAccount(account);
    setAmount('');
    setNote('');
    setShowTransModal(true);
    triggerHaptic('selection');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    setAmount(formatted);
  };

  const handleTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !note.trim()) return;

    triggerHaptic('success');
    const val = parseFloat(amount.replace(/\s/g, ''));
    
    // Call centralized logic
    processTransaction(transType, targetAccount, val, note);

    setShowTransModal(false);
    setShowSuccessPopup(true);
    setTimeout(() => setShowSuccessPopup(false), 3000);
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in relative pb-24">
      
      {/* SUCCESS POPUP NOTIFICATION */}
      {showSuccessPopup && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-slide-up">
           <div className="bg-white dark:bg-slate-800 text-[#003366] dark:text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-100 dark:border-slate-700">
             <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <ArrowUpRight size={24} />
             </div>
             <div>
                <h4 className="font-bold text-lg">Sucesso!</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {transType === 'deposit' ? 'Depósito' : 'Débito'} confirmado.
                </p>
             </div>
           </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className={`transition-all duration-300 ${sidebarMode === 'hidden' ? 'pl-16 md:pl-20' : ''}`}>
          <h1 className="text-3xl font-bold text-[#003366] dark:text-white">Estado da Conta</h1>
          <p className="text-slate-500 dark:text-slate-400">Gestão financeira e cartões corporativos</p>
        </div>
      </header>

      {/* ÁREA DOS CARTÕES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* CARTÃO 1: SALDO TOTAL (Estilo Standard/Corporativo) */}
        <div className="space-y-4">
            <div className="relative h-64 w-full rounded-[32px] bg-gradient-to-bl from-[#003366] via-[#004488] to-[#0054A6] p-8 text-white shadow-2xl shadow-blue-900/40 overflow-hidden group hover:scale-[1.02] transition-transform duration-500 border border-white/10">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex justify-between items-start">
                        <MGLogo className="w-12 h-12 text-white/90" />
                        <Wifi className="text-white/70 rotate-90" size={28} />
                    </div>
                    
                    <div className="flex items-center gap-4 my-2">
                        <div className="w-12 h-9 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded-md shadow-sm opacity-90 flex items-center justify-center">
                            <div className="w-8 h-6 border border-black/20 rounded-[2px] grid grid-cols-2 gap-[1px]"></div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-10 h-6 border border-white/20 rounded-md"></div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <p className="text-blue-200 text-xs font-medium uppercase tracking-widest">Saldo Disponível</p>
                        <h2 className="text-4xl font-mono font-black tracking-tight">{currentBalance.toLocaleString('pt-AO')} Kz</h2>
                    </div>

                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <p className="text-[10px] text-blue-200 uppercase font-bold">Titular</p>
                            <p className="font-bold text-lg tracking-wide uppercase">Marguel Bar</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-blue-200 uppercase font-bold">Validade</p>
                            <p className="font-bold">12/28</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Quick Actions Card 1 */}
            <div className="flex gap-3">
                <button 
                    onClick={() => openTransactionModal('deposit', 'main')}
                    className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#003366] dark:text-blue-400 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
                >
                    <ArrowDownLeft size={20} /> Depositar
                </button>
                <button 
                    onClick={() => openTransactionModal('withdraw', 'main')}
                    className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
                >
                    <ArrowUpRight size={20} /> Debitar
                </button>
            </div>
        </div>

        {/* CARTÃO 2: POUPANÇA (Estilo Premium Gold) */}
        <div className="space-y-4">
            <div className="relative h-64 w-full rounded-[32px] bg-gradient-to-br from-[#F5DF4D] via-[#D4AF37] to-[#AA6C39] p-8 text-white shadow-2xl shadow-yellow-600/30 overflow-hidden group hover:scale-[1.02] transition-transform duration-500 border border-white/20">
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-30 w-full h-full transform -skew-x-12 translate-x-[-100%] group-hover:animate-shine pointer-events-none"></div>
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/20 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col h-full justify-between text-shadow-sm">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <Landmark size={32} className="text-white drop-shadow-md" />
                            <span className="font-black italic text-lg tracking-widest text-white drop-shadow-md">PREMIUM</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Gold Savings</span>
                            <Wifi className="text-white/80 rotate-90 mt-1" size={24} />
                        </div>
                    </div>

                    <div className="mt-4">
                         <p className="text-yellow-100 text-xs font-bold uppercase tracking-widest mb-1 drop-shadow-md">Saldo Poupança</p>
                         <h2 className="text-4xl font-mono font-black tracking-tight text-white drop-shadow-lg">{savingsBalance.toLocaleString('pt-AO')} Kz</h2>
                    </div>

                    <div className="flex justify-between items-end mt-auto">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-7 bg-white/20 rounded border border-white/30"></div>
                            <p className="font-bold text-lg tracking-widest uppercase drop-shadow-md">Marguel Reserve</p>
                        </div>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" className="h-8 opacity-90 drop-shadow-md filter brightness-0 invert" alt="Logo" />
                    </div>
                </div>
            </div>

            {/* Quick Actions Card 2 */}
            <div className="flex gap-3">
                <button 
                    onClick={() => openTransactionModal('deposit', 'savings')}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-amber-200 dark:shadow-none"
                >
                    <PlusCircle size={20} /> Depositar
                </button>
                <button 
                    onClick={() => openTransactionModal('withdraw', 'savings')}
                    className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
                >
                    <MinusCircle size={20} /> Debitar
                </button>
            </div>
        </div>

      </div>

      {/* SECÇÃO INFERIOR: DETALHES E HISTÓRICO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        <SoftCard className="flex items-center gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl">
            <Wallet size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Em Cash (Mão)</p>
            <p className="text-2xl font-black text-[#003366] dark:text-white">850.000 Kz</p>
          </div>
        </SoftCard>

        <SoftCard className="flex items-center gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
            <CreditCard size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Em TPA (Banco)</p>
            <p className="text-2xl font-black text-[#003366] dark:text-white">400.000 Kz</p>
          </div>
        </SoftCard>

        <SoftCard 
            className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all group md:col-span-2 lg:col-span-1"
            onClick={() => { triggerHaptic('selection'); setShowHistoryModal(true); }}
        >
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl group-hover:scale-110 transition-transform">
            <History size={28} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Movimentos</p>
            <p className="text-lg font-bold text-[#003366] dark:text-white underline decoration-purple-200 dark:decoration-purple-800">Ver Histórico Completo</p>
          </div>
        </SoftCard>
      </div>

      {/* --- MODAL: TRANSAÇÃO (DEPOSITAR / DEBITAR) --- */}
      {showTransModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
              <button 
                onClick={() => setShowTransModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400"
              >
                <X size={20} />
              </button>
              
              <h2 className={`text-xl font-bold mb-1 flex items-center gap-2 ${transType === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                {transType === 'deposit' ? <ArrowDownLeft /> : <ArrowUpRight />}
                {transType === 'deposit' ? 'Depositar' : 'Debitar'} em {targetAccount === 'savings' ? 'Poupança' : 'Corrente'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Preencha o valor e a nota da operação.
              </p>

              <form onSubmit={handleTransaction} className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Valor (Kz)</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      autoFocus
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder="Ex: 50 000"
                      className="w-full p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border-none soft-ui-inset font-bold text-lg text-[#003366] dark:text-white focus:ring-2 focus:ring-[#003366] outline-none mt-1"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                       <FileText size={12} /> Nota (Obrigatória)
                    </label>
                    <textarea 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={transType === 'deposit' ? "Ex: Lucro Mensal, Venda Ativo..." : "Ex: Pagamento Fornecedor, Manutenção..."}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border-none soft-ui-inset text-sm font-medium mt-1 dark:text-white resize-none"
                      rows={2}
                    />
                 </div>
                 <button 
                   type="submit"
                   className={`w-full py-4 text-white font-bold rounded-xl shadow-lg mt-2 active:scale-95 transition-all ${
                     transType === 'deposit' 
                        ? (targetAccount === 'savings' ? 'bg-gradient-to-r from-amber-500 to-yellow-600' : 'bg-[#003366]')
                        : 'bg-red-500 hover:bg-red-600'
                   }`}
                 >
                   Confirmar {transType === 'deposit' ? 'Depósito' : 'Débito'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* --- MODAL: HISTÓRICO --- */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-[#F8FAFC] dark:bg-[#0d1b2a] w-full max-w-2xl h-[80vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden relative">
              <div className="p-6 bg-white dark:bg-[#0d1b2a] border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                 <h2 className="text-xl font-bold text-[#003366] dark:text-white flex items-center gap-2">
                    <History size={24} /> Movimentos Recentes
                 </h2>
                 <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-red-500">
                    <X size={24} />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                 <div className="space-y-3">
                    {transactions.map((t) => (
                       <div key={t.id} className="bg-white dark:bg-[#0d1b2a] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center">
                          <div className="flex items-center gap-4">
                             <div className={`p-3 rounded-xl ${t.type === 'entrada' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                {t.type === 'entrada' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                             </div>
                             <div>
                                <p className="font-bold text-slate-800 dark:text-white">{t.category}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t.description}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className={`font-black text-lg ${t.type === 'entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {t.type === 'entrada' ? '+' : '-'}{t.amount.toLocaleString('pt-AO')} Kz
                             </p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-end gap-1">
                                <Calendar size={10} /> {t.date}
                             </p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Style for shine animation */}
      <style>{`
        @keyframes shine {
            100% { transform: skewX(-12deg) translateX(200%); }
        }
        .group:hover .animate-shine {
            animation: shine 1.5s infinite linear;
        }
        .text-shadow-sm {
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
      `}</style>

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

export default AccountStatus;
