import React, { useState, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import Sidebar from './components/Sidebar';
import { UserPermissions } from './types';
import { hasPermission } from './src/utils/permissions';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuditProvider } from './contexts/AuditContext';
import { ProductProvider } from './contexts/ProductContext';
import { LayoutProvider } from './contexts/LayoutContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';

// ── LAZY PAGES ────────────────────────────────────────────────
const Dashboard      = lazy(() => import('./pages/Dashboard'));
const Sales          = lazy(() => import('./pages/Sales'));
const Inventory      = lazy(() => import('./pages/Inventory'));
const Prices         = lazy(() => import('./pages/Prices'));
const Expenses       = lazy(() => import('./pages/Expenses'));
const AccountStatus  = lazy(() => import('./pages/AccountStatus'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const DirectService  = lazy(() => import('./pages/DirectService'));
const GlobalCalendar = lazy(() => import('./pages/GlobalCalendar'));
const Audit          = lazy(() => import('./pages/Audit'));
const Settings       = lazy(() => import('./pages/Settings'));
const AccessDenied   = lazy(() => import('./pages/AccessDenied'));
const Login          = lazy(() => import('./pages/Login'));
const Register       = lazy(() => import('./pages/Register'));
const PendingApproval = lazy(() => import('./pages/PendingApproval'));
const Banned         = lazy(() => import('./pages/Banned'));
// ─────────────────────────────────────────────────────────────

// ── LOADING FALLBACK ──────────────────────────────────────────
const PageLoader: React.FC = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-[#001A33]">
    <div className="text-center animate-fade-in">
      <div className="w-16 h-16 border-4 border-[#E3007E]/30 border-t-[#E3007E] rounded-full animate-spin mx-auto mb-6" />
      <span
        className="font-sans font-black text-4xl tracking-tighter text-[#E3007E]"
        style={{ filter: 'drop-shadow(0 0 16px rgba(227, 0, 126, 0.5))' }}
      >
        MG
      </span>
      <p className="text-white/40 text-xs uppercase tracking-widest mt-3 animate-pulse">
        A carregar...
      </p>
    </div>
  </div>
);
// ─────────────────────────────────────────────────────────────

// ── ERROR BOUNDARY ────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  state = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary capturou:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 24,
          background: '#fff',
          minHeight: '100vh',
          fontFamily: 'monospace'
        }}>
          <div style={{
            background: '#003366',
            color: '#E3007E',
            padding: '12px 20px',
            borderRadius: 12,
            marginBottom: 20,
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: -1
          }}>
            🔴 ERRO NO SISTEMA — MG
          </div>
          <div style={{
            background: '#fff0f0',
            border: '2px solid #ff4444',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16
          }}>
            <strong style={{ color: '#cc0000' }}>Mensagem:</strong>
            <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', color: '#cc0000', fontSize: 14 }}>
              {(this.state.error as Error).message}
            </pre>
          </div>
          <div style={{
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16
          }}>
            <strong>Stack:</strong>
            <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', fontSize: 11, color: '#333' }}>
              {(this.state.error as Error).stack}
            </pre>
          </div>
          {this.state.errorInfo && (
            <div style={{
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: 12,
              padding: 16,
              marginBottom: 24
            }}>
              <strong>Componente:</strong>
              <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', fontSize: 11, color: '#333' }}>
                {(this.state.errorInfo as React.ErrorInfo).componentStack}
              </pre>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#003366',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '12px 24px',
              fontWeight: 900,
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            🔄 Recarregar App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
// ─────────────────────────────────────────────────────────────

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  permission: keyof UserPermissions;
}> = ({ children, permission }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(user, permission)) return <Navigate to="/access-denied" replace />;
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { user, isLoading } = useAuth();

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return (
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/banned" element={<Banned />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    );
  }

  if (user.isBanned) {
    return (
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="*" element={<Banned />} />
          </Routes>
        </Suspense>
      </Router>
    );
  }

  if (!user.isApproved) {
    return (
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="*" element={<PendingApproval />} />
          </Routes>
        </Suspense>
      </Router>
    );
  }

  return (
    <SettingsProvider>
      <ProductProvider>
          <LayoutProvider>
            <Router>
              <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-hidden">
                <Sidebar />
                <div id="main-content" className="flex-1 overflow-y-auto custom-scrollbar relative">
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/login" element={<Navigate to="/" replace />} />
                      <Route path="/register" element={<Navigate to="/" replace />} />
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/access-denied" element={<AccessDenied />} />
                      <Route path="/direct-service" element={<ProtectedRoute permission="direct_service_view"><DirectService /></ProtectedRoute>} />
                      <Route path="/calendar" element={<ProtectedRoute permission="calendar_view"><GlobalCalendar /></ProtectedRoute>} />
                      <Route path="/sales" element={<ProtectedRoute permission="sales_view"><Sales /></ProtectedRoute>} />
                      <Route path="/inventory" element={<ProtectedRoute permission="inventory_view"><Inventory /></ProtectedRoute>} />
                      <Route path="/prices" element={<ProtectedRoute permission="prices_view"><Prices /></ProtectedRoute>} />
                      <Route path="/expenses" element={<ProtectedRoute permission="expenses_view"><Expenses /></ProtectedRoute>} />
                      <Route path="/account" element={<ProtectedRoute permission="finance_view"><AccountStatus /></ProtectedRoute>} />
                      <Route path="/users" element={<ProtectedRoute permission="admin_users_view"><UserManagement /></ProtectedRoute>} />
                      <Route path="/audit" element={<ProtectedRoute permission="audit_view"><Audit /></ProtectedRoute>} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </div>
              </div>
            </Router>
          </LayoutProvider>
      </ProductProvider>
    </SettingsProvider>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <AuditProvider>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </AuditProvider>
  </ErrorBoundary>
);

export default App;

