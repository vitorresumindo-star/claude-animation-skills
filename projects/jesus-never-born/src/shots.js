// "What would happen if Jesus were never born?" - captions timed to audio/vo.words.json, and 21 shots.
import * as THREE from 'three';
import { glowSprite } from './props.js';
import { lerp, smooth, easeOut, easeIn, easeInOut, range, clamp, V, cam, place, shake, ikArm } from './anim.js';
import { dissolvable, motes, burst, swirl, starField, nightSky, skyColors, hideShadowCatcher, bethlehemStar, lightning, hudPlane, textPlane } from './fx.js';
import { dress, modernGuy, santa, bishop, monk, nun, roman, carrier, graduate, patient, statuefy, marbleMat, robe, laurel, sunglasses, crozier, surprise, SKIN, std,
  STAND, standPose, walkPose, runPose, L, dirL, handOnHip, reach } from './people.js';
import { ground, hills, tree, cypress, bethlehem, flipBoard, timeline, YEAR, church, grassyHill, hammock, sideTable, xmasTree, present, eggBasket, roomCorner,
  modernRoad, highwaySign, backpack, romanRoad, milestone, furcaPack, scutum, spear, icons, sandTex, grassTex, cyl, box } from './sets.js';
import { chapel, hymnStaff, hospitalHall, brickHall, temple, pedestal, thunderbolt, hammer, scepter } from './sets2.js';
import { romanMap, toXZ, globe, faceLon } from './maps.js';

export const DURATION = 58.19;

// [start, text, end?]  timed to audio/vo.words.json, trimmed by hand
export const CAPTIONS = [
  [0.00, 'If Jesus had'], [0.88, 'never been born'], [2.00, "this year wouldn't"], [2.80, 'be 2026'],
  [4.32, 'We count'], [4.72, 'our years'], [5.12, 'from his birth'],
  [6.16, 'Without him'], [6.96, 'we might count'], [7.60, "from Rome's founding"], [9.04, 'making it'], [10.05, '2779'],
  [11.28, 'You might think'], [11.92, 'only churches'], [12.72, 'would disappear'],
  [13.52, "But he's hidden"], [14.40, 'all around you'],
  [15.16, 'Your Sunday off?'], [16.32, "That's the"], [16.72, 'Christian'], [17.12, 'day of rest'],
  [18.08, 'No Christmas'], [18.96, 'no Easter'], [19.68, 'and no Santa'], [20.72, "who's based on"], [21.36, 'a real bishop'],
  [22.32, 'Ever told someone'], [23.12, 'to go'], [23.44, 'the extra mile?'], [24.64, "That's from"], [25.04, 'his teachings'],
  [26.08, 'Even'], [26.38, 'do'], [26.68, 'do re'], [26.98, 'do re mi'], [27.28, 'was named'], [27.60, 'by a monk'], [28.48, 'after a'], [28.80, 'church hymn'],
  [29.60, 'Christians built'], [30.40, 'many of'], [30.80, 'the first'], [31.20, 'public hospitals'],
  [32.64, 'and Harvard'], [33.44, 'was founded'], [34.00, 'to train ministers'],
  [35.28, 'So how did'], [35.84, 'one life'], [36.40, 'change so much?'],
  [37.52, 'His followers'], [38.32, 'spread his message'], [39.28, 'along'], [39.60, 'Roman roads'],
  [40.88, 'and in under'], [41.55, '400 years'], [42.80, 'it became'], [43.36, "Rome's"], [43.92, 'official religion'],
  [45.04, 'Otherwise'], [45.60, 'Europe might'], [46.16, 'still pray'], [46.64, 'to Jupiter'], [47.28, 'and Thor'],
  [48.08, 'Today'], [48.56, 'over 2 billion'], [49.68, 'people'], [49.92, 'follow him'],
  [50.88, 'and Muslims'], [51.60, 'honor him'], [52.08, 'as a prophet'],
  [52.96, 'Without that'], [53.44, 'one birth'], [54.32, "it wouldn't"], [54.80, 'just be'], [55.12, 'a different year'],
  [56.24, 'It would be'], [56.64, 'a different world', 57.99],
];
// [fadeInStart, fullStart, fullEnd, fadeOutEnd] to black: the "But" turn, and the end
export const FADES = [[13.30, 13.44, 13.50, 13.64], [57.72, 58.15, 60, 60.1]];

// ---------- helpers ----------
const sunAt = (scene, p, size = 3, dir = [-3, 6, 4]) => {
  const k = scene.userData.key;
  k.position.set(p.x + dir[0], p.y + dir[1], p.z + dir[2]); k.target.position.copy(p);
  const c = k.shadow.camera; c.left = c.bottom = -size; c.right = c.top = size; c.far = 60; c.updateProjectionMatrix();
};
function day(makeStage, { shadowSize = 4, sunDir = [-3, 6, 4], sun = 2.3, groundMat = null, fog = [0x9cc8f2, 22, 75] } = {}) {
  const scene = makeStage({ shadowSize, sunDir, sun });
  ground(scene, { mat: groundMat, fog });
  return scene;
}
const pop = (t, t0, d = 0.25) => { const a = clamp((t - t0) / d); return a <= 0 ? 0 : a < 1 ? 1.18 * Math.sin(a * Math.PI / 2) : 1 + 0.18 * Math.exp(-(t - t0 - d) * 9) * Math.cos((t - t0 - d) * 18); };
const dofAt = (c, p, ap = 0.0025, mb = 0.008) => ({ focus: c.position.distanceTo(p), aperture: ap, maxblur: mb });
const look = (yaw = 0, pitch = 0) => ({ neck: [pitch * 0.5, yaw * 0.5, 0], head: [pitch * 0.5, yaw * 0.5, 0] });
const STAR = [0.3, 4.4, -1.2];

// the narrator's guy next to the split-flap year board (board centre x = -0.1)
function boardSet(makeStage) {
  const scene = day(makeStage, { shadowSize: 3.5 });
  const board = flipBoard({ cw: 0.34, ch: 0.52 }); board.position.set(-0.1, 2.35, -0.2); scene.add(board);
  for (const s of [-1, 1]) scene.add(cyl(0.035, 0.035, 2.1, std(0x30333a, { metalness: 0.7, roughness: 0.4 }), [-0.1 + s * 0.72, 1.05, -0.32], 12));
  const man = modernGuy(); man.root.position.set(0.42, 0, 0.5); man.root.rotation.y = -0.3; scene.add(man.root);
  for (let i = 0; i < 7; i++) { const tr = tree(i + 3, 1.2 + (i % 3) * 0.25); tr.position.set(-9 + i * 3.1, 0, -9 - (i % 2) * 3); scene.add(tr); }
  scene.add(hills({ inner: 16, height: 3 }));
  sunAt(scene, V(0, 1, 0), 3.5);
  // a flap that shivers (rotates a little and falls back) on each digit
  board.shiver = (k) => board.children.forEach((o, i) => { if (o.isGroup && o.children.length >= 3) { const f = o.children[2]; f.visible = k > 0.02; f.rotation.x = -0.9 * k * (0.8 + 0.2 * Math.sin(i * 2.1)); } });
  return { scene, board, man };
}
function nightStage(makeStage) {
  const scene = makeStage({ shadowSize: 6, sunDir: [-4, 7, 3], sun: 0.5 });
  ground(scene, { mat: new THREE.MeshStandardMaterial({ map: sandTex(30), color: 0x8a7a64, roughness: 1 }), fog: [0x101a36, 22, 85] });
  nightSky(scene);
  const B = bethlehem(); scene.add(B);
  scene.add(hills({ inner: 18, height: 4, color: 0x5a5040, map: sandTex(40) }));
  return { scene, B };
}

