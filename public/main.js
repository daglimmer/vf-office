// 110lymph.nl — The Office v2, look 2 (SPEC-2026-043 §10, "the look Ray chose").
// A cosy studio with the ten v2 agents, driven live by the native board.
// Read-only: GET /hq/api/native + /hq/api/agents-live, polled every 15 s.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildStudio } from './office2.js';
import { buildPerson, animatePerson, STATE_COLORS } from './avatars2.js';
import { initHud } from './hud.js';

function bootFail(msg) {
  try {
    const b = document.getElementById('chip');
    b.textContent = '⚠ ' + msg;
    b.style.display = 'block';
  } catch {}
}
addEventListener('error', e => bootFail(e.message ?? 'script error'));
addEventListener('unhandledrejection', e => bootFail(String(e.reason?.message ?? e.reason ?? 'async error')));

const splash = document.createElement('div');
splash.id = 'bootsplash';
splash.innerHTML = '<b>The Office</b><span>starting…</span>';
document.body.appendChild(splash);

export const bus = new EventTarget();
const STUDIO = {
  gold: '#e0a341', purple: '#a371f7', green: '#4bc98b', orange: '#ff8a5c',
  muted: '#a79fb8', ink: '#efe9f6', red: '#e05c5c',
};

// ----------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141019);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 2.92, 6.35);

try {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.25;
} catch {}

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.35, 0.5, 0.9);
composer.addPass(bloom);
composer.addPass(new SMAAPass(innerWidth, innerHeight));
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0.5);
controls.minPolarAngle = 0.15; controls.maxPolarAngle = 1.52;
controls.minDistance = 3; controls.maxDistance = 30;
controls.enableDamping = true;

