// 110lymph.nl — 3D Agent Office, Phase 4: Mission Control (Build Spec v2.0 §9-13)
// Extends the Phase 1 skeleton with bloom, hologram, runtime overlays, WebSocket
// client (Phase 2 adapter), sim API for the HUD, and a demo mode when no adapter
// is reachable. HUD/notifications/steering/timeline live in sibling modules.

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
import { initInteractive, updateInteractive, clickInteractive } from './interactive.js';
import { initScreens, updateScreens } from './screens.js';
import { initMoments, updateMoments } from './moments.js';
import { initNotifications } from './notifications.js';
import { initTimeline } from './timeline.js';

// ---- Phase 9.1: crash visibility. A silent runtime error = "all black", so
// surface any boot/runtime error in the badge where Ray can read it.
function bootFail(msg) {
  try {
    const b = document.getElementById('demobadge');
    b.textContent = '\u26A0 ' + msg;
    b.style.display = 'block';
    b.style.borderColor = '#FF4D4D';
    b.style.color = '#FF4D4D';
    b.style.background = 'rgba(255,77,77,.12)';
  } catch {}
}
addEventListener('error', e => bootFail(e.message ?? 'script error'));
addEventListener('unhandledrejection', e => bootFail(String(e.reason?.message ?? e.reason ?? 'async error')));
// ?safe=1 -> skip the phase 9 extras (screens, moments) for diagnosis
const SAFE = new URLSearchParams(location.search).get('safe') === '1';
if (SAFE) console.warn('[office] SAFE MODE: screens/moments disabled');

// ---- Phase 9.2: quality tier. 'high' (default) or 'low'. Auto-degrades once
// if measured fps stays poor, and remembers the decision.
// 9.7: ?blur=0 strips all backdrop-filter glass (compositor cost A/B test)
if (new URLSearchParams(location.search).get('blur') === '0') {
  document.body.classList.add('noblur');
  console.log('[office] blur disabled');
}
const QPARAM = new URLSearchParams(location.search).get('q');
// 9.11: ?nodegrade pins the chosen tier (skips the fps auto-degrade watchdog) -
// lets us hold high quality on weak GPUs to compare against the offline renders.
const NODEGRADE = new URLSearchParams(location.search).get('nodegrade') !== null;
let Q = QPARAM ?? (() => { try { return localStorage.getItem('officeQ'); } catch { return null; } })() ?? 'high';
if (Q !== 'low' && Q !== 'high') Q = 'high';
// explicit ?q= choice is sticky (overrides any earlier auto-degrade decision)
if (QPARAM === 'high' || QPARAM === 'low') {
  try { localStorage.setItem('officeQ', QPARAM); sessionStorage.removeItem('officeDegraded'); } catch {}
}
const LOWQ = Q === 'low';
console.log('[office] quality:', Q);

// ---- Phase 9.2: boot splash with live stage text + timing log
const bootT0 = performance.now();
const bootStages = [];
const splash = document.createElement('div');
splash.id = 'bootsplash';
splash.innerHTML = '<b>110lymph.nl</b><span>starting\u2026</span>';
document.body.appendChild(splash);
function bootStage(name) {
  const t = Math.round(performance.now() - bootT0);
  bootStages.push(`${name} @${t}ms`);
  console.log(`[boot] ${name} @${t}ms`);
  const sp = splash.querySelector('span');
  if (sp) sp.textContent = name + '\u2026';
}

export const bus = new EventTarget();
const emit = ev => bus.dispatchEvent(new CustomEvent('bridge', { detail: ev }));

// ----------------------------------------------------------------- constants
const WALK_SPEED = 1.4, TURN_SPEED = 8.0;
const SPECTRUM = ['#2E5BFF', '#9B30FF', '#FF3DBE', '#FF9E2C', '#FFE32C', '#3DFF7A'];
const TIMINGS = { debrief: 20, documentation: 30, lunch: 45, fx: 1.5 };

// ----------------------------------------------------------------- embed mode (Phase 7 + 7b)
// Embedded when ?embed=1 OR actually framed (window.self !== window.top).
// Tags the body (CSS hooks), adds a "<- Dashboard" link, and speaks the
// dashboard's postMessage protocol: resize, nav, heartbeat.
const FRAMED = (() => { try { return window.self !== window.top; } catch { return true; } })();
export const EMBED = FRAMED || new URLSearchParams(location.search).get('embed') === '1';
const post = msg => { try { parent.postMessage(msg, '*'); } catch { /* host gone */ } };
if (EMBED) {
  document.body.classList.add('embed');
  const postResize = () => post({ type: 'resize', height: document.body.scrollHeight || innerHeight });
  addEventListener('resize', postResize);
  postResize();
  const back = document.createElement('a');
  back.id = 'backdash';
  back.href = '#';
  back.textContent = '← Dashboard';
  back.title = 'back to dashboard';
  back.onclick = e => {
    e.preventDefault();
    try { window.top.location.href = '/'; } catch { /* cross-origin host */ }
  };
  document.body.appendChild(back);
}

// ----------------------------------------------------------------- renderer + bloom (§12)
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Q === 'low' ? 1 : Math.min(devicePixelRatio, 1.75));   // 9.2: fill-rate cap
try {                                                      // 9.10: name the real GPU
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  console.log('[office] GPU:', gpu);
  window.__gpu = gpu;
} catch {}
renderer.shadowMap.enabled = !LOWQ;                       // 9.5: shadows are high-only
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;                       // Phase 5 (1): brighter overall
document.getElementById('view').appendChild(renderer.domElement);

const scene = new THREE.Scene();
// Phase A (lighting): dusk sky instead of a flat-black void. An equirectangular
// vertical gradient stays horizon-aligned from any camera angle, and its palette
// continues office.js's dusk skyline (top #070b18 -> warm horizon -> dark ground)
// so the city backdrop reads as haze on a real sky, not a band floating in black.
function makeDuskSky() {
  const cv = document.createElement('canvas');
  cv.width = 8; cv.height = 512;
  const g = cv.getContext('2d');
  // NB: the skyline planes are opaque up to ~+37 deg elevation, so the band that
  // actually shows above the city silhouette is the UPPER sky (canvas ~0.30-0.46).
  // Keep that readably dusk-blue, not near-black, or the change is invisible.
  const grad = g.createLinearGradient(0, 0, 0, 512);     // top = zenith, bottom = nadir
  grad.addColorStop(0.00, '#0b1024');                    // zenith: dusk indigo (lifted off black)
  grad.addColorStop(0.30, '#121a36');                    // high sky
  grad.addColorStop(0.44, '#1e2444');                    // just above the skyline tops (visible band)
  grad.addColorStop(0.50, '#3a3550');                    // horizon: subtle warm dusk (peeks at gaps)
  grad.addColorStop(0.60, '#10131f');                    // just below horizon
  grad.addColorStop(1.00, '#080a10');                    // nadir: dark ground side
  g.fillStyle = grad; g.fillRect(0, 0, 8, 512);
  const tex = new THREE.CanvasTexture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
scene.background = makeDuskSky();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 300);
camera.position.set(20, 28, 44);

