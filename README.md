# 110lymph.nl — Phase 4: Mission Control Polish & VF Feature Merge

Implements Build Spec v2.0 §9–§13 on top of Phase 1 (skeleton) + Phase 2 (bridge),
plus the five VF dashboard features.

## Quick start (no Hermes needed — demo mode)

```
npm install
npx vite public
```

Open the URL. With no adapter running, the app enters **DEMO MODE** automatically
and drives everything itself: card lifecycles, a gold key-comment ping at a desk,
normal/high/alert announcements, a model-fallback amber flash, a Thermic
gateway-down (collapsed pose + red card pulse) and recovery, live token/cost
counters, the infra strip, and timeline pills. Steering buttons work locally
(pause storekeeper → cascade to children, two-click kill).

## Phase 5 — Ray's feedback (June 2026)

- **Lighting**: ambient ~3x + hemisphere skylight (1.5), accent emissives doubled,
  one pendant point light per room, corridor overhead strip + guide lights,
  exposure 1.1 -> 1.3.
- **Peak View**: walls fade to 30% / ceilings to 10% with a 0.5 s tween and a
  subtle floor grid; restores on leaving Peak View.
- **Camera**: `Free Cam` button toggles unrestricted orbit/zoom; `Walk (WASD)`
  enters first-person mode (mouse look via pointer lock, Space or Esc exits).
- **Agents**: puppet avatars (sphere head + cylinder body, ~1.2 u). Head color =
  status (green active / orange idle / gray offline / red blocked), body color =
  role (gold Command, blue DevOps, white Specialists), particle ring while
  working, idle bob.
- **Transport**: vite `/ws` proxy pointed at :3001 while the adapter listens on
  :3000 — this was the permanent DEMO MODE. Proxy now defaults to :3000
  (override with `ADAPTER_TARGET`). Adapter handles the `/ws` upgrade path
  explicitly and serves `GET /snapshot`; if the WebSocket still fails, the
  client polls `/snapshot` every 2 s (badge shows "HTTP POLLING") before
  falling back to demo.

## Production wiring

1. Run the Phase 2 stack (`office-bridge`), replacing its `adapter/index.js` and
   `adapter/config/*` with the updated ones in `adapter/` here (adds `/timeline`,
   the reminder scheduler, infra `type` passthrough, `/mapping.json`).
2. `npm run build`, copy `dist/*` + `public/office.glb` + `public/waypoints.json`
   into the adapter's `public/` dir. One origin: HTTP + WS + static on :3000.
3. Dev against a live adapter: `npx vite public` — vite proxies `/agents`,
   `/timeline`, `/announce`, `/mapping.json` and the `/ws` WebSocket to :3000.

## File map

| File | Spec |
|---|---|
| `public/main.js` | 3D app: bloom (§12), hologram, runtime overlays (§7.2), peak view, WS client, `window.sim` API (§9.1), demo fallback |
| `public/hud.js` | HUD (§9): strip/expand, agent cards, badges, hierarchy, infra strip (VF1), log + history panel (VF2), rAF batching |
| `public/steering.js` | §10: pause/resume/kill, cascade, countdown-ring confirm, in-flight guard |
| `public/notifications.js` | §7.1: pings, envelopes, CSS2D panels, per-state interrupts, queueing, announcements (§11.3) |
| `public/timeline.js` | VF3: 12-h pills from `/timeline`, click → fly to owner |
| `public/style.css` | All §9–§11 styling: border-pulse, amber-pulse, conic kill ring, dark glass |
| `public/demo.js` | Demo-mode event generator |
| `adapter/` | Phase 2 adapter + `/timeline`, reminder scheduler (VF4), `/mapping.json`, infra `type` |
| `adapter/config/mapping.json` | + `reminders`, `cronJobs`, `maintenance` keys |
| `adapter/config/agents.json` | + `vm-301`, `thermic`, `cloudnode-01` (`"type": "infrastructure"`) |

## Schedule config (VF3/VF4)

`reminders`/`cronJobs` entries take `intervalMinutes` **or** `dailyAt: "HH:MM"`;
`maintenance` takes an ISO `at` + `durationMinutes`. Reminders auto-fire
`system.announcement` (15 s scheduler tick, last-fired persisted in state.json,
so adapter restarts don't replay). `/timeline` expands the next 12 h, capped at
24 occurrences per entry.

## Verified in sandbox

Adapter integration test (synthetic kanban.db): `/timeline` returns sorted,
capped items with ≥3 cron occurrences; `/mapping.json` serves models+budgets;
snapshot carries the 3 infrastructure agents with `type`; a fast reminder
auto-fires `system.announcement` over the WebSocket. All browser modules pass
syntax checks; visual behavior needs a browser run (demo mode is the harness).

## Known scope decision

Persistent gateway agents (storekeeper etc.) live in the HUD; their 3D presence
is the card avatar working under their name (if any). Runtime overlays (paused/
down/killed) apply to that avatar when present, otherwise HUD-only — the office
doesn't fill with 14 idle standing robots.
