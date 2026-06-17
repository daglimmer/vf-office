# 110lymph Autonomous Operations Framework — Cluster 2
## Knowledge Base → Agent Instruction → Proactive Learning Loop

> **Version:** v6 · **Status:** Architecture Draft · **Scope:** Cluster 2 of 5
>
> *This document describes the knowledge infrastructure that powers every agent's decisions, the write-path discipline that ensures knowledge is captured, the read-path rules that ensure it is used, and the proactive learning loop that keeps the fleet ahead of external change. Every dimension is designed for customer deployment — "after a year, every P1 becomes a P3."*

---

## 1. Executive Summary

Cluster 2 connects three capabilities — **Knowledge Base**, **Agent Instruction**, and **Proactive Learning** — into a closed loop of organisational memory:

```
Discover → Document → Instruct → Read → Apply → Capture → Learn → Stay Current → (repeat)
```

The pipeline makes three promises:

1. **Write discipline** — Every non-trivial task produces a knowledge article. The system gets smarter with every action.
2. **Read discipline** — Every agent reads relevant knowledge BEFORE acting. No agent rediscovers what another already solved.
3. **Proactive awareness** — The fleet stays current on external change (CVEs, outages, patch cycles) without being asked.

**The 1-year effect:** The first time a P1 hits, it takes 10 minutes to resolve. The second time: 5 minutes (knowledge article short-circuits diagnosis). The third time: you don't even notice because the system detects and remediates before it becomes a P1.

**Key design principles:**
- **Knowledge is permanent** — written once, searchable forever. Not in chat logs, not in memory, not in code comments. In Outline.
- **Write early, write often** — don't wait for post-mortems. Write when you discover something non-obvious.
- **Read before you act** — the knowledge gate is as mandatory as the verification gate.
- **Push learning, not pull** — agents are fed external intelligence (RSS, CVE feeds, status pages) proactively, not on demand.
- **Customer-visible growth** — the knowledge base becomes a deliverable: "this is what we know about your system, and it grows every day."

---

## 2. Architecture Overview

### 2.1 Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          KNOWLEDGE WINTER (WRITE PATH)                      │
│                                                                            │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────────────────────┐ │
│  │ Agent Action  │──→│ "Was this    │──→│ Write KB Article               │ │
│  │ completes     │   │ non-trivial? │   │ (via Outline API)              │ │
│  │ a task        │   │ Was it new?  │   │                                │ │
│  └──────────────┘   │ Did you dive  │   │ - Domain tag (infra/devops/    │ │
│                     │ deep?         │   │   security/network/app)        │ │
│                     │ Was the fix   │   │ - Severity (P1-P4 context)     │ │
│                     │ non-obvious?  │   │ - Symptoms → root cause        │ │
│                     └──────┬───────┘   │ - Resolution steps              │ │
│                            │            │ - Prevention / next time        │ │
│                     (If YES → write)   └────────────┬───────────────────┘ │
│                                                     │                      │
│  ┌──────────────┐   ┌──────────────┐                │                      │
│  │ Infra Change │──→│ "Did the way │────────────────┘                      │
│  │ (IP, config, │   │ we do this   │                                        │
│  │  deploy)     │   │ change?"     │  ← MANDATORY — every infra mutation   │
│  └──────────────┘   └──────────────┘    produces a KB article               │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                           KNOWLEDGE SPRING (READ PATH)                      │
│                                                                            │
│  ┌──────────────┐   ┌────────────────────┐   ┌────────────────────────┐   │
│  │ New Task     │──→│ Agent queries KB   │──→│ Reads relevant         │   │
│  │ arrives      │   │ (by domain + tag)  │   │ articles BEFORE acting │   │
│  └──────────────┘   └────────────────────┘   └────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  Domain → Tag Mapping (configurable per agent type):                 │ │
│  │  - NetWatch       → infrastructure, network, security               │ │
│  │  - DevOps         → deployment, ci/cd, k3s, docker                 │ │
│  │  - Vaultwarden    → security, secrets, vault                        │ │
│  │  - Operations     → runbook, incident, p1-p4                       │ │
│  │  - All agents      → architecture, framework, agent-policy          │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                       PROACTIVE LEARNING LOOP                               │
│                                                                            │
│  Feed Layer                            Processing Layer                    │
│  ┌──────────────┐                     ┌────────────────────────────┐      │
│  │ CVE Feeds    │──── ───────────────→│ KB Writer Agent             │      │
│  │ (NVD, OSV)   │   RSS/Atom         │ - Summarizes: what changed? │      │
│  ├──────────────┤   polling           │ - Tags by domain            │      │
│  │ Status Pages ├────                 │ - Creates "Intel Bulletin"  │      │
│  │ (MS, AWS,    │                     │   article in Outline       │      │
│  │  Cloudflare) │                     │ - Severity: critical/high/  │      │
│  ├──────────────┤                     │   medium/low               │      │
│  │ Security     │                     └────────────┬───────────────┘      │
│  │ Advisories   │                                  │                       │
│  ├──────────────┤                                  ▼                       │
│  │ Tech Blogs   │                     ┌────────────────────────────┐      │
│  │ (Reddit,     │                     │ Agent Awareness Gate       │      │
│  │  Hacker News)│                     │ - Before starting task →   │      │
│  ├──────────────┤                     │   check "Intel Bulletins"  │      │
│  │ Patch Tuesday│                     │   from last 7 days         │      │
│  │ (MS, Ubuntu, │                     │ - Domain-relevant only     │      │
│  │  RHEL)       │                     └────────────────────────────┘      │
│  └──────────────┘                                                          │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Mapping

