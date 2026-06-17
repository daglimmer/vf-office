# Prompt 1/3: Fix Upside-Down Agents in 3D Office (CRITICAL)

## The Problem

When agents sit at `doc_desk_01-04`, `work_desk_05-08`, and `lounge_seat_01-04` anchors, their heads point DOWN (into the floor) and their feet point UP. The agents appear upside-down. The CEO at `ceo_desk`, FinWise at `meet_seat_ollie`, and agents at `work_desk_01-04` appear correctly.

This happens only in **production** at `https://olympus.110lymph.nl/office/` — not in the dev Vite server. The production build is bundled (minified) differently than the dev server.

## Root Cause Hypothesis

The `Agent.sitAt()` method (in `public/main.js` around line 533) copies the anchor's quaternion directly:

```js
sitAt(name, pose) {
    const a = anchors.get(name);
    this.group.position.copy(a.pos);
    this.group.quaternion.copy(a.quat);  // <-- this should work but doesn't in production
    this.seated = name; this.pose = pose; this.path = [];
}
```

The `animateHumanoid()` function (in `public/avatars.js` around line 181) eases X-rotation to 0 every frame:

```js
agent.group.rotation.x += (0 - agent.group.rotation.x) * k;   // 8d: ease back upright
```

**All anchor quaternions have X=0 and Z=0** — only Y and W components differ. This means sitting should never introduce an X-axis flip. Yet production shows upside-down agents.

**Hypothesis:** In the production minified build, the Three.js `Quaternion.copy()` or `Euler.setFromQuaternion()` produces a different result than in the dev server. This could be due to:
1. Minification affecting quaternion precision for certain Y-rotation values
2. The GLB model's root transform interacting differently with the bundled code
3. A frame-order issue where the `animateHumanoid` line-181 X-reset fires BEFORE `sitAt` positions the agent, and the next frame's slerp introduces an X-flip

## Anchors That Show Upside-Down (ALL have quat Y=-1, W≈0)

| Anchor | Position | Quaternion | Faces |
|--------|----------|------------|-------|
| doc_desk_01 | (4, 0, 9.5) | (0, -1, 0, 4e-06) | +Z |
| doc_desk_02 | (7, 0, 9.5) | (0, -1, 0, 4e-06) | +Z |
| doc_desk_03 | (10, 0, 9.5) | (0, -1, 0, 4e-06) | +Z |
| doc_desk_04 | (13, 0, 9.5) | (0, -1, 0, 4e-06) | +Z |
| work_desk_05 | (4, 0, 15.5) | (0, -1, 0, 4e-06) | +Z |
| work_desk_06 | (7, 0, 15.5) | (0, -1, 0, 4e-06) | +Z |
| work_desk_07 | (10, 0, 15.5) | (0, -1, 0, 4e-06) | +Z |
| work_desk_08 | (13, 0, 15.5) | (0, -1, 0, 4e-06) | +Z |
| lounge_seat_01 | (5.5, 0, 1.7) | (0, -1, 0, 4e-06) | +Z |
| lounge_seat_02 | (7.5, 0, 1.7) | (0, -1, 0, 4e-06) | +Z |
| lounge_seat_03 | (9.5, 0, 1.7) | (0, -1, 0, 4e-06) | +Z |
| lounge_seat_04 | (11.5, 0, 1.7) | (0, -1, 0, 4e-06) | +Z |

## Anchors That Work Correctly (ALL have quat Y=0, W=1)

| Anchor | Position | Quaternion | Faces |
|--------|----------|------------|-------|
| ceo_desk | (31.5, 0, 14.6) | (0, 0, 0, 1) | -Z |
| work_desk_01 | (4, 0, 13) | (0, 0, 0, 1) | -Z |
| work_desk_02 | (7, 0, 13) | (0, 0, 0, 1) | -Z |
| work_desk_03 | (10, 0, 13) | (0, 0, 0, 1) | -Z |
| work_desk_04 | (13, 0, 13) | (0, 0, 0, 1) | -Z |
| lounge_seat_05-08 | (various, Z=4.3) | (0, 0, 0, 1) | -Z |
| meet_seat_ollie | (28.9, 0, 3) | (0, -0.707108, 0, 0.707106) | angled |
| meet_seat_06 | (31.5, 0, 4.9) | (0, 0, 0, 1) | -Z |
| meet_seat_02 | (31.5, 0, 1.1) | (0, 1, 0, 4e-06) | -Z |

