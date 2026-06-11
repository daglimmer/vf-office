// Phase 8 - humanoid avatars. Stylized mannequins (between cartoon and
// realistic): jointed hips/knees/shoulders so agents SIT properly (fold, never
// tip over), walk with a natural gait + arm swing, and fade in/out instead of
// popping from the floor. ~700 tris each.
//
// Role look (spec): command=gold, coo=blue-white, devops=green,
// specialist=teal, sentinel=orange - applied as clothing tint + glowing trim,
// not a neon blob. Status is the small light hovering above the head.
import * as THREE from 'three';

export const ROLE_STYLE = {
  command:    { trim: '#FFD24D', cloth: 0x2a2622, tall: 1.08 },   // dark suit, gold trim
  coo:        { trim: '#9adcff', cloth: 0x2b3138, tall: 1.04 },
  devops:     { trim: '#3DFF7A', cloth: 0x22302a, tall: 1.0 },    // hoodie-ish green
  specialist: { trim: '#4DD8FF', cloth: 0x243038, tall: 0.98 },
  sentinel:   { trim: '#FF9E2C', cloth: 0x332a22, tall: 1.0 },
};
const SKIN = 0xd9c6b0;

// Phase 8b: capsules instead of tubes - smooth, organic limbs
const cyl = (r1, r2, h, m, seg = 8) => {
  const r = Math.max(r1, r2) * 0.92;
  return new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.02, h - r * 1.6), 3, Math.max(8, seg)), m);
};

export function buildHumanoid(accentHex, role = 'specialist', scale = 1) {
  const st = ROLE_STYLE[role] ?? ROLE_STYLE.specialist;
  const accent = new THREE.Color(accentHex ?? st.trim);
  const clothMat = new THREE.MeshStandardMaterial({ color: st.cloth, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.6 });
  const trimC = new THREE.Color(st.trim);
  const tint = new THREE.MeshStandardMaterial({ color: trimC, emissive: trimC, emissiveIntensity: 0.7 });
  const accMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.6 });
  const statusC = new THREE.Color('#FF9E2C');
  const statusMat = new THREE.MeshStandardMaterial({ color: statusC, emissive: statusC, emissiveIntensity: 1.4 });

  const root = new THREE.Group();
  const parts = {};
  const S = st.tall * scale;
  const shadowify = m => { m.castShadow = true; m.receiveShadow = false; return m; };

  // hips pivot - everything hangs off this so sitting = lower hips + fold legs
  const hips = new THREE.Group(); hips.position.y = 0.92 * S; root.add(hips);
  parts.hips = hips;

  const torso = cyl(0.115 * S, 0.16 * S, 0.52 * S, clothMat, 10);
  torso.position.y = 0.30 * S;
  const torsoG = new THREE.Group(); torsoG.add(torso); hips.add(torsoG);
  parts.torso = torsoG;
  // shoulders (suit silhouette for command) + role trim collar + accent chest dot
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.34 * S, 0.09 * S, 0.16 * S), clothMat);
  shoulders.position.y = 0.55 * S; torsoG.add(shoulders);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.105 * S, 0.018 * S, 8, 18), tint);
  collar.rotation.x = Math.PI / 2; collar.position.y = 0.585 * S; torsoG.add(collar);
  const badge = new THREE.Mesh(new THREE.SphereGeometry(0.028 * S, 8, 6), accMat);
  badge.position.set(0.06 * S, 0.46 * S, 0.13 * S); torsoG.add(badge);

  // head on the torso (notifications attach to parts.head)
  const headG = new THREE.Group(); headG.position.y = 0.72 * S; torsoG.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115 * S, 14, 10), skinMat);
  head.scale.y = 1.12; headG.add(head);
  for (const sx of [-1, 1]) {                                  // simple eyes
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014 * S, 6, 4),
      new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.3 }));
    eye.position.set(sx * 0.042 * S, 0.012 * S, 0.1 * S); headG.add(eye);
  }
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.118 * S, 12, 8,
    0, Math.PI * 2, 0, Math.PI * 0.55), clothMat);
  hair.position.y = 0.012 * S; hair.scale.y = 1.1; headG.add(hair);
  parts.head = headG;
  // status light hovering above the head
  const status = new THREE.Mesh(new THREE.SphereGeometry(0.035 * S, 8, 6), statusMat);
  status.position.y = 0.22 * S; headG.add(status);
  parts.status = status;

  // arms: shoulder pivot -> upper arm -> elbow pivot -> forearm + hand
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 0.19 * S, 0.53 * S, 0); torsoG.add(sh);
    const up = cyl(0.038 * S, 0.034 * S, 0.27 * S, clothMat); up.position.y = -0.135 * S; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.27 * S; sh.add(el);
    const fo = cyl(0.032 * S, 0.028 * S, 0.24 * S, clothMat); fo.position.y = -0.12 * S; el.add(fo);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.034 * S, 8, 6), skinMat);
    hand.position.y = -0.26 * S; el.add(hand);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.034 * S, 0.011 * S, 6, 12), tint);
    cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.2 * S; el.add(cuff);
    parts[sx < 0 ? 'armL' : 'armR'] = sh;
    parts[sx < 0 ? 'foreL' : 'foreR'] = el;
  }

  // legs: hip pivot -> thigh -> knee pivot -> shin + shoe
  for (const sx of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(sx * 0.085 * S, 0, 0); hips.add(hip);
    const th = cyl(0.052 * S, 0.046 * S, 0.42 * S, clothMat); th.position.y = -0.21 * S; hip.add(th);
    const knee = new THREE.Group(); knee.position.y = -0.42 * S; hip.add(knee);
    const sh = cyl(0.042 * S, 0.036 * S, 0.40 * S, clothMat); sh.position.y = -0.20 * S; knee.add(sh);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.085 * S, 0.05 * S, 0.17 * S),
      new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.5 }));
    shoe.position.set(0, -0.43 * S, 0.035 * S); knee.add(shoe);
    parts[sx < 0 ? 'legL' : 'legR'] = hip;
    parts[sx < 0 ? 'shinL' : 'shinR'] = knee;
  }

  // working particle ring at the feet (kept from Phase 5)
  const ring = new THREE.Group();
  const rm = new THREE.SpriteMaterial({ color: 0x3dff7a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Sprite(rm);
    const a = i / 10 * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.34, 0.05, Math.sin(a) * 0.34);
    s.scale.setScalar(0.05);
    ring.add(s);
  }
  ring.visible = false;
  root.add(ring);

  root.traverse(o => { if (o.isMesh && !o.material?.transparent) shadowify(o); });   // Phase 8b
  const materials = [clothMat, skinMat, tint, accMat, statusMat];
  return { root, parts, materials, tint, statusMat, ring, S };
}

