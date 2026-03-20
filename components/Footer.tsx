import React from 'react';
import { motion } from 'motion/react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-12 py-8 px-6 border-t border-slate-100 dark:border-slate-800 relative overflow-hidden">
      {/* Shimmer Effect Background */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
        <motion.div 
          animate={{ 
            x: ['-100%', '100%'],
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="w-full h-full bg-gradient-to-r from-transparent via-[#FF1493] to-transparent"
        />
      </div>

      <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-px w-8 bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <span className="font-sans font-black text-xl tracking-tighter bg-gradient-to-r from-[#FF69B4] to-[#FF1493] bg-clip-text text-transparent">
              Marguel
            </span>
          </div>
          <div className="h-px w-8 bg-slate-200 dark:bg-slate-700" />
        </div>
        
        <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider leading-relaxed max-w-3xl">
          Marguel Sistema de Gestão Interna <span className="mx-2 text-slate-300 dark:text-slate-600">|</span> 
          Desenvolvido por: DC - Comercial & Marguel CGPS (SU) Lda <span className="mx-2 text-slate-300 dark:text-slate-600">|</span> 
          © 2026 Marguel ERP Systems.
        </p>

        {/* Shimmering Pink Line */}
        <motion.div 
          className="h-0.5 w-24 rounded-full bg-gradient-to-r from-[#FF69B4] via-[#FF1493] to-[#C71585]"
          animate={{ 
            opacity: [0.4, 1, 0.4],
            scaleX: [0.8, 1.2, 0.8]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </div>
    </footer>
  );
};

export default Footer;
