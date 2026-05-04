
export enum UserRole {
  PROPRIETARIO = 'PROPRIETARIO',
  ADMIN_GERAL = 'ADMIN_GERAL',
  GERENTE = 'GERENTE',
  COLABORADOR_REMOTO = 'COLABORADOR_REMOTO',
  COLABORADOR_EFETIVO = 'COLABORADOR_EFETIVO',
  FUNCIONARIO = 'FUNCIONARIO'
}

export interface UserPermissions {
  // 1. ADMINISTRAÇÃO DO SISTEMA
  admin_users_view: boolean;
  admin_users_create: boolean;
  admin_users_edit: boolean;
  admin_users_delete: boolean;
  admin_users_permissions: boolean;
  admin_global_admin: boolean;
  admin_global_read_only: boolean;
  admin_global_block_hours: boolean;
  admin_logs_view: boolean;
  admin_history_view: boolean;

  // 2. ATENDIMENTO DIRECTO
  direct_service_view: boolean;
  direct_service_execute: boolean;
  direct_service_reports: boolean;
  direct_service_void: boolean;

  // 3. CONTROLE DE VENDAS
  sales_view: boolean;
  sales_execute: boolean;
  sales_edit: boolean;
  sales_view_margins: boolean;
  sales_closure: boolean;

  // 4. INVENTÁRIO
  inventory_view: boolean;
  inventory_product_create: boolean;
  inventory_product_edit: boolean;
  inventory_product_delete: boolean;
  inventory_edit: boolean;
  inventory_stock_adjust: boolean;
  inventory_category_manage: boolean;

  // 5. PREÇOS & PROMOÇÕES
  prices_view: boolean;
  prices_edit: boolean;
  prices_mix_match: boolean;
  prices_promo_create: boolean;
  prices_promo_delete: boolean;

  // 6. CENTRAL DE COMPRAS
  purchases_view: boolean;
  purchases_execute: boolean;
  purchases_simulate: boolean;
  purchases_limit: number; // Max value per purchase

  // 7. DESPESAS
  expenses_view: boolean;
  expenses_execute: boolean;
  expenses_category_manage: boolean;
  expenses_limit: number; // Max value per expense

  // 8. ESTADO DE CONTA & FINANCEIRO
  finance_view: boolean;
  finance_edit: boolean;
  finance_card_create: boolean;
  finance_card_delete: boolean;

  // 9. CALENDÁRIO MARGUEL
  calendar_view: boolean;
  calendar_lock: boolean;
  calendar_unlock: boolean;

  // 10. SISTEMA & CONFIGURAÇÕES
  settings_edit: boolean;
  sync_manage: boolean;
  backup_manage: boolean;
  restore_system: boolean;

  // 11. AUDITORIA GLOBAL
  audit_view: boolean;
  audit_control: boolean;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  isApproved: boolean;
  isBanned?: boolean;
  pin?: string;
  permissions?: UserPermissions;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
  phoneNumber?: string;
  secondaryPhoneNumber?: string;
  associatedEmail?: string;
  createdAt?: string;
  lastLogin?: string;
  status?: 'Ativo' | 'Inativo';
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
  packType?: 'Grade' | 'Caixa' | 'Embalagem';
  isArchived?: boolean;
  
  // MIX MATCH COMPLETO (obrigatório)
  isMixMatch?: boolean;
  hasMixMatch?: boolean;       // Bug #13
  isMixMatchActive?: boolean;  // Bug #13
  mixMatchQty?: number;        // ex: 3
  mixMatchPrice?: number;      // preço do pack promocional
  discountAmount?: number;     // desconto unitário
  isPromoActive?: boolean;     // mantido para compatibilidade
  promoQty?: number;
  promoPrice?: number;
}

export interface PriceHistoryLog {
  id: string;
  productId: string;
  productName: string;
  oldBuyPrice: number;
  newBuyPrice: number;
  oldSellPrice: number;
  newSellPrice: number;
  changedBy: string;
  date: string;
  timestamp: number;
}

export interface SavedProposal {
  id: string;
  name: string;
  date: string;
  items: Record<string, number>;
  total: number;
  snapshotPrices?: Record<string, { buy: number; sell: number }>;
  createdBy?: string;
  status?: string;
}

export interface PurchaseRecord {
  id: string;
  name: string;
  date: string;
  items: Record<string, number>;
  total: number;
  completedBy: string;
  supplier?: string;
  timestamp: number;
  source: 'Prices' | 'Inventory' | 'Sales';
  attachments?: string[];
  synced?: boolean;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  isActive: boolean;
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
  origin?: string;
  status?: 'ACTIVE' | 'REVERSED' | 'REVERSAL';
  isReverted?: boolean;
  isInformativeOnly?: boolean;
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
  category?: string;
  observations?: string;
}

