import * as THREE from 'three';
import { glowSprite, sparks, rippleOverlay } from './props.js';
import { person, xray, nerves, pulse, stove, wisps, kettlebell, cast, insideSky, skinSlice, nerveEnding, dna, coalBed, house, brain } from './pain.js';
import { kf, lerp, smooth, easeOut, easeIn, easeInOut, range, clamp, V, cam, place, shake, ikArm } from './anim.js';

export const DURATION = 49.0;

// [start, text, end?]  timed to audio/vo.words.json, trimmed by hand
export const CAPTIONS = [
  [0.00, 'Imagine'], [0.56, 'breaking your arm'], [1.60, 'and not feeling'], [2.48, 'a single thing'],
  [3.52, 'Sounds like'], [4.08, 'a superpower'], [4.80, 'right?'], [5.28, 'But it could'], [5.76, 'actually kill you'],
  [6.80, 'Touch a'], [7.20, 'hot pan'], [8.00, 'and tiny'], [8.56, 'nerve endings'], [9.36, 'in your skin'],
  [10.16, 'called'], [10.80, 'nociceptors'], [11.68, 'spring into action'],
  [12.72, 'Above about'], [13.48, '43 °C'], [15.12, 'their heat sensors'], [16.16, 'switch on'], [16.72, 'and fire'],
  [17.36, 'an electrical signal'], [18.72, 'It races'], [19.28, 'up your arm'], [19.92, 'to your'], [20.24, 'spinal cord'],
  [21.44, 'which yanks'], [22.08, 'your hand away'], [22.88, 'before you'], [23.36, 'even feel it'],
  [24.16, 'A split second'], [25.04, 'later'], [25.36, 'the pain'], [25.84, 'reaches'], [26.24, 'your brain'],
  [27.12, 'so you never'], [27.76, 'do that again'], [28.72, 'Some people'], [29.28, 'are born'], [29.84, 'unable to'],
  [30.48, 'feel pain'], [31.52, 'because of'], [32.00, 'one broken gene'], [33.36, 'They chew'], [33.84, 'their tongues'],
  [34.72, 'walk on'], [35.28, 'broken bones'], [36.08, 'and miss'], [36.48, 'deadly infections'],
  [37.73, 'One boy'], [38.24, 'in Pakistan'], [39.20, 'walked on'], [39.68, 'burning coals'], [40.64, 'for crowds'],
  [41.52, 'and died'], [42.16, 'at just 14'], [43.12, 'after jumping'], [43.84, 'off a roof'],
  [44.72, 'So pain'], [45.28, "isn't your enemy"], [46.48, "It's the alarm"], [47.36, 'that keeps you'], [47.92, 'alive', 48.8],
];
// [fadeInStart, fullStart, fullEnd, fadeOutEnd] to black: the "But" turn and out of the roof shot
export const FADES = [[5.05, 5.22, 5.3, 5.48], [44.4, 44.68, 44.74, 44.95]];

// ---------- helpers ----------
function idle(t, k = 1) { return Math.sin(t * 1.6) * 0.012 * k; }
const STAND = {
  lSh: [0.05, 0, 0.16], rSh: [0.05, 0, -0.16], lEl: [-0.25, 0, 0], rEl: [-0.25, 0, 0],
  lHip: [0, 0, 0.07], rHip: [0, 0, -0.07], lAn: [0, 0, -0.07], rAn: [0, 0, 0.07],
};
function standPose(h, t, extra = {}) {
  const p = { ...STAND, ...extra };
  p.chest = [idle(t) + (extra.chest?.[0] || 0), extra.chest?.[1] || 0, extra.chest?.[2] || 0];
  h.setPose(p);
}
function handOnHip(h, s, k) {
  h.root.updateMatrixWorld(true);
  const T = h.root.localToWorld(V(s * 0.21, 0.98, 0.03));
  const P = h.root.localToWorld(V(s * 0.75, 1.15, -0.25));
  const hint = h.root.localToWorld(V(-s, 0, 0)).sub(h.root.getWorldPosition(V(0, 0, 0)));
  ikArm(h, k, T, P, hint);
}
const L = (h, x, y, z) => { h.root.updateMatrixWorld(true); return h.root.localToWorld(V(x, y, z)); };
const dirL = (h, x, y, z) => V(x, y, z).applyQuaternion(h.root.quaternion);
function walkPose(ph, extra = {}) {
  const s = Math.sin(ph), c = Math.cos(ph);
  return {
    ...STAND,
    lHip: [-0.42 * s, 0, 0.05], rHip: [0.42 * s, 0, -0.05],
    lKn: [0.12 + 0.55 * Math.max(0, c), 0, 0], rKn: [0.12 + 0.55 * Math.max(0, -c), 0, 0],
    lAn: [0.1 * s, 0, 0], rAn: [-0.1 * s, 0, 0],
    lSh: [0.38 * s, 0, 0.12], rSh: [-0.38 * s, 0, -0.12], lEl: [-0.35, 0, 0], rEl: [-0.35, 0, 0],
    pelvis: [0, 0.08 * s, 0], chest: [0.04, -0.12 * s, 0], drop: -0.03 + 0.02 * Math.abs(c), ...extra,
  };
}
function rip(m, center, amp, rad, t, spot = 0.03) {
  const u = m.material.uniforms;
  u.uCenter.value.copy(center); u.uAmp.value = amp; u.uRadius.value = rad; u.uSpot.value = spot; u.uTime.value = t;
}
const sunAt = (scene, p, size = 3, dir = [-3, 6, 4]) => {
  const k = scene.userData.key;
  k.position.set(p.x + dir[0], p.y + dir[1], p.z + dir[2]); k.target.position.copy(p);
  const c = k.shadow.camera; c.left = c.bottom = -size; c.right = c.top = size; c.updateProjectionMatrix();
};
const NAVY = [0x081a3c, 0x0e2a5c, 0x163a72, 0x060f22];

