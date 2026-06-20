// Phase 9 - LIVE SCREENS. Every important display in the office renders real
// data onto a canvas texture: the meeting media wall shows the kanban board,
// the control-room monitors show costs, DevOps desk monitors show the task of
// whoever sits there (with scrolling "code"), the CEO screen shows a calm
// summary, the lounge table a network/status dashboard.
import * as THREE from 'three';

const FONT = 'sans-serif';
const COLS = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const COL_LABEL = { backlog: 'BACKLOG', todo: 'TO DO', in_progress: 'WIP', review: 'REVIEW', done: 'DONE' };
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

// ---------------------------------------------------------------- dashboard toolkit
// Phase C ("TechEview"): every screen reads as a sleek dark monitoring dashboard
// (Grafana/Datadog vibe) - accent headers, rounded metric cards, bars, sparklines.
const INK = { bg0: '#0c121d', bg1: '#070a11', card: 'rgba(120,150,190,0.06)', line: 'rgba(120,150,190,0.16)',
  dim: '#6a7686', text: '#dfe6f2', cyan: '#4dd8ff', green: '#3dff7a', amber: '#ffce5a', red: '#ff5d6c', violet: '#9b78ff' };
function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function tracked(c, s, x, y, sp) { for (const ch of String(s)) { c.fillText(ch, x, y); x += c.measureText(ch).width + sp; } }
function panelBG(c, W, H, accent) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, INK.bg0); g.addColorStop(1, INK.bg1);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(120,150,190,0.05)';                 // faint dot grid
  const gs = Math.round(H / 9);
  for (let y = gs; y < H; y += gs) for (let x = 8; x < W; x += gs) c.fillRect(x, y, 1, 1);
  c.fillStyle = accent; c.globalAlpha = 0.85; c.fillRect(0, 0, W, Math.max(2, H / 80)); c.globalAlpha = 1;
}
function head(c, W, S, title, accent) {
  c.textAlign = 'left'; c.fillStyle = accent; c.font = `bold ${13 * S}px ${FONT}`;
  tracked(c, title.toUpperCase(), 12 * S, 21 * S, 1.5 * S);
  c.fillStyle = INK.green; c.beginPath(); c.arc(W - 42 * S, 17 * S, 3 * S, 0, 7); c.fill();
  c.fillStyle = INK.dim; c.font = `${8.5 * S}px ${FONT}`; c.textAlign = 'right';
  c.fillText('LIVE', W - 12 * S, 20 * S); c.textAlign = 'left';
  c.strokeStyle = INK.line; c.lineWidth = Math.max(1, S); c.beginPath();
  c.moveTo(12 * S, 29 * S); c.lineTo(W - 12 * S, 29 * S); c.stroke();
}
function sparkVals(seed, n, t) {
  let s = (seed + Math.floor(t / 3)) % 2147483647 || 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out = []; let v = 0.45 + r() * 0.2;
  for (let i = 0; i < n; i++) { v += (r() - 0.48) * 0.26; v = Math.max(0.1, Math.min(0.95, v)); out.push(v); }
  return out;
}
function spark(c, x, y, w, h, seed, color, t) {
  const vals = sparkVals(seed, 26, t);
  c.beginPath(); vals.forEach((v, i) => { const px = x + i / (vals.length - 1) * w, py = y + h - v * h; i ? c.lineTo(px, py) : c.moveTo(px, py); });
  c.strokeStyle = color; c.lineWidth = Math.max(1, h / 26); c.stroke();
  c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath();
  c.fillStyle = color; c.globalAlpha = 0.13; c.fill(); c.globalAlpha = 1;
}
function bar(c, x, y, w, h, frac, color) {
  rr(c, x, y, w, h, h / 2); c.fillStyle = 'rgba(120,150,190,0.14)'; c.fill();
  const fw = Math.max(h, w * Math.max(0, Math.min(1, frac)));
  rr(c, x, y, fw, h, h / 2); c.fillStyle = color; c.fill();
}

