// Props for "What if your brain stopped feeling pain?": a casual cartoon person, kitchen stove and hot pan,
// a kettlebell, an X-ray look with a glowing nervous system and brain, the skin cross-section world,
// a nerve-ending close-up with heat channels, a DNA helix, a bed of hot coals, a small house and an arm cast.
import * as THREE from 'three';
import { materials } from './materials.js';
import { glowTexture, rng } from './textures.js';
import { makeHuman, torsoShell } from './human.js';
import { glowSprite } from './props.js';

const shadow = o => { o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; };
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const box = (w, h, d, mat, p = [0, 0, 0], r = [0, 0, 0]) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(...p); m.rotation.set(...r); return m;
};
const under = (o, g) => { for (let p = o; p; p = p.parent) if (p === g) return true; return false; };

// ---------- a person in a T-shirt, jeans and sneakers ----------
export function person({ shirt = 0x2f7de1, pants = 0x34405a, shoes = 0xf4f4f4, beard = true } = {}) {
  const man = makeHuman('casual');
  const M = materials();
  const shirtM = std(shirt, { roughness: 0.85 }), pantsM = std(pants, { roughness: 0.9 });
  const shoeM = std(shoes, { roughness: 0.45 }), sockM = std(0xffffff, { roughness: 0.9 });
  const j = man.j;
  man.root.traverse(o => {
    if (!o.isMesh) return;
    const feet = under(o, j.lAn) || under(o, j.rAn);
    const legs = under(o, j.lHip) || under(o, j.rHip);
    const fore = under(o, j.lEl) || under(o, j.rEl);
    if (feet) {
      if (o.material === M.skin) {
        const r = o.geometry.parameters && o.geometry.parameters.radius;
        if (r && r < 0.012) o.visible = false;
        else o.material = o.geometry.type === 'CylinderGeometry' ? sockM : shoeM;
      } else if (o.material === M.cloth) o.material = pantsM;
      return;
    }
    if (o.material === M.cloth) o.material = legs ? pantsM : fore ? M.skin : shirtM;
    if (!beard && (o.material === M.beard || (o.material.transparent && o.material.opacity === 0.2))) o.visible = false;
  });
  // jeans on the hips, the T-shirt hanging just over the waistband
  const lower = j.spine.children.find(o => o.isMesh); lower.material = pantsM;
  const tee = new THREE.Mesh(torsoShell(-0.04, 0.22, 0.012), shirtM); j.spine.add(tee);
  // the sleeve hem and a sneaker sole so the outfit reads
  for (const k of ['l', 'r']) {
    const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.064, 0.05, 24), shirtM); hem.position.y = -0.22; j[k + 'Sh'].add(hem);
    const sole = new THREE.Mesh(new THREE.SphereGeometry(0.052, 24, 12), std(0x777777)); sole.scale.set(1.0, 0.25, 2.4); sole.position.set(0, -0.065, 0.05); j[k + 'An'].add(sole);
  }
  const cap = (g) => g.children.find(c => c.isMesh && c.geometry.type === 'CapsuleGeometry');
  man.forearmR = cap(j.rEl); man.forearmL = cap(j.lEl); man.shinR = cap(j.rKn); man.shinL = cap(j.lKn);
  man.palmR = j.rWr.children[0].children[0];
  return shadow(man.root), man;
}

