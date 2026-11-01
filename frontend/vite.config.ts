import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base:
      mode === 'pages'
        ? env.PAGES_BASE_PATH || '/Airline-Reservation-Systemm/'
        : '/',
    define: {
      'import.meta.env.VITE_DEMO_MODE': JSON.stringify(
        mode === 'pages' ? 'true' : 'false',
      ),
    },
    plugins: [react()],
    optimizeDeps: {
      include: ['zustand', '@react-three/fiber', '@react-three/drei', 'three'],
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': env.API_PROXY_TARGET || 'http://localhost:8080',
        '/actuator': env.API_PROXY_TARGET || 'http://localhost:8080',
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      exclude: [...configDefaults.exclude, 'e2e/**', 'e2e-pages/**'],
    },
  };
});
