# 110lymph.nl 3D Office — v2.0.0 (phases 4–9)

Implements Build Spec v2.0 §9–§13 on top of Phase 1 (skeleton) + Phase 2 (bridge),
plus the five VF dashboard features.

## Quick start (no Hermes needed — demo mode)

```
npm install
npx vite public
```

Open the URL. With no adapter running, the app enters **DEMO MODE** automatically
and drives everything itself: card lifecycles, a gold key-comment ping at a desk,
normal/high/alert announcements, a model-fallback amber flash, a Thermic
gateway-down (collapsed pose + red card pulse) and recovery, live token/cost
counters, the infra strip, and timeline pills. Steering buttons work locally
(pause storekeeper → cascade to children, two-click kill).

## Phase 5 — Ray's feedback (June 2026)

- **Lighting**: ambient ~3x + hemisphere skylight (1.5), accent emissives doubled,
  one pendant point light per room, corridor overhead strip + guide lights,
  exposure 1.1 -> 1.3.
- **Peak View**: walls fade to 30% / ceilings to 10% with a 0.5 s tween and a
  subtle floor grid; restores on leaving Peak View.
- **Camera**: `Free Cam` button toggles unrestricted orbit/zoom; `Walk (WASD)`
  enters first-person mode (mouse look via pointer lock, Space or Esc exits).
- **Agents**: puppet avatars (sphere head + cylinder body, ~1.2 u). Head color =
  status (green active / orange idle / gray offline / red blocked), body color =
  role (gold Command, blue DevOps, white Specialists), particle ring while
  working, idle bob.
- **Transport**: vite `/ws` proxy pointed at :3001 while the adapter listens on
  :3000 — this was the permanent DEMO MODE. Proxy now defaults to :3000
  (override with `ADAPTER_TARGET`). Adapter handles the `/ws` upgrade path
  explicitly and serves `GET /snapshot`; if the WebSocket still fails, the
  client polls `/snapshot` every 2 s (badge shows "HTTP POLLING") before
  falling back to demo.

## Phase 6 — Live data + Backups & Docs pages

- **Transport**: WS -> `/snapshot` polling -> demo. Demo mode now only triggers
  when the adapter is unreachable over HTTP (network error); while polling, the
  client retries the WebSocket every 15 s and silently upgrades back.
- **Backups tab** (HUD): per-system status grid (TrueNAS, Vaultwarden, K3s
  volumes, VM snapshots) — last run + duration, next scheduled, 5-run size
  sparkline, green/orange/red with red pulse on failures. Data:
  `GET /api/backups`, fed by `adapter/sources/storekeeper.js` reading the
  StoreKeeper scan report at `adapter/data/storekeeper-report.json`
  (path: `mapping.json "backupsSource"`; a sample file ships in the repo —
  StoreKeeper should overwrite it after each scan). Client polls every 5 min.
- **Docs tab** (HUD): file-tree browser (skills/, souls/, memory/, docs/) with
  in-app markdown rendering (built-in renderer, no deps). Roots default to
  `<dirname(HERMES_DB)>/<name>`, override via `mapping.json "docsRoots"`. If no
  roots are available and `"docsUrl"` is set, the panel embeds that site in an
  iframe. Endpoints: `GET /api/docs/tree`, `GET /api/docs/file?path=`.
- **Live roster**: `GET /api/agents` returns `{id, name, role, group, status,
  lastSeen, anchor}`. Online agents claim a desk (work pool), idle/recently
  offline agents stand ghosted at their last position, agents offline >24 h are
  removed. Polled every 30 s; demo mode supplies its own roster.

Note: the adapter keeps its zero-dependency stdlib WebSocket (RFC6455) rather
than the `ws` npm package — same behavior (push snapshot on connect, 2 s kanban
diff broadcast), no new deps. `storekeeper` source is plain CJS (`.js`, not
`.ts`) to match the adapter.

## Phase 7 — Docs drawer + dashboard embed

- **Docs Portal v2**: the Docs tab now opens a 380px frosted-glass drawer that
  slides in from the right. Tree view of skills/, souls/, memory/, docs/;
  clicking a file renders markdown inline (built-in renderer, no deps) with a
  back button to return to the tree. States: skeleton shimmer while loading,
  "Docs unavailable — adapter offline", "No files in this folder". Adapter
  endpoints unchanged.
