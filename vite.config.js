import { defineConfig } from 'vite';

// Adapter origin. The adapter defaults to :3000 (see adapter/index.js + README);
// override with ADAPTER_TARGET=http://host:port when it runs elsewhere.
// NOTE Phase 5: this previously pointed at :3001, which silently broke the /ws
// proxy and left the dashboard in permanent DEMO MODE.
const TARGET = process.env.ADAPTER_TARGET ?? 'http://127.0.0.1:3000';
const WS_TARGET = TARGET.replace(/^http/, 'ws');

export default defineConfig({
  build: { target: 'esnext' },
  esbuild: { target: 'esnext' },
  server: {
    proxy: {
      '/agents': TARGET,
      '/announce': TARGET,
      '/snapshot': TARGET,
      '/mapping.json': TARGET,
      '/ws': { target: WS_TARGET, ws: true },
      '/timeline': {
        target: TARGET,
        bypass: function(req, res, proxyOptions) {
          // If the request is for /timeline.js, don't proxy it
          if (req.url.endsWith('.js') || req.url.endsWith('.css')) {
            return req.url;
          }
        },
      },
    },
  },
});
