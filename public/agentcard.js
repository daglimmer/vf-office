// Phase 7b - Agent drill-down card. Click a puppet in the 3D scene to open a
// floating glass card with live detail from the adapter (/api/agents/:id).
// Closes on Esc or clicking anywhere outside it. Degrades gracefully when the
// adapter is unreachable (shows local scene state only).

let card = null;

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ago = ts => {
  if (ts == null) return 'never';
  const s = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : `${Math.floor(s / 3600)}h ago`;
};
const STATUS_DOT = { online: '#3DFF7A', active: '#3DFF7A', idle: '#FF9E2C', offline: '#8A8F98', blocked: '#FF4D4D' };

export function hideAgentCard() {
  if (card) { card.remove(); card = null; }
}

export function showAgentCard(agent, x, y) {
  hideAgentCard();
  card = document.createElement('div');
  card.id = 'agent-card';
  card.className = 'agent-detail';
  const localStatus = agent.blocked ? 'blocked'
    : (agent.overlay === 'down' || agent.overlay === 'killed') ? 'offline'
    : agent.rosterStatus ?? (agent.state === 'working' ? 'active' : 'idle');
  card.innerHTML = `
    <div class="ad-head">
      <i class="dot" style="background:${STATUS_DOT[localStatus] ?? '#8A8F98'}"></i>
      <b>${esc(agent.name)}</b>
      <span class="ad-status">${esc(localStatus)}</span>
      <button class="pp-close" title="close">&#10005;</button>
    </div>
    <div class="ad-body"><div class="skel-wrap"><div class="skel"></div><div class="skel" style="width:70%"></div><div class="skel" style="width:55%"></div></div></div>`;
  document.body.appendChild(card);
  // clamp into the viewport, near the click
  const W = 280, H = 260;
  card.style.left = Math.min(x + 14, innerWidth - W - 12) + 'px';
  card.style.top = Math.min(y - 10, innerHeight - H - 12) + 'px';
  card.querySelector('.pp-close').onclick = hideAgentCard;
  fillDetail(agent);
}

async function fillDetail(agent) {
  const id = agent.agentId ?? agent.name;
  let d = null;
  try { d = await fetch('/api/agents/' + encodeURIComponent(id)).then(r => { if (!r.ok) throw 0; return r.json(); }); }
  catch { /* adapter offline or unknown agent */ }
  if (!card) return;
  const body = card.querySelector('.ad-body');
  if (!d || !d.ok) {
    body.innerHTML = `
      ${row('role', agent.role ?? '')}
      ${row('state', agent.state ?? 'idle')}
      ${agent.cardId ? row('card', agent.cardId) : ''}
      <div class="ad-offline">live detail unavailable &mdash; adapter offline</div>`;
    return;
  }
  const dot = card.querySelector('.ad-head .dot');
  dot.style.background = STATUS_DOT[d.status] ?? '#8A8F98';
  card.querySelector('.ad-status').textContent = d.status;
  const tasks = (d.tasks ?? []).map(t =>
    `<div class="ad-task"><em>${esc(t.cardId)}</em> ${esc(t.title)} <span>${esc(t.status)}</span></div>`).join('')
    || '<div class="ad-task ad-none">no recent tasks</div>';
  // Runtime controls (Section 7.2) — pause/resume + kill, wired to the adapter's
  // /agents/:id/(pause|resume|kill) endpoints. Resume shown when already paused.
  const rt = d.runtime ?? 'ok';
  const btn = (act, label, danger) =>
    `<button class="ad-ctl${danger ? ' ad-ctl-danger' : ''}" data-act="${act}"` +
    ` style="flex:1;padding:5px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.18);` +
    `background:${danger ? 'rgba(255,77,77,.15)' : 'rgba(255,255,255,.08)'};color:inherit;cursor:pointer;font-size:11px">${label}</button>`;
  const controls =
    `<div class="ad-controls" style="display:flex;gap:6px;margin-top:8px">` +
    (rt === 'paused' ? btn('resume', '&#9654; Resume', false) : btn('pause', '&#10073;&#10073; Pause', false)) +
    btn('kill', '&#9209; Kill', true) +
    `</div>`;
  body.innerHTML = `
    ${row('role', d.role ?? d.group)}
    ${row('group', d.group)}
    ${row('model', d.model ? esc(d.model) + (d.fallbackActive ? ' <i class="ad-fb">fallback</i>' : '') : '&mdash;', true)}
    ${row('provider', d.provider ?? '&mdash;', true)}
    ${row('sessions 24h', d.sessions24h)}
    ${row('tokens today', d.tokensToday != null ? d.tokensToday.toLocaleString() : '&mdash;', true)}
    ${row('cost', d.costUsd != null ? '$' + d.costUsd.toFixed(2) : '&mdash;', true)}
    ${row('last seen', ago(d.lastSeen), true)}
    ${controls}
    <div class="ad-tasks-head">recent tasks</div>${tasks}`;
  for (const b of body.querySelectorAll('.ad-ctl')) {
    b.onclick = async () => {
      const act = b.dataset.act;
      if (act === 'kill' && !confirm(`Kill ${agent.name}? This stops the agent (and its children).`)) return;
      b.disabled = true;
      try { await fetch('/agents/' + encodeURIComponent(id) + '/' + act, { method: 'POST' }); }
      catch { /* adapter unreachable — leave card as-is */ }
      fillDetail(agent); // refresh runtime state
    };
  }
}

function row(k, v, raw = false) {
  return `<div class="ad-row"><span>${k}</span><b>${raw ? v : esc(v)}</b></div>`;
}

// global close behavior
document.addEventListener('pointerdown', e => {
  if (card && !card.contains(e.target)) hideAgentCard();
}, true);
addEventListener('keydown', e => { if (e.code === 'Escape') hideAgentCard(); });
