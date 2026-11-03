import * as THREE from 'three';
import { makeHuman, lerpPose } from './human.js';
import { glowSprite, sparks, streak, rippleOverlay } from './props.js';
import { jet, ejectionSeat, seatPilot, SIT, parachute, flame, smoke, cloud, airfield, paint } from './jet.js';
import { kf, lerp, smooth, easeOut, easeIn, easeInOut, range, clamp, V, cam, place, shake, ikArm } from './anim.js';

export const DURATION = 51.9;

// [start, text, end?]  timed to audio/vo.words.json
export const CAPTIONS = [
  [0.00, 'If your L-39'], [1.28, 'jet is'], [1.92, 'going down'], [2.80, 'you pull'], [3.28, 'one double handle'],
  [4.24, 'at the front'], [4.72, 'of your seat'], [5.60, 'After that'], [6.32, 'everything is'], [6.88, 'automatic'],
  [7.84, 'First'], [8.32, 'small explosive'], [9.28, 'charges'], [9.92, 'blow the canopy'], [10.80, 'away'],
  [11.28, 'Then a'], [11.52, 'powder charge'], [12.40, 'fires the seat'], [13.28, 'up its rails'], [14.32, 'and a rocket'],
  [15.04, 'under the seat'], [15.76, 'lifts you higher'], [16.64, 'The kick'], [17.12, 'can reach'], [17.68, '17 g'],
  [18.48, 'A tiny'], [19.04, 'stabilizing chute'], [20.24, 'keeps the seat'], [20.96, 'from tumbling'],
  [21.76, 'Then the seat'], [22.40, 'falls away'], [23.36, 'and a big'], [23.92, 'main parachute'], [24.88, 'lowers you'],
  [25.44, 'at about'], [25.96, '6 meters'], [26.64, 'per second'], [27.28, 'But it only'], [27.76, 'works within'],
  [28.40, 'limits'], [29.04, 'On the ground'], [29.92, 'the jet must'], [30.72, 'be doing'], [31.12, 'at least'],
  [31.58, '150 km/h'], [34.00, 'so the canopy'], [34.88, 'clears properly'], [35.92, 'In a spin'],
  [36.72, 'the manual says'], [37.60, 'eject before'], [38.67, '1,500 meters'], [40.00, 'And with'], [40.32, 'two pilots'],
  [41.20, 'a blocking system'], [42.16, 'stops both seats'], [43.28, 'firing at once'], [44.48, "so they can't"],
  [45.20, 'collide'], [45.84, 'So one pull'], [46.64, 'starts a'], [47.04, 'chain reaction'], [48.16, 'that ends'],
  [48.80, 'with you hanging'], [49.60, 'safely under'], [50.24, 'a parachute', 51.4],
];
// [fadeInStart, fullStart, fullEnd, fadeOutEnd] to black, on the "But" turn
export const FADES = [[26.95, 27.18, 27.3, 27.52]];

const ALT = 120;            // flying shots happen high above the shadow ground
const SPEED = 41.7;         // 150 km/h in m/s, used for the runway roll

// move the sun (and its shadow box) with the action
function sunAt(scene, p, size = 6, dir = [-3, 6, 4]) {
  const k = scene.userData.key;
  k.position.set(p.x + dir[0] * 3, p.y + dir[1] * 3, p.z + dir[2] * 3);
  k.target.position.copy(p);
  const c = k.shadow.camera; c.left = c.bottom = -size; c.right = c.top = size; c.far = 80; c.updateProjectionMatrix();
}
// a field of clouds that slides past (vel in m/s), wrapping inside a box around centre
function cloudField(scene, centre, n, spread, seed = 1, scale = 2) {
  const cs = [];
  for (let i = 0; i < n; i++) {
    const r = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; const f = (a) => (Math.sin(r * a) * 0.5 + 0.5);
    const c = cloud(seed * 10 + i, scale * (0.7 + f(1.3) * 0.8));
    c.userData.p0 = V((f(2.1) - 0.5) * spread[0], (f(3.7) - 0.5) * spread[1], (f(5.3) - 0.5) * spread[2]).add(centre);
    scene.add(c); cs.push(c);
  }
  const wrap = (v, a) => ((v + a / 2) % a + a) % a - a / 2;
  return (t, vel) => {
    for (const c of cs) {
      const p = c.userData.p0;
      c.position.set(centre.x + wrap(p.x - centre.x + vel.x * t, spread[0]), centre.y + wrap(p.y - centre.y + vel.y * t, spread[1]), centre.z + wrap(p.z - centre.z + vel.z * t, spread[2]));
    }
  };
}
// pilot hands to the handle (or resting on the thighs)
function handsTo(seat, man, k) {
  seat.updateMatrixWorld(true);
  for (const [s, side] of [[1, 'l'], [-1, 'r']]) {
    const rest = V(s * 0.16, 0.2, 0.22), grip = V(s * 0.04, 0.08 + 0.12 * Math.max(0, k - 1), 0.3 + 0.03 * Math.max(0, k - 1));
    const p = rest.clone().lerp(grip, Math.min(1, k));
    ikArm(man, side, seat.localToWorld(p), seat.localToWorld(V(s * 0.5, 0.25, -0.05)), V(0, -0.4, 1).applyQuaternion(seat.getWorldQuaternion(new THREE.Quaternion())));
  }
}
// pilot + seat, ready to go
function seatWithPilot(face = 0.1) {
  const seat = ejectionSeat();
  const man = makeHuman('pilot');
  seatPilot(seat, man);
  man.setMouth(face);
  return { seat, man };
}
// seat motion relative to the cockpit after the catapult fires (tau seconds), slowed by `slow`
function ejectPath(tau, slow = 1) {
  const u = Math.max(0, tau) * slow;
  const cat = Math.min(u, 0.18);                       // catapult stroke
  let y = 1.0 * (cat / 0.18) ** 2;
  let x = 0;
  if (u > 0.18) { const v = u - 0.18; y += 9 * v + 14 * v * v; x = -2.2 * v * v - 0.6 * v; }
  return { x, y, pitch: -0.1 - Math.min(0.35, Math.max(0, u - 0.18) * 0.5) };
}

