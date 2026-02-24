
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  DollarSign, History, Save, Info, Search, CheckCircle, X, ShoppingCart, 
  Package, Plus, Minus, ArrowRight, FileText, Printer, ChevronUp, 
  ChevronDown, MessageSquare, Copy, ArrowLeft, Lock, Trash2, FolderOpen, 
  Calendar, Folder, Clock, User, Eye, AlertTriangle, List, ArrowLeftCircle, 
  ClipboardCheck, ShoppingBag, Paperclip, Camera, Image as ImageIcon 
} from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { useProducts } from '../contexts/ProductContext';
import { useLayout } from '../contexts/LayoutContext';
import { useAuth } from '../App';
import { PriceHistoryLog, SavedProposal, PurchaseRecord } from '../types';
import { MGLogo } from '../constants';

interface ExtendedSavedProposal extends SavedProposal {
  createdBy?: string;
}

const Prices: React.FC = () => {
  const { products, categories, updateProduct, purchases, addPurchase, isDayLocked, systemDate } = useProducts();
  const { sidebarMode, triggerHaptic } = useLayout(); 
  const { user } = useAuth();
  const location = useLocation();
  
  const canManagePrices = user?.permissions?.managePrices === true;
  const canEditPurchases = user?.permissions?.canEditPurchases === true;
  const isLocked = isDayLocked(systemDate);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });
  const [editingPrices, setEditingPrices] = useState<Record<string, { buy?: number, sell?: number }>>({});
  
  const [priceHistory, setPriceHistory] = useState<PriceHistoryLog[]>(() => {
    try {
      const saved = localStorage.getItem('mg_price_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [viewHistoryId, setViewHistoryId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('mg_price_history', JSON.stringify(priceHistory));
  }, [priceHistory]);

  const [isTableExpanded, setIsTableExpanded] = useState(true);

  // --- STATES SIMULAÇÃO ---
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [simulationStep, setSimulationStep] = useState<'select' | 'summary' | 'message' | 'saved'>('select');
  const [simSearchTerm, setSimSearchTerm] = useState('');
  const [simCategory, setSimCategory] = useState('Todos');
  const [simulationCart, setSimulationCart] = useState<Record<string, number>>({});
  const [savedProposals, setSavedProposals] = useState<ExtendedSavedProposal[]>(() => {
    try {
      const saved = localStorage.getItem('mg_saved_proposals');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [proposalNameInput, setProposalNameInput] = useState('');
  const [showSaveProposalDialog, setShowSaveProposalDialog] = useState(false);
  const [isCurrentSimulationSaved, setIsCurrentSimulationSaved] = useState(false);
  const [showAlreadySavedModal, setShowAlreadySavedModal] = useState(false);
  const [previewProposal, setPreviewProposal] = useState<ExtendedSavedProposal | null>(null);
  const [showPreviewDetails, setShowPreviewDetails] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');

  // --- STATES COMPRAS (NOVO MÓDULO BCI) ---
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<'select' | 'summary' | 'history'>('select');
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState('');
  const [purchaseCategory, setPurchaseCategory] = useState('Todos');
  const [purchaseCart, setPurchaseCart] = useState<Record<string, number>>({});
  const [purchaseAttachments, setPurchaseAttachments] = useState<string[]>([]);

  // Estado para o Relatório de Compra Oficial (Visualizador)
  const [reportProposal, setReportProposal] = useState<ExtendedSavedProposal | PurchaseRecord | null>(null);
  const [viewImageIndex, setViewImageIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('mg_saved_proposals', JSON.stringify(savedProposals));
  }, [savedProposals]);

  // Auto-open Simulation Modal if passed in state
  useEffect(() => {
    if (location.state && (location.state as any).openSimulation) {
      setShowSimulationModal(true);
      setSimulationStep('select');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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

  const filteredPurchaseProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(purchaseSearchTerm.toLowerCase());
      const matchesCategory = purchaseCategory === 'Todos' || p.category === purchaseCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, purchaseSearchTerm, purchaseCategory]);

  // --- LOGIC: PRICES & SIMULATION ---
  const handleInputChange = (productId: string, field: 'buy' | 'sell', value: string) => {
    if (!canManagePrices) return;
    const numValue = parseFloat(value);
    setEditingPrices(prev => ({ ...prev, [productId]: { ...prev[productId], [field]: isNaN(numValue) ? 0 : numValue } }));
  };

  const handlePackPriceChange = (productId: string, packSize: number, packPriceStr: string) => {
    if (!canManagePrices) return;
    const packPrice = parseFloat(packPriceStr);
    if (isNaN(packPrice)) {
      handleInputChange(productId, 'buy', '0');
      return;
    }
    const unitPrice = packPrice / packSize;
    handleInputChange(productId, 'buy', unitPrice.toString());
  };

  const handleSave = (productId: string, productName: string) => {
    triggerHaptic('success');
    if (!canManagePrices) {
      showToast("Permissão negada.");
      return;
    }
    const updates = editingPrices[productId];
    const currentProduct = products.find(p => p.id === productId);
    if (!updates || !currentProduct) {
      triggerHaptic('error');
      return;
    }
    const finalUpdates: any = {};
    if (updates.buy !== undefined) finalUpdates.buyPrice = updates.buy;
    if (updates.sell !== undefined) finalUpdates.sellPrice = updates.sell;
    updateProduct(productId, finalUpdates);
    showToast(`Preços de ${productName} atualizados!`);
    setEditingPrices(prev => {
      const newState = { ...prev };
      delete newState[productId];
      return newState;
    });
  };

  const updateSimulationCart = (productId: string, delta: number) => {
    triggerHaptic('impact');
    setIsCurrentSimulationSaved(false);
    setSimulationCart(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, Math.round((currentQty + delta) * 10) / 10);
      const newCart = { ...prev, [productId]: newQty };
      if (newQty === 0) delete newCart[productId];
      return newCart;
    });
  };

  const calculateSimulationTotal = () => {
    let total = 0;
    Object.entries(simulationCart).forEach(([id, qty]) => {
      const product = products.find(p => p.id === id);
      if (product) {
        const size = product.packSize ?? 1;
        const packCost = product.buyPrice * Number(size);
        total += packCost * Number(qty);
      }
    });
    return total;
  };

  const getPackCost = (product: any): number => {
    const price = typeof product.buyPrice === 'number' ? product.buyPrice : 0;
    const size = typeof product.packSize === 'number' ? product.packSize : 1;
    return price * size;
  };

  const resetSimulation = () => {
    triggerHaptic('selection');
    setSimulationCart({});
    setIsCurrentSimulationSaved(false);
    setSimulationStep('select');
    setShowSimulationModal(false);
  };

  // --- LOGIC: PURCHASES (BCI STYLE) ---
  // Group Purchases by Date
  const groupedPurchases = useMemo(() => {
    const groups: Record<string, PurchaseRecord[]> = {};
    purchases.forEach(p => {
      if (!groups[p.date]) groups[p.date] = [];
      groups[p.date].push(p);
    });
    // Sort days descending based on the timestamp of the first item
    return Object.entries(groups).sort(([, a], [, b]) => (b[0].timestamp || 0) - (a[0].timestamp || 0));
  }, [purchases]);

  const updatePurchaseCart = (productId: string, delta: number) => {
    triggerHaptic('impact');
    setPurchaseCart(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, Math.round((currentQty + delta) * 10) / 10);
      const newCart = { ...prev, [productId]: newQty };
      if (newQty === 0) delete newCart[productId];
      return newCart;
    });
  };

  const calculatePurchaseTotal = () => {
    let total = 0;
    Object.entries(purchaseCart).forEach(([id, qty]) => {
      const product = products.find(p => p.id === id);
      if (product) {
        const size = product.packSize ?? 1;
        const packCost = product.buyPrice * Number(size);
        total += packCost * Number(qty);
      }
    });
    return total;
  };

  const handleGeneratePurchase = () => {
    // 1. Verificação de Permissão
    if (!canEditPurchases) {
      triggerHaptic('error');
      alert("🚫 Permissão Negada\n\nVocê não tem permissão para gerar compras reais que afetam o stock.\nContate o administrador.");
      return;
    }
    // 2. Verificação de Carrinho Vazio
    if (Object.keys(purchaseCart).length === 0) {
      triggerHaptic('error');
      showToast("O carrinho está vazio! Adicione produtos.");
      return;
    }
    if (window.confirm("Confirmar a emissão desta compra? Stock e Vendas serão atualizados.")) {
      triggerHaptic('success');
      // Use Global Context to add purchase with Attachments
      addPurchase(
        purchaseCart,
        'Prices', // Origin of the purchase
        user?.name || 'Desconhecido',
        purchaseAttachments // Pass attachments
      );
      setPurchaseCart({});
      setPurchaseAttachments([]);
      setPurchaseStep('history'); // Go to history after success
      showToast("Compra efectuada! Stock e Relatórios Atualizados.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (purchaseAttachments.length >= 3) {
        triggerHaptic('error');
        showToast('Máximo de 3 anexos.');
        return;
      }
      triggerHaptic('impact');
      const reader = new FileReader();
      reader.onloadend = () => {
        setPurchaseAttachments(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const resetPurchaseModal = () => {
    triggerHaptic('selection');
    setPurchaseCart({});
    setPurchaseAttachments([]);
    setPurchaseStep('select');
    setShowPurchaseModal(false);
  };

  // Handlers for Proposals (Simulation)
  const checkSaveProposal = () => {
    if (Object.keys(simulationCart).length === 0) return;
    if (isCurrentSimulationSaved) {
      triggerHaptic('error');
      setShowAlreadySavedModal(true);
    } else {
      triggerHaptic('impact');
      setShowSaveProposalDialog(true);
    }
  };

  const handleSaveProposal = () => {
    triggerHaptic('success');
    const newProposal: ExtendedSavedProposal = {
      id: Date.now().toString(),
      name: proposalNameInput || `Proposta ${new Date().toLocaleDateString('pt-AO')}`,
      date: new Date().toLocaleString('pt-AO'),
      items: { ...simulationCart },
      total: calculateSimulationTotal(),
      createdBy: user?.name || 'Desconhecido'
    };
    setSavedProposals(prev => [newProposal, ...prev]);
    setIsCurrentSimulationSaved(true);
    setProposalNameInput('');
    setShowSaveProposalDialog(false);
    showToast("Proposta salva!");
  };

  const handleOpenLoadPreview = (proposal: ExtendedSavedProposal) => {
    triggerHaptic('selection');
    setPreviewProposal(proposal);
    setShowPreviewDetails(false);
  };

  const handleDeleteProposal = (id: string) => {
    triggerHaptic('warning');
    if (window.confirm("Eliminar proposta?")) {
      setSavedProposals(prev => prev.filter(p => p.id !== id));
      showToast("Eliminada.");
    }
  };

  const handleOpenReport = (data: ExtendedSavedProposal | PurchaseRecord) => {
    triggerHaptic('selection');
    setReportProposal(data);
  };

  const generateOrderMessage = () => {
    triggerHaptic('impact');
    let text = "Bom dia Kota\n\n";
    Object.entries(simulationCart).forEach(([id, qty]) => {
      const p = products.find(prod => prod.id === id);
      if (p) text += `${qty} ${p.name}\n`;
    });
    text += "\nSe não tiver algum produto, por-favor me avise!!";
    setGeneratedMessage(text);
    setSimulationStep('message');
  };

  const copyToClipboard = () => {
    triggerHaptic('success');
    navigator.clipboard.writeText(generatedMessage).then(() => showToast("Copiado!"));
  };

  const toggleTable = () => {
    triggerHaptic('selection');
    setIsTableExpanded(!isTableExpanded);
  }

  const getModalSubtitle = () => {
    switch(simulationStep) {
      case 'select': return 'Selecione os produtos e quantidades (Grades/Caixas)';
      case 'summary': return 'Revisão final da proposta com valores';
      case 'message': return 'Copiar lista para envio (WhatsApp/SMS)';
      case 'saved': return 'Gerir propostas salvas anteriormente';
      default: return '';
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-24 relative">
      {/* GLOBAL TOAST */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-slide-up">
          <div className="bg-[#003366] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold text-sm">
            <CheckCircle size={18} className="text-green-400" /> {toast.message}
          </div>
        </div>
      )}

      {/* --- HEADER PRINCIPAL --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className={`transition-all duration-300 ${sidebarMode === 'hidden' ? 'pl-16 md:pl-20' : ''}`}>
          <h1 className="text-3xl font-bold text-[#003366] dark:text-white">Gestão de Preços</h1>
          <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            Controlo de margens e valores de mercado
            {!canManagePrices && (
              <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                <Lock size={10} /> Modo Leitura
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar produto..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 soft-ui-inset border-none text-sm font-medium focus:ring-2 focus:ring-[#003366] transition-all dark:text-white" 
            />
          </div>
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
            {filterCategories.map(cat => (
              <button 
                key={cat} 
                onClick={() => { triggerHaptic('selection'); setSelectedCategory(cat); }} 
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat 
                    ? 'bg-[#003366] text-white shadow-lg shadow-blue-200' 
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* --- CONTROLADOR DE EXIBIÇÃO DA TABELA --- */}
      <div 
        className="flex justify-between items-center cursor-pointer group select-none" 
        onClick={toggleTable}
      >
        <h3 className="font-bold text-[#003366] dark:text-white text-xl flex items-center gap-2">
          <DollarSign size={24} /> Tabela de Produtos
        </h3>
        <button className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400 group-hover:text-[#003366] dark:group-hover:text-white transition-all">
          {isTableExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* --- TABELA DE PREÇOS (RETRÁTIL) --- */}
      {isTableExpanded && (
        <div className="grid grid-cols-1 gap-6 animate-fade-in">
          <SoftCard className="p-0 overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700 border-b border-slate-100 dark:border-slate-600">
                    <th className="p-6 font-bold text-[#003366] dark:text-white text-xs uppercase tracking-wider">Produto</th>
                    <th className="p-6 font-bold text-[#003366] dark:text-white text-xs uppercase tracking-wider">
                      Preço Compra <span className="text-slate-400 font-normal">(Grade/Caixa)</span>
                    </th>
                    <th className="p-6 font-bold text-[#003366] dark:text-white text-xs uppercase tracking-wider">Preço Venda (Unitário)</th>
                    <th className="p-6 font-bold text-[#003366] dark:text-white text-xs uppercase tracking-wider">Lucro Estimado</th>
                    <th className="p-6 font-bold text-[#003366] dark:text-white text-xs uppercase tracking-wider text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => {
                      const currentEdit = editingPrices[p.id] || {};
                      const displayBuy = currentEdit.buy !== undefined ? currentEdit.buy : p.buyPrice;
                      const displaySell = currentEdit.sell !== undefined ? currentEdit.sell : p.sellPrice;
                      const profit = displaySell - displayBuy;
                      const hasChanged = currentEdit.buy !== undefined || currentEdit.sell !== undefined;
                      const packSize = p.packSize && p.packSize > 1 ? p.packSize : 1;
                      const displayPackBuy = displayBuy * packSize;

                      return (
                        <tr key={p.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors ${hasChanged ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}>
                          <td className="p-6">
                            <p className="font-bold text-slate-800 dark:text-white text-base">{p.name}</p>
                            <div className="flex gap-2 mt-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 rounded-md">{p.category}</span>
                              {packSize > 1 && (
                                <span className="text-[10px] uppercase font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 px-2 rounded-md">
                                  {p.packType || 'Pack'} de {packSize}un
                                </span>
                              )}
                            </div>
                          </td>
                          {/* INPUT DE COMPRA */}
                          <td className="p-6">
                            {packSize > 1 ? (
                              <div className="flex flex-col gap-1 w-full min-w-[180px]">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                  Preço da {p.packType || 'Grade'} ({packSize}un)
                                </label>
                                <div className={`flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-xl soft-ui-inset border border-slate-200 dark:border-slate-600 shadow-inner ${!canManagePrices || isLocked ? 'opacity-60 grayscale' : ''}`}>
                                  <input 
                                    type="number" 
                                    disabled={!canManagePrices || isLocked}
                                    value={displayPackBuy === 0 ? '' : (Number.isInteger(displayPackBuy) ? displayPackBuy : displayPackBuy.toFixed(2))}
                                    onChange={(e) => handlePackPriceChange(p.id, packSize, e.target.value)}
                                    className="bg-transparent border-none w-full text-lg font-bold text-[#003366] dark:text-white focus:ring-0 outline-none p-0 disabled:cursor-not-allowed"
                                    placeholder="0"
                                  />
                                  <span className="text-xs font-black text-slate-400">KZ</span>
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 px-1 font-medium">
                                  = <span className="font-bold text-[#003366] dark:text-white">{displayBuy.toLocaleString('pt-AO', {maximumFractionDigits: 2})} Kz</span> /unidade
                                </div>
                              </div>
                            ) : (
                              <div className={`flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl soft-ui-inset border border-slate-200 dark:border-slate-600 w-full min-w-[180px] shadow-inner ${!canManagePrices || isLocked ? 'opacity-60 grayscale' : ''}`}>
                                <span className="text-xs font-black text-slate-400">KZ</span>
                                <input 
                                  type="number" 
                                  disabled={!canManagePrices || isLocked}
                                  value={displayBuy === 0 ? '' : displayBuy}
                                  onChange={(e) => handleInputChange(p.id, 'buy', e.target.value)}
                                  className="bg-transparent border-none w-full text-lg font-bold text-[#003366] dark:text-white focus:ring-0 outline-none p-0 disabled:cursor-not-allowed"
                                  placeholder="0"
                                />
                              </div>
                            )}
                          </td>
                          {/* INPUT DE VENDA */}
                          <td className="p-6">
                            <div className="flex flex-col gap-1 w-full min-w-[180px]">
                              {packSize > 1 && <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider opacity-0">Spacer</label>}
                              <div className={`flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-xl soft-ui-inset border border-slate-200 dark:border-slate-600 shadow-inner h-[46px] ${!canManagePrices || isLocked ? 'opacity-60 grayscale' : ''}`}>
                                <span className="text-xs font-black text-slate-400">KZ</span>
                                <input 
                                  type="number" 
                                  disabled={!canManagePrices || isLocked}
                                  value={displaySell === 0 ? '' : displaySell}
                                  onChange={(e) => handleInputChange(p.id, 'sell', e.target.value)}
                                  className="bg-transparent border-none w-full text-lg font-bold text-[#003366] dark:text-white focus:ring-0 outline-none p-0 disabled:cursor-not-allowed"
                                  placeholder="0"
                                />
                              </div>
                              {packSize > 1 && <div className="text-[10px] h-[15px]"></div>}
                            </div>
                          </td>
                          <td className="p-6 align-middle">
                            <span className={`font-black text-sm px-4 py-2 rounded-xl flex items-center gap-2 w-fit ${profit >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                              {profit >= 0 ? <Plus size={14} /> : <Minus size={14} />}
                              {Math.abs(profit).toLocaleString('pt-AO', {maximumFractionDigits: 1})} Kz
                            </span>
                          </td>
                          <td className="p-6 align-middle">
                            <div className="flex justify-center gap-3">
                              <button 
                                onClick={() => handleSave(p.id, p.name)} 
                                disabled={!hasChanged || !canManagePrices || isLocked} 
                                className={`p-3 rounded-xl transition-all active:scale-95 ${
                                  hasChanged && canManagePrices && !isLocked
                                    ? 'bg-[#003366] text-white shadow-lg hover:bg-[#004488]' 
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-500 cursor-not-allowed'
                                }`}
                                title={canManagePrices ? "Guardar Alterações" : "Sem permissão para alterar"}
                              >
                                {canManagePrices ? <Save size={20} /> : <Lock size={20} />}
                              </button>
                              <button 
                                onClick={() => { triggerHaptic('selection'); setViewHistoryId(p.id); }} 
                                className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-xl hover:text-[#003366] dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95"
                                title="Ver Histórico de Preços"
                              >
                                <History size={20} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400 font-medium italic">
                        Nenhum produto encontrado com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SoftCard>
        </div>
      )}

      {/* --- BOTÃO DE SIMULAÇÃO (CTA) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
        <SoftCard className="space-y-4">
          <h3 className="font-bold text-[#003366] dark:text-white flex items-center gap-2 text-lg">
            <Info size={20} /> Dicas de Precificação
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Mantenha as margens de lucro sempre acima de 30% para garantir a saúde financeira do bar. Preços de compra devem ser atualizados a cada nova remessa de stock.
          </p>
        </SoftCard>
        <SoftCard className="bg-[#003366] text-white flex flex-col justify-center items-center gap-6 text-center relative overflow-hidden group">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="p-6 bg-white/10 rounded-[40px] backdrop-blur-md shadow-xl">
            <ShoppingCart size={48} />
          </div>
          <div>
            <h3 className="text-2xl font-black mb-2">Simular Proposta de Compra</h3>
            <p className="text-white/70 text-sm max-w-[280px]">
              Gere uma lista de compras calculada por grades/caixas e saiba exatamente quanto vai gastar.
            </p>
          </div>
          <button 
            onClick={() => { triggerHaptic('impact'); setShowSimulationModal(true); setSimulationStep('select'); }} 
            className="pill-button px-10 py-4 bg-white text-[#003366] font-black shadow-2xl hover:scale-105 active:scale-95 transition-all"
          >
            Iniciar Simulação
          </button>
        </SoftCard>
      </div>

      {/* --- NOVA SECÇÃO: CENTRAL DE COMPRAS BCI --- */}
      <div className="mt-8 border-t-2 border-dashed border-slate-200 dark:border-slate-700 pt-8">
        <div className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-xl border border-blue-100 dark:border-slate-700">
          {/* Header BCI Style */}
          <div className="bg-[#0054A6] p-8 text-white relative overflow-hidden">
            <div className="absolute -right-10 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h2 className="text-3xl font-black flex items-center gap-3">
                  <ShoppingBag size={32} /> Central de Compras
                </h2>
                <p className="text-blue-100 font-medium mt-1 opacity-80">Gestão de aquisições e entrada de stock oficial</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => { triggerHaptic('impact'); setShowPurchaseModal(true); setPurchaseStep('select'); }} 
                  className="bg-white text-[#0054A6] px-6 py-3 rounded-2xl font-black shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                >
                  <Plus size={20} /> Efectuar Compra
                </button>
                <button 
                  onClick={() => { triggerHaptic('selection'); setShowPurchaseModal(true); setPurchaseStep('history'); }} 
                  className="bg-[#003366] text-white px-6 py-3 rounded-2xl font-bold border border-white/20 hover:bg-[#002244] transition-all flex items-center gap-2"
                >
                  <History size={20} /> Ver Histórico
                </button>
              </div>
            </div>
          </div>
          {/* Quick Stats / Empty State Placeholder */}
          <div className="p-8 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-[#0054A6] dark:text-blue-400 flex items-center justify-center">
                  <Info size={24} />
                </div>
                <p className="text-sm max-w-md">Use esta secção para registrar compras reais. O stock será atualizado automaticamente e o valor entrará no relatório de vendas do dia como "Comprou-se".</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest">Total Compras Hoje</p>
                <p className="text-2xl font-black text-[#0054A6] dark:text-blue-400">
                  {purchases.filter(p => p.date === systemDate.toLocaleDateString('pt-AO')).reduce((acc, curr) => acc + curr.total, 0).toLocaleString('pt-AO')} Kz
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL: SIMULADOR DE PROPOSTAS --- */}
      {showSimulationModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#F8FAFC] dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-[32px] shadow-2xl flex flex-col relative overflow-hidden border border-white/20">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black text-[#003366] dark:text-white flex items-center gap-3">
                  <ShoppingCart size={28} className="text-blue-500" /> Simulador de Proposta
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{getModalSubtitle()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { triggerHaptic('selection'); setSimulationStep('saved'); }} 
                  className={`p-3 rounded-2xl transition-all ${simulationStep === 'saved' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200'}`}
                  title="Propostas Salvas"
                >
                  <FolderOpen size={20} />
                </button>
                <button 
                  onClick={resetSimulation} 
                  className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-red-500 rounded-2xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {simulationStep === 'select' && (
                <div className="space-y-6">
                  {/* Search & Filter */}
                  <div className="flex flex-col md:flex-row gap-4 sticky top-0 z-10 bg-[#F8FAFC] dark:bg-slate-900 pb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Filtrar produtos..." 
                        value={simSearchTerm} 
                        onChange={e => setSimSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border-none shadow-sm text-sm dark:text-white" 
                      />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                      {filterCategories.map(cat => (
                        <button 
                          key={cat} 
                          onClick={() => setSimCategory(cat)} 
                          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            simCategory === cat ? 'bg-[#003366] text-white' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grid de Produtos */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredSimulationProducts.map(p => {
                      const qty = simulationCart[p.id] || 0;
                      const packSize = p.packSize || 1;
                      const packCost = p.buyPrice * packSize;

                      return (
                        <div key={p.id} className={`p-4 rounded-[24px] border transition-all duration-300 flex flex-col justify-between h-full ${
                          qty > 0 ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                        }`}>
                          <div>
                            <p className="font-bold text-[#003366] dark:text-white text-sm leading-tight mb-1">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{p.packType || 'Pack'} de {packSize}un</p>
                          </div>
                          
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-black text-[#003366] dark:text-blue-400">{packCost.toLocaleString()} Kz</span>
                              {qty > 0 && <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{(packCost * qty).toLocaleString()} Kz</span>}
                            </div>
                            
                            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 rounded-2xl p-1">
                              <button 
                                onClick={() => updateSimulationCart(p.id, -1)} 
                                className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-600 rounded-xl shadow-sm text-slate-400 hover:text-red-500 transition-all"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="font-black text-sm text-[#003366] dark:text-white">{qty}</span>
                              <button 
                                onClick={() => updateSimulationCart(p.id, 1)} 
                                className="w-8 h-8 flex items-center justify-center bg-[#003366] text-white rounded-xl shadow-md hover:bg-[#004488] transition-all"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {simulationStep === 'summary' && (
                <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                  <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h3 className="text-xl font-black text-[#003366] dark:text-white">Resumo da Proposta</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{new Date().toLocaleDateString('pt-AO')}</p>
                      </div>
                      <MGLogo className="h-8 w-auto opacity-20" />
                    </div>

                    <div className="space-y-4">
                      {Object.entries(simulationCart).map(([id, qty]) => {
                        const p = products.find(prod => prod.id === id);
                        if (!p) return null;
                        const packSize = p.packSize || 1;
                        const packCost = p.buyPrice * packSize;
                        return (
                          <div key={id} className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-700 last:border-0">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center font-black text-[#003366] dark:text-white">
                                {qty}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 dark:text-white text-sm">{p.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{p.packType || 'Pack'} x {packSize}un</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-[#003366] dark:text-white text-sm">{(packCost * Number(qty)).toLocaleString()} Kz</p>
                              <p className="text-[10px] text-slate-400 font-medium">{packCost.toLocaleString()} Kz / {p.packType || 'un'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-100 dark:border-slate-700 flex justify-between items-end">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Estimado</p>
                        <p className="text-4xl font-black text-[#003366] dark:text-blue-400">{calculateSimulationTotal().toLocaleString()} <span className="text-lg">Kz</span></p>
                      </div>
                      <div className="text-right text-[10px] text-slate-400 font-medium">
                        *Valores baseados no último preço de compra registrado.
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={checkSaveProposal}
                      className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-slate-800 text-[#003366] dark:text-white rounded-2xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <Save size={20} /> {isCurrentSimulationSaved ? 'Salva' : 'Salvar Proposta'}
                    </button>
                    <button 
                      onClick={generateOrderMessage}
                      className="flex items-center justify-center gap-2 p-4 bg-green-500 text-white rounded-2xl font-bold shadow-lg shadow-green-200 dark:shadow-none hover:bg-green-600 transition-all"
                    >
                      <MessageSquare size={20} /> Gerar Mensagem
                    </button>
                  </div>
                </div>
              )}

              {simulationStep === 'message' && (
                <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
                  <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-xl border border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-[#003366] dark:text-white mb-4 flex items-center gap-2">
                      <MessageSquare size={20} /> Mensagem para Fornecedor
                    </h3>
                    <textarea 
                      value={generatedMessage}
                      onChange={e => setGeneratedMessage(e.target.value)}
                      className="w-full h-64 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none focus:ring-2 focus:ring-green-500 text-sm font-medium dark:text-white custom-scrollbar"
                    />
                    <button 
                      onClick={copyToClipboard}
                      className="w-full mt-6 py-4 bg-[#003366] text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <Copy size={20} /> Copiar Texto
                    </button>
                  </div>
                  <button onClick={() => setSimulationStep('summary')} className="w-full py-4 text-slate-400 font-bold flex items-center justify-center gap-2">
                    <ArrowLeft size={18} /> Voltar ao Resumo
                  </button>
                </div>
              )}

              {simulationStep === 'saved' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-[#003366] dark:text-white">Propostas Arquivadas</h3>
                    <button onClick={() => setSimulationStep('select')} className="text-sm font-bold text-blue-500 flex items-center gap-1">
                      <Plus size={16} /> Nova Simulação
                    </button>
                  </div>

                  {savedProposals.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                        <Folder size={40} />
                      </div>
                      <p className="text-slate-400 font-medium italic">Nenhuma proposta salva ainda.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedProposals.map(prop => (
                        <div key={prop.id} className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-bold text-[#003366] dark:text-white">{prop.name}</h4>
                              <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase">
                                <Calendar size={10} /> {prop.date}
                              </p>
                            </div>
                            <button 
                              onClick={() => handleDeleteProposal(prop.id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-black text-[#003366] dark:text-blue-400">{prop.total.toLocaleString()} Kz</span>
                            <button 
                              onClick={() => handleOpenLoadPreview(prop)}
                              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-[#003366] hover:text-white transition-all"
                            >
                              Ver Detalhes
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="bg-white dark:bg-slate-800 p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total da Proposta</span>
                <span className="text-2xl font-black text-[#003366] dark:text-blue-400">{calculateSimulationTotal().toLocaleString()} Kz</span>
              </div>
              <div className="flex gap-3">
                {simulationStep === 'summary' && (
                  <button onClick={() => setSimulationStep('select')} className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 transition-all">
                    Editar Lista
                  </button>
                )}
                {simulationStep === 'select' && (
                  <button 
                    onClick={() => { triggerHaptic('impact'); setSimulationStep('summary'); }} 
                    disabled={calculateSimulationTotal() === 0}
                    className="px-8 py-3 bg-[#003366] text-white rounded-2xl font-black shadow-xl shadow-blue-200 dark:shadow-none hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2"
                  >
                    Revisar Proposta <ArrowRight size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CENTRAL DE COMPRAS (BCI STYLE) --- */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#F8FAFC] dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-[32px] shadow-2xl flex flex-col relative overflow-hidden border border-white/20">
            {/* Header BCI */}
            <div className="bg-[#0054A6] p-6 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <ShoppingBag size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Central de Compras</h2>
                  <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80">
                    {purchaseStep === 'select' ? 'Seleção de Produtos' : purchaseStep === 'summary' ? 'Finalização de Compra' : 'Histórico de Aquisições'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setPurchaseStep(purchaseStep === 'history' ? 'select' : 'history')} 
                  className={`p-3 rounded-2xl transition-all ${purchaseStep === 'history' ? 'bg-white text-[#0054A6]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  <History size={24} />
                </button>
                <button onClick={resetPurchaseModal} className="p-3 bg-white/10 text-white hover:bg-white/20 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content BCI */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {purchaseStep === 'select' && (
                <div className="space-y-6">
                  {/* Search & Filter */}
                  <div className="flex flex-col md:flex-row gap-4 sticky top-0 z-10 bg-[#F8FAFC] dark:bg-slate-900 pb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Pesquisar para compra..." 
                        value={purchaseSearchTerm} 
                        onChange={e => setPurchaseSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border-none shadow-sm text-sm dark:text-white" 
                      />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                      {filterCategories.map(cat => (
                        <button 
                          key={cat} 
                          onClick={() => setPurchaseCategory(cat)} 
                          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            purchaseCategory === cat ? 'bg-[#0054A6] text-white' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grid de Produtos para Compra */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredPurchaseProducts.map(p => {
                      const qty = purchaseCart[p.id] || 0;
                      const packSize = p.packSize || 1;
                      const packCost = p.buyPrice * packSize;

                      return (
                        <div key={p.id} className={`p-4 rounded-[24px] border transition-all duration-300 flex flex-col justify-between h-full ${
                          qty > 0 ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                        }`}>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight mb-1">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{p.packType || 'Pack'} de {packSize}un</p>
                          </div>
                          
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-black text-[#0054A6] dark:text-blue-400">{packCost.toLocaleString()} Kz</span>
                              {qty > 0 && <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{(packCost * qty).toLocaleString()} Kz</span>}
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 rounded-2xl p-1">
                                <button onClick={() => updatePurchaseCart(p.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-600 rounded-xl shadow-sm text-slate-400 hover:text-red-500 transition-all"><Minus size={14} /></button>
                                <span className="font-black text-sm text-slate-800 dark:text-white">{qty}</span>
                                <button onClick={() => updatePurchaseCart(p.id, 1)} className="w-8 h-8 flex items-center justify-center bg-[#0054A6] text-white rounded-xl shadow-md hover:bg-blue-700 transition-all"><Plus size={14} /></button>
                              </div>
                              {/* Botões de Meia Unidade (+0.5 / -0.5) */}
                              <div className="flex gap-1">
                                <button onClick={() => updatePurchaseCart(p.id, -0.5)} className="flex-1 py-1 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-400 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-red-50 hover:text-red-500 transition-all">- ½</button>
                                <button onClick={() => updatePurchaseCart(p.id, 0.5)} className="flex-1 py-1 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-400 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-blue-50 hover:text-blue-500 transition-all">+ ½</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {purchaseStep === 'summary' && (
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
                  {/* Lista de Itens */}
                  <div className="md:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-xl border border-slate-100 dark:border-slate-700">
                      <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <List size={20} /> Itens da Compra
                      </h3>
                      <div className="space-y-4">
                        {Object.entries(purchaseCart).map(([id, qty]) => {
                          const p = products.find(prod => prod.id === id);
                          if (!p) return null;
                          const packSize = p.packSize || 1;
                          const packCost = p.buyPrice * packSize;
                          return (
                            <div key={id} className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-700 last:border-0">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center font-black text-[#0054A6] dark:text-blue-400">
                                  {qty}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 dark:text-white text-sm">{p.name}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">{p.packType || 'Pack'} x {packSize}un</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-slate-800 dark:text-white text-sm">{(packCost * Number(qty)).toLocaleString()} Kz</p>
                                <p className="text-[10px] text-slate-400 font-medium">{packCost.toLocaleString()} Kz / {p.packType || 'un'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Sidebar de Finalização */}
                  <div className="space-y-6">
                    {/* Anexos */}
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-xl border border-slate-100 dark:border-slate-700">
                      <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                        <Paperclip size={16} /> Comprovativos ({purchaseAttachments.length}/3)
                      </h3>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {purchaseAttachments.map((img, idx) => (
                          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                            <img src={img} alt="Anexo" className="w-full h-full object-cover" />
                            <button 
                              onClick={() => setPurchaseAttachments(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        {purchaseAttachments.length < 3 && (
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-[#0054A6] hover:text-[#0054A6] transition-all"
                          >
                            <Camera size={20} />
                            <span className="text-[8px] font-bold mt-1 uppercase">Adicionar</span>
                          </button>
                        )}
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                      <p className="text-[10px] text-slate-400 italic leading-tight">Anexe fotos de facturas ou recibos para auditoria futura.</p>
                    </div>

                    {/* Total & Confirmar */}
                    <div className="bg-[#0054A6] text-white rounded-[32px] p-6 shadow-xl relative overflow-hidden">
                      <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                      <p className="text-xs font-bold text-blue-100 uppercase tracking-widest mb-1">Total a Pagar</p>
                      <p className="text-3xl font-black mb-6">{calculatePurchaseTotal().toLocaleString()} <span className="text-sm">Kz</span></p>
                      
                      <button 
                        onClick={handleGeneratePurchase}
                        className="w-full py-4 bg-white text-[#0054A6] rounded-2xl font-black shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <ClipboardCheck size={20} /> Confirmar Compra
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {purchaseStep === 'history' && (
                <div className="space-y-8 animate-fade-in">
                  {groupedPurchases.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                        <History size={40} />
                      </div>
                      <p className="text-slate-400 font-medium italic">Nenhuma compra registrada no histórico.</p>
                    </div>
                  ) : (
                    groupedPurchases.map(([date, items]) => (
                      <div key={date} className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-700"></div>
                          <span className="px-4 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">{date}</span>
                          <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-700"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {items.map(purchase => (
                            <div key={purchase.id} className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-[#0054A6] rounded-xl flex items-center justify-center">
                                    <ShoppingBag size={20} />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Compra #{purchase.id.slice(-4)}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase">
                                      <Clock size={10} /> {new Date(purchase.timestamp).toLocaleTimeString('pt-AO', {hour: '2-digit', minute: '2-digit'})} • <User size={10} /> {purchase.completedBy}
                                    </p>
                                  </div>
                                </div>
                                {purchase.attachments && purchase.attachments.length > 0 && (
                                  <div className="flex -space-x-2">
                                    {purchase.attachments.map((_, i) => (
                                      <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-blue-100 flex items-center justify-center">
                                        <ImageIcon size={10} className="text-[#0054A6]" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-black text-[#0054A6] dark:text-blue-400">{purchase.total.toLocaleString()} Kz</span>
                                <button 
                                  onClick={() => handleOpenReport(purchase)}
                                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-[#0054A6] hover:text-white transition-all"
                                >
                                  Ver Relatório
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer BCI */}
            <div className="bg-white dark:bg-slate-800 p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total do Carrinho</span>
                <span className="text-2xl font-black text-[#0054A6] dark:text-blue-400">{calculatePurchaseTotal().toLocaleString()} Kz</span>
              </div>
              <div className="flex gap-3">
                {purchaseStep === 'summary' && (
                  <button onClick={() => setPurchaseStep('select')} className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 transition-all">
                    Adicionar Itens
                  </button>
                )}
                {purchaseStep === 'select' && (
                  <button 
                    onClick={() => { triggerHaptic('impact'); setPurchaseStep('summary'); }} 
                    disabled={calculatePurchaseTotal() === 0}
                    className="px-8 py-3 bg-[#0054A6] text-white rounded-2xl font-black shadow-xl shadow-blue-200 dark:shadow-none hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2"
                  >
                    Revisar Compra <ArrowRight size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: RELATÓRIO / PREVIEW DE PROPOSTA --- */}
      {reportProposal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#F8FAFC] dark:bg-slate-900 w-full max-w-4xl h-[90vh] rounded-[32px] shadow-2xl flex flex-col relative overflow-hidden border border-white/20">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black text-[#003366] dark:text-white flex items-center gap-3">
                  <FileText size={24} className="text-blue-500" /> {reportProposal.name || `Compra #${reportProposal.id.slice(-4)}`}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                  {reportProposal.date} • {(reportProposal as any).completedBy || (reportProposal as any).createdBy || 'Sistema'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-[#003366] rounded-2xl transition-all">
                  <Printer size={20} />
                </button>
                <button onClick={() => setReportProposal(null)} className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-red-500 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white dark:bg-slate-900">
              <div className="max-w-2xl mx-auto space-y-10">
                {/* Logo & Info */}
                <div className="flex justify-between items-start">
                  <MGLogo className="h-12 w-auto" />
                  <div className="text-right">
                    <p className="font-black text-[#003366] dark:text-white uppercase tracking-tighter text-xl">Marguel Group</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Relatório de Aquisição</p>
                  </div>
                </div>

                {/* Itens Table */}
                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                        <th className="p-4 text-left">Produto</th>
                        <th className="p-4 text-center">Qtd</th>
                        <th className="p-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {Object.entries(reportProposal.items).map(([id, qty]) => {
                        const p = products.find(prod => prod.id === id);
                        if (!p) return null;
                        const packSize = p.packSize || 1;
                        const packCost = p.buyPrice * packSize;
                        return (
                          <tr key={id} className="dark:text-slate-300">
                            <td className="p-4">
                              <p className="font-bold">{p.name}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-medium">{p.packType || 'Pack'} de {packSize}un</p>
                            </td>
                            <td className="p-4 text-center font-black text-[#003366] dark:text-blue-400">{qty}</td>
                            <td className="p-4 text-right font-bold">{ (packCost * Number(qty)).toLocaleString() } Kz</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#003366] text-white font-black">
                        <td colSpan={2} className="p-4 text-lg">Total Geral</td>
                        <td className="p-4 text-right text-lg">{reportProposal.total.toLocaleString()} Kz</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Attachments Preview if PurchaseRecord */}
                {(reportProposal as any).attachments && (reportProposal as any).attachments.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Paperclip size={14} /> Comprovativos Anexados
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {(reportProposal as any).attachments.map((img: string, idx: number) => (
                        <div 
                          key={idx} 
                          onClick={() => setViewImageIndex(idx)}
                          className="aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-105 transition-all shadow-md"
                        >
                          <img src={img} alt="Anexo" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Report */}
                <div className="pt-10 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
                  <p className="text-[10px] text-slate-400 font-medium italic">Este documento é um registro interno de movimentação de stock e financeiro.</p>
                  <p className="text-[10px] font-black text-[#003366] dark:text-blue-400 uppercase tracking-widest">Marguel Group • Gestão de Preços</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: HISTÓRICO DE PREÇOS --- */}
      {viewHistoryId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[32px] shadow-2xl flex flex-col relative overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#003366] dark:text-white flex items-center gap-2">
                <History size={20} /> Histórico de Preços
              </h3>
              <button onClick={() => setViewHistoryId(null)} className="p-2 text-slate-400 hover:text-red-500 transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                {priceHistory.filter(h => h.productId === viewHistoryId).length === 0 ? (
                  <p className="text-center text-slate-400 py-10 italic">Nenhum histórico registrado para este produto.</p>
                ) : (
                  priceHistory
                    .filter(h => h.productId === viewHistoryId)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((h, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date(h.date).toLocaleDateString('pt-AO')}</p>
                          <p className="text-sm font-black text-[#003366] dark:text-blue-400">{h.newSellPrice.toLocaleString()} Kz</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-medium">Anterior: {h.oldSellPrice.toLocaleString()} Kz</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.newSellPrice > h.oldSellPrice ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {h.newSellPrice > h.oldSellPrice ? '+' : ''}{(((h.newSellPrice / h.oldSellPrice) - 1) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- IMAGE VIEWER MODAL --- */}
      {viewImageIndex !== null && reportProposal && (reportProposal as any).attachments && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <button onClick={() => setViewImageIndex(null)} className="absolute top-6 right-6 p-4 text-white hover:text-red-500 transition-all z-10">
            <X size={32} />
          </button>
          <img 
            src={(reportProposal as any).attachments[viewImageIndex]} 
            alt="Visualização" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
          <div className="absolute bottom-10 flex gap-4">
            <button 
              disabled={viewImageIndex === 0}
              onClick={() => setViewImageIndex(prev => prev! - 1)}
              className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 disabled:opacity-20"
            >
              <ArrowLeft size={24} />
            </button>
            <button 
              disabled={viewImageIndex === (reportProposal as any).attachments.length - 1}
              onClick={() => setViewImageIndex(prev => prev! + 1)}
              className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 disabled:opacity-20"
            >
              <ArrowRight size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-16 py-10 px-6 bg-white dark:bg-slate-800 rounded-[32px] text-center flex flex-col gap-4 font-sans shadow-sm border border-slate-100 dark:border-slate-700">
        <p className="text-sm font-bold tracking-[-0.01em] text-[#003366] dark:text-blue-400">
          Marguel Sistema de Gestão Interna
        </p>
        <div className="flex flex-col items-center">
          <span className="text-xs text-[#6B7280] dark:text-slate-400 mb-1">Desenvolvido por</span>
          <div className="text-xs tracking-[0.5px]">
            <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>DC - Comercial</span>
            <span className="text-[#6B7280] dark:text-slate-400 font-normal mx-1">&</span>
            <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>Marguel Group</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Prices;
