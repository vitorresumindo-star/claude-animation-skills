// Effects for "What if Jesus were never born?": the golden dissolve that erases things from history,
// sparkle bursts, canvas text, lightning, god rays, a star field and the Bethlehem star.
import * as THREE from 'three';
import { glowTexture, rng } from './textures.js';
import { glowSprite } from './props.js';

// ---------- text ----------
// draws one or more lines on a canvas; returns a texture. font families: Cap/Sign (Montserrat), Roman (Cinzel)
export function textTexture(lines, { w = 1024, h = 256, font = '800 150px Sign', color = '#ffffff', bg = null, stroke = null, strokeW = 0,
  lineH = 1.08, glow = null, align = 'center', round = 0, border = null, borderW = 0 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (bg) {
    x.fillStyle = bg;
    if (round) { x.beginPath(); x.roundRect(borderW / 2, borderW / 2, w - borderW, h - borderW, round); x.fill(); }
    else x.fillRect(0, 0, w, h);
  }
  if (border) { x.strokeStyle = border; x.lineWidth = borderW; x.beginPath(); x.roundRect(borderW / 2, borderW / 2, w - borderW, h - borderW, round); x.stroke(); }
  const L = Array.isArray(lines) ? lines : [lines];
  x.font = font; x.textAlign = align; x.textBaseline = 'middle';
  let size = parseFloat(font.match(/(\d+)px/)[1]);
  const widest = Math.max(...L.map(s => x.measureText(s).width));
  if (widest > w * 0.92) { size = Math.floor(size * w * 0.92 / widest); x.font = font.replace(/\d+px/, size + 'px'); }
  const total = size * lineH * (L.length - 1);
  const ax = align === 'center' ? w / 2 : align === 'left' ? w * 0.06 : w * 0.94;
  L.forEach((s, i) => {
    const y = h / 2 - total / 2 + i * size * lineH + size * 0.04;
    if (glow) { x.shadowColor = glow; x.shadowBlur = size * 0.35; }
    if (stroke) { x.strokeStyle = stroke; x.lineWidth = strokeW; x.lineJoin = 'round'; x.strokeText(s, ax, y); }
    x.fillStyle = color; x.fillText(s, ax, y);
    x.shadowBlur = 0;
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.userData = { canvas: c, ctx: x };
  return t;
}
// a flat sign: lit (standard) or unlit (basic). width in metres, height follows the canvas aspect
export function textPlane(lines, width = 1, opts = {}) {
  const t = textTexture(lines, opts);
  const asp = (opts.h || 256) / (opts.w || 1024);
  const mat = opts.lit
    ? new THREE.MeshStandardMaterial({ map: t, transparent: !opts.bg, roughness: 0.7, side: THREE.DoubleSide })
    : new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: !!opts.bg, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, width * asp), mat);
  m.userData.tex = t;
  return m;
}

// ---------- the golden dissolve ----------
const NOISE_GLSL = `
float dzH(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float dzN(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(dzH(i),dzH(i+vec3(1,0,0)),f.x),mix(dzH(i+vec3(0,1,0)),dzH(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(dzH(i+vec3(0,0,1)),dzH(i+vec3(1,0,1)),f.x),mix(dzH(i+vec3(0,1,1)),dzH(i+vec3(1,1,1)),f.x),f.y),f.z); }
float dzF(vec3 p){ return dzN(p)*0.6 + dzN(p*2.13+7.1)*0.3 + dzN(p*4.7+3.3)*0.1; }
`;
const DZ_VARS = `uniform float uDz, uDzEdge, uDzScale, uDzBias; uniform vec3 uDzCol, uDzO, uDzDir; uniform float uDzSpan; varying vec3 vDzW;\n`;
const DZ_TEST = `
  float dzh = clamp(dot(vDzW - uDzO, uDzDir) / uDzSpan, 0.0, 1.0);
  float dzv = mix(dzF(vDzW * uDzScale), dzh, uDzBias);
  float dzt = uDz * 1.25 - 0.12;
  if (uDz > 0.0005 && dzv < dzt) discard;
  float dzE = (uDz > 0.0005) ? 1.0 - smoothstep(0.0, uDzEdge, dzv - dzt) : 0.0;
`;
function patchVertex(shader) {
  shader.vertexShader = 'varying vec3 vDzW;\n' + shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
    #ifdef USE_INSTANCING
      vDzW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
    #else
      vDzW = (modelMatrix * vec4(transformed, 1.0)).xyz;
    #endif`);
}
function addUniforms(shader, U) { for (const k in U) shader.uniforms[k] = U[k]; }
function patchMaterial(m, U) {
  m.onBeforeCompile = (shader) => {
    addUniforms(shader, U); patchVertex(shader);
    shader.fragmentShader = DZ_VARS + NOISE_GLSL + shader.fragmentShader;
    if (shader.fragmentShader.includes('#include <emissivemap_fragment>')) {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + DZ_TEST)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uDzCol * dzE * 2.4;');
    } else {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + DZ_TEST)
        .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, uDzCol * 1.8, dzE);');
    }
  };
  m.customProgramCacheKey = () => 'dz1';
  m.needsUpdate = true;
}
function depthMaterial(U) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (shader) => {
    addUniforms(shader, U); patchVertex(shader);
    shader.fragmentShader = DZ_VARS + NOISE_GLSL + shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + DZ_TEST);
  };
  m.customProgramCacheKey = () => 'dzd1';
  return m;
}
// make every mesh under root dissolvable. from: 'top' (erases downward), 'bottom', or a direction vector.
// set(k): 0 = whole, 1 = gone. Materials are cloned so other objects are not affected.
export function dissolvable(root, { color = 0xffc861, edge = 0.07, scale = 9, bias = 0.55, from = 'top' } = {}) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  let dir = from === 'top' ? new THREE.Vector3(0, -1, 0) : from === 'bottom' ? new THREE.Vector3(0, 1, 0) : from.clone().normalize();
  const corners = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
  const d = corners.map(c => c.dot(dir));
  const dmin = Math.min(...d), dmax = Math.max(...d);
  const O = dir.clone().multiplyScalar(dmin);
  const U = {
    uDz: { value: 0 }, uDzEdge: { value: edge }, uDzScale: { value: scale }, uDzBias: { value: bias },
    uDzCol: { value: new THREE.Color(color) }, uDzO: { value: O }, uDzDir: { value: dir }, uDzSpan: { value: Math.max(1e-3, dmax - dmin) },
  };
  const cache = new Map();
  const dm = depthMaterial(U);
  root.traverse(o => {
    if (!o.isMesh && !o.isInstancedMesh) return;
    const conv = (m) => { if (!cache.has(m)) { const c = m.clone(); patchMaterial(c, U); cache.set(m, c); } return cache.get(m); };
    o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
    o.customDepthMaterial = dm;
  });
  return {
    U,
    set(k) { U.uDz.value = k; root.visible = k < 0.999; },
    // call after moving root so the erase direction follows it (world-space test)
    refresh() {
      root.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(root);
      const cs = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) cs.push(new THREE.Vector3(x, y, z));
      const dd = cs.map(c => c.dot(U.uDzDir.value));
      U.uDzO.value.copy(U.uDzDir.value).multiplyScalar(Math.min(...dd)); U.uDzSpan.value = Math.max(1e-3, Math.max(...dd) - Math.min(...dd));
    },
  };
}