// ============ SHOT 1: the jet in trouble, trailing smoke ============
function shot1({ makeStage }) {
  const scene = makeStage({ shadowSize: 8 });
  const J = jet(); J.position.set(0, ALT, 0); scene.add(J);
  const { seat, man } = seatWithPilot(0.05); seat.position.copy(J.seatFront); seat.rotation.y = Math.PI / 2; J.add(seat);
  sunAt(scene, J.position, 8);
  const sm = smoke(70, { color: 0x4a4a4e, size: 0.7, grow: 2.2, life: 2.2, every: 0.03, drift: 0.6, opacity: 0.75, wind: V(-38, 0.5, 0) }); scene.add(sm);
  const fire = glowSprite(0xff7a30, 1.0); scene.add(fire);
  const clouds = cloudField(scene, V(0, ALT - 14, 0), 14, [160, 14, 80], 2, 2.5);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const bank = Math.sin(t * 1.3) * 0.12 - 0.15, bob = Math.sin(t * 2.1) * 0.15;
      J.position.set(0, ALT + bob, 0); J.rotation.set(bank, 0, -0.06 + Math.sin(t * 1.7) * 0.03);
      man.setPose({ ...SIT, neck: [0.05, Math.sin(t * 2) * 0.3, 0] });
      clouds(t, V(-38, 0, 0));
      J.updateMatrixWorld(true);
      const ex = () => J.localToWorld(J.exhaust.clone());
      sm.update(t + 3, () => ex());
      fire.position.copy(ex()); fire.material.opacity = 0.6 + 0.3 * Math.sin(t * 40); fire.scale.setScalar(1.1 + 0.3 * Math.sin(t * 23));
      const k = easeInOut(range(t, 0, 2.8));
      const s = shake(t, 3);
      place(c, [lerp(14, 11, k) + s[0] * 10, ALT + lerp(3.5, 2.2, k) + s[1] * 10, lerp(9, 6.5, k)], [lerp(1.6, 2.2, k), ALT + 0.4, 0]);
      return { bloom: 0.5 };
    },
  };
}

// cockpit interior: side walls, instrument panel with glowing dials
function cockpit(scene) {
  const P = paint();
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 2.2), P.grey); w.position.set(s * 0.46, 0.15, 0.2); g.add(w);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 1.4), P.dark); ledge.position.set(s * 0.38, 0.2, 0.1); g.add(ledge);
  }
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.36, 0.12), P.dark); panel.position.set(0, 0.62, 1.3); panel.rotation.x = 0.25; g.add(panel);
  const dials = [];
  for (let i = 0; i < 6; i++) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), new THREE.MeshBasicMaterial({ color: i === 4 ? 0xff3b2f : 0x9fe6a0, toneMapped: false }));
    d.position.set(-0.27 + (i % 3) * 0.27, 0.68 - Math.floor(i / 3) * 0.13, 1.23); d.rotation.x = 0.25 + Math.PI; g.add(d); dials.push(d);
  }
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.5, 12), P.dark); stick.position.set(0, 0.05, 0.62); stick.rotation.x = -0.2; g.add(stick);
  scene.add(g);
  return { g, dials };
}