const lerpTo = (o, axis, v, k) => { o.rotation[axis] += (v - o.rotation[axis]) * k; };

// Pose driver. `agent` is the main.js Agent (uses .pose, .t, .seated, .parts).
// aY = anchor floor height. Returns nothing; positions the group.
export function animateHumanoid(agent, aY, dt) {
  const p = agent.parts, t = agent.t, S = agent.avatarScale ?? 1;
  const k = Math.min((dt ?? 0.016) * 9, 1);                       // blend speed
  const seatedish = agent.pose === 'sit' || agent.pose === 'type' || agent.pose === 'talk'
    || (agent.pose === 'glance' && agent.seated) || (agent.pose === 'headdown' && agent.seated);
  let hipsY = 0.92 * S, thigh = 0, shin = 0, armX = 0, foreX = 0, lean = 0, headX = 0;
  let gait = 0, bob = 0, sway = 0, gesture = 0;

  switch (agent.pose) {
    case 'walk':
      gait = Math.sin(t * 7.5);
      bob = Math.abs(Math.cos(t * 7.5)) * 0.04;
      lean = 0.1;
      break;
    case 'sit': case 'type': case 'talk':
      hipsY = 0.46 * S; thigh = -Math.PI / 2 + 0.12; shin = Math.PI / 2 - 0.1;
      armX = -0.5; foreX = -0.5;
      if (agent.pose === 'type') { lean = 0.14; foreX = -0.85; gesture = Math.sin(t * 12) * 0.05; }
      if (agent.pose === 'talk') { headX = Math.sin(t * 3.5) * 0.08; gesture = Math.sin(t * 2.2) * 0.35; }
      break;
    case 'glance':
      headX = -0.4;
      if (agent.seated) { hipsY = 0.46 * S; thigh = -Math.PI / 2 + 0.12; shin = Math.PI / 2 - 0.1; armX = -0.5; foreX = -0.5; }
      break;
    case 'headdown':
      headX = 0.5; lean = 0.18;
      if (agent.seated) { hipsY = 0.46 * S; thigh = -Math.PI / 2 + 0.12; shin = Math.PI / 2 - 0.1; armX = -0.5; foreX = -0.6; }
      break;
    case 'collapsed':
      // downed agent lies flat - deliberate, unlike sitting
      agent.group.rotation.x = -Math.PI / 2;
      agent.group.position.y = aY + 0.25;
      return;
    default:                                                      // idle: weight shift
      sway = Math.sin(t * 1.6) * 0.03;
      bob = Math.sin(t * 1.6) * 0.012;
      gesture = Math.sin(t * 0.9) * 0.04;
  }
  agent.group.rotation.x = 0;

  p.hips.position.y += (hipsY - p.hips.position.y) * k;
  lerpTo(p.torso, 'x', lean, k);
  lerpTo(p.torso, 'z', sway, k);
  lerpTo(p.head, 'x', headX, k);
  lerpTo(p.legL, 'x', thigh + gait * 0.55, k);
  lerpTo(p.legR, 'x', thigh - gait * 0.55, k);
  lerpTo(p.shinL, 'x', shin + (agent.pose === 'walk' ? Math.max(0, -gait) * 0.7 : 0), k);
  lerpTo(p.shinR, 'x', shin + (agent.pose === 'walk' ? Math.max(0, gait) * 0.7 : 0), k);
  lerpTo(p.armL, 'x', armX - gait * 0.45 + gesture * 0.3, k);
  lerpTo(p.armR, 'x', armX + gait * 0.45 - gesture, k);
  lerpTo(p.foreL, 'x', foreX - Math.max(0, gait) * 0.3, k);
  lerpTo(p.foreR, 'x', foreX - Math.max(0, -gait) * 0.3 - Math.abs(gesture) * 0.5, k);

  if (agent.ring.visible) agent.ring.rotation.y = t * 1.5;
  agent.group.position.y = aY + bob + (seatedish ? 0 : 0);
}