export interface Card {
  id: string;
  name: string;
  holder: string;
  balance: number;
  color: string;
  type: 'Corrente' | 'Poupança' | 'Outro';
  validity: string;
  isReadOnly?: boolean;
}

export interface StockOperationLog {
  id: string;
  productId: string;
  productName: string;
  type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'MANUAL_ADJUSTMENT';
  qtyBefore: number;
  qtyAdded: number;
  qtyAfter: number;
  timestamp: number;
  performedBy: string;
  referenceId: string;
  reason?: string;
  // Novos campos para compatibilidade com o pedido do utilizador
  previousStock?: number;
  newStock?: number;
  qtyChanged?: number;
  responsible?: string;
}

export interface InventoryLog {
  id: string;
  timestamp?: number;
  date: string;
  performedBy: string;
  totalItems: number;
  discrepancies: { name: string, diff: number }[];
  status: 'OK' | 'DIVERGENTE';
  justification?: string;
}

export interface Transaction {
  id: string;
  type: 'entrada' | 'saida';
  category: string;
  amount: number;
  date: string;
  description: string;
  referenceId?: string;
  referenceType?: 'purchase' | 'expense' | 'sales_report' | 'deposit' | 'withdrawal' | 'day_closure' | 'reversal';
  performedBy?: string;
  accountName?: string;
  status?: 'ATIVO' | 'CANCELADO' | 'AJUSTADO';
  timestamp?: number;
  operationalDay?: string;
  isTransfer?: boolean;
  transferCounterpartId?: string;
}

export enum ClosureStatus {
  ABERTO = 'ABERTO',
  FECHO_PARCIAL_GERENTE = 'FECHO_PARCIAL_GERENTE',
  FECHO_PARCIAL_FUNCIONARIO = 'FECHO_PARCIAL_FUNCIONARIO',
  FECHO_PARCIAL_ADMIN = 'FECHO_PARCIAL_ADMIN',
  FECHO_PARCIAL = 'FECHO_PARCIAL',
  FECHO_CONFIRMADO = 'FECHO_CONFIRMADO',
  CAIXA_FECHADA = 'CAIXA_FECHADA',
  BLOQUEADO = 'BLOQUEADO',
  DIA_BLOQUEADO = 'DIA_BLOQUEADO'
}

export interface SalesReport {
  id: string;
  date: string;
  timestamp: number;
  totalExpected: number;
  totalLifted: number;
  discrepancy: number;
  profit?: number;
  cash: number;
  tpa: number;
  transfer: number;
  lunchExpense: number;
  notes: string;
  closedBy: string;
  itemsSummary: { 
    productId?: string; 
    name: string; 
    qty: number; 
    total: number;
    // NOVOS CAMPOS – agora todos os utilizadores veem o desconto
    isMixMatch?: boolean;
    discountAmount?: number;
    mixMatchQtyUsed?: number;
    avulsaQty?: number;
  }[];
  stockSnapshot?: {
    initial: Record<string, string>;
    final: Record<string, string>;
  };
  // Double confirmation fields
  status: ClosureStatus;
  confirmedBy?: string;
  confirmationTimestamp?: number;
  unilateralAdminConfirmation?: boolean;
  processedFinancials?: boolean;
  stockUpdated?: boolean;
  lunchProcessed?: boolean;
  isFinalClosure?: boolean;
  type?: 'PARTIAL' | 'FINAL';
  
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
  justificationLog?: {
    tipo: string;
    valor_quebra_ou_sobra: number;
    justificativa: string;
    usuario: string;
    data: string;
    hora: number;
  };
  _deltaApplied?: boolean;
}

export interface Notification {
  id: string;
  type: 'STOCK_CRITICO' | 'STOCK_BAIXO' | 'DIVERGENCIA' | 'FECHO_PENDENTE' | 'CUSTOM' | 'SISTEMA';
  title: string;
  message: string;
  timestamp: number;
  date: string;
  read: boolean;
  // PROD-7: campos de resolução
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
  resolvedNote?: string;
  // Referência opcional
  referenceId?: string;
  referenceType?: string;
  color?: 'red' | 'amber' | 'blue' | 'green';
  icon?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  module: string;
  entityId: string | null;
  description: string;
  previousValue: any;
  newValue: any;
  performedBy: string;
  userRole: string;
  timestamp: number; // Unix timestamp
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  ipAddress?: string;
  source: "local" | "backend" | "firestore";
  synced: boolean;
}
