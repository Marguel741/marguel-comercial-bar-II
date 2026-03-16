
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useAudit } from './AuditContext';

export type DiagnosticMode = 'ALWAYS' | 'ERROR' | 'NEVER';

interface SettingsContextType {
  idleTimeout: number; // in seconds, 0 means Never
  setIdleTimeout: (timeout: number) => void;
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  uiEffectsEnabled: boolean;
  setUiEffectsEnabled: (enabled: boolean) => void;
  diagnosticReportingMode: DiagnosticMode;
  setDiagnosticReportingMode: (mode: DiagnosticMode) => void;
  usageAnalyticsEnabled: boolean;
  setUsageAnalyticsEnabled: (enabled: boolean) => void;
  lastSyncDate: string;
  setLastSyncDate: (date: string) => void;
  isOnline: boolean;
  maintenanceMode: boolean;
  setMaintenanceMode: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { addLog } = useAudit();

  const [idleTimeout, setIdleTimeoutState] = useState<number>(() => {
    return Number(localStorage.getItem('system_idle_timeout')) || 0;
  });

  const [biometricEnabled, setBiometricEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('biometric_enabled') === 'true';
  });

  const [uiEffectsEnabled, setUiEffectsEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('ui_effects_enabled');
    return saved === null ? true : saved === 'true';
  });

  const [diagnosticReportingMode, setDiagnosticReportingModeState] = useState<DiagnosticMode>(() => {
    return (localStorage.getItem('diagnostic_reporting_mode') as DiagnosticMode) || 'ERROR';
  });

  const [usageAnalyticsEnabled, setUsageAnalyticsEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('usage_analytics_enabled') !== 'false';
  });

  const [lastSyncDate, setLastSyncDateState] = useState<string>(() => {
    return localStorage.getItem('last_sync_date') || new Date().toLocaleString();
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [maintenanceMode, setMaintenanceModeState] = useState<boolean>(() => {
    return localStorage.getItem('maintenance_mode_enabled') === 'true';
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setIdleTimeout = (timeout: number) => {
    const old = idleTimeout;
    setIdleTimeoutState(timeout);
    localStorage.setItem('system_idle_timeout', timeout.toString());
    addLog({
      action: 'SYSTEM_SETTING_CHANGED',
      module: 'SISTEMA',
      description: `Tempo de bloqueio alterado de ${old}s para ${timeout}s`,
      previousValue: old,
      newValue: timeout,
      entityId: null
    }, user);
  };

  const setBiometricEnabled = (enabled: boolean) => {
    const old = biometricEnabled;
    setBiometricEnabledState(enabled);
    localStorage.setItem('biometric_enabled', enabled.toString());
    addLog({
      action: 'SYSTEM_SETTING_CHANGED',
      module: 'SISTEMA',
      description: `Biometria ${enabled ? 'ativada' : 'desativada'}`,
      previousValue: old,
      newValue: enabled,
      entityId: null
    }, user);
  };

  const setUiEffectsEnabled = (enabled: boolean) => {
    const old = uiEffectsEnabled;
    setUiEffectsEnabledState(enabled);
    localStorage.setItem('ui_effects_enabled', enabled.toString());
    addLog({
      action: 'SYSTEM_SETTING_CHANGED',
      module: 'SISTEMA',
      description: `Efeitos visuais ${enabled ? 'ativados' : 'desativados'}`,
      previousValue: old,
      newValue: enabled,
      entityId: null
    }, user);
  };

  const setDiagnosticReportingMode = (mode: DiagnosticMode) => {
    const old = diagnosticReportingMode;
    setDiagnosticReportingModeState(mode);
    localStorage.setItem('diagnostic_reporting_mode', mode);
    addLog({
      action: 'SYSTEM_SETTING_CHANGED',
      module: 'SISTEMA',
      description: `Modo de diagnóstico alterado de ${old} para ${mode}`,
      previousValue: old,
      newValue: mode,
      entityId: null
    }, user);
  };

  const setUsageAnalyticsEnabled = (enabled: boolean) => {
    const old = usageAnalyticsEnabled;
    setUsageAnalyticsEnabledState(enabled);
    localStorage.setItem('usage_analytics_enabled', enabled.toString());
    addLog({
      action: 'SYSTEM_SETTING_CHANGED',
      module: 'SISTEMA',
      description: `Análise de utilização ${enabled ? 'ativada' : 'desativada'}`,
      previousValue: old,
      newValue: enabled,
      entityId: null
    }, user);
  };

  const setLastSyncDate = (date: string) => {
    setLastSyncDateState(date);
    localStorage.setItem('last_sync_date', date);
  };

  const setMaintenanceMode = (enabled: boolean) => {
    const old = maintenanceMode;
    setMaintenanceModeState(enabled);
    localStorage.setItem('maintenance_mode_enabled', enabled.toString());
    addLog({
      action: enabled ? 'SYSTEM_MAINTENANCE_ENABLED' : 'SYSTEM_MAINTENANCE_DISABLED',
      module: 'SISTEMA',
      description: `Modo manutenção ${enabled ? 'ativado' : 'desativado'}`,
      previousValue: old,
      newValue: enabled,
      entityId: null
    }, user);
  };

  // Idle Timer Logic
  useEffect(() => {
    if (idleTimeout <= 0 || !user) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        addLog({
          action: 'AUTO_LOCK',
          module: 'SISTEMA',
          description: 'Sessão bloqueada por inatividade',
          previousValue: 'ACTIVE',
          newValue: 'LOCKED',
          entityId: user.id
        }, user);
        logout();
      }, idleTimeout * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [idleTimeout, user, logout, addLog]);

  return (
    <SettingsContext.Provider value={{
      idleTimeout,
      setIdleTimeout,
      biometricEnabled,
      setBiometricEnabled,
      uiEffectsEnabled,
      setUiEffectsEnabled,
      diagnosticReportingMode,
      setDiagnosticReportingMode,
      usageAnalyticsEnabled,
      setUsageAnalyticsEnabled,
      lastSyncDate,
      setLastSyncDate,
      isOnline,
      maintenanceMode,
      setMaintenanceMode
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
