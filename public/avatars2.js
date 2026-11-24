// SPEC-2026-043 §10 — people. A realistic body (neck, shoulders, collared
// shirt, arms + hands, trousers, shoes), skin matched to the portrait; the
// face is the portrait in a head-shaped oval that always faces the camera,
// ringed in the state colour. Name tag at the feet.
import * as THREE from 'three';

export const STATE_COLORS = {
  working: '#4bc98b', stale: '#e0a341', blocked: '#ff8a5c',
  idle: '#a79fb8', offline: '#6e6878',
};

// average skin tone of a portrait (for hands + neck)
export function skinToneFromImage(img) {
  try {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 8;
    const x = cv.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, 8, 8);
    const d = x.getImageData(2, 2, 4, 4).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < 16; i++) { r += d[i * 4]; g += d[i * 4 + 1]; b += d[i * 4 + 2]; }
    return new THREE.Color(r / 16 / 255, g / 16 / 255, b / 16 / 255);
  } catch {
    return new THREE.Color(0xd9a06b);
  }
}

function ovalFaceTexture(img, name) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 320;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  function draw() {
    const x = cv.getContext('2d');
    x.clearRect(0, 0, 256, 320);
    // head-shaped oval
    x.save();
    x.beginPath();
    x.ellipse(128, 160, 112, 146, 0, 0, Math.PI * 2);
    x.clip();
    if (img) x.drawImage(img, 0, 0, 256, 320);
    else {
      x.fillStyle = '#302838'; x.fillRect(0, 0, 256, 320);
      x.fillStyle = '#efe9f6'; x.font = 'bold 110px Georgia, serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(name[0] ?? '?', 128, 168);
    }
    // soft top light
    const g = x.createLinearGradient(0, 0, 0, 320);
    g.addColorStop(0, 'rgba(255,235,200,.14)');
    g.addColorStop(1, 'rgba(20,16,25,.18)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 320);
    x.restore();
    tex.needsUpdate = true;
  }
  draw();
  return { tex, redraw: draw };
}

function nameTag(name, sub) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 80;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(0.9, 0.28, 1);
  sp.position.y = 0.12;
  sp.userData.draw = () => {
    const x = cv.getContext('2d');
    x.clearRect(0, 0, 256, 80);
    x.fillStyle = 'rgba(20,16,25,.78)';
    x.beginPath(); x.roundRect(28, 6, 200, 66, 12); x.fill();
    x.fillStyle = '#efe9f6'; x.font = 'bold 30px sans-serif';
    x.textAlign = 'center';
    x.fillText(name, 128, 36);
    if (sub) {
      x.fillStyle = '#a79fb8'; x.font = '19px sans-serif';
      x.fillText(sub, 128, 62);
    }
    tex.needsUpdate = true;
  };
  sp.userData.draw();
  return sp;
}

const lerp = (o, k, t, dt) => { o[k] += (t - o[k]) * Math.min((dt ?? 0.016) * 9, 1); };

