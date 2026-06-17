# Policy API — Runtime Enforcement Interface
## Design Document for Agent Pre-Flight Policy Checks

> **Status:** Architecture Draft · **Scope:** Agent-side implementation of Cluster 3 Governance
>
> *This document defines the Policy API — a lightweight HTTP service that agents call BEFORE every action to determine whether the action is allowed, requires approval, or is blocked. It is the runtime enforcement layer that turns the governance policy config (Cluster 3) into a hard, non-bypassable check.*
>
> *The Policy API is NOT an agent advice system. It is a gate. If an agent doesn't call it, the gate is considered closed and the action must not proceed.*

---

## 1. Why This Exists

Cluster 3 defines governance policies as YAML config files. That's the **what** — what we say agents should do. The Policy API is the **how** — a running service that agents call to get a concrete, machine-readable decision.

**Without the Policy API:**
- Agents rely on their system prompt to "remember" policy
- Policy changes require restarting every agent's session
- No hard gate exists — a rogue or confused agent can bypass policy
- No central audit trail of policy decisions

**With the Policy API:**
- Agents call `/api/policy/check` before every action
- Policy changes are live within seconds (hot-reload from config)
- The API IS the gate — if it says BLOCK, the action doesn't happen
- Every decision is logged centrally before the action executes

---

## 2. API Specification

### 2.1 Base URL

```
http://policy-api.mission-control.svc.cluster.local:8080
```

### 2.2 Endpoints

#### `POST /api/policy/check` — Check if an action is allowed

**Purpose:** The primary endpoint. Every agent calls this before every action.

**Request:**

```json
{
  "agent": "devops",
  "action_type": "write",
  "target": "olympus-office",
  "environment": "production",
  "namespace": "mission-control",
  "host": "k3s-srv-01",
  "url": "https://olympus.110lymph.nl",
  "dns_suffix": "olympus.110lymph.nl",
  "action_description": "kubectl set image deployment/olympus-office vf-office:20260617-seatoffset-0.18",
  "parent_request": "ray: fix the office seat height",
  "is_incident": false,
  "customer_name": null,
  "timestamp": "2026-06-17T14:32:00+02:00"
}
```

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `agent` | ✅ | Agent identity (matches agent-tiers.yaml) | `"devops"` |
| `action_type` | ✅ | One of: `read`, `write`, `modify`, `create`, `delete` | `"write"` |
| `target` | ✅ | What is being acted upon | `"olympus-office"` |
| `environment` | ✅ | Inferred from target (production/staging/monitoring/knowledge/dev) | `"production"` |
| `namespace` | ✅ | Kubernetes namespace if applicable, else `null` | `"mission-control"` |
| `host` | ✅ | Target hostname or IP | `"k3s-srv-01"` |
| `url` | Optional | Full URL if web action | `"https://olympus.110lymph.nl"` |
| `dns_suffix` | Optional | DNS suffix for environment detection | `"olympus.110lymph.nl"` |
| `action_description` | ✅ | Human-readable what are you doing | `"kubectl set image..."` |
| `parent_request` | Optional | The original user ask that triggered this | `"ray: fix the office seat height"` |
| `is_incident` | Optional | Is this part of an active P1/P2 incident? | `false` |
| `customer_name` | Optional | Which customer is affected | `null` or `"maersk"` |
| `timestamp` | ✅ | Current timestamp in RFC 3339 | `"2026-06-17T14:32:00+02:00"` |

**Response:**

```json
{
  "request_id": "pol-20260617-0042",
  "timestamp": "2026-06-17T14:32:00+02:00",
  "decision": "ALLOW_WITH_NOTIFY",
  "matched_rule": "prod-write-business-hours",
  "matched_rule_description": "Production writes during business hours are allowed with notification",
  "notify": true,
  "notify_target": ["telegram:#homelab"],
  "reason": "Production write during business hours — proceeding with notification.",
  "block_message": null,
  "override_available": false
}
```

