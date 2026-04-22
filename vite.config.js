import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: process.env.HOST || 'localhost',
    proxy: {
      '/ws': {
        target: process.env.HOST === '0.0.0.0' ? 'ws://localhost:3001' : 'ws://localhost:3001',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist'
  },
  css: {
    postcss: './postcss.config.js'
  }
});