# Argus — Customer-Facing Portal — Build Spec for Opus

## Overview

Argus is the **customer-facing portal** at `argus.110lymph.nl`. It is NOT the internal Olympus dashboard — customers see a simplified view focused on **what has been done to mitigate their issues**, not how the engine works.

The data stays with 110lymph. Customers pay for the service (mitigation, audit, compliance readiness) — they do NOT pay for the system. If they want a copy of their data, they can get one on request. By default, the portal shows only mitigation outcomes.

**Key philosophy:** Argus is the windshield, not the engine. Customers see results, not internals.

---

## What the Customer Sees

1. Login to `argus.110lymph.nl`
2. **Dashboard overview** — "52 Open · 18 In Progress · 235 Resolved · 12 Closed"
3. **Action Board** — One row per finding, clean table:
   - Severity (color-coded)
   - Title
   - Status (Open / In Progress / Resolved / Closed)
   - Category (storage, network, security, compliance, etc.)
   - Created date
   - Resolved date
4. Click a finding → **Detail view** showing:
   - What was found
   - What was done to mitigate it
   - When it was resolved
   - By which automated process
5. **Reports tab** — Generate/export compliance and audit reports (CSV, PDF)
6. **No access to:** agent names, retry loops, Kanban internals, tool call logs, workspace paths, internal system state

## What the Customer Does NOT See

- Agent names (NetWatch, ProxGuard, etc.)
- Retry counts or failed attempts
- SQLite databases or workspace paths
- Tool call logs or Hermes internals
- The 110lymph K3s cluster, Proxmox hosts, or any internal infrastructure
- Anything that says "we're debugging this" — only clean status

The data (logs, findings, audit trail) stays with 110lymph. The customer gets the service result — the fix, the audit, the compliance check. If they want raw data, they request it and receive a copy.

---

## Architecture

``` 
argus.110lymph.nl
       │
       ▼
  ┌─────────────────────────────┐
  │  Traefik IngressRoute       │  (K3s cluster, Let's Encrypt TLS)
  │  Host: argus.110lymph.nl    │
  └──────────┬──────────────────┘
             │
  ┌──────────▼──────────────────┐
  │  Argus Frontend (React SPA) │
  │  - Dashboard overview       │
  │  - Action Board (read-only) │
  │  - Finding detail page      │
  │  - Reports / export         │
  │  - Customer branding        │
  └──────────┬──────────────────┘
             │
  ┌──────────▼──────────────────┐
  │  Argus API Server           │
  │  (Node/Express or FastAPI)  │
  │  - GET /api/action-board    │
  │  - GET /api/findings/:id    │
  │  - GET /api/stats           │
  │  - POST /api/reports        │
  └──────────┬──────────────────┘
             │
  ┌──────────▼──────────────────┐
  │  Postgres Database          │
  │  (shared or dedicated)      │
  │  - findings table           │
  │  - mitigations table        │
  │  - customer metadata        │
  └─────────────────────────────┘
```

**Tech stack:** Vite + React + TypeScript frontend, Node/Express or FastAPI backend (your choice — whatever produces cleaner results faster), Postgres for persistence.

**Existing infrastructure to use:**
- K3s cluster (10.75.1.0/24) for deployment
- Traefik ingress with Let's Encrypt TLS
- Postgres available at `outline-db.outline.svc.cluster.local:5432` (use a separate `argus` schema/database)
- Docker registry at `10.75.1.211:30500`
- CI/CD pipeline via GitHub Actions (push to `daglimmer/Projects` → build → deploy)

---

## Data Model

### Finding
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| customer_id | UUID | Customer/tenant |
| title | string | Short description |
| description | text | Full finding details |
| severity | enum | critical, high, medium, low, info |
| status | enum | open, in_progress, resolved, closed |
| category | string | storage, network, security, compliance, hardware, software |
| mitigation | text | What was done to resolve this |
| mitigated_by | string | Automated process name (not agent name — e.g. "Auto-Remediation Engine") |
| created_at | timestamp | When found |
| resolved_at | timestamp | When resolved |
| verified_at | timestamp | When verification passed |

### Customer
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | string | Customer/tenant name |
| domain | string | Customer domain |
| settings | jsonb | Customer preferences/overrides |
| created_at | timestamp | |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/stats | Dashboard counts (open/in_progress/resolved/closed) |
| GET | /api/findings | Paginated finding list (filters: severity, status, category) |
| GET | /api/findings/:id | Single finding detail with mitigation history |
| POST | /api/reports | Generate CSV/PDF report (body: {type, date_range, filters}) |
| GET | /api/reports/:id | Download generated report |

---

## Pages

### 1. Dashboard (/)
- Counter cards: Open · In Progress · Resolved · Closed
- Severity breakdown (critical/high/medium/low pie or bar)
- Recent findings (last 5, with status badges)
- Trend chart (findings over last 30 days)

### 2. Action Board (/action-board)
- Filterable, sortable table of all findings
- Columns: Severity · Title · Status · Category · Created · Resolved
- Click row → detail view
- Filter pills: All · Open · In Progress · Resolved · Closed
- Sort by any column header

### 3. Finding Detail (/findings/:id)
- Full description
- Mitigation summary (what was done)
- Timeline: found → in progress → resolved → verified
- Evidence section (verification results, screenshots if applicable)

### 4. Reports (/reports)
- Report type selector (Compliance Summary, Audit Trail, Monthly Activity)
- Date range picker
- Generate and download as CSV or PDF

