# 110lymph Autonomous Operations Framework — Cluster 4
## Predictive Planning → Elastic Scalability → Agent Workforce Management

> **Version:** v6 · **Status:** Architecture Draft · **Scope:** Cluster 4 of 5
>
> *This document defines how the agent fleet scales — not just up, but intelligently. When load spikes, when an agent gets overloaded, when a pipeline queues 20 jobs at once, the system should respond by spawning capacity, not by letting work pile up. The opposite is also true: when load drops, idle agents should yield resources. This is the elasticity layer — predictive, not reactive; automated, not manual.*

---

## 1. Executive Summary

Cluster 4 solves a fundamental scaling problem: **agents are finite, work is not.** A single NetWatch instance can monitor thresholds. Two can watch in shifts and cross-validate. But how do you know when to spawn the second one? And how do you know before the first one drops alerts?

The answer is a **predictive capacity layer** that monitors agent load, forecasts demand, and provisions or deprovisions agent instances before the user feels a delay.

**The three-layer model:**

```
1. TELEMETRY & LOAD MONITORING → "How busy is each agent? What's queued?"
2. PREDICTIVE FORECASTING    → "Are we about to hit a wall? When?"
3. ELASTIC WORKFORCE MGMT    → "Spawn. Absorb. Reclaim. Repeat."
```

**Design principles:**
- **Elastic, not fixed** — agent count is driven by demand, not by config. No hardcoded "we have 3 DevOps agents."
- **Predictive, not reactive** — scale before the bottleneck, not after. Queue depth trends, time-of-day patterns, pipeline bursts.
- **Sub-agents for spikes, persistent agents for sustained load** — short bursts use ephemeral sub-agents. Sustained patterns promote to persistent daemons.
- **No agent left drowning** — every agent has a backpressure signal. If it can't keep up, the system knows before the user does.
- **Shrink fast** — idle agents cost tokens. Reclaim aggressively when load drops.
- **Customer-presentable** — "here's our scalability SLA. Here's how we prove it. Here's the point at which we add a node."

---

## 2. Architecture Overview

### 2.1 The Agent Telemetry Bus — Know the Load

Every agent emits a heartbeat with load metrics:

```json
{
  "agent_id": "netwatch-01",
  "group": "Operations",
  "status": "online",
  "metrics": {
    "queue_depth": 3,
    "tasks_completed_1h": 47,
    "avg_response_time_ms": 1200,
    "p95_response_time_ms": 3400,
    "max_concurrent_tasks": 1,
    "cpu_load": 0.45,
    "memory_pct": 62,
    "uptime_seconds": 86400,
    "last_task_enqueued": "2026-06-17T18:00:00Z",
    "last_task_completed": "2026-06-17T17:59:58Z"
  }
}
```

**Telemetry sources:**

| Source | Data | Frequency |
|--------|------|-----------|
| Gateway heartbeat | Status, basic load | Every 60s |
| Task queue (Hermes) | Queue depth, wait times | Every 30s |
| Agent response time | P50/P95/P99 from completed tasks | Per-task |
| System metrics (VM/node) | CPU, memory, connection count | Every 60s |
| Pipeline queue (GitHub) | Pending runs, queued jobs | On change |
| Cron job backlog | Pending vs completed cron ticks | Every 120s |

**Storage:** Time-series in Prometheus (retention: 30d for raw, 1y for aggregated). Queried by the capacity planner.

