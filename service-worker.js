/* eslint-disable no-restricted-globals */

// Nom du cache pour les assets statiques
const CACHE_NAME = 'eveneo-cache-v1';
const DYNAMIC_CACHE_NAME = 'eveneo-dynamic-v1';

// Fichiers à mettre en cache immédiatement
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. INSTALLATION : Mise en cache des fichiers statiques essentiels
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching global app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. ACTIVATION : Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. FETCH : Stratégie "Stale-While-Revalidate" pour une fluidité maximale
// Sert le cache d'abord, puis met à jour en arrière-plan
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET et les extensions chrome/api
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Mise à jour du cache dynamique seulement si la réponse est valide
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      }).catch(() => {
          // Si réseau échoue et pas de cache (ex: page offline spécifique)
          // Pour une SPA, on renvoie souvent index.html pour les navigations
          if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
          }
      });

      // Retourne le cache s'il existe, sinon attend le réseau
      return cachedResponse || fetchPromise;
    })
  );
});

// 4. PUSH NOTIFICATIONS : Gestion des messages entrants
self.addEventListener('push', (event) => {
  let data = { title: 'Nouvelle notification', body: 'Vous avez reçu une alerte Événéo.', url: '/' };

  if (event.data) {
    try {
        data = event.data.json();
    } catch (e) {
        data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'https://ui-avatars.com/api/?name=E&background=8A2DF9&color=fff&size=192&rounded=true&bold=true', // Fallback icon
    badge: 'https://ui-avatars.com/api/?name=E&background=fff&color=000&size=96&rounded=true',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/' // URL de redirection au clic
    },
    actions: [
        { action: 'open', title: 'Voir' },
        { action: 'close', title: 'Fermer' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 5. NOTIFICATION CLICK : Ouverture de l'app au clic
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si une fenêtre est déjà ouverte, on la focus
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          if (event.notification.data.url) {
              client.navigate(event.notification.data.url);
          }
          return client.focus();
        }
      }
      // Sinon on en ouvre une nouvelle
      if (clients.openWindow && event.notification.data.url) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});