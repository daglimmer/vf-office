// Phase 4 — Agent Notification System (Spec §7.1) + announcements (§11.3).
// Parallel interrupt channel: never changes lifecycle state.
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const TYPE_COLOR = {
  comment: '#4DD8FF', blocked: '#FF4D4D', unblocked: '#3DFF7A',
  api_key_added: '#FFD24D', task_assigned: '#FFFFFF',
};
const PRI = {
  normal: { color: '#FFE32C', pulses: 3, pause: 0, panel: 8 },
  high: { color: '#FF4D4D', pulses: 3, pause: 3, panel: 12 },
  alert: { color: '#FF4D4D', pulses: 6, pause: 5, panel: 20 },
};

export function initNotifications({ bus, sim, THREE, scene, byCard, byId, anchors, rooms, agents }) {

  // ---------------- visuals
  function pingSphere(color, scale = 1) {
    return new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 12, 10),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
  }
  function envelopeSprite(color, isKey) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 32;
    const x = cv.getContext('2d');
    x.strokeStyle = '#fff'; x.lineWidth = 2;
    if (isKey) { x.beginPath(); x.arc(11, 16, 5, 0, 7); x.moveTo(16, 16); x.lineTo(28, 16); x.lineTo(28, 21); x.moveTo(23, 16); x.lineTo(23, 20); x.stroke(); }
    else { x.strokeRect(4, 8, 24, 16); x.beginPath(); x.moveTo(4, 8); x.lineTo(16, 18); x.lineTo(28, 8); x.stroke(); }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), color, depthTest: false, transparent: true }));
    sp.scale.setScalar(0.22);
    return sp;
  }
  function textPanel(author, text, color) {
    const el = document.createElement('div');
    el.className = 'note-panel';
    el.style.borderTopColor = color;
    el.innerHTML = `<b></b><span></span>`;
    el.querySelector('b').textContent = author ?? '';
    el.querySelector('span').textContent = text ?? '';
    return new CSS2DObject(el);
  }

  // ---------------- per-agent queues (§7.1 queueing)
  const queues = new Map();        // Agent -> {items:[], busy, envelope}
  function q(agent) {
    if (!queues.has(agent)) queues.set(agent, { items: [], busy: false, env: null });
    return queues.get(agent);
  }

  function notifyAgent(agent, { type = 'comment', author, text }) {
    const Q = q(agent);
    Q.items.push({ type, author, text });
    if (!Q.busy) drain(agent);
    else updateBadge(agent);
  }

  function updateBadge(agent) {
    const Q = q(agent);
    if (Q.env && Q.items.length > 0) {
      Q.env.material.opacity = 1;
      // count badge: redraw via scale pulse (cheap)
      Q.env.scale.setScalar(0.22 + Math.min(Q.items.length, 4) * 0.025);
    }
  }

  function drain(agent) {
    const Q = q(agent);
    const item = Q.items.shift();
    if (!item) { Q.busy = false; return; }
    Q.busy = true;
    const color = TYPE_COLOR[item.type] ?? TYPE_COLOR.comment;

    // overlay-suppressed agents queue silently (§7.2)
    if (agent.overlay !== 'ok') { Q.items.unshift(item); Q.busy = false; return; }

    // ping: 3 pulses over 1.5s, attached above head
    const ping = pingSphere(color);
    agent.parts.head.add(ping); ping.position.y = 0.45;
    const t0 = performance.now();
    const pulse = () => {
      const t = (performance.now() - t0) / 1500;
      if (t >= 1 || !ping.parent) { ping.parent?.remove(ping); openEnvelope(); return; }
      const k = (t * 3) % 1;
      ping.scale.setScalar(Math.max(0.01, Math.sin(k * Math.PI) * 1.5));
      requestAnimationFrame(pulse);
    };
    requestAnimationFrame(pulse);

    function openEnvelope() {
      const env = envelopeSprite(color, item.type === 'api_key_added');
      agent.parts.head.add(env); env.position.y = 0.4;
      Q.env = env; updateBadge(agent);

      // per-state behavior (§7.1)
      const st = agent.state ?? 'idle';
      let readFor = 10;
      const read = () => {
        const panel = textPanel(item.author, item.text, color);
        panel.position.set(0, 1.7, 0);
        agent.group.add(panel);
        setTimeout(() => {
          agent.group.remove(panel); panel.element.remove();
          agent.parts.head.remove(env); Q.env = null;
          if (agent.pose === 'glance') agent.pose = agent.seated ? (st === 'working' ? 'type' : st === 'briefing' || st === 'debrief' ? 'talk' : 'sit') : 'idle';
          drain(agent);
        }, readFor * 1000);
      };
      if (st === 'idle' || st === 'spawning') {
        readFor = 15;   // idle: walk to a desk, sit, read (§7.1)
        agent.acquire('work', s => { agent.hold('work', s); agent.goto(s, () => { agent.sitAt(s, 'glance'); read(); }); });
      } else if (st === 'working') {
        readFor = 15; agent.pose = 'glance'; read();
      } else if (agent.path.length) {
        // walking: open on arrival
        const prev = agent.onArrive;
        agent.onArrive = () => { prev?.(); agent.pose = 'glance'; read(); };
      } else {
        readFor = 10; agent.pose = 'glance'; read();
      }
    }
  }

  // ---------------- system announcements (§11.3 / §7.1)
  let announceEl = null;
  function announce(message, priority = 'normal') {
    const P = PRI[priority] ?? PRI.normal;
    // room-wide pings at every announce_* anchor
    for (const [name, a] of anchors) {
      if (!name.startsWith('announce_')) continue;
      const ping = pingSphere(P.color, 3);
      ping.position.copy(a.pos); scene.add(ping);
      const t0 = performance.now(), dur = P.pulses * 500;
      const pulse = () => {
        const t = (performance.now() - t0) / dur;
        if (t >= 1) { scene.remove(ping); return; }
        const k = (t * P.pulses) % 1;
        ping.scale.setScalar(Math.max(0.01, Math.sin(k * Math.PI) * 1.5));
        requestAnimationFrame(pulse);
      };
      requestAnimationFrame(pulse);
    }
    // agents pause + head-up (high/alert); walking agents stop in place
    if (P.pause > 0) {
      const until = performance.now() + P.pause * 1000;
      for (const ag of agents) {
        if (ag.overlay !== 'ok') continue;
        ag.freezeUntil = until;
        const prevPose = ag.pose;
        ag.pose = 'glance';
        setTimeout(() => { if (ag.pose === 'glance') ag.pose = prevPose; }, P.pause * 1000);
      }
    }
    // screen-level banner panel
    announceEl?.remove();
    const el = document.createElement('div');
    el.className = `announce ${priority}`;
    el.textContent = message;
    document.body.appendChild(el); announceEl = el;
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, P.panel * 1000);
  }

  // ---------------- bridge wiring
  bus.addEventListener('bridge', ({ detail: ev }) => {
    if (ev.event === 'card.comment') {
      const a = byCard.get(ev.cardId);
      if (a) notifyAgent(a, { type: ev.type ?? 'comment', author: ev.author, text: ev.comment });
    }
    if (ev.event === 'card.blocked') {
      const a = byCard.get(ev.cardId);
      if (a) notifyAgent(a, { type: 'blocked', author: ev.by, text: ev.reason ?? 'blocked' });
    }
    if (ev.event === 'card.unblocked') {
      const a = byCard.get(ev.cardId);
      if (a) notifyAgent(a, { type: 'unblocked', author: ev.by, text: 'unblocked' });
    }
    if (ev.event === 'system.announcement') announce(ev.message, ev.priority ?? 'normal');
  });

  // ---------------- THE BUZZ — live agent-to-agent bus (Ray). Reuse the envelope→walk-to-read channel.
  // A message POSTed to an agent on olympus /api/messages pops an envelope over that agent's head; the
  // agent walks to a desk and "reads" it (same mechanism Kanban comments use). Broadcasts fan out as a
  // room-wide announcement. This is the VISIBLE layer; Marcus's webhook is the real wake layer (they pair).
  const KIND_TYPE = { alert: 'blocked', ask: 'task_assigned', inform: 'comment', broadcast: 'comment' };
  const BUZZ_ALIAS = { sage: 'k8slearn', ollie: 'oly', ceo: 'marcus', coo: 'oly' };
  const buzzSeen = new Set();
  let buzzPrimed = false;
  function buzzResolve(to) {
    if (!to) return null;
    const key = String(to).toLowerCase();
    const id = BUZZ_ALIAS[key] ?? key;
    if (byId?.get(id)) return byId.get(id);
    const flat = id.replace(/[^a-z0-9]/g, '');
    return agents.find(a => (a.agentId || '').toLowerCase() === id
      || (a.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(flat));
  }
  function buzzDeliver(m) {
    const to = String(m.to || '').toLowerCase();
    const author = m.from || 'agent';
    const text = m.subject || '(message)';
    if (to === 'all' || to === 'broadcast' || to === 'fleet') {
      announce(`${author}: ${text}`, m.kind === 'alert' ? 'alert' : 'normal');
      return;
    }
    const a = buzzResolve(to);                              // no office body for this recipient (e.g. ray/opus) → skip
    if (a) notifyAgent(a, { type: KIND_TYPE[m.kind] ?? 'comment', author, text });
  }
  async function pollBuzz() {
    try {
      const msgs = await fetch('/api/messages?limit=50').then(r => (r.ok ? r.json() : []));
      const list = Array.isArray(msgs) ? msgs : [];
      for (const m of list) {                               // newest-first; prime silently on first poll
        if (!m || !m.id) continue;
        if (buzzPrimed && !buzzSeen.has(m.id)) buzzDeliver(m);
        buzzSeen.add(m.id);
      }
      buzzPrimed = true;
      if (buzzSeen.size > 300) { buzzSeen.clear(); for (const m of list) if (m && m.id) buzzSeen.add(m.id); }
    } catch { /* buzz endpoint blip — keep polling */ }
    setTimeout(pollBuzz, 5000);
  }
  pollBuzz();
}
