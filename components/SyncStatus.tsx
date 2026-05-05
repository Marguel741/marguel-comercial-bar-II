import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useProducts } from '../contexts/ProductContext';
import { useSettings } from '../contexts/SettingsContext';

const SyncStatus: React.FC = () => {
  const { isSyncing, syncData } = useProducts();
  const { isOnline } = useSettings();

  return (
    <button 
      onClick={() => isOnline && syncData()}
      disabled={!isOnline || isSyncing}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
        !isOnline 
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 cursor-not-allowed'
          : isSyncing
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 opacity-50 cursor-wait'
            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 cursor-pointer'
      }`}
    >
      {isSyncing ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isOnline ? (
        <Wifi size={14} />
      ) : (
        <WifiOff size={14} />
      )}
      <span className="hidden md:inline">
        {isSyncing ? 'A sincronizar...' : isOnline ? 'Online (Sincronizar)' : 'Offline'}
      </span>
    </button>
  );
};

export default SyncStatus;
