import * as THREE from 'three';
import { makeHuman, lerpPose } from './human.js';
import { glowSprite, rippleOverlay } from './props.js';
import { car, carSeat, seatDriver, DRIVE, batteryPack, beads, motor, gear, inverter, pedalAssembly, computerBox, wire, road, wheel, paint, PHASE } from './ev.js';
import { kf, lerp, smooth, easeOut, easeIn, easeInOut, range, clamp, V, cam, place, shake, ikArm } from './anim.js';

export const DURATION = 55.3;

// [start, text, end?]  timed to audio/vo.words.json
export const CAPTIONS = [
  [0.00, 'When you press'], [0.56, 'the accelerator'], [1.28, 'in a Tesla'], [2.32, "there's no engine"], [3.20, 'to rev'],
  [4.00, 'and no cable'], [4.80, 'to pull'],
  [5.44, 'The pedal'], [6.00, 'is just'], [6.32, 'a sensor'], [7.20, 'telling a computer'], [8.24, 'how far'], [8.72, 'you pressed'],
  [9.44, 'Under the floor'], [10.48, 'thousands of'], [11.12, 'battery cells'], [12.00, 'hold the energy'],
  [12.88, 'But they'], [13.20, 'give out'], [13.60, 'direct current'], [14.72, 'and the motor'], [15.44, 'needs'], [15.76, 'alternating current'],
  [17.12, 'So the inverter'], [17.92, 'switches'], [18.32, 'that power'], [18.96, 'on and off'], [19.92, 'thousands of times'], [20.88, 'a second'],
  [21.44, 'It shapes it'], [22.16, 'into three waves'], [23.04, 'of current'], [23.92, 'one for each'], [24.64, 'set of'], [24.96, 'copper coils'], [25.84, 'in the motor'],
  [26.56, 'Together'], [27.04, 'they make'], [27.36, 'a magnetic field'], [28.40, 'that spins'], [29.20, 'around'], [29.52, 'inside the motor'],
  [30.64, 'The magnets'], [31.28, 'in the rotor'], [31.92, 'get dragged'], [32.56, 'along'], [33.12, 'so full force'], [34.08, 'arrives'], [34.56, 'instantly'],
  [35.52, 'even from'], [36.00, 'a standstill'],
  [36.80, 'The motor'], [37.28, 'can spin'], [37.84, 'at about'], [38.48, '18,000 RPM'], [40.48, 'so a'], [41.12, 'single-speed gearbox'], [42.24, 'slows it down'],
  [43.04, 'about'], [43.32, '9 to 1'],
  [44.24, 'And when you'], [44.56, 'lift your foot'], [45.52, 'the motor'], [46.08, 'becomes'], [46.40, 'a generator'], [47.36, 'and charges'], [48.08, 'the battery'],
  [48.88, 'So pressing'], [49.36, 'the pedal'], [49.92, 'really means'], [50.48, 'one thing'], [51.36, 'a spinning'], [52.00, 'magnetic field'], [53.20, 'pulling magnets'],
  [54.24, 'around', 55.08],
];
// [fadeInStart, fullStart, fullEnd, fadeOutEnd] to black, on the "But" turn
export const FADES = [[12.55, 12.76, 12.85, 13.08]];

const R_WHEEL = 0.36;

// move the sun (and its shadow box) with the action
function sunAt(scene, p, size = 6, dir = [-3, 6, 4]) {
  const k = scene.userData.key;
  k.position.set(p.x + dir[0] * 3, p.y + dir[1] * 3, p.z + dir[2] * 3);
  k.target.position.copy(p);
  const c = k.shadow.camera; c.left = c.bottom = -size; c.right = c.top = size; c.far = 80; c.updateProjectionMatrix();
}
// the car with a driver in the left front seat, hands on the wheel
function carWithDriver() {
  const C = car();
  const man = makeHuman('driver');
  seatDriver(C.seats[0], man);
  man.setMouth(0.1);
  return { C, man };
}
function handsOnWheel(C, man, pose = DRIVE) {
  man.setPose(pose);
  C.updateMatrixWorld(true);
  const fwd = V(1, 0.25, 0).applyQuaternion(C.getWorldQuaternion(new THREE.Quaternion()));
  for (const [side, gx] of [['l', 0.16], ['r', -0.16]]) {
    const tgt = C.steer.localToWorld(V(gx, 0.02, 0.02));
    const pole = C.localToWorld(V(-0.1, 0.55, gx > 0 ? -0.95 : 0.15));
    ikArm(man, side, tgt, pole, fwd);
  }
}
// spin the wheels for a travelled distance
function rollWheels(C, dist) { for (const w of C.wheels) w.spin(-dist / R_WHEEL); }

