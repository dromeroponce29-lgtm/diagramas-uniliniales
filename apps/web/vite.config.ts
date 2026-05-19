import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  // Usamos rutas relativas para que funcione tanto en localhost
  // como en GitHub Pages (subruta) o en un dominio personalizado.
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@tipos': path.resolve(__dirname, '../../tipos')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
