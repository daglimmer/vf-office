# Phase 8 — 3D Office: Visual + Architectural Overhaul

## Reference Renders (attached by Ray)
Ray provided 9 photorealistic renders of the target aesthetic. These are THE standard:
- **Lounge**: L-shaped sectional, spectrum pillows, cloud pendant lights, living green wall, city skyline window, oak coffee table with built-in dashboard screen
- **Data Center**: Circular glass cylinder, real server racks with color-zone LEDs (blue→green→yellow→red), hexagonal floor with glowing seams, domed radial skylight, frosted brand band with icons
- **DevOps Office**: Row desks with triple monitors, rainbow cable bundles, RGB floor traces, shield window into DC, edge-lit "110lymph.nl" lightbox
- **Meeting Room**: Oval black table, 8 chairs, amber ring light overhead, smoked glass walls, media wall with code screen, holographic cloud puck on table
- **Control Room**: Curved command desk with spectrum gradient front, 4 dashboard monitors, neon cloud logo + orbit ring, amber circuit shield
- **CEO Office**: Oak desk, cloud lamp, leather seating, glass front, minimalist luxury
- **Staff Area**: 4 desks, single monitors, warm ring pendants, one cable bundle accent
- **Overview/Peak View**: Top-down showing all rooms interconnected by corridors

---

## 1. Building Architecture — FROM FLOOR PLAN TO OFFICE BUILDING

**Current problem:** Flat square plate with props scattered on it. No building logic, no flow.

**Required:** A real office building layout with:
- **Perimeter walls** with large windows (floor-to-ceiling where appropriate)
- **Interior walls** with glass panels (transparent/semi-transparent)
- **Proper corridors** connecting rooms logically (not just gaps between props)
- **Ceiling** with exposed industrial elements OR dropped ceiling panels per room
- **A central hub/corridor** that branches to rooms
- **Doors or open archways** between spaces — feel the transition

**Layout logic (clockwise):**
```
Entrance → Lounge (left, city view) → Staff Area → DevOps (shield window into DC) → Corridor →
Meeting Room → Control Room → CEO Office (right, private) → Data Center (center-right, circular glass)
```

Each room has a **purpose** and a **feel**. Not just labeled props — the architecture itself tells you where you are.

---

## 2. Material & Lighting Overhaul — APPLE STORE MEETS HIGH-TECH HQ

**Reference aesthetic:** Apple Park visitor center — bright, airy, glass, polished concrete, warm wood accents, precise lighting.

**Global changes:**
- **Ambient light:** Increase significantly. Ray can't see the rooms.
- **Emissive surfaces:** Not just colored blobs — use proper emission textures with bloom falloff (subtle glow, not disco)
- **Glass:** Use real transparency with slight blue/gray tint + subtle reflections (not opaque dark blocks)
- **Floors:** Polished concrete (medium gray with subtle reflections) — NOT disco floor with random colored strips
- **Walls:** Dark gray architectural panels OR glass — not black void
- **Ceiling:** Visible. Industrial dark with exposed beams in corridors, dropped white panels in offices, dramatic skylight in DC
- **Windows:** BIG. Floor-to-ceiling where the render shows them. City skyline visible through them.

**Per-room floor/lighting:**

| Room | Floor | Lighting | Ambiance |
|---|---|---|---|
| Lounge | Polished concrete | 5 cloud pendants (ice-blue, amber, mixed), city glow from window | Warm, inviting |
| Staff | Light wood floor | 4 warm ring pendants | Clean, functional |
| DevOps | Dark polished concrete with subtle RGB traces | 6 warm ring pendants + monitor glow | Focused, intense |
| Corridor | Polished concrete | Subtle guide LED strips along baseboards | Transitional |
| Meeting | Dark wood floor | Single large amber ring pendant over table | Professional, dramatic |
| Control | Dark polished concrete | Monitor glow + neon cloud sign + shield sign | Command center |
| CEO | Warm oak floor | One cloud lamp (warm white), window light | Calm, premium |
| DC | Hexagonal lit floor | Domed radial skylight + rack LEDs (blue→green→yellow→red zone gradient) | Immersive, technical |

