# VF Dashboard v2 — Build Spec for Fable 5

## Stack
- **Frontend:** Vite + React 18 + Recharts + React Router v6
- **Backend:** Extend existing bridge adapter (`adapter/index.js`, Node 22+, zero deps)
- **Theme:** Dark glass (110lymph.nl style — #0d0f13 background, glass-morphism panels, amber #f59e0b accents)
- **No:** Tailwind, shadcn, MUI — custom CSS, clean, crisp, breathing room

---

## Page 1: Peak View (Home)

A single scrollable dashboard page. Top section frozen/nav-sticky.

### Top Section (Frozen Nav)
- **Navigation bar** (always visible): Peak | Kanban | Costs | Agents | Health | 3D Office → external link
- **Summary strip** (4 cards in a row):
  - Tasks: `12 in progress · 10 ready · 5 blocked`
  - Spend Today: `$4.23` (with % vs yesterday)
  - Models Active: `DeepSeek Flash (CEO) · Chat (7 specialists) · Pro (Fable 5)`
  - Infrastructure: `14/14 gateways · 3 VMs · all green`

### Scrolling Section
1. **Kanban Mini** — compact 3-column board (Ready / Running / Blocked), max 5 cards per column, "View full Kanban →" link
2. **Weekly Spend Graph** — Recharts area chart, last 7 days, dollar axis on the LEFT (not centered)
3. **Per-Agent Cost Breakdown** — horizontal bar chart, top 8 agents by spend
4. **Agent Health Grid** — tile cards: photo, name, status dot (green/yellow/red), model, last activity
5. **Recent Activity Feed** — last 10 events (task completed, gateway restarted, cost alert)
6. **Timeline** — next 12 hours pill bar (same as 3D Office timeline)
7. **Infrastructure Health** — VM list with heartbeat dots

---

## Page 2: Kanban Board

- **Columns:** Ready | In Progress | Review | Blocked | Done (collapsed)
- **Cards:** title, assignee avatar, priority badge, age (e.g. "3d"), blocked reason if blocked
- **Filters:** by agent, by priority, by age
- **Pagination:** 20 per column, "Load more"
- **Drill-down:** click card → modal with full body, comments, event timeline

---

## Page 3: Costs

### Frozen Top Section
- **Total Spend Today:** big number + sparkline
- **This Week / This Month** toggles
- **DeepSeek Balance:** remaining + days left

### Scrolling
1. **Weekly area chart** (money axis on left)
2. **Per-Agent bar chart** — sorted by spend, click → drill into agent
3. **Model Cost Comparison table:** model | price/M tokens | tokens used | total cost
4. **Cost Anomalies:** flag days with >50% spike, show cause (e.g. "Fable 5 render, 5h")

---

## Page 4: Agents

- **Organizational diagram at top** — Marcus → Oly → 7 specialists (hierarchical tree or org chart)
- **Agent tile grid below** (smaller tiles to fit full org):
  - Name, role, model, status (live/idle/offline)
  - Session count, last activity
  - Click → drill down: recent tasks, token usage, session history
- **NOT hardcoded** — agents list from `/agents` endpoint, model info from `/models`

---

## Page 5: Infrastructure Health

- **VM/node list:** name, IP, status dot, uptime, CPU/RAM bars
- **Gateway status:** 14 gateways, green/yellow/red, last restart
- **Backup status:** last snapshot time, size, success/fail
- **Drill-down per node:** detailed metrics, recent events

---

## Backend API Extensions

Add to existing `adapter/index.js`:

### `GET /costs?range=7d|30d`
```json
{
  "total_spend_today": 4.23,
  "weekly": [{"date": "2026-06-04", "spend": 3.10}, ...],
  "per_agent": [{"agent": "marcus", "spend": 1.20, "model": "deepseek-flash"}, ...],
  "by_model": [{"model": "deepseek-flash", "price_per_m": 0.28, "tokens": 500000, "cost": 0.14}, ...],
  "anomalies": [{"date": "2026-06-10", "spike_pct": 450, "cause": "Fable 5 render"}],
  "deepseek_balance": {"remaining": 42.50, "days_left": 16, "promo_expires": "2026-06-26"}
}
```
Source: SQLite `task_events` + gateway logs + Hermes usage tracking

### `GET /health`
```json
{
  "gateways": [{"name": "marcus", "status": "running", "pid": 1234, "uptime": "3h", "model": "deepseek-flash"}, ...],
  "vms": [{"name": "VM 301", "ip": "10.90.1.204", "status": "up", "cpu_pct": 45, "ram_pct": 62}, ...],
  "backups": [{"name": "k3s-snapshot", "last": "2026-06-10T02:00Z", "size": "4.2GB", "success": true}, ...]
}
```

### `GET /models`
```json
{
  "agents": [{"name": "marcus", "model": "deepseek-flash", "provider": "deepseek", "updated": "2026-06-10T06:00Z"}, ...],
  "active_models": ["deepseek-flash", "deepseek-chat", "deepseek-pro"]
}
```

---

## Design Rules
- **Money axis ALWAYS on the left** in charts, not centered
- **Drill-down, not dead links** — clicking an agent/card always goes deeper, never back to home
- **Status colors:** green (online), yellow/orange (degraded/idle), red (offline/blocked)
- **Frozen top nav** on every page — user never scrolls to navigate
- **Compact density** — Peak View shows everything at a glance, drill-down for detail
- **Live data** — WebSocket for real-time updates, polling fallback (5s)

---

## Priority Order
1. Peak View (home page)
2. Backend: `/costs` + `/health` endpoints
3. Costs page
4. Agent Health page
5. Infrastructure Health page
6. Kanban Board (full)
7. Backend: `/models` endpoint

---

## Deliverables
- `vf-dashboard-v2/` — complete Vite + React project
- Extended `adapter/index.js` — with new endpoints
- `docker-compose.yml` to serve on K3s