// ============ 1: Bethlehem at night. The star and the light over the manger go out ============
function shot1({ makeStage }) {
  const { scene, B } = nightStage(makeStage);
  const star = bethlehemStar(1.6); star.position.set(...STAR); scene.add(star);
  const beam = glowSprite(0xffe2a0, 5); beam.position.set(0.2, 2.3, -0.6); beam.scale.set(1.2, 4.6, 1); beam.material.opacity = 0.12; scene.add(beam);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const off = smooth(range(t, 0.9, 1.55));
      const flick = t > 0.8 && t < 1.55 ? (Math.sin(t * 61) > 0.2 ? 0.55 : 1) : 1;
      star.set((1 - off) * flick, t);
      B.stable.setHoly((1 - smooth(range(t, 1.0, 1.7))) * (t > 0.9 && t < 1.5 ? (Math.sin(t * 47) > 0 ? 0.6 : 1) : 1), t);
      B.stable.setLantern(1 - smooth(range(t, 1.15, 1.8)), t);
      beam.material.opacity = 0.12 * (1 - off);
      scene.userData.stars.material.opacity = 1 - 0.4 * off;
      const k = easeInOut(range(t, 0, 1.95));
      place(c, [lerp(0.25, 0.05, k), lerp(2.75, 2.55, k), lerp(12.8, 11.2, k)], [0.05, 1.45, 0]);
      return { bloom: 1.1, exposure: lerp(1.05, 0.75, off) };
    },
  };
}

// ============ 2: "this year wouldn't be 2026" - the guy proudly points at the year board ============
function shot2({ makeStage }) {
  const { scene, board, man } = boardSet(makeStage);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const lk = smooth(range(t, 0.15, 0.6)) - smooth(range(t, 1.3, 1.7));
      standPose(man, t, { ...look(lk * 0.9, -0.35 * lk), spine: [0, -0.1 * lk, 0] });
      handOnHip(man, 1, 'l');
      const pt = smooth(range(t, 0.25, 0.7));
      ikArm(man, 'r', L(man, lerp(-0.3, -0.6, pt), lerp(1.0, 1.6, pt), lerp(0.1, 0.22, pt)), L(man, -0.7, 1.0, -0.2), dirL(man, -0.3, 0.5, 1));
      man.setMouth(0.15 + 0.1 * smooth(range(t, 1.4, 1.8)));
      board.show('2026', '2026', 0);
      board.shiver(t > 1.36 ? Math.max(0, Math.sin((t - 1.36) * 9)) * Math.exp(-(t - 1.36) * 1.5) : 0);
      const s = shake(t, 0.6, 2);
      const k = easeInOut(range(t, 0, 2.3));
      place(c, [lerp(-0.1, 0.05, k) + s[0], lerp(1.8, 1.72, k) + s[1], lerp(6.0, 5.45, k)], [-0.05, 1.72, 0]);
      return { dof: dofAt(c, V(0.3, 1.7, 0.4), 0.0012), bloom: 0.4 };
    },
  };
}

// ---------- the timeline stage: deep blue dusk, a dark grid floor ----------
function timeStage(makeStage) {
  const scene = makeStage({ shadowSize: 3, sun: 0.8 });
  hideShadowCatcher(scene);
  skyColors(scene, 0x050b22, 0x0f1c48, 0x2a3170, 0x050812);
  scene.environmentIntensity = 0.12;
  scene.traverse(o => { if (o.isHemisphereLight) { o.color.set(0x6f84c8); o.groundColor.set(0x101425); o.intensity = 0.4; } });
  const grid = document.createElement('canvas'); grid.width = grid.height = 128; const gx = grid.getContext('2d');
  gx.fillStyle = '#060a18'; gx.fillRect(0, 0, 128, 128); gx.strokeStyle = 'rgba(70,100,190,0.35)'; gx.lineWidth = 2; gx.strokeRect(0, 0, 128, 128);
  const gt = new THREE.CanvasTexture(grid); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(80, 80); gt.colorSpace = THREE.SRGBColorSpace; gt.anisotropy = 8;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: gt, roughness: 0.6, metalness: 0.0 }));
  fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
  scene.fog = new THREE.Fog(0x141a3c, 5, 22);
  scene.add(starField(1500, { R: 60, minY: 0.05 }));
  const tl = timeline(); scene.add(tl);
  return { scene, tl };
}
// ============ 3: "We count our years from his birth" - fly from year 1 to 2026 ============
function shot3({ makeStage }) {
  const { scene, tl } = timeStage(makeStage);
  tl.rome.visible = tl.romeLabel.visible = false;
  const c = cam(44);
  return {
    scene, camera: c,
    update(t) {
      tl.star.set(1, t);
      const k = easeInOut(range(t, 0.25, 1.75));
      const z = lerp(1.9, -2026 * YEAR + 1.5, k);
      const s = shake(t, 0.5, 4);
      place(c, [lerp(-0.2, 0.08, k) + s[0], lerp(0.62, 0.7, k) + s[1], z], [lerp(0.0, 0.0, k), lerp(0.42, 0.3, k), z - 2.0]);
      return { bloom: 0.85, exposure: 1.0 };
    },
  };
}
// ============ 4: "Without him, we might count from Rome's founding" - the star vanishes, fly back to 753 BC ============
function shot4({ makeStage }) {
  const { scene, tl } = timeStage(makeStage);
  const b = burst(140, { speed: 1.2, life: 1.1, size: 0.06, gravity: 0.25, seed: 4 }); b.position.copy(tl.star.position); scene.add(b);
  const one = tl.labels['AD 1']; one.rotation.y = Math.PI;
  const romeZ = tl.rome.position.z;
  const c = cam(42);
  return {
    scene, camera: c,
    update(t) {
      const gone = smooth(range(t, 0.2, 0.55));
      tl.star.set((1 - gone) * (1 + 0.6 * Math.sin(range(t, 0.1, 0.4) * Math.PI)), t);
      b.update(t - 0.35);
      one.material.opacity = 1 - smooth(range(t, 0.35, 0.8)); tl.ped.scale.setScalar(Math.max(0.001, 1 - smooth(range(t, 0.4, 0.8))));
      const rise = easeOut(range(t, 1.55, 2.25));
      tl.rome.position.y = lerp(-2.2, 0, rise); tl.rome.visible = rise > 0.01;
      tl.romeLabel.material.opacity = smooth(range(t, 1.95, 2.45)); tl.romeLabel.visible = t > 1.9;
      const k = easeInOut(range(t, 0.85, 1.9));
      const s = shake(t, 0.5, 6);
      // looking at the star from the later-years side; then race back past year 1 to 753 BC
      place(c, [lerp(0.3, 0.0, k) + s[0], lerp(0.62, 1.05, k) + s[1], lerp(-2.0, romeZ - 4.8, k)], [0, lerp(0.42, 1.12, k), lerp(0.2, romeZ, k)]);
      return { bloom: 0.85, exposure: 1.0 };
    },
  };
}

// ============ 5: "making it 2779" - the board flips, a laurel wreath lands on his head ============
function shot5({ makeStage }) {
  const { scene, board, man } = boardSet(makeStage);
  const wreath = laurel(man);
  const sp = burst(60, { speed: 0.9, life: 0.7, size: 0.05, seed: 7 }); scene.add(sp);
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      board.show('2026', '2779', t - 0.45);
      const shock = smooth(range(t, 1.1, 1.35));
      const up = smooth(range(t, 0.2, 0.5));
      standPose(man, t, { ...look(0.55 * up * (1 - shock) + 0.1 * shock, -0.4 * up * (1 - shock) - 0.05 * shock), spine: [-0.05 * shock, 0, 0], chest: [-0.06 * shock, 0, 0],
        lSh: [0.05, 0, 0.16 + 0.5 * shock], rSh: [0.05, 0, -0.16 - 0.5 * shock], lEl: [-0.25 - 0.9 * shock, 0, 0], rEl: [-0.25 - 0.9 * shock, 0, 0] });
      man.setMouth(0.1 + 0.7 * shock); surprise(man, shock);
      const wp = pop(t, 1.35, 0.22);
      wreath.scale.setScalar(Math.max(0.001, wp)); wreath.position.y = 0.165 + 0.25 * (1 - clamp((t - 1.35) / 0.22));
      man.root.updateMatrixWorld(true); sp.position.copy(man.j.head.localToWorld(V(0, 0.2, 0))); sp.update(t - 1.4);
      const s = shake(t, t > 1.1 ? 1.5 * Math.exp(-(t - 1.1) * 3) + 0.5 : 0.5, 3);
      const k = easeInOut(range(t, 0, 2.2));
      place(c, [lerp(-0.15, -0.05, k) + s[0], lerp(1.95, 1.9, k) + s[1], lerp(5.6, 5.2, k)], [-0.05, 1.85, 0]);
      return { dof: dofAt(c, V(0.3, 1.8, 0.4), 0.0012), bloom: 0.5 };
    },
  };
}