// ---------- X-ray hologram look ----------
export function fresnelMat(color = 0x8fd0ff, strength = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uK: { value: strength } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uK; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4(uColor*(0.05+f*0.85)*uK, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
}
// swap every material of a person for the hologram (k = 1), or back (k = 0)
export function xray(man) {
  const ghost = fresnelMat(0x8fd0ff, 1);
  const meshes = [];
  man.root.traverse(o => { if (o.isMesh && o.visible) { meshes.push([o, o.material]); } });
  man.setXray = (on) => { for (const [o, m] of meshes) { o.material = on ? ghost : m; o.castShadow = !on; } };
  man.ghost = ghost;
  return man;
}

// a soft bumpy brain inside the head
export function brain() {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(1, 96, 64);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const fold = Math.sin(v.x * 9 + Math.sin(v.y * 7) * 2) * Math.sin(v.y * 11 + Math.sin(v.z * 8) * 2) * Math.sin(v.z * 10 + v.x * 3);
    const groove = 1 - 0.12 * Math.exp(-((v.x / 0.08) ** 2)) * Math.max(0, v.y + 0.3);
    v.multiplyScalar((1 + 0.045 * fold) * groove);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0xf29bb0, roughness: 0.45, emissive: 0xff2030, emissiveIntensity: 0 });
  const m = new THREE.Mesh(geo, mat); m.scale.set(0.8, 0.68, 1.0); g.add(m);
  const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 6, 12), mat); stem.position.set(0, -0.75, -0.2); stem.rotation.x = 0.35; g.add(stem);
  g.mesh = m; g.mat = mat;
  return g;
}

// nervous system that follows the person's pose: tubes rebuilt from joint positions each frame
export function nerves(man, { color = 0xffd34a, r = 0.009 } = {}) {
  const j = man.j;
  const P = (g, x, y, z) => [g, new THREE.Vector3(x, y, z)];
  const arm = (s, k) => [P(j[k + 'Wr'], s * 0.0, -0.105, 0.03), P(j[k + 'Wr'], 0, -0.03, 0.0), P(j[k + 'El'], 0, -0.13, 0.02), P(j[k + 'El'], 0, 0, 0.03),
    P(j[k + 'Sh'], 0, -0.15, 0.02), P(j[k + 'Sh'], 0, -0.02, 0), P(j.chest, s * 0.12, 0.22, -0.06), P(j.chest, 0, 0.17, -0.085)];
  const leg = (s, k) => [P(j[k + 'An'], 0, -0.04, 0.12), P(j[k + 'An'], 0, 0.0, 0.0), P(j[k + 'Kn'], 0, -0.2, -0.02), P(j[k + 'Kn'], 0, 0, -0.03),
    P(j[k + 'Hip'], 0, -0.2, -0.03), P(j[k + 'Hip'], 0, 0, -0.04), P(j.spine, 0, -0.1, -0.08)];
  const defs = {
    rArm: arm(-1, 'r'), lArm: arm(1, 'l'), rLeg: leg(-1, 'r'), lLeg: leg(1, 'l'),
    cord: [P(j.spine, 0, -0.14, -0.08), P(j.spine, 0, 0.05, -0.085), P(j.chest, 0, 0.0, -0.09), P(j.chest, 0, 0.17, -0.085),
      P(j.chest, 0, 0.32, -0.06), P(j.neck, 0, 0.06, -0.02), P(j.head, 0, 0.06, -0.01)],
    up: [P(j.chest, 0, 0.17, -0.085), P(j.chest, 0, 0.32, -0.06), P(j.neck, 0, 0.06, -0.02), P(j.head, 0, 0.06, -0.01), P(j.head, 0, 0.11, 0.0)],
  };
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity: 1 });
  const cordMat = mat.clone(); cordMat.color.set(0xffe27a);
  const meshes = {}, curves = {};
  for (const k of Object.keys(defs)) {
    if (k === 'up') continue;
    meshes[k] = new THREE.Mesh(new THREE.BufferGeometry(), k === 'cord' ? cordMat : mat); g.add(meshes[k]);
  }
  const hd = man.j.head;
  const br = brain(); br.scale.setScalar(0.07); br.position.set(0, 0.115, -0.005); hd.add(br);
  g.brain = br; g.mat = mat; g.cordMat = cordMat; g.curves = curves;
  g.update = () => {
    man.root.updateMatrixWorld(true);
    for (const [k, pts] of Object.entries(defs)) {
      const w = pts.map(([o, v]) => o.localToWorld(v.clone()));
      curves[k] = new THREE.CatmullRomCurve3(w);
      if (!meshes[k]) continue;
      meshes[k].geometry.dispose();
      meshes[k].geometry = new THREE.TubeGeometry(curves[k], 48, k === 'cord' ? r * 2.2 : r, 6, false);
    }
  };
  g.setOpacity = (a) => { mat.opacity = cordMat.opacity = a; g.visible = a > 0.01; };
  return g;
}

