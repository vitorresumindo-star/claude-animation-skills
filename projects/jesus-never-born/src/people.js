// Characters for "What if Jesus were never born?". Every person is the engine's cartoon rig (human.js),
// restyled by dress(): clothes, robes, hair, beards and hats. No patch to the engine is needed.
import * as THREE from 'three';
import { materials } from './materials.js';
import { makeHuman, torsoShell, torsoR, TORSO_SX, TORSO_SZ } from './human.js';
import { rng } from './textures.js';
import { V, ikArm } from './anim.js';

const shadowAll = o => { o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; };
export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });
const sph = (r, mat, pos = [0, 0, 0], scl = [1, 1, 1], seg = 24) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat);
  m.position.set(...pos); m.scale.set(...scl); return m;
};
const under = (o, g) => { for (let p = o; p; p = p.parent) if (p === g) return true; return false; };

// cloth with a soft weave bump
let _weave;
function weave() {
  if (_weave) return _weave;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const r = rng(77);
  x.fillStyle = '#808080'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 2) { x.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.05})`; x.fillRect(0, i, 128, 1); x.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.05})`; x.fillRect(i, 0, 1, 128); }
  _weave = new THREE.CanvasTexture(c); _weave.wrapS = _weave.wrapT = THREE.RepeatWrapping; _weave.repeat.set(8, 8);
  return _weave;
}
export const cloth = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.88, bumpMap: weave(), bumpScale: 0.8, ...o });
// fluffy white (Santa trim, beards)
let _fluff;
function fluffTex() {
  if (_fluff) return _fluff;
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const r = rng(9);
  x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const v = 60 + r() * 150; x.strokeStyle = `rgba(${v},${v},${v},0.6)`; x.lineWidth = 1 + r() * 2; const a = r() * 6.28, X = r() * 256, Y = r() * 256; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + Math.cos(a) * 6, Y + Math.sin(a) * 6); x.stroke(); }
  _fluff = new THREE.CanvasTexture(c); _fluff.wrapS = _fluff.wrapT = THREE.RepeatWrapping; _fluff.repeat.set(3, 3);
  return _fluff;
}
export const fluff = (color = 0xf7f4ee) => new THREE.MeshStandardMaterial({ color, roughness: 1, bumpMap: fluffTex(), bumpScale: 4 });

export const SKIN = { light: 0xe8b394, mid: 0xd99b7a, tan: 0xc08560, brown: 0x8d5a3b, dark: 0x5e3a26 };

