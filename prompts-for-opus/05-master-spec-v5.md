# Opus Master Spec v5 — 110lymph Phase 5 (FINAL)
> **One-shot brief.** Read this entire document, backtrack each project's current state, then execute all remaining work. Do not ask questions — the answers are below.

## Before You Touch Anything

1. **Clone these repos:**
   - `https://github.com/daglimmer/vf-office` (branch: `master`) — [3D Office]
   - `https://github.com/daglimmer/Projects` (branch: `main`) — [Monorepo; dashboard lives at `dashboard/vf-dashboard/`]
2. **Read the ARCHITECTURE.md** at `/root/110lymph-homelab/ARCHITECTURE.md` on the Hermes VM, or the Fumadocs mirror at `https://olympus.110lymph.nl/docs/architecture` — understand the system: canonical domains, K3s cluster, CI/CD pipeline, ingress routing, agent fleet.
3. **Read the K3s manifests** at `/root/110lymph-homelab/infrastructure/kustomize/` — understand how deployments work: Docker images from `10.75.1.211:30500`, `ImagePullPolicy: IfNotPresent`, Traefik IngressRoutes, namespaces.
4. **Verify current live state** — curl these endpoints and compare with what the repo says:
   - `https://olympus.110lymph.nl/office/` — 3D Office (SEAT_OFFSET=-0.18 deployed)
   - `https://olympus.110lymph.nl/` — Dashboard (main)
   - `https://olympus.110lymph.nl/agents` — Dashboard (agents page) — RETURNS 404 (B2)
   - `https://olympus.110lymph.nl/api/agents` — Agent data API
   - `https://olympus.110lymph.nl/kb` — Outline knowledge base
5. **Read the changelogs** at `/root/110lymph-homelab/changelog/` sorted by date — understand what's been done recently.

---

## Project A: 3D Office (`daglimmer/vf-office`)

### Current Live State
- **URL:** `https://olympus.110lymph.nl/office/`
- **Pod:** `olympus-office` in `mission-control` namespace
- **Image:** `10.75.1.211:30500/vf-office:20260617-seatoffset-0.18`
- **SEAT_OFFSET = -0.18** deployed and verified live in bundle as `pos.y+-.18`
- **Current bundle hash:** `index-Btm2Z01f.js`
- **GLB model:** `office.glb` (731KB) — all anchor positions Y=0, room node names "staff" and "devops"
- **DEMO MODE badge visible** — `no adapter connected` — no adapter running in container

### What's Already Fixed (Prior Phases)
- ✅ **Upside-down avatars** — yaw extraction via `atan2(quat.y, quat.w)*2`
- ✅ **State-based seating** — agents sit/stand based on `agent.seated` boolean
- ✅ **Pinned anchors** — agents stay at assigned desks
- ✅ **Desk glow** — hovered desks highlight
- ✅ **Ghost mode** — placeholder agents when API is unreachable
- ✅ **SEAT_OFFSET = -0.18** — avatars seated at ~95% correct height (may need final nudge, user will test)
- ✅ **Dynamic roster from API** — agents come from Hermes Gateway
- ✅ **Room labels in waypoints.json** — "Operations Office", "DevOps Office", "Command Center" etc. deployed

### What's NOT Done (for Opus)

#### A1. GLB Room Labels (office.glb) [Blender required]
The 3D model has baked-in floating text labels visible in the scene ("STAFF", "DEVOPS", "CORRIDOR", etc.). These are part of the `.glb` mesh. The user hasn't complained about these, but they say "staff" and "devops" instead of "Operations Office" and "DevOps Office".

**Options (pick one, document what you chose):**
1. **Leave as-is** — the floating words exist but waypoints.json has the correct labels
2. **Re-export from Blender** — edit the text meshes and re-export `office.glb`. Requires Blender and knowledge of the GLB structure.
3. **Overlay DOM labels** — Add Three.js Sprite labels that float above each room. Easier than re-exporting.

#### A2. Adapter State Persistence [~30 min]
The adapter's `state.json` file lives in the container's read-only filesystem and resets on pod restart. This is why the "DEMO MODE — no adapter connected" badge shows.