// warm light only — no blue, no neon
RectAreaLightUniformsLib.init();
scene.add(new THREE.AmbientLight(0x9a7a5e, 0.95));
scene.add(new THREE.HemisphereLight(0xffe2b8, 0x2a1e22, 0.85));
const key = new THREE.DirectionalLight(0xffd0a0, 1.35);
key.position.set(-8, 10, -6);               // sunset through the back windows
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -16; key.shadow.camera.right = 16;
key.shadow.camera.top = 12; key.shadow.camera.bottom = -12;
key.shadow.camera.far = 40;
key.shadow.bias = -0.0005;
scene.add(key);
for (const wx of [-7, 0, 7]) {
  const l = new THREE.RectAreaLight(0xff9a5c, 4.5, 5, 2.5);
  l.position.set(wx, 1.8, -6.7);
  l.lookAt(wx, 1.2, 0);
  scene.add(l);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ----------------------------------------------------------------- world
const anchors = new Map(), graph = new Map();
const office = buildStudio();
scene.add(office.group);
for (const [k, v] of office.anchors) anchors.set(k, v);
for (const [a, b] of office.edges) {
  const cost = anchors.get(a).pos.distanceTo(anchors.get(b).pos);
  (graph.get(a) ?? graph.set(a, []).get(a)).push({ to: b, cost });
  (graph.get(b) ?? graph.set(b, []).get(b)).push({ to: a, cost });
}

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

// ----------------------------------------------------------------- the team
const ROSTER = [
  { id: 'marcus', name: 'Marcus', role: 'Orchestrator', group: 'Run', desk: 'desk_marcus', shirt: 0x3a3244, trousers: 0x241f2e },
  { id: 'ravi', name: 'Ravi', role: 'Build', group: 'Build', desk: 'desk_build_1', shirt: 0x4a3b6b, trousers: 0x2c2536 },
  { id: 'priya', name: 'Priya', role: 'Build', group: 'Build', desk: 'desk_build_2', shirt: 0x6b3a55, trousers: 0x322030 },
  { id: 'naomi', name: 'Naomi', role: 'Build · ships', group: 'Build', desk: 'desk_build_3', shirt: 0x37536b, trousers: 0x24303c },
  { id: 'joko', name: 'Joko', role: 'Build', group: 'Build', desk: 'desk_build_4', shirt: 0x54632e, trousers: 0x2c3122 },
  { id: 'sage', name: 'Sage', role: 'Run', group: 'Run', desk: 'desk_run_1', shirt: 0x2f5d50, trousers: 0x20322c },
  { id: 'kwasi', name: 'Kwasi', role: 'Run', group: 'Run', desk: 'desk_run_2', shirt: 0x6b4a2e, trousers: 0x342a20 },
  { id: 'sari', name: 'Sari', role: 'Run', group: 'Run', desk: 'desk_run_3', shirt: 0x51384a, trousers: 0x2c2130 },
  { id: 'errol', name: 'Errol', role: 'Run', group: 'Run', desk: 'desk_run_4', shirt: 0x37476b, trousers: 0x232c40 },
  { id: 'meiling', name: 'Mei Ling', role: 'Run', group: 'Run', desk: 'desk_run_5', shirt: 0x6b3744, trousers: 0x342028 },
];
const byId = new Map();

// typing dots (shared canvas sprite factory)
function typingDots() {
  const cv = document.createElement('canvas');
  cv.width = 96; cv.height = 32;
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(0.36, 0.12, 1);
  sp.userData = { cv, tex };
  return sp;
}

class Agent {
  constructor(spec) {
    this.spec = spec;
    this.name = spec.name;
    this.agentId = spec.id;
    this.person = buildPerson({
      name: spec.name,
      sub: spec.role,
      portraitUrl: `/hq/avatars/${spec.id}.jpg`,
      shirt: spec.shirt,
      trousers: spec.trousers,
    });
    this.group = this.person.root;
    scene.add(this.group);
    this.dots = typingDots();
    this.dots.visible = false;
    this.group.add(this.dots);
    this.dots.position.set(0, 1.5, -0.55);
    this.lastNode = spec.desk;
    this.sitAt(spec.desk, 'sit');
    this.mode = null;
    this.path = []; this.onArrive = null; this.seatY = 0;
    this.timer = null;
    this.t = Math.random() * 9;
    byId.set(spec.id, this);
    office.screens.get(spec.desk) && (this.screen = office.screens.get(spec.desk));
  }
  setMode(mode, info = {}) {
    if (this.mode === mode && !info.force) {
      if (mode === 'working' && info.title) setBubble(this, info.title, 'working');
      if (mode === 'blocked' && info.ask) setBubble(this, info.ask, 'blocked');
      return;
    }
    this.mode = mode;
    this.person.setState(mode);
    this.person.setGrey(mode === 'offline');
    this.dots.visible = mode === 'working';
    if (this.screen) {
      this.screen.emissive.set(mode === 'working' ? 0xffe6b0 : 0x4bc98b);
      this.screen.emissiveIntensity = mode === 'working' ? 0.85 : 0.06;
    }
    switch (mode) {
      case 'working':
        this.goto(this.spec.desk, () => this.sitAt(this.spec.desk, 'type'));
        setBubble(this, info.title ?? '', 'working');
        break;
      case 'stale':
        this.goto(this.spec.desk, () => this.sitAt(this.spec.desk, 'sit'));
        setBubble(this, '?', 'stale');
        break;
      case 'blocked':
        this.goto(this.spec.desk, () => this.standBesideDesk());
        setBubble(this, info.ask ?? 'waiting for Ray', 'blocked');
        break;
      case 'offline':
        this.path = [];
        this.person.pose = 'sit';
        setTag(this, 'offline', STUDIO.red);
        clearBubble(this);
        break;
      default: {
        clearBubble(this);
        setTag(this, null);
        this.idlePlan();
      }
    }
    refreshPanel();
  }
  idlePlan() {
    const r = Math.random();
    if (r < 0.4) {
      const s = Math.random() < 0.5 ? 'sofa_1' : 'sofa_2';
      this.goto(s, () => { this.sitAt(s, 'sofa'); this.timer = 18 + Math.random() * 22; });
      this.idleBadge('💤');
    } else if (r < 0.75) {
      this.goto('coffee', () => { this.person.pose = 'mug'; this.timer = 12 + Math.random() * 14; });
      this.idleBadge('☕');
    } else {
      const p = ['plant_1', 'plant_2', 'plant_desk'][Math.floor(Math.random() * 3)];
      this.goto(p, () => { this.person.pose = 'water'; this.timer = 10 + Math.random() * 10; });
      this.idleBadge('🌱');
    }
  }
  idleBadge(emoji) { setTag(this, emoji); }
  goto(name, onArrive) {
    const p = aStar(this.lastNode, name);
    if (!p) return;
    this.path = p.filter(n => n !== this.lastNode).map(n => ({ name: n, pos: anchors.get(n).pos.clone() }));
    this.onArrive = onArrive ?? null;
    this.person.pose = 'walk';
    this.seatY = 0;
    if (!this.path.length && this.onArrive) { const f = this.onArrive; this.onArrive = null; f(); }
  }
  sitAt(name, pose) {
    const a = anchors.get(name);
    this.group.position.copy(a.pos);
    const yaw = Math.atan2(2 * (a.quat.w * a.quat.y), 1 - 2 * a.quat.y * a.quat.y);
    this.group.rotation.set(0, yaw, 0);
    this.lastNode = name;
    this.person.pose = pose;
    this.path = [];
  }
  standBesideDesk() {
    const a = anchors.get(this.spec.desk);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(a.quat);
    this.group.position.copy(a.pos).addScaledVector(fwd, -0.45);
    const yaw = Math.atan2(fwd.x, fwd.z);
    this.group.rotation.set(0, yaw, 0);
    this.lastNode = this.spec.desk;
    this.person.pose = 'handup';
    this.path = [];
  }
  update(dt) {
    if (this.mode === 'offline') { animatePerson(this.person, dt, camera.position); return; }
    if (this.path.length) {
      const target = this.path[0].pos;
      const d = target.clone().sub(this.group.position); d.y = 0;
      const dist = d.length();
      if (dist < 0.07) {
        this.lastNode = this.path[0].name ?? this.lastNode;
        this.path.shift();
        if (!this.path.length) { this.person.pose = 'stand'; if (this.onArrive) { const f = this.onArrive; this.onArrive = null; f(); } }
      } else {
        this.group.position.addScaledVector(d.normalize(), Math.min(1.35 * dt, dist));
        const ty = Math.atan2(-d.x, -d.z);
        let dy = ty - this.group.rotation.y;
        while (dy > Math.PI) dy -= 2 * Math.PI;
        while (dy < -Math.PI) dy += 2 * Math.PI;
        this.group.rotation.y += dy * Math.min(8 * dt, 1);
      }
    }
    if (this.timer != null && !this.path.length) {
      this.timer -= dt;
      if (this.timer <= 0) { this.timer = null; if (this.mode === 'idle') this.idlePlan(); }
    }
    if (this.dots.visible) {
      const x = this.dots.userData.cv.getContext('2d');
      x.clearRect(0, 0, 96, 32);
      for (let i = 0; i < 3; i++) {
        const on = (Math.floor(this.t * 3) + i) % 3 !== 0;
        x.fillStyle = on ? '#ffe6b0' : 'rgba(255,230,176,.25)';
        x.beginPath(); x.arc(18 + i * 30, 16, 8, 0, Math.PI * 2); x.fill();
      }
      this.dots.userData.tex.needsUpdate = true;
    }
    this.t += dt;
    animatePerson(this.person, dt, camera.position);
  }
}

for (const spec of ROSTER) new Agent(spec);
const agents = [...byId.values()];

// idle scheduler
setInterval(() => {
  for (const a of agents) {
    try {
      if (a.mode !== 'idle' || a.path.length || a.timer != null) continue;
      a.idlePlan();
    } catch (e) { console.warn('[office] idle', a.agentId, e); }
  }
}, 4000);

// ----------------------------------------------------------------- bubbles, tags, leader lines
const layer = document.getElementById('layer');
const svg = document.getElementById('lines');
const bubbles = new Map();   // agentId -> {el, line, kind}
const tags = new Map();

function setBubble(a, text, kind) {
  let b = bubbles.get(a.agentId);
  if (!b) {
    const el = document.createElement('div');
    el.className = 'bubble';
    layer.appendChild(el);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('class', 'leader');
    svg.appendChild(line);
    b = { el, line, kind };
    bubbles.set(a.agentId, b);
  }
  b.kind = kind;
  b.text = text;
  elSet(b.el, text, kind);
}
function elSet(el, text, kind) {
  el.textContent = text;
  el.dataset.kind = kind;
  el.className = 'bubble';
}
function clearBubble(a) {
  const b = bubbles.get(a.agentId);
  if (b) { b.el.remove(); b.line.remove(); bubbles.delete(a.agentId); }
}
function setTag(a, text, color) {
  let t = tags.get(a.agentId);
  if (!t) {
    const el = document.createElement('div');
    el.className = 'atag';
    layer.appendChild(el);
    t = { el };
    tags.set(a.agentId, t);
  }
  t.el.textContent = text ?? '';
  t.el.style.display = text ? 'flex' : 'none';
  if (color) t.el.style.color = color;
  else t.el.style.color = '';
}

const _v = new THREE.Vector3();
function updateOverlays() {
  const placed = [];
  for (const [id, b] of bubbles) {
    const a = byId.get(id);
    if (!a || (a.mode !== 'working' && a.mode !== 'blocked' && a.mode !== 'stale')) { b.el.style.display = 'none'; b.line.style.display = 'none'; continue; }
    a.person.head.getWorldPosition(_v);
    _v.y += 0.42;
    const head = _v.clone().project(camera);
    const sx = (head.x * 0.5 + 0.5) * innerWidth;
    const sy = (-head.y * 0.5 + 0.5) * innerHeight;
    const behind = head.z > 1;
    b.el.style.display = behind ? 'none' : 'block';
    b.line.style.display = behind ? 'none' : 'block';
    if (behind) continue;
    placed.push({ b, sx, sy, headW: _v.clone() });
  }
  // never overlap: sort top-down, push each below the previous
  placed.sort((p, q) => p.sy - q.sy);
  let lastBottom = -1e9;
  for (const p of placed) {
    let top = p.sy - 46;
    if (top < lastBottom + 8) top = lastBottom + 8;
    p.top = top;
    lastBottom = top + p.b.el.offsetHeight + 4;
  }
  for (const p of placed) {
    const w = p.b.el.offsetWidth;
    const left = Math.min(Math.max(p.sx - w / 2, 8), innerWidth - w - 8);
    p.b.el.style.left = left + 'px';
    p.b.el.style.top = p.top + 'px';
    const x1 = left + w / 2, y1 = p.top + p.b.el.offsetHeight;
    const toX = p.sx, toY = (-(p.headW.clone().project(camera).y) * 0.5 + 0.5) * innerHeight;
    const midY = (y1 + toY) / 2;
    p.b.line.setAttribute('points', `${x1},${y1} ${x1},${midY} ${toX},${midY} ${toX},${toY}`);
  }
  for (const [id, t] of tags) {
    const a = byId.get(id);
    if (!a) continue;
    a.person.root.getWorldPosition(_v);
    _v.y += 2.05;
    _v.project(camera);
    t.el.style.left = ((_v.x * 0.5 + 0.5) * innerWidth - 14) + 'px';
    t.el.style.top = ((-_v.y * 0.5 + 0.5) * innerHeight - 14) + 'px';
    t.el.style.display = _v.z > 1 ? 'none' : 'flex';
  }
}

// ----------------------------------------------------------------- live board
const chipEl = document.getElementById('chip');
const bellEl = document.getElementById('bell');
let boardOk = true;
let lastNeeds = 0;
let audioCtx = null;
addEventListener('pointerdown', () => { try { audioCtx ??= new AudioContext(); } catch {} }, { once: true });

function chime() {
  try {
    audioCtx ??= new AudioContext();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.65);
  } catch { /* silent */ }
}

