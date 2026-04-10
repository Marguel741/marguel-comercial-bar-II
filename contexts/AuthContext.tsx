
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '../types';
import { getUsers, saveUsers } from '../src/services/userStore';
import { useAudit } from './AuditContext';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => void;
  updateUser: (updates: Partial<User>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { addLog } = useAudit();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize user from DB or localStorage
    const users = getUsers();
    const savedUser = localStorage.getItem('mg_user');
    
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        const found = users.find(u => u.id === parsed.id);
        if (found) {
          setUser(found);
        } else {
          // Utilizador não encontrado — requer novo login
          localStorage.removeItem('mg_user');
        }
      } catch (e) {
        localStorage.removeItem('mg_user');
      }
    }
    setIsLoading(false);

    // Corrigir dependência stale no listener
    const handleUsersUpdated = () => {
      const freshUsers = getUsers();
      setUser(prev => {
        if (!prev) return null;
        return freshUsers.find(u => u.id === prev.id) || prev;
      });
    };
    window.addEventListener('mg_users_updated', handleUsersUpdated);
    return () => window.removeEventListener('mg_users_updated', handleUsersUpdated);
  }, []);

  const refreshUser = useCallback(() => {
    const users = getUsers();
    setUser(prev => {
        if (!prev) return null;
        const updatedUser = users.find(u => u.id === prev.id);
        return updatedUser || prev;
    });
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const users = getUsers();
    let foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    // Suporte para login apenas por PIN (lookup por PIN)
    if (email === '__PIN__') {
      foundUser = users.find(u => u.pin === pass);
    }
    
    if (foundUser && foundUser.isApproved && !foundUser.isBanned && foundUser.pin === pass) {
        const updatedUser = { 
          ...foundUser, 
          lastLogin: new Date().toLocaleString('pt-AO', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }) 
        };
        const updatedUsers = users.map(u => u.id === foundUser.id ? updatedUser : u);
        saveUsers(updatedUsers);
        localStorage.setItem('mg_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        addLog({
          action: 'LOGIN',
          module: 'UTILIZADORES',
          description: `Utilizador ${foundUser.name} (${foundUser.role}) iniciou sessão`,
          entityId: foundUser.id,
          previousValue: null,
          newValue: 'LOGGED_IN'
        }, updatedUser);
        setIsLoading(false);
        return true;
    }
    
    setIsLoading(false);
    return false;
  }, [addLog]);

  const logout = useCallback(() => {
    if (user) {
      addLog({
        action: 'LOGOUT',
        module: 'UTILIZADORES',
        description: `Utilizador ${user.name} terminou sessão`,
        entityId: user.id,
        previousValue: 'LOGGED_IN',
        newValue: 'LOGGED_OUT'
      }, user);
    }
    setUser(null);
    localStorage.removeItem('mg_user');
  }, [user, addLog]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return false;
    
    const users = getUsers();
    const updatedUsers = users.map(u => u.id === user.id ? { ...u, ...updates } : u);
    
    saveUsers(updatedUsers);
    const updatedUser = updatedUsers.find(u => u.id === user.id)!;
    setUser(updatedUser);
    localStorage.setItem('mg_user', JSON.stringify(updatedUser));
    
    if (updates.pin) {
      addLog({
        action: 'USER_PIN_CHANGED',
        module: 'SEGURANÇA',
        description: `PIN alterado pelo utilizador ${user.name}`,
        entityId: user.id,
        previousValue: '****',
        newValue: '****'
      }, user);
    }

    return true;
  }, [user, addLog]);

  const value = React.useMemo(() => ({ 
    user, 
    login, 
    logout, 
    isLoading, 
    refreshUser,
    updateUser
  }), [user, isLoading, login, logout, refreshUser, updateUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
