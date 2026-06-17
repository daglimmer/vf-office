# 110lymph Autonomous Operations Framework — Cluster 3
## Governance → Situation Awareness → Policy Enforcement → Audit

> **Version:** v6 · **Status:** Architecture Draft · **Scope:** Cluster 3 of 5
>
> *This document defines the governance layer that sits above every agent action. It does NOT restrict access — every agent retains full capability. Instead, it enforces policy: before every action, the agent must understand context, scope, impact, and constraints. Policy is what limits action, not credentials. The framework is deliberately generic — it applies to us as the pilot, and to any customer system with minimal adaptation.*

---

## 1. Executive Summary

Cluster 3 solves a fundamental problem: **agents go head-in, start coding, and break things because they don't understand the landscape.**

The solution is not to remove access — every agent has the SSH key, every agent can do anything. The solution is **policy-before-action**: a lightweight, mandatory pre-flight check that runs before every execution.

**The three-layer model:**

```
1. SITUATION AWARENESS → "What am I touching? What's the blast radius? What time is it?"
2. POLICY ENFORCEMENT  → "Is this action allowed right now? Who needs to approve?"
3. AUDIT TRAIL          → "Every decision logged. Every override recorded. Proof for customers."
```

**Design principles:**
- **Policy > Access** — remove credentials never. Use policy to gate actions.
- **Dynamic, not hardcoded** — policies are data-driven configs, not code. Change them without changing the agent.
- **Blast radius aware** — every action is scored: "touching production at 3pm on a Tuesday?" vs "running a read-only query?"
- **Proportionate gates** — a status check passes instantly. A production deployment at 5pm on Friday hits multiple gates.
- **Audit-first** — every policy decision is logged before the action executes. Tamper-proof logs.
- **Customer-presentable** — "here's our governance framework. Here's what every agent checks before it acts. Here's the proof."

---

## 2. Architecture Overview

### 2.1 The Pre-Flight Check — Mandatory Before Every Action

Every agent action begins with a **zero-second pre-flight check** — it should feel instant for routine operations but catches dangerous actions before they execute.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PRE-FLIGHT CHECK                                │
│                     (runs before EVERY action)                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. SITUATION AWARENESS                                             │
│                                                                     │
│     ┌──────────────────────────────────────────────────────────┐    │
│     │ Q1: What environment am I touching?                      │    │
│     │     → production / staging / monitoring / knowledge      │    │
│     │                                                          │    │
│     │ Q2: What time is it?                                     │    │
│     │     → 09:00 Tue (business hours) vs 23:00 Sat (out of    │    │
│     │       hours) vs 02:00 Wed (maintenance window?)          │    │
│     │                                                          │    │
│     │ Q3: What's the blast radius?                             │    │
│     │     → Single pod / entire namespace / cluster-wide /     │    │
│     │       customer-facing / all customers                    │    │
│     │                                                          │    │
│     │ Q4: Who am I? (agent identity)                           │    │
│     │     → NetWatch / DevOps / Operations / Marcus / etc.     │    │
│     │                                                          │    │
│     │ Q5: What type of action?                                 │    │
│     │     → read (query, status check)                         │    │
│     │     → write (config change, deploy, modify)              │    │
│     │     → delete (destroy, remove, reclaim)                  │    │
│     └──────────────────────────────────────────────────────────┘    │
│                                                                     │
│  OUTPUT: context object with: environment, time, scope, agent, type │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. POLICY ENFORCEMENT                                              │
│                                                                     │
│     Policy engine evaluates: given the context object,              │
│     what rules apply?                                               │
│                                                                     │
│     ┌──────────────────────────────────────────────────────────┐    │
│     │ Policy: "production write during business hours"          │    │
│     │   → ALLOW with notify: inform #homelab                     │    │
│     │                                                           │    │
│     │ Policy: "production write outside business hours"          │    │
│     │   → BLOCK unless P1 incident with Marcus approval          │    │
│     │                                                           │    │
│     │ Policy: "delete operation on any environment"              │    │
│     │   → REQUIRE human approval (Marcus or Ray)                │    │
│     │                                                           │    │
│     │ Policy: "read-only → always ALLOW"                        │    │
│     │   → No gate needed                                        │    │
│     │                                                           │    │
│     │ Policy: "production write on customer system"             │    │
│     │   → REQUIRE customer ticket reference + approval window    │    │
│     └──────────────────────────────────────────────────────────┘    │
│                                                                     │
│  OUTPUT: policy decision (ALLOW / ALLOW_WITH_NOTIFY /               │
│           REQUIRE_HUMAN_APPROVAL / BLOCK) + reason                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. AUDIT LOG                                                       │
│                                                                     │
│     Every pre-flight decision is logged:                            │
│                                                                     │
│     ┌──────────────────────────────────────────────────────────┐    │
│     │ Timestamp: 2026-06-17T14:32:00+02:00                     │    │
│     │ Agent: DevOps                                             │    │
│     │ Action: deploy (kubectl set image)                        │    │
│     │ Target: olympus-office, mission-control, production       │    │
│     │ Context: business hours, single-pod, customer-facing      │    │
│     │ Policy: "production write business hours"                 │    │
│     │ Decision: ALLOW_WITH_NOTIFY                               │    │
│     │ Notified: #homelab Telegram group                         │    │
│     │ Outcome: succeeded / failed / rolled back                 │    │
│     │ Request ID: gov-20260617-0042                             │    │
│     └──────────────────────────────────────────────────────────┘    │
│                                                                     │
│  OUTPUT: immutable log entry (appended to governance log)           │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Mapping

