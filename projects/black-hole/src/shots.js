import * as THREE from 'three';
import { glowSprite } from './props.js';
import {
  spaceStage, astronaut, skyRot, GALAXY_DIR, TWIN_DIR, photonPath, lightTube, partial, ringMarker,
  holeBall, galaxy, horizonGrid, ship, arrow, pointY, streamDust,
} from './space.js';
import { kf, lerp, smooth, easeOut, easeIn, easeInOut, range, clamp, V, cam, place, shake } from './anim.js';

export const DURATION = 50.5;

// [start, text, end?]  timed to audio/vo.words.json, trimmed by hand
export const CAPTIONS = [
  [0.00, 'As you fall'], [0.64, 'toward a'], [1.04, 'black hole'], [1.84, 'the universe'], [2.56, 'starts looking'], [3.28, 'very strange'],
  [4.40, 'Its gravity'], [5.04, 'bends light'], [6.08, 'so the stars'], [6.88, 'behind it'], [7.36, 'smear into'], [8.00, 'glowing arcs'], [8.88, 'and rings'],
  [9.68, 'You can even'], [10.08, 'see the same'], [10.72, 'star twice'],
  [11.76, 'Closer in'], [12.64, 'the black shadow'], [13.44, 'swells'], [13.84, 'to fill your view'], [14.96, 'and starlight'], [15.76, 'piles up'],
  [16.32, 'in a thin'], [16.96, 'bright ring'], [17.60, 'at its edge'],
  [18.48, 'But what happens'], [19.20, 'next'], [19.52, 'depends on'], [20.08, 'its size'],
  [20.80, 'A small'], [21.28, 'black hole'], [22.16, 'a few times'], [22.88, "the Sun's mass"], [24.08, 'pulls on'], [24.64, 'your feet'],
  [25.12, 'much harder'], [25.68, 'than your head'],
  [26.40, "You'd be"], [26.80, 'stretched'], [27.12, 'like spaghetti'], [28.00, 'and torn apart'], [29.04, 'before you'], [29.44, 'even reach'], [30.00, 'the edge'],
  [30.72, 'A giant one'], [31.76, 'like the monster'], [32.64, 'at the center'], [33.20, 'of our galaxy'], [34.32, 'is much'], [34.80, 'gentler'],
  [35.52, "You'd cross"], [36.00, 'the event'], [36.56, 'horizon'], [37.20, 'in one piece'], [38.24, 'without feeling'], [39.04, 'anything'], [39.52, 'special'],
  [40.16, 'But now'], [40.64, 'every path'], [41.36, 'leads inward'], [42.40, 'Not even'], [42.80, 'light'], [43.12, 'can get out'],
  [43.84, 'And a friend'], [44.40, 'watching'], [44.80, 'from far away'], [45.68, 'would see you'], [46.24, 'slow down'], [47.20, 'freeze'],
  [47.68, 'at the edge'], [48.48, 'and fade'], [48.96, 'into red', 50.05],
];
// [fadeInStart, fullStart, fullEnd, fadeOutEnd] to black: the "But" turn, and out at the end
export const FADES = [[18.2, 18.4, 18.48, 18.66], [49.9, 50.4, 51, 51]];

// ---------- helpers ----------
const UP = V(0, 1, 0);
// a floating astronaut inside a holder group centred on the body (so it can tumble and stretch about its middle)
function floater(opts) {
  const man = astronaut(opts);
  const holder = new THREE.Group(); holder.add(man.root); man.root.position.y = -1.0;
  man.holder = holder;
  return man;
}
function floatPose(man, t, o = {}, k = 1) {
  const s = Math.sin(t * 1.1), c = Math.cos(t * 0.9);
  man.setPose({
    lSh: [0.25 + 0.1 * s * k, 0, 0.75 + 0.1 * c * k], rSh: [0.2 - 0.1 * c * k, 0, -0.75 - 0.1 * s * k],
    lEl: [-0.5, 0, 0], rEl: [-0.55, 0, 0],
    lHip: [-0.25 + 0.08 * c * k, 0, 0.14], rHip: [0.05 - 0.08 * s * k, 0, -0.14],
    lKn: [0.5, 0, 0], rKn: [0.35, 0, 0], lAn: [0.2, 0, 0], rAn: [0.2, 0, 0],
    ...o,
  });
}
// world rotation that maps world direction w to sky direction s (so a sky feature appears in direction w)
function skyAlign(w, s, yaw = 0, pitch = 0) {
  const q = new THREE.Quaternion().setFromUnitVectors(w.clone().normalize(), s.clone().normalize());
  const m = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));
  return m.multiply(skyRot(yaw, pitch));
}
const sunAt = (scene, p, dir = [-4, 3, 5], size = 3) => {
  const k = scene.userData.key;
  k.position.set(p.x + dir[0], p.y + dir[1], p.z + dir[2]); k.target.position.copy(p);
  const c = k.shadow.camera; c.left = c.bottom = -size; c.right = c.top = size; c.updateProjectionMatrix();
};
const FWD = V(0, 0, -1);
const GAL_ON_AXIS = skyAlign(FWD, GALAXY_DIR);