// ---------- the dresser ----------
// spec: { skin, hair (color|null), hairStyle ('default'|'none'|'tonsure'|'short'), beard ('goatee'|'none'|'full'|'stubble'), beardColor,
//         shirt, sleeves ('short'|'long'), pants, shoes (color|'sandals'|'boots'|'bare'), robe: {color, hem, flare, sleeves}, belt }
export function dress(spec = {}) {
  const man = makeHuman('casual');
  const M = materials();
  const j = man.j;
  const skinM = spec.skin != null ? M.skin.clone() : M.skin;
  if (spec.skin != null) skinM.color.set(spec.skin);
  const hairM = spec.hair != null ? M.hair.clone() : M.hair; if (spec.hair != null) hairM.color.set(spec.hair);
  const beardM = spec.beardColor != null ? M.beard.clone() : M.beard; if (spec.beardColor != null) beardM.color.set(spec.beardColor);
  const shirtM = typeof spec.shirt === 'object' ? spec.shirt : cloth(spec.shirt ?? 0x2f7de1);
  const pantsM = typeof spec.pants === 'object' ? spec.pants : cloth(spec.pants ?? 0x34405a);
  const shoes = spec.shoes ?? 0xf2f2f2;
  const shoeM = typeof shoes === 'number' ? std(shoes, { roughness: 0.5 }) : shoes === 'boots' ? std(0x1a1a1c, { roughness: 0.4 }) : null;
  const sleeves = spec.sleeves ?? 'short';
  man.parts = { hair: [], beard: [], toes: [], legs: [], feet: [] };
  man.root.traverse(o => {
    if (!o.isMesh) return;
    const feet = under(o, j.lAn) || under(o, j.rAn);
    const legs = under(o, j.lHip) || under(o, j.rHip);
    const hand = under(o, j.lWr) || under(o, j.rWr);
    const fore = (under(o, j.lEl) || under(o, j.rEl)) && !hand;
    if (o.material === M.skin) o.material = skinM;
    if (o.material === M.hair) {
      if (o.geometry.type === 'SphereGeometry') man.parts.hair.push(o);
      o.material = hairM;
    }
    if (o.material === M.beard || (o.material.transparent && o.material.opacity === 0.2)) {
      man.parts.beard.push(o);
      if (o.material === M.beard) o.material = beardM;
    }
    if (feet) {
      man.parts.feet.push(o);
      const r = o.geometry.parameters && o.geometry.parameters.radius;
      if (o.material === skinM && r && r < 0.012) { man.parts.toes.push(o); if (shoeM) o.visible = false; }
      else if (o.material === skinM && shoeM) o.material = shoeM;
      else if (o.material === M.cloth) o.material = shoes === 'boots' ? shoeM : pantsM;
      return;
    }
    if (legs) man.parts.legs.push(o);
    if (o.material === M.cloth) o.material = legs ? pantsM : fore ? (sleeves === 'long' ? shirtM : skinM) : shirtM;
  });
  const lower = j.spine.children.find(o => o.isMesh); lower.material = pantsM;
  const tee = new THREE.Mesh(torsoShell(-0.04, 0.22, 0.012), shirtM); j.spine.add(tee);
  man.tee = tee;
  for (const k of ['l', 'r']) {
    if (sleeves === 'short') { const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.064, 0.05, 24), shirtM); hem.position.y = -0.22; j[k + 'Sh'].add(hem); }
    if (sleeves === 'long') { const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 20), shirtM); cuff.position.y = -0.235; j[k + 'El'].add(cuff); }
    if (shoeM && shoes !== 'boots') { const sole = sph(0.052, std(0x777777), [0, -0.065, 0.05], [1.0, 0.25, 2.4]); j[k + 'An'].add(sole); }
    if (shoes === 'boots') {
      const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.062, 0.26, 20), shoeM); boot.position.y = -0.3; j[k + 'Kn'].add(boot);
      const sole = sph(0.054, std(0x0c0c0c), [0, -0.07, 0.05], [1.05, 0.3, 2.45]); j[k + 'An'].add(sole);
    }
    if (shoes === 'sandals') {
      const sole = sph(0.054, std(0x5a3a22, { roughness: 0.8 }), [0, -0.075, 0.05], [1.05, 0.2, 2.4]); j[k + 'An'].add(sole);
      for (const z of [0.03, 0.1]) { const s = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.007, 6, 20), std(0x5a3a22)); s.rotation.x = Math.PI / 2; s.scale.set(1, 1.6, 0.6); s.position.set(0, -0.03, z); j[k + 'An'].add(s); }
    }
  }
  // hair
  if (spec.hairStyle === 'none' || spec.hairStyle === 'tonsure' || spec.hair === null) man.parts.hair.forEach(o => { o.visible = false; });
  if (spec.hairStyle === 'tonsure') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.024, 12, 48), hairM);
    ring.rotation.x = Math.PI / 2 - 0.32; ring.scale.set(0.98, 1.12, 1.0); ring.position.set(0, 0.138, -0.016); j.head.add(ring);
  }
  if (spec.hairStyle === 'short') man.parts.hair.forEach(o => { if (o.position.y > 0.17) o.visible = false; });
  // beard
  const bs = spec.beard ?? 'goatee';
  if (bs === 'none' || bs === 'full') man.parts.beard.forEach(o => { o.visible = false; });
  if (bs === 'stubble') man.parts.beard.forEach(o => { if (!o.material.transparent) o.visible = false; });
  if (bs === 'full') fullBeard(man, spec.beardColor ?? 0xf3f0ea);
  // robe
  if (spec.robe) robe(man, spec.robe);
  if (spec.belt) belt(man, spec.belt);
  man.mats = { skinM, hairM, shirtM, pantsM };
  shadowAll(man.root);
  return man;
}

// big full beard and moustache on the jaw (moves with the mouth)
export function fullBeard(man, color = 0xf3f0ea, size = 1) {
  const m = fluff(color);
  const jaw = man.j.head.children[0];          // jaw group is the head's first child
  const g = new THREE.Group(); jaw.add(g);
  g.add(sph(0.07 * size, m, [0, -0.06, 0.055], [1.12, 1.25, 0.75], 28));
  g.add(sph(0.05 * size, m, [0, -0.13 * size, 0.06], [1.0, 1.1, 0.7], 24));
  for (const s of [-1, 1]) g.add(sph(0.045, m, [s * 0.06, -0.02, 0.04], [0.8, 1.3, 0.8], 20));
  const mm = new THREE.Group(); man.j.head.add(mm);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.035, 6, 12), m); c.rotation.z = Math.PI / 2 + s * 0.45; c.position.set(s * 0.024, 0.037, 0.104); mm.add(c); }
  man.beardMesh = g;
  return g;
}

