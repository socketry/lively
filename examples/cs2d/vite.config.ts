import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  base: '/',
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@frontend': path.resolve(__dirname, './frontend'),
      '@lib': path.resolve(__dirname, './lib'),
      '@spec': path.resolve(__dirname, './spec'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  server: {
    port: 3000,
    host: true,
    strictPort: false,
    open: false,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:9294',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:9292',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        game: path.resolve(__dirname, 'public/_static/game.html'),
        editor: path.resolve(__dirname, 'public/_static/map_editor.html'),
      },
      output: {
        manualChunks: {
          vendor: ['vue', 'pinia', 'vue-router'],
          game: ['pixi.js', 'matter-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['vue', 'pinia', 'vue-router'],
    exclude: ['@playwright/test'],
  },
  esbuild: {
    target: 'es2022',
    legalComments: 'none',
  },
});
