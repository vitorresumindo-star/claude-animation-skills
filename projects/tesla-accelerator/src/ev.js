// Props for the "inside an electric car" short: a generic white electric sedan (with an x-ray mode),
// the battery pack, pedal and computer, inverter, three-phase motor, reduction gears, glowing current
// beads and a road. Not a copy of any real car: a cartoon sedan. All sizes in metres.
import * as THREE from 'three';
import { materials } from './materials.js';
import { glowSprite } from './props.js';
import { lerp, clamp } from './anim.js';

const shadow = o => { o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; };
const box = (w, h, d, mat, p = [0, 0, 0], r = [0, 0, 0]) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(...p); m.rotation.set(...r); return m;
};
const cyl = (r, h, mat, p = [0, 0, 0], r3 = [0, 0, 0], seg = 32) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.position.set(...p); m.rotation.set(...r3); return m;
};

// phase colours: A red, B yellow, C blue
export const PHASE = [0xff3b30, 0xffc21a, 0x2e8bff];

let PM = null;
export function paint() {
  if (PM) return PM;
  PM = {
    body: new THREE.MeshPhysicalMaterial({ color: 0xf3f4f6, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x16202c, roughness: 0.05, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.72, depthWrite: false }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.7 }),
    black: new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.55 }),
    grey: new THREE.MeshStandardMaterial({ color: 0x5d636b, roughness: 0.55, metalness: 0.3 }),
    seat: new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.75 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.9 }),
    alloy: new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.9, roughness: 0.3 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xb9bec6, metalness: 0.85, roughness: 0.35 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x6f747c, metalness: 0.75, roughness: 0.42 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 1, roughness: 0.25 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.5 }),
    cell: new THREE.MeshStandardMaterial({ color: 0x2f6fd0, roughness: 0.4, metalness: 0.2 }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x1e7a46, roughness: 0.6 }),
    head: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.0), toneMapped: false }),
    tail: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 0.15, 0.12), toneMapped: false }),
    screen: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.55, 0.9), toneMapped: false }),
    red: new THREE.MeshStandardMaterial({ color: 0xd2342a, roughness: 0.5 }),
    tarmac: new THREE.MeshStandardMaterial({ color: 0x5a5e66, roughness: 0.95 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x7fb05e, roughness: 1 }),
    lane: new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.8 }),
    magN: new THREE.MeshPhysicalMaterial({ color: 0xe23a32, roughness: 0.3, clearcoat: 0.8 }),
    magS: new THREE.MeshPhysicalMaterial({ color: 0x2f6fe0, roughness: 0.3, clearcoat: 0.8 }),
  };
  return PM;
}

// rounded rectangle path
function rrect(p, hw, hh, r) {
  p.moveTo(-hw + r, -hh); p.lineTo(hw - r, -hh); p.quadraticCurveTo(hw, -hh, hw, -hh + r);
  p.lineTo(hw, hh - r); p.quadraticCurveTo(hw, hh, hw - r, hh); p.lineTo(-hw + r, hh);
  p.quadraticCurveTo(-hw, hh, -hw, hh - r); p.lineTo(-hw, -hh + r); p.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return p;
}

// ---------- wheel: axis along z, spin with wheel.spin(angle) ----------
export function wheel(side = 1, R = 0.36) {
  const P = paint();
  const g = new THREE.Group();
  const spinG = new THREE.Group(); g.add(spinG);
  const t = cyl(R, 0.24, P.tyre, [0, 0, 0], [Math.PI / 2, 0, 0], 40); spinG.add(t);
  const rim = cyl(R * 0.68, 0.245, P.alloy, [0, 0, 0], [Math.PI / 2, 0, 0], 32); spinG.add(rim);
  const hub = cyl(R * 0.16, 0.26, P.dark, [0, 0, 0], [Math.PI / 2, 0, 0], 20); spinG.add(hub);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    const sp = box(R * 0.5, 0.06, 0.02, P.dark, [Math.cos(a) * R * 0.38, Math.sin(a) * R * 0.38, side * 0.125], [0, 0, a]);
    spinG.add(sp);
  }
  g.spin = (a) => { spinG.rotation.z = a; };
  return shadow(g);
}

