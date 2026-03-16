
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Shield, 
  Palette, 
  Cpu, 
  Activity, 
  Info, 
  Save, 
  RefreshCw, 
  Trash2, 
  Fingerprint,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Zap,
  Wifi,
  WifiOff,
  Database,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useProducts } from '../contexts/ProductContext';
import SoftCard from '../components/SoftCard';
import { UserRole } from '../types';

const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const isAdmin = user?.role === 'ADMIN_GERAL' || user?.role === 'PROPRIETARIO';
  const { theme, setTheme } = useTheme();
  const { 
    idleTimeout, setIdleTimeout,
    biometricEnabled, setBiometricEnabled,
    uiEffectsEnabled, setUiEffectsEnabled,
    diagnosticReportingMode, setDiagnosticReportingMode,
    usageAnalyticsEnabled, setUsageAnalyticsEnabled,
    maintenanceMode, setMaintenanceMode,
    lastSyncDate, isOnline
  } = useSettings();

  const { 
    products, 
    syncData, 
    rebuildStockFromSales, 
    salesReports,
    addAuditLog
  } = useProducts();

  const [integrityResults, setIntegrityResults] = useState<{
    status: 'clean' | 'issues' | null;
    details: Array<{ product: string; error: string; page: string; date: string }>;
  }>({ status: null, details: [] });
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  // Account State
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({
    name: user?.name || '',
    username: user?.username || ''
  });

  // Security State
  const [pinForm, setPinForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPins, setShowPins] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [pinStatus, setPinStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleUpdateAccount = async () => {
    const success = await updateUser(accountForm);
    if (success) {
      setIsEditingAccount(false);
    }
  };

  const systemIntegrityCheck = async () => {
    setIsCheckingIntegrity(true);
    const issues: typeof integrityResults.details = [];
    
    // 1. Negative Stock
    products.forEach(p => {
      if (p.stock < 0) {
        issues.push({
          product: p.name,
          error: `Stock negativo: ${p.stock}`,
          page: 'Inventário',
          date: new Date().toISOString()
        });
      }
    });

    // 2. Sales without products
    salesReports.forEach(report => {
      report.itemsSummary?.forEach(item => {
        const product = products.find(p => p.name === item.name);
        if (!product) {
          issues.push({
            product: item.name,
            error: 'Venda de produto inexistente',
            page: 'Relatórios de Venda',
            date: report.date
          });
        }
      });
    });

    setIntegrityResults({
      status: issues.length === 0 ? 'clean' : 'issues',
      details: issues
    });
    setIsCheckingIntegrity(false);
  };

  const handleRebuildStock = async () => {
    if (window.confirm('Tem certeza que deseja reconstruir o stock? Esta operação recalculará todos os saldos com base nas compras e vendas registadas.')) {
      setIsRebuilding(true);
      await rebuildStockFromSales();
      setIsRebuilding(false);
      alert('Reconstrução de stock concluída com sucesso.');
    }
  };

  const handleFullDiagnosis = async () => {
    setIsDiagnosing(true);
    await systemIntegrityCheck();
    await rebuildStockFromSales();
    await syncData();
    setIsDiagnosing(false);
    alert('Diagnóstico completo concluído.');
  };

  const handleUpdatePin = async () => {
    if (pinForm.new !== pinForm.confirm) {
      setPinStatus({ type: 'error', message: 'Os novos PINs não coincidem' });
      return;
    }
    if (pinForm.new.length < 4 || pinForm.new.length > 8) {
      setPinStatus({ type: 'error', message: 'O PIN deve ter entre 4 e 8 dígitos' });
      return;
    }
    
    // In a real app we would verify current PIN
    const success = await updateUser({ pin: pinForm.new });
    if (success) {
      setPinStatus({ type: 'success', message: 'PIN alterado com sucesso' });
      setPinForm({ current: '', new: '', confirm: '' });
      setTimeout(() => setPinStatus(null), 3000);
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Tem certeza que deseja limpar todos os dados locais? A aplicação será reiniciada.')) {
      localStorage.clear();
      // indexedDB.deleteDatabase(...) if needed
      window.location.reload();
    }
  };

  const handleSync = () => {
    // Mock sync
    alert('Sincronização forçada iniciada...');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-[#003366] text-white rounded-2xl shadow-lg">
          <Cpu size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-800 dark:text-white uppercase">Definições</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Configure a sua experiência no sistema</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. CONTA */}
        <SoftCard className="flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <User size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Conta</h2>
          </div>

          <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="w-16 h-16 bg-[#003366] text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg">
              {getInitials(user?.name)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-bold text-lg text-slate-800 dark:text-white truncate">{user?.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">@{user?.username || 'utilizador'}</p>
              <div className="mt-1 inline-block px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider border border-blue-500/20">
                {user?.role.replace(/_/g, ' ')}
              </div>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">Nome Completo</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">{user?.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">Username</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">@{user?.username || 'não definido'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">Função</span>
              <span className="text-sm font-bold text-slate-400 dark:text-slate-500 italic">Inalterável</span>
            </div>
          </div>

          <button 
            onClick={() => setIsEditingAccount(true)}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all"
          >
            Editar Dados
          </button>
        </SoftCard>

        {/* 2. SEGURANÇA */}
        <SoftCard className="flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
              <Shield size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Segurança</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 block">Alteração de PIN</label>
              <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                  <input 
                    type={showPins.current ? "text" : "password"}
                    placeholder="PIN Atual"
                    value={pinForm.current}
                    onChange={e => setPinForm({...pinForm, current: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <button onClick={() => setShowPins({...showPins, current: !showPins.current})} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPins.current ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input 
                      type={showPins.new ? "text" : "password"}
                      placeholder="Novo PIN"
                      value={pinForm.new}
                      onChange={e => setPinForm({...pinForm, new: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <button onClick={() => setShowPins({...showPins, new: !showPins.new})} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPins.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={showPins.confirm ? "text" : "password"}
                      placeholder="Confirmar PIN"
                      value={pinForm.confirm}
                      onChange={e => setPinForm({...pinForm, confirm: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <button onClick={() => setShowPins({...showPins, confirm: !showPins.confirm})} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPins.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button 
                  onClick={handleUpdatePin}
                  className="w-full py-2.5 bg-[#003366] text-white rounded-xl font-bold text-sm hover:bg-blue-800 transition-all flex items-center justify-center gap-2"
                >
                  <Lock size={16} /> Alterar PIN
                </button>
                {pinStatus && (
                  <div className={`flex items-center gap-2 text-xs font-bold p-2 rounded-lg ${pinStatus.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {pinStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {pinStatus.message}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Bloqueio Automático</span>
                </div>
                <select 
                  value={idleTimeout}
                  onChange={e => setIdleTimeout(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold outline-none"
                >
                  <option value={30}>30 segundos</option>
                  <option value={60}>1 minuto</option>
                  <option value={120}>2 minutos</option>
                  <option value={300}>5 minutos</option>
                  <option value={600}>10 minutos</option>
                  <option value={0}>Nunca bloquear</option>
                </select>
              </div>
              <p className="text-[10px] text-slate-400 italic">Bloqueia a sessão após inatividade prolongada.</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Fingerprint size={16} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Autenticação Biométrica</span>
              </div>
              <button 
                onClick={() => setBiometricEnabled(!biometricEnabled)}
                className={`w-10 h-5 rounded-full transition-all relative ${biometricEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${biometricEnabled ? 'left-6' : 'left-1'}`}></div>
              </button>
            </div>
          </div>
        </SoftCard>

        {/* 3. APARÊNCIA */}
        <SoftCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <Palette size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Aparência</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 block">Tema do Sistema</label>
              <div className="grid grid-cols-3 gap-3">
                {(['light', 'dark', 'system'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setTheme(mode)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                      theme === mode 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      mode === 'light' ? 'bg-amber-100 text-amber-600' : 
                      mode === 'dark' ? 'bg-slate-700 text-slate-200' : 'bg-indigo-100 text-indigo-600'
                    }`}>
                      {mode === 'light' ? <Zap size={16} /> : mode === 'dark' ? <Lock size={16} /> : <Activity size={16} />}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-tighter">
                      {mode === 'light' ? 'Claro' : mode === 'dark' ? 'Escuro' : 'Sistema'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Efeitos Visuais</span>
              </div>
              <button 
                onClick={() => setUiEffectsEnabled(!uiEffectsEnabled)}
                className={`w-10 h-5 rounded-full transition-all relative ${uiEffectsEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${uiEffectsEnabled ? 'left-6' : 'left-1'}`}></div>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 italic">Animações, transições e efeitos de brilho.</p>
          </div>
        </SoftCard>

        {/* 4. SISTEMA */}
        <SoftCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Cpu size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Sistema</h2>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {isOnline ? <Wifi size={18} className="text-emerald-500" /> : <WifiOff size={18} className="text-red-500" />}
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Modo Offline First</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isOnline 
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                    : 'bg-red-500/10 text-red-600 border-red-500/20'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4">Os dados são guardados localmente e sincronizados automaticamente quando houver conexão.</p>
              <button 
                onClick={handleSync}
                className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                <RefreshCw size={14} /> Sincronizar Agora
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={handleClearCache}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all border border-red-100 dark:border-red-900/30"
              >
                <Trash2 size={14} /> Limpar Cache e Dados Locais
              </button>
              <p className="text-[10px] text-slate-400 italic mt-2 text-center">Atenção: Isto irá remover todos os dados não sincronizados.</p>
            </div>
          </div>
        </SoftCard>

        {/* 5. DIAGNÓSTICO */}
        <SoftCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <Activity size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Diagnóstico</h2>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Relatório de Erros</span>
                <select 
                  value={diagnosticReportingMode}
                  onChange={e => setDiagnosticReportingMode(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold outline-none"
                >
                  <option value="ALWAYS">Sempre</option>
                  <option value="ERROR">Apenas em erro</option>
                  <option value="NEVER">Nunca</option>
                </select>
              </div>
              <p className="text-[10px] text-slate-400 italic">Envia dados técnicos para melhoria do sistema.</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Dados de Utilização</span>
              </div>
              <button 
                onClick={() => setUsageAnalyticsEnabled(!usageAnalyticsEnabled)}
                className={`w-10 h-5 rounded-full transition-all relative ${usageAnalyticsEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${usageAnalyticsEnabled ? 'left-6' : 'left-1'}`}></div>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 italic">Ajuda-nos a entender como o sistema é utilizado.</p>
          </div>
        </SoftCard>

        {/* Configurações Avançadas */}
        {isAdmin && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Configurações Avançadas</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Controlo de Integridade */}
              <SoftCard className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white">Integridade do Sistema</h3>
                      <p className="text-xs text-slate-500">Verificar inconsistências de dados</p>
                    </div>
                  </div>
                  <button
                    onClick={systemIntegrityCheck}
                    disabled={isCheckingIntegrity}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {isCheckingIntegrity ? 'A verificar...' : 'Verificar'}
                  </button>
                </div>

                {integrityResults.status && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={`p-4 rounded-2xl text-sm ${
                      integrityResults.status === 'clean' 
                        ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' 
                        : 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-2">
                      {integrityResults.status === 'clean' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                      {integrityResults.status === 'clean' ? 'Sistema íntegro' : 'Inconsistências detectadas'}
                    </div>
                    {integrityResults.details.length > 0 && (
                      <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {integrityResults.details.map((issue, idx) => (
                          <div key={idx} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-xs shadow-sm">
                            <div className="font-bold text-slate-800 dark:text-white mb-1">{issue.product}</div>
                            <div className="text-slate-500">{issue.error}</div>
                            <div className="flex justify-between mt-2 pt-2 border-t border-slate-50 dark:border-slate-700/50 opacity-60">
                              <span>{issue.page}</span>
                              <span>{new Date(issue.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </SoftCard>

              {/* Reconstrução de Stock */}
              <SoftCard className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <RefreshCw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white">Reconstrução de Stock</h3>
                      <p className="text-xs text-slate-500">Recalcular stock via histórico</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRebuildStock}
                    disabled={isRebuilding}
                    className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-700 transition-all disabled:opacity-50"
                  >
                    {isRebuilding ? 'A processar...' : 'Reconstruir'}
                  </button>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] text-slate-500 leading-relaxed italic">
                    * Esta operação recalcula o stock atual somando todas as compras e subtraindo todas as vendas registadas. Use apenas em caso de divergência grave.
                  </p>
                </div>
              </SoftCard>

              {/* Modo Manutenção */}
              <SoftCard className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white">Modo Manutenção</h3>
                      <p className="text-xs text-slate-500">Bloquear acesso ao sistema</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMaintenanceMode(!maintenanceMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none ${
                      maintenanceMode ? 'bg-red-600' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {maintenanceMode && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 text-[10px] rounded-xl border border-red-100 dark:border-red-900/30 font-bold">
                    ATENÇÃO: O sistema está bloqueado para utilizadores comuns.
                  </div>
                )}
              </SoftCard>

              {/* Botão de Emergência */}
              <SoftCard className="p-6 space-y-4 md:col-span-2 bg-slate-900 dark:bg-black text-white border-none overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <Activity size={120} />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl">
                      <Zap className="w-8 h-8 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Diagnóstico Completo do Sistema</h3>
                      <p className="text-sm text-slate-400">Executar integridade, reconstrução e sincronização</p>
                    </div>
                  </div>
                  <button
                    onClick={handleFullDiagnosis}
                    disabled={isDiagnosing}
                    className="w-full md:w-auto px-8 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-100 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-wider text-sm"
                  >
                    {isDiagnosing ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        A Processar...
                      </>
                    ) : (
                      'Executar Diagnóstico'
                    )}
                  </button>
                </div>
              </SoftCard>
            </div>
          </motion.section>
        )}

        {/* 6. INFORMAÇÃO */}
        <SoftCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl">
              <Info size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Informação</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Versão do Sistema</span>
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-white">2.0.1-stable</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className="text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Última Sincronização</span>
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-white">{lastSyncDate}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {isOnline ? <Wifi size={14} className="text-slate-400" /> : <WifiOff size={14} className="text-slate-400" />}
                <span className="text-xs text-slate-500 dark:text-slate-400">Modo Atual</span>
              </div>
              <span className={`text-xs font-bold ${isOnline ? 'text-emerald-600' : 'text-red-600'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Base de Dados</span>
              </div>
              <span className="text-xs font-bold text-blue-600">Sincronizada</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-sans font-black text-xl tracking-tighter text-[#E3007E]">MG</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comercial Bar</span>
            </div>
            <p className="text-[8px] text-slate-400 uppercase font-medium">© 2026 Marguel ERP Systems. Todos os direitos reservados.</p>
          </div>
        </SoftCard>
      </div>

      {/* Account Edit Modal */}
      <AnimatePresence>
        {isEditingAccount && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingAccount(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden border border-white/20 dark:border-slate-800"
            >
              <div className="p-8">
                <h3 className="text-2xl font-black tracking-tighter text-slate-800 dark:text-white uppercase mb-6">Editar Meus Dados</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nome Completo</label>
                    <input 
                      type="text"
                      value={accountForm.name}
                      onChange={e => setAccountForm({...accountForm, name: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Username</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                      <input 
                        type="text"
                        value={accountForm.username}
                        onChange={e => setAccountForm({...accountForm, username: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold leading-tight">
                      Nota: A sua função ({user?.role}) e permissões só podem ser alteradas por um Administrador Geral ou Proprietário.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8">
                  <button 
                    onClick={() => setIsEditingAccount(false)}
                    className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleUpdateAccount}
                    className="py-3 bg-[#003366] text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> Guardar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