| Component | What It Is | Status | Who Builds |
|---|---|---|---|
| **Situation Awareness Module** | Pre-flight context extraction (env, time, scope, action type) | ❌ Not built | Opus |
| **Policy Engine** | Evaluates context against rules, returns decision | ❌ Not built | Opus |
| **Policy Config** | `config/governance-policies.yaml` — data-driven, hot-reloadable | ❌ Not built | Opus |
| **Audit Logger** | Immutable log of every decision + outcome | ❌ Not built | Opus |
| **Governance Dashboard** | Visual: policy hits, blocked actions, audit trail search | ❌ Not built | Us |
| **Override System** | Humans can override policy (with permanent audit trail) | ❌ Not built | Opus |

---

## 3. Situation Awareness — "Know What You're Touching"

### 3.1 The Five Questions

Every agent action begins by answering five questions. These are NOT asked of the human — the agent answers them from context:

**Q1: What environment?**
Derived from target host, namespace, URL prefix, or explicit label.

| Environment | Examples | Detection |
|---|---|---|
| `production` | olympus.110lymph.nl, mission-control namespace, prod VLAN | DNS lookup, namespace name, label `env: prod` |
| `staging` | staging.110lymph.nl, staging namespace | Same logic, different targets |
| `monitoring` | Grafana, Prometheus, NetWatch read endpoints | Read-only data paths |
| `knowledge` | Outline, Fumadocs | Content management, not infra |
| `development` | Local files, test scripts, non-deployed code | Working directory, branch name |

**Q2: What time is it?**
Not just the clock — but the **policy-relevant time window**:

| Window | Definition | Example |
|---|---|---|
| `business_hours` | Mon-Fri 08:00-18:00 CEST | Default change window |
| `maintenance_window` | Configurable (e.g. Sun 02:00-06:00) | Heavy operations |
| `out_of_hours` | Everything else | Restricted |
| `p1_incident` | Any time, but tagged as incident | Exceptions allowed |

**Q3: What's the blast radius?**

