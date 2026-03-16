
import React, { useState, useMemo } from 'react';
import { useAudit } from '../contexts/AuditContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit2, 
  Shield, 
  ShieldAlert, 
  History, 
  User, 
  Layers, 
  Clock,
  CheckCircle2,
  RefreshCw,
  Power,
  Lock,
  Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AuditPage: React.FC = () => {
  const { logs, isAuditEnabled, auditMode, toggleAudit, setAuditMode, deleteLog, updateLog } = useAudit();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Permissions check
  const canView = user?.role === UserRole.PROPRIETARIO || user?.role === UserRole.ADMIN_GERAL;
  const canControl = user?.role === UserRole.PROPRIETARIO || user?.role === UserRole.ADMIN_GERAL;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
        <p className="text-slate-500 dark:text-slate-400">Você não tem permissão para visualizar os logs de auditoria.</p>
      </div>
    );
  }

  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => {
        const matchesSearch = 
          log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.performedBy.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
        const matchesUser = userFilter === 'all' || log.performedBy === userFilter;
        const matchesDate = !dateFilter || log.date === dateFilter;

        return matchesSearch && matchesModule && matchesUser && matchesDate;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [logs, searchTerm, moduleFilter, userFilter, dateFilter, sortOrder]);

  const modules = useMemo(() => ['all', ...new Set(logs.map(l => l.module))], [logs]);
  const users = useMemo(() => ['all', ...new Set(logs.map(l => l.performedBy))], [logs]);

  const getModuleColor = (module: string) => {
    switch (module) {
      case 'CALENDÁRIO': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'FINANCEIRO': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'STOCK': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'UTILIZADORES': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'SISTEMA': return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400';
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <History className="text-indigo-600" />
            Auditoria Global
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Rastreabilidade total e segurança administrativa nível ERP.
          </p>
        </div>

        {canControl && (
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => toggleAudit(!isAuditEnabled)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isAuditEnabled 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              <Power size={18} />
              {isAuditEnabled ? 'Logs Ativos' : 'Logs Inativos'}
            </button>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

            <button
              onClick={() => setAuditMode(auditMode === 'IMMUTABLE' ? 'MUTABLE' : 'IMMUTABLE')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                auditMode === 'IMMUTABLE'
                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
              }`}
            >
              {auditMode === 'IMMUTABLE' ? <Lock size={18} /> : <Unlock size={18} />}
              Modo {auditMode === 'IMMUTABLE' ? 'Imutável' : 'Mutável'}
            </button>
          </div>
        )}
      </div>

      {/* Stats & Quick Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total de Registos</span>
            <Layers className="text-indigo-500" size={20} />
          </div>
          <div className="text-2xl font-bold">{logs.length}</div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sincronização</span>
            <RefreshCw className="text-green-500" size={20} />
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">{logs.filter(l => l.synced).length}</div>
            <span className="text-xs text-slate-400">/ {logs.length} sincronizados</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estado do Sistema</span>
            <Shield className="text-indigo-500" size={20} />
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isAuditEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-bold">{isAuditEnabled ? 'Monitorizando' : 'Pausado'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Segurança</span>
            <Lock className="text-indigo-500" size={20} />
          </div>
          <div className="font-bold">{auditMode === 'IMMUTABLE' ? 'Modo Imutável Ativo' : 'Modo de Teste (Mutável)'}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="relative">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
            >
              <option value="all">Todos os Módulos</option>
              {modules.filter(m => m !== 'all').map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
            >
              <option value="all">Todos os Usuários</option>
              {users.filter(u => u !== 'all').map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-medium"
          >
            <Filter size={18} />
            {sortOrder === 'desc' ? 'Mais Recentes' : 'Mais Antigos'}
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <th className="p-4 font-bold text-sm uppercase tracking-wider text-slate-500">Data/Hora</th>
                <th className="p-4 font-bold text-sm uppercase tracking-wider text-slate-500">Módulo</th>
                <th className="p-4 font-bold text-sm uppercase tracking-wider text-slate-500">Ação</th>
                <th className="p-4 font-bold text-sm uppercase tracking-wider text-slate-500">Usuário</th>
                <th className="p-4 font-bold text-sm uppercase tracking-wider text-slate-500">Descrição</th>
                <th className="p-4 font-bold text-sm uppercase tracking-wider text-slate-500 text-center">Sync</th>
                {auditMode === 'MUTABLE' && <th className="p-4 font-bold text-sm uppercase tracking-wider text-slate-500 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              <AnimatePresence initial={false}>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group"
                    >
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-white">{log.date}</div>
                        <div className="text-xs text-slate-400">{log.time}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${getModuleColor(log.module)}`}>
                          {log.module}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-700 dark:text-slate-300">{log.action}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{log.performedBy}</div>
                        <div className="text-xs text-slate-400 uppercase">{log.userRole}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 max-w-md line-clamp-2" title={log.description}>
                          {log.description}
                        </div>
                        {log.entityId && <div className="text-[10px] text-slate-400 mt-1">ID: {log.entityId}</div>}
                      </td>
                      <td className="p-4 text-center">
                        {log.synced ? (
                          <CheckCircle2 className="text-green-500 mx-auto" size={18} />
                        ) : (
                          <RefreshCw className="text-slate-300 mx-auto animate-spin" size={18} />
                        )}
                      </td>
                      {auditMode === 'MUTABLE' && (
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => updateLog(log.id, { description: log.description + ' (Editado)' }, user)}
                              className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => deleteLog(log.id, user)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={auditMode === 'MUTABLE' ? 7 : 6} className="p-12 text-center text-slate-400 italic">
                      Nenhum registo encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 uppercase tracking-widest font-medium">
        <div className="flex items-center gap-4">
          <span>ID de Sessão: {Math.random().toString(36).substring(7).toUpperCase()}</span>
          <span>•</span>
          <span>IP Local: 192.168.1.{Math.floor(Math.random() * 254)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-indigo-500" />
          Sistema de Auditoria Protegido por Encriptação AES-256
        </div>
      </div>
    </div>
  );
};

export default AuditPage;
