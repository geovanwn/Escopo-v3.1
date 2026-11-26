import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

export function SyncIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen to real IPC sync events if in Electron
    let unsub: any;
    if ((window as any).electronAPI?.onSyncCompleted) {
      unsub = (window as any).electronAPI.onSyncCompleted(() => {
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 1200);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (unsub) unsub();
    };
  }, []);

  const handleManualSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      if ((window as any).electronAPI?.syncCloudNow) {
        const uid = localStorage.getItem('currentUserId') || 'GLOBAL';
        await (window as any).electronAPI.syncCloudNow(uid);
      }
    } catch (e) {
      console.error('Erro na sincronização manual:', e);
    } finally {
      setTimeout(() => setIsSyncing(false), 1500);
    }
  };

  return (
    <div
      onClick={handleManualSync}
      title="Clique para sincronizar com a Nuvem agora"
      className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] cursor-pointer hover:border-blue-400 transition-all active:scale-95 shadow-sm"
    >
      {isSyncing ? (
        <RefreshCw size={14} className="text-blue-500 animate-spin" />
      ) : isOnline ? (
        <Cloud size={14} className="text-green-500" />
      ) : (
        <CloudOff size={14} className="text-red-500" />
      )}
      <span className="text-[10px] font-bold text-[var(--text-secondary)] tracking-tight uppercase select-none">
        {isSyncing ? 'Sincronizando' : isOnline ? 'Online (Nuvem)' : 'Offline'}
      </span>
    </div>
  );
}