- **Embed mode**: load with `?embed=1` (the VF Dashboard iframe at /office).
  Adds `body.embed` + a "← Dashboard" link (top-left, `window.top` redirect,
  cross-origin safe). Preset buttons and camera controls untouched; the
  existing resize handler already fits the canvas to the iframe viewport.
  Without the flag, standalone behavior is identical to Phase 6.

## Phase 7b — Dashboard integration + agent drill-down

- **Embed v2**: embed mode now also auto-detects framing (`window.self !==
  window.top`), not just `?embed=1`. While embedded the office speaks the
  dashboard's postMessage protocol: `{type:'resize', height}` on load/resize,
  `{type:'nav', route:'/'}` when Peak View is clicked, and a 30 s
  `{type:'heartbeat', status:'ok'|'degraded'}` — `ok` only with a live
  WebSocket (polling/demo report `degraded`).
- **Backups**: rows click-expand to the last 5 runs (started, finished,
  duration, size, status, errors). New gray `never` status for systems with no
  recorded runs; run `error` fields are surfaced.
- **Docs**: the panel is now a floating window — drag by the header, resize
  from the corner, tree on the left / rendered markdown on the right. New
  `prompts/` doc root (same convention: defaults to `<hermes>/prompts`).
- **Agent drill-down**: click any puppet in the 3D scene to open a glass card
  with role, group, status, model + provider (fallback badge), sessions in the
  last 24 h, tokens today, cost, last seen and the agent's last 3 kanban tasks.
  Backed by the new `GET /api/agents/:id`; closes on Esc or clicking elsewhere.
  sessions24h counts usage pushes in the trailing 24 h.

## Phase 9 — The office IS the data

- **Live screens** (`public/screens.js`): the meeting media wall renders the
  actual kanban board (columns, counts, card titles, blocked cards in red);
  control-room monitors show session spend + top-agent cost bars; each DevOps
  desk monitor shows who is sitting there and their task, with scrolling
  "code" while they work; the CEO screen shows a calm working/blocked/spend
  summary; the lounge table draws a live agent network diagram. All canvas
  emissive textures on staggered redraw cadences - negligible cost.
- **Event moments** (`public/moments.js`): high/alert announcements pulse the
  control room amber/red; when a backup starts running StoreKeeper walks to
  the DC, watches for a bit and walks back; an agent gateway going down makes
  that room's light flicker with a red glow at the body; blocked cards flash
  red at the agent.
- **Performance**: static geometry merged by material+fade-class+shadow-class
  (~1650 meshes -> ~55 merged draws + the live/clickable few). Roughly 10x
  fewer draw calls; blinking LEDs survive (material-level animation).
- **Idle cinematic**: after 3 minutes without input the camera drifts slowly
  around the campus (wall-display mode); any input restores your exact view.

## Phase 8f — Pin + facing fixes

- **Sidebar pin**: button top-left of the HUD dock cycles auto (events expand
  it) -> pinned open -> pinned closed; persisted in localStorage.
- **Avatar facing**: the model's face/chest/shoes now point along its actual
  walking direction (-z forward, matching the movement quaternion) and leans
  go INTO the walk - this is what read as "walking backwards with backwards
  knees". Seated-agent audit found staff/devops/CEO desks were built on the
  wrong side of their anchors and chairs rotated 180°; all fixed, everyone
  faces their desk/table now.

## Phase 8e — "Make it a place" (Ray round 2)

- **Server racks v3**: every rack is now 8 stacked 1U units - faceplate,
  drive-bay groove, vent line, power LED (steady green), health LED (green
  fleet, occasional amber, rare red) and an activity LED that blinks with the
  data tick. Zone color reduced to a slim strip on the rack top. Reads as a
  data center, not a light installation.
- **Skyline v3**: three silhouette depth layers + far haze, setback rooftops,
  water towers, antennas with red beacons, warm/cool windows with soft glow,
  thin clouds, stars, moon, city light-pollution dome.
- **Grounds**: four grass lawns, 7 leaning palm trees, lit entry walkway +
  facade walk, a west parking row with 6 clearcoat-painted cars, 4 oak
  benches, hedges along the facade (entrance kept clear) and two entrance
  planters.