---

## 3. Room-by-Room Specification (Match the Renders)

### 3A. Lounge
- **L-shaped dark gray sectional sofa** with 4 pillows (blue, orange-yellow, blue-purple, orange-red — spectrum gradient across the sofa)
- **Oak coffee table** with embedded screen displaying glowing network diagram
- **5 cloud-shaped pendant lights** at varying heights (frosted glass, soft emissive)
- **Living green wall** (vertical garden) floor-to-ceiling on one wall
- **Floor-to-ceiling window** on the back wall showing city skyline at twilight
- **Potted plants** (palm near window, small plants on shelves)
- **Wooden floating shelves** with books and decorative items

### 3B. Data Center (Center-Right)
- **Circular glass wall** (transparent with subtle blue-green tint) forming a cylinder
- **Inside:** Real server racks arranged in a ring, each rack with faceplate details, blinking lights, cable management arms
- **Color-zone LED system:** Racks transition from blue (left) → green (middle) → yellow → red (right) around the circle
- **Frosted band** on the glass at chest height — etched with "110lymph.nl" text and icons (cloud, shield, lock)
- **Hexagonal floor tiles** with glowing seams synchronized to rack colors
- **Domed radial skylight** above — glass and metal, natural light + color wash
- **Real 3D server rack geometry** — not blocks. Each rack has: bezel, vent pattern, LED indicators, cable management, subtle depth

### 3C. DevOps Office
- **Row of desks** with triple monitors each (showing code, dashboards, logs)
- **Rainbow cable bundles** running from each desk — organized but visibly colorful (Ethernet, fiber, power)
- **RGB floor traces** — subtle, like circuit paths, not random disco strips. Patterned, intentional.
- **Shield-shaped window** on one wall looking into the Data Center
- **Edge-lit "110lymph.nl" lightbox** on the wall (warm white glow behind frosted acrylic)
- **6 warm ring pendants** overhead
- **Plants** scattered for biophilic touch

### 3D. Meeting Room
- **Large oval black table** (seats 8-10) with silver edge trim
- **8 ergonomic black chairs** with silver legs
- **Holographic projection** above table center — cloud network diagram in blue/amber, semi-transparent
- **Single large amber ring pendant** directly over table
- **Smoked glass walls** (semi-transparent, you can see movement but not details)
- **Media wall** — large screen on one wall showing live code/terminal output
- **Etched cloud/shield decals** on glass (alpha texture, subtle)

### 3E. Control Room
- **Curved command desk** (smooth arc, not segmented boxes) with spectrum gradient front panel
- **4 large dashboard monitors** on the desk showing live metrics
- **Neon cloud logo** on the wall (blue-white glow, "110lymph.nl" text)
- **Amber circuit shield** neon sign (warm golden glow, circuit traces on shield shape)
- **Side equipment rack** with networking gear

### 3F. CEO Office (Ray's Office)
- **Premium oak desk** — large, warm wood, clean lines
- **Leather executive chair** (dark brown, high back)
- **Small leather sofa/loveseat** on one side
- **Floor-to-ceiling glass front** looking into corridor
- **One cloud lamp** — warm white, smaller than lounge
- **Large screen on wall** — showing dashboard or blank, minimal
- **Potted plant**
- **Small side table with water/coffee**
- **Minimal, calm, powerful** — not cluttered

### 3G. Staff Area
- **4 individual desks** with single monitors each
- **Basic ergonomic chairs**
- **4 warm ring pendants**
- **One accent cable bundle** (subtle)
- **No floor LEDs**
- **Clean, functional, comfortable**

---

## 4. Avatar Redesign — HUMANOID, NOT GEOMETRIC BLOBS

**Current problem:** "Circle ball that lays down when sitting and comes out of floor when getting up."

