// ============================================================
// src/services/userStore.ts — VERSÃO FINAL COMPLETA
// IDs FIXOS — nunca mudam entre deploys (biometria funciona)
// Colar directamente no GitHub: seleccionar tudo e substituir
// ============================================================
import { User, UserRole } from '../../types';
import { DEFAULT_PERMISSIONS } from '../utils/permissions';

const STORAGE_KEY = 'mg_users';

// IDs permanentes — NÃO alterar nunca (biometria depende destes IDs)
export const OWNER_ID = 'usr_marguel_proprietario_master';
export const ADMIN_ID = 'usr_marguel_admin_geral';

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
    createdAt: '01/01/2025',
    lastLogin: '',
    phoneNumber: '',
    secondaryPhoneNumber: '',
    associatedEmail: 'dono@marguel.com',
    status: 'Ativo',
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
    createdAt: '01/01/2025',
    lastLogin: '',
    phoneNumber: '',
    secondaryPhoneNumber: '',
    associatedEmail: 'admin@marguel.com',
    status: 'Ativo',
  },
];

export const getUsers = (): User[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // localStorage corrompido — reiniciar
  }
  // Primeira vez ou dados corrompidos — usar utilizadores iniciais
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_USERS));
  return INITIAL_USERS;
};

export const saveUsers = (users: User[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  window.dispatchEvent(new Event('mg_users_updated'));
};
