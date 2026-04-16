// src/services/userStore.ts — SEM localStorage, usa Firestore directamente
import { db } from '../firebase';
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot
} from 'firebase/firestore';
import { User, UserRole } from '../../types';
import { DEFAULT_PERMISSIONS } from '../utils/permissions';

export const OWNER_ID = 'usr_marguel_proprietario_master';
export const ADMIN_ID = 'usr_marguel_admin_geral';

const USERS_COLLECTION = 'users';

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

// Inicializar utilizadores no Firestore se não existirem
export const initUsers = async (): Promise<void> => {
  for (const user of INITIAL_USERS) {
    const ref = doc(db, USERS_COLLECTION, user.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, user);
    }
  }
};

// Ler todos os utilizadores do Firestore
export const getUsers = async (): Promise<User[]> => {
  const snap = await getDocs(collection(db, USERS_COLLECTION));
  if (snap.empty) {
    await initUsers();
    return INITIAL_USERS;
  }
  return snap.docs.map(d => d.data() as User);
};

// Guardar um utilizador no Firestore
export const saveUser = async (user: User): Promise<void> => {
  await setDoc(doc(db, USERS_COLLECTION, user.id), user);
  window.dispatchEvent(new Event('mg_users_updated'));
};

// Guardar lista completa de utilizadores no Firestore
export const saveUsers = async (users: User[]): Promise<void> => {
  for (const user of users) {
    await setDoc(doc(db, USERS_COLLECTION, user.id), user);
  }
  window.dispatchEvent(new Event('mg_users_updated'));
};

// Observar mudanças em tempo real
export const onUsersSnapshot = (
  callback: (users: User[]) => void
): (() => void) => {
  return onSnapshot(collection(db, USERS_COLLECTION), (snap) => {
    callback(snap.docs.map(d => d.data() as User));
  });
};