```
╔══════════════════════════════════════════════════════════════════════╗
║  BLAST RADIUS SCALE                                                 ║
║                                                                     ║
║  1. Self-only      → Reading a config file, querying own memory     ║
║  2. Single pod     → Restarting one container                       ║
║  3. Single service → Updating an IngressRoute or Service             ║
║  4. Namespace      → Deleting all pods in mission-control           ║
║  5. Cluster-wide   → Changing a ClusterRole or StorageClass         ║
║  6. Infrastructure → Firewall rule, VLAN change, DNS zone           ║
║  7. Multi-customer → Customer-facing change affecting all tenants   ║
╚══════════════════════════════════════════════════════════════════════╝
```

**Q4: Who am I?**
Agent identity determines which policies apply.

| Agent | Policy Tier | Trust Level |
|---|---|---|
| NetWatch | Read-only + alerts | High (limited write) |
| DevOps | Full operational | High (trained on impact) |
| Operations | Runbook execution | Medium (guided) |
| Marcus | Executive override | Full (human-policy bypass) |
| Sub-agents (Leaf) | Restricted | Low (no delete, no prod write) |
| Opus (external) | Read-only + staging write | Low (external contractor) |

**Q5: What type of action?**

| Type | Examples | Default Gate |
|---|---|---|
| `read` | curl, kubectl get, grep, show config | None (always passes) |
| `write` | kubectl apply, config change, DNS update | Notify #homelab |
| `modify` | Edit config, update image tag, scale replicas | Notify + log |
| `delete` | kubectl delete, rm -rf, DNS delete | REQUIRE human approval |
| `create` | New service, new namespace, new rule | Notify + 5min wait |

### 3.2 Context Object

The five questions produce a single JSON context object:

```json
{
  "agent": "devops",
  "action_type": "write",
  "environment": "production",
  "target": "olympus-office",
  "namespace": "mission-control",
  "blast_radius": 3,
  "time_window": "business_hours",
  "is_incident": false,
  "customer_impact": true,
  "customer_name": null
}
```

This object is passed to the Policy Engine, which evaluates it against all active policies.

---

## 4. Policy Enforcement — "Auto-Trigger Rules"

### 4.1 Policy Configuration (`config/governance-policies.yaml`)

```yaml
# Governance Policy Configuration
# Hot-reloadable: change this file, policies update on next pre-flight check
# No agent restart needed.

# Default policy (applied if no other rule matches)
default:
  action: ALLOW
  notify: false
  log: true

# Policy rules — evaluated in order, first match wins
rules:

  # --- READ OPERATIONS (always allowed) ---
  - id: read-always
    description: "Read operations are never blocked"
    match:
      action_type: read
    decision: ALLOW
    notify: false
    log: false  # too noisy to log every status check

  # --- DELETE OPERATIONS (always gated) ---
  - id: delete-requires-human
    description: "Delete operations always require human approval"
    match:
      action_type: delete
    decision: REQUIRE_HUMAN_APPROVAL
    notify: true
    notify_target: telegram:@oly

  # --- PRODUCTION WRITE (business hours) ---
  - id: prod-write-business-hours
    description: "Production writes during business hours are allowed with notification"
    match:
      action_type: [write, modify, create]
      environment: production
      time_window: business_hours
    decision: ALLOW_WITH_NOTIFY
    notify: true
    notify_target: telegram:#homelab

  # --- PRODUCTION WRITE (outside business hours) ---
  - id: prod-write-outside-hours
    description: "Production writes outside business hours blocked unless P1 incident"
    match:
      action_type: [write, modify, create]
      environment: production
      time_window:
        - out_of_hours
        - maintenance_window
    decision: BLOCK
    block_message: "Production writes outside business hours require P1 incident tag or Marcus approval."
    override:
      allowed_with: p1_incident
      override_notify: telegram:@marcus

  # --- BLAST RADIUS >= 5 (cluster-wide or infra) ---
  - id: blast-radius-5-plus
    description: "Cluster-wide or infrastructure changes require inventory + approval"
    match:
      blast_radius:
        - 5
        - 6
        - 7
    decision: REQUIRE_INVENTORY_AND_APPROVAL
    inventory_required: true
    # Agent must produce: what's impacted, what's the rollback plan, who's affected
    notify: true
    notify_target: telegram:@oly

  # --- CUSTOMER-FACING CHANGES ---
  - id: customer-facing-change
    description: "Changes that affect customers require customer ticket reference"
    match:
      customer_impact: true
      action_type: [write, modify, create, delete]
    decision: ALLOW_WITH_NOTIFY
    notify: true
    notify_target: telegram:#homelab
    require_ticket_reference: true
    ticket_field: "customer_ticket"
    block_message: "Customer-facing changes require a ticket reference. Set customer_ticket in the action context or cancel."

  # --- LEAF SUB-AGENTS (restricted) ---
  - id: leaf-agent-restricted
    description: "Leaf sub-agents cannot perform destructive actions"
    match:
      agent: sub-agent
      action_type: delete
    decision: BLOCK
    block_message: "Sub-agents cannot perform delete operations. Delegate to a specialist or ask Marcus."

  - id: leaf-agent-prod-write
    description: "Leaf sub-agents cannot write to production"
    match:
      agent: sub-agent
      environment: production
      action_type: [write, modify, create]
    decision: BLOCK
    block_message: "Sub-agents cannot modify production. Delegate to a specialist or ask Marcus."

  # --- SCHEDULED MAINTENANCE WINDOWS ---
  - id: windows-scheduled-maintenance
    description: "Allowed operations during defined maintenance windows"
    match:
      time_window: maintenance_window
      action_type: [write, modify, create]
      environment: production
    decision: ALLOW_WITH_NOTIFY
    notify: true
    notify_target: telegram:#homelab
    require_pre_approval: true
    approval_deadline_minutes: 60
```

