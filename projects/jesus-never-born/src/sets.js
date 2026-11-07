// Sets and props, part 1: ground and textures, Bethlehem at night, the split-flap year board, the timeline,
// a country church, the hammock yard, Christmas and Easter props, a modern road and a Roman road with a milestone.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from './textures.js';
import { glowSprite } from './props.js';
import { textTexture, textPlane, bethlehemStar, hideShadowCatcher } from './fx.js';
import { std, cloth, fluff } from './people.js';

export const shadowAll = o => { o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; };
export const box = (w, h, d, mat, p = [0, 0, 0], r = [0, 0, 0]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(...p); m.rotation.set(...r); return m; };
export const rbox = (w, h, d, mat, rad = 0.02, p = [0, 0, 0]) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rad), mat); m.position.set(...p); return m; };
export const cyl = (rt, rb, h, mat, p = [0, 0, 0], seg = 20) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(...p); return m; };
export const ball = (r, mat, p = [0, 0, 0], s = [1, 1, 1], seg = 24) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), mat); m.position.set(...p); m.scale.set(...s); return m; };

// ---------- canvas textures ----------
export function canvasTex(draw, w = 512, h = 512, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  draw(x, w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  return t;
}
function speckle(x, w, h, base, n, cols, size = [1, 3], seed = 1) {
  const r = rng(seed); x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { x.fillStyle = cols[Math.floor(r() * cols.length)]; const s = size[0] + r() * (size[1] - size[0]); x.fillRect(r() * w, r() * h, s, s * (0.6 + r())); }
}
const TEX = {};
export const grassTex = (rep = 40) => (TEX['g' + rep] ||= canvasTex((x, w, h) => speckle(x, w, h, '#5f9d3c', 9000, ['#4f8a30', '#6fb046', '#7bbd52', '#568f36', '#86c35a'], [1, 4], 4), 256, 256, { repeat: [rep, rep] }));
export const sandTex = (rep = 30) => (TEX['s' + rep] ||= canvasTex((x, w, h) => speckle(x, w, h, '#c9a877', 7000, ['#b8975f', '#d8b98a', '#bf9d69', '#a98a58', '#e0c497'], [1, 3], 6), 256, 256, { repeat: [rep, rep] }));
export const woodTex = (rep = [1, 1], tint = '#8a5a32', seed = 3) => canvasTex((x, w, h) => {
  const r = rng(seed); x.fillStyle = tint; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(${r() < .5 ? 40 : 190},${r() < .5 ? 25 : 130},${r() < .5 ? 10 : 70},${0.12 + r() * 0.2})`; x.lineWidth = 1 + r() * 3; const X = r() * w; x.beginPath(); x.moveTo(X, 0); for (let y = 0; y <= h; y += 32) x.lineTo(X + Math.sin(y * 0.02 + i) * 4, y); x.stroke(); }
}, 128, 512, { repeat: rep });
export const plankTex = (rep = [4, 4], tint = '#9b6a3f') => canvasTex((x, w, h) => {
  const r = rng(12); x.fillStyle = tint; x.fillRect(0, 0, w, h);
  const n = 6, ph = h / n;
  for (let i = 0; i < n; i++) {
    const v = (r() - 0.5) * 30; x.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 220 : 0},${v > 0 ? 170 : 0},${Math.abs(v) / 200})`; x.fillRect(0, i * ph, w, ph);
    for (let k = 0; k < 14; k++) { x.strokeStyle = `rgba(60,35,15,${0.08 + r() * 0.12})`; x.lineWidth = 1; const y = i * ph + r() * ph; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + 3, w * 0.6, y - 3, w, y + 1); x.stroke(); }
    x.fillStyle = 'rgba(40,22,10,0.55)'; x.fillRect(0, i * ph, w, 2);
    const cut = r() * w; x.fillRect(cut, i * ph, 2, ph);
  }
}, 512, 512, { repeat: rep });
export const stoneTex = (rep = [2, 2], base = '#b9b0a2', seed = 5) => canvasTex((x, w, h) => {
  const r = rng(seed); x.fillStyle = '#7d756a'; x.fillRect(0, 0, w, h);
  const rows = 8, rh = h / rows;
  for (let i = 0; i < rows; i++) {
    let X = -r() * 60;
    while (X < w) {
      const bw = 50 + r() * 70; const v = Math.floor((r() - 0.5) * 34);
      x.fillStyle = base; x.globalAlpha = 1; x.fillRect(X + 2, i * rh + 2, bw - 4, rh - 4);
      x.fillStyle = v > 0 ? `rgba(255,255,255,${v / 120})` : `rgba(0,0,0,${-v / 110})`; x.fillRect(X + 2, i * rh + 2, bw - 4, rh - 4);
      for (let k = 0; k < 30; k++) { x.fillStyle = `rgba(0,0,0,${r() * 0.08})`; x.fillRect(X + r() * bw, i * rh + r() * rh, 2, 2); }
      X += bw;
    }
  }
}, 512, 512, { repeat: rep });
export const brickTex = (rep = [1, 1]) => canvasTex((x, w, h) => {
  const r = rng(8); x.fillStyle = '#d9cdbd'; x.fillRect(0, 0, w, h);
  const bh = 16, bw = 46;
  for (let row = 0; row * bh < h; row++) for (let X = (row % 2) * -bw / 2; X < w; X += bw) {
    const v = r(); x.fillStyle = `rgb(${150 + v * 40 | 0},${58 + v * 22 | 0},${42 + v * 14 | 0})`; x.fillRect(X + 1.5, row * bh + 1.5, bw - 3, bh - 3);
  }
}, 512, 512, { repeat: rep });
export const tileRoofTex = (rep = [4, 4], c1 = '#a3402e', c2 = '#7e2e22') => canvasTex((x, w, h) => {
  const r = rng(14); x.fillStyle = c2; x.fillRect(0, 0, w, h);
  const rows = 12, rh = h / rows;
  for (let i = 0; i < rows; i++) for (let X = (i % 2) * -16; X < w; X += 32) {
    const g = x.createLinearGradient(0, i * rh, 0, (i + 1) * rh); g.addColorStop(0, c1); g.addColorStop(1, c2);
    x.fillStyle = g; x.beginPath(); x.roundRect(X + 1, i * rh, 30, rh - 1, [0, 0, 10, 10]); x.fill();
    x.fillStyle = `rgba(0,0,0,${r() * 0.15})`; x.fillRect(X + 1, i * rh, 30, rh - 1);
  }
}, 512, 512, { repeat: rep });

