// Sets and props, part 2: a stone chapel with stained glass, music notes on a four-line staff, a medieval
// hospital hall with beds, a red-brick college hall with a cupola, a marble temple and the old gods' props.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from './textures.js';
import { glowSprite } from './props.js';
import { textTexture, textPlane, lightShaft } from './fx.js';
import { std, cloth, fluff } from './people.js';
import { shadowAll, box, rbox, cyl, ball, canvasTex, stoneTex, woodTex, brickTex, tileRoofTex, plankTex } from './sets.js';

const archShape = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0); return s; };
const pointedArch = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h * 0.62); s.quadraticCurveTo(w / 2, h * 0.9, 0, h); s.quadraticCurveTo(-w / 2, h * 0.9, -w / 2, h * 0.62); s.lineTo(-w / 2, 0); return s; };

// ---------- stained glass (geometric, no figures) ----------
function stainedGlassTex() {
  return canvasTex((x, w, h) => {
    const r = rng(3); const cols = ['#c8202a', '#1f4fb8', '#f2b52a', '#1f8a4a', '#7a2ab8', '#e86a1a', '#2aa0c8'];
    x.fillStyle = '#111'; x.fillRect(0, 0, w, h);
    const cell = 28;
    for (let yy = 0; yy < h; yy += cell) for (let xx = 0; xx < w; xx += cell) {
      x.fillStyle = cols[Math.floor(r() * cols.length)]; x.globalAlpha = 0.85 + r() * 0.15;
      x.beginPath(); x.moveTo(xx + 2, yy + 2); x.lineTo(xx + cell - 2, yy + 2 + r() * 6); x.lineTo(xx + cell - 2 - r() * 6, yy + cell - 2); x.lineTo(xx + 2, yy + cell - 2); x.fill();
    }
    x.globalAlpha = 1;
    const cx = w / 2, cy = h * 0.42;
    for (let ring = 4; ring >= 1; ring--) { x.fillStyle = ring % 2 ? '#f6d36a' : '#c8202a'; x.beginPath(); x.arc(cx, cy, ring * 46, 0, 7); x.fill(); x.strokeStyle = '#111'; x.lineWidth = 6; x.stroke(); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.fillStyle = i % 2 ? '#2aa0c8' : '#1f8a4a'; x.beginPath(); x.ellipse(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120, 30, 14, a, 0, 7); x.fill(); x.stroke(); }
    x.strokeStyle = '#111'; x.lineWidth = 8; x.beginPath(); x.moveTo(cx, 0); x.lineTo(cx, h); x.moveTo(0, h * 0.75); x.lineTo(w, h * 0.75); x.stroke();
  }, 512, 1024);
}
// ---------- the chapel: back wall with a tall window, side walls, floor, lectern with a big book, candles ----------
export function chapel() {
  const g = new THREE.Group();
  const wallM = new THREE.MeshStandardMaterial({ map: stoneTex([3, 2], '#a89f90', 5), roughness: 0.92 });
  const floorM = new THREE.MeshStandardMaterial({ map: stoneTex([5, 5], '#8f8679', 8), roughness: 0.8 });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorM); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
  // back wall with a pointed-arch hole for the window
  const wall = new THREE.Shape(); wall.moveTo(-5, 0); wall.lineTo(5, 0); wall.lineTo(5, 6); wall.lineTo(-5, 6); wall.lineTo(-5, 0);
  const holePath = new THREE.Path(pointedArch(1.3, 2.6).getPoints(32).map(p => new THREE.Vector2(p.x - 1.2, p.y + 1.6)));
  wall.holes.push(holePath);
  const bw = new THREE.Mesh(new THREE.ExtrudeGeometry(wall, { depth: 0.3, bevelEnabled: false }), wallM); bw.position.set(0, 0, -2.6); g.add(bw);
  const glassG = new THREE.ShapeGeometry(pointedArch(1.3, 2.6), 24);
  const uv = glassG.attributes.uv, pp = glassG.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pp.getX(i) / 1.3 + 0.5, pp.getY(i) / 2.6);
  const glass = new THREE.Mesh(glassG, new THREE.MeshBasicMaterial({ map: stainedGlassTex(), toneMapped: false, color: 0xbfbfbf })); glass.position.set(-1.2, 1.6, -2.45); g.add(glass);
  const halo = glowSprite(0xffd9a0, 3.0); halo.material.opacity = 0.25; halo.position.set(-1.2, 2.9, -2.3); g.add(halo);
  for (const s of [-1, 1]) { const sw = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 8), wallM); sw.position.set(s * 3.2, 3, 1.2); g.add(sw); }
  // pillars and an arch frame on the back wall
  for (const x of [-2.6, 0.6]) { g.add(cyl(0.2, 0.24, 4.2, wallM, [x, 2.1, -2.25], 16)); g.add(box(0.55, 0.2, 0.55, wallM, [x, 4.3, -2.25])); }
  // light shafts from the window across the room
  const shafts = [];
  for (let i = 0; i < 3; i++) { const s = lightShaft(0.5 + i * 0.12, 0.9, 5.2, 0xffe3b0, 0.16 - i * 0.03); s.position.set(-1.2 + (i - 1) * 0.3, 3.0 + i * 0.2, -2.35); s.rotation.set(-0.95, 0.35, 0.0); g.add(s); shafts.push(s); }
  // lectern
  const wood = std(0x6a4426, { map: woodTex([1, 1], '#6a4426', 13) });
  const lec = new THREE.Group(); lec.position.set(0, 0, 0.55); g.add(lec);
  lec.add(cyl(0.06, 0.09, 1.0, wood, [0, 0.5, 0], 12));
  lec.add(cyl(0.25, 0.28, 0.06, wood, [0, 0.03, 0], 20));
  const top = new THREE.Group(); top.position.set(0, 1.08, 0); top.rotation.x = 0.42; lec.add(top);
  top.add(box(0.7, 0.04, 0.5, wood));
  top.add(box(0.7, 0.06, 0.03, wood, [0, 0.03, -0.25]));
  // the big open hymn book: two curved pages with square notes on four-line staves
  const page = canvasTex((x, w, h) => {
    x.fillStyle = '#efe3c4'; x.fillRect(0, 0, w, h);
    const r = rng(6);
    for (let s = 0; s < 5; s++) {
      const y0 = 40 + s * 92; x.strokeStyle = '#b8261c'; x.lineWidth = 2;
      for (let l = 0; l < 4; l++) { x.beginPath(); x.moveTo(20, y0 + l * 12); x.lineTo(w - 20, y0 + l * 12); x.stroke(); }
      x.fillStyle = '#1a1410'; for (let n = 0; n < 9; n++) x.fillRect(34 + n * 24 + r() * 6, y0 - 4 + Math.floor(r() * 5) * 6, 10, 10);
      x.fillStyle = 'rgba(30,20,10,0.6)'; for (let k = 0; k < 7; k++) x.fillRect(30 + k * 30, y0 + 52, 20 + r() * 6, 5);
    }
    x.fillStyle = '#b8261c'; x.font = '700 60px Roman'; x.fillText('V', 24, 70);
  }, 256, 512);
  const bookG = new THREE.PlaneGeometry(0.3, 0.42, 12, 1);
  const bp = bookG.attributes.position; for (let i = 0; i < bp.count; i++) { const x = bp.getX(i); bp.setZ(i, Math.sin(Math.abs(x) / 0.3 * Math.PI) * 0.03); }
  bookG.computeVertexNormals();
  for (const s of [-1, 1]) { const pg = new THREE.Mesh(bookG, new THREE.MeshStandardMaterial({ map: page, roughness: 0.8, side: THREE.DoubleSide })); pg.position.set(s * 0.155, 0.04, 0); pg.rotation.set(-Math.PI / 2, s * 0.08, 0); top.add(pg); }
  top.add(box(0.64, 0.03, 0.45, std(0x6a1a14), [0, 0.022, 0]));
  // candles on tall holders
  const candles = [];
  for (const x of [-0.75, 0.75]) {
    const c = new THREE.Group(); c.position.set(x, 0, 0.1); g.add(c);
    c.add(cyl(0.025, 0.04, 1.2, std(0xc9a25a, { metalness: 0.9, roughness: 0.3 }), [0, 0.6, 0], 10));
    c.add(cyl(0.1, 0.12, 0.03, std(0xc9a25a, { metalness: 0.9, roughness: 0.3 }), [0, 1.2, 0], 16));
    c.add(cyl(0.035, 0.035, 0.24, std(0xf4ecd8, { roughness: 0.5 }), [0, 1.33, 0], 12));
    const f = glowSprite(0xffb050, 0.28); f.position.set(0, 1.5, 0); c.add(f);
    const pl = new THREE.PointLight(0xffa850, 1.2, 4, 1.5); pl.position.set(0, 1.55, 0.05); c.add(pl);
    candles.push(f);
  }
  g.lectern = lec; g.bookTop = top; g.shafts = shafts; g.candles = candles; g.halo = halo;
  return shadowAll(g);
}
// a glowing gold music note with its syllable underneath
function noteGlyph() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xffd36a, emissive: 0xffa526, emissiveIntensity: 1.6, metalness: 0.4, roughness: 0.3 });
  g.add(ball(0.055, m, [0, 0, 0], [1.25, 0.9, 0.6], 16));
  g.add(box(0.014, 0.22, 0.014, m, [0.06, 0.11, 0]));
  return g;
}
export function hymnStaff(syl = ['do', 're', 'mi', 'fa', 'sol', 'la'], W = 1.2) {
  const g = new THREE.Group();
  const lineM = new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0.85, toneMapped: false });
  const gap = 0.085;
  const lines = [];
  for (let l = 0; l < 4; l++) { const ln = box(W, 0.008, 0.008, lineM, [0, l * gap, 0]); g.add(ln); lines.push(ln); }
  const notes = syl.map((s, i) => {
    const n = noteGlyph(); n.position.set(-W / 2 + 0.12 + i * (W - 0.24) / (syl.length - 1), i * gap * 0.5 - 0.02, 0.01); g.add(n);
    const lab = textPlane(s, 0.26, { font: '800 150px Sign', color: '#fff3d0', w: 512, h: 220, glow: 'rgba(255,170,60,1)' }); lab.position.set(n.position.x, -0.16, 0.02); g.add(lab);
    const gl = glowSprite(0xffc060, 0.35); gl.position.copy(n.position); g.add(gl);
    return { n, lab, gl };
  });
  g.notes = notes; g.lineM = lineM;
  g.set = (k, t, times) => {       // k: staff opacity; times: when each note pops (seconds, shot time)
    lineM.opacity = 0.85 * k; g.visible = k > 0.01;
    notes.forEach(({ n, lab, gl }, i) => {
      const a = THREE.MathUtils.clamp((t - times[i]) / 0.18, 0, 1);
      const pop = a <= 0 ? 0 : a < 1 ? 1.25 * Math.sin(a * Math.PI / 2) : 1 + 0.25 * Math.exp(-(t - times[i] - 0.18) * 8);
      n.scale.setScalar(Math.max(0.001, pop)); lab.scale.setScalar(Math.max(0.001, Math.min(1, pop))); gl.material.opacity = 0.7 * Math.min(1, pop);
      n.position.y = i * gap * 0.5 - 0.02 + Math.sin(t * 3 + i) * 0.01;
      lab.visible = n.visible = gl.visible = a > 0;
    });
  };
  return g;
}

