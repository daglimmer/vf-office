# Opus Master Spec — 110lymph Phase 5
> **One-shot brief.** Read this entire document, backtrack each project's current state, then execute all remaining work. Do not ask questions — the answers are below.

## Before You Touch Anything

1. **Clone these repos:**
   - `https://github.com/daglimmer/vf-office` (branch: `master`) — [3D Office]
   - `https://github.com/daglimmer/Projects` (branch: `master`) — [Monorepo; dashboard lives at `dashboard/vf-dashboard/`]
2. **Read the ARCHITECTURE.md** at `/root/110lymph-homelab/ARCHITECTURE.md` on the Hermes VM, or the Fumadocs mirror at `https://olympus.110lymph.nl/docs/architecture` — understand the system: canonical domains, K3s cluster, CI/CD pipeline, ingress routing, agent fleet.
3. **Read the K3s manifests** at `/root/110lymph-homelab/infrastructure/kustomize/` — understand how deployments work: Docker images from `10.75.1.211:30500`, `ImagePullPolicy: IfNotPresent`, Traefik IngressRoutes, namespaces.
4. **Verify current live state** — curl these endpoints and compare with what the repo says:
   - `https://olympus.110lymph.nl/office/` — 3D Office
   - `https://olympus.110lymph.nl/` — Dashboard (main)
   - `https://olympus.110lymph.nl/agents` — Dashboard (agents page)
   - `https://olympus.110lymph.nl/api/agents` — Agent data API
   - `https://olympus.110lymph.nl/kb` — Outline knowledge base
5. **Read the changelogs** at `/root/110lymph-homelab/changelog/` sorted by date — understand what's been done recently.

---

## Project A: 3D Office (`daglimmer/vf-office`)

### Current Live State
- **URL:** `https://olympus.110lymph.nl/office/`
- **Pod:** `olympus-office` in `mission-control` namespace
- **Image:** `10.75.1.211:30500/vf-office:20260617-seat-offset-012`
- **SEAT_OFFSET = -0.12** deployed and acceptable (~85% correct, may need +0.02 to +0.05 final nudge)
- **Current bundle hash:** `index-BmgIt0mS.js` with `pos.y+-.12`
- **GLB model:** `office.glb` (731KB) — all anchor positions Y=0, room node names "staff" and "devops"

### What's Already Fixed (Opus Phase 1)
- ✅ **Upside-down avatars** — yaw extraction via `atan2(quat.y, quat.w)*2`, not `quaternion.toEuler()`
- ✅ **State-based seating** — agents sit/stand based on `agent.seated` boolean
- ✅ **Pinned anchors** — agents stay at assigned desks
- ✅ **Desk glow** — hovered desks highlight
- ✅ **Ghost mode** — placeholder agents when API is unreachable
- ✅ **SEAT_OFFSET = -0.12** — avatars no longer float above chairs (acceptable, may need final nudge)
- ✅ **Dynamic roster from API** — agents come from Hermes Gateway, not hardcoded

### What's NOT Done

#### A1. Room Labels (waypoints.json) [~5 min]
The `waypoints.json` rooms have generic labels: "staff", "devops", "lounge", "corridor", "meeting", "control", "ceo", "dc". The user wants descriptive team-based names.

**Decision needed—pick ONE (I recommend option 1):**
1. **Team-based:** "Operations Office" (for staff room), "DevOps Office" (for devops room), "Command Center" (for control room)
2. **Descriptive:** "Staff Room", "Engineering Room", "Mission Control"
3. **Simple numbers:** "Office 1", "Office 2"

Edit `public/waypoints.json` → rebuild → deploy with new tag.

#### A2. GLB Room Labels (office.glb) [Blender required]
The 3D model has baked-in floating text labels visible from the user's screenshot ("STAFF", "DEVOPS", "CORRIDOR", etc.). These are part of the `.glb` mesh — `waypoints.json` changes won't touch them.

**Options (pick one):**
1. **Leave as-is** — the floating words are a style choice from Fable, user hasn't complained
2. **Re-export from Blender** — edit the text meshes in Blender and re-export `office.glb`. This requires Blender and knowledge of the GLB structure.
3. **Overlay DOM labels** — Add Three.js Sprite labels that float above each room, hiding the GLB text via opacity or obscuring it. Easier than re-exporting, but may look cluttered.

#### A3. SEAT_OFFSET Final Nudge [~5 min]
Current `SEAT_OFFSET = -0.12` places avatars' heads at roughly monitor-bottom level. The user said "acceptable but could go a bit higher still." 

**Recommended:** bump to `SEAT_OFFSET = -0.08` (0.04 units higher). If wrong, user will tell you. Edit `public/main.js` line 684 → rebuild → deploy.

#### A4. Adapter State Persistence [investigation needed]
The `adapter/state.json` file tracks which agents are seated at which desks. Currently lives at `/root/repos/vf-office/adapter/state.json`. In the Docker container (read-only filesystem), this file resets on pod restart.

