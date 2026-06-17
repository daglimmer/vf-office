# Opus Launch Brief — Clusters 1, 2 & 3 (Immediate Implementation)

> **One-shot brief.** Read ALL referenced documents before touching anything. This is a green-light to implement three clusters simultaneously. Do not ask questions — the answers are in the spec documents already on master.

## Context

The Phase 1 fixes (dashboard news feeds, SEAT_OFFSET, adapter state) are deployed and verified live. The CI/CD pipeline is working end-to-end. Now we move to building the autonomous operations framework.

**Three architecture docs are already on master at `prompts-for-opus/`:**
- `06-cluster1-monitoring-remediation-pipeline.md` — Monitoring → Anomaly → Remediation (includes Tech Watch data feed)
- `07-cluster2-knowledge-learning.md` — Knowledge Base + Proactive Learning Loop
- `08-cluster3-governance.md` — Situation Awareness → Policy Enforcement → Audit Trail

**Also read before starting:**
- `05-master-spec-v5.md` — Current live state of the entire system
- `https://olympus.110lymph.nl/docs/architecture` — ARCHITECTURE.md on Fumadocs
- `/root/110lymph-homelab/ARCHITECTURE.md` — Master architecture doc (canonical source)
- `/root/110lymph-homelab/infrastructure/kustomize/` — K3s deployment manifests
- `/root/110lymph-homelab/changelog/` — Sorted by date, understand recent work

---

## What We've Already Done (Read Only — Don't Re-do)

- **K3s automated pipeline** complete — git push → build → deploy → verify. No manual steps.
- **News feeds** — 3 categories (Tech/Dutch/Suriname), 110 articles, auto-updating from RSS. Verified live.
- **3D Office** — SEAT_OFFSET=-0.18 deployed, DEMO MODE badge fixed (adapter state persistence), avatars seated correctly.
- **Dashboard** — `/agents` page working, group labels normalized, all 14 agents shown.
- **Tech Watch UI exists** — `/api/tech-watch` returns Investigation(6)/Fix(0)/Deploy(0)/Raise Attention(0) but ALL 6 items are 4+ days stale. **Needs data feed urgently.**
- **Offline agents** — 5 agents offline 8-12 days (netwatch, storekeeper, finwise, homeassistant, k8slearn). 6 online (devops agents + oly + sentinel).
- **Canonical domains locked:** `olympus.110lymph.nl` = internal portal, `argus.110lymph.nl` = customer portal. Never create new subdomains.

---

## Priorities

### CLUSTER 1 — Monitoring → Anomaly → Remediation (HIGHEST PRIORITY)

**Why now:** Tech Watch data is stale. We need the RSS feed ingestion running so security advisories flow in automatically. This also enables automated remediation for the offline agents.

**What's already there:**
- Tech Watch UI: `/api/tech-watch` pipeline stages (Investigate/Fix/Deploy/Raise Attention)
- Tech Watch: UI exists on `/` dashboard tab, same pattern as News section
- The Cluster 1 spec (`06-cluster1-monitoring-remediation-pipeline.md`) has a NEW architecture section 3.8 I added — `Tech Watch — Security Advisory Ingestion`. It specifies 18 RSS sources, the ingestion adapter service, fleet correlation via CVE→package mapping, and the playbook for CVEs.

**Build order (from Cluster 1 spec):**
1. **Phase 1 (2-3 sessions):** Tech Watch RSS ingestion service — same pattern as the existing news RSS feeds but security-focused. Sources: Reddit r/netsec/r/sysadmin, GitHub Security Advisories API, The Hacker News, Krebs on Security, BleepingComputer, NVD, OPNsense blog, Cisco PSIRT, MSRC, Ubuntu Security, Debian Security, Arch Linux, Alpine Linux, FreeBSD, CERT/CC, SANS ISC, AttackerKB.

2. **Phase 2 (1-2 sessions):** Alert routing to Kanban — NetWatch alerts, Prometheus alerts, Tech Watch findings → Kanban cards → Specialist agent assignment.

3. **Phase 3 (1-2 sessions):** Playbook automation — self-healing for known conditions (disk fill, pod crash, cert expiry), with configurable manual gates at every step.

4. **Phase 4 (1 session):** Customer-ready — decision tree renderer, deployment config template, "How to deploy" docs.

### CLUSTER 2 — Knowledge Base + Proactive Learning (HIGH)