// ---------------------------------------------------------------- painters
function paintKanban(cv) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height, S = H / 170;
  panelBG(c, W, H, INK.cyan);
  head(c, W, S, 'Kanban · 110lymph.nl', INK.cyan);
  const all = [...cards.values()];
  c.textAlign = 'right'; c.fillStyle = INK.dim; c.font = `${9 * S}px ${FONT}`;
  c.fillText(`${all.length} cards`, W - 70 * S, 20 * S); c.textAlign = 'left';
  const pad = 12 * S, colW = (W - pad * 2) / COLS.length, top = 40 * S;
  COLS.forEach((col, i) => {
    const x = pad + i * colW;
    const items = all.filter(k => k.column === col);
    c.fillStyle = COL_COLOR[col]; c.fillRect(x + 3 * S, top + 1 * S, 2.5 * S, 9 * S);
    c.font = `bold ${8.5 * S}px ${FONT}`;
    c.fillText(trunc(c, COL_LABEL[col], colW - 26 * S), x + 9 * S, top + 9 * S);
    c.fillStyle = INK.dim; c.font = `bold ${8.5 * S}px ${FONT}`; c.textAlign = 'right';
    c.fillText(items.length, x + colW - 9 * S, top + 9 * S); c.textAlign = 'left';
    const ch = 22 * S;
    items.slice(0, 6).forEach((k, j) => {
      const y = top + 18 * S + j * ch;
      rr(c, x + 3 * S, y, colW - 11 * S, ch - 5 * S, 4 * S);
      c.fillStyle = k.blocked ? 'rgba(255,93,108,.16)' : INK.card; c.fill();
      c.fillStyle = k.blocked ? INK.red : COL_COLOR[col]; c.fillRect(x + 3 * S, y, 2.5 * S, ch - 5 * S);
      c.fillStyle = k.blocked ? '#ff9aa4' : INK.text; c.font = `${9.5 * S}px ${FONT}`;
      c.fillText(trunc(c, k.title ?? '', colW - 22 * S), x + 10 * S, y + 12 * S);
    });
    if (items.length > 6) { c.fillStyle = INK.dim; c.font = `${9 * S}px ${FONT}`; c.fillText(`+${items.length - 6} more`, x + 10 * S, top + 18 * S + 6 * ch + 8 * S); }
  });
}

function paintCosts(cv, t) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height, S = H / 160;
  panelBG(c, W, H, INK.green);
  head(c, W, S, 'Session Spend', INK.green);
  let total = 0; const rows = [];
  for (const [id, u] of usage) { if (u.costUsd != null) { total += u.costUsd; rows.push([id, u]); } }
  rows.sort((a, b) => (b[1].costUsd ?? 0) - (a[1].costUsd ?? 0));
  c.fillStyle = INK.green; c.font = `bold ${34 * S}px ${FONT}`;
  c.fillText(total ? '$' + total.toFixed(2) : '$—', 12 * S, 64 * S);
  spark(c, W - 96 * S, 40 * S, 84 * S, 26 * S, 4242, INK.green, t);
  const top = rows.slice(0, 4), max = Math.max(0.01, ...top.map(r => r[1].costUsd ?? 0));
  top.forEach(([id, u], i) => {
    const y = 82 * S + i * 18 * S;
    c.fillStyle = INK.dim; c.font = `${9.5 * S}px ${FONT}`; c.fillText(trunc(c, id, 78 * S), 12 * S, y + 8 * S);
    bar(c, 92 * S, y, W - 150 * S, 9 * S, (u.costUsd ?? 0) / max, INK.cyan);
    c.fillStyle = INK.text; c.font = `${9 * S}px ${FONT}`; c.textAlign = 'right';
    c.fillText('$' + (u.costUsd ?? 0).toFixed(2), W - 12 * S, y + 8 * S); c.textAlign = 'left';
  });
  if (!rows.length) { c.fillStyle = INK.dim; c.font = `${10 * S}px ${FONT}`; c.fillText('awaiting telemetry…', 12 * S, 90 * S); }
}