// ---------- particles ----------
let _glow;
const glowTex = () => (_glow = _glow || glowTexture());
// golden motes that drift up out of a box (the dust of a dissolving object). update(t, k): t time, k strength 0..1
export function motes(n = 120, { size = 0.05, box = new THREE.Vector3(1, 1, 1), rise = 0.8, color = [1, 0.8, 0.45], seed = 5 } = {}) {
  const r = rng(seed);
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size, map: glowTex(), vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false;
  const P = []; for (let i = 0; i < n; i++) P.push([r() - 0.5, r(), r() - 0.5, r(), r() * 6.28, 0.5 + r()]);
  p.update = (t, k = 1) => {
    for (let i = 0; i < n; i++) {
      const [x, y, z, ph, w, s] = P[i];
      const a = (t * 0.35 * s + ph) % 1;
      pos[i * 3] = x * box.x + Math.sin(t * 1.3 + w) * 0.05;
      pos[i * 3 + 1] = y * box.y + a * rise;
      pos[i * 3 + 2] = z * box.z + Math.cos(t * 1.1 + w) * 0.05;
      const b = Math.sin(a * Math.PI) * k * (0.6 + 0.4 * Math.sin(t * 9 + w));
      col[i * 3] = color[0] * b * 1.4; col[i * 3 + 1] = color[1] * b * 1.4; col[i * 3 + 2] = color[2] * b * 1.4;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  };
  p.update(0, 0);
  return p;
}
// a one-shot burst of sparkles from a point: update(dt since burst)
export function burst(n = 80, { speed = 1.6, life = 1.0, size = 0.06, color = [1, 0.85, 0.5], gravity = 0.4, seed = 3, drag = 1.8 } = {}) {
  const r = rng(seed);
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size, map: glowTex(), vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false;
  const V = [], L = [], W = [];
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3(r() - 0.5, r() - 0.35, r() - 0.5).normalize().multiplyScalar(speed * (0.25 + r() * 0.9));
    V.push(v); L.push(life * (0.5 + r() * 0.7)); W.push(r() * 6.28);
  }
  p.update = (t) => {
    for (let i = 0; i < n; i++) {
      const tt = Math.max(0, t), v = V[i];
      const s = (1 - Math.exp(-drag * tt)) / drag;           // travel with drag
      pos[i * 3] = v.x * s; pos[i * 3 + 1] = v.y * s + gravity * tt * tt * 0.5; pos[i * 3 + 2] = v.z * s;
      const a = t < 0 ? 0 : Math.max(0, 1 - tt / L[i]) * (0.65 + 0.35 * Math.sin(tt * 30 + W[i]));
      col[i * 3] = color[0] * a * 2.5; col[i * 3 + 1] = color[1] * a * 2.5; col[i * 3 + 2] = color[2] * a * 2.5;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  };
  p.update(-1);
  return p;
}
// sparkles spiralling up around a vertical axis (the Santa -> bishop change): update(t, k)
export function swirl(n = 160, { radius = 0.55, height = 2.0, size = 0.05, color = [1, 0.85, 0.5], seed = 8 } = {}) {
  const r = rng(seed);
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size, map: glowTex(), vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false;
  const P = []; for (let i = 0; i < n; i++) P.push([r(), r() * 6.28, 0.7 + r() * 0.6, r()]);
  p.update = (t, k = 1) => {
    for (let i = 0; i < n; i++) {
      const [h0, a0, sp, ph] = P[i];
      const h = (h0 + t * 0.35 * sp) % 1;
      const a = a0 + t * 4.5 * sp + h * 6;
      const rr = radius * (0.75 + 0.35 * Math.sin(h * 3.1 + ph * 6));
      pos[i * 3] = Math.cos(a) * rr; pos[i * 3 + 1] = h * height; pos[i * 3 + 2] = Math.sin(a) * rr;
      const b = k * Math.sin(h * Math.PI) * (0.6 + 0.4 * Math.sin(t * 14 + ph * 20));
      col[i * 3] = color[0] * b * 2.4; col[i * 3 + 1] = color[1] * b * 2.4; col[i * 3 + 2] = color[2] * b * 2.4;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  };
  p.update(0, 0);
  return p;
}

// ---------- star field for night skies ----------
export function starField(n = 1800, { R = 60, seed = 21, minY = -0.05, size = 0.5 } = {}) {
  const r = rng(seed);
  const geo = new THREE.BufferGeometry();
  const pos = [], col = [];
  while (pos.length < n * 3) {
    const v = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
    if (v.lengthSq() > 1 || v.lengthSq() < 0.01) continue;
    v.normalize(); if (v.y < minY) continue;
    v.multiplyScalar(R); pos.push(v.x, v.y, v.z);
    const b = Math.pow(r(), 3.2) * 1.6 + 0.15, warm = r();
    col.push(b * (warm > 0.7 ? 1 : 0.85), b * (warm > 0.7 ? 0.9 : 0.92), b * (warm > 0.7 ? 0.75 : 1.05));
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size, map: glowTex(), vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, sizeAttenuation: true, fog: false });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false; p.renderOrder = -5;
  return p;
}
// recolour the stage sky and lights for night
export function nightSky(scene, { top = 0x030716, mid = 0x081333, horizon = 0x1b2c58, floorC = 0x05070f, stars = true, R = 60 } = {}) {
  const u = scene.userData.sky.material.uniforms;
  u.top.value.set(top); u.mid.value.set(mid); u.horizon.value.set(horizon); u.floorC.value.set(floorC);
  scene.environmentIntensity = 0.18;
  scene.traverse(o => {
    if (o.isHemisphereLight) { o.color.set(0x5a76b8); o.groundColor.set(0x0c0f1c); o.intensity = 0.42; }
    if (o.isDirectionalLight && o !== scene.userData.key) { o.color.set(0x6f8fd8); o.intensity = 0.7; }
  });
  const k = scene.userData.key; k.color.set(0x9fb6ff); k.intensity = 0.55;
  let sf = null;
  if (stars) { sf = starField(2200, { R }); scene.add(sf); scene.userData.stars = sf; }
  return sf;
}
export function skyColors(scene, top, mid, horizon, floorC) {
  const u = scene.userData.sky.material.uniforms;
  u.top.value.set(top); u.mid.value.set(mid); u.horizon.value.set(horizon); u.floorC.value.set(floorC);
}
export function hideShadowCatcher(scene) { scene.children.forEach(o => { if (o.material && o.material.isShadowMaterial) o.visible = false; }); }

// ---------- the Bethlehem star: a hot core, a long four-point flare and soft rays ----------
function flareTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  const g = x.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.06, 'rgba(255,250,230,0.9)'); g.addColorStop(0.2, 'rgba(255,225,160,0.25)'); g.addColorStop(1, 'rgba(255,200,120,0)');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  x.globalCompositeOperation = 'lighter';
  for (const [a, len, wd] of [[0, 256, 7], [Math.PI / 2, 256, 7], [Math.PI / 4, 120, 3], [-Math.PI / 4, 120, 3]]) {
    x.save(); x.translate(256, 256); x.rotate(a);
    const lg = x.createLinearGradient(-len, 0, len, 0);
    lg.addColorStop(0, 'rgba(255,230,180,0)'); lg.addColorStop(0.5, 'rgba(255,250,235,0.95)'); lg.addColorStop(1, 'rgba(255,230,180,0)');
    x.fillStyle = lg;
    x.beginPath(); x.moveTo(-len, 0); x.quadraticCurveTo(0, -wd, len, 0); x.quadraticCurveTo(0, wd, -len, 0); x.fill();
    x.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
let _flare;
export function bethlehemStar(size = 1) {
  const g = new THREE.Group();
  _flare = _flare || flareTexture();
  const mk = (s, op, col = 0xffffff) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: _flare, color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, opacity: op, fog: false }));
    sp.scale.setScalar(s); g.add(sp); return sp;
  };
  const halo = glowSprite(0xffd890, size * 3.2); halo.material.opacity = 0.35; halo.material.fog = false; g.add(halo);
  const flare = mk(size * 2.2, 1, 0xfff4dc);
  const core = glowSprite(0xffffff, size * 0.55); core.material.fog = false; g.add(core);
  g.set = (k, t = 0) => {           // k: 0 off .. 1 full; t: time for twinkle
    const tw = 1 + 0.06 * Math.sin(t * 7.1) + 0.04 * Math.sin(t * 13.3);
    flare.material.opacity = k; flare.scale.setScalar(size * 2.2 * (0.4 + 0.6 * k) * tw);
    flare.material.rotation = 0.04 * Math.sin(t * 0.7);
    core.material.opacity = Math.min(1, k * 1.3); core.scale.setScalar(size * 0.55 * (0.5 + 0.5 * k) * tw);
    halo.material.opacity = 0.35 * k; halo.scale.setScalar(size * 3.2 * (0.6 + 0.4 * k));
    g.visible = k > 0.002;
  };
  g.set(1);
  return g;
}