// a long robe hanging from the waist to the ankles (or knees), with an upper body shell and optional wide sleeves
export function robe(man, { color = 0x6b4a2e, hem = -0.9, flare = 0.11, mat = null, sleeves = 'wide', hideLegs = true, collar = true } = {}) {
  const j = man.j;
  const m = mat || cloth(color);
  const pts = [];
  const N = 30;
  for (let i = 0; i <= N; i++) {       // bottom to top (lathe faces outward)
    const y = hem + (0.22 - hem) * (i / N);
    const below = Math.max(0, (-0.15 - y) / (-0.15 - hem));
    const r = Math.max(torsoR(Math.max(-0.16, y)) + 0.016, 0.17) + flare * Math.pow(below, 1.3) + 0.02 * below;
    pts.push(new THREE.Vector2(r, y));
  }
  const g = new THREE.LatheGeometry(pts, 48);
  g.scale(TORSO_SX * 0.97, 1, 0.86);
  const skirt = new THREE.Mesh(g, m); j.spine.add(skirt);
  const up = torsoShell(0.18, 0.56, 0.016); up.translate(0, -0.2, 0);
  const top = new THREE.Mesh(up, m); j.chest.add(top);
  if (collar) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.02, 10, 32), m); c.rotation.x = Math.PI / 2; c.position.y = 0.355; c.scale.set(1.15, 1, 0.95); j.chest.add(c); }
  for (const k of ['l', 'r']) {
    j[k + 'Sh'].children.forEach(o => { if (o.isMesh) o.material = m; });
    j[k + 'El'].children.forEach(o => { if (o.isMesh) o.material = m; });
    if (sleeves === 'wide') {
      const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.085, 0.28, 24, 1, true), m); s1.position.y = -0.15; j[k + 'Sh'].add(s1);
      const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.125, 0.25, 24, 1, true), m.clone()); s2.material.side = THREE.DoubleSide; s2.position.y = -0.14; j[k + 'El'].add(s2);
    }
  }
  if (hideLegs && hem < -0.7) man.parts.legs.forEach(o => { o.visible = false; });
  if (!hideLegs) for (const k of ['l', 'r']) j[k + 'Hip'].children.forEach(o => { if (o.isMesh) o.visible = false; });
  man.robeMesh = skirt; man.robeMat = m;
  return skirt;
}
export function belt(man, { color = 0x3a2614, y = 0.03, r = 0.012, buckle = null } = {}) {
  const b = new THREE.Mesh(new THREE.TorusGeometry(torsoR(y) + 0.025, r, 8, 48), std(color, { roughness: 0.6 }));
  b.rotation.x = Math.PI / 2; b.scale.set(TORSO_SX, TORSO_SZ * 1.25, 1); b.position.y = y; man.j.spine.add(b);
  if (buckle) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.015), std(buckle, { metalness: 0.9, roughness: 0.3 })); k.position.set(0, y, torsoR(y) * TORSO_SZ * 1.3 + 0.012); man.j.spine.add(k); }
  return b;
}