function codeLines(c, x0, y0, w, lines, seedBase, active, t, S = 1) {
  const palette = ['#7daee8', '#9b87d8', '#74c69d', '#caa86e', '#8a8f98'];
  let seed = seedBase;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const scroll = active ? Math.floor(t / 2) % 6 : 0, lh = 9 * S;
  for (let i = 0; i < lines; i++) {
    const y = y0 + i * lh;
    let x = x0 + (((i + scroll) % 5) ? 10 * S : 0);
    const segs = 1 + Math.floor(r() * 3);
    for (let sgi = 0; sgi < segs; sgi++) {
      const len = 12 * S + r() * (w / segs - 16 * S);
      c.fillStyle = palette[Math.floor(r() * palette.length)];
      c.globalAlpha = active ? 0.85 : 0.32;
      c.fillRect(x, y, Math.max(4 * S, len), 4 * S);
      x += len + 7 * S;
    }
  }
  c.globalAlpha = 1;
}

function paintDesk(deskIdx) {
  return (cv, t) => {
    const c = cv.getContext('2d'), W = cv.width, H = cv.height, S = H / 130;
    const wide = W / H > 2.2;                              // ultrawide desk monitor
    panelBG(c, W, H, INK.green);
    const slot = `work_desk_${String(deskIdx).padStart(2, '0')}`;
    const ag = sim?.getAgents().find(a => a.heldSlot === slot);
    c.textAlign = 'left';
    c.fillStyle = ag ? INK.green : INK.dim; c.font = `bold ${11 * S}px ${FONT}`;
    c.fillText(trunc(c, ag ? ag.name : 'workstation idle', (wide ? W * 0.6 : W) - 16 * S), 10 * S, 17 * S);
    c.fillStyle = ag ? INK.green : '#3a4150'; c.beginPath(); c.arc(W - 14 * S, 13 * S, 3 * S, 0, 7); c.fill();
    if (ag) { c.fillStyle = INK.dim; c.font = `${9 * S}px ${FONT}`; c.fillText(trunc(c, ag.taskTitle ?? ag.cardId ?? 'working…', (wide ? W * 0.6 : W) - 16 * S), 10 * S, 30 * S); }
    const codeW = wide ? W * 0.62 : W - 20 * S;
    codeLines(c, 10 * S, (ag ? 40 : 26) * S, codeW - 10 * S, Math.floor((H - (ag ? 46 : 32) * S) / (9 * S)), deskIdx * 977 + 13, !!ag, t, S);
    if (wide) {                                            // right-hand telemetry rail on the big screen
      const rx = W * 0.66, rw = W - rx - 12 * S;
      c.strokeStyle = INK.line; c.lineWidth = 1; c.beginPath(); c.moveTo(rx - 8 * S, 10 * S); c.lineTo(rx - 8 * S, H - 10 * S); c.stroke();
      c.fillStyle = INK.dim; c.font = `bold ${8.5 * S}px ${FONT}`; c.fillText('BUILD', rx, 18 * S);
      ['cpu', 'mem', 'net'].forEach((lab, i) => {
        const y = 30 * S + i * 22 * S;
        c.fillStyle = INK.dim; c.font = `${8.5 * S}px ${FONT}`; c.fillText(lab, rx, y + 7 * S);
        bar(c, rx + 26 * S, y, rw - 26 * S, 7 * S, sparkVals(deskIdx * 31 + i, 4, t)[3], [INK.cyan, INK.violet, INK.green][i]);
      });
      spark(c, rx, 100 * S, rw, 22 * S, deskIdx * 53 + 9, INK.green, t);
    }
  };
}