// ============ SHOT 1: an astronaut drifts toward a black hole; the sky around it is warped ============
function shot1({ makeStage }) {
  const M = 40;
  const { scene, lens } = spaceStage(makeStage, { M, bh: V(0, 0, -M * 70) });
  lens.mat.uniforms.uRot.value = skyAlign(FWD, GALAXY_DIR, 0.05, 0.02);
  const man = floater(); scene.add(man.holder);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const k = easeInOut(range(t, 0, 4.4));
      const z = lerp(0, -M * 8, k);              // the whole group drifts in
      const A = V(0.55, -1.0, z - 3.6);
      man.holder.position.copy(A);
      man.holder.rotation.set(-0.1 + 0.05 * Math.sin(t), -Math.PI / 2 + 0.55 + 0.08 * Math.sin(t * 0.7), 0.1);
      // he looks around: up at the warped sky, then at the hole
      const look = kf(t, [[0, [-0.15, -0.5]], [1.6, [-0.35, 0.35]], [2.9, [-0.25, -0.25]], [4.4, [-0.3, 0.1]]]);
      floatPose(man, t, { neck: [look[0] * 0.6, look[1] * 0.6, 0], head: [look[0] * 0.4, look[1] * 0.4, 0] });
      man.setMouth(0.3 + 0.25 * smooth(range(t, 2.8, 3.4)));
      sunAt(scene, A, [-4, 3, 4], 2);
      const s = shake(t, 0.8, 2);
      place(c, [0.05 + s[0], 0.0 + s[1], z + lerp(0.4, 0, k)], [0.55, -0.32 * 4, z - 4], -0.04);
      lens.update(c);
      return { bloom: 0.7 };
    },
  };
}

// ============ SHOT 2: "Its gravity bends light" - a light ray curves around the hole to the astronaut ============
function shot2({ makeStage }) {
  const M = 1;
  const { scene, lens } = spaceStage(makeStage, { M, bh: V(0, 0, 0) });
  lens.mat.uniforms.uRot.value = skyRot(1.3, 0.4);
  lens.mat.uniforms.uGain.value = 0.55;
  const obs = V(-1.2, -13, 0);
  const { pts, look } = photonPath(obs, V(0, 0, 0), M, 0.52, V(1, 0, 0), 30);
  const lightPts = pts.slice().reverse();            // star -> observer
  const star = glowSprite(0xfff1c0, 3.2); star.position.copy(lightPts[0]); scene.add(star);
  const starCore = glowSprite(0xffffff, 1.2); starCore.position.copy(lightPts[0]); scene.add(starCore);
  const ghost = glowSprite(0xfff1c0, 2.6); ghost.position.copy(obs.clone().addScaledVector(look, 30)); scene.add(ghost);
  const ray = lightTube(0xffe39a, 0.16); scene.add(ray);
  const dots = [];
  for (let i = 1; i <= 26; i++) { const d = glowSprite(0xfff1c0, 0.55); d.position.copy(obs.clone().addScaledVector(look, 2 + i * 1.08)); scene.add(d); dots.push(d); }
  const man = floater(); man.holder.scale.setScalar(3.6); scene.add(man.holder);
  man.holder.position.copy(obs).add(V(0, -2.4, 0));
  man.holder.rotation.set(0.1, 0.25, -0.35);
  const c = cam(34);
  return {
    scene, camera: c,
    update(t) {
      floatPose(man, t + 3, { neck: [-0.3, 0, -0.2], head: [-0.3, 0, -0.1] }, 0.5);
      man.setMouth(0.25);
      const k = easeInOut(range(t, 0.1, 1.05));
      ray.setPoints(partial(lightPts, Math.max(0.02, k)));
      const g = smooth(range(t, 1.1, 1.45));
      dots.forEach((d, i) => { d.material.opacity = 0.75 * smooth(range(t, 1.05 + i * 0.012, 1.15 + i * 0.012)); });
      ghost.material.opacity = 0.9 * g; ghost.scale.setScalar(2.6 + 0.3 * Math.sin(t * 8) * g);
      star.scale.setScalar(3.2 + 0.25 * Math.sin(t * 6));
      sunAt(scene, man.holder.position, [-6, 4, 8], 4);
      const m = easeOut(range(t, 0, 1.68));
      place(c, [lerp(-4, 1, m), 4, lerp(100, 92, m)], [1.5, 4, 0]);
      lens.update(c);
      return { bloom: 0.8 };
    },
  };
}

