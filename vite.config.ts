import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'motion/react',
      'lucide-react',
      '@capacitor/core',
      '@capacitor/app',
      '@capacitor/app-launcher',
      '@capacitor/clipboard',
      '@capacitor/haptics',
      '@capacitor/status-bar',
      '@capacitor/preferences',
      '@capacitor/share',
      '@capacitor/filesystem',
      '@capacitor/keyboard',
      '@capacitor/local-notifications',
    ],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/motion')) {
            return 'vendor-motion';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
          if (id.includes('node_modules/@capacitor')) {
            return 'vendor-capacitor';
          }
        },
      },
    },
  },
});
