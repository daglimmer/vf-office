# Phase 8 — 3D Office: Aesthetic Overhaul (Render Parity)

Ray provided the original Phase 3 reference renders and gave detailed feedback. The current
GLB feels like a "floor plan with stuff on it" — this phase elevates it to feel like an actual
high-tech office building, matching the reference renders as closely as possible within the
≤150k triangle budget.

---

## 0. Reference Renders (the target)

Ray uploaded 9 renders showing the vision for each room. Key aesthetic qualities across all:

- **Polished dark concrete floors** with subtle reflections
- **Warm + cool light balance** — not just dark with bright emissive dots
- **Apple-like minimalism** meets cyberpunk — clean lines, premium materials, purposeful glow
- **Depth and layering** — every room has foreground/midground/background elements
- **Materials feel real** — wood has grain, glass has slight tint, metal has subtle roughness

---

## 1. Global Lighting Fix

Current problem: ambient is too dark, emissive elements are too bright and harsh.
Rooms feel like black voids with neon stickers.

**Fix:**
- Increase ambient light to ~30% of the reference renders' perceived brightness
- Add a soft directional "skylight" from above (simulating overhead lighting through the transparent roof)
- Tone DOWN emissive intensity on individual elements — they should glow, not scream
- Add subtle fog/atmosphere (not thick, just enough to give depth)
- Floor should have ~15% reflectivity (polished concrete look, not mirror)

---

## 2. Walls & Transparency

**Current:** Dark solid walls block all visibility. From Peak View / above, you can't see into rooms.
**Target:** From the top-down camera, all walls become ~85% transparent. From eye-level, walls
are opaque but with glass panels where the reference shows glass (meeting room, DC ring, CEO glass front).

**Implementation:**
- Set wall material opacity based on camera angle (top-down → transparent, eye-level → opaque)
- Or: use two material variants — one opaque for eye-level cameras, one glass for overhead
- Glass walls in Meeting room, DC ring, and CEO office should always have slight tint + subtle reflection

---

## 3. Room-by-Room Overhaul

### Lounge
**Reference:** Dim, cozy, L-shaped sectional with spectrum pillows, wooden coffee table
with glowing dashboard, 5-7 frosted cloud pendants (ice-blue/amber mix), living green wall,
night skyline through large window.

**Fix:**
- Replace generic boxes with an L-shaped sectional (simple geometry — extruded rectangles)
- Add 4 colored pillows (blue, orange, yellow, purple) as small rounded boxes
- Coffee table: rectangular box with emissive top (dashboard screen)
- Cloud pendants: 5-7 sphere clusters with frosted emissive material (not harsh points)
- Green wall: vertical rectangle with plant-like texture or green emissive strips
- Window wall: large rectangle with night-sky gradient + tiny emissive dots (city lights)

### Data Center (DC)
**Reference:** Circular glass ring, rows of server racks with rainbow LED zones
(blue→green→yellow→red around the circle), frosted brand band with icons, domed
radial skylight, hex floor with glowing seams.

**Fix:**
- This room IS a cylinder — the glass wall IS the room boundary
- Server racks: tall rectangular boxes arranged in a circle inside the glass
- Each rack gets an emissive strip cycling through the rainbow (blue/green/yellow/red zones)
- Frosted band on the glass: cylinder segment with `110lymph.nl` + icons as emissive decals
- Hex floor: hexagonal tiles with emissive seam edges (0.5px emissive lines)
- Domed skylight: hemisphere mesh above with subtle blue tint
- The room should feel like a jewel box — you see the glowing racks THROUGH the glass

### DevOps Room
**Reference:** Desk rows with triple monitors, rainbow cable bundles per desk,
RGB floor traces, shield-shaped window into DC, edge-lit `110lymph.nl` lightbox,
warm ring pendants.

**Fix:**
- Desks: dark wood rectangles with metal legs
- Monitors: 3 per desk — vertical rectangles with subtle emissive "screen glow"
- Rainbow cable bundles: curved tubes with gradient emissive material under each desk
- Floor traces: thin emissive lines on the floor following circuit-like paths
- Shield window: the wall segment facing the DC should be a shield-shaped cutout
  with glass, so you see the DC glow through it
- Lightbox: wall-mounted rectangle with `110lymph.nl` in emissive white
- Ring pendants: torus shapes with warm white emissive above each desk row

### Meeting Room
**Reference:** Oval black table, 8 chairs, large amber ring light overhead, smoked
glass walls, media wall with code screen, holographic puck.

**Fix:**
- Table: flat oval with slight thickness, dark material
- Chairs: simple geometry (seat + back + legs) around the table
- Ring light: large torus above table center with warm amber emissive
- Glass walls: transparent with 30% opacity gray tint + subtle reflection
- Media wall: large rectangular emissive panel with code-like texture
- Holo puck: small glowing disc on the table (already in Phase 1 main.js, keep runtime)

### CEO Office
**Reference:** Calmest room — oak desk, one cloud lamp, small logo, glass front.

