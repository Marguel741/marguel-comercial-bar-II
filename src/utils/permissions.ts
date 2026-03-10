
import { UserRole, UserPermissions } from '../../types';

export const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  [UserRole.PROPRIETARIO]: {
    admin_users_view: true, admin_users_create: true, admin_users_edit: true, admin_users_delete: true, admin_users_permissions: true,
    admin_global_admin: true, admin_global_read_only: false, admin_global_block_hours: false, admin_logs_view: true, admin_history_view: true,
    direct_service_view: true, direct_service_execute: true, direct_service_reports: true, direct_service_void: true,
    sales_view: true, sales_execute: true, sales_edit: true, sales_view_margins: true, sales_closure: true,
    inventory_view: true, inventory_product_create: true, inventory_product_edit: true, inventory_product_delete: true, inventory_edit: true, inventory_stock_adjust: true, inventory_category_manage: true,
    prices_view: true, prices_edit: true, prices_mix_match: true, prices_promo_create: true, prices_promo_delete: true,
    purchases_view: true, purchases_execute: true, purchases_simulate: true, purchases_limit: 10000000,
    expenses_view: true, expenses_execute: true, expenses_category_manage: true, expenses_limit: 10000000,
    finance_view: true, finance_edit: true, finance_card_create: true, finance_card_delete: true,
    calendar_view: true,
    calendar_unlock: true,
    settings_edit: true, sync_manage: true, backup_manage: true, restore_system: true
  },
  [UserRole.ADMIN_GERAL]: {
    admin_users_view: true, admin_users_create: true, admin_users_edit: true, admin_users_delete: true, admin_users_permissions: true,
    admin_global_admin: true, admin_global_read_only: false, admin_global_block_hours: false, admin_logs_view: true, admin_history_view: true,
    direct_service_view: true, direct_service_execute: true, direct_service_reports: true, direct_service_void: true,
    sales_view: true, sales_execute: true, sales_edit: true, sales_view_margins: true, sales_closure: true,
    inventory_view: true, inventory_product_create: true, inventory_product_edit: true, inventory_product_delete: true, inventory_edit: true, inventory_stock_adjust: true, inventory_category_manage: true,
    prices_view: true, prices_edit: true, prices_mix_match: true, prices_promo_create: true, prices_promo_delete: true,
    purchases_view: true, purchases_execute: true, purchases_simulate: true, purchases_limit: 5000000,
    expenses_view: true, expenses_execute: true, expenses_category_manage: true, expenses_limit: 5000000,
    finance_view: true, finance_edit: true, finance_card_create: true, finance_card_delete: true,
    calendar_view: true,
    calendar_unlock: true,
    settings_edit: true, sync_manage: true, backup_manage: true, restore_system: true
  },
  [UserRole.GERENTE]: {
    admin_users_view: true, admin_users_create: false, admin_users_edit: false, admin_users_delete: false, admin_users_permissions: false,
    admin_global_admin: false, admin_global_read_only: false, admin_global_block_hours: false, admin_logs_view: true, admin_history_view: true,
    direct_service_view: true, direct_service_execute: true, direct_service_reports: true, direct_service_void: true,
    sales_view: true, sales_execute: true, sales_edit: true, sales_view_margins: false, sales_closure: true,
    inventory_view: true, inventory_product_create: true, inventory_product_edit: true, inventory_product_delete: false, inventory_edit: true, inventory_stock_adjust: true, inventory_category_manage: true,
    prices_view: true, prices_edit: false, prices_mix_match: false, prices_promo_create: false, prices_promo_delete: false,
    purchases_view: true, purchases_execute: true, purchases_simulate: true, purchases_limit: 1000000,
    expenses_view: true, expenses_execute: true, expenses_category_manage: false, expenses_limit: 500000,
    finance_view: true, finance_edit: false, finance_card_create: false, finance_card_delete: false,
    calendar_view: true,
    calendar_unlock: true,
    settings_edit: false, sync_manage: false, backup_manage: false, restore_system: false
  },
  [UserRole.COLABORADOR_EFETIVO]: {
    admin_users_view: false, admin_users_create: false, admin_users_edit: false, admin_users_delete: false, admin_users_permissions: false,
    admin_global_admin: false, admin_global_read_only: false, admin_global_block_hours: false, admin_logs_view: false, admin_history_view: false,
    direct_service_view: true, direct_service_execute: true, direct_service_reports: false, direct_service_void: false,
    sales_view: true, sales_execute: true, sales_edit: false, sales_view_margins: false, sales_closure: false,
    inventory_view: true, inventory_product_create: false, inventory_product_edit: false, inventory_product_delete: false, inventory_edit: false, inventory_stock_adjust: false, inventory_category_manage: false,
    prices_view: true, prices_edit: false, prices_mix_match: false, prices_promo_create: false, prices_promo_delete: false,
    purchases_view: false, purchases_execute: false, purchases_simulate: false, purchases_limit: 0,
    expenses_view: true, expenses_execute: true, expenses_category_manage: false, expenses_limit: 50000,
    finance_view: false, finance_edit: false, finance_card_create: false, finance_card_delete: false,
    calendar_view: true,
    calendar_unlock: false,
    settings_edit: false, sync_manage: false, backup_manage: false, restore_system: false
  },
  [UserRole.FUNCIONARIO]: {
    admin_users_view: false, admin_users_create: false, admin_users_edit: false, admin_users_delete: false, admin_users_permissions: false,
    admin_global_admin: false, admin_global_read_only: false, admin_global_block_hours: false, admin_logs_view: false, admin_history_view: false,
    direct_service_view: true, direct_service_execute: true, direct_service_reports: false, direct_service_void: false,
    sales_view: true, sales_execute: true, sales_edit: false, sales_view_margins: false, sales_closure: false,
    inventory_view: true, inventory_product_create: false, inventory_product_edit: false, inventory_product_delete: false, inventory_edit: false, inventory_stock_adjust: false, inventory_category_manage: false,
    prices_view: false, prices_edit: false, prices_mix_match: false, prices_promo_create: false, prices_promo_delete: false,
    purchases_view: false, purchases_execute: false, purchases_simulate: false, purchases_limit: 0,
    expenses_view: false, expenses_execute: false, expenses_category_manage: false, expenses_limit: 0,
    finance_view: false, finance_edit: false, finance_card_create: false, finance_card_delete: false,
    calendar_view: true,
    calendar_unlock: false,
    settings_edit: false, sync_manage: false, backup_manage: false, restore_system: false
  },
  [UserRole.COLABORADOR_REMOTO]: {
    admin_users_view: true, admin_users_create: false, admin_users_edit: false, admin_users_delete: false, admin_users_permissions: false,
    admin_global_admin: false, admin_global_read_only: true, admin_global_block_hours: false, admin_logs_view: true, admin_history_view: true,
    direct_service_view: true, direct_service_execute: false, direct_service_reports: true, direct_service_void: false,
    sales_view: true, sales_execute: false, sales_edit: false, sales_view_margins: true, sales_closure: false,
    inventory_view: true, inventory_product_create: false, inventory_product_edit: false, inventory_product_delete: false, inventory_edit: false, inventory_stock_adjust: false, inventory_category_manage: false,
    prices_view: true, prices_edit: false, prices_mix_match: false, prices_promo_create: false, prices_promo_delete: false,
    purchases_view: true, purchases_execute: false, purchases_simulate: true, purchases_limit: 0,
    expenses_view: true, expenses_execute: false, expenses_category_manage: false, expenses_limit: 0,
    finance_view: true, finance_edit: false, finance_card_create: false, finance_card_delete: false,
    calendar_view: true,
    calendar_unlock: false,
    settings_edit: false, sync_manage: false, backup_manage: false, restore_system: false
  }
};

export const hasPermission = (user: { permissions?: UserPermissions, role: UserRole } | null, permission: keyof UserPermissions): boolean => {
  if (!user || !user.permissions) return false;
  
  // 1. Super Admin (Proprietário) tem passe livre total
  if (user.permissions.admin_global_admin === true) return true;
  
  // 2. Adicione '_unlock' e '_reopen' à lista de mutações
  const isMutation = permission.includes('_edit') || 
                     permission.includes('_execute') || 
                     permission.includes('_create') || 
                     permission.includes('_delete') ||
                     permission.includes('_void') ||
                     permission.includes('_closure') ||
                     permission.includes('_adjust') ||
                     permission.includes('_manage') ||
                     permission.includes('_unlock') || // ADICIONADO
                     permission.includes('_reopen') || // ADICIONADO
                     permission.includes('_simulate');

  // 3. Se o modo "Apenas Leitura" estiver ativo, bloqueia a mutação
  if (user.permissions.admin_global_read_only && isMutation) {
    return false;
  }

  const value = user.permissions[permission];
  return typeof value === 'boolean' ? value : false;
};