const HB_STALE = 3 * 60 * 1000;
async function getJson(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally { clearTimeout(t); }
}

async function pollBoard() {
  let native, live;
  try {
    [native, live] = await Promise.all([getJson('/hq/api/native'), getJson('/hq/api/agents-live')]);
    boardOk = true;
    chipEl.style.display = 'none';
  } catch (e) {
    boardOk = false;
    console.warn('[office] board poll failed:', e?.message ?? e);
    chipEl.textContent = 'board not answering — showing last state';
    chipEl.style.display = 'block';
    return;
  }
  const now = Date.now();
  const cards = native.cards ?? [];
  const perAgent = new Map();
  for (const c of cards) {
    if (!c.assignee || !byId.has(c.assignee)) continue;
    if (!perAgent.has(c.assignee)) perAgent.set(c.assignee, { running: [], blocked: null });
    const rec = perAgent.get(c.assignee);
    if (c.status === 'blocked' && !rec.blocked) rec.blocked = c;
    else if (c.status === 'running') rec.running.push(c);
  }

  const needs = [];
  for (const a of agents) {
    try {
      const up = live?.agents?.[a.agentId]?.up;
      const rec = perAgent.get(a.agentId);
      a.currentCards = rec ? [...(rec.blocked ? [rec.blocked] : []), ...rec.running] : [];
      if (rec?.blocked) {
        const line = shortLine(rec.blocked.ask);
        a.setMode('blocked', { ask: line });
        needs.push({ name: a.name, line });
      } else if (rec?.running.length) {
        const c = rec.running[0];
        const fresh = c.last_heartbeat_at && now - c.last_heartbeat_at < HB_STALE;
        a.setMode(fresh ? 'working' : 'stale', { title: shortLine(c.title, 40) });
      } else if (up === false) {
        a.setMode('offline');
      } else {
        a.setMode('idle');
      }
    } catch (e) { console.warn('[office] apply', a.agentId, e); }
  }
  office.drawNeeds(needs);
  bellEl.textContent = needs.length ? String(needs.length) : '';
  bellEl.classList.toggle('on', needs.length > 0);
  if (needs.length > lastNeeds) chime();
  lastNeeds = needs.length;
  updateHeaderCounts();
}
const shortLine = (s, n = 42) => {
  const one = String(s ?? '').split('\n').find(l => l.trim()) ?? '';
  const t = one.trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

// ----------------------------------------------------------------- page chrome
function updateHeaderCounts() {
  const c = { working: 0, blocked: 0, idle: 0, offline: 0 };
  for (const a of agents) c[a.mode === 'stale' ? 'working' : (a.mode ?? 'idle')] = (c[a.mode === 'stale' ? 'working' : (a.mode ?? 'idle')] ?? 0) + 1;
  const set = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
  set('k-working', c.working);
  set('k-needs', c.blocked);
  set('k-idle', c.idle);
  set('k-offline', c.offline);
  const nb = document.getElementById('needs-badge');
  if (nb) nb.textContent = c.blocked;
}

document.getElementById('cmdk').onclick = () => document.getElementById('palette').classList.toggle('open');
addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    document.getElementById('palette').classList.toggle('open');
  }
  if (e.key === 'Escape') {
    document.getElementById('palette').classList.remove('open');
    showTeamPanel();
  }
});
document.getElementById('palette').addEventListener('click', e => {
  const it = e.target.closest('[data-go]');
  if (it) location.href = it.dataset.go;
});