### 4.2 Policy Decisions

| Decision | Meaning | What Happens |
|---|---|---|
| `ALLOW` | Action proceeds immediately | Nothing extra |
| `ALLOW_WITH_NOTIFY` | Action proceeds, notification sent | Telegram/email sent in background |
| `ALLOW_WITH_LOG` | Action proceeds, logged silently | Audit only |
| `REQUIRE_HUMAN_APPROVAL` | Action blocked until approved | Agent sends request to approver, waits for response |
| `REQUIRE_INVENTORY_AND_APPROVAL` | Action blocked until agent produces impact inventory + gets approval | Agent writes impact statement, gets sign-off |
| `BLOCK` | Action denied entirely | Agent returns policy violation message to user |

### 4.3 Override System

When a policy BLOCKs or REQUIREs approval, a human can always override:

```yaml
# Override is logged with:
override:
  reason: "P1 incident — customer-facing service down"
  approver: "marcus"
  timestamp: "2026-06-17T15:45:00+02:00"
  override_id: "ovr-20260617-001"
  duration: "24h"  # override expires automatically
```

Overrides are NOT permanent — they expire. Default expiry: 24 hours. Recurring overrides for the same policy signal the policy needs updating, not that it should be ignored.

---

## 5. Audit Trail — "Everything Logged, Nothing Hidden"

### 5.1 Governance Log Schema

Every pre-flight decision produces an immutable log entry:

| Field | Example | Notes |
|---|---|---|
| `gov_id` | `gov-20260617-0042` | Unique per decision |
| `timestamp` | `2026-06-17T14:32:00+02:00` | Pre-execution time |
| `agent` | `devops` | Who acted |
| `parent_request` | `ray: "deploy new office image"` | The original user ask |
| `context` | `{...}` | Full context object (see 3.2) |
| `matched_rule` | `prod-write-business-hours` | Which policy fired |
| `decision` | `ALLOW_WITH_NOTIFY` | What was decided |
| `notified` | `[telegram:#homelab]` | Where notification sent |
| `override` | `null` or `{...}` | Override details if applicable |
| `action_outcome` | `succeeded` | After execution, updated |
| `execution_time_ms` | `3400` | How long action took |
| `rollback_needed` | `false` | Was rollback required? |

### 5.2 Log Storage

