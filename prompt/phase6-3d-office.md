Phase 6 — 3D Office: Live data integration + final pages

You are working on the 3D Agent Office at daglimmer/vf-office.
Phase 5 (lighting, avatars, free camera) is complete and verified.

## What Phase 6 delivers

### 1. Kill DEMO MODE permanently
The dashboard currently falls back to demo events after 2 seconds because the WebSocket upgrade isn't handled. The bridge adapter at /adapter/index.js needs:

- WebSocket upgrade on the /ws path (use the 'ws' npm package, not socket.io)
- On client connect: push current kanban summary immediately
- On kanban.db change (polled every 2s): push diff to all connected clients
- The demo.js fallback should ONLY trigger if the adapter is unreachable (network error), not on WebSocket failure

### 2. Backups Page (new page in the 3D Office HUD)
A panel accessible from the HUD showing:
- Per-system backup status (TrueNAS, Vaultwarden, K3s volumes, VM snapshots)
- Last run timestamp + duration
- Next scheduled run
- Size trend (last 5 runs as mini sparkline)
- Color-coded: green (successful), orange (running), red (failed)
- Data source: the bridge adapter's /api/backups endpoint (polled every 5min)

The adapter needs a new source: storekeeper.ts that reads StoreKeeper's latest scan report from the Kanban board or a local JSON file.

### 3. Docs Portal embed
A panel that loads the Fumadocs documentation site via iframe or direct fetch:
- URL configurable in adapter config (default: http://docs.110lymph.nl or localhost:3000/docs)
- Read-only file browser for agent skills, souls, memory, and docs
- Markdown rendered in-app (use marked.js, already likely in deps)
- Navigation: tree view on left, content on right

### 4. Real agent roster
Replace hardcoded agent list in demo.js with live data:
- The adapter's /api/agents endpoint already returns [{id, name, role, group, status}]
- Spawn agent avatars at their assigned anchor when status=online
- Show idle agents ghosted at their last known position
- Remove agents that have been offline >24h

## Files to modify

| File | Change |
|------|--------|
| adapter/index.js | Add WebSocket upgrade, push on kanban change |
| public/main.js | Connect to real WebSocket, remove demo fallback timer |
| public/demo.js | Refactor: keep event simulation but only as explicit fallback |
| public/backups.js | NEW — backup status panel |
| public/docs.js | NEW — docs portal panel |
| public/hud.js | Add tabs for Backups, Docs, 3D Office |
| adapter/sources/storekeeper.ts | NEW — backup data source |
| adapter/config/mapping.json | Add docsUrl, backupsSource fields |

## Rules
- No React. Vanilla JS + Three.js only.
- Keep the dark glass theme, bloom effects, pulse animations.
- All data flows through the bridge adapter (single origin: HTTP + WS on one port).
- Graceful degradation: if a source is down, show "waiting for…" — never crash.
- Agent avatars use the Phase 5 puppet model (sphere body + cone head + glow ring).

## Verification
- Open dashboard → no "DEMO MODE" banner
- WebSocket connects → kanban summary updates live
- Backups panel shows TrueNAS status with real data
- Docs panel loads and renders markdown
- Agent avatars match real gateway status
