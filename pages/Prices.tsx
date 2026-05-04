import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  DollarSign, History, Save, Info, Search, CheckCircle, X, ShoppingCart, 
  Package, Plus, Minus, ArrowRight, FileText, ChevronUp, 
  ChevronDown, MessageSquare, Copy, ArrowLeft, Lock, Trash2, FolderOpen, 
  Calendar, Folder, Clock, User, Eye, AlertTriangle, List, ArrowLeftCircle, 
  ClipboardCheck, ShoppingBag, Paperclip, Camera, Image as ImageIcon, Truck, Calculator, Layers
} from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { useProducts } from '../contexts/ProductContext';
import { useLayout } from '../contexts/LayoutContext';
import SyncStatus from '../components/SyncStatus';
import { useAuth } from '../contexts/AuthContext';
import { PriceHistoryLog, SavedProposal, PurchaseRecord, UserPermissions, UserRole, Product } from '../types';
import { hasPermission } from '../src/utils/permissions';
import { formatDisplayDate, formatDateISO, cleanDate, safeFormatCurrency, getFileReader, generateUUID } from '../src/utils';

const CartItem = memo(({ id, qty, product, variant = 'default' }: { id: string, qty: number, product: any, variant?: 'default' | 'blue' }) => {
  if (!product) return null;
  const packSize = product.packSize || 1;
  const packCost = product.buyPrice * packSize;
  const qtyBg = variant === 'blue' ? 'bg-blue-50 dark:bg-blue-900/30 text-[#0054A6] dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-[#003366] dark:text-white';
  const qtySize = variant === 'blue' ? 'w-12 h-12' : 'w-10 h-10';
  
  return (
    <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-700 last:border-0">
      <div className="flex items-center gap-4">
        <div className={`${qtySize} ${qtyBg} rounded-xl flex items-center justify-center font-black`}>
          {qty}
        </div>
        <div>
          <p className="font-bold text-slate-800 dark:text-white text-sm">{product.name}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase">{product.packType || 'Pack'} x {packSize}un</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-black text-slate-800 dark:text-white text-sm">{((packCost || 0) * Number(qty)).toLocaleString()} Kz</p>
        <p className="text-[10px] text-slate-400 font-medium">{(packCost || 0).toLocaleString()} Kz / {product.packType || 'un'}</p>
      </div>
    </div>
  );
});

