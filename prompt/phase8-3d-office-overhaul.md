# Phase 8 — 3D Office: Full Visual Overhaul (Render Parity)

Ray provided 9 reference renders of what the office should look like. Phase 7 finished the
dashboard embed and live data integration. Phase 8 rebuilds the visual identity to match the
vision.

## Reference Renders (Ray's standards)

Ray shared 9 renders showing the target aesthetic:
- Modern, spacious, high-tech office (Apple-like, not a game)
- Real glass walls with transparency (not dark blocks)
- Functional rooms, not abstract floor-plan shapes
- Humanoid avatars with visible faces (not floating labels)
- Realistic lighting — bright but moody

## Build Approach

**Procedural Three.js — no Blender, no Python GLB generator.** Build geometry directly in
JavaScript/Three.js in the browser. Every room is a JavaScript module.

## Room-by-Room Requirements

### 1. Data Center (circular, glass-walled)
Per render: circular glass wall with etched icons (cloud, shield, lock), frosted brand band
with "110lymph.nl", dome skylight with rainbow-colored panels, hex floor with glowing seams,
rack rows with colored LED zones (blue → green → yellow → red around the ring).
- **Functional:** clicking a rack opens infra detail page
- **Realistic:** real server racks, not abstract blocks
- Glass wall with transparency so you can see inside from corridor

### 2. Lounge
Per render: dark gray L-shaped sectional with spectrum pillows (4 colors), low wooden coffee
table with built-in dashboard screen, 5-7 cloud-shaped pendant lights (mixed ice-blue/amber),
floor-to-ceiling vertical garden wall, large window showing city skyline at dusk.
- Warm, inviting, premium
- The coffee table dashboard should show live agent activity

### 3. DevOps Room
Per render: desk rows with triple code monitors, rainbow cable bundles per desk, RGB floor
traces (geometric, circuit-like), shield-shaped window looking into DC, edge-lit "110lymph.nl"
lightbox, warm ring pendant lights, acoustic panels, potted plants.
- High-energy, cyberpunk-but-professional
- Monitors show real code/data if possible

### 4. Meeting Room
Per render: oval black table with silver rim, 8 ergonomic chairs, large amber ring light
fixture, smoked glass walls, holoprojector puck in table center (displays cloud network
diagram), media wall with code screen, smoked glass walls with etched cloud/shield decals.
- Glass walls with transparency — see corridor and adjacent rooms

### 5. Control Room (Ops)
Per render: curved command desk with spectrum gradient front (rainbow LEDs underneath), 4
dashboard monitors, neon cloud logo with orbit ring, amber circuit shield on wall, side
server rack.
- Central command feel — the nerve center

### 6. CEO Office (Marcus)
Calmest room: oak desk, one cloud lamp, small logo, frosted glass front wall, leather couch,
big white screen on wall. Premium, executive, clean.
- "I want to work here" level

### 7. Staff Room
4 desks with single monitors, warm ring lights, one cable bundle accent, no floor LEDs.
Functional, clean, modern.

### 8. Corridor
Wide, open, glass-walled corridor connecting all rooms. Guide LEDs subtle on floor.
Not a dark tunnel — bright, open, modern office hallway.

## Agent Avatars

**Humanoid figures, not floating spheres:**
- Body: simple geometric humanoid (torso, limbs) — stylized but recognizable
- Head: spherical with subtle facial features (eyes, mouth)
- Glow color by role: amber=CEO, blue=COO, green=DevOps, purple=specialists
- Walking animation: smooth movement between waypoints
- Sitting: agents sit IN chairs (not floating above or laying down)
- Rising: stand up from chairs naturally

## Lighting

- Ambient: brighter overall — the space should feel modern and open, not a cave
- Room lights: pendant fixtures cast warm pools
- Emissive elements: LED strips, cloud lamps, server rack lights
- Natural light: skylight in DC, window in lounge and CEO office
- Glass walls: let light pass between rooms

## Architecture / Layout

- Eight distinct rooms in a logical office layout
- Wide corridors connecting them — not narrow paths
- Glass walls everywhere for transparency between rooms
- Each room has a clear entrance/exit
- Room labels visible from outside ("Lounge", "Data Center", "CEO Office")
- Peak View (top-down) shows the full office with transparent/ghost roof

## Functional Requirements (from Ray)

- Data Center: click a server rack → it opens the infra page
- Lounge: coffee table dashboard shows live Kanban activity
- DevOps: clicking the shield window shows DC detail
- Meeting: holoprojector pulses when meeting is active
- Every room feels like a REAL room in a REAL office — not a game level
- Balance between realistic and rendered — Apple Store aesthetic

## Implementation

Build directly in `public/` as Three.js modules:
```
public/
├── office/
│   ├── scene.js          ← main scene setup
│   ├── rooms/
│   │   ├── datacenter.js
│   │   ├── lounge.js
│   │   ├── devops.js
│   │   ├── meeting.js
│   │   ├── control.js
│   │   ├── ceo.js
│   │   ├── staff.js
│   │   └── corridor.js
│   ├── furniture/
│   │   ├── desks.js
│   │   ├── chairs.js
│   │   ├── servers.js
│   │   ├── sofas.js
│   │   └── lamps.js
│   ├── lighting.js
│   ├── avatars.js
│   └── materials.js      ← shared glass, metal, wood materials
```

## Verification

- [ ] All 8 rooms visible from Peak View, individually navigable via room buttons
- [ ] Glass walls are transparent — you can see between rooms
- [ ] Avatars are humanoid, sit IN chairs, walk smoothly
- [ ] DC has real-looking server racks with click interaction
- [ ] Lounge has skyline view, cloud lamps, green wall
- [ ] Meeting room has glass walls and holoprojector
- [ ] CEO office has leather couch and oak desk
- [ ] Lighting is bright and modern — not dark cave
- [ ] Room labels visible
- [ ] No "game-y" feel — Apple Store / high-tech office aesthetic
