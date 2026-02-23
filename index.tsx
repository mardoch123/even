import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (import.meta.env.PROD) {
  serviceWorkerRegistration.register({
    onSuccess: () => console.log('PWA installée et prête hors-ligne.'),
    onUpdate: () => console.log('Nouvelle version disponible.')
  });
} else {
  serviceWorkerRegistration.unregister();
}