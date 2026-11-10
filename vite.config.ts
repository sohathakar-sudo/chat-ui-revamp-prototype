import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { config } from './shared/config.ts';

export default defineConfig({
  root: 'web',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': `http://localhost:${config.serverPort}` },
    fs: { allow: ['..'] },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
