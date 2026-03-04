
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MGLogo } from '../constants';
import { Mail, Lock, Key } from 'lucide-react';

const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [usePin, setUsePin] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(email, password);
    if (!success) setError('Usuário não encontrado ou não autorizado.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 animate-fade-in transition-colors">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <MGLogo className="w-20 h-20 mx-auto text-[#003366] dark:text-white mb-4" />
          <h1 className="text-3xl font-bold text-[#003366] dark:text-white">Bem-vindo</h1>
          <p className="text-slate-500 dark:text-slate-400">Gestão Marguel Comercial Bar</p>
        </div>

        <div className="soft-ui p-8 dark:bg-slate-800 dark:border-slate-700">
          <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-2xl mb-8">
            <button 
              onClick={() => setUsePin(false)}
              className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${!usePin ? 'bg-white dark:bg-slate-600 shadow-sm text-[#003366] dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Email + Senha
            </button>
            <button 
              onClick={() => setUsePin(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${usePin ? 'bg-white dark:bg-slate-600 shadow-sm text-[#003366] dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Acesso por PIN
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {usePin ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#003366] dark:text-blue-400 uppercase tracking-wider">Código PIN</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="password"
                    maxLength={6}
                    placeholder="••••••"
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-4 pl-12 pr-4 soft-ui-inset focus:ring-2 focus:ring-[#003366] transition-all text-center text-2xl tracking-[1em] dark:text-white"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#003366] dark:text-blue-400 uppercase tracking-wider">E-mail Corporativo</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu.email@marguel.com"
                      className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-4 pl-12 pr-4 soft-ui-inset focus:ring-2 focus:ring-[#003366] transition-all dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#003366] dark:text-blue-400 uppercase tracking-wider">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-4 pl-12 pr-4 soft-ui-inset focus:ring-2 focus:ring-[#003366] transition-all dark:text-white"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</p>}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full pill-button py-4 bg-[#003366] text-white font-bold text-lg shadow-xl shadow-blue-200 dark:shadow-none hover:opacity-95 disabled:opacity-50 transition-all active:scale-95"
            >
              {isLoading ? 'Autenticando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <a href="#" className="text-sm font-medium text-slate-400 hover:text-[#003366] dark:hover:text-white">Esqueceu as credenciais?</a>
          </div>
        </div>
        
        <div className="mt-8 text-center text-slate-400 text-xs space-y-1">
          <p>Sistema restrito apenas para pessoal autorizado.</p>
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg inline-block text-[10px] text-slate-500">
             <strong>Emails de Teste:</strong> admin@marguel.com, dono@marguel.com, gerente@marguel.com, efetivo@marguel.com, func@marguel.com, remoto@marguel.com
          </div>
          <p className="mt-2">Marguel Comercial Bar &copy; 2024</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