// ---------- seat: occupant faces +z, origin at the cushion top centre ----------
export function carSeat() {
  const P = paint();
  const g = new THREE.Group();
  g.add(box(0.5, 0.12, 0.5, P.seat, [0, -0.06, 0.02]));
  const back = box(0.48, 0.72, 0.12, P.seat, [0, 0.36, -0.26], [-0.22, 0, 0]); g.add(back); g.back = back;
  g.add(box(0.26, 0.2, 0.1, P.seat, [0, 0.82, -0.36], [-0.22, 0, 0]));
  g.add(box(0.12, 0.14, 0.12, P.black, [0, -0.19, 0]));
  return shadow(g);
}

// driving pose (seat-local): reclined back, legs reaching for the pedals
export const DRIVE = {
  spine: [-0.22, 0, 0], chest: [0.06, 0, 0], neck: [0.14, 0, 0],
  lHip: [-1.3, 0, 0.1], rHip: [-1.3, 0, -0.08], lKn: [0.5, 0, 0], rKn: [0.45, 0, 0], lAn: [-0.15, 0, 0], rAn: [-0.25, 0, 0],
  lSh: [-0.8, 0, 0.1], rSh: [-0.8, 0, -0.1], lEl: [-0.6, 0, 0], rEl: [-0.6, 0, 0],
};
export function seatDriver(seat, human) {
  seat.add(human.root);
  human.root.position.set(0, -0.86, -0.04);
  human.setPose(DRIVE);
}

