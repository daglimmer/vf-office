#!/usr/bin/env node
'use strict';
/* 110lymph.nl — 3D Agent Office, Hermes Integration Bridge: ADAPTER
 * Bridge spec v1.0 (B1/B2/B5/B8) + Build Spec v2.0 Section 8.
 *
 * Node >= 22.5 (uses node:sqlite). Zero npm dependencies.
 * - WebSocket server (RFC6455, implemented on stdlib) + static files + REST, one port
 * - Polls Hermes kanban.db (read-only) every 2 s: task_events + task_comments
 * - Snapshot on connect; heartbeat monitoring; signald command passthrough
 *
 * Env overrides (defaults per bridge spec):
 *   HERMES_DB=/root/.hermes/kanban.db  HOST=127.0.0.1  PORT=3000
 *   CONFIG_DIR=<here>/config  PUBLIC_DIR=<here>/public  STATE_FILE=<here>/state.json
 *   SIGNALD_SOCK=/run/hermes-office/signald.sock
 *
 * Assumed Hermes schema (override SQL in mapping.json "sql" key if different):
 *   task_events(id, task_id, kind, payload, created_at)  payload = JSON
 *   task_comments(id, task_id, author, body, created_at)
 *   tasks(id, title, status, assignee, priority)
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { DatabaseSync } = require('node:sqlite');

const ROOT = __dirname;
const ENV = (k, d) => process.env[k] ?? d;
const DB_PATH = ENV('HERMES_DB', '/root/.hermes/kanban.db');
const HOST = ENV('HOST', '127.0.0.1');
const PORT = parseInt(ENV('PORT', '3000'), 10);
const CONFIG_DIR = ENV('CONFIG_DIR', path.join(ROOT, 'config'));
const PUBLIC_DIR = ENV('PUBLIC_DIR', path.join(ROOT, 'public'));
const STATE_FILE = ENV('STATE_FILE', path.join(ROOT, 'state.json'));
const SIGNALD_SOCK = ENV('SIGNALD_SOCK', '/run/hermes-office/signald.sock');

const log = (...a) => console.log(new Date().toISOString(), '[adapter]', ...a);

// ------------------------------------------------------------------ config
const mapping = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, 'mapping.json'), 'utf8'));
const agentsCfg = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, 'agents.json'), 'utf8'));

// Project E (E4): canonical org topology — single source of truth for
// agent -> group. Read defensively; if absent we fall back to the legacy
// hierarchy-based agentGroup() logic so nothing breaks.
let topology = null;
try {
  const tf = ENV('TOPOLOGY_FILE', '');
  const candidates = [tf, path.join(CONFIG_DIR, 'topology.json'), path.resolve(ROOT, '../config/topology.json')].filter(Boolean);
  const found = candidates.find(f => { try { return fs.existsSync(f); } catch { return false; } });
  if (found) topology = JSON.parse(fs.readFileSync(found, 'utf8'));
} catch (e) { /* keep topology null → legacy logic */ }
const TOPO_GROUP = {}; // agentId -> group label
for (const g of (topology && topology.groups) || []) for (const id of g.agents || []) TOPO_GROUP[id] = g.label;

// Phase 6: StoreKeeper backup source + docs portal roots
const { readBackups } = require('./sources/storekeeper');
const BACKUPS_FILE = path.resolve(ROOT, mapping.backupsSource ?? 'data/storekeeper-report.json');
const DOCS_URL = mapping.docsUrl ?? '';
const HERMES_HOME = path.dirname(DB_PATH);
const DOCS_ROOTS = {};
{
  const cfg = mapping.docsRoots ?? {};
  for (const k of ['skills', 'souls', 'memory', 'docs', 'prompts'])
    DOCS_ROOTS[k] = cfg[k] ? path.resolve(ROOT, cfg[k]) : path.join(HERMES_HOME, k);
  for (const [k, v] of Object.entries(cfg))
    if (!DOCS_ROOTS[k]) DOCS_ROOTS[k] = path.resolve(ROOT, v);
}

