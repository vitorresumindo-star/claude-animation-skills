// The Roman world as a 3D table map, and the Earth as a globe.
// Map: extruded Natural Earth coastlines, Roman roads, cities, and a gold "spread" whose arrival time at every
// point comes from a shortest-path search out of Jerusalem (roads fast, open land slow, sea in between).
import * as THREE from 'three';
import { MED, WORLD } from './geo.js';
import { glowTexture, rng } from './textures.js';
import { glowSprite } from './props.js';

// ---------- projection (map units, the map lies in the x/-z plane, north = -z) ----------
export const LON0 = 18, LAT0 = 38, S = 0.12, KX = Math.cos(LAT0 * Math.PI / 180);
const LONA = -12, LONB = 50, LATA = 20, LATB = 58;
export const toXZ = (lon, lat, y = 0) => new THREE.Vector3((lon - LON0) * KX * S, y, -(lat - LAT0) * S);
export const LAND_H = 0.03;

// cities [name, lon, lat, label?]
export const CITIES = [
  ['Jerusalem', 35.23, 31.78, 1], ['Antioch', 36.16, 36.2, 1], ['Damascus', 36.3, 33.51], ['Caesarea', 34.9, 32.5], ['Tarsus', 34.9, 36.92],
  ['Ephesus', 27.34, 37.94, 1], ['Iconium', 32.48, 37.87], ['Ancyra', 32.86, 39.93], ['Nicomedia', 29.92, 40.77], ['Constantinople', 28.98, 41.01, 1],
  ['Thessalonica', 22.94, 40.64], ['Philippi', 24.29, 41.01], ['Athens', 23.73, 37.98, 1], ['Corinth', 22.93, 37.91], ['Dyrrachium', 19.45, 41.32],
  ['Rome', 12.5, 41.9, 1], ['Brundisium', 17.94, 40.64], ['Capua', 14.25, 41.08], ['Mediolanum', 9.19, 45.46], ['Aquileia', 13.37, 45.77], ['Ravenna', 12.2, 44.42],
  ['Sirmium', 19.61, 45.0], ['Naissus', 21.9, 43.32], ['Serdica', 23.32, 42.7], ['Adrianople', 26.56, 41.68],
  ['Massilia', 5.37, 43.3], ['Lugdunum', 4.83, 45.76, 1], ['Lutetia', 2.35, 48.86], ['Treveri', 6.64, 49.75], ['Colonia', 6.96, 50.94], ['Narbo', 3.0, 43.18],
  ['Londinium', -0.12, 51.51, 1], ['Eboracum', -1.08, 53.96], ['Tarraco', 1.25, 41.12], ['Caesaraugusta', -0.88, 41.65], ['Corduba', -4.78, 37.88, 1], ['Gades', -6.29, 36.53], ['Emerita', -6.35, 38.92], ['Olisipo', -9.14, 38.72], ['Carthago Nova', -0.98, 37.6],
  ['Carthage', 10.32, 36.85, 1], ['Lepcis Magna', 14.29, 32.64], ['Cyrene', 21.86, 32.82], ['Alexandria', 29.92, 31.2, 1], ['Memphis', 31.25, 29.85], ['Thebes', 32.65, 25.7], ['Cirta', 6.61, 36.36], ['Caesarea Maur.', 2.19, 36.6], ['Tingis', -5.8, 35.77],
  ['Gaza', 34.45, 31.5], ['Pelusium', 32.56, 31.04], ['Caesarea Capp.', 35.48, 38.73], ['Edessa', 38.79, 37.15], ['Palmyra', 38.27, 34.55], ['Syracuse', 15.29, 37.08], ['Salona', 16.48, 43.54], ['Smyrna', 27.14, 38.42], ['Pergamum', 27.18, 39.12], ['Troas', 26.16, 39.75],
];
const C = Object.fromEntries(CITIES.map(([n, lo, la]) => [n, [lo, la]]));
// the main Roman roads, as chains of cities
const ROADS = [
  ['Gaza', 'Jerusalem', 'Caesarea', 'Damascus', 'Antioch'], ['Pelusium', 'Gaza'], ['Alexandria', 'Pelusium'], ['Alexandria', 'Memphis', 'Thebes'],
  ['Antioch', 'Tarsus', 'Iconium', 'Ephesus'], ['Antioch', 'Edessa'], ['Damascus', 'Palmyra'], ['Tarsus', 'Caesarea Capp.', 'Ancyra', 'Nicomedia', 'Constantinople'],
  ['Ephesus', 'Smyrna', 'Pergamum', 'Troas'], ['Ephesus', 'Nicomedia'],
  ['Constantinople', 'Adrianople', 'Philippi', 'Thessalonica', 'Dyrrachium'], ['Thessalonica', 'Athens', 'Corinth'],
  ['Adrianople', 'Serdica', 'Naissus', 'Sirmium', 'Aquileia'], ['Naissus', 'Salona'],
  ['Brundisium', 'Capua', 'Rome', 'Ravenna', 'Aquileia'], ['Ravenna', 'Mediolanum'], ['Rome', 'Massilia'], ['Mediolanum', 'Lugdunum'],
  ['Massilia', 'Narbo', 'Tarraco', 'Carthago Nova', 'Corduba', 'Gades'], ['Tarraco', 'Caesaraugusta', 'Emerita', 'Olisipo'], ['Corduba', 'Emerita'],
  ['Massilia', 'Lugdunum', 'Lutetia', 'Colonia'], ['Lugdunum', 'Treveri', 'Colonia'], ['Londinium', 'Eboracum'],
  ['Alexandria', 'Cyrene', 'Lepcis Magna', 'Carthage', 'Cirta', 'Caesarea Maur.', 'Tingis'],
];
// sea crossings people actually used (drawn faint, they also help the spread)
const SEAWAYS = [['Lutetia', 'Londinium'], ['Corinth', 'Brundisium'], ['Rome', 'Carthage'], ['Syracuse', 'Carthage'], ['Caesarea', 'Alexandria'], ['Ephesus', 'Corinth'], ['Brundisium', 'Dyrrachium']];
// the empire around AD 380 (lon, lat), roughly: Hadrian's Wall, Rhine, Danube, the Euphrates, the deserts
const EMPIRE = [[-6, 55.2], [-1, 55.2], [3, 51.6], [6.2, 51.9], [7.2, 50.6], [8.3, 49.4], [7.9, 48], [9.6, 47.6], [12.2, 48.4], [16.5, 48.3], [19, 47.8], [19.1, 46], [20.6, 44.9], [22.6, 44.7], [24.2, 43.8], [28, 44.2], [29.7, 45.3], [30.4, 44.4],
  [29, 41.6], [33, 42.3], [41.6, 41.6], [43.2, 40.2], [42.2, 37.6], [40.2, 36.6], [40.6, 35], [38.6, 33.4], [37.2, 31.8], [36.2, 29.4], [34.8, 29.3], [33.4, 27.8], [33.6, 26.4], [33.1, 23.8], [31.3, 23.6], [30, 24.5], [25.2, 29.2], [20, 30.3], [15, 30.8], [11, 31.1], [8.2, 33.4], [2, 34.5], [-2, 34.4], [-5.6, 33.9], [-6.8, 34.3], [-9.8, 35.5],
  [-9.9, 37], [-9.7, 43.9], [-1.4, 43.6], [-4.9, 48.4], [-5.4, 50], [-6.2, 50], [-6, 55.2]];