// ============ SHOT 2: hands go to the double handle and pull ============
function shot2({ makeStage }) {
  const scene = makeStage({ shadowSize: 2 });
  const { seat, man } = seatWithPilot(0.05);
  seat.position.set(0, ALT, 0); scene.add(seat);
  const ck = cockpit(scene); ck.g.position.copy(seat.position);
  sunAt(scene, seat.position, 2, [-2, 6, 3]);
  const warn = new THREE.PointLight(0xff3020, 0, 2); warn.position.set(0, ALT + 0.7, 0.75); scene.add(warn);
  const c = cam(52);
  return {
    scene, camera: c,
    update(t) {
      const reach = easeInOut(range(t, 0.25, 1.0)), pull = easeOut(range(t, 1.25, 1.55));
      const brace = smooth(range(t, 0.0, 0.8));
      man.setPose({ ...SIT, spine: [-0.06 + 0.08 * reach, 0, 0], chest: [0.04 + 0.06 * reach - 0.1 * pull, 0, 0], neck: [lerp(0.05, 0.35, reach) - 0.25 * pull, 0, 0], head: [0.1 * reach, 0, 0] });
      handsTo(seat, man, reach + pull);
      seat.handle.position.set(0, 0.02 + 0.12 * pull, 0.27 + 0.03 * pull);
      man.setMouth(lerp(0.05, 0.35, brace) + 0.3 * pull);
      ck.dials[4].material.color.setHex(Math.sin(t * 14) > 0 ? 0xff3b2f : 0x401010);
      warn.intensity = Math.sin(t * 14) > 0 ? 2 : 0.3;
      const k = easeInOut(range(t, 0, 2.8));
      const s = shake(t, 1 + 6 * Math.exp(-Math.max(0, t - 1.5) * 4) * (t > 1.5 ? 1 : 0), 2);
      place(c, [lerp(0.4, 0.32, k) + s[0], ALT + lerp(1.2, 1.12, k) + s[1], lerp(1.15, 1.05, k)], [0, ALT + lerp(0.8, 0.6, reach), 0.05]);
      return { dof: { focus: c.position.distanceTo(V(0, ALT + 0.4, 0.2)), aperture: 0.01, maxblur: 0.01 }, bloom: 0.5 };
    },
  };
}

// canopy jettison motion relative to the jet (tau seconds after the charges fire)
function jettison(canopy, home, tau, side = 1) {
  if (tau <= 0) { canopy.position.copy(home); canopy.rotation.set(0, 0, 0); return; }
  canopy.position.set(home.x - 9 * tau * tau, home.y + 7 * tau - 3 * tau * tau, home.z + side * 0.6 * tau);
  canopy.rotation.set(side * 0.8 * tau, 0.3 * tau, 2.6 * tau);
}

// ============ SHOT 3: "everything is automatic" -> canopy blows off ============
function shot3({ makeStage }) {
  const scene = makeStage({ shadowSize: 8 });
  const J = jet(); J.position.set(0, ALT, 0); scene.add(J);
  const { seat, man } = seatWithPilot(0.4); seat.position.copy(J.seatFront); seat.rotation.y = Math.PI / 2; J.add(seat);
  const empty = ejectionSeat(); empty.position.copy(J.seatRear); empty.rotation.y = Math.PI / 2; J.add(empty);
  sunAt(scene, J.position, 8);
  const homeF = J.canopyFront.position.clone(), homeR = J.canopyRear.position.clone();
  const TJ = 4.3;
  const sp = sparks(120, { speed: 4, spread: 1.4, gravity: -3, life: 0.6, size: 0.12, seed: 5, dir: V(0, 1, 0) }); J.add(sp); sp.position.set(1.8, 0.7, 0);
  const flash = glowSprite(0xffc070, 2); J.add(flash); flash.position.set(1.8, 0.8, 0);
  const sm = smoke(30, { color: 0xcfcfcf, size: 0.5, grow: 2, life: 1.6, every: 0.02, drift: 0.8, opacity: 0.7, wind: V(-14, 0, 0), seed: 8 }); scene.add(sm);
  const clouds = cloudField(scene, V(0, ALT - 16, 0), 14, [160, 12, 80], 3, 2.5);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const slow = t < TJ ? t : TJ + (t - TJ) * 0.45;    // slow motion after the charges fire
      const tau = slow - TJ;
      J.position.set(0, ALT + Math.sin(t * 2.1) * 0.08, 0); J.rotation.set(-0.08, 0, -0.04);
      man.setPose({ ...SIT, chest: [-0.06, 0, 0], neck: [-0.1, 0, 0] });
      handsTo(seat, man, 2);
      seat.handle.position.set(0, 0.14, 0.3);
      man.setMouth(0.45 + (tau > 0 ? 0.3 : 0));
      jettison(J.canopyFront, homeF, tau, 1); jettison(J.canopyRear, homeR, tau * 0.95, -1);
      sp.update(tau);
      flash.material.opacity = tau > 0 ? Math.max(0, 1 - tau * 4) : 0; flash.scale.setScalar(1 + tau * 6);
      J.updateMatrixWorld(true);
      sm.update(Math.max(0, tau), (te) => J.localToWorld(V(1.8 + (te % 0.1) * 6 - 0.3, 0.75, ((te * 37) % 1 - 0.5) * 0.8)), 0, 0.3);
      sm.visible = tau > 0;
      clouds(t, V(-38, 0, 0));
      const k = easeInOut(range(t, 0, TJ));
      const s = shake(t, 1 + (tau > 0 ? 8 * Math.exp(-tau * 3) : 0), 4);
      const pull = easeOut(range(tau, 0, 1.2));
      place(c, [lerp(6.5, 4.8, k) + 1.2 * pull + s[0] * 5, ALT + lerp(2.6, 1.9, k) + 1.4 * pull + s[1] * 5, lerp(5.2, 3.6, k) + 1.5 * pull], [lerp(2.0, 1.9, k) - 0.6 * pull, ALT + 0.9 + 1.2 * pull, 0]);
      return { bloom: 0.55 };
    },
  };
}

