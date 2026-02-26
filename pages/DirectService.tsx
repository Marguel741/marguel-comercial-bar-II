import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle, Wallet, CreditCard, ArrowRightLeft, X, History, Clock, Eye, Wifi, WifiOff, Cloud, Loader2, Check, Filter } from 'lucide-react';
import { useProducts } from '../contexts/ProductContext';
import { useLayout } from '../contexts/LayoutContext';
import { useAuth } from '../App';
import SoftCard from '../components/SoftCard';

interface Product {
  id: string;
  name: string;
  sellPrice: number;
  category: string;
  packType: string;
}

interface CartItem {
  name: string;
  qty: number;
  price: number;
}

interface DirectSale {
  id: string;
  uuid: string; // Unique Immutable ID
  date: string;
  time: string;
  timestamp: number;
  serverTimestamp?: number; // Audit
  attendant: string;
  userId: string; // Audit
  deviceId?: string; // Audit
  total: number;
  items: CartItem[];
  paymentMethod: 'cash' | 'tpa' | 'transfer';
  statusSync: 'pending' | 'synced';
  syncError?: string;
}

// IndexedDB Helpers
const DB_NAME = 'MarguelDirectSalesDB';
const STORE_NAME = 'sales';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('statusSync', 'statusSync', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

const dbAddSale = async (sale: DirectSale) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(sale);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const dbGetAllSales = async (): Promise<DirectSale[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
        const results = request.result as DirectSale[];
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

const dbUpdateSale = async (sale: DirectSale) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(sale);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const DirectService: React.FC = () => {
  const { products, categories, updateProduct, processTransaction, addSalesReport } = useProducts();
  const { triggerHaptic, sidebarMode } = useLayout();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'tpa' | 'transfer'>('cash');
  
  // Product Map for O(1) Access
  const productMap = useMemo(() => {
    return new Map((products as Product[]).map(p => [p.id, p]));
  }, [products]);
  
  // Offline / Sync State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [networkToast, setNetworkToast] = useState<{show: boolean, message: string, type: 'success' | 'warning'}>({ show: false, message: '', type: 'success' });

  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [directSales, setDirectSales] = useState<DirectSale[]>([]);
  const [historyFilterDate, setHistoryFilterDate] = useState('');
  const [historyFilterUser, setHistoryFilterUser] = useState('');

  // Load from DB
  useEffect(() => {
      dbGetAllSales().then(setDirectSales).catch(console.error);
  }, []);

  // Initialize Device ID
  useEffect(() => {
      let storedDeviceId = localStorage.getItem('mg_device_id');
      if (!storedDeviceId) {
          storedDeviceId = crypto.randomUUID();
          localStorage.setItem('mg_device_id', storedDeviceId);
      }
      setDeviceId(storedDeviceId);
  }, []);

  // Network Listeners & Auto-Sync
  useEffect(() => {
      const handleOnline = () => {
          setIsOnline(true);
          setNetworkToast({
              show: true,
              message: "Conexão restabelecida. Tentando sincronizar...",
              type: 'success'
          });
          setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 5000);
      };

      const handleOffline = () => {
          setIsOnline(false);
          setNetworkToast({
              show: true,
              message: "Você está offline. As vendas serão armazenadas localmente.",
              type: 'warning'
          });
          setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 5000);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, []);

  const syncPendingSales = useCallback(async (isManual = false) => {
      const pendingSales = directSales.filter(s => s.statusSync === 'pending');
      if (pendingSales.length === 0) {
          if (isManual) alert("Não há vendas pendentes para sincronizar.");
          return;
      }

      setIsSyncing(true);
      
      try {
          // SIMULATION: Send to backend API
          await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay

          const serverTime = Date.now();
          
          const updatedSales = await Promise.all(pendingSales.map(async (sale) => {
              const updated = { ...sale, statusSync: 'synced' as const, serverTimestamp: serverTime };
              await dbUpdateSale(updated);
              return updated;
          }));

          setDirectSales(prev => prev.map(s => {
              const updated = updatedSales.find(u => u.id === s.id);
              return updated || s;
          }));
          
          setNetworkToast({
              show: true,
              message: "Sincronização concluída com sucesso!",
              type: 'success'
          });
          setTimeout(() => setNetworkToast(prev => ({ ...prev, show: false })), 3000);
      } catch (error) {
          console.error("Sync failed", error);
          alert("Erro ao sincronizar. Verifique sua conexão.");
      } finally {
          setIsSyncing(false);
      }
  }, [directSales]);

  // Auto-sync Effect
  useEffect(() => {
      if (isOnline && !isSyncing) {
          const hasPending = directSales.some(s => s.statusSync === 'pending');
          if (hasPending) {
              const timer = setTimeout(() => syncPendingSales(false), 1000);
              return () => clearTimeout(timer);
          }
      }
  }, [isOnline, directSales, isSyncing, syncPendingSales]);

  // Filtering
  const filteredProducts = useMemo(() => {
    return (products as Product[]).filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const categoriesList = ['Todos', ...categories];

  // Cart Logic
  const addToCart = (product: Product) => {
    triggerHaptic('impact');
    setCart(prev => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1
    }));
  };

  const removeFromCart = (productId: string) => {
    triggerHaptic('impact');
    setCart(prev => {
      const newQty = (prev[productId] || 0) - 1;
      const newCart = { ...prev };
      if (newQty <= 0) {
        delete newCart[productId];
      } else {
        newCart[productId] = newQty;
      }
      return newCart;
    });
  };

  const clearCart = () => {
    triggerHaptic('warning');
    setCart({});
    setShowCheckout(false);
  };

  const cartTotal = useMemo(() => {
    let total = 0;
    Object.entries(cart).forEach(([id, qty]) => {
      const p = productMap.get(id);
      if (p) total += p.sellPrice * Number(qty);
    });
    return total;
  }, [cart, productMap]);

  const handleCheckout = async () => {
    // Validation
    if (Object.keys(cart).length === 0) {
        alert("O carrinho está vazio.");
        return;
    }

    triggerHaptic('success');
    
    // 1. Create Sale Record (Independent History)
    const newSale: DirectSale = {
        id: `${Date.now()}-${deviceId}`,
        uuid: crypto.randomUUID(), // Immutable
        date: new Date().toLocaleDateString('pt-AO'),
        time: new Date().toLocaleTimeString('pt-AO'),
        timestamp: Date.now(),
        serverTimestamp: undefined, // Will be set on sync
        attendant: user?.name || 'Desconhecido',
        userId: user?.id || 'unknown',
        deviceId: deviceId,
        total: cartTotal,
        paymentMethod: paymentMethod,
        statusSync: 'pending', // Default offline state
        items: Object.entries(cart).map(([id, qty]) => {
            const p = productMap.get(id);
            return {
                name: p?.name || 'Item Desconhecido',
                qty: Number(qty),
                price: p?.sellPrice || 0
            };
        })
    };

    // 2. Save to IndexedDB
    try {
        await dbAddSale(newSale);
        setDirectSales(prev => [newSale, ...prev]);
        
        // Reset
        setCart({});
        setShowCheckout(false);
        
        alert('Venda registrada! ' + (isOnline ? 'Sincronize manualmente quando desejar.' : 'Salva localmente (Offline).'));
    } catch (error) {
        console.error("Failed to save sale", error);
        alert("Erro ao salvar venda. Tente novamente.");
    }
  };

  const filteredHistory = useMemo(() => {
      return directSales.filter(sale => {
          let matchDate = true;
          if (historyFilterDate) {
              // Convert YYYY-MM-DD to DD/MM/YYYY for simple string match if needed, 
              // or just check if sale.date includes the parts. 
              // sale.date is DD/MM/YYYY. historyFilterDate is YYYY-MM-DD.
              const [y, m, d] = historyFilterDate.split('-');
              const formattedFilter = `${d}/${m}/${y}`;
              matchDate = sale.date === formattedFilter;
          }
          
          const matchUser = historyFilterUser 
              ? sale.attendant.toLowerCase().includes(historyFilterUser.toLowerCase()) 
              : true;
              
          return matchDate && matchUser;
      });
  }, [directSales, historyFilterDate, historyFilterUser]);

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-slate-900 relative">
      
      {/* Network Toast */}
      {networkToast.show && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-fade-in ${
            networkToast.type === 'success' ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'
        }`}>
            {networkToast.type === 'success' ? <Wifi size={20} /> : <WifiOff size={20} />}
            <span className="font-bold text-sm">{networkToast.message}</span>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                          <h2 className="text-xl font-bold text-[#003366] dark:text-white flex items-center gap-2">
                              <History size={24} /> Histórico de Vendas Diretas
                          </h2>
                          <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                              <X size={20} className="text-slate-500" />
                          </button>
                      </div>
                      
                      {/* Filters */}
                      <div className="flex gap-2">
                          <div className="relative flex-1">
                              <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input 
                                  type="date" 
                                  value={historyFilterDate}
                                  onChange={e => setHistoryFilterDate(e.target.value)}
                                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                              />
                          </div>
                          <div className="relative flex-1">
                              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input 
                                  type="text" 
                                  placeholder="Filtrar por atendente..."
                                  value={historyFilterUser}
                                  onChange={e => setHistoryFilterUser(e.target.value)}
                                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                              />
                          </div>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                      {filteredHistory.length === 0 ? (
                          <div className="text-center py-10 text-slate-400">
                              <History size={48} className="mx-auto mb-4 opacity-20" />
                              <p>Nenhuma venda encontrada.</p>
                          </div>
                      ) : (
                          filteredHistory.map(sale => (
                              <div key={sale.id} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                  <div className="flex justify-between items-start mb-3">
                                      <div>
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className="font-bold text-[#003366] dark:text-white text-lg">{sale.total.toLocaleString()} Kz</span>
                                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                                  sale.paymentMethod === 'cash' ? 'bg-green-100 text-green-600' :
                                                  sale.paymentMethod === 'tpa' ? 'bg-blue-100 text-blue-600' :
                                                  'bg-purple-100 text-purple-600'
                                              }`}>{sale.paymentMethod}</span>
                                              
                                              {/* Sync Status Badge */}
                                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                  sale.statusSync === 'synced' 
                                                    ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600' 
                                                    : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                                              }`}>
                                                  {sale.statusSync === 'synced' ? (
                                                      <><Cloud size={10} /> Sincronizado</>
                                                  ) : (
                                                      <><WifiOff size={10} /> Pendente</>
                                                  )}
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                              <span className="flex items-center gap-1"><Clock size={12} /> {sale.date} às {sale.time}</span>
                                              <span>•</span>
                                              <span>{sale.attendant}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="space-y-1 pl-4 border-l-2 border-slate-200 dark:border-slate-600">
                                      {sale.items.map((item, idx) => (
                                          <div key={idx} className="flex justify-between text-sm">
                                              <span className="text-slate-600 dark:text-slate-300">{item.qty}x {item.name}</span>
                                              <span className="text-slate-400">{(item.qty * item.price).toLocaleString()} Kz</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* LEFT: Product Grid */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header & Filters */}
        <div className="p-4 bg-white dark:bg-slate-800 shadow-sm z-10 space-y-4">
           <div className="flex justify-between items-center">
              {/* UI FIX: Added ml-20 to prevent overlap with Menu button */}
              <h1 className="text-2xl font-bold text-[#003366] dark:text-white ml-20">Atendimento Directo</h1>
              <div className="flex items-center gap-4">
                  {/* Offline/Online Indicator */}
                  <button 
                      onClick={() => isOnline && syncPendingSales(true)}
                      disabled={!isOnline || isSyncing}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      isOnline 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 cursor-pointer' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 cursor-not-allowed'
                  }`}>
                      {isSyncing ? (
                          <Loader2 size={14} className="animate-spin" />
                      ) : isOnline ? (
                          <Wifi size={14} />
                      ) : (
                          <WifiOff size={14} />
                      )}
                      <span className="hidden md:inline">
                          {isSyncing ? 'Sincronizando...' : isOnline ? 'Online (Sincronizar)' : 'Offline'}
                      </span>
                  </button>

                  <button 
                    onClick={() => setShowHistory(true)}
                    className="p-2 bg-slate-100 dark:bg-slate-700 text-[#003366] dark:text-blue-400 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm font-bold relative"
                  >
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
                 <input 
                   type="text" 
                   placeholder="Buscar produto..."
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 border-none outline-none focus:ring-2 focus:ring-[#003366] dark:text-white"
                 />
              </div>
           </div>
           
           <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
              {categoriesList.map(cat => (
                 <button
                   key={cat}
                   onClick={() => setSelectedCategory(cat)}
                   className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                     selectedCategory === cat 
                       ? 'bg-[#003366] text-white shadow-md' 
                       : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                   }`}
                 >
                   {cat}
                 </button>
              ))}
           </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50 dark:bg-slate-900">
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-24 md:pb-4">
              {filteredProducts.map(p => (
                 <div 
                   key={p.id} 
                   onClick={() => addToCart(p)}
                   className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all active:scale-95 flex flex-col justify-between h-32 relative group"
                 >
                    <div>
                       <h3 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-2">{p.name}</h3>
                       <p className="text-[10px] text-slate-400 uppercase mt-1">{p.packType === 'Unidade' ? 'Un' : 'Pack'}</p>
                    </div>
                    <div className="flex justify-between items-end">
                       <span className="font-black text-[#003366] dark:text-blue-400">{p.sellPrice.toLocaleString()} Kz</span>
                       {cart[p.id] > 0 && (
                          <span className="bg-[#003366] text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-lg">
                             {cart[p.id]}
                          </span>
                       )}
                    </div>
                 </div>
              ))}
           </div>

           {/* Recent History Section */}
           <div className="mt-8 mb-8">
              <div className="flex justify-between items-end mb-4 px-2">
                  <div>
                      <h3 className="font-bold text-lg text-[#003366] dark:text-white">Histórico Recente</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Últimos registos</p>
                  </div>
                  <button 
                    onClick={() => setShowHistory(true)}
                    className="text-sm font-bold text-[#003366] dark:text-blue-400 hover:underline"
                  >
                    Ver Relatório Completo
                  </button>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                  {directSales.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 italic">
                          Nenhuma venda registrada.
                      </div>
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
                                              <span>{sale.date} • {sale.time}</span>
                                              {sale.statusSync === 'pending' && (
                                                  <span className="text-amber-500 flex items-center gap-0.5 font-bold" title="Pendente de sincronização">
                                                      <WifiOff size={10} />
                                                  </span>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <p className="font-bold text-[#003366] dark:text-white">{sale.total.toLocaleString()} Kz</p>
                                      <p className="text-[10px] uppercase font-bold text-slate-400">{sale.paymentMethod}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
                  
                  {directSales.length > 0 && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 text-center">
                          <button 
                            onClick={() => setShowHistory(true)}
                            className="text-xs font-bold text-slate-500 hover:text-[#003366] dark:text-slate-400 dark:hover:text-white transition-colors"
                          >
                              Ver todos os registos
                          </button>
                      </div>
                  )}
              </div>
           </div>

           {/* Footer */}
           <footer className="mt-16 py-10 px-6 bg-white rounded-2xl text-center flex flex-col gap-4 font-sans mb-8">
               <p className="text-sm font-bold tracking-[-0.01em] text-[#003366]">
                   Marguel Sistema de Gestão Interna
               </p>
               <div className="flex flex-col items-center">
                   <span className="text-xs text-[#6B7280] mb-1">Desenvolvido por</span>
                   <div className="text-xs tracking-[0.5px]">
                       <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>DC - Comercial</span>
                       <span className="text-[#6B7280] font-normal mx-1">&</span>
                       <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>Marguel CGPS Lda</span>
                   </div>
               </div>
           </footer>
        </div>
      </div>

      {/* RIGHT: Cart & Checkout (Sidebar on Desktop, Bottom Sheet on Mobile) */}
      <div className={`
         bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 
         flex flex-col shadow-2xl z-20 transition-all duration-300
         fixed md:static bottom-0 left-0 right-0 h-[40vh] md:h-auto md:w-96 rounded-t-3xl md:rounded-none
         ${Object.keys(cart).length === 0 ? 'translate-y-full md:translate-y-0 md:w-0 md:opacity-0 overflow-hidden' : 'translate-y-0 md:w-96 md:opacity-100'}
      `}>
         <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h2 className="font-bold text-lg text-[#003366] dark:text-white flex items-center gap-2">
               <ShoppingCart size={20} /> Carrinho Atual
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
                        <p className="text-xs text-slate-400">{(p.sellPrice * Number(qty)).toLocaleString()} Kz</p>
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
            <div className="flex justify-between items-center mb-4">
               <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">Total a Pagar</span>
               <span className="text-2xl font-black text-[#003366] dark:text-white">{cartTotal.toLocaleString()} Kz</span>
            </div>
            
            {!showCheckout ? (
               <button 
                 onClick={() => setShowCheckout(true)}
                 className="w-full py-4 bg-[#003366] text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
               >
                 Finalizar Venda
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
                  <button 
                    onClick={handleCheckout}
                    className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={20} /> Confirmar Pagamento
                  </button>
                  <button onClick={() => setShowCheckout(false)} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1">Cancelar</button>
               </div>
            )}
         </div>
      </div>

    </div>
  );
};

export default DirectService;