// ---------- rasters on the lon/lat grid: land, empire, roads -> arrival times ----------
const GW = 312, GH = 192;
const gx = lon => (lon - LONA) / (LONB - LONA) * GW, gy = lat => (LATB - lat) / (LATB - LATA) * GH;
function raster(draw) {
  const c = document.createElement('canvas'); c.width = GW; c.height = GH; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, GW, GH); x.fillStyle = '#fff'; x.strokeStyle = '#fff'; draw(x);
  const d = x.getImageData(0, 0, GW, GH).data; const out = new Uint8Array(GW * GH);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4] > 127 ? 1 : 0;
  return out;
}
const ring = (x, R, step = 100) => { x.beginPath(); for (let i = 0; i < R.length; i += 2) { const X = gx(R[i] / step), Y = gy(R[i + 1] / step); i ? x.lineTo(X, Y) : x.moveTo(X, Y); } x.closePath(); x.fill(); };
let _arrival = null;
export function arrivalField() {
  if (_arrival) return _arrival;
  const land = raster(x => MED.forEach(R => ring(x, R)));
  const emp = raster(x => { x.beginPath(); EMPIRE.forEach(([lo, la], i) => i ? x.lineTo(gx(lo), gy(la)) : x.moveTo(gx(lo), gy(la))); x.closePath(); x.fill(); });
  const road = raster(x => { x.lineWidth = 2.2; x.lineCap = 'round'; for (const r of [...ROADS, ...SEAWAYS]) { x.beginPath(); r.forEach((n, i) => { const [lo, la] = C[n]; i ? x.lineTo(gx(lo), gy(la)) : x.moveTo(gx(lo), gy(la)); }); x.stroke(); } });
  const N = GW * GH, dist = new Float64Array(N).fill(Infinity);   // float64: a float32 store would round and fail the "d > dist" check
  const cost = i => !emp[i] ? Infinity : road[i] ? 1 : land[i] ? 4.0 : 1.3;   // roads and sea lanes fast, countryside slow
  // Dijkstra with a binary heap
  const heap = [], push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const s = Math.round(gy(31.78)) * GW + Math.round(gx(35.23)); dist[s] = 0; push(0, s);
  const nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (heap.length) {
    const [d, i] = pop(); if (d > dist[i]) continue;
    const x = i % GW, y = (i / GW) | 0;
    for (const [dx, dy, w] of nb) {
      const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= GW || Y >= GH) continue;
      const j = Y * GW + X, c = cost(j); if (c === Infinity) continue;
      const nd = d + w * 0.5 * (c + cost(i)); if (nd < dist[j]) { dist[j] = nd; push(nd, j); }
    }
  }
  let mx = 0; for (let i = 0; i < N; i++) if (emp[i] && land[i] && dist[i] < Infinity) mx = Math.max(mx, dist[i]);
  const arr = new Float32Array(N);
  for (let i = 0; i < N; i++) arr[i] = dist[i] < Infinity && emp[i] ? Math.pow(dist[i] / mx, 0.85) : 1.6;
  const half = new Uint16Array(N); for (let i = 0; i < N; i++) half[i] = THREE.DataUtils.toHalfFloat(arr[(GH - 1 - ((i / GW) | 0)) * GW + (i % GW)]);
  const tex = new THREE.DataTexture(half, GW, GH, THREE.RedFormat, THREE.HalfFloatType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  const at = (lon, lat) => { const X = Math.max(0, Math.min(GW - 1, Math.round(gx(lon)))), Y = Math.max(0, Math.min(GH - 1, Math.round(gy(lat)))); return arr[Y * GW + X]; };
  _arrival = { arr, tex, at, land, emp };
  return _arrival;
}

