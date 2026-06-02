import { db } from '../src/firebase';
import { doc, setDoc, collection, onSnapshot, deleteDoc } from 'firebase/firestore';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Product, PurchaseRecord, InventoryLog, PriceHistoryLog, Equipment, StockOperationLog, ReserveTransfer } from '../types';
import { useAuth } from './AuthContext';
import { useAudit } from './AuditContext';
import { hasPermission } from '../src/utils/permissions';
import { formatDateISO, generateUUID } from '../src/utils';

const COL_STOCK = {
  products:             'products',
  purchases:            'appdata/purchases/records',
  inventoryHistory:     'appdata/inventory_history/records',
  stockOperationHistory:'appdata/stock_operations/records',
  priceHistory:         'appdata/price_history/records',
  equipments:           'appdata/equipments/records',
  proposals:            'appdata/proposals/records',
  reserveTransfers:     'appdata/reserve_transfers/records',
};

const INITIAL_PRODUCTS: Product[] = [
  { id: 'pepsi', name: 'Pepsi', sellPrice: 500, buyPrice: 250, stock: 0, minStock: 24, category: 'Refrigerantes', packSize: 24, packType: 'Grade' },
  { id: 'sumol', name: 'Sumol', sellPrice: 500, buyPrice: 250, stock: 0, minStock: 24, category: 'Refrigerantes', packSize: 24, packType: 'Grade' },
  { id: 'top', name: 'Top', sellPrice: 500, buyPrice: 250, stock: 0, minStock: 24, category: 'Refrigerantes', packSize: 24, packType: 'Grade' },
  { id: 'yala', name: 'Yala', sellPrice: 800, buyPrice: 400, stock: 0, minStock: 5, category: 'Refrigerantes — Bidon', packSize: 12, packType: 'Embalagem' },
  { id: 'cuca', name: 'Cuca', sellPrice: 300, buyPrice: 150, stock: 0, minStock: 24, category: 'Cervejas', packSize: 24, packType: 'Grade' },
  { id: 'nocal', name: 'Nocal', sellPrice: 300, buyPrice: 150, stock: 0, minStock: 24, category: 'Cervejas', packSize: 24, packType: 'Grade' },
  { id: 'doppel', name: 'Doppel', sellPrice: 400, buyPrice: 200, stock: 0, minStock: 24, category: 'Cervejas', packSize: 24, packType: 'Grade' },
  { id: 'eka', name: 'Eka', sellPrice: 300, buyPrice: 150, stock: 0, minStock: 24, category: 'Cervejas', packSize: 24, packType: 'Grade' },
  { id: 'booster', name: 'Booster', sellPrice: 400, buyPrice: 200, stock: 0, minStock: 24, category: 'Cervejas', packSize: 24, packType: 'Grade' },
  { id: 'cuca_lata', name: 'Cuca em Lata', sellPrice: 250, buyPrice: 125, stock: 0, minStock: 24, category: 'Cervejas — Lata', packSize: 24, packType: 'Grade' },
  { id: 'booster_lata', name: 'Booster em Lata', sellPrice: 500, buyPrice: 375, stock: 0, minStock: 24, category: 'Cervejas — Lata', packSize: 24, packType: 'Grade' },
  { id: 'vinho_pct', name: 'Vinho Fresco Pacote', sellPrice: 200, buyPrice: 100, stock: 0, minStock: 10, category: 'Vinhos', packSize: 24, packType: 'Grade' },
  { id: 'vinho_bidon', name: 'Vinho Fresco Bidon', sellPrice: 1000, buyPrice: 500, stock: 0, minStock: 5, category: 'Vinhos', packSize: 12, packType: 'Embalagem' },
  { id: 'vinho_festa', name: 'Vinho Festa da Vida', sellPrice: 1200, buyPrice: 600, stock: 0, minStock: 5, category: 'Vinhos', packSize: 24, packType: 'Embalagem' },
  { id: 'vinho_forte', name: 'Vinho Forte', sellPrice: 1200, buyPrice: 600, stock: 0, minStock: 5, category: 'Vinhos', packSize: 12, packType: 'Caixa' },
  { id: 'valmonte', name: 'Valmonte', sellPrice: 1500, buyPrice: 750, stock: 0, minStock: 5, category: 'Vinhos', packSize: 24, packType: 'Grade' },
  { id: 'nkolo', name: 'Nkolo Mboka', sellPrice: 1500, buyPrice: 750, stock: 0, minStock: 5, category: 'Vinhos', packSize: 24, packType: 'Grade' },
  { id: 'caporroto', name: 'Caporroto', sellPrice: 500, buyPrice: 250, stock: 0, minStock: 10, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'chefe_grande', name: 'Chefe Grande', sellPrice: 800, buyPrice: 400, stock: 0, minStock: 10, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'palanca', name: 'Palanca', sellPrice: 800, buyPrice: 400, stock: 0, minStock: 10, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'dr_gin', name: 'Dr. Gin', sellPrice: 1200, buyPrice: 600, stock: 0, minStock: 5, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'cavalo', name: 'Cavalo Famoso', sellPrice: 1000, buyPrice: 500, stock: 0, minStock: 5, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'indica_peq', name: 'Indica Pequeno', sellPrice: 150, buyPrice: 75, stock: 0, minStock: 10, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'indica_grd', name: 'Indica Grande', sellPrice: 300, buyPrice: 150, stock: 0, minStock: 10, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'dia_noite', name: 'Dia e Noite', sellPrice: 800, buyPrice: 400, stock: 0, minStock: 5, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'festa', name: 'Festa', sellPrice: 1500, buyPrice: 750, stock: 0, minStock: 5, category: 'Espirituosas', packSize: 24, packType: 'Embalagem' },
  { id: 'fast_peq', name: 'Fast Pequeno', sellPrice: 200, buyPrice: 100, stock: 0, minStock: 24, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'fast_grd', name: 'Fast Grande', sellPrice: 400, buyPrice: 200, stock: 0, minStock: 24, category: 'Espirituosas', packSize: 12, packType: 'Caixa' },
  { id: 'gin_gordons', name: 'Gin Gordons', sellPrice: 3000, buyPrice: 1500, stock: 0, minStock: 2, category: 'Gin & Vodka', packSize: 24, packType: 'Grade' },
  { id: 'smirnoff', name: 'Smirnoff', sellPrice: 2500, buyPrice: 1250, stock: 0, minStock: 2, category: 'Gin & Vodka', packSize: 24, packType: 'Grade' },
  { id: 'agua', name: 'Água', sellPrice: 100, buyPrice: 50, stock: 0, minStock: 24, category: 'Águas', packSize: 24, packType: 'Embalagem' },
  { id: 'speed', name: 'Speed', sellPrice: 400, buyPrice: 200, stock: 0, minStock: 24, category: 'Energéticos', packSize: 12, packType: 'Embalagem' },
  { id: 'kombucha', name: 'Kombucha', sellPrice: 500, buyPrice: 250, stock: 0, minStock: 10, category: 'Energéticos', packSize: 24, packType: 'Grade' },
  { id: 'copos_peq', name: 'Copos Pequenos', sellPrice: 50, buyPrice: 25, stock: 0, minStock: 50, category: 'Descartáveis', packSize: 50, packType: 'Embalagem' },
  { id: 'copos_grd', name: 'Copos Grandes', sellPrice: 100, buyPrice: 50, stock: 0, minStock: 50, category: 'Descartáveis', packSize: 50, packType: 'Embalagem' },
];