// ---------- ground ----------
export function ground(scene, { mat, radius = 80, fog = null, y = 0 } = {}) {
  hideShadowCatcher(scene);
  const g = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), mat || new THREE.MeshStandardMaterial({ map: grassTex(), roughness: 0.95 }));
  g.rotation.x = -Math.PI / 2; g.position.y = y; g.receiveShadow = true; scene.add(g);
  if (fog) scene.fog = new THREE.Fog(fog[0], fog[1], fog[2]);
  return g;
}
// rolling hills for a horizon: a displaced ring of land
export function hills({ inner = 14, outer = 70, height = 3.5, color = 0x6e9e48, seed = 2, map = null } = {}) {
  const geo = new THREE.RingGeometry(inner, outer, 128, 24);
  const p = geo.attributes.position; const r = rng(seed); const ph = [r() * 6, r() * 6, r() * 6];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i); const d = Math.hypot(x, y), a = Math.atan2(y, x);
    const k = THREE.MathUtils.smoothstep(d, inner, inner + 10);
    const hgt = height * k * (0.55 + 0.45 * Math.sin(a * 3 + ph[0]) * Math.sin(a * 7 + ph[1]) + 0.25 * Math.sin(a * 13 + ph[2]));
    p.setZ(i, Math.max(0, hgt));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, map }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
  return m;
}
export function palm(h = 3.2, seed = 1) {
  const g = new THREE.Group(); const r = rng(seed);
  const bend = 0.25 + r() * 0.3, pts = [];
  for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push(new THREE.Vector3(Math.sin(k * 1.2) * bend, k * h, 0)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.09, 8), std(0x7a5a3a, { map: woodTex([2, 6], '#7a5a3a', 9) })));
  for (let i = 0; i < 9; i++) { const k = (i + 0.5) / 10; const ring = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.02, 6, 16), std(0x5e4329)); ring.position.copy(curve.getPoint(k)); ring.rotation.x = Math.PI / 2; g.add(ring); }
  const top = curve.getPoint(1); const leafM = std(0x3f7d2c, { side: THREE.DoubleSide, roughness: 0.85 });
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + r(); const L = 1.3 + r() * 0.4;
    const lp = []; for (let k = 0; k <= 8; k++) { const s = k / 8; lp.push(new THREE.Vector3(Math.cos(a) * s * L, Math.sin(s * Math.PI * 0.9) * 0.35 - s * s * 0.7, Math.sin(a) * s * L)); }
    const lc = new THREE.CatmullRomCurve3(lp);
    const geo = new THREE.BufferGeometry(); const pos = [], idx = [];
    for (let k = 0; k <= 16; k++) {
      const s = k / 16, c = lc.getPoint(s), tan = lc.getTangent(s); const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const wdt = 0.22 * Math.sin(Math.PI * Math.min(1, s * 1.15)) + 0.02;
      pos.push(c.x + side.x * wdt, c.y - 0.03, c.z + side.z * wdt, c.x - side.x * wdt, c.y - 0.03, c.z - side.z * wdt);
      if (k) { const b = (k - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const leaf = new THREE.Mesh(geo, leafM); leaf.position.copy(top); g.add(leaf);
  }
  return shadowAll(g);
}
export function tree(seed = 1, s = 1, color = 0x4f8f39) {     // round deciduous tree
  const g = new THREE.Group(); const r = rng(seed);
  g.add(cyl(0.07 * s, 0.1 * s, 1.0 * s, std(0x6b4a2e), [0, 0.5 * s, 0], 10));
  const m = std(color, { roughness: 0.9 });
  for (let i = 0; i < 6; i++) g.add(ball((0.38 + r() * 0.2) * s, m, [(r() - 0.5) * 0.5 * s, (1.25 + r() * 0.45) * s, (r() - 0.5) * 0.5 * s], [1, 0.9, 1], 14));
  return shadowAll(g);
}
export function cypress(seed = 1, h = 3) {
  const g = new THREE.Group(); const r = rng(seed);
  g.add(cyl(0.06, 0.08, 0.5, std(0x5a3e28), [0, 0.25, 0], 8));
  const m = std(0x2f5a2a, { roughness: 0.95 });
  const c = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), m); c.scale.set(0.75 + r() * 0.15, h / 0.8, 0.75 + r() * 0.15); c.position.y = h * 0.55; g.add(c);
  return shadowAll(g);
}

