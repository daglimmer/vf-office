// 110lymph.nl — 3D Agent Office, Phase 5: Lighting, Avatars, Camera, Transparency
// Extends the Phase 1 skeleton with bloom, hologram, runtime overlays, WebSocket
// client (Phase 2 adapter), sim API for the HUD, and a demo mode when no adapter
// is reachable. HUD/notifications/steering/timeline live in sibling modules.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { initHud } from './hud.js';
import { initNotifications } from './notifications.js';
import { initTimeline } from './timeline.js';

export const bus = new EventTarget();
const emit = ev => bus.dispatchEvent(new CustomEvent('bridge', { detail: ev }));

// ----------------------------------------------------------------- constants
const WALK_SPEED = 1.4, TURN_SPEED = 8.0;
const SPECTRUM = ['#2E5BFF', '#9B30FF', '#FF3DBE', '#FF9E2C', '#FFE32C', '#3DFF7A'];
const TIMINGS = { debrief: 20, documentation: 30, lunch: 45, fx: 1.5 };

// ----------------------------------------------------------------- renderer + bloom (§12)
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 3.2;
document.getElementById('view').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a3040);
scene.fog = new THREE.Fog(0x2a3040, 35, 100);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 300);
camera.position.set(20, 28, 44);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.10, 0.4, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const css2d = new CSS2DRenderer();
css2d.setSize(innerWidth, innerHeight);
css2d.domElement.id = 'css2d';
document.getElementById('view').appendChild(css2d.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(20, 0, 12);
controls.minPolarAngle = 0.1; controls.maxPolarAngle = 1.45;
controls.minDistance = 5; controls.maxDistance = 80;
controls.enableDamping = true;

// ----------------------------------------------------------------- free cam — WASD walk mode (Phase 4.1)
let walkMode = false;
let roofVisible = true;              // Phase 5: roof toggle (declared early for key handler)
const roofMeshes = new Set();        // populated later in GLB traverse
let updateRoofBtn = () => {};        // replaced after Roof btn is created
const keys = { w: false, a: false, s: false, d: false, shift: false };
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'a' || k === 's' || k === 'd') keys[k] = true;
  if (k === 'shift') keys.shift = true;
  if (k === 'f' && walkMode) { walkMode = false; controls.saveState(); controls.enabled = true; } // F to exit
  if (k === 'r') { roofVisible = !roofVisible; for (const mesh of roofMeshes) mesh.visible = roofVisible; updateRoofBtn(); } // R to toggle roof
  if (k === 'v' && !walkMode) { sim.flyToRoom('peak'); } // V for peak view
});
addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'a' || k === 's' || k === 'd') keys[k] = false;
  if (k === 'shift') keys.shift = false;
});
// "Walk" toggle button (injected into presets bar later)
function toggleWalk() {
  walkMode = !walkMode;
  controls.enabled = !walkMode;
  controls.target.copy(camera.position.clone().add(new THREE.Vector3(0, 0, -5)));
  if (!walkMode) controls.update();
}

// Balanced lighting for Phase 9 — comfortable indoor office feel
const hemi = new THREE.HemisphereLight(0x8888cc, 0x443322, 1.2);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0x404060, 1.0);
scene.add(ambient);
const key = new THREE.DirectionalLight(0xe0e8ff, 1.5);
key.position.set(30, 40, 10); scene.add(key);
const fill = new THREE.DirectionalLight(0xffd080, 1.0);
fill.position.set(-20, 10, -20); scene.add(fill);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  css2d.setSize(innerWidth, innerHeight);
});

// ----------------------------------------------------------------- world
const anchors = new Map(), graph = new Map();
let rooms = {};
const deskGlow = new Map();
let holo = null, holoTarget = 0.25;

const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
loader.setDRACOLoader(draco);