| Field | Description |
|-------|-------------|
| `request_id` | Unique ID for this policy decision (used in audit log) |
| `decision` | One of: `ALLOW`, `ALLOW_WITH_NOTIFY`, `ALLOW_WITH_LOG`, `REQUIRE_HUMAN_APPROVAL`, `REQUIRE_INVENTORY_AND_APPROVAL`, `BLOCK` |
| `matched_rule` | Which policy rule fired |
| `matched_rule_description` | Human-readable description of the rule |
| `notify` | Whether notification should be sent |
| `notify_target` | Where to notify (array of platform:target strings) |
| `reason` | Human-readable reason for the decision |
| `block_message` | If BLOCKed, the message shown to the agent/user |
| `override_available` | Whether a human override exists for this policy |

**Possible decisions:**

| Decision | Meaning | Agent Behaviour |
|----------|---------|-----------------|
| `ALLOW` | Proceed immediately | No extra action needed |
| `ALLOW_WITH_NOTIFY` | Proceed, notification sent async | Agent proceeds. Notification handled by Policy API. |
| `ALLOW_WITH_LOG` | Proceed, logged silently | Agent proceeds. |
| `REQUIRE_HUMAN_APPROVAL` | Blocked until approved | Agent sends request through approval gateway, waits for response (see 3.1) |
| `REQUIRE_INVENTORY_AND_APPROVAL` | Blocked until inventory + approval | Agent writes impact inventory, submits for approval (see 3.2) |
| `BLOCK` | Denied entirely | Agent returns policy violation to user |

#### `POST /api/policy/report-outcome` — Report action outcome

**Purpose:** After an action completes (or fails), agents report the outcome. This closes the audit loop.

**Request:**

