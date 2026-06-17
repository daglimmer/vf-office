# 110lymph Autonomous Operations Framework — Cluster 1
## Monitoring → Anomaly Detection → Automated Remediation

> **Version:** v6 · **Status:** Architecture Draft · **Scope:** Cluster 1 of 5
>
> *This document describes a production-ready operations pipeline built on our homelab but designed for customer deployment. Every component is modular, every decision point has a configurable gate, and the entire system is presentable as a decision tree.*

---

## 1. Executive Summary

Cluster 1 connects three capabilities — **monitoring**, **anomaly detection**, and **automated remediation** — into a single autonomous pipeline:

```
Collect → Detect → Classify → Dispatch → Remediate → Verify → Close
```

The pipeline is fully configurable at every decision point. Customers can insert manual approval gates, change severity thresholds, or override remediation playbooks without altering the core architecture.

**Key design principles:**
- **Decision tree, not black box** — every step is inspectable and explainable
- **Configurable gates** — any decision point can require human approval
- **Layered autonomy** — P4 runs fully autonomous, P1 requires human-in-the-loop
- **Customer-extensible** — add collectors, rules, playbooks without touching the pipeline

---

## 2. Architecture Overview

### 2.1 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        COLLECTION LAYER                             │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │Prometheus│  │  Loki    │  │ NetWatch │  │ External Sources │    │
│  │(metrics) │  │(logs)    │  │(health)  │  │(API,Custom,etc)  │    │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └────────┬─────────┘    │
│        │              │              │                │              │
│        ▼              ▼              ▼                ▼              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    EVALUATION LAYER                          │    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────┐     │    │
│  │  │              Alertmanager Rules                     │     │    │
│  │  │  ┌─────────┐ ┌──────────┐ ┌───────────┐           │     │    │
│  │  │  │ Static  │ │  Trend   │ │ Anomaly   │           │     │    │
│  │  │  │ Rules   │ │  Rules   │ │ Detection │           │     │    │
│  │  │  │ (>85%)  │ │(7d trend)│ │(outliers) │           │     │    │
│  │  │  └─────────┘ └──────────┘ └───────────┘           │     │    │
│  │  └────────────────────────────────────────────────────┘     │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SEVERITY CLASSIFICATION                        │
│                                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                │
│  │   P1    │  │   P2    │  │   P3    │  │   P4    │                │
│  │ Critical│  │  High   │  │ Medium  │  │   Low   │                │
│  │ <15min  │  │  <1hr   │  │  <4hrs  │  │  <24hrs │                │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘                │
│       │            │            │            │                      │
│       ▼            ▼            ▼            ▼                      │
│  ┌────────────────────────────────────────────────────┐             │
│  │              GATE: Human Approval?                  │             │
│  │  (Configurable per severity, per component,        │             │
│  │   per customer, per time-of-day)                   │             │
│  └────────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DISPATCH & REMEDIATION                         │
│                                                                     │
│  ┌──────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │  Kanban  │───▶│  Specialist      │───▶│  Playbook        │       │
│  │  Board   │    │  Agent Assigned  │    │  Execution       │       │
│  └──────────┘    └──────────────────┘    └────────┬─────────┘       │
│                                                    │                 │
│                                                    ▼                 │
│  ┌────────────────────────────────────────────────────┐             │
│  │           VERIFICATION & CLOSURE                    │             │
│  │                                                     │             │
│  │  Execute playbook → Verify fix → Log outcome →      │             │
│  │  Update KB → Close card → Notify stakeholders       │             │
│  └────────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Decision Tree (Customer-Facing View)