### 2.2 Decision Tree — When to Scale

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CAPACITY EVALUATION                                  │
│                    (runs every 5 minutes per agent group)                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
              ┌─────────────────────────────────────────────┐
              │ 1. GATHER SIGNALS                            │
              │    · Current queue depth per agent           │
              │    · Queue depth trend (Δ over 15 min)       │
              │    · Avg response time trend                 │
              │    · Pipeline queued count                   │
              │    · Backlog of scheduled cron tasks         │
              │    · Time-of-day profile                     │
              └─────────────────────────────────────────────┘
                                    │
                                    ▼
              ┌─────────────────────────────────────────────┐
              │ 2. CHECK THRESHOLDS                          │
              │                                              │
              │    ANY true?                                 │
              │                                              │
              │    A) Queue depth > 5 for 3 consecutive polls│
              │    B) Queue depth Δ > +2/15min (growing fast)│
              │    C) P95 response > 5s for 3+ polls         │
              │    D) Pipelines queued > 3 (burst incoming)  │
              │    E) Cron backlog > 10 pending ticks        │
              │    F) Time-of-day in known peak window       │
              └─────────────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
          ╔══════════════════╗              No action needed
          ║  TRIGGER SCALE   ║              (re-check in 5 min)
          ╚══════════════════╝
                  │
                  ▼
   ┌────────────────────────────────────────────────────────────┐
   │ 3. CLASSIFY THE DEMAND                                     │
   │                                                           │
   │   Is the load pattern:                                    │
   │                                                           │
   │   SPORADIC — burst of tasks, no sustained trend           │
   │   → spawn SUB-AGENTS (ephemeral, TTL=30min)               │
   │                                                           │
   │   SUSTAINED — queue growing for 30+ min, peaks recurring  │
   │   → promote to PERSISTENT AGENT (dedicated daemon)        │
   │                                                           │
   │   PREDICTED — known peak window approaching                │
   │   → PRE-SCALE proactively before the spike                 │
   └────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
   ┌────────────────────────────────────────────────────────────┐
   │ 4. EXECUTE SCALE DECISION                                  │
   │                                                           │
   │   SUB-AGENT:                                              │
   │   · Delegate_task with TTL=30m                            │
   │   · No persistent identity, no heartbeat                  │
   │   · Results fold back into parent                         │
   │   · Auto-reclaimed after TTL or inactivity                │
   │                                                           │
   │   PERSISTENT AGENT:                                       │
   │   · New container/deployment in agent namespace           │
   │   · Gets own agent_id, heartbeat slot, cron slot          │
   │   · Registered in Gateway roster (dynamic)                │
   │   · Name convention: <role>-<seq> (netwatch-02)           │
   │   · Live until scaled down                                │
   │                                                           │
   │   PRE-SCALE:                                              │
   │   · Spawn persistent agent(s) before peak hits            │
   │   · Based on learned time-of-day patterns                 │
   └────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
   ┌────────────────────────────────────────────────────────────┐
   │ 5. VERIFY + LOG                                            │
   │   · Confirm new agent is healthy (heartbeat received)      │
   │   · Log scale event to audit trail: "scaled netwatch→02   │
   │     at 2026-06-17T08:00:00Z, reason: queue_depth=7"       │
   │   · Update capacity dashboard                              │
   └────────────────────────────────────────────────────────────┘
```

### 2.3 The Scale-Down Decision — Shrink Fast

```
┌─────────────────────────────────────────────────────────────────┐
│                  SCALE-DOWN EVALUATION                           │
│                  (runs every 15 minutes for scaled-up agents)    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
         ┌─────────────────────────────────────────────┐
         │ Check: has ALL load signals cleared for     │
         │ 30+ minutes AND no peak window within next  │
         │ 60 minutes?                                 │
         └─────────────────────────────────────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
      ╔══════════════════╗              Keep running
      ║  TRIGGER SCALE   ║              (re-check in 15 min)
      ║  DOWN            ║
      ╚══════════════════╝
              │
              ▼
   ┌─────────────────────────────────────────────────┐
   │ Graceful agent retirement:                      │
   │ 1. Mark agent as "draining" — no new tasks      │
   │ 2. Wait for current tasks to complete (max 5m)  │
   │ 3. Deregister from Gateway roster               │
   │ 4. Archive last N heartbeats for audit          │
   │ 5. Terminate container/deployment               │
   │ 6. Log: "scaled down netwatch-02, reason:       │
   │    queue_depth=0 for 45min"                     │
   └─────────────────────────────────────────────────┘
```

---

## 3. Agent Types & Scaling Profiles

Not all agents scale the same. Some are singleton by design (Command agents). Others can have dozens of instances.

| Agent Role | Group | Scaling Model | Max Instances | Notes |
|------------|-------|---------------|---------------|-------|
| marcus | Command | Fixed (singleton) | 1 | CEO — no parallelism |
| oly | Command | Fixed (singleton) | 1 | COO — dispatch authority |
| sentinel | Command | Fixed (singleton) | 1 | Security — ordering constraint |
| devops | DevOps | Sub-agent burst | 3 | Burst for parallel CI/CD |
| devops-api | DevOps | Sub-agent burst | 3 | Per-endpoint isolation |
| devops-app | DevOps | Sub-agent burst | 3 | Per-deployment isolation |
| devops-infra | DevOps | Sub-agent burst | 3 | Per-cluster isolation |
| netwatch | Operations | Persistent elastic | 5 | Dual-instance by default, scale on load |
| storekeeper | Operations | Persistent elastic | 3 | One per storage pool |
| proxguard | Operations | Ephemeral | 2 | Runs on scan trigger, not persistent |
| finwise | Operations | Scheduled only | 1 | Batch window — no real-time need |
| homeassistant | Operations | Fixed (singleton) | 1 | Single home, single instance |
| k8slearn | Operations | On-demand | 1 | Learning tool, not production-critical |
| deploybot | Operations | Fixed (singleton legacy) | 1 | Being phased into devops group |

**Key insight from our current state:** Right now netwatch, storekeeper, finwise, k8slearn, and homeassistant are all offline and haven't been seen since June 5-9. A capacity planner would flag: "netwatch-01 offline for 8+ days → critical gap in Operations group. Recommended: spawn netwatch-02."

---

## 4. Time-of-Day Profile — Known Peak Windows

Capacity planning is not just reactive — it's learned. The system builds time-of-day profiles from historical agent load:

```
Weekday patterns (observed from homelab):
  07:00-09:00  — Low load (overnight batch jobs finishing)
  09:00-11:00  — Rising (workday begins, deployments start)
  11:00-14:00  — Peak (CI/CD pipeline runs, agent activity high)
  14:00-17:00  — Moderate (review, monitoring, maintenance)
  17:00-20:00  — Falling (end of workday, long-running tasks)
  20:00-07:00  — Low (overnight, batch backups, updates)

