
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
import Footer from '../components/Footer';
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
    lastSyncDate, isOnline
  } = useSettings();

  const { 
    products, 
    syncData, 
    salesReports,
    addAuditLog
  } = useProducts();

  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Account State
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    phoneNumber: user?.phoneNumber || '',
    secondaryPhoneNumber: user?.secondaryPhoneNumber || '',
    associatedEmail: user?.associatedEmail || user?.email || ''
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

  const handleFullDiagnosis = async () => {
    setIsDiagnosing(true);
    await syncData();
    setIsDiagnosing(false);
    alert('Sincronização concluída.');
  };

  const handleUpdatePin = async () => {
    if (user?.pin && pinForm.current !== user.pin) {
      setPinStatus({ type: 'error', message: 'PIN actual incorrecto' });
      return;
    }
    if (pinForm.new !== pinForm.confirm) {
      setPinStatus({ type: 'error', message: 'Os novos PINs não coincidem' });
      return;
    }
    if (pinForm.new.length < 4 || pinForm.new.length > 8) {
      setPinStatus({ type: 'error', message: 'O PIN deve ter entre 4 e 8 dígitos' });
      return;
    }
    
    const success = await updateUser({ pin: pinForm.new });
if (success) {
  setPinStatus({ type: 'success', message: 'PIN alterado com sucesso' });
  setPinForm({ current: '', new: '', confirm: '' });
  setTimeout(() => setPinStatus(null), 3000);
}
  };

  const handleClearCache = () => {
    setShowClearConfirm(true);
  };

  const handleActivateBiometrics = async () => {
    if (!window.PublicKeyCredential || !user) {
      alert('Biometria não suportada neste dispositivo.');
      return;
    }
    if (!window.isSecureContext) {
      alert('A biometria requer uma ligação segura (HTTPS). O site já está em HTTPS — se vires este erro, tenta limpar a cache do browser.');
      return;
    }
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Marguel SGI', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.email,
            displayName: user.name,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential;

      if (credential) {
        const rawId = Array.from(new Uint8Array(credential.rawId));
        localStorage.setItem('mg_biometric_user', JSON.stringify({
          email: user.email,
          pin: user.pin,
          userId: user.id,
          credId: rawId,
        }));
        setBiometricEnabled(true);
        alert('✅ Biometria configurada com sucesso! Na próxima vez que entrar, pode usar a impressão digital ou Face ID.');
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        alert('❌ Operação cancelada ou bloqueada. Tenta novamente.');
      } else if (err?.name === 'NotSupportedError') {
        alert('❌ Este dispositivo não suporta biometria de plataforma.');
      } else {
        alert('❌ Erro ao configurar biometria. Certifica-te que tens um bloqueio de ecrã activo.');
      }
    }
  };
  
  const handleSync = () => {
  syncData()
    .then(() => alert('Sincronização concluída com sucesso.'))
    .catch(() => alert('Erro na sincronização. Verifique a ligação à internet e tente novamente.'));
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
              <span className="text-sm text-slate-500 dark:text-slate-400">Telefone Principal</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">{user?.phoneNumber || 'Não definido'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">Telefone Alternativo</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">{user?.secondaryPhoneNumber || 'Não definido'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">Email Associado</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">{user?.associatedEmail || user?.email || 'Não definido'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">Função</span>
              <span className="text-sm font-bold text-[#003366] dark:text-blue-400 uppercase">{user?.role.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">Data de Criação</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">{user?.createdAt || 'Não disponível'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">Último Login</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">{user?.lastLogin || user?.lastSeen || 'Agora'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
              <span className={`text-sm font-bold ${user?.isBanned ? 'text-red-500' : 'text-green-500'}`}>
                {user?.isBanned ? 'Inativo (Banido)' : 'Ativo'}
              </span>
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

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
  <div className="flex items-center justify-between">
    <div>
      <p className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
        <Fingerprint size={16} className="text-[#E3007E]" />
        Autenticação Biométrica
      </p>
      <p className="text-xs text-slate-400 mt-0.5">
        {biometricEnabled ? 'Activa — podes entrar com impressão digital ou Face ID' : 'Inactiva — activa para entrar sem digitar o PIN'}
      </p>
    </div>
<button
      onClick={biometricEnabled ? () => {
        localStorage.removeItem('mg_biometric_user');
        setBiometricEnabled(false);
        alert('Biometria desactivada.');
      } : handleActivateBiometrics}
      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 ${
        biometricEnabled
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200'
          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
      }`}
    >
      {biometricEnabled ? '✓ Activa' : 'Activar'}
    </button>
  </div>
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

        {/* 5. DIAGNÓSTICO E MANUTENÇÃO */}
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
            className="space-y-6 md:col-span-2"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Configurações Avançadas</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sincronização Completa */}
              <SoftCard className="p-6 space-y-4 bg-slate-900 dark:bg-black text-white border-none overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <Activity size={120} />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl">
                      <Zap className="w-8 h-8 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Sincronização do Sistema</h3>
                      <p className="text-sm text-slate-400">Forçar sincronização de todos os dados locais</p>
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
                        A Sincronizar...
                      </>
                    ) : (
                      'Sincronizar Agora'
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Telefone Principal</label>
                      <input 
                        type="tel"
                        value={accountForm.phoneNumber}
                        onChange={e => setAccountForm({...accountForm, phoneNumber: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Ex: 9xx xxx xxx"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Telefone Alternativo</label>
                      <input 
                        type="tel"
                        value={accountForm.secondaryPhoneNumber}
                        onChange={e => setAccountForm({...accountForm, secondaryPhoneNumber: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Contacto de emergência"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Email Associado</label>
                    <input 
                      type="email"
                      value={accountForm.associatedEmail}
                      onChange={e => setAccountForm({...accountForm, associatedEmail: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="email@exemplo.com"
                    />
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

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <p className="font-black text-xl text-[#003366] dark:text-white mb-4">Limpar dados locais?</p>
            <p className="text-slate-500 text-sm mb-6">A aplicação será reiniciada. Esta acção é irreversível.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 font-bold rounded-2xl">Cancelar</button>
              <button onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl">Limpar</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Settings;
