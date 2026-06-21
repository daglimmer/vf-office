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
// 8d: varied, warmer people - skin and hair picked per agent (stable by name)
const SKINS = [0xe8c39a, 0xd9a06b, 0xc08552, 0x9a6a44, 0xf0d5b8, 0x7d5235];
const HAIRS = [0x241a12, 0x3a2a18, 0x141414, 0x5a4630, 0x6e6862, 0x8a5a2e];
const hash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

// Phase 8b: capsules instead of tubes - smooth, organic limbs
// Pass F: more radial segments so limbs read sleek, not faceted.
const cyl = (r1, r2, h, m, seg = 12) => {
  const r = Math.max(r1, r2) * 0.92;
  return new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.02, h - r * 1.6), 4, Math.max(12, seg)), m);
};

export function buildHumanoid(accentHex, role = 'specialist', scale = 1, seedName = '') {
  const st = ROLE_STYLE[role] ?? ROLE_STYLE.specialist;
  const h = hash(seedName || accentHex || role);
  const accent = new THREE.Color(accentHex ?? st.trim);
  const clothMat = new THREE.MeshStandardMaterial({ color: st.cloth, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: SKINS[h % SKINS.length], roughness: 0.55 });
  const hairMat = new THREE.MeshStandardMaterial({ color: HAIRS[(h >> 3) % HAIRS.length], roughness: 0.85 });
  const trimC = new THREE.Color(st.trim);
  const tint = new THREE.MeshStandardMaterial({ color: trimC, emissive: trimC, emissiveIntensity: 0.7 });
  const accMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.6 });
  const statusC = new THREE.Color('#FF9E2C');
  const statusMat = new THREE.MeshStandardMaterial({ color: statusC, emissive: statusC, emissiveIntensity: 1.4 });
  // shared face/shoe materials - MUST be in `materials` so spawn/despawn fades
  // cover the whole body (loose shoes/eyes used to stay behind at the floor)
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.3 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x8a5a50, roughness: 0.6 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.5 });

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
  // Pass F: smooth rounded shoulder yoke (was a hard box)
  const shoulders = new THREE.Mesh(new THREE.CapsuleGeometry(0.078 * S, 0.19 * S, 4, 14), clothMat);
  shoulders.rotation.z = Math.PI / 2; shoulders.scale.z = 0.85; shoulders.position.y = 0.55 * S; torsoG.add(shoulders);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.105 * S, 0.018 * S, 8, 18), tint);
  collar.rotation.x = Math.PI / 2; collar.position.y = 0.585 * S; torsoG.add(collar);
  const badge = new THREE.Mesh(new THREE.SphereGeometry(0.028 * S, 8, 6), accMat);
  badge.position.set(0.06 * S, 0.46 * S, -0.13 * S); torsoG.add(badge);

  // head + neck (notifications attach to parts.head)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.038 * S, 0.045 * S, 0.07 * S, 8), skinMat);
  neck.position.y = 0.62 * S; torsoG.add(neck);
  const headG = new THREE.Group(); headG.position.y = 0.73 * S; torsoG.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.108 * S, 14, 10), skinMat);
  head.scale.y = 1.15; headG.add(head);
  for (const sx of [-1, 1]) {                                  // eyes
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.013 * S, 6, 4), eyeMat);
    eye.position.set(sx * 0.04 * S, 0.012 * S, -0.095 * S); headG.add(eye);   // 8f: forward is -z
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.035 * S, 0.008 * S, 0.01 * S), mouthMat);
  mouth.position.set(0, -0.045 * S, -0.102 * S); headG.add(mouth);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.112 * S, 12, 8,
    0, Math.PI * 2, 0, Math.PI * 0.58), hairMat);
  hair.position.y = 0.015 * S; hair.scale.y = 1.12; headG.add(hair);
  parts.head = headG;
  // status light - smaller, hovers a touch higher (8d)
  const status = new THREE.Mesh(new THREE.SphereGeometry(0.026 * S, 8, 6), statusMat);
  status.position.y = 0.24 * S; headG.add(status);
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
    // Pass F: rounded shoe (was a hard box); bottom kept at ~-0.455*S for the foot-plant
    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.042 * S, 0.1 * S, 4, 10), shoeMat);
    shoe.rotation.x = Math.PI / 2; shoe.scale.set(1.0, 1.0, 1.15);
    shoe.position.set(0, -0.415 * S, -0.05 * S); knee.add(shoe);
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
  const materials = [clothMat, skinMat, hairMat, tint, accMat, statusMat, eyeMat, mouthMat, shoeMat];
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
      lean = -0.1;                                          // 8f: lean INTO the walk
      break;
    // NOTE: model forward is -z; for limbs hanging down, POSITIVE x-rotation
    // swings the lower end forward. Seated legs fold forward (+thigh, -shin),
    // arms reach forward (+). Previous signs were +z-authored = backwards knees.
    case 'sit': case 'type': case 'talk':
      hipsY = 0.46 * S; thigh = Math.PI / 2 - 0.12; shin = -Math.PI / 2 + 0.1;
      armX = 0.5; foreX = 0.5;
      if (agent.pose === 'type') { lean = -0.14; foreX = 0.85; gesture = Math.sin(t * 12) * 0.05; }
      if (agent.pose === 'talk') { headX = Math.sin(t * 3.5) * 0.08; gesture = Math.sin(t * 2.2) * 0.35; }
      break;
    case 'glance':
      headX = 0.4;                                          // 8f: tilt face up
      if (agent.seated) { hipsY = 0.46 * S; thigh = Math.PI / 2 - 0.12; shin = -Math.PI / 2 + 0.1; armX = 0.5; foreX = 0.5; }
      break;
    case 'headdown':
      headX = -0.5; lean = -0.18;                           // 8f: slump forward
      if (agent.seated) { hipsY = 0.46 * S; thigh = Math.PI / 2 - 0.12; shin = -Math.PI / 2 + 0.1; armX = 0.5; foreX = 0.6; }
      break;
    case 'collapsed': {
      // downed agent eases to the floor (8d: no snap)
      const kk = Math.min((dt ?? 0.016) * 4, 1);
      agent.group.rotation.x += (-Math.PI / 2 - agent.group.rotation.x) * kk;
      const fall = -agent.group.rotation.x / (Math.PI / 2);
      agent.group.position.y = aY + 0.25 * fall;
      return;
    }
    default:                                                      // idle: weight shift
      sway = Math.sin(t * 1.6) * 0.03;
      bob = Math.sin(t * 1.6) * 0.012;
      gesture = Math.sin(t * 0.9) * 0.04;
  }
  agent.group.rotation.x += (0 - agent.group.rotation.x) * k;   // 8d: ease back upright

  p.hips.position.y += (hipsY - p.hips.position.y) * k;
  lerpTo(p.torso, 'x', lean, k);
  lerpTo(p.torso, 'z', sway, k);
  lerpTo(p.head, 'x', headX, k);
  lerpTo(p.legL, 'x', thigh + gait * 0.55, k);
  lerpTo(p.legR, 'x', thigh - gait * 0.55, k);
  lerpTo(p.shinL, 'x', shin - (agent.pose === 'walk' ? Math.max(0, -gait) * 0.7 : 0), k);   // knee flexes BACK
  lerpTo(p.shinR, 'x', shin - (agent.pose === 'walk' ? Math.max(0, gait) * 0.7 : 0), k);
  lerpTo(p.armL, 'x', armX - gait * 0.45 + gesture * 0.3, k);
  lerpTo(p.armR, 'x', armX + gait * 0.45 - gesture, k);
  lerpTo(p.foreL, 'x', foreX + Math.max(0, gait) * 0.3, k);                                 // elbow flexes FORWARD
  lerpTo(p.foreR, 'x', foreX + Math.max(0, -gait) * 0.3 + Math.abs(gesture) * 0.5, k);

  if (agent.ring.visible) agent.ring.rotation.y = t * 1.5;
  // keep feet out of the floor: compute the lowest shoe from the current joint
  // angles and lift the whole rig if it would clip (fixes sinking while
  // sitting down / standing up and the half-buried seated feet).
  const LT = 0.42 * S, LF = 0.46 * S;                       // thigh len, knee->shoe bottom
  const footY = (hipG, kneeG) => p.hips.position.y
    - LT * Math.cos(hipG.rotation.x) - LF * Math.cos(hipG.rotation.x + kneeG.rotation.x);
  const lowest = Math.min(footY(p.legL, p.shinL), footY(p.legR, p.shinR));
  // Walking: the lift-only correction (Math.max) left feet hovering above the
  // floor. Plant the rig at a STEADY height (constant offset, not the per-step
  // `lowest`, so the body doesn't bounce each stride). Other poses keep lift-only.
  const WALK_PLANT = 0.08 * S;
  // EASE the body to the target height (don't snap) — otherwise leaving a seat to
  // walk reads as the agent "falling" as the height jumps in one frame.
  const targetY = aY + bob + (agent.pose === 'walk' ? -WALK_PLANT : Math.max(0, -lowest));
  agent.group.position.y += (targetY - agent.group.position.y) * k;
}