// ============ 6: "You might think only churches would disappear" - the church dissolves into gold ============
function shot6({ makeStage }) {
  const scene = day(makeStage, { shadowSize: 6, groundMat: new THREE.MeshStandardMaterial({ map: grassTex(50), roughness: 1 }) });
  const hill = grassyHill(10, 0.9); scene.add(hill);
  const ch = church(); ch.position.set(0, 0.88, 0); ch.rotation.y = -0.45; scene.add(ch);
  const dz = dissolvable(ch, { scale: 4, bias: 0.6, edge: 0.06 });
  const dust = motes(220, { size: 0.1, box: V(3, 4.5, 4), rise: 2.5, seed: 3 }); dust.position.set(0, 0.9, 0); scene.add(dust);
  [[-4, -2], [4.2, -3], [-5.5, 1.5], [5.5, 1], [-2.8, -4.5], [3, 3.6]].forEach(([x, z], i) => { const tr = i % 2 ? cypress(i, 2.6) : tree(i + 7, 1.2); tr.position.set(x, 0.6 - Math.hypot(x, z) * 0.04, z); scene.add(tr); });
  scene.add(hills({ inner: 18, height: 3.2 }));
  sunAt(scene, V(0, 1.5, 0), 6, [-4, 7, 5]);
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      dz.set(smooth(range(t, 1.1, 2.15)));
      dust.update(t, Math.sin(Math.PI * clamp((t - 1.1) / 1.25)) * 1.2);
      const m = easeInOut(range(t, 0, 2.35));
      const a = lerp(0.3, -0.1, m), d = lerp(11.0, 9.8, m);
      place(c, [Math.sin(a) * d, lerp(1.3, 1.6, m), Math.cos(a) * d], [0.25, lerp(2.5, 2.35, m), 0]);
      return { bloom: 0.8, exposure: 1.0 };
    },
  };
}

// ============ 7: "But he's hidden all around you" - golden icons orbit the guy ============
function shot7({ makeStage }) {
  const scene = day(makeStage, { shadowSize: 3 });
  const man = modernGuy(); scene.add(man.root);
  const ic = icons(); scene.add(ic);
  for (let i = 0; i < 6; i++) { const tr = tree(i + 11, 1.3); tr.position.set(-7 + i * 2.8, 0, -7 - (i % 2) * 2.5); scene.add(tr); }
  scene.add(hills({ inner: 16, height: 3 }));
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      standPose(man, t, { ...look(Math.sin(t * 2.2) * 0.6, -0.25), lSh: [0.05, 0, 0.5], rSh: [0.05, 0, -0.5], lEl: [-0.6, 0, 0], rEl: [-0.6, 0, 0] });
      man.setMouth(0.35); surprise(man, 0.9);
      const m = easeInOut(range(t, 0, 1.62));
      const ca = lerp(-0.25, 0.25, m);
      place(c, [Math.sin(ca) * 3.6, lerp(1.75, 1.6, m), Math.cos(ca) * 3.6], [0, 1.45, 0]);
      ic.items.forEach((it, i) => {
        const a = i / ic.items.length * Math.PI * 2 + t * 0.9;
        const inn = easeOut(range(t, 0.05 + i * 0.06, 0.6 + i * 0.06));
        const rad = lerp(3.5, 0.95, inn), y = 1.62 + 0.5 * Math.sin(a) + Math.sin(t * 2 + i) * 0.04;
        it.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad);
        it.lookAt(c.position); it.rotateZ(Math.sin(t * 3 + i) * 0.2);
        it.scale.setScalar(Math.max(0.001, inn) * 1.0);
        it.glow.material.opacity = 0.6 * inn; it.glow.scale.setScalar(0.6);
      });
      return { dof: dofAt(c, V(0, 1.4, 0), 0.0014), bloom: 0.8 };
    },
  };
}

// ============ 8: "Your Sunday off? That's the Christian day of rest" - the hammock vanishes, he drops ============
function shot8({ makeStage }) {
  const scene = day(makeStage, { shadowSize: 3 });
  const hm = hammock(); scene.add(hm);
  const dz = dissolvable(hm.fabric, { scale: 6, bias: 0.25, edge: 0.08, from: V(1, 0, 0) });
  const cal = new THREE.Group(); cal.position.set(-0.55, 1.58, -0.5); cal.rotation.y = 0.885; scene.add(cal);
  scene.add(cyl(0.035, 0.04, 1.4, std(0x7a5232), [-0.55, 0.7, -0.53], 10));
  const page = textPlane(['SUNDAY', '7'], 0.5, { font: '800 120px Sign', color: '#d22d2d', w: 512, h: 460, bg: '#ffffff', lineH: 1.55, lit: true }); page.position.z = 0.012; cal.add(page);
  cal.add(box(0.52, 0.47, 0.02, std(0xf7f5ef), [0, 0, 0])); cal.add(box(0.52, 0.08, 0.03, std(0xd22d2d), [0, 0.25, 0.005]));
  const man = modernGuy(); scene.add(man.root);
  sunglasses(man);
  const dust = burst(70, { speed: 1.2, life: 0.8, size: 0.09, color: [0.85, 0.78, 0.62], gravity: -0.6, seed: 11, drag: 3 }); scene.add(dust);
  const gold = motes(90, { size: 0.07, box: V(2.2, 0.3, 0.8), rise: 0.8, seed: 9 }); gold.position.set(0, 0.85, 0); scene.add(gold);
  for (let i = 0; i < 5; i++) { const tr = tree(i + 21, 1.3); tr.position.set(-7 + i * 3.4, 0, -6 - (i % 2) * 2); scene.add(tr); }
  scene.add(hills({ inner: 16, height: 3 }));
  sunAt(scene, V(0, 0.8, 0), 3);
  const c = cam(40);
  const PEL = 0.05, Y0 = 1.15 - hm.sag + 0.11, FLOOR = 0.13;
  const tLand = Math.sqrt((Y0 - FLOOR) / 4.9);
  return {
    scene, camera: c,
    update(t) {
      const tg = t + 15.10;
      dz.set(smooth(range(tg, 16.85, 17.2)));
      gold.update(t, Math.sin(Math.PI * clamp((tg - 16.8) / 0.6)));
      // lying on his back along the hammock, head toward -x; he falls when it is gone
      const tf = tg - 17.08, land = tf > tLand, tl = tf - tLand;
      const fall = tf > 0 ? Math.min(Y0 - FLOOR, 4.9 * tf * tf) : 0;
      const bounce = land ? Math.abs(Math.sin(tl * 9)) * 0.06 * Math.exp(-tl * 6) : 0;
      man.root.rotation.order = 'YXZ'; man.root.rotation.set(-Math.PI / 2 + 0.08, Math.PI / 2, 0);
      man.root.position.set(PEL + 0.95, Y0 - fall + bounce, 0.02);
      const falling = tf > 0 && !land, after = land ? Math.max(0, 1 - tl * 2.5) : 0;
      const p = { lHip: [-0.15, 0, 0.02], rHip: [-0.1, 0, -0.1], lKn: [0.12, 0, 0], rKn: [0.18, 0, 0], lAn: [0.3, 0, 0], rAn: [0.3, 0, 0],
        lSh: [-2.75, 0, 0.55], rSh: [-2.75, 0, -0.55], lEl: [-2.3, 0, 0], rEl: [-2.3, 0, 0], neck: [0.35, 0, 0], head: [0.2, 0.3, 0] };
      if (falling || after > 0) {
        const w = falling ? 1 : after;
        p.lSh = [-1.3 - 0.6 * Math.sin(tg * 30) * w, 0, 1.2]; p.rSh = [-1.3 + 0.6 * Math.sin(tg * 30) * w, 0, -1.2]; p.lEl = [-0.5, 0, 0]; p.rEl = [-0.5, 0, 0];
        p.lHip = [-0.9 * w - 0.15, 0, 0.3]; p.rHip = [-0.5 * w - 0.1, 0, -0.3];
      }
      man.setPose(p);
      man.setMouth(tf > 0 ? 0.85 : 0.08); surprise(man, tf > 0 ? 1 : 0);
      dust.position.set(0, 0.05, 0); dust.update(land ? tl : -1);
      const s = shake(t, land ? 7 * Math.exp(-tl * 7) + 0.5 : 0.5, 8);
      const k = easeInOut(range(t, 0, 2.9));
      place(c, [lerp(2.5, 2.3, k) + s[0], lerp(1.6, 1.45, k) + s[1], lerp(2.0, 1.75, k)], [-0.25, lerp(0.85, 0.6, k), 0]);
      return { dof: dofAt(c, V(-0.3, 0.8, 0), 0.0014), bloom: 0.6 };
    },
  };
}

