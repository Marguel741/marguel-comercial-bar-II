
import React, { useMemo, useState } from 'react';
import { Package, Thermometer, Edit2, Bell, Plus, Search, ChevronUp, ChevronDown, AlertTriangle, Save, X, CheckCircle, Check, Trash2, Settings, ClipboardList, Send, ArrowRight, History, Lock } from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { useProducts } from '../contexts/ProductContext';
import { useAuth } from '../App';
import { UserRole, InventoryLog, Equipment } from '../types'; // Importar tipos centralizados
import { useLayout } from '../contexts/LayoutContext';

const Inventory: React.FC = () => {
  const { 
    products, 
    categories, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    addCategory, 
    removeCategory,
    inventoryHistory, // Usar do contexto
    addInventoryLog, // Usar do contexto
    systemDate,
    isDayLocked
  } = useProducts();
  const { user } = useAuth();
  const { sidebarMode, triggerHaptic } = useLayout();
  
  // Check locking
  const isLocked = isDayLocked(systemDate);

  const [searchTerm, setSearchTerm] = useState('');
  // Estados para filtros de alertas
  const [alertSearchTerm, setAlertSearchTerm] = useState(''); 
  const [selectedAlertCategory, setSelectedAlertCategory] = useState('Todos');

  const [alertsExpanded, setAlertsExpanded] = useState(true);
  const [stockExpanded, setStockExpanded] = useState(true); 
  const [equipmentExpanded, setEquipmentExpanded] = useState(true); 
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  
  const isAdmin = user?.role === UserRole.ADMIN_GERAL || user?.role === UserRole.PROPRIETARIO;

  // Feedback States
  const [toast, setToast] = useState<{show: boolean, message: string}>({ show: false, message: '' });
  const [savedAlertIds, setSavedAlertIds] = useState<Set<string>>(new Set());

  // --- EQUIPMENT STATE & LOGIC (KEEP LOCAL FOR NOW AS IT'S NOT IN MAIN SCHEMA YET, BUT HISTORY IS) ---
  // In a full refactor, this would also move to Context. For now, we keep equipment state here but push logs to context.
  const [equipments, setEquipments] = useState<Equipment[]>([
    { id: '1', name: 'Mesas', qty: 20, prevQty: 20, status: 'Operacional' },
    { id: '2', name: 'Cadeiras', qty: 80, prevQty: 80, status: 'Operacional' },
    { id: '3', name: 'Grades (Vazias)', qty: 50, prevQty: 48, status: 'Operacional' },
    { id: '4', name: 'Vasilhames', qty: 1200, prevQty: 1200, status: 'Operacional' },
    { id: '5', name: 'Chaves de Abrir', qty: 10, prevQty: 12, status: 'Operacional' },
    { id: '6', name: 'Freezer Vertical', qty: 3, prevQty: 3, status: 'Operacional' }
  ]);

  // Inventory Management State
  const [nextInventoryDate, setNextInventoryDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [isInventoryDone, setIsInventoryDone] = useState(false);
  const [lastInventoryDate, setLastInventoryDate] = useState<string | null>('25/09/2024');
  
  // Modals for Equipment
  const [showAddEquipModal, setShowAddEquipModal] = useState(false);
  const [newEquipName, setNewEquipName] = useState('');
  const [newEquipQty, setNewEquipQty] = useState('');
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDateEditModal, setShowDateEditModal] = useState(false);

  // Counting Process States
  const [showCountModal, setShowCountModal] = useState(false);
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [countValues, setCountValues] = useState<Record<string, number>>({});
  const [discrepancies, setDiscrepancies] = useState<{name: string, diff: number}[]>([]);
  const [justificationText, setJustificationText] = useState('');

  // --- PRODUCT MODALS ---
  const [productModal, setProductModal] = useState<{isOpen: boolean, data: any | null}>({ isOpen: false, data: null });
  const [categoryModal, setCategoryModal] = useState(false); 
  const [newCategoryName, setNewCategoryName] = useState('');

  // --- DELETE CONFIRMATION MODAL STATE ---
  const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, product: any | null}>({ isOpen: false, product: null });

  const filterCategories = useMemo(() => {
    return ['Todos', ...categories];
  }, [categories]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const getStockStatus = (qty: number, minStock: number) => {
    if (qty < 2) return { label: 'CRÍTICO', color: 'bg-red-500', textColor: 'text-red-500', type: 'CRITICAL' };
    if (qty < minStock) return { label: 'ALERTA', color: 'bg-amber-500', textColor: 'text-amber-500', type: 'SOFT' };
    return { label: 'OK', color: 'bg-green-500', textColor: 'text-green-500', type: 'OK' };
  };

  const allGeneratedAlerts = useMemo(() => {
    return products.map(item => {
      const status = getStockStatus(item.stock, item.minStock);
      if (status.type === 'OK') return null;
      
      const daysLow = Math.floor(Math.random() * 5) + 1; 
      const outOfStockDate = new Date();
      outOfStockDate.setDate(outOfStockDate.getDate() - daysLow);
      
      return {
        id: item.id,
        product: item.name,
        qty: item.stock,
        minStock: item.minStock,
        status: status,
        daysInAlert: daysLow,
        outOfStockSince: item.stock === 0 ? outOfStockDate.toLocaleDateString('pt-AO') : null,
        category: item.category // Incluído categoria para filtro
      };
    }).filter(Boolean);
  }, [products]);

  const filteredAlerts = useMemo(() => {
    return allGeneratedAlerts.filter((alert: any) => {
      const matchesSearch = alert.product.toLowerCase().includes(alertSearchTerm.toLowerCase());
      const matchesCategory = selectedAlertCategory === 'Todos' || alert.category === selectedAlertCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allGeneratedAlerts, alertSearchTerm, selectedAlertCategory]);

  const criticalCount = allGeneratedAlerts.filter(a => a?.status.type === 'CRITICAL').length;

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  // --- EQUIPMENT HANDLERS ---

  const handleAddEquipment = () => {
    if(isLocked) return;
    if (!newEquipName || !newEquipQty) return;
    triggerHaptic('success');
    
    const newId = Date.now().toString();
    const qty = parseInt(newEquipQty);
    
    setEquipments(prev => [...prev, {
        id: newId,
        name: newEquipName,
        qty: qty,
        prevQty: qty, // Assume new items start balanced
        status: 'Operacional'
    }]);
    
    setNewEquipName('');
    setNewEquipQty('');
    setShowAddEquipModal(false);
    showToast('Equipamento adicionado!');
  };

  const handleRemoveEquipment = (id: string) => {
    if(isLocked) return;
    if (!isAdmin) return;
    if(window.confirm("Deseja remover este equipamento da lista permanentemente?")) {
        triggerHaptic('warning');
        setEquipments(prev => prev.filter(e => e.id !== id));
        showToast('Equipamento removido.');
    }
  };

  const startInventoryCount = () => {
    if(isLocked) {
        alert("Dia Bloqueado.");
        return;
    }
    triggerHaptic('impact');
    // Initialize count values with current values
    const initialCounts: Record<string, number> = {};
    equipments.forEach(e => initialCounts[e.id] = e.qty);
    setCountValues(initialCounts);
    setShowCountModal(true);
  };

  const handleCountChange = (id: string, val: string) => {
    const num = parseInt(val);
    setCountValues(prev => ({ ...prev, [id]: isNaN(num) ? 0 : num }));
  };

  const processInventoryCount = () => {
    // 1. Calculate discrepancies
    const losses: {name: string, diff: number}[] = [];
    
    equipments.forEach(eq => {
        const newQty = countValues[eq.id];
        const oldQty = eq.qty; // Comparing against what we *thought* we had (System Record)
        
        if (newQty < oldQty) {
            losses.push({ name: eq.name, diff: newQty - oldQty });
        }
    });

    if (losses.length > 0) {
        triggerHaptic('warning');
        setDiscrepancies(losses);
        setShowJustificationModal(true);
        // Don't close count modal yet, wait for justification
    } else {
        finalizeInventory();
    }
  };

  const handleBackToEditCount = () => {
    triggerHaptic('selection');
    setShowJustificationModal(false);
    // User goes back to count modal, discrepancies cleared
    setDiscrepancies([]);
  };

  const finalizeInventory = () => {
    triggerHaptic('success');
    
    const hasDiscrepancy = discrepancies.length > 0;
    
    // Update Equipments State
    setEquipments(prev => prev.map(eq => ({
        ...eq,
        prevQty: eq.qty, // Store old qty as previous
        qty: countValues[eq.id] // Update to new counted qty
    })));

    setLastInventoryDate(systemDate.toLocaleDateString('pt-AO'));
    setIsInventoryDone(true);
    
    // Add to History (Global Context)
    const newLog: InventoryLog = {
        id: Date.now().toString(),
        date: systemDate.toLocaleDateString('pt-AO'),
        performedBy: user?.name || 'Desconhecido',
        totalItems: (Object.values(countValues) as number[]).reduce((a, b) => a + b, 0),
        discrepancies: hasDiscrepancy ? discrepancies : [],
        status: hasDiscrepancy ? 'DIVERGENTE' : 'OK',
        justification: hasDiscrepancy ? justificationText : undefined
    };
    addInventoryLog(newLog); // Context Action

    // Simulate sending report via Multi-Channel
    setTimeout(() => {
        showToast('📄 Relatório salvo no histórico');
    }, 500);
    
    setTimeout(() => {
        // Only broadcast loudly if there are issues, or just a general confirmation
        if (hasDiscrepancy) {
            alert(`⚠️ ALERTA DE DIVERGÊNCIA ENVIADO!\n\nFoi enviado automaticamente um relatório para:\n• Administrador Geral\n• Proprietário\n• Chat Geral\n\nMotivo: ${justificationText}`);
        } else {
            showToast('✅ Sincronizado com Admin e Chat Geral');
        }
    }, 1500);

    // Reset UI
    setShowCountModal(false);
    setShowJustificationModal(false);
    setJustificationText('');
    setDiscrepancies([]);
  };

  const handleUpdateNextDate = () => {
    if (!isAdmin) return;
    triggerHaptic('success');
    setShowDateEditModal(false);
    showToast('Data da próxima contagem atualizada');
  };

  // --- PRODUCT HANDLERS ---

  const handleOpenProductModal = (product: any = null) => {
    if(isLocked) {
        alert("Dia Bloqueado. Edição de produto não permitida.");
        return;
    }
    triggerHaptic('selection');
    if (product) {
      setProductModal({ isOpen: true, data: { ...product, originalStock: product.stock } });
    } else {
      setProductModal({ 
        isOpen: true, 
        data: { name: '', category: 'Geral', stock: '', minStock: '', packSize: 24, packType: 'Grade', originalStock: 0 } 
      });
    }
  };

  const handleSaveProduct = () => {
    if(isLocked) return;
    triggerHaptic('success');
    const data = productModal.data;
    if (!data.name) return;

    const newStock = parseInt(data.stock) || 0;
    
    if (data.id) {
      updateProduct(data.id, {
        name: data.name,
        category: data.category,
        stock: newStock,
        minStock: parseInt(data.minStock) || 0,
        packSize: data.packSize,
        packType: data.packType
      });
    } else {
      addProduct({
        name: data.name,
        category: data.category,
        stock: newStock,
        minStock: parseInt(data.minStock) || 10,
        sellPrice: 0,
        buyPrice: 0,
        packSize: data.packSize,
        packType: data.packType
      });
    }
    setProductModal({ isOpen: false, data: null });
    showToast('Dados do produto atualizados!');
  };

  const handleAddStock = (amount: number) => {
    triggerHaptic('impact');
    setProductModal(prev => {
      if (!prev.data) return prev;
      const currentStock = parseInt(prev.data.stock) || 0;
      return {
        ...prev,
        data: {
          ...prev.data,
          stock: currentStock + amount
        }
      };
    });
  };

  // Abre o modal de confirmação em vez de window.confirm
  const handleRequestDelete = (product: any) => {
    if(isLocked) {
        alert("Dia Bloqueado.");
        return;
    }
    triggerHaptic('warning');
    setDeleteConfirmation({ isOpen: true, product });
  };

  // Executa a eliminação após confirmação no modal
  const handleConfirmDelete = () => {
    if (deleteConfirmation.product) {
        triggerHaptic('error'); // Haptic forte para delete
        deleteProduct(deleteConfirmation.product.id);
        showToast('Produto removido permanentemente.');
        setDeleteConfirmation({ isOpen: false, product: null });
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      triggerHaptic('success');
      addCategory(newCategoryName.trim());
      setNewCategoryName('');
      showToast('Categoria adicionada!');
    }
  };

  const handleRemoveCategory = (cat: string) => {
    triggerHaptic('warning');
    if (window.confirm(`Deseja remover a categoria "${cat}"?`)) {
      removeCategory(cat);
      showToast('Categoria removida.');
    }
  };

  const handleUpdateMinStock = (productId: string, newMin: string) => {
    if(isLocked) return;
    const val = parseInt(newMin);
    if (!isNaN(val)) {
        updateProduct(productId, { minStock: val });
        const newSet = new Set(savedAlertIds);
        newSet.add(productId);
        setSavedAlertIds(newSet);
        setTimeout(() => {
            setSavedAlertIds(prev => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
            });
        }, 2000);
    }
  };

  const handleMinStockBlurOrEnter = (e: any, productId: string) => {
      if (e.type === 'blur' || e.key === 'Enter') {
          triggerHaptic('success');
          showToast('Alerta de Stock Atualizado');
      }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in relative pb-20">
      
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
          <h1 className="text-3xl font-bold text-[#003366] dark:text-white">Inventário</h1>
          <div className="flex gap-2 items-center text-slate-500">
             <p>Gestão de stock e património</p>
             {isLocked ? (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold flex items-center gap-1"><Lock size={10} /> Dia Bloqueado</span>
             ) : (
                <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold">Hoje (Sis): {systemDate.toLocaleDateString('pt-AO')}</span>
             )}
          </div>
        </div>
        <div className="flex flex-1 justify-center md:justify-end gap-2 w-full md:w-auto">
          {isAdmin && (
             <button 
               onClick={() => { triggerHaptic('selection'); setCategoryModal(true); }}
               disabled={isLocked}
               className={`pill-button px-4 py-3 bg-white dark:bg-slate-800 text-[#003366] dark:text-white font-bold flex items-center justify-center gap-2 shadow-sm border border-slate-200 dark:border-slate-700 flex-1 md:flex-none ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
             >
               <Settings size={20} /> Categorias
             </button>
          )}
          <button 
            onClick={() => handleOpenProductModal()}
            disabled={isLocked}
            className={`pill-button px-6 py-3 font-bold flex items-center justify-center gap-2 shadow-lg flex-1 md:flex-none ${isLocked ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-[#003366] text-white shadow-blue-200'}`}
          >
            {isLocked ? <Lock size={20} /> : <Plus size={20} />} Novo Produto
          </button>
        </div>
      </header>

      {/* ALERTAS AUTOMÁTICOS */}
      {allGeneratedAlerts.length > 0 && (
        <div className="flex flex-col gap-2">
           <div 
             className="flex items-center justify-between cursor-pointer group select-none py-2" 
             onClick={() => setAlertsExpanded(!alertsExpanded)}
           >
             <div className="flex items-center gap-4">
               <div className="relative">
                 <Bell className="text-amber-500 animate-bounce" size={24} />
                 <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-[#f8fafc] shadow-sm">
                   {allGeneratedAlerts.length}
                 </span>
               </div>
               <div>
                 <h3 className="font-bold text-[#003366] dark:text-white text-lg leading-tight">Alertas Automáticos de Stock</h3>
                 {!alertsExpanded && (
                   <p className="text-xs text-red-500 font-bold animate-fade-in">
                     {criticalCount > 0 ? `${criticalCount} Produtos com nível CRÍTICO` : `${allGeneratedAlerts.length} produtos em baixa`}
                   </p>
                 )}
               </div>
             </div>
             <button className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-[#003366] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm">
               {alertsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
             </button>
           </div>

           {alertsExpanded && (
             <div className="animate-fade-in space-y-4">
               {/* BARRA DE PESQUISA E FILTROS DE ALERTAS */}
               <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Pesquisar em alertas..." 
                      value={alertSearchTerm}
                      onChange={(e) => setAlertSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-800 border-none soft-ui-inset dark:text-white text-sm w-full font-medium"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 md:pb-0 max-w-full md:max-w-md">
                     {filterCategories.map(cat => (
                       <button
                         key={cat}
                         onClick={() => setSelectedAlertCategory(cat)}
                         className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                           selectedAlertCategory === cat 
                             ? 'bg-amber-500 text-white shadow-md' 
                             : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                         }`}
                       >
                         {cat}
                       </button>
                     ))}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {filteredAlerts.length > 0 ? (
                   filteredAlerts.map((alert: any) => (
                    <SoftCard key={alert.id} className={`border-l-4 overflow-visible relative ${alert.status.type === 'CRITICAL' ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20' : 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/20'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${alert.status.type === 'CRITICAL' ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}`}>
                            {alert.status.type === 'CRITICAL' ? 'Nível Crítico' : 'Stock Baixo'}
                          </p>
                          <p className="font-bold text-[#003366] dark:text-white text-lg leading-tight">{alert.product}</p>
                          <div className="mt-3 flex items-center gap-4">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Atual</p>
                              <p className="font-bold text-slate-700 dark:text-slate-300">{alert.qty} <span className="text-[10px] font-normal">un.</span></p>
                            </div>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-600"></div>
                            <div className="relative">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Mínimo</p>
                              <div className="flex items-center gap-2">
                                 {isAdmin ? (
                                   <>
                                     <input 
                                       type="number" 
                                       disabled={isLocked}
                                       className="w-16 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-center text-sm font-bold focus:ring-2 focus:ring-[#003366] outline-none disabled:opacity-50"
                                       value={alert.minStock}
                                       onChange={(e) => handleUpdateMinStock(alert.id, e.target.value)}
                                       onKeyDown={(e) => handleMinStockBlurOrEnter(e, alert.id)}
                                       onBlur={(e) => handleMinStockBlurOrEnter(e, alert.id)}
                                     />
                                     {savedAlertIds.has(alert.id) && (
                                       <span className="absolute -top-5 left-0 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold animate-fade-slide-up whitespace-nowrap shadow-sm z-10 flex items-center gap-1">
                                         <Check size={8} /> Guardado!
                                       </span>
                                     )}
                                   </>
                                 ) : (
                                   <span className="font-bold text-slate-700 dark:text-slate-300">{alert.minStock}</span>
                                 )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SoftCard>
                   ))
                 ) : (
                   <div className="col-span-full py-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                     Nenhum alerta encontrado com os filtros atuais.
                   </div>
                 )}
               </div>
             </div>
           )}
        </div>
      )}

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* STOCK AREA (PRODUTOS) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col gap-4">
             <div 
               className="flex justify-between items-center cursor-pointer group"
               onClick={() => setStockExpanded(!stockExpanded)}
             >
                <h3 className="font-bold text-[#003366] dark:text-white flex items-center gap-2 text-xl">
                  <Package size={24} /> Stock de Produtos
                </h3>
                <button className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400 group-hover:text-[#003366] dark:group-hover:text-white transition-all">
                  {stockExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
             </div>
             
             {stockExpanded && (
               <div className="animate-fade-in space-y-4">
                 {/* Filters */}
                 <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Pesquisar produto..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border-none soft-ui-inset dark:text-white text-sm w-full font-medium"
                      />
                    </div>
                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 md:pb-0 max-w-full md:max-w-md">
                       {filterCategories.map(cat => (
                         <button
                           key={cat}
                           onClick={() => setSelectedCategory(cat)}
                           className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                             selectedCategory === cat 
                               ? 'bg-[#003366] text-white shadow-lg shadow-blue-200' 
                               : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                           }`}
                         >
                           {cat}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    {filteredProducts.map((item) => {
                      const status = getStockStatus(item.stock, item.minStock);
                      return (
                        <SoftCard key={item.id} className="flex items-center justify-between border-l-4 border-transparent hover:border-[#003366] dark:hover:border-blue-400">
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${status.color} shadow-sm`} />
                            <div>
                              <p className="font-bold text-[#003366] dark:text-white">{item.name}</p>
                              <p className="text-xs text-slate-400 uppercase font-bold">{item.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className={`text-2xl font-black ${status.type === 'OK' ? 'text-[#003366] dark:text-white' : (status.type === 'CRITICAL' ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400')}`}>
                                {item.stock}
                              </p>
                              <p className="text-xs text-slate-400 font-bold">unidades</p>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleOpenProductModal(item)}
                                disabled={isLocked}
                                className={`p-2 rounded-xl transition-all active:scale-95 ${isLocked ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-[#003366] dark:hover:text-blue-400'}`}
                                title="Editar Produto"
                              >
                                {isLocked ? <Lock size={18} /> : <Edit2 size={18} />}
                              </button>
                              {isAdmin && (
                                <button 
                                  onClick={() => handleRequestDelete(item)}
                                  disabled={isLocked}
                                  className={`p-2 rounded-xl transition-all active:scale-95 ${isLocked ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-red-50 dark:bg-red-900/20 text-red-400 hover:text-red-600'}`}
                                  title="Apagar Produto"
                                >
                                  {isLocked ? <Lock size={18} /> : <Trash2 size={18} />}
                                </button>
                              )}
                            </div>
                          </div>
                        </SoftCard>
                      );
                    })}
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* EQUIPMENT & FURNITURE COLUMN */}
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
             <div 
               className="flex justify-between items-center cursor-pointer group"
               onClick={() => setEquipmentExpanded(!equipmentExpanded)}
             >
                <h3 className="font-bold text-[#003366] dark:text-white flex items-center gap-2">
                  <Thermometer size={20} /> Equipamentos & Mobília
                </h3>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowHistoryModal(true); }}
                    className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95 md:hidden"
                    title="Ver Histórico de Contagens"
                  >
                    <History size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowAddEquipModal(true); }}
                    disabled={isLocked}
                    className={`p-2 rounded-full transition-all active:scale-95 ${isLocked ? 'bg-slate-200 text-slate-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800'}`}
                    title="Adicionar Novo Item"
                  >
                    <Plus size={16} />
                  </button>
                  <button className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400 group-hover:text-[#003366] dark:group-hover:text-white transition-all">
                    {equipmentExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
             </div>
             
             {equipmentExpanded && (
               <div className="space-y-4 animate-fade-in">
                 <div className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-4 pr-1">
                   {equipments.map((item) => (
                     <SoftCard key={item.id} className="bg-slate-50/50 dark:bg-slate-800/50 relative group pr-10">
                       <div className="flex justify-between items-start mb-2">
                         <p className="font-bold text-[#003366] dark:text-white">{item.name}</p>
                         <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${item.status === 'Operacional' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                           {item.status}
                         </span>
                       </div>
                       <div className="flex justify-between items-end">
                          <p className="text-3xl font-black text-[#003366] dark:text-white">{item.qty}</p>
                          <p className="text-xs text-slate-400 font-medium">Anterior: {item.prevQty}</p>
                       </div>
                       {isAdmin && (
                           <button 
                               onClick={() => handleRemoveEquipment(item.id)}
                               disabled={isLocked}
                               className={`absolute top-1/2 -translate-y-1/2 right-2 p-2 rounded-full transition-all ${isLocked ? 'text-slate-300' : 'text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                               title="Remover Equipamento"
                           >
                               {isLocked ? <Lock size={16} /> : <Trash2 size={16} />}
                           </button>
                       )}
                     </SoftCard>
                   ))}
                 </div>
               </div>
             )}
          </div>

          {/* ADMIN CONTROL FOR EQUIPMENT */}
          <div className="bg-[#003366] dark:bg-blue-900 rounded-2xl p-5 text-white shadow-lg relative">
               <h4 className="font-bold flex items-center gap-2 mb-3">
                  <ClipboardList size={18} /> Gestão de Contagem
               </h4>
               
               <div className="flex justify-between text-xs mb-4 border-b border-white/20 pb-3">
                  <div>
                     <p className="opacity-60 uppercase mb-1">Próxima Contagem</p>
                     <p 
                       className={`font-bold text-lg ${isAdmin ? 'cursor-pointer hover:underline underline-offset-4 decoration-white/50' : ''}`}
                       onClick={() => isAdmin && setShowDateEditModal(true)}
                       title={isAdmin ? "Editar data" : ""}
                     >
                        {new Date(nextInventoryDate).toLocaleDateString('pt-AO', {day: '2-digit', month: 'short'})} 
                        {isAdmin && <Edit2 size={10} className="inline ml-1 opacity-50" />}
                     </p>
                  </div>
                  <div className="text-right">
                     <p className="opacity-60 uppercase mb-1">Status Mês</p>
                     {isInventoryDone ? (
                        <span className="bg-green-500 text-white px-2 py-1 rounded text-[10px] font-bold">REALIZADO</span>
                     ) : (
                        <span className="bg-amber-500 text-white px-2 py-1 rounded text-[10px] font-bold">PENDENTE</span>
                     )}
                  </div>
               </div>

               <button 
                 onClick={startInventoryCount}
                 disabled={isLocked}
                 className={`w-full py-3 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-95 ${isLocked ? 'bg-white/20 text-white/50 cursor-not-allowed' : 'bg-white text-[#003366] hover:bg-blue-50'}`}
               >
                 {isLocked ? <><Lock size={16} /> Contagem Bloqueada</> : (isInventoryDone ? 'Refazer Contagem' : 'Realizar Contagem Agora')}
               </button>
               
               {lastInventoryDate && (
                  <p className="text-[10px] opacity-50 text-center mt-2">
                     Última confirmação: {lastInventoryDate}
                  </p>
               )}

               <button 
                 onClick={() => setShowHistoryModal(true)}
                 className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                 title="Ver Histórico Completo"
               >
                 <History size={16} />
               </button>
          </div>

        </div>
      </div>

      {/* --- MODAL: CONFIRMAR ELIMINAÇÃO DE PRODUTO --- */}
      {deleteConfirmation.isOpen && deleteConfirmation.product && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl relative text-center border-t-8 border-red-500">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400 animate-pulse">
                 <AlertTriangle size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Eliminar Produto?</h2>
              <p className="text-slate-500 dark:text-slate-300 text-sm mb-6">
                 Você está prestes a remover <strong className="text-slate-800 dark:text-white">{deleteConfirmation.product.name}</strong> permanentemente do sistema. Esta ação não pode ser desfeita.
              </p>
              
              <div className="flex flex-col gap-3">
                 <button 
                   onClick={handleConfirmDelete}
                   className="w-full py-4 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   <Trash2 size={20} /> Sim, Eliminar Agora
                 </button>
                 <button 
                   onClick={() => setDeleteConfirmation({isOpen: false, product: null})}
                   className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                 >
                   Cancelar
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- MODAL: ADICIONAR EQUIPAMENTO --- */}
      {showAddEquipModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
              <h3 className="text-lg font-bold text-[#003366] dark:text-white mb-4">Adicionar Item/Mobília</h3>
              <div className="space-y-4">
                 <input 
                   type="text" 
                   placeholder="Nome (Ex: Mesa de Plástico)"
                   value={newEquipName}
                   onChange={(e) => setNewEquipName(e.target.value)}
                   className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border-none soft-ui-inset dark:text-white"
                 />
                 <input 
                   type="number" 
                   placeholder="Quantidade Atual"
                   value={newEquipQty}
                   onChange={(e) => setNewEquipQty(e.target.value)}
                   className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border-none soft-ui-inset dark:text-white"
                 />
                 <div className="flex gap-3">
                    <button onClick={() => setShowAddEquipModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold rounded-xl">Cancelar</button>
                    <button onClick={handleAddEquipment} className="flex-1 py-3 bg-[#003366] text-white font-bold rounded-xl">Adicionar</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* --- MODAL: CONTAGEM DE INVENTÁRIO --- */}
      {showCountModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl relative flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                 <h3 className="text-xl font-black text-[#003366] dark:text-white">Contagem Mensal</h3>
                 <button onClick={() => setShowCountModal(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                 <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Insira a quantidade física real contada hoje.</p>
                 {equipments.map(eq => (
                    <div key={eq.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <span className="font-bold text-slate-700 dark:text-white w-1/3">{eq.name}</span>
                        <div className="flex items-center gap-4">
                           <div className="text-right">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Mês Passado</p>
                              <p className="font-bold text-slate-500 dark:text-slate-400">{eq.qty}</p>
                           </div>
                           <ArrowRight size={16} className="text-slate-300" />
                           <div className="w-20">
                              <input 
                                type="number" 
                                value={countValues[eq.id] ?? ''}
                                onChange={(e) => handleCountChange(eq.id, e.target.value)}
                                className="w-full p-2 text-center font-bold text-[#003366] bg-white dark:bg-slate-600 dark:text-white border border-blue-100 dark:border-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                           </div>
                        </div>
                    </div>
                 ))}
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                 <button 
                   onClick={processInventoryCount}
                   className="w-full py-4 bg-[#003366] text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                 >
                   Finalizar e Comparar
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- MODAL: JUSTIFICATIVA DE PERDAS --- */}
      {showJustificationModal && (
        <div className="fixed inset-0 bg-red-900/40 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl relative p-6 border-l-8 border-red-500">
              <div className="flex items-start gap-4 mb-4">
                 <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full text-red-600 dark:text-red-400">
                    <AlertTriangle size={24} />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-red-600 dark:text-red-400">Divergência Detectada!</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Alguns itens diminuíram em relação ao mês anterior.</p>
                 </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl mb-4 border border-red-100 dark:border-red-900/30 max-h-32 overflow-y-auto custom-scrollbar">
                 {discrepancies.map((d, i) => (
                    <div key={i} className="flex justify-between text-sm mb-1 last:mb-0">
                       <span className="font-bold text-slate-700 dark:text-slate-300">{d.name}</span>
                       <span className="font-bold text-red-600 dark:text-red-400">{d.diff} un</span>
                    </div>
                 ))}
              </div>

              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Justificativa Obrigatória</label>
              <textarea 
                value={justificationText}
                onChange={(e) => setJustificationText(e.target.value)}
                placeholder="Explique o motivo (Quebra, Perda, Roubo, etc)..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 h-24 mb-4 focus:ring-2 focus:ring-red-500 outline-none resize-none dark:text-white"
              />

              <div className="space-y-3">
                <button 
                    onClick={finalizeInventory}
                    disabled={!justificationText.trim()}
                    className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200"
                >
                    <Send size={18} /> Salvar e Enviar Relatório
                </button>
                <button 
                    onClick={handleBackToEditCount}
                    className="w-full py-3 text-slate-500 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-sm"
                >
                    Voltar e Corrigir
                </button>
              </div>
           </div>
        </div>
      )}

      {/* --- MODAL: HISTÓRICO DE CONTAGENS --- */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                 <h3 className="text-xl font-bold text-[#003366] dark:text-white flex items-center gap-2">
                    <History size={24} /> Histórico de Contagens
                 </h3>
                 <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                 {inventoryHistory.length === 0 ? (
                    <p className="text-center text-slate-400 py-10 italic">Nenhum histórico disponível.</p>
                 ) : (
                    inventoryHistory.map((log) => (
                        <div key={log.id} className="border border-slate-100 dark:border-slate-700 rounded-2xl p-4 bg-slate-50 dark:bg-slate-700/50">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-bold text-[#003366] dark:text-white">{log.date}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Por: {log.performedBy}</p>
                                </div>
                                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${log.status === 'OK' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                    {log.status}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-t border-slate-200 dark:border-slate-600 pt-2 mt-2">
                                <span className="text-slate-500 dark:text-slate-400">Total Equipamentos:</span>
                                <span className="font-bold dark:text-white">{log.totalItems}</span>
                            </div>
                            {log.status === 'DIVERGENTE' && (
                                <div className="mt-3 bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                                    <p className="text-xs font-bold text-red-500 dark:text-red-400 mb-1">Divergências:</p>
                                    {log.discrepancies.map((d, idx) => (
                                        <div key={idx} className="flex justify-between text-xs text-red-700 dark:text-red-300">
                                            <span>{d.name}</span>
                                            <span className="font-bold">{d.diff}</span>
                                        </div>
                                    ))}
                                    {log.justification && (
                                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 italic border-t border-red-100 dark:border-red-900/30 pt-2">
                                            "{log.justification}"
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      )}

      {/* ... (Date Edit Modal - Admin only) ... */}
      {showDateEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="text-lg font-bold text-[#003366] dark:text-white mb-4">Agendar Próxima Contagem</h3>
              <input 
                type="date"
                value={nextInventoryDate}
                onChange={(e) => setNextInventoryDate(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 mb-4 font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-[#003366] outline-none"
              />
              <div className="flex gap-3">
                 <button onClick={() => setShowDateEditModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold rounded-xl">Cancelar</button>
                 <button onClick={handleUpdateNextDate} className="flex-1 py-3 bg-[#003366] text-white font-bold rounded-xl">Salvar</button>
              </div>
           </div>
        </div>
      )}

      {/* Product Modal */}
      {productModal.isOpen && productModal.data && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md animate-fade-in shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-[#003366] dark:text-white mb-6">
              {productModal.data.id ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Nome</label>
                <input 
                  type="text"
                  value={productModal.data.name}
                  onChange={e => setProductModal({ ...productModal, data: { ...productModal.data, name: e.target.value } })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border-none soft-ui-inset dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-bold text-slate-400 uppercase">Tipo</label>
                   <select 
                     value={productModal.data.packType || 'Grade'}
                     onChange={e => setProductModal({ ...productModal, data: { ...productModal.data, packType: e.target.value } })}
                     className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border-none soft-ui-inset text-sm dark:text-white"
                   >
                     <option value="Grade">Grade</option>
                     <option value="Caixa">Caixa</option>
                     <option value="Embalagem">Embalagem</option>
                     <option value="Fardo">Fardo</option>
                   </select>
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-400 uppercase">Tam. Pack</label>
                   <input 
                     type="number"
                     value={productModal.data.packSize}
                     onChange={e => setProductModal({ ...productModal, data: { ...productModal.data, packSize: parseInt(e.target.value) } })}
                     className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border-none soft-ui-inset dark:text-white"
                   />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Stock Atual (Físico)</label>
                  <input 
                    type="number"
                    value={productModal.data.stock}
                    onChange={e => setProductModal({ ...productModal, data: { ...productModal.data, stock: e.target.value } })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border-none soft-ui-inset font-bold dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Mínimo</label>
                  <input 
                    type="number"
                    value={productModal.data.minStock}
                    onChange={e => setProductModal({ ...productModal, data: { ...productModal.data, minStock: e.target.value } })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border-none soft-ui-inset dark:text-white"
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
                <p className="text-[10px] font-bold text-blue-500 dark:text-blue-300 uppercase mb-2">Adicionar Stock Físico (Não é Compra)</p>
                <div className="flex gap-2">
                   <button 
                     onClick={() => handleAddStock(productModal.data.packSize)}
                     className="flex-1 py-2 bg-white dark:bg-slate-700 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold rounded-lg text-xs hover:bg-blue-50 dark:hover:bg-slate-600 active:scale-95 transition-all"
                   >
                      +1 {productModal.data.packType}
                   </button>
                   <button 
                     onClick={() => handleAddStock(productModal.data.packSize / 2)}
                     className="flex-1 py-2 bg-white dark:bg-slate-700 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold rounded-lg text-xs hover:bg-blue-50 dark:hover:bg-slate-600 active:scale-95 transition-all"
                   >
                      +1/2 {productModal.data.packType}
                   </button>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button 
                  onClick={() => setProductModal({ isOpen: false, data: null })}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveProduct}
                  className="flex-1 py-3 bg-[#003366] text-white font-bold rounded-xl shadow-lg hover:opacity-95 active:scale-95 transition-all"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager */}
      {categoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm animate-fade-in shadow-2xl">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#003366] dark:text-white">Categorias</h2>
                <button onClick={() => setCategoryModal(false)} className="text-slate-400"><X size={20} /></button>
             </div>
             <div className="flex gap-2 mb-6">
               <input 
                 type="text" 
                 placeholder="Nova..."
                 value={newCategoryName}
                 onChange={(e) => setNewCategoryName(e.target.value)}
                 className="flex-1 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border-none soft-ui-inset text-sm dark:text-white"
               />
               <button 
                 onClick={handleAddCategory}
                 className="bg-[#003366] text-white p-3 rounded-xl shadow-lg hover:opacity-90"
               >
                 <Plus size={20} />
               </button>
             </div>
             
             <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {categories.map(cat => (
                  <div key={cat} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600">
                     <span className="font-bold text-slate-700 dark:text-white text-sm">{cat}</span>
                     {cat !== 'Geral' && (
                        <button onClick={() => handleRemoveCategory(cat)} className="text-red-400 hover:text-red-600 p-1">
                           <Trash2 size={16} />
                        </button>
                     )}
                  </div>
                ))}
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

export default Inventory;
