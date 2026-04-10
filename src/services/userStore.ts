// src/services/userStore.ts
import { User, UserRole } from '../../types';
import { DEFAULT_PERMISSIONS } from '../utils/permissions';

const STORAGE_KEY = 'mg_users';

// IDs fixos para garantir consistência entre sessões
const OWNER_ID = 'usr_proprietario_marguel_001';
const ADMIN_ID = 'usr_admin_geral_001';

const INITIAL_USERS: User[] = [
  {
    id: OWNER_ID,
    name: 'Proprietário Marguel',
    username: 'marguel',
    email: 'dono@marguel.com',
    pin: '1234',
    role: UserRole.PROPRIETARIO,
    isApproved: true,
    isBanned: false,
    permissions: DEFAULT_PERMISSIONS[UserRole.PROPRIETARIO],
    createdAt: new Date().toLocaleDateString('pt-AO'),
    lastLogin: '',
    phoneNumber: '',
    secondaryPhoneNumber: '',
    associatedEmail: 'dono@marguel.com',
    status: 'Ativo'
  },
  {
    id: ADMIN_ID,
    name: 'Admin Geral',
    username: 'admin',
    email: 'admin@marguel.com',
    pin: '0000',
    role: UserRole.ADMIN_GERAL,
    isApproved: true,
    isBanned: false,
    permissions: DEFAULT_PERMISSIONS[UserRole.ADMIN_GERAL],
    createdAt: new Date().toLocaleDateString('pt-AO'),
    lastLogin: '',
    phoneNumber: '',
    secondaryPhoneNumber: '',
    associatedEmail: 'admin@marguel.com',
    status: 'Ativo'
  }
];

export const getUsers = (): User[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  // Primeira vez — inicializa com utilizadores padrão
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_USERS));
  return INITIAL_USERS;
};

export const saveUsers = (users: User[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  window.dispatchEvent(new Event('mg_users_updated'));
};
