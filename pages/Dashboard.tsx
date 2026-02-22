
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu, Plus, ArrowUpDown, FileText, Calculator, Wallet, CreditCard, Package, TrendingDown, Clock, Box, TrendingUp, ChevronDown, ChevronUp, X, AlertTriangle, CheckCircle, LogOut, Settings, Moon, Sun, Monitor, User as UserIcon, Maximize2, Minimize2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../App';
import { useProducts } from '../contexts/ProductContext';
import { useTheme } from '../contexts/ThemeContext';
import { UserRole } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, switchUser } = useAuth();
  const { salesReports, systemDate, products, expenses } = useProducts();
  const { theme, setTheme } = useTheme();
  
  const [expandedAlerts, setExpandedAlerts] = useState<string[]>([]);
  const [customAlerts, setCustomAlerts] = useState<any[]>([]);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('week');
  const [isChartFullScreen, setIsChartFullScreen] = useState(false);
  const [selectedChartDay, setSelectedChartDay] = useState<any>(null);
  const [newAlertTitle, setNewAlertTitle] = useState('');
  const [newAlertMsg, setNewAlertMsg] = useState('');
  const [newAlertType, setNewAlertType] = useState<'CRITICO' | 'SUAVE' | 'INFO' | 'SUCCESS'>('INFO');

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
    const yesterdayStr = yesterday.toLocaleDateString('pt-AO');
    return salesReports.find(r => r.date === yesterdayStr);
  }, [salesReports, systemDate]);

  const topProducts = React.useMemo(() => {
    const productSales: Record<string, number> = {};
    
    salesReports.forEach(report => {
      report.itemsSummary.forEach(item => {
        productSales[item.name] = (productSales[item.name] || 0) + item.qty;
      });
    });

    return Object.entries(productSales)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);
  }, [salesReports]);

  const chartData = useMemo(() => {
    const dataPoints = [];
    const now = new Date(systemDate);
    
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
            const dateStr = d.toLocaleDateString('pt-AO');
            
            const report = salesReports.find(r => r.date === dateStr);
            const dayExpenses = expenses
                .filter(e => e.date === dateStr)
                .reduce((sum, e) => sum + e.amount, 0);

            dataPoints.push({
                name: weekDayMap[d.getDay()],
                fullName: d.toLocaleDateString('pt-AO', { weekday: 'long', day: 'numeric', month: 'long' }),
                date: dateStr,
                sales: report ? report.totalLifted : 0,
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
            const dateStr = d.toLocaleDateString('pt-AO');
            
            const report = salesReports.find(r => r.date === dateStr);
            const dayExpenses = expenses
                .filter(e => e.date === dateStr)
                .reduce((sum, e) => sum + e.amount, 0);

            dataPoints.push({
                name: d.getDate().toString(),
                fullName: d.toLocaleDateString('pt-AO', { weekday: 'long', day: 'numeric', month: 'long' }),
                date: dateStr,
                sales: report ? report.totalLifted : 0,
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
            
            const monthSales = salesReports.reduce((acc, r) => {
                const pd = parseDateStr(r.date);
                return (pd.m === month && pd.y === year) ? acc + r.totalLifted : acc;
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
  }, [salesReports, expenses, systemDate, timeRange]);

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
    const recentDiscrepancy = salesReports.find(r => r.discrepancy !== 0);
    if (recentDiscrepancy) {
         list.push({
            id: `disc-${recentDiscrepancy.id}`,
            type: 'CRITICO',
            title: 'Divergência Financeira',
            message: `Divergência de ${recentDiscrepancy.discrepancy.toLocaleString()} Kz em ${recentDiscrepancy.date}`,
            icon: TrendingDown,
            color: 'red'
        });
    }

    // Closing Alert
    const todayStr = systemDate.toLocaleDateString('pt-AO');
    const hasReportToday = salesReports.some(r => r.date === todayStr);
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

    return list;
  }, [products, salesReports, systemDate, customAlerts]);

  const toggleAlertExpand = (id: string) => {
    setExpandedAlerts(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleCreateAlert = () => {
    if (!newAlertTitle || !newAlertMsg) return;
    const newAlert = {
        id: Date.now().toString(),
        type: newAlertType,
        title: newAlertTitle,
        message: newAlertMsg,
        icon: newAlertType === 'CRITICO' ? AlertTriangle : newAlertType === 'SUCCESS' ? CheckCircle : FileText,
        color: newAlertType === 'CRITICO' ? 'red' : newAlertType === 'SUAVE' ? 'amber' : newAlertType === 'SUCCESS' ? 'green' : 'blue'
    };
    setCustomAlerts(prev => [newAlert, ...prev]);
    setShowCreateAlert(false);
    setNewAlertTitle('');
    setNewAlertMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-6 bg-white sticky top-0 z-10 shadow-sm md:shadow-none md:static">
        <div className="flex items-center gap-4">
            <button className="p-2 bg-[#003366] rounded-xl text-white">
                <Menu size={24} />
            </button>
            <div>
                <h1 className="text-lg font-bold text-slate-800">Dashboard</h1>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="relative">
                <button 
                    className="relative"
                    onClick={() => setShowNotifications(!showNotifications)}
                >
                    <Bell size={24} className="text-slate-600" />
                    {alerts.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center border-2 border-white">
                            {alerts.length}
                        </span>
                    )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-slate-800">Notificações</h4>
                            <button onClick={() => setShowNotifications(false)}><X size={16} /></button>
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2">
                            {alerts.length === 0 ? (
                                <p className="text-slate-400 text-xs italic text-center py-4">Nenhuma notificação.</p>
                            ) : (
                                alerts.map(alert => (
                                    <div key={alert.id} className={`p-3 rounded-xl border ${
                                        alert.color === 'red' ? 'bg-red-50 border-red-100' :
                                        alert.color === 'amber' ? 'bg-amber-50 border-amber-100' :
                                        alert.color === 'green' ? 'bg-green-50 border-green-100' :
                                        'bg-blue-50 border-blue-100'
                                    }`}>
                                        <div className="flex gap-3">
                                            <div className={`mt-1 min-w-[24px] h-6 rounded-full flex items-center justify-center ${
                                                alert.color === 'red' ? 'bg-red-100 text-red-500' :
                                                alert.color === 'amber' ? 'bg-amber-100 text-amber-500' :
                                                alert.color === 'green' ? 'bg-green-100 text-green-500' :
                                                'bg-blue-100 text-blue-500'
                                            }`}>
                                                <alert.icon size={12} />
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-xs text-slate-800">{alert.title}</h5>
                                                <p className="text-[10px] text-slate-500 leading-tight">{alert.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="relative">
                <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-10 h-10 bg-[#003366] rounded-full flex items-center justify-center text-white font-bold text-sm hover:ring-4 ring-blue-100 transition-all"
                >
                    {getInitials(user?.name)}
                </button>

                {/* User Menu Dropdown */}
                {showUserMenu && (
                    <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50">
                        <div className="p-3 border-b border-slate-100 mb-2">
                            <p className="font-bold text-slate-800">{user?.name}</p>
                            <p className="text-xs text-slate-500">{user?.role}</p>
                        </div>
                        
                        <div className="space-y-1">
                            <button className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl text-sm text-slate-600">
                                <Settings size={16} /> Configurações
                            </button>
                            
                            <div className="p-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Tema</p>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button 
                                        onClick={() => setTheme('light')}
                                        className={`flex-1 flex justify-center p-1 rounded-md transition-all ${theme === 'light' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                                    >
                                        <Sun size={14} />
                                    </button>
                                    <button 
                                        onClick={() => setTheme('dark')}
                                        className={`flex-1 flex justify-center p-1 rounded-md transition-all ${theme === 'dark' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                                    >
                                        <Moon size={14} />
                                    </button>
                                    <button 
                                        onClick={() => setTheme('system')}
                                        className={`flex-1 flex justify-center p-1 rounded-md transition-all ${theme === 'system' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                                    >
                                        <Monitor size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-2 border-t border-slate-100 mt-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Mudar Usuário (Teste)</p>
                                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                    {Object.values(UserRole).map(role => (
                                        <button 
                                            key={role}
                                            onClick={() => switchUser(role)}
                                            className={`w-full text-left text-xs p-1.5 rounded-lg hover:bg-slate-50 ${user?.role === role ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600'}`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={logout}
                                className="w-full flex items-center gap-3 p-2 hover:bg-red-50 text-red-600 rounded-xl text-sm mt-2"
                            >
                                <LogOut size={16} /> Sair
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </header>

      <div className="px-6 pt-6">
        <p className="text-slate-500 text-sm mb-1">Bem-vindo de volta,</p>
        <h2 className="text-3xl font-bold text-[#0f172a] mb-6">{user?.name || 'Admin'}</h2>

        {/* Main Card */}
        <div className="bg-[#003366] rounded-[2rem] p-6 text-white shadow-xl mb-8 relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-blue-200 text-sm mb-1">Total Vendido Ontem</p>
                <h3 className="text-4xl font-bold mb-2">
                    {yesterdayReport ? `${yesterdayReport.totalLifted.toLocaleString('pt-AO')} Kz` : '0 Kz'}
                </h3>
                <p className="text-blue-200 text-sm">
                    {yesterdayReport ? 'Valor confirmado' : 'Aguardando fecho'}
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
        <div className={`bg-white rounded-[2rem] p-6 shadow-sm mb-8 transition-all duration-300 ${isChartFullScreen ? 'fixed inset-0 z-50 m-0 rounded-none overflow-y-auto' : ''}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-[#003366]">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Análise de Desempenho</h3>
                        <p className="text-slate-400 text-xs">Fluxo de Vendas vs Despesas</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsChartFullScreen(!isChartFullScreen)}
                    className="p-2 hover:bg-slate-50 rounded-full text-slate-500"
                >
                    {isChartFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
                <button 
                    onClick={() => setTimeRange('week')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${timeRange === 'week' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    Semana
                </button>
                <button 
                    onClick={() => setTimeRange('month')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${timeRange === 'month' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    Mês
                </button>
                <button 
                    onClick={() => setTimeRange('quarter')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${timeRange === 'quarter' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    Trim.
                </button>
                <button 
                    onClick={() => setTimeRange('year')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${timeRange === 'year' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50'}`}
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
                            formatter={(value: number, name: string) => [`${value.toLocaleString()} Kz`, name]}
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
                <div className="mt-8 p-6 bg-slate-50 rounded-2xl animate-fade-in">
                    <div className="flex justify-between items-start mb-4">
                        <h4 className="text-xl font-bold text-[#003366] capitalize">{selectedChartDay.fullName}</h4>
                        <button onClick={() => setSelectedChartDay(null)} className="p-1 hover:bg-slate-200 rounded-full"><X size={20}/></button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <h5 className="font-bold text-slate-600 mb-3 flex items-center gap-2"><TrendingUp size={16}/> Vendas</h5>
                            <p className="text-2xl font-black text-[#003366] mb-2">{selectedChartDay.sales.toLocaleString()} Kz</p>
                            {selectedChartDay.details?.report ? (
                                <div className="text-sm space-y-1 text-slate-500">
                                    <p>Cash: <span className="font-medium">{selectedChartDay.details.report.cash.toLocaleString()} Kz</span></p>
                                    <p>TPA: <span className="font-medium">{selectedChartDay.details.report.tpa.toLocaleString()} Kz</span></p>
                                    <p>Transferência: <span className="font-medium">{selectedChartDay.details.report.transfer.toLocaleString()} Kz</span></p>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">Sem fecho registrado.</p>
                            )}
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <h5 className="font-bold text-slate-600 mb-3 flex items-center gap-2"><TrendingDown size={16}/> Despesas</h5>
                            <p className="text-2xl font-black text-red-500 mb-2">{selectedChartDay.expenses.toLocaleString()} Kz</p>
                            {selectedChartDay.details?.expenseList?.length > 0 ? (
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                    {selectedChartDay.details.expenseList.map((e: any) => (
                                        <div key={e.id} className="text-sm flex justify-between border-b border-slate-50 pb-1">
                                            <span className="text-slate-600">{e.title}</span>
                                            <span className="font-bold text-red-500">{e.amount.toLocaleString()} Kz</span>
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
            <div className="bg-white p-5 rounded-[2rem] shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-green-500 rounded-r-full"></div>
                <div className="flex justify-between items-start mb-2 pl-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CASH</span>
                    <div className="p-1.5 bg-slate-50 rounded-full text-slate-400">
                        <Wallet size={14} />
                    </div>
                </div>
                <h4 className="text-lg font-bold text-slate-800 pl-2">
                    {yesterdayReport ? `${yesterdayReport.cash.toLocaleString('pt-AO')} Kz` : '0 Kz'}
                </h4>
            </div>
            <div className="bg-white p-5 rounded-[2rem] shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-fuchsia-500 rounded-r-full"></div>
                <div className="flex justify-between items-start mb-2 pl-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TPA</span>
                    <div className="p-1.5 bg-slate-50 rounded-full text-slate-400">
                        <CreditCard size={14} />
                    </div>
                </div>
                <h4 className="text-lg font-bold text-slate-800 pl-2">
                    {yesterdayReport ? `${yesterdayReport.tpa.toLocaleString('pt-AO')} Kz` : '0 Kz'}
                </h4>
            </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm mb-8">
            <h3 className="font-bold text-lg text-slate-800 mb-6">Top Produtos</h3>
            <div className="space-y-6">
                {topProducts.length > 0 ? (
                    topProducts.map((product, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#003366]">
                                    <Box size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">{product.name}</h4>
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
                <h3 className="font-bold text-lg text-slate-800">Alertas Ativos</h3>
                {isAdmin && (
                    <button onClick={() => setShowCreateAlert(true)} className="text-sm text-[#003366] font-bold flex items-center gap-1">
                        <Plus size={16} /> Criar
                    </button>
                )}
            </div>

            {showCreateAlert && (
                <div className="mb-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between mb-2">
                        <h4 className="font-bold text-sm">Novo Alerta</h4>
                        <button onClick={() => setShowCreateAlert(false)}><X size={16}/></button>
                    </div>
                    <input 
                        className="w-full mb-2 p-2 text-sm border rounded-lg" 
                        placeholder="Título" 
                        value={newAlertTitle}
                        onChange={e => setNewAlertTitle(e.target.value)}
                    />
                    <input 
                        className="w-full mb-2 p-2 text-sm border rounded-lg" 
                        placeholder="Mensagem" 
                        value={newAlertMsg}
                        onChange={e => setNewAlertMsg(e.target.value)}
                    />
                    <div className="flex gap-2 mb-2">
                        {['CRITICO', 'SUAVE', 'INFO', 'SUCCESS'].map(type => (
                            <button 
                                key={type}
                                onClick={() => setNewAlertType(type as any)}
                                className={`px-3 py-1 rounded-full text-xs font-bold ${newAlertType === type ? 'bg-slate-800 text-white' : 'bg-slate-100'}`}
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
                        red: 'bg-red-50 text-red-600 border-red-100',
                        amber: 'bg-amber-50 text-amber-600 border-amber-100',
                        blue: 'bg-blue-50 text-blue-600 border-blue-100',
                        green: 'bg-green-50 text-green-600 border-green-100'
                    }[alert.color as string] || 'bg-slate-50 text-slate-600 border-slate-100';

                    const iconBg = {
                        red: 'bg-red-100 text-red-500',
                        amber: 'bg-amber-100 text-amber-500',
                        blue: 'bg-blue-100 text-blue-500',
                        green: 'bg-green-100 text-green-500'
                    }[alert.color as string] || 'bg-slate-100 text-slate-500';

                    return (
                        <div key={alert.id} className={`${colorClasses} p-4 rounded-[1.5rem] border transition-all`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
                                    <alert.icon size={18} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm">{alert.title}</h4>
                                    <p className="text-xs opacity-80">{alert.message}</p>
                                </div>
                                {alert.details && (
                                    <button onClick={() => toggleAlertExpand(alert.id)} className="p-1 hover:bg-black/5 rounded-full">
                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                )}
                            </div>
                            {isExpanded && alert.details && (
                                <div className="mt-3 pt-3 border-t border-black/5 text-xs space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
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
        <footer className="mt-16 py-10 px-6 bg-white rounded-2xl text-center flex flex-col gap-4 font-sans">
            <p className="text-sm font-bold tracking-[-0.01em] text-[#003366]">
                Marguel Sistema de Gestão Interna
            </p>
            <div className="flex flex-col items-center">
                <span className="text-xs text-[#6B7280] mb-1">Desenvolvido por</span>
                <div className="text-xs tracking-[0.5px]">
                    <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>DC - Comercial</span>
                    <span className="text-[#6B7280] font-normal mx-1">&</span>
                    <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>Marguel Group</span>
                </div>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