// ============ SHOT 4: catapult fires the seat up the rails, then the rocket lights ============
function shot4({ makeStage }) {
  const scene = makeStage({ shadowSize: 6 });
  const J = jet(); J.position.set(0, ALT, 0); scene.add(J);
  J.canopyFront.visible = J.canopyRear.visible = false;
  const empty = ejectionSeat(); empty.position.copy(J.seatRear); empty.rotation.y = Math.PI / 2; J.add(empty);
  const { seat, man } = seatWithPilot(0.5); J.add(seat); seat.rotation.y = Math.PI / 2;
  const fl = flame(1.6); seat.add(fl); fl.position.copy(seat.nozzle);
  const cat = glowSprite(0xffd090, 1.2); J.add(cat); cat.position.copy(J.seatFront);
  const sm = smoke(60, { color: 0xd8d8d8, size: 0.45, grow: 1.8, life: 2.0, every: 0.03, drift: 0.35, opacity: 0.7, wind: V(-6, 0, 0), seed: 6 }); scene.add(sm);
  const clouds = cloudField(scene, V(0, ALT - 18, 0), 14, [160, 12, 80], 4, 2.5);
  const T0 = 0.6, TR = 3.36;              // catapult fires, rocket lights (local)
  const c = cam(42);
  return {
    scene, camera: c,
    update(t) {
      // slow motion: the catapult stroke stretched over ~2.7 s, then the rocket
      let tau;
      if (t < T0) tau = 0;
      else if (t < TR) tau = (t - T0) / (TR - T0) * 0.18;
      else tau = 0.18 + (t - TR) * 0.12;
      const p = ejectPath(tau);
      sunAt(scene, V(1.5, ALT + p.y, 0), 6);
      seat.position.set(J.seatFront.x + p.x, J.seatFront.y + p.y, 0);
      seat.rotation.set(0, Math.PI / 2, 0); seat.rotateX(p.pitch * 0.4);
      const g = t > T0 ? smooth(range(t, T0, T0 + 0.4)) : 0;
      man.setPose({ ...SIT, chest: [-0.12 * g, 0, 0], neck: [-0.15 * g, 0, 0], head: [0.1 * g, 0, 0] });
      handsTo(seat, man, 2);
      seat.handle.position.set(0, 0.14, 0.3);
      man.setMouth(0.4 + 0.4 * g);
      const rk = t > TR ? smooth(range(t, TR, TR + 0.15)) : 0;
      fl.set(rk, t);
      cat.material.opacity = t > T0 ? Math.max(0, 1 - (t - T0) * 0.6) * (t < TR ? 1 : 0.2) : 0;
      cat.position.set(J.seatFront.x + p.x * 0.5, J.seatFront.y + 0.1, 0);
      J.updateMatrixWorld(true);
      sm.update(t, (te) => {
        if (te < TR) return J.localToWorld(V(J.seatFront.x, J.seatFront.y + 0.1, 0));
        const q = ejectPath(0.18 + (te - TR) * 0.12);
        return J.localToWorld(V(J.seatFront.x + q.x, J.seatFront.y + q.y - 0.6, 0));
      }, T0);
      clouds(t, V(-38 * 0.2, 0, 0));
      const s = shake(t, 1 + (t > T0 ? 5 * Math.exp(-(t - T0) * 2) : 0) + rk * 2, 6);
      const fy = J.seatFront.y + p.y + 0.6;
      place(c, [2.6 + s[0] * 4, ALT + lerp(1.2, fy - 0.3, smooth(range(t, T0, 5.36))) + s[1] * 4, 7.5], [2.2 + p.x * 0.6, ALT + lerp(0.8, fy, smooth(range(t, T0 - 0.2, 4.5))), 0]);
      return { bloom: 0.5 + rk * 0.3 };
    },
  };
}