**Fix:**
- Add a writable volume to the olympus-office deployment
- Add env var `STATE_DIR` pointing to the mount
- Ensure the adapter writes state there and reads it on startup

#### A3. Navigation Link Cleanup [~5 min]
The 3D office has a navigation/teleport UI element that points to `localhost:5174` (Vite dev port). This should point to the correct production URL or be removed.

**Fix:** Find the navigation URL reference (likely in `public/main.js` or a config) and update it to `https://olympus.110lymph.nl/office/` or remove the localhost reference entirely.

---

## Project B: Dashboard (`daglimmer/Projects/dashboard/vf-dashboard/`)

### Current Live State
- **URL:** `https://olympus.110lymph.nl/` (main), `https://olympus.110lymph.nl/agents` (agents page — returns 404)
- **Pod:** `vf-dashboard` in `mission-control` namespace
- **Image:** `10.75.1.211:30500/vf-dashboard:peakview-fix-20260617-141520`
- **Bundle:** `/assets/index-BHdkq_BS.js` — contains GROUP_ORDER `["Command","DevOps","Operations"]` fix
- **API:** `https://olympus.110lymph.nl/api/agents` — serves 14 agents, 6 online, 8 offline
- **IngressRoute issue:** `PathPrefix(/agents)` routes to `olympus-office` (3D office pod) instead of `vf-dashboard` — this is the root cause of B2

### What's Already Fixed
- ✅ **Group labels normalized** — `GROUP_ORDER: ["Command", "DevOps", "Operations"]` in PeakView.tsx and AgentsPage.tsx
- ✅ **Agent detail API** — `reportedModel`/`reportedProvider` mapped to `model`/`provider`
- ✅ **All 14 agents shown** — 24h dead-agent filter removed
- ✅ **Operations view** — group filter, agent list, live config

### What's NOT Done (for Opus)

#### B1. `/agents` Returns 404 [ROOT CAUSE KNOWN] [~15 min]
`https://olympus.110lymph.nl/agents` returns HTTP 404 because Traefik's IngressRoute routes `PathPrefix(/agents)` to the `olympus-office` service, which doesn't serve that route.

**Root cause:** The `olympus-https` IngressRoute has a rule catching `/agents` before the Express SPA fallback can handle it.

**Fix — TWO approaches (pick one):**
1. **IngressRoute fix (recommended):** Remove the `PathPrefix(/agents)` catch from the office route, or re-order rules so `/agents` falls through to the dashboard's catch-all handler
2. **SPA fallback on office:** Add a catch-all to the office Express server that redirects unknown routes to the dashboard

**Either way, verify:** `curl https://olympus.110lymph.nl/agents` returns HTML (not "not found")

#### B2. Operations Shows Agents Offline [investigation needed]
The Operations group view shows agents as offline while some are genuinely offline and others may have stale heartbeat data.

**Current state from API:** 8 agents offline (deploybot, finwise, homeassistant, k8slearn, marcus, netwatch, proxguard, storekeeper — last seen June 5-16). 6 online (devops, devops-api, devops-app, devops-infra, oly, sentinel).

**Investigate:**
1. Are the "offline" agents genuinely offline or is the status calculation wrong?
2. Check if the dashboard's status threshold is reasonable (e.g., 5 min without heartbeat → offline)
3. If the calculation is correct, this is NOT a bug — just display the data accurately

**Fix if it's a bug:** Adjust the offline threshold or fix the heartbeat tracking

#### B3. Agent Detail Page — Verify Data Flow [~15 min]
`AgentDetailPage.tsx` fetches individual agent data.

**Investigate:**
- Does the route `/agent/:id` work in React Router?
- Does the API endpoint return detailed agent info?
- Does the page render agent details (model, provider, status, last seen, recent tasks)?
- The user reports it works: "when I click on it it drills down, shows me which plan you are on and which fallback, recent tasks, online/offline"

**If it works:** Leave it alone — mark as verified in the checklist
**If broken:** Fix the data binding

#### B4. News Page — Simplify to 3 Topics [~30 min]
The news page currently shows "all those topic bits." The user wants exactly 3 options:
1. **Tech news**
2. **Dutch news** (local Netherlands news)
3. **Serenam news** (company/industry-specific news)

