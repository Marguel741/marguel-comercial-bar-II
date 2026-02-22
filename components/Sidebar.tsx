
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Wallet, 
  BarChart3, 
  UserCircle,
  Users,
  Menu,
  Pin,
  PinOff,
  X,
  Settings,
  LogOut,
  ChevronRight,
  MonitorPlay,
  CalendarRange,
  FlaskConical
} from 'lucide-react';
import { useAuth } from '../App';
import { UserRole } from '../types';
import { MGLogo } from '../constants';
import { useLayout } from '../contexts/LayoutContext';
import { useProducts } from '../contexts/ProductContext';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { sidebarMode: mode, isPinned, toggleSidebar, togglePin, setSidebarMode, triggerHaptic } = useLayout();
  const { systemDate } = useProducts(); 
  const navigate = useNavigate();

  const ALL_ROLES = Object.values(UserRole);
  const HIGH_LEVEL_ROLES = [UserRole.PROPRIETARIO, UserRole.ADMIN_GERAL];
  const STANDARD_ROLES = [UserRole.PROPRIETARIO, UserRole.ADMIN_GERAL, UserRole.GERENTE, UserRole.COLABORADOR_EFETIVO, UserRole.FUNCIONARIO];

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ALL_ROLES },
    { to: '/direct-service', icon: MonitorPlay, label: 'Atendimento Directo', roles: HIGH_LEVEL_ROLES },
    { to: '/sales', icon: ShoppingCart, label: 'Controle de Vendas', roles: STANDARD_ROLES },
    { to: '/calendar', icon: CalendarRange, label: 'Calendário Marguel', roles: HIGH_LEVEL_ROLES },
    { to: '/inventory', icon: Package, label: 'Inventário', roles: ALL_ROLES },
    { to: '/prices', icon: DollarSign, label: 'Preços & Compras', roles: ALL_ROLES },
    { to: '/expenses', icon: Wallet, label: 'Despesas', roles: ALL_ROLES },
    { to: '/account', icon: BarChart3, label: 'Estado da Conta', roles: ALL_ROLES, permission: 'viewAccountStatus' },
  ];

  const handleAppRefresh = () => {
    triggerHaptic('success');
    window.location.reload();
  };

  const handleLinkClick = () => {
    triggerHaptic('selection');
    if (window.innerWidth < 768) {
      setSidebarMode('hidden');
    } else if (!isPinned) {
      setSidebarMode('hidden');
    }
  };

  const handleLogout = () => {
    triggerHaptic('warning');
    if (window.confirm("Deseja realmente sair?")) {
      logout();
      navigate('/login');
    }
  };

  const filteredNavItems = navItems.filter(item => {
    if (!user) return false;
    const hasRole = item.roles.includes(user.role);
    if (!hasRole) return false;
    
    if (item.permission === 'viewAccountStatus') {
      if (user.role === UserRole.PROPRIETARIO || user.role === UserRole.ADMIN_GERAL) return true;
      return user.permissions?.viewAccountStatus === true; 
    }
    return true;
  });

  const canViewUsers = user?.role === UserRole.PROPRIETARIO || user?.role === UserRole.ADMIN_GERAL;
  const isDev = user?.role === UserRole.PROPRIETARIO || user?.role === UserRole.ADMIN_GERAL; 

  return (
    <>
      {mode === 'hidden' && (
        <button 
          onClick={toggleSidebar}
          className="fixed top-6 left-6 z-[60] p-3 bg-[#003366] text-white rounded-2xl shadow-xl hover:scale-110 transition-all active:scale-95 animate-fade-in border-2 border-white/20 dark:border-slate-700"
          title="Mostrar Menu"
        >
          <Menu size={24} />
        </button>
      )}

      <div className={`fixed inset-0 z-[100] md:hidden transition-opacity duration-300 ${mode === 'mini' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarMode('hidden')}
        ></div>

        <div className={`absolute left-0 top-0 bottom-0 w-[280px] bg-[#F8FAFC] dark:bg-slate-900 shadow-2xl flex flex-col transition-transform duration-300 ${mode === 'mini' ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="bg-[#003366] p-6 text-white rounded-br-[32px] shadow-lg relative z-10 shrink-0">
             <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20" onClick={handleAppRefresh}>
                   <MGLogo className="w-6 h-6 text-white" />
                </div>
                <button onClick={() => setSidebarMode('hidden')} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                  <X size={20} />
                </button>
             </div>
             
             <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#003366] font-bold text-lg shadow-inner">
                   {user?.name ? user.name.charAt(0).toUpperCase() : <UserCircle size={24} />}
                </div>
                <div className="overflow-hidden">
                   <p className="font-bold text-lg leading-tight truncate">{user?.name}</p>
                   <span className="text-[10px] bg-blue-500/30 px-2 py-0.5 rounded text-blue-100 uppercase font-bold tracking-wide border border-blue-400/30">
                      {user?.role.replace(/_/g, ' ')}
                   </span>
                </div>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar py-4 px-3 space-y-1">
             {filteredNavItems.map((item) => (
               <NavLink
                 key={item.to}
                 to={item.to}
                 onClick={handleLinkClick}
                 className={({ isActive }) => `
                   flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-medium text-sm
                   ${isActive 
                     ? 'bg-white dark:bg-slate-800 text-[#003366] dark:text-white shadow-sm border-l-4 border-[#003366] dark:border-blue-500' 
                     : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'}
                 `}
               >
                 <item.icon size={20} />
                 <span className="flex-1">{item.label}</span>
                 <ChevronRight size={16} className="opacity-30" />
               </NavLink>
             ))}
             
             {isDev && (
                <NavLink
                  to="/test-cycle"
                  onClick={handleLinkClick}
                  className={({ isActive }) => `
                    flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-bold text-sm mt-4 border-t border-slate-100 dark:border-slate-800
                    ${isActive 
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' 
                      : 'text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10'}
                  `}
                >
                  <FlaskConical size={20} />
                  <div className="flex-1">
                      <span className="block">Simulador / Data</span>
                      <span className="text-[10px] font-mono">{systemDate.toLocaleDateString('pt-AO')}</span>
                  </div>
                </NavLink>
             )}
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-1">
             {canViewUsers && (
                <NavLink
                  to="/users"
                  onClick={handleLinkClick}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm
                    ${isActive ? 'bg-slate-100 dark:bg-slate-800 text-[#003366] dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}
                  `}
                >
                   <Users size={18} />
                   Usuários
                </NavLink>
             )}
             
             <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 mt-2">
                <LogOut size={18} />
                Sair
             </button>
          </div>
        </div>
      </div>

      <div className={`
        hidden md:flex 
        ${mode === 'mini' ? 'w-24' : 'w-0'} 
        bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-full flex-col transition-all duration-300 ease-in-out relative z-50 overflow-hidden
      `}>
        <div className="flex flex-col items-center pt-6 pb-2 gap-4">
          <div className="w-12 h-12 text-[#003366] dark:text-blue-400 cursor-pointer hover:scale-110 transition-transform duration-300" onClick={handleAppRefresh}>
            <MGLogo className="w-full h-full" />
          </div>
          <button onClick={togglePin} className={`p-2 rounded-xl transition-all ${isPinned ? 'bg-[#003366] text-white shadow-md' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-[#003366] dark:hover:text-blue-400'}`}>
            {isPinned ? <Pin size={18} className="fill-current" /> : <PinOff size={18} />}
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-3 py-6 custom-scrollbar overflow-y-auto overflow-x-hidden flex flex-col items-center">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleLinkClick}
              className={({ isActive }) => `
                flex items-center justify-center w-12 h-12 rounded-2xl transition-all relative group
                ${isActive ? 'bg-[#003366] text-white shadow-lg shadow-blue-100 dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-[#003366] dark:hover:text-blue-300'}
              `}
              title={item.label}
            >
              <item.icon size={22} className="shrink-0" />
              <div className="absolute left-14 bg-[#003366] text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 whitespace-nowrap z-[70] shadow-xl pointer-events-none">
                {item.label}
                <div className="absolute top-1/2 -left-1 -mt-1 w-2 h-2 bg-[#003366] rotate-45"></div>
              </div>
            </NavLink>
          ))}
          <div className="w-8 h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
          {canViewUsers && (
             <NavLink to="/users" onClick={handleLinkClick} className={({ isActive }) => `flex items-center justify-center w-12 h-12 rounded-2xl transition-all relative group ${isActive ? 'bg-slate-100 dark:bg-slate-700 text-[#003366] dark:text-white' : 'text-slate-400 hover:text-[#003366] dark:hover:text-white'}`}>
               <Users size={20} />
             </NavLink>
          )}
          {isDev && (
             <NavLink to="/test-cycle" onClick={handleLinkClick} className={({ isActive }) => `flex items-center justify-center w-12 h-12 rounded-2xl transition-all relative group flex-col gap-0.5 ${isActive ? 'bg-amber-100 text-amber-700' : 'text-amber-500 hover:bg-amber-50'}`}>
               <FlaskConical size={18} />
               <span className="text-[8px] font-mono font-bold leading-none">{systemDate.getDate()}</span>
             </NavLink>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-center pb-8">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300 font-bold border-2 border-slate-200 dark:border-slate-600">
            {user?.name ? user.name.charAt(0).toUpperCase() : <UserCircle size={24} />}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