// ============ SHOT 1: a 20 kg kettlebell drops on his forearm. He doesn't flinch. ============
function shot1({ makeStage }) {
  const scene = makeStage({ shadowSize: 2 });
  const man = person({ shirt: 0x2f7de1 }); scene.add(man.root);
  const kb = kettlebell(); kb.scale.setScalar(0.8); scene.add(kb);
  const rp = rippleOverlay(man.forearmR);
  const sp = sparks(40, { speed: 1.0, spread: 1.2, gravity: -4, life: 0.4, size: 0.02, color: [1, 0.95, 0.85], seed: 3, dir: V(0, 1, 0.3) }); scene.add(sp);
  const c = cam(38);
  const TI = 1.12;
  return {
    scene, camera: c,
    update(t) {
      const slow = t < TI ? t : TI + (t - TI) * 0.35;
      const it = slow - TI;
      const dip = it > 0 ? Math.sin(Math.min(it, 0.25) / 0.25 * Math.PI) * 0.035 * Math.exp(-it * 2) : 0;
      const look = smooth(range(t, 1.7, 2.3));
      standPose(man, t, { neck: [lerp(0.35, 0.05, look), lerp(-0.35, 0, look), 0], head: [lerp(0.2, 0, look), lerp(-0.2, 0.05, look), 0], spine: [0.03, 0, 0] });
      handOnHip(man, 1, 'l');
      ikArm(man, 'r', L(man, -0.21, 1.11 - dip, 0.37), L(man, -0.45, 0.8, -0.2), dirL(man, 0, 1, 0));
      man.setMouth(0.02);
      man.root.updateMatrixWorld(true);
      const mid = man.j.rEl.localToWorld(V(0, -0.16, 0));
      const contact = mid.clone().add(V(0, 0.055 + 0.13, 0));
      const fall = it < 0 ? 4.9 * (TI - slow) ** 2 * 1.4 : 0;
      if (it < 0) { kb.position.copy(contact).add(V(0, fall, 0)); kb.rotation.set(0.1, 0.4, (TI - slow) * 0.5); }
      else {   // bounces off the end of the forearm and drops to the floor
        const y = Math.max(0.11, contact.y + 0.5 * it - 4.9 * it * it);
        kb.position.set(contact.x - 0.05 * it, y, contact.z + 0.55 * Math.min(it, 0.62) + 0.1 * Math.max(0, it - 0.62));
        kb.rotation.set(0.1 + 2.2 * Math.min(it, 0.62), 0.4, 0);
      }
      const top = man.forearmR.worldToLocal(mid.clone().add(V(0, 0.06, 0)));
      rip(rp, top, it > 0 ? Math.min(1, it * 8) * (1 - 0.4 * range(it, 0.6, 1.0)) : 0, it > 0 ? 0.02 + easeOut(range(it, 0, 0.6)) * 0.13 : 0, t, 0.025);
      sp.position.copy(mid).add(V(0, 0.05, 0.03)); sp.update(it);
      const s = shake(t, it > 0 ? 6 * Math.exp(-it * 5) + 0.6 : 0.6, 1);
      const k = easeInOut(range(t, 0, 3.5));
      place(c, [lerp(-1.75, -1.45, k) + s[0], lerp(1.38, 1.42, k) + s[1], lerp(1.15, 0.95, k)], [lerp(-0.12, -0.1, k), lerp(1.22, 1.26, k), 0.2]);
      return { dof: { focus: c.position.distanceTo(V(-0.15, 1.3, 0.25)), aperture: 0.003, maxblur: 0.008 }, bloom: 0.5 };
    },
  };
}

// ============ SHOT 2: "Sounds like a superpower" - hero pose from a low angle ============
function shot2({ makeStage }) {
  const scene = makeStage({ shadowSize: 2 });
  const man = person({ shirt: 0x2f7de1 }); scene.add(man.root);
  const halo = glowSprite(0xffe2a0, 3.2); halo.position.set(0, 1.6, -1.2); halo.material.opacity = 0.55; scene.add(halo);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      standPose(man, t, { chest: [-0.08, 0, 0], neck: [-0.1, 0, 0], head: [-0.08, 0.05, 0], lHip: [0, 0, 0.16], rHip: [0, 0, -0.16], lAn: [0, 0, -0.16], rAn: [0, 0, 0.16] });
      handOnHip(man, 1, 'l'); handOnHip(man, -1, 'r');
      man.setMouth(0.05);
      halo.scale.setScalar(3 + Math.sin(t * 3) * 0.2);
      const k = easeOut(range(t, 0, 1.9));
      place(c, [lerp(0.55, 0.35, k), lerp(0.55, 0.7, k), lerp(2.6, 2.0, k)], [0, lerp(1.25, 1.35, k), 0]);
      return { bloom: 0.9, exposure: 1.05 };
    },
  };
}