// ---------- Bethlehem at night: a stable with a manger, sheep, flat-roofed houses on a hill ----------
export function sheep(seed = 1) {
  const g = new THREE.Group(); const r = rng(seed);
  const wool = fluff(0xf2eee6), dark = std(0x2b2523, { roughness: 0.8 });
  for (let i = 0; i < 9; i++) g.add(ball(0.16 + r() * 0.05, wool, [(r() - 0.5) * 0.32, 0.36 + r() * 0.12, (r() - 0.5) * 0.18], [1, 0.9, 1], 14));
  const head = new THREE.Group(); head.position.set(0.28, 0.42, 0); g.add(head);
  head.add(ball(0.09, dark, [0.04, 0, 0], [1.3, 0.9, 0.85], 16));
  head.add(ball(0.07, wool, [-0.03, 0.06, 0], [1, 0.8, 1], 12));
  for (const s of [-1, 1]) { head.add(ball(0.035, dark, [0.0, 0.0, s * 0.08], [1.4, 0.5, 0.8], 10)); head.add(ball(0.016, std(0xffffff, { roughness: 0.2 }), [0.1, 0.03, s * 0.045], [1, 1, 1], 8)); head.add(ball(0.009, std(0x000000), [0.112, 0.032, s * 0.048], [1, 1, 1], 8)); }
  for (const [x, z] of [[0.15, 0.08], [0.15, -0.08], [-0.15, 0.08], [-0.15, -0.08]]) g.add(cyl(0.025, 0.022, 0.3, dark, [x, 0.15, z], 8));
  g.head = head;
  return shadowAll(g);
}
export function stable() {
  const g = new THREE.Group();
  const wood = std(0x7a5232, { map: woodTex([1, 2], '#7a5232', 4), roughness: 0.85 });
  const dark = std(0x5a3a22, { map: woodTex([1, 2], '#5a3a22', 7), roughness: 0.9 });
  const W = 3.2, D = 2.2, H = 2.3;
  for (const [x, z] of [[-W / 2, D / 2], [W / 2, D / 2], [-W / 2, -D / 2], [W / 2, -D / 2]]) g.add(cyl(0.08, 0.09, H + (z < 0 ? 0.35 : 0), wood, [x, (H + (z < 0 ? 0.35 : 0)) / 2, z], 10));
  for (let i = 0; i < 14; i++) g.add(box(W / 14 - 0.02, H + 0.3, 0.05, i % 3 ? dark : wood, [-W / 2 + (i + 0.5) * W / 14, (H + 0.3) / 2, -D / 2 - 0.03]));
  for (let i = 0; i < 9; i++) g.add(box(0.05, H - 0.2 + (i / 8) * 0.3, D / 9 - 0.02, i % 2 ? dark : wood, [-W / 2 - 0.03, (H - 0.2) / 2, -D / 2 + (i + 0.5) * D / 9]));
  // slanted roof of planks with a thatch layer
  const roof = new THREE.Group(); roof.position.set(0, H + 0.17, 0); roof.rotation.x = 0.16; g.add(roof);
  for (let i = 0; i < 12; i++) roof.add(box(W + 0.5, 0.05, (D + 0.7) / 12, i % 2 ? wood : dark, [0, 0, -(D + 0.7) / 2 + (i + 0.5) * (D + 0.7) / 12]));
  const thatch = new THREE.Mesh(new RoundedBoxGeometry(W + 0.6, 0.14, D + 0.8, 3, 0.06), new THREE.MeshStandardMaterial({ color: 0xbf9a4e, roughness: 1, bumpMap: fluff().bumpMap, bumpScale: 6 })); thatch.position.y = 0.09; roof.add(thatch);
  g.add(box(W + 0.2, 0.12, 0.12, wood, [0, H + 0.02, D / 2]));
  // straw floor
  const straw = new THREE.Mesh(new THREE.CircleGeometry(1.9, 40), new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 1, bumpMap: fluff().bumpMap, bumpScale: 3 }));
  straw.rotation.x = -Math.PI / 2; straw.position.y = 0.01; straw.scale.set(1, 0.7, 1); g.add(straw);
  // the manger: an X-legged wooden trough with hay
  const manger = new THREE.Group(); manger.position.set(0, 0, 0.15); g.add(manger);
  for (const s of [-1, 1]) for (const a of [-0.5, 0.5]) { const leg = box(0.06, 0.62, 0.06, wood, [s * 0.42, 0.28, 0], [a, 0, 0]); manger.add(leg); }
  for (const s of [-1, 1]) manger.add(box(0.95, 0.04, 0.32, wood, [0, 0.46, s * 0.17], [s * 0.55, 0, 0]));
  for (const s of [-1, 1]) manger.add(box(0.05, 0.22, 0.5, wood, [s * 0.47, 0.5, 0]));
  const hay = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.16, 0.42, 3, 0.07), new THREE.MeshStandardMaterial({ color: 0xe0b45a, roughness: 1, bumpMap: fluff().bumpMap, bumpScale: 8 })); hay.position.y = 0.56; manger.add(hay);
  for (let i = 0; i < 16; i++) { const s = box(0.004, 0.004, 0.12, std(0xe8c46a), [(i / 15 - 0.5) * 0.9, 0.62, (i % 3 - 1) * 0.12], [0.3 * (i % 2 ? 1 : -1), i * 0.7, 0]); manger.add(s); }
  // the holy light over the manger
  const glow = glowSprite(0xffe2a0, 1.6); glow.position.set(0, 0.75, 0); manger.add(glow);
  const glow2 = glowSprite(0xfff4d8, 0.55); glow2.position.set(0, 0.7, 0); manger.add(glow2);
  const light = new THREE.PointLight(0xffc874, 6, 6, 1.6); light.position.set(0, 0.95, 0.25); manger.add(light);
  // a lantern on the front post
  const lant = new THREE.Group(); lant.position.set(W / 2 - 0.05, 1.65, D / 2 + 0.12); g.add(lant);
  lant.add(box(0.14, 0.2, 0.14, std(0x2a2422, { metalness: 0.6, roughness: 0.5 })));
  const flame = glowSprite(0xffb050, 0.5); lant.add(flame);
  const ll = new THREE.PointLight(0xffa850, 2.2, 5, 1.8); lant.add(ll);
  g.manger = manger; g.glow = [glow, glow2]; g.light = light; g.lantern = { flame, light: ll };
  g.setHoly = (k, t = 0) => {   // 0 = dark and empty, 1 = shining
    const tw = 1 + 0.05 * Math.sin(t * 5.3);
    glow.material.opacity = 0.75 * k; glow.scale.setScalar(1.6 * (0.6 + 0.4 * k) * tw);
    glow2.material.opacity = k; light.intensity = 6 * k;
    glow.visible = glow2.visible = k > 0.003;
  };
  g.setLantern = (k, t = 0) => { flame.material.opacity = k * (0.85 + 0.15 * Math.sin(t * 17)); ll.intensity = 2.2 * k; flame.visible = k > 0.003; };
  return shadowAll(g);
}
export function flatHouse(w = 1.2, h = 1.0, d = 1.1, seed = 1, lit = false) {
  const g = new THREE.Group(); const r = rng(seed);
  const wall = std(new THREE.Color().setHSL(0.09, 0.25 + r() * 0.1, 0.62 + r() * 0.1), { roughness: 0.95 });
  g.add(box(w, h, d, wall, [0, h / 2, 0]));
  g.add(box(w + 0.06, 0.08, d + 0.06, wall, [0, h + 0.04, 0]));
  const dark = std(0x2a1d14, { roughness: 1 });
  g.add(box(0.26, 0.45, 0.02, dark, [(r() - 0.5) * w * 0.4, 0.225, d / 2 + 0.01]));
  const win = lit ? new THREE.MeshBasicMaterial({ color: 0xffb453, toneMapped: false }) : dark;
  g.add(box(0.16, 0.16, 0.02, win, [w * 0.25, h * 0.68, d / 2 + 0.011]));
  if (lit) { const gl = glowSprite(0xffaa50, 0.7); gl.material.opacity = 0.7; gl.position.set(w * 0.25, h * 0.68, d / 2 + 0.05); g.add(gl); g.glow = gl; }
  return shadowAll(g);
}
// the whole night scene: stable at the origin (opening toward +z), the town on a hill behind
export function bethlehem({ houses = 16, sheepN = 2 } = {}) {
  const g = new THREE.Group();
  const st = stable(); g.add(st);
  for (let i = 0; i < sheepN; i++) { const s = sheep(i + 3); s.position.set(i ? -1.15 : 1.05, 0, i ? 0.55 : 0.75); s.rotation.y = i ? 0.6 : 2.6; s.scale.setScalar(0.95); g.add(s); }
  const town = new THREE.Group(); town.position.set(1.5, 0, -9); g.add(town);
  const r = rng(40);
  const hill = new THREE.Mesh(new THREE.SphereGeometry(6, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: sandTex(10), roughness: 1, color: 0x9a8a70 })); hill.scale.set(1.4, 0.32, 0.8); town.add(hill);
  for (let i = 0; i < houses; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 4.6;
    const x = Math.cos(a) * d * 1.25, z = Math.sin(a) * d * 0.7;
    const y = 1.92 * Math.sqrt(Math.max(0, 1 - (x / 8.4) ** 2 - (z / 4.8) ** 2)) - 0.08;
    const hs = flatHouse(0.9 + r() * 0.8, 0.7 + r() * 0.8, 0.8 + r() * 0.6, i + 9, r() < 0.45);
    hs.position.set(x, y, z); hs.rotation.y = (r() - 0.5) * 0.6; town.add(hs);
  }
  for (let i = 0; i < 6; i++) { const p = palm(2.6 + r() * 1.2, i + 2); p.position.set((r() - 0.5) * 9, 0, 2.5 + r() * 3 - 9 + 5); p.rotation.y = r() * 6; g.add(p); }
  const pl = palm(3.4, 11); pl.position.set(-2.6, 0, -0.6); g.add(pl);
  const pr = palm(3.0, 12); pr.position.set(2.9, 0, -1.2); g.add(pr);
  g.stable = st; g.town = town;
  return g;
}

