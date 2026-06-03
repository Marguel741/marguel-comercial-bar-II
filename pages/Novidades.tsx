import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Plus, Edit3, Trash2, Save, X, CheckCircle, XCircle,
  Bug, Zap, Star, ChevronDown, ChevronUp, Calendar, User, Tag
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductContext';
import { useLayout } from '../contexts/LayoutContext';
import { db } from '../src/firebase';
import {
  collection, doc, setDoc, onSnapshot, deleteDoc, getDoc, updateDoc
} from 'firebase/firestore';
import { generateUUID, formatDisplayDate } from '../src/utils';
import { ChangelogEntry, ChangelogItem, ChangelogCategory } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<ChangelogCategory, { label: string; color: string; icon: React.FC<any> }> = {
  'Bug':               { label: 'Correcção',         color: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',  icon: Bug },
  'Melhoria':          { label: 'Melhoria',           color: 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700', icon: Zap },
  'Nova funcionalidade': { label: 'Nova funcionalidade', color: 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700', icon: Star },
};

const SEEN_COL = 'user_seen_versions';

// ─── Pop-up de novidades ───────────────────────────────────────────────────────
export const NovidadesPopup: React.FC<{
  entry: ChangelogEntry;
  onClose: () => void;
}> = ({ entry, onClose }) => (
  <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
    <div className="w-full md:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003366] to-[#0054A6] p-5 rounded-t-3xl md:rounded-t-2xl text-white shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-[#E3007E]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/70">O que há de novo</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>
        <h2 className="text-xl font-black mt-1">{entry.title}</h2>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs bg-[#E3007E]/30 text-[#E3007E] border border-[#E3007E]/30 px-2 py-0.5 rounded-full font-bold">{entry.version}</span>
          <span className="text-xs text-white/50">{formatDisplayDate(entry.date)}</span>
        </div>
      </div>

      {/* Lista de alterações */}
      <div className="overflow-y-auto flex-1 p-4 space-y-2">
        {entry.items.map(item => {
          const cfg = CATEGORY_CONFIG[item.category];
          const IconComp = cfg.icon;
          return (
            <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 mt-0.5 ${cfg.color}`}>
                <IconComp size={10} />
                {cfg.label}
              </span>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{item.text}</p>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
        <button onClick={onClose}
          className="w-full py-3 rounded-xl bg-[#003366] text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <CheckCircle size={16} />
          Entendido — fechar
        </button>
      </div>
    </div>
  </div>
);

// ─── Hook: verifica versões não vistas e retorna a mais recente não vista ──────
export const useNovidadesBadge = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestUnseen, setLatestUnseen] = useState<ChangelogEntry | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!user) return;

    let entries: ChangelogEntry[] = [];
    let seenVersions: string[] = [];

    const check = () => {
      const unseen = entries.filter(e => !seenVersions.includes(e.version));
      setUnreadCount(unseen.length);
      if (unseen.length > 0) {
        const latest = unseen.sort((a, b) => b.publishedAt - a.publishedAt)[0];
        setLatestUnseen(latest);
        setShowPopup(true);
      } else {
        setLatestUnseen(null);
        setShowPopup(false);
      }
    };

    const unsubEntries = onSnapshot(collection(db, 'appdata/changelog/records'), snap => {
      entries = snap.docs.map(d => d.data() as ChangelogEntry);
      check();
    });

    const seenRef = doc(db, SEEN_COL, user.id);
    const unsubSeen = onSnapshot(seenRef, snap => {
      seenVersions = snap.exists() ? (snap.data().versions ?? []) : [];
      check();
    });

    return () => { unsubEntries(); unsubSeen(); };
  }, [user?.id]);

  const markAllSeen = useCallback(async () => {
    if (!user) return;
    const seenRef = doc(db, SEEN_COL, user.id);
    const snap = await getDoc(seenRef);
    const current: string[] = snap.exists() ? (snap.data().versions ?? []) : [];
    if (latestUnseen && !current.includes(latestUnseen.version)) {
      await setDoc(seenRef, { versions: [...current, latestUnseen.version], userId: user.id }, { merge: true });
    }
    setShowPopup(false);
  }, [user, latestUnseen]);

  return { unreadCount, latestUnseen, showPopup, markAllSeen };
};

// ─── Página principal ─────────────────────────────────────────────────────────
const Novidades: React.FC = () => {
  const { user } = useAuth();
  const { addAuditLog } = useProducts();
  const { sidebarMode } = useLayout();

  const canEdit = user?.role === 'PROPRIETARIO' || user?.role === 'ADMIN_GERAL';

  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);
  const [seenVersions, setSeenVersions] = useState<string[]>([]);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Carregar entradas
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'appdata/changelog/records'), snap => {
      const data = snap.docs
        .map(d => d.data() as ChangelogEntry)
        .sort((a, b) => b.publishedAt - a.publishedAt);
      setEntries(data);
      if (data.length > 0 && !expandedId) setExpandedId(data[0].id);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Carregar versões vistas + marcar como vistas ao abrir a página
  useEffect(() => {
    if (!user) return;
    const seenRef = doc(db, SEEN_COL, user.id);
    const unsub = onSnapshot(seenRef, snap => {
      setSeenVersions(snap.exists() ? (snap.data().versions ?? []) : []);
    });
    return () => unsub();
  }, [user?.id]);

  // Marcar todas as entradas actuais como vistas ao entrar na página
  useEffect(() => {
    if (!user || entries.length === 0) return;
    const seenRef = doc(db, SEEN_COL, user.id);
    const allVersions = entries.map(e => e.version);
    setDoc(seenRef, { versions: allVersions, userId: user.id }, { merge: true });
    addAuditLog({ action: 'ACESSO_PAGINA' as any, module: 'SISTEMA', description: `${user?.name} acedeu a "O que há de novo".` });
  }, [entries.length, user?.id]);

  // ── Edição ────────────────────────────────────────────────────────────────
  const openNew = () => {
    const today = new Date().toISOString().split('T')[0];
    const newEntry: ChangelogEntry = {
      id: generateUUID(),
      version: `v${today}`,
      date: today,
      title: '',
      items: [{ id: generateUUID(), text: '', category: 'Nova funcionalidade' }],
      publishedBy: user?.name || 'Admin',
      publishedAt: Date.now(),
    };
    setEditingEntry(newEntry);
    setIsEditing(true);
  };

  const openEdit = (entry: ChangelogEntry) => {
    setEditingEntry(JSON.parse(JSON.stringify(entry)));
    setIsEditing(true);
  };

  const saveEntry = async () => {
    if (!editingEntry) return;
    if (!editingEntry.title.trim()) { showToast('O título é obrigatório.', 'error'); return; }
    if (!editingEntry.version.trim()) { showToast('A versão é obrigatória.', 'error'); return; }
    const final: ChangelogEntry = { ...editingEntry, publishedAt: Date.now(), publishedBy: user?.name || 'Admin' };
    await setDoc(doc(db, 'appdata/changelog/records', final.id), final);
    addAuditLog({ action: 'PUBLICAR_NOVIDADE' as any, module: 'SISTEMA', entityId: final.id, description: `Novidade publicada: ${final.version} — ${final.title}` });
    showToast('Entrada guardada com sucesso.');
    setIsEditing(false);
    setEditingEntry(null);
    setExpandedId(final.id);
  };

  const deleteEntry = async (id: string) => {
    await deleteDoc(doc(db, 'appdata/changelog/records', id));
    addAuditLog({ action: 'REMOVER_NOVIDADE' as any, module: 'SISTEMA', entityId: id, description: 'Entrada de novidade eliminada.' });
    showToast('Entrada eliminada.');
  };

  const updateEdit = (field: keyof ChangelogEntry, value: any) =>
    setEditingEntry(prev => prev ? { ...prev, [field]: value } : prev);

  // ── Render entrada ────────────────────────────────────────────────────────
  const renderEntry = (entry: ChangelogEntry) => {
    const isExpanded = expandedId === entry.id;
    const isNew = !seenVersions.includes(entry.version);
    const counts: Record<ChangelogCategory, number> = { 'Bug': 0, 'Melhoria': 0, 'Nova funcionalidade': 0 };
    entry.items.forEach(i => counts[i.category]++);

    return (
      <div key={entry.id}
        className={`border rounded-2xl overflow-hidden transition-all ${isNew ? 'border-[#E3007E]/40 shadow-[0_0_0_1px_rgba(227,0,126,0.15)]' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-900 mb-3`}>

        {/* Header da entrada */}
        <button className="w-full text-left" onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
          <div className="flex items-start justify-between p-4 gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${isNew ? 'bg-[#E3007E] text-white border-[#E3007E]' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'}`}>
                  {entry.version}
                </span>
                {isNew && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E3007E]/10 text-[#E3007E] border border-[#E3007E]/20 animate-pulse">
                    NOVO
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{entry.title}</h3>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Calendar size={10} />
                  {formatDisplayDate(entry.date)}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <User size={10} />
                  {entry.publishedBy}
                </span>
              </div>
              {/* Badges de contagem por categoria */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {(Object.entries(counts) as [ChangelogCategory, number][]).filter(([, c]) => c > 0).map(([cat, count]) => {
                  const cfg = CATEGORY_CONFIG[cat];
                  const IconComp = cfg.icon;
                  return (
                    <span key={cat} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
                      <IconComp size={9} />
                      {count} {cfg.label}{count > 1 ? 's' : ''}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 mt-1">
              {canEdit && (
                <>
                  <button onClick={e => { e.stopPropagation(); openEdit(entry); }}
                    className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 transition-colors" title="Editar">
                    <Edit3 size={13} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteEntry(entry.id); }}
                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-500 transition-colors" title="Eliminar">
                    <Trash2 size={13} />
                  </button>
                </>
              )}
              {isExpanded ? <ChevronUp size={16} className="text-slate-400 ml-1" /> : <ChevronDown size={16} className="text-slate-400 ml-1" />}
            </div>
          </div>
        </button>

        {/* Conteúdo expandido */}
        {isExpanded && (
          <div className="border-t border-slate-100 dark:border-slate-800 px-4 pb-4 pt-3 space-y-2">
            {entry.items.map(item => {
              const cfg = CATEGORY_CONFIG[item.category];
              const IconComp = cfg.icon;
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 mt-0.5 ${cfg.color}`}>
                    <IconComp size={9} />
                    {cfg.label}
                  </span>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{item.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── Modal de edição ───────────────────────────────────────────────────────
  const renderEditModal = () => {
    if (!isEditing || !editingEntry) return null;
    const ee = editingEntry;

    return (
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="w-full md:max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#E3007E]" />
              <h3 className="font-bold text-slate-800 dark:text-white">Nova entrada de novidades</h3>
            </div>
            <button onClick={() => setIsEditing(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <X size={18} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {/* Versão + Data */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Versão</label>
                <input value={ee.version} onChange={e => updateEdit('version', e.target.value)}
                  placeholder="ex: v2026.06.03"
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Data</label>
                <input type="date" value={ee.date} onChange={e => updateEdit('date', e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white" />
              </div>
            </div>

            {/* Título */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Título</label>
              <input value={ee.title} onChange={e => updateEdit('title', e.target.value)}
                placeholder="ex: Melhorias no fecho de caixa e novo manual"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white" />
            </div>

            {/* Itens */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Alterações</label>
                <button onClick={() => updateEdit('items', [...ee.items, { id: generateUUID(), text: '', category: 'Melhoria' as ChangelogCategory }])}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <Plus size={12} /> Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {ee.items.map((item, i) => (
                  <div key={item.id} className="flex gap-2 items-start">
                    <select value={item.category}
                      onChange={e => updateEdit('items', ee.items.map((it, ii) => ii === i ? { ...it, category: e.target.value as ChangelogCategory } : it))}
                      className="shrink-0 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white">
                      <option value="Nova funcionalidade">Nova funcionalidade</option>
                      <option value="Melhoria">Melhoria</option>
                      <option value="Bug">Correcção</option>
                    </select>
                    <input value={item.text}
                      onChange={e => updateEdit('items', ee.items.map((it, ii) => ii === i ? { ...it, text: e.target.value } : it))}
                      placeholder="Descreve a alteração..."
                      className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white" />
                    <button onClick={() => updateEdit('items', ee.items.filter((_, ii) => ii !== i))}
                      className="p-2 text-red-400 hover:text-red-600 shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3 shrink-0">
            <button onClick={() => setIsEditing(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium">
              Cancelar
            </button>
            <button onClick={saveEntry}
              className="flex-1 py-2.5 rounded-xl bg-[#003366] text-white text-sm font-bold flex items-center justify-center gap-2">
              <Save size={16} /> Publicar
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#E3007E]/30 border-t-[#E3007E] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-[#E3007E]" />
          <div>
            <h1 className="font-bold text-slate-800 dark:text-white text-base">O que há de novo</h1>
            <p className="text-xs text-slate-400">{entries.length} versão{entries.length !== 1 ? 'ões' : ''}</p>
          </div>
        </div>
        {canEdit && (
          <button onClick={openNew}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#003366] text-white text-xs font-bold active:scale-95 transition-transform">
            <Plus size={14} /> Nova entrada
          </button>
        )}
      </div>

      {/* Conteúdo */}
      <div className="px-4 py-5 max-w-2xl mx-auto">
        {entries.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Ainda não há novidades publicadas.</p>
            {canEdit && (
              <button onClick={openNew} className="mt-4 px-5 py-2.5 rounded-xl bg-[#003366] text-white text-sm font-bold">
                Publicar a primeira entrada
              </button>
            )}
          </div>
        ) : (
          entries.map(renderEntry)
        )}
      </div>

      {/* Modal */}
      {renderEditModal()}

      {/* Toast */}
      {toast.show && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-2xl shadow-xl text-sm font-medium text-white flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Novidades;