// ============ 9: "No Christmas, no Easter" - the tree and the eggs vanish ============
function shot9({ makeStage }) {
  const scene = makeStage({ shadowSize: 3.5, sunDir: [3, 6, 5], sun: 1.6 });
  hideShadowCatcher(scene);
  scene.add(roomCorner());
  const tr = xmasTree(); tr.position.set(-1.6, 0, -1.3); scene.add(tr);
  const gifts = new THREE.Group(); scene.add(gifts);
  [[-1.2, -0.75, 0xc8202a, 0xf2c230], [-1.85, -0.65, 0x2f6fd8, 0xffffff], [-1.0, -1.25, 0x1f8a4a, 0xd42a2a], [-2.2, -1.0, 0xf2c230, 0xc8202a]].forEach(([x, z, col, rb], i) => { const p = present(0.28 + i * 0.03, 0.22 + (i % 2) * 0.08, 0.28, col, rb); p.position.set(x, 0, z); p.rotation.y = i * 0.5; gifts.add(p); });
  const dzT = dissolvable(tr, { scale: 7, bias: 0.6 }), dzG = dissolvable(gifts, { scale: 9, bias: 0.4 });
  const basket = eggBasket(); basket.position.set(0.9, 0, -0.4); scene.add(basket);
  const eggBursts = basket.eggs.map((e, i) => { const b = burst(50, { speed: 1.1, life: 0.6, size: 0.09, seed: 30 + i }); scene.add(b); return b; });
  const dust = motes(140, { size: 0.08, box: V(1.6, 2.2, 1.6), rise: 1.5, seed: 5 }); dust.position.set(-1.6, 0, -1.3); scene.add(dust);
  const lamp = new THREE.PointLight(0xffd8a0, 4, 8, 1.5); lamp.position.set(0, 2.6, 1); scene.add(lamp);
  sunAt(scene, V(-0.4, 0.8, -0.8), 3.5, [3, 6, 5]);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const tg = t + 18.0;
      dzT.set(smooth(range(tg, 18.33, 18.85))); dzG.set(smooth(range(tg, 18.45, 18.9)));
      dust.update(t, Math.sin(Math.PI * clamp((tg - 18.3) / 0.75)) * 1.3);
      tr.bulbs.forEach((b, i) => { b.material.color.setScalar(0.6 + 0.4 * Math.sin(t * 6 + i)); });
      basket.updateMatrixWorld(true);
      basket.eggs.forEach((e, i) => {
        // each egg hops, spins, swells and vanishes in a burst
        const t0 = 19.12 + i * 0.05, k = clamp((tg - t0) / 0.18);
        e.userData.p0 = e.userData.p0 || e.position.clone(); e.userData.r0 = e.userData.r0 ?? e.rotation.y;
        e.position.copy(e.userData.p0).add(V(0, Math.sin(Math.min(1, k / 0.7) * Math.PI) * 0.13, 0));
        e.rotation.y = e.userData.r0 + k * 7;
        const sc = k < 0.7 ? 1 + 0.3 * Math.sin(k / 0.7 * Math.PI / 2) : 1.3 * (1 - (k - 0.7) / 0.3);
        e.scale.set(0.82, 1.08, 0.82).multiplyScalar(Math.max(0.001, sc));
        e.visible = k < 1;
        eggBursts[i].position.copy(e.getWorldPosition(V(0, 0, 0))); eggBursts[i].update(tg - t0 - 0.13);
      });
      if (tg < 18.92) {
        const k = easeOut(range(tg, 18.0, 18.92)); const s = shake(t, 0.5, 9);
        place(c, [lerp(0.2, 0.05, k) + s[0], lerp(1.55, 1.45, k) + s[1], lerp(2.3, 2.0, k)], [-1.55, 1.05, -1.3]);
        return { dof: dofAt(c, V(-1.6, 1.0, -1.3), 0.0018), bloom: 0.9 };
      }
      const k = easeOut(range(tg, 18.92, 19.68)); const s = shake(t, 0.5, 10);
      place(c, [lerp(1.55, 1.45, k) + s[0], lerp(1.15, 1.05, k) + s[1], lerp(1.05, 0.9, k)], [0.9, 0.24, -0.4]);
      return { dof: dofAt(c, V(0.9, 0.3, -0.4), 0.0022), bloom: 0.8 };
    },
  };
}

// ============ 10: "and no Santa, who's based on a real bishop" - Santa becomes Saint Nicholas ============
function shot10({ makeStage }) {
  const scene = day(makeStage, { shadowSize: 3, groundMat: new THREE.MeshStandardMaterial({ color: 0xf3f6fa, roughness: 0.9 }), fog: [0xd6e6f6, 14, 60] });
  skyColors(scene, 0x5d8fd0, 0x8cb4e6, 0xd6e6f6, 0xe8eef6);
  const sn = santa(); scene.add(sn.root);
  const bp = bishop(); scene.add(bp.root);
  const staff = crozier(); scene.add(staff);
  const sw = swirl(220, { radius: 0.6, height: 2.2, size: 0.06 }); scene.add(sw);
  const flakes = starField(700, { R: 7, minY: -1, size: 0.05, seed: 3 }); flakes.material.blending = THREE.NormalBlending; scene.add(flakes);
  for (let i = 0; i < 6; i++) { const tr = cypress(i + 2, 2.4 + (i % 3) * 0.4); tr.position.set(-6 + i * 2.4, 0, -5 - (i % 2) * 2); scene.add(tr); }
  standPose(sn, 0); standPose(bp, 0);
  const dzS = dissolvable(sn.root, { scale: 7, bias: 0.6 }), dzB = dissolvable(bp.root, { scale: 7, bias: 0.6 }), dzC = dissolvable(staff, { scale: 7, bias: 0.6 });
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      const tg = t + 19.68;
      const x = smooth(range(tg, 20.62, 21.45));
      dzS.set(x); dzB.set(1 - x); dzC.set(1 - x);
      sw.update(t, Math.sin(Math.PI * clamp((tg - 20.45) / 1.25)) * 1.2);
      flakes.rotation.y = t * 0.08; flakes.position.y = -((t * 0.35) % 1.5);
      standPose(sn, t, { ...look(0.1, -0.05), rSh: [-0.2, 0, -2.5], rEl: [-0.4 + 0.25 * Math.sin(t * 9), 0, 0] });
      handOnHip(sn, 1, 'l'); sn.setMouth(0.55 + 0.25 * Math.max(0, Math.sin(t * 7))); surprise(sn, 0.4);
      standPose(bp, t, { ...look(0, -0.05) });
      bp.root.updateMatrixWorld(true);
      staff.position.copy(L(bp, -0.38, 0, 0.12));
      ikArm(bp, 'r', L(bp, -0.36, 1.05, 0.14), L(bp, -0.7, 0.9, -0.2), dirL(bp, 0, 1, 0.2));
      const bl = smooth(range(tg, 21.3, 21.75));
      ikArm(bp, 'l', L(bp, lerp(0.2, 0.25, bl), lerp(1.0, 1.42, bl), lerp(0.15, 0.32, bl)), L(bp, 0.6, 0.9, -0.1), dirL(bp, 0, 0.2, 1));
      bp.setMouth(0.12); surprise(bp, 0.2);
      const k = easeInOut(range(t, 0, 2.57));
      place(c, [lerp(0.35, 0.15, k), lerp(1.45, 1.55, k), lerp(4.4, 3.7, k)], [0, lerp(1.25, 1.3, k), 0]);
      return { dof: dofAt(c, V(0, 1.3, 0.2), 0.0014), bloom: 0.9 };
    },
  };
}

