// =============================================================================
//  Livello: Sistema solare (unità: UA, frame eclittico J2000)
//  + famiglia "planet:<id>" (unità: km) con lune da elementi medi JPL.
// =============================================================================
(function (U) {
  'use strict';
  const C = U.C, D = C.DEG;
  let eclQuat = null;

  function planetData(key) {
    return U.SOLAR.planets.find((x) => x.id === key) || (key === 'plutone' ? U.SOLAR.pluto : null);
  }
  function planetLevelMax(key) {
    const p = planetData(key);
    const moons = U.SOLAR.moons[key] || [];
    let maxA = 0;
    for (const m of moons) if (!m.far) maxA = Math.max(maxA, m.a);
    return Math.max(p.R_km * 80, maxA * 3.2);
  }
  U.planetLevelMax = planetLevelMax;

  // Elementi di un corpo con nome: JPL SBDB (U.GEN.named) riportati all'epoca J2000
  function namedElements(id) {
    const g = U.GEN && U.GEN.named && U.GEN.named[id];
    if (!g) return null;
    const n = U.meanMotion(g.a);
    const el = { a: g.a, e: g.e, i: g.i, node: g.node, peri: g.peri, epoch: C.J2000, n };
    if (g.M != null) el.M0 = g.M - n * (g.epoch - C.J2000);
    else if (g.tp != null) el.M0 = n * (C.J2000 - g.tp);
    else el.M0 = 0;
    return el;
  }

  // Popolazione kepleriana animata nel vertex shader
  function makeBeltGeometry(n, fill) {
    const aOrb = new Float32Array(n * 3), aAng = new Float32Array(n * 3), size = new Float32Array(n), color = new Float32Array(n * 3);
    let k = 0;
    fill((a, e, i, node, peri, M, s, r, g, b) => {
      aOrb[k * 3] = a; aOrb[k * 3 + 1] = e; aOrb[k * 3 + 2] = i * D;
      aAng[k * 3] = node * D; aAng[k * 3 + 1] = peri * D; aAng[k * 3 + 2] = M * D;
      size[k] = s; color[k * 3] = r; color[k * 3 + 1] = g; color[k * 3 + 2] = b;
      k++;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(k * 3), 3));
    geo.setAttribute('aOrb', new THREE.BufferAttribute(aOrb.subarray(0, k * 3), 3));
    geo.setAttribute('aAng', new THREE.BufferAttribute(aAng.subarray(0, k * 3), 3));
    geo.setAttribute('size', new THREE.BufferAttribute(size.subarray(0, k), 1));
    geo.setAttribute('color', new THREE.BufferAttribute(color.subarray(0, k * 3), 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uDays: { value: 0 }, uScale: U.G.uScale, uMinPx: { value: 1.3 }, uMaxPx: { value: 3.2 }, uIntensity: { value: 0.85 }, uAnimate: { value: 1 }, uCore: { value: 3 } },
      vertexShader: U.SH.beltVert, fragmentShader: U.SH.pointsFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return pts;
  }

  // Classi SBDB: colore, albedo tipica, dimensione di riferimento
  const CLS = {
    MBA: { c: [0.68, 0.62, 0.55], p: 0.14, s: 0.012, D0: 6 },
    IMB: { c: [0.8, 0.74, 0.66], p: 0.3, s: 0.012, D0: 4 },
    OMB: { c: [0.62, 0.56, 0.52], p: 0.06, s: 0.014, D0: 15 },
    TJN: { c: [0.74, 0.54, 0.42], p: 0.07, s: 0.03, D0: 15 },
    TNO: { c: [0.56, 0.68, 0.88], p: 0.1, s: 0.32, D0: 150 },
    CEN: { c: [0.55, 0.85, 0.62], p: 0.08, s: 0.08, D0: 30 },
    NEO: { c: [1.0, 0.45, 0.35], p: 0.2, s: 0.006, D0: 1 },
  };

  U.defineLevel({
    id: 'solar', name: 'Sistema solare', unit: { name: 'UA', m: C.AU },
    minDist: 2e-5, maxDist: 2.2e5, startDist: 42, startView: [0.5, 1.02], focus: 'sole', sky: 'ecliptic', extent: 5e5, nearFade: 0,
    timeControls: true,
    frameQuat: () => (eclQuat = eclQuat || U.eclipticToGalacticQuat()),
    parent: () => ({ level: 'neighborhood', focus: 'sole' }),

    build(inst, E) {
      const S = inst.scene;
      const kmToAU = 1 / U.AU_KM;
      inst.bodies = [];

      // Sole
      const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(695700 * kmToAU, 64, 48), U.sunMaterial('#fff3cf', '#ff9540'));
      S.add(sunMesh);
      inst.marker({ id: 'sole', info: U.SOLAR.sun, pos: new THREE.Vector3(), color: '#ffe2a0', px: 36, halo: 1.8, label: 1, prio: 1, radius: 695700 * kmToAU, viewDist: 0.04 });

      // Pianeti + Plutone
      const all = U.SOLAR.planets.concat([U.SOLAR.pluto]);
      const jd = E.time.jd;
      for (const p of all) {
        if (p.look && (p.look.tex || p.look.clouds) && p.src && !p.src.includes('sss_tex')) p.src.push('sss_tex');
        const body = U.makePlanetBody(p, 64);
        body.group.scale.setScalar(kmToAU);
        S.add(body.group);
        const el = U.standish(p, jd);
        const orbit = U.makeLine(U.orbitPath(el, 512), p.color, p.id === 'plutone' ? 0.25 : 0.38, true);
        orbit.userData.isOrbit = true;
        S.add(orbit);
        const R = p.R_km * kmToAU;
        const it = inst.marker({ id: p.id, info: p, color: p.color, px: p.id === 'plutone' ? 5 : 7, halo: 0.5, label: p.id === 'plutone' ? 2 : 1, radius: R,
          viewDist: R * 7, labelMaxDist: p.id === 'plutone' ? 2500 : 1500, pos: new THREE.Vector3(),
          portal: { level: 'planet:' + p.id, focus: p.id, enterDist: planetLevelMax(p.id) * 0.35 * kmToAU } });
        it.body = body; it.data = p;
        it.dynamicFacts = () => {
          const dAU = it.pos.length();
          const earth = inst.byId.terra;
          const out = [['Distanza attuale dal Sole', U.sig(dAU, 4) + ' UA'], ['Luce dal Sole', U.fmtLightTime(dAU * C.AU)]];
          if (earth && it !== earth) out.push(['Distanza attuale dalla Terra', U.sig(it.pos.distanceTo(earth.pos), 4) + ' UA']);
          return out;
        };
        inst.bodies.push(it);
      }

      // Corpi minori con nome (elementi reali JPL SBDB)
      inst.smalls = [];
      for (const sb of U.SOLAR.small) {
        const el = namedElements(sb.id);
        if (!el) continue;
        const line = U.makeLine(U.orbitPath(el, el.e > 0.9 ? 2048 : 512), sb.color, 0.16, true);
        line.userData.isOrbit = true;
        S.add(line);
        const it = inst.marker({ id: sb.id, info: sb, color: sb.color, px: sb.label === 1 ? 5 : 4.2, halo: 0.4, label: sb.label || 2, radius: 0,
          viewDist: Math.max(0.05, el.a * (1 - el.e) * 0.2), labelMaxDist: el.a > 30 ? 3000 : 60, pos: new THREE.Vector3() });
        it.el = el;
        it.dynamicFacts = () => {
          const g = U.GEN.named[sb.id];
          const out = [['Distanza attuale dal Sole', U.sig(it.pos.length(), 3) + ' UA'], ['Semiasse maggiore', U.sig(g.a, 4) + ' UA'], ['Eccentricità', U.sig(g.e, 3)], ['Periodo orbitale', U.sig(Math.pow(g.a, 1.5), 3) + ' anni']];
          if (g.diameter) out.push(['Diametro (SBDB)', U.sig(g.diameter, 3) + ' km']);
          return out;
        };
        inst.smalls.push(it);
      }

      // Sonde e oggetti interstellari (JPL Horizons)
      inst.craft = [];
      for (const id in U.CRAFT) {
        const s = U.hzSeries(id);
        if (!s || s.center !== '500@10') continue;
        const info = U.CRAFT[id];
        const n = s.jd.length, stride = Math.max(1, Math.ceil(n / 1800));
        const pts = [];
        for (let k = 0; k < n; k += stride) pts.push([s.xyz[k * 3], s.xyz[k * 3 + 1], s.xyz[k * 3 + 2]]);
        pts.push([s.xyz[(n - 1) * 3], s.xyz[(n - 1) * 3 + 1], s.xyz[(n - 1) * 3 + 2]]);
        const line = U.makeLine(pts, info.color, 0.11, false);
        line.userData.isOrbit = true;
        S.add(line);
        const it = inst.marker({ id, info, color: info.color, px: 5, halo: 0.4, label: 2, radius: 0, pos: new THREE.Vector3(), viewDist: 3 });
        it.series = s;
        it.dynamicFacts = () => {
          const d = it.pos.length();
          const earth = inst.byId.terra;
          const r = U.hzAt(s, E.time.jd);
          return [['Distanza dal Sole', U.sig(d, 4) + ' UA'], ['Distanza dalla Terra', earth ? U.sig(it.pos.distanceTo(earth.pos), 4) + ' UA' : '—'],
            ['Segnale radio dalla Terra', earth ? U.fmtLightTime(it.pos.distanceTo(earth.pos) * C.AU) : '—'],
            ['Posizione', r.inRange ? 'effemeride JPL Horizons' : 'fuori dall\'effemeride: estrapolata']];
        };
        inst.craft.push(it);
      }

      // Popolazioni reali: asteroidi, Troiani, TNO, Centauri, NEO (JPL SBDB)
      const real = U.smallBodies();
      if (real) {
        const pts = makeBeltGeometry(real.n, (add) => {
          for (let k = 0; k < real.n; k++) {
            const cls = CLS[real.classes[real.cls[k]]] || CLS.MBA;
            const Dkm = U.diameterFromH(real.H[k], cls.p);
            const s = cls.s * U.clamp(Math.pow(Dkm / cls.D0, 0.35), 0.5, 3);
            const b = 0.55 + 0.45 * ((k * 2654435761) % 1000) / 1000;
            add(real.a[k], real.e[k], real.i[k], real.node[k], real.peri[k], real.M0[k], s, cls.c[0] * b, cls.c[1] * b, cls.c[2] * b);
          }
        });
        S.add(pts);
        inst.belts = [pts];
      } else inst.belts = [];

      // Nube di Oort (ipotesi: distribuzione illustrativa)
      {
        const r = U.rng(21), pb = new U.PointBuilder();
        const n = U.q(26000);
        for (let k = 0; k < n; k++) {
          const inner = r() < 0.35;
          const rr = inner ? 2000 * Math.pow(10, r()) : 20000 + Math.pow(r(), 0.8) * 80000;
          const v = r.unitVec();
          const flat = inner ? 0.45 : 1;
          const b = 0.4 + 0.6 * r();
          pb.push(v[0] * rr, v[2] * rr * flat, v[1] * rr, 0.55 * b, 0.68 * b, 0.9 * b, rr * 0.012);
        }
        S.add(pb.build({ intensity: 0.5, minPx: 1, maxPx: 3, falloff: 1.1 }));
      }

      // Eliosfera: naso verso il flusso interstellare (λ≈255,4°, β≈5,2°)
      {
        const lam = 255.4 * D, bet = 5.2 * D;
        const nose = U.toThree([Math.cos(bet) * Math.cos(lam), Math.cos(bet) * Math.sin(lam), Math.sin(bet)]).normalize();
        const r = U.rng(31);
        const shell = (R0, tail, n, col, inten) => {
          const pb = new U.PointBuilder();
          for (let k = 0; k < U.q(n); k++) {
            const v = r.unitVec(); const dv = new THREE.Vector3(v[0], v[2], v[1]);
            const c = dv.dot(nose);
            const rr = R0 * (1 + tail * Math.pow((1 - c) / 2, 2.2)) * (1 + r.gauss() * 0.015);
            pb.push(dv.x * rr, dv.y * rr, dv.z * rr, col[0], col[1], col[2], 1.2);
          }
          return pb.build({ intensity: inten, minPx: 1, maxPx: 2, falloff: 1 });
        };
        S.add(shell(121, 2.4, 9000, [0.35, 0.75, 0.85], 0.35));
        S.add(shell(90, 1.2, 5000, [0.55, 0.5, 0.9], 0.22));
        inst.marker({ id: 'eliosfera', info: U.SOLAR.regions.eliosfera, pos: nose.clone().multiplyScalar(121), color: '#7fd6e6', px: 6, halo: 0.3, label: 2, radius: 0, viewDist: 400, labelMinDist: 60, labelMaxDist: 5000 });
      }

      // Regioni etichettate
      inst.marker({ id: 'fascia', info: U.SOLAR.regions.fascia, pos: new THREE.Vector3(2.75, 0, 0), color: '#a89c8c', px: 4, halo: 0, opacity: 0.6, label: 3, viewDist: 8, labelMinDist: 2, labelMaxDist: 40 });
      inst.troiani = inst.marker({ id: 'troiani', info: U.SOLAR.regions.troiani, pos: new THREE.Vector3(), color: '#b48c70', px: 4, halo: 0, opacity: 0.6, label: 3, viewDist: 15, labelMinDist: 3, labelMaxDist: 60 });
      inst.marker({ id: 'kuiper', info: U.SOLAR.regions.kuiper, pos: new THREE.Vector3(-44, 0, -12), color: '#8ca0c0', px: 4, halo: 0, opacity: 0.6, label: 2, viewDist: 140, labelMinDist: 25, labelMaxDist: 900 });
      inst.marker({ id: 'neo', info: U.SOLAR.regions.neo, pos: new THREE.Vector3(0.9, 0.08, 0.6), color: '#ff7a5a', px: 3, halo: 0, opacity: 0.5, label: 3, viewDist: 3, labelMinDist: 0.8, labelMaxDist: 8 });
      inst.marker({ id: 'centauri', info: U.SOLAR.regions.centauri, pos: new THREE.Vector3(0, 1.5, 18), color: '#8cd8a0', px: 3, halo: 0, opacity: 0.5, label: 3, viewDist: 60, labelMinDist: 12, labelMaxDist: 200 });
      inst.marker({ id: 'oort', info: U.SOLAR.regions.oort, pos: new THREE.Vector3(0, 40000, 0), color: '#8cb0e6', px: 5, halo: 0.2, opacity: 0.7, label: 1, viewDist: 3.2e5, labelMinDist: 3000 });

      // Pianeta Nove ipotetico (orbita tratteggiata)
      {
        const el = { a: 500, e: 0.25, i: 20, node: 100, peri: 150 };
        const pts = U.orbitPath(el, 720).map((p) => new THREE.Vector3(p[0], p[2], -p[1]));
        const line = U.makeLineV(pts, '#d98cd9', 0.35, 12);
        line.userData.isOrbit = true;
        S.add(line);
        const ap = U.orbitalToXYZ(el, Math.PI);
        inst.marker({ id: 'pianeta9', info: U.SOLAR.regions.pianeta9, pos: new THREE.Vector3(ap[0], ap[2], -ap[1]), color: '#d98cd9', px: 5, halo: 0.2, opacity: 0.6, label: 2, viewDist: 2500, labelMinDist: 150, labelMaxDist: 20000 });
      }

      for (const R of [1, 10, 100, 1000, 10000, 100000]) {
        const c = U.makeCircle(R, '#40506e', 0.12, 256);
        c.userData.isOrbit = true;
        S.add(c);
      }
    },

    update(inst, ctx) {
      const jd = ctx.jd, E = ctx.E;
      const sunDir = new THREE.Vector3();
      const ex = E.opts.exaggerate ? 600 : 1;
      for (const it of inst.bodies) {
        const el = U.standish(it.data, jd);
        const p = U.keplerAt(el, jd);
        it.pos.set(p[0], p[2], -p[1]);
        it.body.group.position.copy(it.pos);
        it.body.group.scale.setScalar(ex / U.AU_KM);
        it.radius = it.data.R_km / U.AU_KM * ex;
        sunDir.copy(it.pos).negate().normalize();
        it.body.update(jd, sunDir);
        it.marker.position.copy(it.pos);
        const s = E.project(it.pos, {});
        const rp = s ? E.radiusPx(it.radius, s.d) : 0;
        it.marker.material.uniforms.uOpacity.value = 1 - U.smooth(U.clamp((rp - 3) / 8, 0, 1));
      }
      for (const it of inst.smalls) {
        const p = U.keplerAt(it.el, jd);
        it.pos.set(p[0], p[2], -p[1]);
        it.marker.position.copy(it.pos);
      }
      for (const it of inst.craft) {
        const p = U.hzAt(it.series, jd).p;
        it.pos.set(p[0], p[2], -p[1]);
        it.marker.position.copy(it.pos);
      }
      const days = jd - C.J2000;
      for (const b of inst.belts) b.material.uniforms.uDays.value = days;
      const LJ = (34.39644051 + 3034.74612775 * (days / 36525) + 60) * D;
      inst.troiani.pos.set(5.2 * Math.cos(LJ), 0, -5.2 * Math.sin(LJ));
      inst.troiani.marker.position.copy(inst.troiani.pos);
    },
  });

  // ===========================================================================
  //  Famiglia di livelli: pianeta con lune (unità: km, frame eclittico)
  // ===========================================================================
  const hashPhase = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000 * Math.PI * 2; };

  U.defineLevelFamily('planet', (key) => {
    const p = planetData(key);
    if (!p) return null;
    const moons = U.SOLAR.moons[key] || [];
    const maxDist = planetLevelMax(key);
    const retro = !!(p.W && p.W[1] < 0);
    return {
      name: p.name, unit: { name: 'km', m: 1e3 },
      minDist: p.R_km * 1.06, maxDist, startDist: p.R_km * 4.2, focus: key, sky: 'ecliptic', extent: maxDist * 20, nearFade: 0,
      // vista iniziale dal lato illuminato, leggermente di tre quarti
      startView: (inst) => {
        const d = inst.helio ? inst.helio.clone().negate().normalize() : new THREE.Vector3(1, 0, 0);
        d.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.55);
        return [Math.atan2(d.x, d.z), U.clamp(Math.acos(U.clamp(d.y, -1, 1)) - 0.25, 0.7, 2.3)];
      },
      timeControls: true,
      parent: () => ({ level: 'solar', focus: key }),
      build(inst, E) {
        const S = inst.scene;
        const body = U.makePlanetBody(p, 160);
        S.add(body.group);
        inst.body = body;
        const it = inst.add({ id: key, info: p, pos: new THREE.Vector3(), radius: p.R_km, viewDist: p.R_km * 4, label: 1 });
        it.dynamicFacts = () => [['Distanza dal Sole (ora)', U.sig(inst.helio ? inst.helio.length() : 0, 4) + ' UA']];

        // basi del piano equatoriale (per satelliti artificiali e lune senza elementi JPL)
        const P = U.eqDirInEclThree(p.pole[0], p.pole[1]).normalize();
        const Peq = U.eqUnit(p.pole[0], p.pole[1]);
        let Q = [-Peq[1], Peq[0], 0]; const nq = Math.hypot(Q[0], Q[1]) || 1; Q = [Q[0] / nq, Q[1] / nq, 0];
        const Qt = U.toThree(U.eqToEcl(Q)).normalize();
        const Wt = new THREE.Vector3().crossVectors(P, Qt).normalize();
        inst.moons = [];
        const jd0 = E.time.jd;
        const jwst = key === 'terra' ? U.hzSeries('jwst') : null;
        for (const m of moons) {
          const mo = { m };
          const inc = (m.inc || 0) * D;
          const node = hashPhase(m.id + 'n');
          const q1 = Qt.clone().multiplyScalar(Math.cos(node)).add(Wt.clone().multiplyScalar(Math.sin(node)));
          const w1 = new THREE.Vector3().crossVectors(P, q1).normalize();
          mo.u = q1; mo.v = w1.multiplyScalar(Math.cos(inc)).add(P.clone().multiplyScalar(Math.sin(inc))).normalize();
          mo.phase = hashPhase(m.id);
          mo.jpl = !m.real && m.naif && U.satElements(m.naif) ? m.naif : null;
          if (m.l2 && jwst) mo.hz = jwst;
          const pts = [];
          if (m.real === 'moon') {
            for (let k = 0; k <= 120; k++) { const g = U.moonGeocentric(jd0 + (k / 120) * 27.55); pts.push(new THREE.Vector3(g[0], g[2], -g[1])); }
          } else if (mo.jpl) {
            const Pd = U.satElements(mo.jpl).P;
            for (let k = 0; k <= 256; k++) { const g = U.satAt(mo.jpl, jd0 + (k / 256) * Pd, p.pole, retro); pts.push(new THREE.Vector3(g[0], g[2], -g[1])); }
          } else if (mo.hz) {
            for (let k = -90; k <= 90; k += 1) { const g = U.hzAt(mo.hz, jd0 + k).p; pts.push(new THREE.Vector3(g[0], g[2], -g[1]).multiplyScalar(U.AU_KM)); }
          } else if (!m.l2) {
            for (let k = 0; k <= 256; k++) { const t = k / 256 * Math.PI * 2; pts.push(mo.u.clone().multiplyScalar(m.a * Math.cos(t)).add(mo.v.clone().multiplyScalar(m.a * Math.sin(t)))); }
          }
          if (pts.length) {
            const l = U.makeLineV(pts, m.craft ? (m.color || '#ffffff') : '#8c96aa', m.craft ? 0.28 : 0.3);
            l.userData.isOrbit = true; S.add(l);
          }
          if (!m.craft) {
            mo.body = U.makePlanetBody({ id: m.id, R_km: m.R, look: m.look, atmo: m.atmo }, m.look && m.look.tex ? 128 : 64);
            S.add(mo.body.group);
          }
          const info = mo.jpl ? Object.assign({}, m, { src: (m.src || []).concat(m.src && m.src.includes('jpl_sat') ? [] : ['jpl_sat']) }) : m;
          mo.item = inst.marker({ id: m.id, info, pos: new THREE.Vector3(), color: m.color || '#d8dce6', px: m.craft ? 4 : 5, halo: 0.3, label: m.craft ? 3 : 2, radius: m.R, viewDist: m.craft ? Math.max(m.a * 0.25, 2000) : m.R * 5 });
          if (m.craft && !m.l2) mo.item.labelMaxDist = m.a * 12;
          mo.item.dynamicFacts = () => {
            const out = [['Distanza dal centro di ' + p.name, U.sig(mo.item.pos.length(), 4) + ' km']];
            if (mo.jpl) out.push(['Posizione', 'elementi medi JPL propagati alla data']);
            else if (m.real === 'moon') out.push(['Posizione', 'teoria lunare (Astronomical Almanac)']);
            else if (mo.hz) out.push(['Posizione', 'effemeride JPL Horizons']);
            else if (!m.craft) out.push(['Posizione', 'fase orbitale indicativa']);
            return out;
          };
          inst.moons.push(mo);
        }
      },
      onEnter(inst, E) { E.skySun.visible = true; },
      onExit(inst, E) { E.skySun.visible = false; },
      update(inst, ctx) {
        const jd = ctx.jd, E = ctx.E;
        const el = U.standish(p, jd);
        const h = U.keplerAt(el, jd);
        inst.helio = new THREE.Vector3(h[0], h[2], -h[1]);
        const sunDir = inst.helio.clone().negate().normalize();
        inst.body.update(jd, sunDir);
        E.skySun.position.copy(sunDir).multiplyScalar(900);
        E.skySun.visible = true;
        for (const mo of inst.moons) {
          const m = mo.m;
          if (m.real === 'moon') { const g = U.moonGeocentric(jd); mo.item.pos.set(g[0], g[2], -g[1]); }
          else if (mo.jpl) { const g = U.satAt(mo.jpl, jd, p.pole, retro); mo.item.pos.set(g[0], g[2], -g[1]); }
          else if (mo.hz) { const g = U.hzAt(mo.hz, jd).p; mo.item.pos.set(g[0], g[2], -g[1]).multiplyScalar(U.AU_KM); }
          else if (m.l2) { mo.item.pos.copy(sunDir).multiplyScalar(-m.a); }
          else {
            const th = mo.phase + (jd - C.J2000) / m.P * Math.PI * 2;
            mo.item.pos.copy(mo.u).multiplyScalar(m.a * Math.cos(th)).addScaledVector(mo.v, m.a * Math.sin(th));
          }
          mo.item.marker.position.copy(mo.item.pos);
          if (mo.body) {
            mo.body.group.position.copy(mo.item.pos);
            // rotazione sincrona: il meridiano 0 guarda il pianeta
            const toP = mo.item.pos.clone().negate().normalize();
            const z = new THREE.Vector3().crossVectors(toP, P0(inst, p)).normalize();
            const y = new THREE.Vector3().crossVectors(z, toP).normalize();
            mo.body.spin.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(toP, y, z));
            mo.body.update(jd, sunDir);
            const s = E.project(mo.item.pos, {});
            const rp = s ? E.radiusPx(m.R, s.d) : 0;
            mo.item.marker.material.uniforms.uOpacity.value = 1 - U.smooth(U.clamp((rp - 3) / 8, 0, 1));
          }
        }
      },
    };
  });
  // polo del pianeta nel frame THREE (in cache sull'istanza)
  function P0(inst, p) {
    if (!inst._pole) { inst._pole = U.eqDirInEclThree(p.pole[0], p.pole[1]).normalize(); if (p.W && p.W[1] < 0) inst._pole.negate(); }
    return inst._pole;
  }
})(window.U);
