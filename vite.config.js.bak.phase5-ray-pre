import { defineConfig } from 'vite';

export default defineConfig({
  build: { target: 'esnext' },
  esbuild: { target: 'esnext' },
  server: {
    proxy: {
      '/agents': 'http://127.0.0.1:3001',
      '/announce': 'http://127.0.0.1:3001',
      '/mapping.json': 'http://127.0.0.1:3001',
      '/ws': { target: 'ws://127.0.0.1:3001', ws: true },
      '/timeline': {
        target: 'http://127.0.0.1:3001',
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
