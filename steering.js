// Phase 4 — Agent Steering Controls (Spec §10)
// pause/resume/kill buttons with in-flight guard + 2-click kill confirmation.

async function post(path) {
  const r = await fetch(path, { method: 'POST' });
  return r.status;
}

export function attachSteering(row, agentId, { demo, bus }) {
  const wrap = document.createElement('span');
  wrap.className = 'steer';

  const pauseBtn = document.createElement('button');
  pauseBtn.className = 'icon pause'; pauseBtn.title = 'pause';
  pauseBtn.textContent = '⏸';
  const killBtn = document.createElement('button');
  killBtn.className = 'icon kill'; killBtn.title = 'kill';
  killBtn.textContent = '✕';

  let paused = false, armed = null;

  function guard(btn) {                          // 5s in-flight guard (§10.1)
    btn.disabled = true;
    setTimeout(() => { btn.disabled = false; }, 5000);
  }
  async function send(action) {
    if (demo()) {                                // demo: emit locally with cascade (§7.2)
      const evmap = { pause: 'agent.paused', resume: 'agent.resumed', kill: 'agent.killed' };
      const kids = action !== 'resume' ? (window.__agentsCfg ?? []).filter(a => a.parent === agentId).map(a => a.id) : [];
      const targets = action === 'kill' ? [...kids, agentId] : [agentId, ...kids];
      for (const t of targets) {
        const ev = { event: evmap[action], agentId: t, by: 'you', ts: Math.floor(Date.now() / 1000) };
        if (t !== agentId) ev.cascadedFrom = agentId;
        window.__inject(ev);
      }
      return 200;
    }
    return post(`/agents/${agentId}/${action}`);
  }

  pauseBtn.onclick = async e => {
    e.stopPropagation(); guard(pauseBtn);
    await send(paused ? 'resume' : 'pause');
  };

  function disarm() {
    if (!armed) return;
    clearTimeout(armed.timer); cancelAnimationFrame(armed.raf);
    killBtn.classList.remove('armed'); killBtn.style.removeProperty('--k');
    armed = null;
  }
  killBtn.onclick = async e => {
    e.stopPropagation();
    if (!armed) {                                // arm: 3s countdown ring (§10.2)
      const t0 = performance.now();
      killBtn.classList.add('armed');
      row.classList.add('arming');
      const tick = () => {
        const k = Math.min((performance.now() - t0) / 3000, 1);
        killBtn.style.setProperty('--k', `${(1 - k) * 360}deg`);
        if (armed) armed.raf = requestAnimationFrame(tick);
      };
      armed = { timer: setTimeout(() => { row.classList.remove('arming'); disarm(); }, 3000), raf: 0 };
      tick();
      return;
    }
    row.classList.remove('arming');
    disarm(); guard(killBtn);
    await send('kill');
  };
  // any other click disarms (capture phase, §10.2)
  document.addEventListener('click', e => {
    if (armed && e.target !== killBtn) { row.classList.remove('arming'); disarm(); }
  }, true);

  // reflect runtime state pushed by the HUD
  wrap.update = runtime => {
    paused = runtime === 'paused';
    pauseBtn.textContent = paused ? '▶' : '⏸';
    pauseBtn.title = paused ? 'resume' : 'pause';
    const dead = runtime === 'killed';
    pauseBtn.style.display = dead ? 'none' : '';
    killBtn.style.display = dead ? 'none' : '';
  };

  wrap.append(pauseBtn, killBtn);
  return wrap;
}