// ---------- generic electric sedan: nose +x, ground at y = 0 ----------
export function car() {
  const P = paint();
  const g = new THREE.Group();
  const shell = new THREE.Group(); g.add(shell);       // everything that goes see-through in x-ray mode
  const bodyMat = P.body.clone(), glassMat = P.glass.clone();
  const W = 1.86, bev = 0.1;
  const XR = -1.45, XF = 1.42, WR = 0.36, AR = 0.52, yb = 0.25;
  const s = new THREE.Shape();
  s.moveTo(-2.25, yb);
  s.lineTo(XR - AR, yb);
  s.absarc(XR, WR, AR, Math.PI, 0, true);
  s.lineTo(XF - AR, yb);
  s.absarc(XF, WR, AR, Math.PI, 0, true);
  s.lineTo(2.15, yb);
  s.quadraticCurveTo(2.36, yb, 2.36, 0.46);
  s.quadraticCurveTo(2.36, 0.68, 2.08, 0.74);
  s.quadraticCurveTo(1.45, 0.84, 0.95, 0.9);
  s.lineTo(-1.7, 0.96);
  s.quadraticCurveTo(-2.2, 0.98, -2.3, 0.86);
  s.quadraticCurveTo(-2.36, 0.55, -2.25, yb);
  const bg = new THREE.ExtrudeGeometry(s, { depth: W - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 5, curveSegments: 24 });
  bg.translate(0, 0, -(W - 2 * bev) / 2);
  const body = new THREE.Mesh(bg, bodyMat); shell.add(body);
  // glass cabin (all-glass roof)
  const c = new THREE.Shape();
  c.moveTo(1.02, 0.86);
  c.quadraticCurveTo(0.5, 1.22, 0.05, 1.46);
  c.quadraticCurveTo(-0.55, 1.6, -1.1, 1.42);
  c.quadraticCurveTo(-1.6, 1.16, -1.9, 0.92);
  c.lineTo(1.02, 0.86);
  const cw = 1.4, cb = 0.12;
  const cg = new THREE.ExtrudeGeometry(c, { depth: cw - 2 * cb, bevelEnabled: true, bevelThickness: cb, bevelSize: cb, bevelSegments: 5, curveSegments: 24 });
  cg.translate(0, 0, -(cw - 2 * cb) / 2);
  const cabin = new THREE.Mesh(cg, glassMat); cabin.renderOrder = 2; cabin.castShadow = false; shell.add(cabin);
  // lights
  for (const z of [-1, 1]) {
    shell.add(box(0.06, 0.05, 0.42, P.head, [2.34, 0.66, z * 0.55], [0, z * 0.35, 0]));
    shell.add(box(0.05, 0.06, 0.45, P.tail, [-2.38, 0.86, z * 0.55], [0, -z * 0.25, 0]));
  }
  // dark sill strip
  for (const z of [-1, 1]) shell.add(box(2.2, 0.07, 0.02, P.dark, [0, 0.3, z * (W / 2 + 0.002)]));
  // wheels (stay solid)
  g.wheels = [];
  for (const [x, z] of [[XF, 1], [XF, -1], [XR, 1], [XR, -1]]) { const w = wheel(z); w.position.set(x, WR, z * 0.8); g.add(w); g.wheels.push(w); }
  // interior: floor, footwell, dash, screen, steering wheel, seats
  const inner = new THREE.Group(); g.add(inner);
  const floor = box(2.0, 0.03, 1.5, P.dark, [-0.4, 0.315, 0]); shell.add(floor);
  inner.add(box(0.6, 0.03, 1.4, P.dark, [0.85, 0.17, 0]));
  inner.add(box(0.3, 0.2, 1.5, P.dark, [0.95, 0.82, 0]));
  inner.add(box(0.03, 0.2, 0.32, P.screen, [0.78, 1.0, 0], [0, 0, -0.35]));
  const sw = new THREE.Group(); sw.position.set(0.5, 0.92, -0.4); sw.rotation.set(0, Math.PI / 2, 0); sw.rotateX(0.45); inner.add(sw);
  const rimW = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 10, 36), P.black); sw.add(rimW);
  sw.add(box(0.3, 0.03, 0.03, P.black)); sw.add(cyl(0.05, 0.04, P.black, [0, 0, 0], [Math.PI / 2, 0, 0]));
  inner.add(cyl(0.025, 0.4, P.black, [0.68, 0.84, -0.4], [0, 0, 1.1]));
  g.steer = sw; g.inner = inner;
  g.seats = [];
  for (const [x, z] of [[-0.12, -0.4], [-0.12, 0.4]]) { const st = carSeat(); st.position.set(x, 0.46, z); st.rotation.y = Math.PI / 2; inner.add(st); g.seats.push(st); }
  inner.add(box(0.5, 0.14, 1.3, P.seat, [-1.0, 0.39, 0]));
  inner.add(box(0.12, 0.6, 1.3, P.seat, [-1.28, 0.72, 0], [0, 0, 0.22]));
  // pedal under the driver's right foot
  const ped = new THREE.Group(); ped.position.set(0.98, 0.2, -0.32); inner.add(ped);
  ped.add(box(0.06, 0.02, 0.09, P.black, [0, 0.1, 0], [0, 0, 0.8]));
  g.pedal = ped;

  // ---- the drivetrain (visible in x-ray) ----
  const dt = new THREE.Group(); g.add(dt);
  g.pack = batteryPack({ x0: -1.3, x1: 0.62, w: 1.38, nx: 36, nz: 24 }); g.pack.position.y = 0.17; dt.add(g.pack);
  g.motor = motor(); g.motor.scale.setScalar(0.3); g.motor.position.set(XR + 0.33, WR + 0.02, 0.18); dt.add(g.motor);
  dt.add(box(0.36, 0.3, 0.26, P.alu, [XR + 0.02, WR + 0.02, -0.12]));                       // gearbox
  for (const z of [-1, 1]) dt.add(cyl(0.03, 0.62, P.steel, [XR, WR, z * 0.42], [Math.PI / 2, 0, 0]));   // half-shafts
  g.inv = box(0.32, 0.11, 0.42, P.alu, [XR + 0.3, WR + 0.24, 0.02]); dt.add(g.inv);
  const cablePts = [V3(-1.3, 0.27, 0.12), V3(-1.42, 0.4, 0.1), V3(-1.25, 0.66, 0.05), V3(-1.17, 0.62, 0.02)];
  for (const dz of [-0.06, 0.06]) {
    const pts = cablePts.map(p => p.clone().add(V3(0, 0, dz)));
    dt.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.018, 8), P.orange));
  }
  g.cableCurve = new THREE.CatmullRomCurve3(cablePts);
  g.drivetrain = dt;
  dt.visible = true;

  // x-ray: 0 = solid paint, 1 = ghost body showing the drivetrain
  const solid = [bodyMat, glassMat, floor.material];
  g.xray = (k) => {
    bodyMat.transparent = k > 0.001; bodyMat.opacity = lerp(1, 0.13, k); bodyMat.depthWrite = k < 0.5;
    glassMat.opacity = lerp(0.72, 0.1, k);
    floor.visible = k < 0.5;
    body.castShadow = k < 0.5;
  };
  g.xray(0);
  g.solid = solid;
  shadow(g);
  cabin.castShadow = false;
  return g;
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- battery pack: rows of cylindrical cells; caps glow on demand ----------
export function batteryPack({ x0 = -1.3, x1 = 0.6, w = 1.4, nx = 36, nz = 24 } = {}) {
  const P = paint();
  const g = new THREE.Group();
  const L = x1 - x0;
  g.add(box(L + 0.08, 0.04, w + 0.08, P.alu, [(x0 + x1) / 2, 0.0, 0]));
  for (const z of [-1, 1]) g.add(box(L + 0.08, 0.1, 0.02, P.alu, [(x0 + x1) / 2, 0.04, z * (w / 2 + 0.04)]));
  const px = L / nx, pz = w / nz, r = Math.min(px, pz) * 0.42;
  const n = nx * nz;
  const cells = new THREE.InstancedMesh(new THREE.CylinderGeometry(r, r, 0.07, 14), P.cell, n);
  const caps = new THREE.InstancedMesh(new THREE.CircleGeometry(r * 0.75, 14), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const pos = [];
  let k = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = x0 + (i + 0.5) * px, z = -w / 2 + (j + 0.5) * pz;
    pos.push([x, z, i / (nx - 1), j / (nz - 1)]);
    m.makeTranslation(x, 0.055, z); cells.setMatrixAt(k, m);
    m.compose(V3(x, 0.0905, z), q, V3(1, 1, 1)); caps.setMatrixAt(k, m);
    caps.setColorAt(k, new THREE.Color(0.6, 0.62, 0.66));
    k++;
  }
  cells.castShadow = true; cells.receiveShadow = true; cells.frustumCulled = caps.frustumCulled = false;
  g.add(cells, caps);
  const base = new THREE.Color(0.55, 0.57, 0.6), tmp = new THREE.Color();
  // fn(u, v) -> 0..1 glow (u along x, v across), colour of the glow
  g.glow = (fn, color = new THREE.Color(0.3, 2.4, 0.8)) => {
    for (let i = 0; i < n; i++) {
      const [, , u, v] = pos[i];
      const a = clamp(fn(u, v));
      tmp.copy(base).lerp(color, a); caps.setColorAt(i, tmp);
    }
    caps.instanceColor.needsUpdate = true;
  };
  g.cellCount = n;
  return g;
}

