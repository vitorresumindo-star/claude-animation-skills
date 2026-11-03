// Props for the ejection-seat short: a cartoon two-seat jet trainer, the ejection seat,
// parachutes, rocket flame, smoke, clouds and a runway. All sizes in metres.
import * as THREE from 'three';
import { materials } from './materials.js';
import { glowTexture, rng } from './textures.js';
import { glowSprite } from './props.js';
import { lerp, clamp } from './anim.js';

const shadow = o => { o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; };
const box = (w, h, d, mat, p = [0, 0, 0], r = [0, 0, 0]) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(...p); m.rotation.set(...r); return m;
};

let PM = null;
export function paint() {
  if (PM) return PM;
  PM = {
    white: new THREE.MeshPhysicalMaterial({ color: 0xf1f2f0, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.25 }),
    red: new THREE.MeshPhysicalMaterial({ color: 0xd2342a, roughness: 0.35, clearcoat: 0.7 }),
    grey: new THREE.MeshStandardMaterial({ color: 0x5d636b, roughness: 0.55, metalness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.7 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x9fd0ff, roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.4, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }),
    frame: new THREE.MeshStandardMaterial({ color: 0x2d3036, roughness: 0.5, metalness: 0.4 }),
    seat: new THREE.MeshStandardMaterial({ color: 0x3c4148, roughness: 0.6, metalness: 0.3 }),
    cushion: new THREE.MeshStandardMaterial({ color: 0x4b5a3a, roughness: 0.9 }),
    pack: new THREE.MeshStandardMaterial({ color: 0x6b6f45, roughness: 0.85 }),
    yellow: new THREE.MeshStandardMaterial({ map: stripeTexture(), roughness: 0.5 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.9 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x77a65a, roughness: 1 }),
    tarmac: new THREE.MeshStandardMaterial({ color: 0x55585e, roughness: 0.95 }),
    paintWhite: new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.8 }),
    cloud: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0x9fb8d6, emissiveIntensity: 0.25 }),
  };
  return PM;
}

