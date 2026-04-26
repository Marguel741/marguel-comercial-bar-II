import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import { requestNotificationPermission, onForegroundMessage } from './src/firebase';

Sentry.init({
  dsn: "https://69c998a897eb9eb49d2d1e1a5b103192@o4511280052305920.ingest.us.sentry.io/4511280060170240",
  environment: "production",
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
  beforeSend(event) {
    const mode = localStorage.getItem('mg_diagnostic_mode');
    if (mode === 'NEVER') return null;
    return event;
  },
});

requestNotificationPermission().then(token => {
  if (token) {
    localStorage.setItem('mg_fcm_token', token);
  }
});

onForegroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  if (title) {
    new Notification(title, { body: body || '' });
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