// ---------- split-flap year board ----------
function digitTex(d) {
  return canvasTex((x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2b2c30'); g.addColorStop(0.5, '#1d1e21'); g.addColorStop(1, '#2b2c30');
    x.fillStyle = g; x.beginPath(); x.roundRect(6, 6, w - 12, h - 12, 22); x.fill();
    x.fillStyle = '#f4f1e8'; x.font = '800 300px Sign'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(d), w / 2, h / 2 + 12);
    x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, h / 2 - 3, w, 6);
  }, 256, 384, { repeat: [1, 1] });
}
let _digits;
export function flipBoard({ n = 4, cw = 0.5, ch = 0.75, label = 'YEAR' } = {}) {
  _digits = _digits || [...Array(10).keys()].map(digitTex);
  const g = new THREE.Group();
  const gap = 0.07, W = n * cw + (n - 1) * gap + 0.3, H = ch + 0.42;
  const frame = new THREE.Mesh(new RoundedBoxGeometry(W, H, 0.16, 4, 0.05), new THREE.MeshPhysicalMaterial({ color: 0x15161a, roughness: 0.35, metalness: 0.3, clearcoat: 0.6 }));
  frame.position.set(0, 0.07, -0.09); g.add(frame);
  const lab = textPlane(label, 0.9, { font: '800 120px Sign', color: '#e9b949', w: 1024, h: 160 }); lab.position.set(0, ch / 2 + 0.18, 0.0); g.add(lab);
  const half = (top) => {         // plane covering the top or bottom half of a card, uv mapped to that half
    const geo = new THREE.PlaneGeometry(cw, ch / 2); geo.translate(0, top ? ch / 4 : -ch / 4, 0);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, top ? 0.5 + uv.getY(i) * 0.5 : uv.getY(i) * 0.5);
    return geo;
  };
  const back = (() => {            // the back of a falling flap: lower half of the next digit, seen after it turns over
    const geo = new THREE.PlaneGeometry(cw, ch / 2); geo.translate(0, ch / 4, 0); geo.rotateY(Math.PI);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) { uv.setX(i, 1 - uv.getX(i)); uv.setY(i, 0.5 - uv.getY(i) * 0.5); }
    return geo;
  })();
  const topG = half(true), botG = half(false);
  const cells = [];
  const mk = (geo) => new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: _digits[0], roughness: 0.55 }));
  for (let i = 0; i < n; i++) {
    const c = new THREE.Group(); c.position.x = -((n - 1) * (cw + gap)) / 2 + i * (cw + gap); g.add(c);
    const top = mk(topG), bot = mk(botG); top.position.z = -0.002; bot.position.z = -0.002; c.add(top, bot);
    const flap = new THREE.Group(); c.add(flap);
    const ff = mk(topG), fb = mk(back); flap.add(ff, fb);
    cells.push({ top, bot, flap, ff, fb });
  }
  // a hinge rod across the middle
  g.add(box(W - 0.2, 0.012, 0.03, std(0x0b0b0c), [0, 0, 0.004]));
  const setCell = (c, a, b, ph) => {    // flipping from digit a to b, phase 0..1
    c.top.material.map = _digits[ph > 0 ? b : a]; c.bot.material.map = _digits[a];
    c.ff.material.map = _digits[a]; c.fb.material.map = _digits[b];
    c.flap.visible = ph > 0 && ph < 1; c.flap.rotation.x = -Math.PI * ph;
    if (ph >= 1) { c.top.material.map = _digits[b]; c.bot.material.map = _digits[b]; }
  };
  // show(from, to, t): each digit counts up from its old value to its new one, one flip every dt
  g.show = (from, to, t, { dt = 0.075, stagger = 0.07 } = {}) => {
    for (let i = 0; i < n; i++) {
      const a = +from[i], b = +to[i];
      const steps = (b - a + 10) % 10;
      const tt = t - i * stagger;
      if (steps === 0 || tt <= 0) { setCell(cells[i], a, a, 0); continue; }
      const k = tt / dt;
      if (k >= steps) { setCell(cells[i], b, b, 1); continue; }
      const s = Math.floor(k), ph = k - s;
      setCell(cells[i], (a + s) % 10, (a + s + 1) % 10, THREE.MathUtils.smootherstep(ph, 0, 1));
    }
  };
  g.show('2026', '2026', 0);
  g.W = W; g.H = H;
  return shadowAll(g);
}

// ---------- the timeline: a glowing ribbon of years running into the distance (years grow toward -z) ----------
export const YEAR = 0.0052;          // metres per year
export function timeline() {
  const g = new THREE.Group();
  const from = -900, to = 2150;
  const z0 = -from * YEAR, z1 = -to * YEAR, mid = (z0 + z1) / 2, len = z0 - z1;
  const hot = (r, gg, b, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, gg, b).multiplyScalar(k), toneMapped: false });
  g.add(box(0.03, 0.008, len, hot(1, 0.72, 0.3, 2.4), [0, 0.004, mid]));
  const glowM = new THREE.MeshBasicMaterial({ color: 0xff9a2a, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  g.add(box(0.2, 0.002, len, glowM, [0, 0.002, mid]));
  const tickM = hot(1, 0.8, 0.45, 1.6);
  for (let y = -850; y <= 2100; y += 50) {
    const w = y % 500 === 0 ? 0.34 : y % 100 === 0 ? 0.18 : 0.09;
    g.add(box(w, 0.006, 0.008, tickM, [0, 0.004, -y * YEAR]));
  }
  const labels = {};
  const sign = (txt, y, { col = '#ffe2a6', wdt = 0.5, height = 0.3, font = '800 170px Sign', w = 1024, h = 256 } = {}) => {
    const t = textTexture(txt, { font, color: col, w, h, glow: 'rgba(255,150,40,1)' });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wdt, wdt * h / w), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.position.set(0, height, -y * YEAR); g.add(m); labels[txt] = m; return m;
  };
  for (const y of [500, 1000, 1500]) sign(String(y), y);
  sign('2026', 2026, { col: '#ffffff', wdt: 0.62, height: 0.34 });
  sign('AD 1', 1, { height: 0.72, wdt: 0.3 });
  const ped = cyl(0.07, 0.09, 0.08, new THREE.MeshStandardMaterial({ color: 0xe8c47a, metalness: 0.8, roughness: 0.3, emissive: 0x6a4a10, emissiveIntensity: 0.6 }), [0, 0.04, 0], 24); g.add(ped);
  const star = bethlehemStar(0.16); star.position.set(0, 0.4, 0); g.add(star);
  // 753 BC: a little Roman temple front (faces -z, toward the years after it)
  const rome = romanFront(0.75); rome.position.set(0, 0, 753 * YEAR + 0.6); rome.rotation.y = Math.PI; g.add(rome);
  const rl = textPlane(['FOUNDING OF ROME', '753 BC'], 1.5, { font: '700 110px Roman', color: '#ffe6b0', w: 1400, h: 440, glow: 'rgba(255,170,60,0.85)', lineH: 1.15 });
  rl.position.set(0, 2.15, 753 * YEAR + 0.6); rl.rotation.y = Math.PI; g.add(rl);
  g.star = star; g.ped = ped; g.labels = labels; g.rome = rome; g.romeLabel = rl;
  return g;
}
// a small temple front: steps, 6 columns, entablature and pediment (faces +z). s = scale (~width)
export function romanFront(s = 1, mat = null) {
  const g = new THREE.Group();
  const m = mat || new THREE.MeshPhysicalMaterial({ color: 0xf1ece2, roughness: 0.4, clearcoat: 0.2 });
  const W = 2 * s, colH = 1.3 * s;
  for (let i = 0; i < 3; i++) g.add(box(W + 0.3 * s - i * 0.12 * s, 0.07 * s, 0.9 * s - i * 0.12 * s, m, [0, 0.035 * s + i * 0.07 * s, 0]));
  const base = 0.21 * s;
  for (let i = 0; i < 6; i++) {
    const x = -W / 2 + 0.12 * s + i * (W - 0.24 * s) / 5;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * s, 0.085 * s, colH, 16), m); col.position.set(x, base + colH / 2, 0.25 * s); g.add(col);
    g.add(box(0.21 * s, 0.05 * s, 0.21 * s, m, [x, base + colH + 0.025 * s, 0.25 * s]));
    g.add(box(0.2 * s, 0.04 * s, 0.2 * s, m, [x, base + 0.02 * s, 0.25 * s]));
  }
  g.add(box(W + 0.1 * s, 0.22 * s, 0.75 * s, m, [0, base + colH + 0.16 * s, 0.05 * s]));
  const tri = new THREE.Shape(); tri.moveTo(-W / 2 - 0.05 * s, 0); tri.lineTo(W / 2 + 0.05 * s, 0); tri.lineTo(0, 0.42 * s); tri.lineTo(-W / 2 - 0.05 * s, 0);
  const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.7 * s, bevelEnabled: false }), m); ped.position.set(0, base + colH + 0.27 * s, -0.3 * s); g.add(ped);
  g.add(box(W * 0.9, colH, 0.05 * s, std(0xcfc6b6), [0, base + colH / 2, -0.15 * s]));
  return shadowAll(g);
}

