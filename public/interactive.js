// Phase 8 - clickable rooms. Hovering a bound object shows a tooltip, a pointer
// cursor and a soft emissive pulse; clicking navigates the VF Dashboard:
// embedded -> postMessage {type:'nav', route}; standalone -> dashboardUrl+route
// (configured in adapter mapping.json, served via /mapping.json) or an in-scene
// action (peak view).
//
// Bindings (spec): DC racks -> /infra, DevOps monitors -> /agents,
// meeting media wall -> /kanban, control desk -> /costs,
// lounge dashboard table -> / (peak), CEO screen -> /docs.
import * as THREE from 'three';

const ROUTES = {
  infra:  { route: '/infra',  label: 'Infrastructure' },
  agents: { route: '/agents', label: 'Agent Health' },
  kanban: { route: '/kanban', label: 'Kanban Board' },
  costs:  { route: '/costs',  label: 'Costs' },
  peak:   { route: '/',       label: 'Peak View' },
  docs:   { route: '/docs',   label: 'Docs' },
};
// fallback bindings for the legacy (pre-Phase-8) GLB, by object-name regex
const LEGACY = [
  [/^rack_/,           'infra'],
  [/^meet_media_wall/, 'kanban'],
  [/^ct_/,             'costs'],
  [/^coffee/,          'peak'],
];

let ctx = null, bound = [], tooltip = null, hovered = null, pulseT = 0;

export function initInteractive(c) {
  ctx = c;                       // { scene, gltfScene, camera, renderer, sim, isEmbed, post }
  tooltip = document.createElement('div');
  tooltip.id = 'hot-tip';
  tooltip.style.display = 'none';
  document.body.appendChild(tooltip);

  ctx.gltfScene.traverse(o => {
    if (!o.isMesh || !o.name) return;
    let key = null;
    const m = o.name.match(/^hot_(\w+?)_/) ?? o.name.match(/^hot_(\w+)$/);
    if (m && ROUTES[m[1]]) key = m[1];
    else for (const [re, k] of LEGACY) if (re.test(o.name)) { key = k; break; }
    if (!key) return;
    o.material = o.material.clone();                 // independent pulse
    o.userData.hotBase = o.material.emissiveIntensity ?? 0;
    o.userData.hotKey = key;
    bound.push(o);
  });
  if (!bound.length) return;

  let raf = 0;
  ctx.renderer.domElement.addEventListener('pointermove', e => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; hover(e); });
  });
  console.log(`[interactive] ${bound.length} clickable objects bound`);
}

const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();

function pick(e) {
  ptr.x = (e.clientX / innerWidth) * 2 - 1;
  ptr.y = -(e.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(ptr, ctx.camera);
  const hits = ray.intersectObjects(bound, false);
  return hits.length ? hits[0].object : null;
}

function hover(e) {
  if (!ctx) return;
  const o = pick(e);
  if (o !== hovered) {
    if (hovered) setGlow(hovered, hovered.userData.hotBase);
    hovered = o;
    ctx.renderer.domElement.style.cursor = o ? 'pointer' : '';
    tooltip.style.display = o ? 'block' : 'none';
    if (o) tooltip.textContent = `▸ ${ROUTES[o.userData.hotKey].label}`;
  }
  if (o) {
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top = (e.clientY - 30) + 'px';
  }
}

function setGlow(o, v) {
  if (o.material.emissive !== undefined) o.material.emissiveIntensity = v;
}

export function updateInteractive(dt) {                 // call each frame: hover pulse
  if (!hovered) return;
  pulseT += dt;
  setGlow(hovered, (hovered.userData.hotBase || 0.4) + 0.5 + Math.sin(pulseT * 6) * 0.35);
}

// returns true if the click hit a hot object (so main.js can skip other actions)
export function clickInteractive(e) {
  if (!ctx) return false;
  const o = pick(e);
  if (!o) return false;
  const { route } = ROUTES[o.userData.hotKey];
  if (o.userData.hotKey === 'peak' && !ctx.isEmbed()) { ctx.sim.flyToRoom('peak'); return true; }
  if (ctx.isEmbed()) { ctx.post({ type: 'nav', route }); return true; }
  const base = window.__mapping?.dashboardUrl;
  if (base) { window.open(base.replace(/\/$/, '') + route, '_blank'); return true; }
  // standalone with no dashboard configured: explain instead of dead-clicking
  tooltip.textContent = `dashboard not configured (mapping.json "dashboardUrl") — route ${route}`;
  tooltip.style.display = 'block';
  setTimeout(() => { if (!hovered) tooltip.style.display = 'none'; }, 2500);
  return true;
}
