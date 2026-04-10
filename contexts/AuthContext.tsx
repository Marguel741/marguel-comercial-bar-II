// contexts/AuthContext.tsx — VERSÃO FINAL COMPLETA
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '../types';
import { getUsers, saveUsers } from '../src/services/userStore';
import { DEFAULT_PERMISSIONS } from '../src/utils/permissions';
import { useAudit } from './AuditContext';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  loginByPin: (pin: string) => Promise<boolean>;
  register: (data: { name: string; email: string; pin: string; phoneNumber?: string }) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUser: () => void;
  updateUser: (updates: Partial<User>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { addLog } = useAudit();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const users = getUsers();
    const savedUser = localStorage.getItem('mg_user');

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        const found = users.find(u => u.id === parsed.id);
        if (found && !found.isBanned || (found && found.isApproved)) {
          setUser(found);
        } else if (found) {
          // Utilizador existe mas estado mudou (banido/não aprovado) — recarregar estado actual
          setUser(found);
        } else {
          // ID não existe — sessão inválida
          localStorage.removeItem('mg_user');
        }
      } catch {
        localStorage.removeItem('mg_user');
      }
    }
    // Sem else — sem utilizador guardado = null = vai para login
    setIsLoading(false);

    // Listener para actualizações (ex: admin aprova utilizador)
    const handleUsersUpdated = () => {
      const freshUsers = getUsers();
      setUser(prev => {
        if (!prev) return null;
        return freshUsers.find(u => u.id === prev.id) || null;
      });
    };
    window.addEventListener('mg_users_updated', handleUsersUpdated);
    return () => window.removeEventListener('mg_users_updated', handleUsersUpdated);
  }, []);

  const refreshUser = useCallback(() => {
    const users = getUsers();
    setUser(prev => {
      if (!prev) return null;
      return users.find(u => u.id === prev.id) || null;
    });
  }, []);

  // Login por email + PIN (a "senha" é o PIN neste sistema)
  const login = useCallback(async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const users = getUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (found && found.pin === pass) {
      const updatedUser: User = {
        ...found,
        lastLogin: new Date().toLocaleString('pt-AO', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      };
      saveUsers(users.map(u => u.id === found.id ? updatedUser : u));
      localStorage.setItem('mg_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      addLog({
        action: 'LOGIN', module: 'UTILIZADORES',
        description: `${updatedUser.name} (${updatedUser.role}) iniciou sessão`,
        entityId: updatedUser.id, previousValue: null, newValue: 'LOGGED_IN'
      }, updatedUser);
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  }, [addLog]);

  // Login só por PIN (sem email)
  const loginByPin = useCallback(async (pin: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const users = getUsers();
    const found = users.find(u => u.pin === pin && u.isApproved && !u.isBanned);

    if (found) {
      const updatedUser: User = {
        ...found,
        lastLogin: new Date().toLocaleString('pt-AO', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      };
      saveUsers(users.map(u => u.id === found.id ? updatedUser : u));
      localStorage.setItem('mg_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      addLog({
        action: 'LOGIN', module: 'UTILIZADORES',
        description: `${updatedUser.name} iniciou sessão via PIN`,
        entityId: updatedUser.id, previousValue: null, newValue: 'LOGGED_IN_PIN'
      }, updatedUser);
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  }, [addLog]);

  // Registo de novo utilizador
  const register = useCallback(async (data: {
    name: string; email: string; pin: string; phoneNumber?: string
  }): Promise<{ success: boolean; message: string }> => {
    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { success: false, message: 'Este email já está registado.' };
    }
    if (data.pin.length < 4) {
      return { success: false, message: 'O PIN deve ter pelo menos 4 dígitos.' };
    }

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      pin: data.pin,
      role: UserRole.FUNCIONARIO,
      isApproved: false,
      isBanned: false,
      permissions: DEFAULT_PERMISSIONS[UserRole.FUNCIONARIO],
      createdAt: new Date().toLocaleDateString('pt-AO'),
      lastLogin: '',
      phoneNumber: data.phoneNumber || '',
      secondaryPhoneNumber: '',
      associatedEmail: data.email.toLowerCase().trim(),
      status: 'Ativo'
    };

    saveUsers([...users, newUser]);
    // Guardar sessão de pending
    localStorage.setItem('mg_user', JSON.stringify(newUser));
    setUser(newUser);
    return { success: true, message: 'Conta criada. Aguarda aprovação.' };
  }, []);

  const logout = useCallback(() => {
    if (user) {
      addLog({
        action: 'LOGOUT', module: 'UTILIZADORES',
        description: `${user.name} terminou sessão`,
        entityId: user.id, previousValue: 'LOGGED_IN', newValue: 'LOGGED_OUT'
      }, user);
    }
    setUser(null);
    localStorage.removeItem('mg_user');
    localStorage.removeItem('mg_biometric_user');
  }, [user, addLog]);

  const updateUser = useCallback(async (updates: Partial<User>): Promise<boolean> => {
    if (!user) return false;
    const users = getUsers();
    const updatedUser = { ...user, ...updates };
    saveUsers(users.map(u => u.id === user.id ? updatedUser : u));
    setUser(updatedUser);
    localStorage.setItem('mg_user', JSON.stringify(updatedUser));
    if (updates.pin) {
      addLog({
        action: 'USER_PIN_CHANGED', module: 'SEGURANÇA',
        description: `PIN alterado pelo utilizador ${user.name}`,
        entityId: user.id, previousValue: '****', newValue: '****'
      }, user);
      // Actualizar associação biométrica
      const bio = localStorage.getItem('mg_biometric_user');
      if (bio) {
        localStorage.setItem('mg_biometric_user', JSON.stringify({
          ...JSON.parse(bio), pin: updates.pin
        }));
      }
    }
    return true;
  }, [user, addLog]);

  return (
    <AuthContext.Provider value={{
      user, isLoading, login, loginByPin, register, logout, refreshUser, updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};
