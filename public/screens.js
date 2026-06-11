// Phase 9 - LIVE SCREENS. Every important display in the office renders real
// data onto a canvas texture: the meeting media wall shows the kanban board,
// the control-room monitors show costs, DevOps desk monitors show the task of
// whoever sits there (with scrolling "code"), the CEO screen shows a calm
// summary, the lounge table a network/status dashboard.
import * as THREE from 'three';

const FONT = 'sans-serif';
const COLS = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const COL_LABEL = { backlog: 'BACKLOG', todo: 'TO DO', in_progress: 'IN PROGRESS', review: 'REVIEW', done: 'DONE' };
const COL_COLOR = { backlog: '#8a8f98', todo: '#4dd8ff', in_progress: '#3dff7a', review: '#9b30ff', done: '#5a6070' };

let sim = null;
const cards = new Map();              // cardId -> {title, column, assignee, blocked}
const usage = new Map();              // agentId -> usage rec
const screens = [];                   // {mesh, cv, tex, draw, every, t}

function makeScreen(mesh, w, h, draw, every = 5) {
  if (!mesh) return;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({
    color: 0x05070a, roughness: 0.35,
    emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.15,
  });
  mat.name = mesh.material?.name ?? 'screen_live';
  mesh.material = mat;
  screens.push({ mesh, cv, tex, draw, every, t: every * Math.random() });
}

const trunc = (c, s, max) => { s = String(s ?? ''); while (c.measureText(s).width > max && s.length > 2) s = s.slice(0, -2); return s; };

// ---------------------------------------------------------------- painters
function paintKanban(cv) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  c.fillStyle = '#070a10'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#cfe8ff'; c.font = `bold 20px ${FONT}`; c.textAlign = 'left';
  c.fillText('KANBAN — 110lymph.nl', 16, 28);
  c.fillStyle = '#39414f'; c.fillRect(16, 38, W - 32, 2);
  const colW = (W - 32) / COLS.length;
  COLS.forEach((col, i) => {
    const x = 16 + i * colW;
    const items = [...cards.values()].filter(k => k.column === col);
    c.fillStyle = COL_COLOR[col]; c.font = `bold 13px ${FONT}`;
    c.fillText(`${COL_LABEL[col]}  ${items.length}`, x + 4, 60);
    c.font = `11px ${FONT}`;
    items.slice(0, 7).forEach((k, j) => {
      const y = 74 + j * 26;
      c.fillStyle = k.blocked ? 'rgba(255,77,77,.25)' : 'rgba(255,255,255,.06)';
      c.fillRect(x + 2, y - 13, colW - 10, 20);
      c.fillStyle = k.blocked ? '#ff7a7a' : '#dfe5ee';
      c.fillText(trunc(c, k.title ?? '', colW - 18), x + 7, y + 1);
    });
    if (items.length > 7) { c.fillStyle = '#8a8f98'; c.fillText(`+${items.length - 7} more`, x + 7, 74 + 7 * 26); }
  });
}

function paintCosts(cv) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  c.fillStyle = '#070a0d'; c.fillRect(0, 0, W, H);
  let total = 0; const rows = [];
  for (const [id, u] of usage) { if (u.costUsd != null) { total += u.costUsd; rows.push([id, u]); } }
  rows.sort((a, b) => (b[1].costUsd ?? 0) - (a[1].costUsd ?? 0));
  c.fillStyle = '#8a8f98'; c.font = `bold 11px ${FONT}`; c.textAlign = 'left';
  c.fillText('SESSION SPEND', 12, 20);
  c.fillStyle = '#3dff7a'; c.font = `bold 30px ${FONT}`;
  c.fillText(total ? '$' + total.toFixed(2) : '$—', 12, 52);
  const top = rows.slice(0, 4);
  const max = Math.max(0.01, ...top.map(r => r[1].costUsd ?? 0));
  top.forEach(([id, u], i) => {
    const y = 72 + i * 20;
    c.fillStyle = '#aab2c0'; c.font = `10px ${FONT}`;
    c.fillText(trunc(c, id, 70), 12, y + 8);
    c.fillStyle = 'rgba(77,216,255,.25)'; c.fillRect(86, y, W - 100, 11);
    c.fillStyle = '#4dd8ff'; c.fillRect(86, y, (W - 100) * (u.costUsd ?? 0) / max, 11);
  });
}

function codeLines(c, x0, y0, w, lines, seedBase, active, t) {
  const palette = ['#7daee8', '#9b87d8', '#74c69d', '#caa86e', '#8a8f98'];
  let seed = seedBase;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const scroll = active ? Math.floor(t / 2) % 6 : 0;
  for (let i = 0; i < lines; i++) {
    const y = y0 + i * 9;
    let x = x0 + (((i + scroll) % 5) ? 10 : 0);
    const segs = 1 + Math.floor(r() * 3);
    for (let sgi = 0; sgi < segs; sgi++) {
      const len = 12 + r() * (w / segs - 16);
      c.fillStyle = palette[Math.floor(r() * palette.length)];
      c.globalAlpha = active ? 0.9 : 0.4;
      c.fillRect(x, y, len, 4);
      x += len + 7;
    }
  }
  c.globalAlpha = 1;
}