// ---------- kitchen: stove at the origin, the man stands in front of it facing -z ----------
function kitchen(makeStage, { x = false } = {}) {
  const scene = makeStage({ shadowSize: 2 });
  const st = stove(); scene.add(st);
  const man = person({ shirt: 0x2f7de1 }); man.root.position.set(0.16, 0, 0.74); man.root.rotation.y = Math.PI; scene.add(man.root);
  const steam = wisps(10, { size: 0.16, rise: 0.4, opacity: 0.22, spread: 0.1 }); steam.position.set(0.22, 0.92, 0.12); scene.add(steam);
  const touch = st.localToWorld(st.touch.clone());
  sunAt(scene, V(0, 1, 0.4), 2);
  return { scene, st, man, steam, touch };
}
// the right hand: k = 0 resting, 1 on the pan rim, then yank (0..1) pulls it back to the chest
function kitchenArm(man, touch, k, yank = 0, t = 0) {
  const rest = L(man, -0.22, 0.98, 0.12);
  const onPan = touch.clone().add(V(0, 0.045, 0.06));
  const back = L(man, -0.2, 1.42, 0.22).add(V(Math.sin(t * 40) * 0.008 * yank, 0, 0));
  let T = rest.clone().lerp(onPan, k);
  if (yank > 0) T = onPan.clone().lerp(back, yank);
  ikArm(man, 'r', T, L(man, -0.6, 0.9, -0.1), dirL(man, 0, -0.3, 1));
}
const lean = (k, y = 0) => ({ spine: [0.12 * k * (1 - y), 0, 0], chest: [0.1 * k * (1 - y) - 0.1 * y, 0, 0], neck: [0.35 * k * (1 - y), 0, 0], head: [0.15 * k, 0, 0] });

// ============ SHOT 3: "But it could actually kill you" - he reaches for the glowing pan ============
function shot3({ makeStage }) {
  const { scene, st, man, steam, touch } = kitchen(makeStage);
  const glow = glowSprite(0xff5a20, 0.9); glow.position.set(0.22, 0.95, 0.12); scene.add(glow);
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      const k = smooth(range(t, 0.2, 1.5)) * 0.55;
      standPose(man, t, lean(k / 0.55 * 0.6));
      kitchenArm(man, touch, k);
      man.setMouth(0.0);
      steam.update(t);
      glow.material.opacity = 0.5 + 0.15 * Math.sin(t * 6);
      const m = easeInOut(range(t, 0, 1.52));
      place(c, [lerp(-1.3, -1.05, m), lerp(1.55, 1.5, m), lerp(-1.35, -1.05, m)], [0.2, lerp(1.32, 1.28, m), 0.5]);
      return { dof: { focus: c.position.distanceTo(V(0.16, 1.5, 0.74)), aperture: 0.002, maxblur: 0.006 }, bloom: 0.7, exposure: 0.85 };
    },
  };
}

// ============ SHOT 4 + 5a: fingers touch the pan rim, then the camera dives into the fingertip ============
function touchShot(dive) {
  return ({ makeStage }) => {
    const { scene, st, man, steam, touch } = kitchen(makeStage);
    const rp = rippleOverlay(man.palmR);
    const sizzle = wisps(12, { size: 0.06, rise: 0.18, opacity: 0.45, spread: 0.03, life: 0.8, seed: 9 }); scene.add(sizzle);
    const c = cam(dive ? 40 : 36);
    return {
      scene, camera: c,
      update(t) {
        const T0 = dive ? 2 : t;                     // dive keeps the hand on the pan
        const k = dive ? 1 : easeInOut(range(t, 0.0, 0.64));
        standPose(man, T0, lean(0.6 + 0.4 * k));
        kitchenArm(man, touch, 0.55 + 0.45 * k);
        man.setMouth(0);
        steam.update(t + (dive ? 3 : 0));
        man.root.updateMatrixWorld(true);
        const tipW = man.j.rWr.localToWorld(V(0, -0.1, 0.03));
        const on = dive ? 1 : smooth(range(t, 0.62, 0.75));
        sizzle.position.copy(tipW); sizzle.update(t); sizzle.visible = on > 0;
        const pc = man.palmR.worldToLocal(tipW.clone());
        rip(rp, pc, on, (dive ? 0.06 : 0.01 + 0.05 * easeOut(range(t, 0.64, 1.2))), t, 0.02);
        if (!dive) {
          const s = shake(t, 0.5, 5);
          place(c, [touch.x + 0.42 + s[0], touch.y + 0.16 + s[1], touch.z + 0.32], [touch.x + 0.02, touch.y + 0.02, touch.z + 0.04]);
          return { dof: { focus: c.position.distanceTo(touch), aperture: 0.006, maxblur: 0.01 }, bloom: 0.6 };
        }
        const d = easeIn(range(t, 0, 1.36));
        const from = V(touch.x + 0.32, touch.y + 0.12, touch.z + 0.26);
        const p = from.clone().lerp(tipW, 0.985 * d);
        place(c, p.toArray(), tipW.toArray());
        return { dof: { focus: Math.max(0.01, c.position.distanceTo(tipW)), aperture: 0.004, maxblur: 0.01 }, bloom: 0.6, exposure: 1 + 7 * easeIn(range(t, 1.05, 1.36)) };
      },
    };
  };
}

