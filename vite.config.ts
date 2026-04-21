import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync } from 'fs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: false,
      },
      build: {
        outDir: 'dist',
        rollupOptions: {
          output: {
            entryFileNames: `assets/[name]-[hash]-v2.js`,
            chunkFileNames: `assets/[name]-[hash]-v2.js`,
            assetFileNames: `assets/[name]-[hash]-v2.[ext]`
          }
        }
      },
      plugins: [
        react(),
        {
          name: 'disable-service-worker',
          closeBundle() {
            writeFileSync('dist/_service-worker.js',
              `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.map(c => caches.delete(c)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => e.respondWith(fetch(e.request)));`
            );
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