**Why now:** The KB (Outline) is set up but has no useful content. The learning loop means the system gets smarter over time — every incident enriches the KB, every fix gets documented automatically.

**Build order (from Cluster 2 spec `prompts-for-opus/07-cluster2-knowledge-learning.md`):**
1. **kb-writer agent skill** — an agent that watches closed Kanban cards and generates KB articles: problem, root cause, fix steps, verification commands, related CVEs.
2. **Daily learning digest** — cron job that compiles "what did we learn today" from new KB articles, closed incidents, and changelogs.
3. **Cross-reference engine** — links incidents to KB articles, agents to known issues, CVEs to affected packages. Searchable from the dashboard.

### CLUSTER 3 — Governance + Policy Enforcement (MEDIUM)

**Why now:** Agents currently have unrestricted access. Governance means they must declare intent, get approval within blast-radius scope, and every action is logged and auditable.

**Build order (from Cluster 3 spec `prompts-for-opus/08-cluster3-governance.md`):**
1. **Policy-as-code** — YAML files defining who can do what, on which systems, at what severity, with what approval gates.
2. **Pre-flight gate** — any agent action checks policy before executing. Denied actions return explicit "bloced by policy X" with escalation path.
3. **Audit trail** — every action logged to a tamper-evident store. Dashboard shows recent actions per agent with drill-down.

---

## Deployment Flow (Same as Before)

For EACH change:

```bash
# Build
docker build -t 10.75.1.211:30500/<image>:<tag> .
docker push 10.75.1.211:30500/<image>:<tag>

# Deploy
kubectl set image deployment/<name> -n mission-control <container>=10.75.1.211:30500/<image>:<tag>
kubectl rollout status deployment/<name> -n mission-control

# Verify
curl <endpoint> | check expected content
```

### Services you may create
- **Tech Watch ingestion service** — new pod in `mission-control` namespace, NodePort or ClusterIP, feeds `/api/tech-watch` data
- **kb-writer** — can be a cron job or a background agent skill
- **Policy engine** — new microservice or library integrated into adapter

All use the same image registry: `10.75.1.211:30500`

---

## What NOT to Do

- **DO NOT** create new subdomains — everything lives under `olympus.110lymph.nl`
- **DO NOT** modify Hermes Gateway or agent profiles — that's our layer
- **DO NOT** touch Proxmox or K3s node configs
- **DO NOT** restructure repos or move files
- **DO NOT** use `imagePullPolicy: Always` — use unique tags + `IfNotPresent`
- **DO NOT** hardcode IPs — use DNS names or config
- **DO NOT** touch the topology refactor (Project E from master spec) — we'll do that separately

---

## Critical Constraints

1. **Verify before reporting done** — curl the endpoint, check the data, screenshot the UI. Every change ends with live proof.
2. **Tech Watch must be the FIRST deliverable** — the data feed is the most urgent pain point. Do the RSS ingestion service before anything else.
3. **The existing news RSS pattern is your template** — look at how the dashboard's `/api/news` works (3 sources, feed poller, auto-update), replicate that pattern for Tech Watch with security sources instead.
4. **Changelog every change** — write to `/root/110lymph-homelab/changelog/<YYYY-MM-DD>-<topic>.md`
5. **CI/CD pipeline works** — the vf-office pipeline at `.github/workflows/ci-cd.yml` is operational. But for new services you create, you'll need to set up deployment manifests in `/root/110lymph-homelab/infrastructure/kustomize/`

---

## Handoff Verification

Before reporting **Cluster 1 complete:**
- [ ] `https://olympus.110lymph.nl/api/tech-watch` returns CVE/advisory items with timestamps < 24h old
- [ ] Tech Watch tab on dashboard shows fresh items in Investigation stage
- [ ] RSS ingestion service runs as a pod or background process, auto-updates
- [ ] At least 5 security sources confirmed feeding data
- [ ] Fleet correlation maps CVEs to running packages/services

Before reporting **Cluster 2 complete:**
- [ ] kb-writer generates articles from closed Kanban cards
- [ ] Daily learning digest cron job exists and produces output
- [ ] Cross-reference engine links CVEs, agents, and past incidents

Before reporting **Cluster 3 complete:**
- [ ] Policy-as-code files exist for at least 3 agent types
- [ ] Pre-flight gate blocks unauthorized actions with clear error
- [ ] Audit trail shows recent actions with drill-down

---

*End of launch brief. Clusters 4 and 5 will follow once 1-3 are live and verified.*