// ---------- head wear ----------
export function santaHat(man) {
  const red = cloth(0xc8202a, { roughness: 0.8 });
  const g = new THREE.Group();
  const H = 0.27, cone = new THREE.CylinderGeometry(0.0005, 0.105, H, 32, 12, true);   // a cone with a tiny tip: ConeGeometry loses faces when heightSegments > 1
  cone.translate(0, H / 2, 0);
  const p = cone.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = y / H; p.setX(i, p.getX(i) + k * k * 0.13); p.setY(i, y - k * k * 0.07); }
  cone.computeVertexNormals();
  const c = new THREE.Mesh(cone, red); c.material.side = THREE.DoubleSide; g.add(c);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.103, 0.03, 12, 40), fluff()); rim.rotation.x = Math.PI / 2; g.add(rim);
  g.add(sph(0.035, fluff(), [0.13, H - 0.07, 0]));
  g.position.set(0, 0.165, -0.008); g.rotation.set(-0.18, 0, 0.12); g.scale.set(0.98, 1, 1.08);
  man.j.head.add(g); shadowAll(g);
  (man.parts?.hair || []).forEach(o => { if (o.position.y > 0.17) o.visible = false; });
  return g;
}
export function mitre(man, { color = 0xf4efe2, trim = 0xd4a63a } = {}) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-0.1, 0); s.lineTo(0.1, 0); s.lineTo(0.1, 0.12); s.quadraticCurveTo(0.09, 0.22, 0, 0.3); s.quadraticCurveTo(-0.09, 0.22, -0.1, 0.12); s.lineTo(-0.1, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 16 });
  const body = std(color, { roughness: 0.55 }), gold = std(trim, { metalness: 0.85, roughness: 0.3 });
  for (const sgn of [1, -1]) {
    const panel = new THREE.Mesh(geo, body); panel.position.z = sgn * 0.03; panel.rotation.x = -sgn * 0.08; panel.scale.set(1.0, 1, 1); g.add(panel);
    const vb = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.24, 0.006), gold); vb.position.set(0, 0.13, sgn * 0.03 + (sgn > 0 ? 0.022 : -0.01)); vb.rotation.x = -sgn * 0.08; g.add(vb);
    const cr = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.006), gold); cr.position.set(0, 0.17, sgn * 0.03 + (sgn > 0 ? 0.024 : -0.012)); cr.rotation.x = -sgn * 0.08; g.add(cr);
  }
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.104, 0.104, 0.035, 40, 1, true), gold); band.position.y = 0.0; band.scale.z = 1.05; band.material = gold.clone(); band.material.side = THREE.DoubleSide; g.add(band);
  g.position.set(0, 0.165, -0.004); g.rotation.x = -0.12;
  man.j.head.add(g); shadowAll(g);
  (man.parts?.hair || []).forEach(o => { if (o.position.y > 0.17) o.visible = false; });
  return g;
}
export function crozier() {
  const g = new THREE.Group();
  const gold = std(0xd8aa3c, { metalness: 0.9, roughness: 0.28 });
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 1.7, 14), gold); staff.position.y = 0.85; g.add(staff);
  const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 1.55; const r = 0.09 * (1 - i / 40 * 0.45); pts.push(new THREE.Vector3(Math.sin(a) * r, 1.7 + (1 - Math.cos(a)) * r * 0.9 + (i < 3 ? 0 : 0), 0)); }
  const hook = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.014, 8), gold); g.add(hook);
  g.add(sph(0.03, gold, [0, 1.68, 0]));
  return shadowAll(g);
}
export function nunHabit(man) {
  const black = cloth(0x17171b), white = std(0xf4f4f0, { roughness: 0.7 });
  const veil = new THREE.Mesh(new THREE.SphereGeometry(0.128, 48, 24, 0, Math.PI * 2, 0, 2.15), black);
  veil.scale.set(0.95, 1.12, 1.08); veil.position.set(0, 0.098, -0.012); veil.rotation.x = -0.62; veil.material.side = THREE.DoubleSide; man.j.head.add(veil);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.018, 10, 40, Math.PI * 1.25), white);
  band.rotation.set(0, 0, Math.PI / 2 - Math.PI * 0.625 + Math.PI); band.position.set(0, 0.1, 0.035); band.scale.set(0.9, 1.12, 0.6); band.rotation.y = 0; man.j.head.add(band);
  const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.2, 0.42, 32, 1, true, Math.PI * 0.6, Math.PI * 0.8), black);
  drape.position.set(0, -0.1, -0.035); drape.rotation.y = Math.PI; drape.material = black.clone(); drape.material.side = THREE.DoubleSide; man.j.head.add(drape);
  const bib = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 12, 0, Math.PI * 2, 0, 0.9), white); bib.scale.set(1.25, 0.55, 0.95); bib.position.y = 0.34; man.j.chest.add(bib);
  shadowAll(man.root);
}
export function monkHood(man, color = 0x6b4a2e) {
  const m = man.robeMat || cloth(color);
  const cowl = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.05, 12, 36), m); cowl.rotation.x = Math.PI / 2 - 0.25; cowl.position.set(0, 0.36, -0.02); cowl.scale.set(1.35, 1.1, 1); man.j.chest.add(cowl);
  const back = sph(0.11, m, [0, 0.33, -0.12], [1.1, 0.75, 0.6]); man.j.chest.add(back);
  shadowAll(man.root);
}
export function romanHelmet(man) {
  const bronze = new THREE.MeshPhysicalMaterial({ color: 0xc9a25a, metalness: 1, roughness: 0.32, clearcoat: 0.4 });
  const steel = materials().steel;
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.118, 40, 20, 0, Math.PI * 2, 0, 1.62), steel); bowl.scale.set(0.95, 1.08, 1.06); g.add(bowl);
  const brow = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.01, 8, 40, Math.PI), bronze); brow.rotation.set(Math.PI / 2, 0, Math.PI); brow.position.set(0, 0.0, 0.0); brow.scale.set(0.98, 1.07, 1); g.add(brow);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.05, 32, 1, true, Math.PI * 0.55, Math.PI * 0.9), steel); neck.position.set(0, -0.04, -0.03); neck.material = steel.clone(); neck.material.side = THREE.DoubleSide; neck.rotation.y = Math.PI; g.add(neck);
  for (const s of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.11, 0.07), bronze); cheek.position.set(s * 0.105, -0.07, 0.03); cheek.rotation.z = s * 0.08; g.add(cheek);
  }
  const crest = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.028, 10, 32, Math.PI), cloth(0xb5121b, { roughness: 1 }));
  crest.rotation.y = Math.PI / 2; crest.position.set(0, 0.075, 0); crest.scale.set(1, 1.05, 0.7); g.add(crest);
  const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.05, 10), bronze); holder.position.set(0, 0.13, 0); g.add(holder);
  g.position.set(0, 0.1, -0.005);
  man.j.head.add(g); man.parts.hair.forEach(o => { o.visible = false; });
  shadowAll(g);
  return g;
}
export function laurel(man, color = 0xd8b04a) {
  const g = new THREE.Group();
  const leaf = new THREE.MeshStandardMaterial({ color, metalness: 0.75, roughness: 0.32, emissive: 0x4a3000, emissiveIntensity: 0.3 });
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) {
    const a = (0.25 + i * 0.29) * s;
    const l = sph(0.024, leaf, [0, 0, 0], [0.45, 1, 0.2], 12);
    l.position.set(Math.sin(a) * 0.1, 0, Math.cos(a) * 0.106);
    l.rotation.set(0.5, a, s * 0.9); g.add(l);
  }
  g.position.set(0, 0.165, -0.01); g.rotation.x = -0.25; g.scale.set(0.95, 1, 1.05);
  man.j.head.add(g); shadowAll(g);
  return g;
}
export function mortarboard(color = 0x15151a) {
  const g = new THREE.Group();
  const m = std(color, { roughness: 0.7 });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.26), m));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 32), m); cap.position.y = -0.035; g.add(cap);
  const gold = std(0xe2b33c, { roughness: 0.5 });
  g.add(sph(0.012, gold, [0, 0.008, 0]));
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.13, 6), gold); cord.position.set(0.065, 0.004, 0.065); cord.rotation.set(Math.PI / 2, 0, Math.PI / 4); cord.rotation.order = 'YXZ'; g.add(cord);
  const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.07, 10), gold); tassel.position.set(0.125, -0.03, 0.125); g.add(tassel);
  return shadowAll(g);
}
export function sunglasses(man) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0x0b0b10, roughness: 0.08, metalness: 0.3, clearcoat: 1 });
  const g = new THREE.Group();
  for (const s of [-1, 1]) { const l = sph(0.024, m, [s * 0.036, 0.11, 0.099], [1.2, 0.85, 0.35]); g.add(l); }
  const br = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.006), m); br.position.set(0, 0.118, 0.104); g.add(br);
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.005, 0.1), m); arm.position.set(s * 0.068, 0.115, 0.05); g.add(arm); }
  man.j.head.add(g);
  return g;
}

