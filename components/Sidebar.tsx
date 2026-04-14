// ============================================================
// components/Sidebar.tsx — VERSÃO FINAL COMPLETA
// Correcções: botão Sair sem window.confirm, rota /sandbox
// Colar directamente no GitHub: seleccionar tudo e substituir
// ============================================================
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  DollarSign,
  Wallet,
  BarChart3,
  Users,
  Menu,
  X,
  Settings,
  LogOut,
  ChevronRight,
  MonitorPlay,
  CalendarRange,
  FlaskConical,
  History,
  Pin,
  PinOff,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { useLayout } from '../contexts/LayoutContext';
import { useProducts } from '../contexts/ProductContext';
import { hasPermission } from '../src/utils/permissions';
import { formatDateISO, formatDisplayDate } from '../src/utils';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    sidebarMode: mode,
    isPinned,
    toggleSidebar,
    togglePin,
    setSidebarMode,
    triggerHaptic,
  } = useLayout();
  const { systemDate } = useProducts();
  const navigate = useNavigate();

  const navItems = [
    {
      to: '/',
      icon: LayoutDashboard,
      label: 'Página Inicial',
      permission: 'admin_global_admin' as const,
      alwaysShow: true,
    },
    {
      to: '/direct-service',
      icon: MonitorPlay,
      label: 'Atendimento Directo',
      permission: 'direct_service_view' as const,
    },
    {
      to: '/sales',
      icon: ShoppingCart,
      label: 'Controle de Vendas',
      permission: 'sales_view' as const,
    },
    {
      to: '/calendar',
      icon: CalendarRange,
      label: 'Calendário Marguel',
      permission: 'calendar_view' as const,
    },
    {
      to: '/inventory',
      icon: Package,
      label: 'Inventário',
      permission: 'inventory_view' as const,
    },
    {
      to: '/prices',
      icon: DollarSign,
      label: 'Preços & Compras',
      permission: 'prices_view' as const,
    },
    {
      to: '/expenses',
      icon: Wallet,
      label: 'Despesas',
      permission: 'expenses_view' as const,
    },
    {
      to: '/account',
      icon: BarChart3,
      label: 'Estado da Conta',
      permission: 'finance_view' as const,
    },
    {
      to: '/audit',
      icon: History,
      label: 'Auditoria Global',
      permission: 'audit_view' as const,
    },
    {
      to: '/sandbox',
      icon: FlaskConical,
      label: 'Ambiente Sandbox',
      permission: 'admin_global_admin' as const,
    },
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

  // SEM window.confirm — não funciona em PWA/iOS standalone
  const handleLogout = () => {
    triggerHaptic('warning');
    logout();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter((item) => {
    if (!user) return false;
    if (item.alwaysShow) return true;
    return hasPermission(user, item.permission);
  });

  const canViewUsers = hasPermission(user, 'admin_users_view');

  const getInitials = (name?: string) => {
    if (!name) return 'AG';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const dateLabel = formatDisplayDate(formatDateISO(systemDate));

  return (
    <>
      {/* Botão flutuante para abrir sidebar quando fechada */}
      {mode === 'hidden' && (
        <button
          onClick={toggleSidebar}
          className="fixed top-6 left-6 z-[60] p-3 bg-[#003366] text-white rounded-2xl shadow-xl hover:scale-110 transition-all active:scale-95 animate-fade-in border-2 border-white/20 dark:border-slate-700"
          title="Mostrar Menu"
        >
          <Menu size={24} />
        </button>
      )}

      {/* ===== MOBILE: Overlay + Drawer ===== */}
      <div
        className={`fixed inset-0 z-[100] md:hidden transition-opacity duration-300 ${
          mode === 'mini'
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarMode('hidden')}
        />

        {/* Drawer */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-[280px] bg-[#F8FAFC] dark:bg-slate-900 shadow-2xl flex flex-col transition-transform duration-300 ${
            mode === 'mini' ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Header azul */}
          <div className="bg-[#003366] p-6 text-white rounded-br-[32px] shadow-lg relative z-10 shrink-0">
            <div className="flex justify-between items-center mb-6">
              {/* Logo MG */}
              <div
                className="flex flex-col items-center cursor-pointer hover:scale-105 transition-all duration-300"
                onClick={handleAppRefresh}
              >
                <div className="relative flex items-center justify-center">
                  <span
                    className="font-sans font-black text-3xl tracking-tighter text-[#E3007E] relative z-10"
                    style={{
                      filter:
                        'drop-shadow(0 0 12px rgba(227, 0, 126, 0.4))',
                    }}
                  >
                    MG
                  </span>
                  <div className="absolute inset-0 blur-xl bg-[#E3007E]/10 rounded-full animate-pulse" />
                </div>
                <div className="w-10 h-[1px] bg-[#E3007E]/50 mt-0.5" />
                <div className="flex items-center gap-1.5 mt-1 opacity-70">
                  <div className="w-1 h-1 rotate-45 border border-[#E3007E]/60" />
                  <div className="w-5 h-[0.5px] bg-[#E3007E]/30" />
                  <div className="w-1 h-1 rotate-45 border border-[#E3007E]/60" />
                </div>
              </div>
              <button
                onClick={() => setSidebarMode('hidden')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Info utilizador */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#003366] font-bold text-lg shadow-inner shrink-0">
                {getInitials(user?.name)}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-lg leading-tight truncate">
                  {user?.name}
                </p>
                <span className="text-[10px] bg-blue-500/30 px-2 py-0.5 rounded text-blue-100 uppercase font-bold tracking-wide border border-blue-400/30">
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Data do sistema */}
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
              {dateLabel}
            </p>
          </div>

          {/* Nav items */}
          <div className="flex-1 overflow-y-auto custom-scrollbar py-4 px-3 space-y-1">
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleLinkClick}
                className={({ isActive }) => `
                  flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-medium text-sm
                  ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-[#003366] dark:text-white shadow-sm border-l-4 border-[#003366] dark:border-blue-500'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                  }
                `}
              >
                <item.icon size={20} />
                <span className="flex-1">{item.label}</span>
                <ChevronRight size={16} className="opacity-30" />
              </NavLink>
            ))}

            <NavLink
              to="/settings"
              onClick={handleLinkClick}
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-bold text-sm
                ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-[#003366] dark:text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }
              `}
            >
              <Settings size={20} />
              <span className="flex-1">Definições</span>
            </NavLink>
          </div>

          {/* Footer: Utilizadores + Sair */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-1">
            {canViewUsers && (
              <NavLink
                to="/users"
                onClick={handleLinkClick}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm
                  ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-[#003366] dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }
                `}
              >
                <Users size={18} />
                Utilizadores
              </NavLink>
            )}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* ===== DESKTOP: Sidebar lateral ===== */}
      <div
        className={`hidden md:flex flex-col h-full bg-[#F8FAFC] dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${
          mode === 'expanded'
            ? 'w-[260px]'
            : mode === 'mini'
            ? 'w-[260px]'
            : 'w-0 overflow-hidden'
        }`}
      >
        {/* Header azul desktop */}
        <div className="bg-[#003366] p-5 text-white rounded-br-[24px] shadow-lg shrink-0">
          <div className="flex justify-between items-center mb-5">
            <div
              className="flex flex-col items-center cursor-pointer hover:scale-105 transition-all"
              onClick={handleAppRefresh}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className="font-sans font-black text-2xl tracking-tighter text-[#E3007E]"
                  style={{
                    filter:
                      'drop-shadow(0 0 10px rgba(227, 0, 126, 0.4))',
                  }}
                >
                  MG
                </span>
                <div className="absolute inset-0 blur-lg bg-[#E3007E]/10 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={togglePin}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 transition-colors"
                title={isPinned ? 'Desafixar menu' : 'Fixar menu'}
              >
                {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
              <button
                onClick={() => setSidebarMode('hidden')}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#003366] font-bold text-sm shadow-inner shrink-0">
              {getInitials(user?.name)}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm leading-tight truncate">
                {user?.name}
              </p>
              <span className="text-[9px] bg-blue-500/30 px-1.5 py-0.5 rounded text-blue-100 uppercase font-bold tracking-wide">
                {user?.role?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Data */}
        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">
            {dateLabel}
          </p>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-3 px-2 space-y-0.5">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleLinkClick}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-medium text-xs
                ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-[#003366] dark:text-white shadow-sm border-l-4 border-[#003366]'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800'
                }
              `}
            >
              <item.icon size={18} />
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}

          <NavLink
            to="/settings"
            onClick={handleLinkClick}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-medium text-xs
              ${
                isActive
                  ? 'bg-slate-100 dark:bg-slate-800 text-[#003366] dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }
            `}
          >
            <Settings size={18} />
            Definições
          </NavLink>
        </div>

        {/* Footer desktop */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-0.5">
          {canViewUsers && (
            <NavLink
              to="/users"
              onClick={handleLinkClick}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-xs
                ${
                  isActive
                    ? 'bg-slate-100 text-[#003366]'
                    : 'text-slate-500 hover:bg-slate-50'
                }
              `}
            >
              <Users size={16} />
              Utilizadores
            </NavLink>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
