import { defineConfig } from 'vite';

// Dev-only config (SPEC-2026-043): serve public/ and pull the live board +
// portraits straight from olympus. Production needs none of this — the office
// is same-origin with /hq there.
export default defineConfig({
  root: 'public',
  server: {
    port: 5199,
    proxy: {
      '/hq': { target: 'https://olympus.110lymph.nl', changeOrigin: true, secure: true },
    },
  },
});