```json
{
  "request_id": "pol-20260617-0042",
  "outcome": "succeeded",
  "execution_time_ms": 3400,
  "rollback_needed": false,
  "error_message": null
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `request_id` | ✅ | From the `/api/policy/check` response |
| `outcome` | ✅ | `succeeded`, `failed`, `rolled_back`, `cancelled` |
| `execution_time_ms` | ✅ | How long the action took |
| `rollback_needed` | ✅ | Was a rollback required? |
| `error_message` | Optional | If `failed` or `rolled_back`, why |

#### `GET /api/policy/health` — Health check

**Purpose:** For the pre-flight gate to verify the Policy API is running before relying on it.

**Response:**

```json
{
  "status": "ok",
  "policies_loaded": 24,
  "last_config_change": "2026-06-17T14:30:00+02:00",
  "uptime_seconds": 86400
}
```

---

## 3. Agent Integration — How Agents Call the Policy API

### 3.1 The Pre-Flight Tool

Every agent has a built-in tool called `pre_flight_check` that:

1. Collects context from the current action (agent identity, target, environment, etc.)
2. Calls `POST /api/policy/check` with this context
3. If response is `ALLOW`/`ALLOW_WITH_NOTIFY`/`ALLOW_WITH_LOG` → proceeds
4. If `REQUIRE_HUMAN_APPROVAL` → sends approval request via Telegram, waits for response:
   - Approved → proceeds
   - Denied → cancels action, reports back
   - Timeout (5 min) → cancels, escalates to Oly
5. If `REQUIRE_INVENTORY_AND_APPROVAL` → agent auto-generates impact inventory, submits for approval
6. If `BLOCK` → cancels action, returns block message to user
7. After action completes → calls `POST /api/policy/report-outcome`

### 3.2 When to Call Pre-Flight

| Action Type | Pre-Flight Required? |
|-------------|---------------------|
| Reading a config file | ✅ Yes (fast — ALLOW in < 10ms) |
| Querying /api/ status | ✅ Yes (fast — ALLOW in < 10ms) |
| Editing a production config | ✅ Yes |
| Running kubectl apply | ✅ Yes |
| Creating a file | ✅ Yes |
| Deleting a resource | ✅ Yes |
| Running a script | ✅ Yes |
| Sending a test curl | ✅ Yes (sandboxed) |
| Responding to user in chat | ❌ No (conversation only) |
| Reading memory/session | ❌ No (agent's own state) |

> **Design principle:** The pre-flight check must return in < 50ms for ALLOW decisions. If it takes longer, agents will feel the delay. Implement as a simple rule evaluation — no DB queries needed for the common path.

### 3.3 The "No Gate = Blocked" Default

If the Policy API is unreachable, the agent MUST NOT proceed:

```
Attempt /api/policy/check
├─ Response received → Evaluate decision
├─ Timeout (2 seconds) → Retry once
│   ├─ Response received → Evaluate decision
│   └─ Timeout again → BLOCK: "Policy API unreachable, action denied"
└─ Connection refused → BLOCK: "Policy API unavailable, action denied"
```

The only exception is if the agent is explicitly operating in **offline/disaster recovery mode**, which must be approved by Marcus and logged as a permanent override.

---

## 4. Policy Engine Implementation (Opus Build)

### 4.1 Internal Architecture

```
┌─────────────────────────────────────────────┐
│              Policy API Server                │
│                                              │
│  POST /api/policy/check                      │
│        │                                     │
│        ▼                                     │
│  ┌──────────────────────────────────────┐    │
│  │  Step 1: Derive Environment          │    │
│  │  If environment not provided, derive │    │
│  │  from dns_suffix, host, namespace    │    │
│  └────────────┬─────────────────────────┘    │
│               │                               │
│               ▼                               │
│  ┌──────────────────────────────────────┐    │
│  │  Step 2: Derive Time Window          │    │
│  │  From clock + time-windows.yaml      │    │
│  └────────────┬─────────────────────────┘    │
│               │                               │
│               ▼                               │
│  ┌──────────────────────────────────────┐    │
│  │  Step 3: Derive Blast Radius         │    │
│  │  From target + namespace metadata    │    │
│  └────────────┬─────────────────────────┘    │
│               │                               │
│               ▼                               │
│  ┌──────────────────────────────────────┐    │
│  │  Step 4: Derive Agent Identity       │    │
│  │  From agent name → trust tier        │    │
│  └────────────┬─────────────────────────┘    │
│               │                               │
│               ▼                               │
│  ┌──────────────────────────────────────┐    │
│  │  Step 5: Evaluate Policy Rules       │    │
│  │  Ordered evaluation, first match     │    │
│  └────────────┬─────────────────────────┘    │
│               │                               │
│               ▼                               │
│  ┌──────────────────────────────────────┐    │
│  │  Step 6: Log Decision                │    │
│  │  Append to governance log            │    │
│  └────────────┬─────────────────────────┘    │
│               │                               │
│               ▼                               │
│  Return decision to agent                     │
└─────────────────────────────────────────────┘
```

### 4.2 Environment Derivation Logic

When the agent does not provide `environment`, the Policy API derives it:

```python
# Simplified logic
def derive_environment(request):
    # 1. Check DNS suffix
    for env, rules in env_detection.items():
        for rule in rules.match:
            if rule.dns_suffix and request.dns_suffix == rule.dns_suffix:
                return env
            if rule.kube_namespace and request.namespace == rule.kube_namespace:
                return env
            if rule.host_ip and ip_in_cidr(request.host, rule.host_ip):
                return env
            if rule.hostname_suffix and request.host.endswith(rule.hostname_suffix):
                return env
    # 2. Default
    return env_detection.default  # "production" — safe default
```

### 4.3 Blast Radius Derivation Logic

```python
def derive_blast_radius(target, namespace, action_type):
    """
    1 = self-only (reading own config)
    2 = single pod (restarting one container)
    3 = single service (updating IngressRoute, Deployment)
    4 = namespace-wide (affecting all services in namespace)
    5 = cluster-wide (ClusterRole, StorageClass)
    6 = infrastructure (firewall, VLAN, DNS)
    7 = multi-customer (change affecting all tenants)
    """
    if action_type == "read":
        return 1
    if action_type == "delete":
        # Deletes always have wider blast radius
        return max(3, derived_from_metadata(target))
    # Otherwise derive from target metadata
    return derived_from_metadata(target)
```

### 4.4 Rule Evaluation Engine

```python
def evaluate(request, context):
    """
    Context = derived environment + time_window + blast_radius + agent_tier
    Rules evaluated in order. First match wins.
    """
    for rule in governance_policies["rules"]:
        if matches(rule.match, request, context):
            return PolicyDecision(
                decision=rule.decision,
                matched_rule=rule.id,
                description=rule.description,
                notify=rule.get("notify", false),
                notify_target=rule.get("notify_target", []),
                block_message=rule.get("block_message"),
                override_available=has_override_for(rule.id)
            )
    # No match → default rule
    return PolicyDecision(
        decision=governance_policies["default"]["action"],
        matched_rule="default",
        description="Default policy — no specific rule matched"
    )
