
// Ce code optionnel permet d'enregistrer un service worker.
// register() n'est appelé par défaut que dans l'environnement de production.

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    // [::1] est l'adresse localhost IPv6.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 sont considérés comme localhost pour IPv4.
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

export function register(config?: Config) {
  if ('serviceWorker' in navigator) {
    // GUARD: Service Workers require HTTP or HTTPS. 
    // This prevents errors when running in preview environments (blob:) or locally (file:).
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
        console.log('Service Worker registration skipped: unsupported protocol', window.location.protocol);
        return;
    }

    // Correction : Construction manuelle de l'URL pour éviter les erreurs "Invalid URL" avec le constructeur URL()
    // et garantir que l'origine correspond au document (évite Origin Mismatch).
    // On prend le protocole, l'hôte, et le chemin jusqu'au dernier '/' pour servir le SW depuis le même dossier.
    const protocol = window.location.protocol;
    const host = window.location.host;
    
    // Récupération du chemin de base (dossier courant)
    let path = window.location.pathname;
    const lastSlashIndex = path.lastIndexOf('/');
    if (lastSlashIndex !== -1) {
        path = path.substring(0, lastSlashIndex);
    }
    
    // Construction de l'URL absolue : protocole://hote/chemin/service-worker.js
    const swUrl = `${protocol}//${host}${path}/service-worker.js`;

    window.addEventListener('load', () => {
      if (isLocalhost) {
        // Ceci tourne sur localhost. Vérifions si un service worker existe toujours.
        checkValidServiceWorker(swUrl, config);

        // Ajouter des logs supplémentaires pour localhost.
        navigator.serviceWorker.ready.then(() => {
          console.log(
            'Cette application web est servie cache-first par un service worker.'
          );
        });
      } else {
        // Pas localhost. Juste enregistrer le service worker.
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Nouveau contenu disponible; veuillez rafraîchir.
              console.log(
                'Nouveau contenu disponible; veuillez rafraîchir.'
              );

              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // Contenu mis en cache pour une utilisation hors ligne.
              console.log('Contenu mis en cache pour une utilisation hors ligne.');

              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error("Erreur lors de l'enregistrement du service worker:", error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  // Vérifier si le service worker peut être trouvé. Si non, recharger la page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Assurer que le service worker existe et que nous obtenons bien un fichier JS.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // Pas de service worker trouvé. Probablement une autre app. Recharger la page.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker trouvé. Procéder normalement.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log(
        'Pas de connexion internet trouvée. L\'application tourne en mode hors ligne.'
      );
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
