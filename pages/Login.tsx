// ============================================================
// pages/Login.tsx — VERSÃO FINAL COMPLETA
// Colar directamente no GitHub: seleccionar tudo e substituir
// ============================================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Mail,
  Lock,
  Key,
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
} from 'lucide-react';
import Footer from '../components/Footer';

const Login: React.FC = () => {
  const { login, loginByPin, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Verificar se biometria está disponível E registada
  useEffect(() => {
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((ok) => {
          const hasSaved = !!localStorage.getItem('mg_biometric_user');
          setBiometricAvailable(ok && hasSaved);
        })
        .catch(() => setBiometricAvailable(false));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let ok = false;
    if (usePin) {
      ok = await loginByPin(pin);
    } else {
      ok = await login(email, password);
    }

    if (ok) {
      navigate('/');
    } else {
      setError(
        usePin
          ? 'PIN inválido ou conta não autorizada.'
          : 'Email ou senha inválidos. Verifique as suas credenciais.'
      );
    }
  };

  const handleBiometric = async () => { const saved = localStorage.getItem('mg_biometric_user'); if (!saved) { setError('Biometria não configurada. Vai às Definições → Segurança → Activar Biometria.'); return; } let bioData: { email: string; pin: string; userId: string; credId: number[] }; try { bioData = JSON.parse(saved); } catch { setError('Dados biométricos corrompidos. Reactiva a biometria nas Definições.'); localStorage.removeItem('mg_biometric_user'); return; } if (!bioData.credId || !Array.isArray(bioData.credId) || bioData.credId.length === 0) { setError('Chave biométrica inválida. Reactiva a biometria nas Definições.'); localStorage.removeItem('mg_biometric_user'); return; } try { // Reconstruir o Uint8Array a partir do array de números guardado const credentialId = new Uint8Array(bioData.credId); const credential = await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rpId: window.location.hostname, allowCredentials: [ { id: credentialId, type: 'public-key', }, ], userVerification: 'required', timeout: 60000, }, } as CredentialRequestOptions); if (credential) { const ok = await loginByPin(bioData.pin); if (ok) { navigate('/'); } else { setError('Biometria válida mas conta não encontrada ou PIN alterado. Usa email e senha e reactiva a biometria nas Definições.'); } } } catch (err: any) { console.error('Erro biometria login:', err); if (err?.name === 'NotAllowedError') { setError('Biometria cancelada.'); } else if (err?.name === 'InvalidStateError') { setError('Chave biométrica expirada. Reactiva a biometria nas Definições.'); localStorage.removeItem('mg_biometric_user'); } else { setError('Erro na biometria. Usa email e senha.'); } } };

  const handleForgotCredentials = () => {
    alert(
      'Para recuperação de credenciais, contacte o Administrador do sistema.'
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header com gradiente azul + logo MG rosa (igual ao Sidebar) */}
      <div className="bg-[#003366] py-14 px-6 rounded-b-[3rem] shadow-2xl">
        <div className="flex flex-col items-center animate-fade-in">
          {/* Logo MG — idêntico ao Sidebar */}
          <div className="mb-5 flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <span
                className="font-sans font-black text-5xl tracking-tighter text-[#E3007E] relative z-10"
                style={{
                  filter:
                    'drop-shadow(0 0 20px rgba(227, 0, 126, 0.55))',
                }}
              >
                MG
              </span>
              <div className="absolute inset-0 blur-2xl bg-[#E3007E]/15 rounded-full animate-pulse" />
            </div>
            <div className="w-14 h-[1px] bg-[#E3007E]/50 mt-1" />
            <div className="flex items-center gap-2 mt-1.5 opacity-60">
              <div className="w-1.5 h-1.5 rotate-45 border border-[#E3007E]/60" />
              <div className="w-8 h-[0.5px] bg-[#E3007E]/30" />
              <div className="w-1.5 h-1.5 rotate-45 border border-[#E3007E]/60" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">Bem-vindo</h1>
          <p className="text-white/60 text-sm mt-1 text-center">
            Marguel Mobile Sistema de Gestão Interna
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex-1 px-6 -mt-8 pb-6">
        <div className="soft-ui p-8 dark:bg-slate-800 dark:border-slate-700 max-w-md mx-auto">
          {/* Tabs Email / PIN */}
          <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-2xl mb-7">
            {[
              { label: 'Email + Senha', val: false },
              { label: 'Acesso por PIN', val: true },
            ].map((tab) => (
              <button
                key={String(tab.val)}
                type="button"
                onClick={() => {
                  setUsePin(tab.val);
                  setError('');
                }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  usePin === tab.val
                    ? 'bg-white dark:bg-slate-600 shadow-sm text-[#003366] dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {usePin ? (
              /* ——— Login por PIN ——— */
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#003366] dark:text-blue-400 uppercase tracking-wider">
                  Código PIN
                </label>
                <div className="relative">
                  <Key
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={20}
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••••"
                    autoComplete="one-time-code"
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-4 pl-12 pr-4 soft-ui-inset focus:ring-2 focus:ring-[#003366] text-center text-2xl tracking-[1em] dark:text-white"
                    required
                  />
                </div>
              </div>
            ) : (
              /* ——— Login por Email ——— */
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#003366] dark:text-blue-400 uppercase tracking-wider">
                    E-mail Corporativo
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={20}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@marguel.com"
                      autoComplete="email"
                      className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-4 pl-12 pr-4 soft-ui-inset focus:ring-2 focus:ring-[#003366] dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#003366] dark:text-blue-400 uppercase tracking-wider">
                    Senha (PIN)
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={20}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-4 pl-12 pr-12 soft-ui-inset focus:ring-2 focus:ring-[#003366] dark:text-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003366] transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Esqueceu credenciais */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotCredentials}
                className="text-sm font-medium text-slate-400 hover:text-[#003366] dark:hover:text-blue-400 transition-colors"
              >
                Esqueceu as credenciais?
              </button>
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-red-600 dark:text-red-400 text-sm font-medium text-center">
                  {error}
                </p>
              </div>
            )}

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full pill-button py-4 bg-[#003366] text-white font-bold text-lg shadow-xl shadow-blue-900/20 hover:opacity-95 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Biometria — só aparece se disponível E registada */}
          {biometricAvailable && (
            <>
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs text-slate-400">ou</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>
              <button
                type="button"
                onClick={handleBiometric}
                className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <Fingerprint size={22} className="text-[#E3007E]" />
                Entrar com Biometria
              </button>
            </>
          )}
        </div>

        {/* Link criar conta */}
        <p className="text-center mt-6 text-slate-500 dark:text-slate-400 text-sm">
          Primeiro acesso?{' '}
          <Link
            to="/register"
            className="text-[#003366] dark:text-blue-400 font-bold hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </div>

      {/* Rodapé igual à página inicial */}
      <Footer />
    </div>
  );
};

export default Login;
