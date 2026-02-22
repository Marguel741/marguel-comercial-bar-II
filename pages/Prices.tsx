
import React, { useState, useMemo, useEffect } from 'react';
import { DollarSign, Search, CheckCircle, X, ShoppingCart, Package, Plus, Minus, ArrowRight, FileText, Printer, ChevronUp, ChevronDown, Save, History } from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { useProducts } from '../contexts/ProductContext';
import { useLayout } from '../contexts/LayoutContext';
import { useAuth } from '../App';
import { PriceHistoryLog } from '../types';

const Prices: React.FC = () => {
  const { products, categories, updateProduct, isDayLocked, systemDate } = useProducts();
  const { sidebarMode, triggerHaptic } = useLayout(); 
  const { user } = useAuth();
  
  const canManagePrices = user?.permissions?.managePrices === true;
  const isLocked = isDayLocked(systemDate);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });
  const [editingPrices, setEditingPrices] = useState<Record<string, { buy?: string, sell?: string, packBuy?: string }>>({});
  const [isTableExpanded, setIsTableExpanded] = useState(true);

  // --- STATES SIMULAÇÃO ---
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [simulationStep, setSimulationStep] = useState<'select' | 'summary'>('select');
  const [simSearchTerm, setSimSearchTerm] = useState('');
  const [simCategory, setSimCategory] = useState('Todos');
  const [simulationCart, setSimulationCart] = useState<Record<string, number>>({});

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const filterCategories = useMemo(() => ['Todos', ...categories], [categories]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const filteredSimulationProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(simSearchTerm.toLowerCase());
      const matchesCategory = simCategory === 'Todos' || p.category === simCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, simSearchTerm, simCategory]);

  const formatNumberWithSpaces = (value: string) => value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const parseFormattedNumber = (value: string) => parseFloat(value.replace(/\s/g, '')) || 0;
  const getPackCost = (product: any): number => (product.buyPrice || 0) * (product.packSize || 1);

  const calculateSimulationTotal = () => {
    let total = 0;
    Object.entries(simulationCart).forEach(([id, qty]) => {
      const product = products.find(p => p.id === id);
      if (product) total += getPackCost(product) * Number(qty);
    });
    return total;
  };

  const handleInputChange = (productId: string, field: 'buy' | 'sell', value: string) => {
    if (!canManagePrices || isLocked) return;
    setEditingPrices(prev => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: formatNumberWithSpaces(value) }
    }));
  };

  const handleSave = (productId: string, productName: string) => {
    if (isLocked) { alert("Dia Bloqueado."); return; }
    if (!canManagePrices) return;
    
    const updates = editingPrices[productId];
    const currentProduct = products.find(p => p.id === productId);
    if (!updates || !currentProduct) return;

    const finalUpdates: any = {};
    if (updates.buy !== undefined) finalUpdates.buyPrice = parseFormattedNumber(updates.buy);
    if (updates.sell !== undefined) finalUpdates.sellPrice = parseFormattedNumber(updates.sell);

    updateProduct(productId, finalUpdates);
    showToast(`Preços de ${productName} atualizados!`);
    setEditingPrices(prev => { const newState = { ...prev }; delete newState[productId]; return newState; });
  };

  const updateSimulationCart = (productId: string, delta: number) => {
    setSimulationCart(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      const newCart = { ...prev, [productId]: newQty };
      if (newQty === 0) delete newCart[productId];
      return newCart;
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-24 relative">
        {toast.show && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-[#003366] text-white px-6 py-3 rounded-full font-bold shadow-2xl flex gap-2">
                <CheckCircle size={18} /> {toast.message}
            </div>
        )}

        <header className="mb-8">
            <h1 className="text-3xl font-bold text-[#003366] dark:text-white">Gestão de Preços</h1>
        </header>

        <div className="grid grid-cols-1 gap-6 animate-fade-in">
            <SoftCard className="p-0 overflow-hidden border border-slate-100 dark:border-slate-700">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center cursor-pointer" onClick={() => setIsTableExpanded(!isTableExpanded)}>
                    <h3 className="font-bold text-[#003366] dark:text-white flex items-center gap-2"><DollarSign size={20}/> Tabela de Produtos</h3>
                    {isTableExpanded ? <ChevronUp/> : <ChevronDown/>}
                </div>
                {isTableExpanded && (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-700 border-b border-slate-100 dark:border-slate-600">
                                    <th className="p-6 font-bold text-[#003366] dark:text-white text-xs uppercase tracking-wider">Produto</th>
                                    <th className="p-6 font-bold text-[#003366] dark:text-white text-xs uppercase tracking-wider">Venda (Unit)</th>
                                    <th className="p-6 font-bold text-[#003366] dark:text-white text-xs uppercase tracking-wider text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                {filteredProducts.map((p) => {
                                    const currentEdit = editingPrices[p.id] || {};
                                    const displaySell = currentEdit.sell !== undefined ? currentEdit.sell : formatNumberWithSpaces(p.sellPrice.toString());
                                    const hasChanged = currentEdit.sell !== undefined;

                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="p-6 font-bold text-slate-800 dark:text-white">{p.name}</td>
                                            <td className="p-6">
                                                <input 
                                                    type="text" 
                                                    disabled={!canManagePrices || isLocked}
                                                    value={displaySell}
                                                    onChange={(e) => handleInputChange(p.id, 'sell', e.target.value)}
                                                    className="bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg p-2 w-32 font-bold text-[#003366] dark:text-white"
                                                />
                                            </td>
                                            <td className="p-6 text-center">
                                                <button onClick={() => handleSave(p.id, p.name)} disabled={!hasChanged} className={`p-2 rounded-lg ${hasChanged ? 'bg-[#003366] text-white' : 'bg-slate-100 text-slate-300'}`}><Save size={20}/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </SoftCard>
        </div>

        <div className="mt-8">
            <SoftCard className="bg-[#003366] text-white flex flex-col items-center gap-6 p-8 text-center">
                <ShoppingCart size={48} />
                <h3 className="text-2xl font-black">Simular Proposta</h3>
                <button onClick={() => { setShowSimulationModal(true); setSimulationStep('select'); }} className="pill-button px-10 py-4 bg-white text-[#003366] font-black">
                    Iniciar Simulação
                </button>
            </SoftCard>
        </div>

        {showSimulationModal && (
            <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
                <div className="bg-[#F8FAFC] dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden">
                    <div className="bg-white dark:bg-slate-800 p-6 border-b dark:border-slate-700 flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-[#003366] dark:text-white">Simulador</h2>
                        <button onClick={() => setShowSimulationModal(false)}><X size={24} className="text-slate-400"/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {simulationStep === 'select' ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {filteredSimulationProducts.map(p => (
                                    <div key={p.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <p className="font-bold text-sm text-[#003366] dark:text-white truncate">{p.name}</p>
                                        <div className="flex justify-between items-end mt-2">
                                            <span className="text-xs text-slate-500">{getPackCost(p).toLocaleString()} Kz</span>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => updateSimulationCart(p.id, -1)} className="bg-slate-100 rounded p-1"><Minus size={12}/></button>
                                                <span className="font-bold text-sm">{simulationCart[p.id] || 0}</span>
                                                <button onClick={() => updateSimulationCart(p.id, 1)} className="bg-[#003366] text-white rounded p-1"><Plus size={12}/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead><tr className="text-left text-slate-500"><th>Produto</th><th>Qtd</th><th className="text-right">Total</th></tr></thead>
                                <tbody className="divide-y">
                                    {Object.entries(simulationCart).map(([id, qty]) => {
                                        const p = products.find(prod => prod.id === id);
                                        if(!p) return null;
                                        return (
                                            <tr key={id}>
                                                <td className="py-2">{p.name}</td>
                                                <td className="py-2 font-bold">{qty}</td>
                                                <td className="py-2 text-right">{(getPackCost(p) * Number(qty)).toLocaleString()} Kz</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="font-black text-lg border-t border-black"><td colSpan={2} className="py-4">Total</td><td className="py-4 text-right">{calculateSimulationTotal().toLocaleString()} Kz</td></tr>
                                </tfoot>
                            </table>
                        )}
                    </div>

                    <div className="p-6 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex justify-between items-center">
                        <div className="font-black text-2xl text-[#003366] dark:text-white">{calculateSimulationTotal().toLocaleString()} Kz</div>
                        <div className="flex gap-3">
                            {simulationStep === 'summary' && (
                                <button onClick={() => setSimulationStep('select')} className="px-6 py-3 bg-slate-100 rounded-xl font-bold">Voltar e Editar</button>
                            )}
                            {simulationStep === 'select' ? (
                                <button onClick={() => setSimulationStep('summary')} disabled={calculateSimulationTotal() === 0} className="px-8 py-3 bg-[#003366] text-white rounded-xl font-bold shadow-lg">Gerar Proposta</button>
                            ) : (
                                <button onClick={() => window.print()} className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg">Imprimir</button>
                            )}
                        </div>
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

export default Prices;
