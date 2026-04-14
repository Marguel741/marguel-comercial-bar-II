// ============================================================
// contexts/AuthContext.tsx — VERSÃO FINAL COMPLETA
// Colar directamente no GitHub: seleccionar tudo e substituir
// ============================================================
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { User, UserRole } from '../types';
import { getUsers, saveUsers } from '../src/services/userStore';
import { DEFAULT_PERMISSIONS } from '../src/utils/permissions';
import { useAudit } from './AuditContext';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  loginByPin: (pin: string) => Promise<boolean>;
  register: (data: {
    name: string;
    email: string;
    pin: string;
    phoneNumber?: string;
  }) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUser: () => void;
  updateUser: (updates: Partial<User>) => Promise<boolean>;
  // Mantido para compatibilidade com código legado (não faz nada danoso)
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
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { addLog } = useAudit();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicialização — restaurar sessão guardada
  useEffect(() => {
    const users = getUsers();
    const raw = localStorage.getItem('mg_user');

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const found = users.find((u) => u.id === parsed.id);
        if (found) {
          setUser(found);
        } else {
          // ID não existe na base — sessão inválida
          localStorage.removeItem('mg_user');
        }
      } catch {
        localStorage.removeItem('mg_user');
      }
    }
    // SEM setUser(users[0]) — utilizador deve fazer login explicitamente

    setIsLoading(false);

    // Actualizar sessão quando outro tab/componente alterar utilizadores
    const handleUpdate = () => {
      const fresh = getUsers();
      setUser((prev) => {
        if (!prev) return null;
        return fresh.find((u) => u.id === prev.id) || null;
      });
    };
    window.addEventListener('mg_users_updated', handleUpdate);
    return () => window.removeEventListener('mg_users_updated', handleUpdate);
  }, []);

  const refreshUser = useCallback(() => {
    const users = getUsers();
    setUser((prev) => {
      if (!prev) return null;
      return users.find((u) => u.id === prev.id) || null;
    });
  }, []);

  // Login por email + senha (a senha É o PIN neste sistema)
  const login = useCallback(
    async (email: string, pass: string): Promise<boolean> => {
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 600));

      const users = getUsers();
      const found = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );

      if (found && found.pin === pass) {
        const updated: User = { ...found, lastLogin: makeTimestamp() };
        saveUsers(users.map((u) => (u.id === found.id ? updated : u)));
        localStorage.setItem('mg_user', JSON.stringify(updated));
        setUser(updated);
        addLog(
          {
            action: 'LOGIN',
            module: 'UTILIZADORES',
            description: `${updated.name} (${updated.role}) iniciou sessão`,
            entityId: updated.id,
            previousValue: null,
            newValue: 'LOGGED_IN',
          },
          updated
        );
        setIsLoading(false);
        return true;
      }

      setIsLoading(false);
      return false;
    },
    [addLog]
  );

  // Login só por PIN (sem email)
  const loginByPin = useCallback(
    async (pin: string): Promise<boolean> => {
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 600));

      const users = getUsers();
      const found = users.find(
        (u) => u.pin === pin && u.isApproved && !u.isBanned
      );

      if (found) {
        const updated: User = { ...found, lastLogin: makeTimestamp() };
        saveUsers(users.map((u) => (u.id === found.id ? updated : u)));
        localStorage.setItem('mg_user', JSON.stringify(updated));
        setUser(updated);
        addLog(
          {
            action: 'LOGIN',
            module: 'UTILIZADORES',
            description: `${updated.name} iniciou sessão via PIN`,
            entityId: updated.id,
            previousValue: null,
            newValue: 'LOGGED_IN_PIN',
          },
          updated
        );
        setIsLoading(false);
        return true;
      }

      setIsLoading(false);
      return false;
    },
    [addLog]
  );

  // Registo de novo utilizador — fica pendente de aprovação
  const register = useCallback(
    async (data: {
      name: string;
      email: string;
      pin: string;
      phoneNumber?: string;
    }): Promise<{ success: boolean; message: string }> => {
      const users = getUsers();

      if (
        users.find(
          (u) => u.email.toLowerCase() === data.email.toLowerCase()
        )
      ) {
        return { success: false, message: 'Este email já está registado.' };
      }
      if (data.pin.length < 4) {
        return {
          success: false,
          message: 'O PIN deve ter pelo menos 4 dígitos.',
        };
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

      saveUsers([...users, newUser]);
      // Guardar sessão pendente para mostrar PendingApproval
      localStorage.setItem('mg_user', JSON.stringify(newUser));
      setUser(newUser);
      return {
        success: true,
        message: 'Conta criada. Aguarda aprovação do Administrador.',
      };
    },
    []
  );

  const logout = useCallback(() => {
    if (user) {
      addLog(
        {
          action: 'LOGOUT',
          module: 'UTILIZADORES',
          description: `${user.name} terminou sessão`,
          entityId: user.id,
          previousValue: 'LOGGED_IN',
          newValue: 'LOGGED_OUT',
        },
        user
      );
    }
    setUser(null);
    localStorage.removeItem('mg_user');
    localStorage.removeItem('mg_biometric_user');
  }, [user, addLog]);

  const updateUser = useCallback(
    async (updates: Partial<User>): Promise<boolean> => {
      if (!user) return false;

      const users = getUsers();
      const updated: User = { ...user, ...updates };
      saveUsers(users.map((u) => (u.id === user.id ? updated : u)));
      setUser(updated);
      localStorage.setItem('mg_user', JSON.stringify(updated));

      if (updates.pin) {
        addLog(
          {
            action: 'USER_PIN_CHANGED',
            module: 'SEGURANÇA',
            description: `PIN alterado pelo utilizador ${user.name}`,
            entityId: user.id,
            previousValue: '****',
            newValue: '****',
          },
          user
        );
        // Manter biometria sincronizada com novo PIN
        const bio = localStorage.getItem('mg_biometric_user');
        if (bio) {
          try {
            localStorage.setItem(
              'mg_biometric_user',
              JSON.stringify({ ...JSON.parse(bio), pin: updates.pin })
            );
          } catch {
            // ignorar
          }
        }
      }
      return true;
    },
    [user, addLog]
  );

  // switchUser mantido apenas para compatibilidade com código legado
  // Não deve ser usado — remove-se numa versão futura
  const switchUser = useCallback(
    (role: UserRole, name?: string): boolean => {
      const users = getUsers();
      const target = name
        ? users.find(
            (u) =>
              u.role === role &&
              u.name?.toLowerCase().includes(name.toLowerCase())
          )
        : users.find((u) => u.role === role);
      if (target) {
        setUser(target);
        localStorage.setItem('mg_user', JSON.stringify(target));
        return true;
      }
      return false;
    },
    []
  );

  const value = React.useMemo(
    () => ({
      user,
      isLoading,
      login,
      loginByPin,
      register,
      logout,
      refreshUser,
      updateUser,
      switchUser,
    }),
    [
      user,
      isLoading,
      login,
      loginByPin,
      register,
      logout,
      refreshUser,
      updateUser,
      switchUser,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};
