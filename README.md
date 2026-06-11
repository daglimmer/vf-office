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

## Phase 6 — Live data + Backups & Docs pages

- **Transport**: WS -> `/snapshot` polling -> demo. Demo mode now only triggers
  when the adapter is unreachable over HTTP (network error); while polling, the
  client retries the WebSocket every 15 s and silently upgrades back.
- **Backups tab** (HUD): per-system status grid (TrueNAS, Vaultwarden, K3s
  volumes, VM snapshots) — last run + duration, next scheduled, 5-run size
  sparkline, green/orange/red with red pulse on failures. Data:
  `GET /api/backups`, fed by `adapter/sources/storekeeper.js` reading the
  StoreKeeper scan report at `adapter/data/storekeeper-report.json`
  (path: `mapping.json "backupsSource"`; a sample file ships in the repo —
  StoreKeeper should overwrite it after each scan). Client polls every 5 min.
- **Docs tab** (HUD): file-tree browser (skills/, souls/, memory/, docs/) with
  in-app markdown rendering (built-in renderer, no deps). Roots default to
  `<dirname(HERMES_DB)>/<name>`, override via `mapping.json "docsRoots"`. If no
  roots are available and `"docsUrl"` is set, the panel embeds that site in an
  iframe. Endpoints: `GET /api/docs/tree`, `GET /api/docs/file?path=`.
- **Live roster**: `GET /api/agents` returns `{id, name, role, group, status,
  lastSeen, anchor}`. Online agents claim a desk (work pool), idle/recently
  offline agents stand ghosted at their last position, agents offline >24 h are
  removed. Polled every 30 s; demo mode supplies its own roster.

Note: the adapter keeps its zero-dependency stdlib WebSocket (RFC6455) rather
than the `ws` npm package — same behavior (push snapshot on connect, 2 s kanban
diff broadcast), no new deps. `storekeeper` source is plain CJS (`.js`, not
`.ts`) to match the adapter.

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
