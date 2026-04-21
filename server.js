const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/_service-worker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.map(c => caches.delete(c)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => e.respondWith(fetch(e.request)));`);
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
app.listen(PORT, () => console.log('Servidor na porta ' + PORT));