// ---------- the inside world: a slice through the fingertip under the hot pan ----------
function skinScene(makeStage) {
  const scene = makeStage({ shadowSize: 6, sun: 1.6, sunDir: [-2, 8, 6] });
  insideSky(scene);
  const sk = skinSlice(); scene.add(sk);
  sunAt(scene, V(0, 1, 1.5), 6, [-2, 6, 6]);
  const fill = new THREE.PointLight(0xffb090, 6, 12); fill.position.set(0, 2, 5); scene.add(fill);
  const pulses = sk.endings.map(() => pulse(0xfff2a0, 0.25));
  pulses.forEach(p => scene.add(p));
  return { scene, sk, pulses };
}
function lightTips(sk, t, amount, wiggle = 0) {
  sk.endings.forEach((e, i) => {
    const a = clamp(amount(i));
    e.glow.material.opacity = a;
    e.glow.scale.setScalar(0.5 + 0.4 * a + 0.1 * Math.sin(t * 12 + i));
    e.tip.material.emissiveIntensity = 0.2 + 2.5 * a;
    e.tip.scale.setScalar(1 + wiggle * 0.25 * Math.sin(t * 18 + i * 1.7));
  });
}

// ============ SHOT 5b: inside the skin, the nerve endings (nociceptors) ============
function shot5b({ makeStage }) {
  const { scene, sk, pulses } = skinScene(makeStage);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      sk.heat.uniforms.uA.value = 0.5; sk.heat.uniforms.uY.value = 3.15; sk.heat.uniforms.uT.value = t;
      // 0.8 s: "called" -> 1.56 s "nociceptors": endings light up in a wave; 2.3 s "spring into action": all twitch
      lightTips(sk, t, (i) => 0.35 * smooth(range(t, 0.7 + i * 0.05, 1.0 + i * 0.05)) + 0.65 * smooth(range(t, 2.3, 2.5)), smooth(range(t, 2.3, 2.5)));
      pulses.forEach(p => p.visible = false);
      const k = easeOut(range(t, 0, 2.6));
      const s = shake(t, 1, 7);
      place(c, [lerp(0.2, -0.1, k) + s[0] * 4, lerp(3.4, 1.4, k) + s[1] * 4, lerp(3.4, 8.2, k)], [lerp(0.0, -0.1, k), lerp(2.75, 1.0, k), 1.5]);
      return { bloom: 0.8, exposure: 1 + 7 * (1 - easeOut(range(t, 0, 0.3))) };
    },
  };
}

// ============ SHOT 6a: heat soaks down; past ~43 °C the endings switch on ============
function shot6a({ makeStage }) {
  const { scene, sk, pulses } = skinScene(makeStage);
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      const y = lerp(3.2, 2.45, easeInOut(range(t, 0.1, 1.9)));
      sk.heat.uniforms.uA.value = 1.6; sk.heat.uniforms.uY.value = y; sk.heat.uniforms.uT.value = t;
      sk.panB.material.emissiveIntensity = 0.5 + 0.4 * smooth(range(t, 0, 1));
      lightTips(sk, t, (i) => 0.3 + 0.7 * smooth(range(y, sk.endings[i].tip.position.y + 0.05, sk.endings[i].tip.position.y - 0.1)), smooth(range(t, 1.2, 1.8)));
      pulses.forEach(p => p.visible = false);
      const k = easeInOut(range(t, 0, 2.4));
      place(c, [lerp(-1.0, -0.4, k), lerp(2.0, 2.3, k), lerp(6.0, 4.6, k)], [lerp(-0.6, -0.2, k), 2.4, 1.5]);
      return { bloom: 0.9 };
    },
  };
}

// ============ SHOT 6b: close-up of one ending: heat channels open, ions rush in, a signal fires ============
function shot6b({ makeStage }) {
  const scene = makeStage({ shadowSize: 4, sun: 1.8 });
  insideSky(scene);
  const ne = nerveEnding(); scene.add(ne);
  sunAt(scene, V(-1, 0, 0), 4, [-2, 6, 5]);
  const fill = new THREE.PointLight(0xffb090, 4, 10); fill.position.set(1, 1.5, 4); scene.add(fill);
  const heatG = glowSprite(0xff7020, 6); heatG.position.set(0.5, 3.2, -1.5); scene.add(heatG);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const open = easeOut(range(t, 1.0, 1.4));
      const ions = range(t, 1.25, 1.35);
      const wave = t < 1.85 ? -1 : easeIn(range(t, 1.85, 3.5)) * 0.95;
      ne.update(t, open, ions, wave);
      heatG.material.opacity = 0.35 + 0.1 * Math.sin(t * 4);
      const k = easeInOut(range(t, 0, 1.8));
      const f = easeInOut(range(t, 1.9, 3.6));
      const follow = ne.path.getPointAt(Math.max(0, wave) * 0.85);
      const p0 = [lerp(1.9, 1.5, k), lerp(1.7, 1.25, k), lerp(3.0, 2.4, k)], l0 = [lerp(-0.2, -0.4, k), 0.3, 0];
      const p1 = [follow.x + 1.6, follow.y + 1.5, follow.z + 3.4], l1 = [follow.x - 0.3, follow.y, follow.z];
      const s = shake(t, t > 1.85 ? 3 * Math.exp(-(t - 1.85) * 3) + 1 : 1, 2);
      place(c, p0.map((v, i) => lerp(v, p1[i], f) + (s[i] || 0) * 3), l0.map((v, i) => lerp(v, l1[i], f)));
      return { bloom: 0.7 + 0.15 * (wave > 0 ? 1 : 0) };
    },
  };
}