// a glowing pulse that rides a curve: set(u in 0..1 or <0 to hide)
export function pulse(color = 0xfff2a0, size = 0.08) {
  const g = new THREE.Group();
  const core = glowSprite(color, size); g.add(core);
  const halo = glowSprite(0xffb020, size * 3); halo.material.opacity = 0.5; g.add(halo);
  const tail = [];
  for (let i = 0; i < 6; i++) { const s = glowSprite(color, size * (0.8 - i * 0.1)); s.material.opacity = 0.5 - i * 0.07; g.add(s); tail.push(s); }
  g.set = (curve, u, du = 0.025) => {
    g.visible = u >= 0 && u <= 1 && !!curve;
    if (!g.visible) return;
    core.position.copy(curve.getPointAt(u)); halo.position.copy(core.position);
    tail.forEach((s, i) => s.position.copy(curve.getPointAt(Math.max(0, Math.min(1, u - du * (i + 1))))));
  };
  return g;
}

// ---------- kitchen stove with a frying pan ----------
export function stove() {
  const g = new THREE.Group();
  const white = std(0xf1f1ee, { roughness: 0.35 }), grey = std(0x8d9196, { roughness: 0.4, metalness: 0.6 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, roughness: 0.08, clearcoat: 1, metalness: 0.2 });
  g.add(box(1.0, 0.86, 0.66, white, [0, 0.43, 0]));
  g.add(box(0.8, 0.5, 0.02, std(0x1b1d22, { roughness: 0.15 }), [0, 0.4, 0.335]));          // oven window
  g.add(box(0.7, 0.03, 0.04, grey, [0, 0.72, 0.36]));                                        // door handle
  for (let i = 0; i < 4; i++) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 20), grey); k.rotation.x = Math.PI / 2; k.position.set(-0.33 + i * 0.22, 0.8, 0.34); g.add(k); }
  g.add(box(1.0, 0.03, 0.66, glass, [0, 0.875, 0]));
  // burner rings, the front-right one glowing
  const burners = [];
  for (const [x, z] of [[-0.25, 0.14], [0.22, 0.12], [-0.25, -0.16], [0.22, -0.16]]) {
    const b = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 6, 48), new THREE.MeshBasicMaterial({ color: 0x3a1410, toneMapped: false }));
    b.rotation.x = Math.PI / 2; b.position.set(x, 0.892, z); g.add(b); burners.push(b);
  }
  const hot = burners[1];
  const coil = new THREE.Mesh(new THREE.CircleGeometry(0.115, 48), new THREE.MeshBasicMaterial({ color: 0xff3a10, toneMapped: false, transparent: true, opacity: 0.8 }));
  coil.rotation.x = -Math.PI / 2; coil.position.set(0.22, 0.8915, 0.12); g.add(coil);
  // pan (lathe points bottom to top; double sided so the inside shows)
  const pts = [[0, 0], [0.13, 0], [0.145, 0.006], [0.155, 0.03], [0.165, 0.055], [0.162, 0.058], [0.15, 0.03], [0.14, 0.012], [0, 0.012]].map(([x, y]) => new THREE.Vector2(x, y));
  const panMat = new THREE.MeshPhysicalMaterial({ color: 0x2a2b2f, metalness: 0.7, roughness: 0.35, clearcoat: 0.4, emissive: 0xff4010, emissiveIntensity: 0, side: THREE.DoubleSide });
  const pan = new THREE.Group(); pan.position.set(0.22, 0.892, 0.12); g.add(pan);
  pan.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 64), panMat));
  const inside = new THREE.Mesh(new THREE.CircleGeometry(0.14, 48), new THREE.MeshPhysicalMaterial({ color: 0x3a3a3e, metalness: 0.8, roughness: 0.3, emissive: 0xff5a18, emissiveIntensity: 0 }));
  inside.rotation.x = -Math.PI / 2; inside.position.y = 0.0125; pan.add(inside);
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.2, 6, 12), std(0x151515, { roughness: 0.5 }));
  handle.rotation.z = Math.PI / 2 - 0.15; handle.position.set(0.27, 0.06, 0); pan.add(handle);
  shadow(g);
  g.pan = pan; g.panMat = panMat; g.inside = inside; g.coil = coil; g.hot = hot;
  g.setHeat = (h) => {
    panMat.emissiveIntensity = 0.25 * h; inside.material.emissiveIntensity = 0.6 * h;
    coil.material.opacity = 0.3 + 0.6 * h; hot.material.color.setRGB(1.0 * h + 0.2, 0.25 * h + 0.08, 0.05);
  };
  g.setHeat(1);
  // the outer rim point (local to the group) where a finger touches the pan
  g.touch = new THREE.Vector3(0.22 - 0.0, 0.892 + 0.045, 0.12 + 0.165);
  return g;
}