**Required:** Humanoid figures that:
- **Have defined form:** Head, torso, arms, legs — stylized but recognizable as human-shaped
- **Sit properly in chairs** (bend at hip, legs forward or down, torso upright)
- **Stand at desks** (full height, arms at sides or gesturing)
- **Walk between anchors** with a natural gait (subtle bounce, arm swing)
- **Smooth transitions** between states (blend, don't snap)
- **Role-colored glow/outline** — subtle, not a solid neon blob
  - CEO: Gold/amber subtle outline
  - COO: Blue-white outline
  - DevOps: Green outline
  - Specialist: Teal outline
  - Sentinel: Orange outline

**Design language:** Low-poly but recognizable. Think:
- Angular but smooth — like a stylized mannequin, not a block figure
- Simple face geometry (eyes indicated, subtle head shape)
- Clothing distinction by role:
  - CEO: Dark suit silhouette (shoulders distinct)
  - COO: Button-up silhouette
  - Devs: Hoodie/casual silhouette
  - Specialists: Simple uniform
- Height distinction: Taller for senior roles
- Total triangles per avatar: 500-800 (low enough for 30+ on screen)

**Animation states:**
- `idle` — standing, subtle weight shift
- `walking` — natural gait, arms swinging
- `sitting` — proper chair posture (NOT horizontal)
- `working` — at desk, slight lean forward
- `briefing` — standing, gesturing

---

## 5. Interactivity — ROOMS ARE FUNCTIONAL

Objects in the scene should be clickable and meaningful:

| Object | Click Action |
|---|---|
| Data Center server rack | Open `/infra` page in dashboard (or if embedded: `postMessage` to parent) |
| DevOps monitor | Open `/agents` page |
| Meeting room screen | Open `/kanban` page |
| Lounge dashboard table | Open Peak View `/` |
| Control room command desk | Open `/cost` page |
| CEO office screen | Open `/docs` page |

Add subtle cursor change + tooltip on hover for clickable objects. Blue emissive outline pulse when hoverable.

---

## 6. Camera Overhaul — SEE EVERYTHING

**Current problem:** Cameras feel trapped. Can't see across rooms.

**Required:**
- **Free orbit mode toggle** (already in Phase 5) — confirm it works smoothly
- **WASD walk mode** — move through the office like a first-person game
- **Peak View (top-down)** — pull camera to a high angle looking down, walls become 50% transparent, room labels visible
- **Glass walls** must be transparent enough to see through from corridor
- **No blind spots** — every room reachable by standard camera presets
- **Smooth transitions** — 800ms ease camera fly, not snap

---

## 7. Technical Constraints

- **Total scene triangles:** ≤ 250,000 (up from 150K to accommodate realistic server geometry and humanoid avatars)
- **Draco compression:** Level 6 on GLB export
- **62 anchors** must stay at EXACT positions (±0.01m tolerance — run verifier after build)
- **Emissive materials:** Use `KHR_materials_emissive_strength`, not shader nodes
- **Glass:** Use `KHR_materials_transmission` or alpha blending with opacity 0.3-0.5
- **No external textures** — all baked or procedurally generated at build time
- **Blender 4.x** compatible
- **Y-up export** (glTF standard)
- **Office.glb** replaces the existing `public/office.glb`

---

## 8. Build & Verify

```bash
cd office-art/
blender -b --factory-startup -P build_office.py -- --anchors anchors_report.json --out dist
python3 verify_office_glb.py dist/office.glb anchors_report.json
```

**Verification gates:**
- [ ] 62/62 anchors exact match
- [ ] Triangles ≤ 250K
- [ ] All 8 rooms have distinct, recognizable identity matching renders
- [ ] Glass walls are transparent (can see through from corridor)
- [ ] Avatars sit/stand/walk naturally (test with demo.js lifecycle)
- [ ] Peak View reveals all rooms with semi-transparent walls
- [ ] Clickable objects highlight on hover
- [ ] No disco floor, no geometric blobs, no black void walls
- [ ] City skyline visible through lounge/CEO windows

---

## 9. The Vibe Test

When Ray opens this, he should think: "I want to work here."

Not "oh, that's a neat WebGL demo."

This is the **final art pass** before production deployment. Make it count.