**Investigate:** Does the container need a writable volume for state persistence? If so:
- Add a `emptyDir` volume mount at `/app/state/` (or wherever the adapter writes state)
- Mount it in the deployment manifest
- Add env var `STATE_DIR` pointing to the mount

#### A5. Push Remaining Changes to GitHub [~2 min]
Current local changes NOT pushed:
- SEAT_OFFSET fix (`public/main.js`)
- adapter/state.json change

Required: `git add -A && git commit -m "feat: seat offset fix" && git push`

---

## Project B: Dashboard (`daglimmer/fable-dashboard`)

### Current Live State
- **URL:** `https://olympus.110lymph.nl/` (main), `https://olympus.110lymph.nl/agents` (agents page)
- **Pod:** `vf-dashboard` in `mission-control` namespace
- **Image:** `10.75.1.211:30500/vf-dashboard:peakview-fix-20260617-141520`
- **API:** `https://olympus.110lymph.nl/api/agents` — serves live Hermes Gateway data via vf-dashboard
- **Port:** 8090 (internal), served by Express server via `tsx server/index.ts`
- **SPA:** Vite-built React app, `src/pages/` has 16 page components
- **IngressRoute:** `/` catch-all → `vf-dashboard:80`, `/api/agents` → `vf-dashboard:80`, rest of `/api` → `fable-dash:8090`

### What's Already Fixed
- ✅ **Group labels normalized** — `GROUP_ORDER: ["Command", "DevOps", "Operations"]` in PeakView.tsx
- ✅ **Agent detail API** — `reportedModel`/`reportedProvider` mapped to `model`/`provider`
- ✅ **All 14 agents shown** — 24h dead-agent filter removed
- ✅ **Operations view** — group filter, agent list, live config

### What's NOT Done

#### B1. White Page on Hard Refresh [ROOT CAUSE NEEDED]
When navigating directly to `https://olympus.110lymph.nl/` (hard refresh or direct URL entry), user sees a white page. The HTML loads fine (verified: `<title>110lymph — VF Dashboard</title>` renders), but the React SPA fails to mount.

**Likely causes (investigate):**
1. **Public path mismatch** — Vite built with `base: '/'` but server serves from a subpath. Check `vite.config.ts` for `base` setting.
2. **JS/CSS 404 on refresh** — the SPA routing causes Express to try to serve a page path when assets are looked up. Check if Express has a SPA fallback handler (serving `index.html` for non-asset routes).
3. **JavaScript runtime error** — open browser DevTools at the white page and check Console for errors. Could be a module import failing or an uncaught exception in the bundle.

**Fix:** ensure the Express server's SPA fallback handler catches all non-API, non-asset routes and serves `index.html`. The current `server/index.ts` likely needs a catch-all handler:
```typescript
// After all API routes, add:
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});
```

#### B2. `/agents` Returns 404 [ROOT CAUSE NEEDED]
`https://olympus.110lymph.nl/agents` returns HTTP 404. The route exists in the React app (`AgentsPage.tsx`) but the server isn't handling it.

**Fix:** same SPA fallback fix as B1 — once Express serves `index.html` for unknown routes, React Router will pick up `/agents` and render the page.

#### B3. Operations Shows All Agents Offline
The Operations group view shows agents as offline while:
- **Sentinel** shows green (online)
- **Death of Steam / Home Assistant** show online
- Real Gateway heartbeats exist at `http://10.11.1.120:7100/heartbeats`

**Investigate:**
1. Does the dashboard's agent list include heartbeats? Check if the data model has a `lastHeartbeat` or `status` field being set correctly.
2. Are Operations-team agents (devops-api, devops-app, devops-infra, finwise, deploybot, homeassistant) actually checking in to Hermes Gateway?
3. Is there a status calculation that marks agents without recent heartbeats as "offline"?

**Fix:** either ensure Gateway receives heartbeats from those agents, or adjust the offline threshold, or fix the status calculation.

#### B4. News Page — Stale Token/CSP Issue
The news page (`https://olympus.110lymph.nl/news`) has a working manifest fetch but the page content may show stale data. The fetching mechanism uses `env` vars for API tokens. Check if the news-refresh CronJobs are still running and if the news data endpoint is healthy.

#### B5. Agent Detail Page — Verify Data Flow
`AgentDetailPage.tsx` fetches individual agent data. Verify that:
- The route `/agent/:id` works in React Router
- The API endpoint returns detailed agent info
- The page renders agent details (model, provider, status, last seen)

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
- ✅ 5 seed KB articles need to be written

### What's NOT Done

#### C1. GitHub OAuth App Setup [~15 min]
**Why:** Local password auth (Dex with `changeme123`) is a temporary setup. Real auth should use GitHub OAuth.

**Steps:**
1. Go to `https://github.com/settings/applications/new` (or as `ray@110lymph.nl`)
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
Write meaningful 110lymph-homelab articles. Use the Outline API or create directly via the web UI. Suggested articles:

