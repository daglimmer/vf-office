import { defineConfig } from 'vite';

// Adapter origin. The adapter defaults to :3000 (see adapter/index.js + README);
// override with ADAPTER_TARGET=http://host:port when it runs elsewhere.
// NOTE Phase 5: this previously pointed at :3001, which silently broke the /ws
// proxy and left the dashboard in permanent DEMO MODE.
const TARGET = process.env.ADAPTER_TARGET ?? 'http://127.0.0.1:3000';
const WS_TARGET = TARGET.replace(/^http/, 'ws');

export default defineConfig({
  build: { target: 'es2022' },
  esbuild: { target: 'es2022', supported: { 'top-level-await': true } },
  server: {
    proxy: {
      '/agents': TARGET,
      '/announce': TARGET,
      '/snapshot': TARGET,
      '/api': TARGET,
      '/mapping.json': TARGET,
      '/ws': { target: WS_TARGET, ws: true },
      // 2026-08-29 (t_c369e5e0): /timeline proxy + bypass removed — ticker gone.
    },
  },
});