**Fix:**
- Reduce the news topic filter to these 3 options only
- Remove all other topic categories
- Ensure the news data source supports these categories
- Verify the news-refresh CronJobs or data fetchers work for these 3 categories

---

## Project C: Outline Knowledge Base

### Current Live State
- **URL:** `https://olympus.110lymph.nl/kb`
- **Auth:** `https://olympus.110lymph.nl/dex` — Dex OIDC with local password auth
- **Default login:** `ray@110lymph.nl` / `changeme123`
- **Namespace:** `outline`
- **Components:** Outline (1 pod), Dex (1 pod), PostgreSQL (1 pod), Redis (1 pod)
- **All pods running** — verified healthy
- **Outline homepage renders** — verified via curl

### What's Done
- ✅ Outline deployed and running
- ✅ Dex deployed with local password auth
- ✅ IngressRoutes configured (`/kb` → Outline, `/dex` → Dex with NO strip-prefix)
- ✅ Database URL password fix applied
- ✅ Dex probe port fixed (5558 for telemetry, not 5556)

### What's NOT Done (for Opus)

#### C1. GitHub OAuth App Setup [~15 min]
**Why:** Local password auth is temporary. Replace with GitHub OAuth.

**Steps:**
1. Go to `https://github.com/settings/applications/new` (as `ray@110lymph.nl`)
2. Create OAuth App:
   - Name: "110lymph Knowledge Base"
   - Homepage URL: `https://olympus.110lymph.nl/kb`
   - Authorization callback URL: `https://olympus.110lymph.nl/dex/callback`
3. Get Client ID and Client Secret
4. Update Dex config (`/root/110lymph-homelab/plans/outline-deployment-manifests/dex-config.yaml`):
   ```yaml
   enablePasswordDB: false  # disable local auth once GitHub works
   staticClients:
     - id: outline
       redirectURIs:
         - 'https://olympus.110lymph.nl/kb/auth/oidc.callback'
       name: 'Outline'
       secret: <outline-client-secret>
   connectors:
     - type: github
       id: github
       name: GitHub
       config:
         clientID: <github-client-id>
         clientSecret: <github-client-secret>
         redirectURI: https://olympus.110lymph.nl/dex/callback
   ```
5. Update the Dex `ConfigMap` and restart Dex pod
6. Verify: login via "Log in with GitHub" button should redirect to GitHub OAuth flow

#### C2. CSP Fix for Outline [if needed]
Outline may have Content Security Policy issues when loaded behind the reverse proxy. If you see console errors about inline styles or eval, update the Outline config's CSP or add the proxy's host to `ALLOWED_DOMAINS`.

**Check:** Open browser DevTools at `https://olympus.110lymph.nl/kb` and look for CSP errors. If found, add `https://olympus.110lymph.nl` to the CSP `frame-src`, `connect-src`, and `style-src` directives in Outline's config.

#### C3. Write 5 Seed KB Articles [~30 min content]
Write meaningful 110lymph-homelab articles using the Outline API or web UI.

**Suggested articles:**
1. **"Architecture Overview"** — summary of the homelab: network topology, K3s cluster, CI/CD pipeline, agent fleet. Source: ARCHITECTURE.md
2. **"Agent Framework — Roles & Chain of Command"** — 14 agents, their roles, escalation chain, cross-agent knowledge rules
3. **"Deployment Pipeline"** — how to deploy: Git push → build → push to registry → kubectl set image → verify health probe. Canonical domains policy.
4. **"Network & Access"** — VLAN map, firewall rules, VPN access, how to access each system (Proxmox, TrueNAS, PBS, K3s dashboard)
5. **"Incident Response Playbook"** — NetWatch P1 chain, what to do when a service goes down, escalation paths, post-mortem process

#### C4. Hermes `kb-writer` Skill [~1 hour]
Create a Hermes skill that lets any agent post to Outline. This enables agents to auto-document changes, incident reports, and knowledge articles.

**Skill spec:**
- Uses Outline API (REST at `/kb/api`)
- Requires an API key from Outline Settings
- Functions: `kb_search`, `kb_create`, `kb_update`, `kb_read`
- Collections: "Infrastructure", "Agent Framework", "Incidents", "Architecture"
- Workflow: agent writes markdown → skill converts to Outline doc → posts to correct collection