// ============ SHOT 3: "the stars behind it smear into glowing arcs and rings" - a galaxy slides behind the hole ============
function shot3({ makeStage }) {
  const { scene, lens } = spaceStage(makeStage, { M: 1, bh: V(0, 0, 0) });
  const c = cam(52);
  return {
    scene, camera: c,
    update(t) {
      const k = easeInOut(range(t, 0, 3.0));
      lens.mat.uniforms.uRot.value = skyAlign(FWD, GALAXY_DIR, lerp(-0.42, 0, k), lerp(0.1, 0, k));
      const s = shake(t, 1, 3);
      place(c, [s[0] * 10, s[1] * 10, lerp(64, 58, easeOut(range(t, 0, 3.6)))], [0, 0, 0], lerp(0.12, -0.05, k));
      lens.update(c);
      return { bloom: 0.9 };
    },
  };
}

// ============ SHOT 4: "You can even see the same star twice" - two rings mark two images of one star ============
function shot4({ makeStage }) {
  const { scene, lens } = spaceStage(makeStage, { M: 1, bh: V(0, 0, 0) });
  const w = V(0.06, Math.tan(0.13), -1).normalize();
  lens.mat.uniforms.uRot.value = skyAlign(w, TWIN_DIR);
  const rings = [ringMarker(0x7fd4ff, 1), ringMarker(0x7fd4ff, 1)];
  rings.forEach(r => scene.add(r));
  const c = cam(50);
  return {
    scene, camera: c,
    update(t) {
      const s = shake(t, 1, 5);
      place(c, [s[0] * 10, s[1] * 10, lerp(58, 55, easeOut(range(t, 0, 2.1)))], [0, -2.5, 0], -0.05);
      lens.update(c);
      const ims = lens.images(c, TWIN_DIR, 10);
      rings.forEach((r, i) => {
        const p = smooth(range(t, 1.04 + i * 0.28, 1.3 + i * 0.28));
        if (ims[i]) r.position.copy(ims[i]);
        r.visible = !!ims[i] && p > 0;
        r.scale.setScalar((0.9 + 0.8 * (1 - p)) * (1 + 0.05 * Math.sin(t * 9)));
        r.material.opacity = p;
      });
      return { bloom: 0.9 };
    },
  };
}

// ============ SHOT 5a: "Closer in, the black shadow swells to fill your view" (first person) ============
function shot5a({ makeStage }) {
  const { scene, lens } = spaceStage(makeStage, { M: 1, bh: V(0, 0, 0) });
  lens.mat.uniforms.uRot.value = GAL_ON_AXIS;
  const c = cam(50);
  return {
    scene, camera: c,
    update(t) {
      const k = easeInOut(range(t, 0, 3.2));
      const r = 58 * Math.pow(12.5 / 58, k);
      const s = shake(t, 1 + 2 * k, 4);
      place(c, [s[0] * 4, s[1] * 4, r], [0, 0, 0], 0.25 * k);
      lens.update(c);
      return { bloom: 0.9 };
    },
  };
}

// ============ SHOT 5b: "starlight piles up in a thin bright ring at its edge" - the astronaut against the edge ============
function shot5b({ makeStage }) {
  const { scene, lens } = spaceStage(makeStage, { M: 1, bh: V(0, 0, 0), sunDir: [3, -2, 6] });
  lens.mat.uniforms.uRot.value = GAL_ON_AXIS;
  const man = floater(); scene.add(man.holder);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const k = easeInOut(range(t, 0, 3.52));
      const r = lerp(7.4, 6.4, k);
      const P = V(0, 0, r);
      const dn = V(0, -Math.sin(0.62), -Math.cos(0.62));
      const A = P.clone().addScaledVector(dn, 3.8).add(V(0.15, -0.55, 0));
      man.holder.position.copy(A);
      man.holder.rotation.set(0.25, -0.9 + 0.1 * Math.sin(t * 0.6), -0.1);
      floatPose(man, t + 1, { neck: [-0.35, 0.1, 0], head: [-0.25, 0, 0] });
      man.setMouth(0.35);
      sunAt(scene, A, [3, -2, 6], 2);
      const s = shake(t, 1, 6);
      place(c, [P.x + s[0], P.y + s[1], P.z], P.clone().addScaledVector(dn, 4).toArray(), 0.05 * Math.sin(t * 0.5));
      lens.update(c);
      return { bloom: 0.9 };
    },
  };
}