// ============ SHOT 1: the car on the road ============
function shot1({ makeStage }) {
  const scene = makeStage({ shadowSize: 4 });
  const rd = road(); rd.position.z = -2; scene.add(rd);
  const { C, man } = carWithDriver(); scene.add(C);
  sunAt(scene, V(0, 0, 0), 4);
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      const d = 14 * t;
      rd.scroll(d); rollWheels(C, d);
      C.position.y = Math.sin(t * 9) * 0.004;
      handsOnWheel(C, man);
      const k = easeInOut(range(t, 0, 2.4));
      place(c, [lerp(7.2, 5.6, k), lerp(0.7, 1.1, k), lerp(-4.6, -5.6, k)], [lerp(0.6, 0.1, k), 0.75, 0]);
      return { bloom: 0.35 };
    },
  };
}

// ============ SHOT 2: x-ray - no engine up front, no cable from the pedal ============
function shot2({ makeStage }) {
  const scene = makeStage({ shadowSize: 4 });
  const rd = road(); rd.position.z = -2; scene.add(rd);
  const { C, man } = carWithDriver(); scene.add(C);
  sunAt(scene, V(0, 0, 0), 4);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const d = 14 * (t + 2.32);
      rd.scroll(d); rollWheels(C, d);
      C.xray(smooth(range(t, 0.15, 0.85)));
      handsOnWheel(C, man);
      const k = easeInOut(range(t, 0, 3.1));
      // start over the empty front, drift back toward the driver's feet
      place(c, [lerp(6.2, 4.9, k), lerp(3.4, 2.8, k), lerp(-5.0, -4.8, k)], [lerp(0.9, 0.4, k), 0.5, 0]);
      return { bloom: 0.4 };
    },
  };
}