```
Store: Immutable append-only log
Format: JSONL (one JSON object per line)
Location: /var/log/governance/2026/06/17/gov.log
Retention: 1 year (by default), 3 years (customer-facing)
Rotation: Daily, gzip compressed

Also sent to:
- Loki (for Grafana queries)
- Outline KB article (monthly compliance summary)
```

### 5.3 Compliance Proof

For customers, the governance log IS the compliance proof:

```yaml
# Monthly compliance report
period: 2026-06-01 to 2026-06-30
total_actions: 1,847
blocked_actions: 12
human_approvals: 8
overrides: 2
unauthorized_attempts: 0
policy_violations: 0

# By severity
customer_facing_changes: 43
  with_ticket_ref: 43  # 100% compliance
  without_ticket_ref: 0

production_writes_outside_hours: 5
  approved_as_p1: 4
  approved_with_override: 1
  blocked: 0

delete_operations: 3
  all_human_approved: 3
  automated_delete_attempts_blocked: 0
```

---

## 6. The Blast Radius Inventory

### 6.1 What Is It?

When an action triggers `REQUIRE_INVENTORY_AND_APPROVAL` (blast radius 5+), the agent must produce an **impact inventory** before proceeding:

```markdown
## Impact Inventory — gov-20260617-0042

### What I'm about to do
Change the production k3s IngressRoute for olympus.110lymph.nl

### What's impacted if this goes wrong
- olympus.110lymph.nl (dashboard) — all users lose access
- olympus.110lymph.nl/office — 3D Office not accessible
- olympus.110lymph.nl/kb — Outline not accessible
- olympus.110lymph.nl/dex — Auth not accessible
- All agents lose dashboard visibility

### Rollback plan
1. `git revert` the IngressRoute change
2. `kubectl apply -f <previous-manifest>`
3. Verify: curl -I https://olympus.110lymph.nl returns 200
4. Estimated rollback time: 2 minutes

### Risk assessment
- Probability of failure: LOW (IngressRoute is declarative, Traefik hot-reloads)
- Impact if failure: HIGH (all olympus.110lymph.nl down)
- Mitigation: rollback plan tested, takes 2 minutes

### Recommended action
Proceed with caution. Notify #homelab before and after.
```

### 6.2 When Is It Required?

| Blast Radius | Inventory Required By |
|---|---|
| 1-2 (self, single pod) | Never |
| 3-4 (service, namespace) | Recommended but not enforced |
| 5+ (cluster, infra, multi-customer) | **MANDATORY** |
| Customer-facing + write | Recommended |

---

## 7. Configuration

### 7.1 Environment Detection (`config/env-detection.yaml`)

```yaml
# How agents detect which environment they're operating on
# Evaluated in order, first match wins

environments:
  production:
    match:
      - dns_suffix: olympus.110lymph.nl
      - kube_namespace: mission-control
      - kube_namespace: outline
      - kube_namespace: vaultwarden
      - host_ip:
          - 10.11.1.0/24  # all production hosts
          - 10.75.1.0/24  # K3s cluster network
      - hostname_suffix:
          - .110lymph.nl
      - label: env=prod

  staging:
    match:
      - kube_namespace: staging
      - hostname_suffix: staging.110lymph.nl
      - label: env=staging

  development:
    match:
      - hostname: hermes-vm.local
      - path_prefix: /home/*/dev
      - label: env=dev

  # Default: unknown environment → treat as production (safe default)
  default: production
```

### 7.2 Time Windows (`config/time-windows.yaml`)

```yaml
time_windows:
  business_hours:
    - timezone: Europe/Amsterdam
      schedule: "Mon-Fri 08:00-18:00"
      description: "Standard working hours — most changes allowed"

  maintenance_window:
    - timezone: Europe/Amsterdam
      schedule: "Sun 02:00-06:00"
      description: "Weekly maintenance — heavy operations allowed"
    - timezone: Europe/Amsterdam
      schedule: "Wed 03:00-04:00"
      description: "Database maintenance window"

  out_of_hours:
    - timezone: Europe/Amsterdam
      schedule: "Mon-Fri 18:00-08:00"
      description: "Evening/night — restricted changes only"
    - timezone: Europe/Amsterdam
      schedule: "Sat-Sun all day"
      description: "Weekend — restricted changes only"
```

