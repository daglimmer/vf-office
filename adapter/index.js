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
const GATEWAY_URL = ENV('GATEWAY_URL', 'http://10.11.1.120:7100');   // live agent telemetry (status/model/provider)
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
const TOPO_GROUP = {}; // agentId (lowercase) -> group label, from canonical topology.json
for (const g of (topology && topology.groups) || []) for (const id of g.agents || []) TOPO_GROUP[String(id).toLowerCase()] = g.label;
console.log(`[adapter] topology ${topology ? 'loaded' : 'NOT FOUND — legacy grouping'}: ${Object.keys(TOPO_GROUP).length} agents mapped (oly=${TOPO_GROUP['oly'] ?? '?'}, sentinel=${TOPO_GROUP['sentinel'] ?? '?'})`);

// Hermes profile model resolution — authoritative source for model/provider assignments.
// The Gateway may report stale model info; Hermes profile config.yaml is ground truth.
const HERMES_PROFILES_DIR = path.dirname(DB_PATH);  // ~/.hermes/  — profiles live under ~/.hermes/profiles/
let _profileModels = { at: 0, map: new Map() };  // agentId -> { model, provider, base_url }
function readProfileModel(agentId) {
  const configPath = path.join(HERMES_PROFILES_DIR, 'profiles', agentId, 'config.yaml');
  try {
    if (!fs.existsSync(configPath)) return null;
    const lines = fs.readFileSync(configPath, 'utf8').split('\n');
    let inModel = false;
    let model = null, provider = null, baseUrl = null;
    for (const line of lines) {
      if (/^model:\s*$/.test(line)) { inModel = true; continue; }
      if (inModel && /^\S/.test(line)) break;  // exit model section
      if (!inModel) continue;
      const m = line.match(/^\s+model:\s*(.+)\s*$/);
      if (m) model = m[1].trim();
      const p = line.match(/^\s+provider:\s*(.+)\s*$/);
      if (p) provider = p[1].trim();
      const b = line.match(/^\s+base_url:\s*(.+)\s*$/);
      if (b) baseUrl = b[1].trim();
    }
    if (model || provider) return { model, provider, baseUrl };
  } catch (e) { /* ignore — profile may not exist */ }
  return null;
}
function profileModelMap() {
  if (Date.now() - _profileModels.at < 60000) return _profileModels.map;  // cache 60s
  const m = new Map();
  for (const id of agents.keys()) {
    const pm = readProfileModel(id);
    if (pm) m.set(id, pm);
  }
  _profileModels = { at: Date.now(), map: m };
  return m;
}

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
  tasks:    "SELECT * FROM tasks WHERE status NOT IN ('archived','Archive')",
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
  for (const c of clients) {
    try { c.write(frame); }
    catch { clients.delete(c); try { c.destroy(); } catch {} }   // dead socket: prune, don't just swallow
  }
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
let db = null;       // read-only — used by snapshot/timeline/agent queries
let writeDb = null;  // read-write — used by POST /api/kanban/items (dir must be writable)
function openDb() {
  db = new DatabaseSync(DB_PATH, { readOnly: true });
  db.exec('PRAGMA busy_timeout = 2000');
  try {
    writeDb = new DatabaseSync(DB_PATH, { readOnly: false });
    writeDb.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL');
  } catch (e) {
    log('WARNING: kanban.db write connection failed — task creation disabled:', e.message);
  }
}
// ---- code-quality pass: health + error propagation. Silent catch blocks used to
// leave the 3D Office showing stale/empty data with no signal — track failures
// here, expose them on /health, and surface a `degraded` flag on the snapshot.
const health = { errors: new Map(), lastSnapshotAt: 0, lastCardCount: 0 };
function reportErr(key, msg) {
  health.errors.set(key, { msg: String(msg ?? 'error'), at: Date.now(), count: (health.errors.get(key)?.count ?? 0) + 1 });
}
function clearErr(key) { health.errors.delete(key); }
function healthReport() {
  return {
    ok: health.errors.size === 0,
    errors: [...health.errors.entries()].map(([k, e]) => `${k}: ${e.msg}`),
    gatewayOk: !health.errors.has('gateway'),
    gatewayAgeMs: _gw.at ? Date.now() - _gw.at : null,
    lastSnapshotMs: health.lastSnapshotAt ? Date.now() - health.lastSnapshotAt : null,
    agents: agents.size,
    cards: health.lastCardCount,
  };
}