// ============ SHOT 3: the pedal is a sensor; a signal runs to the computer ============
function shot3({ makeStage }) {
  const scene = makeStage({ shadowSize: 1.2 });
  const P = paint();
  const seat = carSeat(); seat.position.set(0, 0.46, 0); scene.add(seat);
  const man = makeHuman('driver'); seatDriver(seat, man);
  man.setPose(DRIVE);
  scene.updateMatrixWorld(true);
  const an = man.j.rAn;
  const heel0 = an.localToWorld(V(0, -0.08, -0.03));
  const floorY = heel0.y - 0.03;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 2.4), P.dark); floor.position.set(0, floorY - 0.02, 0.6); floor.receiveShadow = true; scene.add(floor);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 1.6), P.grey); wall.position.set(0.62, floorY + 0.35, 0.7); wall.receiveShadow = true; scene.add(wall);
  const ped = pedalAssembly(); scene.add(ped);
  ped.position.set(heel0.x, floorY + 0.03, heel0.z);
  const ecu = computerBox(); ecu.position.set(heel0.x + 0.3, floorY + 0.32, heel0.z + 0.55); ecu.rotation.y = -0.6; scene.add(ecu);
  const from = V(heel0.x + 0.09, floorY + 0.06, heel0.z + 0.02);
  const W = wire([from, V(from.x + 0.08, floorY + 0.05, from.z + 0.15), V(from.x + 0.18, floorY + 0.2, from.z + 0.4), V(ecu.position.x - 0.1, ecu.position.y - 0.02, ecu.position.z - 0.1)], 0.007);
  scene.add(W);
  const pulses = beads(10, 0x6dff9a, 0.016); scene.add(pulses);
  sunAt(scene, V(0, floorY, 0.4), 1.2, [-3, 6, 4]);
  const TP = 0.75;
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const press = easeInOut(range(t, TP, TP + 0.55)) * 0.32;
      man.setPose({ ...DRIVE, rAn: [DRIVE.rAn[0] + press, 0, 0], rKn: [DRIVE.rKn[0] - press * 0.25, 0, 0] });
      man.setMouth(0.15);
      scene.updateMatrixWorld(true);
      const q = an.getWorldQuaternion(new THREE.Quaternion());
      ped.pivot.quaternion.copy(q);
      ped.pivot.position.set(0, 0, 0);
      const heel = an.localToWorld(V(0, -0.08, -0.03));
      ped.pivot.position.copy(ped.worldToLocal(heel.clone())).add(V(0, -0.012, 0));
      ped.led.material.color.setRGB(0.3, 2.5 * (0.3 + press * 2.2), 0.6);
      // signal pulses travel up the wire after the press
      pulses.set((i, n) => {
        const u = (t - TP - 0.15) * 0.75 - i * 0.07;
        return [W.curve.getPointAt(clamp(u, 0, 1)), u > 0 && u < 1 ? 1 : 0];
      });
      ecu.leds.forEach((l, i) => l.material.color.setRGB(...(t > TP + 1.5 + i * 0.12 ? [0.3, 2.4, 0.6] : [0.06, 0.12, 0.07])));
      const k = easeInOut(range(t, 0.2, 4));
      const look = V(lerp(heel0.x, heel0.x + 0.25, k), lerp(floorY + 0.12, floorY + 0.22, k), lerp(heel0.z + 0.12, heel0.z + 0.35, k));
      place(c, [heel0.x + lerp(-0.85, -1.15, k), floorY + lerp(0.4, 0.55, k), heel0.z + lerp(0.75, 1.0, k)], [look.x, look.y, look.z]);
      return { dof: { focus: c.position.distanceTo(look), aperture: 0.012, maxblur: 0.008 }, bloom: 0.55 };
    },
  };
}

// ============ SHOT 4: thousands of cells under the floor light up ============
function shot4({ makeStage }) {
  const scene = makeStage({ shadowSize: 4 });
  const rd = road(); rd.position.z = -2; scene.add(rd);
  const C = car(); scene.add(C);
  C.xray(1);
  C.inner.visible = false;      // interior out of the way, the pack in view
  sunAt(scene, V(0, 0, 0), 4);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const d = 14 * (t + 6);
      rd.scroll(d); rollWheels(C, d);
      const w = range(t, 0.6, 2.6);
      C.pack.glow((u, v) => smooth((w * 1.35 - (1 - u)) / 0.3) * (0.75 + 0.25 * Math.sin(t * 6 + v * 9 + u * 13)));
      const k = easeInOut(range(t, 0, 3.4));
      place(c, [lerp(2.2, 1.1, k), lerp(3.6, 1.7, k), lerp(-2.8, -1.7, k)], [lerp(-0.1, -0.25, k), 0.2, 0]);
      return { bloom: 0.6 };
    },
  };
}

// a straight row of beads from a to b, moving (speed in m/s)
function streamLine(a, b, t, speed, i, n) {
  const L = a.distanceTo(b);
  const u = ((i / n) * L + t * speed) % L / L;
  return [a.clone().lerp(b, u), 1];
}