// ---------- a country church on a grassy hill (front faces +z) ----------
export function church() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf6f3ec, roughness: 0.85 });
  const roofM = new THREE.MeshStandardMaterial({ map: tileRoofTex([5, 3], '#4b5466', '#353c4a'), roughness: 0.7 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x3d6ea8, roughness: 0.15, metalness: 0.2, clearcoat: 1, emissive: 0x0d2240, emissiveIntensity: 0.5 });
  const wood = std(0x6a3f22, { map: woodTex([1, 1], '#6a3f22', 2) });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe6b54a, metalness: 0.9, roughness: 0.25, emissive: 0x5a3a00, emissiveIntensity: 0.4 });
  const NW = 1.8, NH = 1.4, ND = 3.0;
  g.add(box(NW, NH, ND, white, [0, NH / 2, -0.4]));
  const gable = new THREE.Shape(); gable.moveTo(-NW / 2 - 0.12, 0); gable.lineTo(NW / 2 + 0.12, 0); gable.lineTo(0, 0.85); gable.lineTo(-NW / 2 - 0.12, 0);
  const rf = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: ND + 0.2, bevelEnabled: false }), roofM); rf.position.set(0, NH, -0.4 - (ND + 0.2) / 2); g.add(rf);
  const gw = new THREE.Shape(); gw.moveTo(-NW / 2, 0); gw.lineTo(NW / 2, 0); gw.lineTo(0, 0.74); gw.lineTo(-NW / 2, 0);
  for (const z of [-0.4 + ND / 2 + 0.001, -0.4 - ND / 2 - 0.001]) { const e = new THREE.Mesh(new THREE.ShapeGeometry(gw), white); e.position.set(0, NH, z); if (z < 0) e.rotation.y = Math.PI; g.add(e); }
  const arch = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0); return new THREE.ShapeGeometry(s, 16); };
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(arch(0.28, 0.62), glass); w.position.set(sx * (NW / 2 + 0.003), 0.55, -1.4 + i * 0.85); w.rotation.y = sx * Math.PI / 2; g.add(w); }
  // tower with belfry and spire
  const TW = 0.85, TH = 2.6;
  g.add(box(TW, TH, TW, white, [0, TH / 2, ND / 2 - 0.4 + TW / 2 - 0.1]));
  const tz = ND / 2 - 0.4 + TW / 2 - 0.1;
  for (const [x, z, ry] of [[0, tz + TW / 2 + 0.002, 0], [0, tz - TW / 2 - 0.002, Math.PI], [TW / 2 + 0.002, tz, Math.PI / 2], [-TW / 2 - 0.002, tz, -Math.PI / 2]]) {
    const b = new THREE.Mesh(arch(0.32, 0.5), std(0x1d1a18)); b.position.set(x, TH - 0.72, z); b.rotation.y = ry; g.add(b);
  }
  g.add(box(TW + 0.08, 0.08, TW + 0.08, white, [0, TH, tz]));
  const spire = new THREE.Mesh(new THREE.ConeGeometry(TW * 0.68, 1.5, 4), roofM); spire.rotation.y = Math.PI / 4; spire.position.set(0, TH + 0.75, tz); g.add(spire);
  const cross = new THREE.Group(); cross.position.set(0, TH + 1.5, tz); g.add(cross);
  cross.add(box(0.05, 0.42, 0.05, gold, [0, 0.21, 0])); cross.add(box(0.26, 0.05, 0.05, gold, [0, 0.29, 0]));
  const door = new THREE.Mesh(arch(0.42, 0.78), wood); door.position.set(0, 0.0, tz + TW / 2 + 0.004); g.add(door);
  const round = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), glass); round.position.set(0, 1.35, tz + TW / 2 + 0.004); g.add(round);
  for (let i = 0; i < 3; i++) g.add(box(0.8 - i * 0.12, 0.06, 0.25, std(0xd8d2c6), [0, 0.03 + i * 0.06, tz + TW / 2 + 0.25 - i * 0.07]));
  g.top = TH + 1.95;
  return shadowAll(g);
}
export function grassyHill(r = 9, h = 1.2) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: grassTex(20), roughness: 1 }));
  m.scale.set(1, h / r, 1); m.receiveShadow = true;
  return m;
}