// ============ SHOT 6: "But what happens next depends on its size" - small hole and giant hole ============
function shot6({ makeStage }) {
  const { scene, lens } = spaceStage(makeStage, { M: 1, bh: V(0, 0, -1e6) });
  lens.mat.uniforms.uLens.value = 0; lens.mat.uniforms.uGain.value = 0.7;
  const small = holeBall(0.32); small.position.set(0.0, 1.55, 0); scene.add(small);
  const big = holeBall(9); big.position.set(0, -9.6, -7); scene.add(big);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const k = easeInOut(range(t, 0.3, 1.9));
      small.scale.setScalar(1 + 0.12 * Math.sin(t * 5) * smooth(range(t, 0.4, 0.8)) * (1 - k));
      big.ringMat.uniforms.uK.value = smooth(range(t, 1.2, 1.8));
      small.ring.material.uniforms.uK.value = 1;
      place(c, [lerp(0.3, 0, k), lerp(1.6, 1.2, k), lerp(3.2, 13, k)], [0, lerp(1.55, -0.6, k), 0]);
      lens.update(c);
      return { bloom: 0.8 };
    },
  };
}

// ---------- small black hole scene: hole at the origin, horizon radius 2M = 0.5 ----------
function smallHole(makeStage) {
  const M = 0.25;
  const { scene, lens } = spaceStage(makeStage, { M, bh: V(0, 0, 0), sunDir: [-4, 3, 5] });
  lens.mat.uniforms.uRot.value = skyRot(2.2, -0.3);
  const man = floater(); scene.add(man.holder);
  return { scene, lens, man, M };
}
// feet-first fall pose: arms flailing up
function fallPose(man, t, panic = 1) {
  const w = Math.sin(t * 7) * 0.35 * panic, v = Math.cos(t * 6.3) * 0.3 * panic;
  man.setPose({
    lSh: [-0.2 + w * 0.5, 0, 2.3 + w], rSh: [-0.2 - v * 0.5, 0, -2.3 + v], lEl: [-0.5, 0, 0], rEl: [-0.5, 0, 0],
    lHip: [-0.15 + 0.2 * v, 0, 0.12], rHip: [0.1 - 0.2 * w, 0, -0.12], lKn: [0.3 + 0.2 * w, 0, 0], rKn: [0.3 - 0.2 * v, 0, 0],
    neck: [0.35, 0, 0], head: [0.25, 0, 0],
  });
}

// ============ SHOT 7a: "A small black hole, a few times the Sun's mass" - he falls feet first toward it ============
function shot7a({ makeStage }) {
  const { scene, lens, man } = smallHole(makeStage);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const y = lerp(4.6, 3.4, easeIn(range(t, 0, 3.28)) * 0.5 + range(t, 0, 3.28) * 0.5);
      man.holder.position.set(0, y, 0);
      man.holder.rotation.set(0, 0.6 + 0.15 * t, 0.06 * Math.sin(t * 1.3));
      fallPose(man, t, 0.6 + 0.4 * smooth(range(t, 1, 2)));
      man.setMouth(0.5 + 0.3 * smooth(range(t, 1, 1.5)));
      sunAt(scene, man.holder.position, [-4, 3, 5], 2);
      const k = easeInOut(range(t, 0, 3.28));
      place(c, [lerp(2.6, 3.2, k), lerp(5.6, 3.6, k), lerp(5.6, 7.4, k)], [0, lerp(3.5, 1.9, k), 0]);
      lens.update(c);
      return { bloom: 0.8 };
    },
  };
}

// ============ SHOT 7b: "pulls on your feet much harder than your head" - two force arrows ============
function shot7b({ makeStage }) {
  const { scene, lens, man } = smallHole(makeStage);
  const feetA = arrow(0xff3b30, 1, 0.045), headA = arrow(0xff3b30, 1, 0.045);
  scene.add(feetA, headA);
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      man.holder.position.set(0, 3.1, 0);
      man.holder.rotation.set(0, 0.9, 0.04 * Math.sin(t * 1.3));
      fallPose(man, t + 3, 1);
      man.setMouth(0.7);
      man.root.updateMatrixWorld(true);
      // feet at y ~ 2.1, head at ~ 3.85 (pull grows like 1/r^3, shown much exaggerated)
      const fA = 0.35 + 0.75 * easeOut(range(t, 0.72, 1.2));
      const hA = 0.35 + 0.12 * easeOut(range(t, 1.6, 2.0));
      feetA.setLen(fA); headA.setLen(hA);
      const on = smooth(range(t, 0.0, 0.3));
      feetA.position.set(0.62, 2.35, 0.3); pointY(feetA, V(0, -1, 0)); feetA.scale.setScalar(on);
      headA.position.set(0.62, 4.0, 0.3); pointY(headA, V(0, -1, 0)); headA.scale.setScalar(on);
      sunAt(scene, man.holder.position, [-4, 3, 5], 2);
      const s = shake(t, 2, 7);
      place(c, [2.3 + s[0], 3.0 + s[1], 4.2], [0.2, 2.85, 0]);
      lens.update(c);
      return { bloom: 0.9 };
    },
  };
}