export function buildPerson({ name, sub, portraitUrl, shirt = 0x51384a, trousers = 0x2c2536 }) {
  const root = new THREE.Group();
  const materials = [];
  const M = (c, r = 0.85) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: r }); materials.push(m); return m; };
  const skinMatHolder = { m: M(0xd9a06b, 0.6) };
  const shirtM = M(shirt, 0.9);
  const trouserM = M(trousers, 0.95);
  const shoeM = M(0x191521, 0.5);
  const collarM = M(0xefe9f6, 0.8);

  // torso group (leans)
  const torso = new THREE.Group();
  torso.position.y = 0.98;
  root.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, 0.25), shirtM);
  chest.position.y = 0.26;
  chest.castShadow = true;
  torso.add(chest);
  // collar
  const collarL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.03), collarM);
  collarL.position.set(-0.07, 0.5, 0.13); collarL.rotation.z = 0.5;
  torso.add(collarL);
  const collarR = collarL.clone(); collarR.position.x = 0.07; collarR.rotation.z = -0.5;
  torso.add(collarR);
  // shoulders
  for (const s of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), shirtM);
    sh.position.set(s * 0.245, 0.47, 0);
    torso.add(sh);
  }
  // neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 10), skinMatHolder.m);
  neck.position.y = 0.56;
  torso.add(neck);

  // head: oval portrait billboard + state ring
  const head = new THREE.Group();
  head.position.y = 1.62;
  root.add(head);
  const face = ovalFaceTexture(null, name);
  const faceMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.5),
    new THREE.MeshBasicMaterial({ map: face.tex, transparent: true }));
  head.add(faceMesh);
  const ringMat = new THREE.MeshBasicMaterial({ color: STATE_COLORS.idle, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.245, 0.272, 40), ringMat);
  ring.scale.y = 1.25;
  head.add(ring);
  const portrait = new Image();
  portrait.crossOrigin = 'anonymous';
  portrait.onload = () => {
    face.tex.image = undefined;
    // redraw the oval with the real portrait
    const cv = face.tex.image ?? document.createElement('canvas');
    void cv;
    const x = document.createElement('canvas');
    x.width = 256; x.height = 320;
    const c = x.getContext('2d');
    c.save();
    c.beginPath(); c.ellipse(128, 160, 112, 146, 0, 0, Math.PI * 2); c.clip();
    // cover-crop the portrait into the oval
    const s = Math.max(256 / portrait.width, 320 / portrait.height);
    const dw = portrait.width * s, dh = portrait.height * s;
    c.drawImage(portrait, (256 - dw) / 2, (320 - dh) / 2, dw, dh);
    const g = c.createLinearGradient(0, 0, 0, 320);
    g.addColorStop(0, 'rgba(255,235,200,.14)');
    g.addColorStop(1, 'rgba(20,16,25,.18)');
    c.fillStyle = g; c.fillRect(0, 0, 256, 320);
    c.restore();
    face.tex.image = x;
    face.tex.needsUpdate = true;
    skinMatHolder.m.color.copy(skinToneFromImage(portrait));
  };
  portrait.src = portraitUrl;

  // arms: shoulder pivot -> upper -> elbow pivot -> forearm + hand
  function arm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.26, 1.44, 0);
    root.add(shoulder);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.1), shirtM);
    upper.position.y = -0.16;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.32;
    shoulder.add(elbow);
    const fore = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.3, 0.085), skinMatHolder.m);
    fore.position.y = -0.15;
    elbow.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 7), skinMatHolder.m);
    hand.position.y = -0.33;
    elbow.add(hand);
    return { shoulder, elbow };
  }
  const armL = arm(-1), armR = arm(1);

  // legs: hip pivot -> thigh -> knee pivot -> shin + shoe
  function leg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.115, 0.98, 0);
    root.add(hip);
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.14), trouserM);
    thigh.position.y = -0.22;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.12), trouserM);
    shin.position.y = -0.21;
    knee.add(shin);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.27), shoeM);
    shoe.position.set(0, -0.44, 0.05);
    knee.add(shoe);
    return { hip, knee };
  }
  const legL = leg(-1), legR = leg(1);

  const tag = nameTag(name, sub);
  root.add(tag);

  const saved = materials.map(m => m.color.clone());
  function setGrey(on) {
    materials.forEach((m, i) => m.color.copy(on ? new THREE.Color(0x55515c) : saved[i]));
    ringMat.opacity = on ? 0.35 : 0.95;
    tag.material.opacity = on ? 0.5 : 1;
  }
  function setState(state) {
    ringMat.color.set(STATE_COLORS[state] ?? STATE_COLORS.idle);
  }

  const rig = { root, torso, head, armL, armR, legL, legR, tag, setGrey, setState, faceMesh, ring };
  rig.pose = 'stand';
  rig.t = Math.random() * 9;
  return rig;
}