// ---------- a medieval hospital hall: arcades, beds, warm light ----------
export function bed(blanket = 0x9e2b25) {
  const g = new THREE.Group();
  const wood = std(0x6a4426, { map: woodTex([1, 1], '#6a4426', 15) });
  g.add(box(0.95, 0.08, 2.0, wood, [0, 0.42, 0]));
  for (const [x, z] of [[-0.45, -0.97], [0.45, -0.97], [-0.45, 0.97], [0.45, 0.97]]) g.add(box(0.07, 0.5, 0.07, wood, [x, 0.25, z]));
  g.add(box(0.95, 0.5, 0.06, wood, [0, 0.7, -1.0]));
  g.add(rbox(0.86, 0.14, 1.9, std(0xf3efe4, { roughness: 0.9 }), 0.05, [0, 0.52, 0]));
  const pillow = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.12, 0.32, 3, 0.05), std(0xffffff, { roughness: 0.9 })); pillow.position.set(0, 0.64, -0.76); g.add(pillow);
  const bl = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.12, 1.25, 3, 0.05), cloth(blanket)); bl.position.set(0, 0.62, 0.3); g.add(bl);
  g.blanket = bl;
  return shadowAll(g);
}
export function hospitalHall({ n = 4 } = {}) {
  const g = new THREE.Group();
  const stoneM = new THREE.MeshStandardMaterial({ map: stoneTex([2, 2], '#c2b8a6', 11), roughness: 0.9 });
  const floorM = new THREE.MeshStandardMaterial({ map: stoneTex([6, 12], '#9a8f80', 12), roughness: 0.85 });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(8, 16), floorM); fl.rotation.x = -Math.PI / 2; fl.position.z = -4; fl.receiveShadow = true; g.add(fl);
  const ceilM = new THREE.MeshStandardMaterial({ map: plankTex([3, 6], '#5a3a22'), roughness: 0.9, side: THREE.DoubleSide });
  // arcades on both sides: pillars + round arches; plain walls behind with small windows
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 16), stoneM); w.position.set(s * 3.4, 2.5, -4); g.add(w);
    for (let i = 0; i < 6; i++) {
      const z = 2 - i * 2.2;
      g.add(cyl(0.16, 0.19, 2.6, stoneM, [s * 2.3, 1.3, z], 14));
      g.add(box(0.42, 0.14, 0.42, stoneM, [s * 2.3, 2.66, z]));
      if (i < 5) {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 8, 24, Math.PI), stoneM); arch.position.set(s * 2.3, 2.7, z - 1.1); arch.rotation.y = Math.PI / 2; g.add(arch);
        const win = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0.5, 1.0), 12), new THREE.MeshBasicMaterial({ color: 0xffe2a8, toneMapped: false }));
        win.position.set(s * 3.24, 2.4, z - 1.1); win.rotation.y = -s * Math.PI / 2; g.add(win);
        const sh = lightShaft(0.5, 1.0, 4.2, 0xffe0a8, 0.1); sh.position.set(s * 3.2, 3.2, z - 1.1); sh.rotation.set(0, 0, s * 0.95); g.add(sh);
      }
    }
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(7, 16), ceilM); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 4.2, -4); g.add(ceil);
  for (let i = 0; i < 8; i++) g.add(box(7, 0.2, 0.2, std(0x4a2e18), [0, 4.1, 2 - i * 2]));
  const back = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 0.3), stoneM); back.position.set(0, 2.5, -10.5); g.add(back);
  const bigWin = new THREE.Mesh(new THREE.ShapeGeometry(archShape(1.2, 2.2), 16), new THREE.MeshBasicMaterial({ color: 0xffe9c0, toneMapped: false })); bigWin.position.set(0, 1.6, -10.34); g.add(bigWin);
  const beds = [];
  const blankets = [0x9e2b25, 0x2b4f9e, 0x9e2b25, 0x2b4f9e, 0x9e2b25, 0x2b4f9e];
  for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
    const b = bed(blankets[(i * 2 + (s > 0 ? 1 : 0)) % 6]); b.position.set(s * 1.55, 0, -1.3 - i * 2.2); b.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(b); beds.push(b);
  }
  g.beds = beds;
  return shadowAll(g);
}