### 7.3 Agent Trust Tiers (`config/agent-tiers.yaml`)

```yaml
agent_tiers:
  unrestricted:
    agents:
      - marcus
      - oly
    description: "Full access, all environments. Policy still applies but overrides are self-approved."

  operational:
    agents:
      - devops
      - devops-app
      - devops-api
      - devops-infra
      - operations-specialist
    description: "Full operational access. All production writes notify. Delete requires approval."

  observation:
    agents:
      - netwatch
      - hermes-sentinel
    description: "Read-only for data sources. Alert creation only. No infra modification."

  guided:
    agents:
      - vaultwarden
      - vaultwarden-alpine-lxc
    description: "Execution within known runbooks only. New actions require approval."

  restricted:
    agents:
      - sub-agent
    description: "Read-only + staging writes. No production, no delete, no infrastructure."
```

---

## 8. Build Phases

### Phase 1: Governance Framework + Pre-Flight (Us)

| Task | Owner | Est. Time | Verification |
|---|---|---|---|
| **Policy config templates** — `env-detection.yaml`, `time-windows.yaml`, `agent-tiers.yaml`, `governance-policies.yaml` — with our exact setup | Us | 30 min | Files exist, readable, valid YAML |
| **Impact inventory template** — standard format for blast radius assessment | Us | 15 min | Template saved |
| **Governance Dashboard** — basic view of audit log with filters (by agent, environment, decision) | Us (when dashboard is free) | 2-3h | /governance page showing recent actions |

### Phase 2: Pre-Flight Engine (Opus)

| Task | Description |
|---|---|
| **Situation Awareness Module** | Agent-level library that answers 5 questions before any action |
| **Policy Engine** | Evaluates context against governance-policies.yaml |
| **Policy Decision Logger** | Writes gov-* entries to immutable audit log |
| **Policy Hooks** | Integration into terminal(), write_file(), patch() tools — run pre-flight before execution |
| **Blast Radius Calculator** | Auto-derives blast radius from target metadata |

### Phase 3: Gates & Approvals (Opus)

| Task | Description |
|---|---|
| **Human Approval Gateway** | When policy says REQUIRE_HUMAN_APPROVAL: agent sends request, waits, resumes or aborts |
| **Telegram Approval Flow** | "DevOps wants to delete olympus-office pod. Approve? Y/N" — with auto-timeout |
| **Inventory Submission** | Agent auto-formats impact inventory, submits for approval |
| **Override System** | Human-override with expiry, logged permanently |

### Phase 4: Compliance Dashboard (Us)

| Task | Description |
|---|---|
| **Audit Log Viewer** | Searchable, filterable governance log in dashboard |
| **Monthly Compliance Report** | Auto-generated from audit data |
| **Customer Compliance View** | Per-customer: "here's every action taken on your system" |
| **Policy Hit Rate** | "Which policies fire most? Which agents hit blocks most?" — used to tune policy |

---

## 9. Decision Tree — Full Pre-Flight