// ============ SHOT 5: direct current into the motor - it only twitches ============
function shot5({ makeStage }) {
  const scene = makeStage({ shadowSize: 2.5 });
  const P = paint();
  const pk = batteryPack({ x0: -0.42, x1: 0.42, w: 0.6, nx: 12, nz: 8 }); pk.position.set(0, 0.5, 0.25); scene.add(pk);
  { const bx = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.66), P.dark); bx.position.set(0, -0.26, 0); bx.castShadow = bx.receiveShadow = true; pk.add(bx); }
  pk.glow(() => 0.8);
  const M = motor(); M.position.set(0, 1.7, 0); M.rotation.y = -0.3; scene.add(M);
  const a = V(0, 0.62, 0.3), b = V(0, 1.18, 0.2);
  const cab = wire([a, a.clone().lerp(b, 0.5), b], 0.012, P.orange); scene.add(cab);
  const dc = beads(14, 0xffc21a, 0.022); scene.add(dc);
  sunAt(scene, V(0, 1, 0), 2.5);
  const TON = 0.45;
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      const on = t > TON;
      dc.set((i, n) => { const [p] = streamLine(a, b, t, 0.45, i, n); return [p.add(V(0, 0, 0.03)), on ? 1 : 0]; });
      M.static(on ? smooth(range(t, TON, TON + 0.2)) : 0);
      // the rotor snaps to the fixed field, wobbles, and stays put
      const tt = Math.max(0, t - TON - 0.1);
      const ang = t < TON + 0.1 ? 0.6 : Math.PI / 2 + (0.6 - Math.PI / 2) * Math.exp(-tt * 3) * Math.cos(tt * 14);
      M.rotor.rotation.z = ang;
      const k = easeInOut(range(t, 0, 4.2));
      const s = shake(t, 1.2, 3);
      place(c, [lerp(0.6, 0.3, k) + s[0], lerp(2.1, 1.9, k) + s[1], lerp(5.0, 4.5, k)], [0, lerp(1.0, 1.1, k), 0]);
      return { bloom: 0.55 };
    },
  };
}

// PWM: phase p with modulation m at time t, carrier frequency fc
function pwm(t, p, fc = 7, f = 0.45) {
  const duty = 0.5 + 0.45 * Math.sin(2 * Math.PI * f * t - p * 2 * Math.PI / 3);
  const tri = Math.abs(((t * fc) % 1) * 2 - 1);
  return duty > tri;
}
// a travelling sine of beads along +x from x0 to x1 at height y0, depth z
function waveBeads(t, p, i, n, o) {
  const u = i / (n - 1);
  const x = lerp(o.x0, o.x1, u);
  const y = o.y0 + o.amp * Math.sin(2 * Math.PI * (o.k * (x - o.x0) * o.dir - o.f * t) + p * 2 * Math.PI / 3);
  return [V(x, y, o.z), 1];
}

// ============ SHOT 6: the inverter flicks its switches, three waves come out ============
function shot6({ makeStage }) {
  const scene = makeStage({ shadowSize: 2 });
  const P = paint();
  const G = new THREE.Group(); G.rotation.y = -Math.PI / 2; scene.add(G);   // local +x (phase outputs) points at the camera
  const inv = inverter(); inv.position.set(0, 0.6, 0); G.add(inv);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.9), P.dark); stand.position.set(0, 0.3, 0); stand.receiveShadow = stand.castShadow = true; G.add(stand);
  const dcA = V(-2.2, 0.74, -0.12), dcB = inv.position.clone().add(inv.dcIn);
  G.add(wire([dcA, dcB], 0.014, P.orange));
  const dc = beads(22, 0xffc21a, 0.024); G.add(dc);
  const outs = [0, 1, 2].map(p => { const b = beads(60, PHASE[p], 0.02); G.add(b); return b; });
  sunAt(scene, V(0, 0.6, 0.5), 2);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const st = [0, 1, 2].map(p => { const h = pwm(t, p); return [h, !h]; });
      inv.set(st);
      dc.set((i, n) => streamLine(dcA, dcB, t, 0.7, i, n));
      outs.forEach((b, p) => {
        const o0 = inv.position.clone().add(inv.phaseOut[p]);
        b.set((i, n) => {
          const [q, s] = waveBeads(t, p, i, n, { x0: o0.x + 0.05, x1: o0.x + 1.7, y0: o0.y + 0.08, amp: 0.1, k: 0.9, f: 0.45, z: o0.z * 1.6, dir: -1 });
          return [q, s * smooth((q.x - o0.x) / 0.25)];
        });
      });
      const k = easeInOut(range(t, 0, 4.3));
      place(c, [lerp(2.0, 1.4, k), lerp(2.7, 2.2, k), lerp(3.4, 3.2, k)], [0.1, 0.55, lerp(0.3, 0.55, k)]);
      return { bloom: 0.6 };
    },
  };
}