// ---------- the hammock yard ----------
export function hammock() {
  const g = new THREE.Group();
  const L = 2.3, sag = 0.32, Wd = 0.9;
  const stripes = canvasTex((x, w, h) => { const cols = ['#e94f37', '#f6f7eb', '#3f88c5', '#f6f7eb', '#f2bb05', '#f6f7eb']; for (let i = 0; i < 24; i++) { x.fillStyle = cols[i % cols.length]; x.fillRect(0, i * h / 24, w, h / 24 + 1); } }, 64, 512, { repeat: [1, 1] });
  const geo = new THREE.PlaneGeometry(L, Wd, 40, 12);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) / (L / 2), v = p.getY(i) / (Wd / 2);
    const end = Math.pow(Math.abs(u), 6);
    p.setXYZ(i, p.getX(i), -sag * (1 - u * u) + 0.14 * v * v * (1 - end), p.getY(i) * (1 - 0.82 * end));
  }
  geo.computeVertexNormals();
  const fab = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.9, side: THREE.DoubleSide }));
  fab.position.y = 1.15; g.add(fab);
  const rope = std(0xe8dcc0);
  for (const s of [-1, 1]) {
    const rp = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), rope); rp.position.set(s * (L / 2 + 0.22), 1.2, 0); rp.rotation.z = Math.PI / 2 + s * 0.1; g.add(rp);
    const post = palm(3.0, s > 0 ? 21 : 22); post.position.set(s * (L / 2 + 0.5), 0, -0.05); post.rotation.y = s > 0 ? Math.PI : 0; g.add(post);
  }
  g.fabric = fab; g.sag = sag; g.L = L;
  return shadowAll(g);
}
export function sideTable(text = 'SUNDAY') {
  const g = new THREE.Group();
  const wood = std(0xb07a46, { map: woodTex([1, 1], '#b07a46', 5) });
  g.add(cyl(0.3, 0.3, 0.04, wood, [0, 0.62, 0], 28));
  g.add(cyl(0.03, 0.04, 0.6, wood, [0, 0.31, 0], 10));
  g.add(cyl(0.18, 0.2, 0.03, wood, [0, 0.015, 0], 20));
  // tear-off desk calendar
  const cal = new THREE.Group(); cal.position.set(-0.08, 0.64, 0.02); cal.rotation.y = 0.35; g.add(cal);
  cal.add(box(0.36, 0.3, 0.06, std(0xf7f5ef), [0, 0.15, 0], [-0.25, 0, 0]));
  const page = textPlane([text, '7'], 0.33, { font: '800 120px Sign', color: '#d22d2d', w: 512, h: 460, bg: '#ffffff', lineH: 1.55, lit: true });
  page.position.set(0, 0.155, 0.034); page.rotation.x = -0.25; cal.add(page);
  cal.add(box(0.36, 0.05, 0.065, std(0xd22d2d), [0, 0.3, -0.004], [-0.25, 0, 0]));
  // lemonade
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.0, transparent: true, opacity: 0.35 });
  g.add(cyl(0.045, 0.04, 0.14, glassM, [0.14, 0.71, -0.05], 16));
  g.add(cyl(0.04, 0.036, 0.1, std(0xf6d24a, { roughness: 0.3, emissive: 0x3a2a00 }), [0.14, 0.69, -0.05], 16));
  g.add(box(0.008, 0.2, 0.008, std(0xff4f6a), [0.155, 0.76, -0.05], [0, 0, 0.25]));
  g.calendar = cal;
  return shadowAll(g);
}

// ---------- Christmas and Easter ----------
export function xmasTree() {
  const g = new THREE.Group(); const r = rng(17);
  g.add(cyl(0.06, 0.08, 0.3, std(0x5a3a22), [0, 0.15, 0], 10));
  g.add(cyl(0.22, 0.26, 0.2, std(0xb02020, { roughness: 0.5 }), [0, 0.1, 0], 20));
  const green = new THREE.MeshStandardMaterial({ color: 0x1f6b35, roughness: 0.8 });
  const tiers = [[0.75, 0.75, 0.35], [0.6, 0.65, 0.8], [0.45, 0.55, 1.2], [0.3, 0.45, 1.55]];
  for (const [rad, h, y] of tiers) {
    const geo = new THREE.CylinderGeometry(0.0005, rad, h, 28, 4);   // not ConeGeometry: with radiusTop 0 three.js drops half the faces of every row
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), yy = p.getY(i); if (yy < -h / 2 + 0.01) { const a = Math.atan2(z, x); const k = 1 + 0.05 * Math.sin(a * 14); p.setX(i, x * k); p.setZ(i, z * k); } }
    geo.computeVertexNormals();
    const c = new THREE.Mesh(geo, green); c.position.y = y + h / 2; g.add(c);
  }
  const cols = [0xd42a2a, 0xf2c230, 0x2f6fd8, 0xe8e8f0, 0xd42a8a];
  const orn = [];
  for (let i = 0; i < 26; i++) {
    const y = 0.45 + r() * 1.35, maxR = 0.78 * (1 - (y - 0.35) / 1.75) + 0.02, a = r() * Math.PI * 2;
    const m = new THREE.MeshPhysicalMaterial({ color: cols[i % cols.length], metalness: 0.6, roughness: 0.15, clearcoat: 1 });
    const b = ball(0.045, m, [Math.cos(a) * maxR * 0.92, y, Math.sin(a) * maxR * 0.92]); g.add(b); orn.push(b);
  }
  const bulbs = [];
  for (let i = 0; i < 60; i++) {
    const k = i / 60, y = 0.4 + k * 1.5, rr = 0.8 * (1 - (y - 0.35) / 1.75) + 0.03, a = k * Math.PI * 2 * 5;
    const bm = new THREE.MeshBasicMaterial({ color: [0xffe08a, 0xff8a8a, 0x8ad0ff][i % 3], toneMapped: false });
    const b = ball(0.016, bm, [Math.cos(a) * rr, y, Math.sin(a) * rr], [1, 1, 1], 8); g.add(b); bulbs.push(b);
  }
  const st = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.05 : 0.12; i ? st.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : st.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(st, { depth: 0.03, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 }), new THREE.MeshStandardMaterial({ color: 0xffd54a, metalness: 0.8, roughness: 0.25, emissive: 0xffb000, emissiveIntensity: 0.8 }));
  star.position.set(0, 2.1, -0.015); g.add(star);
  const sg = glowSprite(0xffd890, 0.6); sg.position.set(0, 2.1, 0.03); g.add(sg);
  g.bulbs = bulbs;
  return shadowAll(g);
}
export function present(w = 0.3, h = 0.25, d = 0.3, color = 0xc8202a, ribbon = 0xf2c230) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.45 }), rb = new THREE.MeshStandardMaterial({ color: ribbon, roughness: 0.3, metalness: 0.3 });
  g.add(rbox(w, h, d, m, 0.012, [0, h / 2, 0]));
  g.add(box(w + 0.004, h + 0.004, 0.04, rb, [0, h / 2, 0])); g.add(box(0.04, h + 0.004, d + 0.004, rb, [0, h / 2, 0]));
  for (const s of [-1, 1]) { const loop = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 20), rb); loop.position.set(s * 0.04, h + 0.035, 0); loop.rotation.set(0, Math.PI / 2, s * 0.6); g.add(loop); }
  return shadowAll(g);
}
export function egg(seed = 1) {
  const r = rng(seed);
  const pastel = ['#f7a6c4', '#a6d8f7', '#bff2a6', '#f7e3a6', '#d6b3f7', '#f7c1a6'];
  const base = pastel[Math.floor(r() * pastel.length)], acc = pastel[Math.floor(r() * pastel.length)];
  const t = canvasTex((x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    const style = Math.floor(r() * 3);
    if (style === 0) { for (let i = 0; i < 5; i++) { x.fillStyle = i % 2 ? '#ffffff' : acc; x.fillRect(0, h * (0.2 + i * 0.12), w, h * 0.05); } }
    else if (style === 1) { x.fillStyle = acc; for (let i = 0; i < 26; i++) { x.beginPath(); x.arc(r() * w, h * (0.15 + r() * 0.7), 6 + r() * 6, 0, 7); x.fill(); } }
    else { x.strokeStyle = '#ffffff'; x.lineWidth = 6; x.beginPath(); for (let X = 0; X <= w; X += 8) x.lineTo(X, h * 0.5 + Math.sin(X / w * Math.PI * 8) * 14); x.stroke(); x.fillStyle = acc; x.fillRect(0, h * 0.3, w, 10); x.fillRect(0, h * 0.68, w, 10); }
  }, 256, 256);
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 28, 20), new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.35, clearcoat: 0.6 }));
  m.scale.set(0.82, 1.08, 0.82); m.castShadow = true;
  return m;
}
export function eggBasket() {
  const g = new THREE.Group();
  const wicker = canvasTex((x, w, h) => { x.fillStyle = '#a8773e'; x.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#c8945a' : '#8f6232'; x.beginPath(); x.ellipse(i * w / 16 + w / 32, j * h / 8 + h / 16, w / 34, h / 18, 0, 0, 7); x.fill(); } }, 256, 128, { repeat: [4, 1] });
  const wm = new THREE.MeshStandardMaterial({ map: wicker, roughness: 0.9, side: THREE.DoubleSide });
  const pts = [[0.001, 0], [0.24, 0.0], [0.3, 0.06], [0.33, 0.2], [0.335, 0.24]].map(([a, b]) => new THREE.Vector2(a, b));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 40), wm));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 40, Math.PI), wm); handle.position.y = 0.23; g.add(handle);
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.3, 0.05, 32), new THREE.MeshStandardMaterial({ color: 0x7fd152, roughness: 1, bumpMap: fluff().bumpMap, bumpScale: 6 })); grass.position.y = 0.21; g.add(grass);
  const eggs = [];
  const spots = [[0, 0.27, 0], [0.14, 0.26, 0.08], [-0.15, 0.26, 0.06], [0.08, 0.26, -0.15], [-0.08, 0.26, -0.14], [0.2, 0.25, -0.06], [-0.21, 0.25, -0.04], [0.02, 0.29, 0.15]];
  spots.forEach((p, i) => { const e = egg(i + 5); e.position.set(...p); e.rotation.set((i % 3 - 1) * 0.4, i, (i % 2 - 0.5) * 0.5); g.add(e); eggs.push(e); });
  g.eggs = eggs;
  return shadowAll(g);
}
// a cosy room corner: wooden floor, two walls, a window
export function roomCorner({ wall = 0xe9dcc6, floorTint = '#a0703f' } = {}) {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ map: plankTex([6, 6], floorTint), roughness: 0.55 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const wm = new THREE.MeshStandardMaterial({ color: wall, roughness: 0.95 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), wm); back.position.set(0, 2, -2.2); back.receiveShadow = true; g.add(back);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), wm); side.position.set(-3.2, 2, 2); side.rotation.y = Math.PI / 2; side.receiveShadow = true; g.add(side);
  g.add(box(12, 0.12, 0.03, std(0xf5efe4), [0, 0.06, -2.19]));
  const win = new THREE.Group(); win.position.set(1.6, 1.7, -2.18); g.add(win);
  win.add(box(1.2, 1.4, 0.02, new THREE.MeshBasicMaterial({ color: 0x9cc8f0, toneMapped: true })));
  win.add(box(1.32, 0.08, 0.06, std(0xffffff), [0, 0.7, 0.02])); win.add(box(1.32, 0.08, 0.06, std(0xffffff), [0, -0.7, 0.02]));
  win.add(box(0.08, 1.44, 0.06, std(0xffffff), [0.62, 0, 0.02])); win.add(box(0.08, 1.44, 0.06, std(0xffffff), [-0.62, 0, 0.02])); win.add(box(0.05, 1.4, 0.05, std(0xffffff), [0, 0, 0.02]));
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), new THREE.MeshStandardMaterial({ color: 0x9b3b3b, roughness: 1, bumpMap: fluff().bumpMap, bumpScale: 2 })); rug.rotation.x = -Math.PI / 2; rug.position.set(0.3, 0.006, 0.2); rug.scale.set(1.3, 1, 1); rug.receiveShadow = true; g.add(rug);
  return shadowAll(g);
}

