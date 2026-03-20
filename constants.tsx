
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

export const MarguelPinkLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pinkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF69B4" /> {/* HotPink */}
        <stop offset="50%" stopColor="#FF1493" /> {/* DeepPink */}
        <stop offset="100%" stopColor="#C71585" /> {/* MediumVioletRed */}
      </linearGradient>
      <filter id="pinkGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <path 
      d="M25 85V25L50 50L75 25V60C75 78 65 85 50 85H45" 
      stroke="url(#pinkGradient)" 
      strokeWidth="8" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{ filter: 'url(#pinkGlow)' }}
    />
    <path 
      d="M75 40C75 25 65 15 50 15" 
      stroke="#FFB6C1" 
      strokeWidth="8" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M50 65V65" 
      stroke="url(#pinkGradient)" 
      strokeWidth="8" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);
