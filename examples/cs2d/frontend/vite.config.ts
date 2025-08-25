import { defineConfig } from 'vite';
// Make React plugin optional to avoid hard failure in CI where devDeps may be pruned
let reactPlugin: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  reactPlugin = (await import('@vitejs/plugin-react')).default?.() || null;
} catch {
  reactPlugin = null;
}
import { resolve } from 'path';

export default defineConfig({
  plugins: [reactPlugin].filter(Boolean),
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:9294',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:9292',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
