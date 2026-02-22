
import React from 'react';

export const COLORS = {
  KEVE_BLUE: '#003366',
  BCI_BLUE: '#0054A6',
  SOFT_BG: '#F8FAFC',
  SUCCESS: '#22C55E',
  DANGER: '#EF4444',
  WARNING: '#F59E0B',
  NEUTRAL: '#64748B'
};

export const MGLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Letra M que se estende para formar a base do G */}
    <path 
      d="M25 85V25L50 50L75 25V60C75 78 65 85 50 85H45" 
      stroke="currentColor" 
      strokeWidth="8" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className="text-[#003366]" 
    />
    
    {/* Parte superior do G (Tom diferente/Azul Claro) que respeita o contorno */}
    <path 
      d="M75 40C75 25 65 15 50 15" 
      stroke="#60A5FA" 
      strokeWidth="8" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    
    {/* Pequeno detalhe de traço interno do G para reforçar a leitura */}
    <path 
      d="M50 65V65" 
      stroke="currentColor" 
      strokeWidth="8" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className="text-[#003366]"
    />
  </svg>
);