const SQL = Object.assign({
  events:   "SELECT id, task_id, kind, payload, created_at FROM task_events WHERE id > ? ORDER BY id LIMIT 500",
  comments: "SELECT id, task_id, author, body, created_at FROM task_comments WHERE id > ? ORDER BY id LIMIT 200",
  tasks:    "SELECT id, title, status, assignee, priority FROM tasks WHERE status != 'Archive'",
}, mapping.sql || {});
const EVENT_TYPES = Object.assign({
  created: 'card.created', status_changed: 'card.moved', deleted: 'card.deleted',
  blocked: 'card.blocked', unblocked: 'card.unblocked',
}, mapping.eventTypes || {});
const COMMENT_TAGS = mapping.commentTags || { '[key]': 'api_key_added', '[blocked]': 'blocked', '[assigned]': 'task_assigned' };
const colKey = c => (mapping.columns || {})[c] ?? (c || '').toLowerCase().replace(/\s+/g, '_');

// agents: validate hierarchy (max depth 2, no cycles)
const agents = new Map();                       // id -> {id,name,color,parent,ephemeralPattern,ephemeral}
for (const a of agentsCfg) agents.set(a.id, { ...a, ephemeral: false });
for (const a of agents.values()) {
  if (a.parent) {
    const p = agents.get(a.parent);
    if (!p) { log('FATAL: unknown parent', a.parent); process.exit(1); }
    if (p.parent) { log('FATAL: hierarchy deeper than 2:', a.id); process.exit(1); }
  }
}
const childrenOf = id => [...agents.values()].filter(a => a.parent === id).map(a => a.id);
const patterns = [...agents.values()].filter(a => a.ephemeralPattern)
  .map(a => ({ parent: a.id, re: new RegExp('^' + a.ephemeralPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$') }));

// ------------------------------------------------------------------ runtime state
const usage = new Map();      // agentId -> last pushed usage record
const lastPush = new Map();   // agentId -> ms epoch
const pushHist = new Map();   // agentId -> [ms epochs, last 24h] (Phase 7b: sessions24h)
const runtime = new Map();    // agentId -> 'ok'|'paused'|'down'|'killed'
const lastDownAnnounce = new Map();
const recentDowns = [];
for (const id of agents.keys()) runtime.set(id, 'ok');

let st = { lastEventId: 0, lastCommentId: 0 };
try { st = Object.assign(st, JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))); } catch {}
const saveState = () => fs.writeFileSync(STATE_FILE, JSON.stringify(st));

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const now = () => Math.floor(Date.now() / 1000);

// ------------------------------------------------------------------ websocket (RFC6455)
const clients = new Set();
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function wsFrame(str) {
  const p = Buffer.from(str);
  let h;
  if (p.length < 126) { h = Buffer.from([0x81, p.length]); }
  else if (p.length < 65536) { h = Buffer.alloc(4); h[0] = 0x81; h[1] = 126; h.writeUInt16BE(p.length, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x81; h[1] = 127; h.writeBigUInt64BE(BigInt(p.length), 2); }
  return Buffer.concat([h, p]);
}
function wsSend(sock, obj) { try { sock.write(wsFrame(JSON.stringify(obj))); } catch {} }
function broadcast(obj) {
  const frame = wsFrame(JSON.stringify(obj));
  for (const c of clients) { try { c.write(frame); } catch {} }
  notify(obj);
}

function handleUpgrade(req, sock) {
  const key = req.headers['sec-websocket-key'];
  if (!key) { sock.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
             `Sec-WebSocket-Accept: ${accept}\r\n\r\n`);
  clients.add(sock);
  log('ws client connected,', clients.size, 'total');
  wsSend(sock, snapshot());
  let buf = Buffer.alloc(0);
  sock.on('data', d => {
    buf = Buffer.concat([buf, d]);
    while (buf.length >= 2) {
      const op = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      const need = off + (masked ? 4 : 0) + len;
      if (buf.length < need) return;
      if (op === 0x8) { sock.end(); return; }                       // close
      if (op === 0x9) {                                              // ping -> pong
        const pong = Buffer.from(buf.subarray(off + (masked ? 4 : 0), need));
        const h = Buffer.from([0x8a, pong.length]);
        try { sock.write(Buffer.concat([h, pong])); } catch {}
      }
      buf = buf.subarray(need);                                      // text frames from browser: ignored (read-only stream)
    }
  });
  const drop = () => { clients.delete(sock); };
  sock.on('close', drop); sock.on('error', drop);
}

// ------------------------------------------------------------------ snapshot
let db = null;
function openDb() {
  db = new DatabaseSync(DB_PATH, { readOnly: true });
  db.exec('PRAGMA busy_timeout = 2000');
}
function snapshot() {
  const cards = [];
  try {
    for (const r of db.prepare(SQL.tasks).all()) {
      cards.push({
        cardId: String(r.id), title: r.title, column: colKey(r.status),
        assignee: r.assignee, priority: r.priority,
      });
    }
  } catch (e) { log('snapshot query failed:', e.message); }
  return {
    event: 'snapshot', ts: now(), cards,
    agents: [...agents.values()].map(a => ({
      id: a.id, name: a.name ?? a.id, color: a.color, parent: a.parent ?? null,
      type: a.type ?? 'agent',                     // 'infrastructure' for VMs (VF #1)
      ephemeral: a.ephemeral, runtime: runtime.get(a.id) ?? 'ok',
      fallbackActive: usage.get(a.id)?.fallbackActive ?? false,
    })),
  };
}

// ------------------------------------------------------------------ kanban polling
function pollKanban() {
  try {
    for (const r of db.prepare(SQL.events).all(st.lastEventId)) {
      st.lastEventId = r.id;
      let p = {};
      try { p = JSON.parse(r.payload || '{}'); } catch {}
      const type = EVENT_TYPES[r.kind];
      if (!type) continue;
      const ev = { event: type, cardId: String(r.task_id), ts: r.created_at ?? now() };
      if (type === 'card.created') Object.assign(ev, { title: p.title, column: colKey(p.status ?? 'Backlog'), assignee: p.assignee });
      if (type === 'card.moved')   Object.assign(ev, { title: p.title, from: colKey(p.from ?? p.old_status), to: colKey(p.to ?? p.new_status), assignee: p.assignee });
      if (type === 'card.blocked') Object.assign(ev, { by: p.by ?? p.actor, reason: esc(p.reason ?? '') });
      if (type === 'card.unblocked') Object.assign(ev, { by: p.by ?? p.actor });
      broadcast(ev);
    }
    for (const r of db.prepare(SQL.comments).all(st.lastCommentId)) {
      st.lastCommentId = r.id;
      let body = r.body ?? '', ctype = 'comment';
      for (const [tag, t] of Object.entries(COMMENT_TAGS)) {
        if (body.startsWith(tag)) { ctype = t; body = body.slice(tag.length).trim(); break; }
      }
      broadcast({ event: 'card.comment', cardId: String(r.task_id), author: r.author, comment: esc(body), type: ctype, ts: r.created_at ?? now() });
    }
    saveState();
  } catch (e) { log('poll error:', e.message); }
}

// ------------------------------------------------------------------ heartbeat monitor (B4 / Section 11.1)
function checkHeartbeats() {
  const t = Date.now();
  for (const [id] of agents) {
    if (!lastPush.has(id)) continue;                 // never pushed: not monitored yet
    const state = runtime.get(id);
    if (state === 'paused' || state === 'killed') continue;   // SIGSTOP exemption
    const age = Math.floor((t - lastPush.get(id)) / 1000);
    if (age > 60 && state !== 'down') {
      runtime.set(id, 'down');
      recentDowns.push(t);
      while (recentDowns.length && recentDowns[0] < t - 60000) recentDowns.shift();
      broadcast({ event: 'agent.down', agentId: id, heartbeatAge: age, ts: now() });
      const last = lastDownAnnounce.get(id) ?? 0;
      if (t - last > 5 * 60 * 1000) {                // flap guard
        lastDownAnnounce.set(id, t);
        const name = agents.get(id).name ?? id;
        const cascade = recentDowns.length >= 3;
        broadcast({
          event: 'system.announcement',
          message: cascade ? `Gateway cascade failure — ${recentDowns.length} agents down within 60s`
                           : `${name} gateway unresponsive — investigating`,
          priority: cascade ? 'alert' : 'normal', ts: now(),
        });
      }
    }
  }
}

// ------------------------------------------------------------------ usage intake
function intakeUsage(rec) {
  const id = rec.agentId;
  if (!id) return;
  if (!agents.has(id)) {                              // ephemeral registration (B7)
    const m = patterns.find(p => p.re.test(id));
    if (!m) { log('usage push for unknown agent rejected:', id); return; }
    agents.set(id, { id, name: id, parent: m.parent, color: null, ephemeral: true });
    runtime.set(id, 'ok');
    log('ephemeral agent registered:', id, '→', m.parent);
    broadcast(snapshot());
  }
  const prev = usage.get(id);
  usage.set(id, rec);
  lastPush.set(id, Date.now());
  {
    const h = pushHist.get(id) ?? [];
    h.push(Date.now());
    const cut = Date.now() - 24 * 3600 * 1000;
    while (h.length && h[0] < cut) h.shift();
    pushHist.set(id, h);
  }
  if (runtime.get(id) === 'down') {
    runtime.set(id, 'ok');
    broadcast({ event: 'agent.recovered', agentId: id, downtime: rec.heartbeatAge ?? null, ts: now() });
  }
  const was = prev?.fallbackActive ?? false, is = !!rec.fallbackActive;
  if (!was && is) broadcast({ event: 'agent.fallback', agentId: id, from: prev?.modelName ?? null, to: rec.fallbackModel ?? rec.modelName, ts: now() });
  if (was && !is) broadcast({ event: 'agent.fallback_cleared', agentId: id, ts: now() });
}

// ------------------------------------------------------------------ signald passthrough (B3)
function signaldSend(agent, action) {
  return new Promise(resolve => {
    const sock = net.createConnection(SIGNALD_SOCK);
    const timer = setTimeout(() => { sock.destroy(); resolve({ status: 'pending' }); }, 5000);
    let data = '';
    sock.on('connect', () => sock.write(JSON.stringify({ agent, action }) + '\n'));
    sock.on('data', d => {
      data += d;
      if (data.includes('\n')) {
        clearTimeout(timer); sock.end();
        try { resolve(JSON.parse(data)); } catch { resolve({ status: 'error', message: 'bad signald reply' }); }
      }
    });
    sock.on('error', e => { clearTimeout(timer); resolve({ status: 'error', message: e.message }); });
  });
}

async function command(id, action, by) {
  if (!agents.has(id)) return { code: 404, body: { status: 'error', message: 'unknown agent' } };
  // cascade: pause + kill expand to children; kill = children first, parent last (Section 7.2)
  let targets = [id];
  if (action === 'pause' || action === 'kill') {
    const kids = childrenOf(id);
    targets = action === 'kill' ? [...kids, id] : [id, ...kids];
  }
  let pending = false;
  for (const t of targets) {
    const r = await signaldSend(t, action);
    if (r.status === 'pending') pending = true;
    if (r.status === 'ok' || r.status === 'pending') {
      const ev = { agentId: t, by: by ?? 'api', ts: now() };
      if (t !== id) ev.cascadedFrom = id;
      if (action === 'pause')  { runtime.set(t, 'paused'); broadcast({ event: 'agent.paused', ...ev }); }
      if (action === 'resume') { runtime.set(t, 'ok'); lastPush.set(t, Date.now()); broadcast({ event: 'agent.resumed', ...ev }); }
      if (action === 'kill')   { runtime.set(t, 'killed'); broadcast({ event: 'agent.killed', ...ev }); }
    } else {
      log('signald error for', t, action, JSON.stringify(r));
      return { code: 502, body: r };
    }
  }
  return pending
    ? { code: 202, body: { status: 'pending', message: 'Command sent, awaiting agent acknowledgment' } }
    : { code: 200, body: { status: 'ok' } };
}

// ------------------------------------------------------------------ notifier sink (B5)
function notify(ev) {
  const cfg = mapping.notify || {};
  if (!cfg.discordWebhook) return;
  const min = cfg.minPriority ?? 'high';
  let text = null;
  if (ev.event === 'system.announcement' &&
      (ev.priority === 'alert' || (ev.priority === 'high' && min !== 'alert'))) {
    text = `[${ev.priority.toUpperCase()}] ${ev.message}`;
  }
  if (ev.event === 'agent.down') text = `agent DOWN: ${ev.agentId} (heartbeat ${ev.heartbeatAge}s)`;
  if (ev.event === 'agent.killed') text = `agent KILLED: ${ev.agentId} by ${ev.by}`;
  if (!text) return;
  try {
    const u = new URL(cfg.discordWebhook);
    const body = JSON.stringify({ content: text });
    const req = https.request({ host: u.host, path: u.pathname + u.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } });
    req.on('error', e => log('notify error:', e.message));
    req.end(body);
  } catch (e) { log('notify error:', e.message); }
}

// ------------------------------------------------------------------ schedules (Phase 4: VF #3 timeline + VF #4 reminders)
// mapping.json:
//   reminders:   [{ message, priority, intervalMinutes | dailyAt:"HH:MM", kind? }]
//   cronJobs:    [{ label, owner, intervalMinutes | dailyAt:"HH:MM" }]
//   maintenance: [{ label, owner, at:"2026-06-12T02:00:00Z", durationMinutes }]
function nextFire(spec, afterMs) {
  if (spec.intervalMinutes) {
    const iv = spec.intervalMinutes * 60000;
    return Math.ceil((afterMs + 1) / iv) * iv;
  }
  if (spec.dailyAt) {
    const [h, m] = spec.dailyAt.split(':').map(Number);
    const d = new Date(afterMs);
    d.setHours(h, m, 0, 0);
    if (d.getTime() <= afterMs) d.setDate(d.getDate() + 1);
    return d.getTime();
  }
  return null;
}
function timelineItems() {
  const out = [], nowMs = Date.now(), horizon = nowMs + 12 * 3600 * 1000;
  const MAX_PER = 24;                                       // cap runaway expansions
  for (const c of mapping.cronJobs ?? []) {
    let t = nextFire(c, nowMs), n = 0;
    while (t && t <= horizon && n++ < MAX_PER) { out.push({ ts: Math.floor(t / 1000), label: c.label, kind: c.kind ?? 'cron', owner: c.owner ?? null }); t = nextFire(c, t); }
  }
  for (const r of mapping.reminders ?? []) {
    let t = nextFire(r, nowMs), n = 0;
    while (t && t <= horizon && n++ < MAX_PER) { out.push({ ts: Math.floor(t / 1000), label: r.message, kind: r.kind ?? 'reminder', owner: r.owner ?? null }); t = nextFire(r, t); }
  }
  for (const mn of mapping.maintenance ?? []) {
    const t = Date.parse(mn.at);
    if (t >= nowMs - (mn.durationMinutes ?? 0) * 60000 && t <= horizon)
      out.push({ ts: Math.floor(t / 1000), label: mn.label, kind: 'maintenance', owner: mn.owner ?? null, durationMinutes: mn.durationMinutes ?? null });
  }
  return out.sort((a, b) => a.ts - b.ts);
}
st.reminderFired = st.reminderFired || {};
function reminderTick() {
  const nowMs = Date.now();
  (mapping.reminders ?? []).forEach((r, i) => {
    const key = String(i);
    const last = st.reminderFired[key] ?? nowMs;            // first boot: skip past fires
    const due = nextFire(r, last);
    if (due && due <= nowMs) {
      st.reminderFired[key] = due;
      broadcast({ event: 'system.announcement', message: r.message, priority: r.priority ?? 'normal', ts: now() });
      log('reminder fired:', r.message);
    } else if (!st.reminderFired[key]) {
      st.reminderFired[key] = nowMs;
    }
  });
  saveState();
}
setInterval(reminderTick, 15000);
reminderTick();

// ------------------------------------------------------------------ agent roster (Phase 6 - /api/agents)
function agentGroup(a) {
  if ((a.type ?? 'agent') === 'infrastructure') return 'infrastructure';
  if (a.id === 'marcus' || a.id === 'ceo') return 'command';
  let cur = a, guard = 0;
  while (cur.parent && agents.has(cur.parent) && guard++ < 4) cur = agents.get(cur.parent);
  if (cur.id !== a.id) return cur.id;                       // child -> family root
  if (a.ephemeralPattern || childrenOf(a.id).length) return a.id;   // family root itself
  return 'specialist';
}
const GROUP_LABEL = { command:'Command', devops:'DevOps', specialist:'Operations' };
function agentGroupLabel(a) { return TOPO_GROUP[a.id] ?? GROUP_LABEL[agentGroup(a)] ?? agentGroup(a); }
function agentStatus(id) {
  const rt = runtime.get(id);
  if (rt === 'down' || rt === 'killed') return 'offline';
  if (rt === 'paused') return 'idle';
  const lp = lastPush.get(id);
  if (lp != null && Date.now() - lp <= 60000) return 'online';
  if (lp != null && Date.now() - lp > 24 * 3600 * 1000) return 'offline';
  return 'idle';
}
function agentRoster() {
  return [...agents.values()].map(a => ({
    id: a.id, name: a.name ?? a.id, color: a.color ?? null,
    role: a.role ?? null, group: agentGroupLabel(a),
    status: agentStatus(a.id),
    lastSeen: lastPush.has(a.id) ? Math.floor(lastPush.get(a.id) / 1000) : null,
    anchor: a.anchor ?? null,
  }));
}

// ------------------------------------------------------------------ agent detail (Phase 7b - /api/agents/:id)
function agentDetail(id) {
  const a = agents.get(id);
  if (!a) return null;
  const u = usage.get(id) ?? {};
  const cut = Date.now() - 24 * 3600 * 1000;
  let tasks = [];
  try {
    tasks = db.prepare("SELECT id, title, status FROM tasks WHERE assignee = ? OR assignee = ? ORDER BY id DESC LIMIT 3")
      .all(id, a.name ?? id)
      .map(r => ({ cardId: String(r.id), title: r.title, status: colKey(r.status) }));
  } catch (e) { log('agent detail task query failed:', e.message); }
  return {
    ok: true,
    id, name: a.name ?? id, color: a.color ?? null,
    role: a.role ?? null, group: agentGroupLabel(a), parent: a.parent ?? null,
    status: agentStatus(id), runtime: runtime.get(id) ?? 'ok',
    model: u.fallbackActive ? (u.fallbackModel ?? u.modelName ?? null) : (u.modelName ?? null),
    provider: u.modelProvider ?? null, fallbackActive: u.fallbackActive ?? false,
    sessions24h: (pushHist.get(id) ?? []).filter(t => t >= cut).length,
    tokensToday: u.tokens ?? null, costUsd: u.costUsd ?? null,
    cacheHitRate: u.cacheHitRate ?? null,
    lastSeen: lastPush.has(id) ? Math.floor(lastPush.get(id) / 1000) : null,
    tasks,
  };
}

// ------------------------------------------------------------------ docs portal (Phase 6 - /api/docs/*)
const DOC_EXT = new Set(['.md', '.markdown', '.txt', '.json', '.yaml', '.yml']);
function walkDocs(dir, rel, depth) {
  if (depth > 4) return [];
  let names = [];
  try { names = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of names.slice(0, 200)) {
    if (e.name.startsWith('.')) continue;
    const r = rel + '/' + e.name;
    if (e.isDirectory()) out.push({ name: e.name, path: r, dir: true, children: walkDocs(path.join(dir, e.name), r, depth + 1) });
    else if (DOC_EXT.has(path.extname(e.name).toLowerCase())) out.push({ name: e.name, path: r, dir: false });
  }
  out.sort((x, y) => (y.dir - x.dir) || x.name.localeCompare(y.name));
  return out;
}
function docsTree() {
  const roots = [];
  for (const [name, dir] of Object.entries(DOCS_ROOTS)) {
    const available = fs.existsSync(dir);
    roots.push({ name, available, entries: available ? walkDocs(dir, name, 0) : [] });
  }
  return { ok: true, docsUrl: DOCS_URL, roots };
}
function docsFile(res, rel) {
  if (!rel) return json(res, 400, { ok: false, error: 'path required' });
  const seg = String(rel).split('/').filter(Boolean);
  const rootDir = DOCS_ROOTS[seg[0]];
  if (!rootDir) return json(res, 404, { ok: false, error: 'unknown root' });
  const f = path.normalize(path.join(rootDir, ...seg.slice(1)));
  if (!f.startsWith(path.normalize(rootDir))) return json(res, 403, { ok: false, error: 'forbidden' });
  try {
    const st = fs.statSync(f);
    if (!st.isFile() || st.size > 512 * 1024) return json(res, 413, { ok: false, error: 'not a readable file' });
    return json(res, 200, { ok: true, path: seg.join('/'), content: fs.readFileSync(f, 'utf8') });
  } catch { return json(res, 404, { ok: false, error: 'not found' }); }
}

// ------------------------------------------------------------------ http
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.svg': 'image/svg+xml' };

function json(res, code, obj) {
  const b = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) });
  res.end(b);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = ''; req.on('data', d => { b += d; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(e); } });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (req.method === 'GET' && p === '/agents/usage') {
      const out = [...agents.keys()].map(id => {
        const u = usage.get(id) ?? {};
        const hb = lastPush.has(id) ? Math.floor((Date.now() - lastPush.get(id)) / 1000) : null;
        return {
          agentId: id, tokens: u.tokens ?? null, costUsd: u.costUsd ?? null,
          modelName: u.modelName ?? null, modelProvider: u.modelProvider ?? null,
          cacheHitRate: u.cacheHitRate ?? null, fallbackActive: u.fallbackActive ?? false,
          fallbackModel: u.fallbackModel ?? null, heartbeatAge: hb, windowStart: u.windowStart ?? null,
        };
      });
      return json(res, 200, out);
    }
    if (req.method === 'POST' && p === '/agents/usage') {
      const body = await readBody(req);
      for (const rec of Array.isArray(body) ? body : [body]) intakeUsage(rec);
      return json(res, 200, { status: 'ok' });
    }
    if (req.method === 'GET' && p === '/timeline') return json(res, 200, timelineItems());
    if (req.method === 'GET' && p === '/snapshot') return json(res, 200, snapshot());   // Phase 5: HTTP polling fallback
    if (req.method === 'GET' && p === '/api/backups') return json(res, 200, readBackups(BACKUPS_FILE));   // Phase 6
    if (req.method === 'GET' && p === '/api/agents') return json(res, 200, agentRoster());                // Phase 6
    const adet = p.match(/^\/api\/agents\/([\w.\-]+)$/);                                                   // Phase 7b
    if (req.method === 'GET' && adet) {
      const d = agentDetail(adet[1]);
      return d ? json(res, 200, d) : json(res, 404, { ok: false, error: 'unknown agent' });
    }
    if (req.method === 'GET' && p === '/api/docs/tree') return json(res, 200, docsTree());                // Phase 6
    if (req.method === 'GET' && p === '/api/docs/file') return docsFile(res, url.searchParams.get('path'));
    if (req.method === 'GET' && p === '/mapping.json') {
      return json(res, 200, { models: mapping.models ?? {}, budgets: mapping.budgets ?? {}, dashboardUrl: mapping.dashboardUrl ?? '' });   // Phase 8
    }
    if (req.method === 'GET' && p === '/config/topology.json') {                                            // Project E (E4)
      return topology ? json(res, 200, topology) : json(res, 404, { error: 'topology not configured' });
    }
    if (req.method === 'POST' && p === '/announce') {
      const { message, priority } = await readBody(req);
      if (!message) return json(res, 400, { status: 'error', message: 'message required' });
      broadcast({ event: 'system.announcement', message: esc(message), priority: priority ?? 'normal', ts: now() });
      return json(res, 200, { status: 'ok' });
    }
    const cmd = p.match(/^\/agents\/([\w.-]+)\/(pause|resume|kill)$/);
    if (req.method === 'POST' && cmd) {
      const { code, body } = await command(cmd[1], cmd[2], req.headers['x-actor']);
      return json(res, code, body);
    }
    // static
    if (req.method === 'GET') {
      let f = path.normalize(path.join(PUBLIC_DIR, p === '/' ? 'index.html' : p));
      if (!f.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
      if (p === '/waypoints.json' && !fs.existsSync(f)) f = path.join(PUBLIC_DIR, 'waypoints.json');
      if (fs.existsSync(f) && fs.statSync(f).isFile()) {
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] ?? 'application/octet-stream' });
        return fs.createReadStream(f).pipe(res);
      }
      res.writeHead(404); return res.end('not found');
    }
    res.writeHead(405); res.end();
  } catch (e) {
    log('request error:', p, e.message);
    json(res, 500, { status: 'error', message: e.message });
  }
});
server.on('upgrade', (req, sock) => {                    // Phase 5: explicit /ws path
  let p = '/';
  try { p = new URL(req.url, 'http://x').pathname; } catch {}
  if (p === '/ws') return handleUpgrade(req, sock);
  try { sock.write('HTTP/1.1 404 Not Found' + String.fromCharCode(13, 10, 13, 10)); } catch {}
  sock.destroy();
});

// ------------------------------------------------------------------ start
openDb();
server.listen(PORT, HOST, () => log(`listening on http://${HOST}:${PORT}, db=${DB_PATH}, lastEventId=${st.lastEventId}`));
setInterval(pollKanban, 2000);
setInterval(checkHeartbeats, 5000);
process.on('SIGTERM', () => { saveState(); process.exit(0); });
