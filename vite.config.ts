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
    // Allow ngrok tunnel domains so the prototype can be shared via a public URL.
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.dev', '.ngrok.app', '.ngrok.io'],
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