// ============ SHOT 5: 17 g - the force through the body ============
function shot5({ makeStage }) {
  const scene = makeStage({ shadowSize: 2 });
  const { seat, man } = seatWithPilot(0.6);
  seat.position.set(0, ALT, 0); scene.add(seat);
  sunAt(scene, seat.position, 2);
  const fl = flame(1.6); seat.add(fl); fl.position.copy(seat.nozzle);
  const torso = man.j.chest.children[0];
  const rp = rippleOverlay(torso);
  const rp2 = rippleOverlay(seat.back);
  const lines = [];
  for (let i = 0; i < 26; i++) { const l = streak(0xffffff); scene.add(l); lines.push(l); }
  const clouds = cloudField(scene, V(0, ALT, 0), 10, [40, 60, 40], 7, 1.4);
  const c = cam(36);
  return {
    scene, camera: c,
    update(t) {
      const g = smooth(range(t, 0, 0.35));
      man.setPose({ ...SIT, spine: [0.05 * g, 0, 0], chest: [0.1 * g, 0, 0], neck: [0.25 * g, 0, 0], head: [0.1 * g, 0, 0], lSh: [-0.4, 0, 0.35], rSh: [-0.4, 0, -0.35] });
      handsTo(seat, man, 2);
      seat.handle.position.set(0, 0.14, 0.3);
      man.setMouth(0.7 + 0.15 * Math.sin(t * 30));
      fl.set(1, t);
      for (const [r, cx, amp] of [[rp, V(0, 0.1, 0.1), 1], [rp2, V(0, 0, 0.04), 0.9]]) {
        const u = r.material.uniforms;
        u.uCenter.value.copy(cx); u.uAmp.value = amp * smooth(range(t, 0.05, 0.3));
        u.uRadius.value = 0.05 + easeOut(range(t, 0.05, 1.4)) * 0.5; u.uSpot.value = 0.06; u.uTime.value = t; u.uRings.value = 70;
      }
      clouds(t, V(0, -55, 0));
      lines.forEach((l, i) => {
        const a = i * 2.39996, rr = 0.9 + (i % 5) * 0.35;
        const y = ALT + 4 - (((t * 18 + i * 1.7) % 8));
        const p = V(Math.cos(a) * rr, y, Math.sin(a) * rr);
        l.set(p, p.clone().add(V(0, 1.6, 0)), 0.006, 0.35);
      });
      const s = shake(t, 9, 9);
      place(c, [0.75 + s[0] * 3, ALT + 0.95 + s[1] * 3, 1.55], [0.02, ALT + 0.62, 0]);
      return { dof: { focus: 1.7, aperture: 0.004, maxblur: 0.008 }, bloom: 0.6 };
    },
  };
}

// ============ SHOT 6: the drogue opens and steadies the seat ============
function shot6({ makeStage }) {
  const scene = makeStage({ shadowSize: 3 });
  const { seat, man } = seatWithPilot(0.2);
  const rig = new THREE.Group(); rig.position.set(0, ALT, 0); scene.add(rig); rig.add(seat);
  const dr = parachute({ R: 0.42, lines: 1.7, gores: 8 }); seat.add(dr); dr.position.copy(seat.drogueMount);
  sunAt(scene, rig.position, 3);
  const clouds = cloudField(scene, V(0, ALT - 4, 0), 12, [60, 30, 60], 9, 1.8);
  const TD = 0.55;
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      const open = easeOut(range(t, TD, TD + 0.5));
      const stab = smooth(range(t, TD + 0.2, TD + 1.6));
      const wob = (1 - stab) * 0.9 + 0.04;
      seat.rotation.set(-0.5 * (1 - stab) + Math.sin(t * 5.2) * wob * 0.6, Math.sin(t * 3.1) * wob * 0.5, Math.sin(t * 4.3) * wob * 0.5);
      dr.open(open);
      dr.rotation.set(-0.55 + Math.sin(t * 7) * 0.05, 0, Math.sin(t * 6) * 0.05);
      man.setPose({ ...SIT, neck: [0.1, 0, 0] });
      handsTo(seat, man, 0.2);
      man.setMouth(0.3 * (1 - stab) + 0.1);
      clouds(t, V(0, 3, 0));
      const a = lerp(0.9, 1.5, easeInOut(range(t, 0, 3.3)));
      place(c, [Math.sin(a) * 6.8, ALT + 1.9, Math.cos(a) * 6.8], [0, ALT + 1.75, 0]);
      return { bloom: 0.4 };
    },
  };
}

// hanging under the canopy
const HANG = {
  spine: [0.05, 0, 0], neck: [-0.05, 0, 0],
  lSh: [0, 0, 2.7], rSh: [0, 0, -2.7], lEl: [-0.45, 0, 0], rEl: [-0.45, 0, 0],
  lHip: [-0.25, 0, 0.08], rHip: [-0.15, 0, -0.08], lKn: [0.35, 0, 0], rKn: [0.25, 0, 0], lAn: [0.2, 0, 0], rAn: [0.2, 0, 0],
};

