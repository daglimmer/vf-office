// 110lymph.nl — 3D Agent Office, Phase 4: Mission Control (Build Spec v2.0 §9-13)
// Extends the Phase 1 skeleton with bloom, hologram, runtime overlays, WebSocket
// client (Phase 2 adapter), sim API for the HUD, and a demo mode when no adapter
// is reachable. HUD/notifications/steering/timeline live in sibling modules.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
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
renderer.toneMappingExposure = 1.1;
document.getElementById('view').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0f13);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 300);
camera.position.set(20, 28, 44);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.5, 0.85);
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

scene.add(new THREE.HemisphereLight(0x8fa8d8, 0x16181e, 0.55));
const key = new THREE.DirectionalLight(0xcfd8ff, 0.5);
key.position.set(30, 40, 10); scene.add(key);

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
gltf.scene.traverse(o => {
  if (!o.isMesh && o.name && !/^(floor_|wall_|prop_|mullion|ceiling_|backdrop|office$)/.test(o.name)) {
    anchors.set(o.name, { pos: o.getWorldPosition(new THREE.Vector3()), quat: o.getWorldQuaternion(new THREE.Quaternion()) });
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

// ----------------------------------------------------------------- avatar
function makeAvatar(colorHex, scale = 1) {
  const c = new THREE.Color(colorHex);
  const mat = new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.7 });
  const tint = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.55 });
  const root = new THREE.Group(), parts = {};
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  parts.body = box(0.42, 0.5, 0.24, mat); parts.body.position.y = 0.85;
  parts.chest = box(0.44, 0.1, 0.26, tint); parts.chest.position.y = 1.0;
  parts.head = box(0.26, 0.26, 0.26, mat); parts.head.position.y = 1.28;
  const eyes = box(0.2, 0.05, 0.02, tint); eyes.position.set(0, 0.02, -0.14); parts.head.add(eyes);
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.28, 1.05, 0);
    const a = box(0.1, 0.44, 0.1, mat); a.position.y = -0.22; arm.add(a);
    const leg = new THREE.Group(); leg.position.set(s * 0.12, 0.6, 0);
    const l = box(0.13, 0.55, 0.13, mat); l.position.y = -0.28; leg.add(l);
    parts[s < 0 ? 'armL' : 'armR'] = arm; parts[s < 0 ? 'legL' : 'legR'] = leg;
  }
  for (const k in parts) root.add(parts[k]);
  root.scale.setScalar(scale);
  return { root, parts, materials: [mat, tint], tint };
}
function makeLabel(name, sub) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 72;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false }));
  sprite.scale.set(1.9, 0.55, 1); sprite.position.y = 1.95;
  sprite.userData.draw = (color, text) => {
    const x = cv.getContext('2d');
    x.clearRect(0, 0, 256, 72); x.fillStyle = 'rgba(20,22,26,.8)'; x.fillRect(0, 0, 256, 72);
    x.fillStyle = color ?? '#e8eaee'; x.font = 'bold 26px sans-serif'; x.textAlign = 'center';
    x.fillText(name, 128, 30);
    x.font = '20px sans-serif'; x.fillStyle = color ?? '#8a8f98';
    x.fillText(text ?? sub ?? '', 128, 58);
    sprite.material.map.needsUpdate = true;
  };
  sprite.userData.draw(null);
  return sprite;
}

// ----------------------------------------------------------------- Agent
export const agents = [];               // all live avatars
export const byCard = new Map();        // cardId -> Agent
export const byId = new Map();          // persistent agentId -> Agent (incl card avatars by assignee)
let briefingCount = 0;

