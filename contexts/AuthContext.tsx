// contexts/AuthContext.tsx — SEM localStorage para utilizadores
import React, {
  createContext, useContext, useState, useEffect, ReactNode, useCallback,
} from 'react';
import { User, UserRole } from '../types';
import { getUsers, saveUsers, saveUser, onUsersSnapshot } from '../src/services/userStore';
import { DEFAULT_PERMISSIONS } from '../src/utils/permissions';
import { useAudit } from './AuditContext';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  loginByPin: (pin: string) => Promise<boolean>;
  loginError: string;
  register: (data: { name: string; email: string; pin: string; phoneNumber?: string }) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUser: () => void;
  updateUser: (updates: Partial<User>) => Promise<boolean>;
  switchUser: (role: UserRole, name?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const makeTimestamp = () =>
  new Date().toLocaleString('pt-AO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loginError, setLoginError] = useState<string>('');
  const { addLog } = useAudit();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Inicialização — carregar utilizadores do Firestore e restaurar sessão
  useEffect(() => {
    const init = async () => {
      const users = await getUsers();
      setAllUsers(users);

      const raw = localStorage.getItem('mg_user');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const found = users.find(u => u.id === parsed.id);
          if (found && !found.isBanned) {
            setUser(found);
          } else {
            localStorage.removeItem('mg_user');
          }
        } catch {
          localStorage.removeItem('mg_user');
        }
      }
      setIsLoading(false);
    };
    init();

    // Observar mudanças em tempo real
    const unsubscribe = onUsersSnapshot((users) => {
      setAllUsers(users);
      setUser(prev => {
        if (!prev) return null;
        return users.find(u => u.id === prev.id) || null;
      });
    });
    return () => unsubscribe();
  }, []);

  const refreshUser = useCallback(() => {
    setUser(prev => {
      if (!prev) return null;
      return allUsers.find(u => u.id === prev.id) || null;
    });
  }, [allUsers]);

  const login = useCallback(async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 600));

    const found = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!found) {
      setIsLoading(false);
      setLoginError('Email não encontrado. Verifique as suas credenciais.');
      return false;
    }
    if (found.isBanned) {
      setIsLoading(false);
      setLoginError('O teu acesso foi revogado. Contacta o administrador.');
      return false;
    }
    if (!found.isApproved) {
      setIsLoading(false);
      setLoginError('A tua conta está aguardando aprovação pelo administrador.');
      return false;
    }
    if (found.pin !== pass) {
      setIsLoading(false);
      setLoginError('Senha incorrecta. Tenta novamente.');
      return false;
    }

    const updated: User = { ...found, lastLogin: makeTimestamp() };
    await saveUser(updated);
    localStorage.setItem('mg_user', JSON.stringify(updated));
    setUser(updated);
    setLoginError('');
    addLog({ action: 'LOGIN', module: 'UTILIZADORES', description: `${updated.name} iniciou sessão`, entityId: updated.id, previousValue: null, newValue: 'LOGGED_IN' }, updated);
    setIsLoading(false);
    return true;
  }, [allUsers, addLog]);

  const loginByPin = useCallback(async (pin: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 600));

    const found = allUsers.find(u => u.pin === pin);

    if (!found) {
      setIsLoading(false);
      setLoginError('PIN inválido. Tenta novamente.');
      return false;
    }
    if (found.isBanned) {
      setIsLoading(false);
      setLoginError('O teu acesso foi revogado. Contacta o administrador.');
      return false;
    }
    if (!found.isApproved) {
      setIsLoading(false);
      setLoginError('A tua conta está aguardando aprovação pelo administrador.');
      return false;
    }

    const updated: User = { ...found, lastLogin: makeTimestamp() };
    await saveUser(updated);
    localStorage.setItem('mg_user', JSON.stringify(updated));
    setUser(updated);
    setLoginError('');
    addLog({ action: 'LOGIN', module: 'UTILIZADORES', description: `${updated.name} iniciou sessão via PIN`, entityId: updated.id, previousValue: null, newValue: 'LOGGED_IN_PIN' }, updated);
    setIsLoading(false);
    return true;
  }, [allUsers, addLog]);

  const register = useCallback(async (data: { name: string; email: string; pin: string; phoneNumber?: string }): Promise<{ success: boolean; message: string }> => {
    if (allUsers.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
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
      status: 'Ativo',
    };
    await saveUser(newUser);
    localStorage.setItem('mg_user', JSON.stringify(newUser));
    setUser(newUser);
    return { success: true, message: 'Conta criada. Aguarda aprovação do Administrador.' };
  }, [allUsers]);

  const logout = useCallback(() => {
    if (user) {
      addLog({ action: 'LOGOUT', module: 'UTILIZADORES', description: `${user.name} terminou sessão`, entityId: user.id, previousValue: 'LOGGED_IN', newValue: 'LOGGED_OUT' }, user);
    }
    setUser(null);
    localStorage.removeItem('mg_user');
    localStorage.removeItem('mg_biometric_user');
  }, [user, addLog]);

  const updateUser = useCallback(async (updates: Partial<User>): Promise<boolean> => {
    if (!user) return false;
    const updated: User = { ...user, ...updates };
    await saveUser(updated);
    setUser(updated);
    localStorage.setItem('mg_user', JSON.stringify(updated));
    if (updates.pin) {
      addLog({ action: 'USER_PIN_CHANGED', module: 'SEGURANÇA', description: `PIN alterado por ${user.name}`, entityId: user.id, previousValue: '****', newValue: '****' }, user);
      const bio = localStorage.getItem('mg_biometric_user');
      if (bio) {
        try { localStorage.setItem('mg_biometric_user', JSON.stringify({ ...JSON.parse(bio), pin: updates.pin })); } catch {}
      }
    }
    return true;
  }, [user, addLog]);

  const switchUser = useCallback((role: UserRole, name?: string): boolean => {
    const target = name
      ? allUsers.find(u => u.role === role && u.name?.toLowerCase().includes(name.toLowerCase()))
      : allUsers.find(u => u.role === role);
    if (target) { setUser(target); localStorage.setItem('mg_user', JSON.stringify(target)); return true; }
    return false;
  }, [allUsers]);

  const value = React.useMemo(() => ({
    user, isLoading, login, loginByPin, loginError, register, logout, refreshUser, updateUser, switchUser,
  }), [user, isLoading, login, loginByPin, loginError, register, logout, refreshUser, updateUser, switchUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