const [gltf, wp] = await Promise.all([
  loader.loadAsync('/office.glb'),
  fetch('/waypoints.json').then(r => r.json()),
]);
scene.add(gltf.scene);
// wall & emissive references for peak-view transparency + brightness boost
const wallMeshes = new Set();
const wallMaterialOpacityBackup = new Map();
gltf.scene.traverse(o => {
  if (o.isMesh && o.name && /^(wall_|ceiling_)/i.test(o.name)) {
    wallMeshes.add(o);
    if (o.name && /^ceiling_/i.test(o.name)) roofMeshes.add(o);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!wallMaterialOpacityBackup.has(m)) {
        wallMaterialOpacityBackup.set(m, m.transparent ? m.opacity : 1);
      }
    }
  }
  if (o.isMesh && o.material) {
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (m.emissive && (m.emissive.r > 0 || m.emissive.g > 0 || m.emissive.b > 0)) {
        // conservative baseline — no boosting, let the scene breathe
        m.emissiveIntensity = 0.3;
      }
    }
  }
  if (!o.isMesh && o.name && !/^(floor_|wall_|prop_|mullion|ceiling_|backdrop|office$)/.test(o.name)) {
    anchors.set(o.name, { pos: o.getWorldPosition(new THREE.Vector3()), quat: o.getWorldQuaternion(new THREE.Quaternion()) });
  }
  // kill orange/amber lights baked into GLB (annoying glow between DevOps & DC)
  if ((o.isPointLight || o.isSpotLight) && o.color) {
    const hsl = {}; o.color.getHSL(hsl);
    if (hsl.h > 0.07 && hsl.h < 0.15 && hsl.l > 0.3) o.intensity = 0;
  }
});
rooms = wp.rooms;
for (const [a, b] of wp.edges) {
  const cost = anchors.get(a).pos.distanceTo(anchors.get(b).pos);
  (graph.get(a) ?? graph.set(a, []).get(a)).push({ to: b, cost });
  (graph.get(b) ?? graph.set(b, []).get(b)).push({ to: a, cost });
}

// hologram at meet_holo (§12): layered planes + sprites + point light
{
  const h = anchors.get('meet_holo').pos;
  holo = new THREE.Group(); holo.position.copy(h);
  const pm = new THREE.MeshBasicMaterial({ color: 0x4dd8ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), pm);
    p.rotation.y = i * Math.PI / 3; holo.add(p);
  }
  const sm = new THREE.SpriteMaterial({ color: 0x9b30ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Sprite(sm.clone());
    const a = i / 12 * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.55, 0.1 + (i % 3) * 0.18, Math.sin(a) * 0.55);
    s.scale.setScalar(0.07);
    s.material.color = new THREE.Color(SPECTRUM[i % 6]);
    holo.add(s);
  }
  holo.userData.light = new THREE.PointLight(0x4dd8ff, 0.3, 6);
  holo.add(holo.userData.light);
  scene.add(holo);
  // desk monitor glow stand-ins (only if Phase 1 gray-box GLB; Phase 3 art has its own)
  for (let i = 1; i <= 8; i++) {
    const name = `work_desk_${String(i).padStart(2, '0')}`;
    const a = anchors.get(name);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x111418, emissive: 0x3dff7a, emissiveIntensity: 0.05 }));
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(a.quat);
    m.position.copy(a.pos).addScaledVector(fwd, 0.75).setY(1.15);
    m.quaternion.copy(a.quat);
    scene.add(m); deskGlow.set(name, m);
  }
}

// ----------------------------------------------------------------- A*, pools (Phase 1)
function aStar(from, to) {
  if (from === to) return [to];
  const dist = n => anchors.get(n).pos.distanceTo(anchors.get(to).pos);
  const open = new Set([from]), came = new Map();
  const g = new Map([[from, 0]]), f = new Map([[from, dist(from)]]);
  while (open.size) {
    let cur = null, best = Infinity;
    for (const n of open) if (f.get(n) < best) { best = f.get(n); cur = n; }
    if (cur === to) { const p = [cur]; while (came.has(cur)) { cur = came.get(cur); p.unshift(cur); } return p; }
    open.delete(cur);
    for (const e of graph.get(cur) || []) {
      const t = g.get(cur) + e.cost;
      if (t < (g.get(e.to) ?? Infinity)) { came.set(e.to, cur); g.set(e.to, t); f.set(e.to, t + dist(e.to)); open.add(e.to); }
    }
  }
  return null;
}
class Pool {
  constructor(names, door) { this.free = [...names]; this.door = door; this.queue = []; }
  request(a) { if (this.free.length) return this.free.shift(); this.queue.push(a); return null; }
  release(n) { const nx = this.queue.shift(); if (nx) nx.grantSlot(n); else this.free.push(n); }
  unqueue(a) { this.queue = this.queue.filter(x => x !== a); }
  queueIndex(a) { return this.queue.indexOf(a); }
}
const ids = (p, n) => Array.from({ length: n }, (_, i) => `${p}${String(i + 1).padStart(2, '0')}`);
const pools = {
  work: new Pool(ids('work_desk_', 8), 'nav_door_devops'),
  doc: new Pool(ids('doc_desk_', 4), 'nav_door_staff'),
  lounge: new Pool(ids('lounge_seat_', 8), 'nav_door_lounge'),
  meet: new Pool(ids('meet_seat_', 7), 'nav_door_meeting'),
};
function queueSpot(door, i) {
  const p = anchors.get(door).pos.clone();
  if (Math.abs(p.x - 17) < 0.1) p.x += 1.2; else if (Math.abs(p.x - 23) < 0.1) p.x -= 1.2; else p.z -= 1.2;
  p.z += (Math.abs(p.x - 20) < 3 ? 0 : (i + 1) * 0.9) * (p.z < 8 ? 1 : -1);
  return p;
}