// ---------- X-ray kitchen ----------
function xKitchen(makeStage) {
  const K = kitchen(makeStage);
  insideSky(K.scene, ...NAVY);
  xray(K.man); K.man.setXray(true);
  const nv = nerves(K.man); K.scene.add(nv);
  return { ...K, nv };
}

// ============ SHOT 7: the signal races up the arm to the spinal cord; the cord yanks the hand away ============
function shot7({ makeStage }) {
  const { scene, st, man, steam, touch, nv } = xKitchen(makeStage);
  const p1 = pulse(0xfff2a0, 0.1), p2 = pulse(0xfff2a0, 0.1), p3 = pulse(0xffb0a0, 0.08);
  scene.add(p1, p2, p3);
  const flash = glowSprite(0xffe070, 0.3); scene.add(flash);
  const c = cam(40);
  const TY = 2.88; // "yanks"
  return {
    scene, camera: c,
    update(t) {
      const yank = easeOut(range(t, TY, TY + 0.25));
      standPose(man, 2, { ...lean(1, yank), neck: [0.35 * (1 - yank) - 0.15 * yank, 0, 0] });
      kitchenArm(man, touch, 1, yank, t);
      steam.update(t);
      nv.update();
      const arm = nv.curves.rArm;
      p1.set(arm, t < 0.1 ? -1 : easeInOut(range(t, 0.1, 2.0)));           // fingertip -> spinal cord
      if (t > 2.0) p1.visible = false;
      const jn = nv.curves.cord.getPointAt(0.55);
      flash.position.copy(arm.getPointAt(1)); flash.material.opacity = t > 2.0 ? Math.max(0, 1 - (t - 2.0) * 1.2) : 0; flash.scale.setScalar(0.2 + 0.3 * range(t, 2, 2.6));
      p2.set(arm, t < 2.45 ? -1 : t > TY + 0.05 ? -1 : 1 - easeIn(range(t, 2.45, TY)));   // reflex back down the arm
      p3.set(nv.curves.up, t < 3.4 ? -1 : 0.25 * range(t, 3.4, 5.44));        // slow pain signal starts creeping up
      nv.cordMat.color.setRGB(1, 0.89 + 0.1 * (t > 2 ? Math.exp(-(t - 2) * 2) : 0), 0.48 + 0.5 * (t > 2 ? Math.exp(-(t - 2) * 2) : 0));
      const k = easeInOut(range(t, 0, 5.44));
      const s = shake(t, t > TY ? 3 * Math.exp(-(t - TY) * 4) + 0.5 : 0.5, 6);
      place(c, [lerp(2.15, 1.95, k) + s[0], lerp(1.4, 1.36, k) + s[1], lerp(1.35, 1.1, k)], [0.2, 1.2, 0.62]);
      return { bloom: 0.9 };
    },
  };
}

// ============ SHOT 8: a split second later the pain reaches the brain ============
function shot8({ makeStage }) {
  const scene = makeStage({ shadowSize: 2 });
  insideSky(scene, ...NAVY);
  const man = person({ shirt: 0x2f7de1 }); scene.add(man.root);
  xray(man); man.setXray(true);
  const nv = nerves(man); scene.add(nv);
  const rp = rippleOverlay(nv.brain.mesh);
  const p = pulse(0xffb0a0, 0.08); scene.add(p);
  const bglow = glowSprite(0xff3030, 0.3); scene.add(bglow);
  const c = cam(36);
  const TB = 2.08; // "brain"
  return {
    scene, camera: c,
    update(t) {
      standPose(man, t, { neck: [-0.1, 0, 0], chest: [-0.05, 0, 0] });
      ikArm(man, 'r', L(man, -0.2, 1.42, 0.22).add(V(Math.sin(t * 40) * 0.006, 0, 0)), L(man, -0.6, 0.9, -0.1), dirL(man, 0, -0.3, 1));
      nv.update();
      const u = t < 0.1 ? 0.25 : 0.25 + 0.75 * easeIn(range(t, 0.1, TB));
      p.set(nv.curves.up, t < TB ? u : -1);
      const hit = t > TB ? 1 : 0, it = t - TB;
      nv.brain.mat.emissiveIntensity = hit ? 0.6 + 0.4 * Math.sin(it * 18) * Math.exp(-it * 2) : 0.05;
      nv.brain.mat.color.setHex(hit ? 0xff6070 : 0xf29bb0);
      bglow.position.copy(nv.brain.getWorldPosition(V(0, 0, 0))); bglow.material.opacity = hit ? 0.6 * Math.exp(-it * 1.2) + 0.2 : 0;
      bglow.scale.setScalar(0.15 + 0.2 * (hit ? easeOut(range(it, 0, 0.5)) : 0));
      rip(rp, V(0.2, 0.9, 0.3), hit ? Math.min(1, it * 6) : 0, hit ? 0.1 + 1.4 * easeOut(range(it, 0, 0.7)) : 0, t, 0.2);
      rp.material.uniforms.uRings.value = 18;
      const k = easeInOut(range(t, 0, 2.96));
      const s = shake(t, hit ? 4 * Math.exp(-it * 4) + 0.5 : 0.5, 8);
      place(c, [lerp(0.8, 0.5, k) + s[0], lerp(1.55, 1.7, k) + s[1], lerp(1.6, 1.0, k)], [0, lerp(1.4, 1.58, k), 0]);
      return { bloom: 0.9 + 0.8 * (hit ? Math.exp(-it * 2) : 0) };
    },
  };
}