---

## Project D: Cross-Cutting / Cleanup

#### D1. IngressRoute Inconsistency
The `olympus-https` and `olympus-http` IngressRoutes are diverging. The https route routes `/docs` to `fumadocs`, but the http route routes `/docs` to `olympus-office`. Also, the catch-all rules differ between the two.

**Fix:** Make http and https IngressRoutes identical in routing rules.

#### D2. `mission-frontend` Pod Broken
`mission-frontend` pod has been in `ImagePullBackOff` for 2.5 days. The image `10.75.1.211:30500/mission-frontend:v1` doesn't exist in the registry.

**Fix one of:**
- Build and push the missing image
- Remove the deployment if it's unused
- Route its expected traffic elsewhere

---

---

## Project E: V5 Topology Refactor (ARCHITECTURAL CHANGE)

> **Background:** Opus proposed a major consolidation. User agreed with the direction but wanted bugs fixed first. This section is the "make it work, then refactor" refactor step — add it ON TOP of the fixes above, do not skip the fixes to get here.

### The Problem — Group Encoding Is Spread Across 5 Places

Currently, the same information (which agents are in which groups, what desks they sit at, what rooms exist) is encoded in **5 separate locations** that all need to stay in sync:

1. **Hermes Gateway heartbeats** — `group` field in agent data (source of truth for agent→group mapping)
2. **`PeakView.tsx` + `AgentsPage.tsx`** — `GROUP_ORDER` array `["Command","DevOps","Operations"]` (defines display order)
3. **`waypoints.json`** — room labels + seat assignments (defines desk positions and room names in 3D)
4. **GLB mesh node names** — "staff", "devops" baked into the 3D model (defines physical room boundaries)
5. **Fumadocs sidebar** — indirectly references groups via docs structure

### The Fix — Single `topology.json` Source of Truth

Create a single `config/topology.json` that is the ONE source of truth for everything group/room/desk related:

```json
{
  "groups": [
    {
      "id": "command",
      "label": "Command",
      "color": "#58a6ff",
      "order": 0,
      "rooms": ["control"],
      "agents": ["marcus", "netwatch", "k8slearn", "proxguard"]
    },
    {
      "id": "devops",
      "label": "DevOps",
      "color": "#3fb950",
      "order": 1,
      "rooms": ["staff"],
      "agents": ["oly", "devops", "devops-api", "devops-app", "devops-infra", "finwise", "deploybot"]
    },
    {
      "id": "operations",
      "label": "Operations",
      "color": "#d29922",
      "order": 2,
      "rooms": ["devops"],
      "agents": ["sentinel", "storekeeper", "homeassistant"]
    }
  ],
  "rooms": {
    "control": { "label": "Command Center", "roomNode": "control", "color": "#58a6ff" },
    "staff": { "label": "Operations Office", "roomNode": "staff", "color": "#3fb950" },
    "devops": { "label": "DevOps Office", "roomNode": "devops", "color": "#d29922" },
    "lounge": { "label": "Lounge", "roomNode": "lounge", "color": "#8b949e" },
    "corridor": { "label": "Corridor", "roomNode": "corridor", "color": "#8b949e" },
    "meeting": { "label": "Meeting Room", "roomNode": "meeting", "color": "#f78166" },
    "ceo": { "label": "CEO Office", "roomNode": "ceo", "color": "#58a6ff" },
    "dc": { "label": "Data Center", "roomNode": "dc", "color": "#8b949e" }
  },
  "desks": {
    // From waypoints.json — desk positions mapped to agents
  }
}
```

### Changes Required

#### E1. Create `config/topology.json` [~20 min]
Write the canonical topology file. It must contain:
- All groups, their display names, colors, sort order
- All rooms, their GLB node names, display labels, team associations
- All desks, their waypoint positions, which agent sits there, room assignment
- An `$schema` URL or version field so consumers can validate

