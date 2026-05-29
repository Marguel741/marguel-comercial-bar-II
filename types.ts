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

  // 12. RESERVA
  reserve_view: boolean;        // Ver stock da Reserva
  reserve_transfer: boolean;    // Transferir da Reserva para o Bar
  reserve_adjust: boolean;      // Ajustar stock da Reserva manualmente
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
  stock: number;        // Stock do Bar (unidades)
  minStock: number;     // Stock mínimo do Bar
  reserveStock?: number;    // Stock da Reserva (unidades)
  minReserveStock?: number; // Stock mínimo da Reserva
  category: string;
  packSize?: number;
  packType?: 'Grade' | 'Caixa' | 'Embalagem';
  isArchived?: boolean;

  // MIX MATCH COMPLETO (obrigatório)
  isMixMatch?: boolean;
  hasMixMatch?: boolean;
  isMixMatchActive?: boolean;
  mixMatchQty?: number;
  mixMatchPrice?: number;
  discountAmount?: number;
  isPromoActive?: boolean;
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
  items: Record<string, number>;         // Quantidade em packs (grades/caixas)
  barItems?: Record<string, number>;     // Quantidade em packs que foi para o Bar
  reserveItems?: Record<string, number>; // Quantidade em packs que foi para a Reserva
  packSizeSnapshot?: Record<string, number>; // packSize de cada produto no momento da compra
  total: number;
  completedBy: string;
  supplier?: string;
  timestamp: number;
  source: 'Prices' | 'Inventory' | 'Sales';
  attachments?: string[];
  synced?: boolean;
  sourceAccount?: 'main' | 'cash_in_hand';
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
  sourceAccount?: 'main' | 'cash_in_hand';
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
  type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'MANUAL_ADJUSTMENT' | 'RESERVE_TRANSFER_IN' | 'RESERVE_TRANSFER_OUT' | 'RESERVE_ADJUSTMENT';
  location?: 'bar' | 'reserve'; // onde ocorreu a operação
  qtyBefore: number;
  qtyAdded: number;
  qtyAfter: number;
  timestamp: number;
  performedBy: string;
  referenceId: string;
  reason?: string;
  previousStock?: number;
  newStock?: number;
  qtyChanged?: number;
  responsible?: string;
}

// Transferência da Reserva para o Bar
export interface ReserveTransfer {
  id: string;
  date: string;              // YYYY-MM-DD — data operacional
  timestamp: number;
  performedBy: string;
  items: Record<string, number>; // productId → quantidade em unidades transferida
  packSizeSnapshot: Record<string, number>; // packSize no momento da transferência
  notes?: string;
  sourceAccount?: 'main' | 'cash_in_hand'; // não usado mas mantido para consistência
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
  balanceAfter?: number; // Saldo do cartão após este movimento
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
    isMixMatch?: boolean;
    discountAmount?: number;
    mixMatchQtyUsed?: number;
    avulsaQty?: number;
  }[];
  stockSnapshot?: {
    initial: Record<string, string>;
    final: Record<string, string>;
  };
  status: ClosureStatus;
  confirmedBy?: string;
  confirmationTimestamp?: number;
  unilateralAdminConfirmation?: boolean;
  processedFinancials?: boolean;
  stockUpdated?: boolean;
  lunchProcessed?: boolean;
  isFinalClosure?: boolean;
  type?: 'PARTIAL' | 'FINAL';
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
  // Transferências da Reserva para o Bar registadas neste dia
  reserveTransferIds?: string[];
}

export interface Notification {
  id: string;
  type: 'STOCK_CRITICO' | 'STOCK_BAIXO' | 'DIVERGENCIA' | 'FECHO_PENDENTE' | 'CUSTOM' | 'SISTEMA';
  title: string;
  message: string;
  timestamp: number;
  date: string;
  read: boolean;
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
  resolvedNote?: string;
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
  timestamp: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  ipAddress?: string;
  source: "local" | "backend" | "firestore";
  synced: boolean;
}
