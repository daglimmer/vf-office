# Opus — 3D Office: Remaining Fixes

## Status: Opus's commit `89f7dce` deployed

- **Image:** `10.75.1.211:30500/vf-office:20260618-opus-fix`
- **Pod:** `olympus-office-6888ddbfd-lv7f7` in `mission-control`, running
- **Adapter:** listening on port 3000, kanban snapshot serving, WS clients connecting
- **Topology:** `adapter/config/topology.json` shipped in the image — canonical groups (command/devops/operations) with correct agent assignments
- **Agent card controls:** pause/resume/kill buttons present in the bundle

## Observation: Office loads but shows "DEMO MODE — no adapter connected"

The 3D Office at `https://olympus.110lymph.nl/office/` renders the scene, but the badge says DEMO MODE. The adapter IS running and serving real data (snapshot endpoint returns all 14 agents, kanban cards, etc.), but the WebSocket connection fails.

### Root Cause

The frontend JS (`public/main.js:988`) constructs the WebSocket URL as:

```js
const proto = location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${proto}://${location.host}/ws`);
```

When the page loads over HTTPS (which olympus.110lymph.nl does), it uses `wss://olympus.110lymph.nl/ws`. The browser negotiates HTTP/2 via ALPN with Traefik, and **HTTP/2 does not support WebSocket upgrade (101 Switching Protocols)**.

**What DOES work:**
- `ws://olympus.110lymph.nl/ws` on port 80 (HTTP) → returns 101 ✅
- `wss://olympus.110lymph.nl/ws` on port 443 forcing HTTP/1.1 → returns 101 ✅
- `wss://olympus.110lymph.nl/ws` on port 443 with HTTP/2 (browser default) → fails ❌

### Attempted Fix (rolled back)

I tried adding `--entryPoints.websecure.http.tls.http2=false` to Traefik's args to disable HTTP/2 on the HTTPS entrypoint. This caused CrashLoopBackoff on the new Traefik pod — rolled back immediately, no harm done.

### Options for a Proper Fix

**Option A — Patch the frontend JS to use `ws://` explicitly (simplest)**
Change `main.js:988` to always use `ws://` and connect to port 80:
```js
const ws = new WebSocket(`ws://${location.host}/ws`);
```
⚠️ Downside: Modern browsers may block `ws://` from `https://` origins as mixed content (Chrome 86+ policies). Should test in the actual target browser.

**Option B — Separate WebSocket endpoint on a non-TLS port**
Add a dedicated `ws.110lymph.nl` subdomain or port that serves plain HTTP WebSocket. The frontend connects to `ws://ws.110lymph.nl/ws`.

**Option C — Configure Traefik to downgrade to HTTP/1.1 for the `/ws` route only**
Use a Traefik `ServersTransport` CRD with `rootCAs` or `serverName` that forces HTTP/1.1 for the olympus-office service on the WS path. Requires the Traefik CRD to exist.

**Option D — Traefik middleware for protocol switching**
Add a middleware that intercepts the `/ws` path and handles the WebSocket upgrade before HTTP/2 negotiation. More complex but doesn't affect other traffic.

**Option E — Adapter-side fix: Add an HTTP/2-compatible WebSocket handler**
Use the `@tmok/websocket-over-http2` package or similar in the adapter to handle WebSocket connections over HTTP/2. This is the architecturally correct fix but adds a dependency.

## Other changes deployed in this image

**From commit `89f7dce`:**
1. ✅ `adapter/config/topology.json` — canonical topology at the primary CONFIG_DIR path, so `agentGroupLabel()` resolves finwise/netwatch/etc correctly to Operations
2. ✅ `public/agentcard.js` — pause/resume/kill runtime controls in the 3D office agent card (wired to adapter's existing endpoints)
3. Both are inert until WebSocket connects — same DEMO MODE issue blocks them

## Also confirmed: Dashboard fixes from Opus are LIVE

The dashboard at `https://olympus.110lymph.nl/` is already running Opus's latest commit `dd886b1` (image: `vf-dashboard:20260618-120001-dd886b12`). These fixes are active:
- ✅ News render/count mismatch fixed
- ✅ Security findings fallback to live tech-watch feed
- ✅ Kanban honest null states
- ✅ Cost page actionable empty state
- ✅ Mail empty state names MAIL_ACCOUNTS env var