// ---------- outfits ----------
export const PALETTE = { teal: 0x1fa5a0, orange: 0xf28a1c, blue: 0x2f7de1, red: 0xd2342a, yellow: 0xf2c230 };
export function modernGuy(o = {}) {          // the narrator's everyman: teal T-shirt, jeans, white sneakers
  return dress({ shirt: o.shirt ?? PALETTE.orange, pants: 0x2f3e5c, shoes: 0xf3f3f3, ...o });
}
export function santa() {
  const man = dress({ shirt: cloth(0xc8202a, { roughness: 0.8 }), pants: cloth(0xc8202a, { roughness: 0.8 }), sleeves: 'long', shoes: 'boots', beard: 'full', hair: 0xf3f0ea, skin: SKIN.light });
  const j = man.j;
  // a padded red jacket over the belly, white fur trims, black belt with gold buckle
  const coat = new THREE.Mesh(torsoShell(-0.2, 0.22, (y) => 0.03 + 0.05 * Math.exp(-(((y - 0.02) / 0.12) ** 2))), man.mats.shirtM); j.spine.add(coat);
  const hem = new THREE.Mesh(new THREE.TorusGeometry(torsoR(-0.2) + 0.045, 0.03, 10, 48), fluff()); hem.rotation.x = Math.PI / 2; hem.scale.set(TORSO_SX, TORSO_SZ * 1.3, 1); hem.position.y = -0.2; j.spine.add(hem);
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.03), fluff()); front.position.set(0, 0.1, torsoR(0.05) * TORSO_SZ + 0.065); j.spine.add(front);
  belt(man, { color: 0x111111, y: -0.02, r: 0.03, buckle: 0xe1b84a });
  for (const k of ['l', 'r']) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.022, 10, 28), fluff()); c.rotation.x = Math.PI / 2; c.position.y = -0.235; j[k + 'El'].add(c); }
  // white gloves
  man.root.traverse(o => { if (o.isMesh && (under(o, j.lWr) || under(o, j.rWr))) o.material = std(0xf5f5f2, { roughness: 0.8 }); });
  santaHat(man);
  shadowAll(man.root);
  return man;
}
export function bishop() {                  // Saint Nicholas: white alb, red cope, mitre, crozier, white beard
  const man = dress({ shirt: 0xf3efe6, pants: 0xf3efe6, sleeves: 'long', shoes: 0x7a1414, beard: 'full', hair: 0xeeebe4, skin: SKIN.light });
  robe(man, { color: 0xf3efe6, hem: -0.9, flare: 0.08, sleeves: 'none' });
  const red = cloth(0xb0141c, { roughness: 0.7 }), gold = std(0xd8aa3c, { metalness: 0.85, roughness: 0.3 });
  // the cope: an open red cape over the shoulders down to the shins, with a gold border
  const pts = []; for (let i = 0; i <= 24; i++) { const y = -0.75 + (0.58 + 0.75) * i / 24; pts.push(new THREE.Vector2(Math.max(torsoR(Math.min(0.55, y)) + 0.045, 0.2) + 0.12 * Math.max(0, -y) * 0.6, y)); }
  const cg = new THREE.LatheGeometry(pts, 48, Math.PI * 0.2, Math.PI * 1.6); cg.scale(TORSO_SX * 1.02, 1, 0.92);
  const cope = new THREE.Mesh(cg, red); cope.material.side = THREE.DoubleSide; man.j.spine.add(cope);
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.28, 0.02), gold); const a = s * Math.PI * 0.2; b.position.set(Math.sin(a) * 0.235 * TORSO_SX, -0.08, Math.cos(a) * 0.2); b.rotation.set(-0.1, a, -s * 0.05); man.j.spine.add(b); }
  const clasp = sph(0.035, gold, [0, 0.33, 0.14], [1, 1, 0.5]); man.j.chest.add(clasp);
  for (const k of ['l', 'r']) man.j[k + 'Sh'].add(sph(0.075, red, [0, -0.02, 0], [1.25, 1.1, 1.2]));
  mitre(man);
  shadowAll(man.root);
  return man;
}
export function monk() {
  const man = dress({ shirt: 0x6b4a2e, pants: 0x6b4a2e, sleeves: 'long', shoes: 'sandals', hairStyle: 'tonsure', beard: 'none', hair: 0x5a3c22, skin: SKIN.mid });
  robe(man, { color: 0x6b4a2e, hem: -0.88, flare: 0.1, sleeves: 'wide' });
  belt(man, { color: 0xd9c9a0, y: 0.04, r: 0.012 });
  const knot = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6), std(0xd9c9a0)); knot.position.set(0.1, -0.17, 0.15); knot.rotation.z = 0.06; man.j.spine.add(knot);
  monkHood(man);
  return man;
}
export function nun() {
  const man = dress({ shirt: 0x17171b, pants: 0x17171b, sleeves: 'long', shoes: 0x111111, hairStyle: 'none', beard: 'none', skin: SKIN.light });
  robe(man, { color: 0x17171b, hem: -0.9, flare: 0.09, sleeves: 'wide' });
  nunHabit(man);
  return man;
}
export function roman() {                   // legionary: red tunic, segmented steel bands, helmet, sandals
  const man = dress({ shirt: 0xa8141c, pants: 0xa8141c, sleeves: 'short', shoes: 'sandals', beard: 'stubble', skin: SKIN.tan, hair: 0x2a1a10 });
  const j = man.j;
  // bare legs below a knee-length tunic skirt
  man.parts.legs.forEach(o => { if (o.material === man.mats.pantsM) o.material = man.mats.skinM; });
  robe(man, { color: 0xa8141c, hem: -0.42, flare: 0.07, sleeves: 'none', hideLegs: false, collar: false });
  const steel = materials().steel;
  for (let i = 0; i < 5; i++) {
    const y = 0.02 + i * 0.075;
    const band = new THREE.Mesh(torsoShell(y, y + 0.068, 0.034 + i * 0.002, { rows: 4 }), steel);
    if (y + 0.068 <= 0.2) j.spine.add(band); else { band.position.y = -0.2; j.chest.add(band); }
  }
  for (const k of ['l', 'r']) { for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.085 + i * 0.004, 24, 8, 0, Math.PI * 2, i * 0.35, 0.5), steel); p.material = steel.clone(); p.material.side = THREE.DoubleSide; p.rotation.z = (k === 'l' ? -1 : 1) * 0.35; j[k + 'Sh'].add(p); } }
  // leather strips (pteruges) over the skirt
  for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 2.2; const st = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.008), std(0x4a2e18)); st.position.set(Math.sin(a) * 0.19, -0.22, Math.cos(a) * 0.15); st.rotation.y = a; j.spine.add(st); }
  belt(man, { color: 0x4a2e18, y: -0.02, r: 0.018, buckle: 0xc9a25a });
  romanHelmet(man);
  shadowAll(man.root);
  return man;
}
export function carrier() {                 // a local man in a plain tunic, carrying a soldier's pack
  const man = dress({ shirt: 0xd8c39a, pants: 0xd8c39a, sleeves: 'short', shoes: 'sandals', skin: SKIN.tan, hair: 0x2a1a10, beard: 'goatee' });
  man.parts.legs.forEach(o => { if (o.material === man.mats.pantsM) o.material = man.mats.skinM; });
  robe(man, { color: 0xd8c39a, hem: -0.45, flare: 0.06, sleeves: 'none', hideLegs: false, collar: false });
  belt(man, { color: 0x6a4a2a, y: 0.0, r: 0.012 });
  return man;
}
export function graduate(skin = SKIN.mid, hair = 0x2a1a10) {
  const man = dress({ shirt: 0x141418, pants: 0x141418, sleeves: 'long', shoes: 0x111111, skin, hair, beard: 'none' });
  robe(man, { color: 0x141418, hem: -0.78, flare: 0.08, sleeves: 'none' });
  // white preaching bands at the throat: the mark of a minister
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.09, 0.006), std(0xffffff)); b.position.set(s * 0.016, 0.31, torsoR(0.5) * TORSO_SZ + 0.025); b.rotation.x = -0.25; man.j.chest.add(b); }
  const cap = mortarboard(); cap.position.set(0, 0.215, -0.01); cap.rotation.x = -0.1; man.j.head.add(cap);
  man.parts.hair.forEach(o => { if (o.position.y > 0.17) o.visible = false; });
  man.cap = cap;
  shadowAll(man.root);
  return man;
}
export function patient(skin = SKIN.mid) {
  return dress({ shirt: 0xf1ede2, pants: 0xf1ede2, sleeves: 'long', shoes: 'bare', skin, beard: 'stubble' });
}