1. **"Architecture Overview"** — summary of the homelab: network topology, K3s cluster, CI/CD pipeline, agent fleet. Source: ARCHITECTURE.md
2. **"Agent Framework — Roles & Chain of Command"** — 14 agents, their roles, escalation chain, cross-agent knowledge rules
3. **"Deployment Pipeline"** — how to deploy: Git push → build → push to registry → `kubectl set image` → verify health probe. Canonical domains policy.
4. **"Network & Access"** — VLAN map, firewall rules, VPN access, how to access each system (Proxmox, TrueNAS, PBS, K3s dashboard)
5. **"Incident Response Playbook"** — NetWatch P1 chain, what to do when a service goes down, escalation paths, post-mortem process

#### C4. Hermes `kb-writer` Skill [~1 hour]
Create a Hermes skill that lets any agent post to Outline. This enables agents to auto-document changes, incident reports, and knowledge articles.

**Skill spec (create as `kb-writer`):**
- Uses Outline API (REST at `/kb/api`)
- Requires an API key from Outline Settings
- Functions: `kb_search`, `kb_create`, `kb_update`, `kb_read`
- Collections: "Infrastructure", "Agent Framework", "Incidents", "Architecture"
- Workflow: agent writes markdown → skill converts to Outline doc → posts to correct collection

---

## Project D: Cross-Cutting Concerns

#### D1. Dashboard 3D Office Integration
The dashboard has an `OfficePage.tsx` component (`src/pages/OfficePage.tsx`) that currently may or may not render correctly. It should:
- Show an iframe or embedded view of `https://olympus.110lymph.nl/office/`
- Or navigate to the office directly

**Check:** Does `OfficePage.tsx` render a working embedded office view? If not, fix the embed or add a redirect button.

#### D2. Fumadocs Docs Site
- **URL:** `https://olympus.110lymph.nl/docs/`
- **Pod:** `fumadocs` in `mission-control` namespace
- Likely just needs to be verified working. Docs are auto-generated from `/root/110lymph-homelab/ARCHITECTURE.md` and changelogs.

#### D3. Pipeline Automation
The June 15 milestone established an automated pipeline from Git push → build → deploy → health verify. Verify it's still running:
- Check GitHub Actions or webhook receiver pod
- Test a no-op change to confirm the pipeline triggers
- Check that `ImagePullPolicy: Always` is set (not `IfNotPresent`) on production deployments to avoid stale-tag issues

---

## Deployment Instructions

For EACH change you make, follow this exact workflow:

1. **Edit source files** in the cloned repo
2. **Build Docker image** with a UNIQUE tag per change (e.g., `20260617-seat-fix-v3`)
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

1. **HIGH — Dashboard white page fix (B1, B2)** — user needs to navigate the dashboard. This is the most visible issue.
2. **HIGH — Operations offline status (B3)** — user noticed this and it looks broken even if it's correct behavior.
3. **MEDIUM — SEAT_OFFSET final nudge (A3)** — 5-minute change, user said acceptable but could improve.
4. **MEDIUM — Room labels (A1)** — cosmetic, improves UX.
5. **MEDIUM — GitHub OAuth for Outline (C1)** — security, moves away from default password.
6. **LOW — Seed KB articles (C3)** — content, not code.
7. **LOW — Hermes kb-writer skill (C4)** — nice-to-have, agents can already document to changelogs.
8. **LOW — GLB labels (A2)** — cosmetic, user hasn't complained.
9. **LOW — Push remaining changes to GitHub (A5)** — housekeeping.

---

## What NOT to Do

- **DO NOT** restructure the repo or move files — Fable's architecture works
- **DO NOT** change the CI/CD pipeline — it's established and working
- **DO NOT** modify the Hermes Gateway — it's separate from these projects
- **DO NOT** touch Proxmox or K3s node configs — these are infrastructure, not application
- **DO NOT** create new subdomains — everything lives under `olympus.110lymph.nl` or `argus.110lymph.nl`
- **DO NOT** use `imagePullPolicy: Always` without also using unique image tags — if you do use unique tags, `IfNotPresent` is fine (avoids unnecessary pulls)
- **DO NOT** ask questions — make reasonable decisions when options are presented and document what you chose

---

## Handoff Verification Checklist

Before reporting completion:
- [ ] `https://olympus.110lymph.nl/` — loads dashboard (no white page)
- [ ] `https://olympus.110lymph.nl/agents` — loads agents page (no 404)
- [ ] `https://olympus.110lymph.nl/office/` — 3D office loads, avatars seated correctly
- [ ] `https://olympus.110lymph.nl/kb` — Outline loads, login works
- [ ] `https://olympus.110lymph.nl/api/agents` — returns agent JSON with live data
- [ ] Operations group shows online agents if they're actually connected
- [ ] Git repos have all changes committed and pushed
- [ ] This spec document itself is updated with what was done
