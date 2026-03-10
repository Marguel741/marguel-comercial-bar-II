
import { User, UserRole } from '../../types';
import { DEFAULT_PERMISSIONS } from '../utils/permissions';

export const MOCK_USERS_DB: User[] = [
  { 
    id: '1', name: 'Admin Geral', email: 'admin@marguel.com', role: UserRole.ADMIN_GERAL, isApproved: true, 
    permissions: DEFAULT_PERMISSIONS[UserRole.ADMIN_GERAL]
  },
  { 
    id: '2', name: 'Proprietário', email: 'dono@marguel.com', role: UserRole.PROPRIETARIO, isApproved: true, 
    permissions: DEFAULT_PERMISSIONS[UserRole.PROPRIETARIO]
  },
  { 
    id: '3', name: 'Gerente Loja', email: 'gerente@marguel.com', role: UserRole.GERENTE, isApproved: true, 
    permissions: DEFAULT_PERMISSIONS[UserRole.GERENTE]
  },
  { 
    id: '4', name: 'Colab. Efetivo', email: 'efetivo@marguel.com', role: UserRole.COLABORADOR_EFETIVO, isApproved: true, 
    permissions: DEFAULT_PERMISSIONS[UserRole.COLABORADOR_EFETIVO]
  },
  { 
    id: '5', name: 'Funcionário', email: 'func@marguel.com', role: UserRole.FUNCIONARIO, isApproved: true, 
    permissions: DEFAULT_PERMISSIONS[UserRole.FUNCIONARIO]
  },
  { 
    id: '6', name: 'Analista Remoto', email: 'remoto@marguel.com', role: UserRole.COLABORADOR_REMOTO, isApproved: true, 
    permissions: DEFAULT_PERMISSIONS[UserRole.COLABORADOR_REMOTO]
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
        // CORREÇÃO: Se você quer que mudanças no código reflitam no site atual,
        // mas quer manter a capacidade de editar depois, use um merge inteligente.
        
        const defaultPerms = DEFAULT_PERMISSIONS[u.role];
        
        return {
          ...u,
          // Se o usuário for Proprietário ou Admin, garantimos que ele pegue os defaults 
          // do código para evitar que ele se auto-bloqueie por erro no LocalStorage
          permissions: (u.role === UserRole.PROPRIETARIO || u.role === UserRole.ADMIN_GERAL)
            ? { ...defaultPerms } 
            : (u.permissions || { ...defaultPerms })
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
  
  if (typeof window !== 'undefined') {
    // Notifica o AuthContext para atualizar o usuário logado imediatamente
    const event = new CustomEvent('mg_users_updated');
    window.dispatchEvent(event);
  }
};
