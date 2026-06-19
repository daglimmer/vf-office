# Prompt 13: Real Status-Based Positioning — 3D Office

> **Priority:** High — user sees everyone "working" in the 3D Office, but dashboard shows real idle/offline agents. These must match.

## The Problem

1. **Gateway** (`http://10.11.1.120:7100/heartbeats`) returns `status: "online"` for all 14 agents — even `storekeeper` with `last_seen: 2026-06-06` (13 days stale).
2. **Adapter** (`index.js:500`) uses `h.status` first — since it's always `"online"`, the computed `statusFromLastSeen()` never runs.
3. **3D Office frontend** (`main.js`) routes agents by `anchor` only — no awareness of real status.
4. **Result:** 3D Office shows 14 agents at desks "working." Dashboard shows 7 are actually idle/offline. **These must match.**

## What Ray Wants

| Role | Status | Position |
|------|--------|----------|
| **Oly** | Always (idle or working) | `work_desk_01` (his desk) |
| **Oly** | Consulting with someone | Meeting room |
| **Marcus** | Idle / working | `ceo_desk` (his office) |
| **Marcus** | Consulting with Oly | Meeting room |
| **DevOps** (devops, devops-api, devops-app, devops-infra) | Working | `work_desk` (DevOps room) |
| **DevOps** | Documentation | `doc_desk` (staff room) |
| **DevOps** | Idle / offline | Lounge |
| **DevOps** | Consulting with Oly | Meeting room |
| **Specialists** (storekeeper, netwatch, finwise, proxguard, deploybot, homeassistant, k8slearn) | Working | `doc_desk` (staff room) |
| **Specialists** | Documentation | `doc_desk` (staff room) |
| **Specialists** | Idle / offline | Lounge |
| **Specialists** | Consulting with Oly | Meeting room |
| **Sentinel** | Always | `ollie_station` (control center) |

**Core rule:** 3D Office positions must reflect the SAME status the dashboard shows. No more "everyone working" when half the fleet is idle.

---

## Files to Modify

### 1. `/root/repos/vf-office/adapter/index.js` — Fix Status Computation

**Line 500 — current (broken):**
```js
status: h.status || (h.last_seen ? statusFromLastSeen(h.last_seen) : agentStatus(a.id)),
```

**Replace with:**
```js
// NEVER trust the gateway's status field — it hardcodes "online" for everyone.
// Always compute from last_seen timestamp. Gateway status is only used when
// it contains a non-default activity label like "documenting" or "consulting".
status: computeAgentStatus(a.id, h),
```

**Add this function (near `statusFromLastSeen`, around line 476):**
```js
// computeAgentStatus — authoritative status for an agent, combining
// last_seen age + any activity label from the signald state system.
// Gateway's "status" field is ONLY used for activity labels (documenting, consulting),
// NOT for online/idle/offline — those come from timestamp math.
function computeAgentStatus(id, gwData) {
  const lastSeen = gwData.last_seen;
  const baseStatus = statusFromLastSeen(lastSeen);   // online | idle | offline
  
  // If base is idle or offline, the gateway's activity label is stale — ignore it
  if (baseStatus !== 'online') return baseStatus;
  
  // Agent is online. Check if they have an activity label from signald.
  // activity labels: "documenting", "consulting", "working" (default)
  const activity = activityState.get(id);
  if (activity === 'documenting') return 'documenting';
  if (activity === 'consulting') return 'consulting';
  return 'online';  // online + working (default)
}
```

**Add activity state tracking (new, around line 35-40 where other state vars live):**
```js
// activityState: per-agent activity label set via signald commands.
// Valid values: "working" (default), "documenting", "consulting"
// consulting entries auto-clear after 30 minutes.
const activityState = new Map();  // id → "documenting" | "consulting" | null
const ACTIVITY_TTL = 30 * 60 * 1000;  // 30 min auto-clear for consulting
```

**Add a cleaning function (runs periodically):**
```js
// Clean stale activity states (consulting auto-expires after 30 min)
function cleanActivities() {
  const now = Date.now();
  for (const [id, entry] of activityState) {
    if (typeof entry === 'object' && entry.expires && now > entry.expires) {
      activityState.delete(id);
    }
  }
}
setInterval(cleanActivities, 60000);  // every minute
```

**Update activityState.set to store with expiry:**
```js
// When setting consulting: activityState.set(id, { label: 'consulting', expires: Date.now() + ACTIVITY_TTL })
// When reading: activityState.get(id)?.label ?? null
```

**Add a signald handler or API endpoint to set activity (optional, can be done as follow-up):**
- `POST /api/agents/:id/activity` with body `{ "activity": "consulting" | "documenting" | null }`
- This allows the COO (Oly) to signal "I'm consulting with devops-app" → meeting room