#### E2. Update 3D Office to Read topology.json [~1 hour]
Modify the Three.js viewer (`public/main.js` or its source) to:
- Load `topology.json` at startup instead of hardcoded group/room logic
- Read room labels from topology (replace current `waypoints.json` logic)
- Read desk assignments from topology
- Remove duplicate group-encoding code paths
- Fall back gracefully if topology.json is missing (log warning, continue)

#### E3. Update Dashboard to Read topology.json [~1 hour]
Modify `PeakView.tsx` and `AgentsPage.tsx` to:
- Fetch `/config/topology.json` (or inline it at build time via Vite)
- Replace the hardcoded `GROUP_ORDER` array
- Read group colors from topology (remove `Ko` color map)
- Remove the duplicate `GROUP_ORDER` AND `Ym` array in AgentsPage

#### E4. Update Adapter to Read topology.json [~30 min]
Modify the Node.js adapter to:
- Load `topology.json` for agent→desk assignments
- Serve it as a static endpoint (`/config/topology.json`)
- Use it to validate seat assignments against valid desks

#### E5. Unify CI/CD (Fix Drift) [~30 min]
The `daglimmer/vf-office` CI/CD pipeline has a copy-paste error — it references `vf-dashboard` as the image name and deploy target instead of `vf-office`.

**Fix:**
- Edit `.github/workflows/ci-cd.yml` in the vf-office repo
- Change `IMAGE_NAME: vf-dashboard` → `IMAGE_NAME: vf-office`
- Change `DEPLOY_TARGET: vf-dashboard` → `DEPLOY_TARGET: olympus-office`
- Verify the pipeline runs and deploys to the correct pod

#### E6. Kill Legacy Group Encoding [~15 min]
After E1–E5 are verified working:
- Remove `GROUP_ORDER` arrays from `PeakView.tsx` and `AgentsPage.tsx`
- Remove `waypoints.json` (replaced by topology.json)
- Remove duplicate color maps from dashboard
- Update Fumadocs to reference topology.json as the canonical source
- Add a CHANGELOG entry documenting the consolidation

### Migration Sequence
1. **Create topology.json** — parallel work, doesn't break anything
2. **Update one consumer** (e.g., 3D Office) to read from both old + new sources, verify output matches
3. **Update dashboard** similarly — dual-read, compare
4. **Update adapter** to serve + validate
5. **Fix CI/CD drift**
6. **Kill old sources** — remove waypoints.json, GROUP_ORDER, color maps
7. **Verify end-to-end:** agents page → correct groups, 3D office → correct rooms and labels, dashboard → correct colors and ordering

---

## Things NOT for Opus (We Handle Ourselves)
The following items are acknowledged but will be handled directly by the team, NOT by Opus:
- **SEAT_OFFSET final nudge** — user will test -0.18 and dial further if needed
- **3D Office height iteration** — cosmetic iteration, not worth Opus time
- **Infrastructure tasks** — firewall, VLANs, storage, Proxmox
- **Backup configuration** — PBS, TrueNAS backup schedules
- **Tech/ops communication setup** — alert channels, notification routing
- **Docs wiring** — Fumadocs content updates
- **Agent framework tweaks** — small adjustments to agent profiles/chains

---

## Deployment Instructions

For EACH change you make, follow this exact workflow:

1. **Edit source files** in the cloned repo
2. **Build Docker image** with a UNIQUE tag per change (e.g., `20260617-v5-fix-b2`)
3. **Push** to `10.75.1.211:30500/<image>:<tag>`
4. **Update K8s deployment** with new image tag
5. **Verify rollout**: `kubectl rollout status deployment/<name> -n mission-control`
6. **Verify live**: curl the endpoint, check the response contains your change
7. **Tag** the change in the repo if it's permanent

### Building & Deploying

**Docker build (for 3D Office):**
```bash
cd /root/repos/vf-office
docker build --no-cache -t 10.75.1.211:30500/vf-office:<tag> .
docker push 10.75.1.211:30500/vf-office:<tag>
kubectl set image deployment/olympus-office olympus-office=10.75.1.211:30500/vf-office:<tag> -n mission-control
kubectl rollout status deployment/olympus-office -n mission-control
```