// ============ 11: "Ever told someone to go the extra mile?" - jogging under the EXTRA MILE sign ============
function shot11({ makeStage }) {
  const scene = day(makeStage, { shadowSize: 4, sunDir: [-4, 6, 2] });
  scene.add(modernRoad(80));
  const sign = highwaySign(['EXTRA MILE', '1 mi  →'], { w: 2.3, h: 1.15, height: 3.3 }); sign.position.set(-0.95, 0, -8.5); sign.rotation.y = 0.1; scene.add(sign);
  const man = modernGuy(); scene.add(man.root);
  const pack = backpack(); man.j.chest.add(pack); pack.position.set(0, 0.2, -0.26);
  for (let i = 0; i < 10; i++) { const tr = tree(i + 31, 1.3 + (i % 3) * 0.3); tr.position.set((i % 2 ? 1 : -1) * (4.5 + (i % 3)), 0, 2 - i * 4.5); scene.add(tr); }
  scene.add(hills({ inner: 18, height: 3.5 }));
  const sweat = burst(10, { speed: 0.5, life: 0.5, size: 0.04, color: [0.75, 0.9, 1], gravity: -2, seed: 12 }); scene.add(sweat);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const z = lerp(-3.2, -0.6, t / 2.3);
      man.root.position.set(0.62, 0, z);
      const ph = t * 10.5;
      man.setPose(runPose(ph, { ...look(0, -0.1) }));
      man.root.position.y = Math.abs(Math.sin(ph)) * 0.05;
      man.setMouth(0.45 + 0.2 * Math.sin(ph * 2));
      man.root.updateMatrixWorld(true); sweat.position.copy(man.j.head.localToWorld(V(0.08, 0.15, 0.05))); sweat.update((t % 0.6) - 0.05);
      const s = shake(t, 1.2, 12);
      place(c, [0.55 + s[0], 1.1 + s[1], z + 3.4], [0.0, 2.05, z - 3.0]);
      return { dof: dofAt(c, V(0.45, 1.2, z), 0.0014, 0.006), bloom: 0.5 };
    },
  };
}

// ============ 12: "That's from his teachings" - a Roman milestone; a local man carries a soldier's pack ============
function shot12({ makeStage }) {
  const scene = day(makeStage, { shadowSize: 4, sunDir: [-5, 4, 3], sun: 2.6, groundMat: new THREE.MeshStandardMaterial({ map: grassTex(40), color: 0xd8d0a0, roughness: 1 }), fog: [0xe8d0a8, 18, 70] });
  skyColors(scene, 0x4a7fc8, 0x8db4e2, 0xf0d9b0, 0xd8c8a0);
  scene.userData.key.color.set(0xffd9a8);
  scene.add(romanRoad(50));
  const ms = milestone(); ms.position.set(1.45, 0, -1.7); ms.rotation.y = -0.25; scene.add(ms);
  const sol = roman(); scene.add(sol.root);
  const sh = scutum(); sol.j.chest.add(sh); sh.position.set(0.0, 0.1, -0.2); sh.rotation.set(0, Math.PI, 0); sh.scale.setScalar(0.85);
  const sp = spear(); scene.add(sp);
  const car = carrier(); scene.add(car.root);
  const pk = furcaPack(); scene.add(pk);
  for (let i = 0; i < 10; i++) { const cy = cypress(i + 5, 2.6 + (i % 3) * 0.5); cy.position.set((i % 2 ? 1 : -1) * (3 + (i % 4) * 0.6), 0, 2 - i * 3.2); scene.add(cy); }
  scene.add(hills({ inner: 16, height: 4, color: 0x8a9a5a }));
  sunAt(scene, V(0.4, 1, -1.8), 4, [-5, 4, 3]);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const z = lerp(-2.7, -1.75, t / 1.45);
      const ph = t * 7;
      sol.root.position.set(0.5, 0, z - 0.2); car.root.position.set(-0.3, 0, z);
      sol.setPose(walkPose(ph, { ...look(-0.3, 0) }, 0.8)); car.setPose(walkPose(ph + Math.PI, { ...look(0.15, 0.05), spine: [0.15, 0, 0] }, 0.75));
      sol.setMouth(0.2 + 0.15 * Math.sin(t * 8)); car.setMouth(0.05);
      sol.root.updateMatrixWorld(true); car.root.updateMatrixWorld(true);
      const hand = L(sol, -0.3, 1.0, 0.18);
      sp.position.copy(hand).add(V(0, -1.0, 0)); sp.rotation.set(0.05, 0, -0.04);
      ikArm(sol, 'r', hand, L(sol, -0.7, 0.9, -0.2), dirL(sol, 0, 1, 0));
      // the pack's pole rests on his left shoulder, held with the left hand
      pk.position.copy(L(car, 0.2, 1.52, -0.02)); pk.rotation.set(-0.95, 0, 0.12); pk.translateY(-0.45);
      ikArm(car, 'l', L(car, 0.18, 1.35, 0.3), L(car, 0.6, 1.0, -0.2), dirL(car, 0, 1, 0.3));
      const k = easeInOut(range(t, 0, 1.45));
      place(c, [lerp(0.5, 0.45, k), lerp(1.05, 1.1, k), lerp(4.2, 3.9, k)], [0.45, 1.05, -2.0]);
      return { dof: dofAt(c, V(0.3, 1.1, z), 0.0012), bloom: 0.5, exposure: 1.02 };
    },
  };
}

// ============ 13: "Even do re mi was named by a monk, after a church hymn" ============
function shot13({ makeStage }) {
  const scene = makeStage({ shadowSize: 3, sunDir: [-2, 5, 3], sun: 0.9 });
  hideShadowCatcher(scene);
  skyColors(scene, 0x120d0a, 0x1d1510, 0x2a2018, 0x0c0906);
  scene.environmentIntensity = 0.35;
  scene.traverse(o => { if (o.isHemisphereLight) { o.color.set(0xffd9a8); o.groundColor.set(0x3a2a1a); o.intensity = 0.55; } });
  const ch = chapel(); scene.add(ch);
  const mk = monk(); scene.add(mk.root);
  const staff = hymnStaff(); staff.scale.setScalar(0.62); staff.position.set(0, 2.2, 0.75); scene.add(staff);
  const warm = new THREE.SpotLight(0xffd4a0, 18, 10, 0.5, 0.6, 1.2); warm.position.set(-1.4, 3.4, -1.8); warm.target.position.set(0, 1.3, 0.4); warm.castShadow = true; warm.shadow.mapSize.set(1024, 1024); scene.add(warm, warm.target);
  const fill = new THREE.PointLight(0xffc890, 3, 6, 1.4); fill.position.set(0.6, 1.8, 2.2); scene.add(fill);
  const times = [26.38, 26.68, 26.98, 27.25, 27.5, 27.75].map(x => x - 26.0);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      staff.set(smooth(range(t, 0.1, 0.4)), t, times);
      let sing = 0.12;
      for (const tt of times) sing = Math.max(sing, Math.exp(-Math.pow((t - tt - 0.1) / 0.13, 2)) * 0.8);
      if (t > 1.7) sing = Math.max(sing, 0.35 + 0.3 * Math.sin(t * 9));
      standPose(mk, t, { ...look(0, -0.18 + 0.1 * Math.sin(t * 1.4)), spine: [0.05, 0, 0] });
      reach(mk, 'l', 0.2, 1.08, 0.42, [0, 0.4, 1]); reach(mk, 'r', -0.2, 1.08, 0.42, [0, 0.4, 1]);
      mk.setMouth(sing); surprise(mk, 0.5);
      ch.candles.forEach((f, i) => { f.material.opacity = 0.85 + 0.15 * Math.sin(t * 17 + i * 3); });
      const k = easeInOut(range(t, 1.25, 3.55));
      place(c, [lerp(0.0, 0.3, k), lerp(1.95, 1.9, k), lerp(2.65, 5.0, k)], [lerp(0.0, -0.12, k), lerp(1.78, 1.85, k), 0.5]);
      return { dof: dofAt(c, V(0, 1.9, 0.3), lerp(0.0025, 0.0012, k)), bloom: 1.2, exposure: 1.05 };
    },
  };
}