### 2. `/root/repos/vf-office/public/main.js` — Real Status-Based Pool Routing

**Remove the simulation timer** (addressed in prompt `02-state-based-seating.md` step 4, lines 64-72) — this was a placeholder and must be REPLACED with real routing.

**In `pollRoster()` (around line 906-926), change the anchor/pool routing:**

Current logic sends agents with `anchor: null` to pools based on no status info. Replace with:

```js
// pollRoster() — anchor/pool routing (replace current block at ~line 906-926)
agents.forEach(a => {
  const apiAgent = roster.find(r => r.id === a.id);
  if (!apiAgent) return;
  
  const status = apiAgent.status;        // "online" | "idle" | "offline" | "documenting" | "consulting"
  const role = apiAgent.role;            // "command" | "coo" | "sentinel" | "specialist" | "devops"
  
  // Fixed anchors (always at their station unless consulting)
  if (apiAgent.anchor) {
    if (status === 'consulting') {
      a.acquire('meet', s => { a.goto(s, () => a.sitAt(s, 'sit')); });
    } else {
      // Stay at fixed anchor
      a.sitAt(apiAgent.anchor, 'sit');
    }
    return;
  }
  
  // Anchor-less agents: route by status
  switch (status) {
    case 'consulting':
      a.acquire('meet', s => { a.goto(s, () => a.sitAt(s, 'sit')); });
      break;
    case 'documenting':
      a.acquire('doc', s => { a.goto(s, () => a.sitAt(s, 'sit')); });
      break;
    case 'online':
      // Working: devops → work room, specialists → staff room
      if (role === 'devops') {
        a.acquire('work', s => { a.goto(s, () => a.sitAt(s, 'sit')); });
      } else {
        a.acquire('doc', s => { a.goto(s, () => a.sitAt(s, 'sit')); });
      }
      break;
    case 'idle':
    case 'offline':
    default:
      a.acquire('lounge', s => { a.goto(s, () => a.sitAt(s, 'sit')); });
      break;
  }
});
```

### 3. `/root/repos/vf-office/adapter/config/agents.json` — Keep Fixed Anchors

**Keep current anchors as-is** (they're correct):
- marcus → `ceo_desk`
- oly → `work_desk_01`  
- sentinel → `ollie_station`
- All others → `null`

The frontend routing handles the rest.

---

## Pool Seat Mapping (for reference — already in waypoints.json)

| Pool | Seats | Room |
|------|-------|------|
| `work` | `work_desk_01`–`08` | DevOps room (right side) |
| `doc` | `doc_desk_01`–`04` | Staff room (left side) |
| `lounge` | `lounge_seat_01`–`08` | Lounge (front) |
| `meet` | `meet_seat_ollie` + `meet_seat_01`–`07` | Meeting room (back) |

Note: `work_desk_01` is Oly's fixed anchor — the pool should still use it but Oly won't compete because he has a fixed anchor.

---

## Verification

After implementing, curl and visually confirm:

```bash
# 1. API returns real status (not "online" for 13-day-stale agents)
curl -sk https://olympus.110lymph.nl/api/agents | jq '.[] | {id, status, lastSeen}'

# 2. Storekeeper (last seen Jun 6) should show "offline"
# 3. Deploybot (last seen Jun 6) should show "offline"
# 4. NetWatch/FinWise/ProxGuard (Jun 9) should show "offline"  
# 5. Marcus (Jun 19, but 8h stale) should show "idle"
# 6. Oly (Jun 19, recent) should show "online"
# 7. DevOps agents (Jun 19, recent) should show "online"
```

```bash
# Browser: open 3D Office and verify:
# - Marcus at ceo_desk (idle, since he's 8h stale)
# - Oly at work_desk_01 (online)
# - Sentinel at ollie_station
# - Active devops agents in work room
# - Stale specialists in lounge
```

## Don't Break

- `statusFromLastSeen()` — the 2min/30min thresholds are correct, don't change them
- `gatewayMap()` — the 30s cache + 3s timeout is correct
- Agent detail endpoint `/api/agents/:id` — keep working
- Don't remove `h.status` reading entirely — we may want it later for activity labels
- The pool system (`Pool` class, `acquire`/`goto`/`sitAt`) — don't modify it
- `agents.json` anchors for marcus/oly/sentinel — keep them
- SEAT_OFFSET — don't touch

---

## Future: Activity API Endpoint (Optional — Not Required for This Prompt)

If you want to implement the consulting/documenting signal:

```js
// POST /api/agents/:id/activity
// Body: { "activity": "consulting" | "documenting" | null }
// Sets activityState for the agent, auto-clears consulting after 30 min
```

This lets Oly signal "I'm consulting with devops-app" via the dashboard or a signald command, and both agents appear in the meeting room. Can be done as follow-up — the status-from-lastSeen fix is the critical part.