### 5. Settings (/settings)
- Customer profile (name, domain)
- Notification preferences (email alerts, weekly summaries)
- API key management (for their own integrations)

---

## Design Requirements

- **Dark theme** professional look (dark glass, high-tech, Apple-level polish)
- **Clean, minimal** — the customer should understand their infrastructure health in 10 seconds
- **Mobile-responsive** — works on phone, tablet, desktop
- **No hardcoded data** — everything from the API
- **Loading/empty/error states** — never display stale or broken data
- **Accessible** — keyboard navigation, focus states, screen reader friendly

---

## What NOT to Build (Same as Never)

- Do NOT rebuild the Kanban board for customers — they get the **Action Board** (read-only findings table)
- Do NOT expose agent names, internal tool calls, retry loops, or workspace paths
- Do NOT build real-time WebSocket unless explicitly requested — HTTP polling (30s) is fine
- Do NOT build customer signup/self-service for v1 — customers are manually provisioned

---

## The NUC Box (pve-ar-01)

There's a **NUC at 10.11.1.227** (hostname: pve-ar-01, Proxmox VE 8.x, 15GB RAM, Tailscale: 100.104.254.75). This is the physical test box where the collector agent runs. The portal itself deploys on K3s, but the collector data flows from this NUC into the system.

The collector agent is already installed (runs every 5min via systemd timer + oneshot service). It discovers devices on the customer network via 6-layer scanning (ICMP → ARP → TCP → mDNS → SNMP → SSH/WinRM). It pushes data to the ingestion endpoint.

You don't need to modify the collector for v1 — just make sure the API can receive and store the data it pushes. The existing collectors push to an ingestion API — if no ingestion API is running, the collector caches locally in SQLite.

---

## Data Separation — 110lymph Owns the Data

This is a business requirement, not a technical detail:

1. All finding data, logs, audit trails are stored **on 110lymph infrastructure** (K3s Postgres) — never on customer premises
2. The NUC pushes data outbound-only to the K3s ingestion API — no inbound access from K3s to customer network
3. The customer portal reads from the central database — the customer gets a filtered view, not a copy
4. If the customer wants their data: they request a data export report (via the Reports page), and 110lymph provides it
5. The NUC is a thin collector — no customer data persists there beyond the 5-minute cache window

---

## Build Phases

### Phase 1 — Foundation
- Argus API server with Postgres schema (findings, customers, mitigations)
- Dashboard overview page (stats cards, recent findings)
- Action Board page (filterable/sortable table)
- Authentication (API key or simple JWT for now — OIDC/Dex can be added later)

### Phase 2 — Detail & Mitigation
- Finding detail page with full timeline
- Mitigation evidence display
- Status progression tracking

### Phase 3 — Reports
- Report generation (CSV first, PDF second)
- Date range and filter options
- Report download

### Phase 4 — Polish & Production
- Dark theme professional design
- Mobile responsive
- Error/loading/empty states everywhere
- Customer settings page
- Notification preferences

---

## Files to Create

```
argus-portal/
├── Dockerfile
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .dockerignore
├── .gitignore
├── server/
│   ├── index.ts              # Express/FastAPI entry
│   ├── db.ts                 # Postgres connection + schema
│   ├── routes/
│   │   ├── stats.ts
│   │   ├── findings.ts
│   │   └── reports.ts
│   └── middleware/
│       └── auth.ts
├── src/
│   ├── main.tsx              # React entry
│   ├── App.tsx               # Router + layout
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── ActionBoard.tsx
│   │   ├── FindingDetail.tsx
│   │   ├── Reports.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── Layout.tsx        # Sidebar + header shell
│   │   ├── StatCard.tsx
│   │   ├── FindingsTable.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── SeverityIcon.tsx
│   │   └── Timeline.tsx
│   ├── hooks/
│   │   └── useApi.ts         # fetch wrapper with error/loading state
│   └── styles/
│       └── global.css
└── k8s/
    ├── deployment.yaml
    ├── service.yaml
    ├── ingressroute.yaml
    └── namespace.yaml
```

---

## Verification Criteria

- [ ] `argus.110lymph.nl` loads the dashboard
- [ ] Stats cards show correct counts
- [ ] Action Board renders findings from API
- [ ] Filter by status/severity works
- [ ] Click finding → detail page with mitigation info
- [ ] Report generation produces CSV
- [ ] Mobile layout works (responsive)
- [ ] No agent names or internal paths exposed
- [ ] Dark theme consistent across all pages
- [ ] Loading/error/empty states present

---

## Build & Deploy

This project lives in `daglimmer/Projects` on GitHub (same monorepo as the vf-dashboard). Create it under `Projects/argus-portal/`.

Process:
1. Build the full project
2. Push to GitHub (`daglimmer/Projects`, branch `master`)
3. Include a working Dockerfile and K8s manifests
4. Build `docker build -t 10.75.1.211:30500/argus-portal:v1 .`
5. Push to `10.75.1.211:30500/argus-portal:v1`
6. Deploy with `kubectl apply -f k8s/`
7. Verify: `curl -sk https://argus.110lymph.nl/api/stats`
8. Include seed data (a few sample findings) so the portal isn't empty on first deploy

---

*Write this as one-shot execution. Build, push, deploy, and verify in a single pass. No iterative ping-pong — deliver a working portal.*