// ============ SHOT 8: "stretched like spaghetti and torn apart before you even reach the edge" ============
function shot8({ makeStage }) {
  const { scene, lens, man, M } = smallHole(makeStage);
  const grid = horizonGrid(2 * M, 0x4fd2ff); grid.mat.uniforms.uLines.value.set(24, 12); scene.add(grid);
  const dust = streamDust(700, [1, 0.92, 0.85]); scene.add(dust);
  const dust2 = streamDust(400, [0.6, 0.85, 1], 11); scene.add(dust2);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const st = easeIn(range(t, 0.3, 1.0)) * 1.2 + easeIn(range(t, 0.7, 1.7)) * 2.6;   // stretch factor - 1
      const sy = 1 + st, sx = 1 / Math.sqrt(1 + st * 0.9);
      const cy = 3.0 - 0.55 * st;
      man.holder.position.set(0, cy, 0);
      man.holder.scale.set(sx, sy, sx);
      man.holder.rotation.set(0, 0.9, 0);
      fallPose(man, t + 6, 1 - smooth(range(t, 0.6, 1.4)) * 0.8);
      man.setMouth(0.7);
      // torn apart: the noodle fades into a stream of dust pouring toward the hole
      const tear = smooth(range(t, 1.7, 2.3));
      man.redshift(0, tear);
      man.holder.visible = tear < 0.99;
      const top = V(0, cy + 1.0 * sy, 0), bot = V(0, cy - 1.0 * sy, 0);
      const fall = easeIn(range(t, 1.8, 4.3));
      const a = top.clone().lerp(V(0, 0.55, 0), fall * 0.8), b = bot.clone().lerp(V(0, 0.0, 0), Math.min(1, fall * 1.4));
      dust.visible = dust2.visible = tear > 0;
      dust.update(a, b, tear, t * 0.6); dust2.update(a, b, tear * 0.8, t * 0.45 + 0.3);
      grid.mat.uniforms.uK.value = 0.8 * smooth(range(t, 2.6, 3.2));
      sunAt(scene, man.holder.position, [-4, 3, 5], 4);
      const k = easeInOut(range(t, 2.4, 4.0));
      place(c, [lerp(2.4, 3.3, k), lerp(2.9, 2.6, k), lerp(5.6, 9.5, k)], [0, lerp(2.5, 1.7, k), 0]);
      lens.update(c);
      return { bloom: 0.9 };
    },
  };
}

// ---------- giant black hole below: M = 60 world units, the astronaut floats calmly above it ----------
function giantScene(makeStage) {
  const M = 60;
  const bh = V(0, -M * 5.2, 0);
  const { scene, lens } = spaceStage(makeStage, { M, bh, sunDir: [-4, 4, 5] });
  lens.mat.uniforms.uRot.value = skyRot(0.6, 0.9);
  const man = floater(); scene.add(man.holder);
  return { scene, lens, man, M, bh };
}
const LOUNGE = { lSh: [0.1, 0, 0.35], rSh: [0.1, 0, -0.35], lEl: [-0.9, 0, 0], rEl: [-0.9, 0, 0], lHip: [-0.6, 0, 0.05], rHip: [-0.5, 0.3, -0.05], lKn: [0.9, 0, 0], rKn: [1.1, 0, 0], neck: [0.1, 0, 0], head: [0.05, 0.1, 0.1] };

// ============ SHOT 9a: "A giant one" - the shadow below is enormous, the astronaut tiny ============
function shot9a({ makeStage }) {
  const { scene, lens, man } = giantScene(makeStage);
  const c = cam(42);
  return {
    scene, camera: c,
    update(t) {
      man.holder.position.set(0, 0, 0);
      man.holder.rotation.set(0.15, 2.4 + 0.08 * t, 0.15);
      floatPose(man, t, { neck: [0.3, 0, 0], head: [0.25, 0, 0] }, 0.6);
      man.setMouth(0.4);
      sunAt(scene, V(0, 0, 0), [-4, 4, 5], 2);
      const k = easeOut(range(t, 0, 1.92));
      place(c, [lerp(1.2, 2.8, k), lerp(1.4, 3.4, k), lerp(3.2, 7.5, k)], [0, lerp(-0.2, -1.6, k), 0]);
      lens.update(c);
      return { bloom: 0.8 };
    },
  };
}