// news banner (same feel as /hq; static placeholder text, no feed invented)
const newsTrack = document.getElementById('news');
if (newsTrack) newsTrack.textContent = 'live on the native board · read-only · polls every 15 s';

// ----------------------------------------------------------------- panel + click
const panel = initHud({ agents: () => agents, byId, onPick: id => { selectPerson(id); sim.flyToAgent(id); } });
let panelDirty = false;
function refreshPanel() { panelDirty = true; }
setInterval(() => { if (panelDirty) { panelDirty = false; panel.refresh?.(); } }, 900);
function showTeamPanel() { panel.showTeam?.(); clearSelection(); }
function selectPerson(id) { panel.showPerson?.(byId.get(id)); markSelected(id); }
let selectedId = null;
function markSelected(id) { selectedId = id; }
function clearSelection() { selectedId = null; }

{
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let downXY = null;
  renderer.domElement.addEventListener('pointerdown', e => { downXY = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!downXY) return;
    const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]);
    downXY = null;
    if (moved > 5) return;
    ptr.x = (e.clientX / innerWidth) * 2 - 1;
    ptr.y = -(e.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(ptr, camera);
    const hits = ray.intersectObjects(agents.map(a => a.group), true);
    let target = null;
    if (hits.length) {
      let o = hits[0].object;
      while (o && !target) { target = agents.find(a => a.group === o) ?? null; o = o.parent; }
    }
    if (target) selectPerson(target.agentId);
    else showTeamPanel();
  });
}