// yellow with black diagonal bands: the classic ejection handle
function stripeTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32;
  const x = c.getContext('2d');
  x.fillStyle = '#f2c018'; x.fillRect(0, 0, 128, 32);
  x.fillStyle = '#151515';
  for (let i = -2; i < 10; i++) { x.beginPath(); x.moveTo(i * 16, 0); x.lineTo(i * 16 + 8, 0); x.lineTo(i * 16 - 4, 32); x.lineTo(i * 16 - 12, 32); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- jet trainer: nose +x, fuselage axis at origin ----------
export function jet({ gear = false } = {}) {
  const P = paint();
  const g = new THREE.Group();
  const prof = [[-6.05, 0.24], [-5.6, 0.3], [-4.6, 0.42], [-3, 0.6], [-1.2, 0.74], [0.4, 0.7], [1.8, 0.68], [3.2, 0.64], [4.2, 0.55], [5.0, 0.4], [5.6, 0.24], [6.0, 0.08], [6.12, 0.0]];
  const pts = prof.map(([x, r]) => new THREE.Vector2(r, x));
  const curve = new THREE.SplineCurve(pts);
  const fg = new THREE.LatheGeometry(curve.getPoints(80).map(p => new THREE.Vector2(Math.max(p.x, 0.0001), p.y)), 64);
  fg.rotateZ(-Math.PI / 2);
  fg.scale(1, 1.06, 1);
  const body = new THREE.Mesh(fg, P.white); g.add(body);
  // red nose cone + belly stripe
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), P.red);
  nose.rotation.z = -Math.PI / 2; nose.scale.set(0.95, 1.6, 0.95); nose.position.x = 5.42; g.add(nose);
  for (const s of [-1, 1]) {
    const st = box(6.5, 0.12, 0.02, P.red, [0.2, -0.12, s * 0.735]); st.rotation.y = 0; g.add(st);
  }
  // cockpit openings (dark tubs at the sill)
  for (const x of [2.45, 1.15]) {
    const tub = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 12), P.dark);
    tub.scale.set(0.62, 0.05, 0.4); tub.position.set(x, 0.66, 0); g.add(tub);
  }
  // instrument coaming between/ahead of cockpits
  g.add(box(0.25, 0.14, 0.5, P.dark, [3.08, 0.7, 0]));
  g.add(box(0.2, 0.12, 0.46, P.dark, [1.8, 0.72, 0]));
  // windscreen (fixed)
  const ws = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI, 0, Math.PI / 2), P.glass);
  ws.rotation.y = Math.PI / 2; ws.scale.set(0.42, 0.7, 0.42); ws.position.set(3.15, 0.64, 0); ws.rotation.set(0, Math.PI / 2, 0); g.add(ws);
  // movable canopy halves (each its own group so it can be jettisoned)
  const mkCanopy = (cx, len) => {
    const c = new THREE.Group(); c.position.set(cx, 0.64, 0);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), P.glass);
    gl.scale.set(len / 2, 0.8, 0.44); c.add(gl);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 48), P.frame);
    rim.rotation.x = Math.PI / 2; rim.scale.set(len / 2, 0.44, 1); c.add(rim);
    const bow = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 8, 32, Math.PI), P.frame);
    bow.scale.set(0.44, 0.8, 1); bow.rotation.y = Math.PI / 2; bow.position.x = -len / 2 + 0.05; c.add(bow);
    g.add(c); return c;
  };
  g.canopyFront = mkCanopy(2.45, 1.25);
  g.canopyRear = mkCanopy(1.15, 1.25);
  // wings (low), with tip tanks
  const ws2 = new THREE.Shape();
  ws2.moveTo(-1.9, 0); ws2.lineTo(0.9, 0); ws2.lineTo(0.25, 4.55); ws2.lineTo(-1.05, 4.55); ws2.lineTo(-1.9, 0);
  const wg = new THREE.ExtrudeGeometry(ws2, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
  for (const s of [1, -1]) {
    const w = new THREE.Mesh(wg, P.white);
    w.rotation.x = s * Math.PI / 2; w.position.set(0, s > 0 ? -0.36 : -0.48, 0);
    g.add(w);
    const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.5, 8, 20), P.red);
    tank.rotation.z = Math.PI / 2; tank.position.set(-0.35, -0.42, s * 4.62); g.add(tank);
  }
  // side intakes
  for (const s of [1, -1]) {
    const it = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.4, 8, 20), P.white);
    it.rotation.z = Math.PI / 2; it.position.set(-0.5, 0.18, s * 0.66); it.scale.set(1, 1, 0.75); g.add(it);
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.24, 24), P.dark);
    mouth.rotation.y = Math.PI / 2; mouth.position.set(0.47, 0.18, s * 0.7); g.add(mouth);
  }
  // tail: fin + stabilisers
  const fs = new THREE.Shape();
  fs.moveTo(-6.0, 0.3); fs.lineTo(-4.1, 0.3); fs.lineTo(-5.35, 2.3); fs.lineTo(-6.15, 2.3); fs.lineTo(-6.0, 0.3);
  const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }), P.white);
  fin.position.z = -0.05; g.add(fin);
  const finTop = box(0.82, 0.3, 0.16, P.red, [-5.75, 2.15, 0]); g.add(finTop);
  const hs = new THREE.Shape();
  hs.moveTo(-6.0, 0); hs.lineTo(-4.9, 0); hs.lineTo(-5.45, 2.0); hs.lineTo(-6.0, 2.0); hs.lineTo(-6.0, 0);
  const hg = new THREE.ExtrudeGeometry(hs, { depth: 0.07, bevelEnabled: false });
  for (const s of [1, -1]) {
    const h = new THREE.Mesh(hg, P.white); h.rotation.x = s * Math.PI / 2; h.position.y = s > 0 ? 0.355 : 0.285; g.add(h);
  }
  const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.2, 24), P.dark);
  ex.rotation.z = Math.PI / 2; ex.position.x = -6.05; g.add(ex);
  g.exhaust = new THREE.Vector3(-6.2, 0, 0);
  if (gear) {
    const wheel = (p, r) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.16, 24), P.tyre); w.rotation.x = Math.PI / 2; w.position.set(...p); g.add(w); return w;
    };
    g.wheels = [wheel([4.1, -1.32, 0], 0.22), wheel([-0.7, -1.27, 1.25], 0.28), wheel([-0.7, -1.27, -1.25], 0.28)];
    g.add(box(0.07, 0.9, 0.07, P.grey, [4.1, -0.9, 0]));
    for (const s of [1, -1]) g.add(box(0.08, 0.8, 0.08, P.grey, [-0.7, -0.9, s * 1.2]));
    g.groundY = -1.55;
  }
  // seat mounting points (seat pan top, local)
  g.seatFront = new THREE.Vector3(2.45, -0.02, 0);
  g.seatRear = new THREE.Vector3(1.15, 0.04, 0);
  return shadow(g);
}

