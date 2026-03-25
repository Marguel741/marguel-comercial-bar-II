
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '../types';
import { getMockUsers } from '../src/services/mockUsers';
import { useAudit } from './AuditContext';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  switchUser: (role: UserRole, name?: string) => boolean;
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
    // Initialize user from mock DB or localStorage
    const users = getMockUsers();
    const savedUser = localStorage.getItem('mg_user');
    
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        const found = users.find(u => u.id === parsed.id);
        if (found) {
          setUser(found);
          setIsLoading(false);
        } else {
          setUser(users[0]);
          setIsLoading(false);
        }
      } catch (e) {
        setUser(users[0]);
        setIsLoading(false);
      }
    } else {
      setUser(users[0]); // Default to first user (Admin)
      setIsLoading(false);
    }
    
    // Listen for user updates to refresh current session
    const handleUsersUpdated = () => {
        refreshUser();
    };
    window.addEventListener('mg_users_updated', handleUsersUpdated);
    return () => window.removeEventListener('mg_users_updated', handleUsersUpdated);
  }, []);

  const refreshUser = useCallback(() => {
    const users = getMockUsers();
    setUser(prev => {
        if (!prev) return null;
        const updatedUser = users.find(u => u.id === prev.id);
        return updatedUser || prev;
    });
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const users = getMockUsers();
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (foundUser && foundUser.isApproved) {
        setUser(foundUser);
        addLog({
          action: 'LOGIN',
          module: 'UTILIZADORES',
          description: `Utilizador ${foundUser.name} (${foundUser.role}) iniciou sessão`,
          entityId: foundUser.id,
          previousValue: null,
          newValue: 'LOGGED_IN'
        }, foundUser);
        setIsLoading(false);
        return true;
    }
    
    setIsLoading(false);
    return false;
  }, []);

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

  const switchUser = useCallback((role: UserRole, name?: string) => {
    const users = getMockUsers();
    // Find by role and optionally name (case-insensitive and trimmed)
    let targetUser = name 
      ? users.find(u => 
          u.role === role && 
          (u.name?.trim().toLowerCase() === name.trim().toLowerCase() || 
           u.username?.trim().toLowerCase() === name.trim().toLowerCase())
        ) 
      : users.find(u => u.role === role);

    // Fallback: if name search failed, just find the first user with that role
    if (!targetUser && name) {
      targetUser = users.find(u => u.role === role);
    }

    if (targetUser) {
        const oldUser = user;
        const newUser = { ...targetUser };
        setUser(newUser); // Use a new object reference to ensure state update
        localStorage.setItem('mg_user', JSON.stringify(newUser));
        
        addLog({
          action: 'SWITCH_USER',
          module: 'SISTEMA',
          description: `Sessão alterada de ${oldUser?.name || 'Ninguém'} para ${targetUser.name}`,
          entityId: targetUser.id,
          previousValue: oldUser?.name,
          newValue: targetUser.name
        }, targetUser);
        return true;
    }
    return false;
  }, [user, addLog]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return false;
    
    const users = getMockUsers();
    const updatedUsers = users.map(u => {
      if (u.id === user.id) {
        return { ...u, ...updates };
      }
      return u;
    });
    
    const { saveMockUsers } = await import('../src/services/mockUsers');
    saveMockUsers(updatedUsers);
    
    // Log PIN change specifically if it happened
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
    switchUser, 
    refreshUser,
    updateUser
  }), [user, isLoading, login, logout, switchUser, refreshUser, updateUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
