// Props for "What would you see falling into a black hole?":
// a procedural star sky (cube map), a gravitational-lensing sky shader driven by a real Schwarzschild
// light-bending table, photon paths, an astronaut, force arrows, a spiral galaxy, a horizon grid and a small ship.
import * as THREE from 'three';
import { materials } from './materials.js';
import { glowTexture, fabricTexture, rng } from './textures.js';
import { makeHuman } from './human.js';
import { glowSprite } from './props.js';

const shadow = o => { o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; };
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const under = (o, g) => { for (let p = o; p; p = p.parent) if (p === g) return true; return false; };

// ---------- special directions in the star sky (sky frame) ----------
export const GALAXY_DIR = new THREE.Vector3(0.0, 0.08, -1).normalize();   // a colourful galaxy used for the Einstein ring
export const TWIN_DIR = new THREE.Vector3(0.25, 0.32, -1).normalize();    // one bright blue star, seen twice
export const BAND_N = new THREE.Vector3(0.35, 0.86, 0.37).normalize();    // Milky Way plane normal

// ---------- procedural star cube map, rendered once in a separate WebGL context ----------
let _cube = null;
export function starCube(N = 2048) {
  if (_cube) return _cube;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = N;
  const r = new THREE.WebGLRenderer({ canvas, preserveDrawingBuffer: true, antialias: false });
  r.setPixelRatio(1); r.setSize(N, N, false);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uFace: { value: 0 }, uN: { value: N }, uGal: { value: GALAXY_DIR }, uTwin: { value: TWIN_DIR }, uBand: { value: BAND_N } },
    vertexShader: `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform int uFace; uniform float uN; uniform vec3 uGal, uTwin, uBand;
      vec4 h4(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); vec4 q = vec4(p.xyz, p.x + p.y) ; q += dot(q, q.wzxy + 33.33); return fract((q.xxyz + q.yzzw) * q.zywx); }
      float h1(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
        return mix(mix(mix(h1(i), h1(i+vec3(1,0,0)), f.x), mix(h1(i+vec3(0,1,0)), h1(i+vec3(1,1,0)), f.x), f.y),
                   mix(mix(h1(i+vec3(0,0,1)), h1(i+vec3(1,0,1)), f.x), mix(h1(i+vec3(0,1,1)), h1(i+vec3(1,1,1)), f.x), f.y), f.z); }
      float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * vn(p); p *= 2.03; a *= .5; } return s; }
      vec3 starCol(float k){ return k < .2 ? vec3(.65,.78,1.) : k < .65 ? vec3(1.,.97,.92) : k < .88 ? vec3(1.,.86,.62) : vec3(1.,.66,.45); }
      vec3 layer(vec3 d, float S, float dens, float bright, float px){
        vec3 p = d * S; vec3 c = floor(p); vec4 h = h4(c + S);
        if (h.w > dens) return vec3(0.);
        vec3 sp = c + .2 + .6 * h.xyz;
        float sig = max(px * S * .75, .02);
        float b = bright * pow(h.x * h.y + .02, 1.6) * 3.;
        return starCol(h.z) * b * exp(-dot(p - sp, p - sp) / (sig * sig));
      }
      void main(){
        vec2 st = vec2(gl_FragCoord.x / uN, 1. - gl_FragCoord.y / uN) * 2. - 1.;
        float sc = st.x, tc = st.y; vec3 d;
        if (uFace == 0) d = vec3(1., -tc, -sc); else if (uFace == 1) d = vec3(-1., -tc, sc);
        else if (uFace == 2) d = vec3(sc, 1., tc); else if (uFace == 3) d = vec3(sc, -1., -tc);
        else if (uFace == 4) d = vec3(sc, -tc, 1.); else d = vec3(-sc, -tc, -1.);
        d = normalize(d);
        float px = 1.5708 / uN / length(vec3(sc, tc, 1.));
        // Milky Way band with dust lanes
        float lat = dot(d, uBand);
        float n = fbm(d * 3.5), dn = fbm(d * 9. + 4.);
        float band = exp(-lat * lat / (0.018 + 0.03 * n)) * (0.35 + 0.9 * n);
        band *= 1. - 0.75 * smoothstep(0.45, 0.7, dn) * exp(-lat * lat / 0.006);
        vec3 core = normalize(cross(uBand, vec3(0., 0., 1.)));
        float toCore = .5 + .5 * dot(d, core);
        vec3 col = band * mix(vec3(.30, .32, .42), vec3(.62, .5, .36), toCore * toCore) * .55;
        // faint coloured nebulosity everywhere
        float neb = fbm(d * 2.2 + 9.);
        col += vec3(.06, .03, .09) * smoothstep(.45, .8, neb) + vec3(.02, .05, .08) * smoothstep(.5, .85, fbm(d * 1.7 - 3.));
        // stars: denser in the band
        float bd = 1. + 2.5 * band;
        col += layer(d, 60., .14, 1.3, px);
        col += layer(d, 140., .16 * bd, .8, px);
        col += layer(d, 320., .14 * bd, .55, px);
        col += layer(d, 700., .10 * bd, .4, px);
        // a colourful spiral galaxy for the Einstein ring
        vec3 gz = uGal, gx = normalize(cross(vec3(0., 1., 0.), gz)), gy = cross(gz, gx);
        vec2 q = vec2(dot(d, gx), dot(d, gy)) / max(dot(d, gz), 1e-3);
        q = mat2(.8, -.6, .6, .8) * q; q.y *= 1.7;
        float rg = length(q), ag = atan(q.y, q.x);
        float arms = .5 + .5 * cos(2. * ag - 9. * log(rg + .004) );
        float disc = exp(-rg / .045) * (0.35 + 0.65 * arms) + 1.6 * exp(-rg * rg / .0004);
        col += dot(d, gz) > 0. ? disc * mix(vec3(.45, .55, 1.), vec3(1., .85, .6), exp(-rg / .02)) * 1.1 : vec3(0.);
        // the twin star: bright blue-white with a soft halo
        float tw = acos(clamp(dot(d, uTwin), -1., 1.));
        col += vec3(.75, .87, 1.) * (exp(-tw * tw / 2.2e-6) * 3. + exp(-tw / .004) * .35);
        gl_FragColor = vec4(pow(clamp(col, 0., 1.), vec3(1. / 2.2)), 1.);
      }`,
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
  const sc = new THREE.Scene(); sc.add(quad);
  const camO = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const faces = [];
  for (let f = 0; f < 6; f++) {
    mat.uniforms.uFace.value = f;
    r.render(sc, camO);
    const c = document.createElement('canvas'); c.width = c.height = N;
    c.getContext('2d').drawImage(canvas, 0, 0); faces.push(c);
  }
  r.dispose(); r.forceContextLoss();
  _cube = new THREE.CubeTexture(faces);
  _cube.colorSpace = THREE.SRGBColorSpace;
  _cube.generateMipmaps = true; _cube.minFilter = THREE.LinearMipmapLinearFilter; _cube.magFilter = THREE.LinearFilter;
  _cube.needsUpdate = true;
  return _cube;
}

