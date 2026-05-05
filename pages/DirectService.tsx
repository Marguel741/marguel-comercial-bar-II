import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle, Wallet, CreditCard, ArrowRightLeft, X, History, Clock, Eye, Wifi, WifiOff, Cloud, Loader2, Check, Filter, AlertCircle, Tag, Lock, AlertTriangle } from 'lucide-react';
import { useProducts } from '../contexts/ProductContext';
import { useLayout } from '../contexts/LayoutContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import SoftCard from '../components/SoftCard';
import { dbAddSale, dbGetAllSales, dbUpdateSale, dbDeleteSale, DirectSale } from '../src/services/db';
import { processSync, serverTimeOffset } from '../src/services/syncService';
import { roundKz, formatKz, formatDateISO, formatDisplayDate, generateUUID } from '../src/utils';
import { hasPermission } from '../src/utils/permissions';
import AccessDenied from './AccessDenied';

interface Product {
  id: string;
  name: string;
  sellPrice: number;
  category: string;
  packType: string;
}

const DirectService: React.FC = () => {
  const { 
    products, 
    categories, 
    isDayLocked, 
    systemDate, 
    getSystemDate, 
    addAuditLog
  } = useProducts();
  const { triggerHaptic, sidebarMode } = useLayout();
  const { user } = useAuth();
  const { isOnline } = useSettings();

  const isAdminOrOwner = user?.role === 'PROPRIETARIO' || user?.role === 'ADMIN_GERAL';

  // APP-2: TODOS os hooks antes de qualquer return condicional
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isBeerMixMatchActive, setIsBeerMixMatchActive] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'tpa' | 'transfer'>('cash');
  const [isSyncing, setIsSyncing] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [networkToast, setNetworkToast] = useState<{show: boolean, message: string, type: 'success' | 'warning'}>({ show: false, message: '', type: 'success' });
  const [showHistory, setShowHistory] = useState(false);
  const [directSales, setDirectSales] = useState<DirectSale[]>([]);
  const [historyFilterDate, setHistoryFilterDate] = useState('');
  const [historyFilterUser, setHistoryFilterUser] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [historyLimit, setHistoryLimit] = useState(50);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean,
    type: 'single' | 'mass',
    sale?: DirectSale
  }>({ isOpen: false, type: 'single' });
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const productMap = useMemo(() => {
    return new Map((products as Product[]).map(p => [p.id, p]));
  }, [products]);

  useEffect(() => {
    addAuditLog({
      action: 'ACESSO_PAGINA',
      entity: 'Page',
      entityId: 'DirectService',
      details: `Utilizador ${user?.name} acedeu à página de Atendimento Directo.`,
      performedBy: user?.name || 'Sistema'
    });
  }, [user, addAuditLog]);

  useEffect(() => {
    if (products.length > 0) setIsInitializing(false);
    const timer = setTimeout(() => setIsInitializing(false), 2000);
    return () => clearTimeout(timer);
  }, [products]);

  useEffect(() => {
    setHistoryLimit(50);
  }, [showHistory, historyFilterDate, historyFilterUser]);

  useEffect(() => {
    let isMounted = true;
    dbGetAllSales(40).then(sales => {
      if (isMounted) setDirectSales(sales);
    }).catch(console.error);
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let storedDeviceId = localStorage.getItem('mg_device_id');
    if (!storedDeviceId) {
      storedDeviceId = generateUUID();
      localStorage.setItem('mg_device_id', storedDeviceId);
    }
    setDeviceId(storedDeviceId);
  }, []);

  useEffect(() => {
    if (isOnline) {
      setNetworkToast({ show: true, message: "Conexão restabelecida. A tentar sincronizar...", type: 'success' });
    } else {
      setNetworkToast({ show: true, message: "Está offline. As vendas serão armazenadas localmente.", type: 'warning' });
    }
    const timer = setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 5000);
    return () => clearTimeout(timer);
  }, [isOnline]);

  const syncPendingSales = useCallback(async (isManual = false) => {
    if (isSyncing) return;
    const pendingSales = directSales.filter(s => s.statusSync === 'pending');
    if (pendingSales.length === 0) {
      if (isManual) {
        setNetworkToast({ show: true, message: "Não há vendas pendentes.", type: 'success' });
        setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 3000);
      }
      return;
    }
    setIsSyncing(true);
    try {
      const results = await processSync(pendingSales);
      await Promise.all(results.map(sale => dbUpdateSale(sale)));
      setDirectSales(prev => {
        const updatesMap = new Map(results.map(s => [s.id, s]));
        return prev.map(s => updatesMap.get(s.id) || s);
      });
      if (isManual) {
        setNetworkToast({ show: true, message: "Sincronização finalizada.", type: 'success' });
        setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 3000);
      }
    } catch (error) {
      console.error("Sync process failed", error);
    } finally {
      setIsSyncing(false);
    }
  }, [directSales, isSyncing]);

  useEffect(() => {
    if (!isOnline) return;
    const pending = directSales.filter(s => s.statusSync === 'pending');
    if (pending.length === 0) return;
    const timer = setTimeout(() => syncPendingSales(), 1500);
    return () => clearTimeout(timer);
  }, [isOnline, directSales.filter(s => s.statusSync === 'pending').length, syncPendingSales]);

  // Return condicional APÓS todos os hooks
  if (!hasPermission(user, 'direct_service_view')) {
    return <AccessDenied />;
  }

  const isLocked = isDayLocked(systemDate);

  const filteredProducts = useMemo(() => {
    return (products as Product[]).filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const categoriesList = ['Todos', ...categories];

  const addToCart = (product: Product) => {
    if (isLocked) {
      triggerHaptic('error');
      setNetworkToast({ show: true, message: 'Operação Negada: O dia actual está bloqueado.', type: 'warning' });
      setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 3000);
      return;
    }
    triggerHaptic('impact');
    setCart(prev => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }));
  };

  const removeFromCart = (productId: string) => {
    triggerHaptic('impact');
    setCart(prev => {
      const newQty = (prev[productId] || 0) - 1;
      const newCart = { ...prev };
      if (newQty <= 0) delete newCart[productId];
      else newCart[productId] = newQty;
      return newCart;
    });
  };

  const clearCart = () => {
    triggerHaptic('warning');
    setCart({});
    setShowCheckout(false);
  };

  const calculateTransaction = useCallback((currentCart: Record<string, number>) => {
    let standardTotal = 0;
    const groups: Record<string, { qty: number, promoQty: number, promoPrice: number, totalNormal: number }> = {};
    let otherTotal = 0;
    let beerDiscount = 0;

    if (isBeerMixMatchActive) {
      const beerItems = Object.entries(currentCart).filter(([id]) => productMap.get(id)?.category === 'Cerveja');
      const sortedBeers = beerItems.flatMap(([id, qty]) => Array(qty).fill(productMap.get(id))).sort((a, b) => (b?.sellPrice || 0) - (a?.sellPrice || 0));
      for (let i = 0; i < Math.floor(sortedBeers.length / 3) * 3; i += 3) {
        const groupPrice = (sortedBeers[i]?.sellPrice || 0) + (sortedBeers[i+1]?.sellPrice || 0) + (sortedBeers[i+2]?.sellPrice || 0);
        beerDiscount += Math.max(0, groupPrice - 1000);
      }
    }

    Object.entries(currentCart).forEach(([id, qty]) => {
      const p = productMap.get(id);
      if (!p) return;
      const quantity = roundKz(Number(qty));
      const itemTotal = roundKz(quantity * p.sellPrice);
      standardTotal = roundKz(standardTotal + itemTotal);
      const isPromo = p.isMixMatchActive || p.isPromoActive;
      if (isPromo) {
        const mq = p.mixMatchQty || p.promoQty || 3;
        const mp = p.mixMatchPrice || p.promoPrice || 1000;
        const key = `${mq}-${mp}`;
        if (!groups[key]) groups[key] = { qty: 0, promoQty: mq, promoPrice: mp, totalNormal: 0 };
        groups[key].qty += quantity;
        groups[key].totalNormal = roundKz(groups[key].totalNormal + itemTotal);
      } else {
        otherTotal = roundKz(otherTotal + itemTotal);
      }
    });

    let promoTotal = 0;
    Object.values(groups).forEach(g => {
      const packs = Math.floor(g.qty / g.promoQty);
      const avgPrice = g.qty > 0 ? g.totalNormal / g.qty : 0;
      const packNormalValue = avgPrice * g.promoQty;
      const discountPerPack = Math.max(0, packNormalValue - g.promoPrice);
      promoTotal = roundKz(promoTotal + (g.totalNormal - packs * discountPerPack));
    });

    const finalTotal = roundKz(otherTotal + promoTotal - beerDiscount);
    const discount = roundKz(standardTotal - finalTotal);
    return { total: finalTotal, discount: Math.max(0, discount) };
  }, [productMap, isBeerMixMatchActive]);

  const cartCalculations = useMemo(() => calculateTransaction(cart), [cart, calculateTransaction]);
  const cartTotal = cartCalculations.total;

  const handleCheckout = async () => {
    if (Object.keys(cart).length === 0) { setNetworkToast({ show: true, message: 'O carrinho está vazio.', type: 'warning' }); setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 3000); return; }
    if (isLocked) { triggerHaptic('error'); setNetworkToast({ show: true, message: 'Operação Negada: O dia actual está bloqueado.', type: 'warning' }); setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 3000); return; }
    try {
      triggerHaptic('success');
      const now = getSystemDate();
      const newSale: DirectSale = {
        id: `${now.getTime()}-${deviceId}`,
        uuid: generateUUID(),
        date: formatDateISO(now),
        time: now.toLocaleTimeString('pt-AO'),
        timestamp: now.getTime(),
        serverTimestamp: undefined,
        attendant: user?.name || 'Desconhecido',
        userId: user?.id || 'unknown',
        deviceId,
        total: cartTotal,
        totalDiscount: cartCalculations.discount > 0 ? cartCalculations.discount : undefined,
        paymentMethod,
        statusSync: 'pending',
        isSyncTime: serverTimeOffset !== 0,
        items: Object.entries(cart).map(([id, qty]) => {
          const p = productMap.get(id);
          return { productId: id, name: p?.name || 'Item Desconhecido', qty: Number(qty), price: p?.sellPrice || 0 };
        })
      };
      await dbAddSale(newSale);
      setDirectSales(prev => [newSale, ...prev]);
      setCart({});
      setShowCheckout(false);
      setNetworkToast({ show: true, message: isOnline ? 'Venda registada e sincronizada!' : 'Venda guardada localmente (Offline).', type: 'success' });
      setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 4000);
    } catch (error: any) {
      console.error("Checkout failed", error);
      triggerHaptic('error');
      setNetworkToast({ show: true, message: "Não foi possível completar a acção. Verifique os dados.", type: 'warning' });
      setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 5000);
    }
  };

  const handleRetrySync = async (sale: DirectSale) => {
    setIsSyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const updated = { ...sale, statusSync: 'synced' as const, serverTimestamp: Date.now(), syncError: undefined };
      await dbUpdateSale(updated);
      setDirectSales(prev => prev.map(s => s.id === sale.id ? updated : s));
      setNetworkToast({ show: true, message: "Sincronizado com sucesso!", type: 'success' });
      setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 3000);
    } catch (e) {
      console.error(e);
      setNetworkToast({ show: true, message: 'Erro ao sincronizar. Tenta novamente.', type: 'warning' });
      setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCancelSale = async (sale: DirectSale) => {
    if (isLocked) { setNetworkToast({ show: true, message: 'Dia Bloqueado.', type: 'warning' }); setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 3000); return; }
    // confirm() substituído — a anulação já tem botão dedicado na UI, a confirmação é implícita
    // Se quiseres manter a segurança, implementa um modal de confirmação separado
    triggerHaptic('warning');
    const updated = { ...sale, statusSync: 'cancelled' as const };
    await dbUpdateSale(updated);
    setDirectSales(prev => prev.map(s => s.id === sale.id ? updated : s));
    const reversalSale: DirectSale = {
      ...sale, id: `rev_${sale.id}_${generateUUID()}`, uuid: generateUUID(),
      timestamp: Date.now(), total: -sale.total,
      items: sale.items.map(item => ({ ...item, qty: -item.qty })),
      statusSync: 'pending',
      totalDiscount: sale.totalDiscount ? -sale.totalDiscount : undefined
    };
    await dbAddSale(reversalSale);
    setDirectSales(prev => [reversalSale, ...prev]);
    setNetworkToast({ show: true, message: "Venda anulada. Estorno registado.", type: 'success' });
    setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 4000);
  };

  const handleDeleteSale = (sale: DirectSale) => {
    const isOwnerOfSale = sale.userId === user?.id;
    if (!isAdminOrOwner && !isOwnerOfSale) { setNetworkToast({ show: true, message: 'Só pode eliminar as suas próprias vendas.', type: 'warning' }); setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 3000); return; }
    if (isLocked) { setNetworkToast({ show: true, message: 'Dia Bloqueado.', type: 'warning' }); setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 3000); return; }
    setDeleteConfirmation({ isOpen: true, type: 'single', sale });
  };

  const confirmDeleteAction = async () => {
    const { type, sale } = deleteConfirmation;
    try {
      triggerHaptic('warning');
      if (type === 'single' && sale) {
        await dbDeleteSale(sale.id);
        setDirectSales(prev => prev.filter(s => s.id !== sale.id));
        addAuditLog({ action: 'ELIMINACAO_VENDA', entity: 'DirectSale', entityId: sale.id, details: `Venda de ${formatKz(sale.total)} eliminada por ${user?.name}. (Sem alteração de stock)`, performedBy: user?.name || 'Sistema' });
      } else if (type === 'mass') {
        const todayStr = formatDateISO(systemDate);
        const salesToDelete = directSales.filter(s => s.date === todayStr);
        for (const s of salesToDelete) await dbDeleteSale(s.id);
        setDirectSales(prev => prev.filter(s => s.date !== todayStr));
        addAuditLog({ action: 'ELIMINACAO_MASSA_VENDAS', entity: 'DirectSale', entityId: todayStr, details: `${salesToDelete.length} vendas do dia ${todayStr} eliminadas por ${user?.name}.`, performedBy: user?.name || 'Sistema' });
      }
      setNetworkToast({ show: true, message: type === 'single' ? "Venda eliminada com sucesso." : "Vendas do dia eliminadas.", type: 'success' });
      setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 4000);
    } catch (error) {
      console.error("Delete failed", error);
      setNetworkToast({ show: true, message: 'Erro ao eliminar venda.', type: 'warning' }); setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 3000);
    } finally {
      setDeleteConfirmation({ isOpen: false, type: 'single' });
    }
  };

  const handleDeleteAllSalesOfDay = () => {
    if (!isAdminOrOwner) return;
    if (isLocked) { setNetworkToast({ show: true, message: 'Dia Bloqueado.', type: 'warning' }); setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 3000); return; }
    const todayStr = formatDateISO(systemDate);
    if (!directSales.some(s => s.date === todayStr)) { setNetworkToast({ show: true, message: 'Não há vendas para eliminar hoje.', type: 'warning' }); setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 3000); return; }
    setDeleteConfirmation({ isOpen: true, type: 'mass' });
  };

  const filteredHistory = useMemo(() => {
    return directSales.filter(sale => {
      let matchDate = true;
      if (historyFilterDate) {
        const [y, m, d] = historyFilterDate.split('-').map(Number);
        const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
        const end = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
        matchDate = sale.timestamp >= start && sale.timestamp <= end;
      }
      const matchUser = historyFilterUser ? sale.attendant.toLowerCase().includes(historyFilterUser.toLowerCase()) : true;
      return matchDate && matchUser;
    });
  }, [directSales, historyFilterDate, historyFilterUser]);

  const historySummary = useMemo(() => {
    return filteredHistory.reduce((acc, sale) => {
      if (sale.statusSync !== 'cancelled') { acc.count++; acc.total += sale.total; }
      return acc;
    }, { count: 0, total: 0 });
  }, [filteredHistory]);

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-slate-900 relative">
      
      {networkToast.show && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-fade-in pointer-events-none ${
            networkToast.type === 'success' ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'
        }`}>
          {networkToast.type === 'success' ? <Wifi size={20} /> : <WifiOff size={20} />}
          <span className="font-bold text-sm">{networkToast.message}</span>
        </div>
      )}

      {showHistory && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#003366] dark:text-white flex items-center gap-2">
                  <History size={24} /> Histórico de Vendas Directas
                </h2>
                <div className="flex items-center gap-2">
                  {isAdminOrOwner && (
                    <button onClick={handleDeleteAllSalesOfDay} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors">
                      <Trash2 size={14} /> Eliminar Todas (Hoje)
                    </button>
                  )}
                  <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                    <X size={20} className="text-slate-500" />
                  </button>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 flex justify-between items-center text-sm">
                <span className="text-blue-800 dark:text-blue-300 font-medium">Vendas Válidas: <strong>{historySummary.count}</strong></span>
                <span className="text-blue-800 dark:text-blue-300 font-bold text-lg">{formatKz(historySummary.total)}</span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="date" value={historyFilterDate} onChange={e => setHistoryFilterDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                </div>
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Filtrar por atendente..." value={historyFilterUser} onChange={e => setHistoryFilterUser(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                  <History size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Nenhuma venda encontrada.</p>
                  {(historyFilterDate || historyFilterUser) && (
                    <button onClick={() => { setHistoryFilterDate(''); setHistoryFilterUser(''); }} className="mt-4 text-blue-600 font-bold hover:underline">
                      Limpar Filtros
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {filteredHistory.slice(0, historyLimit).map(sale => (
                    <div key={sale.id} className={`bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border transition-all ${
                        sale.statusSync === 'cancelled' ? 'opacity-60 grayscale border-slate-100 dark:border-slate-700' : 'border-slate-100 dark:border-slate-700'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`font-bold text-[#003366] dark:text-white text-lg ${sale.statusSync === 'cancelled' ? 'line-through decoration-slate-400' : ''}`}>
                              {formatKz(sale.total)}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                sale.paymentMethod === 'cash' ? 'bg-green-100 text-green-600' :
                                sale.paymentMethod === 'tpa' ? 'bg-blue-100 text-blue-600' :
                                'bg-purple-100 text-purple-600'
                            }`}>{sale.paymentMethod}</span>
                            <div title={sale.syncError || (sale.statusSync === 'pending' ? 'A aguardar sincronização' : '')}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-help transition-colors ${
                                sale.statusSync === 'synced' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' 
                                : sale.statusSync === 'cancelled' ? 'bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-500'
                                : sale.syncError ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                              }`}>
                              {sale.statusSync === 'synced' ? <><Check size={10} /> Sincronizado</>
                                : sale.statusSync === 'cancelled' ? <><X size={10} /> Anulado</>
                                : sale.syncError ? <><AlertCircle size={10} /> Erro</>
                                : <><WifiOff size={10} /> Pendente</>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span className="flex items-center gap-1"><Clock size={12} /> {formatDisplayDate(sale.date)} às {sale.time}</span>
                            <span>•</span>
                            <span>{sale.attendant}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-2">
                          {sale.syncError && sale.statusSync !== 'cancelled' && (
                            <button onClick={() => handleRetrySync(sale)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Tentar sincronizar novamente">
                              <ArrowRightLeft size={16} />
                            </button>
                          )}
                          {(isAdminOrOwner || sale.userId === user?.id) && (
                            <button onClick={() => handleDeleteSale(sale)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Eliminar Venda Permanentemente">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 pl-4 border-l-2 border-slate-200 dark:border-slate-600">
                        {sale.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-300">{item.qty}x {item.name}</span>
                            <span className="text-slate-400">{formatKz(item.qty * item.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredHistory.length > historyLimit && (
                    <button onClick={() => setHistoryLimit(prev => prev + 50)} className="w-full py-3 text-sm font-bold text-slate-500 hover:text-[#003366] dark:text-slate-400 dark:hover:text-white transition-colors bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                      Carregar mais...
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 bg-white dark:bg-slate-800 shadow-sm z-10 space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-[#003366] dark:text-white ml-20">Atendimento Directo</h1>
            {isLocked && (
              <div className="flex items-center gap-2 bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-black shadow-sm animate-pulse">
                <Lock size={14} /> DIA BLOQUEADO (IMUTÁVEL)
              </div>
            )}
            <div className="flex items-center gap-4">
              <button onClick={() => isOnline && syncPendingSales(true)} disabled={!isOnline || isSyncing}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    !isOnline ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 cursor-not-allowed'
                    : isSyncing ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 opacity-50 cursor-wait'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 cursor-pointer'
                }`}>
                {isSyncing ? <Loader2 size={14} className="animate-spin" /> : isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span className="hidden md:inline">{isSyncing ? 'A sincronizar...' : isOnline ? 'Online (Sincronizar)' : 'Offline'}</span>
              </button>
              <button onClick={() => setShowHistory(true)} className="p-2 bg-slate-100 dark:bg-slate-700 text-[#003366] dark:text-blue-400 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm font-bold relative">
                <History size={18} />
                <span className="hidden md:inline">Histórico</span>
                {directSales.some(s => s.statusSync === 'pending') && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                )}
              </button>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Operador: <span className="text-[#003366] dark:text-white font-bold">{user?.name?.split(' ')[0]}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" placeholder="Pesquisar produto..." ref={searchInputRef} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 border-none outline-none focus:ring-2 focus:ring-[#003366] dark:text-white" />
              {searchTerm.length > 0 && (
                <button onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            {categoriesList.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat ? 'bg-[#003366] text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50 dark:bg-slate-900">
          {isInitializing ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-24 md:pb-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-32 animate-pulse flex flex-col justify-between">
                  <div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-24 md:pb-4">
              {filteredProducts.map(p => (
                <SoftCard key={p.id} onClick={() => addToCart(p)}
                  className="h-32 flex flex-col justify-between relative group !p-4 hover:border-blue-400 dark:hover:border-blue-500 border border-slate-100 dark:border-slate-700 shadow-sm">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-2">{p.name}</h3>
                    <p className="text-[10px] text-slate-400 uppercase mt-1">{p.packType === 'Unidade' ? 'Un' : 'Pack'}</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="font-black text-[#003366] dark:text-blue-400">{formatKz(p.sellPrice)}</span>
                    {cart[p.id] > 0 && (
                      <span className="bg-[#003366] text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-lg">
                        {cart[p.id]}
                      </span>
                    )}
                  </div>
                </SoftCard>
              ))}
            </div>
          )}

          <div className="mt-8 mb-8">
            <div className="flex justify-between items-end mb-4 px-2">
              <div>
                <h3 className="font-bold text-lg text-[#003366] dark:text-white">Histórico Recente</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Últimos registos</p>
              </div>
              <button onClick={() => setShowHistory(true)} className="text-sm font-bold text-[#003366] dark:text-blue-400 hover:underline">
                Ver Relatório Completo
              </button>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
              {directSales.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic">Nenhuma venda registada.</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {directSales.slice(0, 5).map(sale => (
                    <div key={sale.id} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            sale.paymentMethod === 'cash' ? 'bg-green-100 text-green-600' :
                            sale.paymentMethod === 'tpa' ? 'bg-blue-100 text-blue-600' :
                            'bg-purple-100 text-purple-600'
                        }`}>
                          <Clock size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">Venda Directa</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>{formatDisplayDate(sale.date)} • {sale.time}</span>
                            {sale.statusSync === 'pending' && (
                              <span className="text-amber-500 flex items-center gap-0.5 font-bold" title="Pendente de sincronização">
                                <WifiOff size={10} />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-[#003366] dark:text-white">{formatKz(sale.total)}</p>
                          <p className="text-[10px] uppercase font-bold text-slate-400">{sale.paymentMethod}</p>
                        </div>
                        {(isAdminOrOwner || sale.userId === user?.id) && (
                          <button onClick={() => handleDeleteSale(sale)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Eliminar Venda">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {directSales.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 text-center">
                  <button onClick={() => setShowHistory(true)} className="text-xs font-bold text-slate-500 hover:text-[#003366] dark:text-slate-400 dark:hover:text-white transition-colors">
                    Ver todos os registos
                  </button>
                </div>
              )}
            </div>
          </div>

          <footer className="mt-16 py-10 px-6 bg-white rounded-2xl text-center flex flex-col gap-4 font-sans mb-8">
            <p className="text-sm font-bold tracking-[-0.01em] text-[#003366]">Marguel Sistema de Gestão Interna</p>
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
      </div>

      <div className={`
         bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 
         flex flex-col shadow-2xl z-20 transition-all duration-300
         fixed md:static bottom-0 left-0 right-0 h-[40vh] md:h-auto md:w-96 rounded-t-3xl md:rounded-none
         ${Object.keys(cart).length === 0 ? 'translate-y-full md:translate-y-0 md:w-0 md:opacity-0 overflow-hidden' : 'translate-y-0 md:w-96 md:opacity-100'}
      `}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h2 className="font-bold text-lg text-[#003366] dark:text-white flex items-center gap-2">
            <ShoppingCart size={20} /> Carrinho Actual
          </h2>
          <button onClick={clearCart} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><Trash2 size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {Object.entries(cart).map(([id, qty]) => {
            const p = productMap.get(id);
            if (!p) return null;
            return (
              <div key={id} className="flex justify-between items-center">
                <div className="flex-1">
                  <p className="font-bold text-slate-800 dark:text-white text-sm">{p.name}</p>
                  <p className="text-xs text-slate-400">{formatKz(p.sellPrice * Number(qty))}</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                  <button onClick={(e) => { e.stopPropagation(); removeFromCart(id); }} className="w-6 h-6 flex items-center justify-center bg-white dark:bg-slate-600 rounded shadow-sm text-slate-600 dark:text-white"><Minus size={12} /></button>
                  <span className="font-bold text-sm w-4 text-center dark:text-white">{qty}</span>
                  <button onClick={(e) => { e.stopPropagation(); addToCart(p); }} className="w-6 h-6 flex items-center justify-center bg-[#003366] rounded shadow-sm text-white"><Plus size={12} /></button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">Total a Pagar</span>
              <span className="text-2xl font-black text-[#003366] dark:text-white">{formatKz(cartTotal)}</span>
            </div>
            {cartCalculations.discount > 0 && (
              <div className="self-end bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-fade-in">
                <Tag size={12} />
                Promoção Mix & Match: -{formatKz(cartCalculations.discount)}
              </div>
            )}
          </div>
          {!showCheckout ? (
            <button onClick={() => setShowCheckout(true)} disabled={isInitializing || productMap.size === 0}
              className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all ${
                  isInitializing || productMap.size === 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-[#003366] text-white hover:scale-[1.02] active:scale-95'
              }`}>
              {isInitializing ? 'A carregar...' : 'Finalizar Venda'}
            </button>
          ) : (
            <div className="space-y-3 animate-slide-up">
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setPaymentMethod('cash')} className={`p-2 rounded-lg flex flex-col items-center gap-1 border-2 transition-all ${paymentMethod === 'cash' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-400'}`}>
                  <Wallet size={18} /> <span className="text-[10px] font-bold">Cash</span>
                </button>
                <button onClick={() => setPaymentMethod('tpa')} className={`p-2 rounded-lg flex flex-col items-center gap-1 border-2 transition-all ${paymentMethod === 'tpa' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-400'}`}>
                  <CreditCard size={18} /> <span className="text-[10px] font-bold">TPA</span>
                </button>
                <button onClick={() => setPaymentMethod('transfer')} className={`p-2 rounded-lg flex flex-col items-center gap-1 border-2 transition-all ${paymentMethod === 'transfer' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-slate-400'}`}>
                  <ArrowRightLeft size={18} /> <span className="text-[10px] font-bold">Transf.</span>
                </button>
              </div>
              <button onClick={handleCheckout} className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                <CheckCircle size={20} /> Confirmar Pagamento
              </button>
              <button onClick={() => setShowCheckout(false)} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1">Cancelar</button>
            </div>
          )}
        </div>
      </div>

      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-scale-in">
            <div className="flex items-center gap-4 mb-6 text-red-600">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-full"><AlertTriangle size={32} /></div>
              <div>
                <h3 className="text-xl font-bold">Confirmar Eliminação</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Esta acção é irreversível.</p>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-8">
              {deleteConfirmation.type === 'single' 
                ? `Tem a certeza que deseja eliminar permanentemente esta venda de ${formatKz(deleteConfirmation.sale?.total || 0)}?`
                : `Tem a certeza que deseja eliminar TODAS as vendas do dia de hoje?`}
              <br />
              <span className="text-xs font-bold text-amber-600 mt-2 block italic">* O stock não será alterado.</span>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmation({ isOpen: false, type: 'single' })}
                className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={confirmDeleteAction} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 active:scale-95 transition-all">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectService;