```
INCIDENT DETECTED
│
├─ 1. What type? ─────────────────────────────────────────────
│   ├─ Metric threshold breach (disk, CPU, memory, latency)
│   ├─ Log pattern match (error spike, crash loop)
│   ├─ Health check failure (service down, cert expired)
│   └─ External webhook (custom source)
│
├─ 2. What severity? ─────────────────────────────────────────
│   ├─ P1: Service down, data loss, security breach
│   ├─ P2: Degraded performance, >85% capacity
│   ├─ P3: Warning threshold, approaching limit
│   └─ P4: Informational, cleanup suggested
│
├─ 3. [GATE] Does this require human approval? ───────────────
│   ├─ YES → Create Kanban card [WAITING APPROVAL]
│   │         Notify approver (Telegram/Email/Dashboard)
│   │         └─ Approved → Continue to dispatch
│   │         └─ Rejected → Log, close, notify
│   │         └─ Timeout → Escalate to next approver
│   └─ NO → Continue to dispatch (autonomous path)
│
├─ 4. Who handles it? ────────────────────────────────────────
│   ├─ devops-infra → Disk, storage, VM issues
│   ├─ devops-app → Service, application, pod issues
│   ├─ devops-api → API, gateway, endpoint issues
│   ├─ netwatch → Network, firewall, connectivity issues
│   ├─ security → Threat, access, vulnerability issues
│   └─ general → Fallback for unclassified issues
│
├─ 5. What playbook? ────────────────────────────────────────
│   ├─ KB lookup: find matching playbook by alert type
│   ├─ Exact match → Execute playbook
│   └─ No match → Create KB article request, escalate
│
├─ 6. Execute remediation ────────────────────────────────────
│   ├─ Pre-flight checks pass? → Continue
│   │   └─ Fail → Log, escalate, skip
│   ├─ Execute steps (from playbook)
│   ├─ Step failed? → Rollback, log, escalate
│   │   └─ Rollback successful? → Close with note
│   │       └─ Rollback failed? → P1 escalation
│   └─ All steps pass → Continue
│
├─ 7. Verify fix ─────────────────────────────────────────────
│   ├─ Check metric returns to normal
│   ├─ Check service responds
│   ├─ Check no new alerts fired
│   └─ All pass → Continue
│       └─ Fail → Re-execute playbook (max 2 retries)
│           └─ Still failing → Escalate to human
│
└─ 8. Close & learn ──────────────────────────────────────────
    ├─ Log outcome: success/failure, duration, notes
    ├─ Update KB article if steps changed
    ├─ Close Kanban card
    └─ Notify stakeholders: "Resolved in X min"
```

---

## 3. Component Specifications

### 3.1 Collection Layer

#### Prometheus (Metrics)
**Status:** ✅ Deployed on all nodes
**Configuration:**
- Pre-configured exporters: node_exporter, kube_state_metrics, cAdvisor
- Scrape interval: 15s (default), 5s for critical services
- Retention: 15d local, long-term via Thanos or remote write (future)

**Customer extensibility:**
- Add exporters via ConfigMap (no code change)
- Custom scrape targets via service annotations
- Remote write to customer's central Prometheus if needed

#### Loki (Logs)
**Status:** ❌ Not deployed — part of build scope
**Purpose:** Centralized log aggregation for all services, agents, and infrastructure
**Integration:**
- Promtail on each node ships logs to Loki
- Agents auto-log remediation steps as structured log lines
- Grafana queries Loki for "show all events related to X service"

**Build spec:**
- Deploy Loki as a pod in `mission-control` (or `observability` namespace)
- Deploy Promtail on each K3s node via DaemonSet
- Configure log sources: K3s pod logs, Hermes agent logs, OPNsense syslog, Proxmox syslog

#### NetWatch (Health Checks)
**Status:** ✅ Deployed
**Purpose:** External health checks (curl endpoints, ping hosts) — catches what Prometheus inside the cluster might miss
**Integration:** NetWatch alerts → same Kanban pipeline as Prometheus alerts

### 3.2 Evaluation Layer (Alertmanager)

**Status:** ✅ Deployed with Prometheus

**Rule Categories:**

| Rule Type | Example | Severity | Description |
|---|---|---|---|
| Static threshold | `disk_usage > 85%` | P2 | Hard limit breach |
| Static threshold | `disk_usage > 95%` | P1 | Critical limit breach |
| Rate-based | `error_rate > 5% over 5m` | P2 | Sudden error spike |
| Absence | `up == 0 for > 60s` | P1 | Service disappeared |
| Trend | `predict_linear(disk_usage[7d]) > 90% in 7d` | P3 | Approaching limit |
| Anomaly | `stddev > 3σ from 24h baseline` | P2/P3 | Unusual pattern |
| Composite | `disk > 80% AND backup_failed` | P1 | Combined risk |

**Customizable per deployment:**
- Alertmanager routes can direct different alerts to different receivers
- Severity mapping is configurable via rule labels (no code change)
- Silence periods for maintenance windows

### 3.3 Gate System (Human Approval)

The gate is a **configurable decorator** that wraps any dispatch decision.

**Configuration:**

