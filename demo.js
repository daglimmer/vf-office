// Phase 4 — demo mode: drives the full Mission Control experience with no
// adapter. Activated automatically when the WebSocket cannot connect.

const AGENTS = [
  { id: 'ollie', name: 'Ollie', color: '#4DD8FF' },
  { id: 'ceo', name: 'CEO', color: '#FFD24D' },
  { id: 'storekeeper', name: 'Storekeeper', color: '#2E5BFF' },
  { id: 'store-nas', name: 'Store NAS', color: '#2E5BFF', parent: 'storekeeper' },
  { id: 'store-pbs', name: 'Store PBS', color: '#2E5BFF', parent: 'storekeeper' },
  { id: 'store-zfs', name: 'Store ZFS', color: '#2E5BFF', parent: 'storekeeper' },
  { id: 'deploybot', name: 'Deploybot', color: '#9B30FF' },
  { id: 'deploy-build', name: 'Deploy Build', color: '#9B30FF', parent: 'deploybot' },
  { id: 'vm-301', name: 'VM 301', color: '#8A8F98', type: 'infrastructure' },
  { id: 'thermic', name: 'Thermic', color: '#8A8F98', type: 'infrastructure' },
  { id: 'cloudnode-01', name: 'cloudnode-01', color: '#8A8F98', type: 'infrastructure' },
];
const MAPPING = {
  models: {
    'deepseek-v4-flash': { display: 'Flash', color: '#4DD8FF' },
    'deepseek-v4-pro': { display: 'Pro', color: '#FFD24D' },
    'deepseek-free': { display: 'Free', color: '#3DFF7A' },
    'claude-fable-5': { display: 'Fable5', color: '#9B30FF' },
  },
  budgets: { soft: 5, hard: 20 },
};

export function runDemo(inject) {
  const now = () => Math.floor(Date.now() / 1000);
  window.__agentsCfg = AGENTS;

  import('./main.js').then(m => {
    m.bus.dispatchEvent(new CustomEvent('demo-mapping', { detail: MAPPING }));

    // snapshot
    inject({ event: 'snapshot', ts: now(), agents: AGENTS.map(a => ({ ...a, runtime: 'ok', fallbackActive: false })), cards: [] });

    // 2026-08-29 (t_c369e5e0): timeline fixtures removed with the ticker (fiction).

    // synthetic usage every 5s
    let tok = { storekeeper: 9000, 'store-nas': 2200, 'store-pbs': 1500, 'store-zfs': 800, deploybot: 5100, 'deploy-build': 600 };
    let down = false;
    setInterval(() => {
      const recs = [];
      for (const a of AGENTS) {
        const isInfra = a.type === 'infrastructure';
        if (a.id === 'thermic' && down) continue;     // gateway-down demo
        if (tok[a.id] != null) tok[a.id] += Math.floor(Math.random() * 220);
        recs.push({
          agentId: a.id,
          tokens: tok[a.id] ?? null,
          costUsd: tok[a.id] != null ? +(tok[a.id] / 1000 * 0.0006).toFixed(3) : null,
          modelName: isInfra ? null : a.id === 'deploybot' ? 'deepseek-v4-pro' : 'deepseek-v4-flash',
          cacheHitRate: isInfra ? null : a.id === 'store-zfs' ? 0.31 : a.id === 'store-pbs' ? 0.62 : 0.88,
          fallbackActive: false, fallbackModel: null,
          heartbeatAge: a.id === 'thermic' && down ? 75 : Math.floor(Math.random() * 12),
          windowStart: t0,
        });
      }
      m.bus.dispatchEvent(new CustomEvent('demo-usage', { detail: recs }));
    }, 5000);

    // card lifecycle loop
    let n = 0;
    function card() {
      n++;
      const id = `DEMO-${String(n).padStart(3, '0')}`;
      const assignee = ['storekeeper', 'deploybot', 'store-nas'][n % 3];
      inject({ event: 'card.created', cardId: id, title: 'Demo task', assignee, ts: now() });
      setTimeout(() => inject({ event: 'card.moved', cardId: id, from: 'backlog', to: 'todo', ts: now() }), 4000);
      setTimeout(() => inject({ event: 'card.moved', cardId: id, from: 'todo', to: 'in_progress', ts: now() }), 45000);
      setTimeout(() => inject({                       // comment while working
        event: 'card.comment', cardId: id, author: 'Ray',
        comment: 'API key added to Bitwarden — check there', type: 'api_key_added', ts: now(),
      }), 60000);
      setTimeout(() => inject({ event: 'card.moved', cardId: id, from: 'in_progress', to: 'review', ts: now() }), 80000);
    }
    card();
    setInterval(card, 95000);

    // 2026-08-29 (t_c369e5e0): removed the 'Config drift lint' demo announcement.
    setTimeout(() => inject({ event: 'system.announcement', message: 'DeepSeek balance below $5 — top up needed', priority: 'high', ts: now() }), 70000);
    setTimeout(() => inject({ event: 'system.announcement', message: 'SECURITY: anomalous login pattern on cloudnode-01', priority: 'alert', ts: now() }), 130000);

    // model fallback flash
    setTimeout(() => inject({ event: 'agent.fallback', agentId: 'deploybot', from: 'deepseek-v4-pro', to: 'deepseek-v4-flash', ts: now() }), 50000);
    setTimeout(() => inject({ event: 'agent.fallback_cleared', agentId: 'deploybot', ts: now() }), 110000);

    // gateway down -> announcement -> recovery
    setTimeout(() => {
      down = true;
      inject({ event: 'agent.down', agentId: 'thermic', heartbeatAge: 61, ts: now() });
      inject({ event: 'system.announcement', message: 'Thermic gateway unresponsive — investigating', priority: 'normal', ts: now() });
    }, 90000);
    setTimeout(() => {
      down = false;
      inject({ event: 'agent.recovered', agentId: 'thermic', downtime: 60, ts: now() });
    }, 150000);
  });
}
