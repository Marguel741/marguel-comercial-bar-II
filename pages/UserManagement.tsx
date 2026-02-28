
import React, { useState } from 'react';
import { Search, Filter, Shield, User as UserIcon, CheckCircle, XCircle, AlertTriangle, MoreVertical, Ban, Eye, EyeOff, DollarSign, Lock, ShoppingCart, Package, Wallet, ShoppingBag, Save, RefreshCw } from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { User, UserRole } from '../types';
import { useAuth } from '../App';
import { useLayout } from '../contexts/LayoutContext';

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { sidebarMode, triggerHaptic } = useLayout();
  
  // Mock Users Data
  const [users, setUsers] = useState<User[]>([
    { 
      id: '1', name: 'Administrador Geral', email: 'admin@marguel.com', role: UserRole.ADMIN_GERAL, isApproved: true, isBanned: false,
      permissions: { viewAccountStatus: true, managePrices: true, canEditSales: true, canEditInventory: true, canEditExpenses: true, canEditPurchases: true }
    },
    { 
      id: '2', name: 'Sr. Proprietário', email: 'dono@marguel.com', role: UserRole.PROPRIETARIO, isApproved: true, isBanned: false,
      permissions: { viewAccountStatus: true, managePrices: true, canEditSales: true, canEditInventory: true, canEditExpenses: true, canEditPurchases: true }
    },
    { 
      id: '3', name: 'José Gerente', email: 'jose@marguel.com', role: UserRole.GERENTE, isApproved: true, isBanned: false,
      permissions: { viewAccountStatus: true, managePrices: false, canEditSales: true, canEditInventory: true, canEditExpenses: true, canEditPurchases: true }
    },
    { 
      id: '4', name: 'Maria Efetiva', email: 'maria@marguel.com', role: UserRole.COLABORADOR_EFETIVO, isApproved: true, isBanned: false,
      permissions: { viewAccountStatus: false, managePrices: false, canEditSales: true, canEditInventory: true, canEditExpenses: true, canEditPurchases: false }
    },
    { 
      id: '5', name: 'João Funcionário', email: 'joao@marguel.com', role: UserRole.FUNCIONARIO, isApproved: true, isBanned: false,
      permissions: { viewAccountStatus: false, managePrices: false, canEditSales: true, canEditInventory: true, canEditExpenses: true, canEditPurchases: false }
    },
    { 
      id: '6', name: 'Analista Remoto', email: 'remoto@marguel.com', role: UserRole.COLABORADOR_REMOTO, isApproved: true, isBanned: false,
      permissions: { viewAccountStatus: true, managePrices: false, canEditSales: false, canEditInventory: false, canEditExpenses: false, canEditPurchases: false }
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  
  // Track modified users to show save button
  const [modifiedUsers, setModifiedUsers] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  // Actions
  const handleApprove = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, isApproved: true } : u));
  };

  const handleBanToggle = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, isBanned: !u.isBanned } : u));
  };

  const handleRoleChange = (id: string, newRole: UserRole) => {
    setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
  };

  // Permission Toggle Action
  const handlePermissionToggle = (userId: string, key: keyof import('../types').UserPermissions) => {
    setUsers(prevUsers => prevUsers.map(u => {
      if (u.id === userId) {
        const currentPerms = u.permissions || { 
            viewAccountStatus: false, managePrices: false,
            canEditSales: false, canEditInventory: false, canEditExpenses: false, canEditPurchases: false
        };
        
        // Add to modified set
        setModifiedUsers(prev => new Set(prev).add(userId));
        
        return {
          ...u,
          permissions: {
            ...currentPerms,
            [key]: !currentPerms[key]
          }
        };
      }
      return u;
    }));
  };

  const handleSavePermissions = (userId: string) => {
      triggerHaptic('success');
      // Here you would typically call an API
      setModifiedUsers(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
      });
      showToast("Permissões atualizadas com sucesso!");
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
          const hasPerm = (key: keyof import('../types').UserPermissions) => u.permissions?.[key] === true;
          
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
                  <Shield size={10} /> Permissões de Edição
                </p>
                <div className="space-y-2">
                  
                  {/* Edit Sales */}
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                       {hasPerm('canEditSales') ? <ShoppingCart size={14} className="text-blue-500"/> : <Lock size={14} className="text-slate-400"/>}
                       Editar Vendas
                     </div>
                     <button onClick={() => handlePermissionToggle(u.id, 'canEditSales')} disabled={isMe || u.isBanned || isHighLevel} className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${hasPerm('canEditSales') ? 'bg-[#003366]' : 'bg-slate-300 dark:bg-slate-600 justify-start'}`}>
                       <div className={`w-3 h-3 bg-white rounded-full shadow-sm ${hasPerm('canEditSales') ? 'ml-auto' : ''}`}></div>
                     </button>
                  </div>

                  {/* Edit Inventory */}
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                       {hasPerm('canEditInventory') ? <Package size={14} className="text-green-500"/> : <Lock size={14} className="text-slate-400"/>}
                       Editar Inventário
                     </div>
                     <button onClick={() => handlePermissionToggle(u.id, 'canEditInventory')} disabled={isMe || u.isBanned || isHighLevel} className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${hasPerm('canEditInventory') ? 'bg-[#003366]' : 'bg-slate-300 dark:bg-slate-600 justify-start'}`}>
                       <div className={`w-3 h-3 bg-white rounded-full shadow-sm ${hasPerm('canEditInventory') ? 'ml-auto' : ''}`}></div>
                     </button>
                  </div>

                  {/* Edit Expenses */}
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                       {hasPerm('canEditExpenses') ? <Wallet size={14} className="text-purple-500"/> : <Lock size={14} className="text-slate-400"/>}
                       Editar Despesas
                     </div>
                     <button onClick={() => handlePermissionToggle(u.id, 'canEditExpenses')} disabled={isMe || u.isBanned || isHighLevel} className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${hasPerm('canEditExpenses') ? 'bg-[#003366]' : 'bg-slate-300 dark:bg-slate-600 justify-start'}`}>
                       <div className={`w-3 h-3 bg-white rounded-full shadow-sm ${hasPerm('canEditExpenses') ? 'ml-auto' : ''}`}></div>
                     </button>
                  </div>

                  {/* Edit Purchases */}
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                       {hasPerm('canEditPurchases') ? <ShoppingBag size={14} className="text-amber-500"/> : <Lock size={14} className="text-slate-400"/>}
                       Efectuar Compras
                     </div>
                     <button onClick={() => handlePermissionToggle(u.id, 'canEditPurchases')} disabled={isMe || u.isBanned || isHighLevel} className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${hasPerm('canEditPurchases') ? 'bg-[#003366]' : 'bg-slate-300 dark:bg-slate-600 justify-start'}`}>
                       <div className={`w-3 h-3 bg-white rounded-full shadow-sm ${hasPerm('canEditPurchases') ? 'ml-auto' : ''}`}></div>
                     </button>
                  </div>

                  {/* View Account Status */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-600 mt-2">
                     <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                       {hasPerm('viewAccountStatus') ? <Eye size={14} className="text-blue-500"/> : <EyeOff size={14} className="text-slate-400"/>}
                       Ver Estado Conta
                     </div>
                     <button onClick={() => handlePermissionToggle(u.id, 'viewAccountStatus')} disabled={isMe || u.isBanned || isHighLevel} className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${hasPerm('viewAccountStatus') ? 'bg-[#003366]' : 'bg-slate-300 dark:bg-slate-600 justify-start'}`}>
                       <div className={`w-3 h-3 bg-white rounded-full shadow-sm ${hasPerm('viewAccountStatus') ? 'ml-auto' : ''}`}></div>
                     </button>
                  </div>

                </div>
              </div>

              {/* SAVE BUTTON FOR PERMISSIONS */}
              {hasPendingChanges && (
                  <button 
                    onClick={() => handleSavePermissions(u.id)}
                    className="w-full mb-4 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 animate-slide-up hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
                  >
                    <Save size={16} /> Atualizar Permissões
                  </button>
              )}

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
    </div>
  );
};

export default UserManagement;