| Component | What It Is | Status | Who Builds |
|---|---|---|---|
| **Outline** | Knowledge base vessel | ✅ Deployed (work /kb) | Done |
| **Write Gate** | Agent auto-detects "should this be a KB article?" | ❌ Not built | Opus |
| **Infra Change Hook** | Any IP/config/deploy change auto-creates KB article | ❌ Not built | Opus |
| **Read Gate** | Agent queries KB before acting on a task | ❌ Not built | Opus |
| **Domain→Tag Map** | Static config: which agent reads which domains | ❌ Not built | Opus |
| **RSS/Feed Collector** | Polls CVE feeds, status pages, tech news | ❌ Not built | Opus |
| **KB Writer Agent** | Transforms feed items into "Intel Bulletin" articles | ❌ Not built | Opus |
| **Awareness Gate** | Agent checks recent intel before task execution | ❌ Not built | Opus |
| **Knowledge Growth Dashboard** | Visual: articles created, articles read, time saved | ❌ Not built | Us (dashboard) |

---

## 3. Write Path: Knowledge Winter

### 3.1 The Write Gate — "Should This Be an Article?"

Every time an agent completes a task, it must answer **one question**:

> *"Was any part of this task non-trivial, new, or non-obvious?"*

If YES → write a knowledge article. The gate fires after task completion, bundled into the verification step.

**Triggers that automatically force an article (no gate evaluation):**

1. **Infrastructure change** — IP address change, DNS record creation/modification, firewall rule change, VLAN change, certificate renewal, deployment pipeline change, config file change. These ALWAYS produce an article.
2. **Bug fix** — anything that required debugging, root cause analysis, or a workaround
3. **New integration** — connecting two systems for the first time
4. **Incident resolution** — any P1 or P2 resolution must produce a post-mortem KB article
5. **New tool/CLI learned** — if an agent discovered a useful command, flag, or API endpoint that wasn't obvious

**What the article must contain:**

```
Title: [Domain] [Brief symptom/summary]
Tags: domain, severity-if-applicable, component
---
## Context
What was the situation? What were we trying to do?

## Symptoms (if incident)
What was observed? What alerted us?

## Root Cause
Why did it happen? What was the underlying issue?

## Resolution
Step-by-step what fixed it. Exact commands, exact config changes.

## Prevention / Next Time
How could this be detected earlier? What should someone check first?
What article should someone read if they encounter this again?

## Related
Links to related articles, docs, or external resources.
```