// ---------- a red-brick college hall with white windows and a cupola (front faces +z) ----------
export function brickHall() {
  const g = new THREE.Group();
  const W = 5.2, H = 3.4, D = 2.0;
  const facade = canvasTex((x, w, h) => {
    const r = rng(8); x.fillStyle = '#d9cdbd'; x.fillRect(0, 0, w, h);
    const bh = 10, bw = 28;
    for (let row = 0; row * bh < h; row++) for (let X = (row % 2) * -bw / 2; X < w; X += bw) { const v = r(); x.fillStyle = `rgb(${148 + v * 42 | 0},${56 + v * 22 | 0},${40 + v * 14 | 0})`; x.fillRect(X + 1, row * bh + 1, bw - 2, bh - 2); }
    const cols = 7, rows = 3;
    for (let i = 0; i < rows; i++) for (let k = 0; k < cols; k++) {
      const cx = (k + 0.5) * w / cols, cy = h * (0.2 + i * 0.3), ww = w / cols * 0.42, hh = h * 0.17;
      if (i === 2 && k === 3) continue;
      x.fillStyle = '#f4f2ec'; x.fillRect(cx - ww / 2 - 6, cy - hh / 2 - 6, ww + 12, hh + 12);
      const gg = x.createLinearGradient(0, cy - hh / 2, 0, cy + hh / 2); gg.addColorStop(0, '#2c3a4e'); gg.addColorStop(1, '#5f7896');
      x.fillStyle = gg; x.fillRect(cx - ww / 2, cy - hh / 2, ww, hh);
      x.fillStyle = '#f4f2ec'; x.fillRect(cx - 2, cy - hh / 2, 4, hh); for (let l = 1; l < 3; l++) x.fillRect(cx - ww / 2, cy - hh / 2 + l * hh / 3 - 2, ww, 4);
      x.fillStyle = '#e8e2d6'; x.fillRect(cx - ww / 2 - 10, cy + hh / 2 + 6, ww + 20, 8);
    }
    const dx = w / 2, dy = h * 0.83; x.fillStyle = '#f4f2ec'; x.fillRect(dx - 52, dy - 70, 104, 150); x.fillStyle = '#2a1a12'; x.fillRect(dx - 40, dy - 58, 80, 138);
    x.fillStyle = '#f4f2ec'; x.beginPath(); x.moveTo(dx - 70, dy - 72); x.lineTo(dx, dy - 120); x.lineTo(dx + 70, dy - 72); x.fill();
  }, 1024, 680);
  const sideTex = brickTex([2, 2]);
  const front = new THREE.MeshStandardMaterial({ map: facade, roughness: 0.85 }), side = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [side, side, side, side, front, side]); body.position.set(0, H / 2, 0); g.add(body);
  const roofM = new THREE.MeshStandardMaterial({ map: tileRoofTex([6, 2], '#4a4f5a', '#30343c'), roughness: 0.7 });
  const tri = new THREE.Shape(); tri.moveTo(-D / 2 - 0.15, 0); tri.lineTo(D / 2 + 0.15, 0); tri.lineTo(0, 0.95); tri.lineTo(-D / 2 - 0.15, 0);
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: W + 0.2, bevelEnabled: false }), roofM); roof.rotation.y = Math.PI / 2; roof.position.set(-W / 2 - 0.1, H, 0); g.add(roof);
  g.add(box(W + 0.24, 0.12, D + 0.24, std(0xf4f2ec), [0, H, 0]));
  for (const s of [-1, 1]) g.add(box(0.36, 1.1, 0.36, side, [s * (W / 2 - 0.4), H + 0.7, 0]));
  // white cupola with a dome and vane
  const white = std(0xf6f4ef, { roughness: 0.6 });
  const cup = new THREE.Group(); cup.position.set(0, H + 0.95, 0); g.add(cup);
  cup.add(box(0.8, 0.5, 0.8, white, [0, 0.25, 0]));
  cup.add(cyl(0.34, 0.36, 0.55, white, [0, 0.78, 0], 8));
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; const o = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0.14, 0.38), 8), std(0x1d2430)); o.position.set(Math.cos(a) * 0.335, 0.6, Math.sin(a) * 0.335); o.rotation.y = -a + Math.PI / 2; cup.add(o); }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0x5f8f80, { metalness: 0.5, roughness: 0.4 })); dome.position.y = 1.05; cup.add(dome);
  cup.add(cyl(0.015, 0.015, 0.5, std(0xd8aa3c, { metalness: 0.9, roughness: 0.3 }), [0, 1.6, 0], 6));
  g.add(box(1.6, 0.12, 0.6, std(0xd8d2c6), [0, 0.06, D / 2 + 0.3])); g.add(box(1.3, 0.12, 0.4, std(0xd8d2c6), [0, 0.18, D / 2 + 0.2]));
  return shadowAll(g);
}