## Phase 8d — Ray's live-review fixes

- **Whites halved**: white panels 0.9 -> 0.45 emissive, staff/CEO ceilings get a
  dedicated dim material, devops lightbox area light 3.5 -> 1.7.
- **DC dimmed overall**: glass env reflections 1.8 -> 1.0, hex floor 1.3 -> 0.7,
  frost band 0.25 -> 0.12, LED zones 1.9 -> 1.5.
- **Server-room density**: every rack gets 16 small data LEDs in 6 phase groups
  that blink in pseudo-random bursts (office.tick() animation hook).
- **Avatars humanized v2**: per-agent skin + hair tones (stable hash of the
  name), neck, mouth, smaller status orb. Spawn/despawn are now pure opacity
  fades - no scale-from-the-feet, so nobody "comes out of the ground" - and
  the downed/collapse pose eases instead of snapping.
- **Environs**: the office now sits somewhere - plaza ground plane, 8 neighbor
  towers with lit-window facades, trees and street lamps on the approach.
- **Skyline v2**: 2048px dusk canvas with layered silhouettes, lit windows in
  two color temperatures, antennas, stars, a moon with glow, ground haze -
  wrapped on all four sides now.

## Phase 8c — Filmic pass (the practical ceiling for this stack)

- **Post stack**: SMAA anti-aliasing + custom grade shader (gentle S-curve
  contrast, teal-shadow/warm-highlight split toning, vignette) after bloom.
- **Area lights**: RectAreaLights for the lounge/meeting window glow, the
  DevOps lightbox and the meeting media wall; 3 corridor spotlight pools.
- **Bump maps**: all procedural textures double as bump maps - wood grain,
  concrete speckle, fabric weave and leather catch light.
- **Hero reflection**: a real-time Reflector disc under the DC hex floor
  (dark mirror, 1024px) - racks and LEDs reflect in the polished floor.
- **Set dressing**: keyboards + mice on every desk, alternating mugs/papers,
  rugs in lounge/meeting/CEO, staff desk lamps, brushed-metal door frames on
  all 7 openings, corridor skirting.

Honest scope note: this is "high-end archviz / polished indie game", not
AAA photorealism - that would need baked GI and scanned asset libraries.

## Phase 8b — Realism pass (animated-film look)

- **Image-based ambience**: `RoomEnvironment` + PMREM — floors, glass and
  metal pick up real reflections (`scene.environmentIntensity 0.4`).
- **Soft shadows**: PCFSoft shadow map from the key light (2048px, whole
  floorplan), every grounded object casts/receives.
- **SSAO**: contact ambient occlusion pass (replaces the plain RenderPass).
- **Rounded geometry**: `RoundedBoxGeometry` everywhere it matters — plump
  sofa cushions + leaning pillows, beveled desks/monitors/racks, recline-angle
  chairs with 5-star bases.
- **Procedural textures**: canvas-generated wood grain (oak/dark/light),
  speckled concrete, fabric and leather — used as maps; floors are
  MeshPhysicalMaterial with clearcoat (polished look), DC glass has clearcoat
  + boosted env reflections.
- **Avatars**: capsule limbs/torso (smooth, organic), shadow-casting.

## Phase 8 — Visual + architectural overhaul (procedural, no Blender)

The office is now **generated entirely in code** at load time by
`public/office.js` — `office.glb` and the Blender pipeline are no longer used
(`office-art/` is kept for reference; `anchors.json` extracted from the
original GLB keeps all 62 anchors at their exact Phase 3 positions).

What the procedural build delivers (~830 objects):

- Real building shell: corridors with doorways and headers, varied ceiling
  heights (lounge/meeting 4 m, offices 3 m, corridor 2.8 m), exposed beams,
  recessed light panels, floor-to-ceiling south/west glazing with a canvas-
  rendered city skyline (lit windows) behind it.
- Lounge: L-sectional + spectrum pillows, oak coffee table with dashboard
  screen (clickable → Peak View), 5 cloud pendants, living green wall (70
  plants), shelves, palm.
