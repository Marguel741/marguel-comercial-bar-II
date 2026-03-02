
import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SoftCard from '../components/SoftCard';

const AccessDenied: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <SoftCard className="max-w-md w-full p-8 text-center animate-fade-in">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-2xl font-black text-[#003366] dark:text-white mb-2 uppercase">Acesso Negado</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">
          Você não tem as permissões necessárias para acessar esta página. 
          Se acredita que isso é um erro, contate o administrador do sistema.
        </p>
        <button 
          onClick={() => navigate(-1)}
          className="pill-button w-full py-4 bg-[#003366] text-white font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all active:scale-95"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
      </SoftCard>
    </div>
  );
};

export default AccessDenied;