// ---------- glowing current beads: n bright spheres placed by fn(i, n) ----------
export function beads(n, color, size = 0.02) {
  const c = new THREE.Color(color).multiplyScalar(2.6);
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: c, toneMapped: false, transparent: true }), n);
  im.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  // fn(i, n) -> [Vector3, scale]  (scale 0 hides it)
  im.set = (fn) => {
    for (let i = 0; i < n; i++) {
      const [p, s] = fn(i, n);
      const k = size * s;
      m.compose(p, q, V3(k, k, k)); im.setMatrixAt(i, m);
    }
    im.instanceMatrix.needsUpdate = true;
  };
  return im;
}

// ---------- three-phase motor: axis along z, front face +z ----------
// 6 coils: phases [A, C, B, A, C, B] with alternating winding sense, so the field follows theta.
export function motor() {
  const P = paint(); const M = materials();
  const g = new THREE.Group();
  const L = 0.5;
  const sh = new THREE.Shape(); sh.absarc(0, 0, 0.52, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(0, 0, 0.43, 0, Math.PI * 2, true); sh.holes.push(hole);
  const yokeG = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 64 });
  yokeG.translate(0, 0, -L / 2);
  g.add(new THREE.Mesh(yokeG, P.iron));
  // lamination grooves on the outside
  for (let i = 1; i < 8; i++) {
    const gr = new THREE.Mesh(new THREE.TorusGeometry(0.535, 0.006, 6, 64), P.dark);
    gr.position.z = -L / 2 + i * L / 8; g.add(gr);
  }
  const cs = new THREE.Shape(); rrect(cs, 0.105, L / 2 + 0.05, 0.04);
  const ch = new THREE.Path(); rrect(ch, 0.058, L / 2 + 0.008, 0.02); cs.holes.push(ch);
  const coilG = new THREE.ExtrudeGeometry(cs, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 8 });
  const PHI = [0, 2, 1, 0, 2, 1];
  g.coils = [];
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 2 + k * Math.PI / 3;
    const tf = new THREE.Group(); tf.rotation.z = a - Math.PI / 2; g.add(tf);
    tf.add(box(0.1, 0.2, L, P.iron, [0, 0.33, 0]));
    tf.add(box(0.2, 0.03, L, P.iron, [0, 0.245, 0]));
    const mat = M.copper.clone(); mat.emissive = new THREE.Color(PHASE[PHI[k]]); mat.emissiveIntensity = 0;
    const coil = new THREE.Mesh(coilG, mat); coil.rotation.x = -Math.PI / 2; coil.position.y = 0.27; tf.add(coil);
    const gl = glowSprite(PHASE[PHI[k]], 0.4); gl.position.set(0, 0.33, L / 2 + 0.07); tf.add(gl); gl.material.opacity = 0;
    g.coils.push({ a, mat, gl, phase: PHI[k] });
  }
  // rotor: two magnet halves (red N, blue S) on a shaft
  const rotor = new THREE.Group(); g.add(rotor);
  const half = (mat, t0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, L * 0.96, 40, 1, false, t0, Math.PI), mat); m.rotation.x = Math.PI / 2; return m; };
  rotor.add(half(P.magN, 0), half(P.magS, Math.PI));
  rotor.add(cyl(0.045, L + 0.5, P.steel, [0, 0, 0.05], [Math.PI / 2, 0, 0], 20));
  rotor.add(box(0.012, 0.4, 0.004, P.dark, [0, 0, L * 0.48 + 0.002]));
  g.rotor = rotor;
  // field arrow across the front face, along local +x when field.rotation.z = theta
  const field = new THREE.Group(); field.position.z = L / 2 + 0.09; g.add(field);
  const fm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.25, 0.35), toneMapped: false, transparent: true, opacity: 0.9, depthWrite: false });
  const shaftA = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 12), fm); shaftA.rotation.z = -Math.PI / 2; field.add(shaftA);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 16), fm); tip.rotation.z = -Math.PI / 2; tip.position.x = 0.38; field.add(tip);
  field.visible = false;
  g.field = field; g.fieldMat = fm;
  // theta: field direction; amp: current (0..1)
  g.drive = (theta, amp = 1) => {
    for (const c of g.coils) {
      const k = Math.abs(Math.cos(theta - c.a)) ** 2 * amp;
      c.mat.emissiveIntensity = 2.2 * k; c.gl.material.opacity = 0.9 * k;
    }
    field.rotation.z = theta;
  };
  // steady DC: every coil of one phase on, nothing turning
  g.static = (amp) => {
    for (const c of g.coils) {
      const k = (c.phase === 0 ? 1 : 0.0) * amp;
      c.mat.emissiveIntensity = 2.2 * k; c.gl.material.opacity = 0.9 * k;
    }
  };
  g.drive(0, 0);
  return shadow(g);
}

