// SPEC-2026-043 §10 — the cosy studio. Replaces the data-centre office.
// Warm wood floor, sunset windows, string lights, pendants, plants, coffee
// corner, lounge, clock, framed sign, NEEDS RAY board, Build/Run zones,
// Marcus' glass corner office.
import * as THREE from 'three';

const PAL = {
  ground: 0x141019, panel: 0x1b1622, border: 0x302838, ink: 0xefe9f6,
  muted: 0xa79fb8, gold: 0xe0a341, purple: 0xa371f7, green: 0x4bc98b, orange: 0xff8a5c,
};

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function woodTexture() {
  return canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#5d3d24'; x.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) {
      const y = r * 64;
      x.fillStyle = r % 2 ? '#63422a' : '#57381f';
      x.fillRect(0, y, w, 62);
      x.strokeStyle = 'rgba(30,18,10,.55)';
      x.lineWidth = 2;
      x.strokeRect(-2, y, w + 4, 62);
      for (let g = 0; g < 5; g++) {
        x.strokeStyle = `rgba(40,24,12,${0.08 + Math.random() * 0.1})`;
        x.lineWidth = 1;
        const gy = y + 8 + Math.random() * 48;
        x.beginPath(); x.moveTo(0, gy);
        x.bezierCurveTo(w * 0.3, gy + 4, w * 0.7, gy - 4, w, gy);
        x.stroke();
      }
      x.fillStyle = 'rgba(25,15,8,.5)';
      x.fillRect(((r * 173) % w), y, 2, 62);
    }
  });
}

function sunsetTexture() {
  return canvasTex(256, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#a371f7');
    g.addColorStop(0.45, '#e0699a');
    g.addColorStop(0.72, '#ff8a5c');
    g.addColorStop(1, '#e0a341');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // sun
    const sg = x.createRadialGradient(w * 0.5, h * 0.66, 4, w * 0.5, h * 0.66, 46);
    sg.addColorStop(0, 'rgba(255,235,190,1)');
    sg.addColorStop(1, 'rgba(255,200,120,0)');
    x.fillStyle = sg; x.beginPath(); x.arc(w * 0.5, h * 0.66, 46, 0, Math.PI * 2); x.fill();
    // skyline silhouette
    x.fillStyle = 'rgba(30,16,32,.75)';
    let bx = 0;
    while (bx < w) {
      const bw = 14 + Math.random() * 26, bh = 24 + Math.random() * 42;
      x.fillRect(bx, h - bh, bw, bh);
      bx += bw + 3;
    }
  });
}

