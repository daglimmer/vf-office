# Prompt 2/3: Add State-Based Seating for 14 Agents (Phase 4 Feature)

## Overview
The 3D Office shows the full 14-agent fleet sitting at static assigned positions. This prompt implements **state-based seating**: agents move between work/documentation/lounge/meeting areas based on their lifecycle state, creating a living office simulation.

## Current State
- 14 agents are defined in `adapter/config/agents.json` with hardcoded anchors
- `pollRoster()` in `public/main.js` (line 886) fetches `/api/agents` and assigns each agent to its `r.anchor` via `sitAt(anchor, ...)`
- The pool system in `public/main.js` (lines 538-552, 554-572) exists but is NOT used because agents.json provides direct anchors
- All agents have `status: 'idle'` in the roster (none report as 'online')

## What To Implement

### Step 1: Remove hardcoded anchors from agents.json
Edit `/root/repos/vf-office/adapter/config/agents.json` — set all `"anchor"` fields to `null` EXCEPT for:
- `marcus` → `ceo_desk` (CEO stays at desk)
- `oly` → `work_desk_01` (COO sits with team)
- `sentinel` → `ollie_station` (Sentinel at control center)

This forces all other agents through the pool system.

### Step 2: Fix pool assignments in main.js (lines ~496-502)
The pool configuration needs to match the waypoint geography:

```js
// Staff room (doc_desk_01-04, Z=9.5) for documentation/specialist work
const doc = new Pool('doc', ['nav_door_staff', 'nav_corridor_02'], ['doc_desk_01','doc_desk_02','doc_desk_03','doc_desk_04']);

// DevOps room (work_desk_01-08, Z=13-15.5) for devops work
const work = new Pool('work', ['nav_door_devops', 'nav_corridor_04'], 
    ['work_desk_01','work_desk_02','work_desk_03','work_desk_04','work_desk_05','work_desk_06','work_desk_07','work_desk_08']);

// Lounge (lounge_seat_01-08, Z=1.7-4.3) for idle/break agents
const lounge = new Pool('lounge', ['nav_door_lounge', 'nav_corridor_01'], 
    ['lounge_seat_01','lounge_seat_02','lounge_seat_03','lounge_seat_04','lounge_seat_05','lounge_seat_06','lounge_seat_07','lounge_seat_08']);

// Meeting room (meet_seat_01-07 + meet_seat_ollie) for briefings
const meet = new Pool('meet', ['nav_door_meeting', 'nav_corridor_01'], 
    ['meet_seat_ollie','meet_seat_01','meet_seat_02','meet_seat_03','meet_seat_04','meet_seat_05','meet_seat_06','meet_seat_07']);
```

### Step 3: Activate lifecycle routing in pollRoster()
In the `pollRoster()` function (line ~906-926), when `anchor` is null AND the agent has no cardId, route to a pool based on agent state/role:

```js
// In the idle/offline branch (line ~914-922), when no anchor:
} else if (!a.heldSlot && !a.waitingPool && !a.path.length) {
    // Direct idle agents to lounge
    a.acquire('lounge', s => { 
        a.hold('lounge', s); 
        a.goto(s, () => { a.sitAt(s, 'sit'); }); 
    });
}
```

### Step 4: Add simulation timing (optional enhancement)
In `Agent.update()` (line ~644-652), lifecycle state transitions are already wired:
- `debrief` → 20s → `documentation` → 30s → `lunch` → 45s → `despawning`

These timers work when `setLifecycle()` is called. Add a periodic state shuffle that sets random lifecycles for agents that are currently idle/working:

```js
// Every 60 seconds, advance 1-2 agents through a simple lifecycle
setInterval(() => {
    const candidates = agents.filter(a => a.seated && !a.timer && a.overlay === 'ok');
    if (candidates.length > 1) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        const states = ['working', 'documentation', 'lunch'];
        pick.setLifecycle(states[Math.floor(Math.random() * states.length)]);
    }
}, 60000);
```

## Files to Edit
1. `/root/repos/vf-office/adapter/config/agents.json` — remove anchors
2. `/root/repos/vf-office/public/main.js` — pool config + pollRoster routing + simulation timer

## Don't Break
- The 3DOF pool system (request/grant/release/queue spot) is already correct — don't modify it
- Don't change the `Agent` constructor or `goto()` or `sitAt()` methods
- Don't change `animateHumanoid`
- CEO and Oly and Sentinel must stay at their fixed positions
- All agents must be UPRIGHT (fix Prompt 1 first)
