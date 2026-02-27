
export enum UserRole {
  PROPRIETARIO = 'PROPRIETARIO',
  ADMIN_GERAL = 'ADMIN_GERAL',
  GERENTE = 'GERENTE',
  COLABORADOR_REMOTO = 'COLABORADOR_REMOTO',
  COLABORADOR_EFETIVO = 'COLABORADOR_EFETIVO',
  FUNCIONARIO = 'FUNCIONARIO'
}

export interface UserPermissions {
  viewAccountStatus: boolean;
  managePrices: boolean;
  canDeleteRecords?: boolean;
  canManageUsers?: boolean;
  canEditSales?: boolean;
  canEditInventory?: boolean;
  canEditExpenses?: boolean;
  canEditPurchases?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isApproved: boolean;
  isBanned?: boolean;
  pin?: string;
  permissions?: UserPermissions;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface Product {
  id: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  category: string;
  packSize?: number;
  packType?: 'Grade' | 'Caixa' | 'Embalagem' | 'Fardo';
  // Promo fields
  promoQty?: number;
  promoPrice?: number;
  isPromoActive?: boolean;
}

export interface PriceHistoryLog {
  id: string;
  productId: string;
  productName: string;
  oldBuy: number;
  newBuy: number;
  oldSell: number;
  newSell: number;
  changedBy: string;
  date: string;
}

export interface SavedProposal {
  id: string;
  name: string;
  date: string;
  items: Record<string, number>;
  total: number;
}

export interface PurchaseRecord {
  id: string;
  name: string;
  date: string;
  items: Record<string, number>;
  total: number;
  completedBy: string;
  timestamp: number;
  source: 'Prices' | 'Inventory' | 'Sales';
  attachments?: string[];
  synced?: boolean;
}

export interface Sale {
  id: string;
  date: string;
  products: { productId: string; quantity: number; price: number }[];
  total: number;
  paymentMethod: 'CASH' | 'TPA' | 'TRANSFER';
  registeredBy: string;
  observations?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  timestamp: number;
  user: string;
  attachments: string[];
  notes?: string;
}

export interface Alert {
  id: string;
  type: 'SUAVE' | 'CRITICO';
  message: string;
  timestamp: string;
  status: 'ACTIVE' | 'RESOLVED';
}

export interface Equipment {
  id: string;
  name: string;
  qty: number;
  prevQty: number; 
  status: 'Operacional' | 'Danificado' | 'Em Manutenção';
}

export interface InventoryLog {
  id: string;
  date: string;
  performedBy: string;
  totalItems: number;
  discrepancies: { name: string, diff: number }[];
  status: 'OK' | 'DIVERGENTE';
  justification?: string;
}

export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'file';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  fileName?: string;
  duration?: string;
}

export interface Transaction {
  id: string;
  type: 'entrada' | 'saida';
  category: string;
  amount: number;
  date: string;
  description: string;
}

export interface SalesReport {
  id: string;
  date: string;
  timestamp: number;
  totalExpected: number;
  totalLifted: number;
  discrepancy: number;
  cash: number;
  tpa: number;
  transfer: number;
  lunchExpense: number;
  notes: string;
  closedBy: string;
  itemsSummary: { name: string, qty: number, total: number }[];
  stockSnapshot?: {
    initial: Record<string, string>;
    final: Record<string, string>;
  };
  // Extended fields for detailed reporting
  dateISO?: string;
  displayDate?: string;
  weekday?: string;
  generatedAt?: string;
  totals?: {
    expected: number;
    lifted: number;
    discrepancy: number;
    soldStock: number;
  };
  financials?: {
    cash: number;
    transfer: number;
    ticket: number;
    lunch: number;
    justification: string;
  };
  topProducts?: { name: string; qty: number; total: number }[];
  itemsSnapshot?: any[];
  synced?: boolean;
}