// ----------------------------------------------------------------- avatar — Phase 4: cylinder body + sphere head (2026-06-17)
const ROLE_COLORS = {
  'executive': 0xFFD24D,    // CEO — gold/amber
  'coo': 0xC0C0C0,         // COO — silver
  'orchestrator': 0x4DD8FF, // Oly — blue
  'devops': 0x3DFF7A,       // DevOps — green
  'specialist': 0x00CED1,   // Specialist — cyan
  'maintenance': 0xFF9E2C,  // Maintenance — orange
  'security': 0xFF4D4D,     // Sentinel/security — red
  'network': 0x9B30FF,      // Network — purple
  'storage': 0x2E5BFF,      // Storage — indigo
  'general': 0x8a8f98,      // Default — slate
};
function roleColor(sub) {
  for (const [key, col] of Object.entries(ROLE_COLORS)) {
    if (sub && sub.toLowerCase().includes(key)) return col;
  }
  return null; // caller falls back to color param
}
function makeAvatar(colorHex, scale = 1, sub = '') {
  const roleCol = roleColor(sub) ?? colorHex ?? 0x8a8f98;
  const c = new THREE.Color(roleCol);
  const bodyMat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.2, roughness: 0.6, metalness: 0.1 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.4, metalness: 0 });
  const accentMat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.0 });
  const root = new THREE.Group(), parts = {};
  // Cylinder body (12 radial segments = ~72 tris, well under 200)
  parts.body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.6, 12), bodyMat);
  parts.body.position.y = 0.92;
  // Sphere head (12 width × 8 height segments = ~96 tris)
  parts.head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), headMat);
  parts.head.position.y = 1.34;
  // Eyes — two tiny spheres
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  for (const sx of [-0.06, 0.06]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), eyeMat);
    eye.position.set(sx, 0.02, -0.14);
    parts.head.add(eye);
  }
  // Accessory band (toroidal ring at neck, color-coded)
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 12), accentMat);
  band.position.y = 1.04;
  band.rotation.x = Math.PI / 2;
  root.add(band);
  // Arms — small capsules (cylinders)
  const armMat = new THREE.MeshStandardMaterial({ color: 0xb0b4b8, roughness: 0.5 });
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sx * 0.26, 1.08, 0);
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.36, 6), armMat);
    a.position.y = -0.18; a.rotation.z = sx * 0.2;
    arm.add(a);
    parts[sx < 0 ? 'armL' : 'armR'] = arm;
  }
  // Legs — small cylinders
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(sx * 0.11, 0.62, 0);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.42, 6), armMat);
    l.position.y = -0.21;
    leg.add(l);
    parts[sx < 0 ? 'legL' : 'legR'] = leg;
  }
  for (const k in parts) root.add(parts[k]);
  root.scale.setScalar(scale);
  return { root, parts, materials: [bodyMat, headMat, armMat, accentMat], tint: bodyMat };
}
function makeLabel(name, sub, colorHex) {
  const el = document.createElement('div');
  el.className = 'agent-label';
  const hex = (c) => { try { return '#' + new THREE.Color(c).getHexString(); } catch(_) { return '#e8eaee'; } };
  const col = roleColor(sub) ?? colorHex ?? '#e8eaee';
  const colStr = hex(col);
  el.innerHTML = `<div class="al-name" style="color:${colStr}">${name}</div>` +
    (sub ? `<div class="al-sub" style="color:${colStr}">${sub}</div>` : '');
  const label = new CSS2DObject(el);
  label.visible = false;
  scene.add(label);
  return { label, el, update: (color, text) => {
    const nameEl = el.querySelector('.al-name');
    const subEl = el.querySelector('.al-sub');
    if (color) {
      nameEl.style.color = color;
      if (subEl) subEl.style.color = color;
    }
    if (text !== undefined) {
      if (subEl) subEl.textContent = text ?? '';
      else { el.innerHTML = `<div class="al-name" style="color:${color ?? colStr}">${name}</div><div class="al-sub" style="color:${color ?? colStr}">${text ?? sub ?? ''}</div>`; }
    }
  }};
}

