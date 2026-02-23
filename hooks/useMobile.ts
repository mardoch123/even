import { useState, useEffect } from 'react';

export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      // Vérifier si c'est un appareil mobile basé sur la largeur d'écran
      const isMobileDevice = window.innerWidth < 768;
      setIsMobile(isMobileDevice);
      setIsLoading(false);
    };

    // Vérifier au chargement
    checkMobile();

    // Écouter les changements de taille d'écran
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return { isMobile, isLoading };
};

// Hook pour détecter si l'app est en mode "app-like" (installée ou mobile)
export const useAppMode = () => {
  const [isAppMode, setIsAppMode] = useState(false);

  useEffect(() => {
    const checkAppMode = () => {
      // Vérifier si l'app est installée (PWA)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Ou si c'est un mobile
      const isMobileDevice = window.innerWidth < 768;
      
      setIsAppMode(isStandalone || isMobileDevice);
    };

    checkAppMode();
    window.addEventListener('resize', checkAppMode);

    return () => {
      window.removeEventListener('resize', checkAppMode);
    };
  }, []);

  return isAppMode;
};