const Prices: React.FC = () => {
  const { products, categories, updateProduct, purchases, addPurchase, isDayLocked, systemDate, getSystemDate, priceHistory } = useProducts();
  const { sidebarMode, triggerHaptic } = useLayout(); 
  const { user } = useAuth();
  const location = useLocation();
  
  const isAdminOrOwner = user?.role === UserRole.ADMIN_GERAL || user?.role === UserRole.PROPRIETARIO;
  const canManagePrices = hasPermission(user, 'prices_edit');
  const canEditPurchases = hasPermission(user, 'purchases_execute');
  const canViewPurchases = hasPermission(user, 'purchases_view');
  const isLocked = isDayLocked(systemDate) && !isAdminOrOwner;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });
  const [editingPrices, setEditingPrices] = useState<Record<string, { buy?: string, sell?: string, packBuy?: string, promoQty?: string, promoPrice?: string, isPromoActive?: boolean }>>({});
  const [viewHistoryId, setViewHistoryId] = useState<string | null>(null);
  const [isTableExpanded, setIsTableExpanded] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    triggerHaptic('selection');
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [showMixMatchModal, setShowMixMatchModal] = useState(false);
  const [selectedMixMatchProducts, setSelectedMixMatchProducts] = useState<Record<string, boolean>>({});
  const [mixMatchQty, setMixMatchQty] = useState<number>(3);
  const [mixMatchPrice, setMixMatchPrice] = useState<number>(0);
  const [simulationStep, setSimulationStep] = useState<'select' | 'summary' | 'message' | 'saved'>('select');
  const [simSearchTerm, setSimSearchTerm] = useState('');
  const [simCategory, setSimCategory] = useState('Todos');
  const [simulationCart, setSimulationCart] = useState<Record<string, number>>({});
  const [savedProposals, setSavedProposals] = useState<SavedProposal[]>(() => {
    try {
      const saved = localStorage.getItem('mg_saved_proposals');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [proposalNameInput, setProposalNameInput] = useState('');
  const [showSaveProposalDialog, setShowSaveProposalDialog] = useState(false);
  const [isSavingProposal, setIsSavingProposal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCurrentSimulationSaved, setIsCurrentSimulationSaved] = useState(false);
  const [showAlreadySavedModal, setShowAlreadySavedModal] = useState(false);
  const [previewProposal, setPreviewProposal] = useState<SavedProposal | null>(null);
  const [showPreviewDetails, setShowPreviewDetails] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<'select' | 'summary' | 'history'>('select');
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState('');
  const [purchaseCategory, setPurchaseCategory] = useState('Todos');
  const [purchaseCart, setPurchaseCart] = useState<Record<string, number>>({});
  const [purchaseAttachments, setPurchaseAttachments] = useState<string[]>([]);
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [reportProposal, setReportProposal] = useState<SavedProposal | PurchaseRecord | null>(null);
  const [viewImageIndex, setViewImageIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('mg_saved_proposals', JSON.stringify(savedProposals));
  }, [savedProposals]);

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
      const matchesSubcategory = !selectedSubcategory || (selectedSubcategory === 'Mix & Match' && (p.isPromoActive || p.hasMixMatch || p.isMixMatchActive));
      return matchesSearch && matchesCategory && matchesSubcategory;
    });
  }, [products, searchTerm, selectedCategory, selectedSubcategory]);

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

  const handleInputChange = (productId: string, field: 'buy' | 'sell', value: string) => {
    if (!canManagePrices) return;
    setEditingPrices(prev => {
      const current = prev[productId] || {};
      const newEdit = { ...current, [field]: value };
      if (field === 'buy') {
        const product = products.find(p => p.id === productId);
        const packSize = product?.packSize || 1;
        const numValue = parseFloat(value.replace(',', '.'));
        if (!isNaN(numValue)) {
          newEdit.packBuy = (numValue * packSize).toString();
        } else {
          newEdit.packBuy = '';
        }
      }
      return { ...prev, [productId]: newEdit };
    });
  };

  const handlePromoChange = (productId: string, field: 'qty' | 'price', value: string) => {
    if (!canManagePrices) return;
    setEditingPrices(prev => ({ 
      ...prev, 
      [productId]: { 
        ...prev[productId], 
        [field === 'qty' ? 'promoQty' : 'promoPrice']: value 
      } 
    }));
  };

  const togglePromo = (productId: string) => {
    if (!canManagePrices) return;
    triggerHaptic('selection');
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const currentState = editingPrices[productId]?.isPromoActive !== undefined
      ? editingPrices[productId].isPromoActive
      : !!(product.isPromoActive || product.isMixMatchActive);
    const newState = !currentState;
    setEditingPrices(prev => ({
      ...prev,
      [productId]: { ...prev[productId], isPromoActive: newState }
    }));
    const immediateUpdates: Partial<Product> = {
      isPromoActive:    newState,
      hasMixMatch:      newState,
      isMixMatchActive: newState,
      isMixMatch:       newState,
      ...(newState === false
        ? { promoQty: 0, promoPrice: 0, mixMatchQty: 0, mixMatchPrice: 0 }
        : {}
      ),
    };
    updateProduct(productId, immediateUpdates);
    showToast(newState ? 'Mix & Match activado!' : 'Mix & Match desactivado!');
  };

  const handlePackPriceChange = (productId: string, packSize: number, packPriceStr: string) => {
    if (!canManagePrices) return;
    const packPrice = parseFloat(packPriceStr.replace(',', '.'));
    const unitPrice = !isNaN(packPrice) ? (packPrice / packSize).toString() : '';
    setEditingPrices(prev => ({ 
      ...prev, 
      [productId]: { ...prev[productId], buy: unitPrice, packBuy: packPriceStr } 
    }));
  };

  const handleSave = async (productId: string, productName: string) => {
    if (!canManagePrices) return;
    const updates = editingPrices[productId];
    const currentProduct = products.find(p => p.id === productId);
    if (!updates || !currentProduct) return;

    const parsedBuy = updates.buy !== undefined ? parseFloat(updates.buy.replace(',', '.')) : undefined;
    const parsedSell = updates.sell !== undefined ? parseFloat(updates.sell.replace(',', '.')) : undefined;
    const parsedPromoQty = updates.promoQty !== undefined ? parseFloat(updates.promoQty.replace(',', '.')) : undefined;
    const parsedPromoPrice = updates.promoPrice !== undefined ? parseFloat(updates.promoPrice.replace(',', '.')) : undefined;

    if (parsedBuy !== undefined && isNaN(parsedBuy)) { showToast('Preço de compra inválido.'); return; }
    if (parsedSell !== undefined && isNaN(parsedSell)) { showToast('Preço de venda inválido.'); return; }
    if (parsedPromoQty !== undefined && isNaN(parsedPromoQty)) { showToast('Quantidade promocional inválida.'); return; }
    if (parsedPromoPrice !== undefined && isNaN(parsedPromoPrice)) { showToast('Preço promocional inválido.'); return; }

    const finalUpdates: Partial<Product> = {
      buyPrice: parsedBuy,
      sellPrice: parsedSell,
      promoQty: parsedPromoQty,
      promoPrice: parsedPromoPrice,
      isPromoActive: updates.isPromoActive,
      hasMixMatch: updates.isPromoActive !== undefined ? updates.isPromoActive : currentProduct.hasMixMatch,
      mixMatchQty: parsedPromoQty !== undefined ? parsedPromoQty : currentProduct.mixMatchQty,
      mixMatchPrice: parsedPromoPrice !== undefined ? parsedPromoPrice : currentProduct.mixMatchPrice,
      isMixMatchActive: updates.isPromoActive !== undefined ? updates.isPromoActive : currentProduct.isMixMatchActive,
      isMixMatch: updates.isPromoActive !== undefined ? updates.isPromoActive : currentProduct.isMixMatch,
      ...(updates.isPromoActive === false ? { promoQty: 0, promoPrice: 0 } : {}),
      discountAmount: parsedPromoPrice
        ? (currentProduct.sellPrice * (currentProduct.promoQty || 1) - parsedPromoPrice)
        : 0
    };

    // PX-1: remover undefined E NaN antes de enviar
    Object.keys(finalUpdates).forEach(key => {
      const val = (finalUpdates as any)[key];
      if (val === undefined || (typeof val === 'number' && isNaN(val))) {
        delete (finalUpdates as any)[key];
      }
    });

    // PX-1: mostrar indicador de a guardar
    showToast(`A guardar preços de ${productName}...`);

    try {
      await updateProduct(productId, finalUpdates);
      showToast(`✅ Preços de ${productName} guardados no servidor!`);
      // PX-1: só limpar editingPrices após confirmação de escrita
      setEditingPrices(prev => {
        const newState = { ...prev };
        delete newState[productId];
        return newState;
      });
    } catch (err) {
      console.error('Erro ao guardar preço:', err);
      showToast(`❌ Erro ao guardar. Verifique a ligação e tente novamente.`);
      // PX-1: NÃO limpar editingPrices em caso de falha — dados ficam visíveis para retry
    }
  };
  
  const updateSimulationCart = useCallback((productId: string, delta: number) => {
    triggerHaptic('impact');
    setIsCurrentSimulationSaved(false);
    setSimulationCart(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, Math.round((currentQty + delta) * 10) / 10);
      const newCart = { ...prev, [productId]: newQty };
      if (newQty === 0) delete newCart[productId];
      return newCart;
    });
  }, [triggerHaptic]);

  const simulationTotal = useMemo(() => {
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
  }, [simulationCart, products]);

  const simulationCartItems = useMemo(() => {
    return Object.entries(simulationCart).map(([id, qty]) => {
      const p = products.find(prod => prod.id === id);
      return { id, qty, p };
    });
  }, [simulationCart, products]);

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

  const groupedPurchases = useMemo(() => {
    const groups: Record<string, PurchaseRecord[]> = {};
    purchases.forEach(p => {
      if (!groups[p.date]) groups[p.date] = [];
      groups[p.date].push(p);
    });
    return Object.entries(groups).sort(([, a], [, b]) => (b[0].timestamp || 0) - (a[0].timestamp || 0));
  }, [purchases]);

  const updatePurchaseCart = useCallback((productId: string, delta: number) => {
    triggerHaptic('impact');
    setPurchaseCart(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, Math.round((currentQty + delta) * 10) / 10);
      const newCart = { ...prev, [productId]: newQty };
      if (newQty === 0) delete newCart[productId];
      return newCart;
    });
  }, [triggerHaptic]);

  const purchaseTotal = useMemo(() => {
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
  }, [purchaseCart, products]);

  const purchaseCartItems = useMemo(() => {
    return Object.entries(purchaseCart).map(([id, qty]) => {
      const p = products.find(prod => prod.id === id);
      return { id, qty, p };
    });
  }, [purchaseCart, products]);

  const [showConfirmPurchase, setShowConfirmPurchase] = useState(false);

  const handleGeneratePurchase = async () => {
    if (!canEditPurchases) {
      triggerHaptic('error');
      showToast("Sem permissão para gerar compras reais. Contacta o administrador.");
      return;
    }
    if (Object.keys(purchaseCart).length === 0) {
      triggerHaptic('error');
      showToast("O carrinho está vazio! Adicione produtos.");
      return;
    }
    if (isProcessingPurchase || isUploading) return;
    setIsProcessingPurchase(true);
    setShowConfirmPurchase(false);
    try {
      triggerHaptic('success');
      await new Promise(resolve => setTimeout(resolve, 1000));
      addPurchase(
        purchaseCart,
        'Prices',
        user?.name || 'Desconhecido',
        purchaseAttachments,
        purchaseSupplier || 'Sem Fornecedor',
        purchaseDate || undefined
      );
      setPurchaseCart({});
      setPurchaseAttachments([]);
      setPurchaseSupplier('');
      setPurchaseDate('');
      setPurchaseStep('history');
      showToast("Compra efectuada! Stock e Relatórios Actualizados.");
    } catch (error) {
      console.error("Erro ao processar compra:", error);
      triggerHaptic('error');
      showToast("Erro ao processar compra.");
    } finally {
      setIsProcessingPurchase(false);
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
      setIsUploading(true);
      const reader = getFileReader();
      if (!reader) {
        showToast('Navegador não suporta leitura de ficheiros.');
        return;
      }
      reader.onloadend = () => {
        setPurchaseAttachments(prev => [...prev, reader.result as string]);
        setIsUploading(false);
      };
      reader.onerror = () => {
        setIsUploading(false);
        showToast('Erro ao processar imagem.');
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

  const handleSaveProposal = async () => {
    if (isSavingProposal) return;
    setIsSavingProposal(true);
    triggerHaptic('success');
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      const pricesSnapshot: Record<string, { buy: number; sell: number }> = {};
      Object.keys(simulationCart).forEach(id => {
        const p = products.find(prod => prod.id === id);
        if (p) {
          pricesSnapshot[id] = { buy: p.buyPrice, sell: p.sellPrice };
        }
      });
      const newProposal: SavedProposal = {
        id: generateUUID(),
        name: proposalNameInput || `Proposta ${formatDisplayDate(formatDateISO(getSystemDate()))}`,
        date: getSystemDate().toLocaleString('pt-AO'),
        items: { ...simulationCart },
        total: simulationTotal,
        createdBy: user?.name || 'Desconhecido',
        snapshotPrices: pricesSnapshot,
        status: 'Proposta'
      };
      setSavedProposals(prev => [newProposal, ...prev]);
      setIsCurrentSimulationSaved(true);
      setProposalNameInput('');
      setShowSaveProposalDialog(false);
      showToast("Proposta guardada com sucesso!");
    } catch (error) {
      showToast("Erro ao guardar proposta.");
    } finally {
      setIsSavingProposal(false);
    }
  };

  const handleOpenLoadPreview = (proposal: SavedProposal) => {
    triggerHaptic('selection');
    setPreviewProposal(proposal);
    setShowPreviewDetails(false);
  };

  const handleDeleteProposal = (id: string) => {
    triggerHaptic('warning');
    setSavedProposals(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem('mg_saved_proposals', JSON.stringify(updated));
      return updated;
    });
    showToast("Proposta eliminada com sucesso.");
  };

  const handleOpenReport = (data: SavedProposal | PurchaseRecord) => {
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
  };

  const getModalSubtitle = () => {
    switch(simulationStep) {
      case 'select': return 'Selecione os produtos e quantidades (Grades/Caixas)';
      case 'summary': return 'Revisão final da proposta com valores';
      case 'message': return 'Copiar lista para envio (WhatsApp/SMS)';
      case 'saved': return 'Gerir propostas guardadas anteriormente';
      default: return '';
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-24 relative">
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-slide-up">
          <div className="bg-[#003366] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold text-sm">
            <CheckCircle size={18} className="text-green-400" /> {toast.message}
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className={`transition-all duration-300 ${sidebarMode === 'hidden' ? 'pl-16 md:pl-20' : ''}`}>
          <h1 className="text-3xl font-bold text-[#003366] dark:text-white">Gestão de Preços</h1>
          <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            Controlo de margens e valores de mercado
            {!canManagePrices && (
              <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                <Lock size={10} /> Modo Leitura (Preços)
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 flex-1 items-center">
          <SyncStatus />
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar produto..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 soft-ui-inset border-none text-sm font-medium focus:ring-2 focus:ring-[#003366] transition-all dark:text-white" 
            />
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            <div
              className="flex gap-2 overflow-x-auto pb-2"
              style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {filterCategories.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => { triggerHaptic('selection'); setSelectedCategory(cat); setSelectedSubcategory(null); }} 
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat 
                      ? 'bg-[#003366] text-white shadow-lg shadow-blue-200' 
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {selectedCategory === 'Cervejas' && (
              <div className="flex gap-2 animate-fade-in">
                <button 
                  onClick={() => { triggerHaptic('selection'); setSelectedSubcategory(selectedSubcategory === 'Mix & Match' ? null : 'Mix & Match'); }}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                    selectedSubcategory === 'Mix & Match' 
                      ? 'bg-amber-500 text-white shadow-md' 
                      : 'bg-white dark:bg-slate-800 text-amber-600 border border-amber-200 dark:border-amber-900/30'
                  }`}
                >
                  <Plus size={12} /> Mix & Match
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex justify-between items-center cursor-pointer group select-none" onClick={toggleTable}>
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-[#003366] dark:text-white text-xl flex items-center gap-2">
            <DollarSign size={24} /> Tabela de Produtos
          </h3>
          <button
            onClick={(e) => { e.stopPropagation(); triggerHaptic('impact'); setShowMixMatchModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors text-xs font-bold"
          >
            <Layers size={14} />
            Criar Mix Match
          </button>
        </div>
        <button className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400 group-hover:text-[#003366] dark:group-hover:text-white transition-all">
          {isTableExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

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
                    <th className="p-6 font-bold text-[#003366] dark:text-white text-xs uppercase tracking-wider text-center">Acções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => {
                      const currentEdit = editingPrices[p.id] || {};
                      const displayBuy = currentEdit.buy !== undefined ? currentEdit.buy : p.buyPrice.toString();
                      const displaySell = currentEdit.sell !== undefined ? currentEdit.sell : p.sellPrice.toString();
                      const numBuy = parseFloat(displayBuy.replace(',', '.')) || 0;
                      const numSell = parseFloat(displaySell.replace(',', '.')) || 0;
                      const profit = numSell - numBuy;
                      const hasChanged = currentEdit.buy !== undefined || currentEdit.sell !== undefined || currentEdit.promoQty !== undefined || currentEdit.promoPrice !== undefined || currentEdit.isPromoActive !== undefined;
                      const packSize = p.packSize && p.packSize > 1 ? p.packSize : 1;
                      const displayPackBuy = currentEdit.packBuy !== undefined 
                        ? currentEdit.packBuy 
                        : (p.buyPrice * packSize).toString();

                      return (
                        <React.Fragment key={p.id}>
                          <tr className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors ${hasChanged ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}>
                            <td className="p-6">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-800 dark:text-white text-base">{p.name}</p>
                                {(p.isMixMatchActive || p.isPromoActive || p.hasMixMatch) && (
                                  <button 
                                    onClick={() => toggleRow(p.id)}
                                    className={`p-1 rounded-full transition-all ${expandedRows[p.id] ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}
                                  >
                                    {expandedRows[p.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  </button>
                                )}
                              </div>
                              <div className="flex gap-2 mt-1">
                                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 rounded-md">{p.category}</span>
                                {packSize > 1 && (
                                  <span className="text-[10px] uppercase font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 px-2 rounded-md">
                                    {p.packType || 'Pack'} de {packSize}un
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-6">
                              {packSize > 1 ? (
                                <div className="flex flex-col gap-1 w-full min-w-[180px]">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                    Preço da {p.packType || 'Grade'} ({packSize}un)
                                  </label>
                                  <div className={`flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-xl soft-ui-inset border border-slate-200 dark:border-slate-600 shadow-inner ${!canManagePrices || isLocked ? 'opacity-60 grayscale' : ''}`}>
                                    <input 
                                      type="text" 
                                      inputMode="decimal"
                                      disabled={!canManagePrices || isLocked}
                                      value={displayPackBuy ?? ''}
                                      onChange={(e) => handlePackPriceChange(p.id, packSize, e.target.value)}
                                      className="bg-transparent border-none w-full text-lg font-bold text-[#003366] dark:text-white focus:ring-0 outline-none p-0 disabled:cursor-not-allowed"
                                      placeholder="0"
                                    />
                                    <span className="text-xs font-black text-slate-400">KZ</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 px-1 font-medium">
                                    = <span className="font-bold text-[#003366] dark:text-white">{(numBuy || 0).toLocaleString('pt-AO', {maximumFractionDigits: 2})} Kz</span> /unidade
                                  </div>
                                </div>
                              ) : (
                                <div className={`flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl soft-ui-inset border border-slate-200 dark:border-slate-600 w-full min-w-[180px] shadow-inner ${!canManagePrices || isLocked ? 'opacity-60 grayscale' : ''}`}>
                                  <span className="text-xs font-black text-slate-400">KZ</span>
                                  <input 
                                    type="text" 
                                    inputMode="decimal"
                                    disabled={!canManagePrices || isLocked}
                                    value={displayBuy ?? ''}
                                    onChange={(e) => handleInputChange(p.id, 'buy', e.target.value)}
                                    className="bg-transparent border-none w-full text-lg font-bold text-[#003366] dark:text-white focus:ring-0 outline-none p-0 disabled:cursor-not-allowed"
                                    placeholder="0"
                                  />
                                </div>
                              )}
                            </td>
                            <td className="p-6">
                              <div className="flex flex-col gap-1 w-full min-w-[180px]">
                                {packSize > 1 && <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider opacity-0">Spacer</label>}
                                <div className={`flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-xl soft-ui-inset border border-slate-200 dark:border-slate-600 shadow-inner h-[46px] ${!canManagePrices || isLocked ? 'opacity-60 grayscale' : ''}`}>
                                  <span className="text-xs font-black text-slate-400">KZ</span>
                                  <input 
                                    type="text" 
                                    inputMode="decimal"
                                    disabled={!canManagePrices || isLocked}
                                    value={displaySell ?? ''}
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
                                {(Math.abs(profit) || 0).toLocaleString('pt-AO', {maximumFractionDigits: 1})} Kz
                              </span>
                            </td>
                            <td className="p-6 align-middle">
                              <div className="flex justify-center gap-3">
                                <div className="flex flex-col items-center gap-1">
                              {hasChanged && canManagePrices && !isLocked && (
                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-wide animate-pulse">
                                  Não guardado
                                </span>
                              )}
                              <button 
                                onClick={() => handleSave(p.id, p.name)} 
                                disabled={!hasChanged || !canManagePrices || isLocked} 
                                className={`p-3 rounded-xl transition-all active:scale-95 ${
                                  hasChanged && canManagePrices && !isLocked
                                    ? 'bg-[#003366] text-white shadow-lg hover:bg-[#004488] ring-2 ring-amber-400 ring-offset-1' 
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-500 cursor-not-allowed'
                                }`}
                                title={canManagePrices ? "Guardar Alterações" : "Sem permissão para alterar"}
                              >
                                {canManagePrices ? <Save size={20} /> : <Lock size={20} />}
                              </button>
                            </div>
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
                          {expandedRows[p.id] && (p.isMixMatchActive || p.isPromoActive || p.hasMixMatch) && (
                            <tr className="bg-slate-50 dark:bg-slate-800/50 animate-fade-in">
                              <td colSpan={5} className="p-4">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-inner max-w-md relative">
                                  <button onClick={() => toggleRow(p.id)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 transition-colors">
                                    <X size={20} />
                                  </button>
                                  <div className="flex items-center justify-between mb-4 pr-8">
                                    <h4 className="text-xs font-black uppercase text-[#003366] dark:text-blue-400 flex items-center gap-2 tracking-widest">
                                      <Calculator size={14} /> Configuração Mix & Match (Promoção)
                                    </h4>
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] font-bold uppercase text-slate-400">Activar Promoção</span>
                                      <button 
                                        onClick={() => togglePromo(p.id)}
                                        disabled={!canManagePrices || isLocked}
                                        className={`w-10 h-5 rounded-full p-1 transition-colors ${
                                          (currentEdit.isPromoActive !== undefined ? currentEdit.isPromoActive : p.isPromoActive) 
                                            ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
                                            : 'bg-slate-300 dark:bg-slate-600'
                                        }`}
                                      >
                                        <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${
                                          (currentEdit.isPromoActive !== undefined ? currentEdit.isPromoActive : p.isPromoActive) 
                                            ? 'translate-x-5' 
                                            : 'translate-x-0'
                                        }`} />
                                      </button>
                                    </div>
                                  </div>
                                  <div className={`grid grid-cols-2 gap-6 transition-all duration-300 ${(currentEdit.isPromoActive !== undefined ? currentEdit.isPromoActive : p.isPromoActive) ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Quantidade Mínima</label>
                                      <div className="relative">
                                        <input 
                                          type="text" inputMode="decimal" disabled={!canManagePrices || isLocked}
                                          value={currentEdit.promoQty ?? (p.promoQty?.toString() || '')}
                                          onChange={(e) => handlePromoChange(p.id, 'qty', e.target.value)}
                                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-lg font-black text-[#003366] dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                          placeholder="3"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">Unidades</span>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Preço Promocional (Pack)</label>
                                      <div className="relative">
                                        <input 
                                          type="text" inputMode="decimal" disabled={!canManagePrices || isLocked}
                                          value={currentEdit.promoPrice ?? (p.promoPrice?.toString() || '')}
                                          onChange={(e) => handlePromoChange(p.id, 'price', e.target.value)}
                                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-lg font-black text-green-600 dark:text-green-400 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                                          placeholder="1000"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">KZ</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium leading-relaxed">
                                      <Info size={12} className="inline mr-1 mb-0.5" />
                                      O Mix & Match permite que o cliente combine diferentes produtos para atingir a quantidade mínima e obter o preço promocional.
                                    </p>
                                  </div>
                                  <div className="mt-6 flex justify-end">
                                    <button onClick={() => toggleRow(p.id)} className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 transition-all active:scale-95">
                                      Fechar
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400 font-medium italic">
                        Nenhum produto encontrado com os filtros actuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SoftCard>
        </div>
      )}

      <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
        <SoftCard className="bg-amber-50 dark:bg-amber-900/10 text-[#003366] dark:text-amber-100 flex flex-col justify-center items-center gap-8 py-12 text-center relative overflow-hidden group border border-amber-100 dark:border-amber-900/20">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-amber-200/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="p-6 bg-amber-100 dark:bg-amber-900/30 rounded-[40px] shadow-sm">
            <ShoppingCart size={48} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-2xl font-black mb-2">Simular Proposta de Compra</h3>
            <p className="text-slate-600 dark:text-amber-200/70 text-sm max-w-[320px]">
              Gere uma lista de compras calculada por grades/caixas e saiba exactamente quanto vai gastar.
            </p>
          </div>
          <button 
            onClick={() => { triggerHaptic('impact'); setShowSimulationModal(true); setSimulationStep('select'); }} 
            className="pill-button px-12 py-4 bg-[#003366] text-white font-black shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            Iniciar Simulação
          </button>
        </SoftCard>
      </div>

      <div className="mt-8 border-t-2 border-dashed border-slate-200 dark:border-slate-700 pt-8">
        <div className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-xl border border-blue-100 dark:border-slate-700">
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
          <div className="p-8 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-[#0054A6] dark:text-blue-400 flex items-center justify-center">
                  <Info size={24} />
                </div>
                <p className="text-sm max-w-md">Use esta secção para registar compras reais. O stock será actualizado automaticamente e o valor entrará no relatório de vendas do dia como "Comprou-se".</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest">Total Compras Hoje</p>
                <p className="text-2xl font-black text-[#0054A6] dark:text-blue-400">
                  {(purchases.filter(p => cleanDate(p.date) === formatDateISO(systemDate)).reduce((acc, curr) => acc + curr.total, 0) || 0).toLocaleString('pt-AO')} Kz
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: MIX MATCH */}
      {showMixMatchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-xl font-black text-[#003366] dark:text-white flex items-center gap-3">
                <Layers size={24} className="text-purple-500" /> Criar Mix Match
              </h2>
              <button onClick={() => setShowMixMatchModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Selecione os produtos que deseja agrupar para venda conjunta (Mix Match).
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Quantidade do Grupo</label>
                  <input 
                    type="text" inputMode="decimal"
                    value={mixMatchQty ?? ''}
                    onChange={(e) => setMixMatchQty(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-lg font-black text-[#003366] dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="3"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Preço do Grupo (KZ)</label>
                  <input 
                    type="text" inputMode="decimal"
                    value={mixMatchPrice ?? ''}
                    onChange={(e) => setMixMatchPrice(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-lg font-black text-green-600 dark:text-green-400 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    placeholder="1000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                {products.map(p => (
                  <label key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={!!selectedMixMatchProducts[p.id]}
                      onChange={() => setSelectedMixMatchProducts(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500" 
                    />
                    <div className="flex-1">
                      <div className="font-bold text-[#003366] dark:text-white">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.category}</div>
                    </div>
                    <div className="font-bold text-slate-700 dark:text-slate-300">
                      {safeFormatCurrency(p.sellPrice)}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button 
                onClick={() => { setShowMixMatchModal(false); setSelectedMixMatchProducts({}); }}
                className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const selectedIds = Object.keys(selectedMixMatchProducts).filter(id => selectedMixMatchProducts[id]);
                  if (selectedIds.length === 0) { showToast('Selecione pelo menos um produto!'); return; }
                  triggerHaptic('success');
                  selectedIds.forEach(id => {
                    updateProduct(id, {
                      hasMixMatch: true, mixMatchQty, mixMatchPrice,
                      isMixMatchActive: true, isPromoActive: true,
                      promoQty: mixMatchQty, promoPrice: mixMatchPrice
                    });
                  });
                  setShowMixMatchModal(false);
                  setSelectedMixMatchProducts({});
                  showToast(`${selectedIds.length} produtos actualizados com Mix Match!`);
                }}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
              >
                <Save size={18} /> Guardar Grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SIMULADOR */}
      {showSimulationModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#F8FAFC] dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-[32px] shadow-2xl flex flex-col relative overflow-hidden border border-white/20">
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
                >
                  <FolderOpen size={20} />
                </button>
                <button onClick={resetSimulation} className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-red-500 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {simulationStep === 'select' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-4 sticky top-0 z-10 bg-[#F8FAFC] dark:bg-slate-900 pb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" placeholder="Filtrar produtos..." value={simSearchTerm} onChange={e => setSimSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border-none shadow-sm text-sm dark:text-white" />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                      {filterCategories.map(cat => (
                        <button key={cat} onClick={() => setSimCategory(cat)} 
                          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${simCategory === cat ? 'bg-[#003366] text-white' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700'}`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredSimulationProducts.map(p => {
                      const qty = simulationCart[p.id] || 0;
                      const packSize = p.packSize || 1;
                      const packCost = p.buyPrice * packSize;
                      return (
                        <div key={p.id} className={`p-4 rounded-[24px] border transition-all duration-300 flex flex-col justify-between h-full ${qty > 0 ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                          <div>
                            <p className="font-bold text-[#003366] dark:text-white text-sm leading-tight mb-1">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{p.packType || 'Pack'} de {packSize}un</p>
                          </div>
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-black text-[#003366] dark:text-blue-400">{(packCost || 0).toLocaleString()} Kz</span>
                              {qty > 0 && <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{(packCost * qty).toLocaleString()} Kz</span>}
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 rounded-2xl p-1">
                                <button onClick={() => updateSimulationCart(p.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-600 rounded-xl shadow-sm text-slate-400 hover:text-red-500 transition-all"><Minus size={14} /></button>
                                <span className="font-black text-sm text-[#003366] dark:text-white">{qty}</span>
                                <button onClick={() => updateSimulationCart(p.id, 1)} className="w-8 h-8 flex items-center justify-center bg-[#003366] text-white rounded-xl shadow-md hover:bg-[#004488] transition-all"><Plus size={14} /></button>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => updateSimulationCart(p.id, -0.5)} className="flex-1 py-1 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-400 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-red-50 hover:text-red-500 transition-all">- ½</button>
                                <button onClick={() => updateSimulationCart(p.id, 0.5)} className="flex-1 py-1 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-400 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-blue-50 hover:text-blue-500 transition-all">+ ½</button>
                              </div>
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
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{formatDisplayDate(formatDateISO(getSystemDate()))}</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-sans font-black text-3xl tracking-tighter text-[#E3007E]" style={{ filter: 'drop-shadow(0 0 12px rgba(227, 0, 126, 0.4))' }}>MG</span>
                        <div className="w-10 h-[1px] bg-[#E3007E]/50 mt-0.5"></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {simulationCartItems.map(({ id, qty, p }) => (
                        <CartItem key={id} id={id} qty={qty} product={p} />
                      ))}
                    </div>
                    <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-100 dark:border-slate-700 flex justify-between items-end">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Estimado</p>
                        <p className="text-4xl font-black text-[#003366] dark:text-blue-400">{(simulationTotal || 0).toLocaleString()} <span className="text-lg">Kz</span></p>
                      </div>
                      <div className="text-right text-[10px] text-slate-400 font-medium">
                        *Valores baseados no último preço de compra registado.
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={checkSaveProposal}
                      disabled={isSavingProposal || simulationTotal === 0}
                      className={`flex items-center justify-center gap-2 p-4 bg-white dark:bg-slate-800 text-[#003366] dark:text-white rounded-2xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all ${isSavingProposal ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSavingProposal ? <div className="w-5 h-5 border-2 border-[#003366] border-t-transparent rounded-full animate-spin"></div> : <Save size={20} />}
                      {isSavingProposal ? 'A guardar...' : isCurrentSimulationSaved ? 'Guardada' : 'Guardar Proposta'}
                    </button>
                    <button onClick={generateOrderMessage} className="flex items-center justify-center gap-2 p-4 bg-green-500 text-white rounded-2xl font-bold shadow-lg shadow-green-200 dark:shadow-none hover:bg-green-600 transition-all">
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
                    <textarea value={generatedMessage} onChange={e => setGeneratedMessage(e.target.value)}
                      className="w-full h-64 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none focus:ring-2 focus:ring-green-500 text-sm font-medium dark:text-white custom-scrollbar" />
                    <button onClick={copyToClipboard} className="w-full mt-6 py-4 bg-[#003366] text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
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
                      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300"><Folder size={40} /></div>
                      <p className="text-slate-400 font-medium italic">Nenhuma proposta guardada ainda.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedProposals.map(prop => (
                        <div key={prop.id} className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-bold text-[#003366] dark:text-white">{prop.name}</h4>
                              <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase"><Calendar size={10} /> {prop.date}</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteProposal(prop.id); }} className="p-2 text-slate-400 hover:text-red-500 transition-all">
                              <Trash2 size={18} />
                            </button>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-black text-[#003366] dark:text-blue-400">{(prop.total || 0).toLocaleString()} Kz</span>
                            <button onClick={() => handleOpenReport(prop)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-[#003366] hover:text-white transition-all">
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

            <div className="bg-white dark:bg-slate-800 p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total da Proposta</span>
                <span className="text-2xl font-black text-[#003366] dark:text-blue-400">{(simulationTotal || 0).toLocaleString()} Kz</span>
              </div>
              <div className="flex gap-3">
                {simulationStep === 'summary' && (
                  <button onClick={() => setSimulationStep('select')} className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 transition-all">
                    Editar Lista
                  </button>
                )}
                {simulationStep === 'select' && (
                  <button onClick={() => { triggerHaptic('impact'); setSimulationStep('summary'); }} disabled={simulationTotal === 0}
                    className="px-8 py-3 bg-[#003366] text-white rounded-2xl font-black shadow-xl shadow-blue-200 dark:shadow-none hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2">
                    Rever Proposta <ArrowRight size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CENTRAL DE COMPRAS */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#F8FAFC] dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-[32px] shadow-2xl flex flex-col relative overflow-hidden border border-white/20">
            <div className="bg-[#0054A6] p-6 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <ShoppingBag size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Central de Compras</h2>
                  <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80">
                    {purchaseStep === 'select' ? 'Selecção de Produtos' : purchaseStep === 'summary' ? 'Finalização de Compra' : 'Histórico de Aquisições'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setPurchaseStep(purchaseStep === 'history' ? 'select' : 'history')} 
                  className={`p-3 rounded-2xl transition-all ${purchaseStep === 'history' ? 'bg-white text-[#0054A6]' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  <History size={24} />
                </button>
                <button onClick={resetPurchaseModal} className="p-3 bg-white/10 text-white hover:bg-white/20 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {purchaseStep === 'select' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-4 sticky top-0 z-10 bg-[#F8FAFC] dark:bg-slate-900 pb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" placeholder="Pesquisar para compra..." value={purchaseSearchTerm} onChange={e => setPurchaseSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border-none shadow-sm text-sm dark:text-white" />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                      {filterCategories.map(cat => (
                        <button key={cat} onClick={() => setPurchaseCategory(cat)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${purchaseCategory === cat ? 'bg-[#0054A6] text-white' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700'}`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredPurchaseProducts.map(p => {
                      const qty = purchaseCart[p.id] || 0;
                      const packSize = p.packSize || 1;
                      const packCost = p.buyPrice * packSize;
                      return (
                        <div key={p.id} className={`p-4 rounded-[24px] border transition-all duration-300 flex flex-col justify-between h-full ${qty > 0 ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight mb-1">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{p.packType || 'Pack'} de {packSize}un</p>
                          </div>
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-black text-[#0054A6] dark:text-blue-400">{(packCost || 0).toLocaleString()} Kz</span>
                              {qty > 0 && <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{(packCost * qty).toLocaleString()} Kz</span>}
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 rounded-2xl p-1">
                                <button onClick={() => updatePurchaseCart(p.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-600 rounded-xl shadow-sm text-slate-400 hover:text-red-500 transition-all"><Minus size={14} /></button>
                                <span className="font-black text-sm text-slate-800 dark:text-white">{qty}</span>
                                <button onClick={() => updatePurchaseCart(p.id, 1)} className="w-8 h-8 flex items-center justify-center bg-[#0054A6] text-white rounded-xl shadow-md hover:bg-blue-700 transition-all"><Plus size={14} /></button>
                              </div>
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
                  <div className="md:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-xl border border-slate-100 dark:border-slate-700">
                      <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <List size={20} /> Itens da Compra
                      </h3>
                      <div className="space-y-4">
                        {purchaseCartItems.map(({ id, qty, p }) => (
                          <CartItem key={id} id={id} qty={qty} product={p} variant="blue" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-xl border border-slate-100 dark:border-slate-700">
                      <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                      <Truck size={16} /> Fornecedor / Ref.
                    </h3>
                    <input type="text" value={purchaseSupplier} onChange={(e) => setPurchaseSupplier(e.target.value)}
                      placeholder="Ex: Refriango, Coca-Cola..."
                      className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none soft-ui-inset text-sm font-medium dark:text-white mb-4" />
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Calendar size={12} /> Data da Compra (deixar vazio = hoje)
                      </p>
                      <input type="date" value={purchaseDate} max={formatDateISO(getSystemDate())}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-[#0054A6]" />
                      {purchaseDate && purchaseDate !== formatDateISO(getSystemDate()) && (
                        <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                          ⚠️ Compra será registada em {purchaseDate}
                        </p>
                      )}
                    </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-xl border border-slate-100 dark:border-slate-700">
                      <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                        <Paperclip size={16} /> Comprovativos ({purchaseAttachments.length}/3)
                      </h3>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {purchaseAttachments.map((img, idx) => (
                          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                            <img src={img} alt="Anexo" className="w-full h-full object-cover" />
                            <button onClick={() => setPurchaseAttachments(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        {purchaseAttachments.length < 3 && (
                          <button onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-[#0054A6] hover:text-[#0054A6] transition-all">
                            <Camera size={20} />
                            <span className="text-[8px] font-bold mt-1 uppercase">Adicionar</span>
                          </button>
                        )}
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                      <p className="text-[10px] text-slate-400 italic leading-tight">Anexe fotos de facturas ou recibos para auditoria futura.</p>
                    </div>
                    <div className="bg-[#0054A6] text-white rounded-[32px] p-6 shadow-xl relative overflow-hidden">
                      <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                      <p className="text-xs font-bold text-blue-100 uppercase tracking-widest mb-1">Total a Pagar</p>
                      <p className="text-3xl font-black mb-6">{(purchaseTotal || 0).toLocaleString()} <span className="text-sm">Kz</span></p>
                      <div className="grid grid-cols-2 gap-3 relative z-10">
                        <button onClick={() => setPurchaseStep('select')}
                          className="py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider">
                          <ArrowLeft size={14} /> Voltar e Editar
                        </button>
                        <button onClick={() => setShowConfirmPurchase(true)}
                          disabled={isProcessingPurchase || isUploading || Object.keys(purchaseCart).length === 0 || isLocked}
                          className={`py-4 bg-white text-[#0054A6] rounded-2xl font-black shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider ${isProcessingPurchase || isUploading || isLocked ? 'opacity-70 cursor-wait' : ''}`}>
                          {isProcessingPurchase || isUploading ? <div className="w-4 h-4 border-2 border-[#0054A6] border-t-transparent rounded-full animate-spin"></div> : <ClipboardCheck size={14} />}
                          {isUploading ? 'A processar...' : isProcessingPurchase ? '...' : 'Confirmar Compra'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {purchaseStep === 'history' && (
                <div className="space-y-8 animate-fade-in">
                  {groupedPurchases.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300"><History size={40} /></div>
                      <p className="text-slate-400 font-medium italic">Nenhuma compra registada no histórico.</p>
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
                            <div key={purchase.id} className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-[#0054A6] rounded-xl flex items-center justify-center">
                                    <ShoppingBag size={20} />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Compra efectuada</h4>
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
                                <span className="text-lg font-black text-[#0054A6] dark:text-blue-400">{(purchase.total || 0).toLocaleString()} Kz</span>
                                <button onClick={() => handleOpenReport(purchase)}
                                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-[#0054A6] hover:text-white transition-all">
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

            <div className="bg-white dark:bg-slate-800 p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total do Carrinho</span>
                <span className="text-2xl font-black text-[#0054A6] dark:text-blue-400">{(purchaseTotal || 0).toLocaleString()} Kz</span>
              </div>
              <div className="flex gap-3">
                {purchaseStep === 'select' && (
                  <button onClick={() => { triggerHaptic('impact'); setPurchaseStep('summary'); }} disabled={purchaseTotal === 0}
                    className="px-8 py-3 bg-[#0054A6] text-white rounded-2xl font-black shadow-xl shadow-blue-200 dark:shadow-none hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2">
                    Rever Compra <ArrowRight size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RELATÓRIO */}
      {reportProposal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#F8FAFC] dark:bg-slate-900 w-full max-w-4xl h-[90vh] rounded-[32px] shadow-2xl flex flex-col relative overflow-hidden border border-white/20">
            <div className="bg-white dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black text-[#003366] dark:text-white flex items-center gap-3">
                  <FileText size={24} className="text-blue-500" /> {reportProposal.name || 'Compra efectuada'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                  {reportProposal.date} • {(reportProposal as any).completedBy || (reportProposal as any).createdBy || 'Sistema'}
                </p>
              </div>
              <button onClick={() => { triggerHaptic('selection'); setReportProposal(null); }} className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-red-500 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white dark:bg-slate-900">
              <div className="max-w-2xl mx-auto space-y-10">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col items-center">
                    <span className="font-sans font-black text-3xl tracking-tighter text-[#E3007E]" style={{ filter: 'drop-shadow(0 0 12px rgba(227, 0, 126, 0.4))' }}>MG</span>
                    <div className="w-10 h-[1px] bg-[#E3007E]/50 mt-0.5"></div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[#003366] dark:text-white uppercase tracking-tighter text-xl">Marguel Mobile</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {(reportProposal as SavedProposal).status === 'Proposta' ? 'Relatório de Proposta' : 'Relatório de Aquisição'}
                    </p>
                    <div className="mt-2 flex flex-col items-end gap-1">
                      {(reportProposal as SavedProposal).status && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md uppercase">
                          Estado: {(reportProposal as SavedProposal).status}
                        </span>
                      )}
                      {(reportProposal as PurchaseRecord).supplier && (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md uppercase">
                          Fornecedor/Ref: {(reportProposal as PurchaseRecord).supplier}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                        <th className="p-4 text-left">Produto</th>
                        <th className="p-4 text-center">Qtd</th>
                        <th className="p-4 text-right">Preço Unit.</th>
                        <th className="p-4 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {Object.entries(reportProposal.items).map(([id, qty]) => {
                        const p = products.find(prod => prod.id === id);
                        if (!p) return null;
                        const snapshot = (reportProposal as SavedProposal).snapshotPrices?.[id];
                        const unitPrice = snapshot ? snapshot.buy : p.buyPrice;
                        const packSize = p.packSize || 1;
                        const packCost = unitPrice * packSize;
                        const subtotal = packCost * Number(qty);
                        return (
                          <tr key={id} className="dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-4">
                              <p className="font-bold">{p.name}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-medium">{p.packType || 'Pack'} de {packSize}un</p>
                            </td>
                            <td className="p-4 text-center font-black text-[#003366] dark:text-blue-400">{qty}</td>
                            <td className="p-4 text-right font-medium text-slate-500">{(packCost || 0).toLocaleString()} Kz</td>
                            <td className="p-4 text-right font-bold text-slate-800 dark:text-white">{(subtotal || 0).toLocaleString()} Kz</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#003366] text-white font-black">
                        <td colSpan={3} className="p-4 text-lg">Total Geral</td>
                        <td className="p-4 text-right text-lg">{(reportProposal.total || 0).toLocaleString()} Kz</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {(reportProposal as any).attachments && (reportProposal as any).attachments.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Paperclip size={14} /> Comprovativos Anexados
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {(reportProposal as any).attachments.map((img: string, idx: number) => (
                        <div key={idx} onClick={() => { triggerHaptic('selection'); setViewImageIndex(idx); }}
                          className="aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-105 transition-all shadow-md">
                          <img src={img} alt="Anexo" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-10 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
                  <p className="text-[10px] text-slate-400 font-medium italic">Este documento é um registo interno de movimentação de stock e financeiro.</p>
                  <p className="text-[10px] font-black text-[#003366] dark:text-blue-400 uppercase tracking-widest">Marguel Mobile • Gestão de Preços</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HISTÓRICO DE PREÇOS */}
      {viewHistoryId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[32px] shadow-2xl flex flex-col relative overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#003366] dark:text-white flex items-center gap-2">
                <History size={20} /> Histórico de Preços
              </h3>
              <button onClick={() => { triggerHaptic('selection'); setViewHistoryId(null); }} className="p-2 text-slate-400 hover:text-red-500 transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {priceHistory.filter(h => h.productId === viewHistoryId).length === 0 ? (
                <p className="text-center text-slate-400 py-10 italic">Nenhum histórico registado para este produto.</p>
              ) : (
                <div className="space-y-4">
                  {priceHistory
                    .filter(h => h.productId === viewHistoryId)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((h, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{formatDisplayDate(h.date)}</p>
                          <p className="text-sm font-black text-[#003366] dark:text-blue-400">{(h.newSellPrice || 0).toLocaleString()} Kz</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-medium">Anterior: {(h.oldSellPrice || 0).toLocaleString()} Kz</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.newSellPrice > h.oldSellPrice ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {h.newSellPrice > h.oldSellPrice ? '+' : ''}{(((h.newSellPrice / h.oldSellPrice) - 1) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IMAGE VIEWER */}
      {viewImageIndex !== null && reportProposal && (reportProposal as any).attachments && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <button onClick={() => { triggerHaptic('selection'); setViewImageIndex(null); }} className="absolute top-6 right-6 p-4 text-white hover:text-red-500 transition-all z-10">
            <X size={32} />
          </button>
          <img src={(reportProposal as any).attachments[viewImageIndex]} alt="Visualização" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          <div className="absolute bottom-10 flex gap-4">
            <button disabled={viewImageIndex === 0} onClick={() => { triggerHaptic('selection'); setViewImageIndex(prev => prev! - 1); }}
              className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 disabled:opacity-20"><ArrowLeft size={24} /></button>
            <button disabled={viewImageIndex === (reportProposal as any).attachments.length - 1} onClick={() => { triggerHaptic('selection'); setViewImageIndex(prev => prev! + 1); }}
              className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 disabled:opacity-20"><ArrowRight size={24} /></button>
          </div>
        </div>
      )}

      {/* MODAL: GUARDAR PROPOSTA */}
      {showSaveProposalDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="p-8 space-y-6">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-[#003366] dark:text-blue-400 mx-auto">
                <Save size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-[#003366] dark:text-white uppercase tracking-tight">Guardar Proposta</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">Dê um nome para identificar esta proposta no seu histórico.</p>
              </div>
              <input type="text" autoFocus placeholder="Ex: Proposta Refriango Março"
                value={proposalNameInput} onChange={e => setProposalNameInput(e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none soft-ui-inset text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-[#003366]" />
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button onClick={() => { triggerHaptic('selection'); setShowSaveProposalDialog(false); }}
                  className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all">
                  Cancelar
                </button>
                <button onClick={handleSaveProposal} disabled={isSavingProposal}
                  className="py-4 bg-[#003366] text-white rounded-2xl font-black shadow-lg shadow-blue-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                  {isSavingProposal ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CheckCircle size={20} />}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR COMPRA */}
      {showConfirmPurchase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="p-8 space-y-6 text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-[#003366] dark:text-blue-400 mx-auto">
                <ClipboardCheck size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-[#003366] dark:text-white uppercase tracking-tight">Finalizar Aquisição</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  Esta acção irá debitar <span className="font-bold text-slate-600 dark:text-slate-200">{(purchaseTotal || 0).toLocaleString()} Kz</span> da Conta Corrente e actualizar o stock. Deseja continuar?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button onClick={() => { triggerHaptic('selection'); setShowConfirmPurchase(false); }}
                  className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all">
                  Cancelar
                </button>
                <button onClick={handleGeneratePurchase} disabled={isProcessingPurchase}
                  className="py-4 bg-[#003366] text-white rounded-2xl font-black shadow-lg shadow-blue-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                  {isProcessingPurchase ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CheckCircle size={20} />}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: JÁ GUARDADA */}
      {showAlreadySavedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="p-8 space-y-6 text-center">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 mx-auto">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-[#003366] dark:text-white uppercase tracking-tight">Proposta já Guardada</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">Esta simulação já foi arquivada. Deseja criar uma nova cópia ou apenas continuar?</p>
              </div>
              <div className="grid grid-cols-1 gap-3 pt-4">
                <button onClick={() => { triggerHaptic('impact'); setIsCurrentSimulationSaved(false); setShowAlreadySavedModal(false); setShowSaveProposalDialog(true); }}
                  className="py-4 bg-[#003366] text-white rounded-2xl font-black shadow-lg shadow-blue-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all">
                  Guardar como Nova
                </button>
                <button onClick={() => { triggerHaptic('selection'); setShowAlreadySavedModal(false); }}
                  className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all">
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-16 py-10 px-6 bg-white dark:bg-slate-800 rounded-[32px] text-center flex flex-col gap-4 font-sans shadow-sm border border-slate-100 dark:border-slate-700">
        <p className="text-sm font-bold tracking-[-0.01em] text-[#003366] dark:text-blue-400">
          Marguel Sistema de Gestão Interna
        </p>
        <div className="flex flex-col items-center">
          <span className="text-xs text-[#6B7280] dark:text-slate-400 mb-1">Desenvolvido por</span>
          <div className="text-xs tracking-[0.5px]">
            <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>DC - Comercial</span>
            <span className="text-[#6B7280] dark:text-slate-400 font-normal mx-1">&</span>
            <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>Marguel CGPS (SU) Lda</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Prices;