// ============ SHOT 7: three waves feed the coils ============
function shot7({ makeStage }) {
  const scene = makeStage({ shadowSize: 2 });
  const M = motor(); M.position.set(0, 0.85, 0); M.rotation.y = -0.25; scene.add(M);
  const waves = [0, 1, 2].map(p => { const b = beads(70, PHASE[p], 0.022); scene.add(b); return b; });
  sunAt(scene, V(0, 0.9, 0), 2);
  const W = 1.6;
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      const th = W * t + 0.4;
      M.drive(th, smooth(range(t, 0.2, 0.8)));
      M.rotor.rotation.z = th - 0.7;
      // three waves come down from above into the top of the motor
      waves.forEach((b, p) => {
        b.set((i, n) => {
          const u = i / (n - 1);
          const y = lerp(1.38, 3.1, u);
          const ph = 2 * Math.PI * (0.8 * y) - W * t + p * 2 * Math.PI / 3;
          const x = (p - 1) * 0.3 + 0.08 * Math.cos(ph);
          return [V(x, y, -0.05), smooth((t * 1.2 - (3.1 - y) * 0.4) / 0.3)];
        });
      });
      const k = easeInOut(range(t, 0, 5.1));
      place(c, [lerp(1.2, 0.6, k), lerp(1.5, 1.2, k), lerp(4.3, 3.6, k)], [0, lerp(1.45, 1.2, k), 0]);
      return { bloom: 0.6 };
    },
  };
}

// ============ SHOT 8: the magnetic field spins around ============
function shot8({ makeStage }) {
  const scene = makeStage({ shadowSize: 2 });
  const M = motor(); M.position.set(0, 0.9, 0); scene.add(M);
  M.field.visible = true;
  sunAt(scene, V(0, 0.9, 0), 2);
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      const th = 2.3 * t + 1.2;
      M.drive(th, 1);
      M.rotor.rotation.z = th - 0.55;
      M.fieldMat.opacity = 0.9 * smooth(range(t, 0.3, 0.8));
      const k = easeInOut(range(t, 0, 4.1));
      place(c, [lerp(0.9, 0.4, k), lerp(1.5, 1.1, k), lerp(2.9, 2.6, k)], [0, 0.9, 0]);
      return { bloom: 0.65 };
    },
  };
}

// ============ SHOT 9: the rotor is dragged along, faster and faster ============
function shot9({ makeStage }) {
  const scene = makeStage({ shadowSize: 2 });
  const M = motor(); M.position.set(0, 0.9, 0); M.rotation.y = 0.25; scene.add(M);
  M.field.visible = true;
  sunAt(scene, V(0, 0.9, 0), 2);
  const c = cam(36);
  return {
    scene, camera: c,
    update(t) {
      const th = 2.3 * (t + 4.08) + 1.2 + 2.2 * t * t;
      M.drive(th, 1);
      M.rotor.rotation.z = th - 0.5 - 0.15 * t;
      const k = easeInOut(range(t, 0, 2.5));
      const s = shake(t, 1 + 2 * t, 5);
      place(c, [lerp(-0.85, -0.6, k) + s[0], lerp(1.3, 1.1, k) + s[1], lerp(3.1, 2.7, k)], [0, 0.85, 0]);
      return { bloom: 0.65 };
    },
  };
}

