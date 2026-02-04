
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const getIcon = (type: ToastType) => {
      switch(type) {
          case 'success': return <CheckCircle size={20} className="text-green-500" />;
          case 'error': return <AlertCircle size={20} className="text-red-500" />;
          case 'warning': return <AlertTriangle size={20} className="text-orange-500" />;
          default: return <Info size={20} className="text-blue-500" />;
      }
  };

  const getStyles = (type: ToastType) => {
      switch(type) {
          case 'success': return 'border-l-4 border-green-500 bg-white';
          case 'error': return 'border-l-4 border-red-500 bg-white';
          case 'warning': return 'border-l-4 border-orange-500 bg-white';
          default: return 'border-l-4 border-blue-500 bg-white';
      }
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            className={`pointer-events-auto shadow-lg rounded-lg p-4 flex items-start gap-3 transform transition-all duration-300 animate-in slide-in-from-right ${getStyles(toast.type)}`}
          >
            <div className="shrink-0 mt-0.5">{getIcon(toast.type)}</div>
            <div className="flex-grow text-sm font-medium text-gray-800 leading-tight pt-0.5">
                {toast.message}
            </div>
            <button 
                onClick={() => removeToast(toast.id)} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
