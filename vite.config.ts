import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2015',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (normalizedId.includes('/node_modules/pdfjs-dist/')) {
            return 'pdf';
          }
          if (normalizedId.includes('/node_modules/three/examples/')) {
            return 'three-addons';
          }
          if (normalizedId.includes('/node_modules/three/')) {
            return 'three-core';
          }
          if (
            normalizedId.includes('/node_modules/@react-three/') ||
            normalizedId.includes('/node_modules/three-stdlib/') ||
            normalizedId.includes('/node_modules/maath/') ||
            normalizedId.includes('/node_modules/troika-three-text/') ||
            normalizedId.includes('/node_modules/@use-gesture/')
          ) {
            return 'react-three';
          }
          if (
            normalizedId.includes('/node_modules/react-dom/') ||
            normalizedId.includes('/node_modules/react/') ||
            normalizedId.includes('/node_modules/scheduler/') ||
            normalizedId.includes('/node_modules/lucide-react/') ||
            normalizedId.includes('/node_modules/@capacitor/')
          ) {
            return 'vendor';
          }
        }
      }
    }
  }
});
