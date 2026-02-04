
import React from 'react';
import { Logo } from './Logo';

export const PageLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center">
      <div className="animate-pulse flex justify-center w-full">
        <Logo height={80} />
      </div>
      <div className="mt-8 flex gap-2 justify-center items-center w-full">
        <div className="w-3 h-3 bg-eveneo-blue rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-3 h-3 bg-eveneo-violet rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-3 h-3 bg-eveneo-pink rounded-full animate-bounce"></div>
      </div>
    </div>
  );
};
