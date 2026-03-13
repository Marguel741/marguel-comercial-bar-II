import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Plus, Wallet, FileText, Camera, Tag, X, Trash2, Calendar, 
  User, Paperclip, Check, Eye, Printer, Search, StickyNote, 
  CheckCircle, Edit2, Save, ArrowLeft, Image as ImageIcon 
} from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { useLayout } from '../contexts/LayoutContext';
import SyncStatus from '../components/SyncStatus';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductContext';
import { hasPermission } from '../src/utils/permissions';
import { formatDisplayDate, formatDateISO } from '../src/utils';
import { Expense } from '../types';

const Expenses: React.FC = () => {
  const { sidebarMode, triggerHaptic } = useLayout();
  const { user } = useAuth();
  const { 
    expenses, 
    addExpense, 
    deleteExpense, 
    updateExpense, 
    systemDate, 
    getSystemDate,
    isDayLocked, 
    processTransaction,
    expenseCategories,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory
  } = useProducts();

  const isLocked = isDayLocked(systemDate);

  const activeExpenseCategories = useMemo(() => 
    expenseCategories.filter(cat => cat.isActive), 
    [expenseCategories]
  );

  // --- Estados ---
  // Formulário
  const [formData, setFormData] = useState({ title: '', amount: '', category: '', notes: '' });
  
  useEffect(() => {
    if (activeExpenseCategories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: activeExpenseCategories[0].name }));
    }
  }, [activeExpenseCategories]);

  // Múltiplos Anexos
  const [attachments, setAttachments] = useState<string[]>([]);
  // Feedback
  const [toast, setToast] = useState<{show: boolean, message: string}>({ show: false, message: '' });
  // Modais & Edição
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Expense | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [reportSearch, setReportSearch] = useState('');
  const [viewImageIndex, setViewImageIndex] = useState<number | null>(null);

  // Categoria Manager State
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---
  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  // --- Handlers ---
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (attachments.length >= 4) {
        triggerHaptic('error');
        showToast('Máximo de 4 anexos permitidos.');
        return;
      }
      triggerHaptic('impact');
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
    // Limpar input para permitir selecionar o mesmo arquivo novamente se necessário
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    triggerHaptic('warning');
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewExpenseClick = () => {
    if (isLocked) {
      showToast('Dia bloqueado para novos registros.');
      return;
    }
    triggerHaptic('selection');
    setFormData({ title: '', amount: '', category: activeExpenseCategories[0]?.name || '', notes: '' });
    setAttachments([]);
    titleInputRef.current?.focus();
    // Scroll to top on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegisterExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      showToast('Dia bloqueado.');
      return;
    }
    if (!formData.title || !formData.amount) {
      triggerHaptic('error');
      return;
    }
    
    triggerHaptic('success');
    const amountVal = parseFloat(formData.amount);
    
    const now = getSystemDate();
    const newExpense: Expense = {
      id: Date.now().toString(),
      title: formData.title,
      amount: amountVal,
      category: formData.category,
      date: formatDateISO(now),
      timestamp: now.getTime(),
      user: user?.name?.split(' ')[0] || 'Desconhecido',
      attachments: attachments,
      notes: formData.notes
    };

    addExpense(newExpense);
    showToast('Despesa registrada com sucesso!');
    
    // Reset Form
    setFormData({ title: '', amount: '', category: activeExpenseCategories[0]?.name || '', notes: '' });
    setAttachments([]);
  };

  const handleDeleteExpense = (id: string) => {
    if (isLocked) {
      showToast('Dia bloqueado.');
      return;
    }
    if (window.confirm("Tem certeza que deseja apagar este registo? O valor será devolvido à Conta Corrente.")) {
      triggerHaptic('warning');
      deleteExpense(id, user?.name || 'Sistema');
      if (selectedExpense?.id === id) setSelectedExpense(null);
      showToast('Despesa removida e valor revertido.');
    }
  };

  // --- Lógica de Edição ---
  const handleStartEdit = () => {
    if (isLocked) {
      showToast('Dia bloqueado.');
      return;
    }
    if (selectedExpense) {
      setEditData({ ...selectedExpense });
      setIsEditing(true);
      triggerHaptic('selection');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData(null);
  };

  const handleSaveEdit = () => {
    if (isLocked) {
      showToast('Dia bloqueado.');
      return;
    }
    if (!editData || !editData.title || !editData.amount) {
      triggerHaptic('error');
      return;
    }
    
    // Se o valor mudou, precisamos ajustar a transação? 
    // Para simplificar, vamos apenas atualizar os dados da despesa.
    // Em um sistema real, o ajuste de saldo seria mais complexo.
    
    updateExpense(editData);
    setSelectedExpense(editData); // Atualiza a visualização atual
    setIsEditing(false);
    triggerHaptic('success');
    showToast('Despesa atualizada com sucesso!');
  };

  // Cálculos para o relatório
  const filteredExpenses = useMemo(() => {
    return expenses.filter(ex => 
      ex.title.toLowerCase().includes(reportSearch.toLowerCase()) ||
      ex.category.toLowerCase().includes(reportSearch.toLowerCase()) ||
      ex.user.toLowerCase().includes(reportSearch.toLowerCase())
    );
  }, [expenses, reportSearch]);

  const totalFiltered = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Lógica de Visualização do Modal (Compacto vs Completo)
  const isCompactMode = sidebarMode === 'mini'; // Se o menu está aberto (mini), modal é compacto

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-24 relative">
      {/* GLOBAL TOAST */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-slide-up">
          <div className="bg-[#003366] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold text-sm">
            <CheckCircle size={18} className="text-green-400" />
            {toast.message}
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className={`transition-all duration-300 ${sidebarMode === 'hidden' ? 'pl-16 md:pl-20' : ''}`}>
          <h1 className="text-3xl font-bold text-[#003366]">Despesas</h1>
          <p className="text-slate-500">Controlo de custos e pagamentos</p>
        </div>
        <div className="flex-1 flex items-center justify-center md:justify-end w-full md:w-auto gap-4">
          <SyncStatus />
          {hasPermission(user, 'expenses_category_manage') && (
            <button 
              onClick={() => setShowCategoryManager(true)}
              className="p-3 bg-white text-[#003366] border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 font-bold text-xs"
            >
              <Tag size={16} /> Categorias
            </button>
          )}
          {hasPermission(user, 'expenses_execute') && (
            <button 
              onClick={handleNewExpenseClick}
              className="pill-button px-6 py-3 bg-red-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-100 w-full md:w-auto hover:bg-red-600 transition-all active:scale-95"
            >
              <Plus size={20} /> Nova Despesa
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* --- FORMULÁRIO DE REGISTRO --- */}
        {hasPermission(user, 'expenses_execute') ? (
          <SoftCard className={`space-y-6 h-fit ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="font-bold text-[#003366] flex items-center gap-2">
              <Wallet size={20} /> Registo Rápido
            </h3>
            <form onSubmit={handleRegisterExpense} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Título da Despesa</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    ref={titleInputRef}
                    type="text" 
                    value={formData.title} 
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Ex: Pagamento Água" 
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none soft-ui-inset pl-12 focus:ring-2 focus:ring-[#003366] outline-none transition-all" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Valor (Kz)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Kz</div>
                    <input 
                      type="number" 
                      value={formData.amount} 
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      placeholder="0" 
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none soft-ui-inset pl-12 font-bold text-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all" 
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600 dark:text-slate-400">Categoria</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-700 border-none outline-none focus:ring-2 focus:ring-[#003366] dark:text-white"
                  >
                    <option value="">Selecione uma categoria</option>
                    {activeExpenseCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Novo Campo de Nota */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <StickyNote size={12} /> Nota de Esclarecimento
                </label>
                <textarea 
                  value={formData.notes} 
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Detalhes adicionais, justificativa ou observações sobre esta despesa..." 
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none soft-ui-inset focus:ring-2 focus:ring-[#003366] outline-none transition-all resize-none text-sm" 
                  rows={2} 
                />
              </div>

              {/* Upload Section (Multiple) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Comprovativos ({attachments.length}/4)</label>
                  {attachments.length > 0 && (
                    <button type="button" onClick={() => setAttachments([])} className="text-[10px] text-red-500 font-bold hover:underline">Limpar Tudo</button>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileSelect} />
                <div className="grid grid-cols-4 gap-2">
                  {/* Miniaturas */}
                  {attachments.map((att, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group bg-slate-100">
                      <img src={att} alt={`Anexo ${idx+1}`} className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => removeAttachment(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {/* Botão de Adicionar (Se < 4) */}
                  {attachments.length < 4 && (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-[#003366] hover:border-[#003366] hover:bg-blue-50 transition-all cursor-pointer"
                    >
                      <Camera size={20} />
                      <span className="text-[9px] font-bold">Adicionar</span>
                    </div>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full pill-button py-4 bg-[#003366] text-white font-bold text-lg mt-4 shadow-xl shadow-blue-200 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Check size={20} /> Registrar Despesa
              </button>
            </form>
          </SoftCard>
        ) : (
          <SoftCard className="flex flex-col items-center justify-center text-center p-12 space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
              <Wallet size={40} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Acesso Restrito</h3>
              <p className="text-slate-500 text-sm">Você não tem permissão para registrar novas despesas.</p>
            </div>
          </SoftCard>
        )}

        {/* --- LISTA DE HISTÓRICO --- */}
        <div className="space-y-6 flex flex-col h-full">
          <div className="flex justify-between items-end">
            <h3 className="font-bold text-[#003366]">Histórico Recente</h3>
            <span className="text-xs text-slate-400 font-medium">Últimos registos</span>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 max-h-[600px] pr-2">
            {expenses.slice(0, 5).map((ex) => (
              <SoftCard 
                key={ex.id} 
                onClick={() => {
                  triggerHaptic('selection');
                  setSelectedExpense(ex);
                  setIsEditing(false);
                }}
                className="flex justify-between items-center border-l-4 border-red-500 cursor-pointer hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 text-red-500 rounded-2xl group-hover:scale-110 transition-transform">
                    <Wallet size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-[#003366] group-hover:underline">{ex.title}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase">
                      <span>{formatDisplayDate(ex.date)}</span>
                      <span>•</span>
                      <span>{ex.category}</span>
                      {ex.attachments && ex.attachments.length > 0 && (
                        <span className="flex items-center gap-1 bg-slate-100 px-1.5 rounded text-slate-500">
                          <Paperclip size={10} /> {ex.attachments.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-red-500">{(ex.amount || 0).toLocaleString('pt-AO')} Kz</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Por {ex.user}</p>
                </div>
              </SoftCard>
            ))}

            {expenses.length === 0 && (
              <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                <Wallet size={48} className="mx-auto mb-2 opacity-20" />
                <p>Nenhuma despesa registrada.</p>
              </div>
            )}
          </div>

          <button 
            onClick={() => {
              triggerHaptic('selection');
              setShowFullReport(true);
            }}
            className="w-full py-4 text-slate-500 font-bold bg-white border border-slate-200 rounded-2xl hover:text-[#003366] hover:border-[#003366] transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <FileText size={20} /> Ver Relatório Completo de Custos
          </button>
        </div>
      </div>

      {/* --- MODAL DETALHES DA DESPESA (RESPONSIVO/INTERATIVO/EDITÁVEL) --- */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div className={`bg-white rounded-[32px] w-full shadow-2xl relative overflow-hidden flex flex-col transition-all duration-300 ${isCompactMode ? 'max-w-sm max-h-[85vh]' : 'max-w-3xl max-h-[90vh]'}`}>
            {/* Header */}
            <div className={`${isCompactMode ? 'p-6 bg-red-500' : 'p-8 bg-gradient-to-r from-red-500 to-red-600'} text-white relative shrink-0`}>
              <button 
                onClick={() => setSelectedExpense(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors z-20"
              >
                <X size={20} />
              </button>
              
              {isEditing && editData ? (
                // MODO EDIÇÃO - HEADER
                <div className="space-y-3">
                  <div className="bg-white/10 rounded-xl p-2">
                    <label className="text-[10px] font-bold text-red-100 uppercase block mb-1">Categoria</label>
                    <select 
                      value={editData.category} 
                      onChange={(e) => setEditData({...editData, category: e.target.value})}
                      className="w-full bg-white text-[#003366] rounded-lg p-2 font-bold outline-none text-sm"
                    >
                      {activeExpenseCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2">
                    <label className="text-[10px] font-bold text-red-100 uppercase block mb-1">Título</label>
                    <input 
                      type="text" 
                      value={editData.title} 
                      onChange={(e) => setEditData({...editData, title: e.target.value})}
                      className="w-full bg-transparent border-b border-white/50 text-white font-black text-2xl outline-none placeholder-white/50"
                    />
                  </div>
                  <div className="bg-white/10 rounded-xl p-2">
                    <label className="text-[10px] font-bold text-red-100 uppercase block mb-1">Valor (Kz)</label>
                    <input 
                      type="number" 
                      value={editData.amount} 
                      onChange={(e) => setEditData({...editData, amount: parseFloat(e.target.value)})}
                      className="w-full bg-transparent border-b border-white/50 text-white font-black text-3xl outline-none placeholder-white/50"
                    />
                  </div>
                </div>
              ) : (
                // MODO VISUALIZAÇÃO - HEADER
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-red-100 font-bold text-xs uppercase tracking-widest mb-1">{selectedExpense.category}</p>
                      <h2 className={`${isCompactMode ? 'text-2xl' : 'text-3xl'} font-black leading-tight`}>{selectedExpense.title}</h2>
                    </div>
                    {!isCompactMode && (
                      <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                        <Wallet size={32} className="text-white opacity-80" />
                      </div>
                    )}
                  </div>
                  <p className={`${isCompactMode ? 'text-3xl mt-2' : 'text-5xl mt-4'} font-black opacity-90 tracking-tighter`}>{(selectedExpense.amount || 0).toLocaleString('pt-AO')} Kz</p>
                </>
              )}
            </div>

            <div className={`p-6 overflow-y-auto custom-scrollbar ${isCompactMode ? 'space-y-4' : 'space-y-6'}`}>
              {/* Layout Grid muda baseado no modo */}
              <div className={`grid ${isCompactMode ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-6'}`}>
                {/* Detalhes Básicos */}
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><Calendar size={12} /> Data</p>
                      <p className="font-bold text-slate-800">{selectedExpense.date}</p>
                    </div>
                    {!isCompactMode && <Calendar className="text-slate-200" size={24} />}
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><User size={12} /> Registado Por</p>
                      <p className="font-bold text-slate-800">{selectedExpense.user}</p>
                    </div>
                    {!isCompactMode && <User className="text-slate-200" size={24} />}
                  </div>
                </div>

                {/* Nota de Esclarecimento */}
                <div className={`bg-amber-50 border border-amber-100 rounded-2xl p-4 ${isCompactMode ? '' : 'row-span-2'}`}>
                  <p className="text-xs font-bold text-amber-500 uppercase mb-2 flex items-center gap-1">
                    <StickyNote size={12} /> Nota de Esclarecimento
                  </p>
                  {isEditing && editData ? (
                    <textarea 
                      value={editData.notes || ''} 
                      onChange={(e) => setEditData({...editData, notes: e.target.value})}
                      className="w-full bg-white rounded-lg p-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-amber-300 min-h-[80px]"
                      placeholder="Adicionar nota..."
                    />
                  ) : (
                    <p className="text-amber-900 text-sm font-medium leading-relaxed italic">
                      "{selectedExpense.notes || 'Sem notas adicionais.'}"
                    </p>
                  )}
                </div>
              </div>

              {/* Anexos / Comprovativos */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-bold text-[#003366] flex items-center gap-2">
                    <Paperclip size={16} /> Comprovativos
                  </p>
                  {isCompactMode && selectedExpense.attachments?.length > 0 && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                      {selectedExpense.attachments.length} Anexo(s)
                    </span>
                  )}
                </div>
                {selectedExpense.attachments && selectedExpense.attachments.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedExpense.attachments.map((att, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setViewImageIndex(idx)}
                        className="aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 cursor-pointer hover:opacity-80 transition-opacity relative group"
                      >
                        <img src={att} alt={`Anexo ${idx+1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="text-white" size={24} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center text-slate-400 italic text-sm">
                    Nenhum arquivo anexado a esta despesa.
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-2">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleCancelEdit}
                      className="flex-1 py-4 text-slate-500 font-bold bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft size={18} /> Cancelar
                    </button>
                    <button 
                      onClick={handleSaveEdit}
                      className="flex-1 py-4 text-white font-bold bg-green-600 rounded-2xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                    >
                      <Save size={18} /> Salvar Alterações
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={handleStartEdit}
                      className="flex-1 py-4 text-[#003366] font-bold bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 border border-blue-100"
                    >
                      <Edit2 size={18} /> Editar
                    </button>
                    <button 
                      onClick={() => handleDeleteExpense(selectedExpense.id)}
                      className="flex-1 py-4 text-red-500 font-bold bg-red-50 rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2 border border-red-100"
                    >
                      <Trash2 size={18} /> Apagar
                    </button>
                  </>
                )}
              </div>
              {isCompactMode && !isEditing && (
                <p className="text-center text-[10px] text-slate-400 font-medium">
                  Dica: Oculte o menu lateral para ver mais detalhes.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE VISUALIZAÇÃO DE IMAGEM FULLSCREEN --- */}
      {viewImageIndex !== null && selectedExpense && selectedExpense.attachments && (
        <div 
          className="fixed inset-0 bg-black/90 z-[90] flex items-center justify-center animate-fade-in"
          onClick={() => setViewImageIndex(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img src={selectedExpense.attachments[viewImageIndex]} alt="Full view" className="max-w-full max-h-full rounded-lg shadow-2xl" />
            <button 
              className="absolute -top-12 right-0 text-white hover:text-red-400"
              onClick={() => setViewImageIndex(null)}
            >
              <X size={32} />
            </button>
            {selectedExpense.attachments.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {selectedExpense.attachments.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`w-2 h-2 rounded-full transition-colors ${idx === viewImageIndex ? 'bg-white' : 'bg-white/40'}`} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL RELATÓRIO COMPLETO --- */}
      {showFullReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#F8FAFC] w-full max-w-5xl h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative">
            {/* Header Modal */}
            <div className="bg-white p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black text-[#003366] flex items-center gap-3">
                  <FileText size={28} /> Relatório de Custos
                </h2>
                <p className="text-slate-500 text-sm">Visão geral de todas as saídas</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="p-3 bg-slate-100 text-[#003366] rounded-xl hover:bg-blue-50 font-bold text-xs flex items-center gap-2">
                  <Printer size={16} /> Imprimir
                </button>
                <button 
                  onClick={() => setShowFullReport(false)}
                  className="p-3 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X size={28} />
                </button>
              </div>
            </div>

            {/* Filtros e Totais */}
            <div className="p-6 bg-white border-b border-slate-100 flex flex-col md:flex-row gap-6 items-center shrink-0">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Filtrar por nome, categoria ou usuário..." 
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border-none soft-ui-inset focus:ring-2 focus:ring-[#003366] outline-none"
                />
              </div>
              <div className="flex items-center gap-4 bg-red-50 px-6 py-3 rounded-2xl border border-red-100 shadow-sm w-full md:w-auto justify-between md:justify-start">
                <div className="flex items-center gap-2 text-red-500">
                  <Wallet size={20} />
                  <span className="text-xs font-bold uppercase">Total Filtrado</span>
                </div>
                <span className="text-2xl font-black text-red-600">{(totalFiltered || 0).toLocaleString('pt-AO')} Kz</span>
              </div>
            </div>

            {/* Tabela */}
            <div className="flex-1 overflow-auto custom-scrollbar p-6">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Data</th>
                      <th className="p-4">Descrição</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4">Nota</th>
                      <th className="p-4">Responsável</th>
                      <th className="p-4 text-right">Valor</th>
                      <th className="p-4 text-center">Anexos</th>
                      <th className="p-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredExpenses.length > 0 ? (
                      filteredExpenses.map((ex) => (
                        <tr key={ex.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 text-slate-500 font-medium whitespace-nowrap">{formatDisplayDate(ex.date)}</td>
                          <td className="p-4 font-bold text-[#003366]">{ex.title}</td>
                          <td className="p-4">
                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                              {ex.category}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500 italic max-w-xs truncate">
                            {ex.notes || '-'}
                          </td>
                          <td className="p-4 text-slate-600 flex items-center gap-2">
                            <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold">
                              {ex.user.charAt(0)}
                            </div>
                            {ex.user}
                          </td>
                          <td className="p-4 text-right font-black text-red-500 whitespace-nowrap">
                            {(ex.amount || 0).toLocaleString('pt-AO')} Kz
                          </td>
                          <td className="p-4 text-center">
                            {ex.attachments && ex.attachments.length > 0 ? (
                              <div className="flex items-center justify-center gap-1 text-green-600">
                                <Paperclip size={14} />
                                <span className="font-bold text-xs">{ex.attachments.length}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => {
                                setSelectedExpense(ex);
                                setShowFullReport(false);
                              }}
                              className="p-2 text-slate-400 hover:text-[#003366] hover:bg-slate-200 rounded-lg transition-colors"
                              title="Ver Detalhes"
                            >
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400 italic">
                          Nenhuma despesa encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL GESTÃO DE CATEGORIAS --- */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-[#003366] flex items-center gap-2">
                <Tag size={24} /> Categorias Financeiras
              </h2>
              <button 
                onClick={() => setShowCategoryManager(false)}
                className="p-2 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Adicionar Nova */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nova Categoria</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Ex: Marketing"
                    className="flex-1 p-3 bg-slate-100 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#003366]"
                  />
                  <button 
                    onClick={() => {
                      if (!newCatName.trim()) return;
                      addExpenseCategory({ name: newCatName.trim(), isActive: true });
                      setNewCatName('');
                      triggerHaptic('success');
                    }}
                    className="p-3 bg-[#003366] text-white rounded-xl hover:opacity-90 transition-all"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              {/* Lista */}
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {expenseCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                    {editingCatId === cat.id ? (
                      <div className="flex-1 flex gap-2">
                        <input 
                          type="text" 
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="flex-1 p-1 bg-white border border-slate-200 rounded outline-none"
                          autoFocus
                        />
                        <button 
                          onClick={() => {
                            updateExpenseCategory(cat.id, { name: editingCatName });
                            setEditingCatId(null);
                            triggerHaptic('success');
                          }}
                          className="text-green-600 hover:bg-green-50 p-1 rounded"
                        >
                          <Check size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${cat.isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <span className={`font-bold ${cat.isActive ? 'text-[#003366]' : 'text-slate-400 line-through'}`}>
                          {cat.name}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditingCatName(cat.name);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => updateExpenseCategory(cat.id, { isActive: !cat.isActive })}
                        className={`p-1.5 ${cat.isActive ? 'text-amber-500 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'} rounded-lg`}
                        title={cat.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {cat.isActive ? <X size={14} /> : <Check size={14} />}
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm(`Eliminar categoria "${cat.name}"?`)) {
                            deleteExpenseCategory(cat.id);
                            triggerHaptic('warning');
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setShowCategoryManager(false)}
                className="w-full py-3 bg-white border border-slate-200 text-[#003366] font-bold rounded-xl hover:bg-slate-100 transition-all"
              >
                Fechar
              </button>
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
            <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>Marguel CGPS (SU) Lda</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Expenses;
