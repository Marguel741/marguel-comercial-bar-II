import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-16 py-10 px-6 bg-white dark:bg-slate-800 rounded-2xl text-center flex flex-col gap-4 font-sans border border-slate-100 dark:border-slate-700">
        <p className="text-sm font-bold tracking-[-0.01em] text-[#003366] dark:text-blue-400">
            Marguel Sistema de Gestão Interna
        </p>
        <div className="flex flex-col items-center">
            <span className="text-xs text-[#6B7280] dark:text-slate-400 mb-1">Desenvolvido por</span>
            <div className="text-xs tracking-[0.5px]">
                <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>DC - Comercial</span>
                <span className="text-[#6B7280] dark:text-slate-500 font-normal mx-1">&</span>
                <span className="font-extrabold text-[#E3007E]" style={{ textShadow: '0px 0px 5px rgba(227, 0, 126, 0.7)' }}>Marguel CGPS (SU) Lda</span>
            </div>
        </div>
    </footer>
  );
};

export default Footer;