// ---------- spur gear: axis along z, pitch radius m*n/2 ----------
export function gear(n, m = 0.04, thick = 0.12, mat) {
  const P = paint();
  const r = m * n / 2, ra = r + m, rf = r - 1.25 * m, p = Math.PI * 2 / n;
  const s = new THREE.Shape();
  for (let i = 0; i < n; i++) {
    const a = i * p;
    const pts = [[rf, a - 0.5 * p], [rf, a - 0.27 * p], [ra, a - 0.13 * p], [ra, a + 0.13 * p], [rf, a + 0.27 * p]];
    for (const [rr, aa] of pts) { const x = rr * Math.cos(aa), y = rr * Math.sin(aa); if (i === 0 && aa === a - 0.5 * p) s.moveTo(x, y); else s.lineTo(x, y); }
  }
  s.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0, Math.min(0.05, rf * 0.4), 0, Math.PI * 2, true); s.holes.push(hole);
  if (n >= 20) for (let k = 0; k < 5; k++) {
    const a = k * Math.PI * 2 / 5, rc = (rf + 0.08) / 2;
    const h = new THREE.Path(); h.absarc(Math.cos(a) * rc, Math.sin(a) * rc, (rf - 0.1) * 0.32, 0, Math.PI * 2, true); s.holes.push(h);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2, curveSegments: 16 });
  geo.translate(0, 0, -thick / 2);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, mat || P.steel));
  g.add(cyl(0.035, thick + 0.1, P.dark, [0, 0, 0], [Math.PI / 2, 0, 0], 16));
  g.r = r; g.n = n; g.pitch = p;
  return shadow(g);
}