// ---------- light bending around a Schwarzschild black hole (units: M = 1, horizon at r = 2) ----------
// For a static observer at radius r0, a ray leaving at angle alpha from the direction to the hole
// ends up travelling towards sky angle phi (measured from the outward radial direction), or is captured.
// Orbit equation: d2u/dphi2 = 3u^2 - u (u = 1/r). Start: u0 = 1/r0, du/dphi = u0 sqrt(1 - 2u0) cot(alpha).
export function traceRay(r0, alpha, path = null) {
  const u0 = 1 / r0;
  if (alpha < 1e-5) return { cap: true, phi: 0 };
  if (Math.PI - alpha < 1e-5) return { cap: false, phi: 0 };
  let u = u0, w = u0 * Math.sqrt(1 - 2 * u0) / Math.tan(alpha), phi = 0;
  const f = (u) => 3 * u * u - u;
  for (let n = 0; n < 40000; n++) {
    if (path) path.push([1 / u, phi]);
    const h = Math.min(0.01, Math.max(2e-5, 0.04 * Math.max(u, 0.02 * u0) / (Math.abs(w) + 1e-9)));
    const k1u = w, k1w = f(u);
    const k2u = w + 0.5 * h * k1w, k2w = f(u + 0.5 * h * k1u);
    const k3u = w + 0.5 * h * k2w, k3w = f(u + 0.5 * h * k2u);
    const k4u = w + h * k3w, k4w = f(u + h * k3u);
    const un = u + h / 6 * (k1u + 2 * k2u + 2 * k3u + k4u);
    const wn = w + h / 6 * (k1w + 2 * k2w + 2 * k3w + k4w);
    if (un <= 0) return { cap: false, phi: phi + h * u / (u - un) };
    u = un; w = wn; phi += h;
    if (u >= 0.5) return { cap: true, phi };
    if (phi > 7 * Math.PI) return { cap: true, phi };
  }
  return { cap: true, phi };
}
const LUTN = 2048;
const _luts = new Map();
export function lensTable(r0) {
  const key = r0.toFixed(4);
  if (_luts.has(key)) return _luts.get(key);
  const data = new Float32Array(LUTN * 4);
  for (let i = 0; i < LUTN; i++) {
    const a = i / (LUTN - 1) * Math.PI;
    const t = traceRay(r0, a);
    data[i * 4] = t.cap ? 0 : t.phi; data[i * 4 + 1] = t.cap ? 1 : 0;
  }
  const tex = new THREE.DataTexture(data, LUTN, 1, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.needsUpdate = true;
  const out = { tex, data, r0 };
  if (_luts.size > 400) _luts.clear();
  _luts.set(key, out);
  return out;
}
// where (which view angles alpha) a sky direction at angle beta from the outward radial appears: primary + secondary image
export function imageAngles(table, beta) {
  const d = table.data, res = [];
  for (const target of [beta, 2 * Math.PI - beta]) {
    for (let i = LUTN - 1; i > 0; i--) {
      const p1 = d[i * 4], p0 = d[(i - 1) * 4];
      if (d[i * 4 + 1] > 0.5 || d[(i - 1) * 4 + 1] > 0.5) break;
      if ((p1 - target) * (p0 - target) <= 0 && p1 !== p0) {
        const fr = (target - p1) / (p0 - p1);
        res.push((i - fr) / (LUTN - 1) * Math.PI); break;
      }
    }
  }
  return res;
}

// ---------- the lensing sky: replaces a stage's blue sky ----------
const LENS_FRAG = `
  uniform sampler2D uLUT; uniform samplerCube uCube; uniform vec3 uBH; uniform mat3 uRot;
  uniform float uGain, uLens, uRed, uDim; uniform vec3 uTint;
  varying vec3 vDir;
  const float N = ${LUTN}.0;
  void main(){
    vec3 d = normalize(vDir);
    vec3 toBH = normalize(uBH - cameraPosition);
    float a = acos(clamp(dot(d, toBH), -1., 1.));
    float x = a / 3.14159265 * (N - 1.); float i0 = floor(x); float f = x - i0;
    vec4 A = texture2D(uLUT, vec2((i0 + .5) / N, .5)), B = texture2D(uLUT, vec2((min(i0 + 1., N - 1.) + .5) / N, .5));
    float cap = mix(A.g, B.g, f);
    float ph = mix(A.r, B.r, f);
    ph = A.g > .5 ? B.r : (B.g > .5 ? A.r : ph);
    ph = mix(3.14159265 - a, ph, uLens); cap *= uLens;
    vec3 er = -toBH; vec3 t = d - dot(d, er) * er; float tl = length(t);
    vec3 et = tl > 1e-6 ? t / tl : normalize(cross(er, vec3(.3, 1., .1)));
    vec3 s = cos(ph) * er + sin(ph) * et;
    vec3 col = textureCube(uCube, uRot * s).rgb * uGain;
    float l = max(col.r, max(col.g, col.b));
    col *= 1. + 2.5 * smoothstep(.55, 1., l);          // bright star cores bloom
    col = mix(col, vec3(dot(col, vec3(.6, .3, .1))) * vec3(1.6, .35, .2), uRed);
    col *= uTint * (1. - uDim);
    col *= 1. - smoothstep(.0, 1., cap);
    gl_FragColor = vec4(col, 1.);
    #include <colorspace_fragment>
  }`;
// lensSky(scene) -> controller. set({ bh: Vector3 world, M: world length of one mass unit (horizon radius = 2M), rot: Matrix3 })
export function lensSky(scene, { M = 1, bh = new THREE.Vector3(), gain = 1 } = {}) {
  const sky = scene.userData.sky;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uLUT: { value: lensTable(1e5).tex }, uCube: { value: starCube() }, uBH: { value: bh.clone() }, uRot: { value: new THREE.Matrix3() },
      uGain: { value: gain }, uLens: { value: 1 }, uRed: { value: 0 }, uDim: { value: 0 }, uTint: { value: new THREE.Color(1, 1, 1) },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = (modelMatrix*vec4(position,1.)).xyz - cameraPosition; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position.z = gl_Position.w; }`,
    fragmentShader: LENS_FRAG, side: THREE.BackSide, depthWrite: false, toneMapped: false,
  });
  sky.material = mat;
  scene.children.forEach(o => { if (o.material && o.material.isShadowMaterial) o.visible = false; });
  const ctl = {
    mat, M, bh: bh.clone(),
    // call every frame after placing the camera
    update(camera) {
      camera.updateMatrixWorld(true);
      const r0 = Math.max(2.02, camera.position.distanceTo(ctl.bh) / ctl.M);
      const q = r0 > 400 ? 1e5 : r0 > 40 ? Math.round(r0 * 20) / 20 : Math.round(r0 * 2000) / 2000;
      ctl.table = lensTable(q);
      mat.uniforms.uLUT.value = ctl.table.tex;
      mat.uniforms.uBH.value.copy(ctl.bh);
      return r0;
    },
    // screen-facing world positions of the images of a sky direction (for markers)
    images(camera, skyDir, dist = 10) {
      const er = camera.position.clone().sub(ctl.bh).normalize();
      const inv = new THREE.Matrix3().copy(mat.uniforms.uRot.value).transpose();
      const s = skyDir.clone().applyMatrix3(inv).normalize();
      const beta = Math.acos(THREE.MathUtils.clamp(s.dot(er), -1, 1));
      const et = s.clone().addScaledVector(er, -s.dot(er)).normalize();
      return imageAngles(ctl.table, beta).map((a, k) => {
        const tdir = k === 0 ? et : et.clone().negate();
        const psi = Math.PI - a;
        const d = er.clone().multiplyScalar(Math.cos(psi)).addScaledVector(tdir, Math.sin(psi));
        return camera.position.clone().addScaledVector(d, dist);
      });
    },
  };
  return ctl;
}
// rotation matrix for the sky lookup (sky frame = world frame rotated)
export function skyRot(yaw = 0, pitch = 0, roll = 0) {
  const m4 = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'));
  return new THREE.Matrix3().setFromMatrix4(m4);
}

// a dark space stage: makeStage + lensing sky + space lighting
export function spaceStage(makeStage, { M = 1, bh = new THREE.Vector3(), sunDir = [-4, 3, 5], sun = 2.6, gain = 1 } = {}) {
  const scene = makeStage({ shadowSize: 3, sunDir, sun });
  scene.environmentIntensity = 0.55;
  scene.traverse(o => {
    if (o.isHemisphereLight) { o.color.set(0x9bb0d8); o.groundColor.set(0x101018); o.intensity = 0.35; }
    if (o.isDirectionalLight && o !== scene.userData.key) { o.color.set(0x8fb4ff); o.intensity = 1.6; }
  });
  const lens = lensSky(scene, { M, bh, gain });
  return { scene, lens };
}

// ---------- photon path in world space (for the "gravity bends light" diagram) ----------
// observer at obs, hole at bh; the ray leaves the observer at angle alpha from the hole, in the plane towards side.
export function photonPath(obs, bh, M, alpha, side, rMax = 40) {
  const er = obs.clone().sub(bh).normalize();
  const et = side.clone().addScaledVector(er, -side.dot(er)).normalize();
  const r0 = obs.distanceTo(bh) / M;
  const pts = [];
  traceRay(r0, alpha, pts);
  const out = [];
  for (const [r, phi] of pts) {
    if (r > rMax) break;
    out.push(bh.clone().addScaledVector(er, Math.cos(phi) * r * M).addScaledVector(et, Math.sin(phi) * r * M));
  }
  const psi = Math.PI - alpha;
  const look = er.clone().multiplyScalar(Math.cos(psi)).addScaledVector(et, Math.sin(psi));   // where the observer looks
  return { pts: out, look };
}

// ---------- the astronaut: the engine person restyled into a white suit with a clear bubble helmet ----------
export function astronaut({ suit = 0xf1f2f4, accent = 0xff7a1a, visorTint = 0xbfe3ff } = {}) {
  const man = makeHuman('casual');
  const M = materials();
  const fab = fabricTexture(5);
  const suitM = new THREE.MeshStandardMaterial({ color: suit, roughness: 0.78, bumpMap: fab, bumpScale: 1.4 });
  const gloveM = std(0xd9dce2, { roughness: 0.55 });
  const bootM = std(0x9aa0aa, { roughness: 0.5 });
  const accM = std(accent, { roughness: 0.5 });
  const j = man.j;
  man.root.traverse(o => {
    if (!o.isMesh) return;
    const feet = under(o, j.lAn) || under(o, j.rAn);
    const hands = under(o, j.lWr) || under(o, j.rWr);
    if (feet) {
      if (o.material === M.skin) {
        const rr = o.geometry.parameters && o.geometry.parameters.radius;
        if (rr && rr < 0.012) o.visible = false; else o.material = bootM;
      } else o.material = bootM;
      return;
    }
    if (hands) { o.material = gloveM; return; }
    if (o.material === M.cloth) o.material = suitM;
    if (o.parent === j.neck && o.material === M.skin) o.material = suitM;   // suit neck ring
    if (o.material === M.beard || (o.material.transparent && o.material.opacity === 0.2)) o.visible = false;
  });
  const chest = j.chest;
  // bulkier suit: puffs on the joints, an orange stripe on each upper arm, a collar ring and a backpack
  for (const k of ['l', 'r']) {
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 10, 24), gloveM); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.255; j[k + 'El'].add(cuff);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.04, 24), accM); band.position.y = -0.13; j[k + 'Sh'].add(band);
    const kp = new THREE.Mesh(new THREE.SphereGeometry(0.068, 20, 14), suitM); j[k + 'Kn'].add(kp);
    const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.062, 0.12, 20), bootM); bt.position.y = 0.04; j[k + 'An'].add(bt);
  }
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 12, 40), std(0xb8bec8, { metalness: 0.8, roughness: 0.3 }));
  collar.rotation.x = Math.PI / 2; collar.position.set(0, 0.38, 0.0); chest.add(collar);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.16), std(0xe6e8ec, { roughness: 0.6 }));
  pack.position.set(0, 0.12, -0.19); chest.add(pack);
  const packTop = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 12), accM); packTop.rotation.z = Math.PI / 2; packTop.position.set(0, 0.34, -0.19); chest.add(packTop);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.04), std(0x9aa3b0, { roughness: 0.4 })); panel.position.set(0, 0.06, 0.17); chest.add(panel);
  for (let i = 0; i < 3; i++) {
    const bcol = [0xff3b30, 0x34c759, 0x0a84ff][i];
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshStandardMaterial({ color: bcol, emissive: bcol, emissiveIntensity: 0.6 }));
    b.position.set(-0.045 + i * 0.045, 0.06, 0.192); chest.add(b);
  }
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.045), std(0x1e5bd8)); flag.position.set(0.11, 0.2, 0.172); flag.rotation.y = 0.35; chest.add(flag);
  // clear bubble helmet fixed to the suit (the head turns inside it)
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.205, 48, 32), new THREE.MeshPhysicalMaterial({
    color: visorTint, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false,
  }));
  helm.position.set(0, 0.56, 0.02); helm.renderOrder = 5; helm.castShadow = false; chest.add(helm);
  const rimG = new THREE.Mesh(new THREE.SphereGeometry(0.208, 48, 32, 0, Math.PI * 2, 0, 0.5), std(0xd8dde4, { metalness: 0.6, roughness: 0.35 }));
  rimG.position.copy(helm.position); rimG.rotation.x = -0.25; rimG.scale.setScalar(1.0); chest.add(rimG);
  man.helmet = helm;
  // own copies of every material, so tinting or fading one astronaut never touches another shot
  const cache = new Map();
  man.root.traverse(o => { if (o.isMesh) { if (!cache.has(o.material)) cache.set(o.material, o.material.clone()); o.material = cache.get(o.material); } });
  man.helmet = helm;
  // list of tintable materials (for the red fade at the end)
  const mats = new Set();
  man.root.traverse(o => { if (o.isMesh && o.material && o.material.color) mats.add(o.material); });
  man.redshift = (k, fade = 0) => {
    for (const m of mats) {
      if (!m.userData.c0) { m.userData.c0 = m.color.clone(); m.userData.o0 = m.opacity; m.userData.t0 = m.transparent; }
      m.color.copy(m.userData.c0).lerp(new THREE.Color(0.55, 0.04, 0.02).multiplyScalar(m.userData.c0.r * 0.3 + m.userData.c0.g * 0.6 + 0.2), k);
      if (m.emissive) m.emissiveIntensity = (m.userData.e0 ??= m.emissiveIntensity) * (1 - k);
      if (fade > 0) { m.transparent = true; m.opacity = m.userData.o0 * (1 - fade); } else { m.transparent = m.userData.t0; m.opacity = m.userData.o0; }
    }
  };
  man.mats = mats;
  shadow(man.root); helm.castShadow = false;
  return man;
}

// ---------- glowing arrow (force or light direction) ----------
export function arrow(color = 0xff3b30, len = 1, r = 0.035) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, roughness: 0.4, toneMapped: false });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 16), m); g.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, r * 6, 20), m); g.add(head);
  g.mat = m;
  g.setLen = (L) => { const hl = r * 6; const s = Math.max(0.001, L - hl); shaft.scale.y = s; shaft.position.y = s / 2; head.position.y = s + hl / 2; };
  g.setLen(len);
  return g;
}
// orient an object so its +Y points along dir
export function pointY(o, dir) { o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); }

// ---------- glowing tube along points (light ray), with progressive draw ----------
export function lightTube(color = 0xffe7a0, r = 0.02) {
  const m = new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), m);
  mesh.frustumCulled = false;
  mesh.setPoints = (pts, rr = r) => {
    if (pts.length < 2) { mesh.visible = false; return; }
    mesh.visible = true;
    mesh.geometry.dispose();
    const curve = new THREE.CatmullRomCurve3(pts);
    mesh.geometry = new THREE.TubeGeometry(curve, Math.min(400, pts.length * 2), rr, 10, false);
  };
  mesh.mat = m;
  return mesh;
}
// pick points of a polyline up to a fraction of its length
export function partial(pts, k) {
  if (k >= 1) return pts;
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const T = L[L.length - 1] * k, out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (L[i] <= T) out.push(pts[i]);
    else { out.push(pts[i - 1].clone().lerp(pts[i], (T - L[i - 1]) / (L[i] - L[i - 1]))); break; }
  }
  return out;
}

// ---------- a ring marker sprite (circles one image of the twin star) ----------
let _ringTex;
export function ringMarker(color = 0x7fd4ff, size = 1) {
  if (!_ringTex) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'); x.strokeStyle = '#fff'; x.lineWidth = 14; x.beginPath(); x.arc(128, 128, 100, 0, Math.PI * 2); x.stroke();
    _ringTex = new THREE.CanvasTexture(c); _ringTex.colorSpace = THREE.SRGBColorSpace;
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: _ringTex, color, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
  s.scale.setScalar(size); s.renderOrder = 20;
  return s;
}

// ---------- a stylised black hole ball (shadow + thin glowing photon ring), for side-by-side size comparisons ----------
export function holeBall(radius = 1, ringColor = 0xffd7a0) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  g.add(ball);
  const ringM = new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(ringColor) }, uK: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 uC; uniform float uK; varying vec2 vUv;
      void main(){ float r = length(vUv - .5) * 2.; float a = exp(-pow((r - .72) / .025, 2.)) * 1.6 + exp(-pow((r - .72) / .12, 2.)) * .35;
        a *= step(.69, r) * .85 + .15; gl_FragColor = vec4(uC * a * uK, 1.); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const ring = new THREE.Sprite(); ring.material = ringM; ring.scale.setScalar(radius * 2 / 0.72 * 1.02);
  ring.renderOrder = 3; g.add(ring);
  g.ring = ring; g.ringMat = ringM;
  return g;
}

// ---------- spiral galaxy (points) ----------
export function galaxy({ n = 26000, R = 10, seed = 4 } = {}) {
  const r = rng(seed);
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n);
  const c1 = new THREE.Color(0xfff0c8), c2 = new THREE.Color(0x9cc2ff), c3 = new THREE.Color(0xff9ab8);
  const g = (s = 1) => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) / 1.4 * s; };
  for (let i = 0; i < n; i++) {
    let x, y, z, c;
    if (i < n * 0.22) {   // bulge
      const rr = Math.abs(g(0.12)) * R; const a = r() * Math.PI * 2;
      x = Math.cos(a) * rr; z = Math.sin(a) * rr * 0.9; y = g(0.05) * R * Math.exp(-rr / R * 3); c = c1.clone();
    } else {
      const arm = Math.floor(r() * 4);
      const t = Math.pow(r(), 0.7);
      const rr = (0.12 + 0.9 * t) * R;
      const a = arm * Math.PI / 2 + Math.log(rr / (0.12 * R)) / 0.32 + g(0.22);
      x = Math.cos(a) * rr + g(0.025) * R; z = Math.sin(a) * rr + g(0.025) * R; y = g(0.012) * R;
      c = c2.clone().lerp(c1, Math.max(0, 1 - t * 2.2)); if (r() < 0.05) c = c3.clone();
    }
    pos.set([x, y, z], i * 3); col.set([c.r, c.g, c.b], i * 3); size[i] = 0.5 + r() * 1.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const tex = glowTexture();
  const m = new THREE.PointsMaterial({ size: R * 0.018, map: tex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, sizeAttenuation: true, opacity: 0.85 });
  const pts = new THREE.Points(geo, m);
  const grp = new THREE.Group(); grp.add(pts);
  const core = glowSprite(0xffe6b0, R * 0.55); core.material.opacity = 0.75; grp.add(core);
  const haze = glowSprite(0x8aa8ff, R * 2.0); haze.material.opacity = 0.18; grp.add(haze);
  grp.points = pts; grp.core = core;
  return grp;
}

// ---------- the event horizon drawn as a glowing grid (it is invisible in reality) ----------
export function horizonGrid(R = 1, color = 0x4fd2ff) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(color) }, uK: { value: 1 }, uLines: { value: new THREE.Vector2(96, 48) } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uC; uniform float uK; uniform vec2 uLines; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vec2 g = abs(fract(vUv * uLines) - .5) / fwidth(vUv * uLines);
        float line = 1. - min(min(g.x, g.y) / 1.2, 1.);
        float fr = .25 + .75 * pow(1. - abs(dot(vN, vV)), 1.5);
        gl_FragColor = vec4(uC * (line * 1.4 + .06) * fr * uK, 1.); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(R, 192, 96), m);
  s.mat = m;
  return s;
}

// ---------- a small cartoon spaceship with a glass cockpit ----------
export function ship() {
  const g = new THREE.Group();
  const white = std(0xf2f3f5, { roughness: 0.4, metalness: 0.1 }), red = std(0xe8352b, { roughness: 0.45 }), dark = std(0x3a3f48, { metalness: 0.7, roughness: 0.35 });
  const prof = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; prof.push(new THREE.Vector2(0.001 + 0.62 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.75) * (1 - 0.25 * t), -1.4 + t * 2.9)); }
  prof[prof.length - 1].x = 0.001;
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), white); g.add(body);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.63, 0.63, 0.14, 48), red); stripe.position.y = -0.55; g.add(stripe);
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.55), red);
    const a = i / 3 * Math.PI * 2; fin.position.set(Math.cos(a) * 0.62, -1.15, Math.sin(a) * 0.62); fin.rotation.y = -a; g.add(fin);
  }
  const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.3, 32, 1, true), dark); noz.position.y = -1.5; g.add(noz);
  const flame = glowSprite(0x6fb6ff, 0.9); flame.position.y = -1.75; g.add(flame); g.flame = flame;
  // porthole: a dark recess with a glass cap
  const port = new THREE.Group(); port.position.set(0, 0.35, 0.5); g.add(port);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 16, 48), dark); port.add(frame);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.3, 48), new THREE.MeshPhysicalMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.18, roughness: 0.05, clearcoat: 1, depthWrite: false }));
  glass.position.z = 0.02; port.add(glass);
  const inside = new THREE.Mesh(new THREE.CircleGeometry(0.29, 48), new THREE.MeshBasicMaterial({ color: 0x0b1020 })); inside.position.z = -0.12; port.add(inside);
  g.port = port;
  return shadow(g);
}

// ---------- particles streaming in a line (the spaghetti dissolving) ----------
export function streamDust(n = 400, color = [1, 0.9, 0.8], seed = 7) {
  const r = rng(seed);
  const pos = new Float32Array(n * 3), seedA = [];
  for (let i = 0; i < n; i++) seedA.push([r(), r(), r(), r()]);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ size: 0.04, map: glowTexture(), color: new THREE.Color(...color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const p = new THREE.Points(geo, m); p.frustumCulled = false;
  // update(from, to, k): particles spread along the segment from->to with a little scatter
  p.update = (from, to, k, t) => {
    const d = to.clone().sub(from);
    for (let i = 0; i < n; i++) {
      const [a, b, c, e] = seedA[i];
      const s = (a + t * (0.3 + 0.6 * e)) % 1;
      const q = from.clone().addScaledVector(d, s);
      const sc = 0.06 * k * (0.3 + s);
      pos[i * 3] = q.x + (b - 0.5) * sc; pos[i * 3 + 1] = q.y + (c - 0.5) * sc * 0.3; pos[i * 3 + 2] = q.z + (e - 0.5) * sc;
    }
    geo.attributes.position.needsUpdate = true;
    m.opacity = k;
  };
  return p;
}