const INITIAL_CATEGORIES = [
  'Refrigerantes', 'Refrigerantes — Bidon', 'Cervejas', 'Cervejas — Lata',
  'Vinhos', 'Espirituosas', 'Gin & Vodka', 'Águas', 'Energéticos', 'Descartáveis'
];

const INITIAL_EQUIPMENTS: Equipment[] = [
  { id: '1', name: 'Mesas', qty: 20, prevQty: 20, status: 'Operacional' },
  { id: '2', name: 'Cadeiras', qty: 80, prevQty: 80, status: 'Operacional' },
  { id: '3', name: 'Grades (Vazias)', qty: 50, prevQty: 48, status: 'Operacional' },
  { id: '4', name: 'Vasilhames', qty: 1200, prevQty: 1200, status: 'Operacional' },
  { id: '5', name: 'Chaves de Abrir', qty: 10, prevQty: 12, status: 'Operacional' },
  { id: '6', name: 'Freezer Vertical', qty: 3, prevQty: 3, status: 'Operacional' },
];

interface StockContextType {
  products: Product[];
  categories: string[];
  purchases: PurchaseRecord[];
  inventoryHistory: InventoryLog[];
  stockOperationHistory: StockOperationLog[];
  priceHistory: PriceHistoryLog[];
  equipments: Equipment[];
  proposals: any[];
  reserveTransfers: ReserveTransfer[];
  handleStockMovement: (productId: string, quantity: number, type: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'MANUAL_ADJUSTMENT', performedBy: string, reason: string, referenceId?: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => void;
  addCategory: (category: string) => void;
  editCategory: (oldName: string, newName: string) => Promise<void>;
  removeCategory: (category: string) => void;
  addInventoryLog: (log: InventoryLog) => void;
  addEquipment: (equipment: Omit<Equipment, 'id' | 'prevQty'>) => void;
  updateEquipment: (id: string, updates: Partial<Equipment>) => void;
  updateEquipmentQty: (id: string, newQty: number) => void;
  removeEquipment: (id: string) => void;
  addProposal: (p: any) => void;
  deleteProposal: (id: string) => void;
  transferReserveToBar: (items: Record<string, number>, date: string, performedBy: string, notes?: string) => Promise<void>;
  getPurchasesByDate: (dateStr: string) => Record<string, number>;
  getTodayPurchases: () => Record<string, number>;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export const StockProvider: React.FC<{ children: ReactNode; getSystemDate: () => Date; getSystemDateStr: () => string; validateAction: (type: string, payload: any) => boolean; addAuditLog: (log: any) => void; }> = ({ children, getSystemDate, getSystemDateStr, validateAction, addAuditLog }) => {
  const { user } = useAuth();
  const { addLog } = useAudit();

  const checkPermission = useCallback((permission: any) => {
    if (!hasPermission(user, permission)) { console.error(`Acesso negado: ${permission}`); return false; }
    return true;
  }, [user]);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [inventoryHistory, setInventoryHistory] = useState<InventoryLog[]>([]);
  const [stockOperationHistory, setStockOperationHistory] = useState<StockOperationLog[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryLog[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [reserveTransfers, setReserveTransfers] = useState<ReserveTransfer[]>([]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(collection(db, COL_STOCK.products), snap => {
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
      if (data.length > 0) setProducts(data);
    }));
    unsubs.push(onSnapshot(collection(db, COL_STOCK.purchases), snap => {
      setPurchases(snap.docs.map(d => d.data() as PurchaseRecord).sort((a, b) => b.timestamp - a.timestamp));
    }));
    unsubs.push(onSnapshot(collection(db, COL_STOCK.inventoryHistory), snap => {
      setInventoryHistory(snap.docs.map(d => d.data() as InventoryLog));
    }));
    unsubs.push(onSnapshot(collection(db, COL_STOCK.stockOperationHistory), snap => {
      setStockOperationHistory(snap.docs.map(d => d.data() as StockOperationLog).sort((a, b) => b.timestamp - a.timestamp));
    }));
    unsubs.push(onSnapshot(collection(db, COL_STOCK.priceHistory), snap => {
      setPriceHistory(snap.docs.map(d => d.data() as PriceHistoryLog).sort((a, b) => b.timestamp - a.timestamp));
    }));
    unsubs.push(onSnapshot(collection(db, COL_STOCK.equipments), snap => {
      const data = snap.docs.map(d => d.data() as Equipment);
      if (data.length > 0) setEquipments(data);
      else { INITIAL_EQUIPMENTS.forEach(e => setDoc(doc(db, COL_STOCK.equipments, e.id), e)); setEquipments(INITIAL_EQUIPMENTS); }
    }));
    unsubs.push(onSnapshot(collection(db, COL_STOCK.proposals), snap => {
      setProposals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));
    unsubs.push(onSnapshot(collection(db, COL_STOCK.reserveTransfers), snap => {
      setReserveTransfers(snap.docs.map(d => d.data() as ReserveTransfer).sort((a, b) => b.timestamp - a.timestamp));
    }));

    return () => unsubs.forEach(u => u());
  }, []);

  const handleStockMovement = useCallback((productId: string, quantity: number, type: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'MANUAL_ADJUSTMENT', performedBy: string, reason: string, referenceId?: string) => {
    try {
      if ((type === 'ADJUSTMENT' || type === 'MANUAL_ADJUSTMENT') && !reason) throw new Error('Um motivo é obrigatório para ajustes manuais de stock.');
      validateAction('UPDATE_STOCK', { productId, qty: type === 'SALE' ? -quantity : quantity, isHistorical: true });
      const product = products.find(p => p.id === productId);
      if (!product) return;
      let qtyBefore = product.stock;
      let existingLogId: string | null = null;
      if (referenceId) {
        const existingLog = stockOperationHistory.find(l => l.referenceId === referenceId && l.productId === productId);
        if (existingLog) {
          const currentMatchesLog = Math.abs(product.stock - existingLog.qtyAfter) < 2;
          if (currentMatchesLog) qtyBefore = qtyBefore - existingLog.qtyAdded;
          existingLogId = existingLog.id;
        }
      }
      const qtyAdded = type === 'SALE' ? -quantity : quantity;
      const qtyAfter = Math.max(0, qtyBefore + qtyAdded);
      const isManual = type === 'ADJUSTMENT' || type === 'MANUAL_ADJUSTMENT' || (!referenceId && (type === 'SALE' || type === 'PURCHASE'));
      setDoc(doc(db, COL_STOCK.products, productId), { ...product, stock: qtyAfter });
      const log: StockOperationLog = {
        id: existingLogId || generateUUID(), productId, productName: product.name,
        type: (isManual ? 'MANUAL_ADJUSTMENT' : type) as any,
        qtyBefore, qtyAdded, qtyAfter, previousStock: qtyBefore, newStock: qtyAfter,
        qtyChanged: qtyAdded, responsible: performedBy, timestamp: Date.now(), performedBy,
        reason: reason || (isManual ? 'Ajuste Manual via Sistema' : 'Movimentação de Stock'),
        referenceId: referenceId ?? null
      };
      setDoc(doc(db, COL_STOCK.stockOperationHistory, log.id), log);
      addLog({ action: isManual ? 'AJUSTE_MANUAL_STOCK' : (type === 'SALE' ? 'VENDA_STOCK' : 'COMPRA_STOCK'), module: 'STOCK', description: `${Math.abs(quantity)} unidades de ${product.name}. Stock: ${qtyBefore} -> ${qtyAfter}`, entityId: productId, previousValue: qtyBefore, newValue: qtyAfter }, user);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({ action: 'ERROR' as any, module: 'STOCK', description: `ERRO: ${msg}`, entityId: productId }, user);
      throw error;
    }
  }, [user, addLog, validateAction, products, stockOperationHistory]);

  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    try {
      if (!checkPermission('inventory_product_create')) return;
      validateAction('ADD_PRODUCT', {});
      const slugId = product.name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 40);
      const uniqueId = products.some(p => p.id === slugId) ? `${slugId}_${Date.now().toString(36)}` : slugId;
      const newProduct = { ...product, id: uniqueId, reserveStock: product.reserveStock ?? 0 };
      setDoc(doc(db, COL_STOCK.products, newProduct.id), newProduct);
      addAuditLog({ action: 'CRIAR_PRODUTO', module: 'INVENTARIO', entityId: newProduct.id, description: `Produto ${newProduct.name} criado.`, performedBy: user?.name || 'Sistema' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({ action: 'ERROR' as any, module: 'INVENTARIO', description: `ERRO: ${msg}`, entityId: product.name }, user);
      throw error;
    }
  }, [checkPermission, validateAction, addAuditLog, addLog, user]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>): Promise<void> => {
    try {
      if (!checkPermission('inventory_product_edit')) return;
      validateAction('UPDATE_PRODUCT', {});
      const product = products.find(p => p.id === id);
      if (!product) return;
      const sanitized: Partial<Product> = {};
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined) continue;
        if (typeof v === 'number' && isNaN(v)) continue;
        (sanitized as any)[k] = v;
      }
      if (
        (sanitized.sellPrice !== undefined && sanitized.sellPrice !== product.sellPrice) ||
        (sanitized.buyPrice !== undefined && sanitized.buyPrice !== product.buyPrice)
      ) {
        const priceLog: PriceHistoryLog = {
          id: generateUUID(), productId: id, productName: product.name,
          oldSellPrice: product.sellPrice, newSellPrice: sanitized.sellPrice ?? product.sellPrice,
          oldBuyPrice: product.buyPrice, newBuyPrice: sanitized.buyPrice ?? product.buyPrice,
          changedBy: user?.name || 'Sistema', timestamp: Date.now(),
          date: formatDateISO(getSystemDate()), reason: 'Actualização manual de preço',
        };
        await setDoc(doc(db, COL_STOCK.priceHistory, priceLog.id), priceLog);
      }
      // packSize não deve desencadear recálculo de stock
      const stockChanged = sanitized.stock !== undefined && sanitized.stock !== product.stock;
      const onlyPackSizeChanged = sanitized.packSize !== undefined && !stockChanged;

      if (stockChanged) {
        const diff = sanitized.stock! - product.stock;
        handleStockMovement(id, Math.abs(diff), 'MANUAL_ADJUSTMENT', user?.name || 'Sistema', 'Ajuste via Edição de Produto');
        const { stock, ...otherUpdates } = sanitized;
        await setDoc(doc(db, COL_STOCK.products, id), { ...product, ...otherUpdates });
      } else {
        await setDoc(doc(db, COL_STOCK.products, id), { ...product, ...sanitized });
      }
      addAuditLog({ action: 'EDITAR_PRODUTO', module: 'INVENTARIO', entityId: id, description: `Produto ${product.name} actualizado.`, performedBy: user?.name || 'Sistema' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({ action: 'ERROR' as any, module: 'INVENTARIO', description: `ERRO: ${msg}`, entityId: id }, user);
      throw error;
    }
  }, [checkPermission, validateAction, products, handleStockMovement, addAuditLog, addLog, user, getSystemDate]);

  const deleteProduct = useCallback((id: string) => {
    try {
      if (!checkPermission('inventory_product_delete')) return;
      validateAction('DELETE_PRODUCT', {});
      const product = products.find(p => p.id === id);
      deleteDoc(doc(db, COL_STOCK.products, id));
      addAuditLog({ action: 'ARQUIVAR_PRODUTO', module: 'INVENTARIO', entityId: id, description: `Produto ${product?.name || id} eliminado.`, performedBy: user?.name || 'Sistema' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({ action: 'ERROR' as any, module: 'INVENTARIO', description: `ERRO: ${msg}`, entityId: id }, user);
      throw error;
    }
  }, [checkPermission, validateAction, products, addAuditLog, addLog, user]);

  const addCategory = useCallback((category: string) => {
    if (!checkPermission('inventory_category_manage')) return;
    if (!categories.includes(category)) {
      setCategories(prev => [...prev, category].sort());
      addAuditLog({ action: 'CRIAR_CATEGORIA', module: 'INVENTARIO', description: `Categoria ${category} criada.`, performedBy: user?.name || 'Sistema' });
    }
  }, [checkPermission, categories, addAuditLog, user]);

  const editCategory = useCallback(async (oldName: string, newName: string) => {
    if (!checkPermission('inventory_category_manage')) return;
    if (!newName || oldName === newName) return;
    setCategories(prev => prev.map(c => c === oldName ? newName : c));
    products.filter(p => p.category === oldName).forEach(p => setDoc(doc(db, COL_STOCK.products, p.id), { ...p, category: newName }));
    addAuditLog({ action: 'EDITAR_CATEGORIA', module: 'INVENTARIO', description: `Categoria ${oldName} → ${newName}.`, performedBy: user?.name || 'Sistema' });
  }, [checkPermission, products, addAuditLog, user]);

  const removeCategory = useCallback((category: string) => {
    if (!checkPermission('inventory_category_manage')) return;
    setCategories(prev => prev.filter(c => c !== category));
    addAuditLog({ action: 'REMOVER_CATEGORIA', module: 'INVENTARIO', description: `Categoria ${category} removida.`, performedBy: user?.name || 'Sistema' });
  }, [checkPermission, addAuditLog, user]);

  const addInventoryLog = useCallback((log: InventoryLog) => {
    try {
      validateAction('INVENTORY_LOG', {});
      setDoc(doc(db, COL_STOCK.inventoryHistory, log.id), log);
      addAuditLog({ action: 'REGISTRO_INVENTARIO', module: 'INVENTARIO', entityId: log.id, description: `Inventário registado. Status: ${log.status}`, performedBy: log.performedBy });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog({ action: 'ERROR' as any, module: 'INVENTARIO', description: `ERRO: ${msg}`, entityId: log.id }, user);
      throw error;
    }
  }, [validateAction, addAuditLog, addLog, user]);

  const addEquipment = useCallback((equipment: Omit<Equipment, 'id' | 'prevQty'>) => {
    try {
      validateAction('EQUIPMENT', {});
      const newEquip: Equipment = { ...equipment, id: generateUUID(), prevQty: equipment.qty };
      setDoc(doc(db, COL_STOCK.equipments, newEquip.id), newEquip);
      addAuditLog({ action: 'ADICIONAR_EQUIPAMENTO', module: 'INVENTARIO', entityId: newEquip.id, description: `Equipamento ${newEquip.name} adicionado.`, performedBy: user?.name || 'Sistema' });
    } catch (error) { const msg = error instanceof Error ? error.message : 'Erro'; addLog({ action: 'ERROR' as any, module: 'INVENTARIO', description: `ERRO: ${msg}`, entityId: equipment.name }, user); throw error; }
  }, [validateAction, addAuditLog, addLog, user]);

  const updateEquipment = useCallback((id: string, updates: Partial<Equipment>) => {
    try {
      validateAction('EQUIPMENT', {});
      const equip = equipments.find(e => e.id === id);
      if (equip) {
        setDoc(doc(db, COL_STOCK.equipments, id), { ...equip, ...updates });
        const historyLog = { id: generateUUID(), timestamp: Date.now(), date: formatDateISO(new Date()), performedBy: user?.name || 'Sistema', totalItems: updates.qty ?? equip.qty, discrepancies: [], status: 'OK' as const, justification: `Edição manual: ${equip.name} — Qtd: ${equip.qty} → ${updates.qty ?? equip.qty}` };
        setDoc(doc(db, COL_STOCK.inventoryHistory, historyLog.id), historyLog);
      }
      addAuditLog({ action: 'EDITAR_EQUIPAMENTO', module: 'INVENTARIO', entityId: id, description: `Equipamento ${id} actualizado.`, performedBy: user?.name || 'Sistema' });
    } catch (error) { const msg = error instanceof Error ? error.message : 'Erro'; addLog({ action: 'ERROR' as any, module: 'INVENTARIO', description: `ERRO: ${msg}`, entityId: id }, user); throw error; }
  }, [validateAction, equipments, addAuditLog, addLog, user]);

  const updateEquipmentQty = useCallback((id: string, newQty: number) => {
    try {
      validateAction('EQUIPMENT', {});
      const equip = equipments.find(e => e.id === id);
      if (equip) {
        setDoc(doc(db, COL_STOCK.equipments, id), { ...equip, prevQty: equip.qty, qty: newQty });
        const historyLog = { id: generateUUID(), timestamp: Date.now(), date: formatDateISO(new Date()), performedBy: user?.name || 'Sistema', totalItems: newQty, discrepancies: equip.qty !== newQty ? [{ name: equip.name, diff: newQty - equip.qty }] : [], status: (equip.qty !== newQty ? 'DIVERGENTE' : 'OK') as const, justification: `Contagem: ${equip.name} — ${equip.qty} → ${newQty}` };
        setDoc(doc(db, COL_STOCK.inventoryHistory, historyLog.id), historyLog);
      }
      addAuditLog({ action: 'AJUSTE_QTD_EQUIPAMENTO', module: 'INVENTARIO', entityId: id, description: `Quantidade de ${equip?.name || id}: ${equip?.qty} → ${newQty}`, performedBy: user?.name || 'Sistema' });
    } catch (error) { const msg = error instanceof Error ? error.message : 'Erro'; addLog({ action: 'ERROR' as any, module: 'INVENTARIO', description: `ERRO: ${msg}`, entityId: id }, user); throw error; }
  }, [validateAction, equipments, addAuditLog, addLog, user]);

  const removeEquipment = useCallback((id: string) => {
    try {
      validateAction('EQUIPMENT', {});
      const equip = equipments.find(e => e.id === id);
      deleteDoc(doc(db, COL_STOCK.equipments, id));
      addAuditLog({ action: 'REMOVER_EQUIPAMENTO', module: 'INVENTARIO', entityId: id, description: `Equipamento ${equip?.name || id} removido.`, performedBy: user?.name || 'Sistema' });
    } catch (error) { const msg = error instanceof Error ? error.message : 'Erro'; addLog({ action: 'ERROR' as any, module: 'INVENTARIO', description: `ERRO: ${msg}`, entityId: id }, user); throw error; }
  }, [validateAction, equipments, addAuditLog, addLog, user]);

  const addProposal = useCallback((p: any) => {
    const doc_id = p.id || generateUUID();
    setDoc(doc(db, COL_STOCK.proposals, doc_id), { ...p, id: doc_id });
  }, []);

  const deleteProposal = useCallback((id: string) => {
    deleteDoc(doc(db, COL_STOCK.proposals, id));
  }, []);

  const transferReserveToBar = useCallback(async (items: Record<string, number>, date: string, performedBy: string, notes?: string) => {
    if (!checkPermission('reserve_transfer')) return;
    const transferId = generateUUID();
    const packSizeSnapshot: Record<string, number> = {};
    products.forEach(p => { if (items[p.id]) packSizeSnapshot[p.id] = p.packSize || 1; });
    const transfer: ReserveTransfer = { id: transferId, date, timestamp: Date.now(), performedBy, items, packSizeSnapshot, notes };
    for (const [productId, qty] of Object.entries(items)) {
      if (qty <= 0) continue;
      const p = products.find(pr => pr.id === productId);
      if (!p) continue;
      const newReserveStock = Math.max(0, (p.reserveStock ?? 0) - qty);
      const newBarStock = p.stock + qty;
      await setDoc(doc(db, COL_STOCK.products, productId), { ...p, stock: newBarStock, reserveStock: newReserveStock });
      const log: StockOperationLog = {
        id: generateUUID(), productId, productName: p.name,
        type: 'RESERVE_TRANSFER_IN' as any,
        qtyBefore: p.stock, qtyAdded: qty, qtyAfter: newBarStock,
        previousStock: p.stock, newStock: newBarStock, qtyChanged: qty,
        responsible: performedBy, timestamp: Date.now(), performedBy,
        reason: `Transferência da Reserva para o Bar${notes ? ': ' + notes : ''}`,
        referenceId: transferId, location: 'bar' as any
      };
      await setDoc(doc(db, COL_STOCK.stockOperationHistory, log.id), log);
    }
    await setDoc(doc(db, COL_STOCK.reserveTransfers, transferId), transfer);
    addAuditLog({ action: 'TRANSFERENCIA_RESERVA_BAR', module: 'RESERVA', entityId: transferId, description: `Transferência da Reserva para o Bar. ${Object.keys(items).length} produto(s). Por: ${performedBy}`, performedBy });
  }, [checkPermission, products, addAuditLog]);

  const getPurchasesByDate = useCallback((dateStr: string) => {
    const totals: Record<string, number> = {};
    purchases.filter(p => p.date === dateStr).forEach(record => {
      Object.entries(record.items).forEach(([id, qtyPacks]) => {
        const p = products.find(prod => prod.id === id);
        totals[id] = (totals[id] || 0) + Number(qtyPacks) * (p?.packSize || 1);
      });
    });
    return totals;
  }, [purchases, products]);

  const getTodayPurchases = useCallback(() => getPurchasesByDate(getSystemDateStr()), [getPurchasesByDate, getSystemDateStr]);

  const value: StockContextType = {
    products: products.filter(p => !p.isArchived).sort((a, b) => a.name.localeCompare(b.name, 'pt')),
    categories, purchases, inventoryHistory, stockOperationHistory, priceHistory,
    equipments, proposals, reserveTransfers,
    handleStockMovement, addProduct, updateProduct, deleteProduct,
    addCategory, editCategory, removeCategory, addInventoryLog,
    addEquipment, updateEquipment, updateEquipmentQty, removeEquipment,
    addProposal, deleteProposal, transferReserveToBar,
    getPurchasesByDate, getTodayPurchases,
  };

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
};

export const useStock = () => {
  const context = useContext(StockContext);
  if (!context) throw new Error('useStock must be used within a StockProvider');
  return context;
};
