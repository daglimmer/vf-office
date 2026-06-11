// Phase 6 - Backups panel (HUD tab). Per-system status from the bridge
// adapter's /api/backups (StoreKeeper data), polled every 5 minutes while open.
// Graceful degradation: shows "waiting for..." if the source is down.

const POLL_MS = 5 * 60 * 1000;
const PILL = { success: 'bk-success', running: 'bk-running', failed: 'bk-failed' };
let root = null, timer = null, onCloseCb = null;

export function initBackups(opts = {}) {
  onCloseCb = opts.onClose ?? null;
  root = document.createElement('div');
  root.id = 'backups-panel';
  root.className = 'page-panel';
  root.style.display = 'none';
  root.innerHTML = `
    <div class="pp-head"><b>Backups</b><span class="pp-src"></span><button class="pp-close" title="close">&#10005;</button></div>
    <div class="pp-body"><div class="pp-wait">waiting for StoreKeeper report&hellip;</div></div>`;
  document.body.appendChild(root);
  root.querySelector('.pp-close').onclick = () => { toggleBackups(false); if (onCloseCb) onCloseCb(); };
  return { toggle: toggleBackups };
}

export function toggleBackups(on) {
  if (!root) return;
  root.style.display = on ? 'flex' : 'none';
  clearInterval(timer); timer = null;
  if (on) { refresh(); timer = setInterval(refresh, POLL_MS); }
}

async function refresh() {
  let data;
  try { data = await fetch('/api/backups').then(r => { if (!r.ok) throw 0; return r.json(); }); }
  catch { return renderWait('adapter unreachable &mdash; waiting&hellip;'); }
  if (!data.ok || !data.systems.length) return renderWait(data.error ?? 'waiting for StoreKeeper report&hellip;');
  render(data);
}

function renderWait(msg) {
  root.querySelector('.pp-body').innerHTML = `<div class="pp-wait">${msg}</div>`;
  root.querySelector('.pp-src').textContent = '';
}

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmtTs = ts => ts == null ? '&mdash;' : new Date(ts * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const ago = ts => {
  if (ts == null) return '';
  const s = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  return s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`;
};
const fmtDur = d => d == null ? '&mdash;' : d < 90 ? `${d}s` : `${Math.floor(d / 60)}m ${d % 60}s`;

function spark(runs) {
  const vals = runs.map(r => r.sizeGb ?? 0);
  if (!vals.length) return '<span class="bk-nosize">&mdash;</span>';
  const min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;
  const W = 64, H = 18, step = vals.length > 1 ? W / (vals.length - 1) : 0;
  const pt = i => `${(i * step).toFixed(1)},${(H - 3 - (vals[i] - min) / span * (H - 6)).toFixed(1)}`;
  const pts = vals.map((_, i) => pt(i)).join(' ');
  const lastFail = runs[runs.length - 1]?.status === 'failed';
  const [lx, ly] = pt(vals.length - 1).split(',');
  return `<svg class="bk-spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <polyline points="${pts}" fill="none" stroke="${lastFail ? '#FF4D4D' : '#4DD8FF'}" stroke-width="1.5"/>
    <circle cx="${lx}" cy="${ly}" r="2" fill="${lastFail ? '#FF4D4D' : '#3DFF7A'}"/></svg>
   <em class="bk-size">${vals[vals.length - 1]} GB</em>`;
}

function render(data) {
  root.querySelector('.pp-src').innerHTML =
    `source: ${esc(data.source ?? 'StoreKeeper')} &middot; generated ${ago(data.generated)}`;
  const rows = data.systems.map(s => {
    const failedRecent = s.status === 'failed' ||
      s.runs.some(r => r.status === 'failed' && r.ts != null && Date.now() / 1000 - r.ts < 72 * 3600);
    return `<tr class="${failedRecent ? 'bk-fail-row' : ''}">
      <td><b>${esc(s.name)}</b></td>
      <td><span class="bk-pill ${PILL[s.status] ?? 'bk-running'}">${esc(s.status)}</span></td>
      <td>${fmtTs(s.lastRun)} <em class="bk-ago">${ago(s.lastRun)}</em></td>
      <td>${fmtDur(s.durationSec)}</td>
      <td>${fmtTs(s.nextRun)}</td>
      <td>${spark(s.runs)}</td>
    </tr>`;
  }).join('');
  root.querySelector('.pp-body').innerHTML = `
    <table class="bk-grid">
      <thead><tr><th>system</th><th>status</th><th>last run</th><th>duration</th><th>next scheduled</th><th>size trend (5 runs)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}
