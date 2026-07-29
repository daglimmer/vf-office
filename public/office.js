// Phase 8 - procedural office. The entire building is generated here in
// Three.js at load time (no Blender, no GLB): real architecture with corridors,
// doors and ceilings, floor-to-ceiling city glazing, the lounge sectional +
// cloud pendants + green wall, the circular glass data center with closed-lid
// racks and the domed skylight, DevOps triple-monitor desks with rainbow cable
// bundles, the oval meeting table under the amber ring, the curved spectrum
// command desk, and the oak CEO suite.
//
// Naming conventions consumed elsewhere:
//   wall_* / mullion* / green_wall -> Peak View fade to 50%
//   ceiling_*                      -> Peak View fade to 10%
//   hot_<route>_*                  -> clickable (interactive.js)
// Anchors come from /anchors.json (extracted from the Phase 3 GLB - positions
// are bit-exact with what the old office.glb contained).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const SPECTRUM = ['#2E5BFF', '#9B30FF', '#FF3DBE', '#FF9E2C', '#FFE32C', '#3DFF7A'];
const ZONES = ['#2E5BFF', '#2E9BFF', '#3DFF7A', '#FFE32C', '#FF9E2C', '#FF4D4D'];

// layout constants (same as the Blender script)
const WX0 = 2.0, WX1 = 16.2, CX0 = 16.2, CX1 = 23.8, EX0 = 23.8, EX1 = 38.0;
const Z0 = 0.3, ZW1 = 17.2, DCX0 = 12.0, DCX1 = 28.0, DCZ1 = 27.6;
const H_LOUNGE = 4.0, H_OFFICE = 3.0, H_CORR = 2.8, H_MEET = 4.0;
const DC = { x: 20.0, z: 21.0, r: 5.0 };

