# Opus Handoff — Fix Kanban + Cost on vf-dashboard

**Date:** 2026-06-18
**Target:** olympus.110lymph.nl
**Dashboard image running:** `10.75.1.211:30500/vf-dashboard:20260618-120001-dd886b12`
**Repository:** `/root/repos/Projects/dashboard` (monorepo sibling folders, no npm workspaces)

---

## Current State

The dashboard is running and serving the SPA, but:

### ❌ Kanban Page
- Shows "waiting for Hermes" on all columns
- API returns SPA HTML instead of JSON for `/api/kanban/*` endpoints
- Logs: `kanban.db not found at /hermes/kanban.db — Hermes not connected`
- The kanban.db **exists** on the Hermes VM at `/root/.hermes/kanban.db` (13MB, updated 2026-06-18 14:15), but the dashboard pod doesn't have access to it

### ❌ Cost Page
- Shows: "No usage source connected — mount the gateway logs (PROFILES_DIR) or kanban.db (KANBAN_DB_PATH)"
- All 4 sections (7-day spend, 30-day trend, per-agent cost, recent events) show empty/zero
- Logs: `No usage events from any source`, `Cannot read profiles directory: /root/.hermes/profiles`
- Code path (`server/sources/deepseek.ts`):
  - `PROFILES_DIR` default: `/root/.hermes/profiles` — does not exist in container
  - `KANBAN_DB_PATH` default: `/hermes/kanban.db` — not mounted
  - `DEEPSEEK_API_KEY` — not set in env, so live API balance unavailable

### ✅ Working
- Main dashboard load
- Org Hub / agent roster
- News (though some RSS feeds HTTP 429/406)
- Navigation between pages

---

## What It Needs

### 1. Kanban — needs kanban.db mounted into the pod
The Hermes VM (10.11.1.120) has `/root/.hermes/kanban.db`. Options:
- Mount via NFS/CIFS share from the host
- Copy to a PersistentVolume and mount into the deployment
- Or add `KANBAN_DB_PATH` env pointing to a mounted volume

**Current env vars on the deployment:** SOURCE_TIMEOUT_MS, PROXGUARD_URL, STOREKEEPER_URL, HERMES_URL, GATEWAY_URL, NEWS_FEEDS, OUTLINE_API_KEY, DASHD_DATABASE_URL — none of these are kanban or profiles paths.

### 2. Cost — needs usage events from somewhere
Three-tier fallback (from `server/sources/deepseek.ts`):
1. **Gateway logs** at `PROFILES_DIR/logs/gateway.log` — Hermes gateways log usage there
2. **Kanban.db fallback** — estimates cost from kanban task counts
3. **DeepSeek API balance** via `DEEPSEEK_API_KEY`

At minimum, tier 2 works if kanban.db is accessible.

### 3. API endpoints return SPA HTML
The backend isn't routing `/api/*` correctly, OR the backend process isn't serving properly. When hitting:
- `curl https://olympus.110lymph.nl/api/cost/report` → returns SPA HTML
- `curl https://olympus.110lymph.nl/api/kanban/boards` → returns SPA HTML

This suggests the Express/Fastify backend isn't intercepting `/api/` routes before the static SPA fallback, or the backend crashed and only nginx is serving.

---

## Relevant Code Files

- `vf-dashboard/server/sources/deepseek.ts` — cost estimation, kanban.db fallback, PROFILES_DIR
- `vf-dashboard/server/sources/agenda.ts` — agent heartbeat/status (references kanban.db)
- `vf-dashboard/server/index.ts` (or equivalent) — API route mounting
- `vf-dashboard/Dockerfile` — how the image is built

---

## Infrastructure Notes

- K3s namespace: `mission-control`
- Current image: `10.75.1.211:30500/vf-dashboard:20260618-120001-dd886b12` (Opus's latest)
- Hermes is at `http://10.11.1.120:7000` — dashboard already has `HERMES_URL` set but it's not being used for kanban data (kanban is a SQLite file, not an API query)
- No PersistentVolume for kanban.db currently exists
- Container resource limits: 100m CPU / 128Mi memory (tight)

---

## Spec: What Fix Looks Like

**P0 — Mount kanban.db into the dashboard pod**
1. Create a way to make `/root/.hermes/kanban.db` available to the pod (PV/PVC mount, or copy to a shared volume)
2. Set `KANBAN_DB_PATH` env var to the mount path
3. Restart the pod — verify Kanban page shows cards

**P1 — Fix cost data source**
Once kanban.db is available, the cost fallback should start working automatically (tier 2). If it doesn't, check `server/sources/deepseek.ts` read path.

**P2 — Investigate why /api/ returns SPA HTML**
If kanban.db is mounted and KANBAN_DB_PATH is set but API still returns HTML, the backend server isn't routing correctly. This needs debugging of the Express route mounting.

---

## Before/After Verification

**Before:** Kanban shows "waiting for Hermes", Cost shows "No usage source connected"
**After:** Kanban shows task cards per column, Cost shows per-agent spend data
