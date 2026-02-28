
import React, { useState, useRef } from 'react';
import { Landmark, Wallet, CreditCard, History, PlusCircle, X, ArrowUpRight, ArrowDownLeft, Calendar, Wifi, TrendingUp, TrendingDown, MinusCircle, FileText, Plus, Check, Edit2, Trash2, Palette, Loader2 } from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { useLayout } from '../contexts/LayoutContext';
import SyncStatus from '../components/SyncStatus';
import { useProducts } from '../contexts/ProductContext';
import { Card } from '../types';

const AccountStatus: React.FC = () => {
  const { sidebarMode, triggerHaptic } = useLayout();
  const { 
    cards, addCard, updateCard, deleteCard, 
    transactions, processTransaction, 
    cashBalance, tpaBalance, processCashTPADebit 
  } = useProducts();

  // Modals
  const [showTransModal, setShowTransModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [showCashTPAModal, setShowCashTPAModal] = useState<{isOpen: boolean, type: 'Cash' | 'TPA' | null}>({isOpen: false, type: null});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{isOpen: boolean, cardId: string | null}>({isOpen: false, cardId: null});
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Transaction State
  const [transType, setTransType] = useState<'deposit' | 'withdraw'>('deposit');
  const [targetAccount, setTargetAccount] = useState<string>('main');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Create Card State
  const [newCard, setNewCard] = useState<Omit<Card, 'id' | 'balance' | 'validity'>>({
    name: '',
    holder: '',
    color: 'bg-gradient-to-br from-blue-600 to-indigo-700',
    type: 'Corrente'
  });
  const [initialBalance, setInitialBalance] = useState('');

  // Edit Holder State
  const [editingHolderId, setEditingHolderId] = useState<string | null>(null);
  const [tempHolderName, setTempHolderName] = useState('');

  // Cash/TPA Debit State
  const [cashTPAAmount, setCashTPAAmount] = useState('');
  const [cashTPANote, setCashTPANote] = useState('');

  const openTransactionModal = (type: 'deposit' | 'withdraw', accountId: string) => {
    setTransType(type);
    setTargetAccount(accountId);
    setAmount('');
    setNote('');
    setShowTransModal(true);
    triggerHaptic('selection');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const raw = e.target.value.replace(/\D/g, '');
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    setter(formatted);
  };

  const handleTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !note.trim()) return;

    triggerHaptic('success');
    const val = parseFloat(amount.replace(/\s/g, ''));
    
    processTransaction(transType, targetAccount, val, note);

    setShowTransModal(false);
    setShowSuccessPopup(true);
    setTimeout(() => setShowSuccessPopup(false), 3000);
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.name || !newCard.holder) return;

    const balance = initialBalance ? parseFloat(initialBalance.replace(/\s/g, '')) : 0;
    
    addCard({
      ...newCard,
      balance,
      validity: '12/30'
    });

    triggerHaptic('success');
    setShowCreateCardModal(false);
    setNewCard({ name: '', holder: '', color: 'bg-gradient-to-br from-blue-600 to-indigo-700', type: 'Corrente' });
    setInitialBalance('');
  };

  const startEditingHolder = (card: Card) => {
    setEditingHolderId(card.id);
    setTempHolderName(card.holder);
    triggerHaptic('selection');
  };

  const saveHolderName = (id: string) => {
    if (!tempHolderName.trim()) return;
    updateCard(id, { holder: tempHolderName });
    setEditingHolderId(null);
    triggerHaptic('success');
  };

  const handleCashTPADebit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashTPAAmount || !cashTPANote.trim() || !showCashTPAModal.type) return;

    const val = parseFloat(cashTPAAmount.replace(/\s/g, ''));
    processCashTPADebit(showCashTPAModal.type, val, cashTPANote);

    triggerHaptic('success');
    setShowCashTPAModal({ isOpen: false, type: null });
    setCashTPAAmount('');
    setCashTPANote('');
    setShowSuccessPopup(true);
    setTimeout(() => setShowSuccessPopup(false), 3000);
  };

  const confirmDeleteCard = (id: string) => {
    triggerHaptic('warning');
    setShowDeleteConfirm({ isOpen: true, cardId: id });
  };

  const handleDeleteCard = () => {
    if (!showDeleteConfirm.cardId || isDeleting) return;
    
    const card = cards.find(c => c.id === showDeleteConfirm.cardId);
    if (!card) return;

    if (card.balance > 0) {
      triggerHaptic('error');
      alert(`Operação Negada: O cartão "${card.name}" possui um saldo de ${card.balance.toLocaleString('pt-AO')} Kz. É necessário zerar o saldo antes de eliminar o cartão.`);
      setShowDeleteConfirm({ isOpen: false, cardId: null });
      return;
    }

    setIsDeleting(true);
    triggerHaptic('success');
    
    // Simulação de processamento seguro
    setTimeout(() => {
      deleteCard(card.id);
      setIsDeleting(false);
      setShowDeleteConfirm({ isOpen: false, cardId: null });
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000);
    }, 800);
  };

  const cardColors = [
    { name: 'Deep Blue', class: 'bg-gradient-to-bl from-[#003366] via-[#004488] to-[#0054A6]' },
    { name: 'Premium Gold', class: 'bg-gradient-to-br from-[#F5DF4D] via-[#D4AF37] to-[#AA6C39]' },
    { name: 'Royal Purple', class: 'bg-gradient-to-br from-purple-700 via-indigo-800 to-blue-900' },
    { name: 'Emerald Night', class: 'bg-gradient-to-br from-emerald-600 via-teal-800 to-slate-900' },
    { name: 'Sunset Red', class: 'bg-gradient-to-br from-rose-600 via-red-700 to-orange-800' },
    { name: 'Midnight Slate', class: 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in relative pb-24">
      
      {/* SUCCESS POPUP NOTIFICATION */}
      {showSuccessPopup && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-slide-up">
           <div className="bg-white dark:bg-slate-800 text-[#003366] dark:text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-100 dark:border-slate-700">
             <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <Check size={24} />
             </div>
             <div>
                <h4 className="font-bold text-lg">Sucesso!</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Operação confirmada.
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
        <div className="flex items-center gap-4">
          <SyncStatus />
          <button 
            onClick={() => { triggerHaptic('impact'); setShowCreateCardModal(true); }}
          className="bg-[#003366] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-lg"
        >
          <Plus size={20} /> Criar Cartão
        </button>
        </div>
      </header>

      {/* ÁREA DOS CARTÕES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {cards.map((card) => (
          <div key={card.id} className="space-y-4">
            <div className={`relative h-64 w-full rounded-[32px] ${card.color} p-8 text-white shadow-2xl overflow-hidden group hover:scale-[1.02] transition-transform duration-500 border border-white/10`}>
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex justify-between items-start">
                        {card.id === 'main' ? (
                          <div className="flex flex-col items-center scale-75 origin-top-left">
                            <div className="relative flex items-center justify-center">
                               <span className="font-sans font-black text-3xl tracking-tighter text-[#E3007E] relative z-10" style={{ filter: 'drop-shadow(0 0 12px rgba(227, 0, 126, 0.4))' }}>MG</span>
                               <div className="absolute inset-0 blur-xl bg-[#E3007E]/10 rounded-full animate-pulse"></div>
                            </div>
                            <div className="w-10 h-[1px] bg-[#E3007E]/50 mt-0.5 shadow-[0_0_5px_rgba(227,0,126,0.2)]"></div>
                            <div className="flex items-center gap-1.5 mt-1 opacity-70">
                               <div className="w-1 h-1 rotate-45 border border-[#E3007E]/60"></div>
                               <div className="w-5 h-[0.5px] bg-[#E3007E]/30"></div>
                               <div className="w-1 h-1 rotate-45 border border-[#E3007E]/60"></div>
                            </div>
                          </div>
                        ) : card.type === 'Poupança' ? (
                          <Landmark size={32} className="text-white drop-shadow-md" />
                        ) : (
                          <CreditCard size={32} className="text-white drop-shadow-md" />
                        )}
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">{card.name}</span>
                          <Wifi className="text-white/70 rotate-90 mt-1" size={24} />
                        </div>
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
                        <p className="text-white/70 text-xs font-medium uppercase tracking-widest">Saldo Disponível</p>
                        <h2 className="text-4xl font-mono font-black tracking-tight">{card.balance.toLocaleString('pt-AO')} Kz</h2>
                    </div>

                    <div className="flex justify-between items-end">
                        <div className="space-y-1 flex-1">
                            <p className="text-[10px] text-white/70 uppercase font-bold">Titular</p>
                            {editingHolderId === card.id ? (
                              <div className="flex items-center gap-2">
                                <input 
                                  autoFocus
                                  value={tempHolderName}
                                  onChange={(e) => setTempHolderName(e.target.value)}
                                  onBlur={() => saveHolderName(card.id)}
                                  onKeyDown={(e) => e.key === 'Enter' && saveHolderName(card.id)}
                                  className="bg-white/20 border-none rounded px-2 py-0.5 font-bold text-lg tracking-wide uppercase outline-none w-full max-w-[200px]"
                                />
                                <button onClick={() => saveHolderName(card.id)} className="p-1 hover:bg-white/20 rounded">
                                  <Check size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group/holder cursor-pointer" onClick={() => startEditingHolder(card)}>
                                <p className="font-bold text-lg tracking-wide uppercase">{card.holder}</p>
                                <Edit2 size={14} className="opacity-0 group-hover/holder:opacity-100 transition-opacity" />
                              </div>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-white/70 uppercase font-bold">Validade</p>
                            <p className="font-bold">{card.validity}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-3">
                <button 
                    onClick={() => openTransactionModal('deposit', card.id)}
                    className={`flex-1 py-3 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm ${
                      card.type === 'Poupança' 
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white' 
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#003366] dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                    {card.type === 'Poupança' ? <PlusCircle size={20} /> : <ArrowDownLeft size={20} />} Depositar
                </button>
                <button 
                    onClick={() => openTransactionModal('withdraw', card.id)}
                    className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
                >
                    {card.type === 'Poupança' ? <MinusCircle size={20} /> : <ArrowUpRight size={20} />} Debitar
                </button>
                {card.id !== 'main' && card.id !== 'savings' && (
                  <button 
                    onClick={() => confirmDeleteCard(card.id)}
                    className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl hover:bg-red-100 transition-all active:scale-95"
                    title="Eliminar Cartão"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* SECÇÃO INFERIOR: DETALHES E HISTÓRICO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        <SoftCard 
          className="flex items-center gap-4 cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => { triggerHaptic('selection'); setShowCashTPAModal({ isOpen: true, type: 'Cash' }); }}
        >
          <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl">
            <Wallet size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Em Cash (Mão)</p>
            <p className="text-2xl font-black text-[#003366] dark:text-white">{cashBalance.toLocaleString('pt-AO')} Kz</p>
          </div>
        </SoftCard>

        <SoftCard 
          className="flex items-center gap-4 cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => { triggerHaptic('selection'); setShowCashTPAModal({ isOpen: true, type: 'TPA' }); }}
        >
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
            <CreditCard size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Em TPA (Banco)</p>
            <p className="text-2xl font-black text-[#003366] dark:text-white">{tpaBalance.toLocaleString('pt-AO')} Kz</p>
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

      {/* --- MODAL: CRIAR CARTÃO --- */}
      {showCreateCardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setShowCreateCardModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-bold text-[#003366] dark:text-white mb-6 flex items-center gap-2">
              <PlusCircle className="text-blue-500" /> Criar Novo Cartão
            </h2>

            <form onSubmit={handleCreateCard} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nome do Cartão</label>
                <input 
                  type="text"
                  required
                  value={newCard.name}
                  onChange={(e) => setNewCard({...newCard, name: e.target.value})}
                  placeholder="Ex: Cartão de Emergência"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border-none soft-ui-inset font-medium dark:text-white focus:ring-2 focus:ring-[#003366] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Titular</label>
                <input 
                  type="text"
                  required
                  value={newCard.holder}
                  onChange={(e) => setNewCard({...newCard, holder: e.target.value})}
                  placeholder="Ex: João Silva"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border-none soft-ui-inset font-medium dark:text-white focus:ring-2 focus:ring-[#003366] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Tipo</label>
                  <select 
                    value={newCard.type}
                    onChange={(e) => setNewCard({...newCard, type: e.target.value as any})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border-none soft-ui-inset font-medium dark:text-white focus:ring-2 focus:ring-[#003366] outline-none"
                  >
                    <option value="Corrente">Corrente</option>
                    <option value="Poupança">Poupança</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Saldo Inicial (Kz)</label>
                  <input 
                    type="text"
                    inputMode="numeric"
                    value={initialBalance}
                    onChange={(e) => handleAmountChange(e, setInitialBalance)}
                    placeholder="0"
                    className="w-full p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border-none soft-ui-inset font-medium dark:text-white focus:ring-2 focus:ring-[#003366] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-3 block flex items-center gap-2">
                  <Palette size={14} /> Cor do Cartão
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {cardColors.map((color) => (
                    <button
                      key={color.class}
                      type="button"
                      onClick={() => setNewCard({...newCard, color: color.class})}
                      className={`h-12 rounded-xl border-2 transition-all ${newCard.color === color.class ? 'border-[#003366] scale-110 shadow-md' : 'border-transparent opacity-70'} ${color.class}`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-[#003366] text-white font-black rounded-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4"
              >
                Confirmar Criação
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: DÉBITO CASH / TPA --- */}
      {showCashTPAModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl relative">
            <button 
              onClick={() => setShowCashTPAModal({ isOpen: false, type: null })}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-bold text-red-600 mb-1 flex items-center gap-2">
              <ArrowUpRight /> Debitar de {showCashTPAModal.type}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              O valor será retirado do saldo de {showCashTPAModal.type === 'Cash' ? 'Mão' : 'Banco'}.
            </p>

            <form onSubmit={handleCashTPADebit} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Valor a Debitar (Kz)</label>
                <input 
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  required
                  value={cashTPAAmount}
                  onChange={(e) => handleAmountChange(e, setCashTPAAmount)}
                  placeholder="Ex: 10 000"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border-none soft-ui-inset font-black text-xl text-red-600 focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block flex items-center gap-1">
                  <FileText size={14} /> Nota / Descrição (Obrigatória)
                </label>
                <textarea 
                  required
                  value={cashTPANote}
                  onChange={(e) => setCashTPANote(e.target.value)}
                  placeholder="Ex: Fecho de TPA, Depósito em Cartão, Pagamento..."
                  className="w-full p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border-none soft-ui-inset text-sm font-medium dark:text-white resize-none"
                  rows={3}
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-red-500 text-white font-black rounded-xl shadow-xl hover:bg-red-600 active:scale-95 transition-all mt-2"
              >
                Confirmar Débito
              </button>
            </form>
          </div>
        </div>
      )}

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
                {transType === 'deposit' ? 'Depositar' : 'Debitar'} em {cards.find(c => c.id === targetAccount)?.name}
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
                      onChange={(e) => handleAmountChange(e, setAmount)}
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
                        ? (cards.find(c => c.id === targetAccount)?.type === 'Poupança' ? 'bg-gradient-to-r from-amber-500 to-yellow-600' : 'bg-[#003366]')
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

      {/* --- MODAL: CONFIRMAR ELIMINAÇÃO DE CARTÃO --- */}
      {showDeleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden relative border border-slate-100 dark:border-slate-700">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-[#003366] dark:text-white mb-2">Eliminar Cartão?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                Tem certeza que deseja eliminar o cartão <span className="font-bold text-slate-800 dark:text-slate-200">"{cards.find(c => c.id === showDeleteConfirm.cardId)?.name}"</span>? 
                Esta ação não pode ser desfeita, mas o histórico de transações será preservado.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDeleteCard}
                  disabled={isDeleting}
                  className={`w-full py-4 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-200 dark:shadow-none hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-2 ${isDeleting ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                  {isDeleting ? 'Eliminando...' : 'Confirmar Eliminação'}
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm({ isOpen: false, cardId: null })}
                  disabled={isDeleting}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all"
                >
                  Cancelar
                </button>
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
                    <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>Marguel CGPS (SU) Lda</span>
                </div>
            </div>
        </footer>
    </div>
  );
};

export default AccountStatus;
