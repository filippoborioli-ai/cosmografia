// =============================================================================
//  Livello: Sistema solare (unità: UA, frame eclittico J2000)
// =============================================================================
(function (U) {
  'use strict';
  const C = U.C, D = C.DEG;
  let eclQuat = null;

  function planetLevelMax(key) {
    const p = U.SOLAR.planets.find((x) => x.id === key) || (key === 'plutone' ? U.SOLAR.pluto : null);
    const moons = U.SOLAR.moons[key] || [];
    let maxA = 0;
    for (const m of moons) maxA = Math.max(maxA, m.a);
    return Math.max(p.R_km * 80, maxA * 3.2);
  }
  U.planetLevelMax = planetLevelMax;

  // anomalia media all'epoca da tempo di perielio (anno decimale o JD) oppure da calibrazione in longitudine
  function smallBodyElements(sb) {
    const el = Object.assign({ epoch: C.J2000 }, sb.el);
    const n = U.meanMotion(el.a);
    if (sb.tpJD) el.M0 = n * (C.J2000 - sb.tpJD);
    else if (sb.tp != null) el.M0 = n * (C.J2000 - (C.J2000 + (sb.tp - 2000.0) * 365.25));
    else if (sb.calib) {
      const jd = U.dateToJD(new Date(sb.calib.date + 'T00:00:00Z'));
      let best = 0, bestErr = 1e9;
      for (let M = 0; M < 360; M += 0.25) {
        const e2 = Object.assign({}, el, { M0: M, epoch: jd });
        const p = U.keplerAt(e2, jd);
        const lon = (Math.atan2(p[1], p[0]) / D + 360) % 360;
        const err = Math.abs(((lon - sb.calib.lon + 540) % 360) - 180);
        if (err < bestErr) { bestErr = err; best = M; }
      }
      el.M0 = best - n * (jd - C.J2000);
    } else el.M0 = 0;
    el.n = n;
    return el;
  }

  // Popolazione kepleriana animata nel vertex shader
  function makeBelt(gen, n, opts) {
    const r = U.rng(opts.seed || 5);
    const aOrb = [], aAng = [], size = [], color = [];
    for (let k = 0; k < n; k++) {
      const o = gen(r);
      if (!o) { k--; continue; }
      aOrb.push(o.a, o.e, o.i * D);
      aAng.push(o.node * D, o.peri * D, o.M * D);
      size.push(opts.size * (0.5 + r()));
      const b = 0.5 + 0.5 * r();
      color.push(opts.color[0] * b, opts.color[1] * b, opts.color[2] * b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aOrb', new THREE.Float32BufferAttribute(aOrb, 3));
    g.setAttribute('aAng', new THREE.Float32BufferAttribute(aAng, 3));
    g.setAttribute('size', new THREE.Float32BufferAttribute(size, 1));
    g.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
    const m = new THREE.ShaderMaterial({
      uniforms: { uDays: { value: 0 }, uScale: U.G.uScale, uMinPx: { value: opts.minPx || 1 }, uMaxPx: { value: 3 }, uIntensity: { value: opts.intensity || 0.5 }, uAnimate: { value: 1 }, uCore: { value: 3 } },
      vertexShader: U.SH.beltVert, fragmentShader: U.SH.pointsFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    return pts;
  }
  const rayleigh = (r, s) => s * Math.sqrt(-2 * Math.log(1 - r() * 0.999));

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
        const body = U.makePlanetBody(p, 64);
        body.group.scale.setScalar(kmToAU);
        S.add(body.group);
        const el = U.standish(p, jd);
        const orbit = U.makeLine(U.orbitPath(el, 512), p.color, p.id === 'plutone' ? 0.25 : 0.38, true);
        orbit.userData.isOrbit = true;
        S.add(orbit);
        const R = p.R_km * kmToAU;
        const it = inst.marker({ id: p.id, info: p, color: p.color, px: p.id === 'plutone' ? 5 : 7, halo: 0.5, label: p.id === 'plutone' ? 2 : 1, radius: R,
          viewDist: R * 7, labelMaxDist: p.id === 'plutone' ? 2500 : 1500, pos: new THREE.Vector3(), portal: { level: 'planet:' + p.id, focus: p.id, enterDist: planetLevelMax(p.id) * 0.35 * kmToAU } });
        it.body = body; it.data = p;
        it.dynamicFacts = () => {
          const dAU = it.pos.length();
          return [['Distanza attuale dal Sole', U.sig(dAU, 4) + ' UA'], ['Luce dal Sole', U.fmtLightTime(dAU * C.AU)]];
        };
        inst.bodies.push(it);
      }

      // Piccoli corpi
      inst.smalls = [];
      for (const sb of U.SOLAR.small) {
        const el = smallBodyElements(sb);
        const line = U.makeLine(U.orbitPath(el, sb.el.e > 0.9 ? 2048 : 512), sb.color, 0.16, true);
        line.userData.isOrbit = true;
        S.add(line);
        const it = inst.marker({ id: sb.id, info: sb, color: sb.color, px: 4.5, halo: 0.4, label: 2, radius: 0, viewDist: sb.el.a * 0.15, pos: new THREE.Vector3() });
        it.el = el;
        it.dynamicFacts = () => [['Distanza attuale dal Sole', U.sig(it.pos.length(), 3) + ' UA']];
        inst.smalls.push(it);
      }

      // Sonde
      inst.craft = [];
      for (const cr of U.SOLAR.craft) {
        const dirEq = U.eqUnit(U.ra(cr.ra), U.dec(cr.dec));
        const dir = U.toThree(U.eqToEcl(dirEq)).normalize();
        const it = inst.marker({ id: cr.id, info: cr, color: cr.color, px: 5, halo: 0.3, label: 2, radius: 0, pos: new THREE.Vector3() });
        it.dir = dir; it.cr = cr;
        const line = U.makeLineV([new THREE.Vector3(), dir.clone().multiplyScalar(200)], cr.color, 0.12, 2);
        line.userData.isOrbit = true;
        S.add(line); it.line = line;
        it.viewDist = 30;
        it.dynamicFacts = () => [['Distanza stimata dal Sole', U.sig(it.pos.length(), 3) + ' UA'], ['Tempo luce', U.fmtLightTime(it.pos.length() * C.AU)]];
        inst.craft.push(it);
      }

      // Fascia principale (lacune di Kirkwood) e Troiani
      const gaps = [[2.502, 0.03], [2.825, 0.02], [2.958, 0.015], [3.279, 0.04]];
      const belt = makeBelt((r) => {
        const a = 2.1 + r() * 1.2;
        for (const [g, w] of gaps) if (Math.abs(a - g) < w) return null;
        if (r() > 0.4 + 0.6 * Math.exp(-Math.pow((a - 2.75) / 0.45, 2))) return null;
        return { a, e: Math.min(rayleigh(r, 0.08), 0.35), i: Math.min(rayleigh(r, 7), 35), node: r() * 360, peri: r() * 360, M: r() * 360 };
      }, U.q(32000), { size: 0.012, color: [0.66, 0.6, 0.54], intensity: 0.85, minPx: 1.3, seed: 11 });
      S.add(belt); inst.belts = [belt];
      const LJ = 34.39644;
      const troj = makeBelt((r) => {
        const side = r() < 0.6 ? 60 : -60;
        const node = r() * 360, peri = r() * 360;
        const lam = LJ + side + r.gauss() * 11;
        return { a: 5.2029 + r.gauss() * 0.03, e: Math.min(rayleigh(r, 0.06), 0.2), i: Math.min(rayleigh(r, 11), 35), node, peri, M: lam - node - peri };
      }, U.q(6000), { size: 0.025, color: [0.7, 0.54, 0.42], intensity: 0.85, minPx: 1.3, seed: 12 });
      S.add(troj); inst.belts.push(troj);

      // Fascia di Kuiper (classici freddi/caldi, plutini in risonanza 3:2 con Nettuno) + disco diffuso
      const LN = -55.12002969, peN = 44.96476227;
      void peN;
      const kuiper = makeBelt((r) => {
        const t = r();
        if (t < 0.4) { // classici freddi
          return { a: 42.5 + r() * 4.5, e: Math.min(rayleigh(r, 0.04), 0.12), i: Math.min(rayleigh(r, 2.5), 8), node: r() * 360, peri: r() * 360, M: r() * 360 };
        } else if (t < 0.65) { // classici caldi
          return { a: 40 + r() * 8, e: Math.min(rayleigh(r, 0.08), 0.25), i: Math.min(rayleigh(r, 14), 40), node: r() * 360, peri: r() * 360, M: r() * 360 };
        } else if (t < 0.88) { // plutini: 3λ − 2λN − ϖ ≈ 180°
          const lam = r() * 360;
          const varpi = 3 * lam - 2 * LN - 180 + r.gauss() * 45;
          const node = r() * 360;
          return { a: 39.45 + r.gauss() * 0.15, e: 0.1 + r() * 0.2, i: Math.min(rayleigh(r, 10), 35), node, peri: varpi - node, M: lam - varpi };
        }
        const a = 50 + Math.pow(r(), 2) * 150;
        return { a, e: 0.3 + r() * 0.45, i: Math.min(rayleigh(r, 18), 50), node: r() * 360, peri: r() * 360, M: r() * 360 };
      }, U.q(22000), { size: 0.3, color: [0.58, 0.66, 0.8], intensity: 0.8, minPx: 1.3, seed: 13 });
      S.add(kuiper); inst.belts.push(kuiper);

      // Nube di Oort (statica: periodi di milioni di anni)
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
        const oort = pb.build({ intensity: 0.5, minPx: 1, maxPx: 3, falloff: 1.1 });
        S.add(oort);
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

      // Anelli di riferimento (1, 10, 100, 1.000, 10.000, 100.000 UA)
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
      const camDist = E.dist();
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
      const year = 2000 + (jd - C.J2000) / 365.25;
      for (const it of inst.craft) {
        const d = Math.max(0, it.cr.d0 + (year - it.cr.t0) * it.cr.v);
        it.pos.copy(it.dir).multiplyScalar(d);
        it.marker.position.copy(it.pos);
      }
      const days = jd - C.J2000;
      for (const b of inst.belts) b.material.uniforms.uDays.value = days;
      const LJ = (34.39644051 + 3034.74612775 * (days / 36525) + 60) * D;
      inst.troiani.pos.set(5.2 * Math.cos(LJ), 0, -5.2 * Math.sin(LJ));
      inst.troiani.marker.position.copy(inst.troiani.pos);
      void camDist;
    },
  });

  // ===========================================================================
  //  Famiglia di livelli: pianeta con lune (unità: km, frame eclittico)
  // ===========================================================================
  const hashPhase = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000 * Math.PI * 2; };

  U.defineLevelFamily('planet', (key) => {
    const p = U.SOLAR.planets.find((x) => x.id === key) || (key === 'plutone' ? U.SOLAR.pluto : null);
    if (!p) return null;
    const moons = U.SOLAR.moons[key] || [];
    const maxDist = planetLevelMax(key);
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
      build(inst) {
        const S = inst.scene;
        const body = U.makePlanetBody(p, 160);
        S.add(body.group);
        inst.body = body;
        const it = inst.add({ id: key, info: p, pos: new THREE.Vector3(), radius: p.R_km, viewDist: p.R_km * 4, label: 1 });
        it.dynamicFacts = () => [['Distanza dal Sole (ora)', U.sig(inst.helio ? inst.helio.length() : 0, 4) + ' UA']];

        // basi dei piani equatoriali
        const P = U.eqDirInEclThree(p.pole[0], p.pole[1]).normalize();
        const Peq = U.eqUnit(p.pole[0], p.pole[1]);
        let Q = [-Peq[1], Peq[0], 0]; const nq = Math.hypot(Q[0], Q[1]) || 1; Q = [Q[0] / nq, Q[1] / nq, 0];
        const Qt = U.toThree(U.eqToEcl(Q)).normalize();
        const Wt = new THREE.Vector3().crossVectors(P, Qt).normalize();
        inst.moons = [];
        for (const m of moons) {
          const mo = { m, a: m.a };
          const inc = (m.inc || 0) * D;
          const node = hashPhase(m.id + 'n');
          const q1 = Qt.clone().multiplyScalar(Math.cos(node)).add(Wt.clone().multiplyScalar(Math.sin(node)));
          const w1 = new THREE.Vector3().crossVectors(P, q1).normalize();
          mo.u = q1; mo.v = w1.multiplyScalar(Math.cos(inc)).add(P.clone().multiplyScalar(Math.sin(inc))).normalize();
          mo.phase = hashPhase(m.id);
          if (m.real === 'moon') {
            const pts = [];
            for (let k = 0; k <= 120; k++) { const g = U.moonGeocentric(U.Engine.time.jd + (k / 120) * 27.55); pts.push(new THREE.Vector3(g[0], g[2], -g[1])); }
            const l = U.makeLineV(pts, '#9aa3b5', 0.3); l.userData.isOrbit = true; S.add(l);
          } else if (!m.l2) {
            const pts = [];
            for (let k = 0; k <= 256; k++) { const t = k / 256 * Math.PI * 2; pts.push(mo.u.clone().multiplyScalar(m.a * Math.cos(t)).add(mo.v.clone().multiplyScalar(m.a * Math.sin(t)))); }
            const l = U.makeLineV(pts, m.craft ? (m.color || '#ffffff') : '#8c96aa', m.craft ? 0.28 : 0.3); l.userData.isOrbit = true; S.add(l);
          }
          if (!m.craft) {
            mo.body = U.makePlanetBody({ id: m.id, R_km: m.R, look: m.look, atmo: m.atmo }, 64);
            S.add(mo.body.group);
          }
          mo.item = inst.marker({ id: m.id, info: m, pos: new THREE.Vector3(), color: m.color || '#d8dce6', px: m.craft ? 4 : 5, halo: 0.3, label: m.craft ? 3 : 2, radius: m.R, viewDist: m.craft ? Math.max(m.a * 0.25, 2000) : m.R * 5 });
          if (m.craft && !m.l2) mo.item.labelMaxDist = m.a * 12;
          mo.item.dynamicFacts = () => [['Distanza dal centro di ' + p.name, U.sig(mo.item.pos.length(), 4) + ' km']];
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
            const up = new THREE.Vector3().crossVectors(mo.u, mo.v).normalize();
            const z = new THREE.Vector3().crossVectors(toP, up).normalize();
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
})(window.U);