**Docker build (for Dashboard):**
```bash
cd /root/repos/Projects/dashboard/vf-dashboard
docker build --no-cache -t 10.75.1.211:30500/vf-dashboard:<tag> .
docker push 10.75.1.211:30500/vf-dashboard:<tag>
kubectl set image deployment/vf-dashboard vf-dashboard=10.75.1.211:30500/vf-dashboard:<tag> -n mission-control
kubectl rollout status deployment/vf-dashboard -n mission-control
```

### Docker Build Troubleshooting
If Docker daemon hangs with a lock error:
```bash
systemctl restart docker && rm -rf /var/lib/docker/buildkit/*
# Then retry the build
```

---

## Priority Order

**Phase 1 — Fixes (do first, get everything working):**
1. **HIGH — B1: `/agents` 404 fix** — user needs to navigate the agents page
2. **HIGH — A2: Adapter state persistence** — "DEMO MODE" badge is ugly and state resets on restart
3. **HIGH — C1: GitHub OAuth for Outline** — security, moves away from default password
4. **MEDIUM — B4: News page simplify to 3 topics** — user wants Tech/Dutch/Serenam only
5. **MEDIUM — A3: Navigation link cleanup** — fix localhost:5174 reference
6. **MEDIUM — C3: Seed KB articles** — content for the knowledge base
7. **MEDIUM — D1: IngressRoute inconsistency** — http/https routing mismatch
8. **LOW — B2: Operations offline status** — investigate if actually a bug
9. **LOW — B3: Agent detail page** — verify working, fix if broken
10. **LOW — A1: GLB room labels** — cosmetic, only if Blender is available
11. **LOW — C2: CSP fix** — only if console errors
12. **LOW — C4: kb-writer skill** — nice-to-have
13. **LOW — D2: mission-frontend cleanup** — housekeeping

**Phase 2 — Topology Refactor (do ONLY after Phase 1 is verified live):**
14. **MEDIUM — E1: Create topology.json** — canonical source of truth
15. **MEDIUM — E2: Update 3D Office to read topology**
16. **MEDIUM — E3: Update Dashboard to read topology**
17. **MEDIUM — E4: Update Adapter to read topology**
18. **MEDIUM — E5: Fix CI/CD drift** — correct vf-office pipeline
19. **LOW — E6: Kill legacy group encoding** — cleanup after migration

---

## What NOT to Do

- **DO NOT** restructure the repo or move files — Fable's architecture works
- **DO NOT** change the CI/CD pipeline — it's established and working
- **DO NOT** modify the Hermes Gateway — it's separate from these projects
- **DO NOT** touch Proxmox or K3s node configs — these are infrastructure, not application
- **DO NOT** create new subdomains — everything lives under `olympus.110lymph.nl` or `argus.110lymph.nl`
- **DO NOT** use `imagePullPolicy: Always` without also using unique image tags — if you do use unique tags, `IfNotPresent` is fine
- **DO NOT** ask questions — make reasonable decisions when options are presented and document what you chose

---

## Handoff Verification Checklist

**Phase 1 — Before reporting completion:**
- [ ] `https://olympus.110lymph.nl/` — loads dashboard
- [ ] `https://olympus.110lymph.nl/agents` — loads agents page (no 404)
- [ ] `https://olympus.110lymph.nl/office/` — 3D office loads, DEMO MODE badge gone (adapter running), avatars seated correctly
- [ ] `https://olympus.110lymph.nl/kb` — Outline loads, GitHub login works
- [ ] `https://olympus.110lymph.nl/api/agents` — returns agent JSON with live data
- [ ] `https://olympus.110lymph.nl/news` — shows only Tech, Dutch, Serenam topics
- [ ] Office navigation link no longer points to localhost:5174
- [ ] Operations group shows accurate online/offline status

**Phase 2 — Only if topology refactor was executed:**
- [ ] `config/topology.json` exists and is complete
- [ ] 3D Office reads from topology.json (old waypoints.json no longer needed)
- [ ] Dashboard reads group order from topology.json (no hardcoded GROUP_ORDER)
- [ ] CI/CD pipeline references correct image name (`vf-office`)
- [ ] All old group-encoding sources removed or deprecated
- [ ] Git repos have all changes committed and pushed
- [ ] This spec document itself is updated with what was done
