import React from 'react';

export const LogoMG: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-[spin_10s_linear_infinite]" />
        <div className="absolute inset-2 rounded-full border border-cyan-400/20 animate-[spin_15s_linear_infinite_reverse]" />
        
        {/* MG Text */}
        <h1 className="text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-white to-cyan-600 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          MG
        </h1>
      </div>
      <div className="mt-4 text-cyan-500/80 text-sm tracking-[0.5em] uppercase font-light">
        Marguel Group
      </div>
    </div>
  );
};
