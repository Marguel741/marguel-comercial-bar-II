
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '../types';
import { getMockUsers } from '../src/services/mockUsers';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  switchUser: (role: UserRole) => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize user from mock DB
    const users = getMockUsers();
    setUser(users[0]); // Default to first user (Admin)
    
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
        setIsLoading(false);
        return true;
    }
    
    setIsLoading(false);
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const switchUser = useCallback((role: UserRole) => {
    const users = getMockUsers();
    const targetUser = users.find(u => u.role === role);
    if (targetUser) {
        setUser(targetUser);
    }
  }, []);

  const value = React.useMemo(() => ({ 
    user, 
    login, 
    logout, 
    isLoading, 
    switchUser, 
    refreshUser 
  }), [user, isLoading, login, logout, switchUser, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