// marble statue: every material becomes veined marble (Jupiter, Thor)
let _marble;
export function marbleMat(tint = 0xf2efe8) {
  if (!_marble) {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); const r = rng(31);
    x.fillStyle = '#f0ede6'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 40; i++) {
      x.strokeStyle = `rgba(120,115,110,${0.05 + r() * 0.12})`; x.lineWidth = 0.6 + r() * 2.2;
      x.beginPath(); let X = r() * 512, Y = r() * 512; x.moveTo(X, Y);
      for (let k = 0; k < 12; k++) { X += (r() - 0.3) * 60; Y += (r() - 0.5) * 40; x.lineTo(X, Y); }
      x.stroke();
    }
    _marble = new THREE.CanvasTexture(c); _marble.colorSpace = THREE.SRGBColorSpace; _marble.wrapS = _marble.wrapT = THREE.RepeatWrapping;
  }
  return new THREE.MeshPhysicalMaterial({ color: tint, map: _marble, roughness: 0.34, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.2 });
}
export function statuefy(root, tint) {
  const m = marbleMat(tint);
  root.traverse(o => { if (o.isMesh) { o.material = m; if (o.material.transparent) o.material.transparent = false; } });
  return m;
}

// ---------- poses ----------
export function idle(t, k = 1) { return Math.sin(t * 1.6) * 0.012 * k; }
export const STAND = {
  lSh: [0.05, 0, 0.16], rSh: [0.05, 0, -0.16], lEl: [-0.25, 0, 0], rEl: [-0.25, 0, 0],
  lHip: [0, 0, 0.07], rHip: [0, 0, -0.07], lAn: [0, 0, -0.07], rAn: [0, 0, 0.07],
};
export function standPose(h, t, extra = {}) {
  const p = { ...STAND, ...extra };
  p.chest = [idle(t) + (extra.chest?.[0] || 0), extra.chest?.[1] || 0, extra.chest?.[2] || 0];
  h.setPose(p);
}
export function walkPose(ph, extra = {}, amt = 1) {
  const s = Math.sin(ph), c = Math.cos(ph);
  return {
    ...STAND,
    lHip: [-0.42 * s * amt, 0, 0.05], rHip: [0.42 * s * amt, 0, -0.05],
    lKn: [(0.12 + 0.55 * Math.max(0, c)) * amt, 0, 0], rKn: [(0.12 + 0.55 * Math.max(0, -c)) * amt, 0, 0],
    lAn: [0.1 * s * amt, 0, 0], rAn: [-0.1 * s * amt, 0, 0],
    lSh: [0.38 * s * amt, 0, 0.12], rSh: [-0.38 * s * amt, 0, -0.12], lEl: [-0.35, 0, 0], rEl: [-0.35, 0, 0],
    pelvis: [0, 0.08 * s * amt, 0], chest: [0.04, -0.12 * s * amt, 0], drop: -0.03 + 0.02 * Math.abs(c) * amt, ...extra,
  };
}
export function runPose(ph, extra = {}) {
  const s = Math.sin(ph), c = Math.cos(ph);
  return {
    ...STAND,
    lHip: [-0.75 * s - 0.15, 0, 0.05], rHip: [0.75 * s - 0.15, 0, -0.05],
    lKn: [0.25 + 1.0 * Math.max(0, c), 0, 0], rKn: [0.25 + 1.0 * Math.max(0, -c), 0, 0],
    lAn: [0.2 * s, 0, 0], rAn: [-0.2 * s, 0, 0],
    lSh: [0.7 * s, 0, 0.15], rSh: [-0.7 * s, 0, -0.15], lEl: [-1.3, 0, 0], rEl: [-1.3, 0, 0],
    spine: [0.18, 0, 0], pelvis: [0, 0.1 * s, 0], chest: [0.05, -0.15 * s, 0], drop: -0.06 + 0.05 * Math.abs(c), ...extra,
  };
}
export const L = (h, x, y, z) => { h.root.updateMatrixWorld(true); return h.root.localToWorld(V(x, y, z)); };
export const dirL = (h, x, y, z) => V(x, y, z).applyQuaternion(h.root.getWorldQuaternion(new THREE.Quaternion()));
export function handOnHip(h, s, k) {
  h.root.updateMatrixWorld(true);
  const T = h.root.localToWorld(V(s * 0.21, 0.98, 0.03));
  const P = h.root.localToWorld(V(s * 0.75, 1.15, -0.25));
  ikArm(h, k, T, P, dirL(h, -s, 0, 0));
}
// reach a hand (k = 'l' | 'r') to a point in the person's own space, elbow out to the side
export function reach(h, k, x, y, z, hint = [0, 0, 1], elbow = null) {
  const s = k === 'l' ? 1 : -1;
  const e = elbow || [s * 0.6, 0.9, -0.2];
  ikArm(h, k, L(h, x, y, z), L(h, ...e), dirL(h, ...hint));
}

// raised brows and wide eyes (setMouth lowers the brows, which reads as angry): call after setMouth
export function surprise(man, k = 1) {
  const head = man.j.head;
  head.children.forEach(o => {
    if (o.isMesh && o.geometry.type === 'CapsuleGeometry' && o.position.y > 0.12 && o.position.y < 0.15) {
      const s = Math.sign(o.position.x);
      o.position.y = 0.136 + 0.014 * k;
      o.rotation.z = Math.PI / 2 + s * (0.12 - 0.34 * k);
    }
    if (o.isMesh && o.geometry.type === 'SphereGeometry' && o.geometry.parameters.thetaLength === 1.25) o.rotation.x = 0.25 - 0.55 * k;
  });
}
