import React, { useState, useMemo } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle, Wallet, CreditCard, ArrowRightLeft, X } from 'lucide-react';
import { useProducts } from '../contexts/ProductContext';
import { useLayout } from '../contexts/LayoutContext';
import { useAuth } from '../App';
import SoftCard from '../components/SoftCard';

const DirectService: React.FC = () => {
  const { products, categories, updateProduct, processTransaction, addSalesReport } = useProducts();
  const { triggerHaptic, sidebarMode } = useLayout();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'tpa' | 'transfer'>('cash');
  const [amountPaid, setAmountPaid] = useState('');

  // Filtering
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const categoriesList = ['Todos', ...categories];

  // Cart Logic
  const addToCart = (product: any) => {
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
      const p = products.find(prod => prod.id === id);
      if (p) total += p.sellPrice * Number(qty);
    });
    return total;
  }, [cart, products]);

  const handleCheckout = () => {
    triggerHaptic('success');
    
    // 1. Update Stock
    Object.entries(cart).forEach(([id, qty]) => {
        const p = products.find(prod => prod.id === id);
        if (p) {
            updateProduct(id, { stock: p.stock - Number(qty) });
        }
    });

    // 2. Add Transaction (Optional: Usually direct sales go to daily cash sheet, but let's add to balance for real-time view)
    processTransaction(
        'deposit',
        'main',
        cartTotal,
        `Venda Directa - ${Object.keys(cart).length} itens`
    );

    // Reset
    setCart({});
    setShowCheckout(false);
    setAmountPaid('');
    // Could add a toast or success modal here
    alert('Venda realizada com sucesso!');
  };

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-slate-900">
      
      {/* LEFT: Product Grid */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header & Filters */}
        <div className="p-4 bg-white dark:bg-slate-800 shadow-sm z-10 space-y-4">
           <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-[#003366] dark:text-white">Atendimento Directo</h1>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                 Operador: <span className="text-[#003366] dark:text-white font-bold">{user?.name?.split(' ')[0]}</span>
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
                       <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>Marguel Group</span>
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
               const p = products.find(prod => prod.id === id);
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