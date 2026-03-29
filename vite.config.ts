import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2015', // Increases compatibility for older Android phones
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('pdfjs-dist')) {
            return 'pdf';
          }
          if (
            id.includes('react-dom') ||
            id.includes('/react/') ||
            id.includes('scheduler') ||
            id.includes('lucide-react') ||
            id.includes('@capacitor')
          ) {
            return 'vendor';
          }
        }
      }
    }
  }
});
