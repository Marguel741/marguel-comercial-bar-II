
import React, { useState, useRef } from 'react';
import { Plus, Wallet, FileText, Camera, Tag, X, Trash2, Calendar, User, Paperclip, CheckCircle } from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { useLayout } from '../contexts/LayoutContext';
import { useAuth } from '../App';
import { useProducts } from '../contexts/ProductContext';
import { Expense } from '../types';

const Expenses: React.FC = () => {
  const { triggerHaptic } = useLayout();
  const { user } = useAuth();
  const { expenses, addExpense, deleteExpense, systemDate, isDayLocked, processTransaction } = useProducts(); 
  
  const isLocked = isDayLocked(systemDate);
  const [formData, setFormData] = useState({ title: '', amount: '', category: 'Operacional', notes: '' });
  const [attachments, setAttachments] = useState<string[]>([]);
  const [toast, setToast] = useState<{show: boolean, message: string}>({ show: false, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const handleRegisterExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) { alert('Dia Bloqueado.'); return; }
    if (!formData.title || !formData.amount) { triggerHaptic('error'); return; }

    triggerHaptic('success');
    const amountVal = parseFloat(formData.amount.replace(/\s/g, ''));

    const newExpense: Expense = {
      id: Date.now().toString(),
      title: formData.title,
      amount: amountVal,
      category: formData.category,
      date: systemDate.toLocaleDateString('pt-AO'),
      timestamp: systemDate.getTime(),
      user: user?.name?.split(' ')[0] || 'Desconhecido',
      attachments: attachments,
      notes: formData.notes
    };

    addExpense(newExpense);
    processTransaction('withdraw', 'main', amountVal, `Despesa: ${formData.title}`);
    showToast('Despesa registrada e debitada.');
    setFormData({ title: '', amount: '', category: 'Operacional', notes: '' });
    setAttachments([]);
  };

  const handleDelete = (id: string) => {
      if (isLocked) return;
      if (confirm("Apagar despesa?")) {
          deleteExpense(id);
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAttachments(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-24 relative">
      {toast.show && <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-[#003366] text-white px-6 py-3 rounded-full font-bold shadow-2xl flex gap-2"><CheckCircle size={18}/>{toast.message}</div>}

      <header>
         <h1 className="text-3xl font-bold text-[#003366] dark:text-white">Despesas</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="lg:col-span-1">
             <SoftCard className={`space-y-4 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                <h3 className="font-bold text-[#003366] flex items-center gap-2"><Plus/> Nova Despesa</h3>
                <form onSubmit={handleRegisterExpense} className="space-y-4">
                    <input type="text" placeholder="Título" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl" required />
                    <input type="text" placeholder="Valor (Kz)" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-red-500" required />
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl">
                        <option>Operacional</option><option>Pessoal</option><option>Stock</option><option>Outros</option>
                    </select>
                    <div className="flex gap-2">
                        <label className="p-3 bg-slate-100 rounded-xl cursor-pointer flex items-center gap-2 text-xs font-bold text-slate-500">
                            <Camera size={16}/> Comprovativo
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect}/>
                        </label>
                        <span className="text-xs self-center text-slate-400">{attachments.length} anexo(s)</span>
                    </div>
                    <button type="submit" className="w-full py-3 bg-[#003366] text-white font-bold rounded-xl shadow-lg hover:opacity-90">Registrar</button>
                </form>
             </SoftCard>
          </div>

          <div className="lg:col-span-1 space-y-4">
              {expenses.map(ex => (
                  <SoftCard key={ex.id} className="flex justify-between items-center border-l-4 border-red-500">
                      <div>
                          <p className="font-bold text-[#003366]">{ex.title}</p>
                          <p className="text-xs text-slate-400">{ex.date} • {ex.user}</p>
                      </div>
                      <div className="flex items-center gap-4">
                          <p className="font-black text-lg text-red-500">{ex.amount.toLocaleString()} Kz</p>
                          <button onClick={() => handleDelete(ex.id)} disabled={isLocked} className="text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                      </div>
                  </SoftCard>
              ))}
          </div>
      </div>

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

export default Expenses;