// ============ SHOT 9: "so you never do that again" - ouch, shaking the hand ============
function shot9({ makeStage }) {
  const { scene, st, man, steam } = kitchen(makeStage);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      standPose(man, t, { chest: [-0.05, 0.15, 0], neck: [0.15, -0.1, 0], head: [0.1, 0, 0.08] });
      const sh = Math.sin(t * 30) * 0.04;
      ikArm(man, 'r', L(man, -0.16 + sh, 1.5 + Math.abs(sh) * 0.5, 0.28), L(man, -0.6, 1.0, -0.1), dirL(man, 0, 0.2, 1));
      man.setMouth(0.75 + 0.15 * Math.sin(t * 9));
      steam.update(t);
      const k = easeOut(range(t, 0, 1.6));
      place(c, [lerp(-0.65, -0.5, k), lerp(1.62, 1.6, k), lerp(-0.8, -0.55, k)], [0.3, 1.5, 0.7]);
      return { dof: { focus: c.position.distanceTo(V(0.16, 1.6, 0.74)), aperture: 0.003, maxblur: 0.008 }, bloom: 0.5 };
    },
  };
}

// ============ SHOT 10: the DNA helix, one broken gene ============
function shot10({ makeStage }) {
  const scene = makeStage({ shadowSize: 2 });
  const h = dna(30); h.position.y = 1.4; scene.add(h);
  const bad = h.rungs[16];
  const sp = sparks(60, { speed: 0.8, spread: 1.5, gravity: 0, life: 0.6, size: 0.05, color: [1, 0.3, 0.25], seed: 2 }); scene.add(sp);
  const glow = glowSprite(0xff2020, 0.6); scene.add(glow);
  const c = cam(38);
  const TB = 3.6; // "broken gene"
  return {
    scene, camera: c,
    update(t) {
      h.rotation.y = t * 0.5;
      const red = smooth(range(t, 2.8, 3.5));
      const snap = easeOut(range(t, TB, TB + 0.4));
      bad.halves.forEach((m, i) => {
        m.material.emissiveIntensity = 0.9 * red + 0.4 * red * Math.sin(t * 10);
        m.material.color.lerpColors(new THREE.Color(m.userData.c0 ??= m.material.color.getHex()), new THREE.Color(0xff3030), red);
        m.position.x = (i ? -1 : 1) * (0.36 / 2 + 0.08 * snap); m.rotation.y = (i ? -1 : 1) * 0.5 * snap;
      });
      h.updateMatrixWorld(true);
      const bp = bad.rung.localToWorld(V(0, 0, 0));
      glow.position.copy(bp); glow.material.opacity = 0.7 * red; glow.scale.setScalar(0.5 + 0.2 * Math.sin(t * 8));
      sp.position.copy(bp); sp.update(t - TB);
      const k = easeInOut(range(t, 0, 4.64));
      const s = shake(t, t > TB ? 3 * Math.exp(-(t - TB) * 4) + 0.5 : 0.5, 3);
      place(c, [lerp(1.3, 0.75, k) + s[0], lerp(2.8, bp.y + 0.2, k) + s[1], lerp(3.0, 1.6, k)], [0, lerp(1.9, bp.y, k), 0]);
      return { dof: { focus: c.position.distanceTo(bp), aperture: 0.004, maxblur: 0.01 }, bloom: 0.7 };
    },
  };
}

// ============ SHOT 11a: chewing his tongue without noticing ============
function shot11a({ makeStage }) {
  const scene = makeStage({ shadowSize: 2 });
  const man = person({ shirt: 0xe0582f }); scene.add(man.root);
  const jaw = man.j.head.children.find(o => o.isGroup);
  const chin = jaw.children[0];
  const rp = rippleOverlay(chin);
  const c = cam(34);
  return {
    scene, camera: c,
    update(t) {
      standPose(man, t, { neck: [0, 0.1, 0], head: [-0.05, 0.1, 0] });
      man.setMouth(0.25 + 0.25 * Math.sin(t * 9));
      rip(rp, V(0, 0.0, 0.05), smooth(range(t, 0.2, 0.5)), 0.04 + 0.04 * smooth(range(t, 0.2, 1)), t, 0.025);
      rp.material.uniforms.uRings.value = 300;
      const k = easeInOut(range(t, 0, 1.36));
      place(c, [lerp(0.35, 0.25, k), 1.74, lerp(0.85, 0.7, k)], [0, 1.65, 0]);
      return { dof: { focus: 0.75, aperture: 0.004, maxblur: 0.008 }, bloom: 0.5 };
    },
  };
}

