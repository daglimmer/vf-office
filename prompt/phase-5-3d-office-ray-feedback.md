# 3D Agent Office — Phase 5 Complete (Ray's Feedback)
## For Fable 5 — June 11, 2026

---

The 3D Office is live at `http://10.11.1.120:5173` with a Phase 3 Blender-built GLB (748KB, 22K tris, 62 anchors verified). Phase 4 added the full HUD/notifications/timeline/steering. Ray reviewed it and needs these fixes:

---

## 1. Lighting — BRIGHTER scene (HIGHEST priority)

**Current problem:** Dark glass theme reads as "too dark, can't see what's what." Room interiors are dim, corridors are nearly black.

**Fix:**
- Double or triple ambient light intensity
- Add a skylight / hemisphere light (soft blue-white, intensity ~1.5)
- Boost all emissive materials by 2× (spectrum LEDs, cloud lamps, floor traces, ring lights)
- Ceiling pendants should cast actual point lights (max 3 per room for perf)
- Corridor guide LEDs: increase brightness + add subtle overhead strip

**Don't touch:** The glass material itself stays frosted. Dark palette stays. Just more LIGHT.

---

## 2. Transparent walls in Peak View (top-down overview)

**Current problem:** In Peak View (top-down camera), opaque walls block everything. Ray can't see the layout.

**Fix:**
- When camera is in Peak View mode: set all wall materials to 30% opacity
- Ceiling geometry: 10% opacity or hidden entirely in Peak View
- A subtle grid floor stays visible so rooms are still distinguishable
- On exit Peak View → restore full opacity
- Transition: smooth 0.5s opacity tween (not instant)

---

## 3. Agent avatar puppets (instead of floating labels)

**Current problem:** Agents show as CSS2D text labels only. "Not visible, just a label."

**Fix:**
- Each agent gets a 3D puppet: small sphere (head) + slightly larger cylinder/cone (body)
- Height: ~1.2 units total (desk-scale, not human-scale)
- Head color = agent status (green=active, orange=idle, gray=offline, red=blocked)
- Body color = role group (gold=Command, blue=DevOps, white=Specialists)
- Subtle bobbing animation (idle float, ±0.05 units)
- When agent moves paths: puppet glides along A* waypoints with rotation to face direction
- CSS2D label stays ABOVE the puppet (name + status)
- Working agents get a subtle particle ring at their feet

---

## 4. Camera modes — DUAL TOGGLE

**Current problem:** "Fixed cameras, can't look around. Some rooms awkward to see."

**Fix — two modes, single toggle button in HUD:**
- **Preset Mode (default):** 9 preset buttons (lounge, staff, devops, corridor, meeting, control, ceo, dc, peak-view). Click = smooth flyTo. This stays unchanged.
- **Free Mode:** OrbitControls with full rotation + zoom. Click-and-drag to orbit, scroll to zoom. Button says "Free Cam" / "Presets" to toggle.
- **Bonus if feasible:** WASD walk mode — first-person movement through corridors. W=forward, S=back, A/D=strafe. Mouse to look. Space to toggle back.

---

## 5. Bridge adapter WebSocket fix

**Current problem:** Dashboard shows "DEMO MODE — no adapter connected" permanently. The Phase 2 bridge adapter handles HTTP but doesn't upgrade WebSocket connections. The client tries `ws://host/ws`, gets rejected, falls back to demo.

**Fix options:**
- **Option A (preferred):** Add WebSocket upgrade to the Phase 4 adapter (`adapter/index.js`). Listen for `upgrade` events on the HTTP server, handle `/ws` path. When connected, push real Kanban events every 2s. Currently requires Node 22+ (already installed on host as v22.22.3).
- **Option B:** Client-side fallback — if WebSocket fails, poll `/agents` and `/kanban/summary` HTTP endpoints instead of going full demo. Less real-time but removes the banner.

---

## Files to work with

All source files are in the repo under the 3D Office directory (Ray is pushing them now). Key files:
- `public/main.js` — 3D scene, camera, lighting, agent lifecycle
- `public/hud.js` — HUD stats, agent cards, camera preset buttons
- `public/notifications.js` — notification panels
- `public/timeline.js` — timeline pills
- `public/steering.js` — pause/resume/kill controls
- `public/style.css` — glass theme, animations
- `adapter/index.js` — bridge adapter (HTTP + needs WS)
- `public/office.glb` — the 3D model (748KB, 62 anchors)

---

## Priority order

1. Lighting (Ray can't evaluate anything else if he can't see)
2. Transparent walls in Peak View (overview comprehension)
3. Free Camera toggle (navigation frustration)
4. Agent puppets (visual clarity)
5. WebSocket fix (removes demo mode banner)

---

## Verification

After each fix, Ray checks `http://10.11.1.120:5173` and confirms:
- [ ] Rooms are visible, LEDs pop, not "too dark"
- [ ] Peak View shows the full layout through transparent walls
- [ ] Camera toggle works — can freely orbit + return to presets
- [ ] Agents are visible as mini characters, not just floating text
- [ ] No "DEMO MODE" banner (or at minimum, polling fallback works)
