# Phase 8 — 3D Office: Geometry Overhaul — Match Reference Renders

Phase 7 completed dashboard embed. Phase 8 rebuilds the geometry procedurally in Three.js to match the reference renders.

---

## 1. Build Method

**Procedural Three.js** — all geometry built in JavaScript, zero Blender dependency. ExtrudeGeometry, BoxGeometry, CylinderGeometry, TorusGeometry, ShapeGeometry. Use MeshStandardMaterial + MeshPhongMaterial for realism. No external GLB needed.

---

## 2. Room-by-Room Rebuild (match reference renders)

### Data Center
- **Circular glass wall** (transparent cylinder, frosted band at mid-height)
- **Server racks** — 12-16 black rectangular racks arranged in a ring inside the glass. Each rack: blue LED strips (emissive) on front. Top-to-bottom: blue → green → yellow → red spectrum around the ring
- **Hexagonal floor** — repeating hex pattern with glowing seams (emissive lines between tiles)
- **Domed skylight** — radial skylight above, triangular glass panes
- **Brand band** — frosted band on the glass with "110lymph.nl" text + cloud/shield/lock icons
- Click a rack → opens infra detail page (postMessage to parent if in iframe)

### Lounge
- **U-shaped sectional sofa** — curved, dark gray, seats 8-10
- **Spectrum pillows** — one per color stop (blue, teal, green, amber, orange, red)
- **Oak coffee table** — low rectangular, built-in glowing dashboard screen (emissive plane)
- **Cloud pendant lamps** — 5-7 frosted organic shapes (sphere + torus knot or metaball-like geometry), emissive in ice-blue/amber mix, hanging at varied heights
- **Living green wall** — floor-to-ceiling vertical plane with plant geometry (small box clusters, green material)
- **Night skyline window** — large floor-to-ceiling plane behind sofa, dark blue with emissive dot grid for city lights
- **Bookshelves** — two floating wooden shelves with small box "books"

### Meeting Room
- **Oval black table** — large, seats 8 chairs around it
- **8 chairs** — auto-placed at anchors, black ergonomic with silver legs
- **Amber ring light** — large torus above table, emissive warm amber
- **Holographic puck** — semi-transparent sphere in table center with blue/orange glow, rotating cloud/network icons inside
- **Smoked glass walls** — semi-transparent planes with etched cloud patterns (opacity 0.3)
- **Media wall** — large plane behind table, emissive code text
- **Code screen** — second large plane showing code (emissive green text on black)

### CEO Office
- **Oak desk** — large rectangular, warm wood material
- **One cloud lamp** — smaller frosted pendant
- **Leather sofa** — dark brown, 2-seater against wall
- **Glass front wall** — transparent, looking into corridor
- **Small logo** — "110lymph.nl" sign on back wall, subtle emissive
- **Big white screen** — large monitor plane on desk, emissive white
- **Potted plant** — small green geometry in corner

### COO Office (same family as CEO, slightly different)
- **Oak desk** — medium rectangular
- **Two monitors** — emissive screens showing kanban/data
- **One cloud lamp**
- **Corkboard wall** — brown plane with small colored "notes" (tiny boxes)

### DevOps Office
- **Desk rows** — 3-4 desks, each with 2-3 monitors (black frames, emissive code screens)
- **Rainbow cable bundles** — colored cylinders running from ceiling to each desk (RGB: blue, green, yellow, orange)
- **RGB floor traces** — thin emissive lines on floor following circuit-like paths between desks
- **Shield window** — large window looking INTO the data center (transparent plane, shield-shaped cutout)
- **"110lymph.nl" lightbox** — edge-lit sign on wall, warm emissive
- **Warm ring pendants** — torus lights above each desk row, warm white emissive
- **Acoustic panels** — wall-mounted rectangular panels
- **Plants** — potted plants between desks

### Ops Office
- Similar to DevOps but more tactical
- **Large dashboard wall** — floor-to-ceiling emissive plane showing metrics/graphs
- **Standing desk option** — one taller desk
- **Red/amber status indicators** — emissive spheres on wall showing system health

