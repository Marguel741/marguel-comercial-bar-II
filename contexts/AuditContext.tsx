// contexts/AuditContext.tsx — migrado para Firestore
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../src/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
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

const AUDIT_COLLECTION = 'appdata/audit/records';
const AUDIT_CONFIG_DOC = doc(db, 'appdata', 'audit_config');

const CRITICAL_ACTIONS = [
  'LOGIN', 'LOGOUT', 'SWITCH_USER',
  'SALE', 'SALE_CANCELLED', 'SALES_REPORT',
  'STOCK_ADJUSTMENT', 'PURCHASE', 'INVENTORY_ADJUST', 'UPDATE_STOCK',
  'LOCK_DAY', 'UNLOCK_DAY', 'AJUSTE_FINANCEIRO_FECHO',
  'CONFIRMAÇÃO_FINAL_FECHO', 'CONFIRMAÇÃO_UNILATERAL_FECHO',
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
  'CRIAR_RELATORIO_VENDAS', 'APROVAR_UTILIZADOR', 'BANIR_UTILIZADOR', 'DESBANIR_UTILIZADOR',
  'ELIMINAR_UTILIZADOR', 'ALTERAR_CARGO', 'ALTERAR_PERMISSÕES', 'EDITAR_PERFIL_UTILIZADOR',
  'USER_PIN_CHANGED', 'BLOQUEAR_DIA', 'DESBLOQUEAR_DIA',
];

export const AuditProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isAuditEnabled, setIsAuditEnabled] = useState(true);
  const [auditMode, setAuditModeState] = useState<'IMMUTABLE' | 'MUTABLE'>('IMMUTABLE');

  // Carregar logs do Firestore em tempo real
  useEffect(() => {
    const unsubLogs = onSnapshot(collection(db, AUDIT_COLLECTION), (snap) => {
      const data = snap.docs
        .map(d => d.data() as AuditLog)
        .sort((a, b) => b.timestamp - a.timestamp);
      setLogs(data);
    });

    // Carregar configuração de auditoria
    const unsubConfig = onSnapshot(AUDIT_CONFIG_DOC, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.isAuditEnabled !== undefined) setIsAuditEnabled(d.isAuditEnabled);
        if (d.auditMode !== undefined) setAuditModeState(d.auditMode);
      } else {
        // Primeira vez — criar config padrão
        setDoc(AUDIT_CONFIG_DOC, { isAuditEnabled: true, auditMode: 'IMMUTABLE' });
      }
    });

    return () => {
      unsubLogs();
      unsubConfig();
    };
  }, []);

  const addLog = (
    params: Omit<AuditLog, 'id' | 'timestamp' | 'date' | 'time' | 'performedBy' | 'userRole' | 'source' | 'synced'>,
    user: User | null
  ) => {
    if (!isAuditEnabled) return;
    if (!CRITICAL_ACTIONS.includes(params.action)) return;

    const now = new Date();
    const newLog: AuditLog = {
      id: generateUUID(),
      ...params,
      performedBy: user?.name || 'Sistema',
      userRole: user?.role || 'SISTEMA',
      timestamp: now.getTime(),
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      source: 'firestore',
      synced: true,
    };

    // Guardar directamente no Firestore
    setDoc(doc(db, AUDIT_COLLECTION, newLog.id), newLog).catch(err =>
      console.error('Erro ao guardar log de auditoria:', err)
    );
  };

  const toggleAudit = (enabled: boolean) => {
    setIsAuditEnabled(enabled);
    setDoc(AUDIT_CONFIG_DOC, { isAuditEnabled: enabled }, { merge: true });
  };

  const setAuditMode = (mode: 'IMMUTABLE' | 'MUTABLE') => {
    setAuditModeState(mode);
    setDoc(AUDIT_CONFIG_DOC, { auditMode: mode }, { merge: true });
  };

  const deleteLog = (id: string, user: User | null) => {
    if (auditMode !== 'MUTABLE') return;

    const logToDelete = logs.find(l => l.id === id);
    if (!logToDelete) return;

    // Registar a eliminação
    const now = new Date();
    const deletionLog: AuditLog = {
      id: generateUUID(),
      action: 'DELETE_LOG' as any,
      module: 'AUDITORIA',
      entityId: id,
      description: `Log removido por ${user?.name}. Ação original: ${logToDelete.action}`,
      previousValue: logToDelete,
      newValue: null,
      performedBy: user?.name || 'Admin',
      userRole: user?.role || 'ADMIN',
      timestamp: now.getTime(),
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      source: 'firestore',
      synced: true,
    };

    setDoc(doc(db, AUDIT_COLLECTION, deletionLog.id), deletionLog);
    deleteDoc(doc(db, AUDIT_COLLECTION, id));
  };

  const updateLog = (id: string, updates: Partial<AuditLog>, user: User | null) => {
    if (auditMode !== 'MUTABLE') return;

    const logToUpdate = logs.find(l => l.id === id);
    if (!logToUpdate) return;

    const now = new Date();
    const updateLog: AuditLog = {
      id: generateUUID(),
      action: 'UPDATE_LOG' as any,
      module: 'AUDITORIA',
      entityId: id,
      description: `Log editado por ${user?.name}.`,
      previousValue: logToUpdate,
      newValue: { ...logToUpdate, ...updates },
      performedBy: user?.name || 'Admin',
      userRole: user?.role || 'ADMIN',
      timestamp: now.getTime(),
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      source: 'firestore',
      synced: true,
    };

    setDoc(doc(db, AUDIT_COLLECTION, updateLog.id), updateLog);
    setDoc(doc(db, AUDIT_COLLECTION, id), { ...logToUpdate, ...updates });
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
      updateLog,
    }}>
      {children}
    </AuditContext.Provider>
  );
};