// ============ 14: "Christians built many of the first public hospitals" ============
function shot14({ makeStage }) {
  const scene = makeStage({ shadowSize: 6, sunDir: [-4, 6, 2], sun: 1.0 });
  hideShadowCatcher(scene);
  skyColors(scene, 0x2a2018, 0x3a2c20, 0x4a3a2a, 0x1a140e);
  scene.environmentIntensity = 0.45;
  scene.traverse(o => { if (o.isHemisphereLight) { o.color.set(0xffe2b8); o.groundColor.set(0x4a3a28); o.intensity = 0.7; } });
  const hall = hospitalHall({ n: 3 }); scene.add(hall);
  const pats = [];
  const skins = [SKIN.light, SKIN.brown, SKIN.mid, SKIN.tan, SKIN.dark, SKIN.light];
  hall.beds.forEach((b, i) => {
    if (i === 5) return;
    const p = patient(skins[i]); scene.add(p.root); pats.push([p, b]);
    p.parts.legs.forEach(o => { o.visible = false; }); p.parts.feet.forEach(o => { o.visible = false; });
  });
  const sister = nun(); scene.add(sister.root);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0xb0703a, { roughness: 0.6, side: THREE.DoubleSide })); scene.add(bowl);
  const warm = new THREE.PointLight(0xffc888, 10, 12, 1.3); warm.position.set(0, 3.3, -0.5); scene.add(warm);
  const warm2 = new THREE.PointLight(0xffc888, 6, 10, 1.3); warm2.position.set(0, 3.3, -5); scene.add(warm2);
  sunAt(scene, V(0, 0.5, -2.5), 6, [-4, 6, 2]);
  const c = cam(42);
  return {
    scene, camera: c,
    update(t) {
      pats.forEach(([p, b], i) => {
        // on his back, head on the pillow, body along the bed
        b.updateMatrixWorld(true);
        const head = b.localToWorld(V(0, 0.8, -0.72));
        p.root.rotation.order = 'YXZ'; p.root.rotation.set(-Math.PI / 2 + 0.55, b.rotation.y, 0);
        p.setPose({ neck: [0.25, 0, 0], head: [0.15, Math.sin(t * 0.8 + i) * 0.12, 0], lSh: [0, 0, 0.1], rSh: [0, 0, -0.1], lEl: [-0.25, 0, 0], rEl: [-0.25, 0, 0] });
        p.root.position.set(0, 0, 0); p.root.updateMatrixWorld(true);
        const off = p.j.head.getWorldPosition(V(0, 0, 0)).sub(p.root.position);
        p.root.position.copy(head).sub(off);
        p.setMouth(0.05); surprise(p, 0.35);
      });
      // the sister stands beside the near-right bed, bending over the patient with a bowl
      const nb = hall.beds[1]; nb.updateMatrixWorld(true);
      sister.root.position.copy(nb.localToWorld(V(-0.74, 0, -0.25)));
      const target = nb.localToWorld(V(0, 0, -0.45));
      sister.root.rotation.y = Math.atan2(target.x - sister.root.position.x, target.z - sister.root.position.z);
      standPose(sister, t, { spine: [0.28, 0, 0], chest: [0.15, 0, 0], ...look(0.0, 0.35) });
      sister.root.updateMatrixWorld(true);
      bowl.position.copy(L(sister, 0.0, 1.0, 0.42));
      reach(sister, 'l', 0.1, 0.98, 0.4, [0, 1, 0.3]); reach(sister, 'r', -0.1, 0.98, 0.4, [0, 1, 0.3]);
      sister.setMouth(0.1);
      const k = easeInOut(range(t, 0, 3.05));
      place(c, [lerp(-2.5, -2.0, k), lerp(1.8, 1.65, k), lerp(-0.75, -0.95, k)], [2.0, 0.95, -1.75]);
      return { dof: dofAt(c, V(2.0, 0.9, -1.6), 0.0014), bloom: 0.9, exposure: 1.05 };
    },
  };
}

// ============ 15: "and Harvard was founded to train ministers" - graduates toss their caps ============
function shot15({ makeStage }) {
  const scene = day(makeStage, { shadowSize: 5 });
  const hall = brickHall(); hall.position.set(0, 0, -4.2); scene.add(hall);
  const grads = [];
  [[SKIN.light, 0x3a2618], [SKIN.dark, 0x111111], [SKIN.mid, 0x2a1a10], [SKIN.tan, 0x111111]].forEach(([s, h], i) => {
    const g = graduate(s, h); g.root.position.set(-1.2 + i * 0.8, 0, -0.3 + (i % 2) * 0.25); g.root.rotation.y = (i - 1.5) * -0.12; scene.add(g.root); grads.push(g);
  });
  const flying = grads.map(g => { const cp = g.cap.clone(); scene.add(cp); return cp; });
  for (let i = 0; i < 4; i++) { const tr = tree(i + 41, 1.6); tr.position.set((i % 2 ? 1 : -1) * (4 + i * 0.6), 0, -3.5 - i); scene.add(tr); }
  scene.add(hills({ inner: 16, height: 3 }));
  sunAt(scene, V(0, 1, -1.5), 5);
  const c = cam(40);
  const T0 = 33.85 - 32.6;
  return {
    scene, camera: c,
    update(t) {
      grads.forEach((g, i) => {
        const wind = clamp((t - T0 + 0.35 + i * 0.03) / 0.35), toss = clamp((t - T0 - i * 0.03) / 0.15);
        const armUp = Math.max(0, wind < 1 ? -0.4 * wind : -0.4 + 3.1 * toss);
        standPose(g, t + i, { ...look(0, -0.25 * toss), rSh: [-armUp, 0, -0.2 - 0.1 * toss], lSh: [-armUp * 0.9, 0, 0.2 + 0.1 * toss], rEl: [-0.3, 0, 0], lEl: [-0.3, 0, 0] });
        g.setMouth(0.15 + 0.6 * toss); surprise(g, toss * 0.6);
        g.cap.visible = t < T0 + i * 0.03;
        g.root.updateMatrixWorld(true);
        const start = g.j.head.localToWorld(V(0, 0.22, 0));
        const ft = t - T0 - i * 0.03;
        const cp = flying[i]; cp.visible = ft >= 0;
        if (ft >= 0) {
          const slow = ft < 0.25 ? ft : 0.25 + (ft - 0.25) * 0.55;
          cp.position.set(start.x + (i - 1.5) * 0.3 * slow, start.y + 4.6 * slow - 2.6 * slow * slow, start.z + 0.35 * slow);
          cp.rotation.set(slow * (4 + i), slow * (6 - i), slow * 3);
        }
      });
      const k = easeInOut(range(t, 0, 2.6)), up = easeInOut(range(t, T0, T0 + 1.0));
      place(c, [lerp(0.3, 0.15, k), lerp(0.95, 0.85, k), lerp(5.8, 5.2, k)], [-0.05, lerp(1.95, 2.6, up), -1.0]);
      return { dof: dofAt(c, V(0, 1.4, -0.2), 0.001), bloom: 0.6 };
    },
  };
}

// ============ 16: "So how did one life change so much?" - from the manger up to one point of light ============
function shot16({ makeStage }) {
  const { scene, B } = nightStage(makeStage);
  const star = bethlehemStar(1.6); star.position.set(...STAR); scene.add(star);
  const dot = glowSprite(0xffe2a0, 1); dot.position.set(0, 0.8, 0.15); scene.add(dot);
  const c = cam(42);
  return {
    scene, camera: c,
    update(t) {
      B.stable.setHoly(1, t); B.stable.setLantern(1, t); star.set(0.85, t);
      const k = easeIn(range(t, 0.1, 2.25));
      dot.scale.setScalar(lerp(0.5, 9, k)); dot.material.opacity = smooth(range(t, 0.6, 1.6));
      place(c, [0, lerp(1.3, 46, k), lerp(3.4, 26, k)], [0, lerp(0.75, 0, k), lerp(0.15, 0, k)]);
      return { bloom: 1.2, exposure: 0.95 };
    },
  };
}

