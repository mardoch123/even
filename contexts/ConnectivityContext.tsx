
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from './ToastContext';

interface PendingAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
}

interface ConnectivityContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: PendingAction[];
  queueAction: (type: string, payload: any, optimisticCallback?: () => void) => void;
  checkConnection: () => Promise<void>;
}

const ConnectivityContext = createContext<ConnectivityContextType | undefined>(undefined);

export const useConnectivity = () => {
  const context = useContext(ConnectivityContext);
  if (!context) {
    throw new Error('useConnectivity must be used within a ConnectivityProvider');
  }
  return context;
};

export const ConnectivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { addToast } = useToast();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>(() => {
    const stored = localStorage.getItem('eveneo_offline_queue');
    return stored ? JSON.parse(stored) : [];
  });

  // Active Connection Check (Ping)
  const checkConnection = async () => {
      try {
          // Prefer the browser network status. A failed ping should not force offline
          // (e.g. missing /manifest.json in some deployments).
          if (!navigator.onLine) {
              setIsOnline(false);
              return;
          }

          // Try a lightweight HEAD request against the app itself.
          const url = `${window.location.origin}/?cb=${Date.now()}`;
          const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });

          // If the app responds, we are online.
          if (res.ok && !isOnline) {
              setIsOnline(true);
              processQueue();
          }
      } catch (e) {
          // Do not switch to offline on transient fetch errors while navigator says online.
          if (!navigator.onLine) {
              setIsOnline(false);
          }
      }
  };

  // Listen to network status events (Passive)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 30 seconds to ensure state is correct
    const interval = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Save queue to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('eveneo_offline_queue', JSON.stringify(pendingActions));
  }, [pendingActions]);

  // Process the queue when back online
  const processQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('eveneo_offline_queue') || '[]');
    if (queue.length === 0) return;

    setIsSyncing(true);
    console.group('🔄 Synchronisation automatique');
    console.log(`Traitement de ${queue.length} actions en attente...`);

    // Simulate processing time per action
    for (const action of queue) {
      console.log(`Traitement de l'action: ${action.type}`, action.payload);
      await new Promise(resolve => setTimeout(resolve, 500)); // Mock server delay
      
      // Here you would normally switch based on action.type and call real APIs
      // e.g., if (action.type === 'UPDATE_PROFILE') api.updateProfile(action.payload);
    }

    console.log('✅ Tout est synchronisé !');
    console.groupEnd();

    setPendingActions([]);
    setIsSyncing(false);
    localStorage.removeItem('eveneo_offline_queue');
    
    addToast('success', `Connexion rétablie : ${queue.length} action(s) synchronisée(s) avec succès.`);
  };

  const queueAction = (type: string, payload: any, optimisticCallback?: () => void) => {
    // Always execute optimistic UI update if provided
    if (optimisticCallback) {
      optimisticCallback();
    }

    if (isOnline) {
      // If online, we assume the "real" component logic sends the data immediately.
      console.log(`[Online] Action executed directly: ${type}`);
    } else {
      // If offline, add to queue
      const newAction: PendingAction = {
        id: `act-${Date.now()}-${Math.random()}`,
        type,
        payload,
        timestamp: Date.now()
      };
      setPendingActions(prev => [...prev, newAction]);
      console.log(`[Offline] Action queued: ${type}`);
      addToast('info', 'Mode hors ligne : Action sauvegardée pour synchronisation ultérieure.');
    }
  };

  return (
    <ConnectivityContext.Provider value={{ isOnline, isSyncing, pendingActions, queueAction, checkConnection }}>
      {children}
    </ConnectivityContext.Provider>
  );
};