// ---------- textures for land and sea ----------
function mapCanvas(draw, w = 2048, h = Math.round(2048 * (LATB - LATA) / ((LONB - LONA) * KX))) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const X = lon => (lon - LONA) / (LONB - LONA) * w, Y = lat => (LATB - lat) / (LATB - LATA) * h;
  draw(x, X, Y, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const pathRing = (x, R, X, Y) => { x.beginPath(); for (let i = 0; i < R.length; i += 2) { const px = X(R[i] / 100), py = Y(R[i + 1] / 100); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); };
function landTexture() {
  return mapCanvas((x, X, Y, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#4f7e3c'); g.addColorStop(0.35, '#6e8f4a'); g.addColorStop(0.55, '#a39a5e'); g.addColorStop(0.75, '#c2a46c'); g.addColorStop(1, '#c9a96e');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const r = rng(2);
    for (let i = 0; i < 9000; i++) { const v = r(); x.fillStyle = v < 0.5 ? 'rgba(60,70,30,0.06)' : 'rgba(255,240,200,0.07)'; const s = 2 + r() * 10; x.fillRect(r() * w, r() * h, s, s); }
    // mountain shading along a few ranges (Alps, Pyrenees, Taurus, Atlas, Balkans)
    const ranges = [[[6, 45.5], [8, 46.2], [10.5, 46.5], [13, 46.6]], [[-1.5, 42.8], [1.5, 42.6]], [[30, 37.2], [33, 37], [36, 37.8]], [[-6, 31.5], [-2, 32.5], [2, 34]], [[20, 42.5], [23, 42.6], [25, 42.7]], [[12.5, 43.6], [14, 42], [16, 40]]];
    x.lineCap = 'round';
    for (const R of ranges) { x.strokeStyle = 'rgba(120,100,70,0.35)'; x.lineWidth = 26; x.beginPath(); R.forEach(([lo, la], i) => i ? x.lineTo(X(lo), Y(la)) : x.moveTo(X(lo), Y(la))); x.stroke(); x.strokeStyle = 'rgba(250,245,235,0.25)'; x.lineWidth = 8; x.stroke(); }
  });
}
function seaTexture() {
  return mapCanvas((x, X, Y, w, h) => {
    x.fillStyle = '#123f6a'; x.fillRect(0, 0, w, h);
    x.save(); x.filter = 'blur(14px)'; x.strokeStyle = 'rgba(70,160,200,0.45)'; x.lineWidth = 16; MED.forEach(R => { pathRing(x, R, X, Y); x.stroke(); }); x.restore();
    x.save(); x.filter = 'blur(3px)'; x.strokeStyle = 'rgba(200,240,250,0.35)'; x.lineWidth = 3; MED.forEach(R => { pathRing(x, R, X, Y); x.stroke(); }); x.restore();
    const r = rng(5); for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.03})`; x.fillRect(r() * w, r() * h, 3, 1); }
  }, 1536);
}

// ---------- the table map ----------
export function romanMap() {
  const g = new THREE.Group();
  const A = arrivalField();
  // sea plane (clamped texture: the edges continue as open sea)
  const sea = seaTexture(); sea.wrapS = sea.wrapT = THREE.ClampToEdgeWrapping;
  const W = (LONB - LONA) * KX * S, H = (LATB - LATA) * S;
  const seaGeo = new THREE.PlaneGeometry(W * 4, H * 4); seaGeo.rotateX(-Math.PI / 2);
  const p0 = toXZ(LONA, LATB), p1 = toXZ(LONB, LATA);
  const uv = seaGeo.attributes.uv, pp = seaGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pp.getX(i) - p0.x) / (p1.x - p0.x), 1 - (pp.getZ(i) - p0.z) / (p1.z - p0.z));
  const seaMesh = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ map: sea, roughness: 0.35, metalness: 0.1 }));
  seaMesh.position.set((p0.x + p1.x) / 2, 0, (p0.z + p1.z) / 2); seaMesh.receiveShadow = true; g.add(seaMesh);
  // land: one extruded mesh, caps textured by lon/lat, plus the gold spread shader
  const shapes = MED.map(R => { const s = new THREE.Shape(); for (let i = 0; i < R.length; i += 2) { const lo = R[i] / 100, la = R[i + 1] / 100; const X = (lo - LON0) * KX * S, Y = (la - LAT0) * S; i ? s.lineTo(X, Y) : s.moveTo(X, Y); } return s; });
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: LAND_H, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 1 });
  const lt = landTexture();
  lt.repeat.set(1 / ((LONB - LONA) * KX * S), 1 / ((LATB - LATA) * S));
  lt.offset.set((LON0 - LONA) / (LONB - LONA), (LAT0 - LATA) / (LATB - LATA));
  const U = { uArr: { value: A.tex }, uProg: { value: -0.1 }, uAll: { value: 0 } };
  const capM = new THREE.MeshStandardMaterial({ map: lt, roughness: 0.9 });
  capM.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = 'uniform sampler2D uArr; uniform float uProg, uAll;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        float arr = texture2D(uArr, vMapUv).r;
        float lit = smoothstep(arr - 0.004, arr + 0.04, uProg);
        float fd = (uProg - arr - 0.012) / 0.022; float front = exp(-fd * fd) * step(arr, 1.2);
        float emp = step(arr, 1.2);
        diffuseColor.rgb = mix(diffuseColor.rgb * 0.72, vec3(0.98, 0.7, 0.2), lit * 0.78);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.58, 0.12) * (front * 0.9 + lit * 0.08 + emp * uAll * 0.3);`);
  };
  const sideM = new THREE.MeshStandardMaterial({ color: 0x8c7a58, roughness: 0.9 });
  const land = new THREE.Mesh(geo, [capM, sideM]); land.rotation.x = -Math.PI / 2; land.castShadow = true; land.receiveShadow = true; g.add(land);
  // roads: tubes whose rings carry the arrival time of the ground beneath them
  const roadMat = new THREE.ShaderMaterial({
    uniforms: { uProg: U.uProg, uAll: U.uAll },
    vertexShader: `attribute float arr; varying float vA; void main(){ vA = arr; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uProg, uAll; varying float vA;
      void main(){ float lit = smoothstep(vA - 0.004, vA + 0.025, uProg); float fd = (uProg - vA - 0.01) / 0.02; float front = exp(-fd * fd);
        vec3 c = mix(vec3(0.33, 0.25, 0.17), vec3(1.0, 0.7, 0.28) * (1.25 + 0.5 * uAll), lit) + vec3(1.0, 0.85, 0.5) * front * 1.6;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const seaMat = roadMat.clone(); seaMat.uniforms = { uProg: U.uProg, uAll: U.uAll };
  const mkRoad = (names, r, mat, sea = false) => {
    const pts = names.map(n => toXZ(...C[n], LAND_H + 0.004));
    if (sea) { const a = pts[0], b = pts[1]; const mid = a.clone().add(b).multiplyScalar(0.5); mid.y = 0.03 + a.distanceTo(b) * 0.06; pts.splice(1, 0, mid); }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const TS = Math.max(16, Math.round(curve.getLength() * 90)), RS = 5;
    const tg = new THREE.TubeGeometry(curve, TS, r, RS, false);
    const a = new Float32Array(tg.attributes.position.count);
    for (let i = 0; i <= TS; i++) {
      const p = curve.getPointAt(i / TS); const lon = p.x / (KX * S) + LON0, lat = -p.z / S + LAT0;
      const v = A.at(lon, lat); for (let k = 0; k <= RS; k++) a[i * (RS + 1) + k] = Math.min(v, 1.05);
    }
    tg.setAttribute('arr', new THREE.BufferAttribute(a, 1));
    const m = new THREE.Mesh(tg, mat); g.add(m); return m;
  };
  ROADS.forEach(r => { for (let i = 0; i < r.length - 1; i++) mkRoad([r[i], r[i + 1]], 0.0065, roadMat); });
  SEAWAYS.forEach(r => mkRoad(r, 0.004, seaMat, true));
  // cities: small pillars that light up when the spread reaches them, a few with labels
  const cities = [];
  const pillarM = new THREE.MeshStandardMaterial({ color: 0xefe6d2, roughness: 0.5 });
  for (const [name, lon, lat, lab] of CITIES) {
    const p = toXZ(lon, lat, LAND_H);
    const big = !!lab;
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(big ? 0.022 : 0.014, big ? 0.026 : 0.017, big ? 0.07 : 0.045, 12), pillarM.clone());
    pil.position.copy(p).add(new THREE.Vector3(0, big ? 0.035 : 0.022, 0)); pil.castShadow = true; g.add(pil);
    const gl = glowSprite(0xffc768, big ? 0.32 : 0.18); gl.position.copy(p).add(new THREE.Vector3(0, big ? 0.09 : 0.05, 0)); gl.material.opacity = 0; g.add(gl);
    let label = null;
    if (lab) {
      const c = document.createElement('canvas'); c.width = 768; c.height = 160; const x = c.getContext('2d');
      x.font = '700 92px Roman'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
      const tw = x.measureText(name.toUpperCase()).width; if (tw > 700) x.font = `700 ${Math.floor(92 * 700 / tw)}px Roman`;
      x.strokeStyle = 'rgba(40,24,8,0.85)'; x.lineWidth = 14; x.strokeText(name.toUpperCase(), 384, 84); x.fillStyle = '#fff1cf'; x.fillText(name.toUpperCase(), 384, 84);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      label = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, opacity: 0, sizeAttenuation: false }));
      label.center.set(0.5, -0.3); label.scale.set(0.13, 0.027, 1); label.position.copy(p).add(new THREE.Vector3(0, 0.1, 0)); label.renderOrder = 20; g.add(label);
    }
    cities.push({ name, pil, gl, label, arr: A.at(lon, lat) });
  }
  // the source light at Jerusalem
  const src = glowSprite(0xfff0c0, 0.22); src.position.copy(toXZ(35.23, 31.78, LAND_H + 0.06)); g.add(src);
  const src2 = glowSprite(0xffffff, 0.07); src2.position.copy(src.position); g.add(src2);
  g.U = U; g.cities = cities; g.src = [src, src2]; g.land = land; g.sea = seaMesh;
  g.set = (prog, t, all = 0, labelScale = 1) => {
    U.uProg.value = prog; U.uAll.value = all;
    for (const c of cities) {
      const since = prog - c.arr;
      const a = THREE.MathUtils.clamp(since / 0.03, 0, 1);
      const pop = since > 0 ? 1 + 1.2 * Math.exp(-since * 40) : 0;
      c.gl.material.opacity = a * (0.75 + 0.25 * Math.sin(t * 5 + c.arr * 30)); c.gl.scale.setScalar((c.label ? 0.32 : 0.18) * pop);
      c.pil.material.emissive = c.pil.material.emissive || new THREE.Color(); c.pil.material.emissive.setRGB(a * 1.0, a * 0.65, a * 0.2);
      if (c.label) { c.label.material.opacity = THREE.MathUtils.clamp((since - 0.01) / 0.05, 0, 1); c.label.scale.set(0.13 * labelScale, 0.027 * labelScale, 1); }
    }
  };
  g.set(-0.1, 0);
  return g;
}

// ---------- the globe ----------
function earthTexture() {
  const w = 2048, h = 1024;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const X = lon => (lon + 180) / 360 * w, Y = lat => (90 - lat) / 180 * h;
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#123c66'); g.addColorStop(0.5, '#1b5f98'); g.addColorStop(1, '#123c66');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  const ringPath = (R) => { x.beginPath(); for (let i = 0; i < R.length; i += 2) { const px = X(R[i] / 10), py = Y(R[i + 1] / 10); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); };
  x.save(); x.filter = 'blur(10px)'; x.strokeStyle = 'rgba(90,170,210,0.7)'; x.lineWidth = 14; WORLD.forEach(R => { ringPath(R); x.stroke(); }); x.restore();
  const lg = x.createLinearGradient(0, 0, 0, h);
  lg.addColorStop(0, '#e9eef0'); lg.addColorStop(0.12, '#c9d3c8'); lg.addColorStop(0.2, '#6f9a52'); lg.addColorStop(0.36, '#86a75a'); lg.addColorStop(0.42, '#cdb57a');
  lg.addColorStop(0.5, '#5f9a48'); lg.addColorStop(0.6, '#7aa34f'); lg.addColorStop(0.68, '#c9ad72'); lg.addColorStop(0.85, '#d9d2c4'); lg.addColorStop(1, '#f2f4f6');
  x.fillStyle = lg; WORLD.forEach(R => { ringPath(R); x.fill(); });
  const r = rng(3); for (let i = 0; i < 20000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'; x.fillRect(r() * w, r() * h, 3, 3); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  // land mask for sampling the lights
  const m = document.createElement('canvas'); m.width = 720; m.height = 360; const mx = m.getContext('2d');
  mx.fillStyle = '#000'; mx.fillRect(0, 0, 720, 360); mx.fillStyle = '#fff';
  WORLD.forEach(R => { mx.beginPath(); for (let i = 0; i < R.length; i += 2) { const px = (R[i] / 10 + 180) * 2, py = (90 - R[i + 1] / 10) * 2; i ? mx.lineTo(px, py) : mx.moveTo(px, py); } mx.closePath(); mx.fill(); });
  const md = mx.getImageData(0, 0, 720, 360).data;
  const isLand = (lon, lat) => { const px = Math.floor((lon + 180) * 2) % 720, py = Math.min(359, Math.max(0, Math.floor((90 - lat) * 2))); return md[(py * 720 + px) * 4] > 127; };
  return { t, isLand };
}
export const llToVec = (lon, lat, r = 1) => { const p = THREE.MathUtils.degToRad(lat), l = THREE.MathUtils.degToRad(lon); return new THREE.Vector3(r * Math.cos(p) * Math.cos(l), r * Math.sin(p), -r * Math.cos(p) * Math.sin(l)); };
// globe rotation.y that turns longitude `lon` toward +z (the camera)
export const faceLon = lon => THREE.MathUtils.degToRad(-90 - lon);
// regions [lonA, lonB, latA, latB, weight]: where most Christians and most Muslims live (rough, for the visual)
const CHRISTIAN = [[-125, -68, 26, 50, 3], [-110, -85, 14, 30, 1.6], [-90, -77, 8, 18, 0.6], [-80, -36, -35, 8, 3.4], [-73, -64, -40, -20, 0.7], [-10, 30, 37, 60, 3.2], [24, 50, 44, 60, 1.4],
  [9, 40, -30, 6, 2.8], [-10, 8, 4, 9, 1.0], [34, 42, 6, 14, 0.6], [119, 126, 7, 18, 1.0], [114, 153, -38, -18, 0.6], [172, 178, -46, -36, 0.1], [126, 129, 34, 38, 0.3], [-160, -150, 18, 22, 0.05]];
const MUSLIM = [[-10, 32, 22, 36, 1.8], [-15, 25, 10, 17, 1.2], [26, 60, 14, 41, 2.4], [50, 80, 36, 46, 0.8], [61, 77, 24, 37, 2.0], [88, 92, 21, 26, 1.4], [95, 120, -8, 6, 2.2], [40, 51, -2, 12, 0.5]];
export function globe({ R = 1, n1 = 1400, n2 = 1100 } = {}) {
  const g = new THREE.Group();
  const E = earthTexture();
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshStandardMaterial({ map: E.t, roughness: 0.75, metalness: 0.0 }));
  g.add(earth);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 64, 48), new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 3.0); gl_FragColor = vec4(vec3(0.35, 0.65, 1.0) * f * 1.6, f); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide, toneMapped: false,
  }));
  g.add(atm);
  const rim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.003, 64, 48), new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.2); gl_FragColor = vec4(vec3(0.45, 0.75, 1.0) * f * 0.9, f); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  g.add(rim);
  const r = rng(12);
  const sample = (regions, n) => {
    const tot = regions.reduce((a, q) => a + q[4], 0), out = [];
    let guard = 0;
    while (out.length < n && guard++ < n * 60) {
      let k = r() * tot, q = regions[0]; for (const reg of regions) { k -= reg[4]; if (k <= 0) { q = reg; break; } }
      const lon = q[0] + r() * (q[1] - q[0]), lat = q[2] + r() * (q[3] - q[2]);
      if (E.isLand(lon, lat)) out.push([lon, lat, r()]);
    }
    return out;
  };
  const mkPts = (list, col) => {
    const geo = new THREE.BufferGeometry(); const pos = new Float32Array(list.length * 3), c = new Float32Array(list.length * 3);
    list.forEach(([lo, la], i) => { const v = llToVec(lo, la, R * 1.004); pos.set([v.x, v.y, v.z], i * 3); });
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const m = new THREE.PointsMaterial({ size: 0.045, map: glowTexture(), vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
    const p = new THREE.Points(geo, m); p.frustumCulled = false; g.add(p);
    p.set = (k, t) => {
      for (let i = 0; i < list.length; i++) {
        const a = THREE.MathUtils.clamp((k * 1.25 - list[i][2]) / 0.25, 0, 1) * (0.8 + 0.2 * Math.sin(t * 6 + i));
        c[i * 3] = col[0] * a; c[i * 3 + 1] = col[1] * a; c[i * 3 + 2] = col[2] * a;
      }
      geo.attributes.color.needsUpdate = true;
    };
    p.set(0, 0);
    return p;
  };
  g.gold = mkPts(sample(CHRISTIAN, n1), [2.4, 1.6, 0.55]);
  g.green = mkPts(sample(MUSLIM, n2), [0.45, 2.2, 0.9]);
  g.earth = earth;
  return g;
}