## What We've Tried (that didn't work)
- Swapping waypoint edges (nav_door_staff→doc_desk, nav_door_devops→work_desk) — this fixed pathfinding geography but NOT the upside-down rotation
- Adding CHAIR_HEIGHT=0.42 to `animateHumanoid` Y-position — feet came up but rotation unchanged
- Every fix attempted in `main.js` and `avatars.js` (editing the source files)

## What To Fix

### Fix 1: Apply X-flip correction in `sitAt()`
In `public/main.js`, modify the `sitAt()` method to detect and correct upside-down orientation immediately after setting the quaternion. Add this AFTER `this.group.quaternion.copy(a.quat)`:

```js
// Mirror fix: quats with Y=-1, W≈0 cause X-axis flip in minified build
// Force upright by applying Math.PI rotation on X
const q = a.quat;
// Detect quats that flip upside down: Y component near -1, X and Z near 0
if (Math.abs(q[1] + 1) < 0.01 && Math.abs(q[0]) < 0.01 && Math.abs(q[2]) < 0.01) {
    // These work correctly in dev but invert X in production build
    // Keep the Y-facing but add a compensating X-rotation
    this.group.rotation.x = 0;  // Force upright
}
```

### Fix 2 (Alternative): Force `animateHumanoid` Y-position post-correction
In `public/avatars.js`, line 204, the Y-position is computed as:
```js
agent.group.position.y = aY + bob + Math.max(0, -lowest);
```
If the agent IS upside-down, the `-lowest` foot-clip calculation produces a large positive value because the feet are above the hips. This could be pushing the visual body up but not correcting the group's visual rotation. Add:

```js
// Force group X-rotation to 0 in production if an X-flip is detected
if (Math.abs(agent.group.rotation.x) > 0.1) {
    agent.group.rotation.x = 0;
}
```

### Fix 3 (If all else fails): Brute-force rotation override
In `public/main.js`, after `pollRoster()` creates an agent and `sitAt()` is called, add a 1-frame delay then force-set the rotation:

```js
// Brute-force: on the next frame after sitAt, force upright
requestAnimationFrame(() => {
    if (this.group.rotation.x !== 0) {
        this.group.rotation.set(0, this.group.rotation.y, this.group.rotation.z);
    }
});
```

## Files to Edit
1. `/root/repos/vf-office/public/main.js` — `sitAt()` method around line 533-537
2. `/root/repos/vf-office/public/avatars.js` — `animateHumanoid()` around line 181 and line 204

## Build & Deploy
```bash
cd /root/repos/vf-office
# Build Vite bundle
npx vite build public --base=/office/ --outDir /app/dist --emptyOutDir
cp public/anchors.json /app/dist/ && cp public/waypoints.json /app/dist/ && cp public/office.glb /app/dist/
docker build -t 10.75.1.211:30500/vf-office:20260617-opus-fix .
docker push 10.75.1.211:30500/vf-office:20260617-opus-fix
kubectl set image deployment/olympus-office olympus-office=10.75.1.211:30500/vf-office:20260617-opus-fix -n mission-control
kubectl delete pod -n mission-control -l app=olympus-office --force
```

## Verify
1. Navigate to `https://olympus.110lymph.nl/office/`
2. Verify ALL 14 agents are upright (heads up, feet on/near floor)
3. Verify agents are at their correct positions (Marcus at CEO desk, Oly at work_desk_01, etc.)
4. Check that agents at `doc_desk_01-04`, `work_desk_05-08`, `lounge_seat_01-04` are all upright
5. Take a screenshot as proof