// pose driver. pose: stand | walk | sit | type | handup | sofa | mug | water
export function animatePerson(p, dt, camPos) {
  p.t += dt;
  const t = p.t, k = Math.min(dt * 9, 1);
  let hipY = 0.98, thighL = 0, thighR = 0, shin = 0, lean = 0, bob = 0;
  let shL = { x: 0.08, z: 0.06 }, shR = { x: 0.08, z: -0.06 }, elL = -0.25, elR = -0.25;
  let gait = 0;

  switch (p.pose) {
    case 'walk':
      gait = Math.sin(t * 7.2);
      bob = Math.abs(Math.cos(t * 7.2)) * 0.035;
      thighL = gait * 0.5; thighR = -gait * 0.5;
      shin = -Math.max(0, -gait) * 0.8 - 0.05;
      shL = { x: -gait * 0.4, z: 0.06 }; shR = { x: gait * 0.4, z: -0.06 };
      elL = -0.4; elR = -0.4;
      break;
    case 'sit': case 'type':
      hipY = 0.55;
      thighL = thighR = Math.PI / 2 - 0.15;
      shin = -Math.PI / 2 + 0.12;
      shL = { x: -0.55, z: 0.1 }; shR = { x: -0.55, z: -0.1 };
      elL = elR = -0.7;
      if (p.pose === 'type') {
        lean = 0.1;
        const tap = Math.sin(t * 11);
        shL.x += tap * 0.05; shR.x -= tap * 0.05;
        elL += Math.sin(t * 13) * 0.06; elR += Math.cos(t * 12) * 0.06;
      }
      break;
    case 'sofa':
      hipY = 0.48;
      thighL = thighR = Math.PI / 2 - 0.3;
      shin = -Math.PI / 2 + 0.5;
      shL = { x: -0.35, z: 0.14 }; shR = { x: -0.35, z: -0.14 };
      elL = elR = -0.5;
      break;
    case 'handup': {
      lean = -0.03;
      shR = { x: Math.PI - 0.35, z: -0.25 + Math.sin(t * 3.1) * 0.08 };
      elR = -0.12;
      shL = { x: 0.1, z: 0.1 };
      elL = -0.35;
      break;
    }
    case 'mug':
      shR = { x: -1.15, z: -0.15 };
      elR = -1.35;
      shL = { x: 0.08, z: 0.08 };
      bob = Math.sin(t * 1.4) * 0.008;
      break;
    case 'water':
      lean = 0.22;
      shR = { x: -0.95, z: -0.1 };
      elR = -0.25;
      shL = { x: -0.3, z: 0.2 };
      break;
    default: // stand
      bob = Math.sin(t * 1.5) * 0.012;
      shL = { x: 0.08 + Math.sin(t * 1.1) * 0.03, z: 0.08 };
      shR = { x: 0.08 - Math.sin(t * 1.1) * 0.03, z: -0.08 };
  }

  lerp(p.root.position, 'y', hipY - 0.98 + bob + (p.seatY ?? 0), k);
  lerp(p.torso.rotation, 'x', lean, k);
  lerp(p.legL.hip.rotation, 'x', thighL, k);
  lerp(p.legR.hip.rotation, 'x', thighR, k);
  lerp(p.legL.knee.rotation, 'x', shin, k);
  lerp(p.legR.knee.rotation, 'x', shin, k);
  lerp(p.armL.shoulder.rotation, 'x', shL.x, k);
  lerp(p.armL.shoulder.rotation, 'z', shL.z, k);
  lerp(p.armR.shoulder.rotation, 'x', shR.x, k);
  lerp(p.armR.shoulder.rotation, 'z', shR.z, k);
  lerp(p.armL.elbow.rotation, 'x', elL, k);
  lerp(p.armR.elbow.rotation, 'x', elR, k);

  // face the camera (billboard head + ring + name tag)
  if (camPos) {
    const dx = camPos.x - p.root.position.x;
    const dz = camPos.z - p.root.position.z;
    const yaw = Math.atan2(dx, dz);
    let dy = yaw - p.head.rotation.y;
    while (dy > Math.PI) dy -= 2 * Math.PI;
    while (dy < -Math.PI) dy += 2 * Math.PI;
    p.head.rotation.y += dy * Math.min(dt * 10, 1);
  }
}
