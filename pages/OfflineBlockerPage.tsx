
import React, { useState } from 'react';
import { WifiOff, RefreshCw, CloudOff, ShieldAlert, ArrowRight } from 'lucide-react';
import { Button } from '../components/Button';
import { useConnectivity } from '../contexts/ConnectivityContext';

export const OfflineBlockerPage: React.FC = () => {
  const { pendingActions, checkConnection } = useConnectivity();
  const [isChecking, setIsChecking] = useState(false);

  const handleRetry = async () => {
    setIsChecking(true);
    await checkConnection();
    setTimeout(() => setIsChecking(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative border border-gray-100">
        
        {/* Decorative Header Background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-eveneo-gradient opacity-10 z-0"></div>
        <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-eveneo-violet rounded-full blur-3xl opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-[-50px] left-[-50px] w-40 h-40 bg-eveneo-blue rounded-full blur-3xl opacity-20 pointer-events-none"></div>

        <div className="relative z-10 p-8 md:p-12 text-center">
          {/* Icon Animation */}
          <div className="relative mx-auto w-24 h-24 mb-8">
            <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-white p-5 rounded-full shadow-lg border-2 border-red-50 flex items-center justify-center h-full w-full">
               <WifiOff size={40} className="text-red-500" />
            </div>
            <div className="absolute bottom-0 right-0 bg-gray-900 text-white p-1.5 rounded-full border-2 border-white shadow-sm">
                <CloudOff size={14} />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">Connexion Perdue</h1>
          
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
                <ShieldAlert className="text-orange-500 shrink-0 mt-0.5" size={20} />
                <div>
                    <p className="font-bold text-orange-800 text-sm">Sécurité des données activée</p>
                    <p className="text-orange-700 text-sm mt-1">
                        Vous avez <strong>{pendingActions.length} actions</strong> en attente de synchronisation. Pour éviter toute perte de données ou conflit, l'accès est temporairement restreint.
                    </p>
                </div>
            </div>
          </div>

          <p className="text-gray-500 mb-8 leading-relaxed">
            Veuillez vérifier votre connexion internet. Dès que le réseau sera rétabli, vos modifications seront automatiquement sauvegardées et vous pourrez continuer.
          </p>

          <div className="space-y-4">
            <Button 
                variant="primary" 
                size="lg" 
                fullWidth 
                onClick={handleRetry} 
                disabled={isChecking}
                className="shadow-glow group relative overflow-hidden"
            >
                {isChecking ? (
                    <span className="flex items-center justify-center gap-2">
                        <RefreshCw size={20} className="animate-spin" /> Vérification...
                    </span>
                ) : (
                    <span className="flex items-center justify-center gap-2">
                        Réessayer la connexion <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                )}
            </Button>
            
            <p className="text-xs text-gray-400">
                Dernière tentative : {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
