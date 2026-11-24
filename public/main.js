// 110lymph.nl — 3D Agent Office v2 (SPEC-2026-043)
// The ten v2 agents (Marcus, Sage, Ravi, Priya, Joko, Naomi, Kwasi, Sari,
// Errol, Mei Ling) living in the office, driven ONLY by the native board:
//   GET /hq/api/native        cards (running / blocked / ...)
//   GET /hq/api/agents-live   gateway up/down
// No adapter, no buzz/mail, no demo mode. Read-only, poll every 15 s.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { initHud } from './hud.js';
import { showAgentCard, hideAgentCard } from './agentcard.js';
import { buildHumanoid, animateHumanoid } from './avatars.js';
import { buildOffice } from './office.js';

// ---- crash visibility: surface any error in the badge, never a silent black
function bootFail(msg) {
  try {
    const b = document.getElementById('demobadge');
    b.textContent = '⚠ ' + msg;
    b.style.display = 'block';
    b.style.borderColor = '#ff8a5c';
    b.style.color = '#ff8a5c';
    b.style.background = 'rgba(255,138,92,.12)';
  } catch {}
}
addEventListener('error', e => bootFail(e.message ?? 'script error'));
addEventListener('unhandledrejection', e => bootFail(String(e.reason?.message ?? e.reason ?? 'async error')));

// ---- quality tier (same behaviour as v1)
const QPARAM = new URLSearchParams(location.search).get('q');
const NODEGRADE = new URLSearchParams(location.search).get('nodegrade') !== null;
let Q = QPARAM ?? (() => { try { return localStorage.getItem('officeQ'); } catch { return null; } })() ?? 'high';
if (Q !== 'low' && Q !== 'high') Q = 'high';
if (QPARAM === 'high' || QPARAM === 'low') {
  try { localStorage.setItem('officeQ', QPARAM); sessionStorage.removeItem('officeDegraded'); } catch {}
}
const LOWQ = Q === 'low';

// ---- boot splash
const bootT0 = performance.now();
const bootStages = [];
const splash = document.createElement('div');
splash.id = 'bootsplash';
splash.innerHTML = '<b>110lymph.nl</b><span>starting…</span>';
document.body.appendChild(splash);
function bootStage(name) {
  const t = Math.round(performance.now() - bootT0);
  bootStages.push(`${name} @${t}ms`);
  console.log(`[boot] ${name} @${t}ms`);
  const sp = splash.querySelector('span');
  if (sp) sp.textContent = name + '…';
}

export const bus = new EventTarget();

// ----------------------------------------------------------------- constants
const WALK_SPEED = 1.4, TURN_SPEED = 8.0;
const STUDIO = {
  gold: '#e0a341', purple: '#a371f7', green: '#4bc98b',
  orange: '#ff8a5c', muted: '#a79fb8', ink: '#efe9f6', red: '#e05c5c',
};
const STATUS_COLOR = {
  working: STUDIO.green, stale: STUDIO.gold, blocked: STUDIO.orange,
  idle: STUDIO.muted, offline: '#6e6878',
};

// ----------------------------------------------------------------- renderer + post
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Q === 'low' ? 1 : Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = !LOWQ;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
document.getElementById('view').appendChild(renderer.domElement);

const scene = new THREE.Scene();
function makeDuskSky() {
  const cv = document.createElement('canvas');
  cv.width = 8; cv.height = 512;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.00, '#0b1024');
  grad.addColorStop(0.30, '#121a36');
  grad.addColorStop(0.44, '#1e2444');
  grad.addColorStop(0.50, '#3a3550');
  grad.addColorStop(0.60, '#10131f');
  grad.addColorStop(1.00, '#080a10');
  g.fillStyle = grad; g.fillRect(0, 0, 8, 512);
  const tex = new THREE.CanvasTexture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
scene.background = makeDuskSky();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 300);
camera.position.set(20, 28, 44);

bootStage('environment');
try {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;
} catch (e) { console.warn('[office] environment setup failed:', e); }

export const VERSION = '3.0.0';                            // SPEC-2026-043 v2 team
console.log(`%c110lymph.nl 3D Office v${VERSION}`, 'color:#e0a341;font-weight:bold');
const FX = new URLSearchParams(location.search).get('fx') ?? (LOWQ ? 'basic' : 'noao');
console.log('[office] fx pipeline:', FX);

const GradeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 x = max(vec3(0.0), c.rgb);
      x = x * (1.06 + 0.16 * x) / (1.0 + 0.22 * x);
      float l = dot(x, vec3(0.299, 0.587, 0.114));
      x += (0.5 - abs(l - 0.5)) * vec3(-0.016, 0.003, 0.020) * (1.0 - l * 1.6);
      float d = distance(vUv, vec2(0.5));
      x *= 0.82 + 0.22 * smoothstep(0.85, 0.25, d);
      gl_FragColor = vec4(x, c.a);
    }`,
};

const composer = new EffectComposer(renderer);
if (FX === 'full') {
  const ssao = new SSAOPass(scene, camera, innerWidth, innerHeight);
  ssao.kernelRadius = 0.5; ssao.minDistance = 0.0008; ssao.maxDistance = 0.12;
  composer.addPass(ssao);
} else {
  composer.addPass(new RenderPass(scene, camera));
}
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.6, 0.5, 0.85);
composer.addPass(bloom);
if (FX === 'full' || FX === 'noao') {
  composer.addPass(new SMAAPass(innerWidth, innerHeight));
  composer.addPass(new ShaderPass(GradeShader));
}
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

const ambLight = new THREE.AmbientLight(0x39404f, 1.0);
const hemiLight = new THREE.HemisphereLight(0xbfd4ff, 0x232730, 1.5);
scene.add(ambLight, hemiLight);
const key = new THREE.DirectionalLight(0xcfd8ff, 0.8);
key.position.set(30, 40, 10);
key.castShadow = !LOWQ;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -26; key.shadow.camera.right = 26;
key.shadow.camera.top = 26; key.shadow.camera.bottom = -26;
key.shadow.camera.near = 10; key.shadow.camera.far = 90;
key.shadow.bias = -0.0006;
key.target.position.set(20, 0, 13);
scene.add(key, key.target);

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

async function boot() {
  bootStage('fetching layout');
  const [officeReport, wp] = await Promise.all([
    fetch('/anchors.json').then(r => r.json()),
    fetch('/waypoints.json').then(r => r.json()),
  ]);
  bootStage('building office');
  const office = buildOffice(officeReport);
  scene.add(office.group);
  bootStage('office built');
  for (const [k, v] of office.anchors) anchors.set(k, v);
  rooms = wp.rooms;

  const V8 = true;
  ambLight.intensity = 0.75; ambLight.color.set(0x434a55);
  hemiLight.intensity = 1.05; hemiLight.color.set(0xcfd9ee);
  key.intensity = 0.55;
  renderer.toneMappingExposure = 1.15;
  bloom.strength = 0.25; bloom.threshold = 0.9;
  scene.fog = new THREE.Fog(0x141a2e, 28, 105);

  const peakFade = [];
  office.group.traverse(o => {
    if (!o.isMesh) return;
    const peak = /^(wall_|mullion|green_wall)/.test(o.name) ? 0.5
               : /^ceiling_/.test(o.name) ? 0.1 : null;
    if (peak == null) return;
    o.material = o.material.clone();
    peakFade.push({ mat: o.material, base: o.material.opacity ?? 1, peak });
  });
  let peakOn = false, peakK = 0;
  const roomLabels = [];
  for (const [r, info] of Object.entries(wp.rooms)) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    const x = cv.getContext('2d');
    x.fillStyle = 'rgba(13,15,19,.55)'; x.fillRect(0, 0, 256, 64);
    const text = (info.label ?? r).toUpperCase();
    let fontPx = 34;
    do { x.font = `bold ${fontPx}px sans-serif`; } while (x.measureText(text).width > 256 - 20 && --fontPx > 15);
    x.fillStyle = '#e8eaee'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 128, 34);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0, depthTest: false }));
    sp.scale.set(4.2, 1.05, 1);
    sp.position.set(info.center[0], 4.6, info.center[2]);
    sp.visible = false;
    scene.add(sp); roomLabels.push(sp);
  }
  const grid = new THREE.GridHelper(64, 64, 0x4dd8ff, 0x2a2e3a);
  grid.position.set(20, 0.03, 12);
  grid.material.transparent = true; grid.material.opacity = 0;
  grid.visible = false;
  scene.add(grid);

  for (const [a, b] of wp.edges) {
    const cost = anchors.get(a).pos.distanceTo(anchors.get(b).pos);
    (graph.get(a) ?? graph.set(a, []).get(a)).push({ to: b, cost });
    (graph.get(b) ?? graph.set(b, []).get(b)).push({ to: a, cost });
  }

  // pendants + corridor strips (same as v1)
  if (LOWQ) {
    ambLight.intensity += 0.3;
    hemiLight.intensity += 0.25;
  } else {
    for (const [r, info] of Object.entries(rooms)) {
      if (r === 'corridor') continue;
      const l = new THREE.PointLight(0xfff1d6, 0.7, 10, 1.6);
      l.position.set(info.center[0], 2.25, info.center[2]);
      scene.add(l);
    }
    const cs = [];
    for (let i = 1; i <= 6; i++) {
      const a = anchors.get(`nav_corridor_${String(i).padStart(2, '0')}`);
      if (a) cs.push(a.pos);
    }
    if (cs.length >= 2) {
      const a0 = cs[0], a1 = cs[cs.length - 1];
      const mid = a0.clone().add(a1).multiplyScalar(0.5);
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(a0.distanceTo(a1) + 2, 0.05, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x0b0d12, emissive: 0x4dd8ff, emissiveIntensity: 1.0 }));
      strip.position.set(mid.x, 2.42, mid.z);
      strip.rotation.y = -Math.atan2(a1.z - a0.z, a1.x - a0.x);
      scene.add(strip);
      for (const i of [1, 3, 5]) {
        if (!cs[i]) continue;
        const l = new THREE.PointLight(0xbfd9ff, 0.55, 7, 1.6);
        l.position.copy(cs[i]).setY(2.2);
        scene.add(l);
      }
    }
  }
  if (Q !== 'low') {
    RectAreaLightUniformsLib.init();
    const rect = (color, intensity, w, h, x, y, z, lookX, lookY, lookZ) => {
      const l = new THREE.RectAreaLight(color, intensity, w, h);
      l.position.set(x, y, z); l.lookAt(lookX, lookY, lookZ); scene.add(l);
    };
    rect(0x9db8e8, 2.2, 13, 3.4, 9, 2, 0.4, 9, 1.4, 6);
    rect(0x9db8e8, 1.6, 13, 3.4, 31, 2, 0.4, 31, 1.4, 6);
    rect(0xfff2dc, 1.7, 2.4, 1.0, 2.3, 1.8, 14.2, 6, 1.6, 14.2);
    rect(0x86c8ff, 2.4, 3.0, 1.6, 37.6, 1.7, 3.0, 31.5, 1.0, 3.0);
    for (const z of [3.5, 9, 14.5]) {
      const sp = new THREE.SpotLight(0xcfe0ff, 14, 9, 0.5, 0.55, 1.6);
      sp.position.set(20, 2.7, z);
      sp.target.position.set(20, 0, z);
      scene.add(sp, sp.target);
    }
  }
  if (Q === 'low') {
    const fill = new THREE.PointLight(0xcfe0ff, 0.5, 18, 1.4);
    fill.position.set(20, 2.5, 9);
    scene.add(fill);
  }

  // hologram (office decor, kept)
  {
    const h = anchors.get('meet_holo').pos;
    holo = new THREE.Group(); holo.position.copy(h);
    const pm = new THREE.MeshBasicMaterial({ color: 0x4dd8ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), pm);
      p.rotation.y = i * Math.PI / 3; holo.add(p);
    }
    holo.userData.light = new THREE.PointLight(0x4dd8ff, 0.3, 6);
    holo.add(holo.userData.light);
    scene.add(holo);
    for (const prefix of ['work_desk_', 'doc_desk_']) {
      const limit = prefix === 'work_desk_' ? 8 : 4;
      for (let i = 1; i <= limit; i++) {
        const name = `${prefix}${String(i).padStart(2, '0')}`;
        const a = anchors.get(name);
        if (!a) continue;
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.05, 0.05),
          new THREE.MeshStandardMaterial({ color: 0x111418, emissive: 0x4bc98b, emissiveIntensity: 0.05 }));
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(a.quat);
        m.position.copy(a.pos).addScaledVector(fwd, 0.5).setY(0.78);
        m.quaternion.copy(a.quat);
        scene.add(m); deskGlow.set(name, m);
      }
    }
  }

  // ----------------------------------------------------------------- A*
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

  // ----------------------------------------------------------------- v2 team (SPEC-2026-043)
  // Build: Ravi, Priya, Naomi, Joko (devops room). Run: Marcus (corner office),
  // Sage, Kwasi, Sari, Errol, Mei Ling (staff room).
  const ROSTER = [
    { id: 'marcus', name: 'Marcus',  role: 'command',    group: 'Run',   desk: 'ceo_desk',    blurb: 'Orchestrator' },
    { id: 'ravi',   name: 'Ravi',    role: 'devops',     group: 'Build', desk: 'work_desk_01', blurb: 'Build' },
    { id: 'priya',  name: 'Priya',   role: 'specialist', group: 'Build', desk: 'work_desk_02', blurb: 'Build' },
    { id: 'naomi',  name: 'Naomi',   role: 'coo',        group: 'Build', desk: 'work_desk_03', blurb: 'Build · ships' },
    { id: 'joko',   name: 'Joko',    role: 'devops',     group: 'Build', desk: 'work_desk_04', blurb: 'Build' },
    { id: 'sage',   name: 'Sage',    role: 'specialist', group: 'Run',   desk: 'doc_desk_01', blurb: 'Run' },
    { id: 'kwasi',  name: 'Kwasi',   role: 'devops',     group: 'Run',   desk: 'doc_desk_02', blurb: 'Run' },
    { id: 'sari',   name: 'Sari',    role: 'specialist', group: 'Run',   desk: 'doc_desk_03', blurb: 'Run' },
    { id: 'errol',  name: 'Errol',   role: 'specialist', group: 'Run',   desk: 'doc_desk_04', blurb: 'Run' },
    { id: 'meiling', name: 'Mei Ling', role: 'coo',       group: 'Run',   desk: 'ollie_station', blurb: 'Run' },
  ];
  const GROUP_COLOR = { Build: STUDIO.purple, Run: STUDIO.green };

  function makeAvatar(colorHex, scale, role, seedName) {
    const h = buildHumanoid(colorHex, role, scale, seedName);
    return { root: h.root, parts: h.parts, materials: h.materials, tint: h.tint,
             headMat: h.statusMat, ring: h.ring, S: h.S };
  }

  function makeLabel(name, sub) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 72;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }));
    sprite.scale.set(1.25, 0.36, 1); sprite.position.y = 1.5;
    sprite.userData.name = name;
    sprite.userData.draw = (color, text) => {
      const x = cv.getContext('2d');
      x.clearRect(0, 0, 256, 72);
      x.fillStyle = 'rgba(20,16,25,.72)';
      const w = text ? 240 : 170;
      x.beginPath(); x.roundRect((256 - w) / 2, text ? 2 : 14, w, text ? 68 : 44, 10); x.fill();
      x.fillStyle = color ?? STUDIO.ink; x.font = 'bold 27px sans-serif'; x.textAlign = 'center';
      x.fillText(sprite.userData.name, 128, text ? 30 : 44);
      if (text) {
        const t = text.length > 34 ? text.slice(0, 33) + '…' : text;
        x.font = '21px sans-serif'; x.fillStyle = color ?? STUDIO.muted; x.fillText(t, 128, 60);
      }
      sprite.material.map.needsUpdate = true;
    };
    sprite.userData.draw(null);
    return sprite;
  }

  // desk name plate: portrait + name + group colour ring
  function makeNamePlate(spec) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 168;
    const x = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    function draw(img) {
      x.clearRect(0, 0, 256, 168);
      x.fillStyle = '#1b1622'; x.beginPath(); x.roundRect(0, 0, 256, 168, 14); x.fill();
      x.strokeStyle = GROUP_COLOR[spec.group]; x.lineWidth = 5;
      x.beginPath(); x.roundRect(3, 3, 250, 162, 12); x.stroke();
      if (img) x.drawImage(img, 12, 14, 132, 132);
      else {
        x.fillStyle = '#302838'; x.beginPath(); x.arc(78, 80, 62, 0, Math.PI * 2); x.fill();
        x.fillStyle = STUDIO.ink; x.font = 'bold 56px Georgia, serif'; x.textAlign = 'center';
        x.fillText(spec.name[0], 78, 100);
      }
      x.textAlign = 'left';
      x.fillStyle = STUDIO.ink; x.font = 'bold 30px Georgia, serif';
      x.fillText(spec.name, 154, 74);
      x.fillStyle = GROUP_COLOR[spec.group]; x.font = '20px sans-serif';
      x.fillText(spec.group.toUpperCase(), 154, 106);
      x.fillStyle = STUDIO.muted; x.font = '17px sans-serif';
      x.fillText(spec.blurb, 154, 134);
      tex.needsUpdate = true;
    }
    draw(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => draw(img);
    img.src = `/hq/avatars/${spec.id}.jpg`;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.41),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    const a = anchors.get(spec.desk);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(a.quat);
    m.position.copy(a.pos).addScaledVector(fwd, 0.55).setY(1.02);
    m.quaternion.copy(a.quat);
    return m;
  }

  // ----------------------------------------------------------------- Agent
  const agents = [];
  const byId = new Map();
  let briefingCount = 0;

  class Agent {
    constructor(spec) {
      this.spec = spec;
      this.name = spec.name; this.agentId = spec.id;
      const av = makeAvatar(GROUP_COLOR[spec.group], 1, spec.role, spec.id);
      Object.assign(this, { group: av.root, parts: av.parts, materials: av.materials, tintMat: av.tint, headMat: av.headMat, ring: av.ring });
      this.avatarScale = av.S;
      this.label = makeLabel(spec.name, spec.blurb);
      this.group.add(this.label);
      this.lastNode = spec.desk;
      this.group.position.copy(anchors.get(spec.desk).pos);
      this.state = 'idle'; this.pose = 'idle'; this.t = Math.random() * 9; this.timer = null;
      this.path = []; this.onArrive = null; this.seated = null;
      this.mode = null;                       // working | stale | blocked | idle | offline
      this.savedColors = null;
      this.fx = null;
      scene.add(this.group); agents.push(this);
      byId.set(spec.id, this);
      this.refreshStatus();
    }
    setGrey(on) {
      if (on && !this.savedColors) {
        this.savedColors = this.materials.map(m => ({ m, c: m.color.clone() }));
        for (const { m } of this.savedColors) m.color.set(0x55515c);
      } else if (!on && this.savedColors) {
        for (const { m, c } of this.savedColors) m.color.copy(c);
        this.savedColors = null;
      }
    }
    refreshStatus() {
      const st = this.mode ?? 'idle';
      const c = new THREE.Color(STATUS_COLOR[st] ?? STUDIO.muted);
      this.headMat.color.copy(c); this.headMat.emissive.copy(c);
      this.ring.visible = st === 'blocked';
      if (st === 'blocked') {
        this.ring.traverse(o => {
          if (o.material?.color) o.material.color.set(STUDIO.gold);
        });
      }
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
      const q = a.quat;
      const yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z));
      this.group.rotation.set(0, yaw, 0);
      this.seated = name; this.pose = pose; this.path = [];
    }
    standBesideDesk() {
      const a = anchors.get(this.spec.desk);
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(a.quat);
      this.group.position.copy(a.pos).addScaledVector(fwd, 0.55);
      const yaw = Math.atan2(-fwd.x, -fwd.z);
      this.group.rotation.set(0, yaw, 0);
      this.seated = null; this.path = []; this.pose = 'handup';
    }
    setLabel(color, text) { this.label.userData.draw(color, text); }
    remove() {
      scene.remove(this.group);
      this.group.traverse(o => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) { m?.map?.dispose?.(); m?.dispose?.(); }
      });
      agents.splice(agents.indexOf(this), 1);
      byId.delete(this.agentId);
      if (sim.followed === this) sim.followAgent(null);
    }
    update(dt) {
      this.t += dt;
      if (this.fx) {
        this.fx.t += dt;
        const k = Math.min(this.fx.t / 0.9, 1);
        if (this.fx.kind === 'celebrate') {
          this.group.position.y = Math.abs(Math.sin(this.fx.t * 7)) * 0.12 * (1 - k);
          if (k >= 1) { this.group.position.y = 0; this.fx = null; }
        } else { this.fx = null; }
      }
      if (this.path.length && this.mode !== 'offline') {
        const target = this.path[0].pos;
        const d = target.clone().sub(this.group.position); d.y = 0;
        const dist = d.length();
        if (dist < 0.06) {
          if (this.path[0].name) this.lastNode = this.path[0].name;
          this.path.shift();
          if (!this.path.length) { this.pose = 'idle'; if (this.onArrive) { const f = this.onArrive; this.onArrive = null; f(); } }
        } else {
          this.group.position.addScaledVector(d.normalize(), Math.min(WALK_SPEED * dt, dist));
          const targetYaw = Math.atan2(-d.x, -d.z);
          let dy = targetYaw - this.group.rotation.y;
          while (dy > Math.PI) dy -= 2 * Math.PI;
          while (dy < -Math.PI) dy += 2 * Math.PI;
          this.group.rotation.set(0, this.group.rotation.y + dy * Math.min(TURN_SPEED * dt, 1), 0);
        }
      }
      this.animate(dt);
    }
    animate(dt) {
      animateHumanoid(this, this.seated ? anchors.get(this.seated).pos.y : 0, dt);
    }
  }

  // spawn the team at their desks + name plates
  for (const spec of ROSTER) {
    new Agent(spec);
    scene.add(makeNamePlate(spec));
  }

  // ----------------------------------------------------------------- office behaviour (SPEC-2026-043 §Board state)
  const IDLE_SPOTS = Array.from({ length: 8 }, (_, i) => `lounge_seat_${String(i + 1).padStart(2, '0')}`);
  const WANDER = ['nav_corridor_01', 'nav_corridor_03', 'nav_corridor_05', 'nav_corridor_02'];

  function idlePlan(a) {
    // existing idle behaviour: coffee corner / walks / sofa (lounge seats)
    if (a.seated && a.mode === 'idle') { a.timer = 14 + Math.random() * 25; return; }
    if (Math.random() < 0.62) {
      const spot = IDLE_SPOTS[Math.floor(Math.random() * IDLE_SPOTS.length)];
      a.goto(spot, () => { a.sitAt(spot, 'sit'); a.timer = 16 + Math.random() * 26; });
    } else {
      const n = WANDER[Math.floor(Math.random() * WANDER.length)];
      a.goto(n, () => { a.pose = 'idle'; a.timer = 3 + Math.random() * 5; });
    }
  }

  function applyMode(a, mode, info) {
    if (a.mode === mode && !info?.force) {
      if (mode === 'working' && info?.title) a.setLabel(null, info.title);
      if (mode === 'blocked' && info?.ask) a.setLabel(STUDIO.gold, info.ask);
      return;
    }
    a.mode = mode;
    a.timer = null;
    a.setGrey(mode === 'offline');
    const glow = deskGlow.get(a.spec.desk);
    switch (mode) {
      case 'working':
        a.setLabel(null, info?.title ?? null);
        a.goto(a.spec.desk, () => a.sitAt(a.spec.desk, 'type'));
        if (glow) glow.material.emissiveIntensity = 1.4;
        break;
      case 'stale':                                    // running but heartbeat old
        a.setLabel(STUDIO.gold, '?');
        a.goto(a.spec.desk, () => a.sitAt(a.spec.desk, 'sit'));
        if (glow) glow.material.emissiveIntensity = 0.05;
        break;
      case 'blocked':                                  // waiting for Ray: raised hand
        a.setLabel(STUDIO.gold, info?.ask ?? 'waiting for Ray');
        a.goto(a.spec.desk, () => a.standBesideDesk());
        if (glow) glow.material.emissiveIntensity = 0.05;
        break;
      case 'offline':                                  // gateway down: grey, still
        a.path = [];
        a.setLabel(STUDIO.red, 'OFFLINE');
        if (glow) glow.material.emissiveIntensity = 0.05;
        break;
      default:                                         // idle
        a.setLabel(null, null);
        if (glow) glow.material.emissiveIntensity = 0.05;
        idlePlan(a);
    }
    a.refreshStatus();
  }

  // idle scheduler tick
  setInterval(() => {
    for (const a of agents) {
      try {
        if (a.mode !== 'idle' || a.path.length) continue;
        if (a.timer != null) { a.timer -= 1; if (a.timer > 0) continue; a.timer = null; }
        idlePlan(a);
      } catch (e) { console.warn('[office] idle ' + a.agentId + ' failed:', e); }
    }
  }, 1000);

  // ----------------------------------------------------------------- live board data
  const chip = document.getElementById('demobadge');
  chip.style.borderColor = STUDIO.gold;
  chip.style.color = STUDIO.gold;
  chip.style.background = 'rgba(224,163,65,.12)';
  let boardOk = true;
  function setChip(on, text) {
    chip.style.display = on ? 'block' : 'none';
    if (text) chip.textContent = text;
  }

  const HB_STALE_MS = 3 * 60 * 1000;
  const prevActive = new Set();              // for the done-celebration
  let firstPoll = true;

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
      setChip(false);
    } catch (e) {
      boardOk = false;
      console.warn('[office] board poll failed:', e?.message ?? e);
      setChip(true, 'board not answering — showing last state');
      return;
    }

    const now = Date.now();
    const cards = native.cards ?? [];
    const perAgent = new Map();
    for (const c of cards) {
      const who = c.assignee;
      if (!who || !byId.has(who)) continue;
      if (!perAgent.has(who)) perAgent.set(who, { running: [], blocked: null });
      const rec = perAgent.get(who);
      if (c.status === 'blocked' && !rec.blocked) rec.blocked = c;
      else if (c.status === 'running') rec.running.push(c);
    }

    const activeNow = new Set();
    for (const a of agents) {
      try {
      const up = live?.agents?.[a.agentId]?.up;
      const rec = perAgent.get(a.agentId);
      if (rec?.blocked) {
        activeNow.add(rec.blocked.id);
        applyMode(a, 'blocked', { ask: shortAsk(rec.blocked.ask), card: rec.blocked });
      } else if (rec?.running.length) {
        const c = rec.running[0];
        activeNow.add(c.id);
        const fresh = c.last_heartbeat_at && now - c.last_heartbeat_at < HB_STALE_MS;
        applyMode(a, fresh ? 'working' : 'stale', { title: shortTitle(c.title), card: c });
      } else if (up === false) {
        applyMode(a, 'offline', {});
      } else {
        applyMode(a, 'idle', {});
      }
      a.currentCards = rec ? [...(rec.blocked ? [rec.blocked] : []), ...rec.running] : [];
      a.gatewayUp = up !== false;
      } catch (e) { console.warn('[office] apply ' + a.agentId + ' failed:', e); }
    }

    // celebration: a card that was active last poll and is done now
    for (const id of prevActive) {
      if (activeNow.has(id)) continue;
      const c = cards.find(x => x.id === id);
      const owner = c && byId.get(c.assignee);
      if (owner && owner.mode !== 'offline') {
        owner.fx = { kind: 'celebrate', t: 0 };
        owner.setLabel(STUDIO.green, '✓ ' + shortTitle(c.title));
        setTimeout(() => { if (owner.mode === 'idle') owner.setLabel(null, null); }, 8000);
      }
    }
    prevActive.clear();
    for (const id of activeNow) prevActive.add(id);
    firstPoll = false;
  }
  const shortTitle = t => (t && t.length > 34 ? t.slice(0, 33) + '…' : t) || '';
  const shortAsk = a => {
    if (!a) return 'waiting for Ray';
    const one = String(a).split('\n').find(l => l.trim()) ?? '';
    return one.length > 34 ? one.slice(0, 33) + '…' : one;
  };
  setTimeout(pollBoard, 1500);
  setInterval(pollBoard, 15000);

  // ----------------------------------------------------------------- sim API
  // interior cameras, under the ceiling, approached from the corridor side
  const presets = {};
  for (const [room, info] of Object.entries(rooms)) {
    const [cx, , cz] = info.center;
    let cam, target;
    if (room === 'corridor' || room === 'dc') {
      cam = new THREE.Vector3(cx, 1.9, cz - 2.4);
      target = new THREE.Vector3(cx, 0.9, cz + 0.8);
    } else if (cx < 17) {           // left column: camera in the room, looking from the corridor side
      cam = new THREE.Vector3(cx + 2.6, 1.9, cz);
      target = new THREE.Vector3(cx - 0.8, 0.9, cz);
    } else {                        // right column
      cam = new THREE.Vector3(cx - 2.6, 1.9, cz);
      target = new THREE.Vector3(cx + 0.8, 0.9, cz);
    }
    presets[room] = { cam, target };
  }
  presets.peak = { cam: new THREE.Vector3(20, 35, 12), target: new THREE.Vector3(20, 0, 12) };

  let flight = null;
  function flyTo(p) {
    sim.followAgent(null);
    flight = { from: camera.position.clone(), to: p.cam.clone(), t0: controls.target.clone(), t1: p.target.clone(), k: 0 };
  }
  const sim = {
    followed: null,
    followAgent(id) {
      sim.followed = id == null ? null : (typeof id === 'string' ? (byId.get(id) ?? null) : id);
      bus.dispatchEvent(new CustomEvent('follow', { detail: sim.followed?.agentId ?? null }));
    },
    flyToRoom(room) { if (presets[room]) { peakOn = room === 'peak'; flyTo(presets[room]); } },
    flyToAgent(id) { const a = byId.get(id); if (a) sim.flyToRoom(a.room()); },
    getAgents: () => agents,
    rooms, anchors, scene, byId, byCard: new Map(),
    camera, controls, renderer,
  };
  window.sim = sim;

  const bar = document.getElementById('presets');
  for (const r of [...Object.keys(rooms), 'peak']) {
    const b = document.createElement('button');
    b.textContent = r === 'peak' ? '◈ Peak View' : r;
    if (r === 'peak') b.classList.add('peak');
    b.onclick = () => sim.flyToRoom(r);
    bar.appendChild(b);
  }

  // camera modes (preset | free | walk)
  const PRESET_LIMITS = { minPolar: 0.1, maxPolar: 1.45, minDist: 5, maxDist: 80 };
  let camMode = 'preset';
  const keys = new Set();
  const modeBtn = document.createElement('button');
  modeBtn.className = 'mode'; modeBtn.textContent = 'Free cam';
  const walkBtn = document.createElement('button');
  walkBtn.className = 'mode'; walkBtn.textContent = 'Walk (WASD)';
  bar.append(modeBtn, walkBtn);
  modeBtn.onclick = () => setCamMode(camMode === 'free' ? 'preset' : 'free');
  walkBtn.onclick = () => setCamMode(camMode === 'walk' ? 'preset' : 'walk');
  function setCamMode(m) {
    const prev = camMode;
    camMode = m;
    modeBtn.classList.toggle('on', m === 'free');
    walkBtn.classList.toggle('on', m === 'walk');
    if (prev === 'walk' && m !== 'walk' && document.pointerLockElement) document.exitPointerLock();
    controls.enabled = m !== 'walk';
    controls.minPolarAngle = m === 'free' ? 0 : PRESET_LIMITS.minPolar;
    controls.maxPolarAngle = m === 'free' ? Math.PI / 2 + 0.2 : PRESET_LIMITS.maxPolar;
    controls.minDistance = m === 'free' ? 2 : PRESET_LIMITS.minDist;
    controls.maxDistance = m === 'free' ? 160 : PRESET_LIMITS.maxDist;
    if (m === 'walk') renderer.domElement.requestPointerLock?.();
  }
  addEventListener('keydown', e => keys.add(e.code));
  addEventListener('keyup', e => keys.delete(e.code));
  let walkYaw = 0, walkPitch = 0;
  addEventListener('mousemove', e => {
    if (camMode === 'walk' && document.pointerLockElement) {
      walkYaw -= e.movementX * 0.0022;
      walkPitch = Math.max(-1.2, Math.min(1.2, walkPitch - e.movementY * 0.0022));
    }
  });
  function walkUpdate(dt) {
    camera.rotation.set(0, 0, 0, 'YXZ');
    camera.rotation.y = walkYaw; camera.rotation.x = walkPitch;
    const v = new THREE.Vector3();
    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    const right = new THREE.Vector3(1, 0, 0).applyEuler(camera.rotation);
    if (keys.has('KeyW')) v.add(fwd);
    if (keys.has('KeyS')) v.sub(fwd);
    if (keys.has('KeyD')) v.add(right);
    if (keys.has('KeyA')) v.sub(right);
    if (v.lengthSq()) camera.position.addScaledVector(v.normalize(), 3.2 * dt);
    camera.position.y = 1.6;
    camera.position.x = Math.max(-2, Math.min(42, camera.position.x));
    camera.position.z = Math.max(-4, Math.min(28, camera.position.z));
  }

  // ----------------------------------------------------------------- click -> agent card
  {
    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    let downXY = null;
    renderer.domElement.addEventListener('pointerdown', e => { downXY = [e.clientX, e.clientY]; });
    renderer.domElement.addEventListener('pointerup', e => {
      if (!downXY) return;
      const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]);
      downXY = null;
      if (moved > 5 || camMode === 'walk') return;
      ptr.x = (e.clientX / innerWidth) * 2 - 1;
      ptr.y = -(e.clientY / innerHeight) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      const hits = ray.intersectObjects(agents.map(a => a.group), true);
      let target = null;
      if (hits.length) {
        let o = hits[0].object;
        while (o && !target) { target = agents.find(a => a.group === o) ?? null; o = o.parent; }
      }
      if (target) showAgentCard(target, e.clientX, e.clientY);
      else hideAgentCard();
    });
    addEventListener('keydown', e => { if (e.key === 'Escape') hideAgentCard(); });
  }

  // ----------------------------------------------------------------- modules + loop
  initHud({ bus, sim, board: () => ({ ok: boardOk }) });

  bootStage('compiling shaders');
  try { renderer.compile(scene, camera); } catch (e) { console.warn('[boot] compile:', e); }
  bootStage('first frame');
  let firstFrame = true;

  let fpsFrames = 0, fpsT = 0, fpsChecked = Q === 'low' || NODEGRADE;
  function degradeLive() {
    Q = 'low';
    try { localStorage.setItem('officeQ', 'low'); } catch {}
    try {
      if (!sessionStorage.getItem('officeDegraded')) {
        sessionStorage.setItem('officeDegraded', '1');
        location.reload();
        return;
      }
    } catch {}
    renderer.setPixelRatio(1);
    for (const o of scene.children) if (o.isRectAreaLight || o.isSpotLight) o.intensity = 0;
    console.warn('[office] fps low -> degraded in place (override with ?q=high)');
  }

  const clock = new THREE.Clock();
  let lastInput = performance.now(), tour = null;
  const pokeIdle = () => {
    lastInput = performance.now();
    if (tour) { camera.position.copy(tour.pos); controls.target.copy(tour.target); tour = null; }
  };
  for (const evn of ['pointerdown', 'pointermove', 'wheel', 'keydown'])
    addEventListener(evn, pokeIdle, { passive: true });

  let simT = 0, loopWarned = false;
  renderer.setAnimationLoop(() => {
    if (firstFrame) {
      firstFrame = false;
      splash.remove();
      console.log('[boot] timeline:', bootStages.join(' | '));
    }
    const dt = Math.min(clock.getDelta(), 0.05);
    simT += dt;
    if (!fpsChecked) {
      fpsFrames++; fpsT += dt;
      if (fpsT > 6) {
        fpsChecked = true;
        const fps = fpsFrames / fpsT;
        console.log('[office] measured fps:', fps.toFixed(1));
        if (fps < 26) degradeLive();
      }
    }
    try { office.tick?.(simT); } catch (e) { if (!loopWarned) { loopWarned = true; console.error('[loop] tick failed:', e); } }
    if (tour) {
      tour.t += dt * 0.045;
      const R = 27 + Math.sin(tour.t * 0.6) * 5;
      camera.position.lerp(new THREE.Vector3(
        20 + Math.cos(tour.t) * R,
        9 + Math.sin(tour.t * 0.43) * 4.5,
        13 + Math.sin(tour.t) * R), Math.min(dt * 0.8, 1));
      controls.target.lerp(new THREE.Vector3(20, 1.2, 13), Math.min(dt * 0.8, 1));
    }
    for (const a of [...agents]) a.update(dt);
    for (const a of agents) {
      const d = camera.position.distanceTo(a.group.position);
      const fade = THREE.MathUtils.clamp(1 - (d - 9) / 15, 0, 1);
      a.label.material.opacity = (a.mode === 'offline' ? 0.6 : 0.95) * fade;
      a.label.visible = fade > 0.02;
    }
    holo.rotation.y += dt * 0.8;
    const pkTarget = peakOn ? 1 : 0;
    if (peakK !== pkTarget) {
      peakK = THREE.MathUtils.clamp(peakK + Math.sign(pkTarget - peakK) * dt / 0.5, 0, 1);
      for (const f of peakFade) {
        f.mat.opacity = f.base * (1 - peakK) + f.peak * peakK;
        const tr = peakK > 0.001;
        if (f.mat.transparent !== tr) { f.mat.transparent = tr; f.mat.needsUpdate = true; }
        f.mat.depthWrite = !tr;
      }
      grid.visible = peakK > 0.001;
      grid.material.opacity = 0.35 * peakK;
      for (const sp of roomLabels) { sp.visible = peakK > 0.001; sp.material.opacity = peakK; }
    }
    if (camMode === 'walk') walkUpdate(dt);
    if (flight && camMode !== 'walk') {
      flight.k = Math.min(flight.k + dt / 0.8, 1);
      const e = flight.k * flight.k * (3 - 2 * flight.k);
      camera.position.lerpVectors(flight.from, flight.to, e);
      controls.target.lerpVectors(flight.t0, flight.t1, e);
      if (flight.k >= 1) flight = null;
    }
    if (sim.followed && camMode !== 'walk') {
      const p = sim.followed.group.position;
      controls.target.lerp(new THREE.Vector3(p.x, 1.2, p.z), Math.min(dt * 5, 1));
      const want = new THREE.Vector3(p.x + 4, 4.5, p.z + 4);
      camera.position.lerp(want, Math.min(dt * 2.2, 1));
    }
    if (!tour && camMode === 'preset' && !flight && !sim.followed &&
        performance.now() - lastInput > 180000) {
      tour = { pos: camera.position.clone(), target: controls.target.clone(),
               t: Math.atan2(camera.position.z - 13, camera.position.x - 20) };
    }
    if (camMode !== 'walk') controls.update();
    if (FX === 'off') renderer.render(scene, camera); else composer.render();
    css2d.render(scene, camera);
  });
}
boot().catch(e => {
  console.error('[boot] failed:', e);
  bootFail(String(e?.message ?? e));
});