// heat shimmer wisps (deterministic): update(t) rises from `origin`
export function wisps(n = 10, { color = 0xffffff, size = 0.12, rise = 0.25, life = 1.4, spread = 0.12, opacity = 0.25, seed = 3 } = {}) {
  const tex = glowTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
  const r = rng(seed), g = new THREE.Group(), S = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false }));
    s.userData = { ph: r() * life, x: (r() - 0.5) * spread * 2, z: (r() - 0.5) * spread * 2, w: r() * 6 };
    g.add(s); S.push(s);
  }
  g.update = (t) => {
    for (const s of S) {
      const a = ((t + s.userData.ph) % life) / life;
      s.position.set(s.userData.x + Math.sin(t * 2 + s.userData.w) * 0.02, a * rise, s.userData.z);
      s.scale.setScalar(size * (0.5 + a));
      s.material.opacity = opacity * Math.sin(a * Math.PI);
    }
  };
  return g;
}

// ---------- kettlebell ----------
export function kettlebell() {
  const g = new THREE.Group();
  const iron = new THREE.MeshPhysicalMaterial({ color: 0x24262a, metalness: 0.6, roughness: 0.45, clearcoat: 0.3 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 40, 28), iron); b.scale.set(1, 0.92, 1); g.add(b);
  g.add(box(0.16, 0.03, 0.16, iron, [0, -0.145, 0]));
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 12, 40, Math.PI), iron); h.position.y = 0.1; g.add(h);
  // white "20 kg" label plate
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#f2f2f2'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#111'; x.font = 'bold 84px sans-serif'; x.textAlign = 'center'; x.fillText('20 kg', 128, 96);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.1605, 0.1605, 0.07, 40, 1, true, -0.55, 1.1), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }));
  lab.scale.set(1, 1, 1); g.add(lab);
  return shadow(g);
}

// white plaster cast for a forearm + sling
export function cast(man) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.2, 8, 20), std(0xf6f4ee, { roughness: 0.9 }));
  m.position.y = -0.14; man.j.rEl.add(m);
  return shadow(m);
}