function paintCeo(cv, t) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height, S = H / 150;
  panelBG(c, W, H, INK.amber);
  head(c, W, S, 'Mission Control', INK.amber);
  const ags = sim?.getAgents() ?? [];
  const working = ags.filter(a => a.state === 'working').length;
  const blocked = ags.filter(a => a.blocked).length;
  let total = 0; for (const u of usage.values()) total += u.costUsd ?? 0;
  const metrics = [
    ['AGENTS WORKING', working, INK.green, 5311],
    ['BLOCKED', blocked, blocked ? INK.red : INK.dim, 88],
    ['SESSION SPEND', total ? '$' + total.toFixed(2) : '$—', INK.amber, 4242],
  ];
  const pad = 12 * S, gap = 8 * S, cw = (W - pad * 2 - gap * 2) / 3, cy = 40 * S, chh = H - cy - 12 * S;
  metrics.forEach(([label, val, color, seed], i) => {
    const x = pad + i * (cw + gap);
    rr(c, x, cy, cw, chh, 6 * S); c.fillStyle = INK.card; c.fill();
    c.fillStyle = color; c.fillRect(x, cy, cw, 2.5 * S);
    c.textAlign = 'left'; c.fillStyle = INK.dim; c.font = `${8.5 * S}px ${FONT}`;
    c.fillText(label, x + 10 * S, cy + 16 * S);
    c.fillStyle = color; c.font = `bold ${26 * S}px ${FONT}`;
    c.fillText(String(val), x + 10 * S, cy + 44 * S);
    spark(c, x + 10 * S, cy + chh - 24 * S, cw - 20 * S, 18 * S, seed, color, t);
  });
}

function paintLounge(cv, t) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height, S = H / 160;
  panelBG(c, W, H, INK.violet);
  head(c, W, S, 'Fleet Network', INK.violet);
  const ags = (sim?.getAgents() ?? []).slice(0, 12);
  const cx = W / 2, cy = H / 2 + 12 * S;
  ags.forEach((a, i) => {
    const ang = i / Math.max(1, ags.length) * Math.PI * 2 + t * 0.04;
    const x = cx + Math.cos(ang) * (W * 0.32), y = cy + Math.sin(ang) * (H * 0.30);
    const col = a.blocked ? INK.red : a.state === 'working' ? INK.green : INK.dim;
    c.strokeStyle = a.blocked ? 'rgba(255,93,108,.3)' : 'rgba(155,120,255,.22)';
    c.lineWidth = 1.2 * S; c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke();
    c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 6 * S;
    c.beginPath(); c.arc(x, y, 4 * S, 0, 7); c.fill(); c.shadowBlur = 0;
  });
  c.fillStyle = INK.cyan; c.shadowColor = INK.cyan; c.shadowBlur = 10 * S;
  c.beginPath(); c.arc(cx, cy, 11 * S, 0, 7); c.fill(); c.shadowBlur = 0;
  c.fillStyle = '#04121a'; c.font = `bold ${9 * S}px ${FONT}`; c.textAlign = 'center'; c.fillText('110', cx, cy + 3 * S);
}

// ---------------------------------------------------------------- wiring
export function initScreens({ officeGroup, bus, sim: simRef }) {
  sim = simRef;
  const get = n => officeGroup.getObjectByName(n);
  // Phase C: higher-res + aspect-correct canvases so the displays read sharp.
  makeScreen(get('hot_kanban_media'), 640, 340, paintKanban, 4);     // meeting wall (3.2x1.7)
  for (let i = 0; i < 7; i++) {
    const m = get(`prop_cmdmon_${i}`);
    if (m) makeScreen(m, 384, 240, paintCosts, 8);                   // command monitors (1.6)
  }
  for (let d = 1; d <= 8; d++)
    makeScreen(get(`prop_mon_dv${d}_0`), 560, 168, paintDesk(d), 2.5);   // one ultrawide per DevOps desk (3.3 aspect)
  makeScreen(get('hot_docs_screen'), 420, 232, paintCeo, 10);        // CEO screen (was 224x224 SQUARE on a 1.8 screen)
  makeScreen(get('hot_peak_table'), 440, 210, paintLounge, 1.5);     // lounge table (2.1)

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
