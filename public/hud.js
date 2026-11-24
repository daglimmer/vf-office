// SPEC-2026-043 §10 — side panel "Team now" + the clicked-person card.
const MODE = {
  working: { label: 'Working', color: '#4bc98b' },
  stale: { label: 'Unresponsive', color: '#e0a341' },
  blocked: { label: 'Waiting for you', color: '#ff8a5c' },
  idle: { label: 'Idle', color: '#a79fb8' },
  offline: { label: 'Offline', color: '#6e6878' },
};
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function initHud({ agents, byId, onPick }) {
  const root = document.getElementById('panel');
  let selectedId = null;

  function row(a) {
    const m = MODE[a.mode === 'stale' ? 'working' : (a.mode ?? 'idle')] ?? MODE.idle;
    const top = a.currentCards?.[0];
    const sub = top ? (top.title ?? '') : (a.mode === 'offline' ? 'gateway down' : a.spec.role);
    return `
      <div class="prow" data-id="${a.agentId}">
        <img src="/hq/avatars/${a.agentId}.jpg" onerror="this.style.visibility='hidden'"/>
        <div class="pinfo">
          <div class="pname">${esc(a.name)}</div>
          <div class="psub">${esc(sub)}</div>
        </div>
        <span class="pill" style="color:${m.color};border-color:${m.color}55">${m.label}</span>
      </div>`;
  }

  function showTeam() {
    selectedId = null;
    const list = agents();
    const run = list.filter(a => a.spec.group === 'Run');
    const build = list.filter(a => a.spec.group === 'Build');
    root.innerHTML = `
      <h2>Team now</h2>
      <h3>Run</h3>
      ${run.map(row).join('')}
      <h3>Build</h3>
      ${build.map(row).join('')}`;
    root.querySelectorAll('.prow').forEach(el => {
      el.onclick = () => onPick(el.dataset.id);
    });
  }

  function showPerson(a) {
    if (!a) return showTeam();
    selectedId = a.agentId;
    const m = MODE[a.mode === 'stale' ? 'working' : (a.mode ?? 'idle')] ?? MODE.idle;
    const cards = a.currentCards ?? [];
    const primary = cards[0] ?? null;
    const ask = cards.find(c => c.status === 'blocked')?.ask;
    root.innerHTML = `
      <button class="back" id="p-back">← Team now</button>
      <div class="pcard">
        <img class="pface" src="/hq/avatars/${a.agentId}.jpg" onerror="this.style.visibility='hidden'"/>
        <div class="phead">
          <b>${esc(a.name)}</b>
          <span>${esc(a.spec.role === a.spec.group ? a.spec.group + ' team' : a.spec.role + ' · ' + a.spec.group + ' team')}</span>
          <span class="pill" style="color:${m.color};border-color:${m.color}55">${m.label}</span>
        </div>
      </div>
      <div class="pwork">
        ${cards.length ? cards.map(c => `
          <div class="pcardrow">
            <i style="background:${c.status === 'blocked' ? '#ff8a5c' : '#4bc98b'}"></i>
            <span>${esc(c.title ?? '')}</span>
          </div>`).join('')
          : `<div class="pcardrow muted">${a.mode === 'offline' ? 'gateway down' : 'no active card'}</div>`}
        ${ask ? `<div class="pask">${esc(String(ask).split('\n').find(l => l.trim())?.trim() ?? '')}</div>` : ''}
      </div>
      <a class="pbtn" href="${primary ? `/hq/#card=${encodeURIComponent(primary.id)}` : '/hq/'}">Open in Control Room</a>
      ${cards.some(c => c.status === 'blocked') ? `<a class="pbtn answer" href="/hq/#needs">Answer now</a>` : ''}`;
    document.getElementById('p-back').onclick = showTeam;
  }

  function refresh() {
    if (selectedId) showPerson(byId.get(selectedId));
    else showTeam();
  }

  showTeam();
  return { showTeam, showPerson, refresh };
}
