// =============================================================================
//  Livelli: Vicinato solare (anni luce, frame galattico) e sistemi extrasolari (UA)
// =============================================================================
(function (U) {
  'use strict';
  const C = U.C;
  const LY_AU = C.ly / C.AU;
  const RSUN_KM = 695700;

  const starById = {};
  for (const s of U.NEAR) starById[s.id] = s;

  function exoMaxDist(key) {
    if (key === 'alfacen') return 1.2e5;
    const sys = U.EXO[key];
    let outer = 0.05;
    for (const pl of sys.planets) outer = Math.max(outer, pl.a || planetA(pl, sys));
    if (sys.disks) for (const d of sys.disks) outer = Math.max(outer, d[1]);
    return Math.max(300, outer * 60);
  }
  function planetA(pl, sys) {
    if (pl.a) return pl.a;
    const host = starById[pl.host || sys.primary];
    return Math.cbrt(host.M * Math.pow(pl.P / 365.25, 2));
  }

  // --- Vicinato solare ----------------------------------------------------------
  U.defineLevel({
    id: 'neighborhood', name: 'Vicinato solare', unit: { name: 'anni luce', m: C.ly },
    minDist: 1e-4, maxDist: 360, startDist: 34, startView: [2.2, 1.0], focus: 'sole', sky: 'galactic_far', extent: 2000, nearFade: 0,
    parent: () => ({ level: 'milkyway', focus: 'sole_mw' }),
    build(inst) {
      const S = inst.scene;
      inst.marker({ id: 'sole', info: Object.assign({}, U.SOLAR.sun, { desc: U.SOLAR.sun.desc + ' Da qui, zoomando, si entra nel Sistema solare.' }), pos: new THREE.Vector3(), color: '#ffe2a0', px: 11, halo: 0.9, label: 1,
        radius: 0, viewDist: 3, portal: { level: 'solar', focus: 'sole', enterDist: 1.0 } });

      const stalkPts = [];
      for (const s of U.NEAR) {
        const pos = U.eqVec(U.ra(s.ra), U.dec(s.dec), s.d);
        const T = U.spectralTemp(s.sp);
        const col = U.bbColor(T);
        const px = U.clamp(6 + 1.8 * Math.log10(Math.max(s.L, 1e-5)), 3.2, 15);
        const info = {
          name: s.name, type: 'Stella · ' + s.sp, cert: 'mis',
          facts: [['Distanza', U.nf(s.d, 2) + ' anni luce'], ['Classe spettrale', s.sp], ['Temperatura (indicativa)', U.nf(Math.round(T / 10) * 10, 0) + ' K'],
            ['Massa', U.nf(s.M, 3) + ' masse solari'], ['Luminosità', U.sci(s.L, 3) + ' volte il Sole'],
            ['Luce partita', U.nf(s.d, 1) + ' anni fa']].concat(s.sys ? [['Sistema planetario', U.EXO[s.sys].name]] : []),
          desc: (s.desc || 'Stella del vicinato solare.') + (s.sys ? ' Zooma o premi "Entra" per esplorarne il sistema planetario.' : ''),
          src: s.src || ['recons', 'gaia_dr3'],
        };
        const label = s.label || s.sys ? (s.L > 0.3 || s.label ? 1 : 2) : 3;
        const it = inst.marker({ id: s.id, info, pos, color: '#' + col.getHexString(), px, halo: 0.7, label, radius: (s.R || Math.pow(s.M, 0.8)) * RSUN_KM * 1000 / C.ly,
          viewDist: s.sys ? 0.02 : 0.5, labelMaxDist: label === 3 ? 60 : label === 2 ? 150 : null });
        if (s.sys) it.portal = { level: 'exo:' + s.sys, focus: s.id, enterDist: exoMaxDist(s.sys) * 0.3 / LY_AU };
        if (s.id === 'alfacenb' || s.id === 'siriob') { it.label = 3; it.labelMaxDist = 0.05; }
        stalkPts.push(pos.x, pos.y, pos.z, pos.x, 0, pos.z);
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(stalkPts, 3));
      const stalks = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0x5a6f96, transparent: true, opacity: 0.28, depthWrite: false }));
      stalks.userData.isOrbit = true;
      S.add(stalks);
      for (const R of [5, 10, 15, 20, 30, 40, 50, 75, 100]) {
        const c = U.makeCircle(R, '#3d5078', R % 10 === 0 ? 0.28 : 0.14, 180); c.userData.isOrbit = true; S.add(c);
      }
      // direzione del centro galattico e del moto solare
      const gc = U.makeLineV([new THREE.Vector3(0, 0, 0), new THREE.Vector3(90, 0, 0)], '#ffb45a', 0.35, 1.5); gc.userData.isOrbit = true; S.add(gc);
      inst.marker({ id: 'dir_gc', pos: new THREE.Vector3(90, 0, 0), color: '#ffb45a', px: 5, halo: 0, label: 2,
        info: { name: 'Verso il centro galattico', type: 'Direzione (l = 0°)', cert: 'mis', facts: [['Distanza del centro', '~26.670 anni luce']],
          desc: 'Il piano di riferimento di questa scena è il piano galattico; le linee verticali collegano ogni stella al piano per leggere la profondità. Il centro della Via Lattea si trova in questa direzione, nel Sagittario.' } });
      const oort = U.makeWireSphere(1.58, '#6f8fc8', 0.12); oort.userData.isOrbit = true; S.add(oort);

      // Catalogo HYG: stelle reali entro 100 pc, con magnitudine apparente calcolata dalla camera
      const hyg = U.nearStars();
      if (hyg) {
        const curated = U.NEAR.map((s) => U.eqVec(U.ra(s.ra), U.dec(s.dec), s.d));
        const cell = (v) => Math.round(v.x / 2) + ',' + Math.round(v.y / 2) + ',' + Math.round(v.z / 2);
        const grid = new Map();
        for (const v of curated) { const k = cell(v); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(v); }
        const pos = [], mags = [], cols = [];
        const tmp = new THREE.Vector3();
        let added = 0;
        for (let k = 0; k < hyg.n; k++) {
          tmp.set(hyg.pos[k * 3], hyg.pos[k * 3 + 1], hyg.pos[k * 3 + 2]);
          // salta le stelle già presenti nel catalogo curato (entro 0,35 anni luce)
          let dup = false;
          const near = grid.get(cell(tmp));
          if (near) for (const v of near) if (v.distanceTo(tmp) < 0.35) { dup = true; break; }
          if (dup) continue;
          const bv = U.clamp(hyg.bv[k], -0.4, 2.0);
          const c = U.bbColor(U.bvToTemp(bv));
          pos.push(tmp.x, tmp.y, tmp.z); mags.push(hyg.absMag[k]); cols.push(c.r, c.g, c.b);
          const raw = hyg.names[k] || '';
          const proper = raw.startsWith('*');
          const name = (proper ? raw.slice(1) : raw) || 'Stella senza nome';
          const dist = tmp.length();
          const idx = k;
          const it = inst.add({ id: 'hyg' + k, name, cert: 'mis', pos: tmp.clone(), radius: 0, label: 0, viewDist: 0.6, pickPenalty: 2 });
          Object.defineProperty(it, 'info', {
            configurable: true,
            get() {
              const M = hyg.absMag[idx], T = U.bvToTemp(U.clamp(hyg.bv[idx], -0.4, 2.0));
              const m = M + 5 * Math.log10(dist * C.ly / C.pc / 10);
              const L = Math.pow(10, -0.4 * (M - 4.83));
              return { name, type: 'Stella (catalogo HYG)', cert: 'mis',
                facts: [['Distanza', U.sig(dist, 3) + ' anni luce'], ['Magnitudine apparente dalla Terra', U.nf(m, 2)], ['Magnitudine assoluta', U.nf(M, 2)],
                  ['Luminosità visuale', '~' + U.sci(L, 2) + ' Soli'], ['Indice di colore B−V', U.nf(hyg.bv[idx], 2)], ['Temperatura stimata', '~' + U.nf(Math.round(T / 50) * 50, 0) + ' K']],
                desc: 'Stella del catalogo HYG (Hipparcos, Yale Bright Star, Gliese), posizione reale. Nel vicinato la sua luminosità è calcolata dalla posizione della camera: avvicinandoti la vedi diventare più brillante, come accadrebbe davvero.',
                src: ['hyg'] };
            },
          });
          if (proper) { it.label = 3; it.labelMaxDist = 120; }
          added++;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('absMag', new THREE.Float32BufferAttribute(mags, 1));
        g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        const cloud = new THREE.Points(g, U.star3dMaterial(C.ly / C.pc, 15.5));
        cloud.frustumCulled = false;
        S.add(cloud);
        inst.hygCount = added;
      }
    },
  });

  // --- Sistemi extrasolari ------------------------------------------------------
  U.defineLevelFamily('exo', (key) => {
    const sys = U.EXO[key];
    if (!sys) return null;
    const maxDist = exoMaxDist(key);
    const primary = starById[sys.primary];
    let inner = 1;
    for (const pl of sys.planets) inner = Math.min(inner, planetA(pl, sys));
    return {
      name: sys.name, unit: { name: 'UA', m: C.AU },
      minDist: 1e-5, maxDist, startDist: Math.max(inner * 6, 0.3), startView: [0.8, 1.15], focus: sys.primary, sky: 'galactic', extent: maxDist * 10, nearFade: 0,
      timeControls: true,
      parent: () => ({ level: 'neighborhood', focus: sys.primary }),
      build(inst) {
        const S = inst.scene;
        inst.planets = []; inst.starItems = {};
        const origin = U.eqVec(U.ra(primary.ra), U.dec(primary.dec), primary.d);
        for (const sid of sys.stars) {
          const s = starById[sid];
          let pos = new THREE.Vector3();
          if (sid === 'proxima') pos = U.eqVec(U.ra(s.ra), U.dec(s.dec), s.d).sub(origin).multiplyScalar(LY_AU);
          const T = U.spectralTemp(s.sp);
          const R_km = (s.R || Math.pow(s.M, 0.8)) * RSUN_KM;
          const g = new THREE.Group(); g.position.copy(pos); S.add(g);
          g.add(U.makeStarBody(R_km, T, C.AU / 1000));
          const col = U.bbColor(T);
          const hz = [Math.sqrt(s.L / 1.107), Math.sqrt(s.L / 0.356)];
          const it = inst.marker({ id: sid, pos, color: '#' + col.getHexString(), px: 16, halo: 1.1, label: 1, radius: R_km / (C.AU / 1000), viewDist: Math.max(hz[1] * 3, R_km / 1.5e8 * 20),
            info: { name: s.name, type: 'Stella · ' + s.sp, cert: 'mis',
              facts: [['Massa', U.nf(s.M, 3) + ' masse solari'], ['Luminosità', U.sci(s.L, 3) + ' Soli'], ['Zona abitabile (stima)', U.sig(hz[0], 2) + ' – ' + U.sig(hz[1], 2) + ' UA']],
              desc: (s.desc || '') + ' L\'anello verde indica la zona abitabile stimata con i flussi limite di Kopparapu et al. (2013).', src: (s.src || []).concat(['kopparapu2013']) } });
          it.group = g;
          inst.starItems[sid] = it;
          // zona abitabile
          const ring = new THREE.Mesh(new THREE.RingGeometry(hz[0], hz[1], 180, 1), new THREE.MeshBasicMaterial({ color: 0x3fbf7f, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false }));
          ring.rotation.x = -Math.PI / 2; g.add(ring); ring.userData.isOrbit = true;
        }
        // binaria Alfa Cen A–B
        if (sys.binary) {
          const b = sys.binary;
          const pts = [];
          const aA = b.a * (starById.alfacenb.M / (starById.alfacena.M + starById.alfacenb.M)), aB = b.a - aA;
          for (let k = 0; k <= 256; k++) {
            const E = k / 256 * Math.PI * 2;
            pts.push(new THREE.Vector3(-aA * (Math.cos(E) - b.e), 0, -aA * Math.sqrt(1 - b.e * b.e) * Math.sin(E)));
          }
          const la = U.makeLineV(pts, '#ffe6a8', 0.3); la.userData.isOrbit = true; S.add(la);
          const lb = U.makeLineV(pts.map((v) => v.clone().multiplyScalar(-aB / aA)), '#ffc88a', 0.3); lb.userData.isOrbit = true; S.add(lb);
          inst.binary = { b, aA, aB };
        }
        // dischi di detriti
        for (const d of sys.disks || []) {
          const r = U.rng(99), pb = new U.PointBuilder();
          for (let k = 0; k < U.q(6000); k++) {
            const R = d[0] + (d[1] - d[0]) * r(), t = r() * Math.PI * 2;
            pb.push(R * Math.cos(t), r.gauss() * R * 0.03, R * Math.sin(t), 0.75, 0.66, 0.55, 0.01 * R);
          }
          S.add(pb.build({ intensity: d[2], minPx: 1, maxPx: 3 }));
        }
        // pianeti (orbite circolari; fase e inclinazione indicative)
        for (const pl of sys.planets) {
          const host = inst.starItems[pl.host || sys.primary];
          const hostStar = starById[pl.host || sys.primary];
          const a = planetA(pl, sys);
          const Rp = pl.R || U.radiusFromMass(pl.m);
          const Teq = 278.6 * Math.pow(hostStar.L, 0.25) / Math.sqrt(a);
          let look;
          if (Rp > 6) look = { type: Teq > 700 ? 4 : 5, c1: Teq > 400 ? '#d8b890' : '#e6dcc0', c2: '#a88a68', c3: '#f0e6d0', seed: a * 10 };
          else if (Rp > 2.2) look = { type: 6, c1: '#9ab8d8', c2: '#7896c0', seed: a * 10 };
          else if (Teq > 500) look = { type: 0, c1: '#4a3028', c2: '#8a5a40', c3: '#c07048', seed: a * 10, ambient: 0.08 };
          else if (Teq > 180) look = { type: 3, c1: '#5a4a3c', c2: '#9a8a74', seed: a * 10 };
          else look = { type: 7, c1: '#dfe6ec', c2: '#b8c6d2', c3: '#8aa0b4', seed: a * 10 };
          const R_km = Rp * 6371;
          const body = U.makePlanetBody({ id: pl.id, R_km, look }, 48);
          body.group.scale.setScalar(1 / (C.AU / 1000));
          host.group.add(body.group);
          const c = U.makeCircle(a, pl.cert === 'ipo' ? '#d98cd9' : '#8fb4ff', 0.35, 256, pl.cert === 'ipo' ? a * 0.02 : 0);
          c.userData.isOrbit = true; host.group.add(c);
          const info = { name: pl.name, type: 'Esopianeta', cert: pl.cert,
            facts: [['Semiasse maggiore', U.sig(a, 3) + ' UA'], ['Periodo', pl.P ? U.sig(pl.P, 4) + ' giorni' : 'incerto'], ['Massa', U.sig(pl.m, 3) + ' masse terrestri' + (pl.note ? ' (' + pl.note + ')' : '')],
              ['Raggio', pl.R ? U.sig(pl.R, 3) + ' raggi terrestri' : '~' + U.sig(Rp, 2) + ' raggi terrestri (stima da massa)'], ['Temperatura di equilibrio (albedo 0)', '~' + Math.round(Teq) + ' K (' + Math.round(Teq - 273) + ' °C)'],
              ['Aspetto', 'illustrativo, non osservato'], ['Fase orbitale', 'indicativa']],
            desc: pl.desc, src: pl.src || [] };
          const it = inst.marker({ id: pl.id, info, pos: new THREE.Vector3(), color: pl.cert === 'ipo' ? '#d98cd9' : '#bcd4ff', px: 6, halo: 0.4, label: 2, radius: R_km / (C.AU / 1000), viewDist: R_km / (C.AU / 1000) * 8 });
          inst.planets.push({ it, body, host, a, P: pl.P || 365.25 * Math.sqrt(a * a * a / hostStar.M), phase: (pl.id.length * 1.37) % (Math.PI * 2) });
        }
      },
      update(inst, ctx) {
        const jd = ctx.jd, E = ctx.E;
        if (inst.binary) {
          const { b, aA, aB } = inst.binary;
          const year = 2000 + (jd - C.J2000) / 365.25;
          const M = ((year - b.T) / b.P) * Math.PI * 2;
          const Ean = U.solveKepler(M, b.e);
          const x = Math.cos(Ean) - b.e, z = Math.sqrt(1 - b.e * b.e) * Math.sin(Ean);
          const A = inst.starItems.alfacena, B = inst.starItems.alfacenb;
          A.pos.set(-aA * x, 0, -aA * z); B.pos.set(aB * x, 0, aB * z);
          A.group.position.copy(A.pos); B.group.position.copy(B.pos);
          A.marker.position.copy(A.pos); B.marker.position.copy(B.pos);
        }
        for (const s of Object.values(inst.starItems)) { s.marker.position.copy(s.pos); s.group.position.copy(s.pos); }
        const sunDir = new THREE.Vector3();
        for (const pl of inst.planets) {
          const th = pl.phase + (jd - C.J2000) / pl.P * Math.PI * 2;
          const local = new THREE.Vector3(pl.a * Math.cos(th), 0, -pl.a * Math.sin(th));
          pl.body.group.position.copy(local);
          pl.it.pos.copy(pl.host.pos).add(local);
          pl.it.marker.position.copy(pl.it.pos);
          sunDir.copy(local).negate().normalize();
          pl.body.update(jd, sunDir);
          const s = E.project(pl.it.pos, {});
          const rp = s ? E.radiusPx(pl.it.radius, s.d) : 0;
          pl.it.marker.material.uniforms.uOpacity.value = 1 - U.smooth(U.clamp((rp - 3) / 8, 0, 1));
        }
      },
    };
  });
})(window.U);
