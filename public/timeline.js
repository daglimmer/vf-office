// Phase 4 — VF #3: timeline bar (next 12h: cron, maintenance, balance checks).
// Data: GET /timeline (adapter). Click pill -> fly to owner agent's room.

const KIND_COLOR = { cron: '#4DD8FF', maintenance: '#FF9E2C', balance: '#FFE32C', reminder: '#9B30FF' };

export function initTimeline({ sim, demo }) {
  const bar = document.getElementById('timeline');

  function render(items) {
    const now = Date.now() / 1000, horizon = now + 12 * 3600;
    const vis = items.filter(i => i.ts >= now - 60 && i.ts <= horizon).sort((a, b) => a.ts - b.ts);
    bar.innerHTML = '<span class="tl-label">next 12h</span>';
    for (const it of vis) {
      const pill = document.createElement('button');
      pill.className = 'pill';
      pill.style.borderColor = KIND_COLOR[it.kind] ?? '#8A8F98';
      const mins = Math.round((it.ts - now) / 60);
      const when = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}`;
      pill.innerHTML = `<i style="background:${KIND_COLOR[it.kind] ?? '#8A8F98'}"></i>${it.label}<em>+${when}</em>`;
      pill.title = `${it.kind}${it.owner ? ' · ' + it.owner : ''}`;
      pill.onclick = () => { if (it.owner) sim.flyToAgent(it.owner); };
      bar.appendChild(pill);
    }
    if (!vis.length) bar.insertAdjacentHTML('beforeend', '<span class="tl-empty">nothing scheduled</span>');
  }

  async function poll() {
    try {
      if (demo()) { render(window.__demoTimeline ?? []); return; }
      const r = await fetch('/timeline');
      if (r.ok) { render(await r.json()); return; }
      offline(`/timeline -> HTTP ${r.status}`);
    } catch { offline('/timeline unreachable'); }
  }
  function offline(why) {                  // 9.6: say it, don't blank it
    bar.innerHTML = `<span class="tl-label">next 12h</span>
      <span class="tl-empty">timeline offline (${why}) — is the adapter routed?</span>`;
  }
  poll();
  setInterval(poll, 60000);
}