// ----------------------------------------------------------------- Agent
export const agents = [];               // all live avatars
export const byCard = new Map();        // cardId -> Agent
export const byId = new Map();          // persistent agentId -> Agent (incl card avatars by assignee)
let briefingCount = 0;

export class Agent {
  constructor({ name, sub, color, scale = 1, startAnchor = 'spawn_dc', agentId = null, cardId = null }) {
    this.name = name; this.agentId = agentId; this.cardId = cardId;
    const av = makeAvatar(color ?? SPECTRUM[agents.length % 6], scale, sub);
    Object.assign(this, { group: av.root, parts: av.parts, materials: av.materials, tintMat: av.tint });
    this.label = makeLabel(name, sub, color);
    this._labelEl = this.label.el;
    this.lastNode = startAnchor;
    this.group.position.copy(anchors.get(startAnchor).pos);
    this.state = 'idle'; this.pose = 'idle'; this.t = Math.random() * 9; this.timer = null;
    this.path = []; this.onArrive = null; this.seated = null;
    this.heldSlot = null; this.heldPool = null;
    this.blocked = false; this.overlay = 'ok';      // ok|paused|down|killed
    this.fx = null; this.glowT = 0;
    scene.add(this.group); agents.push(this);
    if (agentId) byId.set(agentId, this);
    if (cardId) byCard.set(cardId, this);
  }
  room() {
    const p = this.group.position;
    for (const [r, info] of Object.entries(rooms)) {
      const c = info.center;
      if (Math.abs(p.x - c[0]) < 9 && Math.abs(p.z - c[2]) < 5) return r;
    }
    return 'corridor';
  }
  goto(anchorName, onArrive) {
    const path = aStar(this.lastNode, anchorName);
    if (!path) return;
    this.path = path.filter(n => n !== this.lastNode).map(n => ({ name: n, pos: anchors.get(n).pos.clone() }));
    this.onArrive = onArrive ?? null; this.seated = null; this.pose = 'walk';
    if (!this.path.length && this.onArrive) { const f = this.onArrive; this.onArrive = null; f(); }
  }
  gotoPoint(v, onArrive) { this.path = [{ name: null, pos: v.clone() }]; this.onArrive = onArrive ?? null; this.pose = 'walk'; this.seated = null; }
  sitAt(name, pose) {
    const a = anchors.get(name);
    this.group.position.copy(a.pos);
    // Seat anchors are upright with a pure yaw (facing direction). Copying a
    // 180deg quaternion (0,-1,0,~0) makes Three decompose it to Euler (pi,0,pi);
    // then animateHumanoid eases rotation.x -> 0 each frame, leaving (0,0,pi) =
    // a 180deg ROLL = upside-down. Set a clean yaw-only Euler so x and z stay 0.
    const q = a.quat;
    const yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z));
    this.group.rotation.set(0, yaw, 0);
    this.seated = name; this.pose = pose; this.path = [];
  }
  acquire(poolKey, onGranted) {
    const pool = pools[poolKey]; const slot = pool.request(this);
    if (slot) return onGranted(slot);
    this.waitingPool = poolKey; this._granted = onGranted;
    this.gotoPoint(queueSpot(pool.door, pool.queueIndex(this)), () => { this.pose = 'idle'; });
  }
  grantSlot(slot) { this.waitingPool = null; const f = this._granted; this._granted = null; f(slot); }
  releaseSlot() {
    if (this.waitingPool) { pools[this.waitingPool].unqueue(this); this.waitingPool = null; this._granted = null; }
    if (this.heldSlot) {
      if (this.heldPool === 'work') deskGlow.get(this.heldSlot).material.emissiveIntensity = 0.05;
      pools[this.heldPool].release(this.heldSlot); this.heldSlot = this.heldPool = null;
    }
  }
  hold(p, s) { this.heldPool = p; this.heldSlot = s; }
  setLifecycle(target) {
    this.lifecycle = target;
    if (this.blocked || this.overlay === 'paused' || this.overlay === 'down') return;   // suppressed (§7.2)
    this.releaseSlot(); this.leaveBriefing();
    this.state = target;
    switch (target) {
      case 'spawning': this.fx = { kind: 'spawn', t: 0 }; this.group.scale.setScalar(0.001); this.pose = 'idle'; break;
      case 'briefing': this.acquire('meet', s => { this.hold('meet', s); this.goto(s, () => { this.sitAt(s, 'talk'); this.enterBriefing(); }); }); break;
      case 'working': this.acquire('work', s => { this.hold('work', s); this.goto(s, () => { this.sitAt(s, 'type'); deskGlow.get(s).material.emissiveIntensity = 1.4; }); }); break;
      case 'debrief': this.acquire('meet', s => { this.hold('meet', s); this.goto(s, () => { this.sitAt(s, 'talk'); this.enterBriefing(); this.timer = TIMINGS.debrief; }); }); break;
      case 'documentation': this.acquire('doc', s => { this.hold('doc', s); this.goto(s, () => { this.sitAt(s, 'type'); this.timer = TIMINGS.documentation; }); }); break;
      case 'lunch': this.acquire('lounge', s => { this.hold('lounge', s); this.goto(s, () => { this.sitAt(s, 'sit'); this.timer = TIMINGS.lunch; }); }); break;
      case 'despawning': this.goto('despawn_dc', () => { this.fx = { kind: 'despawn', t: 0 }; }); break;
    }
  }
  enterBriefing() { this.inMeeting = true; briefingCount++; syncOllie(); }
  leaveBriefing() { if (this.inMeeting) { this.inMeeting = false; briefingCount--; syncOllie(); } }
  setBlocked(on, reason) {
    if (on && !this.blocked) {
      this.blocked = true; this.savedPath = this.path; this.path = []; this.pose = 'headdown';
      this.label.update('#FF4D4D', 'BLOCKED');
    } else if (!on && this.blocked) {
      this.blocked = false; this.label.update();
      this.setLifecycle(this.lifecycle ?? 'idle');
    }
  }
  setOverlay(kind) {                      // §7.2 precedence handled by caller order
    this.overlay = kind;
    if (kind === 'paused') { this.path = []; this.pose = 'sit'; this.label.update('#FFB02E', 'PAUSED'); }
    if (kind === 'down') { this.path = []; this.pose = 'collapsed'; this.label.update('#FF4D4D', 'DOWN'); }
    if (kind === 'killed') { this.tintMat.emissive = new THREE.Color('#FF4D4D'); this.fx = { kind: 'despawn', t: 0 }; }
    if (kind === 'ok') { this.label.update(); this.setLifecycle(this.lifecycle ?? 'idle'); }
  }
  fallbackFlash() { this.glowT = 3.0; }   // §11.2 emissiveIntensity 1->3->1 over 3s
  remove() {
    this.releaseSlot(); this.leaveBriefing();
    scene.remove(this.group);
    agents.splice(agents.indexOf(this), 1);
    if (this.cardId) byCard.delete(this.cardId);
    if (this.agentId) byId.delete(this.agentId);
    if (sim.followed === this) sim.followAgent(null);
    // clean up CSS2D label
    if (this.label && this.label.label) {
      scene.remove(this.label.label);
      this.label.el.remove();
    }
  }
  update(dt) {
    this.t += dt;
    if (this.fx) {
      this.fx.t += dt; const k = Math.min(this.fx.t / TIMINGS.fx, 1);
      if (this.fx.kind === 'spawn') {
        this.group.scale.setScalar(k);
        this.tintMat.emissiveIntensity = 1.2 + 2.5 * Math.sin(k * Math.PI);
        if (k >= 1) { this.fx = null; this.tintMat.emissiveIntensity = 1.2; }
      } else {
        this.group.scale.setScalar(1 - k);
        this.materials.forEach(m => { m.transparent = true; m.opacity = 1 - k; });
        if (k >= 1) { this.remove(); return; }
      }
    }
    if (this.glowT > 0) {                  // amber fallback flash
      this.glowT = Math.max(0, this.glowT - dt);
      const k = this.glowT / 3;
      this.tintMat.emissiveIntensity = 1.2 + 2.45 * Math.sin(k * Math.PI);
    }
    if (this.path.length && !this.blocked && this.overlay === 'ok' && !(this.freezeUntil > performance.now())) {
      const target = this.path[0].pos;
      const d = target.clone().sub(this.group.position); d.y = 0;
      const dist = d.length();
      if (dist < 0.06) {
        if (this.path[0].name) this.lastNode = this.path[0].name;
        this.path.shift();
        if (!this.path.length) { this.pose = 'idle'; if (this.onArrive) { const f = this.onArrive; this.onArrive = null; f(); } }
      } else {
        this.group.position.addScaledVector(d.normalize(), Math.min(WALK_SPEED * dt, dist));
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(d.x, -d.z));
        this.group.quaternion.slerp(q, Math.min(TURN_SPEED * dt, 1));
      }
    }
    if (this.timer != null && !this.blocked && this.overlay === 'ok' && this.seated) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = null;
        if (this.state === 'debrief') this.setLifecycle('documentation');
        else if (this.state === 'documentation') this.setLifecycle('lunch');
        else if (this.state === 'lunch') this.setLifecycle('despawning');
      }
    }
    this.animate(dt);
  }
  animate() {
    const p = this.parts, t = this.t;
    const set = (o, x) => { o.rotation.x = x; };
    set(p.armL, 0); set(p.armR, 0); set(p.legL, 0); set(p.legR, 0);
    p.head.rotation.x = 0; this.group.rotation.x = 0;
    let baseY = 0;
    switch (this.pose) {
      case 'walk': { const s = Math.sin(t * 7);
        set(p.legL, -s * 0.6); set(p.legR, s * 0.6); set(p.armL, s * 0.5); set(p.armR, -s * 0.5);
        baseY = Math.abs(Math.sin(t * 7)) * 0.04; break; }
      case 'sit': case 'type': case 'talk':
        baseY = -0.22; set(p.legL, -1.35); set(p.legR, -1.35);
        if (this.pose === 'type') { set(p.armL, -0.95 + Math.sin(t * 13) * 0.07); set(p.armR, -0.95 + Math.cos(t * 11) * 0.07); }
        if (this.pose === 'talk') p.head.rotation.x = Math.sin(t * 4) * 0.12;
        break;
      case 'glance': p.head.rotation.x = -0.45; baseY = this.seated ? -0.22 : 0;
        if (this.seated) { set(p.legL, -1.35); set(p.legR, -1.35); } break;
      case 'headdown': p.head.rotation.x = 0.55; break;
      case 'collapsed': this.group.rotation.x = -Math.PI / 2; baseY = 0.3; break;   // lying
      default: set(p.armL, Math.sin(t * 1.5) * 0.05); set(p.armR, -Math.sin(t * 1.5) * 0.05);
        baseY = Math.sin(t * 1.5) * 0.06;
    }
    const aY = this.seated ? anchors.get(this.seated).pos.y : 0;
    this.group.position.y = aY + baseY;
    // Face toward camera in peak view (Phase 3 polish)
    if (peakViewActive) {
      const dir = new THREE.Vector3().subVectors(camera.position, this.group.position);
      dir.y = 0;
      if (dir.length() > 0.1) {
        const q = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, -1), dir.normalize()
        );
        this.group.quaternion.slerp(q, 0.04);
      }
    }
  }
}