### 3.2 The Infrastructure Change Hook

Every infrastructure mutation MUST produce a KB article. This is enforced at the tool level — the `terminal()`, `patch()`, and `write_file()` tools for shared infrastructure (K3s manifests, firewall config, DNS, etc.) have a post-execution hook that asks:

> *"Did this change affect a shared system? → Write KB article"*

**Why this matters (Ray's rule):** "If someone changes an IP address, the way they did it — the exact steps, the commands, the pitfalls — should be in a knowledge article. Not in a ticket. Not in chat. In Outline."

**Mandatory article for any change involving:**
- IP addresses (new, changed, removed)
- DNS records
- Firewall rules / port changes
- Service endpoints / IngressRoutes
- Certificate renewal process
- Storage paths / volume mounts
- Backup schedules or retention policies
- Credential rotation (mention process, not the credential)

### 3.3 Article Taxonomy — The Tag System

Every article is tagged by **domain** and **severity context**:

**Domains (one primary per article):**
- `infrastructure` — servers, network, storage, hypervisors
- `deployment` — CI/CD pipeline, Docker, K3s
- `security` — CVEs, access control, secrets, certificates
- `network` — VLANs, routing, firewall, DNS, VPN
- `application` — specific apps (Outline, Vaultwarden, etc.)
- `agent-framework` — how agents work, rules, conventions
- `process` — runbooks, escalation, post-mortem
- `architecture` — high-level system design
- `customer` — customer-specific articles (per-customer KB)

**Severity tags (optional, for incident articles):**
- `p1-critical`
- `p2-high`  
- `p3-medium`
- `p4-low`

**Auto-generated tags:**
- `infra-change` — any infrastructure change
- `post-mortem` — incident post-mortem
- `intel-bulletin` — proactive intelligence bulletins (see Section 5)
- `seed` — initial seed articles (first 100)

---

## 4. Read Path: Knowledge Spring

### 4.1 The Read Gate — "Read Before You Act"

Before ANY agent begins execution on a task, it **must** query the knowledge base for relevant articles. This is a mandatory step, not optional — as mandatory as the verification gate is at the end.

**The query is domain-scoped:**

| Agent Role | Domains to Read Before Acting |
|---|---|
| **NetWatch** | `infrastructure`, `network`, `security`, `architecture` |
| **DevOps** | `deployment`, `infrastructure`, `application`, `architecture` |
| **Operations** | `process`, `incident`, `infrastructure` |
| **Security** | `security`, `infrastructure`, `network` |
| **Any agent** | `agent-framework`, `architecture` |
| **Customer-specific** | `customer`, `infrastructure` (customer-scoped) |

**The gate also checks for recent "Intel Bulletins" (see Section 5) in the agent's domain — any bulletin published in the last 7 days is surfaced before the task begins.**

**If the KB returns relevant articles, the agent must:**
1. Read them fully
2. Reference them in the task execution ("As documented in KB article #142...")
3. If the article is outdated or wrong, **update it** (not write a new one)

**If no relevant articles exist:** the agent proceeds, but the Write Gate fires at the end — if this was non-trivial, an article is now created.

### 4.2 Article Resolution Priority

When an agent reads a KB article, it treats it as:

1. **Canonical** — the article is the source of truth until proven outdated
2. **Updatable** — if the article conflicts with reality, update the article (not the other way around)
3. **Referenceable** — cite the article in the task output
4. **Expandable** — if the article helped but missed something, add that something

### 4.3 Knowledge Dashboard (Us — Dashboard Work)

A new section in the vf-dashboard showing:

```
╔═══════════════════════════════════════════════════════════════╗
║  KNOWLEDGE GROWTH                          [Last 30 days]   ║
╠═══════════════════════════════════════════════════════════════╣
║  ┌──────────────────────────┐  ┌──────────────────────────┐  ║
║  │ Articles Created:  142   │  │ Articles Read:   1,847   │  ║
║  │ This Month:         18   │  │ Read Rate:        13x    │  ║
║  │ Last Month:          9   │  │ (reads per article)      │  ║
║  └──────────────────────────┘  └──────────────────────────┘  ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ By Domain               │ Count │ Reads │ Last Updated │  ║
║  ├─────────────────────────┼───────┼───────┼──────────────┤  ║
║  │ infrastructure          │  42   │  523  │ 2026-06-17   │  ║
║  │ deployment              │  28   │  411  │ 2026-06-16   │  ║
║  │ security                │  19   │  287  │ 2026-06-15   │  ║
║  │ network                 │  17   │  265  │ 2026-06-16   │  ║
║  │ application             │  15   │  189  │ 2026-06-17   │  ║
║  │ process                 │  11   │   97  │ 2026-06-14   │  ║
║  │ agent-framework         │   6   │   53  │ 2026-06-12   │  ║
║  │ architecture            │   4   │   22  │ 2026-06-17   │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  Recent Bulletins        │ Source       │ Domain    │ Age     ║
║  ────────────────────────┼──────────────┼───────────┼──────── ║
║  MS MFA Outage (Jun 16) │ status.ms    │ security  │ 1d      ║
║  CUPS RCE CVE-2026-XXXX │ NVD          │ security  │ 2d      ║
║  Ubuntu 24.04.2 Release │ ubuntu.com   │ infra     │ 3d      ║
║  K3s v1.30 Security Fix │ k3s.io       │ deploy    │ 5d      ║
╚═══════════════════════════════════════════════════════════════╝
```

Data source: Outline API (article count per tag, read count via analytics or webhook tracking).

---

## 5. Proactive Learning Loop

### 5.1 Why This Exists

Agents should not wait for a task to learn. When a Microsoft MFA outage happens, agents handling authentication issues should already know about it. When a new CVE drops for nginx, the infrastructure agents should already have read the advisory.

This is the difference between **reactive knowledge** (I learned this because I hit the problem) and **proactive knowledge** (I already knew this before the problem hit me).

### 5.2 Feed Sources

The system polls these sources on a schedule:

| Source | Type | Poll Frequency | Domain Tag |
|---|---|---|---|
| **NVD (National Vulnerability Database)** | CVE feed | Every 6h | `security` |
| **OSV.dev** | Open source vulnerabilities | Every 6h | `security` |
| **Microsoft Status** | `https://status.azure.com/en-us/status` | Every 15min | `infrastructure` |
| **Cloudflare Status** | `https://www.cloudflarestatus.com/` | Every 15min | `infrastructure`, `network` |
| **GitHub Status** | `https://www.githubstatus.com/` | Every 15min | `deployment` |
| **Docker Security Advisories** | Docker blog/security feed | Every 6h | `deployment` |
| **Ubuntu Security Notices** | `https://ubuntu.com/security/notices` | Every 6h | `infrastructure` |
| **K3s Releases** | GitHub releases | Every 12h | `deployment` |
| **Hacker News** | Tech news (filtered) | Every 6h | `broad` |
| **Reddit r/devops, r/kubernetes** | Community knowledge | Every 6h | `deployment`, `infrastructure` |
| **Patch Tuesday (MS)** | 2nd Tuesday monthly | Monthly | `security` |
| **OpenSSH / OpenSSL** | Project advisories | Every 12h | `security`, `network` |

### 5.3 KB Writer Agent (Opus Builds)

A cron-driven agent that:

1. **Polls** — fetches new items from each feed source (RSS, API, status page HTML)
2. **Filters** — keeps only items relevant to our stack (Debian/Ubuntu, K3s, Docker, Traefik, etc.)
3. **Summarizes** — creates a concise Intel Bulletin article:
   - What changed
   - What's affected (component, version range)
   - Severity (critical/high/medium/low)
   - Action needed (patch now / monitor / informational only)
   - Links to details
4. **Writes** — creates a new KB article tagged `intel-bulletin`, `security`, and the relevant domain tag
5. **Alerts** — if severity = critical, also posts to the homelab Telegram group with @Oly tag

**Article template for intelligence bulletins:**

```
# Intel Bulletin: [Date] — [Title]

Source: [NVD / MS Status / Ubuntu / etc.]
Severity: [Critical / High / Medium / Low]
Domains: [security, infrastructure, ...]
Affected: [components and versions]
Published: [original publish date]

## Summary
What happened. 2-3 sentences max.

## Impact
What's affected in our stack? Do we run the affected version?
If yes: what's the blast radius?

## Action Required
- Immediate: [ ] replace / patch / workaround
- Monitor: [ ] what to watch for
- Informational: [ ] no action, just awareness

## Links
- [Original advisory](url)
- [CVE entry](url) (if applicable)
```

### 5.4 Agent Awareness Gate

Every agent, before starting a task, silently checks:

1. **"Are there any intel bulletins from the last 7 days relevant to my domain?"**
2. **"Was any of these bulletins marked 'Action Required: Immediate'?"**

This check runs in the background — it doesn't block the task start. But if critical bulletins exist, they're surfaced at the top of the agent's context:

```
═══ INTELLIGENCE BRIEFING ═══
You have 3 unread bulletins in your domain (security):
  [CRITICAL] MS MFA Outage (Jun 16) — affects authentication flows
  [HIGH] CUPS RCE CVE-2026-XXXX (Jun 14) — affects print infrastructure
  [MEDIUM] Ubuntu 24.04.2 kernel (Jun 13) — no immediate action
══════════════════════════════
```

### 5.5 The 1-Year Effect

This is the metric that matters:

| Time | Knowledge Base Size | P1 Resolution Time | Articles Read/Task | Surprise Incidents |
|---|---|---|---|---|
| **Month 0** | 100 seed articles | 10-30 min | 0.1 (nobody reads yet) | Frequent |
| **Month 3** | 250 articles | 8-12 min | 1.2 | Decreasing |
| **Month 6** | 450 articles | 5-8 min | 2.5 | Rare |
| **Month 12** | 1,000+ articles | 2-5 min | 4.0 | Exceptional |

**The math:** Every P1 resolved creates 1 knowledge article. That article saves 50% of the resolution time the next time a similar issue occurs. After 10 occurrences of the same class, resolution is automated — the article becomes a playbook that the Cluster 1 pipeline consumes.

---

## 6. Configuration

### 6.1 Domain Tag Configuration (`config/knowledge-domains.yaml`)

```yaml
# Per-agent domain-to-tag mappings
# Format: agent_role: [domain_tags]

agent_read_domains:
  netwatch:
    - infrastructure
    - network
    - security
    - architecture
  devops:
    - deployment
    - infrastructure
    - application
    - architecture
  operations:
    - process
    - incident
    - infrastructure
  vaultwarden:
    - security
    - infrastructure
    - deployment
  hermes-sentinel:
    - agent-framework
    - architecture
  # all agents implicitly read: agent-framework, architecture

# Feed polling schedule
feed_polling:
  nvd:
    interval: 360  # minutes (6h)
    severity_min: medium  # minimum severity to create bulletin
  microsoft_status:
    interval: 15  # minutes
    severity_min: informational
  # ... etc

# Per-customer overrides
customers:
  # For dedicated customer KBs
  # customer-name:
  #   domain_prefix: customer-customer-name
  #   feeds: []
  #   agent_read_domains: {}
```

### 6.2 Knowledge Gate Configuration (`config/knowledge-gates.yaml`)

```yaml
# Write Gate triggers
write_gate:
  always_write:
    - infra_change
    - incident_p1
    - incident_p2
    - new_integration
  conditional_write:
    - bug_fix
    - new_tool_discovery
    - infra_change_minor
  skip_write:
    - routine_deploy_no_change
    - read_only_task
    - info_request

# Read Gate configuration
read_gate:
  enabled: true
  domains_before_action: true
  intel_bulletin_window_days: 7
  min_relevance_score: 0.3  # cosine similarity threshold

# Bulletin severity thresholds
bulletin_alerts:
  critical:
    notify_telegram: true
    notify_oly: true
    agent_context_banner: true
  high:
    notify_telegram: false
    notify_oly: false
    agent_context_banner: true
  medium:
    notify_telegram: false
    notify_oly: false
    agent_context_banner: false  # only on explicit check
```

---

## 7. Build Phases

### Phase 1: Foundation (Us — Immediate, Parallel to Opus)

| Task | Owner | Est. Time | Verification |
|---|---|---|---|
| **Knowledge Growth Dashboard** in vf-dashboard | Us | 2-3h | Dashboard page at /knowledge showing article counts, reads, bulletins |
| **5 seed KB articles** in Outline (see C3 spec) | Us | 30min | Articles visible at /kb |
| **Article template** — standardize the format above | Us | 15min | Template saved in Outline or as reference |
| **Outline API key** — generate admin key | Us | 5min | Key saved, Opus has access for automation |

### Phase 2: Automation Layer (Opus)

| Task | Description |
|---|---|
| **KB Writer Agent** | Cron agent that polls feeds and writes Intel Bulletin articles |
| **Write Gate hook** | Post-task gate that prompts "should this be an article?" and auto-creates via Outline API |
| **Infra Change hook** | Tool-level detection: "did this mutation change shared infra?" → auto-article |
| **Read Gate** | Pre-task KB query by domain, surface relevant articles in agent context |
| **Intel Bulletin feed** | RSS/Atom/CVE feed poller with dedup and severity classification |

### Phase 3: Learning Dashboard & Analytics (Opus)

| Task | Description |
|---|---|
| **KB analytics API** | Outline read-count tracking, article age, domain stats |
| **Time-saved estimation** | Estimate: "article #142 saved 8 minutes * 12 reads = 96 minutes" |
| **Article health scoring** | Outdated detection (article not updated in 90 days + changes in stack) |
| **Knowledge gaps** | Detect domains with few articles but frequent incidents → suggest writing |

### Phase 4: Customer Deployment (Us + Opus)

| Task | Description |
|---|---|
| **Multi-tenant KB** | Per-customer Outline collections or separate KB instances |
| **Customer knowledge dashboard** | "This is what we know about YOUR system" view |
| **Customer intelligence feeds** | Per-customer status pages, vendor feeds |
| **Knowledge as a deliverable** | Monthly "KB Growth Report" for customers |

---

## 8. Verification

### 8.1 Write Gate Verification

```bash
# After every task: did we write an article?
curl -s "https://olympus.110lymph.nl/kb/api/articles.list" \
  -H "Authorization: Bearer $OUTLINE_KEY" \
  -d '{"limit":1}' | jq '.data[0].title'

# If the task was infra-change, there MUST be a new article
# Check article count before and after task
```

### 8.2 Read Gate Verification

```yaml
# Agent logs must show KB query before task execution
# Log line pattern:
#   [KB-READ] Queried domain:infrastructure, found 3 articles, read 2
#   [KB-READ] Task references: article #42, article #87
```

### 8.3 Proactive Learning Verification

```yaml
# Daily: did the KB Writer agent run?
# Expected: at least 1 Intel Bulletin per 24h on normal days,
# more on high-CVE-volume days

# Weekly: are agents reading bulletins?
# KB analytics should show bulletin articles being read within
# 24h of publication
```

---

## 9. Decision Trees

### 9.1 Write Gate Decision Tree

```
Task completed
│
├─ Was this an infrastructure change? (IP, DNS, firewall, config, deploy)
│  └─ YES → WRITE ARTICLE (mandatory)
│     └─ Go to article template
│
├─ Was this a P1/P2 incident resolution?
│  └─ YES → WRITE POST-MORTEM (mandatory)
│     └─ Go to post-mortem template
│
├─ Was this a new integration or tool discovery?
│  └─ YES → WRITE ARTICLE (mandatory)
│
├─ Was this task non-trivial, non-obvious, or a deep dive?
│  └─ YES → WRITE ARTICLE
│  └─ NO  → Skip. But ask: "If I encountered this again, would I want an article?"
│           └─ YES → WRITE ARTICLE (people always regret not writing)
│
└─ Was this purely read-only / info request / routine?
   └─ YES → Skip. No article needed.
```

### 9.2 Read Gate Decision Tree

```
New task arrives for agent
│
├─ Has agent already read KB articles in this session?
│  └─ YES → Skip (already up to date)
│  └─ NO  → Continue
│
├─ Query KB by domain (agent's configured domains)
│  ├─ Results found?
│  │  ├─ YES → Read articles. Check "Are any marked as 'outdated'?"
│  │  │        ├─ YES → Update article, proceed with corrected knowledge
│  │  │        └─ NO  → Use as-is
│  │  └─ NO  → Proceed without KB context, Write Gate fires at end
│  │
│  └─ Check Intel Bulletins < 7 days old
│     ├─ Critical bulletins exist in domain?
│     │  ├─ YES → Surface in agent context banner, read before starting
│     │  └─ NO  → Continue
│     └─ Proceed to task execution
```

### 9.3 Proactive Learning Decision Tree

```
KB Writer Agent (cron: every N hours)
│
├─ Poll feed sources
│  ├─ New items found?
│  │  ├─ YES → Continue to filter
│  │  └─ NO  → Sleep until next poll
│  │
│  ├─ Filter by relevance to stack
│  │  ├─ Relevant?
│  │  │  ├─ YES → Classify severity
│  │  │  │        ├─ Critical → Write bulletin + Telegram alert + Oly tag
│  │  │  │        ├─ High → Write bulletin + agent banner
│  │  │  │        ├─ Medium → Write bulletin (informational)
│  │  │  │        └─ Low → Skip (noise reduction)
│  │  │  └─ NO  → Skip (irrelevant to our stack)
│  │  │
│  │  └─ Dedup: already have a bulletin on this?
│  │     ├─ YES → Update existing (new info, severity change)
│  │     └─ NO  → Create new article
│  │
│  └─ Done. Mark poll timestamp for next run.
```

---

## 10. Summary: What We Build vs What Opus Builds

| Deliverable | Who | When | Notes |
|---|---|---|---|
| Knowledge Growth Dashboard (vf-dashboard) | **Us** | Phase 1 | /knowledge page with article stats, reads, bulletins |
| 5 seed KB articles | **Us** | Phase 1 | Architecture, Agent Framework, Deployment, Network, Incident Response |
| Article template | **Us** | Phase 1 | Standard format in Outline |
| Outline API key | **Us** | Phase 1 | Admin key for Opus automation |
| KB Writer Agent | **Opus** | Phase 2 | Feed polling + bulletin creation |
| Write Gate | **Opus** | Phase 2 | Post-task article auto-creation |
| Infra Change Hook | **Opus** | Phase 2 | Tool-level change detection |
| Read Gate | **Opus** | Phase 2 | Pre-task KB query |
| Feed sources + dedup | **Opus** | Phase 2 | RSS/CVE/status page pollers |
| KB analytics API | **Opus** | Phase 3 | Read counts, time-saved estimates |
| Article health scoring | **Opus** | Phase 3 | Outdated detection |
| Customer multi-tenant | **Us + Opus** | Phase 4 | Per-customer KB |
| Customer dashboard | **Us** | Phase 4 | "What we know about your system" |
| Monthly KB report | **Us** | Phase 4 | Customer deliverable |
