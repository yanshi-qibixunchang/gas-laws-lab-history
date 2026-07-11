import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const require = createRequire(import.meta.url);
const {
  WORKBENCH_MAX_JAVASCRIPT_CHUNK_BYTES,
  getWorkbenchChunkName,
} = require('./build/workbenchBuildPolicy.cjs') as {
  WORKBENCH_MAX_JAVASCRIPT_CHUNK_BYTES: number;
  getWorkbenchChunkName: (id: string) => string | null;
};

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
    chunkSizeWarningLimit: WORKBENCH_MAX_JAVASCRIPT_CHUNK_BYTES / 1000,
    rollupOptions: {
      output: {
        strictExecutionOrder: true,
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [{ name: getWorkbenchChunkName }],
        },
      }
    }
  }
});