// ----------------------------------------------------------------- ollie & ceo
const ollie = new Agent({ name: 'Ollie', sub: 'orchestrator', color: '#4DD8FF', scale: 1.18, startAnchor: 'ollie_station', agentId: 'ollie' });
ollie.sitAt('ollie_station', 'type');
const ceoAv = new Agent({ name: 'CEO', sub: 'executive', color: '#FFD24D', scale: 1.1, startAnchor: 'ceo_desk', agentId: 'ceo' });
ceoAv.sitAt('ceo_desk', 'idle');
function syncOllie() {
  holoTarget = briefingCount > 0 ? 1.0 : 0.25;
  if (briefingCount > 0 && ollie.seated !== 'meet_seat_ollie') ollie.goto('meet_seat_ollie', () => ollie.sitAt('meet_seat_ollie', 'talk'));
  else if (briefingCount === 0 && ollie.seated !== 'ollie_station') ollie.goto('ollie_station', () => ollie.sitAt('ollie_station', 'type'));
}

// ----------------------------------------------------------------- sim API (§9.1)
const presets = {};
for (const [room, info] of Object.entries(rooms)) presets[room] = { cam: anchors.get(info.cam).pos, target: new THREE.Vector3(info.center[0], 0.8, info.center[2]) };
// Peak View wall transparency toggling
let peakViewActive = false;
function setWallsTransparent(on) {
  for (const mesh of wallMeshes) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (on) {
        m.transparent = true;
        m.opacity = 0.25;
        m.depthWrite = false;
      } else {
        const restore = wallMaterialOpacityBackup.get(m) ?? 1;
        m.opacity = restore;
        m.transparent = restore < 1;
        m.depthWrite = !(restore < 1);
      }
      m.needsUpdate = true;
    }
  }
}
presets.peak = { cam: new THREE.Vector3(20, 35, 12), target: new THREE.Vector3(20, 0, 12) };   // Peak View (VF#5)

