import React, { useState, useMemo } from 'react';
import { DollarSign, History, Save, Info, Search, CheckCircle, X, ShoppingCart, Package, Plus, Minus, ArrowRight, FileText, Printer } from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { useProducts } from '../contexts/ProductContext';

const Prices: React.FC = () => {
  const { products, categories, updateProduct } = useProducts();
  
  // --- Estados Principais ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });
  const [editingPrices, setEditingPrices] = useState<Record<string, { buy?: number, sell?: number }>>({});

  // --- Estados da Simulação ---
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [simulationStep, setSimulationStep] = useState<'select' | 'summary'>('select');
  const [simSearchTerm, setSimSearchTerm] = useState('');
  const [simCategory, setSimCategory] = useState('Todos');
  const [simulationCart, setSimulationCart] = useState<Record<string, number>>({}); // ID -> Quantidade de Packs

  // --- Helpers ---
  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const filterCategories = useMemo(() => ['Todos', ...categories], [categories]);

  // Filtro da Tabela Principal
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Filtro da Simulação
  const filteredSimulationProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(simSearchTerm.toLowerCase());
      const matchesCategory = simCategory === 'Todos' || p.category === simCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, simSearchTerm, simCategory]);

  // --- Lógica de Edição de Preços ---
  const handleInputChange = (productId: string, field: 'buy' | 'sell', value: string) => {
    const numValue = parseFloat(value);
    setEditingPrices(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: isNaN(numValue) ? 0 : numValue
      }
    }));
  };

  // Nova função para lidar com alteração do preço da GRADE
  const handlePackPriceChange = (productId: string, packSize: number, packPriceStr: string) => {
    const packPrice = parseFloat(packPriceStr);
    if (isNaN(packPrice)) {
       handleInputChange(productId, 'buy', '0');
       return;
    }
    // Calcula o unitário: Preço Grade / Qtd Unidades
    const unitPrice = packPrice / packSize;
    handleInputChange(productId, 'buy', unitPrice.toString());
  };

  const handleSave = (productId: string, productName: string) => {
    const updates = editingPrices[productId];
    if (!updates) {
      showToast("Nenhuma alteração detectada para " + productName);
      return;
    }

    const finalUpdates: any = {};
    if (updates.buy !== undefined) finalUpdates.buyPrice = updates.buy;
    if (updates.sell !== undefined) finalUpdates.sellPrice = updates.sell;

    updateProduct(productId, finalUpdates);
    showToast(`Preços de ${productName} atualizados com sucesso!`);
    
    setEditingPrices(prev => {
      const newState = { ...prev };
      delete newState[productId];
      return newState;
    });
  };

  // --- Lógica de Simulação ---
  const updateSimulationCart = (productId: string, delta: number) => {
    setSimulationCart(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + delta);
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
        const size = typeof product.packSize === 'number' ? product.packSize : 1;
        const packCost = product.buyPrice * Number(size);
        total += packCost * Number(qty);
      }
    });
    return total;
  };

  const getPackCost = (product: any) => {
    const price = typeof product.buyPrice === 'number' ? product.buyPrice : 0;
    const size = typeof product.packSize === 'number' ? product.packSize : 1;
    return price * size;
  };

  const resetSimulation = () => {
    setSimulationCart({});
    setSimulationStep('select');
    setShowSimulationModal(false);
  };

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

      {/* --- HEADER PRINCIPAL --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#003366]">Gestão de Preços</h1>
          <p className="text-slate-500">Controlo de margens e valores de mercado</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 flex-1 max-w-2xl">
          <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
               type="text"
               placeholder="Pesquisar produto..."
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white soft-ui-inset border-none text-sm font-medium focus:ring-2 focus:ring-[#003366] transition-all"
             />
          </div>
          
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
             {filterCategories.map(cat => (
               <button
                 key={cat}
                 onClick={() => setSelectedCategory(cat)}
                 className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                   selectedCategory === cat 
                     ? 'bg-[#003366] text-white shadow-lg shadow-blue-200' 
                     : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                 }`}
               >
                 {cat}
               </button>
             ))}
          </div>
        </div>
      </header>

      {/* --- TABELA DE PREÇOS --- */}
      <div className="grid grid-cols-1 gap-6">
        <SoftCard className="p-0 overflow-hidden border border-slate-100">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-6 font-bold text-[#003366] text-xs uppercase tracking-wider">Produto</th>
                  <th className="p-6 font-bold text-[#003366] text-xs uppercase tracking-wider">
                     Preço Compra <span className="text-slate-400 font-normal">(Grade/Caixa)</span>
                  </th>
                  <th className="p-6 font-bold text-[#003366] text-xs uppercase tracking-wider">Preço Venda (Unitário)</th>
                  <th className="p-6 font-bold text-[#003366] text-xs uppercase tracking-wider">Lucro Estimado</th>
                  <th className="p-6 font-bold text-[#003366] text-xs uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => {
                    const currentEdit = editingPrices[p.id] || {};
                    const displayBuy = currentEdit.buy !== undefined ? currentEdit.buy : p.buyPrice;
                    const displaySell = currentEdit.sell !== undefined ? currentEdit.sell : p.sellPrice;
                    const profit = displaySell - displayBuy;
                    const hasChanged = currentEdit.buy !== undefined || currentEdit.sell !== undefined;
                    
                    const packSize = p.packSize && p.packSize > 1 ? p.packSize : 1;
                    // Se for pack, o valor de exibição no input é o Preço Unitário * Tamanho do Pack
                    const displayPackBuy = displayBuy * packSize;

                    return (
                      <tr key={p.id} className={`hover:bg-slate-50/80 transition-colors ${hasChanged ? 'bg-blue-50/20' : ''}`}>
                        <td className="p-6">
                          <p className="font-bold text-slate-800 text-base">{p.name}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 rounded-md">{p.category}</span>
                            {packSize > 1 && (
                               <span className="text-[10px] uppercase font-bold text-blue-500 bg-blue-50 px-2 rounded-md">
                                 {p.packType || 'Pack'} de {packSize}un
                               </span>
                            )}
                          </div>
                        </td>
                        
                        {/* INPUT DE COMPRA (INTELIGENTE: GRADE OU UNITÁRIO) */}
                        <td className="p-6">
                          {packSize > 1 ? (
                              <div className="flex flex-col gap-1 w-full min-w-[180px]">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                  Preço da {p.packType || 'Grade'} ({packSize}un)
                                </label>
                                <div className="flex items-center gap-2 p-2 bg-white rounded-xl soft-ui-inset border border-slate-200 shadow-inner">
                                  <input 
                                    type="number" 
                                    // Arredonda para exibição limpa se for inteiro, senão mostra 2 casas
                                    value={Number.isInteger(displayPackBuy) ? displayPackBuy : displayPackBuy.toFixed(2)}
                                    onChange={(e) => handlePackPriceChange(p.id, packSize, e.target.value)}
                                    className="bg-transparent border-none w-full text-lg font-bold text-[#003366] focus:ring-0 outline-none p-0" 
                                    placeholder="0"
                                  />
                                  <span className="text-xs font-black text-slate-400">KZ</span>
                                </div>
                                <div className="text-[10px] text-slate-500 px-1 font-medium">
                                  = <span className="font-bold text-[#003366]">{displayBuy.toLocaleString('pt-AO', {maximumFractionDigits: 2})} Kz</span> /unidade
                                </div>
                              </div>
                          ) : (
                              // Se não for pack, usa o input unitário normal
                              <div className="flex items-center gap-3 p-3 bg-white rounded-2xl soft-ui-inset border border-slate-200 w-full min-w-[180px] shadow-inner">
                                <span className="text-xs font-black text-slate-400">KZ</span>
                                <input 
                                  type="number" 
                                  value={displayBuy}
                                  onChange={(e) => handleInputChange(p.id, 'buy', e.target.value)}
                                  className="bg-transparent border-none w-full text-lg font-bold text-[#003366] focus:ring-0 outline-none p-0" 
                                />
                              </div>
                          )}
                        </td>

                        {/* INPUT DE VENDA (UNITÁRIO) */}
                        <td className="p-6">
                          <div className="flex flex-col gap-1 w-full min-w-[180px]">
                            {packSize > 1 && <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider opacity-0">Spacer</label>}
                            <div className="flex items-center gap-3 p-2 bg-white rounded-xl soft-ui-inset border border-slate-200 shadow-inner h-[46px]">
                                <span className="text-xs font-black text-slate-400">KZ</span>
                                <input 
                                type="number" 
                                value={displaySell}
                                onChange={(e) => handleInputChange(p.id, 'sell', e.target.value)}
                                className="bg-transparent border-none w-full text-lg font-bold text-[#003366] focus:ring-0 outline-none p-0" 
                                />
                            </div>
                            {packSize > 1 && <div className="text-[10px] h-[15px]"></div>}
                          </div>
                        </td>

                        <td className="p-6 align-middle">
                          <span className={`font-black text-sm px-4 py-2 rounded-xl flex items-center gap-2 w-fit ${profit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {profit >= 0 ? <Plus size={14} /> : <Minus size={14} />}
                            {Math.abs(profit).toLocaleString('pt-AO', {maximumFractionDigits: 1})} Kz
                          </span>
                        </td>
                        <td className="p-6 align-middle">
                          <div className="flex justify-center gap-3">
                            <button 
                              onClick={() => handleSave(p.id, p.name)}
                              disabled={!hasChanged}
                              className={`p-3 rounded-xl transition-all active:scale-95 ${
                                hasChanged 
                                  ? 'bg-[#003366] text-white shadow-lg hover:bg-[#004488]' 
                                  : 'bg-slate-100 text-slate-300'
                              }`}
                              title="Guardar Alterações"
                            >
                              <Save size={20} />
                            </button>
                            <button 
                              onClick={() => showToast(`Histórico de ${p.name}`)}
                              className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:text-[#003366] hover:bg-slate-200 transition-all active:scale-95"
                              title="Ver Histórico"
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

      {/* --- BOTÃO DE SIMULAÇÃO (CTA) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SoftCard className="space-y-4">
           <h3 className="font-bold text-[#003366] flex items-center gap-2 text-lg">
             <Info size={20} /> Dicas de Precificação
           </h3>
           <p className="text-slate-500 text-sm leading-relaxed">
             Mantenha as margens de lucro sempre acima de 30% para garantir a saúde financeira do bar. 
             Preços de compra devem ser atualizados a cada nova remessa de stock.
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
            onClick={() => { setShowSimulationModal(true); setSimulationStep('select'); }}
            className="pill-button px-10 py-4 bg-white text-[#003366] font-black shadow-2xl hover:scale-105 active:scale-95 transition-all"
          >
            Iniciar Simulação
          </button>
        </SoftCard>
      </div>

      {/* --- MODAL DE SIMULAÇÃO (POP-UP EXTENSO) --- */}
      {showSimulationModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4 md:p-8 animate-fade-in">
          <div className="bg-[#F8FAFC] w-full max-w-6xl h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative">
            
            {/* Header do Modal */}
            <div className="bg-white p-6 border-b border-slate-200 flex justify-between items-center z-10">
               <div>
                  <h2 className="text-2xl font-black text-[#003366] flex items-center gap-3">
                    <ShoppingCart size={28} /> Simular Proposta
                  </h2>
                  <p className="text-slate-500 text-sm font-medium">
                    {simulationStep === 'select' ? 'Selecione os produtos e quantidades (Grades/Caixas)' : 'Revisão final da proposta'}
                  </p>
               </div>
               <button onClick={resetSimulation} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors">
                 <X size={28} />
               </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="flex-1 overflow-hidden flex flex-col relative">
              
              {simulationStep === 'select' ? (
                <>
                  {/* Barra de Filtros Interna */}
                  <div className="p-6 bg-white/50 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-100">
                     <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                          <input 
                            type="text" 
                            placeholder="Buscar produto para adicionar..."
                            value={simSearchTerm}
                            onChange={(e) => setSimSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-slate-200 focus:border-[#003366] outline-none shadow-sm"
                          />
                        </div>
                        <div className="flex gap-2 overflow-x-auto custom-scrollbar">
                           {filterCategories.map(cat => (
                             <button
                               key={cat}
                               onClick={() => setSimCategory(cat)}
                               className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                                 simCategory === cat 
                                   ? 'bg-[#003366] text-white border-[#003366]' 
                                   : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                               }`}
                             >
                               {cat}
                             </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* Lista de Produtos (Grid) */}
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredSimulationProducts.map(p => {
                          const packCost = getPackCost(p);
                          const qty = simulationCart[p.id] || 0;
                          
                          return (
                            <div key={p.id} className={`p-4 rounded-2xl border transition-all ${qty > 0 ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'}`}>
                               <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h4 className="font-bold text-[#003366] line-clamp-1">{p.name}</h4>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-1">
                                      {p.packType || 'Unidade'} de {p.packSize || 1}
                                    </span>
                                  </div>
                                  <div className="bg-slate-100 text-slate-500 p-2 rounded-lg">
                                    <Package size={16} />
                                  </div>
                               </div>
                               
                               <div className="flex justify-between items-end">
                                  <div>
                                     <p className="text-[10px] text-slate-400 font-bold uppercase">Custo {p.packType}</p>
                                     <p className="font-black text-[#003366] text-lg">{packCost.toLocaleString('pt-AO')} Kz</p>
                                  </div>
                                  
                                  <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm border border-slate-100 p-1">
                                     <button 
                                       onClick={() => updateSimulationCart(p.id, -1)}
                                       className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${qty > 0 ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'text-slate-300 cursor-not-allowed'}`}
                                       disabled={qty === 0}
                                     >
                                       <Minus size={16} />
                                     </button>
                                     <span className="font-black text-[#003366] w-6 text-center">{qty}</span>
                                     <button 
                                       onClick={() => updateSimulationCart(p.id, 1)}
                                       className="w-8 h-8 rounded-lg bg-[#003366] text-white flex items-center justify-center hover:bg-blue-800 transition-colors"
                                     >
                                       <Plus size={16} />
                                     </button>
                                  </div>
                               </div>
                            </div>
                          );
                        })}
                     </div>
                  </div>
                </>
              ) : (
                /* --- RESUMO DA PROPOSTA (PASSO 2) --- */
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                   <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                      <div className="bg-[#003366] p-6 text-white text-center">
                         <FileText size={48} className="mx-auto mb-4 opacity-50" />
                         <h3 className="text-2xl font-black uppercase tracking-widest">Proposta de Compra</h3>
                         <p className="opacity-70">Gerada em {new Date().toLocaleDateString('pt-AO')}</p>
                      </div>
                      
                      <div className="p-8">
                        <table className="w-full text-left border-collapse">
                           <thead>
                             <tr className="border-b-2 border-slate-100 text-slate-400 text-xs uppercase font-bold">
                               <th className="py-4">Produto</th>
                               <th className="py-4 text-center">Tipo Embalagem</th>
                               <th className="py-4 text-center">Qtd. Packs</th>
                               <th className="py-4 text-right">Custo Pack</th>
                               <th className="py-4 text-right">Total</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50 text-sm">
                              {Object.entries(simulationCart).map(([id, qty]) => {
                                const p = products.find(prod => prod.id === id);
                                if (!p) return null;
                                const packCost = getPackCost(p);
                                const total = packCost * Number(qty);
                                
                                return (
                                  <tr key={id}>
                                    <td className="py-4 font-bold text-[#003366]">{p.name}</td>
                                    <td className="py-4 text-center text-slate-500">{p.packType || 'Unidade'} ({p.packSize})</td>
                                    <td className="py-4 text-center font-bold">{qty}</td>
                                    <td className="py-4 text-right text-slate-500">{packCost.toLocaleString('pt-AO')} Kz</td>
                                    <td className="py-4 text-right font-black text-[#003366]">{total.toLocaleString('pt-AO')} Kz</td>
                                  </tr>
                                );
                              })}
                           </tbody>
                           <tfoot className="border-t-2 border-[#003366]">
                              <tr>
                                <td colSpan={4} className="py-6 text-right font-black text-[#003366] uppercase text-lg">Total Estimado da Proposta:</td>
                                <td className="py-6 text-right font-black text-2xl text-[#003366]">{calculateSimulationTotal().toLocaleString('pt-AO')} Kz</td>
                              </tr>
                           </tfoot>
                        </table>
                      </div>
                   </div>
                </div>
              )}

              {/* Footer do Modal (Ações) */}
              <div className="p-6 bg-white border-t border-slate-200 flex justify-between items-center z-20">
                 <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase">Total Estimado</span>
                    <span className="text-3xl font-black text-[#003366]">{calculateSimulationTotal().toLocaleString('pt-AO')} Kz</span>
                 </div>
                 
                 <div className="flex gap-4">
                    {simulationStep === 'summary' && (
                       <button 
                         onClick={() => setSimulationStep('select')}
                         className="px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                       >
                         Voltar e Editar
                       </button>
                    )}
                    
                    {simulationStep === 'select' ? (
                       <button 
                         onClick={() => setSimulationStep('summary')}
                         disabled={calculateSimulationTotal() === 0}
                         className="px-8 py-4 bg-[#003366] text-white font-bold rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                       >
                         Gerar Proposta <ArrowRight size={20} />
                       </button>
                    ) : (
                       <button 
                         onClick={() => window.print()}
                         className="px-8 py-4 bg-green-600 text-white font-bold rounded-2xl shadow-xl hover:bg-green-700 transition-all flex items-center gap-2"
                       >
                         <Printer size={20} /> Imprimir / Salvar PDF
                       </button>
                    )}
                 </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Prices;