// ---------- modern road with a green highway sign ----------
export function modernRoad(len = 60) {
  const g = new THREE.Group();
  const asphalt = canvasTex((x, w, h) => {
    speckle(x, w, h, '#3a3c40', 3000, ['#33353a', '#45474c', '#2e3034'], [1, 2], 3);
    x.fillStyle = '#f2f2f2'; for (let y = 0; y < h; y += 128) x.fillRect(w / 2 - 4, y, 8, 64);
    x.fillStyle = '#f2d24a'; x.fillRect(16, 0, 8, h); x.fillRect(w - 24, 0, 8, h);
  }, 256, 512, { repeat: [1, len / 4] });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(4, len), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.8 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.005, -len / 2 + 6); road.receiveShadow = true; g.add(road);
  return g;
}
export function highwaySign(lines = ['EXTRA MILE', '1 mi  →'], { w = 2.6, h = 1.3, height = 3.2 } = {}) {
  const g = new THREE.Group();
  const t = textTexture(lines, { w: 1024, h: 512, font: '800 150px Sign', color: '#ffffff', bg: '#127a3e', round: 40, border: '#ffffff', borderW: 22, lineH: 1.25 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));
  face.position.set(0, height, 0.02); g.add(face);
  g.add(box(w + 0.04, h + 0.04, 0.03, std(0x8a8f96, { metalness: 0.7, roughness: 0.4 }), [0, height, -0.005]));
  for (const s of [-1, 1]) g.add(cyl(0.05, 0.05, height + h / 2, std(0x9aa0a8, { metalness: 0.8, roughness: 0.35 }), [s * w * 0.35, (height + h / 2) / 2, -0.06], 12));
  return shadowAll(g);
}
export function backpack(color = 0x2c6fd1) {
  const g = new THREE.Group();
  const m = cloth(color, { roughness: 0.7 });
  g.add(rbox(0.36, 0.48, 0.22, m, 0.07, [0, 0, 0]));
  g.add(rbox(0.28, 0.2, 0.08, cloth(0x1f4f9a), 0.03, [0, -0.08, 0.13]));
  g.add(rbox(0.38, 0.12, 0.24, cloth(0x1f4f9a), 0.05, [0, 0.22, 0]));
  return shadowAll(g);
}