// ============ 17: the spread along the Roman roads, AD 33 to AD 380 ============
function shot17({ makeStage }) {
  const scene = makeStage({ shadowSize: 4, sunDir: [2, 6, 3], sun: 1.05 });
  hideShadowCatcher(scene);
  skyColors(scene, 0x0b1830, 0x1c3a64, 0x2c5884, 0x0a1424);
  scene.fog = new THREE.Fog(0x1c3a60, 6, 16);
  const map = romanMap(); scene.add(map);
  const LL = (lon, lat, y = 0) => toXZ(lon, lat, y);
  sunAt(scene, LL(18, 39), 4.5, [2, 6, 3]);
  const year = hudPlane(0.3, { text: 'AD 33', font: '700 150px Roman', color: '#ffe3a6', w: 1024, h: 240, glow: 'rgba(255,160,40,0.95)', bg: 'rgba(8,14,30,0.55)', round: 60 }); scene.add(year);
  const stamp = hudPlane(0.4, { text: 'AD 380', font: '700 190px Roman', color: '#fff3d0', w: 1024, h: 300, glow: 'rgba(255,170,50,1)', bg: 'rgba(8,14,30,0.6)', round: 70 }); scene.add(stamp);
  const sub = hudPlane(0.44, { text: ['OFFICIAL RELIGION', 'OF THE ROMAN EMPIRE'], font: '700 80px Roman', color: '#ffe3a6', w: 1024, h: 260, glow: 'rgba(255,160,40,0.9)', lineH: 1.25, bg: 'rgba(8,14,30,0.6)', round: 50 }); scene.add(sub);
  // camera keys: [time, lon, lat, height, target lon, target lat]
  const KEYS = [[0, 39.6, 30.4, 1.5, 33.0, 32.8], [2.6, 42.0, 33.2, 2.7, 25.0, 37.0], [5.3, 44.0, 35.5, 5.0, 13.5, 40.5], [7.5, 44.6, 35.8, 5.4, 12.5, 40.8]];
  let lastYear = -1;
  const c = cam(44);
  return {
    scene, camera: c,
    update(t) {
      const prog = lerp(-0.04, 1.02, range(t, 0.35, 5.25));
      const all = smooth(range(t, 5.35, 5.8)) * (0.75 + 0.25 * Math.sin(t * 5));
      map.set(prog, t, all, 1.0);
      map.src.forEach(s => { s.material.opacity = 1 - 0.6 * smooth(range(t, 1.5, 3)); });
      let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
      const [t0, ...a] = KEYS[i], [t1, ...b] = KEYS[i + 1];
      const u = easeInOut(clamp((t - t0) / (t1 - t0)));
      const q = a.map((v, j) => lerp(v, b[j], u));
      const s = shake(t, 0.4, 14);
      const P = LL(q[0], q[1], q[2]), T = LL(q[3], q[4], 0);
      place(c, [P.x + s[0], P.y + s[1], P.z], [T.x, T.y, T.z]);
      c.updateMatrixWorld(true);
      const yr = Math.round(lerp(33, 380, clamp(prog)));
      if (yr !== lastYear) { year.redraw('AD ' + yr); lastYear = yr; }
      year.place(c, 0, 0.8, 1.2); year.visible = t < 5.35; year.material.opacity = smooth(range(t, 0.2, 0.6));
      stamp.place(c, 0, 0.7, 1.2); stamp.scale.setScalar(Math.max(0.001, pop(t, 5.35, 0.28))); stamp.visible = t > 5.35;
      sub.place(c, 0, 0.47, 1.2); sub.material.opacity = smooth(range(t, 5.6, 6.0)); sub.visible = t > 5.6;
      return { bloom: 0.9, exposure: 0.92 };
    },
  };
}

// ============ 18: "Otherwise, Europe might still pray to Jupiter and Thor" ============
function shot18({ makeStage }) {
  const scene = makeStage({ shadowSize: 6, sunDir: [-3, 6, 4], sun: 1.0 });
  hideShadowCatcher(scene);
  skyColors(scene, 0x10141c, 0x232a38, 0x3a4354, 0x0f1218);
  scene.environmentIntensity = 0.45;
  scene.traverse(o => { if (o.isHemisphereLight) { o.color.set(0x9aa8c8); o.groundColor.set(0x1a1c22); o.intensity = 0.55; } });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x55585e, roughness: 0.6, map: grassTex(30) }));
  fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
  scene.fog = new THREE.Fog(0x2a3140, 12, 45);
  const mm = marbleMat(0xeee9df);
  const tp = temple(mm); tp.position.set(0, 0, -6.5); scene.add(tp);
  const mk = (x, rot) => {
    const ped = pedestal(1.1, 1.3, mm); ped.position.set(x, 0, -1.6); scene.add(ped);
    const s = dress({ shirt: 0xffffff, pants: 0xffffff, sleeves: 'short', shoes: 'sandals', beard: 'full', hair: 0xffffff });
    robe(s, { color: 0xffffff, hem: -0.9, flare: 0.1, sleeves: 'none' });
    s.root.position.set(x, 1.42, -1.6); s.root.scale.setScalar(1.55); s.root.rotation.y = rot; scene.add(s.root);
    statuefy(s.root, 0xf2eee6);
    return s;
  };
  const jup = mk(-1.25, 0.25), thor = mk(1.25, -0.25);
  const bolt = thunderbolt(0.75); scene.add(bolt);
  const ham = hammer(mm); ham.scale.setScalar(1.55); scene.add(ham);
  const sc = scepter(mm); sc.scale.setScalar(1.55); scene.add(sc);
  const zap = lightning(), zap2 = lightning(); scene.add(zap, zap2);
  const flash = new THREE.PointLight(0xbfd2ff, 0, 30, 1.2); flash.position.set(0, 7, 2); scene.add(flash);
  const glowB = glowSprite(0xffe6a0, 1.2); scene.add(glowB);
  const glowH = glowSprite(0xbcd6ff, 1.2); scene.add(glowH);
  const rain = starField(900, { R: 9, minY: -1, size: 0.035, seed: 8 }); scene.add(rain);
  const wors = [];
  for (let i = 0; i < 3; i++) {
    const w = dress({ shirt: 0x8a6a48, pants: 0x8a6a48, sleeves: 'long', shoes: 'sandals', hair: 0x2a1a10, skin: SKIN.tan });
    robe(w, { color: [0x7a5a3a, 0x9a3a2a, 0x5a6a7a][i], hem: -0.88, flare: 0.08, sleeves: 'wide' });
    w.root.position.set(-1.3 + i * 1.3, 0, 1.2 + (i % 2) * 0.35); w.root.rotation.y = Math.PI; scene.add(w.root); wors.push(w);
  }
  const c = cam(42);
  return {
    scene, camera: c,
    update(t) {
      const tg = t + 44.95;
      standPose(jup, 2, { ...look(0.15, -0.15), spine: [-0.05, 0, 0] });
      standPose(thor, 2, { ...look(-0.15, -0.15) });
      jup.root.updateMatrixWorld(true); thor.root.updateMatrixWorld(true);
      const bp = L(jup, -0.3, 2.05, 0.15); ikArm(jup, 'r', bp, L(jup, -0.8, 1.6, -0.2), dirL(jup, 0, 0, 1));
      bolt.position.copy(bp).add(V(0, 0.32, 0)); bolt.rotation.set(0, jup.root.rotation.y, 0.2);
      const sp = L(jup, 0.32, 1.0, 0.12); ikArm(jup, 'l', sp, L(jup, 0.7, 0.9, -0.2), dirL(jup, 0, 1, 0));
      sc.position.copy(L(jup, 0.32, 0.0, 0.12));
      const hp = L(thor, 0.3, 2.05, 0.15); ikArm(thor, 'l', hp, L(thor, 0.8, 1.6, -0.2), dirL(thor, 0, 0, 1));
      ham.position.copy(hp).add(V(0, 0.05, 0)); ham.rotation.set(0, thor.root.rotation.y, -0.25);
      handOnHip(thor, -1, 'r');
      wors.forEach((w, i) => {
        w.setPose({ ...STAND, drop: -0.42, lHip: [-1.5, 0, 0.1], rHip: [-1.5, 0, -0.1], lKn: [2.2, 0, 0], rKn: [2.2, 0, 0], lAn: [-0.6, 0, 0], rAn: [-0.6, 0, 0],
          spine: [0.1 + 0.08 * Math.sin(t * 2 + i), 0, 0], lSh: [-2.4, 0, 0.35], rSh: [-2.4, 0, -0.35], lEl: [-0.3, 0, 0], rEl: [-0.3, 0, 0], neck: [-0.35, 0, 0] });
      });
      // lightning on "Jupiter" and on "Thor"
      const f1 = tg > 46.82 && tg < 47.12 ? (Math.sin((tg - 46.82) * 50) > -0.3 ? 1 : 0.3) : 0;
      const f2 = tg > 47.42 && tg < 47.75 ? (Math.sin((tg - 47.42) * 46) > -0.3 ? 1 : 0.3) : 0;
      zap.strike(V(-2.6, 10, -3.5), bolt.position.clone().add(V(0, 0.3, 0)), 3 + Math.floor(tg * 20), f1, 0.035);
      zap2.strike(V(2.8, 10, -4), ham.position.clone().add(V(0, 0.45, 0)), 9 + Math.floor(tg * 20), f2, 0.035);
      flash.intensity = 40 * Math.max(f1, f2);
      glowB.position.copy(bolt.position); glowB.material.opacity = 0.35 + 0.65 * f1; glowB.scale.setScalar(1.0 + 1.5 * f1);
      glowH.position.copy(ham.position).add(V(0, 0.4, 0)); glowH.material.opacity = 0.15 + 0.85 * f2; glowH.scale.setScalar(0.8 + 2 * f2);
      rain.position.y = -((t * 3) % 2); rain.rotation.y = 0.3;
      const k = easeInOut(range(t, 0, 3.05));
      const s = shake(t, Math.max(f1, f2) * 4 + 0.6, 16);
      place(c, [lerp(0.3, 0.1, k) + s[0], lerp(1.2, 1.45, k) + s[1], lerp(10.6, 9.4, k)], [0, lerp(2.8, 3.0, k), -1.6]);
      return { bloom: 1.0, exposure: 0.95 + 0.45 * Math.max(f1, f2) };
    },
  };
}