let flight = null;
function flyTo(p) {
  sim.followAgent(null);
  flight = { from: camera.position.clone(), to: p.cam.clone(), t0: controls.target.clone(), t1: p.target.clone(), k: 0, peak: p === presets.peak };
}
export const sim = {
  followed: null,
  followAgent(id) {
    sim.followed = id == null ? null : (typeof id === 'string' ? (byId.get(id) ?? byCard.get(id) ?? null) : id);
    if (peakViewActive) {
      setWallsTransparent(false); peakViewActive = false;
      scene.fog = new THREE.Fog(0x2a3040, 35, 100);
    }
    bus.dispatchEvent(new CustomEvent('follow', { detail: sim.followed?.agentId ?? sim.followed?.cardId ?? null }));
  },
  flyToRoom(room) { if (presets[room]) flyTo(presets[room]); },
  flyToAgent(id) { const a = byId.get(id) ?? byCard.get(id); if (a) sim.flyToRoom(a.room()); },
  getAgents: () => agents,
  rooms, anchors, scene, byId, byCard,
};
window.sim = sim;

// preset buttons
const bar = document.getElementById('presets');
for (const r of [...Object.keys(rooms), 'peak']) {
  const b = document.createElement('button');
  b.textContent = r === 'peak' ? '◈ Peak View' : r;
  if (r === 'peak') b.classList.add('peak');
  b.onclick = () => sim.flyToRoom(r);
  bar.appendChild(b);
}
// Walk toggle button
const walkBtn = document.createElement('button');
walkBtn.id = 'walk-toggle';
function updateWalkBtn() {
  walkBtn.textContent = walkMode ? '🚶 Exit (F)' : '🚶 Walk';
  walkBtn.style.borderColor = walkMode ? '#FF9E2C' : '';
  walkBtn.style.background = walkMode ? 'rgba(255,158,44,.2)' : '';
}
walkBtn.onclick = () => { toggleWalk(); updateWalkBtn(); };
bar.appendChild(walkBtn);