```

---

## 5. Deployment

### 5.1 K3s Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: policy-api
  namespace: mission-control
spec:
  replicas: 2
  selector:
    matchLabels:
      app: policy-api
  template:
    metadata:
      labels:
        app: policy-api
    spec:
      containers:
      - name: policy-api
        image: 10.75.1.211:30500/policy-api:latest
        ports:
        - containerPort: 8080
        env:
        - name: POLICIES_PATH
          value: /etc/policy/governance-policies.yaml
        - name: ENV_DETECTION_PATH
          value: /etc/policy/env-detection.yaml
        - name: TIME_WINDOWS_PATH
          value: /etc/policy/time-windows.yaml
        - name: AGENT_TIERS_PATH
          value: /etc/policy/agent-tiers.yaml
        - name: LOG_DIR
          value: /var/log/governance
        - name: LOG_RETENTION_DAYS
          value: "365"
        volumeMounts:
        - name: gov-log
          mountPath: /var/log/governance
        - name: policy-config
          mountPath: /etc/policy
      volumes:
      - name: gov-log
        persistentVolumeClaim:
          claimName: governance-log
      - name: policy-config
        configMap:
          name: policy-configs
---
apiVersion: v1
kind: Service
metadata:
  name: policy-api
  namespace: mission-control
spec:
  ports:
  - port: 8080
    targetPort: 8080
  selector:
    app: policy-api
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: governance-log
  namespace: mission-control
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: policy-configs
  namespace: mission-control
data:
  governance-policies.yaml: |
    # Populated from config/governance-policies.yaml
  env-detection.yaml: |
    # Populated from config/env-detection.yaml
  time-windows.yaml: |
    # Populated from config/time-windows.yaml
  agent-tiers.yaml: |
    # Populated from config/agent-tiers.yaml
```

### 5.2 Health Check / Readiness

```yaml
readinessProbe:
  httpGet:
    path: /api/policy/health
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
livenessProbe:
  httpGet:
    path: /api/policy/health
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 30
```

---

## 6. Integration With Cluster 3 Config

The Policy API reads the exact same YAML config files defined in Cluster 3:

| Cluster 3 Config File | Policy API Usage | Hot-Reloadable |
|-----------------------|-----------------|----------------|
| `config/governance-policies.yaml` | Rule evaluation engine | ✅ Yes (file watcher) |
| `config/env-detection.yaml` | Environment derivation (Step 1) | ✅ Yes |
| `config/time-windows.yaml` | Time window derivation (Step 2) | ✅ Yes |
| `config/agent-tiers.yaml` | Agent trust tier lookup (Step 4) | ✅ Yes |

When any of these files change, the Policy API reloads within 5 seconds. No restart needed. The audit log records a "policy config changed" event with the old config hash → new config hash.

---

## 7. Audit Log Integration

Every `/api/policy/check` call produces a governance log entry **before the action executes**. The log entry follows the Cluster 3 schema:

```json
{
  "gov_id": "pol-20260617-0042",
  "timestamp": "2026-06-17T14:32:00+02:00",
  "agent": "devops",
  "parent_request": "ray: fix the office seat height",
  "action_description": "kubectl set image deployment/olympus-office vf-office:20260617-seatoffset-0.18",
  "context": {
    "action_type": "write",
    "environment": "production",
    "namespace": "mission-control",
    "target": "olympus-office",
    "host": "k3s-srv-01",
    "blast_radius": 3,
    "time_window": "business_hours",
    "is_incident": false,
    "customer_name": null
  },
  "matched_rule": "prod-write-business-hours",
  "decision": "ALLOW_WITH_NOTIFY",
  "notified": ["telegram:#homelab"],
  "outcome": null,
  "execution_time_ms": null,
  "rollback_needed": null
}
```

After the agent reports the outcome via `POST /api/policy/report-outcome`, the log entry is updated with:

```json
{
  ...
  "outcome": "succeeded",
  "execution_time_ms": 3400,
  "rollback_needed": false
}
```

---

## 8. Build Phases

### Phase 1: Policy API Core (Opus)

| Task | Description | Est. |
|------|-------------|------|
| **Policy API Server** — Express/Fastify HTTP server with three endpoints | Build the service | 4h |
| **Rule Evaluation Engine** — Read governance-policies.yaml, evaluate context → decision | Core logic | 3h |
| **Environment Derivation** — DNS/namespace/host/IP → environment | From env-detection.yaml | 1h |
| **Time Window Derivation** — Clock + schedule → business_hours/out_of_hours/maintenance | From time-windows.yaml | 30m |
| **Blast Radius Derivation** — Target metadata → scale 1-7 | Heuristic | 1h |
| **Governance Logger** — Append log entry before returning decision | Immutable JSONL | 1h |
| **Outcome Reporter** — Handle POST /api/policy/report-outcome, update log entry | Audit closure | 1h |
| **Hot-Reload Watcher** — File watcher for config YAMLs, reload on change | No-downtime updates | 1h |

### Phase 2: Agent Integration (Opus)

| Task | Description | Est. |
|------|-------------|------|
| **Pre-Flight Tool** — Hermes tool implementation that calls Policy API | Agent-side | 3h |
| **Approval Gateway** — Telegram integration: "Agent X wants to Y. Approve? [Yes/No]" | Human-in-loop | 3h |
| **Impact Inventory Formatter** — Auto-generates inventory for blast radius >= 5 | Pre-filled template | 1h |
| **Offline Mode** — Disaster recovery path with explicit override | Fallback | 1h |
| **Health Integration** — Pod health checks, readiness probes | K8s manifest | 30m |

### Phase 3: Policy Config (Us)

| Task | Description | Est. |
|------|-------------|------|
| **Cluster 3 Policy Config Files** — Write our exact policies as YAML | Already designed | 30m |
| **Env Detection Rules** — 110lymph exact DNS/namespace/host patterns | Already designed | 15m |
| **Time Windows** — Our CEST schedule | Already designed | 10m |
| **Agent Tiers** — Our agent roster mapped to trust tiers | Already designed | 15m |

### Phase 4: Dashboard Integration (Us)

| Task | Description | Est. |
|------|-------------|------|
| **Policy Check History Widget** — Recent policy decisions in dashboard | Read-only | 2h |
| **Approval Queue Widget** — Pending approvals needing human review | Real-time | 2h |
| **Policy Health Widget** — Policy API uptime, requests/sec, average decision time | Monitoring | 1h |

---

## 9. Key Constraints

1. **The Policy API must return in < 50ms for ALLOW decisions.** Agents cannot wait 500ms before every action. The common path (ALLOW) should be a simple rule match with no DB I/O.
2. **No database dependency for the check path.** The config files are loaded into memory. Audit logging is async (write to buffer, flush periodically).
3. **Config maps are the source of truth.** Never embed policy in the binary. The YAML files are hot-reloadable.
4. **The governance log is append-only.** No edits, no deletes. Immutable by design.
5. **Agent cannot bypass the API by timeout.** "No response = blocked" is a hard rule. Only offline mode with explicit override can skip the check.
6. **Two replicas minimum.** The policy API is a critical path. Single point of failure is unacceptable.

---

## 10. Summary: What We Build vs What Opus Builds

| Deliverable | Who | When | Notes |
|------------|-----|------|-------|
| Policy API Server | **Opus** | Phase 1 | Three endpoints, rule engine, logging |
| Pre-Flight Tool (agent-side) | **Opus** | Phase 2 | Hermes tool that calls API |
| Approval Gateway (Telegram) | **Opus** | Phase 2 | Approve/deny in chat |
| Impact Inventory Formatter | **Opus** | Phase 2 | Auto-generates from context |
| Policy Config YAMLs | **Us** | Phase 3 | Our exact rules (already designed in Cluster 3) |
| Dashboard Widgets | **Us** | Phase 4 | Check history + approval queue |
| Compliance Dashboard Integration | **Us** | From Cluster 5 | Policy audit as evidence source |