// ============ SHOT 7: the seat falls away, the main parachute opens ============
function shot7({ makeStage }) {
  const scene = makeStage({ shadowSize: 6 });
  const { seat, man } = seatWithPilot(0.15);
  seat.position.set(0, ALT, 0); scene.add(seat);
  const dr = parachute({ R: 0.42, lines: 1.7, gores: 8 }); seat.add(dr); dr.position.copy(seat.drogueMount); dr.rotation.x = -0.55;
  const pilotG = new THREE.Group(); scene.add(pilotG);
  const ch = parachute({ R: 3.3, lines: 5.2 }); pilotG.add(ch); ch.position.set(0, 0.62, -0.05);
  const clouds = cloudField(scene, V(0, ALT - 6, 0), 14, [80, 30, 80], 11, 2);
  const TS = 0.55, TO = 2.1;
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const ts = Math.max(0, t - TS);
      // the seat drops and tumbles away
      seat.position.set(0.2 * ts, ALT - 2.2 * ts * ts, -0.4 * ts);
      seat.rotation.set(-ts * 1.2, ts * 0.4, ts * 0.6);
      // the pilot leaves the seat: before separation he rides in it
      const sep = smooth(range(t, TS, TS + 0.6));
      if (t < TS) {
        if (man.root.parent !== seat) seatPilot(seat, man);
      } else if (man.root.parent !== pilotG) { pilotG.add(man.root); man.root.position.set(0, -0.8, -0.06); }
      const fall = t < TO ? 0.5 * 1.2 * Math.max(0, t - TS) ** 2 : 0.5 * 1.2 * (TO - TS) ** 2 + (t - TO) * 0.5;
      pilotG.position.set(0, ALT - fall, 0);
      const op = easeOut(range(t, TO, TO + 0.9));
      ch.open(op);
      ch.rotation.set(Math.sin(t * 1.3) * 0.05, 0, Math.sin(t * 1.1) * 0.06 * op);
      pilotG.rotation.set(0, 0, Math.sin(t * 1.1) * 0.04 * op);
      man.setPose(t < TS ? SIT : lerpPose(SIT, HANG, sep));
      if (t < TS) handsTo(seat, man, 0.2);
      man.setMouth(op > 0.9 ? 0.25 : 0.4);
      sunAt(scene, V(0, ALT - fall + 3, 0), 6);
      clouds(t, V(0, 2, 0));
      const k = easeInOut(range(t, 1.2, 3.6));
      const tgt = V(0, ALT - fall + lerp(1.0, 3.3, k), 0);
      place(c, [lerp(3.5, 10.5, k), tgt.y + lerp(0.6, -0.6, k), lerp(3.5, 9.5, k)], [tgt.x, tgt.y, tgt.z]);
      return { bloom: 0.4 };
    },
  };
}

// ============ SHOT 8: on the runway at 150 km/h, canopy clears, seat fires ============
function shot8({ makeStage }) {
  const scene = makeStage({ shadowSize: 9, sunDir: [-2, 6, 5] });
  const af = airfield(); scene.add(af);
  const J = jet({ gear: true }); J.position.set(0, -J.groundY, 0); scene.add(J);
  const empty = ejectionSeat(); empty.position.copy(J.seatRear); empty.rotation.y = Math.PI / 2; J.add(empty);
  const { seat, man } = seatWithPilot(0.4); J.add(seat); seat.rotation.y = Math.PI / 2; seat.position.copy(J.seatFront);
  const fl = flame(1.6); seat.add(fl); fl.position.copy(seat.nozzle);
  const homeF = J.canopyFront.position.clone(), homeR = J.canopyRear.position.clone();
  const sm = smoke(50, { color: 0xd8d8d8, size: 0.5, grow: 2, life: 1.6, every: 0.03, drift: 0.4, opacity: 0.7, wind: V(-SPEED * 0.6, 0, 0), seed: 12 }); scene.add(sm);
  const dust = smoke(40, { color: 0xc9c2b0, size: 0.5, grow: 1.5, life: 1.0, every: 0.04, drift: 0.3, opacity: 0.35, wind: V(-SPEED, 0.5, 0), seed: 13 }); scene.add(dust);
  const TJ = 6.6, TE = 7.35;
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      af.scroll(SPEED * t);
      for (const w of J.wheels) w.rotation.set(Math.PI / 2, -SPEED * t / 0.25, 0);
      J.position.y = -J.groundY + Math.sin(t * 17) * 0.01;
      jettison(J.canopyFront, homeF, t - TJ, 1); jettison(J.canopyRear, homeR, (t - TJ) * 0.95, -1);
      const p = ejectPath(t - TE, 0.6);
      seat.position.set(J.seatFront.x + p.x * 3, J.seatFront.y + p.y, 0);
      seat.rotation.set(0, Math.PI / 2, 0); seat.rotateX(p.pitch * 0.4);
      const rk = t > TE + 0.3 ? smooth(range(t, TE + 0.3, TE + 0.4)) : 0;
      fl.set(rk, t);
      man.setPose({ ...SIT, neck: [t > TJ ? -0.1 : 0.05, 0, 0] });
      handsTo(seat, man, t > TJ - 0.2 ? 2 : 0.2);
      seat.handle.position.set(0, t > TJ - 0.2 ? 0.14 : 0.02, t > TJ - 0.2 ? 0.3 : 0.27);
      J.updateMatrixWorld(true);
      sm.update(t, (te) => { const q = ejectPath(te - TE, 0.6); return J.localToWorld(V(J.seatFront.x + q.x * 3, J.seatFront.y + q.y - 0.7, 0)); }, TE + 0.3);
      dust.update(t, (te) => V(-0.7 + ((te * 13) % 1) * 0.3, 0.05, (te * 7 % 1 > 0.5 ? 1 : -1) * 1.25));
      sunAt(scene, V(1, 4, 0), 9, [-2, 6, 5]);
      const s = shake(t, 2.5, 8);
      const up = smooth(range(t, TE, TE + 1.2));
      const k = easeInOut(range(t, 0, TJ));
      place(c, [lerp(9, 6.5, k) + s[0] * 3, lerp(1.2, 1.6, k) + up * 2.5 + s[1] * 3, lerp(10, 8.5, k)], [lerp(0.5, 1.8, k), lerp(1.4, 1.8, k) + up * 4, 0]);
      return { bloom: 0.45 };
    },
  };
}

