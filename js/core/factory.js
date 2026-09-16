// =============================================================================
//  factory.js — costruttori di oggetti Three.js riutilizzati da tutti i livelli:
//  materiali a punti, marcatori, orbite, galassie procedurali, cielo stellato,
//  pianeti, anelli, rete cosmica.
// =============================================================================
window.U = window.U || {};
(function (U) {
  'use strict';
  const C = U.C, D = C.DEG;

  // Uniform condivise, aggiornate ogni frame dall'engine
  U.G = {
    uScale: { value: 1000 },      // altezza_viewport / (2 tan(fov/2))
    uPixelRatio: { value: 1 },
    uTime: { value: 0 },
    uNearFade: { value: 0 },      // distanza sotto la quale le particelle svaniscono
  };
  // Moltiplicatore numero di particelle (impostato da engine in base alla GPU)
  U.QUALITY = 1;
  U.q = (n) => (n > 0 ? Math.max(1, Math.round(n * U.QUALITY)) : 0);

  // --- Materiali a punti -------------------------------------------------------
  U.pointsMaterial = function (o) {
    o = o || {};
    return new THREE.ShaderMaterial({
      uniforms: {
        uScale: U.G.uScale, uPixelRatio: U.G.uPixelRatio,
        uNearFade: o.nearFade ? U.G.uNearFade : { value: 0 },
        uMinPx: { value: o.minPx != null ? o.minPx : 1.2 },
        uMaxPx: { value: o.maxPx != null ? o.maxPx : 24 },
        uIntensity: { value: o.intensity != null ? o.intensity : 1 },
        uFalloff: { value: o.falloff != null ? o.falloff : 1 },
        uMode: { value: o.mode === 'px' ? 1 : 0 },
        uCore: { value: o.core != null ? o.core : 3.5 },
      },
      vertexShader: U.SH.pointsVert,
      fragmentShader: U.SH.pointsFrag,
      transparent: true,
      depthWrite: false,
      blending: o.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
  };

  // Accumulatore di punti
  U.PointBuilder = class {
    constructor() { this.p = []; this.c = []; this.s = []; }
    push(x, y, z, r, g, b, size) { this.p.push(x, y, z); this.c.push(r, g, b); this.s.push(size); }
    get count() { return this.s.length; }
    build(matOpts) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.setAttribute('size', new THREE.Float32BufferAttribute(this.s, 1));
      const pts = new THREE.Points(g, U.pointsMaterial(matOpts));
      pts.frustumCulled = false;
      return pts;
    }
  };

  // --- Marcatore (dimensione in pixel costante) -------------------------------
  U.makeMarker = function (color, px, halo, opacity) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) }, uPx: { value: px || 10 }, uPixelRatio: U.G.uPixelRatio,
        uOpacity: { value: opacity != null ? opacity : 1 }, uHalo: { value: halo != null ? halo : 0.6 },
      },
      vertexShader: U.SH.markerVert, fragmentShader: U.SH.markerFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    p.renderOrder = 5;
    return p;
  };

  // --- Linee ------------------------------------------------------------------
  // pts: array di [x,y,z] nel frame astronomico (verranno convertiti in THREE)
  U.makeLine = function (pts, color, opacity, closed, scale) {
    const arr = [];
    const s = scale || 1;
    for (const p of pts) arr.push(p[0] * s, p[2] * s, -p[1] * s);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: opacity != null ? opacity : 0.5, depthWrite: false });
    const l = closed ? new THREE.LineLoop(g, m) : new THREE.Line(g, m);
    l.frustumCulled = false;
    return l;
  };
  // punti già in coordinate THREE (Vector3)
  U.makeLineV = function (vecs, color, opacity, dashed) {
    const g = new THREE.BufferGeometry().setFromPoints(vecs);
    const m = dashed
      ? new THREE.LineDashedMaterial({ color, transparent: true, opacity: opacity != null ? opacity : 0.5, dashSize: dashed, gapSize: dashed, depthWrite: false })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity: opacity != null ? opacity : 0.5, depthWrite: false });
    const l = new THREE.Line(g, m);
    if (dashed) l.computeLineDistances();
    l.frustumCulled = false;
    return l;
  };
  // cerchio nel piano XZ
  U.makeCircle = function (r, color, opacity, seg, dashed) {
    const v = [];
    seg = seg || 128;
    for (let k = 0; k <= seg; k++) { const t = (k / seg) * Math.PI * 2; v.push(new THREE.Vector3(r * Math.cos(t), 0, r * Math.sin(t))); }
    return U.makeLineV(v, color, opacity, dashed);
  };
  // sfera "a filo": tre cerchi massimi + paralleli
  U.makeWireSphere = function (r, color, opacity) {
    const g = new THREE.Group();
    const a = U.makeCircle(r, color, opacity, 180); g.add(a);
    const b = U.makeCircle(r, color, opacity * 0.7, 180); b.rotation.x = Math.PI / 2; g.add(b);
    const c = U.makeCircle(r, color, opacity * 0.7, 180); c.rotation.z = Math.PI / 2; g.add(c);
    for (const lat of [-60, -30, 30, 60]) {
      const cc = U.makeCircle(r * Math.cos(lat * D), color, opacity * 0.35, 128);
      cc.position.y = r * Math.sin(lat * D); g.add(cc);
    }
    return g;
  };

  // --- Galassia procedurale a particelle --------------------------------------
  // Frame locale: disco nel piano XZ, Y = polo nord galattico.
  // Convenzione bracci (Reid et al. 2014): ln(R/Rref) = -(β-βref) tanψ,
  // posizione = (-R cosβ, z, -R sinβ): β=0 verso il Sole (per la Via Lattea).
  U.makeGalaxy = function (P) {
    const r = U.rng(P.seed || 1);
    const stars = new U.PointBuilder(), dust = new U.PointBuilder(), hii = new U.PointBuilder();
    const col = Object.assign({
      old: [1.0, 0.82, 0.58], disk: [1.0, 0.93, 0.84], young: [0.62, 0.76, 1.0], hii: [1.0, 0.36, 0.55], dust: [0.05, 0.035, 0.03],
    }, P.colors || {});
    const S = P.size || 0.08;
    const jitterCol = (c, amt) => [c[0] * (1 - amt * r()), c[1] * (1 - amt * r()), c[2] * (1 - amt * r())];

    // Disco esponenziale (sottile + spesso)
    const nDisk = U.q(P.nDisk || 0);
    for (let k = 0; k < nDisk; k++) {
      const R = -P.Rd * Math.log(r() * r() + 1e-9);
      if (R > P.Rmax) { k--; continue; }
      const th = r() * Math.PI * 2;
      const thick = r() < 0.12;
      const z = r.laplace(thick ? P.hz * 3 : P.hz);
      const c = jitterCol(R < P.Rd * 0.8 ? col.old : col.disk, 0.25);
      const b = 0.35 + 0.65 * r();
      stars.push(-R * Math.cos(th), z, -R * Math.sin(th), c[0] * b, c[1] * b, c[2] * b, S * (0.6 + r() * 0.8));
    }

    // Bracci a spirale
    const arms = P.arms || [];
    const nArm = U.q(P.nArm || 0);
    const armLens = arms.map((a) => Math.abs(a.bmax - a.bmin));
    const totLen = armLens.reduce((x, y) => x + y, 0) || 1;
    const armPoint = (a) => {
      for (let tries = 0; tries < 50; tries++) {
        const beta = (a.bmin + r() * (a.bmax - a.bmin)) * D;
        const R = a.Rref * Math.exp(-(beta - a.bref * D) * Math.tan(a.pitch * D));
        if (R < (P.armRin || P.Rin || 2.5) || R > P.Rmax) continue;
        const w = (a.w || 0.3) * (0.6 + 0.4 * R / 8) * (P.armWidth || 1);
        // densità lungo il braccio ∝ R² e^(−R/L): massimo a R = 2L, bracci deboli verso il centro
        const L = P.armScale || P.Rd * 1.4;
        const acc = (R * R * Math.exp(-R / L)) / (4 * L * L * Math.exp(-2));
        if (r() > acc * (a.strength || 1)) continue;
        return { beta, R, w };
      }
      return null;
    };
    for (let k = 0; k < nArm; k++) {
      let pick = r() * totLen, ai = 0;
      while (ai < arms.length - 1 && pick > armLens[ai]) { pick -= armLens[ai]; ai++; }
      const a = arms[ai];
      const q = armPoint(a); if (!q) continue;
      const broad = r() < 0.35 ? 2.4 : 1;
      const dr = r.gauss() * q.w * broad, dt = r.gauss() * q.w * 0.6 * broad;
      const R = q.R + dr, th = q.beta + dt / q.R;
      const z = r.laplace(P.hz * 0.5);
      const young = r() < 0.55;
      const c = jitterCol(young ? col.young : col.disk, 0.2);
      const b = 0.4 + 0.6 * r();
      stars.push(-R * Math.cos(th), z, -R * Math.sin(th), c[0] * b, c[1] * b, c[2] * b, S * (young ? 0.7 + r() : 0.6 + r() * 0.6));
      // polveri sul bordo interno del braccio
      if (P.nDust && r() < P.dustPerArm) {
        const Rd2 = q.R - q.w * 0.9 + r.gauss() * q.w * 0.35;
        const th2 = q.beta + r.gauss() * 0.02;
        dust.push(-Rd2 * Math.cos(th2), r.laplace(P.hz * 0.35), -Rd2 * Math.sin(th2), col.dust[0], col.dust[1], col.dust[2], S * 4.5);
      }
      // regioni HII (nodi rosa)
      if (P.hiiRate && r() < P.hiiRate) {
        const n = 6 + Math.floor(r() * 18);
        const cx = -R * Math.cos(th), cz = -R * Math.sin(th);
        for (let j = 0; j < n; j++) hii.push(cx + r.gauss() * 0.06, z * 0.5 + r.gauss() * 0.02, cz + r.gauss() * 0.06, col.hii[0], col.hii[1], col.hii[2], S * (0.5 + r()));
      }
    }

    // Anello (es. anello di formazione stellare di M31 a ~10 kpc)
    if (P.ring) {
      const n = U.q(P.ring.n);
      for (let k = 0; k < n; k++) {
        const th = r() * Math.PI * 2, R = P.ring.R + r.gauss() * P.ring.w;
        const c = jitterCol(col.young, 0.2), b = 0.4 + 0.6 * r();
        stars.push(-R * Math.cos(th), r.laplace(P.hz * 0.5), -R * Math.sin(th), c[0] * b, c[1] * b, c[2] * b, S);
        if (r() < 0.25) dust.push(-(R - 0.3) * Math.cos(th), r.laplace(P.hz * 0.3), -(R - 0.3) * Math.sin(th), col.dust[0], col.dust[1], col.dust[2], S * 5);
      }
    }

    // Bulge triassiale + barra
    const nBulge = U.q(P.nBulge || 0);
    for (let k = 0; k < nBulge; k++) {
      const v = r.unitVec(), rr = -P.bulgeR * Math.log(r() + 1e-9) * 0.7;
      const c = jitterCol(col.old, 0.2), b = 0.5 + 0.5 * r();
      stars.push(v[0] * rr, v[2] * rr * (P.bulgeFlat || 0.7), v[1] * rr, c[0] * b, c[1] * b, c[2] * b, S * (0.7 + r() * 0.6));
    }
    if (P.bar) {
      const nBar = U.q(P.bar.n);
      const ca = Math.cos(P.bar.angle * D), sa = Math.sin(P.bar.angle * D);
      for (let k = 0; k < nBar; k++) {
        let x = r.gauss() * P.bar.len * 0.42; if (Math.abs(x) > P.bar.len) { k--; continue; }
        const y = r.gauss() * P.bar.width * (1 - 0.5 * Math.abs(x) / P.bar.len);
        const z = r.gauss() * P.bar.height * (1 - 0.3 * Math.abs(x) / P.bar.len);
        // asse maggiore (THREE): estremo vicino verso (-cosφ, 0, -sinφ), cioè longitudini l > 0
        const X = -x * ca + y * sa, Z = -x * sa - y * ca;
        const c = jitterCol(col.old, 0.2), b = 0.5 + 0.5 * r();
        stars.push(X, z, Z, c[0] * b, c[1] * b, c[2] * b, S * (0.7 + r() * 0.6));
      }
    }

    // Galassia irregolare / nana: grumi gaussiani
    if (P.clumps) {
      for (const cl of P.clumps) {
        const n = U.q(cl.n);
        for (let k = 0; k < n; k++) {
          const c = jitterCol(cl.color || col.disk, 0.25), b = 0.35 + 0.65 * r();
          stars.push(cl.x + r.gauss() * cl.sx, cl.y + r.gauss() * cl.sy, cl.z + r.gauss() * cl.sz, c[0] * b, c[1] * b, c[2] * b, S * (0.6 + r() * 0.8));
        }
      }
    }
    // Sfera di Plummer (nane sferoidali, ammassi globulari)
    if (P.plummer) {
      const n = U.q(P.plummer.n), a = P.plummer.a;
      for (let k = 0; k < n; k++) {
        const u = Math.max(r(), 1e-4);
        const rr = Math.min(a / Math.sqrt(Math.pow(u, -2 / 3) - 1), a * 8);
        const v = r.unitVec();
        const c = jitterCol(col.old, 0.25), b = 0.35 + 0.65 * r();
        stars.push(v[0] * rr, v[2] * rr * (P.plummer.flat || 1), v[1] * rr, c[0] * b, c[1] * b, c[2] * b, S * (0.6 + r() * 0.8));
      }
    }
    // Alone stellare (legge di potenza ~ r^-3.5)
    const nHalo = U.q(P.nHalo || 0);
    for (let k = 0; k < nHalo; k++) {
      const rr = (P.haloR || 20) * Math.pow(r(), 2.2) + 1;
      const v = r.unitVec();
      const c = jitterCol(col.old, 0.3), b = 0.3 + 0.4 * r();
      stars.push(v[0] * rr, v[2] * rr * 0.8, v[1] * rr, c[0] * b, c[1] * b, c[2] * b, S * 0.7);
    }
    // Polveri diffuse nel disco
    const nDust = U.q(P.nDust || 0);
    for (let k = 0; k < nDust; k++) {
      const R = -P.Rd * 1.2 * Math.log(r() * r() + 1e-9);
      if (R > P.Rmax * 0.8 || R < (P.Rin || 2.5) * 0.8) continue;
      const th = r() * Math.PI * 2;
      dust.push(-R * Math.cos(th), r.laplace(P.hz * 0.3), -R * Math.sin(th), col.dust[0], col.dust[1], col.dust[2], S * 5);
    }

    const g = new THREE.Group();
    const I = P.intensity || 1;
    if (stars.count) { const s = stars.build({ intensity: 0.55 * I, minPx: P.minPx || 1.0, maxPx: P.maxPx || 5, falloff: 1.4, nearFade: P.nearFade }); g.add(s); g.userData.stars = s; }
    if (hii.count) { const h = hii.build({ intensity: 0.5 * I, minPx: 0.8, maxPx: 5, falloff: 1.6, nearFade: P.nearFade }); g.add(h); }
    if (dust.count) { const d = dust.build({ blending: 'normal', intensity: P.dustOpacity || 0.12, minPx: 1.5, maxPx: 40, falloff: 1.2, core: 2.0, nearFade: P.nearFade }); d.renderOrder = 2; g.add(d); }
    return g;
  };

  // Orientamento di un disco galattico osservato: inclinazione i e angolo di posizione PA
  // (misurato da Nord verso Est) + coordinate RA/Dec -> quaternione nel frame galattico THREE.
  U.diskQuaternion = function (raDeg, decDeg, incDeg, paDeg, flip) {
    const los = U.eqUnit(raDeg, decDeg);                                   // verso la galassia
    const north = [-Math.sin(decDeg * D) * Math.cos(raDeg * D), -Math.sin(decDeg * D) * Math.sin(raDeg * D), Math.cos(decDeg * D)];
    const east = [-Math.sin(raDeg * D), Math.cos(raDeg * D), 0];
    const pa = paDeg * D, inc = incDeg * D;
    const major = [0, 1, 2].map((k) => Math.cos(pa) * north[k] + Math.sin(pa) * east[k]);
    const minor = [0, 1, 2].map((k) => -Math.sin(pa) * north[k] + Math.cos(pa) * east[k]);
    const s = flip ? -1 : 1;
    const normal = [0, 1, 2].map((k) => -Math.cos(inc) * los[k] + s * Math.sin(inc) * minor[k]);
    const nG = U.toThree(U.eqToGalUnit(normal)).normalize();
    const mG = U.toThree(U.eqToGalUnit(major)).normalize();
    const zAxis = new THREE.Vector3().crossVectors(mG, nG).normalize();
    const m = new THREE.Matrix4().makeBasis(mG, nG, zAxis);
    return new THREE.Quaternion().setFromRotationMatrix(m);
  };

  // --- Cielo stellato di sfondo (frame galattico THREE, raggio 1000) ---------
  U.makeSky = function (opts) {
    opts = opts || {};
    const r = U.rng(opts.seed || 7);
    const pos = [], colr = [], size = [];
    const push = (l, b, sz, c) => {
      const v = U.galVec(l, b, 1000);
      pos.push(v.x, v.y, v.z); colr.push(c.r, c.g, c.b); size.push(sz);
    };
    const nStars = U.q(9000);
    for (let k = 0; k < nStars; k++) {
      let l, b;
      if (r() < 0.45) { const v = r.unitVec(); l = Math.atan2(v[1], v[0]) / D; b = Math.asin(v[2]) / D; }
      else {
        l = r() * 360;
        const lw = ((l + 180) % 360) - 180;
        if (r() > 0.35 + 0.65 * Math.exp(-(lw * lw) / (2 * 55 * 55))) { k--; continue; }
        b = r.laplace(5 + 4 * r());
      }
      const mag = Math.pow(r(), 3.5);
      const c = U.bbColor(3200 + Math.pow(r(), 1.5) * 12000).multiplyScalar(0.35 + mag * 0.9);
      push(l, b, 0.9 + mag * 2.4, c);
    }
    // bagliore diffuso della Via Lattea con fenditure di polvere
    const nGlow = U.q(26000);
    for (let k = 0; k < nGlow; k++) {
      const l = r() * 360, lw = ((l + 180) % 360) - 180;
      if (r() > 0.25 + 0.75 * Math.exp(-(lw * lw) / (2 * 40 * 40))) { k--; continue; }
      const b = r.gauss() * (3 + 5 * Math.exp(-(lw * lw) / (2 * 25 * 25)));
      const n = U.noise3(l * 0.08, b * 0.3, 0.5);
      if (Math.abs(b) < 3 && n > 0.15 && Math.abs(lw) < 70) continue; // Grande Fenditura (indicativa)
      const warm = Math.exp(-(lw * lw) / (2 * 30 * 30));
      const c = new THREE.Color(0.55 + 0.35 * warm, 0.55 + 0.2 * warm, 0.62).multiplyScalar(0.10 + 0.08 * r());
      push(l, b, 1.6 + r() * 2.2, c);
    }
    // stelle brillanti reali
    for (const s of U.BRIGHT || []) {
      if (opts.skipNear && s.near) continue;
      const g = U.eqToGal(U.ra(s.ra), U.dec(s.dec));
      const c = U.bbColor(U.spectralTemp(s.sp)).multiplyScalar(U.clamp(1.25 - s.mag * 0.18, 0.55, 1.3));
      push(g.l, g.b, U.clamp(4.6 - s.mag * 0.9, 1.8, 6.5), c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(size, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: U.G.uPixelRatio }, vertexShader: U.SH.skyVert, fragmentShader: U.SH.skyFrag,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    const group = new THREE.Group();
    group.add(pts);
    // linee delle costellazioni
    if (U.CONSTELLATIONS) {
      const byName = {}; for (const s of U.BRIGHT) byName[s.name] = s;
      const arr = [];
      for (const [a, b] of U.CONSTELLATIONS) {
        const A = byName[a], B = byName[b]; if (!A || !B) continue;
        const ga = U.eqToGal(U.ra(A.ra), U.dec(A.dec)), gb = U.eqToGal(U.ra(B.ra), U.dec(B.dec));
        const va = U.galVec(ga.l, ga.b, 990), vb = U.galVec(gb.l, gb.b, 990);
        arr.push(va.x, va.y, va.z, vb.x, vb.y, vb.z);
      }
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x6f8fb8, transparent: true, opacity: 0.13, depthTest: false, depthWrite: false }));
      lines.frustumCulled = false;
      group.add(lines);
      group.userData.constellations = lines;
    }
    return group;
  };

  // --- Pianeti ----------------------------------------------------------------
  let _texCache = null;
  U.planetTextures = function () {
    if (_texCache) return _texCache;
    const load = (src) => {
      const t = new THREE.TextureLoader().load(src);
      t.anisotropy = 8;
      return t;
    };
    const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    blank.needsUpdate = true;
    _texCache = {
      day: U.TEX && U.TEX.earthDay ? load(U.TEX.earthDay) : blank,
      night: U.TEX && U.TEX.earthNight ? load(U.TEX.earthNight) : blank,
      blank,
    };
    return _texCache;
  };
  U.planetMaterial = function (look) {
    const tex = U.planetTextures();
    const c = (x) => new THREE.Color(x || '#888888');
    return new THREE.ShaderMaterial({
      uniforms: {
        uType: { value: look.type || 0 }, uC1: { value: c(look.c1) }, uC2: { value: c(look.c2) }, uC3: { value: c(look.c3) },
        uSeed: { value: look.seed || 0 }, uSunDir: { value: new THREE.Vector3(1, 0, 0) }, uTime: U.G.uTime,
        uAmbient: { value: look.ambient != null ? look.ambient : 0.035 },
        uDay: { value: look.type === 2 ? tex.day : tex.blank }, uNight: { value: look.type === 2 ? tex.night : tex.blank }, uHasTex: { value: look.type === 2 ? 1 : 0 },
      },
      vertexShader: U.SH.planetVert, fragmentShader: U.SH.planetFrag,
    });
  };
  U.atmoMaterial = function (color, strength) {
    return new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uSunDir: { value: new THREE.Vector3(1, 0, 0) }, uStrength: { value: strength || 1 } },
      vertexShader: U.SH.atmoVert, fragmentShader: U.SH.atmoFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
  };
  U.sunMaterial = function (c1, c2) {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: U.G.uTime, uC1: { value: new THREE.Color(c1 || '#fff4d6') }, uC2: { value: new THREE.Color(c2 || '#ff9a3c') } },
      vertexShader: U.SH.planetVert, fragmentShader: U.SH.sunFrag,
    });
  };
  U.ringMaterial = function (kind, color, R) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uRing: { value: kind }, uColor: { value: new THREE.Color(color) }, uSunDir: { value: new THREE.Vector3(1, 0, 0) },
        uCenter: { value: new THREE.Vector3() }, uR: { value: R },
      },
      vertexShader: U.SH.ringVert, fragmentShader: U.SH.ringFrag,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      extensions: { derivatives: true },
    });
  };
  // Orientamento del corpo: polo (RA/Dec) e meridiano W [deg] -> quaternione nel frame eclittica-THREE
  U.bodyQuaternion = function (poleRA, poleDec, Wdeg, earthGMST) {
    const P = U.eqUnit(poleRA, poleDec);
    let X;
    if (earthGMST != null) {
      X = [Math.cos(earthGMST * D), Math.sin(earthGMST * D), 0];
    } else {
      // nodo ascendente dell'equatore del pianeta sull'equatore ICRF: Q = z × P
      let Q = [-P[1], P[0], 0];
      const nq = Math.hypot(Q[0], Q[1]) || 1; Q = [Q[0] / nq, Q[1] / nq, 0];
      const PxQ = [P[1] * Q[2] - P[2] * Q[1], P[2] * Q[0] - P[0] * Q[2], P[0] * Q[1] - P[1] * Q[0]];
      const w = Wdeg * D;
      X = [0, 1, 2].map((k) => Q[k] * Math.cos(w) + PxQ[k] * Math.sin(w));
    }
    const xT = U.toThree(U.eqToEcl(X)).normalize();
    const yT = U.toThree(U.eqToEcl(P)).normalize();
    const zT = new THREE.Vector3().crossVectors(xT, yT).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xT, yT, zT));
  };

  // --- Rete cosmica (nodi reali + casuali, filamenti tra vicini) --------------
  // opts: {seed, R, nodes:[{p:Vector3, w}], nRandom, N, width, voids:[{p,r}], colorAt(p)->[r,g,b], size}
  U.makeCosmicWeb = function (o) {
    const r = U.rng(o.seed || 3);
    const nodes = (o.nodes || []).map((n) => ({ p: n.p.clone(), w: n.w || 1 }));
    const nRand = o.nRandom || 400;
    for (let k = 0; k < nRand; k++) {
      const v = r.unitVec(), rr = o.R * Math.cbrt(r());
      const p = new THREE.Vector3(v[0] * rr, v[2] * rr, v[1] * rr);
      if (o.flatten) p.addScaledVector(o.flatten.normal, -p.dot(o.flatten.normal) * o.flatten.k * Math.exp(-p.length() / o.flatten.scale));
      let inVoid = false;
      for (const vd of o.voids || []) if (p.distanceTo(vd.p) < vd.r * 0.9) inVoid = true;
      if (!inVoid) nodes.push({ p, w: 0.3 + Math.pow(r(), 3) * 1.5 });
    }
    // archi verso i 3 vicini più prossimi
    const edges = [];
    const seen = new Set();
    for (let i = 0; i < nodes.length; i++) {
      const best = [];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const d = nodes[i].p.distanceToSquared(nodes[j].p);
        if (best.length < 3) { best.push([d, j]); best.sort((a, b) => a[0] - b[0]); }
        else if (d < best[2][0]) { best[2] = [d, j]; best.sort((a, b) => a[0] - b[0]); }
      }
      for (const [d, j] of best) {
        const key = i < j ? i + '_' + j : j + '_' + i;
        if (seen.has(key)) continue; seen.add(key);
        edges.push({ a: i, b: j, len: Math.sqrt(d) });
      }
    }
    const pb = new U.PointBuilder();
    const N = U.q(o.N || 50000);
    const tmp = new THREE.Vector3();
    const wsum = edges.reduce((s, e) => s + (nodes[e.a].w + nodes[e.b].w) / Math.sqrt(e.len + 1), 0);
    const cum = []; let acc = 0;
    for (const e of edges) { acc += (nodes[e.a].w + nodes[e.b].w) / Math.sqrt(e.len + 1) / wsum; cum.push(acc); }
    const pickEdge = () => { const u = r(); let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < u) lo = m + 1; else hi = m; } return edges[lo]; };
    let placed = 0, guard = 0;
    while (placed < N && guard++ < N * 4) {
      const t = r();
      if (t < 0.3) { // ammasso sul nodo
        const n = nodes[Math.floor(r() * nodes.length)];
        const s = o.width * 1.3 * n.w;
        tmp.set(n.p.x + r.gauss() * s, n.p.y + r.gauss() * s, n.p.z + r.gauss() * s);
      } else if (t < 0.9) { // filamento
        const e = pickEdge(); const u = r();
        const A = nodes[e.a].p, B = nodes[e.b].p;
        const w = o.width * (0.35 + 0.65 * Math.sin(Math.PI * u) * 0.8 + 0.2);
        tmp.lerpVectors(A, B, u);
        tmp.x += r.gauss() * w; tmp.y += r.gauss() * w; tmp.z += r.gauss() * w;
      } else { // campo
        const v = r.unitVec(), rr = o.R * Math.cbrt(r());
        tmp.set(v[0] * rr, v[2] * rr, v[1] * rr);
      }
      if (tmp.length() > o.R) continue;
      let skip = false;
      for (const vd of o.voids || []) { const dd = tmp.distanceTo(vd.p); if (dd < vd.r && r() > Math.pow(dd / vd.r, 6)) { skip = true; break; } }
      if (skip) continue;
      const c = o.colorAt ? o.colorAt(tmp, r) : [0.9, 0.85, 0.8];
      pb.push(tmp.x, tmp.y, tmp.z, c[0], c[1], c[2], (o.size || 1) * (0.5 + r()));
      placed++;
    }
    return { points: pb.build({ intensity: o.intensity || 0.6, minPx: o.minPx || 1.0, maxPx: o.maxPx || 6, falloff: o.falloff || 1.2, nearFade: true }), nodes, edges };
  };
})(window.U);
