
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type SidebarMode = 'mini' | 'hidden';
export type HapticType = 'selection' | 'impact' | 'success' | 'warning' | 'error';

interface LayoutContextType {
  sidebarMode: SidebarMode;
  isPinned: boolean;
  setSidebarMode: (mode: SidebarMode) => void;
  toggleSidebar: () => void;
  togglePin: () => void;
  triggerHaptic: (type?: HapticType) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Alterado: Inicia como 'hidden' (oculto) e não fixado (false)
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('hidden');
  const [isPinned, setIsPinned] = useState<boolean>(false);

  const toggleSidebar = () => {
    triggerHaptic('selection');
    if (sidebarMode === 'mini') {
      setSidebarMode('hidden');
    } else {
      setSidebarMode('mini');
    }
  };

  const togglePin = () => {
    triggerHaptic('impact');
    if (isPinned) {
      setIsPinned(false);
      setSidebarMode('hidden');
    } else {
      setIsPinned(true);
    }
  };

  const triggerHaptic = (type: HapticType = 'selection') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      switch (type) {
        case 'selection':
          // Muito leve, para navegação, tabs, listas
          navigator.vibrate(10);
          break;
        case 'impact':
          // Leve/Médio, para botões normais, toggles, adicionar itens
          navigator.vibrate(30);
          break;
        case 'success':
          // Médio/Forte, para Salvar, Confirmar, Concluir
          navigator.vibrate(60);
          break;
        case 'warning':
          // Forte, para Deletar, Ações irreversíveis
          navigator.vibrate(100);
          break;
        case 'error':
          // Padrão distinto para erros ou ações negadas
          navigator.vibrate([50, 50, 50]);
          break;
      }
    }
  };

  return (
    <LayoutContext.Provider value={{ sidebarMode, isPinned, setSidebarMode, toggleSidebar, togglePin, triggerHaptic }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};