// ---------- inverter: open aluminium case, 6 switches (2 per phase), DC in, 3 phases out ----------
export function inverter() {
  const P = paint();
  const g = new THREE.Group();
  const W = 1.3, D = 0.8;
  g.add(box(W, 0.04, D, P.alu, [0, 0, 0]));
  for (const z of [-1, 1]) g.add(box(W, 0.2, 0.03, P.alu, [0, 0.1, z * D / 2]));
  for (const x of [-1, 1]) g.add(box(0.03, 0.2, D, P.alu, [x * W / 2, 0.1, 0]));
  g.add(box(W - 0.1, 0.02, D - 0.1, P.pcb, [0, 0.03, 0]));
  // fins underneath
  for (let i = 0; i < 9; i++) g.add(box(0.02, 0.08, D - 0.1, P.alu, [-W / 2 + 0.1 + i * 0.137, -0.06, 0]));
  g.sw = [];
  const ledMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  for (let p = 0; p < 3; p++) for (let hi = 0; hi < 2; hi++) {
    const x = -0.3 + p * 0.3, z = hi ? -0.15 : 0.15;
    g.add(box(0.2, 0.07, 0.17, P.black, [x, 0.075, z]));
    for (let k = -1; k <= 1; k++) g.add(box(0.02, 0.04, 0.05, P.steel, [x + k * 0.06, 0.06, z + (hi ? -0.11 : 0.11)]));
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.09), ledMat()); led.position.set(x, 0.116, z); g.add(led);
    const gl = glowSprite(PHASE[p], 0.35); gl.position.set(x, 0.16, z); g.add(gl);
    g.sw.push({ led, gl, p, hi, c: new THREE.Color(PHASE[p]) });
  }
  // DC terminals on the left (+ red, - black), phase terminals on the right
  g.add(cyl(0.04, 0.08, P.red, [-W / 2 + 0.12, 0.08, -0.12])); g.add(cyl(0.04, 0.08, P.black, [-W / 2 + 0.12, 0.08, 0.12]));
  for (let p = 0; p < 3; p++) g.add(cyl(0.035, 0.08, materials().copper, [W / 2 - 0.12, 0.08, -0.22 + p * 0.22]));
  g.dcIn = V3(-W / 2 + 0.12, 0.14, -0.12);
  g.phaseOut = [0, 1, 2].map(p => V3(W / 2 - 0.12, 0.14, -0.22 + p * 0.22));
  // states: [[hiOn, loOn] x3]
  g.set = (states) => {
    for (const s of g.sw) {
      const on = states[s.p][s.hi ? 0 : 1];
      s.led.material.color.copy(on ? s.c.clone().multiplyScalar(2.6) : new THREE.Color(0.08, 0.08, 0.09));
      s.gl.material.opacity = on ? 0.9 : 0;
    }
  };
  return shadow(g);
}