// ---------- god rays: soft additive beams. a box-shaped shaft from a window ----------
export function lightShaft(w = 0.8, h = 0.6, len = 4, color = 0xffe2a8, opacity = 0.18) {
  const geo = new THREE.CylinderGeometry(1, 1.25, 1, 4, 1, true);
  geo.rotateY(Math.PI / 4); geo.translate(0, -0.5, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(color) }, uO: { value: opacity } },
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = -position.y; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uC; uniform float uO; varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ float f = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0); float a = uO * (1.0 - vY) * smoothstep(0.0, 0.12, vY) * pow(f, 1.5); gl_FragColor = vec4(uC * a, a); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(w * 0.5, len, h * 0.5);
  return m;
}

// ---------- lightning: a jagged glowing bolt between two points, new shape per seed ----------
export function lightning() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xf4f7ff, toneMapped: false, transparent: true, depthWrite: false }));
  const glow = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x7fa6ff, toneMapped: false, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(glow, core);
  g.strike = (a, b, seed = 1, k = 1, w = 0.03) => {
    g.visible = k > 0.01;
    if (!g.visible) return;
    const r = rng(seed);
    const pts = [a.clone()];
    const N = 22, dir = b.clone().sub(a), side = new THREE.Vector3(1, 0, 0), side2 = new THREE.Vector3(0, 0, 1);
    for (let i = 1; i < N; i++) {
      const p = a.clone().addScaledVector(dir, i / N);
      const amp = dir.length() * 0.06 * Math.sin(Math.PI * i / N);
      p.addScaledVector(side, (r() - 0.5) * 2 * amp).addScaledVector(side2, (r() - 0.5) * 2 * amp);
      pts.push(p);
    }
    pts.push(b.clone());
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.0);
    core.geometry.dispose(); glow.geometry.dispose();
    core.geometry = new THREE.TubeGeometry(curve, 80, w, 5, false);
    glow.geometry = new THREE.TubeGeometry(curve, 80, w * 5, 6, false);
    core.material.opacity = k; glow.material.opacity = 0.35 * k;
  };
  g.visible = false;
  return g;
}

// a camera-locked plane for on-screen titles (counters, labels): placed in front of the camera each frame
export function hudPlane(width = 0.5, opts = {}) {
  const m = textPlane(opts.text || ' ', width, { ...opts });
  m.material.depthTest = false; m.renderOrder = 50;
  m.place = (camera, x, y, dist = 1.2) => {     // x, y in -1..1 of the view
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * dist, w = h * camera.aspect;
    camera.updateMatrixWorld(true);
    m.position.set(x * w / 2, y * h / 2, -dist).applyMatrix4(camera.matrixWorld);
    m.quaternion.copy(camera.quaternion);
  };
  m.redraw = (lines, o = opts) => {
    const t = m.userData.tex, c = t.userData.canvas;
    const nt = textTexture(lines, { ...o, w: c.width, h: c.height });
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    c.getContext('2d').drawImage(nt.userData.canvas, 0, 0);
    nt.dispose(); t.needsUpdate = true;
  };
  return m;
}