**Fix:**
- Oak desk: warm brown rectangle with slight wood grain material
- Cloud lamp: single frosted sphere cluster overhead
- Logo: small emissive `110lymph.nl` on the back wall
- Glass front wall facing the corridor — transparent with subtle tint
- Keep it serene — this is the calmest room

### COO Office (Ops)
**Reference:** Should make you think "I want to work here."

**Fix:**
- Larger desk with 2-3 monitors
- Warm ring pendant overhead
- Small plant (simple green geometry)
- Glass wall facing corridor
- Personal touch: one accent element (small emissive art piece on wall)

### Staff Room
**Reference:** 4 desks, single monitors, warm rings, no floor LEDs.

**Fix:**
- 4 desks in a row or 2×2 grid
- Single monitor per desk
- Warm ring pendants
- One accent: one rainbow cable bundle (subtle)
- Clean, professional, not over-designed

### Corridors
**Reference:** Dark with subtle guide LEDs.

**Fix:**
- Thin emissive strips along floor edges as wayfinding
- Keep dark but add enough ambient to navigate
- No clutter — corridors are transitions, not destinations

---

## 4. Avatar Fix

**Current issues:**
- Avatars "lay down" when sitting — rotation is wrong (pitch instead of translate)
- Avatars "come out of the floor" when getting up — spawn position is at floor level
- Avatars are just labels — need a simple humanoid form

**Fix:**
- Sitting: translate the avatar DOWN (not rotate) — move to chair height, keep upright
- Standing up: smoothly translate from chair height to standing height
- Spawn/despawn: fade opacity + slight scale, not pop-in from floor
- Avatar body: simple puppet — sphere head + cylinder body + 2 cylinder arms + 2 cylinder legs
  - Head sphere: ~0.3m diameter
  - Body cylinder: ~0.5m tall, ~0.2m radius
  - Arms + legs: thin cylinders
  - Total tris per avatar: ~200 (× 8 agents = 1,600 tris — well within budget)
  - Color by role: CEO = gold, COO = blue, DevOps = green, Ops = orange, Specialist = purple
  - Head gets a subtle emissive "eye" dot
- Sitting state: lower body compresses (legs fold), arms rest on desk
- Label floats above head, not replaces the body

---

## 5. Big Screens with Data

**Reference:** The renders show large monitors with actual data (code, graphs, dashboards).

**Fix:**
- In DevOps, Meeting, CEO, and COO rooms: add large rectangular "screen" planes
- These should have a subtle emissive glow (not blinding)
- For screens facing the camera: display simple data-like patterns
  - Could be an animated canvas texture OR static emissive patterns that suggest data
  - Don't need to render real text — abstract glowing grids/lines convey the idea
- Meeting room media wall: largest screen, blue-tinted with code-like lines

---

## 6. Office Building Feel

**Current:** A flat floor plan with walls extruded up.
**Target:** An actual building with depth, ceiling details, and spatial hierarchy.

**Fix:**
- Add ceiling planes for each room (transparent from above, visible from eye-level)
- Different ceiling heights per room type:
  - Lounge & Meeting: high ceiling (4m)
  - DC: domed (already spec'd)
  - Offices: standard (3m)
  - Corridors: standard (2.8m)
- Add subtle ceiling details: recessed lighting panels, exposed beams in lounge
- External walls: add a subtle "building shell" feeling — not just floating rooms

---

## 7. Material Palette (Apple-inspired IT aesthetic)

| Element | Material |
|---|---|
| Floors | Dark polished concrete — 15% roughness, subtle normal |
| Walls (opaque) | Dark gray matte — 40% roughness |
| Walls (glass) | Tinted glass — 15% opacity, 5% roughness, subtle blue-green tint |
| Wood (desks, tables) | Warm oak — medium roughness, slight grain |
| Metal (legs, frames) | Brushed aluminum — low roughness, silver |
| Emissive elements | Soft glow — strength 0.5-2.0 depending on element |
| Server racks | Dark metal with emissive strips |
| Sofa/upholstery | Dark gray fabric — high roughness |

---

## 8. Triangle Budget

Current: ~22K tris. Budget: 150K.

**Allocation for this phase:**
- Avatars (8 × 200): 1,600
- Room detailing (screens, monitors, chairs, sofa, plants): 15,000
- Ceiling planes + details: 3,000
- Floor refinement: 2,000
- **Total added:** ~22K → new total ~44K (well within 150K budget)

---

## 9. Verification

- [ ] Peak View from above: walls transparent, all rooms visible
- [ ] Lounge: sectional sofa visible, cloud lamps glow softly, skyline window
- [ ] DC: circular glass ring with rainbow server racks visible through glass
- [ ] DevOps: monitors glow, rainbow cables, shield window shows DC, lightbox
- [ ] Meeting: oval table, ring light, glass walls, holographic puck
- [ ] CEO/COO: warm desks, cloud lamp, glass fronts
- [ ] Avatars: humanoid forms that sit DOWN (not lay), stand UP smoothly
- [ ] Scene no longer feels like "floor plan with things" — feels like walking through an office
- [ ] Lighting: ambient visible, emissive elements soft, room depth apparent
- [ ] Zero JS errors
- [ ] GLB under 150K triangles after build