// Phase 8b: image-based ambience - every material picks up soft reflections.
bootStage('environment');
try {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;                       // keep the dark mood
} catch (e) { console.warn('[office] environment setup failed:', e); }

// ---- Phase 8c fix: selectable pipeline. SSAO black-screens on some GPU/
// driver combos, so the default chain skips it. Override via URL:
//   ?fx=full  render+AO+bloom+SMAA+grade   (the whole thing)
//   ?fx=noao  render+bloom+SMAA+grade      (DEFAULT)
//   ?fx=basic render+bloom                 (pre-8c look)
//   ?fx=off   no post-processing at all    (diagnosis)
export const VERSION = '2.0.0';                            // "the procedural era"
console.log(`%c110lymph.nl 3D Office v${VERSION}`, 'color:#4dd8ff;font-weight:bold');
// 9.5: on low quality the default post stack is just bloom (no SMAA/grade)
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
      x = x * (1.06 + 0.16 * x) / (1.0 + 0.22 * x);              // soft S-curve
      float l = dot(x, vec3(0.299, 0.587, 0.114));
      x += (0.5 - abs(l - 0.5)) * vec3(-0.016, 0.003, 0.020) * (1.0 - l * 1.6);  // teal/warm split tone
      float d = distance(vUv, vec2(0.5));
      x *= 0.82 + 0.22 * smoothstep(0.85, 0.25, d);              // vignette
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
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.6, 0.5, 0.85);   // 9.5: half-res
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

// Phase 5 (1) Ray: much brighter scene. Ambient ~3x, plus a soft blue-white skylight.
// Phase 8 retunes these after the GLB loads (v8 profile: balanced, softer glow).
const ambLight = new THREE.AmbientLight(0x39404f, 1.0);
const hemiLight = new THREE.HemisphereLight(0xbfd4ff, 0x232730, 1.5);
scene.add(ambLight, hemiLight);
const key = new THREE.DirectionalLight(0xcfd8ff, 0.8);
key.position.set(30, 40, 10);
key.castShadow = !LOWQ;                                   // Phase 8b/9.5
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

// ---- Phase 8 (procedural): the office is generated in code by office.js.
// No GLB, no Blender - anchors come from /anchors.json (extracted from the
// original Phase 3 build, positions unchanged).
// ---- Phase 9.3: no top-level await. Vite 5.4's build transpiles to es2020
// regardless of config, so the whole awaited init lives in boot() instead.
// All exports (bus, EMBED, VERSION) remain above, at module top level.
async function boot() {
bootStage('fetching layout');
const [officeReport, wp, topology] = await Promise.all([
  fetch('/anchors.json').then(r => r.json()),
  fetch('/waypoints.json').then(r => r.json()),
  // Project E (E2): canonical room labels from the single source of truth
  // (dashboard /api/topology). Falls back to waypoints/key if unavailable.
  fetch('/api/topology').then(r => r.ok ? r.json() : null).catch(() => null),
]);
bootStage('building office');
const office = buildOffice(officeReport);
scene.add(office.group);
bootStage('office built');
for (const [k, v] of office.anchors) anchors.set(k, v);
rooms = wp.rooms;

// Phase 8 light profile (balanced: visible rooms, soft glow, subtle depth fog)
const V8 = true;
ambLight.intensity = 0.75; ambLight.color.set(0x434a55);
hemiLight.intensity = 1.05; hemiLight.color.set(0xcfd9ee);
key.intensity = 0.55;
renderer.toneMappingExposure = 1.15;                        // glare pass: was 1.22
bloom.strength = 0.25; bloom.threshold = 0.9;               // glare pass: was 0.45 / 0.82
scene.fog = new THREE.Fog(0x141a2e, 28, 105);              // Phase A: dusk-blue haze (was flat 0x0d0f13)

// (legacy 2x emissive boost removed - office.js materials are pre-tuned)

// ---- Phase 5 (2) Ray: walls/ceilings fade in Peak View. Materials are shared
// across meshes in the GLB, so clone per-mesh before we animate opacity.
const peakFade = [];                       // { mat, base, peak }
office.group.traverse(o => {
  if (!o.isMesh) return;
  const peak = /^(wall_|mullion|green_wall)/.test(o.name) ? 0.5
             : /^ceiling_/.test(o.name) ? 0.1 : null;     // Phase 8: 50% walls in Peak View
  if (peak == null) return;
  o.material = o.material.clone();
  peakFade.push({ mat: o.material, base: o.material.opacity ?? 1, peak });
});
let peakOn = false, peakK = 0;
// Phase 8: room name labels, visible only in Peak View
const roomLabels = [];
for (const [r, info] of Object.entries(wp.rooms)) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
  const x = cv.getContext('2d');
  x.fillStyle = 'rgba(13,15,19,.55)'; x.fillRect(0, 0, 256, 64);
  x.fillStyle = '#e8eaee'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center';
  x.fillText(((topology && topology.rooms && topology.rooms[r] && topology.rooms[r].label) ?? info.label ?? r).toUpperCase(), 128, 43);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0, depthTest: false }));
  sp.scale.set(4.2, 1.05, 1);
  sp.position.set(info.center[0], 4.6, info.center[2]);
  sp.visible = false;
  scene.add(sp); roomLabels.push(sp);
}
const grid = new THREE.GridHelper(64, 64, 0x4dd8ff, 0x2a2e3a);   // subtle floor grid for Peak View
grid.position.set(20, 0.03, 12);
grid.material.transparent = true; grid.material.opacity = 0;
grid.visible = false;
scene.add(grid);

for (const [a, b] of wp.edges) {
  const cost = anchors.get(a).pos.distanceTo(anchors.get(b).pos);
  (graph.get(a) ?? graph.set(a, []).get(a)).push({ to: b, cost });
  (graph.get(b) ?? graph.set(b, []).get(b)).push({ to: a, cost });
}

