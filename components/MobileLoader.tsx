import React from 'react';
import { Logo } from './Logo';

interface MobileLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export const MobileLoader: React.FC<MobileLoaderProps> = ({ 
  message = 'Chargement...', 
  fullScreen = true 
}) => {
  const containerClasses = fullScreen 
    ? 'fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center'
    : 'flex flex-col items-center justify-center py-12';

  return (
    <div className={containerClasses}>
      {/* Logo avec animation de pulse */}
      <div className="relative">
        <div className="animate-pulse">
          <Logo height={60} />
        </div>
        {/* Cercle d'animation autour du logo */}
        <div className="absolute inset-0 -m-4">
          <div className="w-[calc(100%+32px)] h-[calc(100%+32px)] rounded-full border-2 border-eveneo-violet/20 animate-[spin_3s_linear_infinite]" />
        </div>
      </div>

      {/* Message */}
      <p className="mt-8 text-gray-500 text-sm font-medium">{message}</p>

      {/* Points animés style moderne */}
      <div className="mt-6 flex gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-eveneo-blue animate-[bounce_1s_infinite_0ms]" />
        <div className="w-2.5 h-2.5 rounded-full bg-eveneo-violet animate-[bounce_1s_infinite_150ms]" />
        <div className="w-2.5 h-2.5 rounded-full bg-eveneo-pink animate-[bounce_1s_infinite_300ms]" />
      </div>

      {/* Barre de progression animée */}
      <div className="mt-8 w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-eveneo-blue via-eveneo-violet to-eveneo-pink animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full" 
             style={{ 
               backgroundSize: '200% 100%',
               animation: 'shimmer 1.5s ease-in-out infinite'
             }} 
        />
      </div>
    </div>
  );
};

// Loader pour les actions (boutons, etc.)
export const MobileActionLoader: React.FC = () => {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <div className="w-2 h-2 rounded-full bg-white animate-[bounce_0.6s_infinite_0ms]" />
      <div className="w-2 h-2 rounded-full bg-white animate-[bounce_0.6s_infinite_100ms]" />
      <div className="w-2 h-2 rounded-full bg-white animate-[bounce_0.6s_infinite_200ms]" />
    </div>
  );
};

// Overlay loader pour les opérations en cours
export const MobileOverlayLoader: React.FC<{ message?: string }> = ({ message = 'Traitement en cours...' }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-6 w-full max-w-xs flex flex-col items-center shadow-2xl">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-gray-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-eveneo-violet border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Logo height={24} />
          </div>
        </div>
        <p className="mt-4 text-gray-700 font-medium text-center">{message}</p>
      </div>
    </div>
  );
};