```
Agent receives task
│
├─ Start pre-flight check
│  ├─ Derive environment (dns, namespace, host, label)
│  ├─ Derive time window (clock + schedule)
│  ├─ Derive blast radius (target metadata → scale 1-7)
│  ├─ Identify agent (self)
│  └─ Derive action type (read/write/modify/create/delete)
│
├─ Build context object → pass to Policy Engine
│
├─ Policy Engine evaluates rules in order (first match wins)
│  │
│  ├─ ALLOW → Execute action, log silently
│  │
│  ├─ ALLOW_WITH_NOTIFY → Execute action + send notification
│  │  └─ Agent proceeds. Notification sent async.
│  │
│  ├─ REQUIRE_HUMAN_APPROVAL → Send approval request, wait
│  │  ├─ Approved → Execute action, log decision
│  │  ├─ Denied → Cancel action, return to user
│  │  └─ Timeout (5 min) → Cancel action, escalate
│  │
│  ├─ REQUIRE_INVENTORY_AND_APPROVAL → Write impact inventory
│  │  ├─ Inventory submitted → Send for approval
│  │  │  ├─ Approved → Execute
│  │  │  └─ Denied → Cancel
│  │  └─ Inventory skipped → BLOCK
│  │
│  └─ BLOCK → Return policy violation to user
│     └─ User can request override (goes to Marcus/Oly)
│
├─ Action executes (or not)
│
├─ Log outcome (gov_id, decision, outcome, duration)
│
└─ If action changed infrastructure:
   └─ Write KB article (Cluster 2 Write Gate triggered)
```

---

## 10. How We Apply This to Ourselves

### 10.1 What Changes for Our Agents Starting Today

This is the hardest part — behaviour change. Here's the concrete shift:

| Before (Current Behaviour) | After (With Governance) |
|---|---|
| Ray says "fix office" → agent immediately starts coding | Agent runs pre-flight: "touching deployment pipeline, production env, business hours, blast radius 3" → proceeds with notify |
| Agent edits production config without noticing | Policy engine flags: "this is production. Notify #homelab." |
| Sub-agent deletes a pod trying to restart it | Policy BLOCKs: "sub-agents cannot delete. Delegate to specialist." |
| Agent works on a customer system without ticket reference | Policy blocks: "customer-facing change requires ticket reference." |
| Agent runs `curl | bash` intuition-based fix | Policy evaluates: "write to production outside hours" → BLOCK unless P1 |
| "I didn't know that change would affect X" | Impact inventory is mandatory for blast radius 5+ |
| Ray says "stop breaking things" retroactively | Every action has a pre-flight audit trail — we see what happened, why, which policy allowed it |

### 10.2 The "Head In, Start Coding" Fix

This is the specific behaviour Ray called out: agents go head-in without understanding the landscape. The fix is the **situation awareness module** — it's not a slowdown, it's a **zero-second context retrieval** that becomes habit:

```
BEFORE: "fix the office height" → edit main.js → build → deploy → breaks something else
AFTER:  "fix the office height" → [pre-flight: production, business hours, blast radius 3, write]
        → [policy: ALLOW_WITH_NOTIFY] → edit main.js → [knowledge gate: update KB article?]
        → build → deploy → verify → [post-flight: log outcome, write KB if non-trivial]
```

The agent doesn't ask permission. It doesn't slow down. It just **knows** what it's touching and the system knows it knows.

---

## 11. Summary: What We Build vs What Opus Builds

| Deliverable | Who | When | Notes |
|---|---|---|---|
| Policy config templates (4 YAML files) | **Us** | Phase 1 | env-detection, time-windows, agent-tiers, governance-policies |
| Impact inventory template | **Us** | Phase 1 | Standard format |
| Governance Dashboard | **Us** | Phase 1 (when free) | Audit log viewer in vf-dashboard |
| Situation Awareness Module | **Opus** | Phase 2 | 5-question context extraction |
| Policy Engine | **Opus** | Phase 2 | Rule evaluation engine |
| Policy Decision Logger | **Opus** | Phase 2 | Immutable audit log |
| Policy Hooks (tool integration) | **Opus** | Phase 2 | Pre-flight before terminal/write_file/patch |
| Blast Radius Calculator | **Opus** | Phase 2 | Auto-derive from target metadata |
| Human Approval Gateway | **Opus** | Phase 3 | Approve/deny flow via Telegram |
| Inventory Submission Flow | **Opus** | Phase 3 | Auto-formatter + submission |
| Override System | **Opus** | Phase 3 | Expiring human override |
| Compliance Dashboard | **Us** | Phase 4 | Monthly reports, customer views |