function paintDesk(deskIdx) {
  return (cv, t) => {
    const c = cv.getContext('2d'), W = cv.width, H = cv.height;
    c.fillStyle = '#06080c'; c.fillRect(0, 0, W, H);
    const slot = `work_desk_${String(deskIdx).padStart(2, '0')}`;
    const ag = sim?.getAgents().find(a => a.heldSlot === slot);
    if (ag) {
      c.fillStyle = '#3dff7a'; c.font = `bold 12px ${FONT}`; c.textAlign = 'left';
      c.fillText(trunc(c, ag.name, W - 60), 8, 16);
      c.fillStyle = '#8a8f98'; c.font = `10px ${FONT}`;
      c.fillText(trunc(c, ag.taskTitle ?? ag.cardId ?? 'working…', W - 16), 8, 30);
      codeLines(c, 8, 40, W - 16, Math.floor((H - 46) / 9), deskIdx * 977 + 13, true, t);
    } else {
      codeLines(c, 8, 14, W - 16, Math.floor((H - 20) / 9), deskIdx * 977 + 13, false, t);
      c.fillStyle = 'rgba(138,143,152,.5)'; c.font = `9px ${FONT}`;
      c.fillText('idle', 8, H - 6);
    }
  };
}

function paintCeo(cv) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  c.fillStyle = '#080a0e'; c.fillRect(0, 0, W, H);
  const ags = sim?.getAgents() ?? [];
  const working = ags.filter(a => a.state === 'working').length;
  const blocked = ags.filter(a => a.blocked).length;
  let total = 0; for (const u of usage.values()) total += u.costUsd ?? 0;
  c.textAlign = 'center'; c.fillStyle = '#8a8f98'; c.font = `bold 11px ${FONT}`;
  c.fillText('110lymph.nl', W / 2, 22);
  const cell = (label, val, color, i) => {
    const y = 48 + i * 44;
    c.fillStyle = color; c.font = `bold 24px ${FONT}`; c.fillText(String(val), W / 2, y);
    c.fillStyle = '#6a7078'; c.font = `9px ${FONT}`; c.fillText(label, W / 2, y + 14);
  };
  cell('agents working', working, '#3dff7a', 0);
  cell('blocked', blocked, blocked ? '#ff4d4d' : '#8a8f98', 1);
  cell('session spend', total ? '$' + total.toFixed(2) : '$—', '#ffd24d', 2);
}

function paintLounge(cv, t) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  c.fillStyle = '#071009'; c.fillRect(0, 0, W, H);
  // little live network: nodes = agents, center = cloud
  const ags = (sim?.getAgents() ?? []).slice(0, 10);
  const cx = W / 2, cy = H / 2;
  ags.forEach((a, i) => {
    const ang = i / Math.max(1, ags.length) * Math.PI * 2 + t * 0.05;
    const x = cx + Math.cos(ang) * (W * 0.34), y = cy + Math.sin(ang) * (H * 0.32);
    c.strokeStyle = 'rgba(61,255,122,.25)'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke();
    c.fillStyle = a.blocked ? '#ff4d4d' : a.state === 'working' ? '#3dff7a' : '#8a8f98';
    c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill();
  });
  c.fillStyle = '#3dff7a'; c.beginPath(); c.arc(cx, cy, 9, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#0a2014'; c.font = `bold 8px ${FONT}`; c.textAlign = 'center'; c.fillText('110', cx, cy + 3);
}

// ---------------------------------------------------------------- wiring
export function initScreens({ officeGroup, bus, sim: simRef }) {
  sim = simRef;
  const get = n => officeGroup.getObjectByName(n);
  makeScreen(get('hot_kanban_media'), 512, 300, paintKanban, 4);
  for (let i = 0; i < 7; i++) {
    const m = get(`prop_cmdmon_${i}`);
    if (m) makeScreen(m, 256, 160, paintCosts, 8);
  }
  for (let d = 1; d <= 8; d++)
    for (let mi = 0; mi < 3; mi++)
      makeScreen(get(`prop_mon_dv${d}_${mi}`), 192, 120, paintDesk(d), 2.5);
  makeScreen(get('hot_docs_screen'), 224, 224, paintCeo, 10);
  makeScreen(get('hot_peak_table'), 384, 224, paintLounge, 1.5);

  bus.addEventListener('bridge', ({ detail: ev }) => {
    switch (ev.event) {
      case 'snapshot':
        for (const k of ev.cards ?? [])
          cards.set(k.cardId, { title: k.title ?? k.cardId, column: k.column, assignee: k.assignee, blocked: false });
        break;
      case 'card.created':
        cards.set(ev.cardId, { title: ev.title ?? ev.cardId, column: ev.column ?? 'backlog', assignee: ev.assignee, blocked: false });
        break;
      case 'card.moved': {
        const k = cards.get(ev.cardId) ?? { title: ev.title ?? ev.cardId };
        k.column = ev.to; if (ev.title) k.title = ev.title;
        cards.set(ev.cardId, k); break;
      }
      case 'card.blocked': { const k = cards.get(ev.cardId); if (k) k.blocked = true; break; }
      case 'card.unblocked': { const k = cards.get(ev.cardId); if (k) k.blocked = false; break; }
      case 'card.deleted': cards.delete(ev.cardId); break;
    }
  });
  bus.addEventListener('demo-usage', ({ detail }) => { for (const r of detail) usage.set(r.agentId, r); });
  async function pollUsage() {
    try {
      const u = await fetch('/agents/usage').then(r => { if (!r.ok) throw 0; return r.json(); });
      for (const rec of u) usage.set(rec.agentId, rec);
    } catch { /* demo mode or adapter away */ }
  }
  pollUsage(); setInterval(pollUsage, 30000);
  console.log(`[screens] ${screens.length} live displays`);
}

// staggered redraws - a few screens per frame, each on its own cadence
export function updateScreens(dt, t) {
  for (const s of screens) {
    s.t -= dt;
    if (s.t > 0) continue;
    s.t = s.every;
    s.draw(s.cv, t);
    s.tex.needsUpdate = true;
  }
}