// Roof toggle — hides/shows ceiling_* meshes independently
const roofBtn = document.createElement('button');
roofBtn.id = 'roof-toggle';
roofBtn.textContent = '⬆ Roof';
updateRoofBtn = () => {
  roofBtn.textContent = roofVisible ? '⬆ Roof' : '⬇ Roof Off';
  roofBtn.style.borderColor = roofVisible ? '' : '#FF9E2C';
  roofBtn.style.background = roofVisible ? '' : 'rgba(255,158,44,.2)';
  roofBtn.className = roofVisible ? 'roof-on' : 'roof-off';
}
roofBtn.onclick = () => {
  roofVisible = !roofVisible;
  for (const mesh of roofMeshes) mesh.visible = roofVisible;
  updateRoofBtn();
};
bar.appendChild(roofBtn);

// ----------------------------------------------------------------- bridge events
const COLUMN_STATE = { backlog: 'spawning', todo: 'briefing', in_progress: 'working', review: 'debrief' };
let colorIdx = 0;
export function handleEvent(ev) {
  emit(ev);                                   // HUD + notification modules listen on bus
  switch (ev.event) {
    case 'snapshot':
      for (const card of ev.cards ?? []) {
        if (byCard.has(card.cardId)) continue;
        const st = COLUMN_STATE[card.column];
        if (!st && card.column !== 'done') continue;
        const a = new Agent({ name: card.assignee ?? card.cardId, sub: card.cardId, color: SPECTRUM[colorIdx++ % 6], cardId: card.cardId });
        a.setLifecycle(st ?? 'lunch');          // done cards rest in the lounge chain
      }
      break;
    case 'card.created': {
      const a = new Agent({ name: ev.assignee ?? ev.cardId, sub: ev.cardId, color: SPECTRUM[colorIdx++ % 6], cardId: ev.cardId });
      a.setLifecycle('spawning'); break;
    }
    case 'card.moved': {
      const a = byCard.get(ev.cardId); if (!a) return;
      const s = COLUMN_STATE[ev.to];
      if (s) a.setLifecycle(s);
      else if (ev.to === 'despawn') a.setLifecycle('despawning');
      break;
    }
    case 'card.blocked': byCard.get(ev.cardId)?.setBlocked(true, ev.reason); break;
    case 'card.unblocked': byCard.get(ev.cardId)?.setBlocked(false); break;
    case 'card.deleted': byCard.get(ev.cardId)?.remove(); break;
    case 'agent.paused': pAgent(ev.agentId)?.setOverlay('paused'); break;
    case 'agent.resumed': pAgent(ev.agentId)?.setOverlay('ok'); break;
    case 'agent.killed': pAgent(ev.agentId)?.setOverlay('killed'); break;
    case 'agent.down': pAgent(ev.agentId)?.setOverlay('down'); break;
    case 'agent.recovered': pAgent(ev.agentId)?.setOverlay('ok'); break;
    case 'agent.fallback': pAgent(ev.agentId)?.fallbackFlash(); break;
  }
}
// persistent agent OR the card avatar working under that assignee name
function pAgent(id) {
  return byId.get(id) ?? agents.find(a => a.name === id) ?? null;
}
window.__inject = handleEvent;