// ============ SHOT 11b: walking happily on a broken shin; an infection glows unnoticed ============
function shot11b({ makeStage }) {
  const scene = makeStage({ shadowSize: 3 });
  const man = person({ shirt: 0xe0582f }); scene.add(man.root);
  const rp = rippleOverlay(man.shinR);
  const rp2 = rippleOverlay(man.forearmL);
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      const z = t * 0.75;
      man.root.position.set(0, 0, z);
      man.setPose(walkPose(t * 6.2, { neck: [0, 0, 0], head: [0, 0.05, 0] }));
      man.setMouth(0.05);
      rip(rp, V(0, 0.02, 0.056), smooth(range(t, 0.5, 0.8)), 0.04 + 0.08 * smooth(range(t, 0.5, 1.4)), t, 0.03);
      rip(rp2, V(0, 0.0, 0.043), smooth(range(t, 1.5, 1.9)), 0.03 + 0.06 * smooth(range(t, 1.5, 2.4)), t, 0.025);
      sunAt(scene, V(0, 1, z), 3);
      const k = easeInOut(range(t, 0, 4.37));
      place(c, [lerp(1.2, 0.8, k), lerp(0.7, 0.95, k), z + lerp(3.0, 2.7, k)], [0, lerp(0.85, 1.0, k), z]);
      return { bloom: 0.5 };
    },
  };
}

// ============ SHOT 12: a boy walks calmly over burning coals while a crowd watches ============
function shot12({ makeStage }) {
  const scene = makeStage({ shadowSize: 3 });
  const bed = coalBed(3.2, 0.8); scene.add(bed);
  const boy = person({ shirt: 0xf2b134, pants: 0x5a4a3a, beard: false }); boy.root.scale.setScalar(0.78); boy.root.rotation.y = Math.PI / 2; scene.add(boy.root);
  // bare feet for the boy: toes and skin back on
  const crowd = [];
  [[-0.8, -1.3, 0x3f8f5a], [0.3, -1.4, 0xd04a5a], [1.2, -1.2, 0x6a5acd], [-1.6, -1.15, 0x2a7ab8]].forEach(([x, z, col], i) => {
    const p = person({ shirt: col, beard: i % 2 === 0 }); p.root.position.set(x, 0, z); p.root.rotation.y = -0.15 * x; scene.add(p.root); crowd.push(p);
  });
  const embers = wisps(26, { color: 0xffa040, size: 0.04, rise: 0.9, opacity: 0.9, spread: 1.4, life: 1.6, seed: 5 }); scene.add(embers);
  const embers2 = wisps(20, { color: 0xff6a20, size: 0.05, rise: 0.7, opacity: 0.8, spread: 1.0, life: 1.2, seed: 8 }); embers2.position.x = 0.5; scene.add(embers2);
  sunAt(scene, V(0, 1, -0.4), 3.5);
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      const x = lerp(-1.3, 0.9, t / 3.79);
      boy.root.position.set(x, 0.03, 0);
      boy.setPose(walkPose(t * 5.5, { neck: [0.05, 0, 0], head: [0, -0.1, 0] }));
      boy.setMouth(0);
      crowd.forEach((p, i) => {
        standPose(p, t + i, { neck: [0.1, 0.4 * Math.sign(x - p.root.position.x) * Math.min(1, Math.abs(x - p.root.position.x)) * 0.8, 0] });
        p.setMouth(0.5 + 0.2 * Math.sin(t * 2 + i));
      });
      embers.update(t); embers2.update(t * 1.1);
      bed.mats.forEach((m, i) => m.emissiveIntensity = 0.15 + i * 0.12 + 0.08 * Math.sin(t * (3 + i) + i));
      bed.light.intensity = 0.9 + 0.2 * Math.sin(t * 7);
      const k = easeInOut(range(t, 0, 3.79));
      place(c, [x + lerp(0.9, 0.6, k), lerp(0.85, 1.0, k), lerp(2.6, 2.2, k)], [x + 0.15, lerp(0.65, 0.75, k), -0.2]);
      return { bloom: 0.9, dof: { focus: c.position.distanceTo(V(x, 0.7, 0)), aperture: 0.003, maxblur: 0.008 } };
    },
  };
}

// ============ SHOT 13: dusk, a quiet house, a slow push toward the roof ============
function shot13({ makeStage }) {
  const scene = makeStage({ shadowSize: 6, sun: 1.3, sunDir: [6, 3, 3] });
  const u = scene.userData.sky.material.uniforms;
  u.top.value.set(0x2b2f6a); u.mid.value.set(0x7a5a9a); u.horizon.value.set(0xf0a070); u.floorC.value.set(0xc08070);
  scene.userData.key.color.set(0xffb070);
  const hs = house(); scene.add(hs);
  sunAt(scene, V(0, 1.5, 0), 6, [6, 3, 3]);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const k = easeInOut(range(t, 0, 3.2));
      place(c, [lerp(-4.2, -3.4, k), lerp(1.3, 1.7, k), lerp(10.5, 8.5, k)], [0, lerp(1.8, 2.2, k), 0]);
      return { bloom: 0.6, exposure: 0.95 };
    },
  };
}

