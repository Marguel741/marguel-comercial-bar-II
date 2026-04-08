
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuditLog, User } from '../types';
import { generateUUID } from '../src/utils';

interface AuditContextType {
  logs: AuditLog[];
  isAuditEnabled: boolean;
  auditMode: 'IMMUTABLE' | 'MUTABLE';
  addLog: (params: Omit<AuditLog, 'id' | 'timestamp' | 'date' | 'time' | 'performedBy' | 'userRole' | 'source' | 'synced'>, user: User | null) => void;
  toggleAudit: (enabled: boolean) => void;
  setAuditMode: (mode: 'IMMUTABLE' | 'MUTABLE') => void;
  deleteLog: (id: string, user: User | null) => void;
  updateLog: (id: string, updates: Partial<AuditLog>, user: User | null) => void;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (!context) throw new Error("useAudit must be used within AuditProvider");
  return context;
};

export const AuditProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isAuditEnabled, setIsAuditEnabled] = useState(true);
  const [auditMode, setAuditModeState] = useState<'IMMUTABLE' | 'MUTABLE'>('IMMUTABLE');

  // Load from localStorage
  useEffect(() => {
    const savedLogs = localStorage.getItem('mg_audit_logs');
    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs);
        if (Array.isArray(parsed)) setLogs(parsed);
      } catch (e) {
        console.error("Error parsing audit logs", e);
      }
    }

    const savedEnabled = localStorage.getItem('mg_audit_enabled');
    if (savedEnabled !== null) setIsAuditEnabled(JSON.parse(savedEnabled));

    const savedMode = localStorage.getItem('mg_audit_mode');
    if (savedMode) setAuditModeState(savedMode as 'IMMUTABLE' | 'MUTABLE');
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('mg_audit_logs', JSON.stringify(logs));
  }, [logs]);

  const addLog = (params: Omit<AuditLog, 'id' | 'timestamp' | 'date' | 'time' | 'performedBy' | 'userRole' | 'source' | 'synced'>, user: User | null) => {
    if (!isAuditEnabled) return;

    // Filter only critical actions
    const criticalActions = [
      'LOGIN', 'LOGOUT', 'SWITCH_USER',
      'SALE', 'SALE_CANCELLED', 'SALES_REPORT',
      'STOCK_ADJUSTMENT', 'PURCHASE', 'INVENTORY_ADJUST', 'UPDATE_STOCK',
      'LOCK_DAY', 'UNLOCK_DAY', 'AJUSTE_FINANCEIRO_FECHO', 'CONFIRMAÇÃO_FINAL_FECHO', 'CONFIRMAÇÃO_UNILATERAL_FECHO',
      'DELETE_PRODUCT', 'UPDATE_PRODUCT', 'ADD_PRODUCT',
      'CRIAR_PRODUTO', 'EDITAR_PRODUTO', 'ARQUIVAR_PRODUTO',
      'CRIAR_CATEGORIA', 'EDITAR_CATEGORIA', 'REMOVER_CATEGORIA',
      'VENDA_STOCK', 'COMPRA_STOCK', 'AJUSTE_STOCK',
      'REGISTRO_INVENTARIO', 'ALTERAR_DATA_SISTEMA', 'TENTATIVA_EDICAO_BLOQUEADA',
      'INTEGRAÇÃO_FINANCEIRA_FECHO', 'RESET_SISTEMA',
      'ADICIONAR_EQUIPAMENTO', 'EDITAR_EQUIPAMENTO', 'REMOVER_EQUIPAMENTO',
      'ADICIONAR_DESPESA', 'ESTORNO_DESPESA', 'EDITAR_DESPESA', 'CRIAR_COMPRA',
      'CRIAR_CARTAO', 'EDITAR_CARTAO', 'REMOVER_CARTAO',
      'CRIAR_CATEGORIA_DESPESA', 'EDITAR_CATEGORIA_DESPESA', 'REMOVER_CATEGORIA_DESPESA',
      'TRANSACAO_MANUAL', 'DEBITO_CASH_TPA', 'JUSTIFICAR_FECHO', 'AJUSTE_QTD_EQUIPAMENTO',
      'CRIAR_RELATORIO_VENDAS'
    ];

    if (!criticalActions.includes(params.action)) {
      return;
    }

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];
    const timestamp = now.getTime();

    const newLog: AuditLog = {
      id: generateUUID(),
      ...params,
      performedBy: user?.name || 'Sistema',
      userRole: user?.role || 'SISTEMA',
      timestamp,
      date,
      time,
      source: 'local',
      synced: false
    };

    setLogs(prev => [newLog, ...prev]);
  };

  const toggleAudit = (enabled: boolean) => {
    setIsAuditEnabled(enabled);
    localStorage.setItem('mg_audit_enabled', JSON.stringify(enabled));
  };

  const setAuditMode = (mode: 'IMMUTABLE' | 'MUTABLE') => {
    setAuditModeState(mode);
    localStorage.setItem('mg_audit_mode', mode);
  };

  const deleteLog = (id: string, user: User | null) => {
    if (auditMode !== 'MUTABLE') return;
    
    setLogs(prev => {
        const logToDelete = prev.find(l => l.id === id);
        if (logToDelete) {
            // Log the deletion itself
            const now = new Date();
            const date = now.toISOString().split('T')[0];
            const time = now.toTimeString().split(' ')[0];
            const timestamp = now.getTime();
            
            const auditDeletionLog: AuditLog = {
                id: generateUUID(),
                action: 'DELETE_LOG',
                module: 'AUDITORIA',
                entityId: id,
                description: `Log removido por ${user?.name}. Ação original: ${logToDelete.action}`,
                previousValue: logToDelete,
                newValue: null,
                performedBy: user?.name || 'Admin',
                userRole: user?.role || 'ADMIN',
                timestamp,
                date,
                time,
                source: 'local',
                synced: false
            };
            return [auditDeletionLog, ...prev.filter(l => l.id !== id)];
        }
        return prev;
    });
  };

  const updateLog = (id: string, updates: Partial<AuditLog>, user: User | null) => {
    if (auditMode !== 'MUTABLE') return;
    
    setLogs(prev => {
        const logToUpdate = prev.find(l => l.id === id);
        if (logToUpdate) {
            const now = new Date();
            const date = now.toISOString().split('T')[0];
            const time = now.toTimeString().split(' ')[0];
            const timestamp = now.getTime();
            
            const auditUpdateLog: AuditLog = {
                id: generateUUID(),
                action: 'UPDATE_LOG',
                module: 'AUDITORIA',
                entityId: id,
                description: `Log editado por ${user?.name}.`,
                previousValue: logToUpdate,
                newValue: { ...logToUpdate, ...updates },
                performedBy: user?.name || 'Admin',
                userRole: user?.role || 'ADMIN',
                timestamp,
                date,
                time,
                source: 'local',
                synced: false
            };
            
            return [auditUpdateLog, ...prev.map(l => l.id === id ? { ...l, ...updates } : l)];
        }
        return prev;
    });
  };

  return (
    <AuditContext.Provider value={{ 
        logs, 
        isAuditEnabled, 
        auditMode, 
        addLog, 
        toggleAudit, 
        setAuditMode,
        deleteLog,
        updateLog
    }}>
      {children}
    </AuditContext.Provider>
  );
};
