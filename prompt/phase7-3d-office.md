# Phase 7 — 3D Office: Dashboard Embed + Backups Panel + Docs Browser

Phase 6 delivered live data integration (real Kanban data via WebSocket). Phase 7 makes the 3D Office a *citizen of the VF Dashboard v2 ecosystem*.

---

## 1. Iframe Embed Compatibility

The VF Dashboard Phase 7 embeds the 3D Office via `<iframe>`. Make this seamless:

- Detect `window.self !== window.top` — if embedded in iframe:
  - Hide the standalone HTML title/h1 (the dashboard provides its own nav)
  - Keep the internal HUD, room nav buttons, timeline, notifications
  - Add a resize message: `parent.postMessage({ type: 'resize', height: document.body.scrollHeight }, '*')` so the dashboard can auto-size the iframe
  - Pass key events through: clicking "Peak View" in 3D → postMessage `{type: 'nav', route: '/'}` to parent
- If standalone (not embedded): current behavior unchanged (loads with its own header)

---

## 2. Backups Panel

Add a new HUD panel accessible from the top HUD strip, next to "Infra":

| Column | Source |
|---|---|
| System name | StoreKeeper report (adapter `/api/backups` endpoint) |
| Status dot | green=success, orange=warning, red=failed, gray=never-run |
| Last run | timestamp, relative ("3h ago") |
| Duration | minutes |
| Size trend | sparkline (last 5 runs) from StoreKeeper snapshot data |
| Next scheduled | eta |

The adapter already has `data/storekeeper-report.json` and a `sources/storekeeper.js` source. Read from there.

On click: expand to show the last 5 run details (started, finished, size, errors).

---

## 3. Docs File-Tree Browser

Add a floating glass panel accessible via a "Docs" button in the HUD strip.

- Reads from adapter endpoint `/api/docs/tree` (already defined in the dashboard spec)
- Left sidebar: collapsible file tree (skills/ souls/ memory/ docs/ prompts/)
- Right panel: markdown rendered file content (use a lightweight renderer like `marked` or simple regex → HTML)
- Panel is draggable, resizable, closable
- Read-only — no editing

---

## 4. Agent Click → Detail Drill-Down

When clicking an agent avatar in the 3D scene:
- Show a floating glass card with: name, role, group, status, model, provider, sessions24h, tokensToday, last 3 tasks
- Data comes from the adapter's `/api/agents/:id` endpoint (same as dashboard Phase 6)
- Card closes on clicking elsewhere or pressing Esc

---

## 5. Dashboard Health Sync

- When embedded in VF Dashboard, post a heartbeat message every 30s:
  `{type: 'heartbeat', status: 'ok'}` 
- If WebSocket disconnects or data goes stale, post:
  `{type: 'heartbeat', status: 'degraded'}` 
- The dashboard's nav pulse dot should reflect this

---

## 6. Adapter — New Endpoints

Add to `adapter/index.js`:

```
GET /api/backups     → reads storekeeper-report.json, returns array
GET /api/docs/tree   → walks the agent profiles directories, builds tree
GET /api/docs/file?path=   → returns file content as text/markdown
GET /api/agents/:id  → agent detail (existing mapping.json + live gateway poll)
```

---

## Verification

- [ ] Load dashboard → 3D Office tab → office appears inside iframe, no double header
- [ ] Backup panel shows StoreKeeper data, dot colors match real status
- [ ] Docs panel opens, tree navigable, markdown rendered
- [ ] Click agent → detail card with real model name (not hardcoded)
- [ ] Iframe heartbeat keeps dashboard nav dot green

---

**Context:** The VF Dashboard Phase 7 is cooking in parallel — this phase aligns the 3D Office with that integration so both land at the same time.