export function buildStudio() {
  const G = new THREE.Group();
  G.name = 'studio';
  const anchors = new Map();
  const A = (name, x, y, z, ry = 0) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0));
    anchors.set(name, { name, pos: new THREE.Vector3(x, y, z), quat: q });
  };
  const mat = (c, r = 0.85, e = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, emissive: e ? c : 0x000000, emissiveIntensity: e });
  const box = (w, h, d, m, x, y, z, ry = 0) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z); if (ry) b.rotation.y = ry;
    G.add(b); return b;
  };

  const W = 27, D = 14, H = 3.2;         // x -13.5..13.5, z -7..7

  // ---- floor + ground
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.7 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  G.add(floor);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat(PAL.ground, 1));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02;
  G.add(ground);

  // ---- walls
  const wallMat = mat(PAL.panel, 0.95);
  const trimMat = mat(PAL.border, 0.9);
  box(W, H, 0.25, wallMat, 0, H / 2, -D / 2);           // back
  box(W, H, 0.25, wallMat, 0, H / 2, D / 2);            // front
  box(0.25, H, D, wallMat, -W / 2, H / 2, 0);           // left
  box(0.25, H, D, wallMat, W / 2, H / 2, 0);            // right
  box(W, 0.18, 0.3, trimMat, 0, 0.09, -D / 2 + 0.1);
  box(W, 0.18, 0.3, trimMat, 0, 0.09, D / 2 - 0.1);
  // ceiling
  box(W, 0.2, D, mat(0x17111e, 1), 0, H + 0.1, 0);

  // ---- sunset windows on the back wall
  const sunset = sunsetTexture();
  for (let i = -1; i <= 1; i++) {
    const wx = i * 7;
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(5.4, 2.4),
      new THREE.MeshBasicMaterial({ map: sunset }));
    win.position.set(wx, 1.75, -D / 2 + 0.14);
    G.add(win);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(5.7, 2.6, 0.06), trimMat);
    frame.position.set(wx, 1.75, -D / 2 + 0.1);
    G.add(frame);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.4, 0.08), trimMat);
    bar.position.set(wx, 1.75, -D / 2 + 0.16);
    G.add(bar);
  }

  // ---- string lights along the walls (warm bulbs on a sagging wire)
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffc978, emissiveIntensity: 2.2 });
  function stringLight(x1, z1, x2, z2, y = 2.85, n = 16) {
    const wire = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 1), mat(0x2a2130, 1));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const sag = Math.sin(f * Math.PI) * 0.28;
      pts.push(new THREE.Vector3(x1 + (x2 - x1) * f, y - sag, z1 + (z2 - z1) * f));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.008, 4), mat(0x241c2c, 1));
    G.add(tube);
    for (let i = 0; i <= n; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), bulbMat);
      b.position.copy(pts[i]).y -= 0.06;
      G.add(b);
    }
    void wire;
  }
  stringLight(-12.5, -6.3, 12.5, -6.3);
  stringLight(-13.2, -5.5, -13.2, 5.5, 2.85, 12);
  stringLight(13.2, -5.5, 13.2, 5.5, 2.85, 12);

  // ---- warm pendant lamps
  const pendantAt = (x, z) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.05, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0x3a2c1a, emissive: 0xffc06a, emissiveIntensity: 1.6 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 2.15, z);
    G.add(ring);
    const cable = box(0.02, H - 2.15, 0.02, mat(0x241c2c, 1), x, (H + 2.15) / 2, z);
    void cable;
    const l = new THREE.PointLight(0xffc98a, 14, 10, 1.6);
    l.position.set(x, 2.0, z);
    G.add(l);
  };
  pendantAt(-7.5, -1.2); pendantAt(0, 0.6); pendantAt(7.5, -1.2); pendantAt(-9, 4.6);

  // ---- zone signs on the walls
  function wallSign(text, x, y, z, ry, color = PAL.gold) {
    const t = canvasTex(512, 128, (c) => {
      c.fillStyle = '#1b1622'; c.fillRect(0, 0, 512, 128);
      c.strokeStyle = '#302838'; c.lineWidth = 6; c.strokeRect(4, 4, 504, 120);
      c.fillStyle = '#' + color.toString(16).padStart(6, '0');
      c.font = 'bold 64px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(text, 256, 68);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: t }));
    m.position.set(x, y, z); m.rotation.y = ry;
    G.add(m);
  }
  wallSign('BUILD', -13.35, 2.4, 0, Math.PI / 2, PAL.purple);
  wallSign('RUN', 13.35, 2.4, 0, -Math.PI / 2, PAL.green);

  // ---- desks (returns screen material per desk)
  const screens = new Map();
  function desk(name, x, z, ry) {
    const g = new THREE.Group();
    g.position.set(x, 0, z); g.rotation.y = ry;
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.75), mat(0x6b4a2e, 0.6));
    top.position.y = 0.72; top.castShadow = true;
    g.add(top);
    for (const [lx, lz] of [[-0.68, -0.3], [0.68, -0.3], [-0.68, 0.3], [0.68, 0.3]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), mat(0x3a2c20, 0.7));
      leg.position.set(lx, 0.36, lz);
      g.add(leg);
    }
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.06), mat(0x241c2c, 0.6));
    stand.position.set(0, 0.92, -0.26);
    g.add(stand);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x0c0a10, emissive: 0x4bc98b, emissiveIntensity: 0.06, roughness: 0.4 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36), screenMat);
    screen.position.set(0, 1.12, -0.28);
    g.add(screen);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.4, 0.03), mat(0x141019, 0.5));
    back.position.set(0, 1.12, -0.3);
    g.add(back);
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.16), mat(0x241c2c, 0.5));
    kb.position.set(0, 0.76, -0.05);
    g.add(kb);
    G.add(g);
    // anchor: chair position in front of the desk
    const chair = new THREE.Vector3(0, 0, 0.72).applyEuler(new THREE.Euler(0, ry, 0)).add(new THREE.Vector3(x, 0, z));
    A(name, chair.x, 0, chair.z, ry + Math.PI);
    A(name + '_stand', ...new THREE.Vector3(0, 0, 1.35).applyEuler(new THREE.Euler(0, ry, 0)).add(new THREE.Vector3(x, 0, z)).toArray().map((v, i) => (i === 1 ? 0 : v)), ry + Math.PI);
    screens.set(name, screenMat);
    return g;
  }

  // Build zone (left), Run zone (right) — facing the sunset windows
  const buildX = [-11, -8.6, -6.2, -3.8];
  const runX = [3.2, 5.6, 8.0];
  buildX.forEach((x, i) => desk(`desk_build_${i + 1}`, x, -3.4, 0));
  runX.forEach((x, i) => desk(`desk_run_${i + 1}`, x, -3.4, 0));
  // two Run desks along the right wall
  desk('desk_run_4', 11.6, -1.2, -Math.PI / 2);
  desk('desk_run_5', 11.6, 1.6, -Math.PI / 2);

  // ---- Marcus' glass corner office (front-right)
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffe6c0, transparent: true, opacity: 0.14, roughness: 0.1, metalness: 0.2,
    side: THREE.DoubleSide,
  });
  const frameM = mat(PAL.border, 0.6);
  const ox0 = 8.2, oz0 = 3.2;
  const glass1 = new THREE.Mesh(new THREE.PlaneGeometry(W / 2 - ox0 - 0.4, H), glassMat);
  glass1.position.set((ox0 + W / 2) / 2 + 0.1, H / 2, oz0);
  G.add(glass1);
  const glass2 = new THREE.Mesh(new THREE.PlaneGeometry(D / 2 - oz0 + 0.2, H), glassMat);
  glass2.rotation.y = Math.PI / 2;
  glass2.position.set(ox0, H / 2, (oz0 + D / 2) / 2);
  G.add(glass2);
  box(W / 2 - ox0, 0.1, 0.1, frameM, (ox0 + W / 2) / 2 + 0.1, H - 0.05, oz0);
  box(0.1, 0.1, D / 2 - oz0 + 0.2, frameM, ox0, H - 0.05, (oz0 + D / 2) / 2);
  box(0.12, H, 0.12, frameM, ox0, H / 2, oz0);
  desk('desk_marcus', 11.3, 5.4, Math.PI);
  // MARCUS on the glass
  const mt = canvasTex(512, 128, (c) => {
    c.clearRect(0, 0, 512, 128);
    c.fillStyle = 'rgba(239,233,246,.92)';
    c.font = 'bold 58px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('M A R C U S', 256, 64);
  });
  const mg = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: mt, transparent: true }));
  mg.position.set(10.9, 2.2, oz0 + 0.02);
  G.add(mg);

  // ---- lounge (front-left): sofa, table, rug, mugs
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.1, 40), mat(0x4a2f3a, 1));
  rug.rotation.x = -Math.PI / 2; rug.position.set(-9.6, 0.012, 4.4);
  G.add(rug);
  const sofaM = mat(0x51384a, 0.9);
  box(2.3, 0.42, 0.95, sofaM, -10.4, 0.21, 5.5);
  box(2.3, 0.62, 0.24, sofaM, -10.4, 0.72, 5.92);
  box(0.24, 0.62, 0.95, sofaM, -11.44, 0.52, 5.5);
  box(0.24, 0.62, 0.95, sofaM, -9.36, 0.52, 5.5);
  box(1.0, 0.14, 0.8, sofaM, -10.75, 0.47, 5.42);   // seat cushions
  box(1.0, 0.14, 0.8, sofaM, -9.65, 0.47, 5.42);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.05, 24), mat(0x6b4a2e, 0.5));
  table.position.set(-8.7, 0.42, 4.4);
  G.add(table);
  box(0.08, 0.4, 0.08, mat(0x3a2c20, 0.7), -8.7, 0.2, 4.4);
  const mugM = mat(0xe0a341, 0.4);
  for (const [mx, mz] of [[-8.55, 4.3], [-8.85, 4.55]]) {
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.09, 10), mugM);
    mug.position.set(mx, 0.49, mz);
    G.add(mug);
  }
  A('sofa_1', -10.75, 0, 5.15, Math.PI);
  A('sofa_2', -9.65, 0, 5.15, Math.PI);

  // ---- coffee corner (back-left)
  box(3.4, 0.9, 0.7, mat(0x4a3423, 0.7), -11.2, 0.45, -6.15);
  box(3.5, 0.06, 0.8, mat(0x6b4a2e, 0.5), -11.2, 0.93, -6.15);
  const machine = box(0.5, 0.55, 0.45, mat(0x241c2c, 0.4), -12.2, 1.23, -6.2);
  box(0.1, 0.12, 0.1, mat(0xe0a341, 0.4), -12.2, 1.05, -6.02);
  const mugShelf = box(2.0, 0.05, 0.3, mat(0x3a2c20, 0.7), -10.6, 1.7, -6.75);
  for (let i = 0; i < 4; i++) {
    const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.08, 8), [mugM, mat(0xa371f7, 0.4), mat(0x4bc98b, 0.4), mat(0xefe9f6, 0.4)][i]);
    m2.position.set(-11.3 + i * 0.45, 1.77, -6.75);
    G.add(m2);
  }
  void machine; void mugShelf;
  A('coffee', -11.2, 0, -5.15, Math.PI);

  // ---- plants
  const leafM = mat(0x3f7a4e, 0.9), potM = mat(0x8a4b32, 0.8);
  function plant(x, z, s = 1) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.17 * s, 0.34 * s, 10), potM);
    pot.position.set(x, 0.17 * s, z);
    G.add(pot);
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry((0.16 + Math.random() * 0.12) * s, 7, 6), leafM);
      leaf.position.set(x + (Math.random() - 0.5) * 0.3 * s, (0.5 + Math.random() * 0.45) * s, z + (Math.random() - 0.5) * 0.3 * s);
      G.add(leaf);
    }
  }
  plant(-12.5, -4.6); plant(12.6, -5.6); plant(-12.6, 2.2, 1.2); plant(6.4, 5.9, 0.9);
  // small desk plant (Naomi waters it) + one near sofa
  plant(-12.9, 6.3, 0.8);
  const deskPlant = new THREE.Group();
  {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.1, 8), potM);
    pot.position.y = 0.05;
    deskPlant.add(pot);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), leafM);
    leaf.position.y = 0.2;
    deskPlant.add(leaf);
    deskPlant.position.set(-8.2 + 0.5, 0.78, -3.4 + 0.25);
    G.add(deskPlant);
  }
  A('plant_1', -12.5, 0, -3.9, 0);
  A('plant_2', 6.4, 0, 5.3, Math.PI);
  A('plant_desk', -7.5, 0, -2.6, 0);

  // ---- clock (front wall, real time)
  const clockCv = document.createElement('canvas');
  clockCv.width = clockCv.height = 256;
  const clockCtx = clockCv.getContext('2d');
  const clockTex = new THREE.CanvasTexture(clockCv);
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), new THREE.MeshBasicMaterial({ map: clockTex }));
  clock.position.set(-3.5, 2.5, D / 2 - 0.14);
  clock.rotation.y = Math.PI;
  G.add(clock);
  const clockRing = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.4, 32), mat(PAL.gold, 0.5));
  clockRing.position.copy(clock.position); clockRing.rotation.y = Math.PI;
  G.add(clockRing);

  // ---- framed 110lymph sign (front wall)
  const signT = canvasTex(512, 192, (c) => {
    c.fillStyle = '#141019'; c.fillRect(0, 0, 512, 192);
    c.strokeStyle = '#e0a341'; c.lineWidth = 8; c.strokeRect(8, 8, 496, 176);
    c.fillStyle = '#efe9f6'; c.font = 'bold 72px Georgia, serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('110lymph', 256, 96);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.72), new THREE.MeshBasicMaterial({ map: signT }));
  sign.position.set(-6.6, 2.4, D / 2 - 0.14);
  sign.rotation.y = Math.PI;
  G.add(sign);

  // ---- NEEDS RAY board (front wall, right of center)
  const needsCv = document.createElement('canvas');
  needsCv.width = 768; needsCv.height = 512;
  const needsCtx = needsCv.getContext('2d');
  const needsTex = new THREE.CanvasTexture(needsCv);
  needsTex.colorSpace = THREE.SRGBColorSpace;
  const boardMat = new THREE.MeshStandardMaterial({ map: needsTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: needsTex, emissiveIntensity: 0.55 });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.27), boardMat);
  board.position.set(2.2, 1.85, D / 2 - 0.16);
  board.rotation.y = Math.PI;
  G.add(board);
  const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(3.56, 2.43, 0.06), mat(PAL.border, 0.6));
  boardFrame.position.set(2.2, 1.85, D / 2 - 0.12);
  G.add(boardFrame);

  function drawNeeds(list) {
    const x = needsCtx, w = 768, h = 512;
    x.fillStyle = '#141019'; x.fillRect(0, 0, w, h);
    x.strokeStyle = list.length ? '#e0a341' : '#302838';
    x.lineWidth = 10; x.strokeRect(6, 6, w - 12, h - 12);
    x.fillStyle = list.length ? '#e0a341' : '#a79fb8';
    x.font = 'bold 52px Georgia, serif'; x.textAlign = 'left';
    x.fillText('NEEDS RAY' + (list.length ? `  ·  ${list.length}` : ''), 30, 66);
    x.font = '30px Georgia, serif';
    list.slice(0, 6).forEach((it, i) => {
      x.fillStyle = '#ff8a5c';
      x.fillText('✋ ' + it.name, 30, 126 + i * 62);
      x.fillStyle = '#a79fb8';
      x.font = '24px sans-serif';
      x.fillText(it.line.length > 46 ? it.line.slice(0, 45) + '…' : it.line, 66, 154 + i * 62);
      x.font = '30px Georgia, serif';
    });
    if (!list.length) {
      x.fillStyle = '#4a4256';
      x.font = 'italic 28px Georgia, serif';
      x.fillText('nobody waits — all quiet', 30, 130);
    }
    needsTex.needsUpdate = true;
  }
  drawNeeds([]);

  function drawClock() {
    const x = clockCtx;
    x.clearRect(0, 0, 256, 256);
    x.fillStyle = '#1b1622'; x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#302838'; x.lineWidth = 4;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      x.beginPath();
      x.moveTo(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104);
      x.lineTo(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116);
      x.stroke();
    }
    const d = new Date();
    const m = d.getMinutes() + d.getSeconds() / 60;
    const hh = (d.getHours() % 12) + m / 60;
    x.strokeStyle = '#efe9f6'; x.lineCap = 'round';
    x.lineWidth = 9;
    x.beginPath(); x.moveTo(128, 128);
    x.lineTo(128 + Math.cos(hh / 12 * Math.PI * 2 - Math.PI / 2) * 56, 128 + Math.sin(hh / 12 * Math.PI * 2 - Math.PI / 2) * 56);
    x.stroke();
    x.lineWidth = 6;
    x.beginPath(); x.moveTo(128, 128);
    x.lineTo(128 + Math.cos(m / 60 * Math.PI * 2 - Math.PI / 2) * 88, 128 + Math.sin(m / 60 * Math.PI * 2 - Math.PI / 2) * 88);
    x.stroke();
    x.strokeStyle = '#e0a341'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(128, 128);
    x.lineTo(128 + Math.cos(d.getSeconds() / 60 * Math.PI * 2 - Math.PI / 2) * 100, 128 + Math.sin(d.getSeconds() / 60 * Math.PI * 2 - Math.PI / 2) * 100);
    x.stroke();
    clockTex.needsUpdate = true;
  }
  drawClock();

  // ---- extra anchors + nav graph edges
  A('center_n', 0, 0, 1.5);
  A('center_s', 0, 0, 4.2);
  A('aisle_build', -7.4, 0, -1.6);
  A('aisle_run', 7.6, 0, -1.6);
  A('lounge_walk', -7.6, 0, 3.4);
  A('marcus_door', 8.6, 0, 4.2);
  const edges = [
    ['center_n', 'center_s'], ['center_n', 'aisle_build'], ['center_n', 'aisle_run'],
    ['center_s', 'lounge_walk'], ['center_s', 'marcus_door'], ['aisle_build', 'lounge_walk'],
    ['aisle_run', 'marcus_door'],
    ['aisle_build', 'desk_build_1'], ['aisle_build', 'desk_build_2'], ['aisle_build', 'desk_build_3'], ['aisle_build', 'desk_build_4'],
    ['aisle_run', 'desk_run_1'], ['aisle_run', 'desk_run_2'], ['aisle_run', 'desk_run_3'], ['aisle_run', 'desk_run_4'], ['aisle_run', 'desk_run_5'],
    ['marcus_door', 'desk_marcus'], ['lounge_walk', 'sofa_1'], ['lounge_walk', 'sofa_2'],
    ['lounge_walk', 'coffee'], ['aisle_build', 'coffee'], ['aisle_build', 'plant_1'], ['center_s', 'plant_2'], ['aisle_build', 'plant_desk'],
  ];

  const tick = () => drawClock();

  return { group: G, anchors, edges, screens, drawNeeds, tick };
}