// ============ SHOT 9: a spinning jet, falling ============
function shot9({ makeStage }) {
  const scene = makeStage({ shadowSize: 8 });
  const pivot = new THREE.Group(); pivot.position.set(0, ALT, 0); scene.add(pivot);
  const J = jet(); pivot.add(J); J.position.set(0, 0, 1.6);
  sunAt(scene, pivot.position, 8);
  const sm = smoke(80, { color: 0xeeeeee, size: 0.5, grow: 1.6, life: 2.4, every: 0.03, drift: 0.3, opacity: 0.6, wind: V(0, 34, 0), seed: 14 }); scene.add(sm);
  const clouds = cloudField(scene, V(0, ALT - 25, 0), 18, [120, 60, 120], 15, 3);
  const c = cam(44);
  return {
    scene, camera: c,
    update(t) {
      pivot.rotation.set(0, t * 2.4, 0);
      J.rotation.set(0.5, 0, -1.0);          // nose low, banked
      pivot.updateMatrixWorld(true);
      sm.update(t + 3, (te) => {
        const m = new THREE.Object3D(); m.position.set(0, ALT, 0); m.rotation.set(0, te * 2.4, 0); m.updateMatrixWorld();
        const j = new THREE.Object3D(); j.position.set(0, 0, 1.6); j.rotation.set(0.5, 0, -1.0); m.add(j); m.updateMatrixWorld(true);
        return j.localToWorld(V(-6.2, 0, 0));
      });
      clouds(t, V(0, 34, 0));
      const s = shake(t, 2, 11);
      place(c, [14 + s[0] * 4, ALT + 9 + s[1] * 4, 16], [0, ALT - 1.5, 0]);
      return { bloom: 0.4 };
    },
  };
}

// ============ SHOT 10: two pilots - rear goes first, the front seat is blocked until it's clear ============
function shot10({ makeStage }) {
  const scene = makeStage({ shadowSize: 8 });
  const J = jet(); J.position.set(0, ALT, 0); scene.add(J);
  const A = seatWithPilot(0.3), B = seatWithPilot(0.3);   // A front, B rear
  for (const [x, home] of [[A, J.seatFront], [B, J.seatRear]]) { J.add(x.seat); x.seat.rotation.y = Math.PI / 2; x.seat.position.copy(home); }
  const flA = flame(1.6), flB = flame(1.6); A.seat.add(flA); B.seat.add(flB); flA.position.copy(A.seat.nozzle); flB.position.copy(B.seat.nozzle);
  const homeF = J.canopyFront.position.clone(), homeR = J.canopyRear.position.clone();
  const lock = glowSprite(0xff2a20, 0.6); J.add(lock);
  const lockL = new THREE.PointLight(0xff2a20, 0, 2); J.add(lockL);
  const smA = smoke(40, { size: 0.45, grow: 1.6, life: 1.6, every: 0.03, wind: V(-20, 0, 0), seed: 21 }); scene.add(smA);
  const smB = smoke(40, { size: 0.45, grow: 1.6, life: 1.6, every: 0.03, wind: V(-20, 0, 0), seed: 22 }); scene.add(smB);
  const clouds = cloudField(scene, V(0, ALT - 18, 0), 14, [160, 12, 80], 17, 2.5);
  const TJ = 0.6, TB = 2.4, TA = 4.45;
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      J.position.y = ALT + Math.sin(t * 2) * 0.08;
      jettison(J.canopyFront, homeF, (t - TJ) * 0.6, 1); jettison(J.canopyRear, homeR, (t - TJ) * 0.57, -1);
      const go = (S, fl, home, T, sm, seed) => {
        const p = ejectPath(t - T, 0.45);
        S.seat.position.set(home.x + p.x * 2, home.y + p.y, 0);
        S.seat.rotation.set(0, Math.PI / 2, 0); S.seat.rotateX(p.pitch * 0.4);
        fl.set(t > T + 0.4 ? smooth(range(t, T + 0.4, T + 0.5)) : 0, t + seed);
        S.man.setPose({ ...SIT, neck: [t > T ? -0.15 : 0.05, 0, 0] });
        handsTo(S.seat, S.man, t > T - 0.5 ? 2 : 0.2);
        S.seat.handle.position.set(0, t > T - 0.5 ? 0.14 : 0.02, t > T - 0.5 ? 0.3 : 0.27);
        S.man.setMouth(t > T ? 0.55 : 0.25);
        J.updateMatrixWorld(true);
        sm.update(t, (te) => { const q = ejectPath(te - T, 0.45); return J.localToWorld(V(home.x + q.x * 2, home.y + q.y - 0.7, 0)); }, T + 0.4);
      };
      go(B, flB, J.seatRear, TB, smB, 3);
      go(A, flA, J.seatFront, TA, smA, 7);
      // blocking light on the front seat: red until the rear seat is clear, then green
      const on = t > TJ + 0.3 && t < TA;
      const green = t > 3.9;
      lock.material.color.setHex(green ? 0x30ff60 : 0xff2a20); lockL.color.setHex(green ? 0x30ff60 : 0xff2a20);
      const pulse = on ? (green ? 1 : 0.6 + 0.4 * Math.sin(t * 12)) : 0;
      lock.material.opacity = pulse; lockL.intensity = 3 * pulse;
      lock.position.set(J.seatFront.x + 0.4, J.seatFront.y + 1.05, 0.45); lockL.position.copy(lock.position);
      sunAt(scene, V(1.8, ALT + 2, 0), 8);
      clouds(t, V(-38, 0, 0));
      const s = shake(t, 1.5, 13);
      const up = smooth(range(t, TB, TA + 1.2));
      place(c, [2.6 + s[0] * 4, ALT + 1.6 + up * 2.2 + s[1] * 4, 10.5], [1.8, ALT + 1.6 + up * 2.6, 0]);
      return { bloom: 0.5 };
    },
  };
}