// ---------- pedal + sensor + computer (for the close-up) ----------
export function pedalAssembly() {
  const P = paint();
  const g = new THREE.Group();
  // floor-hinged pedal: pivot at the heel end (origin), pad leaning back toward the driver (-z)
  g.pivot = new THREE.Group(); g.add(g.pivot);
  const pad = box(0.1, 0.018, 0.24, P.black, [0, 0, 0.12]); g.pivot.add(pad);
  for (let i = 0; i < 5; i++) g.pivot.add(box(0.09, 0.006, 0.012, P.grey, [0, 0.011, 0.03 + i * 0.045]));
  g.add(box(0.12, 0.05, 0.06, P.dark, [0, -0.02, 0]));
  // sensor housing beside the hinge with an LED
  g.add(box(0.06, 0.07, 0.07, P.grey, [0.09, 0.0, 0.0]));
  g.led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.5, 0.6), toneMapped: false }));
  g.led.position.set(0.09, 0.04, 0.03); g.add(g.led);
  return shadow(g);
}
export function computerBox() {
  const P = paint();
  const g = new THREE.Group();
  g.add(box(0.36, 0.08, 0.26, P.alu));
  g.add(box(0.3, 0.012, 0.2, P.pcb, [0, 0.046, 0]));
  g.add(box(0.08, 0.012, 0.08, P.black, [0.03, 0.056, 0]));
  g.leds = [];
  for (let i = 0; i < 4; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.012), new THREE.MeshBasicMaterial({ color: 0x223322, toneMapped: false }));
    l.position.set(-0.11 + i * 0.03, 0.058, 0.07); g.add(l); g.leds.push(l);
  }
  return shadow(g);
}

// ---------- tube along points (a wire or cable) ----------
export function wire(points, r = 0.008, mat) {
  const curve = new THREE.CatmullRomCurve3(points);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, r, 8), mat || paint().dark);
  m.curve = curve; m.castShadow = true;
  return m;
}

// ---------- road: tarmac strip along x with scrolling lane dashes, grass either side ----------
export function road() {
  const P = paint();
  const g = new THREE.Group();
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), P.grass); grass.rotation.x = -Math.PI / 2; grass.position.y = -0.02; grass.receiveShadow = true; g.add(grass);
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(800, 9), P.tarmac); rw.rotation.x = -Math.PI / 2; rw.position.y = -0.01; rw.receiveShadow = true; g.add(rw);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.PlaneGeometry(800, 0.15), P.lane); e.rotation.x = -Math.PI / 2; e.position.set(0, -0.005, s * 4.2); e.receiveShadow = true; g.add(e); }
  const dashes = new THREE.Group(); g.add(dashes);
  for (let i = -40; i < 40; i++) { const d = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.15), P.lane); d.rotation.x = -Math.PI / 2; d.position.set(i * 9, -0.004, 0); d.receiveShadow = true; dashes.add(d); }
  // trees for a sense of speed
  const trunk = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x4f9a45, roughness: 0.9 });
  const trees = new THREE.Group(); g.add(trees);
  for (let i = -30; i < 30; i++) {
    const t = new THREE.Group();
    t.add(cyl(0.12, 1.2, trunk, [0, 0.6, 0], [0, 0, 0], 8));
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), leaf); crown.position.y = 1.7; t.add(crown);
    const side = i % 2 ? 1 : -1;
    t.position.set(i * 13, 0, side * 12);
    trees.add(shadow(t));
  }
  g.scroll = (x) => { dashes.position.x = -(((x % 9) + 9) % 9); trees.position.x = -(((x % 26) + 26) % 26); };
  return g;
}