// ----------------------------------------------------------------- sim API + loop
const presets = {
  overview: { cam: new THREE.Vector3(0, 2.92, 6.35), target: new THREE.Vector3(0, 1.0, -2.4) },
  build: { cam: new THREE.Vector3(-7.4, 2.6, 1.6), target: new THREE.Vector3(-7.4, 1, -3.0) },
  run: { cam: new THREE.Vector3(7.6, 2.6, 1.6), target: new THREE.Vector3(7.6, 1, -3.0) },
  lounge: { cam: new THREE.Vector3(-6.8, 2.2, 1.8), target: new THREE.Vector3(-10.4, 0.8, 4.9) },
  marcus: { cam: new THREE.Vector3(7.0, 2.1, 2.2), target: new THREE.Vector3(11.2, 1.1, 5.2) },
};
let flight = null;
const sim = {
  followed: null,
  followAgent(id) { sim.followed = id == null ? null : byId.get(id) ?? null; },
  flyToRoom(name) { const p = presets[name]; if (p) { sim.followed = null; flight = { from: camera.position.clone(), to: p.cam.clone(), t0: controls.target.clone(), t1: p.target.clone(), k: 0 }; } },
  flyToAgent(id) {
    const a = byId.get(id);
    if (!a) return;
    sim.followed = null;
    const p = a.group.position;
    flight = {
      from: camera.position.clone(),
      to: new THREE.Vector3(p.x + (p.x > 8 ? -2.4 : 2.4), 2.3, p.z + 2.8),
      t0: controls.target.clone(),
      t1: new THREE.Vector3(p.x, 1.2, p.z),
      k: 0,
    };
  },
  getAgents: () => agents,
  byId, scene, camera, controls, renderer,
};
window.sim = sim;
for (const [name, p] of Object.entries(presets)) {
  const b = document.createElement('button');
  b.textContent = name;
  b.onclick = () => sim.flyToRoom(name);
  document.getElementById('rooms').appendChild(b);
}

setTimeout(pollBoard, 1200);
setInterval(pollBoard, 15000);

const clock = new THREE.Clock();
let firstFrame = true;
renderer.setAnimationLoop(() => {
  if (firstFrame) { firstFrame = false; splash.remove(); }
  const dt = Math.min(clock.getDelta(), 0.05);
  for (const a of agents) a.update(dt);
  office.tick?.();
  if (flight) {
    flight.k = Math.min(flight.k + dt / 0.8, 1);
    const e = flight.k * flight.k * (3 - 2 * flight.k);
    camera.position.lerpVectors(flight.from, flight.to, e);
    controls.target.lerpVectors(flight.t0, flight.t1, e);
    if (flight.k >= 1) flight = null;
  }
  if (sim.followed) {
    const p = sim.followed.group.position;
    controls.target.lerp(new THREE.Vector3(p.x, 1.2, p.z), Math.min(dt * 5, 1));
  }
  controls.update();
  updateOverlays();
  composer.render();
});