// ---- Phase 5 (1) Ray: ceiling pendants cast real point lights (1 per room,
// well under the 3/room perf cap) + corridor overhead strip & guide lights.
if (LOWQ) {
  // 9.5: per-pixel cost of ~10 point lights on physical materials is the
  // single biggest scene cost - low tier fakes it with brighter ambience.
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

// ---- Phase 8c: area lights (soft real illumination from glowing surfaces)
// 9.2: RectArea lights are the priciest per-pixel cost - high quality only.
if (Q !== 'low') {
RectAreaLightUniformsLib.init();
{
  const rect = (color, intensity, w, h, x, y, z, lookX, lookY, lookZ) => {
    const l = new THREE.RectAreaLight(color, intensity, w, h);
    l.position.set(x, y, z); l.lookAt(lookX, lookY, lookZ); scene.add(l);
  };
  rect(0x9db8e8, 2.2, 13, 3.4, 9, 2, 0.4, 9, 1.4, 6);        // lounge window glow (city)
  rect(0x9db8e8, 1.6, 13, 3.4, 31, 2, 0.4, 31, 1.4, 6);      // meeting window glow
  rect(0xfff2dc, 1.7, 2.4, 1.0, 2.3, 1.8, 14.2, 6, 1.6, 14.2);  // devops lightbox (8d: halved)
  rect(0x86c8ff, 2.4, 3.0, 1.6, 37.6, 1.7, 3.0, 31.5, 1.0, 3.0); // meeting media wall
  // corridor light pools
  for (const z of [3.5, 9, 14.5]) {
    const sp = new THREE.SpotLight(0xcfe0ff, 14, 9, 0.5, 0.55, 1.6);
    sp.position.set(20, 2.7, z);
    sp.target.position.set(20, 0, z);
    scene.add(sp, sp.target);
  }
}
}
if (Q === 'low') {                                         // 9.2: cheap stand-in fill
  const fill = new THREE.PointLight(0xcfe0ff, 0.5, 18, 1.4);
  fill.position.set(20, 2.5, 9);
  scene.add(fill);
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
  for (const prefix of ['work_desk_', 'doc_desk_']) {
    const limit = prefix === 'work_desk_' ? 8 : 4;
    for (let i = 1; i <= limit; i++) {
      const name = `${prefix}${String(i).padStart(2, '0')}`;
      const a = anchors.get(name);
      if (!a) continue;
      const m = new THREE.Mesh(
        V8 ? new THREE.BoxGeometry(0.9, 0.05, 0.05) : new THREE.BoxGeometry(0.9, 0.5, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x111418, emissive: 0x3dff7a, emissiveIntensity: 0.05 }));
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(a.quat);
      m.position.copy(a.pos).addScaledVector(fwd, V8 ? 0.5 : 0.75).setY(V8 ? 0.78 : 1.15);
      m.quaternion.copy(a.quat);
      scene.add(m); deskGlow.set(name, m);
    }
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
  take() { return this.free.length ? this.free.shift() : null; }   // non-queueing: free seat or null
  release(n) { const nx = this.queue.shift(); if (nx) nx.grantSlot(n); else this.free.push(n); }
  unqueue(a) { this.queue = this.queue.filter(x => x !== a); }
  queueIndex(a) { return this.queue.indexOf(a); }
}
const ids = (p, n) => Array.from({ length: n }, (_, i) => `${p}${String(i + 1).padStart(2, '0')}`);
const pools = {
  work: new Pool(ids('doc_desk_', 4), 'nav_door_staff'),
  doc: new Pool(ids('work_desk_', 8).slice(1), 'nav_door_devops'),  // work_desk_01 reserved for pinned Oly
  lounge: new Pool(ids('lounge_seat_', 8), 'nav_door_lounge'),
  meet: new Pool(ids('meet_seat_', 7), 'nav_door_meeting'),
};
// Phase-2 state-based seating, pileup-safe. Seats an agent in the first pool with
// a free slot (no queueing -> never piles up at the door). 14 agents share 27
// pool seats, so a free seat always exists. glow=true lights the desk (active).
function seatAgent(a, order, pose, glow) {
  for (const key of order) {
    const slot = pools[key].take();
    if (!slot) continue;
    a.hold(key, slot);
    a.goto(slot, () => {
      a.sitAt(slot, pose);
      const g = deskGlow.get(slot);
      if (g) g.material.emissiveIntensity = glow ? 1.4 : 0.05;
    });
    return true;
  }
  return false;
}
function queueSpot(door, i) {
  const p = anchors.get(door).pos.clone();
  if (Math.abs(p.x - 17) < 0.1) p.x += 1.2; else if (Math.abs(p.x - 23) < 0.1) p.x -= 1.2; else p.z -= 1.2;
  p.z += (Math.abs(p.x - 20) < 3 ? 0 : (i + 1) * 0.9) * (p.z < 8 ? 1 : -1);
  return p;
}

// ----------------------------------------------------------------- avatar
// Phase 8 (4): humanoid avatars - jointed mannequins built in avatars.js.
// Status = small light above the head (statusMat is exposed as headMat so the
// Phase 5 refreshStatus() keeps working unchanged).
const STATUS_COLOR = { active: '#3DFF7A', idle: '#FF9E2C', offline: '#8A8F98', blocked: '#FF4D4D' };
function makeAvatar(colorHex, scale = 1, role = 'specialist', seedName = '') {
  const h = buildHumanoid(colorHex, role, scale, seedName);
  return { root: h.root, parts: h.parts, materials: h.materials, tint: h.tint,
           headMat: h.statusMat, ring: h.ring, S: h.S };
}

function makeLabel(name, sub) {
  // Phase 10b (Ray): small name-only chip; the task shows on hover instead.
  // A second line appears only for status overrides (BLOCKED / PAUSED / ...).
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 72;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }));
  sprite.scale.set(1.25, 0.36, 1); sprite.position.y = 1.5;
  sprite.userData.draw = (color, text) => {
    const x = cv.getContext('2d');
    x.clearRect(0, 0, 256, 72);
    x.fillStyle = 'rgba(16,18,23,.66)';
    const w = text ? 240 : 170;
    x.beginPath(); x.roundRect((256 - w) / 2, text ? 2 : 14, w, text ? 68 : 44, 10); x.fill();
    x.fillStyle = color ?? '#dfe3ea'; x.font = 'bold 27px sans-serif'; x.textAlign = 'center';
    x.fillText(name, 128, text ? 30 : 44);
    if (text) { x.font = '21px sans-serif'; x.fillStyle = color ?? '#8a8f98'; x.fillText(text, 128, 60); }
    sprite.material.map.needsUpdate = true;
  };
  sprite.userData.draw(null);
  return sprite;
}

// ----------------------------------------------------------------- Agent
const agents = [];                      // all live avatars (was exported; unused externally)
const byCard = new Map();               // cardId -> Agent
const byId = new Map();                 // persistent agentId -> Agent (incl card avatars by assignee)
let briefingCount = 0;

