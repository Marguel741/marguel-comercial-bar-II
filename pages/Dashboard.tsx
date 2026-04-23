
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu, Plus, ArrowUpDown, FileText, Calculator, Wallet, CreditCard, Package, TrendingDown, Clock, Box, TrendingUp, ChevronDown, ChevronUp, X, AlertTriangle, CheckCircle, LogOut, Settings, Moon, Sun, Monitor, User as UserIcon, Maximize2, Minimize2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLayout } from '../contexts/LayoutContext';
import { UserRole } from '../types';
import { formatDateISO, formatDisplayDate, generateUUID } from '../src/utils';
import SyncStatus from '../components/SyncStatus';
import Footer from '../components/Footer';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { salesReports, systemDate, products, expenses, getConfirmedSalesReports } = useProducts();
  const { theme, setTheme } = useTheme();
  const { toggleSidebar } = useLayout();
  
  const [expandedAlerts, setExpandedAlerts] = useState<string[]>([]);
  const [customAlerts, setCustomAlerts] = useState<any[]>(() => {
    const saved = localStorage.getItem('mg_custom_alerts');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCreateAlert, setShowCreateAlert] = useState(false);

  // Save customAlerts to localStorage
  React.useEffect(() => {
    localStorage.setItem('mg_custom_alerts', JSON.stringify(customAlerts));
  }, [customAlerts]);

  // Request notification permission on mount
  React.useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('week');
  const [timeOffset, setTimeOffset] = useState(0);
  const [isChartFullScreen, setIsChartFullScreen] = useState(false);
  const [selectedChartDay, setSelectedChartDay] = useState<any>(null);
  const [newAlertTitle, setNewAlertTitle] = useState('');
  const [newAlertMsg, setNewAlertMsg] = useState('');
  const [newAlertType, setNewAlertType] = useState<'CRITICO' | 'SUAVE' | 'INFO' | 'SUCCESS'>('INFO');
  const [expandedNotificationIds, setExpandedNotificationIds] = useState<string[]>([]);

  const isAdmin = user?.role === UserRole.ADMIN_GERAL || user?.role === UserRole.PROPRIETARIO;

  const getInitials = (name?: string) => {
    if (!name) return 'AG';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const yesterdayReport = React.useMemo(() => {
    const yesterday = new Date(systemDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateISO(yesterday);
    return getConfirmedSalesReports().find(r => {
      const rDate = r.dateISO ? r.dateISO.split('T')[0] : r.date;
      return rDate === yesterdayStr;
    });
  }, [getConfirmedSalesReports, systemDate]);

  // ==================== TOTAL VENDIDO ONTEM (corrigido) ====================
  const yesterdayTotal = yesterdayReport 
    ? (yesterdayReport.totalLifted || yesterdayReport.totals?.lifted || 0) 
    : 0;

  const yesterdayCash = yesterdayReport 
    ? (yesterdayReport.cash ?? (yesterdayReport as any).financials?.cash ?? 0)
    : 0;

  const yesterdayTPA = yesterdayReport 
    ? ((yesterdayReport.tpa ?? 0) + (yesterdayReport.transfer ?? 0)) ||
      (((yesterdayReport as any).financials?.ticket ?? 0) + ((yesterdayReport as any).financials?.transfer ?? 0))
    : 0;
  // =====================================================================

  // ==================== CLIQUE NAS INICIAIS ABRE DEFINIÇÕES ====================
  const handleUserClick = () => {
    navigate('/settings'); // ou a rota que usas para Definições
  };
  // =====================================================================

  const topProducts = React.useMemo(() => {
    const productSales: Record<string, number> = {};
    
    getConfirmedSalesReports().forEach(report => {
      const items = report.itemsSummary || (report as any).itemsSnapshot || [];
      items.forEach((item: any) => {
        const qty = item.qty ?? item.soldQty ?? 0;
        if (item.name && qty > 0) {
          productSales[item.name] = (productSales[item.name] || 0) + qty;
        }
      });
    });

    return Object.entries(productSales)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);
  }, [getConfirmedSalesReports]);

  const chartData = useMemo(() => {
    const dataPoints = [];
    const now = new Date(systemDate);
    
    // Apply offset
    if (timeRange === 'week') {
        now.setDate(now.getDate() - (timeOffset * 7));
    } else if (timeRange === 'month') {
        now.setDate(now.getDate() - (timeOffset * 30));
    } else if (timeRange === 'quarter') {
        now.setMonth(now.getMonth() - (timeOffset * 3));
    } else if (timeRange === 'year') {
        now.setFullYear(now.getFullYear() - timeOffset);
    }

    // Helper to parse DD/MM/YYYY
    const parseDateStr = (str: string) => {
        const [d, m, y] = str.split('/').map(Number);
        return { d, m: m - 1, y };
    };

    if (timeRange === 'week') {
        const currentDay = now.getDay();
        const diff = currentDay === 0 ? 6 : currentDay - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - diff);
        const weekDayMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = formatDateISO(d);
            
            const report = getConfirmedSalesReports().find(r => {
              const rDate = (r as any).dateISO ? (r as any).dateISO.split('T')[0] : r.date;
              return rDate === dateStr;
            });
            const dayExpenses = expenses
                .filter(e => e.date === dateStr)
                .reduce((sum, e) => sum + e.amount, 0);

            dataPoints.push({
                name: weekDayMap[d.getDay()],
                fullName: d.toLocaleDateString('pt-AO', { weekday: 'long', day: 'numeric', month: 'long' }),
                date: dateStr,
                sales: report ? (report.totalLifted || report.totals?.lifted || 0) : 0,
                expenses: dayExpenses,
                details: {
                    report,
                    expenseList: expenses.filter(e => e.date === dateStr)
                }
            });
        }
    } else if (timeRange === 'month') {
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = formatDateISO(d);
            
            const report = getConfirmedSalesReports().find(r => {
              const rDate = (r as any).dateISO ? (r as any).dateISO.split('T')[0] : r.date;
              return rDate === dateStr;
            });
            const dayExpenses = expenses
                .filter(e => e.date === dateStr)
                .reduce((sum, e) => sum + e.amount, 0);

            dataPoints.push({
                name: d.getDate().toString(),
                fullName: d.toLocaleDateString('pt-AO', { weekday: 'long', day: 'numeric', month: 'long' }),
                date: dateStr,
                sales: report ? (report.totalLifted || report.totals?.lifted || 0) : 0,
                expenses: dayExpenses,
                details: {
                    report,
                    expenseList: expenses.filter(e => e.date === dateStr)
                }
            });
        }
    } else {
        const monthsCount = timeRange === 'quarter' ? 3 : 12;
        for (let i = monthsCount - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setMonth(d.getMonth() - i);
            const month = d.getMonth();
            const year = d.getFullYear();
            
            const monthSales = getConfirmedSalesReports().reduce((acc, r) => {
                const pd = parseDateStr(r.date || r.displayDate || '');
                return (pd.m === month && pd.y === year) ? acc + (r.totalLifted || r.totals?.lifted || 0) : acc;
            }, 0);

            const monthExpenses = expenses.reduce((acc, e) => {
                const pd = parseDateStr(e.date);
                return (pd.m === month && pd.y === year) ? acc + e.amount : acc;
            }, 0);

            dataPoints.push({
                name: d.toLocaleDateString('pt-AO', { month: 'short' }).replace('.', ''),
                fullName: d.toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' }),
                sales: monthSales,
                expenses: monthExpenses,
                details: null
            });
        }
    }
    return dataPoints;
  }, [getConfirmedSalesReports, expenses, systemDate, timeRange]);

  const alerts = useMemo(() => {
    const list: any[] = [];

    // Stock Alerts
    const criticalStock = products.filter(p => p.stock <= 0);
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.minStock);

    if (criticalStock.length > 0) {
        list.push({
            id: 'critical-stock',
            type: 'CRITICO',
            title: 'Stock Crítico / Esgotado',
            message: `${criticalStock.length} produtos sem stock.`,
            details: criticalStock.map(p => `${p.name} (0)`),
            icon: Package,
            color: 'red'
        });
    }

    if (lowStock.length > 0) {
        list.push({
            id: 'low-stock',
            type: 'SUAVE',
            title: 'Stock Baixo',
            message: `${lowStock.length} produtos quase acabando.`,
            details: lowStock.map(p => `${p.name} (${p.stock})`),
            icon: Package,
            color: 'amber'
        });
    }

    // Financial Alerts
    const recentDiscrepancy = getConfirmedSalesReports().find(r => (r.discrepancy || r.totals?.discrepancy || 0) !== 0);
    if (recentDiscrepancy) {
         const discrepancyVal = recentDiscrepancy.discrepancy || recentDiscrepancy.totals?.discrepancy || 0;
         list.push({
            id: `disc-${recentDiscrepancy.id}`,
            type: 'CRITICO',
            title: 'Divergência Financeira',
            message: `Divergência de ${(discrepancyVal || 0).toLocaleString('pt-AO')} Kz em ${recentDiscrepancy.date || recentDiscrepancy.displayDate}`,
            icon: TrendingDown,
            color: 'red'
        });
    }

    // Closing Alert
    const todayStr = formatDateISO(systemDate);
    const hasReportToday = getConfirmedSalesReports().some(r => (r.date || r.displayDate) === todayStr);
    if (!hasReportToday) {
         list.push({
            id: 'no-close',
            type: 'CRITICO',
            title: 'Fecho Pendente',
            message: 'Fecho de caixa ainda não realizado hoje.',
            icon: Clock,
            color: 'red'
        });
    }

    // Custom Alerts
    list.push(...customAlerts);

    // Deduplicate by ID to prevent React key errors
    const uniqueList: any[] = [];
    const seenIds = new Set();
    
    list.forEach(item => {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueList.push(item);
      }
    });

    return uniqueList;
  }, [products, getConfirmedSalesReports, systemDate, customAlerts]);

  // Track alerts that have already been notified in this session
  const notifiedAlertsRef = React.useRef<Set<string>>(new Set());
  const isInitialMount = React.useRef(true);

  // Notify new alerts
  React.useEffect(() => {
    if (!("Notification" in window)) return;

    // On initial mount, we just populate the ref with existing alerts to avoid spamming
    if (isInitialMount.current) {
      alerts.forEach(alert => notifiedAlertsRef.current.add(alert.id));
      isInitialMount.current = false;
      return;
    }

    if (Notification.permission === "granted") {
      alerts.forEach(alert => {
        if (!notifiedAlertsRef.current.has(alert.id)) {
          try {
            new Notification("Alerta Marguel", {
              body: alert.message || (Array.isArray(alert.details) ? alert.details.join(', ') : alert.details),
              icon: "/logo-marguel.png",
              tag: "marguel-alert-" + alert.id
            });
            notifiedAlertsRef.current.add(alert.id);
          } catch (err) {
            console.error("Erro ao disparar notificação:", err);
          }
        }
      });
    }

    // Sync notifiedAlertsRef with current alerts: remove IDs that are no longer active
    // This allows re-notifying if an alert is resolved and then recurs later.
    const currentIds = new Set(alerts.map(a => a.id));
    notifiedAlertsRef.current.forEach(id => {
      if (!currentIds.has(id)) {
        notifiedAlertsRef.current.delete(id);
      }
    });
  }, [alerts]);

  const toggleNotificationExpand = (id: string) => {
    setExpandedNotificationIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAlertExpand = (id: string) => {
    setExpandedAlerts(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleCreateAlert = () => {
    if (!newAlertTitle || !newAlertMsg) return;
    const newAlert = {
    id: generateUUID(),
    type: newAlertType,
    title: newAlertTitle,
    message: newAlertMsg,
    isCustom: true,
    icon: newAlertType === 'CRITICO' ? 'AlertTriangle' : newAlertType === 'SUCCESS' ? 'CheckCircle' : 'FileText',
    color: newAlertType === 'CRITICO' ? 'red' : newAlertType === 'SUAVE' ? 'amber' : newAlertType === 'SUCCESS' ? 'green' : 'blue'
};
    setCustomAlerts(prev => [newAlert, ...prev]);
    setShowCreateAlert(false);
    setNewAlertTitle('');
    setNewAlertMsg('');
  };

  // Resolver ícone guardado como string ou como componente React
  const getIconComponent = (icon: any) => {
    if (typeof icon === 'function') return icon;
    const iconMap: Record<string, any> = {
      'AlertTriangle': AlertTriangle,
      'CheckCircle': CheckCircle,
      'FileText': FileText,
      'Package': Package,
      'TrendingDown': TrendingDown,
      'Clock': Clock,
    };
    return iconMap[icon] || AlertTriangle;
  };
  
  const removeCustomAlert = (id: string) => {
    setCustomAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-6 bg-white dark:bg-[#0a192f] sticky top-0 z-50 shadow-sm md:shadow-none md:relative">
        <div className="flex items-center gap-4">
            <button 
                onClick={toggleSidebar}
                className="p-2 bg-[#003366] rounded-xl text-white hover:bg-[#004080] transition-colors active:scale-95"
            >
                <Menu size={24} />
            </button>
            <div>
                <h1 className="text-lg font-bold text-slate-800 dark:text-white">Página Inicial</h1>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <SyncStatus />
            
            {/* Botão de Tema (Sol/Lua) */}
            <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Trocar Tema"
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="relative">
                <button 
                    className={`relative ${showNotifications ? 'z-50' : ''}`}
                    onClick={() => {
                        setShowNotifications(!showNotifications);
                        setShowUserMenu(false);
                    }}
                >
                    <Bell size={24} className="text-slate-600 dark:text-slate-300" />
                    {alerts.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center border-2 border-white dark:border-[#0a192f]">
                            {alerts.length}
                        </span>
                    )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                    <>
                        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm" onClick={() => setShowNotifications(false)}></div>
                        <div className="fixed left-4 right-4 top-20 md:absolute md:top-full md:left-auto md:right-0 md:mt-3 md:w-80 bg-white dark:bg-[#0a192f] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-4 z-[70] animate-fade-in origin-top-right">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-slate-800 dark:text-white">Notificações</h4>
                                <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full dark:text-white"><X size={16} /></button>
                            </div>
                            <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 p-1">
                                {alerts.length === 0 ? (
                                    <p className="text-slate-400 text-xs italic text-center py-4">Nenhuma notificação.</p>
                                ) : (
                                    alerts.map(alert => {
                                        const isExpanded = expandedNotificationIds.includes(alert.id);
                                        return (
                                            <div key={alert.id} className={`p-3 rounded-xl border transition-all ${
                                                alert.color === 'red' ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30' :
                                                alert.color === 'amber' ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/30' :
                                                alert.color === 'green' ? 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-900/30' :
                                                'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30'
                                            }`}>
                                                <div className="flex gap-3">
                                                    <div className={`mt-1 min-w-[24px] h-6 rounded-full flex items-center justify-center ${
                                                        alert.color === 'red' ? 'bg-red-100 text-red-500 dark:bg-red-900/50 dark:text-red-400' :
                                                        alert.color === 'amber' ? 'bg-amber-100 text-amber-500 dark:bg-amber-900/50 dark:text-amber-400' :
                                                        alert.color === 'green' ? 'bg-green-100 text-green-500 dark:bg-green-900/50 dark:text-green-400' :
                                                        'bg-blue-100 text-blue-500 dark:bg-blue-900/50 dark:text-blue-400'
                                                    }`}>
                                                        {React.createElement(getIconComponent(alert.icon), { size: 12 })}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h5 className="font-bold text-xs text-slate-800 dark:text-white">{alert.title}</h5>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{alert.message}</p>
                                                    </div>
                                                    {alert.details && (
                                                        <button onClick={(e) => { e.stopPropagation(); toggleNotificationExpand(alert.id); }} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full h-fit">
                                                            {isExpanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                                                        </button>
                                                    )}
                                                </div>
                                                {isExpanded && alert.details && (
                                                    <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/10 text-[10px] space-y-1">
                                                        {alert.details.map((detail: string, idx: number) => (
                                                            <div key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                                <div className="w-1 h-1 rounded-full bg-current opacity-50"></div>
                                                                {detail}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="relative">
                <button 
                    onClick={handleUserClick}
                    className={`w-10 h-10 bg-[#003366] rounded-full flex items-center justify-center text-white font-bold text-sm hover:ring-4 ring-blue-100 transition-all relative`}
                >
                    {getInitials(user?.name)}
                </button>
            </div>
        </div>
      </header>

      <div className="px-6 pt-6">
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Bem-vindo de volta,</p>
        <h2 className="text-3xl font-bold text-[#0f172a] dark:text-white mb-6">{user?.name || 'Admin'}</h2>

        {/* Main Card – Total Levantado Ontem */}
        <div className="bg-[#003366] rounded-[2rem] p-6 text-white shadow-xl mb-8 relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-blue-200 text-sm mb-1">Total Levantado Ontem</p>
                <h3 className="text-4xl font-bold mb-2">
                    {yesterdayTotal.toLocaleString('pt-AO')} Kz
                </h3>
                <p className="text-blue-200 text-sm">
                    Cash: {yesterdayCash.toLocaleString('pt-AO')} Kz • TPA: {yesterdayTPA.toLocaleString('pt-AO')} Kz
                </p>
            </div>
            {/* Abstract Background Shapes */}
            <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -left-10 -top-20 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl"></div>
        </div>

        {/* Quick Actions */}
        <div className="flex justify-between gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex flex-col items-center gap-2 min-w-[70px]">
                <button onClick={() => navigate('/direct-service')} className="w-14 h-14 bg-[#003366] rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-900/20 active:scale-95 transition-transform">
                    <Plus size={24} />
                </button>
                <span className="text-xs font-medium text-slate-600">Nova Venda</span>
            </div>
            <div className="flex flex-col items-center gap-2 min-w-[70px]">
                <button onClick={() => navigate('/expenses')} className="w-14 h-14 bg-[#4F46E5] rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform">
                    <ArrowUpDown size={24} />
                </button>
                <span className="text-xs font-medium text-slate-600">Despesa</span>
            </div>
            <div className="flex flex-col items-center gap-2 min-w-[70px]">
                <button onClick={() => navigate('/calendar')} className="w-14 h-14 bg-[#10B981] rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform">
                    <FileText size={24} />
                </button>
                <span className="text-xs font-medium text-slate-600">Relatório</span>
            </div>
            <div className="flex flex-col items-center gap-2 min-w-[70px]">
                <button onClick={() => navigate('/prices')} className="w-14 h-14 bg-[#F59E0B] rounded-full flex items-center justify-center text-white shadow-lg shadow-amber-500/20 active:scale-95 transition-transform">
                    <Calculator size={24} />
                </button>
                <span className="text-xs font-medium text-slate-600">Simular</span>
            </div>
        </div>

        {/* Chart Section */}
        <div className={`bg-white dark:bg-[#0a192f] rounded-[2rem] p-6 shadow-sm mb-8 transition-all duration-300 ${isChartFullScreen ? 'fixed inset-0 z-50 m-0 rounded-none overflow-y-auto' : ''}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-[#003366] dark:text-blue-400">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Análise de Desempenho</h3>
                        <p className="text-slate-400 text-xs">Fluxo de Vendas vs Despesas</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mr-2">
                        <button 
                            onClick={() => setTimeOffset(prev => prev + 1)}
                            className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 transition-all"
                            title="Anterior"
                        >
                            <ChevronDown size={16} className="rotate-90" />
                        </button>
                        <button 
                            onClick={() => setTimeOffset(0)}
                            className="px-2 text-[10px] font-bold text-slate-500 hover:text-[#003366] dark:hover:text-blue-400"
                        >
                            HOJE
                        </button>
                        <button 
                            onClick={() => setTimeOffset(prev => Math.max(0, prev - 1))}
                            className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 transition-all disabled:opacity-30"
                            disabled={timeOffset === 0}
                            title="Próximo"
                        >
                            <ChevronDown size={16} className="-rotate-90" />
                        </button>
                    </div>
                    <button 
                        onClick={() => setIsChartFullScreen(!isChartFullScreen)}
                        className="p-2 hover:bg-slate-50 rounded-full text-slate-500"
                    >
                        {isChartFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
                <button 
                    onClick={() => { setTimeRange('week'); setTimeOffset(0); }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${timeRange === 'week' ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    Semana
                </button>
                <button 
                    onClick={() => { setTimeRange('month'); setTimeOffset(0); }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${timeRange === 'month' ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    Mês
                </button>
                <button 
                    onClick={() => { setTimeRange('quarter'); setTimeOffset(0); }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${timeRange === 'quarter' ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    Trim.
                </button>
                <button 
                    onClick={() => { setTimeRange('year'); setTimeOffset(0); }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${timeRange === 'year' ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    Ano
                </button>
            </div>

            <div className={`${isChartFullScreen ? 'h-[60vh]' : 'h-64'} w-full transition-all duration-300`}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                        data={chartData} 
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        onClick={(data) => {
                            if (data && data.activePayload && data.activePayload[0]) {
                                setSelectedChartDay(data.activePayload[0].payload);
                            }
                        }}
                    >
                        <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#003366" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#003366" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 12 }} 
                            dy={10}
                            interval={0} // Force show all labels
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 12 }} 
                            tickFormatter={(value) => `${(value/1000).toFixed(0)}k`}
                            width={40}
                        />
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number, name: string) => [`${(value || 0).toLocaleString('pt-AO')} Kz`, name]}
                            labelFormatter={(label, payload) => {
                                if (payload && payload[0]) {
                                    return payload[0].payload.fullName || label;
                                }
                                return label;
                            }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="sales" 
                            name="Vendas"
                            stroke="#003366" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorSales)" 
                            activeDot={{ r: 6, onClick: (_, event) => event.stopPropagation() }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="expenses" 
                            name="Despesas"
                            stroke="#EF4444" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorExpenses)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Detailed Day View */}
            {selectedChartDay && isChartFullScreen && (
                <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl animate-fade-in">
                    <div className="flex justify-between items-start mb-4">
                        <h4 className="text-xl font-bold text-[#003366] dark:text-blue-400 capitalize">{selectedChartDay.fullName}</h4>
                        <button onClick={() => setSelectedChartDay(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={20}/></button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-[#0a192f] p-4 rounded-xl shadow-sm">
                            <h5 className="font-bold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2"><TrendingUp size={16}/> Vendas</h5>
                            <p className="text-2xl font-black text-[#003366] dark:text-blue-400 mb-2">{(selectedChartDay.sales || 0).toLocaleString('pt-AO')} Kz</p>
                            {selectedChartDay.details?.report ? (
                                <div className="text-sm space-y-1 text-slate-500 dark:text-slate-400">
                                    <p>Cash: <span className="font-medium">{(selectedChartDay.details.report.cash || selectedChartDay.details.report.financials?.cash || 0).toLocaleString('pt-AO')} Kz</span></p>
                                    <p>TPA: <span className="font-medium">{((selectedChartDay.details.report.tpa || 0) + (selectedChartDay.details.report.transfer || 0) || (selectedChartDay.details.report.financials ? (selectedChartDay.details.report.financials.ticket || 0) + (selectedChartDay.details.report.financials.transfer || 0) : 0)).toLocaleString('pt-AO')} Kz</span></p>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">Sem fecho registrado.</p>
                            )}
                        </div>

                        <div className="bg-white dark:bg-[#0a192f] p-4 rounded-xl shadow-sm">
                            <h5 className="font-bold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2"><TrendingDown size={16}/> Despesas</h5>
                            <p className="text-2xl font-black text-red-500 mb-2">{(selectedChartDay.expenses || 0).toLocaleString('pt-AO')} Kz</p>
                            {selectedChartDay.details?.expenseList?.length > 0 ? (
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                    {selectedChartDay.details.expenseList.map((e: any) => (
                                        <div key={e.id} className="text-sm flex justify-between border-b border-slate-50 pb-1">
                                            <span className="text-slate-600">{e.title}</span>
                                            <span className="font-bold text-red-500">{(e.amount || 0).toLocaleString('pt-AO')} Kz</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">Nenhuma despesa.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Payment Methods */}
        <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white dark:bg-[#0a192f] p-5 rounded-[2rem] shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-green-500 rounded-r-full"></div>
                <div className="flex justify-between items-start mb-2 pl-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CASH</span>
                    <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400">
                        <Wallet size={14} />
                    </div>
                </div>
                <h4 className="text-lg font-bold text-slate-800 dark:text-white pl-2">
                    {yesterdayReport ? `${(yesterdayReport.cash ?? (yesterdayReport as any).financials?.cash ?? 0).toLocaleString('pt-AO')} Kz` : '0 Kz'}
                </h4>
            </div>
            <div className="bg-white dark:bg-[#0a192f] p-5 rounded-[2rem] shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-fuchsia-500 rounded-r-full"></div>
                <div className="flex justify-between items-start mb-2 pl-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TPA</span>
                    <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400">
                        <CreditCard size={14} />
                    </div>
                </div>
                <h4 className="text-lg font-bold text-slate-800 dark:text-white pl-2">
                    {yesterdayReport ? `${(((yesterdayReport.tpa ?? 0) + (yesterdayReport.transfer ?? 0)) || (((yesterdayReport as any).financials?.ticket ?? 0) + ((yesterdayReport as any).financials?.transfer ?? 0))).toLocaleString('pt-AO')} Kz` : '0 Kz'}
                </h4>
            </div>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-[#0a192f] rounded-[2rem] p-6 shadow-sm mb-8">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6">Top Produtos</h3>
            <div className="space-y-6">
                {topProducts.length > 0 ? (
                    topProducts.map((product, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-[#003366] dark:text-blue-400">
                                    <Box size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white">{product.name}</h4>
                                    <p className="text-xs text-slate-400">{product.qty} vendas</p>
                                </div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-red-100"></div>
                        </div>
                    ))
                ) : (
                    <p className="text-slate-400 text-sm italic">Nenhuma venda registrada ainda.</p>
                )}
            </div>
        </div>

        {/* Active Alerts */}
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Alertas Ativos</h3>
                {isAdmin && (
                    <button onClick={() => setShowCreateAlert(true)} className="text-sm text-[#003366] dark:text-blue-400 font-bold flex items-center gap-1">
                        <Plus size={16} /> Criar
                    </button>
                )}
            </div>

            {showCreateAlert && (
                <div className="mb-4 p-4 bg-white dark:bg-[#0a192f] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between mb-2">
                        <h4 className="font-bold text-sm dark:text-white">Novo Alerta</h4>
                        <button onClick={() => setShowCreateAlert(false)} className="dark:text-white"><X size={16}/></button>
                    </div>
                    <input 
                        className="w-full mb-2 p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" 
                        placeholder="Título" 
                        value={newAlertTitle}
                        onChange={e => setNewAlertTitle(e.target.value)}
                    />
                    <input 
                        className="w-full mb-2 p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" 
                        placeholder="Mensagem" 
                        value={newAlertMsg}
                        onChange={e => setNewAlertMsg(e.target.value)}
                    />
                    <div className="flex gap-2 mb-2">
                        {['CRITICO', 'SUAVE', 'INFO', 'SUCCESS'].map(type => (
                            <button 
                                key={type}
                                onClick={() => setNewAlertType(type as any)}
                                className={`px-3 py-1 rounded-full text-xs font-bold ${newAlertType === type ? 'bg-slate-800 text-white dark:bg-blue-600' : 'bg-slate-100 dark:bg-slate-700 dark:text-slate-300'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                    <button onClick={handleCreateAlert} className="w-full py-2 bg-[#003366] text-white rounded-lg text-sm font-bold">Adicionar</button>
                </div>
            )}

            <div className="space-y-3">
                {alerts.length === 0 && <p className="text-slate-400 italic text-sm">Nenhum alerta ativo.</p>}
                {alerts.map((alert) => {
                    const isExpanded = expandedAlerts.includes(alert.id);
                    const colorClasses = {
                        red: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30',
                        amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30',
                        blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30',
                        green: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30'
                    }[alert.color as string] || 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

                    const iconBg = {
                        red: 'bg-red-100 text-red-500 dark:bg-red-900/50 dark:text-red-400',
                        amber: 'bg-amber-100 text-amber-500 dark:bg-amber-900/50 dark:text-amber-400',
                        blue: 'bg-blue-100 text-blue-500 dark:bg-blue-900/50 dark:text-blue-400',
                        green: 'bg-green-100 text-green-500 dark:bg-green-900/50 dark:text-green-400'
                    }[alert.color as string] || 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';

                    return (
                        <div key={alert.id} className={`${colorClasses} p-4 rounded-[1.5rem] border transition-all`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
                                  {React.createElement(getIconComponent(alert.icon), { size: 18 })}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm">{alert.title}</h4>
                                    <p className="text-xs opacity-80">{alert.message}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {alert.isCustom && isAdmin && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeCustomAlert(alert.id);
                                            }} 
                                            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-current opacity-60 hover:opacity-100"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                    {alert.details && (
                                        <button onClick={() => toggleAlertExpand(alert.id)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full">
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                            {isExpanded && alert.details && (
                                <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10 text-xs space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                    {alert.details.map((detail: string, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-current opacity-50"></div>
                                            {detail}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default Dashboard;