// ---------- marble temple, pedestals, lightning bolt, scepter, hammer ----------
export function temple(mat) {
  const g = new THREE.Group();
  const m = mat || new THREE.MeshPhysicalMaterial({ color: 0xe9e4da, roughness: 0.45, clearcoat: 0.2 });
  const W = 7, D = 3.5, colH = 4.2;
  for (let i = 0; i < 4; i++) g.add(box(W + 1.2 - i * 0.3, 0.2, D + 1.2 - i * 0.3, m, [0, 0.1 + i * 0.2, 0]));
  const base = 0.8;
  for (let i = 0; i < 8; i++) {
    const x = -W / 2 + 0.3 + i * (W - 0.6) / 7;
    const geo = new THREE.CylinderGeometry(0.26, 0.3, colH, 20, 1);
    const p = geo.attributes.position; for (let k = 0; k < p.count; k++) { const a = Math.atan2(p.getZ(k), p.getX(k)); const f = 1 + 0.035 * Math.cos(a * 20); p.setX(k, p.getX(k) * f); p.setZ(k, p.getZ(k) * f); }
    geo.computeVertexNormals();
    const c = new THREE.Mesh(geo, m); c.position.set(x, base + colH / 2, D / 2 - 0.3); g.add(c);
    g.add(box(0.72, 0.16, 0.72, m, [x, base + colH + 0.08, D / 2 - 0.3]));
  }
  g.add(box(W + 0.4, 0.7, D, m, [0, base + colH + 0.5, 0]));
  const tri = new THREE.Shape(); tri.moveTo(-W / 2 - 0.2, 0); tri.lineTo(W / 2 + 0.2, 0); tri.lineTo(0, 1.4); tri.lineTo(-W / 2 - 0.2, 0);
  const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: D, bevelEnabled: false }), m); ped.position.set(0, base + colH + 0.85, -D / 2); g.add(ped);
  g.add(box(W - 0.6, colH, 0.2, std(0x6e675c), [0, base + colH / 2, -D / 2 + 0.3]));
  return shadowAll(g);
}
export function pedestal(w = 1.0, h = 1.2, mat) {
  const g = new THREE.Group(); const m = mat || new THREE.MeshPhysicalMaterial({ color: 0xd9d3c7, roughness: 0.5 });
  g.add(box(w, h, w, m, [0, h / 2, 0])); g.add(box(w + 0.16, 0.12, w + 0.16, m, [0, h + 0.06, 0])); g.add(box(w + 0.16, 0.14, w + 0.16, m, [0, 0.07, 0]));
  return shadowAll(g);
}
export function thunderbolt(len = 0.7) {       // Jupiter's zigzag bolt, gold
  const s = new THREE.Shape();
  const P = [[0, 0.5], [0.12, 0.12], [0.03, 0.14], [0.14, -0.2], [0.04, -0.17], [0.1, -0.5], [-0.1, -0.05], [-0.01, -0.07], [-0.12, 0.2], [-0.03, 0.18], [0, 0.5]];
  P.forEach(([x, y], i) => i ? s.lineTo(x * len, y * len) : s.moveTo(x * len, y * len));
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 }); geo.translate(0, 0, -0.02);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffd76a, metalness: 0.7, roughness: 0.25, emissive: 0xffa21a, emissiveIntensity: 0.6 }));
  return shadowAll(m);
}
export function hammer(mat) {                    // a short-handled war hammer
  const g = new THREE.Group(); const m = mat || new THREE.MeshPhysicalMaterial({ color: 0xbfc3c8, metalness: 1, roughness: 0.35 });
  g.add(cyl(0.025, 0.028, 0.42, std(0x5a3a22), [0, 0, 0], 10));
  g.add(rbox(0.32, 0.18, 0.18, m, 0.02, [0, 0.27, 0]));
  return shadowAll(g);
}
export function scepter(mat) {
  const g = new THREE.Group(); const m = mat || std(0xd8aa3c, { metalness: 0.9, roughness: 0.3 });
  g.add(cyl(0.02, 0.02, 1.9, m, [0, 0.95, 0], 8)); g.add(ball(0.06, m, [0, 1.92, 0]));
  return shadowAll(g);
}