// ============ SHOT 9b: "like the monster at the center of our galaxy" ============
function shot9b({ makeStage }) {
  const { scene, lens } = spaceStage(makeStage, { M: 1, bh: V(0, 0, -1e6) });
  lens.mat.uniforms.uLens.value = 0; lens.mat.uniforms.uGain.value = 0.45;
  const gal = galaxy({ R: 10 }); gal.rotation.set(0.0, 0, 0.1); scene.add(gal);
  const mark = ringMarker(0xffffff, 1); scene.add(mark);
  const hole = holeBall(0.12, 0xffc58a); scene.add(hole);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      gal.rotation.y = -0.05 * t;
      const k = easeInOut(range(t, 0, 1.68));
      const p = smooth(range(t, 0.45, 0.9));
      const d = lerp(30, 1.6, k);
      place(c, [0, d * 0.62, d * 0.8], [0, 0, 0], 0.15);
      mark.scale.setScalar(d * 0.09 * (1 + 0.6 * (1 - p)));
      mark.material.opacity = p * (1 - smooth(range(t, 1.3, 1.68)));
      hole.scale.setScalar(Math.max(1, d * 0.06));
      hole.visible = k > 0.5;
      gal.core.material.opacity = lerp(0.75, 0.25, k);
      lens.update(c);
      return { bloom: 1.0 };
    },
  };
}

// ============ SHOT 9c: "is much gentler" - he relaxes; two tiny, equal pull arrows ============
function shot9c({ makeStage }) {
  const { scene, lens, man } = giantScene(makeStage);
  const a1 = arrow(0xff3b30, 0.3, 0.03), a2 = arrow(0xff3b30, 0.3, 0.03); scene.add(a1, a2);
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      man.holder.position.set(0, 0, 0);
      man.holder.rotation.set(-0.35, 0.5, 0.0);
      const k = smooth(range(t, 0.0, 0.6));
      const base = { lSh: [0.25, 0, 0.75], rSh: [0.2, 0, -0.75], lEl: [-0.5, 0, 0], rEl: [-0.55, 0, 0], lHip: [-0.25, 0, 0.14], rHip: [0.05, 0, -0.14], lKn: [0.5, 0, 0], rKn: [0.35, 0, 0] };
      const p = {};
      for (const j of new Set([...Object.keys(base), ...Object.keys(LOUNGE)])) p[j] = [0, 1, 2].map(i => lerp((base[j] || [0, 0, 0])[i], (LOUNGE[j] || [0, 0, 0])[i], k));
      man.setPose(p);
      man.setMouth(0.05);
      man.root.updateMatrixWorld(true);
      const on = smooth(range(t, 0.5, 0.8));
      const dn = V(0, -1, 0);
      a1.position.copy(man.j.head.localToWorld(V(0.32, 0.25, 0))); pointY(a1, dn); a1.scale.setScalar(on);
      a2.position.copy(man.j.lKn.localToWorld(V(0.3, -0.1, 0))); pointY(a2, dn); a2.scale.setScalar(on);
      sunAt(scene, V(0, 0, 0), [-4, 4, 5], 2);
      const m = easeInOut(range(t, 0, 1.2));
      place(c, [lerp(1.9, 1.6, m), lerp(0.8, 0.6, m), lerp(4.4, 4.0, m)], [0, 0.0, 0]);
      lens.update(c);
      return { bloom: 0.8 };
    },
  };
}

// ============ SHOT 10: "You'd cross the event horizon in one piece, without feeling anything special" ============
function shot10({ makeStage }) {
  const M = 50;
  const { scene, lens } = spaceStage(makeStage, { M, bh: V(0, 0, 0), sunDir: [-3, 4, 4] });
  lens.mat.uniforms.uRot.value = skyRot(0.6, 0.9);
  const grid = horizonGrid(2 * M, 0x4fd2ff); grid.mat.uniforms.uLines.value.set(360, 180); scene.add(grid);
  const man = floater(); scene.add(man.holder);
  const c = cam(40);
  // the astronaut falls along -z toward the hole, feet first; "up" for him is +z
  const upQ = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(0, 0, 1));
  return {
    scene, camera: c,
    update(t) {
      // crosses r = 2M (z = 100) at t ~ 1.2 s ("horizon")
      const z = 2 * M + 1.4 - 1.25 * t - 0.06 * t * t;
      const A = V(0, 0, z);
      man.holder.position.copy(A);
      man.holder.quaternion.copy(upQ).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, 2.36 + 0.05 * t, 0)));
      const wave = smooth(range(t, 1.7, 2.0)) * (1 - smooth(range(t, 2.6, 2.9)));
      const shrug = smooth(range(t, 2.8, 3.2));
      floatPose(man, t, {
        rSh: [lerp(0.2, -0.3, wave) + shrug * -0.1, 0, lerp(-0.75, -2.7, wave) + 0.4 * Math.sin(t * 14) * wave],
        rEl: [-0.55 - 0.6 * wave, 0, 0],
        lSh: [0.25 + shrug * 0.2, 0, 0.75 + shrug * 0.3],
        neck: [-0.3, 0.2 * shrug, 0], head: [-0.2, 0, 0.15 * shrug],
      }, 0.5);
      man.setMouth(0.15 + 0.25 * wave);
      grid.mat.uniforms.uK.value = 0.9;
      sunAt(scene, A, [-3, 4, 4], 2);
      const cz = Math.max(2.03 * M, z + 4.6);
      const k = easeInOut(range(t, 0, 4.64));
      place(c, [lerp(2.6, 3.0, k), lerp(2.6, 2.2, k), cz], [0, 0, z - 0.4]);
      lens.update(c);
      return { bloom: 0.8 };
    },
  };
}

