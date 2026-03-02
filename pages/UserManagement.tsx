
import React, { useState, useEffect } from 'react';
import { Search, Filter, Shield, User as UserIcon, CheckCircle, XCircle, AlertTriangle, MoreVertical, Ban, Eye, EyeOff, DollarSign, Lock, ShoppingCart, Package, Wallet, ShoppingBag, Save, RefreshCw } from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { User, UserRole, UserPermissions } from '../types';
import { useAuth } from '../App';
import { useLayout } from '../contexts/LayoutContext';
import { DEFAULT_PERMISSIONS } from '../src/utils/permissions';
import { getMockUsers, saveMockUsers } from '../src/services/mockUsers';

const UserManagement: React.FC = () => {
  const { user: currentUser, refreshUser } = useAuth();
  const { sidebarMode, triggerHaptic } = useLayout();
  
  // Mock Users Data
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    setUsers(getMockUsers());
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  
  // Permission Matrix Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [tempPermissions, setTempPermissions] = useState<UserPermissions | null>(null);

  // Track modified users to show save button
  const [modifiedUsers, setModifiedUsers] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  // Actions
  const handleApprove = (id: string) => {
    const updated = users.map(u => u.id === id ? { ...u, isApproved: true } : u);
    setUsers(updated);
    saveMockUsers(updated);
    showToast('Usuário aprovado com sucesso!');
  };

  const handleBanToggle = (id: string) => {
    const updated = users.map(u => u.id === id ? { ...u, isBanned: !u.isBanned } : u);
    setUsers(updated);
    saveMockUsers(updated);
    showToast(updated.find(u => u.id === id)?.isBanned ? 'Usuário banido!' : 'Banimento removido!');
  };

  const handleRoleChange = (id: string, newRole: UserRole) => {
    const updated = users.map(u => u.id === id ? { ...u, role: newRole, permissions: DEFAULT_PERMISSIONS[newRole] } : u);
    setUsers(updated);
    saveMockUsers(updated);
    showToast(`Cargo de ${updated.find(u => u.id === id)?.name} alterado!`);
  };

  // Permission Matrix Actions
  const openPermissionMatrix = (user: User) => {
    setEditingUser(user);
    setTempPermissions({ ...(user.permissions || DEFAULT_PERMISSIONS[user.role]) });
  };

  const closePermissionMatrix = () => {
    setEditingUser(null);
    setTempPermissions(null);
  };

  const handleTempPermissionToggle = (key: keyof UserPermissions) => {
    if (!tempPermissions) return;
    
    setTempPermissions(prev => {
      if (!prev) return null;
      const val = prev[key];
      if (typeof val === 'boolean') {
        return { ...prev, [key]: !val };
      }
      return prev;
    });
  };

  const handleTempLimitChange = (key: 'purchases_limit' | 'expenses_limit', value: string) => {
    if (!tempPermissions) return;
    const numValue = parseFloat(value) || 0;
    setTempPermissions(prev => prev ? { ...prev, [key]: numValue } : null);
  };

  const savePermissions = () => {
    if (!editingUser || !tempPermissions) return;
    
    const updated = users.map(u => u.id === editingUser.id ? { ...u, permissions: tempPermissions } : u);
    setUsers(updated);
    saveMockUsers(updated);
    
    showToast(`Permissões de ${editingUser.name} atualizadas!`);
    closePermissionMatrix();
  };

  // Filter Logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'ALL' || u.role === filterRole;
    
    let matchesStatus = true;
    if (filterStatus === 'PENDING') matchesStatus = !u.isApproved;
    if (filterStatus === 'BANNED') matchesStatus = !!u.isBanned;
    if (filterStatus === 'ACTIVE') matchesStatus = u.isApproved && !u.isBanned;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.PROPRIETARIO: return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case UserRole.ADMIN_GERAL: return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300';
      case UserRole.GERENTE: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case UserRole.COLABORADOR_REMOTO: return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300';
      case UserRole.COLABORADOR_EFETIVO: return 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
    }
  };

  if (currentUser?.role !== UserRole.ADMIN_GERAL && currentUser?.role !== UserRole.PROPRIETARIO) {
    return (
      <div className="p-8 text-center text-slate-500">
        <AlertTriangle className="mx-auto mb-4 text-amber-500" size={48} />
        <h2 className="text-xl font-bold text-[#003366]">Acesso Restrito</h2>
        <p>Apenas Administradores ou Proprietários podem gerir usuários.</p>
      </div>
    );
  }

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

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className={`transition-all duration-300 ${sidebarMode === 'hidden' ? 'pl-16 md:pl-20' : ''}`}>
          <h1 className="text-3xl font-bold text-[#003366] dark:text-white">Gestão de Usuários</h1>
          <p className="text-slate-500 dark:text-slate-400">Controlo de acesso, permissões e aprovações</p>
        </div>
      </header>

      {/* Filters & Search */}
      <SoftCard className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-700 border-none rounded-xl py-3 pl-12 pr-4 soft-ui-inset focus:ring-2 focus:ring-[#003366] transition-all dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="bg-slate-50 dark:bg-slate-700 border-none rounded-xl px-4 py-3 soft-ui-inset text-slate-600 dark:text-slate-200 font-medium"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="ALL">Todos os Cargos</option>
            {Object.values(UserRole).map(role => (
              <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select 
            className="bg-slate-50 dark:bg-slate-700 border-none rounded-xl px-4 py-3 soft-ui-inset text-slate-600 dark:text-slate-200 font-medium"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="PENDING">Pendentes</option>
            <option value="BANNED">Banidos</option>
          </select>
        </div>
      </SoftCard>

      {/* Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map((u) => {
          const isMe = currentUser.id === u.id;
          
          // Helper to check permission
          const hasPerm = (key: keyof UserPermissions) => u.permissions?.[key] === true;
          
          // Logic for lock states
          const isOwner = u.role === UserRole.PROPRIETARIO;
          const isAdmin = u.role === UserRole.ADMIN_GERAL;
          const isHighLevel = isOwner || isAdmin;
          const hasPendingChanges = modifiedUsers.has(u.id);
          
          return (
            <SoftCard key={u.id} className={`relative overflow-hidden flex flex-col h-full ${u.isBanned ? 'border-2 border-red-100 dark:border-red-900/30 bg-red-50/10 dark:bg-red-900/10' : ''}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-lg ${u.isBanned ? 'bg-slate-400' : 'bg-[#003366]'}`}>
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#003366] dark:text-white leading-tight flex items-center gap-2">
                      {u.name}
                      {isMe && <span className="text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 px-2 py-0.5 rounded-full">Você</span>}
                    </h3>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                </div>
                {u.isBanned && <Ban size={20} className="text-red-500" />}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeColor(u.role)}`}>
                  {u.role.replace(/_/g, ' ')}
                </span>
                {!u.isApproved && (
                  <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle size={12} /> Pendente Aprovação
                  </span>
                )}
                {u.isBanned && (
                  <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                    Banido
                  </span>
                )}
              </div>
              
              <div className="flex-1"></div>

              {/* Specific Permissions Section */}
              <div className="mb-4 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-600">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                  <Shield size={10} /> Matriz de Permissões
                </p>
                <button 
                  onClick={() => openPermissionMatrix(u)}
                  disabled={isMe || u.isBanned || isHighLevel}
                  className="w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-[#003366] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <Filter size={14} /> Gerir Permissões Granulares
                </button>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Alterar Cargo</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-700 text-sm p-2 rounded-lg border-none soft-ui-inset dark:text-white"
                    value={u.role}
                    disabled={isMe || u.isBanned}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                  >
                    {Object.values(UserRole).map(role => (
                      <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  {!u.isApproved && (
                    <button 
                      onClick={() => handleApprove(u.id)}
                      disabled={isMe}
                      className="flex-1 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-colors shadow-md shadow-green-100"
                    >
                      Aprovar Acesso
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleBanToggle(u.id)}
                    disabled={isMe}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                      u.isBanned 
                      ? 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500' 
                      : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                    }`}
                  >
                    {u.isBanned ? 'Remover Ban' : 'Banir Usuário'}
                  </button>
                </div>
              </div>
            </SoftCard>
          );
        })}
      </div>

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
                    <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>Marguel CGPS (SU) Lda</span>
                </div>
            </div>
        </footer>

        {/* PERMISSION MATRIX MODAL */}
        {editingUser && tempPermissions && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#003366] rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                    {editingUser.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#003366] dark:text-white">Matriz de Permissões</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Configurando acessos para {editingUser.name}</p>
                  </div>
                </div>
                <button onClick={closePermissionMatrix} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <XCircle size={24} className="text-slate-400" />
                </button>
              </div>

              {/* Modal Content - Scrollable Matrix */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
                {/* Section Helper */}
                {Object.entries({
                  "1. ADMINISTRAÇÃO DO SISTEMA": [
                    { key: 'admin_users_view', label: 'Ver Usuários' },
                    { key: 'admin_users_create', label: 'Criar Usuário' },
                    { key: 'admin_users_edit', label: 'Editar Usuário' },
                    { key: 'admin_users_delete', label: 'Eliminar Usuário' },
                    { key: 'admin_users_permissions', label: 'Alterar Permissões' },
                    { key: 'admin_global_admin', label: 'Acesso Total (Super Admin)', color: 'text-red-600' },
                    { key: 'admin_global_read_only', label: 'Modo Somente Leitura Global' },
                    { key: 'admin_global_block_hours', label: 'Bloquear Acesso Fora do Horário' },
                    { key: 'admin_logs_view', label: 'Ver Logs do Sistema' },
                    { key: 'admin_history_view', label: 'Ver Histórico de Alterações' },
                  ],
                  "2. ATENDIMENTO DIRECTO": [
                    { key: 'direct_service_view', label: 'Ver Atendimento Directo' },
                    { key: 'direct_service_execute', label: 'Efectuar Atendimento Directo' },
                    { key: 'direct_service_reports', label: 'Ver Relatórios de Atendimento' },
                    { key: 'direct_service_void', label: 'Anular Atendimento' },
                  ],
                  "3. CONTROLE DE VENDAS": [
                    { key: 'sales_view', label: 'Ver Controle de Vendas' },
                    { key: 'sales_execute', label: 'Efectuar Vendas' },
                    { key: 'sales_edit', label: 'Efectuar Alterações em Controle de Vendas' },
                    { key: 'sales_void', label: 'Anular Venda' },
                    { key: 'sales_view_margins', label: 'Ver Margem de Lucro Global' },
                  ],
                  "4. INVENTÁRIO": [
                    { key: 'inventory_view', label: 'Ver Inventário' },
                    { key: 'inventory_product_create', label: 'Criar Produto' },
                    { key: 'inventory_product_edit', label: 'Editar Produto' },
                    { key: 'inventory_product_delete', label: 'Eliminar Produto' },
                    { key: 'inventory_edit', label: 'Efectuar Alterações em Inventário' },
                    { key: 'inventory_stock_adjust', label: 'Ajuste Manual de Estoque' },
                    { key: 'inventory_category_manage', label: 'Alterar Categoria' },
                    { key: 'inventory_view_costs', label: 'Ver Custo Real do Produto' },
                  ],
                  "5. PREÇOS & PROMOÇÕES": [
                    { key: 'prices_view', label: 'Ver Preços & Compras' },
                    { key: 'prices_edit', label: 'Alterar Preços' },
                    { key: 'prices_mix_match', label: 'Configurar Mix & Match' },
                    { key: 'prices_promo_create', label: 'Criar Promoção' },
                    { key: 'prices_promo_delete', label: 'Eliminar Promoção' },
                  ],
                  "6. CENTRAL DE COMPRAS": [
                    { key: 'purchases_view', label: 'Ver Compras' },
                    { key: 'purchases_execute', label: 'Efectuar Compras' },
                    { key: 'purchases_simulate', label: 'Efectuar Simulações de Compras' },
                    { key: 'purchases_void', label: 'Anular Compra' },
                    { key: 'purchases_edit_finalized', label: 'Editar Compra Após Finalização' },
                    { key: 'purchases_reopen', label: 'Reabrir Compra' },
                    { key: 'purchases_approve', label: 'Aprovar Compra' },
                  ],
                  "7. DESPESAS": [
                    { key: 'expenses_view', label: 'Ver Despesas' },
                    { key: 'expenses_execute', label: 'Efectuar Despesas' },
                    { key: 'expenses_approve', label: 'Aprovar Despesas' },
                    { key: 'expenses_void', label: 'Anular Despesa' },
                  ],
                  "8. ESTADO DE CONTA & FINANCEIRO": [
                    { key: 'finance_view', label: 'Ver Estado de Conta' },
                    { key: 'finance_edit', label: 'Fazer Alterações em Estado de Conta' },
                    { key: 'finance_card_create', label: 'Criar Cartão Corporativo' },
                    { key: 'finance_card_delete', label: 'Eliminar Cartão' },
                    { key: 'finance_transfer', label: 'Transferir Saldo entre Cartões' },
                    { key: 'finance_approve_movement', label: 'Aprovar Movimentação' },
                    { key: 'finance_reports_view', label: 'Ver Relatórios Financeiros' },
                    { key: 'finance_export', label: 'Exportar Relatórios (PDF/Excel)' },
                  ],
                  "9. CALENDÁRIO MARGUEL": [
                    { key: 'calendar_view', label: 'Ver Calendário Marguel' },
                    { key: 'calendar_event_create', label: 'Criar Evento' },
                    { key: 'calendar_event_edit', label: 'Editar Evento' },
                    { key: 'calendar_event_delete', label: 'Eliminar Evento' },
                  ],
                  "10. SISTEMA & CONFIGURAÇÕES": [
                    { key: 'settings_edit', label: 'Alterar Configurações Gerais' },
                    { key: 'sync_manage', label: 'Ativar/Desativar WiFi/Sincronização' },
                    { key: 'backup_manage', label: 'Gerir Backup' },
                    { key: 'restore_system', label: 'Restaurar Sistema' },
                  ]
                }).map(([section, perms]) => (
                  <div key={section} className="space-y-4">
                    <h3 className="text-sm font-black text-[#003366] dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      {section}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                      {perms.map((p) => (
                        <div key={p.key} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
                          <span className={`text-xs font-medium ${p.color || 'text-slate-600 dark:text-slate-300'}`}>{p.label}</span>
                          <button 
                            onClick={() => handleTempPermissionToggle(p.key as keyof UserPermissions)}
                            className={`w-10 h-5 rounded-full p-1 transition-all flex items-center ${tempPermissions[p.key as keyof UserPermissions] ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700 justify-start'}`}
                          >
                            <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${tempPermissions[p.key as keyof UserPermissions] ? 'translate-x-5' : ''}`}></div>
                          </button>
                        </div>
                      ))}
                    </div>
                    {/* Limits for specific sections */}
                    {section.includes("COMPRAS") && (
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                        <label className="text-xs font-bold text-blue-700 dark:text-blue-300 block mb-2">Limite Máximo por Compra (Kz)</label>
                        <input 
                          type="number" 
                          value={tempPermissions.purchases_limit}
                          onChange={(e) => handleTempLimitChange('purchases_limit', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border-none rounded-xl py-2 px-4 text-sm soft-ui-inset"
                        />
                      </div>
                    )}
                    {section.includes("DESPESAS") && (
                      <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800/50">
                        <label className="text-xs font-bold text-red-700 dark:text-red-300 block mb-2">Limite Máximo por Despesa (Kz)</label>
                        <input 
                          type="number" 
                          value={tempPermissions.expenses_limit}
                          onChange={(e) => handleTempLimitChange('expenses_limit', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border-none rounded-xl py-2 px-4 text-sm soft-ui-inset"
                        />
                      </div>
                    )}
                  </div>
                ))}

              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-end gap-3">
                <button 
                  onClick={closePermissionMatrix}
                  className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={savePermissions}
                  className="px-8 py-2 bg-[#003366] text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                >
                  <Save size={18} /> Salvar Matriz
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default UserManagement;
