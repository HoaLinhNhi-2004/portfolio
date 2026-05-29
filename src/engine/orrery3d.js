/**
 * Sketchbook Orrery — 3D engine
 *
 * Builds the WebGL solar system (Three.js) with a cel-shaded graphite aesthetic
 * and exposes a clean API for the UI layer to drive it.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const INK = 0x2b2926;
const rand = (a, b) => a + Math.random() * (b - a);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Main planet definitions ───────────────────────────────────────────────
const PLANETS = [
  { id: 'about',    label: 'About',    short: '01', orbit: 120, size: 24, speed: 0.30,  incl:  0.10, axis: 0.4, color: 0xc8c2bc, ring: false },
  { id: 'quotes',   label: 'Words',    short: '02', orbit: 190, size: 19, speed: 0.22,  incl: -0.16, axis: 1.9, color: 0xcec8c0, ring: false },
  { id: 'projects', label: 'Workshop', short: '03', orbit: 272, size: 36, speed: 0.145, incl:  0.20, axis: 3.0, color: 0xbab4ac, ring: true  },
  { id: 'contact',  label: 'Signal',   short: '04', orbit: 350, size: 22, speed: 0.10,  incl: -0.07, axis: 4.6, color: 0xc8c2b8, ring: false },
];

// ─── Guestbook wishing star orbit ─────────────────────────────────────────
const STAR_ORBIT = { orbit: 160, speed: 0.23, incl: 0.42, axis: 0.9 };

// ─── Decorative minor planets (non-clickable) ──────────────────────────────
const MINOR_PLANETS = [
  { orbit: 152, size: 10, speed: 0.19,  incl:  0.35, axis: 1.5, color: 0xb4baa8 },
  { orbit: 226, size:  8, speed: 0.155, incl: -0.28, axis: 3.2, color: 0xbcb0aa },
  { orbit: 318, size: 13, speed: 0.12,  incl:  0.45, axis: 5.0, color: 0xa8b4c0 },
  { orbit: 400, size:  9, speed: 0.085, incl: -0.18, axis: 0.6, color: 0xc4bca8 },
];

// ─── Texture helpers ───────────────────────────────────────────────────────
function toonGradient(stops) {
  const c = document.createElement('canvas');
  c.width = stops.length; c.height = 1;
  const ctx = c.getContext('2d');
  stops.forEach((s, i) => { ctx.fillStyle = s; ctx.fillRect(i, 0, 1, 1); });
  const t = new THREE.CanvasTexture(c);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  return t;
}

function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0,    'rgba(43,41,38,1)');
  g.addColorStop(0.55, 'rgba(43,41,38,0.85)');
  g.addColorStop(1,    'rgba(43,41,38,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32, 32, 30, 0, 7); ctx.fill();
  return new THREE.CanvasTexture(c);
}

function sunRayTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d'); ctx.translate(128, 128);
  ctx.strokeStyle = '#2b2926'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r1 = 96, r2 = r1 + (i % 2 ? 30 : 18);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(c);
}

function guestbookStarTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d'); ctx.translate(64, 64);
  // Warm sanguine glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 56);
  glow.addColorStop(0, 'rgba(168,85,63,0.45)');
  glow.addColorStop(1, 'rgba(168,85,63,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 56, 0, 7); ctx.fill();
  // 8-ray sparkle (4 long + 4 short diagonals)
  ctx.strokeStyle = '#2b2926'; ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const r = i % 2 === 0 ? 48 : 26;
    ctx.lineWidth = i % 2 === 0 ? 3.5 : 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); ctx.stroke();
  }
  ctx.fillStyle = '#2b2926'; ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, 7); ctx.fill();
  return new THREE.CanvasTexture(c);
}

function ringTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d'); ctx.translate(64, 64);
  ctx.strokeStyle = '#a8553f'; ctx.lineWidth = 3; ctx.setLineDash([6, 8]);
  ctx.beginPath(); ctx.arc(0, 0, 56, 0, 7); ctx.stroke();
  return new THREE.CanvasTexture(c);
}

// ─── Geometry helpers ──────────────────────────────────────────────────────
// Lighter gradient — avoids the near-black shadow band
const GRAD = toonGradient(['#9a9690', '#b8b4ac', '#d2cec8', '#e8e4de']);
// Golden gradient for the sun
const SUN_GRAD = toonGradient(['#9a7010', '#c49020', '#ddb040', '#f2d060']);
const DOT  = dotTexture();

function celSphere(radius, colorHex, seg = 40, grad = GRAD) {
  const g   = new THREE.Group();
  const geo = new THREE.SphereGeometry(radius, seg, Math.round(seg * 0.8));
  const mesh = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: colorHex, gradientMap: grad }));
  const out  = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));
  out.scale.setScalar(1.05);
  g.add(out); g.add(mesh);
  g.userData.mesh = mesh;
  return g;
}

function orbitLine(radius, incl, axis) {
  const pts = Array.from({ length: 129 }, (_, i) => {
    const a = (i / 128) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  });
  const line = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineDashedMaterial({ color: 0x9a9484, dashSize: 3, gapSize: 9, transparent: true, opacity: 0.7 })
  );
  line.computeLineDistances();
  line.rotation.set(incl, axis, 0);
  return line;
}

// ─── UFO face expressions ──────────────────────────────────────────────────
const EYES = {
  curious: (ctx) => { dots(ctx, 3.6); brow(ctx); },
  happy:   (ctx) => { arcs(ctx, true); },
  tired:   (ctx) => { arcs(ctx, false); },
  calm:    (ctx) => { dots(ctx, 2.4); },
  inspired:(ctx) => { stars(ctx); },
};

function clearFace(ctx) {
  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = '#2b2926'; ctx.fillStyle = '#2b2926';
  ctx.lineWidth = 4; ctx.lineCap = 'round';
}
function dots(ctx, r)      { [44, 84].forEach(cx => { ctx.beginPath(); ctx.arc(cx, 60, r, 0, 7); ctx.fill(); }); }
function brow(ctx)         { ctx.beginPath(); ctx.moveTo(34, 42); ctx.quadraticCurveTo(44, 36, 54, 42); ctx.stroke(); }
function arcs(ctx, up)     { [44, 84].forEach(cx => { ctx.beginPath(); if (up) { ctx.moveTo(cx-9,64); ctx.quadraticCurveTo(cx,50,cx+9,64); } else { ctx.moveTo(cx-9,58); ctx.quadraticCurveTo(cx,70,cx+9,58); } ctx.stroke(); }); }
function stars(ctx)        { [44, 84].forEach(cx => { ctx.beginPath(); ctx.moveTo(cx-8,60); ctx.lineTo(cx+8,60); ctx.moveTo(cx,52); ctx.lineTo(cx,68); ctx.stroke(); }); }

// ─── Main factory ──────────────────────────────────────────────────────────
export function createOrrery() {
  const host      = document.getElementById('sky');
  const labelsBox = document.getElementById('labels');

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  host.appendChild(renderer.domElement);

  // Scene + camera
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.5, 6000);
  camera.position.set(0, 185, 360);

  // Controls (drag to orbit, scroll to zoom)
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, {
    enableDamping: true, dampingFactor: 0.08,
    enablePan: false, rotateSpeed: 0.62,
    zoomSpeed: 0.9, minDistance: 120, maxDistance: 1300,
  });
  controls.target.set(0, 0, 0);

  // Lights
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(1, 1.3, 0.7);
  scene.add(dir, new THREE.AmbientLight(0xffffff, 1.1));

  // ── Sun — warm golden with its own gradient ──
  const sun = celSphere(44, 0xd4a020, 48, SUN_GRAD);
  scene.add(sun);
  const sunSpot = new THREE.Mesh(
    new THREE.CircleGeometry(7, 24),
    new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.5 })
  );
  sun.add(sunSpot);
  const rays = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunRayTexture(), transparent: true, opacity: 0.92, depthWrite: false }));
  rays.scale.setScalar(150);
  scene.add(rays);

  // ── Main clickable planets ──
  const planetObjs = {};
  const clickable  = [];

  function buildPlanets() {
    PLANETS.forEach(p => {
      scene.add(orbitLine(p.orbit, p.incl, p.axis));

      const pivot = new THREE.Group();
      pivot.rotation.set(p.incl, p.axis, 0);
      scene.add(pivot);

      const holder = new THREE.Group();
      pivot.add(holder);

      const body = celSphere(p.size, p.color, 40);
      holder.add(body);
      body.userData.mesh.userData = { type: 'planet', id: p.id };
      clickable.push(body.userData.mesh);

      // small crater bump
      const crater = new THREE.Mesh(
        new THREE.SphereGeometry(p.size * 0.18, 12, 10),
        new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.4 })
      );
      crater.position.set(p.size * 0.5, p.size * 0.35, p.size * 0.6);
      body.add(crater);

      // Saturn-style ring for Workshop
      if (p.ring) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(p.size + 16, 1.6, 8, 80),
          new THREE.MeshBasicMaterial({ color: INK })
        );
        ring.rotation.x = Math.PI / 2 - 0.4;
        holder.add(ring);
      }

      // selection halo (sanguine dashed circle sprite)
      const sel = new THREE.Sprite(new THREE.SpriteMaterial({
        map: ringTexture(), color: 0xa8553f, transparent: true, opacity: 0, depthWrite: false,
      }));
      sel.scale.setScalar(p.size * 3.4);
      holder.add(sel);

      planetObjs[p.id] = { def: p, pivot, holder, body, sel, a: rand(0, 6.28) };

      // DOM label projected over the WebGL canvas
      const lab = document.createElement('button');
      lab.className = 'p3d-label';
      lab.dataset.id = p.id;
      lab.innerHTML = `<span class="nm">${p.label}</span>`;
      lab.addEventListener('click', e => { e.stopPropagation(); planetClickCb?.(p.id); });
      labelsBox.appendChild(lab);
      planetObjs[p.id].lab = lab;
    });
  }

  // ── Decorative minor planets ──
  const minorObjs = [];

  function buildMinorPlanets() {
    MINOR_PLANETS.forEach(p => {
      const pivot = new THREE.Group();
      pivot.rotation.set(p.incl, p.axis, 0);
      scene.add(pivot);

      const holder = new THREE.Group();
      pivot.add(holder);

      const body = celSphere(p.size, p.color, 28);
      holder.add(body);

      // tiny crater for detail
      const crater = new THREE.Mesh(
        new THREE.SphereGeometry(p.size * 0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.35 })
      );
      crater.position.set(p.size * 0.45, p.size * 0.4, p.size * 0.55);
      body.add(crater);

      minorObjs.push({ def: p, pivot, holder, body, a: rand(0, 6.28) });
    });
  }

  // ── Guestbook wishing star ──
  const starState = { a: rand(0, 6.28), pivot: null, holder: null, sprite: null, hitMesh: null, lab: null };

  function buildGuestbookStar() {
    scene.add(orbitLine(STAR_ORBIT.orbit, STAR_ORBIT.incl, STAR_ORBIT.axis));

    const pivot = new THREE.Group();
    pivot.rotation.set(STAR_ORBIT.incl, STAR_ORBIT.axis, 0);
    scene.add(pivot);

    const holder = new THREE.Group();
    pivot.add(holder);

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: guestbookStarTexture(), transparent: true, opacity: 0.9, depthWrite: false,
    }));
    sprite.scale.setScalar(22);
    holder.add(sprite);

    // Invisible sphere for raycasting
    const hitMesh = new THREE.Mesh(
      new THREE.SphereGeometry(12, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.userData = { type: 'guestbook' };
    holder.add(hitMesh);
    clickable.push(hitMesh);

    // DOM label
    const lab = document.createElement('button');
    lab.className = 'p3d-label star-label';
    lab.innerHTML = '<span class="nm">✦ Thoughts</span>';
    lab.addEventListener('click', e => { e.stopPropagation(); guestbookClickCb?.(); });
    labelsBox.appendChild(lab);

    Object.assign(starState, { pivot, holder, sprite, hitMesh, lab });
  }

  // ── Stars ──
  let starPoints = null;

  function buildStars() {
    if (starPoints) { scene.remove(starPoints); starPoints.geometry.dispose(); }
    const N   = Math.round(900 * state.density);
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = rand(650, 1900), th = rand(0, Math.PI * 2), ph = Math.acos(rand(-1, 1));
      pos[i*3]   = r * Math.sin(ph) * Math.cos(th);
      pos[i*3+1] = r * Math.cos(ph);
      pos[i*3+2] = r * Math.sin(ph) * Math.sin(th);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starPoints = new THREE.Points(geo, new THREE.PointsMaterial({
      color: INK, size: 5, map: DOT, transparent: true, opacity: 0.8,
      sizeAttenuation: true, depthWrite: false,
    }));
    scene.add(starPoints);
  }

  // ── Asteroids & space debris ──
  const asteroidGroups = [];

  function buildAsteroids() {
    asteroidGroups.forEach(g => scene.remove(g));
    asteroidGroups.length = 0;

    const matFill    = new THREE.MeshToonMaterial({ color: 0x948e84, gradientMap: GRAD });
    const matOutline = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });

    function makeRock(size) {
      const type = Math.floor(rand(0, 3));
      const geo  = type === 0 ? new THREE.OctahedronGeometry(size, 0)
                 : type === 1 ? new THREE.DodecahedronGeometry(size, 0)
                 :              new THREE.TetrahedronGeometry(size, 0);
      const g = new THREE.Group();
      const outline = new THREE.Mesh(geo, matOutline.clone());
      outline.scale.setScalar(1.1);
      g.add(outline);
      g.add(new THREE.Mesh(geo, matFill.clone()));
      g.rotation.set(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2));
      g.userData.rotSpeed = new THREE.Vector3(
        rand(-0.12, 0.12), rand(-0.18, 0.18), rand(-0.08, 0.08)
      );
      return g;
    }

    // Main asteroid belt — between Workshop (272) and Signal (350)
    const beltCount = Math.round(55 * state.density);
    for (let i = 0; i < beltCount; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(300, 342);
      const h = rand(-18, 18);
      const rock = makeRock(rand(1.8, 4.8));
      rock.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
      scene.add(rock);
      asteroidGroups.push(rock);
    }

    // Scattered debris across the system
    const debrisCount = Math.round(28 * state.density);
    for (let i = 0; i < debrisCount; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(90, 620);
      const h = rand(-80, 80);
      const rock = makeRock(rand(0.8, 2.2));
      rock.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
      scene.add(rock);
      asteroidGroups.push(rock);
    }

    // Dust ring (Points) inside the belt
    const dustN   = Math.round(200 * state.density);
    const dustPos = new Float32Array(dustN * 3);
    for (let i = 0; i < dustN; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(285, 358);
      dustPos[i*3]   = Math.cos(a) * r;
      dustPos[i*3+1] = rand(-12, 12);
      dustPos[i*3+2] = Math.sin(a) * r;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0x8a8478, size: 2.2, map: DOT,
      transparent: true, opacity: 0.55, sizeAttenuation: true, depthWrite: false,
    }));
    scene.add(dust);
    asteroidGroups.push(dust);
  }

  // ── Meteors ──
  const meteors = [];
  let meteorTimer = 3;

  function spawnMeteor() {
    const from = new THREE.Vector3(rand(-1,1), rand(-1,1), rand(-1,1)).normalize().multiplyScalar(rand(900,1500));
    const to   = from.clone().multiplyScalar(-1).add(new THREE.Vector3(rand(-300,300), rand(-300,300), rand(-300,300)));
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([from.clone(), from.clone()]),
      new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.85 })
    );
    scene.add(line);
    meteors.push({ line, from, to, t: 0, dur: rand(1.1, 2.0) });
  }

  // ── UFO ──
  const ufo     = new THREE.Group();
  const ufoBody = celSphere(18, 0xb4aea2, 36); ufoBody.scale.set(1, 0.34, 1); ufo.add(ufoBody);
  const dome    = celSphere(10, 0xc4bdad, 28); dome.scale.set(1, 0.8, 1); dome.position.y = 5.5; ufo.add(dome);

  const baseRing = new THREE.Mesh(
    new THREE.TorusGeometry(18, 1.4, 6, 48),
    new THREE.MeshBasicMaterial({ color: INK })
  );
  baseRing.rotation.x = Math.PI / 2; ufo.add(baseRing);

  for (let i = 0; i < 3; i++) {
    const a  = (i / 3) * Math.PI * 2;
    const lt = new THREE.Mesh(new THREE.SphereGeometry(1.7, 10, 8), new THREE.MeshBasicMaterial({ color: 0xa8553f }));
    lt.position.set(Math.cos(a) * 14, -3, Math.sin(a) * 14);
    ufo.add(lt);
  }

  const faceCanvas = document.createElement('canvas'); faceCanvas.width = faceCanvas.height = 128;
  const faceTex    = new THREE.CanvasTexture(faceCanvas);
  const face       = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, depthWrite: false, depthTest: false })
  );
  face.position.set(0, 5, 0); face.renderOrder = 5; ufo.add(face);

  ufoBody.userData.mesh.userData = { type: 'ufo' };
  dome.userData.mesh.userData    = { type: 'ufo' };
  clickable.push(ufoBody.userData.mesh, dome.userData.mesh);
  scene.add(ufo);

  // ── Internal state ──
  const state = {
    speedMult: 1, density: 1,
    ufoState: 'idle', ufoAng: 0,
    ufoPos:    new THREE.Vector3(0, 40, 120),
    ufoTarget: new THREE.Vector3(0, 40, 120),
    tween: null,
  };

  let planetClickCb    = null;
  let ufoClickCb       = null;
  let bgClickCb        = null;
  let guestbookClickCb = null;

  // ── Camera focus tween (ease-in-out-quad) ──
  function tweenTo(toTarget, toDist, dur = 0.9) {
    state.tween = {
      fromTarget: controls.target.clone(),
      toTarget,
      fromDist: camera.position.distanceTo(controls.target),
      toDist,
      t: 0, dur,
    };
  }

  // ── Click detection ──
  const tmp    = new THREE.Vector3();
  const occRay = new THREE.Raycaster();   // reused every frame for label occlusion
  let down  = null;

  renderer.domElement.addEventListener('pointerdown', e => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const dt    = performance.now() - down.t;
    down = null;
    if (moved > 7 || dt > 450) return;

    const ndc = new THREE.Vector2(
      (e.clientX / innerWidth)  *  2 - 1,
      (e.clientY / innerHeight) * -2 + 1
    );
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(clickable, false);
    if (hits.length) {
      const { type, id } = hits[0].object.userData;
      if (type === 'planet')    { planetClickCb?.(id); return; }
      if (type === 'ufo')       { ufoClickCb?.(); return; }
      if (type === 'guestbook') { guestbookClickCb?.(); return; }
    }
    bgClickCb?.();
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    if (preview) preview.resize();
  });

  // ── DOM label projection ──
  function updateLabel(id) {
    const o = planetObjs[id];
    if (document.body.classList.contains('panel-open')) {
      o.lab.style.opacity = 0; o.lab.style.pointerEvents = 'none'; return;
    }

    // Planet center in world space
    const center = new THREE.Vector3();
    o.holder.getWorldPosition(center);

    // 3D occlusion test — ray from camera toward planet center
    const selfMesh    = o.body.userData.mesh;
    const camToCenter = center.clone().sub(camera.position);
    const distCenter  = camToCenter.length();
    occRay.set(camera.position, camToCenter.normalize());
    // Test against sun + all other planet bodies
    const testList = [sun.userData.mesh].concat(
      clickable.filter(m => m.userData.type === 'planet' && m !== selfMesh)
    );
    const hits = occRay.intersectObjects(testList, false);
    if (hits.length && hits[0].distance < distCenter - o.def.size * 0.6) {
      o.lab.style.opacity = 0; o.lab.style.pointerEvents = 'none'; return;
    }

    // Project label anchor (just below planet equator)
    center.y -= o.def.size + 6;
    const v = center.project(camera);
    if (v.z > 1) { o.lab.style.opacity = 0; o.lab.style.pointerEvents = 'none'; return; }
    const x = (v.x * 0.5 + 0.5) * innerWidth;
    const y = (-v.y * 0.5 + 0.5) * innerHeight;
    o.lab.style.transform    = `translate(-50%,0) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    o.lab.style.opacity      = 1;
    o.lab.style.pointerEvents = 'auto';
  }

  // ── Planet preview mini-renderer ──
  let preview = null;

  function ensurePreview() {
    if (preview) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'planet-preview';
    Object.assign(canvas.style, {
      position: 'fixed', left: '0', top: '0',
      width: '50vw', height: '100vh',
      pointerEvents: 'none',
      zIndex: '5',
      opacity: '0',
      transition: 'opacity 0.55s ease',
    });
    document.body.appendChild(canvas);

    const pvRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    pvRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    pvRenderer.setClearColor(0x000000, 0);

    const pvScene  = new THREE.Scene();
    const pvCamera = new THREE.PerspectiveCamera(40, 1, 0.5, 2000);

    const pvDir = new THREE.DirectionalLight(0xffffff, 1.2);
    pvDir.position.set(1, 1.3, 0.7);
    pvScene.add(pvDir, new THREE.AmbientLight(0xffffff, 1.1));

    function resize() {
      const w = Math.floor(innerWidth * 0.5);
      const h = innerHeight;
      pvRenderer.setSize(w, h);
      pvCamera.aspect = w / h;
      pvCamera.updateProjectionMatrix();
    }
    resize();

    preview = { canvas, renderer: pvRenderer, scene: pvScene, camera: pvCamera, sphere: null, active: false, resize };
  }

  function showPlanetPreview(id) {
    const p = PLANETS.find(pl => pl.id === id); if (!p) return;
    ensurePreview();

    preview.active = false;
    if (preview.sphere) { preview.scene.remove(preview.sphere); preview.sphere = null; }

    const radius = Math.min(p.size * 2.2, 62);
    const sphere = celSphere(radius, p.color, 52, GRAD);
    sphere.rotation.x = 0.18;

    const crater = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.18, 12, 10),
      new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.4 })
    );
    crater.position.set(radius * 0.5, radius * 0.35, radius * 0.6);
    sphere.add(crater);

    if (p.ring) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius + 22, 2.5, 8, 80),
        new THREE.MeshBasicMaterial({ color: INK })
      );
      ring.rotation.x = Math.PI / 2 - 0.4;
      sphere.add(ring);
    }

    preview.scene.add(sphere);
    preview.sphere = sphere;
    preview.camera.position.set(0, 0, radius * 4);
    preview.camera.lookAt(0, 0, 0);
    preview.resize();
    preview.active = true;

    requestAnimationFrame(() => { preview.canvas.style.opacity = '1'; });
  }

  function hidePlanetPreview() {
    if (!preview) return;
    preview.canvas.style.opacity = '0';
    setTimeout(() => { if (preview) preview.active = false; }, 560);
  }

  // ── Star label projection ──
  function updateStarLabel() {
    const { lab, holder } = starState;
    if (!lab || !holder) return;
    if (document.body.classList.contains('panel-open')) {
      lab.style.opacity = 0; lab.style.pointerEvents = 'none'; return;
    }
    const pos = new THREE.Vector3();
    holder.getWorldPosition(pos);
    pos.y -= 16;
    const v = pos.project(camera);
    if (v.z > 1) { lab.style.opacity = 0; lab.style.pointerEvents = 'none'; return; }
    const x = (v.x * 0.5 + 0.5) * innerWidth;
    const y = (-v.y * 0.5 + 0.5) * innerHeight;
    lab.style.transform = `translate(-50%,0) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    lab.style.opacity = 1;
    lab.style.pointerEvents = 'auto';
  }

  // ── Animation loop ──
  let last = performance.now();

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;

    // Main planets revolve on tilted orbital planes
    PLANETS.forEach(p => {
      const o = planetObjs[p.id];
      if (!reduce) o.a += p.speed * state.speedMult * dt;
      o.holder.position.set(Math.cos(o.a) * p.orbit, 0, Math.sin(o.a) * p.orbit);
      o.body.rotation.y += dt * 0.3;
    });

    // Decorative minor planets
    minorObjs.forEach(o => {
      if (!reduce) o.a += o.def.speed * state.speedMult * dt;
      o.holder.position.set(Math.cos(o.a) * o.def.orbit, 0, Math.sin(o.a) * o.def.orbit);
      o.body.rotation.y += dt * 0.22;
    });

    // Guestbook wishing star — orbits + twinkles
    if (starState.holder) {
      if (!reduce) starState.a += STAR_ORBIT.speed * state.speedMult * dt;
      starState.holder.position.set(
        Math.cos(starState.a) * STAR_ORBIT.orbit, 0,
        Math.sin(starState.a) * STAR_ORBIT.orbit
      );
      const pulse = 0.60 + Math.sin(now * 0.0048) * 0.40;
      starState.sprite.material.opacity = pulse;
      starState.sprite.scale.setScalar(20 + Math.sin(now * 0.0031 + 1.2) * 6);
    }

    // Sun ray sprite slowly rotates
    rays.material.rotation += dt * 0.05;

    // Asteroids & debris tumble
    if (!reduce) {
      asteroidGroups.forEach(g => {
        if (g.userData.rotSpeed) {
          g.rotation.x += g.userData.rotSpeed.x * dt;
          g.rotation.y += g.userData.rotSpeed.y * dt;
          g.rotation.z += g.userData.rotSpeed.z * dt;
        }
      });
    }

    // UFO orbits the sun after onboarding
    if (state.ufoState === 'orbit' && !reduce) {
      state.ufoAng += 0.5 * state.speedMult * dt;
      state.ufoTarget.set(
        Math.cos(state.ufoAng) * 95,
        38 + Math.sin(state.ufoAng * 2) * 8,
        Math.sin(state.ufoAng) * 95
      );
    }
    state.ufoPos.lerp(state.ufoTarget, 0.06);
    const bob = Math.sin(now * 0.0022) * (state.ufoState === 'orbit' ? 3 : 6);
    ufo.position.set(state.ufoPos.x, state.ufoPos.y + bob, state.ufoPos.z);
    ufo.rotation.z = (state.ufoTarget.x - state.ufoPos.x) * 0.004;
    face.lookAt(camera.position);

    // Meteors
    if (!reduce) {
      meteorTimer -= dt;
      if (meteorTimer <= 0) { spawnMeteor(); meteorTimer = rand(2.5, 6) / state.density; }
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i]; m.t += dt / m.dur;
      const head = m.from.clone().lerp(m.to, m.t);
      const tail = m.from.clone().lerp(m.to, Math.max(0, m.t - 0.05));
      m.line.geometry.setFromPoints([tail, head]);
      m.line.material.opacity = (m.t < 0.2 ? m.t / 0.2 : 1 - (m.t - 0.2) / 0.8) * 0.85;
      if (m.t >= 1) { scene.remove(m.line); m.line.geometry.dispose(); meteors.splice(i, 1); }
    }

    // Smooth camera-focus tween
    if (state.tween) {
      const tw = state.tween; tw.t += dt / tw.dur;
      const k  = tw.t >= 1 ? 1 : (tw.t < 0.5 ? 2*tw.t*tw.t : 1 - Math.pow(-2*tw.t+2,2)/2);
      controls.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
      const d   = tw.fromDist + (tw.toDist - tw.fromDist) * k;
      const off = camera.position.clone().sub(controls.target).normalize().multiplyScalar(d);
      camera.position.copy(controls.target).add(off);
      if (tw.t >= 1) state.tween = null;
    }

    controls.update();
    renderer.render(scene, camera);

    // Preview planet spins in sync with the main loop
    if (preview?.active && preview.sphere) {
      preview.sphere.rotation.y += dt * 1.0;
      preview.renderer.render(preview.scene, preview.camera);
    }

    Object.keys(planetObjs).forEach(updateLabel);
    updateStarLabel();
    requestAnimationFrame(loop);
  }

  // ── Public API ──────────────────────────────────────────────────────────
  return {
    init() {
      buildPlanets();
      buildMinorPlanets();
      buildGuestbookStar();
      buildStars();
      buildAsteroids();
      requestAnimationFrame(loop);
    },

    onPlanetClick(cb)     { planetClickCb    = cb; },
    onUfoClick(cb)        { ufoClickCb        = cb; },
    onBackgroundClick(cb) { bgClickCb         = cb; },
    onGuestbookClick(cb)  { guestbookClickCb  = cb; },

    focusGuestbookStar() {
      if (!starState.holder) return;
      const pos = new THREE.Vector3();
      starState.holder.getWorldPosition(pos);
      tweenTo(pos.clone(), 200);
    },

    setUfoExpression(type) {
      const ctx = faceCanvas.getContext('2d');
      clearFace(ctx);
      (EYES[type] || EYES.curious)(ctx);
      faceTex.needsUpdate = true;
    },

    ufoOnboard() { state.ufoState = 'onboard'; state.ufoTarget.set(0, 36, 150); },
    ufoToOrbit() { state.ufoState = 'orbit'; },
    ufoToCenter(cb) {
      state.ufoState = 'center';
      const p = controls.target.clone().add(
        camera.position.clone().sub(controls.target).multiplyScalar(0.42)
      );
      state.ufoTarget.copy(p);
      setTimeout(() => cb?.(), 480);
    },

    focusPlanet(id) {
      const o = planetObjs[id]; if (!o) return;
      o.holder.getWorldPosition(tmp);
      tweenTo(tmp.clone(), Math.max(controls.minDistance + 10, o.def.size * 8 + 70));
    },
    resetZoom() { tweenTo(new THREE.Vector3(0, 0, 0), 470); },

    highlight(id) {
      Object.values(planetObjs).forEach(o => {
        o.sel.material.opacity = 0;
        o.lab.classList.remove('sel');
      });
      if (id && planetObjs[id]) {
        planetObjs[id].sel.material.opacity = 0.95;
        planetObjs[id].lab.classList.add('sel');
      }
    },

    showPlanetPreview(id) { showPlanetPreview(id); },
    hidePlanetPreview()   { hidePlanetPreview(); },

    setPlanetSpeed(m) { state.speedMult = m; },
    setDensity(m)     { state.density = m; buildStars(); buildAsteroids(); },
  };
}