// ============ SHOT 11: "But now every path leads inward. Not even light can get out." ============
function shot11({ makeStage }) {
  const { scene, lens } = spaceStage(makeStage, { M: 1, bh: V(0, -1e6, 0), sunDir: [-3, 2, 5] });
  lens.mat.uniforms.uLens.value = 0; lens.mat.uniforms.uDim.value = 0.88; lens.mat.uniforms.uTint.value.set(1.0, 0.45, 0.4);
  const man = floater(); scene.add(man.holder);
  const center = glowSprite(0xff4020, 6); center.position.set(0, -14, 0); center.material.opacity = 0.5; scene.add(center);
  const N = 9, paths = [], heads = [];
  for (let i = 0; i < N; i++) {
    const tb = lightTube(0xffd27a, 0.025); scene.add(tb); paths.push(tb);
    const h = arrow(0xffd27a, 0.25, 0.03); h.mat.color.set(0xffd27a); h.mat.emissive.set(0xffb040); scene.add(h); heads.push(h);
  }
  const beam = lightTube(0xfffbe0, 0.05); scene.add(beam);
  const beamHead = glowSprite(0xffffff, 0.6); scene.add(beamHead);
  const c = cam(42);
  const bez = (p0, p1, p2, s) => p0.clone().multiplyScalar((1 - s) ** 2).addScaledVector(p1, 2 * (1 - s) * s).addScaledVector(p2, s * s);
  return {
    scene, camera: c,
    update(t) {
      man.holder.position.set(0, 0, 0);
      man.holder.rotation.set(0, 0.5, 0.05 * Math.sin(t));
      const arm = smooth(range(t, 1.8, 2.3));
      floatPose(man, t, { rSh: [lerp(0.2, -2.9, arm), 0, lerp(-0.75, -0.2, arm)], rEl: [lerp(-0.55, -0.1, arm), 0, 0], neck: [-0.2 * arm, 0, 0] }, 0.4);
      man.setMouth(0.3);
      man.root.updateMatrixWorld(true);
      const chest = man.j.chest.localToWorld(V(0, 0.2, 0.2));
      const end = V(0, -14, 0);
      const grow = easeOut(range(t, 0.45, 1.6));
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2 + 0.3;
        const dir = V(Math.cos(a), 0.9 * Math.sin(a) + 0.15, 0.6 * Math.sin(a * 2 + 1)).normalize();
        const p1 = chest.clone().addScaledVector(dir, 5.5);
        const pts = []; for (let s = 0; s <= 40; s++) pts.push(bez(chest.clone().addScaledVector(dir, 0.35), p1, end, s / 40 * grow * 0.55));
        paths[i].setPoints(pts); paths[i].mat.opacity = 0.85 * smooth(range(t, 0.4, 0.7));
        const tip = pts[pts.length - 1], pre = pts[pts.length - 3];
        heads[i].position.copy(tip); pointY(heads[i], tip.clone().sub(pre)); heads[i].visible = grow > 0.05;
      }
      // the flashlight beam shoots up, then curls back inward
      const hand = man.j.rWr.localToWorld(V(0, -0.08, 0));
      const bk = easeOut(range(t, 2.25, 3.3));
      const bp = []; for (let s = 0; s <= 50; s++) bp.push(bez(hand, hand.clone().add(V(0.4, 9, 0.6)), end, s / 50 * bk * 0.62));
      beam.setPoints(bp); beam.visible = bk > 0.01; beamHead.position.copy(bp[bp.length - 1]); beamHead.visible = bk > 0.01;
      sunAt(scene, V(0, 0, 0), [-3, 2, 5], 2);
      const m = easeInOut(range(t, 0, 3.68));
      place(c, [lerp(3.2, 4.2, m), lerp(1.6, 3.4, m), lerp(8.5, 10.5, m)], [0, lerp(-0.6, 0.6, m), 0]);
      lens.update(c);
      return { bloom: 1.0 };
    },
  };
}

