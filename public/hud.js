// Phase 4 — HUD: Agent Status Dashboard (Spec §9) + VF infra strip & history.
// Phase 6: tab strip (Office | Backups | Docs) wiring the new page panels.
import { attachSteering } from './steering.js';
import { initBackups, toggleBackups } from './backups.js';
import { initDocs, toggleDocs } from './docs.js';

const STATE_COLOR = {
  working: '#3DFF7A', briefing: '#4DD8FF', idle: '#8A8F98', lunch: '#FF9E2C',
  blocked: '#FF4D4D', documentation: '#9B30FF', debrief: '#4DD8FF',
  spawning: '#8A8F98', despawning: '#8A8F98',
  PAUSED: '#FFB02E', DOWN: '#FF4D4D', KILLED: '#FF4D4D',
};
const SORT_BAND = { blocked: 0, DOWN: 0, PAUSED: 1, working: 2, briefing: 3, debrief: 3, documentation: 4, lunch: 5, idle: 6, KILLED: 7 };

export function initHud({ bus, sim, demo }) {
  const root = document.getElementById('hud');
  root.innerHTML = `
    <div class="hud-tabs">
      <button data-tab="office" class="on">3D Office</button>
      <button data-tab="backups">Backups</button>
      <button data-tab="docs">&#128196; Docs</button>
    </div>
    <div class="hud-stats">
      <div><b data-b="active">0</b><span>active</span></div>
      <div><b data-b="blocked" class="warn">0</b><span>blocked</span></div>
      <div><b data-b="inflight">0</b><span>in flight</span></div>
      <div><b data-b="cost">$–</b><span>session</span></div>
    </div>
    <div class="hud-infra" data-b="infra"></div>
    <div class="hud-agents" data-b="agents"></div>
    <div class="hud-notif-head">notifications <button class="hist-toggle">history</button></div>
    <div class="hud-notifications" data-b="log"></div>
    <div class="hud-history" style="display:none">
      <div class="hist-filter">
        <button data-f="all" class="on">all</button><button data-f="normal">normal</button>
        <button data-f="high">high</button><button data-f="alert">alert</button>
      </div>
      <div class="hist-rows" data-b="hist"></div>
    </div>`;
  const $ = s => root.querySelector(`[data-b="${s}"]`);

  // ---------------- Phase 6: page tabs
  const setTab = t => {
    for (const b of root.querySelectorAll('.hud-tabs button'))
      b.classList.toggle('on', b.dataset.tab === t);
    toggleBackups(t === 'backups');
    toggleDocs(t === 'docs');
  };
  initBackups({ onClose: () => setTab('office') });
  initDocs({ onClose: () => setTab('office') });
  for (const b of root.querySelectorAll('.hud-tabs button'))
    b.onclick = e => { e.stopPropagation(); setTab(b.dataset.tab); };

  // ---------------- registry
  const reg = new Map();        // agentId -> {name,color,parent,type,runtime,fallbackActive,state,task,blockedSince,reason}
  const usage = new Map();      // agentId -> usage record
  const cards = new Map();      // DOM: agentId -> {el, steer}
  let budgets = { soft: 5, hard: 20 };
  const log5 = [], hist = [];
  let histFilter = 'all';

  // ---------------- collapse behavior (§9.6) + Phase 8f pin (Ray)
  // States: auto (events expand it, collapses when idle) -> pinned open ->
  // pinned closed. Persisted across reloads.
  let pinState = localStorage.getItem('hudPin') ?? 'auto';
  const pin = document.createElement('button');
  pin.className = 'hud-pin';
  function applyPin() {
    root.classList.toggle('pin-closed', pinState === 'closed');
    if (pinState === 'open') root.classList.add('open');
    if (pinState === 'closed') root.classList.remove('open');
    pin.textContent = pinState === 'open' ? '\u{1F4CC}' : pinState === 'closed' ? '\u2715' : '\u25CC';
    pin.title = `sidebar: ${pinState} — click to cycle (auto \u2192 pinned open \u2192 pinned closed)`;
    pin.classList.toggle('on', pinState !== 'auto');
  }
  pin.onclick = e => {
    e.stopPropagation();
    pinState = pinState === 'auto' ? 'open' : pinState === 'open' ? 'closed' : 'auto';
    try { localStorage.setItem('hudPin', pinState); } catch {}
    applyPin();
  };
  root.appendChild(pin);
  applyPin();

  let expandTimer = null;
  function expandPulse() {
    if (pinState !== 'auto') return;
    root.classList.add('open');
    clearTimeout(expandTimer);
    expandTimer = setTimeout(() => { if (!root.matches(':hover')) root.classList.remove('open'); }, 6000);
  }
  root.addEventListener('mouseenter', () => { if (pinState !== 'closed') root.classList.add('open'); });
  root.addEventListener('mouseleave', () => { if (pinState === 'auto') root.classList.remove('open'); });

  root.querySelector('.hist-toggle').onclick = () => {
    const h = root.querySelector('.hud-history');
    h.style.display = h.style.display === 'none' ? 'block' : 'none';
    dirty();
  };
  for (const b of root.querySelectorAll('.hist-filter button')) {
    b.onclick = () => {
      histFilter = b.dataset.f;
      root.querySelectorAll('.hist-filter button').forEach(x => x.classList.toggle('on', x === b));
      dirty();
    };
  }

  // ---------------- rAF-batched rendering (§9.6)
  let isDirty = false;
  function dirty() { if (!isDirty) { isDirty = true; requestAnimationFrame(render); } }

  function agentState(id) {
    const a = reg.get(id);
    if (!a) return 'idle';
    if (a.runtime === 'paused') return 'PAUSED';
    if (a.runtime === 'down') return 'DOWN';
    if (a.runtime === 'killed') return 'KILLED';
    // card avatar state for this assignee
    for (const av of sim.getAgents()) {
      if (av.name === id || av.agentId === id) {
        if (av.blocked) return 'blocked';
        return av.state ?? 'idle';
      }
    }
    return 'idle';
  }

  function makeCard(id) {
    const a = reg.get(id);
    const el = document.createElement('div');
    el.className = 'agent-card' + (a.parent ? ' child' : '');
    el.dataset.agent = id;
    el.innerHTML = `
      <div class="row head">
        <i class="dot"></i><span class="name"></span>
        <span class="badge model"></span><i class="cache"></i>
        <span class="badge state"></span>
      </div>
      <div class="row ctx"></div>
      <div class="row tok">▲ <b>–</b> tok</div>
      <div class="row cost"><b>$–</b> this session</div>
      <div class="row actions"></div>`;
    el.querySelector('.dot').style.background = a.color ?? '#8A8F98';
    el.querySelector('.name').textContent = a.name ?? id;
    const actions = el.querySelector('.actions');
    const steer = attachSteering(el, id, { demo, bus });
    actions.appendChild(steer);
    const follow = document.createElement('button');
    follow.className = 'icon'; follow.textContent = '◉'; follow.title = 'follow';
    follow.onclick = e => { e.stopPropagation(); sim.followAgent(sim.followed?.agentId === id || sim.followed?.name === id ? null : id); };
    const focus = document.createElement('button');
    focus.className = 'icon'; focus.textContent = '⌖'; focus.title = 'focus room';
    focus.onclick = e => { e.stopPropagation(); sim.flyToAgent(id); };
    actions.append(follow, focus);
    cards.set(id, { el, steer, follow });
    return el;
  }

  function render() {
    isDirty = false;
    // Every FLEET agent in the 3D office must also have a sidebar card. `reg` was fed ONLY by bridge
    // events, so roster agents that never emitted one (e.g. Metis, Pheme) were in the office but missing
    // from the list. Seed reg from the live roster so the sidebar always matches the floor. (Ray)
    for (const av of sim.getAgents()) {
      const id = av.agentId;                       // fleet agents have agentId; card-workers/guard don't
      if (!id || reg.has(id)) continue;
      reg.set(id, { id, name: av.name ?? id, color: av.color });
    }
    // stats
    const live = [...reg.values()].filter(a => a.type !== 'infrastructure');
    const states = live.map(a => agentState(a.id));
    $('active').textContent = states.filter(s => !['KILLED'].includes(s)).length;
    const blockedN = states.filter(s => s === 'blocked' || s === 'DOWN').length;
    $('blocked').textContent = blockedN;
    $('blocked').classList.toggle('alert', blockedN > 0);
    $('inflight').textContent = sim.getAgents().filter(a => a.cardId).length;
    let total = 0, any = false;
    for (const u of usage.values()) if (u.costUsd != null) { total += u.costUsd; any = true; }
    const costEl = $('cost');
    costEl.textContent = any ? `$${total.toFixed(2)}` : '$–';
    costEl.className = total > budgets.hard ? 'alert' : total > budgets.soft ? 'warn' : '';

    // infra strip (VF #1)
    const infra = [...reg.values()].filter(a => a.type === 'infrastructure');
    $('infra').innerHTML = infra.map(a => {
      const u = usage.get(a.id);
      const hb = u?.heartbeatAge;
      const ok = a.runtime !== 'down' && hb != null && hb <= 60;
      return `<span class="vm"><i class="dot ${ok ? 'ok' : 'bad'}"></i>${a.name}<em>${hb != null ? hb + 's' : '—'}</em></span>`;
    }).join('') || '<span class="vm none">no infrastructure feed</span>';

    // agent cards: parents then children, banded sort
    const parents = live.filter(a => !a.parent);
    const order = [];
    parents.sort((x, y) => (SORT_BAND[agentState(x.id)] ?? 6) - (SORT_BAND[agentState(y.id)] ?? 6));
    for (const p of parents) {
      order.push(p.id);
      for (const c of live.filter(a => a.parent === p.id)) order.push(c.id);
    }
    const host = $('agents');
    for (const id of order) {
      const a = reg.get(id);
      const entry = cards.get(id) ?? { el: host.appendChild(makeCard(id)) };
      const { el, steer, follow } = cards.get(id);
      host.appendChild(el);                       // re-append = reorder
      const st = agentState(id);
      el.classList.toggle('paused', st === 'PAUSED');
      el.classList.toggle('down', st === 'DOWN');
      el.classList.toggle('killed', st === 'KILLED');
      const sb = el.querySelector('.badge.state');
      sb.textContent = st; sb.style.color = STATE_COLOR[st] ?? '#8A8F98';
      // model badge + cache dot (§9.4)
      const u = usage.get(id) ?? {};
      const mb = el.querySelector('.badge.model');
      const models = window.__mapping?.models ?? {};
      const mn = u.fallbackActive ? u.fallbackModel ?? u.modelName : u.modelName;
      const mi = models[mn];
      mb.textContent = mi?.display ?? (mn ?? '');
      mb.style.display = mn ? '' : 'none';
      mb.style.background = (mi?.color ?? '#8A8F98') + '22';
      mb.style.color = mi?.color ?? '#8A8F98';
      mb.classList.toggle('fallback', !!u.fallbackActive);
      const cd = el.querySelector('.cache');
      if (u.cacheHitRate == null) cd.style.display = 'none';
      else {
        cd.style.display = '';
        cd.title = `cache ${Math.round(u.cacheHitRate * 100)}%`;
        cd.style.background = u.cacheHitRate > 0.8 ? '#3DFF7A' : u.cacheHitRate >= 0.4 ? '#FFB02E' : '#FF4D4D';
      }
      // context row — Phase 12: show the agent's current task title whenever available,
      // matching the 3D agent by agentId OR name (both indexed by syncWorkers and
      // pollRoster above). Falls through to name-only when nothing is active.
      const ctx = el.querySelector('.ctx');
      if (st === 'blocked' && a.reason) ctx.textContent = `⛔ ${a.reason}`;
      else {
        const av = sim.getAgents().find(v => (v.agentId === id || v.name === id) && (v.cardId || v.taskTitle));
        ctx.textContent = av ? (av.cardId ? `${av.cardId} · ${av.taskTitle ?? ''}` : (av.taskTitle ?? '')) : '';
      }
      // counters (frozen presentational when paused/killed §10.3)
      const frozen = st === 'PAUSED' || st === 'KILLED';
      if (!frozen) {
        el.querySelector('.tok b').textContent = u.tokens != null ? u.tokens.toLocaleString() : '–';
        el.querySelector('.cost b').textContent = u.costUsd != null ? `$${u.costUsd.toFixed(2)}` : '$–';
      }
      el.querySelector('.cost').classList.toggle('frozen', frozen);
      steer.update?.(a.runtime);
    }
    // killed cards linger 60s then slide out (§10.4)
    for (const [id, { el }] of cards) {
      const a = reg.get(id);
      if (a?.runtime === 'killed' && !el.dataset.killedAt) {
        el.dataset.killedAt = Date.now();
        setTimeout(() => { el.classList.add('slideout'); setTimeout(() => el.remove(), 400); cards.delete(id); }, 60000);
      }
    }
    // notification log (§9.7): last 5, alerts pinned
    $('log').innerHTML = log5.map(n =>
      `<div class="nrow ${n.pinned ? 'pinned' : ''}" data-agent="${n.agent ?? ''}">
        <i class="dot" style="background:${n.color}"></i><b>${n.agent ?? 'ALL'}</b>
        <span>${n.text}</span><em>${ago(n.ts)}</em></div>`).join('');
    for (const r of $('log').querySelectorAll('.nrow')) {
      r.onclick = () => {
        if (r.classList.contains('pinned')) { r.classList.remove('pinned'); const n = log5.find(x => x.pinned && (x.agent ?? '') === r.dataset.agent); if (n) n.pinned = false; trimLog(); dirty(); }
        else if (r.dataset.agent) sim.followAgent(r.dataset.agent);
      };
    }
    // history panel (VF #2)
    const rows = hist.filter(h => histFilter === 'all' || h.priority === histFilter);
    $('hist').innerHTML = rows.slice(0, 50).map(h =>
      `<div class="nrow"><i class="dot" style="background:${h.color}"></i><b>${h.priority}</b><span>${h.text}</span><em>${ago(h.ts)}</em></div>`).join('');
  }
  const ago = ts => { const s = Math.max(0, Math.floor(Date.now() / 1000 - ts)); return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`; };
  setInterval(dirty, 5000);                       // tick relative timestamps

  function pushLog(entry) {
    log5.unshift(entry); trimLog();
    hist.unshift({ priority: entry.priority ?? 'normal', color: entry.color, text: entry.text, ts: entry.ts });
    if (hist.length > 50) hist.pop();
  }
  function trimLog() {
    const pinned = log5.filter(n => n.pinned);
    const rest = log5.filter(n => !n.pinned);
    log5.length = 0; log5.push(...pinned, ...rest.slice(0, Math.max(0, 5 - pinned.length)));
  }

  // ---------------- bridge events
  const NCOLOR = { comment: '#4DD8FF', blocked: '#FF4D4D', unblocked: '#3DFF7A', api_key_added: '#FFD24D', task_assigned: '#FFFFFF' };
  bus.addEventListener('bridge', ({ detail: ev }) => {
    switch (ev.event) {
      case 'snapshot':
        for (const a of ev.agents ?? []) {
          reg.set(a.id, { ...reg.get(a.id), ...a });
        }
        break;
      case 'card.comment':
        pushLog({ agent: cardOwner(ev.cardId), color: NCOLOR[ev.type] ?? NCOLOR.comment, text: ev.comment, ts: ev.ts }); break;
      case 'card.blocked': {
        const o = cardOwner(ev.cardId); const a = reg.get(o);
        if (a) { a.reason = ev.reason; a.blockedSince = ev.ts; }
        pushLog({ agent: o, color: NCOLOR.blocked, text: ev.reason ?? 'blocked', ts: ev.ts }); break;
      }
      case 'card.unblocked': pushLog({ agent: cardOwner(ev.cardId), color: NCOLOR.unblocked, text: 'unblocked', ts: ev.ts }); break;
      case 'agent.paused': setRuntime(ev.agentId, 'paused'); pushLog({ agent: ev.agentId, color: '#FFB02E', text: ev.cascadedFrom ? `paused ⛓ ${ev.cascadedFrom}` : 'paused', ts: ev.ts }); break;
      case 'agent.resumed': setRuntime(ev.agentId, 'ok'); pushLog({ agent: ev.agentId, color: '#3DFF7A', text: 'resumed', ts: ev.ts }); break;
      case 'agent.killed': setRuntime(ev.agentId, 'killed'); pushLog({ agent: ev.agentId, color: '#FF4D4D', text: `killed by ${ev.by}`, ts: ev.ts }); break;
      case 'agent.down': setRuntime(ev.agentId, 'down'); pushLog({ agent: ev.agentId, color: '#FF4D4D', text: `gateway down (${ev.heartbeatAge}s)`, ts: ev.ts }); break;
      case 'agent.recovered': setRuntime(ev.agentId, 'ok'); pushLog({ agent: ev.agentId, color: '#3DFF7A', text: 'recovered', ts: ev.ts }); break;
      case 'agent.fallback': { const a = reg.get(ev.agentId); if (a) a.fallbackActive = true; pushLog({ agent: ev.agentId, color: '#FFB02E', text: `fallback → ${ev.to}`, ts: ev.ts }); break; }
      case 'agent.fallback_cleared': { const a = reg.get(ev.agentId); if (a) a.fallbackActive = false; break; }
      case 'system.announcement':
        pushLog({ agent: null, priority: ev.priority, pinned: ev.priority === 'alert',
                  color: ev.priority === 'normal' ? '#FFE32C' : '#FF4D4D', text: ev.message, ts: ev.ts });
        break;
    }
    expandPulse(); dirty();
  });
  function setRuntime(id, rt) { const a = reg.get(id) ?? reg.set(id, { id, name: id }).get(id); a.runtime = rt; }
  function cardOwner(cardId) { return sim.byCard.get(cardId)?.name ?? null; }

  bus.addEventListener('follow', ({ detail }) => {
    for (const [id, { el }] of cards) el.classList.toggle('following', detail === id);
  });

  // ---------------- usage polling (§9.3, 30s)
  async function poll() {
    try {
      if (demo()) return;                          // demo pushes via demo-usage
      const [u, m] = await Promise.all([
        fetch('/agents/usage').then(r => r.json()),
        window.__mapping ? null : fetch('/mapping.json').then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (m) { window.__mapping = m; budgets = m.budgets ?? budgets; }
      for (const rec of u) usage.set(rec.agentId, rec);
      dirty();
    } catch { /* adapter offline */ }
  }
  poll(); setInterval(poll, 30000);
  bus.addEventListener('demo-usage', ({ detail }) => { for (const r of detail) usage.set(r.agentId, r); dirty(); });
  bus.addEventListener('demo-cmd', ({ detail }) => bus.dispatchEvent(new CustomEvent('bridge', { detail })));
  bus.addEventListener('demo-mapping', ({ detail }) => { window.__mapping = detail; budgets = detail.budgets ?? budgets; });

  dirty();
}
