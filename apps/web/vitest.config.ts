import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@tipos': path.resolve(__dirname, '../../tipos')
    }
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx']
  }
});
