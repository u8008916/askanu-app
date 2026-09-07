/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * `envDir: '..'` keeps one `.env` at the repository root, next to
 * `.env.example`, rather than a second copy inside `frontend/`. Only
 * `VITE_`-prefixed variables are exposed to browser code; everything else
 * loaded here stays in this config file.
 */
const ENV_DIR = '..';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ENV_DIR, '');

  /*
   * Dev-server proxy, used only when `VITE_API_BASE_URL` is empty — that is,
   * when the client is posting to a relative `/api/v1/ask`. It removes
   * cross-origin failures between the dev server and a local RAG/App service
   * without either repo changing. Dev only: it has no effect on a build, and
   * `server/` stays empty until the App service is built.
   */
  const useDevProxy = (env.VITE_API_BASE_URL ?? '').trim() === '';
  const proxyTarget = env.VITE_DEV_PROXY_TARGET ?? 'http://localhost:8080';

  return {
    plugins: [react()],
    envDir: ENV_DIR,
    server: {
      port: 5173,
      ...(useDevProxy
        ? { proxy: { '/api': { target: proxyTarget, changeOrigin: true } } }
        : {}),
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.test.{ts,tsx}'],
      // The UI suite drives the deterministic fixtures. `tests/askApi.test.ts`
      // exercises the real client directly against a stubbed `fetch`.
      env: { VITE_USE_MOCK_TRANSPORT: '1' },
    },
  };
});
