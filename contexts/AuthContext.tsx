// contexts/AuthContext.tsx
import React, {
  createContext, useContext, useState, useEffect, ReactNode, useCallback,
} from 'react';
import { User, UserRole } from '../types';
import { saveUser, onUsersSnapshot } from '../src/services/userStore';
import { DEFAULT_PERMISSIONS } from '../src/utils/permissions';
import { useAudit } from './AuditContext';
import { db } from '../src/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  usersReady: boolean;
  login: (email: string, pass: string) => Promise<string | null>;
  loginByPin: (pin: string) => Promise<string | null>;
  loginError: string;
  register: (data: { name: string; email: string; pin: string; phoneNumber?: string }) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUser: () => void;
  updateUser: (updates: Partial<User>) => Promise<boolean>;
  switchUser: (role: UserRole, name?: string) => boolean;
  generateRecoveryCode: (userId: string, userName: string) => Promise<string | null>;
  validateRecoveryCode: (userName: string, code: string) => Promise<{ valid: boolean; userId: string | null; message: string }>;
  resetPinWithCode: (userId: string, code: string, newPin: string) => Promise<string | null>;
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

const generateCode = (): string => {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MG-${num}`;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loginError, setLoginError] = useState<string>('');
  const { addLog } = useAudit();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usersReady, setUsersReady] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    const unsubscribe = onUsersSnapshot((users) => {
      setAllUsers(users);

      if (!usersReady && users.length > 0) {
        setUsersReady(true);

        const raw = localStorage.getItem('mg_user');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const found = users.find(u => u.id === parsed.id);
           if (found && !found.isBanned && found.isApproved) {
              setUser(found);
            } else {
              localStorage.removeItem('mg_user');
            }
          } catch {
            localStorage.removeItem('mg_user');
          }
        }
        setIsLoading(false);
      }

      setUser(prev => {
        if (!prev) return null;
        const found = users.find(u => u.id === prev.id);
        if (!found || found.isBanned) {
          localStorage.removeItem('mg_user');
          return null;
        }
        return found;
      });
    });

    const timeout = setTimeout(() => {
      if (!usersReady) setIsLoading(false);
    }, 5000);

    return () => { unsubscribe(); clearTimeout(timeout); };
  }, []);

  const refreshUser = useCallback(() => {
    setUser(prev => {
      if (!prev) return null;
      return allUsers.find(u => u.id === prev.id) || null;
    });
  }, [allUsers]);

  const login = useCallback(async (email: string, pass: string): Promise<string | null> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 600));

    if (allUsers.length === 0) {
      setIsLoading(false);
      const msg = 'Sistema a carregar. Tenta novamente em segundos.';
      setLoginError(msg); return msg;
    }

    const found = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) { setIsLoading(false); const msg = 'Email não encontrado. Verifique as suas credenciais.'; setLoginError(msg); return msg; }
    if (found.isBanned) { setIsLoading(false); const msg = 'O teu acesso foi revogado. Contacta o administrador.'; setLoginError(msg); return msg; }
    if (!found.isApproved) { setIsLoading(false); const msg = 'A tua conta está aguardando aprovação pelo administrador.'; setLoginError(msg); return msg; }
    if (found.pin !== pass) { setIsLoading(false); const msg = 'Senha incorrecta. Tenta novamente.'; setLoginError(msg); return msg; }

    const updated: User = { ...found, lastLogin: makeTimestamp() };
    await saveUser(updated);
    localStorage.setItem('mg_user', JSON.stringify(updated));
    setUser(updated);
    setLoginError('');
    addLog({ action: 'LOGIN', module: 'UTILIZADORES', description: `${updated.name} iniciou sessão`, entityId: updated.id, previousValue: null, newValue: 'LOGGED_IN' }, updated);
    setIsLoading(false);
    return null;
  }, [allUsers, addLog]);

  const loginByPin = useCallback(async (pin: string): Promise<string | null> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 600));

    if (allUsers.length === 0) {
      setIsLoading(false);
      const msg = 'Sistema a carregar. Tenta novamente em segundos.';
      setLoginError(msg); return msg;
    }

    const found = allUsers.find(u => u.pin === pin);
    if (!found) { setIsLoading(false); const msg = 'PIN inválido. Tenta novamente.'; setLoginError(msg); return msg; }
    if (found.isBanned) { setIsLoading(false); const msg = 'O teu acesso foi revogado. Contacta o administrador.'; setLoginError(msg); return msg; }
    if (!found.isApproved) { setIsLoading(false); const msg = 'A tua conta está aguardando aprovação pelo administrador.'; setLoginError(msg); return msg; }

    const updated: User = { ...found, lastLogin: makeTimestamp() };
    await saveUser(updated);
    localStorage.setItem('mg_user', JSON.stringify(updated));
    setUser(updated);
    setLoginError('');
    addLog({ action: 'LOGIN', module: 'UTILIZADORES', description: `${updated.name} iniciou sessão via PIN`, entityId: updated.id, previousValue: null, newValue: 'LOGGED_IN_PIN' }, updated);
    setIsLoading(false);
    return null;
  }, [allUsers, addLog]);

  // ── RECUPERAÇÃO DE CREDENCIAIS ──────────────────────────────

  const generateRecoveryCode = useCallback(async (userId: string, userName: string): Promise<string | null> => {
    try {
      const q = query(collection(db, 'recovery_codes'), where('userId', '==', userId));
      const existing = await getDocs(q);
      await Promise.all(existing.docs.map(d => deleteDoc(doc(db, 'recovery_codes', d.id))));

      const code = generateCode();
      const expiresAt = Date.now() + 30 * 60 * 1000;

      await addDoc(collection(db, 'recovery_codes'), {
        userId,
        userName,
        code,
        expiresAt,
        used: false,
        generatedBy: user?.name || 'Admin',
        generatedAt: Date.now(),
      });

      addLog({
        action: 'RECOVERY_CODE_GENERATED',
        module: 'SEGURANÇA',
        description: `Código de recuperação gerado para ${userName} por ${user?.name}`,
        entityId: userId,
        previousValue: null,
        newValue: code,
      }, user!);

      return code;
    } catch (error) {
      console.error('Erro ao gerar código:', error);
      return null;
    }
  }, [user, addLog]);

  const validateRecoveryCode = useCallback(async (userName: string, code: string): Promise<{ valid: boolean; userId: string | null; message: string }> => {
    try {
      const q = query(
        collection(db, 'recovery_codes'),
        where('code', '==', code.toUpperCase()),
        where('used', '==', false)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { valid: false, userId: null, message: 'Código inválido ou já utilizado.' };
      }

      const docRef = snapshot.docs[0];
      const data = docRef.data();

      if (!data.userName.toLowerCase().includes(userName.toLowerCase())) {
        return { valid: false, userId: null, message: 'Nome não corresponde ao código.' };
      }

      if (Date.now() > data.expiresAt) {
        await deleteDoc(doc(db, 'recovery_codes', docRef.id));
        return { valid: false, userId: null, message: 'Código expirado. Pede um novo ao administrador.' };
      }

      // SEC-8: Marcar código como usado imediatamente após validação
      await updateDoc(doc(db, 'recovery_codes', docRef.id), {
        used: true,
        usedAt: Date.now(),
      });

      return { valid: true, userId: data.userId, message: 'Código válido!' };
    } catch (error) {
      console.error('Erro ao validar código:', error);
      return { valid: false, userId: null, message: 'Erro ao validar. Tenta novamente.' };
    }
  }, []);

  const resetPinWithCode = useCallback(async (userId: string, code: string, newPin: string): Promise<string | null> => {
    try {
      if (newPin.length < 4) return 'O PIN deve ter pelo menos 4 dígitos.';

      const targetUser = allUsers.find(u => u.id === userId);
      if (!targetUser) return 'Utilizador não encontrado.';

      // Apagar código usado (já marcado como used:true — apaga para limpeza)
      const q = query(collection(db, 'recovery_codes'), where('code', '==', code.toUpperCase()));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await deleteDoc(doc(db, 'recovery_codes', snapshot.docs[0].id));
      }

      const updated: User = { ...targetUser, pin: newPin, lastLogin: makeTimestamp() };
      await saveUser(updated);
      localStorage.setItem('mg_user', JSON.stringify(updated));
      setUser(updated);

      addLog({
        action: 'PIN_RESET_VIA_CODE',
        module: 'SEGURANÇA',
        description: `PIN de ${targetUser.name} redefinido via código de recuperação`,
        entityId: userId,
        previousValue: '****',
        newValue: '****',
      }, updated);

      return null;
    } catch (error) {
      console.error('Erro ao redefinir PIN:', error);
      return 'Erro ao redefinir PIN. Tenta novamente.';
    }
  }, [allUsers, addLog]);

  // ───────────────────────────────────────────────────────────

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
    user, isLoading, usersReady, login, loginByPin, loginError, register, logout, refreshUser, updateUser, switchUser,
    generateRecoveryCode, validateRecoveryCode, resetPinWithCode,
  }), [user, isLoading, usersReady, login, loginByPin, loginError, register, logout, refreshUser, updateUser, switchUser,
    generateRecoveryCode, validateRecoveryCode, resetPinWithCode]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