Weekend patterns:
  Saturday      — Moderate (maintenance windows, experiments)
  Sunday        — Low (standing monitoring only)
```

**Pre-scaling rule:** If the time-of-day profile predicts load > 70% of capacity within the next 30 minutes, spawn capacity proactively.

---

## 5. Pipeline Burst Handling

GitHub Actions pipelines are a classic burst-load pattern — 10 commits pushed at once can queue 10 pipelines, all trying to build and deploy simultaneously.

**Pipeline burst flow:**

```
1. Detect: 3+ pipelines in "queued" state (GitHub API poll)
2. Assess: How many build agents are available?
3. Burst scale: 
   · If 0 build slots free → spawn sub-agent devops-02 (build watcher)
   · If queue grows to 6+ → spawn devops-03 (parallel deploy)
4. Each pipeline gets its own sub-agent context
5. After queue drain: verify all pipelines completed
6. Scale down: retire build sub-agents after 15min idle
```

---

## 6. Predictive Forecasting Model

The capacity planner uses a lightweight predictive model:

**Input signals (weighted):**
- Queue depth trend (30% weight) — "is work piling up?"
- Time-of-day profile (25% weight) — "is peak time approaching?"
- Pipeline queue (20% weight) — "are builds about to flood?"
- Response time trend (15% weight) — "are agents slowing down?"
- Cron backlog (10% weight) — "are scheduled tasks falling behind?"

**Output decisions:**
- `scale_up(agent_role, count=1, reason="<signal>")`
- `scale_down(agent_role, reason="<signal>")`
- `pre_scale(agent_role, count=N, window="<TOD_profile>")`
- `no_action(reason="all clear")`

**Cool-down:** After any scale action, wait 10 minutes before re-evaluating the same agent group. Prevents oscillation.

---

## 7. Implementation Phases

### Phase 1 — Telemetry Foundation (Current gap assessment)

**Right now:** The Gateway heartbeat system already carries basic status (online/offline/idle) but no load metrics. Agents emit no queue depth, response time, or task count.

**To build:**
1. Add load metrics to heartbeat payload (queue_depth, tasks_completed_1h, avg_response_time)
2. Store heartbeats in Prometheus time-series (currently only status in JSON)
3. Build a capacity dashboard in Grafana showing agent load per group
4. Alert on: any agent with queue_depth > 5 for 10+ minutes

**Effort:** Low-medium. The heartbeat channel exists — we're adding fields.

### Phase 2 — Sub-Agent Elasticity

**To build:**
1. Capacity evaluator script (runs every 5 min via cron)
2. Sub-agent spawner — delegate_task with TTL for burst handling
3. Queue drain detection — when does the burst end?
4. Scale-down timer — auto-reclaim sub-agents after TTL

**Effort:** Medium. The delegate_task infrastructure exists in Hermes — we're adding an orchestrator.

### Phase 3 — Persistent Agent Elasticity

**To build:**
1. Dynamic agent registration — new persistent agents auto-register in Gateway roster
2. Container lifecycle — spawn/kill deployments in agents namespace
3. Scale-up approval gate — for production, require human approval before adding persistent agents
4. Scale-down safety — draining, handoff, no dropped tasks

**Effort:** High. Requires container orchestration integration and Gateway roster modification.

### Phase 4 — Predictive Pre-Scaling

**To build:**
1. Time-of-day profile learner — accumulates load patterns over 2+ weeks
2. Pre-scale trigger — "predicted load spike in 30min, spawning capacity now"
3. Retroactive tuning — adjust prediction model based on actual vs forecast

**Effort:** Medium-high. Requires historical data accumulation.

---

## 8. Agent Workforce — The "2x Pattern"

The pattern you described — "we have two NetWatches, two StoreKeepers" — is the core elastic workforce strategy:

**Dual-instance (default for critical roles):**
- netwatch-01 + netwatch-02
- storekeeper-01 + storekeeper-02
- proxguard-01 + proxguard-02 (ephemeral)

**Benefits:**
- **Redundancy** — one can be offline, the other still covers
- **Shift work** — instance A handles 00:00-12:00, B handles 12:00-00:00 (or overlap for high-load periods)
- **Cross-validation** — two instances can compare results, reduce false positives
- **Smooth handoff** — when one goes down, the other is already warm

**Instance naming convention:**
```
<role>-<seq>     → netwatch-01, netwatch-02
<role>-<seq>     → storekeeper-01, storekeeper-02
<role>-<seq>     → proxguard-01 (ephemeral, released after scan)
```

**Registration:** All instances register in the Gateway roster via a dynamic slot. The roster knows: "Operations group has 2 netwatch slots, 2 storekeeper slots, 1 proxguard slot."

---

## 9. Customer Adaptation Guide

> *This section explains how a customer adapts Cluster 4 to their own fleet.*

**Per-customer scaling profile (config-driven, not code):**

```yaml
# config/customer-<name>/capacity.yaml
capacity:
  agent_groups:
    operations:
      scaling_model: persistent_elastic
      min_instances: 2
      max_instances: 10
      scale_up_threshold:
        queue_depth: 5
        duration_minutes: 3
      scale_down_idle_minutes: 30
      pre_scale_windows:
        - days: "weekday"
          start: "08:30"
          end: "10:00"
          instances: 4
        - days: "weekday"
          start: "14:00"
          end: "16:00"
          instances: 3
    devops:
      scaling_model: subagent_burst
      max_concurrent: 5
      subagent_ttl_minutes: 30
