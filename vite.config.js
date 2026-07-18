import { defineConfig } from 'vite';

// Adapter origin. The adapter defaults to :3000 (see adapter/index.js + README);
// override with ADAPTER_TARGET=http://host:port when it runs elsewhere.
// NOTE Phase 5: this previously pointed at :3001, which silently broke the /ws
// proxy and left the dashboard in permanent DEMO MODE.
const TARGET = process.env.ADAPTER_TARGET ?? 'http://127.0.0.1:3002';
const WS_TARGET = TARGET.replace(/^http/, 'ws');

export default defineConfig({
  base: '/office/',
  build: { target: 'es2022' },
  esbuild: { target: 'es2022' },
  server: {
    proxy: {
      '/agents': { target: TARGET, changeOrigin: true, prependPath: false },
      '/announce': { target: TARGET, changeOrigin: true, prependPath: false },
      '/api': { target: TARGET, changeOrigin: true, prependPath: false },
      '/mapping.json': { target: TARGET, changeOrigin: true, prependPath: false },
      '/ws': { target: WS_TARGET, ws: true },
      '/timeline': {
        target: TARGET,
        changeOrigin: true,
        bypass: function(req, res, proxyOptions) {
          if (req.url.endsWith('.js') || req.url.endsWith('.css')) {
            return req.url;
          }
        },
      },
    },
  },
});