export class Agent {
  constructor({ name, sub, color, scale = 1, startAnchor = 'spawn_dc', agentId = null, cardId = null }) {
    this.name = name; this.agentId = agentId; this.cardId = cardId;
    const av = makeAvatar(color ?? SPECTRUM[agents.length % 6], scale);
    Object.assign(this, { group: av.root, parts: av.parts, materials: av.materials, tintMat: av.tint });
    this.label = makeLabel(name, sub); this.group.add(this.label);
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
    this.group.position.copy(a.pos); this.group.quaternion.copy(a.quat);
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
      this.label.userData.draw('#FF4D4D', 'BLOCKED');
    } else if (!on && this.blocked) {
      this.blocked = false; this.label.userData.draw(null);
      this.setLifecycle(this.lifecycle ?? 'idle');
    }
  }
  setOverlay(kind) {                      // §7.2 precedence handled by caller order
    this.overlay = kind;
    if (kind === 'paused') { this.path = []; this.pose = 'sit'; this.label.userData.draw('#FFB02E', 'PAUSED'); }
    if (kind === 'down') { this.path = []; this.pose = 'collapsed'; this.label.userData.draw('#FF4D4D', 'DOWN'); }
    if (kind === 'killed') { this.tintMat.emissive = new THREE.Color('#FF4D4D'); this.fx = { kind: 'despawn', t: 0 }; }
    if (kind === 'ok') { this.label.userData.draw(null); this.setLifecycle(this.lifecycle ?? 'idle'); }
  }
  fallbackFlash() { this.glowT = 3.0; }   // §11.2 emissiveIntensity 1->3->1 over 3s
  remove() {
    this.releaseSlot(); this.leaveBriefing();
    scene.remove(this.group);
    agents.splice(agents.indexOf(this), 1);
    if (this.cardId) byCard.delete(this.cardId);
    if (this.agentId) byId.delete(this.agentId);
    if (sim.followed === this) sim.followAgent(null);
  }
  update(dt) {
    this.t += dt;
    if (this.fx) {
      this.fx.t += dt; const k = Math.min(this.fx.t / TIMINGS.fx, 1);
      if (this.fx.kind === 'spawn') {
        this.group.scale.setScalar(k);
        this.tintMat.emissiveIntensity = 0.55 + 2.5 * Math.sin(k * Math.PI);
        if (k >= 1) { this.fx = null; this.tintMat.emissiveIntensity = 0.55; }
      } else {
        this.group.scale.setScalar(1 - k);
        this.materials.forEach(m => { m.transparent = true; m.opacity = 1 - k; });
        if (k >= 1) { this.remove(); return; }
      }
    }
    if (this.glowT > 0) {                  // amber fallback flash
      this.glowT = Math.max(0, this.glowT - dt);
      const k = this.glowT / 3;
      this.tintMat.emissiveIntensity = 0.55 + 2.45 * Math.sin(k * Math.PI);
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
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-d.x, -d.z));
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
        set(p.legL, s * 0.6); set(p.legR, -s * 0.6); set(p.armL, -s * 0.5); set(p.armR, s * 0.5);
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
        baseY = Math.sin(t * 1.5) * 0.01;
    }
    const aY = this.seated ? anchors.get(this.seated).pos.y : 0;
    this.group.position.y = aY + baseY;
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
presets.peak = { cam: new THREE.Vector3(20, 35, 12), target: new THREE.Vector3(20, 0, 12) };   // Peak View (VF#5)

let flight = null;
function flyTo(p) {
  sim.followAgent(null);
  flight = { from: camera.position.clone(), to: p.cam.clone(), t0: controls.target.clone(), t1: p.target.clone(), k: 0 };
}
export const sim = {
  followed: null,
  followAgent(id) {
    sim.followed = id == null ? null : (typeof id === 'string' ? (byId.get(id) ?? byCard.get(id) ?? null) : id);
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
    if (flight.k >= 1) flight = null;
  }
  if (sim.followed) {
    const p = sim.followed.group.position;
    controls.target.lerp(new THREE.Vector3(p.x, 1.2, p.z), Math.min(dt * 5, 1));
    const want = new THREE.Vector3(p.x + 4, 4.5, p.z + 4);
    camera.position.lerp(want, Math.min(dt * 2.2, 1));
  }
  controls.update();
  composer.render();
  css2d.render(scene, camera);
});
