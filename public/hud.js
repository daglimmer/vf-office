// SPEC-2026-043 — HUD sidebar: team list (live from the board), studio palette,
// links back to Front Desk and Control Room. No buzz/mail/notifications.

const MODE_COLOR = {
  working: '#4bc98b', stale: '#e0a341', blocked: '#ff8a5c',
  idle: '#a79fb8', offline: '#6e6878',
};
const MODE_LABEL = {
  working: 'working', stale: 'unresponsive', blocked: 'waiting',
  idle: 'idle', offline: 'offline',
};

export function initHud({ sim, board }) {
  const root = document.getElementById('hud');
  root.innerHTML = `
    <div class="hud-nav">
      <a href="/">← Front Desk</a>
      <a href="/hq/">Control Room</a>
    </div>
    <div class="hud-stats">
      <div><b data-b="working">0</b><span>working</span></div>
      <div><b data-b="blocked" class="warn">0</b><span>waiting</span></div>
      <div><b data-b="idle">0</b><span>idle</span></div>
      <div><b data-b="offline" class="alert">0</b><span>offline</span></div>
    </div>
    <div class="hud-agents" data-b="agents"></div>`;
  const $ = s => root.querySelector(`[data-b="${s}"]`);
  const rows = new Map();

  function ensureRow(a) {
    if (rows.has(a.agentId)) return rows.get(a.agentId);
    const el = document.createElement('div');
    el.className = 'agent-card';
    el.innerHTML = `
      <div class="row head">
        <i class="dot"></i>
        <img class="hud-face" src="/hq/avatars/${a.agentId}.jpg" alt="" onerror="this.style.display='none'"/>
        <span class="name"></span>
        <span class="badge state"></span>
      </div>
      <div class="ctx"></div>`;
    el.onclick = () => sim.flyToAgent(a.agentId);
    $('agents').appendChild(el);
    const row = {
      el,
      dot: el.querySelector('.dot'),
      name: el.querySelector('.name'),
      badge: el.querySelector('.state'),
      ctx: el.querySelector('.ctx'),
    };
    row.name.textContent = a.name;
    rows.set(a.agentId, row);
    return row;
  }

  function tick() {
    const counts = { working: 0, stale: 0, blocked: 0, idle: 0, offline: 0 };
    for (const a of sim.getAgents()) {
      const mode = a.mode ?? 'idle';
      counts[mode] = (counts[mode] ?? 0) + 1;
      const row = ensureRow(a);
      row.dot.style.background = MODE_COLOR[mode];
      row.badge.textContent = MODE_LABEL[mode];
      row.badge.style.color = MODE_COLOR[mode];
      const top = a.currentCards?.[0];
      row.ctx.textContent = top ? top.title ?? top.id : (a.gatewayUp === false ? 'gateway down' : a.spec.group);
      row.el.classList.toggle('blocked', mode === 'blocked');
      row.el.classList.toggle('offline', mode === 'offline');
      row.el.classList.toggle('following', sim.followed === a);
    }
    $('working').textContent = counts.working + counts.stale;
    $('blocked').textContent = counts.blocked;
    $('idle').textContent = counts.idle;
    $('offline').textContent = counts.offline;
    root.classList.toggle('board-down', board && !board().ok);
  }
  setInterval(tick, 1000);
  tick();
}
