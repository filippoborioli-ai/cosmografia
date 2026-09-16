// =============================================================================
//  Livelli: Via Lattea (kpc, galattocentrico) e Gruppo Locale (kpc)
// =============================================================================
(function (U) {
  'use strict';
  const C = U.C, D = C.DEG;

  const posFrom = (p) => p.ra ? U.eqVec(U.ra(p.ra), U.dec(p.dec), p.d) : U.galVec(p.l, p.b, p.d);

  // Parametri della Via Lattea per il generatore
  function mwParams(scale) {
    const s = scale || 1;
    return {
      seed: 42, Rd: 2.6, Rmax: 17, Rin: 2.8, armRin: 3.4, armWidth: 1.5, armScale: 3.4, hz: 0.3, size: 0.07 * (s < 1 ? 2.2 : 1),
      nDisk: 160000 * s, nArm: 170000 * s, nBulge: 26000 * s, nHalo: 7000 * s, nDust: 30000 * s, dustPerArm: 0.12, hiiRate: s < 1 ? 0 : 0.01,
      bulgeR: 0.9, bulgeFlat: 0.6,
      bar: { n: 42000 * s, len: 5.0, width: 1.3, height: 0.45, angle: 27 },
      arms: U.MW.arms,
      intensity: s < 1 ? 1.6 : 1, minPx: 1, maxPx: s < 1 ? 3 : 5, nearFade: true, dustOpacity: s < 1 ? 0.06 : 0.1,
    };
  }

  // --- Via Lattea ----------------------------------------------------------------
  U.defineLevel({
    id: 'milkyway', name: 'Via Lattea', unit: { name: 'kpc', m: C.kpc },
    minDist: 0.003, maxDist: 480, startDist: 42, startView: [2.35, 0.72], focus: 'vialattea', sky: null, extent: 3000, nearFade: 0.08,
    parent: () => ({ level: 'localgroup', focus: 'vialattea_lg' }),
    build(inst) {
      const S = inst.scene;
      const gal = U.makeGalaxy(mwParams(1));
      S.add(gal);

      inst.gal = inst.add({ id: 'vialattea', info: U.MW.info.vialattea, pos: new THREE.Vector3(), radius: 15, viewDist: 42, label: 1, labelMinDist: 20 });
      inst.sgra = inst.marker({ id: 'sgra', info: U.MW.info.sgra, pos: new THREE.Vector3(0, 0, 0), color: '#ffd9a0', px: 7, halo: 0.8, label: 1, radius: 0, viewDist: 0.6, labelMaxDist: 20 });
      inst.marker({ id: 'barra', info: U.MW.info.barra, pos: new THREE.Vector3(-4.2 * Math.cos(27 * D), 0, -4.2 * Math.sin(27 * D)), color: '#ffc880', px: 4, halo: 0, opacity: 0.5, label: 2, viewDist: 14, labelMaxDist: 60 });
      const sun = U.SUN_GC();
      inst.marker({ id: 'sole_mw', info: U.MW.info.sole_mw, pos: sun, color: '#ffe066', px: 9, halo: 0.9, label: 1, radius: 0, viewDist: 1.2,
        portal: { level: 'neighborhood', focus: 'sole', enterDist: 0.03 } });

      // Bolla Locale
      const lb = U.makeWireSphere(0.15, '#c890ff', 0.18); lb.position.copy(sun); S.add(lb); lb.userData.isOrbit = true;
      inst.marker({ id: 'bollalocale', info: U.MW.info.bollalocale, pos: sun.clone().add(new THREE.Vector3(0, 0.15, 0)), color: '#c890ff', px: 4, halo: 0, opacity: 0.6, label: 2, viewDist: 0.6, labelMaxDist: 1.2 });

      // Bracci: etichette nel punto medio del tratto misurato
      for (const a of U.MW.arms) {
        const bm = ((a.meas[0] + a.meas[1]) / 2) * D;
        const R = a.Rref * Math.exp(-(bm - a.bref * D) * Math.tan(a.pitch * D));
        const info = { name: a.name, type: 'Braccio a spirale', cert: 'mod',
          facts: [['Angolo di avvolgimento (pitch)', U.nf(a.pitch, 1) + '°'], ['Raggio di riferimento', U.nf(a.Rref, 1) + ' kpc'], ['Tratto misurato (azimut)', a.meas[0] + '° → ' + a.meas[1] + '°'], ['Larghezza tipica', '~' + U.nf(a.w / 1.4, 2) + ' kpc']],
          desc: 'Braccio tracciato con le parallassi trigonometriche VLBI dei maser associati a regioni di formazione di stelle massicce (Reid et al. 2014). La forma è una spirale logaritmica; il tratto disegnato oltre l\'intervallo misurato è un\'estrapolazione.' + (a.id === 'local' ? ' Il Sole si trova nel Braccio di Orione, uno sperone più corto dei bracci principali; lungo di esso corre l\'Onda di Radcliffe, una struttura ondulata di nubi di gas lunga ~2,7 kpc (Alves et al. 2020).' : ''),
          src: a.id === 'local' ? ['reid2014', 'reid2019', 'alves2020'] : ['reid2014', 'reid2019'] };
        inst.marker({ id: 'arm_' + a.id, info, pos: new THREE.Vector3(-R * Math.cos(bm), 0.25, -R * Math.sin(bm)), color: a.color, px: 3, halo: 0, opacity: 0.4, label: 2, viewDist: 12, labelMaxDist: a.id === 'local' ? 12 : 80, labelMinDist: a.id === 'local' ? 0.4 : 3 });
      }

      // Oggetti notevoli
      for (const o of U.MW.objects) {
        const pos = U.helioToGC(posFrom(o.pos));
        const d = o.pos.d;
        inst.marker({ id: o.id, info: o, pos, color: o.color, px: 5, halo: 0.5, label: d < 0.5 ? 3 : 2, radius: 0, viewDist: Math.max(0.05, d * 0.3), labelMaxDist: d < 0.5 ? 2.5 : 25 });
      }

      // Satelliti visibili dal disco (i dettagli nel Gruppo Locale)
      for (const gid of ['lmc', 'smc', 'sgrdsph']) {
        const g = U.LG.galaxies.find((x) => x.id === gid);
        const pos = U.helioToGC(posFrom(g.pos));
        const cloud = U.makeGalaxy(Object.assign({ seed: gid.length * 7, Rd: g.R * 0.4, Rmax: g.R, hz: g.R * 0.2, size: 0.08, intensity: 0.9, minPx: 1, maxPx: 3, nearFade: true },
          gid === 'sgrdsph' ? { plummer: { n: 4000, a: 0.8, flat: 0.5 } } : { clumps: [{ n: gid === 'lmc' ? 9000 : 4000, x: 0, y: 0, z: 0, sx: g.R * 0.35, sy: g.R * 0.15, sz: g.R * 0.25, color: [0.85, 0.9, 1.0] }] }));
        cloud.position.copy(pos); S.add(cloud);
        inst.marker({ id: gid + '_mw', info: g, pos, color: '#dfe8ff', px: 5, halo: 0.3, label: 2, radius: g.R, viewDist: g.R * 6 });
      }

      // Ammassi globulari: reali (sopra) + distribuzione statistica
      {
        const r = U.rng(77), pb = new U.PointBuilder();
        for (let k = 0; k < 150; k++) {
          const u = r();
          const rr = Math.min(1 / Math.pow(1 - u * 0.97, 1 / 2.5) * 1.2, 45);
          const v = r.unitVec();
          pb.push(v[0] * rr, v[2] * rr * 0.85, v[1] * rr, 1.0, 0.85, 0.55, 0.09);
        }
        S.add(pb.build({ intensity: 1.0, minPx: 2.2, maxPx: 5, falloff: 0.3 }));
        inst.marker({ id: 'globulari', info: U.MW.info.globulari, pos: new THREE.Vector3(0, 18, 0), color: '#ffd28a', px: 3, halo: 0, opacity: 0.4, label: 3, viewDist: 90, labelMinDist: 40 });
      }

      // Bolle di Fermi (schematiche)
      {
        const r = U.rng(5), pb = new U.PointBuilder();
        for (let k = 0; k < U.q(9000); k++) {
          const up = r() < 0.5 ? 1 : -1;
          const v = r.unitVec();
          const shell = 0.8 + 0.2 * Math.sqrt(r());
          const x = v[0] * 3.6 * shell, z = v[1] * 3.6 * shell, y = (v[2] * 4.2 * shell + 4.6) * up;
          pb.push(x, y, z, 0.75, 0.45, 0.95, 0.35);
        }
        const fb = pb.build({ intensity: 0.1, minPx: 1, maxPx: 6 });
        S.add(fb); fb.userData.isOrbit = true;
        inst.fermiPts = fb;
        inst.marker({ id: 'fermi', info: U.MW.info.fermi, pos: new THREE.Vector3(0, 9.2, 0), color: '#c08cf0', px: 4, halo: 0, opacity: 0.5, label: 2, viewDist: 45, labelMinDist: 12 });
      }

      // Alone di materia oscura + anelli galattocentrici
      const halo = U.makeWireSphere(220, '#6078a8', 0.1); halo.userData.isOrbit = true; S.add(halo);
      inst.marker({ id: 'alone', info: U.MW.info.alone, pos: new THREE.Vector3(0, 220, 0), color: '#6078a8', px: 4, halo: 0, opacity: 0.6, label: 2, viewDist: 800, labelMinDist: 120 });
      for (const R of [5, 10, 15, 20]) { const c = U.makeCircle(R, '#34466a', 0.16, 180); c.userData.isOrbit = true; S.add(c); }
    },
    update(inst, ctx) {
      const d = ctx.E.dist();
      inst.gal.pickable = d > 12;
      inst.sgra.pickable = d < 30;
      // le bolle di Fermi si leggono di taglio; viste dall'alto velerebbero il disco
      const edge = Math.pow(Math.sin(ctx.E.ctrl.phi), 6);
      inst.fermiPts.material.uniforms.uIntensity.value = 0.035 * edge;
    },
  });

  // --- Gruppo Locale -------------------------------------------------------------
  function galaxyFor(g) {
    const n = g.n || 0.05;
    if (g.kind === 'spiral') {
      const arms = [];
      const nA = g.id === 'm33' ? 4 : 2;
      for (let k = 0; k < nA; k++) arms.push({ Rref: g.Rd * 1.6, bref: k * 360 / nA, pitch: g.id === 'm33' ? 22 : 11, bmin: k * 360 / nA - 160, bmax: k * 360 / nA + 260, w: g.Rd * 0.22, strength: 1 });
      return U.makeGalaxy({
        seed: g.id.length * 13 + 1, Rd: g.Rd, Rmax: g.R, Rin: g.Rd * 0.3, hz: g.Rd * 0.08, size: g.R * 0.012,
        nDisk: 60000 * n, nArm: 50000 * n, nBulge: 22000 * n * (g.id === 'm31' ? 1.4 : 0.3), nHalo: 700 * n, haloR: g.R * 0.8, nDust: 8000 * n, dustPerArm: 0.1,
        bulgeR: g.Rd * 0.3, bulgeFlat: 0.7, arms, ring: g.id === 'm31' ? { R: 10, w: 1.1, n: 22000 * n } : null,
        intensity: 1.7, minPx: 1, maxPx: 4, nearFade: true, dustOpacity: 0.07,
        colors: { young: [0.7, 0.8, 1.0] },
      });
    }
    if (g.kind === 'irregular') {
      const clumps = [];
      const r = U.rng(g.id.length * 31);
      const nc = g.id === 'lmc' ? 9 : 6;
      for (let k = 0; k < nc; k++) clumps.push({ n: (g.id === 'lmc' ? 26000 : 9000) * n * (0.5 + r()), x: r.gauss() * g.R * 0.35, y: r.gauss() * g.R * 0.06, z: r.gauss() * g.R * 0.25, sx: g.R * (0.12 + 0.2 * r()), sy: g.R * 0.05, sz: g.R * (0.1 + 0.15 * r()), color: r() < 0.5 ? [0.72, 0.82, 1.0] : [1.0, 0.92, 0.8] });
      if (g.id === 'lmc') clumps.push({ n: 30000 * n, x: -0.6, y: 0, z: 0.2, sx: 1.4, sy: 0.2, sz: 0.35, color: [1.0, 0.88, 0.7] });
      return U.makeGalaxy({ seed: g.id.length * 5, Rd: 1, Rmax: g.R, hz: 0.1, size: g.R * 0.014, clumps, intensity: 1.6, minPx: 1, maxPx: 4, nearFade: true });
    }
    return U.makeGalaxy({ seed: g.id.length * 3 + 2, Rd: 1, Rmax: g.R, hz: 0.1, size: g.R * 0.02, plummer: { n: g.kind === 'elliptical' ? 5000 : 2500, a: g.R * 0.3, flat: g.kind === 'elliptical' ? 0.8 : 0.7 }, intensity: 1.4, minPx: 1, maxPx: 3, nearFade: true, colors: { old: [1.0, 0.9, 0.75] } });
  }

  U.defineLevel({
    id: 'localgroup', name: 'Gruppo Locale', unit: { name: 'kpc', m: C.kpc },
    minDist: 2, maxDist: 6500, startDist: 1500, startView: [2.8, 0.95], focus: 'gruppolocale', sky: null, extent: 50000, nearFade: 0.06,
    parent: () => ({ level: 'local', focus: 'gruppolocale_lu' }),
    build(inst) {
      const S = inst.scene;
      const mw = U.makeGalaxy(mwParams(0.22));
      S.add(mw);
      inst.add({ id: 'vialattea_lg', info: U.MW.info.vialattea, pos: new THREE.Vector3(), radius: 15, viewDist: 90, label: 1,
        portal: { level: 'milkyway', focus: 'sole_mw', enterDist: 150 } });
      let m31pos = null;
      for (const g of U.LG.galaxies) {
        const pos = U.helioToGC(posFrom(g.pos));
        const obj = galaxyFor(g);
        obj.position.copy(pos);
        if (g.inc != null) {
          const ra = g.ra ? U.ra(g.ra) : (g.pos.ra ? U.ra(g.pos.ra) : null);
          const dec = g.dec ? U.dec(g.dec) : (g.pos.dec ? U.dec(g.pos.dec) : null);
          if (ra != null) obj.quaternion.copy(U.diskQuaternion(ra, dec, g.inc, g.pa));
        } else {
          const r = U.rng(g.id.length * 97);
          obj.rotation.set(r() * 3, r() * 3, r() * 3);
        }
        S.add(obj);
        if (g.id === 'm31') m31pos = pos;
        inst.marker({ id: g.id, info: g, pos, color: g.color, px: g.label === 1 ? 5 : 4, halo: 0.2, opacity: 0.8, label: g.label, radius: g.R, viewDist: g.R * 5,
          labelMaxDist: g.label === 3 ? 1400 : null });
      }
      const bary = m31pos.clone().multiplyScalar(0.5);
      inst.marker({ id: 'baricentro', info: U.LG.info.baricentro, pos: bary, color: '#9ab0d8', px: 4, halo: 0, opacity: 0.6, label: 3, viewDist: 900, labelMinDist: 600 });
      inst.add({ id: 'gruppolocale', info: U.LG.info.gruppolocale, pos: bary.clone(), radius: 0, viewDist: 2600, label: 1, labelMinDist: 1800, pickable: false });
      const zv = U.makeWireSphere(1000, '#5870a0', 0.1); zv.position.copy(bary); zv.userData.isOrbit = true; S.add(zv);
      // aloni scuri indicativi
      for (const [p, R] of [[new THREE.Vector3(), 250], [m31pos, 290]]) { const h = U.makeCircle(R, '#40507a', 0.18, 128, 8); h.position.copy(p); h.userData.isOrbit = true; S.add(h); }
    },
  });
})(window.U);