// ---------- ejection seat: pilot faces +z, origin at the seat pan top centre ----------
export function ejectionSeat() {
  const P = paint();
  const g = new THREE.Group();
  g.add(box(0.46, 0.07, 0.46, P.cushion, [0, -0.035, 0.02]));
  g.add(box(0.54, 0.14, 0.52, P.seat, [0, -0.13, 0]));
  const back = box(0.44, 0.72, 0.07, P.cushion, [0, 0.42, -0.22], [-0.1, 0, 0]); g.add(back); g.back = back;
  g.add(box(0.54, 1.05, 0.1, P.seat, [0, 0.47, -0.3], [-0.1, 0, 0]));
  g.add(box(0.5, 0.38, 0.28, P.pack, [0, 1.1, -0.33], [-0.1, 0, 0]));
  g.add(box(0.42, 0.06, 0.22, P.seat, [0, 1.31, -0.33], [-0.1, 0, 0]));
  for (const s of [-1, 1]) {
    g.add(box(0.05, 1.6, 0.07, P.grey, [s * 0.2, 0.5, -0.42], [-0.1, 0, 0]));       // guide rails
    g.add(box(0.05, 0.26, 0.5, P.seat, [s * 0.28, 0.02, 0]));                        // side walls
    g.add(box(0.03, 0.03, 0.14, P.yellow, [s * 0.28, 0.17, 0.18]));                   // lap-belt fittings
  }
  // double handle at the front of the seat, in the middle
  g.handle = new THREE.Group(); g.handle.position.set(0, 0.02, 0.27); g.add(g.handle);
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.013, 10, 24, Math.PI), P.yellow);
    h.position.x = s * 0.035; h.rotation.set(0, Math.PI / 2, 0); h.rotation.z = 0; g.handle.add(h);
  }
  // rocket motor under the pan
  const rk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.22, 20), P.grey); rk.position.set(0, -0.31, -0.1); g.add(rk);
  const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.085, 0.08, 20, 1, true), P.dark); nz.position.set(0, -0.45, -0.1); g.add(nz);
  g.nozzle = new THREE.Vector3(0, -0.5, -0.1);
  g.drogueMount = new THREE.Vector3(0, 1.32, -0.36);
  return shadow(g);
}

// seated pose for the pilot (human.root is a child of the seat)
export const SIT = {
  spine: [-0.06, 0, 0], chest: [0.04, 0, 0], neck: [0.05, 0, 0],
  lHip: [-1.5, 0, 0.1], rHip: [-1.5, 0, -0.1], lKn: [1.45, 0, 0], rKn: [1.45, 0, 0], lAn: [0.05, 0, 0], rAn: [0.05, 0, 0],
  lSh: [-0.55, 0, 0.2], rSh: [-0.55, 0, -0.2], lEl: [-1.0, 0, 0], rEl: [-1.0, 0, 0],
};
export function seatPilot(seat, human) {
  seat.add(human.root);
  human.root.position.set(0, -0.8, -0.06);
  human.setPose(SIT);
}

// ---------- parachute: origin where the lines meet, canopy above ----------
export function parachute({ R = 3.2, lines = 5, gores = 16, colors = [0xf26a1b, 0xf6f1e6] } = {}) {
  const g = new THREE.Group();
  const H = R * 0.62;
  const prof = [];
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * 1.35; prof.push(new THREE.Vector2(Math.max(0.001, R * Math.sin(a) / Math.sin(1.35)), H * Math.cos(a) - H * Math.cos(1.35))); }
  const geo = new THREE.LatheGeometry(prof, gores * 4);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const ca = new THREE.Color(colors[0]), cb = new THREE.Color(colors[1]);
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getZ(i), pos.getX(i)) + Math.PI;
    const k = Math.floor(a / (Math.PI * 2) * gores + 1e-4) % 2;
    const c = k ? ca : cb; col.set([c.r, c.g, c.b], i * 3);
    // scalloped gores: pull the skirt in between line attachment points
    const y = pos.getY(i); const lip = 1 - clamp(y / (H * 0.3));
    const sc = 1 - 0.05 * lip * Math.abs(Math.sin(a * gores / 2));
    pos.setX(i, pos.getX(i) * sc); pos.setZ(i, pos.getZ(i) * sc);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const dome = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }));
  dome.castShadow = true;
  const domeG = new THREE.Group(); domeG.position.y = lines; domeG.add(dome); g.add(domeG);
  const lg = new THREE.BufferGeometry(); const lp = new Float32Array(gores * 6);
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  const ln = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x3a3a3a, transparent: true, opacity: 0.8 }));
  ln.frustumCulled = false; g.add(ln);
  g.dome = domeG;
  // k: 0 packed -> 1 fully open
  g.open = (k) => {
    const sx = lerp(0.08, 1, k), sy = lerp(2.2, 1, k);
    domeG.scale.set(sx, sy, sx);
    domeG.position.y = lines * lerp(0.75, 1, k);
    for (let i = 0; i < gores; i++) {
      const a = (i / gores) * Math.PI * 2;
      lp.set([0, 0, 0, Math.cos(a) * R * 0.95 * sx, domeG.position.y, Math.sin(a) * R * 0.95 * sx], i * 6);
    }
    lg.attributes.position.needsUpdate = true;
    g.visible = k > 0.001;
  };
  g.open(1);
  return g;
}