// ---------- the skin cross-section world (a giant slice of fingertip) ----------
function noiseTex(draw, w = 512, h = 512) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function insideSky(scene, top = 0x3a0c18, mid = 0x5a1626, horizon = 0x6e1e2e, floorC = 0x22060c) {
  const u = scene.userData.sky.material.uniforms;
  u.top.value.set(top); u.mid.value.set(mid); u.horizon.value.set(horizon); u.floorC.value.set(floorC);
  scene.children.forEach(o => { if (o.material && o.material.isShadowMaterial) o.visible = false; });
}
export function skinSlice() {
  const g = new THREE.Group();
  const r = rng(12);
  const W = 9, D = 3;
  // dermis: pink with collagen squiggles
  const derT = noiseTex((x, w, h) => {
    x.fillStyle = '#e8908f'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      x.strokeStyle = `rgba(${200 + r() * 55},${110 + r() * 50},${120 + r() * 40},0.55)`; x.lineWidth = 2 + r() * 4;
      x.beginPath(); let px = r() * w, py = r() * h; x.moveTo(px, py);
      for (let k = 0; k < 6; k++) { px += (r() - 0.5) * 60; py += (r() - 0.3) * 30; x.lineTo(px, py); } x.stroke();
    }
  });
  derT.repeat.set(2, 1);
  const dermis = new THREE.Mesh(new THREE.BoxGeometry(W, 2.0, D), new THREE.MeshStandardMaterial({ map: derT, roughness: 0.55 }));
  dermis.position.y = 1.6; g.add(dermis);
  // epidermis: pale layer with a ridged top (fingerprint ridges) and darker basal line
  const epi = new THREE.Mesh(new THREE.BoxGeometry(W, 0.5, D, 120, 1, 1), new THREE.MeshPhysicalMaterial({ color: 0xf6c7ad, roughness: 0.5, sheen: 0.5, sheenColor: new THREE.Color(0xffe0d0) }));
  { const p = epi.geometry.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, 0.25 + 0.07 * Math.sin(p.getX(i) * 4.2)); epi.geometry.computeVertexNormals(); }
  epi.position.y = 2.85; g.add(epi);
  g.add(box(W, 0.06, D + 0.02, std(0xc0705e), [0, 2.62, 0]));
  // hypodermis: fat cells
  const fat = new THREE.Mesh(new THREE.BoxGeometry(W, 2.2, D), std(0xf2d27a, { roughness: 0.5 })); fat.position.y = -0.5; g.add(fat);
  const fatM = new THREE.MeshPhysicalMaterial({ color: 0xffe08a, roughness: 0.25, clearcoat: 0.6 });
  for (let i = 0; i < 70; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.22 + r() * 0.12, 20, 14), fatM);
    s.position.set((r() - 0.5) * W * 0.98, -1.5 + r() * 1.9, D / 2 - 0.08); s.scale.z = 0.5; g.add(s);
  }
  // blood vessels (red artery, blue vein) running through the dermis with loops up toward the surface
  const vessel = (y, z, color, ph) => {
    const pts = []; for (let i = 0; i <= 40; i++) { const x = -W / 2 + W * i / 40; pts.push(new THREE.Vector3(x, y + 0.08 * Math.sin(x * 2 + ph), z)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.07, 10), new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 0.8 })));
    for (let i = 0; i < 6; i++) {
      const x0 = -3.6 + i * 1.45 + ph * 0.2;
      const lp = [V3(x0, y, z), V3(x0 + 0.05, y + 0.45, z), V3(x0 + 0.15, y + 0.75, z), V3(x0 + 0.3, y + 0.45, z), V3(x0 + 0.35, y, z)];
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lp), 30, 0.03, 8), new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 0.8 })));
    }
  };
  vessel(1.25, D / 2 + 0.02, 0xd8202c, 0); vessel(1.0, D / 2 - 0.02, 0x4a52c8, 1.3);
  // a hair with its follicle
  const hairM = std(0x3a2618, { roughness: 0.6 });
  const hp = [V3(3.2, 0.9, D / 2), V3(3.35, 1.8, D / 2), V3(3.5, 2.7, D / 2), V3(3.7, 3.6, D / 2 - 0.1), V3(4.0, 4.4, D / 2 - 0.2)];
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 40, 0.045, 8), hairM));
  const fol = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), std(0xb85a50)); fol.position.set(3.2, 0.9, D / 2); fol.scale.set(1, 1.4, 0.6); g.add(fol);
  // nociceptors: yellow fibers coming up from below and branching into free endings just under the surface
  const nMat = new THREE.MeshStandardMaterial({ color: 0xffcc33, roughness: 0.35, emissive: 0xffaa00, emissiveIntensity: 0.15 });
  const endings = [];
  [[-2.7, 7], [-0.1, 8], [2.2, 9]].forEach(([x0, sd]) => {
    const rr = rng(sd);
    const z = D / 2 + 0.03;
    const trunk = [V3(x0 - 0.3, -2.0, z), V3(x0 - 0.1, -0.6, z), V3(x0 + 0.1, 0.6, z), V3(x0, 1.7, z)];
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trunk), 40, 0.09, 10), nMat));
    for (let b = 0; b < 4; b++) {
      const dx = (b - 1.5) * 0.42 + (rr() - 0.5) * 0.15;
      const tip = V3(x0 + dx * 1.3, 2.75 + rr() * 0.12, z);
      const br = [V3(x0, 1.7, z), V3(x0 + dx * 0.5, 2.1, z), V3(x0 + dx * 1.1, 2.45, z), tip];
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(br), 24, 0.035, 8), nMat));
      const tipM = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffd84a, emissive: 0xffc020, emissiveIntensity: 0.2 }));
      tipM.position.copy(tip); g.add(tipM);
      const gl = glowSprite(0xffe070, 0.6); gl.position.copy(tip); gl.material.opacity = 0; g.add(gl);
      const path = new THREE.CatmullRomCurve3([tip, V3(x0 + dx * 1.1, 2.45, z), V3(x0 + dx * 0.5, 2.1, z), ...trunk.slice().reverse()]);
      endings.push({ tip: tipM, glow: gl, path });
    }
  });
  g.endings = endings; g.nMat = nMat;
  // hot pan bottom resting on the skin, plus the heat front sinking into the skin
  const panB = box(W + 1, 0.6, D + 1, new THREE.MeshPhysicalMaterial({ color: 0x232327, metalness: 0.8, roughness: 0.35, emissive: 0xff3a08, emissiveIntensity: 0.5 }), [0, 3.45, 0]);
  g.add(panB); g.panB = panB;
  const heatMat = new THREE.ShaderMaterial({
    uniforms: { uY: { value: 3.2 }, uA: { value: 0 }, uT: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uY, uA, uT; varying vec3 vP;
      void main(){ float above = smoothstep(uY - 0.5, uY + 0.1, vP.y);
        float band = exp(-pow((vP.y - uY) / 0.25, 2.0));
        float waves = 0.5 + 0.5*sin(vP.y*14.0 + uT*8.0 + sin(vP.x*2.0)*1.5);
        float a = (above*0.35*waves + band*0.8) * uA * smoothstep(2.0, 2.4, vP.y);
        gl_FragColor = vec4(vec3(1.0, 0.45, 0.08)*a*1.6, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const heat = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.2), heatMat); heat.position.set(0, 2.1, D / 2 + 0.12);
  heat.geometry.translate(0, 1.0, 0); heat.position.y = 0; heat.renderOrder = 3; g.add(heat);
  g.heat = heatMat;
  return g;
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- close-up of one nerve ending with heat-sensing channels ----------
export function nerveEnding() {
  const g = new THREE.Group();
  const memMat = new THREE.MeshPhysicalMaterial({ color: 0xffcf4a, roughness: 0.3, clearcoat: 0.6, transmission: 0, emissive: 0xff9a00, emissiveIntensity: 0.12 });
  // the fiber runs from the tip (x = 0) toward -x and curves down off screen
  const path = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(-2, 0, 0), V3(-4, -0.3, 0), V3(-6.5, -1.6, 0.4), V3(-8.5, -4.0, 1.0)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 120, 0.7, 40), memMat));
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.7, 40, 24), memMat); g.add(tip);
  // channels: four teal subunits around a pore, sitting in the membrane on the top/front of the tip region
  const chM = new THREE.MeshPhysicalMaterial({ color: 0x2cc7b5, roughness: 0.3, clearcoat: 0.8, emissive: 0x10ffd0, emissiveIntensity: 0 });
  const channels = [];
  const spots = [[0.35, 0.55, 0.0], [-0.6, 0.62, 0.3], [-1.6, 0.6, 0.35], [0.45, 0.25, 0.48], [-1.1, 0.25, 0.64], [-2.3, 0.4, 0.55], [0.6, -0.1, 0.44]];
  for (const [x, y, z] of spots) {
    const n = x > 0 ? V3(x, y, z).normalize() : V3(0, y, z).normalize();
    const pos = x > 0 ? n.clone().multiplyScalar(0.7) : V3(x, n.y * 0.7, n.z * 0.7);
    const c = new THREE.Group(); c.position.copy(pos); c.quaternion.setFromUnitVectors(V3(0, 1, 0), n); g.add(c);
    const subs = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.16, 6, 12), chM);
      const a = i * Math.PI / 2; s.userData.a = a; c.add(s); subs.push(s);
    }
    channels.push({ g: c, subs, n, pos });
  }
  const setOpen = (k) => {
    for (const ch of channels) for (const s of ch.subs) { const rad = 0.07 + 0.06 * k; s.position.set(Math.cos(s.userData.a) * rad, 0.02, Math.sin(s.userData.a) * rad); s.rotation.set(Math.sin(s.userData.a) * 0.25 * k, 0, -Math.cos(s.userData.a) * 0.25 * k); }
    chM.emissiveIntensity = 0.6 * k;
  };
  setOpen(0);
  // ions: little glowing balls outside each channel that pour in when open
  const ions = [];
  const r = rng(4);
  for (const ch of channels) for (let i = 0; i < 6; i++) {
    const s = glowSprite(i % 2 ? 0xffe066 : 0xff8a3a, 0.14); g.add(s);
    ions.push({ s, ch, off: V3((r() - 0.5) * 0.5, 0.25 + r() * 0.6, (r() - 0.5) * 0.5), ph: r() });
  }
  // an electrical wave: a glowing ring that travels down the fiber
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.07, 10, 48), new THREE.MeshBasicMaterial({ color: 0xfff0a0, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(ring);
  const ringGlow = glowSprite(0xffd060, 1.3); g.add(ringGlow);
  const q = new THREE.Quaternion();
  g.update = (t, open, ionK, wave) => {
    setOpen(open);
    for (const io of ions) {
      const c = io.ch;
      const ph = (t * 0.9 + io.ph) % 1;
      const k = ionK * ph;   // from outside (0) through the pore into the inside (1)
      const outside = c.pos.clone().add(io.off.clone().applyQuaternion(c.g.quaternion)).addScaledVector(c.n, 0.2);
      const inside = c.pos.clone().addScaledVector(c.n, -0.45);
      const p = k < 0.6 ? outside.clone().lerp(c.pos, k / 0.6) : c.pos.clone().lerp(inside, (k - 0.6) / 0.4);
      io.s.position.copy(ionK > 0 ? p : outside.clone().add(V3(Math.sin(t * 3 + io.ph * 9) * 0.05, Math.sin(t * 2.3 + io.ph * 7) * 0.05, 0)));
      io.s.material.opacity = ionK > 0 && k > 0.85 ? (1 - k) * 6 : 1;
    }
    memMat.emissiveIntensity = 0.12 + 0.5 * open * ionK;
    ring.visible = ringGlow.visible = wave >= 0 && wave <= 1;
    if (ring.visible) {
      const u = wave;
      ring.position.copy(path.getPointAt(u)); ringGlow.position.copy(ring.position);
      q.setFromUnitVectors(V3(0, 0, 1), path.getTangentAt(u)); ring.quaternion.copy(q);
      ring.material.opacity = 1; ringGlow.material.opacity = 0.55;
    }
  };
  g.path = path;
  return shadow(g);
}

// ---------- DNA double helix (along y), one rung can break ----------
export function dna(n = 28, { rise = 0.12, radius = 0.36, turn = 0.55 } = {}) {
  const g = new THREE.Group();
  const backM = new THREE.MeshPhysicalMaterial({ color: 0x3f8ff2, roughness: 0.25, clearcoat: 1 });
  const back2 = new THREE.MeshPhysicalMaterial({ color: 0xf2f2f6, roughness: 0.25, clearcoat: 1 });
  const cols = [0xffc93c, 0x2ec27e, 0xff6f91, 0xa06cf0];
  const pa = [], pb = [];
  for (let i = 0; i <= n * 4; i++) {
    const k = i / 4, a = k * turn, y = (k - n / 2) * rise;
    pa.push(V3(Math.cos(a) * radius, y, Math.sin(a) * radius)); pb.push(V3(Math.cos(a + Math.PI) * radius, y, Math.sin(a + Math.PI) * radius));
  }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pa), n * 12, 0.05, 12), backM));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pb), n * 12, 0.05, 12), back2));
  const rungs = [];
  for (let i = 0; i < n; i++) {
    const a = i * turn, y = (i - n / 2) * rise;
    const rung = new THREE.Group(); rung.position.y = y; rung.rotation.y = -a; g.add(rung);
    const halves = [];
    for (const s of [1, -1]) {
      const mat = new THREE.MeshPhysicalMaterial({ color: cols[(i + (s > 0 ? 0 : 2)) % 4], roughness: 0.3, clearcoat: 0.8, emissive: 0xff0000, emissiveIntensity: 0 });
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, radius - 0.02, 12), mat);
      h.rotation.z = Math.PI / 2; h.position.x = s * radius / 2; rung.add(h); halves.push(h);
      const nub = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), s > 0 ? backM : back2); nub.position.x = s * radius; rung.add(nub);
    }
    rungs.push({ rung, halves });
  }
  g.rungs = rungs;
  return shadow(g);
}