// ============ SHOT 11: safe landing under the parachute ============
function shot11({ makeStage }) {
  const scene = makeStage({ shadowSize: 6, sunDir: [-3, 6, 5] });
  const af = airfield(); af.position.z = -45; scene.add(af);
  const man = makeHuman('pilot'); scene.add(man.root);
  const ch = parachute({ R: 3.3, lines: 5.2 }); man.root.add(ch); ch.position.set(0, 1.42, -0.05);
  const TL = 4.75, H0 = 27;
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const y = Math.max(0, H0 - (H0 / TL) * t);
      const land = smooth(range(t, TL, TL + 0.25)), settle = smooth(range(t, TL + 0.25, TL + 0.8));
      man.root.position.set(lerp(-2.2, 0, Math.min(1, t / TL)), y, 0);
      man.root.rotation.set(0, 0.35, Math.sin(t * 1.2) * 0.05 * (1 - land));
      const crouch = Math.sin(Math.PI * land) * (1 - settle * 0.6);
      const STANDISH = { lSh: [0, 0, 2.5], rSh: [0, 0, -2.5], lEl: [-0.5, 0, 0], rEl: [-0.5, 0, 0], lHip: [-0.6 * crouch, 0, 0.1], rHip: [-0.6 * crouch, 0, -0.1], lKn: [1.1 * crouch, 0, 0], rKn: [1.1 * crouch, 0, 0], lAn: [-0.5 * crouch, 0, 0], rAn: [-0.5 * crouch, 0, 0], spine: [0.2 * crouch, 0, 0], drop: -0.22 * crouch };
      man.setPose(lerpPose(HANG, STANDISH, land));
      man.setMouth(0.3);
      ch.open(1 - 0.5 * settle);
      ch.rotation.set(-0.9 * settle, 0, Math.sin(t * 1.2) * 0.05);
      ch.position.set(0, 1.42, -0.05 - 1.5 * settle);
      sunAt(scene, V(man.root.position.x, Math.max(2, y), 0), 6, [-3, 6, 5]);
      const k = easeInOut(range(t, 0, TL + 0.4));
      const look = V(man.root.position.x, y + lerp(3.2, 1.1, k), 0);   // keep the pilot in frame all the way down
      place(c, [lerp(5, 3.4, k), lerp(1.0, 1.25, k), lerp(9.5, 5.2, k)], [look.x, look.y, look.z]);
      return { dof: { focus: c.position.distanceTo(man.root.position), aperture: 0.0008, maxblur: 0.006 }, bloom: 0.35 };
    },
  };
}

export const SHOTS = [
  { start: 0.0, end: 2.8, build: shot1 },
  { start: 2.8, end: 5.6, build: shot2 },
  { start: 5.6, end: 11.28, build: shot3 },
  { start: 11.28, end: 16.64, build: shot4 },
  { start: 16.64, end: 18.48, build: shot5 },
  { start: 18.48, end: 21.76, build: shot6 },
  { start: 21.76, end: 27.3, build: shot7 },
  { start: 27.3, end: 35.92, build: shot8 },
  { start: 35.92, end: 40.0, build: shot9 },
  { start: 40.0, end: 45.84, build: shot10 },
  { start: 45.84, end: DURATION + 1, build: shot11 },
];