### Staff Office
- **4 simple desks** — single monitors each
- **Warm ring lights** — one per desk
- **One cable bundle accent** — not as dense as DevOps
- **No floor LEDs**

### Control Room
- **Curved command desk** — segmented arc with spectrum gradient front (emissive strips: blue → amber → red)
- **4 dashboard monitors** — emissive screens showing system metrics
- **Neon cloud logo** — on wall behind desk, emissive blue
- **Amber circuit shield** — on wall, emissive amber lines forming shield pattern
- **Side rack** — small server rack with blinking LEDs

### Corridor
- **Guide LEDs** — thin emissive strips along floor edges
- **Glass walls** between rooms — semi-transparent
- **Ceiling lights** — recessed emissive rectangles

---

## 3. Avatars — Humanoid Figures

Replace current spheres with proper figures that SIT and STAND:

```
Standing:  head (sphere, 0.15m radius)
           neck (thin cylinder)
           torso (box, 0.3×0.5×0.15m, rounded)
           arms ×2 (cylinder, 0.05m radius, 0.5m long)
           legs ×2 (cylinder, 0.06m radius, 0.55m long)

Sitting:   same but rotated — legs forward, torso upright at desk
           Agent at desk = sitting at chair position
           Agent walking = standing, slight bob animation
```

- **Colors by role:** CEO=gold, COO=silver, DevOps=blue, Ops=amber, Sentinel=red, Specialists=their badge color
- **Glow ring** at feet (torus, emissive, color-matched)
- **Name label** floating above head (CSS2D, already implemented)
- **Face:** simple emissive eyes (two small white spheres on head), optional: basic nose/mouth geometry
- **Smooth transitions:** animate between standing and sitting (rotate limbs, not teleport)

---

## 4. Walls & Transparency

- **All internal walls:** semi-transparent (opacity 0.25–0.35) with glass material
- **External walls:** slightly more opaque (0.5)
- **Peak View (top-down):** ceiling removed, walls at opacity 0.15 — full layout visible
- **Room view:** when camera enters a room, that room's walls go opacity 0.15, adjacent rooms 0.25

---

## 5. Lighting Overhaul

- **Ambient:** brighter (currently too dark) — `AmbientLight(0x404060, 1.5)`
- **Directional:** soft overhead fill — `DirectionalLight(0xffffff, 0.6)`
- **Room lights:** each room has its own PointLight cluster matching the reference renders
- **Emissive surfaces:** cloud lamps, floor traces, screen monitors, ring lights, skylight — all use MeshStandardMaterial with emissive
- **No disco floor** — remove the random floor lights, replace with intentional architectural lighting

---

## 6. Functional Interactivity

- **Click DC server rack** → `postMessage({type: 'nav', route: '/infra'})` to parent dashboard
- **Click CEO/COO desk monitor** → opens agent detail card
- **Click meeting table hologram** → opens kanban board
- **Click lounge dashboard screen** → opens Peak View
- **Click DevOps shield window** → zooms into DC
- All clicks: visual feedback (brief glow pulse) then action

---

## 7. Verification

- [ ] All 8 rooms visually match reference renders (not gray boxes)
- [ ] Avatars sit at desks (not lay down), stand when walking
- [ ] Peak View shows transparent layout — every room identifiable from above
- [ ] Lighting is bright enough to see details, not washed out
- [ ] DC server racks are recognizable as servers through glass
- [ ] Lounge has U-sofa, cloud lamps, green wall, skyline
- [ ] Meeting has oval table, amber ring, hologram
- [ ] CEO has oak desk, leather couch, logo — looks executive
- [ ] DevOps has rainbow cables, triple monitors, shield window
- [ ] Click DC rack → navigates (postMessage)
- [ ] No Blender dependency — everything runs in browser

---

**Context:** The original Phase 3 GLB was a gray-box placeholder. This phase replaces it entirely with procedural Three.js geometry built to match the reference renders Ray provided. The existing HUD, notifications, steering, timeline, WebSocket bridge, and dashboard embed all remain — only the visual geometry changes.
