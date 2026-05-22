import path from 'path';
import { fileURLToPath } from 'url';

import 'dotenv/config';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const devServerPort = Number(process.env.VITE_DEV_SERVER_PORT ?? 5173);
const devApiTarget = process.env.VITE_DEV_API_TARGET;

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    port: devServerPort,
    proxy: devApiTarget
      ? {
          '/api': {
            target: devApiTarget,
            changeOrigin: true,
          },
        }
      : undefined,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
