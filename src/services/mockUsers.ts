
import { User, UserRole } from '../../types';
import { DEFAULT_PERMISSIONS } from '../utils/permissions';
import { dispatchCustomEvent } from '../utils';

export const MOCK_USERS_DB: User[] = [
  { 
    id: '1', name: 'Admin Geral', username: 'admin', email: 'admin@marguel.com', role: UserRole.ADMIN_GERAL, isApproved: true, 
    permissions: DEFAULT_PERMISSIONS[UserRole.ADMIN_GERAL],
    phoneNumber: '923 456 789',
    secondaryPhoneNumber: '912 345 678',
    associatedEmail: 'admin.suporte@marguel.com',
    createdAt: '2025-01-15',
    lastLogin: '2026-03-25 10:30',
    status: 'Ativo'
  },
  { 
    id: '2', name: 'Marguel (Dono)', username: 'proprietario', email: 'dono@marguel.com', role: UserRole.PROPRIETARIO, isApproved: true, 
    permissions: DEFAULT_PERMISSIONS[UserRole.PROPRIETARIO],
    phoneNumber: '931 000 111',
    secondaryPhoneNumber: '944 555 666',
    associatedEmail: 'marguel.cgps@marguel.com',
    createdAt: '2024-12-01',
    lastLogin: '2026-03-26 08:00',
    status: 'Ativo'
  },
  { 
    id: '3', name: 'Gerente', username: 'gerente', email: 'gerente@marguel.com', role: UserRole.GERENTE, isApproved: true, 
    permissions: DEFAULT_PERMISSIONS[UserRole.GERENTE],
    phoneNumber: '925 111 222',
    createdAt: '2025-02-10',
    lastLogin: '2026-03-24 15:45',
    status: 'Ativo'
  },
  { 
    id: '4', name: 'Colaborador Efetivo', username: 'efetivo', email: 'efetivo@marguel.com', role: UserRole.COLABORADOR_EFETIVO, isApproved: true, 
    permissions: DEFAULT_PERMISSIONS[UserRole.COLABORADOR_EFETIVO],
    phoneNumber: '927 333 444',
    createdAt: '2025-03-01',
    lastLogin: '2026-03-25 09:15',
    status: 'Ativo'
  },
  { 
    id: '5', name: 'Funcionário', username: 'funcionario', email: 'func@marguel.com', role: UserRole.FUNCIONARIO, isApproved: true, 
    permissions: DEFAULT_PERMISSIONS[UserRole.FUNCIONARIO],
    phoneNumber: '929 555 666',
    createdAt: '2025-03-10',
    lastLogin: '2026-03-26 07:30',
    status: 'Ativo'
  },
  { 
    id: '6', name: 'Analista Remoto', username: 'remoto', email: 'remoto@marguel.com', role: UserRole.COLABORADOR_REMOTO, isApproved: true, 
    permissions: DEFAULT_PERMISSIONS[UserRole.COLABORADOR_REMOTO],
    phoneNumber: '933 777 888',
    createdAt: '2025-03-15',
    lastLogin: '2026-03-25 22:00',
    status: 'Ativo'
  },
];

// In a real app, this would be a database. For this mock, we'll use local storage to persist changes.
const STORAGE_KEY = 'mg_users_db';

export const getMockUsers = (): User[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  
  if (saved) {
    try {
      const users = JSON.parse(saved) as User[];
      
      return users.map(u => {
        const defaultPerms = DEFAULT_PERMISSIONS[u.role];
        
        return {
          ...u,
          // Garante que novas permissões adicionadas ao código (como sales_closure) 
          // existam mesmo para usuários já salvos no LocalStorage, mantendo overrides manuais.
          permissions: { ...defaultPerms, ...(u.permissions || {}) }
        };
      });
    } catch (e) {
      console.error("Erro ao ler LocalStorage, resetando para DB padrão", e);
      return MOCK_USERS_DB;
    }
  }
  
  // Se não houver nada no LocalStorage, salva o padrão pela primeira vez
  saveMockUsers(MOCK_USERS_DB);
  return MOCK_USERS_DB;
};

export const saveMockUsers = (users: User[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  
  // Notifica o AuthContext para atualizar o usuário logado imediatamente
  dispatchCustomEvent('mg_users_updated');
};