// ---------- rocket / catapult flame, points down local -y ----------
export function flame(scale = 1) {
  const g = new THREE.Group();
  const mk = (r, h, color, op) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 20, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    m.rotation.x = Math.PI; m.position.y = -h / 2; return m;
  };
  const outer = mk(0.11, 1.0, 0xff6a1a, 0.55), inner = mk(0.06, 0.55, 0xfff0b0, 0.9);
  g.add(outer, inner);
  const glow = glowSprite(0xff9a40, 0.8); glow.position.y = -0.1; g.add(glow);
  const light = new THREE.PointLight(0xff8a3a, 0, 6); light.position.y = -0.2; g.add(light);
  g.scale.setScalar(scale);
  g.set = (k, t) => {
    const fl = 1 + 0.12 * Math.sin(t * 61) + 0.08 * Math.sin(t * 97);
    outer.scale.set(1, Math.max(0.001, k * fl), 1); inner.scale.set(1, Math.max(0.001, k * fl), 1);
    outer.position.y = -0.5 * k * fl; inner.position.y = -0.275 * k * fl;
    glow.material.opacity = k; glow.scale.setScalar(0.8 * k + 0.001);
    light.intensity = 25 * k;
    g.visible = k > 0.001;
  };
  g.set(0, 0);
  return g;
}

// ---------- smoke puffs: deterministic trail along path(te) ----------
let _smokeTex;
export function smoke(n = 50, { color = 0xdedede, size = 0.4, grow = 1.2, life = 2.5, every = 0.05, drift = 0.4, opacity = 0.65, seed = 4, wind = new THREE.Vector3() } = {}) {
  _smokeTex = _smokeTex || glowTexture('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)');
  const r = rng(seed);
  const g = new THREE.Group();
  const S = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: _smokeTex, color, transparent: true, depthWrite: false }));
    s.userData.d = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(drift * 2);
    s.userData.rot = r() * 6;
    g.add(s); S.push(s);
  }
  // path(te) -> Vector3 world position of the emitter at time te; t0 = when emission starts, t1 = when it stops
  g.update = (t, path, t0 = 0, t1 = 1e9) => {
    const last = Math.floor(Math.min(t, t1) / every);
    for (let i = 0; i < n; i++) {
      const s = S[i];
      const k = last - i; const te = k * every;
      const age = t - te;
      if (te < t0 || age < 0 || age > life) { s.visible = false; continue; }
      s.visible = true;
      s.position.copy(path(te)).addScaledVector(s.userData.d, age).addScaledVector(wind, age);
      s.scale.setScalar(size * (0.4 + grow * age));
      s.material.opacity = opacity * Math.min(1, age * 8) * (1 - age / life);
      s.material.rotation = s.userData.rot + age * 0.4;
    }
  };
  return g;
}

// ---------- cumulus cloud ----------
export function cloud(seed = 1, s = 1) {
  const P = paint();
  const r = rng(seed);
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), P.cloud);
    const rad = 0.8 + r() * 0.9;
    m.scale.set(rad, rad * 0.8, rad);
    m.position.set((r() - 0.5) * 4, (r() * 0.6) * rad, (r() - 0.5) * 1.6);
    g.add(m);
  }
  g.scale.setScalar(s);
  return g;
}

// ---------- airfield: grass + runway with moving centre dashes ----------
export function airfield() {
  const P = paint();
  const g = new THREE.Group();
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), P.grass); grass.rotation.x = -Math.PI / 2; grass.position.y = -0.02; grass.receiveShadow = true; g.add(grass);
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(600, 30), P.tarmac); rw.rotation.x = -Math.PI / 2; rw.position.y = -0.01; rw.receiveShadow = true; g.add(rw);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.PlaneGeometry(600, 0.4), P.paintWhite); e.rotation.x = -Math.PI / 2; e.position.set(0, -0.005, s * 14); g.add(e); }
  const dashes = new THREE.Group(); g.add(dashes);
  for (let i = -40; i < 40; i++) { const d = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.5), P.paintWhite); d.rotation.x = -Math.PI / 2; d.position.set(i * 12, -0.004, 0); d.receiveShadow = true; dashes.add(d); }
  g.scroll = (x) => { dashes.position.x = -(((x % 12) + 12) % 12); };
  return g;
}