// ---------- Roman road, milestone and a soldier's pack on a pole ----------
export function romanRoad(len = 40) {
  const g = new THREE.Group();
  const stones = canvasTex((x, w, h) => {
    const r = rng(22); x.fillStyle = '#4e4a44'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const cx = r() * w, cy = r() * h, rad = 16 + r() * 18, v = 120 + r() * 50 | 0;
      x.fillStyle = `rgb(${v},${v - 6},${v - 14})`; x.beginPath();
      for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + r() * 0.5, rr = rad * (0.75 + r() * 0.35); k ? x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.08)'; x.beginPath(); x.arc(cx - rad * 0.25, cy - rad * 0.25, rad * 0.4, 0, 7); x.fill();
    }
  }, 512, 512, { repeat: [1, len / 3] });
  const bump = stones.clone(); bump.colorSpace = THREE.NoColorSpace;
  const road = new THREE.Mesh(new THREE.PlaneGeometry(3, len), new THREE.MeshStandardMaterial({ map: stones, bumpMap: bump, bumpScale: 3, roughness: 0.9 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, -len / 2 + 5); road.receiveShadow = true; g.add(road);
  const curbM = std(0x8a8378, { map: stoneTex([20, 1], '#9a9286', 3) });
  for (const s of [-1, 1]) g.add(box(0.18, 0.1, len, curbM, [s * 1.58, 0.05, -len / 2 + 5]));
  return shadowAll(g);
}
export function milestone(text = ['M·P', 'II']) {
  const g = new THREE.Group();
  const stoneM = new THREE.MeshStandardMaterial({ map: stoneTex([1, 1], '#c9c0b0', 9), roughness: 0.85 });
  const ins = canvasTex((x, w, h) => {
    const r = rng(4); x.fillStyle = '#c9c0b0'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${r() * 0.07})`; x.fillRect(r() * w, r() * h, 2, 2); }
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 120px Roman';
    text.forEach((s, i) => { const y = h * 0.36 + i * 150; x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillText(s, w * 0.25 + 3, y + 3); x.fillStyle = '#3d362e'; x.fillText(s, w * 0.25, y); });
  }, 1024, 512);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 1.3, 32), [new THREE.MeshStandardMaterial({ map: ins, roughness: 0.85 }), stoneM, stoneM]);
  col.position.y = 0.85; col.rotation.y = -Math.PI * 0.5; g.add(col);
  g.add(box(0.62, 0.22, 0.62, stoneM, [0, 0.11, 0]));
  g.add(cyl(0.27, 0.27, 0.06, stoneM, [0, 1.53, 0], 32));
  return shadowAll(g);
}
export function furcaPack() {               // a T-pole over the shoulder with a sack, a pot, a bedroll and a satchel
  const g = new THREE.Group();
  const wood = std(0x7a5232, { map: woodTex([1, 2], '#7a5232', 6) });
  g.add(cyl(0.018, 0.018, 1.25, wood, [0, 0, 0], 8));
  const cross = cyl(0.016, 0.016, 0.5, wood, [0, 0.55, 0], 8); cross.rotation.z = Math.PI / 2; g.add(cross);
  g.add(ball(0.17, cloth(0xb59b6a), [0.12, 0.42, 0], [1, 1.15, 0.9], 16));
  g.add(cyl(0.09, 0.1, 0.16, new THREE.MeshPhysicalMaterial({ color: 0xb87333, metalness: 0.9, roughness: 0.35 }), [-0.16, 0.38, 0], 16));
  const roll = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 6, 12), cloth(0x7a2a1e)); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.62, 0); g.add(roll);
  g.add(rbox(0.2, 0.22, 0.08, std(0x6a4426), 0.02, [-0.02, 0.27, 0.06]));
  return shadowAll(g);
}
export function scutum() {                   // curved red shield with a gold boss
  const g = new THREE.Group();
  const t = canvasTex((x, w, h) => {
    x.fillStyle = '#9e1a1f'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#e1b84a'; x.lineWidth = 14; x.strokeRect(14, 14, w - 28, h - 28);
    x.lineWidth = 8; x.beginPath(); x.moveTo(w / 2, 30); x.lineTo(w / 2, h - 30); x.moveTo(30, h / 2); x.lineTo(w - 30, h / 2); x.stroke();
  }, 256, 384);
  const geo = new THREE.CylinderGeometry(0.55, 0.55, 1.05, 24, 1, true, -0.45, 0.9);
  const sh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, side: THREE.DoubleSide }));
  sh.position.z = -0.55; g.add(sh);
  g.add(ball(0.08, new THREE.MeshPhysicalMaterial({ color: 0xd6ad52, metalness: 1, roughness: 0.25 }), [0, 0, 0.0], [1, 1, 0.6], 16));
  return shadowAll(g);
}
export function spear() {
  const g = new THREE.Group();
  g.add(cyl(0.014, 0.014, 2.0, std(0x6a4a2e), [0, 1.0, 0], 8));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.22, 8), materialsSteel()); tip.position.y = 2.1; g.add(tip);
  return shadowAll(g);
}
function materialsSteel() { return new THREE.MeshPhysicalMaterial({ color: 0xc4c6ca, metalness: 1, roughness: 0.3 }); }

// ---------- the "hidden all around you" icons ----------
export function icons() {
  const g = new THREE.Group(); const items = [];
  const cal = new THREE.Group(); cal.add(rbox(0.32, 0.36, 0.03, std(0xffffff, { roughness: 0.5 }), 0.02)); cal.add(box(0.32, 0.08, 0.035, std(0xd22d2d), [0, 0.15, 0.001]));
  const ct = textPlane(['SUN'], 0.3, { font: '800 200px Sign', color: '#d22d2d', w: 512, h: 300 }); ct.position.set(0, -0.03, 0.02); cal.add(ct); items.push(cal);
  const orn = new THREE.Group(); orn.add(ball(0.13, new THREE.MeshPhysicalMaterial({ color: 0xd42a2a, metalness: 0.6, roughness: 0.15, clearcoat: 1 }))); orn.add(cyl(0.035, 0.035, 0.05, std(0xe2b33c, { metalness: 0.9, roughness: 0.3 }), [0, 0.14, 0], 12)); items.push(orn);
  const e = egg(9); e.scale.multiplyScalar(1.9); items.push(e);
  const note = new THREE.Group(); const nm = new THREE.MeshStandardMaterial({ color: 0x1b1b22, roughness: 0.4 });
  note.add(ball(0.07, nm, [0, 0, 0], [1.3, 0.95, 0.7])); note.add(box(0.022, 0.32, 0.022, nm, [0.075, 0.16, 0])); note.add(box(0.11, 0.035, 0.02, nm, [0.12, 0.3, 0], [0, 0, -0.6])); items.push(note);
  const cap = new THREE.Group(); const cm = std(0x15151a); cap.add(box(0.32, 0.015, 0.32, cm)); cap.add(cyl(0.12, 0.12, 0.08, cm, [0, -0.045, 0], 20)); cap.add(cyl(0.006, 0.006, 0.16, std(0xe2b33c), [0.14, -0.05, 0.14], 6)); items.push(cap);
  const hosp = new THREE.Group(); hosp.add(rbox(0.32, 0.32, 0.04, std(0x1c5fb8, { roughness: 0.4 }), 0.04)); const ht = textPlane('H', 0.26, { font: '900 240px Sign', color: '#ffffff', w: 256, h: 256 }); ht.position.z = 0.025; hosp.add(ht); items.push(hosp);
  items.forEach((it, i) => { const gl = glowSprite(0xffd27a, 0.75); gl.material.opacity = 0.55; it.add(gl); it.glow = gl; g.add(it); shadowAll(it); });
  g.items = items;
  return g;
}