class Agent {
  constructor({ name, sub, color, scale = 1, startAnchor = 'spawn_dc', agentId = null, cardId = null, role = null }) {
    this.name = name; this.agentId = agentId; this.cardId = cardId;
    this.role = role ?? (cardId ? 'devops' : 'specialist');
    const av = makeAvatar(color ?? SPECTRUM[agents.length % 6], scale, this.role, name);
    Object.assign(this, { group: av.root, parts: av.parts, materials: av.materials, tintMat: av.tint, headMat: av.headMat, ring: av.ring });
    this.avatarScale = av.S ?? scale;
    this.label = makeLabel(name, sub); this.group.add(this.label);
    this.lastNode = startAnchor;
    this.group.position.copy(anchors.get(startAnchor).pos);
    this.state = 'idle'; this.pose = 'idle'; this.t = Math.random() * 9; this.timer = null;
    this.path = []; this.onArrive = null; this.seated = null;
    this.heldSlot = null; this.heldPool = null;
    this.blocked = false; this.overlay = 'ok';      // ok|paused|down|killed
    this.fx = null; this.glowT = 0;
    scene.add(this.group); agents.push(this);
    if (agents.length === 60 || agents.length === 200 || agents.length === 500) {
      console.warn(`[leak-tracer] agent #${agents.length} "${name}" spawned by:`);
      console.trace();
    }
    if (agentId) byId.set(agentId, this);
    if (cardId) byCard.set(cardId, this);
    this.refreshStatus();
  }
  setGhost(on) {                          // Phase 6 (4): idle/offline agents render ghosted
    if (this.ghosted === on) return;
    this.ghosted = on;
    for (const m of this.materials) { m.transparent = on; m.opacity = on ? 0.35 : 1; m.needsUpdate = true; }
    this.label.material.opacity = on ? 0.5 : 1;
  }
  refreshStatus() {                       // Phase 5 (3): head color = live status
    let st = 'idle';
    if (this.blocked) st = 'blocked';
    else if (this.overlay === 'down' || this.overlay === 'killed') st = 'offline';
    else if (this.rosterStatus === 'offline') st = 'offline';
    else if (['working', 'briefing', 'debrief', 'documentation'].includes(this.state)) st = 'active';
    const c = new THREE.Color(STATUS_COLOR[st]);
    this.headMat.color.copy(c); this.headMat.emissive.copy(c);
    this.ring.visible = this.state === 'working' && st === 'active';
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
      const glow = deskGlow.get(this.heldSlot);
      if (glow) glow.material.emissiveIntensity = 0.05;
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
      case 'spawning':
        this.fx = { kind: 'spawn', t: 0 };
        this.materials.forEach(m => { m.transparent = true; m.opacity = 0; });
        this.pose = 'idle'; break;
      case 'briefing': this.acquire('meet', s => { this.hold('meet', s); this.goto(s, () => { this.sitAt(s, 'talk'); this.enterBriefing(); }); }); break;
      case 'working': this.acquire('work', s => { this.hold('work', s); this.goto(s, () => { this.sitAt(s, 'type'); deskGlow.get(s).material.emissiveIntensity = 1.4; }); }); break;
      case 'debrief': this.acquire('meet', s => { this.hold('meet', s); this.goto(s, () => { this.sitAt(s, 'talk'); this.enterBriefing(); this.timer = TIMINGS.debrief; }); }); break;
      case 'documentation': this.acquire('doc', s => { this.hold('doc', s); this.goto(s, () => { this.sitAt(s, 'type'); this.timer = TIMINGS.documentation; }); }); break;
      case 'lunch': this.acquire('lounge', s => { this.hold('lounge', s); this.goto(s, () => { this.sitAt(s, 'sit'); this.timer = TIMINGS.lunch; }); }); break;
      case 'despawning': this.goto('despawn_dc', () => { this.fx = { kind: 'despawn', t: 0 }; }); break;
    }
    this.refreshStatus();
  }
  enterBriefing() { this.inMeeting = true; briefingCount++; holoTarget = 1.0; }
  leaveBriefing() { if (this.inMeeting) { this.inMeeting = false; briefingCount--; holoTarget = briefingCount > 0 ? 1.0 : 0.25; } }
  setBlocked(on, reason) {
    if (on && !this.blocked) {
      this.blocked = true; this.savedPath = this.path; this.path = []; this.pose = 'headdown';
      this.label.userData.draw('#FF4D4D', 'BLOCKED');
      this.refreshStatus();
    } else if (!on && this.blocked) {
      this.blocked = false; this.label.userData.draw(null);
      this.setLifecycle(this.lifecycle ?? 'idle');
      this.refreshStatus();
    }
  }
  setOverlay(kind) {                      // §7.2 precedence handled by caller order
    this.overlay = kind;
    if (kind === 'paused') { this.path = []; this.pose = 'sit'; this.label.userData.draw('#FFB02E', 'PAUSED'); }
    if (kind === 'down') { this.path = []; this.pose = 'collapsed'; this.label.userData.draw('#FF4D4D', 'DOWN'); }
    if (kind === 'killed') { this.tintMat.emissive = new THREE.Color('#FF4D4D'); this.fx = { kind: 'despawn', t: 0 }; }
    if (kind === 'ok') { this.label.userData.draw(null); this.setLifecycle(this.lifecycle ?? 'idle'); }
    this.refreshStatus();
  }
  fallbackFlash() { this.glowT = 3.0; }   // §11.2 emissiveIntensity 1->3->1 over 3s
  remove() {
    this.releaseSlot(); this.leaveBriefing();
    scene.remove(this.group);
    this.group.traverse(o => {                 // Phase 10: free GPU memory
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) { m?.map?.dispose?.(); m?.dispose?.(); }
    });
    agents.splice(agents.indexOf(this), 1);
    if (this.cardId) byCard.delete(this.cardId);
    if (this.agentId) byId.delete(this.agentId);
    if (sim.followed === this) sim.followAgent(null);
  }
  update(dt) {
    this.t += dt;
    if (this.fx) {
      this.fx.t += dt; const k = Math.min(this.fx.t / TIMINGS.fx, 1);
      if (this.fx.kind === 'spawn') {            // 8d: pure fade, zero scale tricks
        this.materials.forEach(m => { m.transparent = true; m.opacity = k; });
        this.tintMat.emissiveIntensity = 0.7 + 1.8 * Math.sin(k * Math.PI);
        if (k >= 1) {
          this.fx = null; this.tintMat.emissiveIntensity = 0.7;
          if (!this.ghosted) this.materials.forEach(m => { m.opacity = 1; m.transparent = false; });
        }
      } else {                                   // despawn: fade out in place
        this.materials.forEach(m => { m.transparent = true; m.opacity = 1 - k; });
        this.label.material.opacity = 1 - k;
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
        // Turn toward travel by easing the YAW in clean Euler space (x and z stay
        // 0). Slerping the quaternion let Three decompose a ~180deg heading to
        // Euler (pi, 0, pi); animateHumanoid then eased rotation.x -> 0 with z still
        // pi, pitching the rig face-down so the head sank through the floor (only
        // for agents heading near +/-z). Same clean-yaw fix sitAt() already uses.
        const targetYaw = Math.atan2(-d.x, -d.z);
        let dy = targetYaw - this.group.rotation.y;
        while (dy > Math.PI) dy -= 2 * Math.PI;
        while (dy < -Math.PI) dy += 2 * Math.PI;
        this.group.rotation.set(0, this.group.rotation.y + dy * Math.min(TURN_SPEED * dt, 1), 0);
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
  animate(dt) {                             // Phase 8: humanoid pose driver
    // aY = floor offset. Seat anchors sit at Y=0 (floor); animateHumanoid's
    // foot-lift then raises the rig so the lowest foot rests on the floor, which
    // also seats the hips (~0.51) onto the procedural chair/couch (seat top
    // ~0.50-0.53). The old -0.08 was tuned for the LOW seats of the retired GLB
    // and now sinks agents into the seat + buries their feet. Procedural era: 0.
    const SEAT_OFFSET = 0.0;
    animateHumanoid(this, this.seated ? anchors.get(this.seated).pos.y + SEAT_OFFSET : 0, dt);
  }
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
const sim = {
  followed: null,
  followAgent(id) {
    sim.followed = id == null ? null : (typeof id === 'string' ? (byId.get(id) ?? byCard.get(id) ?? null) : id);
    bus.dispatchEvent(new CustomEvent('follow', { detail: sim.followed?.agentId ?? sim.followed?.cardId ?? null }));
  },
  flyToRoom(room) { if (presets[room]) { peakOn = room === 'peak'; flyTo(presets[room]); } },   // Phase 5 (2)
  flyToAgent(id) { const a = byId.get(id) ?? byCard.get(id); if (a) sim.flyToRoom(a.room()); },
  getAgents: () => agents,
  rooms, anchors, scene, byId, byCard,
  camera, controls, renderer,                 // Phase A: exposed for visual verification / debug framing
};
window.sim = sim;

// preset buttons
const bar = document.getElementById('presets');
for (const r of [...Object.keys(rooms), 'peak']) {
  const b = document.createElement('button');
  b.textContent = r === 'peak' ? '◈ Peak View' : r;
  if (r === 'peak') b.classList.add('peak');
  b.onclick = () => {
    sim.flyToRoom(r);
    if (EMBED && r === 'peak') post({ type: 'nav', route: '/' });   // Phase 7b: dashboard nav passthrough
  };
  bar.appendChild(b);
}

// ----------------------------------------------------------------- camera modes (Phase 5 (4), Ray)
// preset (default, unchanged) | free (full orbit + zoom) | walk (WASD first-person)
const PRESET_LIMITS = { minPolar: 0.1, maxPolar: 1.45, minDist: 5, maxDist: 80 };
let camMode = 'preset';
const keys = new Set();
let walkYaw = 0, walkPitch = 0;
const modeBtn = document.createElement('button');
modeBtn.className = 'mode';
const walkBtn = document.createElement('button');
walkBtn.className = 'mode';
walkBtn.textContent = 'Walk (WASD)';
bar.append(modeBtn, walkBtn);

function setCamMode(m) {
  const prev = camMode;
  if (prev === 'walk' && m !== 'walk' && document.pointerLockElement) document.exitPointerLock();
  camMode = m;
  controls.enabled = m !== 'walk';
  if (m === 'free') {
    sim.followAgent(null); flight = null;
    controls.minPolarAngle = 0.02; controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 1.5; controls.maxDistance = 130;
  } else {
    controls.minPolarAngle = PRESET_LIMITS.minPolar; controls.maxPolarAngle = PRESET_LIMITS.maxPolar;
    controls.minDistance = PRESET_LIMITS.minDist; controls.maxDistance = PRESET_LIMITS.maxDist;
  }
  if (m === 'walk') {
    sim.followAgent(null); flight = null;
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    walkYaw = Math.atan2(-dir.x, -dir.z); walkPitch = 0;
    camera.position.y = 1.6;                                  // eye height
    renderer.domElement.requestPointerLock?.();
  } else if (prev === 'walk') {
    // re-aim orbit target ahead of the camera so there is no jump leaving walk mode
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    controls.target.copy(camera.position).addScaledVector(dir, 6);
  }
  modeBtn.textContent = m === 'free' ? 'Presets' : 'Free Cam';
  modeBtn.classList.toggle('on', m === 'free');
  walkBtn.classList.toggle('on', m === 'walk');
}
modeBtn.onclick = () => setCamMode(camMode === 'free' ? 'preset' : 'free');
walkBtn.onclick = () => setCamMode(camMode === 'walk' ? 'preset' : 'walk');
setCamMode('preset');

addEventListener('keydown', e => {
  if (e.code === 'Space' && camMode === 'walk') { e.preventDefault(); setCamMode('preset'); return; }
  keys.add(e.code);
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('mousemove', e => {
  if (camMode !== 'walk' || !document.pointerLockElement) return;
  walkYaw -= e.movementX * 0.0024;
  walkPitch = Math.max(-1.4, Math.min(1.4, walkPitch - e.movementY * 0.0024));
});
document.addEventListener('pointerlockchange', () => {
  if (camMode === 'walk' && !document.pointerLockElement) setCamMode('preset');   // Esc also exits walk
});
function walkUpdate(dt) {
  camera.quaternion.setFromEuler(new THREE.Euler(walkPitch, walkYaw, 0, 'YXZ'));
  const fwd = new THREE.Vector3(-Math.sin(walkYaw), 0, -Math.cos(walkYaw));
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const v = new THREE.Vector3();
  if (keys.has('KeyW')) v.add(fwd);
  if (keys.has('KeyS')) v.sub(fwd);
  if (keys.has('KeyD')) v.add(right);
  if (keys.has('KeyA')) v.sub(right);
  if (v.lengthSq()) camera.position.addScaledVector(v.normalize(), 3.2 * dt);
  camera.position.y = 1.6;
  camera.position.x = Math.max(-2, Math.min(42, camera.position.x));
  camera.position.z = Math.max(-4, Math.min(28, camera.position.z));
}

// ----------------------------------------------------------------- bridge events
const COLUMN_STATE = { backlog: 'spawning', todo: 'briefing', in_progress: 'working', review: 'debrief' };
let colorIdx = 0;
// ---- Phase 10b: ONE avatar per ASSIGNEE (Ray). A real board has many cards
// per worker - sentinel exists once and works its top-priority card. All of an
// assignee's active cards map to the same body; when the top card changes the
// worker switches tasks instead of a clone spawning. Roster bodies are reused.
const ACTIVE_COLS = ['in_progress', 'review', 'todo'];
const PRIO = { in_progress: 0, review: 1, todo: 2 };
const MAX_WORKERS = 22;
const cardsAll = new Map();             // cardId -> {cardId,title,column,assignee,blocked}
const workers = new Map();              // assignee -> Agent
let syncQueued = false;
function queueSync() {
  if (syncQueued) return;
  syncQueued = true;
  setTimeout(() => { syncQueued = false; syncWorkers(); }, 60);
}
function syncWorkers() {
  const byAss = new Map();
  for (const c of cardsAll.values()) {
    if (!c.assignee || !ACTIVE_COLS.includes(c.column)) continue;
    (byAss.get(c.assignee) ?? byAss.set(c.assignee, []).get(c.assignee)).push(c);
  }
  // release workers whose assignee has no active cards left
  for (const [name, w] of [...workers]) {
    if (byAss.has(name)) continue;
    workers.delete(name);
    for (const [cid, ag] of [...byCard]) if (ag === w) byCard.delete(cid);
    w.taskTitle = null; w.cardId = null;
    if (w.agentId) { w.state = 'idle'; w.refreshStatus(); }   // roster body: back to roster control
    else w.setLifecycle('debrief');                           // ride the walk-out chain
  }
  // ensure/update one worker per assignee
  for (const [name, list] of byAss) {
    list.sort((a, b) => PRIO[a.column] - PRIO[b.column]);
    let w = workers.get(name);
    if (!w) {
      if (workers.size >= MAX_WORKERS) continue;
      // reuse the roster body for this agent if one exists
      w = byId.get(name) ?? agents.find(a => a.name === name && !a.cardId) ?? null;
      if (!w) w = new Agent({ name, sub: '', color: SPECTRUM[colorIdx++ % 6], role: 'devops' });
      workers.set(name, w);
    }
    // top card: highest priority; prefer the current one within the same tier
    let top = list[0];
    if (w.cardId) {
      const cur = cardsAll.get(w.cardId);
      if (cur && ACTIVE_COLS.includes(cur.column) && PRIO[cur.column] === PRIO[top.column]) top = cur;
    }
    for (const [cid, ag] of [...byCard]) if (ag === w && !list.some(c => c.cardId === cid)) byCard.delete(cid);
    for (const c of list) byCard.set(c.cardId, w);
    const switched = w.cardId !== top.cardId;
    w.cardId = top.cardId;
    w.taskTitle = top.title ?? top.cardId;
    const desired = COLUMN_STATE[top.column];
    if (switched || w.lifecycle !== desired) w.setLifecycle(desired);
    const blk = !!top.blocked;
    if (blk !== w.blocked) w.setBlocked(blk, top.reason);
  }
}
function handleEvent(ev) {
  emit(ev);                                   // HUD + notification modules listen on bus
  switch (ev.event) {
    case 'snapshot': {
      for (const c of ev.cards ?? [])
        cardsAll.set(c.cardId, { cardId: c.cardId, title: c.title ?? c.cardId, column: c.column, assignee: c.assignee ?? null, blocked: false });
      queueSync();
      console.log(`[office] snapshot: ${ev.cards?.length ?? 0} cards -> ${[...new Set([...cardsAll.values()].filter(c => c.assignee && ACTIVE_COLS.includes(c.column)).map(c => c.assignee))].length} active assignees (cap ${MAX_WORKERS})`);
      break;
    }
    case 'card.created':
      cardsAll.set(ev.cardId, { cardId: ev.cardId, title: ev.title ?? ev.cardId, column: ev.column ?? 'backlog', assignee: ev.assignee ?? null, blocked: false });
      queueSync(); break;
    case 'card.moved': {
      const c = cardsAll.get(ev.cardId) ?? { cardId: ev.cardId, title: ev.title ?? ev.cardId, assignee: ev.assignee ?? null, blocked: false };
      c.column = ev.to;
      if (ev.title) c.title = ev.title;
      if (ev.assignee) c.assignee = ev.assignee;
      cardsAll.set(ev.cardId, c);
      queueSync(); break;
    }
    case 'card.blocked': {
      const c = cardsAll.get(ev.cardId);
      if (c) { c.blocked = true; c.reason = ev.reason; }
      queueSync(); break;
    }
    case 'card.unblocked': {
      const c = cardsAll.get(ev.cardId);
      if (c) { c.blocked = false; c.reason = null; }
      queueSync(); break;
    }
    case 'card.deleted':
      cardsAll.delete(ev.cardId);
      byCard.delete(ev.cardId);
      queueSync(); break;
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

// ----------------------------------------------------------------- live agent roster (Phase 6 (4))
// Polls /api/agents: online agents take a desk (via the work pool), idle and
// recently-offline agents stand ghosted at their last known position, agents
// offline for >24h are removed. Demo mode supplies its own roster instead.
const ROSTER_PINNED = new Set();          // no hardcoded agents — all dynamic from API
function rosterRole(g) { return g === 'command' ? 'command' : g === 'specialist' ? 'specialist' : 'devops'; }
// Target pool by REAL status. NOTE: pool keys are inverted vs rooms (see `pools`):
//   'doc' = DevOps room (work_desk) · 'work' = Staff room (doc_desk) · 'lounge' · 'meet'
function rosterPool(st, role) {
  if (st === 'consulting') return 'meet';
  if (st === 'documenting') return 'work';                          // staff room
  if (st === 'online') return role === 'devops' ? 'doc' : 'work';   // devops room : staff room
  return 'lounge';                                                  // idle / offline → lounge
}
// seat order with fallbacks so an agent always gets a seat (never queued at a door)
function rosterOrder(want) {
  if (want === 'lounge') return ['lounge', 'work', 'doc'];
  if (want === 'meet') return ['meet', 'work', 'doc'];
  return want === 'doc' ? ['doc', 'work', 'lounge'] : ['work', 'doc', 'lounge'];
}
async function pollRoster() {
  if (demoMode) return;
  let list;
  try { list = await fetch('/api/agents').then(r => { if (!r.ok) throw 0; return r.json(); }); }
  catch { return; }                                       // adapter offline: keep current scene
  const cutoff = Math.floor(Date.now() / 1000) - 24 * 3600;
  for (const r of list) {
    if (r.group === 'infrastructure') continue;
    let a = byId.get(r.id);
    if (r.status === 'offline' && (r.lastSeen == null || r.lastSeen < cutoff)) {
      if (a && !ROSTER_PINNED.has(r.id)) a.remove();      // offline >24h -> gone
      continue;
    }
    if (!a) {
      a = new Agent({ name: r.name ?? r.id, sub: r.role ?? r.group, color: r.color ?? undefined,
                      agentId: r.id, role: rosterRole(r.group) });
      a.fx = { kind: 'spawn', t: 0 };
      a.materials.forEach(m => { m.transparent = true; m.opacity = 0; });
    }
    a.rosterStatus = r.status;
    if (!ROSTER_PINNED.has(r.id) && !a.cardId && a.overlay === 'ok' && !a.blocked) {
      const anchor = r.anchor && anchors.has(r.anchor) ? r.anchor : null;
      const st = r.status;                                // online | idle | offline | documenting | consulting
      const active = st === 'online' || st === 'documenting' || st === 'consulting';
      a.setGhost(!active);                                // idle/offline → ghosted
      a.state = active ? 'working' : 'idle';

      // Fixed-anchor agents (marcus/oly/sentinel) stay at their office/station — unless consulting.
      if (anchor && st !== 'consulting') {
        if (a.seated !== anchor && !a.path.length) a.goto(anchor, () => a.sitAt(anchor, active ? 'type' : 'sit'));
      } else {
        const want = rosterPool(st, a.role);
        if (a.heldPool === want) {                        // already in the right place → just adjust the desk glow
          const g = deskGlow.get(a.heldSlot); if (g) g.material.emissiveIntensity = active ? 1.4 : 0.05;
        } else if (!a.waitingPool && !a.path.length) {    // status changed → release current seat and WALK to the new pool
          a.releaseSlot();
          seatAgent(a, rosterOrder(want), st === 'consulting' ? 'talk' : active ? 'type' : 'sit', active);
        }
      }
    } else {
      a.setGhost(r.status !== 'online');
    }
    a.refreshStatus();
  }
}
setTimeout(pollRoster, 3000);
setInterval(pollRoster, 30000);

// ----------------------------------------------------------------- transport: WS -> HTTP polling -> demo
// Phase 5 (5) Ray: if the WebSocket cannot connect, poll the adapter's /snapshot
// endpoint before giving up and going full demo. Polling diffs card columns and
// synthesizes card.moved / card.deleted events.
let demoMode = false;
let polling = false, pollTimer = null, wsRetryTimer = null;
let wsConnected = false;                                   // Phase 7b: heartbeat status
function stopPolling() {                                   // Phase 6 (1): WS recovered
  if (!polling) return;
  polling = false;
  clearInterval(pollTimer); clearInterval(wsRetryTimer);
  pollTimer = wsRetryTimer = null;
  document.getElementById('demobadge').style.display = 'none';
}
function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws`);   // proxied by vite in dev; direct on adapter
  const giveUp = setTimeout(() => { ws.close(); httpFallback(); }, 5000);
  ws.onopen = () => { clearTimeout(giveUp); wsConnected = true; stopPolling(); };
  ws.onmessage = m => handleEvent(JSON.parse(m.data));
  ws.onclose = () => { wsConnected = false; if (!demoMode && !polling) setTimeout(connect, 2000); };
  ws.onerror = () => {};
}
const polledCols = new Map();             // cardId -> last seen column
function applySnapshot(snap) {
  const seen = new Set();
  for (const c of snap.cards ?? []) {
    seen.add(c.cardId);
    const prev = polledCols.get(c.cardId);
    polledCols.set(c.cardId, c.column);
    if (prev != null && prev !== c.column)
      handleEvent({ event: 'card.moved', cardId: c.cardId, from: prev, to: c.column, assignee: c.assignee, ts: Math.floor(Date.now() / 1000) });
  }
  for (const id of [...polledCols.keys()]) {
    if (!seen.has(id)) { polledCols.delete(id); handleEvent({ event: 'card.deleted', cardId: id, ts: Math.floor(Date.now() / 1000) }); }
  }
  handleEvent(snap);                       // snapshot handler spawns any new cards
}
async function httpFallback() {
  try {
    const snap = await fetch('/snapshot').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    if (polling || demoMode) return;
    polling = true;
    const badge = document.getElementById('demobadge');
    badge.textContent = 'HTTP POLLING - WebSocket unavailable';
    badge.style.display = 'block';
    applySnapshot(snap);
    pollTimer = setInterval(async () => {
      try { applySnapshot(await fetch('/snapshot').then(r => r.json())); } catch { /* adapter blip */ }
    }, 2000);
    wsRetryTimer = setInterval(connect, 15000);            // Phase 6 (1): keep trying to upgrade back to WS
  } catch { startDemo(); }                                 // network error: adapter truly unreachable
}
function startDemo() {
  if (demoMode) return;
  demoMode = true;
  document.getElementById('demobadge').style.display = 'block';
  import('./demo.js').then(d => d.runDemo(handleEvent));
}
connect();

// Phase 7b (5): dashboard health sync — heartbeat every 30 s while embedded.
// 'ok' only with a live WebSocket; polling/demo/disconnected count as degraded.
if (EMBED) {
  const beat = () => post({ type: 'heartbeat', status: wsConnected && !demoMode ? 'ok' : 'degraded' });
  setInterval(beat, 30000);
  setTimeout(beat, 2000);
}

// ----------------------------------------------------------------- agent click -> drill-down (Phase 7b (4))
{
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let downXY = null;
  renderer.domElement.addEventListener('pointerdown', e => { downXY = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!downXY) return;
    const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]);
    downXY = null;
    if (moved > 5 || camMode === 'walk') return;             // orbit drag, not a click
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
    else clickInteractive(e);                              // Phase 8: hot objects
  });
}

// ----------------------------------------------------------------- modules
initHud({ bus, sim, demo: () => demoMode });
// Phase 9.1: extras are non-fatal - a failure here must never black the scene
try { if (!SAFE) initScreens({ officeGroup: office.group, bus, sim }); }
catch (e) { console.error('[screens] init failed:', e); }
try { initInteractive({ scene, gltfScene: office.group, camera, renderer, sim, isEmbed: () => EMBED, post }); }
catch (e) { console.error('[interactive] init failed:', e); }
try { if (!SAFE) initMoments({ bus, sim }); }
catch (e) { console.error('[moments] init failed:', e); }
initNotifications({ bus, sim, THREE, scene, byCard, byId, anchors, rooms, agents });
initTimeline({ sim, demo: () => demoMode });

// ----------------------------------------------------------------- loop
const clock = new THREE.Clock();
// ---- Phase 9: idle cinematic - after 3 min without input the camera drifts
// slowly around the campus; any input instantly restores where you were.
let lastInput = performance.now(), tour = null;
const pokeIdle = () => {
  lastInput = performance.now();
  if (tour) {
    camera.position.copy(tour.pos); controls.target.copy(tour.target);
    tour = null;
  }
};
for (const evn of ['pointerdown', 'pointermove', 'wheel', 'keydown'])
  addEventListener(evn, pokeIdle, { passive: true });

// ---- Phase 9.2: compile every shader up-front (THE hidden multi-second stall
// on first frame), then drop the splash once the first real frame is out.
bootStage('compiling shaders');
try { renderer.compile(scene, camera); } catch (e) { console.warn('[boot] compile:', e); }
bootStage('first frame');
let firstFrame = true;
// fps watchdog: if high quality cannot hold a usable framerate, drop to low
// once, remember it, and tell the user how to override (?q=high).
let fpsFrames = 0, fpsT = 0, fpsChecked = Q === 'low' || NODEGRADE;
function degradeLive() {
  Q = 'low';
  try { localStorage.setItem('officeQ', 'low'); } catch {}
  // a reload applies the full low tier (fewer lights, no shadows, cheap
  // materials) - shader programs cannot be swapped live. Guard against loops.
  try {
    if (!sessionStorage.getItem('officeDegraded')) {
      sessionStorage.setItem('officeDegraded', '1');
      console.warn('[office] fps low -> reloading into quality=low');
      location.reload();
      return;
    }
  } catch {}
  renderer.setPixelRatio(1);
  scene.getObjectByName('office_v8')?.getObjectByName?.('floor_dc_mirror')?.removeFromParent?.();
  // 9.8: do NOT remove lights live - changing light count recompiles every
  // shader in the scene. Just mute them; the reload path handles the rest.
  for (const o of scene.children) if (o.isRectAreaLight || o.isSpotLight) o.intensity = 0;
  console.warn('[office] fps low -> degraded in place (override with ?q=high)');
}

// ---- Phase 9.4: on-screen perf readout (Ray can read it without devtools).
// Auto-visible for 15 s after boot; press P to toggle any time.
const perfEl = document.createElement('div');
perfEl.id = 'perfbadge';
document.body.appendChild(perfEl);
let perfHideAt = performance.now() + 15000;
let perfFrames = 0, perfAccum = 0, perfFps = 0;
addEventListener('keydown', e => {
  if (e.code === 'KeyP') perfHideAt = perfEl.style.display === 'none' ? Infinity : 0;
});
let frameMs = 0, frameMsAvg = 0;
// 9.9: per-segment frame profiler - the badge names the slowest parts
const segT = {};
let segNow = 0, segName = null;
function seg(name) {
  const t = performance.now();
  if (segName) segT[segName] = (segT[segName] ?? 0) * 0.95 + (t - segNow) * 0.05;
  segName = name; segNow = t;
}
function segEnd() { seg(null); segName = null; }
function topSegs() {
  return Object.entries(segT).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, v]) => `${k}:${v.toFixed(1)}`).join(' ');
}
let nodeCount = 0, nodeT = 0;
function perfTick(dt) {
  perfFrames++; perfAccum += dt;
  frameMsAvg += (frameMs - frameMsAvg) * 0.05;
  nodeT += dt;
  if (nodeT > 2) {                                         // 9.10: scene node census
    nodeT = 0; nodeCount = 0;
    scene.traverse(() => nodeCount++);
  }
  if (perfAccum >= 0.5) {
    perfFps = perfFrames / perfAccum; perfFrames = 0; perfAccum = 0;
    const show = performance.now() < perfHideAt;
    perfEl.style.display = show ? 'block' : 'none';
    const inf = renderer.info;
    if (show) perfEl.textContent =
      `${perfFps.toFixed(0)} fps | js ${frameMsAvg.toFixed(1)}ms [${topSegs()}] | ` +
      `ag:${agents.length} off:${scene.children.filter(c => c.name === 'office_v8').length} roots:${scene.children.length} ` +
      `geo:${inf.memory.geometries} tex:${inf.memory.textures} prog:${inf.programs?.length ?? '?'} nodes:${nodeCount} | ` +
      `q=${Q} fx=${FX}${SAFE ? ' SAFE' : ''} | P`;
  }
}
let bootDone = 0;

let simT = 0, loopWarned = false;
renderer.setAnimationLoop(() => {
  if (firstFrame) {
    firstFrame = false;
    splash.remove();
    bootDone = performance.now() - bootT0;
    console.log('[boot] timeline:', bootStages.join(' | '));
  }

  const frameT0 = performance.now();
  const dt = Math.min(clock.getDelta(), 0.05);
  simT += dt;
  perfTick(dt);
  if (!fpsChecked) {
    fpsFrames++; fpsT += dt;
    if (fpsT > 6) {                                        // measure ~6s after boot
      fpsChecked = true;
      const fps = fpsFrames / fpsT;
      console.log('[office] measured fps:', fps.toFixed(1));
      if (fps < 26) degradeLive();
    }
  }
  try {
    seg('tick');
    office.tick?.(simT);                                   // 8d: rack data LEDs
    seg('screens');
    if (!SAFE) updateScreens(dt, simT);
    seg('moments');
    if (!SAFE) updateMoments(dt);
  } catch (e) { if (!loopWarned) { loopWarned = true; console.error('[loop] extras failed:', e); } }
  seg('agents');
  if (!tour && camMode === 'preset' && !flight && !sim.followed &&
      performance.now() - lastInput > 180000) {
    tour = { pos: camera.position.clone(), target: controls.target.clone(),
             t: Math.atan2(camera.position.z - 13, camera.position.x - 20) };
  }
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
  // Phase 10b: labels fade with camera distance - close groups stop being
  // a wall of gray boxes. Despawn fade keeps ownership while active.
  for (const a of agents) {
    if (a.fx?.kind === 'despawn') continue;
    const d = camera.position.distanceTo(a.group.position);
    const fade = THREE.MathUtils.clamp(1 - (d - 9) / 15, 0, 1);
    a.label.material.opacity = (a.ghosted ? 0.5 : 0.95) * fade;
    a.label.visible = fade > 0.02;
  }
  seg('scene-fx');
  holo.rotation.y += dt * 0.8;
  const op = holo.children[0].material.opacity;
  holo.children[0].material.opacity = op + (holoTarget * 0.16 - op) * Math.min(dt * 4, 1);
  holo.userData.light.intensity += (holoTarget * 0.5 - holo.userData.light.intensity) * Math.min(dt * 4, 1);
  // Phase 5 (2): tween walls/ceilings + grid when entering/leaving Peak View (0.5s)
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
  updateInteractive(dt);                                   // Phase 8: hover pulse
  if (camMode === 'walk') walkUpdate(dt);
  if (flight && camMode !== 'walk') {
    flight.k = Math.min(flight.k + dt / 0.8, 1);             // Phase 8: 800ms ease
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
  if (camMode !== 'walk') controls.update();
  seg('render3d');
  if (FX === 'off') renderer.render(scene, camera); else composer.render();
  seg('css2d');
  css2d.render(scene, camera);
  segEnd();
  frameMs = performance.now() - frameT0;
});

}
boot().catch(e => {
  console.error('[boot] failed:', e);
  bootFail(String(e?.message ?? e));
});
