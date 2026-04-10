// pages/Banned.tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Ban, LogOut } from 'lucide-react';
import Footer from '../components/Footer';

const Banned: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <div className="bg-red-600 py-14 px-6 rounded-b-[3rem] shadow-2xl">
        <div className="flex flex-col items-center animate-fade-in">
          <span className="font-sans font-black text-4xl tracking-tighter text-white mb-2">MG</span>
          <h1 className="text-2xl font-bold text-white">Conta Bloqueada</h1>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 -mt-8">
        <div className="soft-ui p-8 dark:bg-slate-800 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Ban size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-black text-[#003366] dark:text-white mb-3">Acesso Negado</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            A tua conta foi bloqueada pelo Administrador. Contacta o responsável para mais informações.
          </p>
          {user && (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 mb-6">
              <p className="text-sm text-slate-500">Email: <span className="font-bold text-slate-800 dark:text-white">{user.email}</span></p>
            </div>
          )}
          <button onClick={handleLogout}
            className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
            <LogOut size={18} /> Sair
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};
export default Banned;
