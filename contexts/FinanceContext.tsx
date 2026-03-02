import React, { createContext, useContext, ReactNode } from 'react';
import { useProducts } from './ProductContext';
import { Transaction } from '../types';

interface FinanceContextType {
  addTransaction: (type: 'entrada' | 'saida', category: string, amount: number, description: string, referenceId?: string, referenceType?: Transaction['referenceType'], performedBy?: string) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { processTransaction } = useProducts();

  const addTransaction = (type: 'entrada' | 'saida', category: string, amount: number, description: string, referenceId?: string, referenceType?: Transaction['referenceType'], performedBy?: string) => {
    // Map 'entrada' -> 'deposit', 'saida' -> 'withdraw'
    const transType = type === 'entrada' ? 'deposit' : 'withdraw';
    
    // We default to 'main' account (Conta Corrente) for sales transactions.
    // Note: The 'category' parameter is currently not fully utilized because ProductContext 
    // hardcodes the category based on the account type. 
    // However, the description is passed through.
    processTransaction(transType, 'main', amount, description, category, referenceId, referenceType, performedBy);
  };

  return (
    <FinanceContext.Provider value={{ addTransaction }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