- Data center: circular glass ring with frosted brand band, 14 closed-lid
  racks (bezels, vent grooves, blue→red LED zone gradient, status dots, cable
  arms), hex floor with glowing seams (single merged mesh), domed skylight
  with radial spokes. Racks clickable → Infrastructure.
- DevOps: 8 triple-monitor desks, rainbow cable bundles, RGB floor traces,
  amber shield window into the DC, edge-lit lightbox. Desks clickable →
  Agent Health.
- Meeting: oval table + silver trim, 8 chairs on the exact seat anchors,
  amber ring light, media wall (clickable → Kanban), holo puck.
- Control: curved spectrum-front command desk (clickable → Costs), neon cloud
  + amber circuit shield signs, equipment rack.
- CEO: oak desk, leather chair + loveseat, cloud lamp, glass front, wall
  screen (clickable → Docs), plant.
- Humanoid avatars (`avatars.js`): jointed mannequins that sit down properly,
  walk with gait + arm swing, fade in; role styling as clothing tint + glowing
  trim, status light above the head.
- Phase 8 light profile: balanced ambient, soft bloom, subtle depth fog,
  Peak View walls 50% + room name labels, 800 ms camera flights.

`mapping.json "dashboardUrl"` controls where standalone clicks open the
dashboard (embedded mode posts `{type:'nav', route}` instead).

## Production wiring

1. Run the Phase 2 stack (`office-bridge`), replacing its `adapter/index.js` and
   `adapter/config/*` with the updated ones in `adapter/` here (adds `/timeline`,
   the reminder scheduler, infra `type` passthrough, `/mapping.json`).
2. `npm run build`, copy `dist/*` + `public/office.glb` + `public/waypoints.json`
   into the adapter's `public/` dir. One origin: HTTP + WS + static on :3000.
3. Dev against a live adapter: `npx vite public` — vite proxies `/agents`,
   `/timeline`, `/announce`, `/mapping.json` and the `/ws` WebSocket to :3000.

## File map

| File | Spec |
|---|---|
| `public/main.js` | 3D app: bloom (§12), hologram, runtime overlays (§7.2), peak view, WS client, `window.sim` API (§9.1), demo fallback |
| `public/hud.js` | HUD (§9): strip/expand, agent cards, badges, hierarchy, infra strip (VF1), log + history panel (VF2), rAF batching |
| `public/steering.js` | §10: pause/resume/kill, cascade, countdown-ring confirm, in-flight guard |
| `public/notifications.js` | §7.1: pings, envelopes, CSS2D panels, per-state interrupts, queueing, announcements (§11.3) |
| `public/timeline.js` | VF3: 12-h pills from `/timeline`, click → fly to owner |
| `public/style.css` | All §9–§11 styling: border-pulse, amber-pulse, conic kill ring, dark glass |
| `public/demo.js` | Demo-mode event generator |
| `adapter/` | Phase 2 adapter + `/timeline`, reminder scheduler (VF4), `/mapping.json`, infra `type` |
| `adapter/config/mapping.json` | + `reminders`, `cronJobs`, `maintenance` keys |
| `adapter/config/agents.json` | + `vm-301`, `thermic`, `cloudnode-01` (`"type": "infrastructure"`) |

## Schedule config (VF3/VF4)

`reminders`/`cronJobs` entries take `intervalMinutes` **or** `dailyAt: "HH:MM"`;
`maintenance` takes an ISO `at` + `durationMinutes`. Reminders auto-fire
`system.announcement` (15 s scheduler tick, last-fired persisted in state.json,
so adapter restarts don't replay). `/timeline` expands the next 12 h, capped at
24 occurrences per entry.

## Verified in sandbox

Adapter integration test (synthetic kanban.db): `/timeline` returns sorted,
capped items with ≥3 cron occurrences; `/mapping.json` serves models+budgets;
snapshot carries the 3 infrastructure agents with `type`; a fast reminder
auto-fires `system.announcement` over the WebSocket. All browser modules pass
syntax checks; visual behavior needs a browser run (demo mode is the harness).

## Known scope decision

Persistent gateway agents (storekeeper etc.) live in the HUD; their 3D presence
is the card avatar working under their name (if any). Runtime overlays (paused/
down/killed) apply to that avatar when present, otherwise HUD-only — the office
doesn't fill with 14 idle standing robots.