// ============ SHOT 10: full force from a standstill ============
function shot10({ makeStage }) {
  const scene = makeStage({ shadowSize: 4 });
  const rd = road(); rd.position.z = -2; scene.add(rd);
  const { C, man } = carWithDriver(); scene.add(C);
  C.solid[1].opacity = 0.32;
  const torso = man.j.chest.children[0];
  const rp = rippleOverlay(torso);
  const rp2 = rippleOverlay(C.seats[0].back);
  sunAt(scene, V(0, 0, 0), 4);
  const TL = 0.35, A = 10;
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      const tt = Math.max(0, t - TL);
      const d = 0.5 * A * tt * tt;
      rd.scroll(d); rollWheels(C, d);
      const g = smooth(range(t, TL, TL + 0.25));
      C.rotation.z = 0.025 * g * (1 - 0.3 * smooth(range(t, TL + 1, TL + 2.5)));
      handsOnWheel(C, man, { ...DRIVE, spine: [DRIVE.spine[0] - 0.08 * g, 0, 0], neck: [DRIVE.neck[0] - 0.3 * g, 0, 0], head: [-0.1 * g, 0, 0] });
      man.setMouth(0.15 + 0.55 * g);
      for (const [r, cx, amp] of [[rp, V(0, 0.08, -0.08), 1], [rp2, V(0, 0, 0.05), 0.9]]) {
        const u = r.material.uniforms;
        u.uCenter.value.copy(cx); u.uAmp.value = amp * smooth(range(t, TL, TL + 0.2)) * (1 - smooth(range(t, TL + 2, TL + 3)));
        u.uRadius.value = 0.05 + easeOut(range(t, TL, TL + 1.2)) * 0.5; u.uSpot.value = 0.06; u.uTime.value = t; u.uRings.value = 70;
      }
      const s = shake(t, 1 + 6 * g * Math.exp(-tt * 1.5), 7);
      const k = easeInOut(range(t, 0, 3.6));
      place(c, [lerp(2.4, 3.0, k) + s[0] * 3, lerp(1.7, 1.5, k) + s[1] * 3, lerp(-4.6, -5.2, k)], [lerp(0.0, -0.3, k), 0.85, -0.3]);
      return { bloom: 0.4 };
    },
  };
}

// ============ SHOT 11: 18,000 rpm, two gear stages take it down about 9 to 1 ============
function shot11({ makeStage }) {
  const scene = makeStage({ shadowSize: 1.5 });
  const P = paint();
  const rig = new THREE.Group(); rig.position.set(0, 0.8, 0); scene.add(rig);
  const m = 0.015, T = 0.045;
  const A = gear(10, m, T), B = gear(30, m, T), Cg = gear(10, m, T), D = gear(30, m, T);
  const rA = A.r, rB = B.r;
  A.position.set(0, 0, 0); B.position.set(rA + rB, 0, 0); Cg.position.set(rA + rB, 0, 0.055); D.position.set(2 * (rA + rB), 0, 0.055);
  rig.add(A, B, Cg, D);
  const M = motor(); M.scale.setScalar(0.24); M.position.set(0, 0, -0.1); rig.add(M);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.62, 16), P.steel); shaft.rotation.x = Math.PI / 2; shaft.position.set(D.position.x, 0, 0.36); rig.add(shaft);
  const Wh = wheel(1); Wh.position.set(D.position.x, 0, 0.72); rig.add(Wh);
  // gearbox base plate
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.5), P.alu); base.position.set(0.3, -0.42, 0.05); base.receiveShadow = true; rig.add(base);
  sunAt(scene, V(0.3, 0.8, 0.2), 1.5);
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      const wA = 9 + 3 * Math.sin(t * 0.3);
      const phA = wA * t;
      const pB = B.pitch, pD = D.pitch;
      const phB = Math.PI + pB / 2 - (10 / 30) * phA;
      const phD = Math.PI + pD / 2 - (10 / 30) * phB;
      A.rotation.z = phA; B.rotation.z = phB; Cg.rotation.z = phB; D.rotation.z = phD;
      Wh.spin(phD);
      M.rotor.rotation.z = phA; M.drive(phA + 0.5, 1);
      const k = easeInOut(range(t, 0.3, 7.0));
      place(c, [lerp(-0.2, 1.0, k), lerp(1.05, 1.7, k), lerp(0.7, 2.3, k)], [lerp(0.02, 0.36, k), lerp(0.8, 0.72, k), lerp(0.0, 0.3, k)]);
      return { dof: { focus: c.position.distanceTo(V(lerp(0.02, 0.36, k), 0.8, 0.1)), aperture: 0.006, maxblur: 0.006 }, bloom: 0.5 };
    },
  };
}

