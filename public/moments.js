// Phase 9 - EVENT MOMENTS. The office reacts to what actually happens:
//  - high/alert announcement or budget breach -> control room pulses amber/red
//  - a backup starts running -> StoreKeeper walks over to the DC to watch it
//  - an agent gateway goes down -> that room's light flickers (+ red glow)
//  - a card gets blocked -> short red flash at the agent
import * as THREE from 'three';

let sim = null, scene = null;
const fx = [];                        // {light, t, dur, kind, baseI}

function pulse(x, y, z, color, dur = 8, intensity = 5, dist = 9) {
  const l = new THREE.PointLight(color, 0, dist, 1.8);
  l.position.set(x, y, z);
  scene.add(l);
  fx.push({ light: l, t: 0, dur, baseI: intensity });
}

export function initMoments({ bus, sim: simRef }) {
  sim = simRef; scene = sim.scene;
  const roomCenter = r => sim.rooms[r]?.center ?? [20, 0, 8.5];

  bus.addEventListener('bridge', ({ detail: ev }) => {
    switch (ev.event) {
      case 'system.announcement': {
        if (ev.priority === 'high' || ev.priority === 'alert') {
          const [x, , z] = roomCenter('control');
          pulse(x, 2.3, z, ev.priority === 'alert' ? 0xff3030 : 0xffa733, 10, 6, 12);
        }
        if (/backup/i.test(ev.message ?? '')) storekeeperToDC();
        break;
      }
      case 'agent.down': {
        const a = sim.byId.get(ev.agentId) ?? sim.getAgents().find(v => v.name === ev.agentId);
        if (a) {
          const p = a.group.position;
          pulse(p.x, 2.0, p.z, 0xff4040, 7, 4, 7);
          const [x, , z] = roomCenter(a.room());
          pulse(x, 2.4, z, 0xffffff, 4, -1, 10);          // negative = flicker mode
        }
        break;
      }
      case 'card.blocked': {
        const a = sim.byCard.get(ev.cardId);
        if (a) { const p = a.group.position; pulse(p.x, 1.6, p.z, 0xff4d4d, 4, 3.5, 5); }
        break;
      }
    }
  });

  // backup watcher: when StoreKeeper's report shows something running, send him
  let lastRunning = new Set();
  async function checkBackups() {
    try {
      const d = await fetch('/api/backups').then(r => { if (!r.ok) throw 0; return r.json(); });
      const running = new Set((d.systems ?? []).filter(s => s.status === 'running').map(s => s.name));
      for (const name of running) if (!lastRunning.has(name)) { storekeeperToDC(); break; }
      lastRunning = running;
    } catch { /* adapter away */ }
  }
  setInterval(checkBackups, 5 * 60 * 1000);
  setTimeout(checkBackups, 20000);
}

let skBusy = false;
function storekeeperToDC() {
  const sk = sim.byId.get('storekeeper');
  if (!sk || skBusy || sk.blocked || sk.overlay !== 'ok' || sk.heldSlot || sk.cardId) return;
  skBusy = true;
  const wasGhost = sk.ghosted;
  sk.setGhost?.(false);
  const back = sk.group.position.clone();
  sk.label.userData.draw('#4DD8FF', 'backup check');
  sk.goto('nav_door_dc', () => {
    sk.pose = 'glance';
    const p = sim.anchors.get('nav_door_dc').pos;
    pulse(p.x, 1.8, p.z + 1.5, 0x4dd8ff, 6, 2.5, 6);
    setTimeout(() => {
      sk.gotoPoint(back, () => {
        sk.pose = 'idle';
        sk.label.userData.draw(null);
        if (wasGhost) sk.setGhost?.(true);
        skBusy = false;
      });
    }, 15000);
  });
  setTimeout(() => { skBusy = false; }, 90000);            // failsafe release
}

export function updateMoments(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i];
    f.t += dt;
    const k = f.t / f.dur;
    if (k >= 1) { scene.remove(f.light); fx.splice(i, 1); continue; }
    if (f.baseI < 0) {                                     // flicker (gateway down)
      f.light.intensity = Math.random() < 0.4 ? 2.2 * (1 - k) : 0.15;
    } else {                                               // pulse with decay
      f.light.intensity = f.baseI * (0.55 + 0.45 * Math.sin(f.t * 7)) * (1 - k);
    }
  }
}
