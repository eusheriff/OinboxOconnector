import 'vitest/config';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    // Configura proxy para que chamadas /api locais vão para o Worker (porta 8787)
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    // Code splitting para reduzir bundle principal
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - React core
          'vendor-react': ['react', 'react-dom'],
          // UI libraries
          'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge', 'class-variance-authority'],
          // Map libraries (lazy loaded)
          'vendor-map': ['leaflet', 'react-leaflet'],
          // Stripe (lazy loaded quando necessário)
          'vendor-stripe': ['@stripe/stripe-js', 'stripe'],
        },
      },
    },
    // Aumentar limite para evitar warnings (após split será menor)
    chunkSizeWarningLimit: 600,
  },
});