function snapshot() {
  const cards = [];
  try {
    for (const r of db.prepare(SQL.tasks).all()) {
      cards.push({
        cardId: String(r.id), title: r.title, column: colKey(r.status),
        assignee: r.assignee, priority: r.priority,
        description: r.body ?? null,                              // tasks.body = the description
        createdAt: r.created_at                                  // epoch (s or ms) -> ISO for the dashboard
          ? new Date(r.created_at < 1e12 ? r.created_at * 1000 : r.created_at).toISOString()
          : null,
      });
    }
    clearErr('snapshot.tasks');
  } catch (e) { reportErr('snapshot.tasks', e.message); log('snapshot query failed:', e.message); }
  // Task dependency links with the linked task TITLES resolved — task_links has
  // only parent_id/child_id, so JOIN tasks so the Kanban UI can show what a
  // connection means. (Guarded: empty if the table is absent.)
  let links = [];
  try {
    for (const r of db.prepare('SELECT l.parent_id AS parentId, l.child_id AS childId, p.title AS parentTitle, c.title AS childTitle FROM task_links l LEFT JOIN tasks p ON p.id = l.parent_id LEFT JOIN tasks c ON c.id = l.child_id').all()) {
      links.push({ parentId: String(r.parentId), childId: String(r.childId), parentTitle: r.parentTitle ?? null, childTitle: r.childTitle ?? null });
    }
    clearErr('snapshot.links');
  } catch (e) { reportErr('snapshot.links', e.message); log('snapshot links query failed:', e.message); }
  // Count blocked cards for the frontend
  let blockedCount = 0;
  try {
    const row = db.prepare("SELECT COUNT(*) AS cnt FROM tasks WHERE status = 'Blocked'").get();
    blockedCount = row ? Number(row.cnt) : 0;
  } catch (e) { /* ignore */ }
  // Dynamic active count: agents with recent heartbeat (last 5 minutes)
  let activeCount = 0;
  const activeThreshold = Date.now() - 5 * 60 * 1000;
  for (const [id] of agents) {
    const lp = lastPush.get(id);
    if (lp != null && lp >= activeThreshold) activeCount++;
    else if (runtime.get(id) === 'ok' && lp == null) activeCount++; // never pushed but runtime says ok
  }
  const pmap = profileModelMap();                  // hoisted: was rebuilt per-agent inside the loop
  health.lastSnapshotAt = Date.now(); health.lastCardCount = cards.length;
  return {
    event: 'snapshot', ts: now(), cards, links, blockedCount, activeCount,
    degraded: health.errors.size > 0,              // error propagation: let the office show "data stale"
    staleSources: [...health.errors.keys()],
    agents: [...agents.values()].map(a => {
      const pcfg = pmap.get(a.id);
      return {
        id: a.id, name: a.name ?? a.id, color: a.color, parent: a.parent ?? null,
        type: a.type ?? 'agent',                     // 'infrastructure' for VMs (VF #1)
        ephemeral: a.ephemeral, runtime: runtime.get(a.id) ?? 'ok',
        fallbackActive: usage.get(a.id)?.fallbackActive ?? false,
        model: pcfg?.model ?? null,
        provider: pcfg?.provider ?? null,
      };
    }),
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
function agentGroupLabel(a) { return TOPO_GROUP[String(a.id).toLowerCase()] ?? GROUP_LABEL[agentGroup(a)] ?? agentGroup(a); }
function agentStatus(id) {
  const rt = runtime.get(id);
  if (rt === 'down' || rt === 'killed') return 'offline';
  if (rt === 'paused') return 'idle';
  const lp = lastPush.get(id);
  if (lp != null && Date.now() - lp <= 60000) return 'online';
  if (lp != null && Date.now() - lp > 24 * 3600 * 1000) return 'offline';
  return 'idle';
}
// Live telemetry from the Hermes Gateway (authoritative for status/model/provider).
// Cached 30s + hard 3s timeout so a slow/down gateway never hangs /api/agents
// (this also addresses the /api/agents/:id timeout). Falls back to local data.
let _gw = { at: 0, map: new Map() };
async function gatewayMap() {
  if (Date.now() - _gw.at < 30000) return _gw.map;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(`${GATEWAY_URL}/heartbeats`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (r.ok) {
      const arr = await r.json();
      const m = new Map();
      for (const h of (Array.isArray(arr) ? arr : [])) m.set(h.id, h);
      _gw = { at: Date.now(), map: m };
      clearErr('gateway');                           // recovered → /health goes green
    } else {
      reportErr('gateway', `heartbeats HTTP ${r.status}`);   // non-OK was silent before
    }
  } catch (e) {
    // stale-while-revalidate: keep serving the last good map, but SURFACE that it's stale
    reportErr('gateway', e.message);
    log('gateway heartbeats fetch failed:', e.message);
  }
  return _gw.map;
}
function statusFromLastSeen(iso) {
  if (!iso) return 'offline';
  const age = Date.now() - new Date(iso).getTime();
  if (age < 120000) return 'online';
  if (age < 1800000) return 'idle';
  return 'offline';
}
function taskRow(r) {
  return {
    id: r.id, title: r.title, status: r.status, assignee: r.assignee,
    priority: r.priority, body: r.body ?? null, createdBy: r.created_by ?? null,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
    idempotencyKey: r.idempotency_key ?? null
  };
}

// /api/agents — a SUPERSET endpoint: anchors + identity from agents.json (for the
// 3D office) merged with live status/model/provider from the Gateway (for the
// dashboard). One endpoint serves both, so the ingress can route /api/agents here.
async function agentRoster() {
  const gw = await gatewayMap();
  const pm = profileModelMap();
  return [...agents.values()].map(a => {
    const h = gw.get(a.id) || {};
    const u = usage.get(a.id) || {};
    const pcfg = pm.get(a.id);
    const lastSeen = h.last_seen ?? (lastPush.has(a.id) ? new Date(lastPush.get(a.id)).toISOString() : null);
    // Authoritative model: Hermes profile config > gateway report > usage data
    const model = pcfg?.model ?? h.model ?? u.modelName ?? null;
    const provider = pcfg?.provider ?? h.provider ?? u.modelProvider ?? null;
    return {
      id: a.id, name: a.name ?? a.id, color: a.color ?? null,
      role: a.role ?? null, group: agentGroupLabel(a),
      // Status from last_seen only — the gateway's `status` is junk ("online" for all,
      // even agents unseen for days). last_seen is the real ~3s heartbeat.
      status: h.last_seen ? statusFromLastSeen(h.last_seen) : agentStatus(a.id),
      lastSeen,
      anchor: a.anchor ?? null,
      model, provider,
      // Gateway raw data preserved for debugging — shows what the gateway last saw
      reportedModel: h.model ?? u.modelName ?? null,
      reportedProvider: h.provider ?? u.modelProvider ?? null,
    };
  });
}

// ------------------------------------------------------------------ agent detail (Phase 7b - /api/agents/:id)
// Cache for session stats per agent (60s TTL) to avoid hitting state.db every request
let _sessionStats = { at: 0, map: new Map() };  // agentId -> { sessions24h, tokensToday, costUsd }
function readSessionStats(agentId) {
  if (Date.now() - _sessionStats.at < 60000) return _sessionStats.map.get(agentId) ?? null;
  // Refresh all agents in one pass
  const m = new Map();
  for (const id of agents.keys()) {
    const stateDbPath = path.join(HERMES_PROFILES_DIR, 'profiles', id, 'state.db');
    try {
      if (!fs.existsSync(stateDbPath)) continue;
      const sdb = new DatabaseSync(stateDbPath, { readOnly: true });
      try {
        const cut = (Date.now() - 24 * 3600 * 1000) / 1000;  // state.db uses Unix seconds
        const sess = sdb.prepare(
          'SELECT COUNT(*) AS cnt, COALESCE(SUM(input_tokens),0) + COALESCE(SUM(output_tokens),0) AS totalTokens, COALESCE(SUM(estimated_cost_usd),0) AS totalCost FROM sessions WHERE started_at >= ?'
        ).get(cut);
        m.set(id, {
          sessions24h: sess ? Number(sess.cnt) : 0,
          tokensToday: sess ? Number(sess.totalTokens) : 0,
          costUsd: sess ? Number(sess.totalCost) : 0,
        });
      } finally { sdb.close(); }
    } catch (e) { /* ignore — no state.db or can't read */ }
  }
  _sessionStats = { at: Date.now(), map: m };
  return m.get(agentId) ?? null;
}

async function agentDetail(id) {
  const a = agents.get(id);
  if (!a) return null;
  const u = usage.get(id) ?? {};
  const h = (await gatewayMap()).get(id) || {};
  const pcfg = profileModelMap().get(id);
  const ss = readSessionStats(id);
  const cut = Date.now() - 24 * 3600 * 1000;
  let tasks = [];
  try {
    tasks = db.prepare("SELECT id, title, status FROM tasks WHERE assignee = ? OR assignee = ? ORDER BY id DESC LIMIT 3")
      .all(id, a.name ?? id)
      .map(r => ({ cardId: String(r.id), title: r.title, status: colKey(r.status) }));
  } catch (e) { log('agent detail task query failed:', e.message); }
  // Model: Hermes profile config > gateway report > usage data
  const model = pcfg?.model ?? h.model ?? (u.fallbackActive ? (u.fallbackModel ?? u.modelName ?? null) : (u.modelName ?? null));
  const provider = pcfg?.provider ?? h.provider ?? u.modelProvider ?? null;
  // Session stats: state.db > usage push data > pushHist fallback
  const sessions24h = ss?.sessions24h ?? (pushHist.get(id) ?? []).filter(t => t >= cut).length;
  const tokensToday = ss?.tokensToday ?? u.tokens ?? null;
  const costUsd = ss?.costUsd ?? u.costUsd ?? null;
  return {
    ok: true,
    id, name: a.name ?? id, color: a.color ?? null,
    role: a.role ?? null, group: agentGroupLabel(a), parent: a.parent ?? null,
    status: h.last_seen ? statusFromLastSeen(h.last_seen) : agentStatus(id), runtime: runtime.get(id) ?? 'ok',
    model, provider, fallbackActive: u.fallbackActive ?? false,
    // Gateway raw data preserved for debugging
    reportedModel: h.model ?? null,
    reportedProvider: h.provider ?? null,
    sessions24h, tokensToday, costUsd,
    cacheHitRate: u.cacheHitRate ?? null,
    lastSeen: h.last_seen ?? (lastPush.has(id) ? new Date(lastPush.get(id)).toISOString() : null),
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
    if (req.method === 'GET' && (p === '/agents/usage' || p === '/api/agents/usage')) {
      const pm = profileModelMap();
      const out = [...agents.keys()].map(id => {
        const u = usage.get(id) ?? {};
        const ss = readSessionStats(id);
        const pcfg = pm.get(id);
        const hb = lastPush.has(id) ? Math.floor((Date.now() - lastPush.get(id)) / 1000) : null;
        return {
          agentId: id,
          tokens: ss?.tokensToday ?? u.tokens ?? null,
          costUsd: ss?.costUsd ?? u.costUsd ?? null,
          sessions24h: ss?.sessions24h ?? null,
          modelName: pcfg?.model ?? u.modelName ?? null,
          modelProvider: pcfg?.provider ?? u.modelProvider ?? null,
          cacheHitRate: u.cacheHitRate ?? null, fallbackActive: u.fallbackActive ?? false,
          fallbackModel: u.fallbackModel ?? null, heartbeatAge: hb, windowStart: u.windowStart ?? null,
        };
      });
      return json(res, 200, out);
    }
    if (req.method === 'POST' && (p === '/agents/usage' || p === '/api/agents/usage')) {
      const body = await readBody(req);
      for (const rec of Array.isArray(body) ? body : [body]) intakeUsage(rec);
      return json(res, 200, { status: 'ok' });
    }
    if (req.method === 'POST' && p === '/api/kanban/items') {       // direct DB insert; Hermes dispatcher auto-picks 'ready' tasks
      const b = await readBody(req);
      if (!b || !b.title) return json(res, 400, { ok: false, error: 'title required' });
      if (!writeDb) return json(res, 503, { ok: false, error: 'kanban.db not writable' });
      try {
        // idempotency: if dispatch approval sent twice, return existing task
        if (b.idempotencyKey) {
          const existing = writeDb.prepare('SELECT * FROM tasks WHERE idempotency_key = ?').get(String(b.idempotencyKey));
          if (existing) return json(res, 200, { ok: true, task: taskRow(existing), idempotent: true });
        }
        const id = 't_' + crypto.randomBytes(4).toString('hex');
        const now = Date.now();
        writeDb.prepare(`INSERT INTO tasks (id, title, body, assignee, status, priority, created_by, created_at, idempotency_key, workspace_kind)
          VALUES (?, ?, ?, ?, 'ready', ?, ?, ?, ?, 'scratch')`)
          .run(id, String(b.title), String(b.body ?? ''), String(b.assignee ?? 'unassigned'),
               b.priority != null ? Number(b.priority) : 0,
               String(b.createdBy ?? 'dashboard'), now,
               b.idempotencyKey ? String(b.idempotencyKey) : null);
        const task = { id, title: String(b.title), status: 'ready', assignee: String(b.assignee ?? 'unassigned'),
                       priority: b.priority != null ? Number(b.priority) : 0, createdBy: String(b.createdBy ?? 'dashboard'),
                       createdAt: new Date(now).toISOString() };
        log('kanban task created:', id, '→', task.assignee);
        return json(res, 201, { ok: true, task });
      } catch (e) { log('kanban create failed:', e.message); return json(res, 502, { ok: false, error: e.message }); }
    }
    if (req.method === 'GET' && p === '/health') {                                       // code-quality pass: surface silent failures
      const h = healthReport();
      return json(res, h.ok ? 200 : 503, { status: h.ok ? 'ok' : 'degraded', ...h });
    }
    if (req.method === 'GET' && p === '/timeline') return json(res, 200, timelineItems());
    if (req.method === 'GET' && p === '/snapshot') return json(res, 200, snapshot());   // Phase 5: HTTP polling fallback
    if (req.method === 'GET' && p === '/api/backups') return json(res, 200, readBackups(BACKUPS_FILE));   // Phase 6
    if (req.method === 'GET' && p === '/api/agents') return json(res, 200, await agentRoster());           // Phase 6
    const adet = p.match(/^\/api\/agents\/([\w.\-]+)$/);                                                   // Phase 7b
    if (req.method === 'GET' && adet) {
      const d = await agentDetail(adet[1]);
      return d ? json(res, 200, d) : json(res, 404, { ok: false, error: 'unknown agent' });
    }
    if (req.method === 'GET' && p === '/api/docs/tree') return json(res, 200, docsTree());                // Phase 6
    if (req.method === 'GET' && p === '/api/admin/accounts') {             // Phase 2 — admin visibility
      const candidates = [path.join(CONFIG_DIR, 'dex-state.json'), '/root/.hermes/dex-state.json'];
      const df = candidates.find(f => { try { return fs.existsSync(f); } catch { return false; } });
      if (df) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(fs.readFileSync(df, 'utf8')); }
      return json(res, 404, { error: 'dex-state.json not found' });
    }
    if (req.method === 'POST' && p === '/api/admin/log-login') {          // Phase 2 — ForwardAuth login logging
      const candidates = [path.join(CONFIG_DIR, 'dex-state.json'), '/root/.hermes/dex-state.json'];
      const df = candidates.find(f => { try { return fs.existsSync(f); } catch { return false; } });
      if (!df) return json(res, 404, { error: 'dex-state.json not found' });
      const entry = await readBody(req);
      if (!entry.email) return json(res, 400, { error: 'email required' });
      const data = JSON.parse(fs.readFileSync(df, 'utf8'));
      data.loginActivity.push(entry);
      if (data.loginActivity.length > 100) data.loginActivity = data.loginActivity.slice(-100);
      fs.writeFileSync(df, JSON.stringify(data, null, 2));
      return json(res, 200, { ok: true });
    }
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