// ----------------------------------------------------------------- transport: WS or demo
export let demoMode = false;
function connect() {
  const ws = new WebSocket(`ws://${location.host}/ws`);   // proxied by vite in dev; direct on adapter
  const giveUp = setTimeout(() => { ws.close(); startDemo(); }, 2000);
  ws.onopen = () => clearTimeout(giveUp);
  ws.onmessage = m => handleEvent(JSON.parse(m.data));
  ws.onclose = () => { if (!demoMode) setTimeout(connect, 2000); };
  ws.onerror = () => {};
}
function startDemo() {
  if (demoMode) return;
  demoMode = true;
  document.getElementById('demobadge').style.display = 'block';
  import('./demo.js').then(d => d.runDemo(handleEvent));
}
connect();

// ----------------------------------------------------------------- modules
initHud({ bus, sim, demo: () => demoMode });
initNotifications({ bus, sim, THREE, scene, byCard, byId, anchors, rooms, agents });
initTimeline({ sim, demo: () => demoMode });

// ----------------------------------------------------------------- loop
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  for (const a of [...agents]) a.update(dt);
  holo.rotation.y += dt * 0.8;
  const op = holo.children[0].material.opacity;
  holo.children[0].material.opacity = op + (holoTarget * 0.16 - op) * Math.min(dt * 4, 1);
  holo.userData.light.intensity += (holoTarget * 0.5 - holo.userData.light.intensity) * Math.min(dt * 4, 1);
  if (flight) {
    flight.k = Math.min(flight.k + dt * 1.3, 1);
    const e = flight.k * flight.k * (3 - 2 * flight.k);
    camera.position.lerpVectors(flight.from, flight.to, e);
    controls.target.lerpVectors(flight.t0, flight.t1, e);
    if (flight.k >= 1) {
      if (flight.peak && !peakViewActive) {
        scene.fog = null;
        setWallsTransparent(true); peakViewActive = true;
      }
      else if (!flight.peak && peakViewActive) {
        scene.fog = new THREE.Fog(0x2a3040, 35, 100);
        setWallsTransparent(false); peakViewActive = false;
      }
      flight = null;
    }
  }
  if (sim.followed) {
    const p = sim.followed.group.position;
    controls.target.lerp(new THREE.Vector3(p.x, 1.2, p.z), Math.min(dt * 5, 1));
    const want = new THREE.Vector3(p.x + 4, 4.5, p.z + 4);
    camera.position.lerp(want, Math.min(dt * 2.2, 1));
  }
  // ----------------------------------------------------------------- WASD walk mode
  if (walkMode && !flight && !sim.followed) {
    const speed = (keys.shift ? 3.5 : 1.4) * dt;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0; right.normalize();
    const move = new THREE.Vector3();
    if (keys.w) move.add(fwd);
    if (keys.s) move.sub(fwd);
    if (keys.a) move.sub(right);
    if (keys.d) move.add(right);
    if (move.length() > 0) {
      move.normalize().multiplyScalar(speed);
      camera.position.add(move);
      controls.target.copy(camera.position).add(fwd.multiplyScalar(5));
    }
  }
  controls.update();
  // CSS2D label position sync — each label tracks its agent's world position
  for (const a of agents) {
    if (a.label && a.label.label) {
      a.label.label.position.copy(a.group.position);
      a.label.label.position.y += 1.95;
    }
  }
  composer.render();
  css2d.render(scene, camera);
});
