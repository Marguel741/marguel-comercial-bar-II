
import React, { useState, useMemo, useEffect } from 'react';
import { Save, Calculator, DollarSign, Calendar, TrendingDown, AlertCircle, Wallet, CreditCard, ArrowRightLeft, CheckCircle, X, Send, Lock } from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { useProducts } from '../contexts/ProductContext';
import { useLayout } from '../contexts/LayoutContext';
import { useAuth } from '../App';
import { SalesReport } from '../types';

const Sales: React.FC = () => {
  const { products, getPurchasesByDate, salesReports, addSalesReport, updateProduct, systemDate, isDayLocked } = useProducts();
  const { triggerHaptic } = useLayout();
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(systemDate.toISOString().split('T')[0]);
  const [financials, setFinancials] = useState({ cash: '', transfer: '', ticket: '', lunch: '', discrepancyJustification: '' });
  
  const isLocked = isDayLocked(systemDate);

  const displaySelectedDate = useMemo(() => {
      const [year, month, day] = selectedDate.split('-');
      return `${day}/${month}/${year}`;
  }, [selectedDate]);

  const handleSubmit = () => {
      if (isLocked) { alert("Dia Bloqueado."); return; }
      triggerHaptic('success');
      
      const mCash = parseFloat(financials.cash) || 0;
      const totalLifted = mCash + (parseFloat(financials.transfer)||0) + (parseFloat(financials.ticket)||0);
      
      const newReport: SalesReport = {
          id: Date.now().toString(),
          date: displaySelectedDate,
          timestamp: Date.now(),
          totalExpected: 0,
          totalLifted: totalLifted,
          discrepancy: 0,
          cash: mCash,
          tpa: parseFloat(financials.ticket)||0,
          transfer: parseFloat(financials.transfer)||0,
          lunchExpense: parseFloat(financials.lunch)||0,
          notes: financials.discrepancyJustification,
          closedBy: user?.name || 'Sistema',
          itemsSummary: [],
      };
      
      addSalesReport(newReport);
      alert("Fecho registrado com sucesso!");
      setFinancials({ cash: '', transfer: '', ticket: '', lunch: '', discrepancyJustification: '' });
  };

  return (
    <div className="p-4 md:p-8 pb-32">
        <header className="mb-8">
            <h1 className="text-3xl font-bold text-[#003366] dark:text-white">Controle de Vendas</h1>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-white p-2 rounded mt-2"/>
        </header>

        <div className={`space-y-6 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            <SoftCard>
                <h3 className="font-bold mb-4">Registo de Valores</h3>
                <div className="space-y-4">
                    <input 
                        placeholder="Valor Cash" 
                        value={financials.cash} 
                        onChange={e => setFinancials({...financials, cash: e.target.value})}
                        className="w-full p-3 bg-slate-100 rounded font-bold"
                    />
                    <input 
                        placeholder="Valor TPA" 
                        value={financials.ticket} 
                        onChange={e => setFinancials({...financials, ticket: e.target.value})}
                        className="w-full p-3 bg-slate-100 rounded font-bold"
                    />
                    <input 
                        placeholder="Valor Transferência" 
                        value={financials.transfer} 
                        onChange={e => setFinancials({...financials, transfer: e.target.value})}
                        className="w-full p-3 bg-slate-100 rounded font-bold"
                    />
                    <textarea 
                        placeholder="Notas / Divergências"
                        value={financials.discrepancyJustification}
                        onChange={e => setFinancials({...financials, discrepancyJustification: e.target.value})}
                        className="w-full p-3 bg-slate-100 rounded"
                    />
                </div>
                <button onClick={handleSubmit} className="w-full mt-6 py-4 bg-[#003366] text-white font-bold rounded-xl shadow-lg">
                    {isLocked ? <Lock className="inline mr-2"/> : <Save className="inline mr-2"/>} Registrar Fecho
                </button>
            </SoftCard>
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

export default Sales;
