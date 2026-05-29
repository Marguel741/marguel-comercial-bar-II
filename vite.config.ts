import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const buildDate = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    return {
      define: {
        __APP_VERSION__: JSON.stringify(`v${buildDate}`),
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: false,
      },
      build: {
        outDir: 'dist',
        rollupOptions: {
          output: {
            entryFileNames: `assets/[name]-[hash].js`,
            chunkFileNames: `assets/[name]-[hash].js`,
            assetFileNames: `assets/[name]-[hash].[ext]`,
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-firebase': ['firebase/app', 'firebase/firestore'],
              'vendor-charts': ['recharts'],
              'vendor-ui': ['lucide-react', 'motion'],
            },
          }
        }
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