export function buildOffice(report) {
  const G = new THREE.Group();
  G.name = 'office_v8';
  const anchors = new Map();
  for (const a of report.anchors) {
    anchors.set(a.name, {
      pos: new THREE.Vector3(...a.pos),
      quat: new THREE.Quaternion(...(a.quat ?? [0, 0, 0, 1])),
    });
  }
  // Seating fix: the lounge couch cushion sits higher (~0.53) and deeper than the
  // desk chairs, so agents on floor-level seat anchors sank into it and their shins
  // clipped through the cushion front. Lift the 8 couch seats and slide them toward
  // the coffee table (z=3) so they sit ON the cushion with legs off the front edge.
  for (let i = 1; i <= 8; i++) {
    const a = anchors.get(`lounge_seat_${String(i).padStart(2, '0')}`);
    if (!a) continue;
    a.pos.y += 0.05;
    a.pos.z += a.pos.z < 3 ? 0.26 : -0.26;
  }
  const A = n => anchors.get(n).pos;

  // ---------------------------------------------------------------- procedural textures (Phase 8b)
  function canvasTex(draw, w = 256, h = 256, rx = 1, ry = 1) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  let texSeed = 31;
  const trnd = () => (texSeed = (texSeed * 16807) % 2147483647) / 2147483647;
  function woodTex(base, dark, rx = 2, ry = 2) {
    return canvasTex((c, w, h) => {
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) {                       // grain streaks
        c.strokeStyle = `rgba(${dark},${0.12 + trnd() * 0.25})`;
        c.lineWidth = 0.5 + trnd() * 1.8;
        const y = trnd() * h;
        c.beginPath(); c.moveTo(0, y);
        for (let x = 0; x <= w; x += 16) c.lineTo(x, y + Math.sin(x * 0.05 + i) * 2.5 + trnd() * 2);
        c.stroke();
      }
      for (let i = 0; i < 7; i++) {                        // knots
        const x = trnd() * w, y = trnd() * h;
        c.strokeStyle = `rgba(${dark},.3)`; c.lineWidth = 1;
        c.beginPath(); c.ellipse(x, y, 3 + trnd() * 5, 2 + trnd() * 3, trnd(), 0, Math.PI * 2); c.stroke();
      }
    }, 256, 256, rx, ry);
  }
  function speckleTex(base, fleck, n = 900, rx = 4, ry = 4) {
    return canvasTex((c, w, h) => {
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      for (let i = 0; i < n; i++) {
        c.fillStyle = `rgba(${fleck},${0.04 + trnd() * 0.12})`;
        const r = 0.5 + trnd() * 2.2;
        c.beginPath(); c.arc(trnd() * w, trnd() * h, r, 0, Math.PI * 2); c.fill();
      }
      for (let i = 0; i < 14; i++) {                       // larger mottling
        c.fillStyle = `rgba(${fleck},.05)`;
        c.beginPath(); c.arc(trnd() * w, trnd() * h, 12 + trnd() * 30, 0, Math.PI * 2); c.fill();
      }
    }, 256, 256, rx, ry);
  }
  const T = {
    concrete: speckleTex('#1d2025', '200,205,215', 900, 5, 4),
    oak:      woodTex('#8a5a2e', '40,22,8', 2, 2),
    woodDark: woodTex('#2e2014', '10,6,2', 2, 2),
    woodLight: woodTex('#a97f4f', '70,48,24', 3, 3),
    fabric:   speckleTex('#3c3c42', '180,180,195', 1600, 3, 3),
    leather:  speckleTex('#4a2c18', '20,10,4', 500, 2, 2),
  };
  // Phase 8c: the same canvases double as bump maps - surfaces catch light
  const BUMP = { concrete: 0.012, oak: 0.02, woodDark: 0.02, woodLight: 0.02, fabric: 0.025, leather: 0.015 };

  // ---------------------------------------------------------------- materials
  // 9.5: low tier swaps physical (clearcoat) materials for plain standard -
  // clearcoat roughly doubles the lighting cost of every covered pixel.
  const _qp = new URLSearchParams(location.search);
  const LOWQ = (_qp.get('q') ?? (() => { try { return localStorage.getItem('officeQ'); } catch { return null; } })()) === 'low';
  const std = (name, o) => { const m = new THREE.MeshStandardMaterial(o); m.name = name; return m; };
  const phys = (name, o) => {
    if (LOWQ) {
      const { clearcoat, clearcoatRoughness, ...rest } = o;
      return std(name, rest);
    }
    const m = new THREE.MeshPhysicalMaterial(o); m.name = name; return m;
  };
  const M = {
    // floors: polished, slight clearcoat reflection (Phase 8b)
    concrete:  phys('dark_concrete', { map: T.concrete, bumpMap: T.concrete, bumpScale: BUMP.concrete, color: 0xcfd2d8, roughness: 0.34, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.12 }),   // Pass B: sharper clearcoat = polished-concrete sheen (was rough 0.42 / cc 0.45 / ccRough 0.35)
    woodDark:  phys('dark_wood',     { map: T.woodDark, bumpMap: T.woodDark, bumpScale: BUMP.woodDark, color: 0xffffff, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4 }),
    oak:       std('warm_oak',      { map: T.oak, bumpMap: T.oak, bumpScale: BUMP.oak, color: 0xffffff, roughness: 0.5 }),
    woodLight: std('light_wood',    { map: T.woodLight, bumpMap: T.woodLight, bumpScale: BUMP.woodLight, color: 0xffffff, roughness: 0.55 }),
    wall:      std('charcoal_wall', { color: 0x23262c, roughness: 0.5 }),
    glass:     phys('smoked_glass', { color: 0x9fb4c0, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false, envMapIntensity: 1.4 }),
    glassDC:   phys('dc_glass',     { color: 0xaaccd4, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.12, depthWrite: false, envMapIntensity: 1.0, clearcoat: 1, clearcoatRoughness: 0.05 }),   // 8d: DC dimmed
    metal:     std('brushed_metal', { color: 0xb9bdc4, roughness: 0.28, metalness: 0.95, envMapIntensity: 1.2 }),
    prop:      std('dark_prop',     { color: 0x17191e, roughness: 0.5 }),
    sofa:      std('sofa_gray',     { map: T.fabric, bumpMap: T.fabric, bumpScale: BUMP.fabric, color: 0xffffff, roughness: 0.95 }),
    leather:   phys('leather_brown', { map: T.leather, bumpMap: T.leather, bumpScale: BUMP.leather, color: 0xffffff, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.5 }),
    white:     std('white_panel',   { color: 0xdfe1e5, roughness: 0.6, emissive: 0xfff8e8, emissiveIntensity: 0.15 }),   // glare pass: was 0.45
    // Pass B: was bright white (#c9ccd2) - from the overhead/peak view the staff &
    // CEO ceiling tops read as glaring white slabs. Darkened to charcoal so roofs
    // are consistent with the other ceilings and the moody renders.
    whiteCeil: std('white_ceiling', { color: 0x262a30, roughness: 0.7 }),
    screen:    std('screen_code',   { color: 0x0a0f14, roughness: 0.3, emissive: 0x73c0ff, emissiveIntensity: 0.9 }),
    screenDash:std('screen_dash',   { color: 0x0a0f14, roughness: 0.3, emissive: 0x5ce6b8, emissiveIntensity: 0.85 }),
    cloudFrost:std('cloud_frost',   { color: 0xdde2e8, roughness: 0.4, transparent: true, opacity: 0.85 }),
    cloudCool: std('cloud_cool',    { color: 0x6cc4ff, emissive: 0x4db4ff, emissiveIntensity: 0.9 }),
    ringWarm:  std('ring_warm',     { color: 0xffb35c, emissive: 0xff9e38, emissiveIntensity: 1.0 }),
    neon:      std('neon_cyan',     { color: 0x4dd8ff, emissive: 0x4dd8ff, emissiveIntensity: 1.2 }),
    amber:     std('amber_neon',    { color: 0xffa733, emissive: 0xff9926, emissiveIntensity: 1.1 }),
    frost:     std('frost_band',    { color: 0xe6e8eb, roughness: 0.6, transparent: true, opacity: 0.7, emissive: 0xe6e8eb, emissiveIntensity: 0.04 }),
    hexf:      std('hex_floor',     { color: 0x9fd0ff, emissive: 0x8cc4ff, emissiveIntensity: 0.4 }),
    rack:      std('rack_metal',    { color: 0x101318, roughness: 0.4, metalness: 0.6 }),
    leaf:      [std('leaf_0', { color: 0x1f5c26, roughness: 0.75 }),
                std('leaf_1', { color: 0x2c7a30, roughness: 0.75 }),
                std('leaf_2', { color: 0x49983a, roughness: 0.75 })],
    soil:      std('living_wall',   { color: 0x182013, roughness: 0.95 }),
    shoe:      std('shoe',          { color: 0x14161a, roughness: 0.5 }),
  };
  const zoneMats = ZONES.map((c, i) => std(`rack_zone_${i}`,
    { color: new THREE.Color(c), emissive: new THREE.Color(c), emissiveIntensity: 0.9 }));
  // 8d: blinking data LEDs - 6 phase groups, animated by tick()
  const blinkMats = ZONES.map((c, i) => std(`rack_blink_${i}`,
    { color: 0x101820, emissive: new THREE.Color(c), emissiveIntensity: 0.8 }));
  // 8e: steady status LEDs (realistic server front - green fleet, few ambers, rare red)
  const srvOk = std('srv_ok', { color: 0x0a1410, emissive: 0x35d97a, emissiveIntensity: 1.0 });
  const srvAmber = std('srv_amber', { color: 0x141005, emissive: 0xffb02e, emissiveIntensity: 1.0 });
  const srvRed = std('srv_red', { color: 0x140808, emissive: 0xff4d4d, emissiveIntensity: 1.1 });
  const pillowMats = SPECTRUM.map((c, i) => std(`spectrum_${i}`,
    { color: new THREE.Color(c), roughness: 0.85, emissive: new THREE.Color(c), emissiveIntensity: 0.22 }));
  const cableMats = SPECTRUM.map((c, i) => std(`cable_${i}`,
    { color: new THREE.Color(c), emissive: new THREE.Color(c), emissiveIntensity: 0.8 }));

  // ---------------------------------------------------------------- helpers
  const D2R = Math.PI / 180;
  const NO_SHADOW = /^(backdrop|floor_dc_hexgrid|prop_trace|prop_guide|hot_|prop_band|prop_logo)/;
  function add(mesh, name) {
    mesh.name = name;
    if (!NO_SHADOW.test(name)) {                          // Phase 8b: grounded objects
      const tr = !!mesh.material?.transparent;
      mesh.castShadow = !tr;
      mesh.receiveShadow = !tr;
    }
    G.add(mesh); return mesh;
  }
  function box(name, x, y, z, sx, sy, sz, mat, rotDeg = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z); m.rotation.y = rotDeg * D2R;
    return add(m, name);
  }
  // rounded box - the de-blockifier (Phase 8b). r = corner radius.
  function rbox(name, x, y, z, sx, sy, sz, mat, rotDeg = 0, r = 0.04) {
    const rad = Math.min(r, sx / 2.2, sy / 2.2, sz / 2.2);
    const m = new THREE.Mesh(new RoundedBoxGeometry(sx, sy, sz, 2, rad), mat);
    m.position.set(x, y, z); m.rotation.y = rotDeg * D2R;
    return add(m, name);
  }
  function cyl(name, x, y, z, r, h, mat, seg = 20, rTop = null) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop ?? r, r, h, seg), mat);
    m.position.set(x, y, z);
    return add(m, name);
  }
  function sphere(name, x, y, z, r, mat, squash = 1, seg = 12, ring = 8) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, ring), mat);
    m.position.set(x, y, z); m.scale.y = squash;
    return add(m, name);
  }
  function torus(name, x, y, z, R, r, mat, seg = 32, tiltDeg = 90) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(R, r, 8, seg), mat);
    m.position.set(x, y, z); m.rotation.x = tiltDeg * D2R;   // 90 = flat (ring pendant)
    return add(m, name);
  }
  let wallN = 0, mullN = 0;
  const wall = (x, y, z, sx, sy, sz, mat, rot = 0) => box(`wall_${++wallN}`, x, y, z, sx, sy, sz, mat ?? M.wall, rot);
  const mull = (x, y, z, sx, sy, sz) => box(`mullion_${++mullN}`, x, y, z, sx, sy, sz, M.prop);

  function wallRunX(z, x0, x1, h, gaps = [], mat = null, t = 0.15) {
    let cur = x0;
    for (const [c, w] of gaps.sort((a, b) => a[0] - b[0])) {
      const a = c - w / 2, b = c + w / 2;
      if (a > cur) wall((cur + a) / 2, h / 2, z, a - cur, h, t, mat);
      wall((a + b) / 2, h - (h - 2.2) / 2, z, b - a, h - 2.2, t, mat);   // door header
      cur = b;
    }
    if (cur < x1) wall((cur + x1) / 2, h / 2, z, x1 - cur, h, t, mat);
  }
  function wallRunZ(x, z0, z1, h, gaps = [], mat = null, t = 0.15) {
    let cur = z0;
    for (const [c, w] of gaps.sort((a, b) => a[0] - b[0])) {
      const a = c - w / 2, b = c + w / 2;
      if (a > cur) wall(x, h / 2, (cur + a) / 2, t, h, a - cur, mat);
      wall(x, h - (h - 2.2) / 2, (a + b) / 2, t, h - 2.2, b - a, mat);
      cur = b;
    }
    if (cur < z1) wall(x, h / 2, (cur + z1) / 2, t, h, z1 - cur, mat);
  }
  function glazeX(z, x0, x1, h) {
    wall((x0 + x1) / 2, h / 2, z, x1 - x0, h, 0.06, M.glass);
    const n = Math.max(2, Math.round((x1 - x0) / 2));
    for (let i = 0; i <= n; i++) mull(x0 + (x1 - x0) * i / n, h / 2, z, 0.08, h, 0.12);
    mull((x0 + x1) / 2, 0.04, z, x1 - x0, 0.08, 0.12);
    mull((x0 + x1) / 2, h - 0.04, z, x1 - x0, 0.08, 0.12);
  }
  function glazeZ(x, z0, z1, h) {
    wall(x, h / 2, (z0 + z1) / 2, 0.06, h, z1 - z0, M.glass);
    const n = Math.max(2, Math.round((z1 - z0) / 2));
    for (let i = 0; i <= n; i++) mull(x, h / 2, z0 + (z1 - z0) * i / n, 0.12, h, 0.08);
    mull(x, 0.04, (z0 + z1) / 2, 0.12, 0.08, z1 - z0);
    mull(x, h - 0.04, (z0 + z1) / 2, 0.12, 0.08, z1 - z0);
  }
  // crisp glowing text via canvas texture (no font assets needed)
  function textPanel(name, text, w, h, x, y, z, faceDeg = 0, color = '#cfe8ff', font = 'bold 72px sans-serif') {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = Math.round(512 * h / w);
    const c2 = cv.getContext('2d');
    c2.fillStyle = color; c2.font = font;
    c2.textAlign = 'center'; c2.textBaseline = 'middle';
    c2.fillText(text, cv.width / 2, cv.height / 2);
    const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.y = faceDeg * D2R;
    return add(m, name);
  }
  // seeded pseudo-random (stable layout)
  let seed = 8;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ---------------------------------------------------------------- floors
  const floor = (n, x0, x1, z0, z1, mat) => box(n, (x0 + x1) / 2, -0.05, (z0 + z1) / 2, x1 - x0, 0.1, z1 - z0, mat);
  floor('floor_lounge', WX0, WX1, Z0, 5.75, M.concrete);
  floor('floor_staff', WX0, WX1, 5.75, 11.25, M.woodLight);
  floor('floor_devops', WX0, WX1, 11.25, ZW1, M.concrete);
  floor('floor_corridor', CX0, CX1, Z0, ZW1, M.concrete);
  floor('floor_meeting', EX0, EX1, Z0, 5.75, M.woodDark);
  floor('floor_control', EX0, EX1, 5.75, 11.5, M.concrete);
  floor('floor_ceo', EX0, EX1, 11.5, ZW1, M.oak);
  floor('floor_dc_hall', DCX0, DCX1, ZW1, DCZ1, M.concrete);

  // ---------------------------------------------------------------- architecture
  glazeX(Z0, WX0, WX1, H_LOUNGE);                       // south glazing: lounge
  glazeX(Z0, EX0, EX1, H_MEET);                         // south glazing: meeting
  wallRunX(Z0, CX0, CX1, H_CORR, [[20, 3.4]]);          // corridor entrance wall — now with a real doorway (Pass E)
  wallRunZ(WX0, Z0, 5.75, H_LOUNGE);                    // west: lounge solid (green wall)
  glazeZ(WX0, 5.75, 11.25, H_OFFICE);                   // west: staff window
  glazeZ(WX0, 11.25, ZW1, H_OFFICE);                    // west: devops window
  wallRunZ(EX1, Z0, ZW1, H_MEET);                       // east facade
  wallRunZ(DCX0, ZW1, DCZ1, H_OFFICE + 1.4);            // DC hall shell
  wallRunZ(DCX1, ZW1, DCZ1, H_OFFICE + 1.4);
  wallRunX(DCZ1, DCX0, DCX1, H_OFFICE + 1.4);
  wallRunX(ZW1, WX0, DCX0, H_OFFICE);                   // close wings to DC hall
  wallRunX(ZW1, DCX1, EX1, H_OFFICE);
  wallRunX(ZW1, CX0, CX1, H_CORR, [[20.0, 2.8]]);       // corridor -> DC opening
  wallRunZ(CX0, Z0, ZW1, H_CORR, [[3.0, 1.8], [8.5, 1.8], [14.0, 1.8]]);   // west doors
  wallRunZ(CX1, Z0, 11.5, H_CORR, [[3.0, 1.8], [8.75, 1.8]]);              // east doors
  glazeZ(CX1, 11.5, ZW1, H_CORR);                       // CEO glass front
  wallRunZ(CX1, 11.5, ZW1, H_CORR, [[14.25, 1.8]], M.glass, 0.04);
  wallRunX(5.75, WX0, CX0, H_OFFICE);                   // west dividers
  wallRunX(11.25, WX0, CX0, H_OFFICE);
  wallRunX(5.75, CX1, EX1, H_OFFICE, [], M.glass);      // meeting smoked glass
  wallRunX(11.5, CX1, EX1, H_OFFICE);

  // ceilings
  const ceil = (n, x0, x1, z0, z1, h, mat) => box(n, (x0 + x1) / 2, h, (z0 + z1) / 2, x1 - x0, 0.08, z1 - z0, mat ?? M.wall);
  ceil('ceiling_lounge', WX0, WX1, Z0, 5.75, H_LOUNGE);
  ceil('ceiling_staff', WX0, WX1, 5.75, 11.25, H_OFFICE, M.whiteCeil);   // 8d: was glaring
  ceil('ceiling_devops', WX0, WX1, 11.25, ZW1, H_OFFICE);
  ceil('ceiling_corridor', CX0, CX1, Z0, ZW1, H_CORR);
  ceil('ceiling_meeting', EX0, EX1, Z0, 5.75, H_MEET);
  ceil('ceiling_control', EX0, EX1, 5.75, 11.5, H_OFFICE);
  ceil('ceiling_ceo', EX0, EX1, 11.5, ZW1, H_OFFICE, M.whiteCeil);
  [[9, 8.5, H_OFFICE], [9, 14.3, H_OFFICE], [20, 4, H_CORR], [20, 12, H_CORR],
   [31, 8.75, H_OFFICE], [31, 14.25, H_OFFICE]].forEach(([x, z, h], i) =>
    box(`prop_ceillight_${i}`, x, h - 0.06, z, 1.6, 0.04, 0.7, M.white));
  for (let i = 0; i < 3; i++) box(`prop_beam_l${i}`, (WX0 + WX1) / 2, H_LOUNGE - 0.25, 1.4 + i * 1.6, WX1 - WX0, 0.18, 0.14, M.prop);
  for (let i = 0; i < 5; i++) box(`prop_beam_c${i}`, (CX0 + CX1) / 2, H_CORR - 0.2, 2 + i * 3.2, CX1 - CX0, 0.14, 0.12, M.prop);

  // ---------------------------------------------------------------- skyline backdrop (8d: dusk, layered, hazy)
  {
    const cv = document.createElement('canvas');
    cv.width = 2048; cv.height = 512;
    const c2 = cv.getContext('2d');
    const sky = c2.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, '#070b18'); sky.addColorStop(0.5, '#101a33');
    sky.addColorStop(0.78, '#2c2b48'); sky.addColorStop(1, '#544243');     // dusk
    c2.fillStyle = sky; c2.fillRect(0, 0, 2048, 512);
    for (let i = 0; i < 180; i++) {                                        // stars
      c2.fillStyle = `rgba(255,255,255,${0.12 + rnd() * 0.35})`;
      c2.fillRect(rnd() * 2048, rnd() * 200, 1.2, 1.2);
    }
    for (let i = 0; i < 7; i++) {                                          // thin clouds
      c2.fillStyle = 'rgba(120,130,170,.07)';
      c2.beginPath();
      c2.ellipse(rnd() * 2048, 60 + rnd() * 140, 120 + rnd() * 180, 10 + rnd() * 16, 0, 0, Math.PI * 2);
      c2.fill();
    }
    c2.fillStyle = 'rgba(235,240,255,.95)';                                // moon + glow
    c2.beginPath(); c2.arc(1620, 84, 20, 0, Math.PI * 2); c2.fill();
    c2.fillStyle = 'rgba(200,210,240,.18)';
    c2.beginPath(); c2.arc(1620, 84, 48, 0, Math.PI * 2); c2.fill();
    const pollution = c2.createRadialGradient(1024, 512, 80, 1024, 512, 800);  // city light dome
    pollution.addColorStop(0, 'rgba(255,170,90,.16)'); pollution.addColorStop(1, 'rgba(255,170,90,0)');
    c2.fillStyle = pollution; c2.fillRect(0, 0, 2048, 512);
    // layer 1: far haze silhouettes
    for (let i = 0; i < 60; i++) {
      const w = 26 + rnd() * 60, hh = 50 + rnd() * 110, x = rnd() * 2048;
      c2.fillStyle = 'rgba(42,52,84,.55)'; c2.fillRect(x, 512 - hh - 70, w, hh + 70);
    }
    // layer 2: mid towers, faint windows, water towers
    for (let i = 0; i < 42; i++) {
      const w = 34 + rnd() * 64, hh = 100 + rnd() * 180, x = rnd() * 2048;
      c2.fillStyle = '#141a2a'; c2.fillRect(x, 512 - hh, w, hh);
      c2.fillStyle = 'rgba(255,205,130,.35)';
      for (let wy = 512 - hh + 8; wy < 495; wy += 12)
        for (let wx = x + 4; wx < x + w - 5; wx += 10)
          if (rnd() < 0.16) c2.fillRect(wx, wy, 3.5, 4.5);
      if (rnd() < 0.3) {                                                   // rooftop water tower
        c2.fillStyle = '#10141f';
        c2.fillRect(x + w * 0.2, 512 - hh - 14, 11, 14);
        c2.beginPath(); c2.moveTo(x + w * 0.2 - 2, 512 - hh - 14);
        c2.lineTo(x + w * 0.2 + 13, 512 - hh - 14); c2.lineTo(x + w * 0.2 + 5.5, 512 - hh - 22);
        c2.closePath(); c2.fill();
      }
    }
    // layer 3: near towers - setback tops, brighter windows, antennas, beacons
    for (let i = 0; i < 26; i++) {
      const w = 50 + rnd() * 95, hh = 160 + rnd() * 260, x = rnd() * 2048;
      c2.fillStyle = '#0b0f18';
      c2.fillRect(x, 512 - hh, w, hh);
      const sb = w * (0.55 + rnd() * 0.2);                                 // setback crown
      c2.fillRect(x + (w - sb) / 2, 512 - hh - 18, sb, 18);
      // soft glow behind window field
      c2.fillStyle = 'rgba(255,190,110,.05)'; c2.fillRect(x + 2, 512 - hh + 4, w - 4, hh - 10);
      for (let wy = 512 - hh + 8; wy < 498; wy += 11) {
        for (let wx = x + 4; wx < x + w - 5; wx += 9) {
          const r = rnd();
          if (r < 0.30) {
            c2.fillStyle = r < 0.065 ? 'rgba(150,205,255,.85)' : 'rgba(255,206,120,.85)';
            c2.fillRect(wx, wy, 4, 5.5);
          }
        }
      }
      if (hh > 300) {                                                      // antenna + red beacon
        c2.fillStyle = '#0a0d14'; c2.fillRect(x + w / 2 - 1.5, 512 - hh - 46, 3, 46);
        c2.fillStyle = 'rgba(255,60,60,.95)';
        c2.beginPath(); c2.arc(x + w / 2, 512 - hh - 48, 2.6, 0, Math.PI * 2); c2.fill();
      }
    }
    const haze = c2.createLinearGradient(0, 360, 0, 512);
    haze.addColorStop(0, 'rgba(80,88,124,0)'); haze.addColorStop(1, 'rgba(80,88,124,.55)');
    c2.fillStyle = haze; c2.fillRect(0, 360, 2048, 152);
    const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), fog: false });
    mat.name = 'city_night';
    const sky1 = new THREE.Mesh(new THREE.PlaneGeometry(120, 30), mat);
    sky1.position.set(20, 11, -34); add(sky1, 'backdrop');
    const skyW = new THREE.Mesh(new THREE.PlaneGeometry(110, 30), mat);
    skyW.position.set(-32, 11, 13); skyW.rotation.y = Math.PI / 2; add(skyW, 'backdrop_west');
    const skyE = new THREE.Mesh(new THREE.PlaneGeometry(110, 30), mat);
    skyE.position.set(72, 11, 13); skyE.rotation.y = -Math.PI / 2; add(skyE, 'backdrop_east');
    const skyN = new THREE.Mesh(new THREE.PlaneGeometry(120, 30), mat);
    skyN.position.set(20, 11, 60); skyN.rotation.y = Math.PI; add(skyN, 'backdrop_north');
  }

  // ---------------------------------------------------------------- lounge
  for (const [zz, dz] of [[1.7, -0.45], [4.3, 0.45]]) {
    rbox(`prop_sofa_base_${zz}`, 8.5, 0.18, zz, 8.2, 0.36, 1.0, M.sofa, 0, 0.07);
    rbox(`prop_sofa_back_${zz}`, 8.5, 0.58, zz + dz, 8.2, 0.6, 0.28, M.sofa, 0, 0.09);
    for (let c = 0; c < 4; c++)                            // plump seat cushions
      rbox(`prop_sofa_cush_${zz}_${c}`, 5.05 + c * 1.97, 0.43, zz - dz * 0.1, 1.86, 0.2, 0.92, M.sofa, 0, 0.09);
  }
  rbox('prop_sofa_corner', 3.7, 0.18, 3.0, 1.0, 0.36, 3.6, M.sofa, 0, 0.07);
  rbox('prop_sofa_ccush', 3.7, 0.43, 3.0, 0.92, 0.2, 3.4, M.sofa, 0, 0.09);
  rbox('prop_sofa_cback', 3.25, 0.58, 3.0, 0.28, 0.6, 3.6, M.sofa, 0, 0.09);
  for (let i = 0; i < 8; i++) {
    const pw = rbox(`prop_pillow_${i}`, 5.0 + (i % 4) * 2.0, 0.62, i < 4 ? 1.52 : 4.48, 0.46, 0.34, 0.2,
        pillowMats[i % 6], 8 * ((i % 3) - 1), 0.1);
    pw.rotation.x = (i < 4 ? -1 : 1) * 0.22;               // lean against the backrest
  }
  rbox('prop_ctable', 8.5, 0.2, 3.0, 2.2, 0.4, 1.1, M.oak, 0, 0.05);
  box('hot_peak_table', 8.5, 0.415, 3.0, 1.7, 0.035, 0.8, M.screenDash);
  const cloudSpots = [[6, 2.1, 3.1], [8.2, 2.6, 2.0], [10.5, 2.3, 3.4], [12.5, 2.8, 2.6], [7.2, 3.0, 4.2]];
  cloudSpots.forEach(([x, y, z], i) => {
    sphere(`prop_cloudglow_l${i}`, x, y - 0.12, z, 0.16, i % 2 ? M.ringWarm : M.cloudCool, 1, 10, 6);
    for (let j = 0; j < 4; j++)
      sphere(`prop_cloud_l${i}_${j}`, x + Math.cos(j * 1.7 + i) * 0.25, y + (j % 2) * 0.1,
             z + Math.sin(j * 2.1 + i) * 0.18, 0.22 + (j % 3) * 0.05, M.cloudFrost, 0.65, 10, 6);
    box(`prop_cloudwire_l${i}`, x, (y + H_LOUNGE) / 2, z, 0.015, H_LOUNGE - y, 0.015, M.prop);
  });
  box('green_wall', WX0 + 0.12, 1.9, 3.0, 0.18, 3.6, 5.0, M.soil);
  for (let i = 0; i < 70; i++)
    sphere(`prop_leaf_${i}`, WX0 + 0.26, 0.25 + rnd() * 3.4, 0.7 + rnd() * 4.6,
           0.1 + rnd() * 0.09, M.leaf[i % 3], 0.7, 7, 5);
  [1.6, 2.2].forEach((y, i) => {
    box(`prop_shelf_${i}`, 13.5, y, 5.55, 2.4, 0.05, 0.3, M.oak);
    for (let j = 0; j < 3; j++)
      box(`prop_book_${i}${j}`, 12.8 + j * 0.7, y + 0.14, 5.55, 0.3, 0.24, 0.2, pillowMats[(i * 3 + j) % 6]);
  });
  cyl('prop_pot_lounge', 14.8, 0.25, 1.0, 0.3, 0.5, M.prop, 12);
  for (let j = 0; j < 6; j++)
    sphere(`prop_palm_${j}`, 14.8 + Math.cos(j) * 0.3, 1.0 + j * 0.12, 1.0 + Math.sin(j) * 0.3, 0.22, M.leaf[1], 0.5, 7, 5);

  // ---------------------------------------------------------------- desks & co
  function desk(idx, x, z, faceDeg, w, monitors, room, ultrawide) {
    rbox(`prop_desk_${room}${idx}`, x, 0.72, z, w, 0.06, 0.7, M.woodDark, faceDeg, 0.025);
    const a = faceDeg * D2R, fx = Math.sin(a), fz = Math.cos(a);
    for (const sx of [-1, 1])
      box(`prop_dleg_${room}${idx}${sx}`, x + Math.cos(a) * sx * (w / 2 - 0.08), 0.35,
          z - Math.sin(a) * sx * (w / 2 - 0.08), 0.06, 0.7, 0.6, M.metal, faceDeg);
    if (ultrawide) {
      // one big "59-inch" ultrawide panel instead of a cluster of small monitors
      const mx = x + fx * 0.24, mz = z + fz * 0.24;
      box(`prop_monbezel_${room}${idx}`, mx, 1.12, mz + fz * 0.005, 1.5, 0.5, 0.03, M.prop, faceDeg + 180);
      rbox(`prop_mon_${room}${idx}_0`, mx, 1.12, mz, 1.42, 0.42, 0.05, M.screen, faceDeg + 180, 0.02);
      box(`prop_monstand_${room}${idx}_0`, mx, 0.84, mz, 0.5, 0.18, 0.05, M.metal, faceDeg);
    } else {
      for (let mi = 0; mi < monitors; mi++) {
        const off = (mi - (monitors - 1) / 2) * 0.5;
        const mx = x + Math.cos(a) * off + fx * 0.22, mz = z - Math.sin(a) * off + fz * 0.22;
        const rot = faceDeg + (monitors === 1 || mi === 1 ? 0 : mi === 0 ? -14 : 14);
        rbox(`prop_mon_${room}${idx}_${mi}`, mx, 1.02, mz, 0.48, 0.3, 0.035, M.screen, rot + 180, 0.012);
        box(`prop_monstand_${room}${idx}_${mi}`, mx, 0.78, mz, 0.06, 0.14, 0.05, M.prop, rot);
      }
    }
    // Phase 8c set dressing: keyboard + mouse, sometimes a mug or papers
    rbox(`prop_kbd_${room}${idx}`, x - fx * 0.02, 0.755, z - fz * 0.02, 0.42, 0.025, 0.15, M.prop, faceDeg, 0.01);
    rbox(`prop_mouse_${room}${idx}`, x + Math.cos(a) * 0.32 - fx * 0.02, 0.755, z - Math.sin(a) * 0.32 - fz * 0.02,
         0.07, 0.03, 0.11, M.prop, faceDeg, 0.015);
    if (idx % 2 === 0) {
      cyl(`prop_mug_${room}${idx}`, x - Math.cos(a) * 0.5, 0.795, z + Math.sin(a) * 0.5, 0.045, 0.11,
          pillowMats[(idx * 2 + room.length) % 6], 10);
    } else {
      const pp = box(`prop_paper_${room}${idx}`, x - Math.cos(a) * 0.48, 0.752, z + Math.sin(a) * 0.48,
                     0.22, 0.008, 0.3, M.white, faceDeg + 9 * ((idx % 3) - 1));
      pp.material = pp.material.clone(); pp.material.emissiveIntensity = 0.12;
    }
  }
  function chair(idx, x, z, faceDeg, room, mat) {
    mat = mat ?? M.prop;
    const a = faceDeg * D2R;
    rbox(`prop_chair_${room}${idx}`, x, 0.45, z, 0.48, 0.1, 0.48, mat, faceDeg, 0.05);
    const back = rbox(`prop_chairback_${room}${idx}`, x - Math.sin(a) * 0.25, 0.78,
                      z - Math.cos(a) * 0.25, 0.46, 0.6, 0.08, mat, faceDeg, 0.05);
    back.rotation.x = -0.08;                              // slight recline
    cyl(`prop_chairpost_${room}${idx}`, x, 0.25, z, 0.03, 0.4, M.metal, 10);
    for (let l = 0; l < 5; l++) {                          // 5-star base
      const la = faceDeg * D2R + l * Math.PI * 2 / 5;
      rbox(`prop_chairleg_${room}${idx}_${l}`, x + Math.sin(la) * 0.14, 0.035,
           z + Math.cos(la) * 0.14, 0.05, 0.035, 0.3, M.metal, -la / D2R, 0.015);
    }
  }
  function ringPendant(name, x, y, z, R = 0.45) {
    torus(name, x, y, z, R, 0.035, M.ringWarm, 28, 90);
    box(name + '_wire', x, y + 0.5, z, 0.015, 1.0, 0.015, M.prop);
  }
  function cableBundle(name, x, z, faceDeg, n = 6) {
    const a = faceDeg * D2R;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 0.055;
      cyl(`${name}_${i}`, x + Math.cos(a) * off, 0.36, z - Math.sin(a) * off, 0.02, 0.72, cableMats[i % 6], 8);
    }
  }

  // ---------------------------------------------------------------- staff
  for (let i = 1; i <= 4; i++) {                          // 8f: anchors face +z
    const p = A(`doc_desk_${String(i).padStart(2, '0')}`);
    desk(i, p.x, p.z + 0.55, 0, 1.5, 1, 'st');
    chair(i, p.x, p.z, 0, 'st');
    ringPendant(`prop_ringp_st${i}`, p.x, 2.45, p.z + 0.4);
  }
  cableBundle('prop_cable_staff', A('doc_desk_02').x, A('doc_desk_02').z + 0.55, 0);

  // ---------------------------------------------------------------- devops
  for (let i = 1; i <= 8; i++) {
    const p = A(`work_desk_${String(i).padStart(2, '0')}`);
    const face = i <= 4 ? 180 : 0, dz = i <= 4 ? -0.55 : 0.55;   // 8f: face the desks
    desk(i, p.x, p.z + dz, face, 1.8, 1, 'dv', true);     // Pass C: one big ultrawide per desk (was 3 monitors)
    chair(i, p.x, p.z, face, 'dv');
    cableBundle(`prop_cable_dv${i}`, p.x, p.z + dz, face);
    if (i % 2 === 1) ringPendant(`prop_ringp_dv${i}`, p.x + 1.4, 2.5, p.z + dz);
  }
  {                                                     // clickable monitor field -> /agents
    const hot = box('hot_agents_desks', 8.5, 1.05, 14.25, 11.5, 0.9, 3.6, M.glass);
    hot.material = M.glass.clone(); hot.material.opacity = 0.05;
  }
  const traceMat = std('dv_trace', { color: 0x000000, emissive: 0x4dd8ff, emissiveIntensity: 0.8 });
  [[3, 12.2, 14.5, 12.2], [3, 16.3, 14.5, 16.3], [14.5, 12.2, 14.5, 16.3], [3, 14.25, 9, 14.25]]
    .forEach(([x0, z0, x1, z1], i) => {
      const L = Math.hypot(x1 - x0, z1 - z0);
      box(`prop_trace_${i}`, (x0 + x1) / 2, 0.012, (z0 + z1) / 2, L, 0.015, 0.05,
          traceMat, -Math.atan2(z1 - z0, x1 - x0) / D2R);
    });
  // (orange shield window between devops and the DC removed - Ray: too bright, no function)
  box('prop_lightbox', WX0 + 0.12, 1.8, 14.2, 0.08, 1.0, 2.6, M.white);
  textPanel('prop_logo_dv', '110lymph.nl', 2.2, 0.55, WX0 + 0.18, 1.8, 14.2, 90, '#1a1d22');

  // ---------------------------------------------------------------- meeting
  {
    const table = cyl('prop_meet_table', 31.5, 0.72, 3.0, 1.0, 0.07, M.prop, 36);
    table.scale.set(2.4, 1, 1.5);
    const trim = torus('prop_meet_trim', 31.5, 0.755, 3.0, 1.0, 0.015, M.metal, 36, 90);
    trim.scale.set(2.4, 1.5, 1);
    cyl('prop_meet_leg', 31.5, 0.36, 3.0, 0.3, 0.72, M.prop, 16);
    for (let i = 1; i <= 7; i++) {
      const a = anchors.get(`meet_seat_${String(i).padStart(2, '0')}`);
      const ang = 2 * Math.atan2(a.quat.y, a.quat.w) / D2R + 180;   // 8f
      chair(i, a.pos.x, a.pos.z, ang, 'mt');
    }
    const ao = anchors.get('meet_seat_ollie');
    chair(9, ao.pos.x, ao.pos.z, 90, 'mt', M.leather);
    torus('meet_ring', 31.5, 3.3, 3.0, 1.6, 0.05, M.ringWarm, 40, 90);
    box('hot_kanban_media', EX1 - 0.25, 1.7, 3.0, 0.1, 1.7, 3.2, M.screen);
    box('prop_media_frame', EX1 - 0.2, 1.7, 3.0, 0.06, 1.9, 3.5, M.prop);
    cyl('prop_holopuck', 31.5, 0.78, 3.0, 0.12, 0.04, M.neon, 16);
  }

  // ---------------------------------------------------------------- control (command center)
  // Straight-line philosophy (Ray): a clean STRAIGHT command desk with three
  // proportional wide screens + a straight rainbow under-glow strip, the cyan
  // cloud-logo + a dense amber circuit shield on the back wall, and an LED rack.
  {
    const cx = 31.5, cz = 7.9, W = 6.4;
    const deskMat = std('cmd_console', { color: 0x14171d, roughness: 0.42, metalness: 0.35 });
    const spec = ['#2e6bff', '#19c8ff', '#3dff7a', '#ffe32c', '#ff9e2c', '#ff4d4d'];
    // straight desk: body + top
    box('prop_cmddesk', cx, 0.37, cz, W, 0.74, 0.9, deskMat);
    rbox('prop_cmddesk_top', cx, 0.75, cz, W + 0.12, 0.06, 1.02, M.metal, 0, 0.03);
    // straight rainbow under-glow strip across the operator-facing (front) face
    const NG = 30;
    for (let i = 0; i < NG; i++) {
      const frac = i / (NG - 1), t = frac * (spec.length - 1);
      const col = new THREE.Color(spec[Math.floor(t)]).lerp(new THREE.Color(spec[Math.min(spec.length - 1, Math.ceil(t))]), t - Math.floor(t));
      const gm = new THREE.Mesh(new THREE.BoxGeometry(W / NG + 0.02, 0.5, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x04050a, emissive: col, emissiveIntensity: 1.4 }));
      gm.position.set(cx - W / 2 + (i + 0.5) / NG * W, 0.33, cz + 0.47); add(gm, `prop_cmdglow_${i}`);
    }
    // three proportional wide screens in a straight row, facing the operators (+z)
    [-2.1, 0, 2.1].forEach((dx, k) => {
      box(`prop_cmdbezel_${k}`, cx + dx, 1.34, cz + 0.4, 1.84, 0.92, 0.04, M.prop);
      box(`prop_cmdmon_${k}`, cx + dx, 1.34, cz + 0.42, 1.7, 0.8, 0.04, M.screenDash);
      box(`prop_cmdmonfoot_${k}`, cx + dx, 0.86, cz + 0.34, 0.5, 0.42, 0.06, M.metal);
    });
    // clickable cost surface inset on the desk top (hot_ route, for interactive.js)
    box('hot_costs_front_0', cx, 0.79, cz - 0.06, 2.2, 0.02, 0.5, zoneMats[2]);
    // operator chairs — chair 1 sits ON the ollie_station seat (Sentinel/Ollie),
    // chair 2 is a spare beside it; both face the desk/screens (south).
    chair(1, cx, cz + 0.85, 180, 'cmd', M.prop);          // == ollie_station (31.5, 8.75)
    chair(2, cx - 1.9, cz + 0.85, 180, 'cmd', M.prop);

    // ---- back wall: glowing cyan cloud-logo + dense amber circuit shield
    [[-0.62, 0.30], [-0.2, 0.42], [0.25, 0.36], [0.62, 0.28], [0.0, 0.22]].forEach(([dx, r], j) =>
      sphere(`prop_ncloud_${j}`, 29.6 + dx, 2.26 + (j % 2 ? 0.06 : 0), 5.95, r, M.neon, 0.55, 12, 8));
    textPanel('prop_logo_ctl', '110lymph.nl', 1.7, 0.4, 29.6, 2.22, 5.88, 180, '#e6f8ff', 'bold 52px sans-serif');
    {                                                     // dense amber circuit shield (canvas)
      const cv = document.createElement('canvas'); cv.width = 240; cv.height = 290;
      const c = cv.getContext('2d'); c.lineJoin = 'round';
      const path = () => { c.beginPath(); c.moveTo(120, 10); c.lineTo(218, 50); c.lineTo(218, 160); c.quadraticCurveTo(218, 250, 120, 282); c.quadraticCurveTo(22, 250, 22, 160); c.lineTo(22, 50); c.closePath(); };
      path(); c.fillStyle = 'rgba(255,160,50,0.12)'; c.fill();
      c.save(); path(); c.clip();                        // dense traces clipped to the shield
      c.strokeStyle = '#ffcd80'; c.fillStyle = '#ffcd80'; c.lineWidth = 2.3;
      let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      const node = (x, y, rr = 3) => { c.beginPath(); c.arc(x, y, rr, 0, 7); c.fill(); };
      c.beginPath(); c.moveTo(120, 26); c.lineTo(120, 256); c.stroke();   // central spine
      for (let y = 50; y < 252; y += 18) {                // horizontal rungs + nodes + stubs
        const w = 32 + r() * 60;
        c.beginPath(); c.moveTo(120 - w, y); c.lineTo(120 + w, y); c.stroke();
        node(120 - w, y); node(120 + w, y); node(120, y, 2.2);
        if (r() < 0.7) { c.beginPath(); c.moveTo(120 - w, y); c.lineTo(120 - w, y + (r() < 0.5 ? 11 : -11)); c.stroke(); }
        if (r() < 0.7) { c.beginPath(); c.moveTo(120 + w, y); c.lineTo(120 + w, y + (r() < 0.5 ? 11 : -11)); c.stroke(); }
      }
      for (let i = 0; i < 14; i++) {                      // secondary diagonal traces
        const x = 45 + r() * 150, y = 45 + r() * 200, dx = (r() - 0.5) * 46, dy = (r() - 0.5) * 46;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y + dy); c.stroke(); node(x, y, 2);
      }
      c.restore();
      path(); c.strokeStyle = '#ffb347'; c.lineWidth = 8; c.stroke();     // shield outline
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.7), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
      m.position.set(34.2, 2.4, 5.9); m.rotation.y = 180 * D2R; add(m, 'prop_shield_ctl');
    }
    // server rack to the side, with colored LED rows
    box('prop_ctlrack', 36.95, 1.1, 7.2, 0.7, 2.2, 1.0, M.rack);
    for (let r = 0; r < 9; r++)
      box(`prop_ctlrack_led_${r}`, 36.58, 0.45 + r * 0.22, 7.2, 0.04, 0.14, 0.72, zoneMats[r % 6]);
  }

  // ---------------------------------------------------------------- review station (work-acceptance loop)
  // A small standing podium in the control room where an agent presents work
  // to the reviewer(s) when their card is in the `review` column.
  {
    const p = A('review_station');
    // podium body
    rbox('prop_review_podium', p.x, 0.78, p.z, 1.0, 0.05, 0.6, M.metal, 0, 0.03);
    box('prop_review_podium_base', p.x, 0.38, p.z, 0.6, 0.76, 0.4, M.prop);
    // small screen facing the reviewers at the command desk (+x)
    box('prop_review_screen', p.x + 0.12, 1.08, p.z, 0.05, 0.35, 0.5, M.screen);
    // status ring above the presenter
    torus('prop_review_ring', p.x, 2.1, p.z, 0.35, 0.03, M.ringWarm, 28, 90);
  }

  // ---------------------------------------------------------------- ceo
  {
    const p = A('ceo_desk');                              // 8f: anchor faces -z
    rbox('prop_ceo_desk', p.x, 0.73, p.z - 0.5, 2.2, 0.08, 0.9, M.oak, 0, 0.035);
    for (const sx of [-1, 1]) box(`prop_ceo_dleg${sx}`, p.x + sx, 0.36, p.z - 0.5, 0.08, 0.72, 0.8, M.oak);
    chair(1, p.x, p.z, 180, 'ceo', M.leather);
    rbox('prop_ceo_sofa', 27.0, 0.22, 16.2, 1.8, 0.44, 0.8, M.leather, 0, 0.08);
    rbox('prop_ceo_cush', 27.0, 0.48, 16.12, 1.68, 0.16, 0.7, M.leather, 0, 0.07);
    rbox('prop_ceo_sofab', 27.0, 0.6, 16.55, 1.8, 0.52, 0.24, M.leather, 0, 0.09);
    box('prop_ceo_side', 28.3, 0.3, 16.2, 0.5, 0.6, 0.5, M.oak);
    cyl('prop_ceo_pot', 36.8, 0.25, 16.4, 0.25, 0.5, M.prop, 12);
    for (let j = 0; j < 5; j++)
      sphere(`prop_ceo_plant_${j}`, 36.8 + Math.cos(j * 2) * 0.2, 0.85 + j * 0.1, 16.4 + Math.sin(j * 2) * 0.2, 0.18, M.leaf[2], 0.6, 7, 5);
    sphere('prop_cloudglow_ceo', 31.5, 2.25, 14.0, 0.14, M.ringWarm, 1, 10, 6);
    for (let j = 0; j < 3; j++)
      sphere(`prop_cloud_ceo_${j}`, 31.5 + (j - 1) * 0.3, 2.4 + (j % 2) * 0.08, 14.0, 0.24, M.cloudFrost, 0.65, 10, 6);
    box('hot_docs_screen', EX1 - 0.25, 1.6, 14.25, 0.08, 1.1, 2.0, M.screen);
    textPanel('prop_logo_ceo', '110lymph.nl', 1.6, 0.4, EX1 - 0.32, 2.5, 14.25, -90, '#8a8f98');
  }

  // ---------------------------------------------------------------- data center
  {
    const { x: cx, z: cz, r: R } = DC;
    const seg = 48, doorBearing = 180;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * 360;
      if (Math.abs(((a0 - doorBearing + 180) % 360) - 180) < 12) continue;
      const rad = (a0 + 180 / seg) * D2R;
      const w = 2 * R * Math.tan(Math.PI / seg);
      box(`wall_dcg_${i}`, cx + Math.sin(rad) * R, 1.6, cz + Math.cos(rad) * R,
          w * 1.02, 3.2, 0.05, M.glassDC, -(a0 + 180 / seg));
      box(`prop_band_${i}`, cx + Math.sin(rad) * (R + 0.01), 1.45, cz + Math.cos(rad) * (R + 0.01),
          w * 1.02, 0.5, 0.02, M.frost, -(a0 + 180 / seg));
    }
    textPanel('prop_logo_dc', '110lymph.nl', 2.0, 0.45, cx, 1.45, cz - R - 0.08, 180, '#3a3f47');
    torus('prop_dcrim_t', cx, 3.2, cz, R, 0.06, M.metal, 48, 90);
    torus('prop_dcrim_b', cx, 0.08, cz, R, 0.05, M.metal, 48, 90);
    const n = 14;
    for (let i = 0; i < n; i++) {
      const ang = doorBearing + 30 + 300 * i / (n - 1);
      const rad = ang * D2R;
      const px = cx + Math.sin(rad) * 3.4, pz = cz + Math.cos(rad) * 3.4;
      const zone = zoneMats[Math.min(5, Math.floor(i / n * 6))];
      const face = -ang + 180;
      rbox(`rack_${i}`, px, 1.05, pz, 0.62, 2.1, 0.85, M.rack, face, 0.035);
      const bx = px - Math.sin(rad) * 0.445, bz = pz - Math.cos(rad) * 0.445;
      // 8e (Ray): REAL server fronts - 8 stacked 1U units per rack, each with a
      // faceplate, drive-bay groove, two steady status LEDs and one data LED
      // that blinks. Zone color is a subtle strip on top, not a light tube.
      const lat = (off) => [bx - Math.sin(rad) * 0.026 + Math.cos(rad) * off,
                            bz - Math.cos(rad) * 0.026 - Math.sin(rad) * off];
      box(`prop_rframe_${i}`, bx, 1.05, bz, 0.58, 2.02, 0.02, M.prop, face);
      for (let u = 0; u < 8; u++) {
        const uy = 0.28 + u * 0.225;
        const [fpx, fpz] = lat(0);
        box(`prop_rsrv_${i}_${u}`, fpx, uy, fpz, 0.54, 0.185, 0.028, M.rack, face);
        const [bgx, bgz] = lat(0.1);                       // drive-bay groove
        box(`prop_rbay_${i}_${u}`, bgx, uy - 0.03, bgz, 0.3, 0.05, 0.012, M.prop, face);
        const [hgx, hgz] = lat(0.1);                       // vent line above bays
        box(`prop_rvent_${i}_${u}`, hgx, uy + 0.05, hgz, 0.3, 0.018, 0.012, M.prop, face);
        // status LEDs: power (steady green), health (mostly green, some amber,
        // a rare red), activity (blinks via tick)
        const [l1x, l1z] = lat(-0.21);
        box(`prop_rok_${i}_${u}`, l1x, uy + 0.045, l1z, 0.018, 0.018, 0.012, srvOk, face);
        const health = (i * 7 + u) % 11 === 0 ? srvRed : (i + u) % 5 === 0 ? srvAmber : srvOk;
        const [l2x, l2z] = lat(-0.175);
        box(`prop_rhp_${i}_${u}`, l2x, uy + 0.045, l2z, 0.018, 0.018, 0.012, health, face);
        // activity LED — green-dominant (blinkMats[2]=green), a few blue/amber
        const actMat = blinkMats[[2, 2, 2, 0, 2, 2, 4, 2][(i + u) % 8]];
        const [l3x, l3z] = lat(-0.1925);
        box(`prop_ract_${i}_${u}`, l3x, uy - 0.04, l3z, 0.032, 0.014, 0.012, actMat, face);
        // two of the units are NETWORK SWITCHES: a dense row of green port link LEDs
        if (u === 3 || u === 6) {
          for (let p = 0; p < 12; p++) {
            const [ppx, ppz] = lat(-0.22 + p * 0.039);
            const pm = blinkMats[(i + u + p) % 11 === 0 ? 0 : (i + u + p) % 13 === 0 ? 4 : 2];   // mostly green
            box(`prop_rport_${i}_${u}_${p}`, ppx, uy + 0.018, ppz, 0.024, 0.02, 0.012, pm, face);
          }
        }
      }
      // zone indicator strip — green-dominant (occasional blue/amber), not a rainbow ring
      const [ztx, ztz] = lat(0);
      box(`rack_led_${i}`, ztx, 2.04, ztz, 0.5, 0.035, 0.014, zoneMats[[2, 2, 0, 2, 2, 4, 2][i % 7]], face);
      // cable management lying along the rack top (muted network colours, runs front-to-back)
      const [ctx, ctz] = lat(0);
      box(`prop_rcabletray_${i}`, ctx, 2.11, ctz, 0.5, 0.05, 0.55, M.prop, face);
      const dcCableCol = ['#365a7e', '#3a6a4c', '#54565e', '#3a5e7a', '#436a4a'];   // blues/greens/grey
      for (let cb = 0; cb < 5; cb++) {
        const [cbx, cbz] = lat(-0.18 + cb * 0.09);
        const cm = std(`dc_cable_${i}_${cb}`, { color: parseInt(dcCableCol[cb].slice(1), 16), roughness: 0.55 });
        box(`prop_rcable_${i}_${cb}`, cbx, 2.15, ctz, 0.024, 0.024, 0.52, cm, face);
      }
    }
    const hotDC = cyl('hot_infra_ring', cx, 1.1, cz, 3.9, 2.3, M.glassDC.clone(), 24);
    hotDC.material.opacity = 0.04; hotDC.material.name = 'dc_hot';
    // hex floor with glowing seams - single merged geometry
    {
      const pos = [], idx = [];
      const hr = 0.55;
      for (let q = -8; q <= 8; q++) for (let r = -8; r <= 8; r++) {
        const hx = q * hr * 1.5, hz = (r + (q % 2 ? 0.5 : 0)) * hr * Math.sqrt(3);
        if (Math.hypot(hx, hz) > R - 0.4) continue;
        for (let e = 0; e < 6; e++) {
          const a1 = Math.PI / 3 * e + Math.PI / 6, a2 = Math.PI / 3 * (e + 1) + Math.PI / 6;
          const x1 = hx + Math.cos(a1) * hr * 0.96, z1 = hz + Math.sin(a1) * hr * 0.96;
          const x2 = hx + Math.cos(a2) * hr * 0.96, z2 = hz + Math.sin(a2) * hr * 0.96;
          let nx = z2 - z1, nz = -(x2 - x1);
          const L = Math.hypot(nx, nz) || 1;
          nx = nx / L * 0.015; nz = nz / L * 0.015;
          const b = pos.length / 3;
          for (const [vx, vz] of [[x1 - nx, z1 - nz], [x1 + nx, z1 + nz], [x2 + nx, z2 + nz], [x2 - nx, z2 - nz]])
            pos.push(cx + vx, 0.015, cz + vz);
          idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      add(new THREE.Mesh(geo, M.hexf), 'floor_dc_hexgrid');
    }
    // domed radial skylight
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(R + 0.4, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.glassDC);
    dome.position.set(cx, 3.2, cz);
    add(dome, 'ceiling_dc');
    for (let i = 0; i < 12; i++) {
      const ang = i * 30, rad = ang * D2R;
      const sp = box(`prop_dspoke_${i}`, cx + Math.sin(rad) * R / 2, 4.45, cz + Math.cos(rad) * R / 2,
                     0.08, 0.1, R, M.metal);
      sp.rotation.set(-28 * D2R, -ang * D2R, 0, 'YXZ');
    }
  }

  // ---------------------------------------------------------------- 8c set dressing: rugs, lamps, frames, mirror
  const rug = (n, x, z, w, d, c) => {
    const m = std(n + '_mat', { color: c, roughness: 1, bumpMap: T.fabric, bumpScale: 0.02 });
    box(n, x, 0.012, z, w, 0.018, d, m);
  };
  rug('prop_rug_lounge', 8.5, 3.0, 5.4, 3.4, 0x2a2d36);
  rug('prop_rug_meeting', 31.5, 3.0, 6.0, 4.2, 0x23262e);
  rug('prop_rug_ceo', 31.5, 14.5, 4.4, 3.2, 0x33291e);
  for (let i = 1; i <= 4; i++) {                          // staff desk lamps
    const p = A(`doc_desk_${String(i).padStart(2, '0')}`);
    box(`prop_lamparm_${i}`, p.x - 0.6, 0.88, p.z + 0.7, 0.03, 0.32, 0.03, M.metal);
    const head = sphere(`prop_lamphead_${i}`, p.x - 0.55, 1.05, p.z + 0.62, 0.06, M.ringWarm, 0.7, 8, 6);
    head.material = M.ringWarm.clone(); head.material.emissiveIntensity = 0.8;
  }
  // door frames at every opening (verticals + lintel)
  const frame = (n, x, z, alongX) => {
    const fw = 1.92;
    if (alongX) {                                          // door in a wall that runs along X
      box(`${n}_l`, x - fw / 2, 1.12, z, 0.09, 2.24, 0.22, M.metal);
      box(`${n}_r`, x + fw / 2, 1.12, z, 0.09, 2.24, 0.22, M.metal);
      box(`${n}_t`, x, 2.26, z, fw + 0.09, 0.09, 0.22, M.metal);
    } else {
      box(`${n}_l`, x, 1.12, z - fw / 2, 0.22, 2.24, 0.09, M.metal);
      box(`${n}_r`, x, 1.12, z + fw / 2, 0.22, 2.24, 0.09, M.metal);
      box(`${n}_t`, x, 2.26, z, 0.22, 0.09, fw + 0.09, M.metal);
    }
  };
  frame('prop_frame_lounge', CX0, 3.0, false);
  frame('prop_frame_staff', CX0, 8.5, false);
  frame('prop_frame_devops', CX0, 14.0, false);
  frame('prop_frame_meeting', CX1, 3.0, false);
  frame('prop_frame_control', CX1, 8.75, false);
  frame('prop_frame_ceo', CX1, 14.25, false);
  frame('prop_frame_dc', 20.0, ZW1, true);
  // skirting along the corridor walls
  for (const x of [CX0 + 0.1, CX1 - 0.1])
    box(`prop_skirt_${Math.round(x * 10)}`, x, 0.07, (Z0 + ZW1) / 2, 0.05, 0.14, ZW1 - Z0 - 0.5, M.prop);
  // Phase 8c hero reflection: subtle dark mirror under the DC hex floor.
  // Disable with ?mirror=0 if a driver misbehaves; failures are non-fatal.
  try {
    const _p = new URLSearchParams(location.search);
    const _q = _p.get('q') ?? (() => { try { return localStorage.getItem('officeQ'); } catch { return null; } })();
    if (_p.get('mirror') !== '0' && _q !== 'low') {        // 9.2: mirror is high-quality only
      const mirror = new Reflector(new THREE.CircleGeometry(DC.r - 0.35, 48), {
        textureWidth: 512, textureHeight: 512, color: 0x1d2126,
      });
      mirror.rotation.x = -Math.PI / 2;
      mirror.position.set(DC.x, 0.006, DC.z);
      add(mirror, 'floor_dc_mirror');
    }
  } catch (e) { console.warn('[office] DC mirror disabled:', e); }

  // ---------------------------------------------------------------- environs (8d): the office sits in a real place
  {
    const plazaMat = phys('plaza', { map: speckleTex('#141619', '110,118,132', 700, 10, 8),
      bumpMap: T.concrete, bumpScale: 0.01, color: 0xb8bcc4, roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.5 });
    box('floor_plaza', 20, -0.17, 14, 130, 0.2, 100, plazaMat);
    // neighbor towers with lit-window facades (emissiveMap from canvas)
    const towerTex = () => canvasTex((c, w, h) => {
      c.fillStyle = '#07090d'; c.fillRect(0, 0, w, h);
      for (let wy = 8; wy < h - 8; wy += 14)
        for (let wx = 6; wx < w - 6; wx += 11) {
          const r = rnd();
          // tall/narrow windows (was 6x8 wide → read as a "row of cars"); the
          // small per-cell height jitter stops them lining up into uniform rows.
          if (r < 0.30) { c.fillStyle = r < 0.07 ? 'rgba(150,200,255,.85)' : 'rgba(255,205,125,.8)'; c.fillRect(wx, wy, 4, 9 + ((wx + wy) % 3)); }
        }
    }, 128, 256, 1, 1);
    const towers = [
      [-16, 5, 26, 9, 9], [-13, -10, 18, 8, 8], [-18, 36, 22, 10, 9],
      [54, 2, 30, 10, 10], [57, 20, 16, 9, 9], [50, 38, 24, 9, 8],
      [8, 44, 20, 11, 9], [34, 46, 27, 10, 10],
    ];
    towers.forEach(([x, z, h, w, d], i) => {
      const tx = towerTex();
      const tm = std(`tower_${i}`, { color: 0x10131a, roughness: 0.7,
        emissive: 0xffffff, emissiveMap: tx, emissiveIntensity: 0.75 });
      box(`env_tower_${i}`, x, h / 2 - 0.1, z, w, h, d, tm);
      box(`env_towertop_${i}`, x, h + 0.2, z, w * 0.6, 0.5, d * 0.6, M.prop);
      if (i % 3 === 0) box(`env_antenna_${i}`, x, h + 1.6, z, 0.15, 2.4, 0.15, M.prop);
    });
    // plaza trees (south + west approach). Fuller, layered canopies of varied
    // leaf puffs instead of 3 blobs on a stick — reads as a tree, not a roadblock.
    // (moved the x=18 tree off the entrance.)
    // framed around the forecourt reflecting pools (outer flanks + by the walk)
    const treeSpots = [[2, -3], [3, -9], [37, -3], [38, -9], [16.5, -1.5], [23.5, -1.5], [-6, 8], [44, 8]];
    treeSpots.forEach(([x, z], i) => {
      const th = 1.7 + rnd() * 0.5;
      cyl(`env_trunk_${i}`, x, th / 2, z, 0.13, th, M.woodDark, 8, 0.09);   // gently tapered trunk
      for (let j = 0; j < 8; j++) {
        const a = rnd() * Math.PI * 2, rad = 0.6 * Math.sqrt(rnd());
        sphere(`env_crown_${i}_${j}`, x + Math.cos(a) * rad, th + 0.2 + rnd() * 0.85,
               z + Math.sin(a) * rad, 0.4 + rnd() * 0.32, M.leaf[(i + j) % 3], 0.95, 12, 9);
      }
    });
    // street lamps along the south walk (flank the entrance — none at x=20)
    [3, 11, 29, 37].forEach((x, i) => {
      cyl(`env_lamppost_${i}`, x, 1.6, -2.5, 0.05, 3.2, M.metal, 8);
      const head = sphere(`env_lamphead_${i}`, x, 3.3, -2.5, 0.12, M.ringWarm.clone(), 0.8, 8, 6);
      head.material.emissiveIntensity = 1.3;
      head.material.name = 'lamp_glow';
    });

    // ---- 8e (Ray): finish the grounds - lawns, palms, path, parking, benches
    const grassMat = std('grass', { map: speckleTex('#1c3a1e', '90,160,80', 1400, 6, 6),
      bumpMap: T.fabric, bumpScale: 0.02, color: 0xb9ccb0, roughness: 1 });
    const lawn = (n, x, z, w, d) => box(n, x, -0.075, z, w, 0.02, d, grassMat);
    lawn('env_lawn_sw', -9, -8, 26, 26);
    lawn('env_lawn_se', 50, -6, 30, 28);
    lawn('env_lawn_n', 20, 40, 56, 20);
    lawn('env_lawn_w', -10, 16, 14, 20);
    // lit walkway from the street to the entrance + facade walk
    const pathMat = phys('path', { map: speckleTex('#2a2d33', '170,175,185', 500, 6, 2),
      color: 0xcfd2d8, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5 });
    box('floor_path_entry', 20, -0.06, -9.5, 4.4, 0.025, 20, pathMat);
    box('floor_path_facade', 20, -0.06, -1.4, 42, 0.025, 2.6, pathMat);
    // palm trees on the lawns
    const palmSpots = [[-12, -10], [-5, -3], [46, -10], [55, -2], [62, -12], [14, 41], [30, 42]];
    palmSpots.forEach(([x, z], i) => {
      let px = x, pz = z;
      for (let seg = 0; seg < 4; seg++) {                   // gently leaning trunk
        cyl(`env_palmtrunk_${i}_${seg}`, px, 0.5 + seg * 0.95, pz, 0.11 - seg * 0.015, 1.0, M.woodDark, 7);
        px += 0.12; pz += 0.05;
      }
      for (let f = 0; f < 6; f++) {                         // fronds
        const fa = f / 6 * Math.PI * 2;
        const frond = sphere(`env_frond_${i}_${f}`, px + Math.cos(fa) * 0.85, 4.05 + Math.sin(f * 2.1) * 0.1,
                             pz + Math.sin(fa) * 0.85, 0.55, M.leaf[(i + f) % 3], 0.16, 8, 5);
        frond.rotation.y = -fa;
        frond.rotation.z = 0.35;
      }
      sphere(`env_palmtop_${i}`, px, 3.95, pz, 0.16, M.woodDark, 1, 7, 5);
    });
    // parking row removed (Ray): the low-poly cars clipped the building and read
    // poorly. Keep the empty lot only.
    box('floor_parking', -13, -0.065, 12, 6.5, 0.02, 22, pathMat);
    // benches along the facade walk
    for (let i = 0; i < 4; i++) {
      const bx2 = 5 + i * 10;
      rbox(`env_bench_${i}`, bx2, 0.42, -1.4, 1.7, 0.07, 0.5, M.oak, 0, 0.03);
      for (const sx of [-0.7, 0.7])
        box(`env_benchleg_${i}_${sx}`, bx2 + sx, 0.2, -1.4, 0.08, 0.4, 0.45, M.metal);
    }

    // ---- Pass E forecourt "wow": Apple-campus approach — two reflecting pools
    // flanking the walk, warm uplight fixtures, and a glowing logo monolith.
    {
      const water = std('pool_water', { color: 0x0a141a, emissive: 0x0a2630, emissiveIntensity: 0.22, roughness: 0.06, metalness: 0.75 });
      const pool = (name, x, z, w, d) => {
        if (!LOWQ) {
          try {
            const r = new Reflector(new THREE.PlaneGeometry(w, d), { textureWidth: 256, textureHeight: 256, color: 0x10171c });
            r.rotation.x = -Math.PI / 2; r.position.set(x, -0.02, z); add(r, name);
          } catch (e) { box(name, x, -0.03, z, w, 0.02, d, water); }
        } else { box(name, x, -0.03, z, w, 0.02, d, water); }
        const cw = 0.22;                                   // stone coping rim
        const cope = (cx, cz, csx, csz, k) => box(`${name}_cope_${k}`, cx, 0.03, cz, csx, 0.12, csz, M.metal);
        cope(x, z - d / 2 - cw / 2, w + cw * 2, cw, 'n'); cope(x, z + d / 2 + cw / 2, w + cw * 2, cw, 's');
        cope(x - w / 2 - cw / 2, z, cw, d, 'w'); cope(x + w / 2 + cw / 2, z, cw, d, 'e');
      };
      pool('prop_pool_l', 10.5, -5.5, 7, 6);
      pool('prop_pool_r', 29.5, -5.5, 7, 6);

      // warm uplight fixtures (emissive — tier-safe) at tree bases + portico columns
      const up = std('uplight', { color: 0x1a1206, emissive: 0xffb259, emissiveIntensity: 1.5 });
      [[2, -3], [3, -9], [37, -3], [38, -9], [16.5, -1.5], [23.5, -1.5], [17.1, -3.9], [22.9, -3.9]]
        .forEach(([x, z], i) => cyl(`prop_uplight_${i}`, x, 0.05, z, 0.14, 0.05, up, 12));

      // logo monolith at the street end of the walk — the HQ marker
      const mx = 20, mz = -13.6;
      box('prop_monolith', mx, 1.35, mz, 1.3, 2.7, 0.32, M.glassDC);
      box('prop_monolith_core', mx, 1.45, mz, 0.95, 2.2, 0.1, std('monolith_core', { color: 0x05080c, emissive: 0x223a52, emissiveIntensity: 0.55 }));
      box('prop_monolith_base', mx, 0.13, mz, 1.6, 0.26, 0.74, M.metal);
      box('prop_monolith_glow', mx, 0.28, mz, 1.4, 0.04, 0.55, std('mono_glow', { color: 0x0b0d12, emissive: 0x4dd8ff, emissiveIntensity: 0.7 }));
      textPanel('prop_monolith_logo', '110lymph.nl', 1.05, 0.42, mx, 1.85, mz - 0.18, 180, '#d6efff', 'bold 38px sans-serif');
    }

    // ---- Pass E: a real front entrance at the corridor face (x=20, z=Z0).
    // The corridor wall now has a 3.4m doorway; dress it as a grand entrance:
    // glass doors, a cantilevered portico with a downlight soffit, columns, a
    // glowing sign on the fascia, and bollard lights flanking the approach.
    {
      const ez = Z0;                                      // building front line (0.3)
      const sillMat = std('entrance_sill', { color: 0x0b0d12, emissive: 0x4dd8ff, emissiveIntensity: 0.5 });
      const soffitMat = std('canopy_soffit', { color: 0x0b0d12, emissive: 0xbfe0ff, emissiveIntensity: 0.55 });
      // glass double doors set into the opening + slim handles
      for (const sx of [-1, 1]) {
        rbox(`prop_entrance_door_${sx > 0 ? 'r' : 'l'}`, 20 + sx * 0.82, 1.1, ez, 1.58, 2.18, 0.05, M.glassDC, 0, 0.02);
        box(`prop_entrance_handle_${sx > 0 ? 'r' : 'l'}`, 20 + sx * 0.16, 1.1, ez - 0.06, 0.04, 0.5, 0.04, M.metal);
      }
      // raised plinth + lit threshold mat just outside the doors (entrance gravitas)
      box('prop_entrance_plinth', 20, -0.02, ez - 0.7, 8.6, 0.12, 1.7, M.metal);
      box('prop_entrance_step', 20, -0.07, ez - 1.85, 7.6, 0.1, 0.6, M.metal);
      box('prop_entrance_sill', 20, 0.055, ez - 0.7, 3.5, 0.03, 1.5, sillMat);
      // cantilevered GLASS portico/canopy projecting over the walk
      const cz = ez - 2.1;
      rbox('prop_canopy', 20, 3.04, cz, 6.4, 0.1, 4.6, M.glassDC, 0, 0.04);   // glass roof panel
      for (const [n, fx, fz, fsx, fsz] of [['s', 0, 2.3, 6.4, 0.1], ['w', -3.2, 0, 0.1, 4.6], ['e', 3.2, 0, 0.1, 4.6]])
        box(`prop_canopy_frame_${n}`, 20 + fx, 3.04, cz + fz, fsx, 0.14, fsz, M.metal);   // slim edge frame (front edge = fascia)
      box('prop_canopy_soffit', 20, 2.92, cz, 5.8, 0.03, 4.0, soffitMat);   // recessed downlight panel
      box('prop_canopy_fascia', 20, 3.02, cz - 2.34, 6.4, 0.72, 0.08, M.prop);
      textPanel('prop_entrance_sign', '110lymph.nl', 4.4, 0.62, 20, 3.02, cz - 2.4, 180, '#dff0ff', 'bold 58px sans-serif');
      for (const sx of [-1, 1]) {                         // support columns at the canopy's outer corners
        cyl(`prop_canopy_col_${sx > 0 ? 'r' : 'l'}`, 20 + sx * 2.9, 1.5, cz - 2.1, 0.13, 3.0, M.metal, 16);
        // bollard lights flanking the door
        cyl(`prop_bollard_${sx > 0 ? 'r' : 'l'}`, 20 + sx * 2.9, 0.45, ez - 0.9, 0.08, 0.9, M.metal, 10);
        const bl = sphere(`prop_bollard_glow_${sx > 0 ? 'r' : 'l'}`, 20 + sx * 2.9, 0.93, ez - 0.9, 0.1, M.ringWarm.clone(), 0.7, 8, 6);
        bl.material = bl.material.clone(); bl.material.emissiveIntensity = 1.2; bl.material.name = 'bollard_glow';
      }
    }
    // hedges + entrance planters
    for (let i = 0; i < 10; i++) {
      const hx2 = 2.5 + i * 3.6;
      if (hx2 > 16 && hx2 < 24) continue;                   // keep the entrance clear
      rbox(`env_hedge_${i}`, hx2, 0.3, -0.1, 3.0, 0.6, 0.5, M.leaf[i % 3], 0, 0.18);
    }
    for (const sx of [17.2, 22.8]) {
      cyl(`env_planter_${sx}`, sx, 0.3, -1.2, 0.45, 0.6, M.prop, 14);
      for (let j = 0; j < 4; j++)
        sphere(`env_plant_${sx}_${j}`, sx + Math.cos(j * 1.8) * 0.22, 0.85 + (j % 2) * 0.15,
               -1.2 + Math.sin(j * 1.8) * 0.22, 0.2, M.leaf[j % 3], 0.75, 7, 5);
    }
  }

  // ---------------------------------------------------------------- corridor guides
  for (const x of [CX0 + 0.12, CX1 - 0.12])
    box(`prop_guide_${Math.round(x)}`, x, 0.04, (Z0 + ZW1) / 2, 0.04, 0.03, ZW1 - Z0 - 0.6, M.neon);
  box('prop_guide_dc', 20, 0.04, (ZW1 + 18.8) / 2, 1.4, 0.03, 1.6, M.neon);

  // ---------------------------------------------------------------- Phase 9: static merge
  // ~1500 meshes -> ~1 draw call per (material x fade-class x shadow-class).
  // Excluded: clickables (raycast targets), screens (live canvas materials),
  // the mirror, and anything transparent that must depth-sort on its own.
  try {
    if (new URLSearchParams(location.search).get('merge') === '0') throw new Error('merge disabled via ?merge=0');
    const KEEP = /^(hot_|floor_dc_mirror|prop_mon_|prop_cmdmon_|backdrop)/;
    const fadeClass = n => /^(wall_|mullion|green_wall)/.test(n) ? 'wall'
                         : /^(ceiling_|prop_ceillight)/.test(n) ? 'ceiling' : 'none';   // ceillights fade top-down too
    const buckets = new Map();
    for (const o of [...G.children]) {
      if (!o.isMesh || KEEP.test(o.name)) continue;
      const key = (o.material?.uuid ?? 'x') + ':' + fadeClass(o.name) + ':' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0);
      (buckets.get(key) ?? buckets.set(key, []).get(key)).push(o);
    }
    let merged = 0, removed = 0;
    for (const list of buckets.values()) {
      if (list.length < 2) continue;
      try {
        const geos = list.map(o => {
          o.updateMatrix();
          return o.geometry.clone().applyMatrix4(o.matrix);
        });
        const big = BufferGeometryUtils.mergeGeometries(geos, false);
        if (!big) continue;
        const proto = list[0];
        const m = new THREE.Mesh(big, proto.material);
        const fc = fadeClass(proto.name);
        m.name = fc === 'wall' ? `wall_merged_${merged}` : fc === 'ceiling' ? `ceiling_${proto.name.split('_')[1] ?? 'merged'}_m${merged}` : `prop_merged_${merged}`;
        m.castShadow = proto.castShadow; m.receiveShadow = proto.receiveShadow;
        G.add(m);
        for (const o of list) { G.remove(o); removed++; }
        merged++;
      } catch (e) { console.warn('[office] merge bucket failed:', e); }
    }
    console.log(`[office] static merge: ${removed} meshes -> ${merged} merged`);
  } catch (e) { console.warn('[office] static merge skipped:', e.message); }

  // 8d: runtime animation hook - rack data LEDs blink in pseudo-random bursts
  function tick(t) {
    for (let i = 0; i < blinkMats.length; i++) {
      const v = Math.sin(t * (2.6 + i * 1.31) + i * 9.7) + Math.sin(t * (6.4 + i * 0.77) + i * 3.1);
      blinkMats[i].emissiveIntensity = v > 0.55 ? 1.7 : v < -1.2 ? 0.1 : 0.45;
    }
  }
  return { group: G, anchors, tick };
}