```yaml
gates:
  - rule: "severity == P1"
    require_approval: true
    approvers: ["ray", "oly", "marcus"]
    timeout: 15m
    escalation: "oly"  # if no approval within 15m, escalate

  - rule: "severity == P2 AND component == 'argus'"
    require_approval: true
    approvers: ["ray"]
    timeout: 30m
    escalation: "oly"

  - rule: "severity == P2 AND component != 'argus'"
    require_approval: false  # auto-remediate

  - rule: "severity IN (P3, P4)"
    require_approval: false  # fully autonomous
```

**Customer customization:**
- Add rules by component, severity, time-of-day, or custom labels
- Override timeout and escalation per rule
- Plug in different notification channels (Telegram, Slack, Email, SMS, PagerDuty)

**Gate behavior:**
1. Alert triggers gate check
2. If approval required: create card with [WAITING] status, notify approver
3. Approver responds: approve/reject/timeout
4. Approved → card moves to dispatcher queue
5. Rejected → card closes with reason, incident logged
6. Timeout → escalate to next tier approver

### 3.4 Dispatch Layer (Kanban)

**Status:** Kanban system exists — bridge needs building

**Card Template:**

```yaml
title: "[P2] Disk usage >85% on k3s-srv-03"
severity: P2
component: k3s-srv-03
metric: disk_usage
value: 87%
threshold: 85
team: devops-infra
playbook: "disk-space-remediation"
status: pending  # pending | approved | running | verifying | closed | failed
approval: required  # required | not_required | approved | rejected
created: 2026-06-17T14:30:00Z
grafana_link: "https://olympus.110lymph.nl/d/disk-usage?server=k3s-srv-03"
```

**Dispatch rules:**
- Team assignment from alert labels (`team: devops-infra`)
- Fallback to `general` agent if team label missing
- P1 cards also fire Telegram alert via NetWatch channel
- Cards age out: P1 auto-escalate after 15min, P2 after 1hr

### 3.5 Remediation Layer (Playbooks)

**Playbook Template:**

```markdown
# Playbook: Disk Space Remediation

**ID:** disk-space-remediation
**Severity:** P2 (auto-remediate), P1 (manual gate)
**Responsible team:** devops-infra
**Pre-flight checks:**
- [ ] Verify affected server responds to SSH
- [ ] Check current disk: `df -h`
- [ ] Check 24h trend (grafana link)
- [ ] Confirm no backup jobs running (check PBS)
- [ ] Confirm no critical services on same partition

**Remediation steps:**
1. Clean journalctl logs older than 3 days
2. Clean Docker images unused >24h
3. Clean PBS snapshots older than 7 days
4. Run `df -h` again
5. If still >85%, list top 10 largest files/dirs
6. If top files are logs → configure logrotate
7. If no clear culprit → report and escalate

**Verification:**
- [ ] `df -h` shows <75%
- [ ] Grafana trend shows downward slope
- [ ] No new alerts triggered by remediation
- [ ] Services still responding

**Rollback:**
- Disk cleanup is non-reversible. If too much was cleaned:
  - Restore from last PBS snapshot (if available)
- If service was restarted unnecessarily:
  - Service auto-recovers, no rollback needed
```

**Playbook library (build scope):**

| # | Playbook | Trigger | Auto? | Est. time |
|---|---|---|---|---|
| 1 | Disk space >85% | Prometheus alert | ✅ P2 auto | 5 min |
| 2 | Service down | Health check failure | ✅ P2 auto | 2 min |
| 3 | Pod crash-looping | K8s event | ✅ P2 auto | 3 min |
| 4 | Certificate expiring <30d | Prometheus alert | ✅ P3 auto | 10 min |
| 5 | Backup failed | PBS/script failure | ✅ P2 auto | 5 min |
| 6 | High memory usage | Prometheus alert | 🔴 P2 manual | 10 min |
| 7 | High CPU saturation | Prometheus alert | 🔴 P2 manual | 10 min |
| 8 | DNS resolution failure | NetWatch check | ✅ P1 manual | 5 min |
| 9 | Firewall rule drift | Config diff | ✅ P3 auto | 15 min |
| 10 | Container image vulnerability | Trivy scan | 🔴 P2 manual | 20 min |

### 3.6 Verification Layer

After remediation, the agent MUST verify before closing:

```
1. Re-check the original metric (disk, service, etc.)
2. Check no new alerts fired in last 2 minutes
3. Run smoke test (curl endpoint, ping host, check log)
4. All pass → Close card with "Resolved in X min"
5. Any fail → Retry playbook (max 2 retries)
6. Still failing → Escalate to human (P1 override)
```

### 3.7 Learning Loop

After closure, the agent:

1. **Logs outcome** — success/failure, duration, unexpected issues
2. **Updates KB** — if steps differed from playbook, update article
3. **Updates metrics** — time-to-detect, time-to-remediate, success rate
4. **Suggests improvements** — if same issue repeats, suggest permanent fix

---

## 4. Configuration Reference

### 4.1 Global Settings

```yaml
pipeline:
  collection_interval: 15s
  max_retries: 2
  retry_delay: 60s
  
  gates:
    enabled: true
    default_approval: false  # all alerts default to no approval
    override_by_severity:
      P1: true
      P2: false
      P3: false
      P4: false
    
  escalation:
    P1_timeout: 15m
    P2_timeout: 1h
    P3_timeout: 4h
    
  notification:
    channels: [telegram, kanban]
    P1_channels: [telegram, kanban, sms]
    
  verification:
    enabled: true
    retry_threshold: 2
    smoke_test: true
    
  learning:
    log_outcomes: true
    auto_update_kb: true
    generate_report: weekly
```

### 4.2 Customer Override Points

Each of these can be overridden per customer deployment:

| Parameter | Default | Customer Can Override |
|---|---|---|
| Severity thresholds | Our defaults | Yes (per component) |
| Approval gates | By severity | Yes (by component, time, tag) |
| Playbook steps | Our standard | Yes (extend/replace) |
| Notification channels | Telegram + Kanban | Yes (add Slack, Email, PagerDuty) |
| Auto-remediate severity | P2+ auto | Yes (make all manual, or all auto) |
| Verification checks | Our standard | Yes (add custom smoke tests) |
| Rollback plans | Our standard | Yes (add custom rollback scripts) |
| Escalation chain | Our chain | Yes (define their own) |

---

## 5. Build Phases

### Phase 1: Foundation (We Build)
- Grafana dashboards — production quality, Flux-inspired
- Prometheus alert rules — thresholds tuned to our infra
- Dashboard integration into olympus.110lymph.nl
- **Estimated effort:** 2-3 sessions

### Phase 2: Pipeline (Opus Builds)
- Alertmanager → Kanban webhook receiver
- Kanban card templates with severity, team, playbook ref
- 10 playbook KB articles
- Telegram P1 integration
- Verification loop
- **Estimated effort:** 1 session

### Phase 3: Autonomous (Opus Builds)
- Self-healing execution (auto-run playbooks for non-gated alerts)
- Gate system with configurable approval rules
- Post-incident learning loop
- Weekly capacity/trend report
- **Estimated effort:** 1-2 sessions

### Phase 4: Customer-Ready (Us + Opus)
- Decision tree renderer (visual — for customer presentations)
- Customer deployment config template (overrides file)
- Documentation: "How to deploy 110lymph Ops in your environment"
- **Estimated effort:** 1 session

---

## 6. Appendix: Decision Tree (Printable)

```
INCIDENT
   │
   ▼
┌─────────────┐
│ 1. COLLECT  │─── Prometheus / Loki / NetWatch
└──────┬──────┘
       ▼
┌─────────────┐
│ 2. EVALUATE │─── Alertmanager rules → severity
└──────┬──────┘
       ▼
┌─────────────┐
│ 3. GATE?    │─── Config: auto vs. manual
└──────┬──────┘
       │
    ┌──┴──┐
    ▼     ▼
 P1/HIGH  P2/P3/P4
 MANUAL   AUTO
    │       │
    ▼       ▼
┌─────────────┐
│ 4. DISPATCH │─── Kanban → Specialist agent
└──────┬──────┘
       ▼
┌─────────────┐
│ 5. REMEDIATE│─── Playbook → Execute steps
└──────┬──────┘
       ▼
┌─────────────┐
│ 6. VERIFY   │─── Check → Retry? → Escalate?
└──────┬──────┘
       ▼
┌─────────────┐
│ 7. CLOSE    │─── Log → Learn → Notify
└─────────────┘
```

---

*End of Cluster 1 spec. Cluster 2 (Knowledge Base + Learning Loop) builds on this foundation.*