// ============ SHOT 12: lift off - the motor generates and charges the battery ============
function shot12({ makeStage }) {
  const scene = makeStage({ shadowSize: 4 });
  const rd = road(); rd.position.z = -2; scene.add(rd);
  const { C, man } = carWithDriver(); scene.add(C);
  C.xray(1);
  const flow = beads(40, 0x48ff8a, 0.022); scene.add(flow);
  // path: motor -> inverter -> cable -> along the pack toward the front
  const path = new THREE.CatmullRomCurve3([
    V(-1.12, 0.38, 0.18), V(-1.15, 0.58, 0.05), V(-1.25, 0.66, 0.05), V(-1.42, 0.4, 0.1), V(-1.3, 0.3, 0.12), V(-0.6, 0.3, 0.12), V(0.55, 0.3, 0.12),
  ]);
  sunAt(scene, V(0, 0, 0), 4);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const v = lerp(18, 11, range(t, 0, 4.6));
      const d = 18 * t - 0.5 * (7 / 4.6) * t * t;
      rd.scroll(d); rollWheels(C, d);
      handsOnWheel(C, man);
      const g = smooth(range(t, 0.3, 0.9));
      M_glow(C.motor, t, g);
      flow.set((i, n) => {
        const u = ((t * 0.35 + i / n) % 1);
        return [path.getPointAt(u), g];
      });
      const fill = range(t, 0.8, 4.4);
      C.pack.glow((u) => smooth((fill * 1.3 - u) / 0.3), new THREE.Color(0.3, 2.4, 0.8));
      const k = easeInOut(range(t, 0, 4.6));
      place(c, [lerp(-0.6, 0.4, k), lerp(3.0, 2.6, k), lerp(-6.0, -5.6, k)], [lerp(-0.6, -0.3, k), 0.4, 0]);
      return { bloom: 0.55 };
    },
  };
}
function M_glow(M, t, g) { M.drive(t * 6, g); M.rotor.rotation.z = t * 6 - 0.4; }

// ============ SHOT 13: press again - the car pulls away ============
function shot13({ makeStage }) {
  const scene = makeStage({ shadowSize: 5 });
  const rd = road(); rd.position.z = -2; scene.add(rd);
  const { C, man } = carWithDriver(); scene.add(C);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const x = 2 * t + 2.2 * t * t;
      C.position.x = x; rollWheels(C, x);
      handsOnWheel(C, man);
      sunAt(scene, V(x, 0, 0), 5);
      place(c, [-5.5, 1.1, 2.0], [x * 0.75 + 0.5, 0.7, 0]);
      return { bloom: 0.35 };
    },
  };
}

// ============ SHOT 14: the answer - a spinning field pulling magnets around ============
function shot14({ makeStage }) {
  const scene = makeStage({ shadowSize: 2 });
  const M = motor(); M.position.set(0, 0.9, 0); scene.add(M);
  M.field.visible = true;
  sunAt(scene, V(0, 0.9, 0), 2);
  const c = cam(36);
  return {
    scene, camera: c,
    update(t) {
      const th = 3.2 * t + 0.5;
      M.drive(th, 1);
      M.rotor.rotation.z = th - 0.45;
      const a = lerp(-0.6, 0.35, easeInOut(range(t, 0, 4)));
      const r = lerp(3.0, 2.5, easeInOut(range(t, 0, 4)));
      place(c, [Math.sin(a) * r, 1.15, Math.cos(a) * r], [0, 0.9, 0]);
      return { bloom: 0.7 };
    },
  };
}

export const SHOTS = [
  { start: 0.0, end: 2.32, build: shot1 },
  { start: 2.32, end: 5.44, build: shot2 },
  { start: 5.44, end: 9.44, build: shot3 },
  { start: 9.44, end: 12.85, build: shot4 },
  { start: 12.85, end: 17.12, build: shot5 },
  { start: 17.12, end: 21.44, build: shot6 },
  { start: 21.44, end: 26.56, build: shot7 },
  { start: 26.56, end: 30.64, build: shot8 },
  { start: 30.64, end: 33.12, build: shot9 },
  { start: 33.12, end: 36.8, build: shot10 },
  { start: 36.8, end: 44.24, build: shot11 },
  { start: 44.24, end: 48.88, build: shot12 },
  { start: 48.88, end: 51.36, build: shot13 },
  { start: 51.36, end: DURATION + 1, build: shot14 },
];