```

**Customer choices:**
- How many minimum instances per role?
- What threshold triggers a scale-up?
- How long before scaling down?
- Which roles are critical enough for dual-instance?
- What are the known peak windows?

---

## 10. Current Fleet Assessment (June 2026)

Applying this framework to the current homelab:

| Agent | Status | Current | Desired | Gap |
|-------|--------|---------|---------|-----|
| netwatch | offline since Jun 9 | 0 online | 2 persistent | CRITICAL — no coverage |
| storekeeper | offline since Jun 6 | 0 online | 2 persistent | CRITICAL — no storage alerts |
| finwise | offline since Jun 9 | 0 online | 1 scheduled | Degraded — batch analysis unavailable |
| k8slearn | offline since Jun 6 | 0 online | 1 on-demand | Non-critical |
| homeassistant | offline since Jun 5 | 0 online | 1 singleton | Non-critical (separate home infra) |
| devops (all 4) | online | 4 online | Up to 6 via burst | Healthy — burst capacity available |
| sentinel | online | 1 online | 1 singleton | Healthy |
| oly | idle | 1 idle | 1 singleton | Acceptable — on-demand dispatch |
| marcus | offline (session) | 0 persistent | 1 singleton | Acceptable — session-based |

**Immediate recommendation:** Before building the full predictive capacity system, the first fix is to **bring netwatch-01 back online** (or spawn netwatch-02 as a replacement). 8+ days without network monitoring is a blind spot.

---

## 11. Key Metrics & Success Criteria

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Agent queue depth | Unknown | < 3 sustained | Prometheus metric per agent |
| Scale-up trigger latency | N/A | < 5 min from threshold to spawn | Audit log timestamps |
| Scale-down latency | N/A | < 15 min from idle to reclaim | Audit log timestamps |
| Pre-scale accuracy | N/A | > 80% of predicted spikes materialize | Forecast vs actual |
| False scale-up rate | N/A | < 10% of scale events are unnecessary | Audit log review |
| Agent offline detection | Manual | < 2 min (heartbeat miss) | Gateway alert |
| Critical agent coverage | 0% (netwatch down) | 100% (2+ instances per critical role) | Heartbeat roster |

---

## 12. Open Questions

1. **How does the Gateway roster support dynamic agent registration?** Current roster is static config. Need to assess if Gateway supports POST/register or if we need a sidecar.
2. **Container lifecycle for persistent agents** — do we deploy in the K3s `agents` namespace with a controller, or does Hermes manage it directly?
3. **Token cost of idle agents** — how much does a standing-by agent cost per hour? Need to model the trade-off. An idle agent that polls every 60s may cost more than a sub-agent spawned on demand.
4. **Scale-down safety** — if agent A is mid-task when scale-down triggers, do we wait for completion or hard-kill? Current design: wait with timeout.
5. **What happens when all scaled-up agents are busy and more work arrives?** Backpressure — queue the work and report "estimated wait: X minutes" instead of silently adding more agents beyond max_instances.

---

> **Next:** Cluster 5 — Security & Resilience (ISO 27001, NIST, maritime compliance, flexible jurisdictional standards)
