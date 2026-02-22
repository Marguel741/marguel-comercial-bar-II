
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory';
import Prices from './pages/Prices';
import Expenses from './pages/Expenses';
import AccountStatus from './pages/AccountStatus';
import UserManagement from './pages/UserManagement';
import DirectService from './pages/DirectService';
import GlobalCalendar from './pages/GlobalCalendar';
import TestCycle from './pages/TestCycle'; // Importação da nova página
import Sidebar from './components/Sidebar';
import { User, UserRole } from './types';
import { ProductProvider } from './contexts/ProductContext';
import { LayoutProvider } from './contexts/LayoutContext';
import { ThemeProvider } from './contexts/ThemeContext';

// --- MOCK DATABASE FOR TESTING ---
const MOCK_USERS_DB: User[] = [
  { 
    id: '1', name: 'Admin Geral', email: 'admin@marguel.com', role: UserRole.ADMIN_GERAL, isApproved: true, 
    permissions: { viewAccountStatus: true, managePrices: true, canDeleteRecords: true, canManageUsers: true, canEditSales: true, canEditInventory: true, canEditExpenses: true, canEditPurchases: true } 
  },
  { 
    id: '2', name: 'Proprietário', email: 'dono@marguel.com', role: UserRole.PROPRIETARIO, isApproved: true, 
    permissions: { viewAccountStatus: true, managePrices: true, canDeleteRecords: true, canManageUsers: true, canEditSales: true, canEditInventory: true, canEditExpenses: true, canEditPurchases: true } 
  },
  { 
    id: '3', name: 'Gerente Loja', email: 'gerente@marguel.com', role: UserRole.GERENTE, isApproved: true, 
    permissions: { viewAccountStatus: true, managePrices: false, canEditSales: true, canEditInventory: true, canEditExpenses: true, canEditPurchases: true } 
  },
  { 
    id: '4', name: 'Colab. Efetivo', email: 'efetivo@marguel.com', role: UserRole.COLABORADOR_EFETIVO, isApproved: true, 
    permissions: { viewAccountStatus: false, managePrices: false, canEditSales: true, canEditInventory: true, canEditExpenses: true, canEditPurchases: false } 
  },
  { 
    id: '5', name: 'Funcionário', email: 'func@marguel.com', role: UserRole.FUNCIONARIO, isApproved: true, 
    permissions: { viewAccountStatus: false, managePrices: false, canEditSales: true, canEditInventory: true, canEditExpenses: true, canEditPurchases: false } 
  },
  { 
    id: '6', name: 'Analista Remoto', email: 'remoto@marguel.com', role: UserRole.COLABORADOR_REMOTO, isApproved: true, 
    permissions: { viewAccountStatus: true, managePrices: false, canEditSales: false, canEditInventory: false, canEditExpenses: false, canEditPurchases: false } // Apenas Leitura
  },
];

// Auth Context
interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  switchUser: (role: UserRole) => void; // Function for dev testing
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  // Initialize with Admin user by default
  const [user, setUser] = useState<User | null>(MOCK_USERS_DB[0]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Splash screen is now handled by video end event
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const foundUser = MOCK_USERS_DB.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (foundUser && foundUser.isApproved) {
        setUser(foundUser);
        setIsLoading(false);
        return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  // Helper for Testing: Switch Roles Instantly
  const switchUser = (role: UserRole) => {
    const targetUser = MOCK_USERS_DB.find(u => u.role === role);
    if (targetUser) {
        setUser(targetUser);
    }
  };

  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} />;

  return (
    <ThemeProvider>
      <AuthContext.Provider value={{ user, login, logout, isLoading, switchUser }}>
        <ProductProvider>
          <LayoutProvider>
            <Router>
              <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-hidden">
                <Sidebar />
                <div id="main-content" className="flex-1 overflow-y-auto custom-scrollbar relative">
                  <Routes>
                    <Route path="/login" element={<Navigate to="/" />} />
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/direct-service" element={<DirectService />} />
                    <Route path="/calendar" element={<GlobalCalendar />} />
                    <Route path="/sales" element={<Sales />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/prices" element={<Prices />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/account" element={<AccountStatus />} />
                    <Route path="/users" element={<UserManagement />} />
                    <Route path="/test-cycle" element={<TestCycle />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </div>
              </div>
            </Router>
          </LayoutProvider>
        </ProductProvider>
      </AuthContext.Provider>
    </ThemeProvider>
  );
};

export default App;
