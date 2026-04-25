import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../src/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useAudit } from './AuditContext';

export type DiagnosticMode = 'ALWAYS' | 'ERROR' | 'NEVER';

interface SettingsContextType {
  idleTimeout: number;
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
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Documento Firestore: appdata/settings
const SETTINGS_DOC = doc(db, 'appdata', 'settings');

const DEFAULT_SETTINGS = {
  idleTimeout: 0,
  biometricEnabled: false,
  uiEffectsEnabled: true,
  diagnosticReportingMode: 'ERROR' as DiagnosticMode,
  usageAnalyticsEnabled: true,
  lastSyncDate: new Date().toLocaleString(),
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { addLog } = useAudit();

  const [idleTimeout, setIdleTimeoutState] = useState<number>(DEFAULT_SETTINGS.idleTimeout);
  const [biometricEnabled, setBiometricEnabledState] = useState<boolean>(() =>
    // biometricEnabled é específico do dispositivo — continua a ler localStorage
    localStorage.getItem('biometric_enabled') === 'true' ||
    !!localStorage.getItem('mg_biometric_user')
  );
  const [uiEffectsEnabled, setUiEffectsEnabledState] = useState<boolean>(DEFAULT_SETTINGS.uiEffectsEnabled);
  const [diagnosticReportingMode, setDiagnosticReportingModeState] = useState<DiagnosticMode>(DEFAULT_SETTINGS.diagnosticReportingMode);
  const [usageAnalyticsEnabled, setUsageAnalyticsEnabledState] = useState<boolean>(DEFAULT_SETTINGS.usageAnalyticsEnabled);
  const [lastSyncDate, setLastSyncDateState] = useState<string>(DEFAULT_SETTINGS.lastSyncDate);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // ─── Carregar definições do Firestore em tempo real ───────────────────────
  useEffect(() => {
    const unsubscribe = onSnapshot(SETTINGS_DOC, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.idleTimeout !== undefined) setIdleTimeoutState(d.idleTimeout);
        if (d.uiEffectsEnabled !== undefined) setUiEffectsEnabledState(d.uiEffectsEnabled);
        if (d.diagnosticReportingMode !== undefined) setDiagnosticReportingModeState(d.diagnosticReportingMode);
        if (d.usageAnalyticsEnabled !== undefined) setUsageAnalyticsEnabledState(d.usageAnalyticsEnabled);
        if (d.lastSyncDate !== undefined) setLastSyncDateState(d.lastSyncDate);
      } else {
        // Primeira vez — criar documento com valores padrão
        setDoc(SETTINGS_DOC, DEFAULT_SETTINGS);
      }
    });
    return () => unsubscribe();
  }, []);

  // ─── Online/Offline ───────────────────────────────────────────────────────
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

  // ─── Setters — escrevem directamente no Firestore ─────────────────────────
  const setIdleTimeout = (timeout: number) => {
    setIdleTimeoutState(timeout);
    setDoc(SETTINGS_DOC, { idleTimeout: timeout }, { merge: true });
    addLog({ action: 'SYSTEM_SETTING_CHANGED', module: 'SISTEMA', description: `Tempo de bloqueio alterado para ${timeout}s`, previousValue: idleTimeout, newValue: timeout, entityId: null }, user);
  };

  const setBiometricEnabled = (enabled: boolean) => {
    setBiometricEnabledState(enabled);
    // biometricEnabled é específico do dispositivo — continua no localStorage
    localStorage.setItem('biometric_enabled', enabled.toString());
    addLog({ action: 'SYSTEM_SETTING_CHANGED', module: 'SISTEMA', description: `Biometria ${enabled ? 'ativada' : 'desativada'}`, previousValue: biometricEnabled, newValue: enabled, entityId: null }, user);
  };

  const setUiEffectsEnabled = (enabled: boolean) => {
    setUiEffectsEnabledState(enabled);
    setDoc(SETTINGS_DOC, { uiEffectsEnabled: enabled }, { merge: true });
    addLog({ action: 'SYSTEM_SETTING_CHANGED', module: 'SISTEMA', description: `Efeitos visuais ${enabled ? 'ativados' : 'desativados'}`, previousValue: uiEffectsEnabled, newValue: enabled, entityId: null }, user);
  };

  const setDiagnosticReportingMode = (mode: DiagnosticMode) => {
    setDiagnosticReportingModeState(mode);
    setDoc(SETTINGS_DOC, { diagnosticReportingMode: mode }, { merge: true });
    localStorage.setItem('mg_diagnostic_mode', mode);
    addLog({ action: 'SYSTEM_SETTING_CHANGED', module: 'SISTEMA', description: `Modo de diagnóstico: ${mode}`, previousValue: diagnosticReportingMode, newValue: mode, entityId: null }, user);
  };

  const setUsageAnalyticsEnabled = (enabled: boolean) => {
    setUsageAnalyticsEnabledState(enabled);
    setDoc(SETTINGS_DOC, { usageAnalyticsEnabled: enabled }, { merge: true });
    addLog({ action: 'SYSTEM_SETTING_CHANGED', module: 'SISTEMA', description: `Análise de utilização ${enabled ? 'ativada' : 'desativada'}`, previousValue: usageAnalyticsEnabled, newValue: enabled, entityId: null }, user);
  };

  const setLastSyncDate = (date: string) => {
    setLastSyncDateState(date);
    setDoc(SETTINGS_DOC, { lastSyncDate: date }, { merge: true });
  };

  // ─── Idle Timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (idleTimeout <= 0 || !user) return;
    let timeoutId: NodeJS.Timeout;
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        addLog({ action: 'AUTO_LOCK', module: 'SISTEMA', description: 'Sessão bloqueada por inatividade', previousValue: 'ACTIVE', newValue: 'LOCKED', entityId: user.id }, user);
        logout();
      }, idleTimeout * 1000);
    };
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [idleTimeout, user, logout, addLog]);

  return (
    <SettingsContext.Provider value={{
      idleTimeout, setIdleTimeout,
      biometricEnabled, setBiometricEnabled,
      uiEffectsEnabled, setUiEffectsEnabled,
      diagnosticReportingMode, setDiagnosticReportingMode,
      usageAnalyticsEnabled, setUsageAnalyticsEnabled,
      lastSyncDate, setLastSyncDate,
      isOnline
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
