
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
import SplashGenerator from './pages/SplashGenerator';
import AccessDenied from './pages/AccessDenied';
import Sidebar from './components/Sidebar';
import { User, UserRole, UserPermissions } from './types';
import { DEFAULT_PERMISSIONS, hasPermission } from './src/utils/permissions';
import { ProductProvider } from './contexts/ProductContext';
import { FinanceProvider } from './contexts/FinanceContext';
import { LayoutProvider } from './contexts/LayoutContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { getMockUsers, saveMockUsers } from './src/services/mockUsers';

// Auth Context
interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  switchUser: (role: UserRole) => void; // Function for dev testing
  refreshUser: () => void; // Function to refresh current user's permissions
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode, permission: keyof UserPermissions }> = ({ children, permission }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  
  if (!hasPermission(user, permission)) {
    return <Navigate to="/access-denied" />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  // Initialize with Admin user by default
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize user from mock DB
    const users = getMockUsers();
    setUser(users[0]); // Default to first user (Admin)
    
    // Listen for user updates to refresh current session
    const handleUsersUpdated = () => {
        refreshUser();
    };
    window.addEventListener('mg_users_updated', handleUsersUpdated);
    return () => window.removeEventListener('mg_users_updated', handleUsersUpdated);
  }, []);

  const refreshUser = () => {
    if (!user) return;
    const users = getMockUsers();
    const updatedUser = users.find(u => u.id === user.id);
    if (updatedUser) {
        setUser(updatedUser);
    }
  };

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const users = getMockUsers();
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
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
    const users = getMockUsers();
    const targetUser = users.find(u => u.role === role);
    if (targetUser) {
        setUser(targetUser);
    }
  };

  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} />;

  return (
    <ThemeProvider>
      <AuthContext.Provider value={{ user, login, logout, isLoading, switchUser, refreshUser }}>
        <ProductProvider>
          <FinanceProvider>
            <LayoutProvider>
              <Router>
                <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-hidden">
                  <Sidebar />
                  <div id="main-content" className="flex-1 overflow-y-auto custom-scrollbar relative">
                    <Routes>
                      <Route path="/login" element={<Navigate to="/" />} />
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/access-denied" element={<AccessDenied />} />
                      
                      <Route path="/direct-service" element={
                        <ProtectedRoute permission="direct_service_view">
                          <DirectService />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/calendar" element={
                        <ProtectedRoute permission="calendar_view">
                          <GlobalCalendar />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/sales" element={
                        <ProtectedRoute permission="sales_view">
                          <Sales />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/inventory" element={
                        <ProtectedRoute permission="inventory_view">
                          <Inventory />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/prices" element={
                        <ProtectedRoute permission="prices_view">
                          <Prices />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/expenses" element={
                        <ProtectedRoute permission="expenses_view">
                          <Expenses />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/account" element={
                        <ProtectedRoute permission="finance_view">
                          <AccountStatus />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/users" element={
                        <ProtectedRoute permission="admin_users_view">
                          <UserManagement />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/test-cycle" element={<TestCycle />} />
                      <Route path="/generate-splash" element={<SplashGenerator />} />
                      <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                  </div>
                </div>
              </Router>
            </LayoutProvider>
          </FinanceProvider>
        </ProductProvider>
      </AuthContext.Provider>
    </ThemeProvider>
  );
};

export default App;