// ============ SHOT 12a: "And a friend watching from far away" - a second astronaut by a ship ============
function shot12a({ makeStage }) {
  const M = 2;
  const { scene, lens } = spaceStage(makeStage, { M, bh: V(14, 12, -160), sunDir: [-3, 3, 6] });
  lens.mat.uniforms.uRot.value = GAL_ON_AXIS;
  const sh = ship(); sh.position.set(-0.5, -0.2, -2.2); sh.rotation.set(0.15, -0.4, 0.35); sh.scale.setScalar(1.3); scene.add(sh);
  const fr = floater({ accent: 0x1e8cff }); scene.add(fr.holder);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      fr.holder.position.set(1.3, 0.2, 0.6);
      fr.holder.rotation.set(-0.1, 2.3, 0.05);
      const hold = { rSh: [-1.0, 0, -0.5], rEl: [-1.3, 0, 0], lSh: [-0.6, 0, 0.9], lEl: [-0.6, 0, 0] };
      floatPose(fr, t, { ...hold, neck: [-0.15, 0, 0], head: [-0.1, -0.15, 0] }, 0.3);
      fr.setMouth(0.1 + 0.25 * smooth(range(t, 1.8, 2.2)));
      sh.flame.scale.setScalar(0.8 + 0.1 * Math.sin(t * 20));
      sunAt(scene, V(0, 0, 0), [-3, 3, 6], 3);
      const k = easeInOut(range(t, 0, 2.4));
      place(c, [lerp(2.9, 2.5, k), lerp(1.3, 1.1, k), lerp(6.4, 5.8, k)], [lerp(0.1, 0.3, k), lerp(1.0, 1.2, k), -4]);
      lens.update(c);
      return { bloom: 0.8 };
    },
  };
}

// ============ SHOT 12b: "slow down, freeze at the edge, and fade into red" - the friend's view ============
function shot12b({ makeStage }) {
  const M = 1;
  const { scene, lens } = spaceStage(makeStage, { M, bh: V(0, 0, 0), sunDir: [-3, 3, 6] });
  lens.mat.uniforms.uRot.value = GAL_ON_AXIS;
  const man = floater(); scene.add(man.holder);
  const glow = glowSprite(0xff2a10, 0.8); scene.add(glow);
  const c = cam(30);
  return {
    scene, camera: c,
    update(t) {
      // he approaches the edge of the shadow ever more slowly: distance shrinks exponentially
      const d = 0.45 + 3.2 * Math.exp(-t * 1.35);
      const A = V(-d * 0.55, 5.6 + d * 0.8, 7.0);
      man.holder.position.copy(A);
      man.holder.rotation.set(0.3, 0.6 - 0.25 * (1 - Math.exp(-t)), 0.6);
      const freeze = 1 - Math.exp(-t * 1.2);
      floatPose(man, t * (1 - freeze * 0.95), { lSh: [0.25, 0, 2.3], neck: [0.1, 0, 0] }, 1 - freeze);
      man.setMouth(0.2);
      const red = smooth(range(t, 0.6, 3.0)), fade = smooth(range(t, 2.4, 3.9));
      man.redshift(red, fade);
      glow.position.copy(A); glow.material.opacity = 0.6 * red * (1 - fade);
      glow.scale.setScalar(1.6);
      sunAt(scene, A, [-3, 3, 6], 2);
      const k = easeInOut(range(t, 0, 4.2));
      place(c, [0, 0, lerp(40, 34, k)], [lerp(-0.6, -0.4, k), lerp(4.6, 5.0, k), 0]);
      lens.update(c);
      return { bloom: 0.9 };
    },
  };
}

export const SHOTS = [
  { start: 0.00, end: 4.40, build: shot1 },
  { start: 4.40, end: 6.08, build: shot2 },
  { start: 6.08, end: 9.68, build: shot3 },
  { start: 9.68, end: 11.76, build: shot4 },
  { start: 11.76, end: 14.96, build: shot5a },
  { start: 14.96, end: 18.48, build: shot5b },
  { start: 18.48, end: 20.80, build: shot6 },
  { start: 20.80, end: 24.08, build: shot7a },
  { start: 24.08, end: 26.40, build: shot7b },
  { start: 26.40, end: 30.72, build: shot8 },
  { start: 30.72, end: 32.64, build: shot9a },
  { start: 32.64, end: 34.32, build: shot9b },
  { start: 34.32, end: 35.52, build: shot9c },
  { start: 35.52, end: 40.16, build: shot10 },
  { start: 40.16, end: 43.84, build: shot11 },
  { start: 43.84, end: 46.24, build: shot12a },
  { start: 46.24, end: 50.50, build: shot12b },
];