// ============ SHOT 14: "So pain isn't your enemy" - arm in a cast, wincing, alive ============
function shot14({ makeStage }) {
  const scene = makeStage({ shadowSize: 2 });
  const man = person({ shirt: 0x2f7de1 }); scene.add(man.root);
  cast(man);
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      standPose(man, t, { neck: [0.05, lerp(-0.2, 0, smooth(range(t, 0.2, 1))), 0], head: [0, 0, 0.05] });
      ikArm(man, 'r', L(man, 0.0, 1.17, 0.24), L(man, -0.6, 0.95, -0.15), dirL(man, 1, 0.3, 0));
      handOnHip(man, 1, 'l');
      man.setMouth(lerp(0.55, 0.12, smooth(range(t, 0.3, 1.4))));
      const k = easeInOut(range(t, 0, 1.76));
      place(c, [lerp(0.7, 0.5, k), lerp(1.45, 1.5, k), lerp(2.1, 1.7, k)], [0, 1.4, 0]);
      return { dof: { focus: c.position.distanceTo(V(0, 1.5, 0.1)), aperture: 0.003, maxblur: 0.008 }, bloom: 0.5 };
    },
  };
}

// ============ SHOT 15: "It's the alarm that keeps you alive" - the whole nervous system lights up ============
function shot15({ makeStage }) {
  const scene = makeStage({ shadowSize: 2 });
  insideSky(scene, ...NAVY);
  const man = person({ shirt: 0x2f7de1 }); scene.add(man.root);
  cast(man);
  xray(man); man.setXray(true);
  const nv = nerves(man); scene.add(nv);
  const keys = ['rArm', 'lArm', 'rLeg', 'lLeg'];
  const ps = keys.map(() => pulse(0xfff2a0, 0.045)); ps.forEach(p => scene.add(p));
  const ups = [0, 1, 2].map(() => pulse(0xffb0a0, 0.04)); ups.forEach(p => scene.add(p));
  const alarm = glowSprite(0xff3030, 0.6); scene.add(alarm);
  const rings = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 64), new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide })); scene.add(r); return r; });
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      standPose(man, t, {});
      ikArm(man, 'r', L(man, 0.0, 1.17, 0.24), L(man, -0.6, 0.95, -0.15), dirL(man, 1, 0.3, 0));
      handOnHip(man, 1, 'l');
      nv.update();
      ps.forEach((p, i) => p.set(nv.curves[keys[i]], ((t * 0.7 + i * 0.27) % 1)));
      ups.forEach((p, i) => p.set(nv.curves.up, ((t * 0.9 + i / 3) % 1)));
      nv.brain.mat.emissiveIntensity = 0.3 + 0.3 * Math.sin(t * 6);
      const bp = nv.brain.getWorldPosition(V(0, 0, 0));
      alarm.position.copy(bp); alarm.material.opacity = 0.5 + 0.3 * Math.sin(t * 6); alarm.scale.setScalar(0.35 + 0.1 * Math.sin(t * 6));
      rings.forEach((r, i) => {
        const a = (t * 0.8 + i / 3) % 1;
        r.position.copy(bp); r.quaternion.copy(c.quaternion); r.scale.setScalar(0.05 + a * 0.9); r.material.opacity = 0.6 * (1 - a) * smooth(range(t, 0.2, 0.6));
      });
      const k = easeInOut(range(t, 0, 2.6));
      place(c, [lerp(0.25, 0.6, k), lerp(1.5, 1.3, k), lerp(1.5, 2.6, k)], [0, lerp(1.45, 1.1, k), 0]);
      return { bloom: 1.0 };
    },
  };
}

export const SHOTS = [
  { start: 0.0, end: 3.52, build: shot1 },
  { start: 3.52, end: 5.28, build: shot2 },
  { start: 5.28, end: 6.80, build: shot3 },
  { start: 6.80, end: 8.00, build: touchShot(false) },
  { start: 8.00, end: 9.36, build: touchShot(true) },
  { start: 9.36, end: 12.72, build: shot5b },
  { start: 12.72, end: 15.12, build: shot6a },
  { start: 15.12, end: 18.72, build: shot6b },
  { start: 18.72, end: 24.16, build: shot7 },
  { start: 24.16, end: 27.12, build: shot8 },
  { start: 27.12, end: 28.72, build: shot9 },
  { start: 28.72, end: 33.36, build: shot10 },
  { start: 33.36, end: 34.72, build: shot11a },
  { start: 34.72, end: 37.73, build: shot11b },
  { start: 37.73, end: 41.52, build: shot12 },
  { start: 41.52, end: 44.72, build: shot13 },
  { start: 44.72, end: 46.48, build: shot14 },
  { start: 46.48, end: DURATION + 1, build: shot15 },
];
