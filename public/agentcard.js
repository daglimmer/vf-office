// SPEC-2026-043 — agent drill-down card. Click a puppet in the 3D scene:
// portrait, name, role, current card(s), "Open in Control Room".

let card = null;

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MODE_COLOR = {
  working: '#4bc98b', stale: '#e0a341', blocked: '#ff8a5c',
  idle: '#a79fb8', offline: '#6e6878',
};
const MODE_LABEL = {
  working: 'working', stale: 'unresponsive', blocked: 'waiting for Ray',
  idle: 'idle', offline: 'offline',
};

export function hideAgentCard() {
  if (card) { card.remove(); card = null; }
}

export function showAgentCard(agent, x, y) {
  hideAgentCard();
  const spec = agent.spec ?? {};
  const mode = agent.mode ?? 'idle';
  const cards = agent.currentCards ?? [];
  const primary = cards[0] ?? null;
  const href = primary ? `/hq/#card=${encodeURIComponent(primary.id)}` : '/hq/';

  card = document.createElement('div');
  card.id = 'agent-card';
  card.className = 'agent-detail';
  card.innerHTML = `
    <div class="ad-head">
      <img class="ad-portrait" src="/hq/avatars/${esc(spec.id)}.jpg" alt="" onerror="this.style.visibility='hidden'"/>
      <div class="ad-id">
        <b>${esc(agent.name)}</b>
        <span class="ad-sub">${esc(spec.group ?? '')} team</span>
        <span class="ad-status"><i class="dot" style="background:${MODE_COLOR[mode]}"></i>${MODE_LABEL[mode]}</span>
      </div>
      <button class="pp-close" title="close">&#10005;</button>
    </div>
    <div class="ad-body">
      ${cards.length ? cards.map(c => `
        <div class="ad-cardrow">
          <i class="dot" style="background:${c.status === 'blocked' ? '#ff8a5c' : '#4bc98b'}"></i>
          <span>${esc(c.title ?? c.id)}</span>
        </div>`).join('')
        : '<div class="ad-cardrow muted">no active card</div>'}
      <a class="ad-open" href="${href}">Open in Control Room</a>
    </div>`;
  document.body.appendChild(card);
  card.querySelector('.pp-close').onclick = hideAgentCard;

  const W = 300, H = 220;
  card.style.left = Math.min(x + 14, innerWidth - W - 12) + 'px';
  card.style.top = Math.min(y - 10, innerHeight - H - 12) + 'px';
}
