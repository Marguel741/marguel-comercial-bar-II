
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
import SplashGenerator from './pages/SplashGenerator';
import Audit from './pages/Audit';
import TestCycle from './pages/TestCycle';
import Settings from './pages/Settings';
import AccessDenied from './pages/AccessDenied';
import Sidebar from './components/Sidebar';
import { User, UserRole, UserPermissions } from './types';
import { DEFAULT_PERMISSIONS, hasPermission } from './src/utils/permissions';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuditProvider } from './contexts/AuditContext';
import { ProductProvider } from './contexts/ProductContext';
import { FinanceProvider } from './contexts/FinanceContext';
import { LayoutProvider } from './contexts/LayoutContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { getMockUsers, saveMockUsers } from './src/services/mockUsers';
import { AlertTriangle } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode, permission: keyof UserPermissions }> = ({ children, permission }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  
  if (!hasPermission(user, permission)) {
    return <Navigate to="/access-denied" />;
  }
  
  return <>{children}</>;
};

const MaintenanceGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { maintenanceMode } = useSettings();

  const isAdmin = user?.role === UserRole.ADMIN_GERAL || user?.role === UserRole.PROPRIETARIO;

  if (maintenanceMode && !isAdmin) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
        <div className="p-6 bg-amber-500/20 rounded-full mb-6">
          <AlertTriangle size={64} className="text-amber-500 animate-pulse" />
        </div>
        <h1 className="text-4xl font-black tracking-tighter uppercase mb-4">Sistema em Manutenção</h1>
        <p className="text-slate-400 max-w-md text-lg">
          O sistema está temporariamente em manutenção para melhorias técnicas. 
          Por favor, tente novamente em alguns minutos.
        </p>
        <div className="mt-12 text-slate-500 text-xs uppercase tracking-widest font-bold">
          Marguel ERP Systems
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { user, isLoading } = useAuth();

  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} />;

  // NOVA TRAVA: Se o AuthContext ainda está lendo o localStorage, não renderiza os Providers filhos
  if (isLoading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white font-black tracking-tighter text-2xl animate-pulse">Carregando permissões...</div>;

  return (
    <ThemeProvider>
      <SettingsProvider>
        <MaintenanceGuard>
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
                        
                        <Route path="/audit" element={
                          <ProtectedRoute permission="audit_view">
                            <Audit />
                          </ProtectedRoute>
                        } />

                        <Route path="/test-cycle" element={
                          <ProtectedRoute permission="admin_global_admin">
                            <TestCycle />
                          </ProtectedRoute>
                        } />
                        
                        <Route path="/settings" element={<Settings />} />
                        
                        <Route path="/generate-splash" element={<SplashGenerator />} />
                        <Route path="*" element={<Navigate to="/" />} />
                      </Routes>
                    </div>
                  </div>
                </Router>
              </LayoutProvider>
            </FinanceProvider>
          </ProductProvider>
        </MaintenanceGuard>
      </SettingsProvider>
    </ThemeProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuditProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AuditProvider>
  );
};

export default App;