// ---------- bed of glowing coals ----------
export function coalBed(L = 3, Wd = 0.8) {
  const g = new THREE.Group();
  const r = rng(31);
  const border = std(0x6b6f75, { roughness: 0.9 });
  for (const s of [-1, 1]) g.add(box(L + 0.2, 0.1, 0.08, border, [0, 0.05, s * (Wd / 2 + 0.04)]));
  g.add(box(L, 0.04, Wd, std(0x1a0d08, { roughness: 1 }), [0, 0.02, 0]));
  const mats = [];
  for (let i = 0; i < 4; i++) mats.push(new THREE.MeshStandardMaterial({ color: 0x15100e, roughness: 0.95, emissive: [0xff3a08, 0xff5a10, 0xc02004, 0xff8a20][i], emissiveIntensity: 0.15 + i * 0.12 }));
  const geo = new THREE.IcosahedronGeometry(0.05, 1);
  const count = 520;
  for (let m = 0; m < 4; m++) {
    const im = new THREE.InstancedMesh(geo, mats[m], count / 4);
    const d = new THREE.Object3D();
    for (let i = 0; i < count / 4; i++) {
      d.position.set((r() - 0.5) * L, 0.04 + r() * 0.03, (r() - 0.5) * Wd);
      d.rotation.set(r() * 6, r() * 6, r() * 6); d.scale.set(0.6 + r() * 0.9, 0.4 + r() * 0.4, 0.6 + r() * 0.9);
      d.updateMatrix(); im.setMatrixAt(i, d.matrix);
    }
    im.receiveShadow = true; g.add(im);
  }
  g.mats = mats;
  const light = new THREE.PointLight(0xff6a20, 2.5, 3); light.position.set(0, 0.3, 0); g.add(light); g.light = light;
  return g;
}

// ---------- small house with a pitched roof ----------
export function house() {
  const g = new THREE.Group();
  const wall = std(0xe9dcc4, { roughness: 0.9 }), roofM = std(0x8a3b2a, { roughness: 0.8 }), dark = std(0x2a2420, { roughness: 0.6 });
  g.add(box(3, 2.2, 2.6, wall, [0, 1.1, 0]));
  const rg = new THREE.CylinderGeometry(1.0, 1.0, 3.3, 3, 1);
  rg.rotateX(-Math.PI / 2); rg.rotateY(Math.PI / 2); rg.scale(1, 0.9, 1.75);
  const roof = new THREE.Mesh(rg, roofM); roof.position.y = 2.2 + 0.45; g.add(roof);
  g.add(box(0.6, 1.2, 0.05, dark, [0.6, 0.6, 1.31]));
  for (const x of [-0.75]) g.add(box(0.6, 0.55, 0.05, std(0xffd38a, { emissive: 0xffb050, emissiveIntensity: 0.6 }), [x, 1.3, 1.31]));
  g.add(box(0.3, 0.8, 0.3, std(0x7a6a5a), [-0.8, 3.0, -0.4]));
  return shadow(g);
}
