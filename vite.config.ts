import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    envPrefix: 'API_',
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.API_PROXY || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