// ============ 19: "Today, over two billion people follow him, and Muslims honor him as a prophet" ============
function shot19({ makeStage }) {
  const scene = makeStage({ shadowSize: 2, sunDir: [-4, 2, 4], sun: 2.4 });
  hideShadowCatcher(scene);
  skyColors(scene, 0x02040c, 0x050a1a, 0x0a1430, 0x02040c);
  scene.environmentIntensity = 0.2;
  scene.traverse(o => { if (o.isHemisphereLight) o.intensity = 0.25; });
  scene.add(starField(2400, { R: 60, minY: -1, size: 0.45, seed: 31 }));
  const G = globe(); scene.add(G);
  const h1 = hudPlane(0.4, { text: '0.0 BILLION', font: '900 170px Sign', color: '#ffd36a', w: 1024, h: 220, glow: 'rgba(255,160,40,0.9)' }); scene.add(h1);
  const h1b = hudPlane(0.28, { text: 'CHRISTIANS', font: '800 110px Sign', color: '#ffe8b8', w: 1024, h: 150 }); scene.add(h1b);
  const h2 = hudPlane(0.4, { text: '2 BILLION', font: '900 170px Sign', color: '#7dffb0', w: 1024, h: 220, glow: 'rgba(40,220,120,0.9)' }); scene.add(h2);
  const h2b = hudPlane(0.28, { text: 'MUSLIMS', font: '800 110px Sign', color: '#c8ffe0', w: 1024, h: 150 }); scene.add(h2b);
  const c = cam(40);
  let last = -1;
  return {
    scene, camera: c,
    update(t) {
      const tg = t + 48.0;
      G.gold.set(smooth(range(tg, 48.45, 50.4)), t); G.green.set(smooth(range(tg, 50.9, 52.3)), t);
      G.rotation.set(0.38, lerp(faceLon(-45), faceLon(30), easeInOut(range(t, 0, 4.95))), 0, 'XYZ');
      const k = easeInOut(range(t, 0, 4.95));
      place(c, [0, 0, lerp(4.8, 4.4, k)], [0, 0.55, 0]);
      c.updateMatrixWorld(true);
      const n = Math.round(lerp(0, 2.3, easeOut(range(tg, 48.6, 49.9))) * 10) / 10;
      if (n !== last) { h1.redraw(n.toFixed(1) + ' BILLION'); last = n; }
      h1.place(c, 0, 0.82, 1.2); h1.material.opacity = smooth(range(tg, 48.55, 48.8)); h1.visible = tg > 48.55;
      h1b.place(c, 0, 0.72, 1.2); h1b.material.opacity = smooth(range(tg, 48.7, 49.0)); h1b.visible = tg > 48.7;
      h2.place(c, 0, 0.58, 1.2); h2.scale.setScalar(Math.max(0.001, pop(tg, 50.95, 0.25))); h2.visible = tg > 50.95;
      h2b.place(c, 0, 0.48, 1.2); h2b.material.opacity = smooth(range(tg, 51.1, 51.4)); h2b.visible = tg > 51.1;
      return { bloom: 1.3, exposure: 1.05 };
    },
  };
}

// ============ 20: "Without that one birth, it wouldn't just be a different year" ============
function shot20({ makeStage }) {
  const { scene, board, man } = boardSet(makeStage);
  const c = cam(36);
  return {
    scene, camera: c,
    update(t) {
      const tg = t + 52.95;
      board.show('2026', '2779', tg - 55.05);
      const up = smooth(range(t, 0.2, 0.8));
      standPose(man, t, { ...look(0.55 * up, -0.45 * up) });
      man.setMouth(0.15 + 0.5 * smooth(range(tg, 55.5, 55.8))); surprise(man, 0.5 + 0.5 * smooth(range(tg, 55.5, 55.8)));
      const k = easeInOut(range(t, 0, 3.0));
      place(c, [lerp(0.15, 0.0, k), lerp(1.6, 1.7, k), lerp(6.1, 5.6, k)], [-0.05, lerp(1.95, 2.05, k), 0]);
      return { dof: dofAt(c, V(-0.1, 2.3, -0.2), 0.001), bloom: 0.5 };
    },
  };
}

// ============ 21: "It would be a different world" - the star shines again over Bethlehem ============
function shot21({ makeStage }) {
  const { scene, B } = nightStage(makeStage);
  const star = bethlehemStar(1.8); star.position.set(...STAR); scene.add(star);
  const ring = burst(220, { speed: 3.2, life: 1.6, size: 0.14, gravity: 0, seed: 21, drag: 1.2 }); ring.position.copy(star.position); scene.add(ring);
  const beam = glowSprite(0xffe2a0, 5); beam.position.set(0.2, 2.3, -0.6); beam.scale.set(1.2, 4.6, 1); scene.add(beam);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const on = smooth(range(t, 0.3, 0.75));
      star.set(on * (1 + (t > 0.35 ? 0.8 * Math.exp(-(t - 0.35) * 3) : 0)), t);
      ring.update(t - 0.35);
      B.stable.setHoly(smooth(range(t, 0.45, 1.1)), t); B.stable.setLantern(smooth(range(t, 0.6, 1.2)), t);
      beam.material.opacity = 0.14 * on;
      const k = easeInOut(range(t, 0, 2.4));
      place(c, [lerp(0.0, 0.15, k), lerp(2.25, 2.85, k), lerp(9.4, 12.6, k)], [0.05, lerp(1.25, 1.6, k), 0]);
      return { bloom: 1.35, exposure: lerp(0.8, 1.1, on) };
    },
  };
}

export const SHOTS = [
  { start: 0.0, end: 1.95, build: shot1 },
  { start: 1.95, end: 4.25, build: shot2 },
  { start: 4.25, end: 6.05, build: shot3 },
  { start: 6.05, end: 8.95, build: shot4 },
  { start: 8.95, end: 11.15, build: shot5 },
  { start: 11.15, end: 13.48, build: shot6 },
  { start: 13.48, end: 15.10, build: shot7 },
  { start: 15.10, end: 18.00, build: shot8 },
  { start: 18.00, end: 19.68, build: shot9 },
  { start: 19.68, end: 22.25, build: shot10 },
  { start: 22.25, end: 24.55, build: shot11 },
  { start: 24.55, end: 26.00, build: shot12 },
  { start: 26.00, end: 29.55, build: shot13 },
  { start: 29.55, end: 32.60, build: shot14 },
  { start: 32.60, end: 35.20, build: shot15 },
  { start: 35.20, end: 37.45, build: shot16 },
  { start: 37.45, end: 44.95, build: shot17 },
  { start: 44.95, end: 48.00, build: shot18 },
  { start: 48.00, end: 52.95, build: shot19 },
  { start: 52.95, end: 55.95, build: shot20 },
  { start: 55.95, end: DURATION + 1, build: shot21 },
];
