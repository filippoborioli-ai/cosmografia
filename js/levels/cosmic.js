// =============================================================================
//  Livelli: Universo locale / Laniakea (Mpc) e Universo osservabile (Gyr-luce comoventi)
// =============================================================================
(function (U) {
  'use strict';
  const C = U.C, Co = U.Cosmo;
  const posFrom = (p) => p.ra ? U.eqVec(U.ra(p.ra), U.dec(p.dec), p.d) : U.galVec(p.l, p.b, p.d);
  const GLY_PER_MPC = C.Mpc / C.Gly;
  const ageText = (gyr) => gyr < 1 ? U.sig(gyr * 1000, 3) + ' milioni di anni' : U.sig(gyr, 3) + ' miliardi di anni';

  // --- Universo locale ---------------------------------------------------------
  U.defineLevel({
    id: 'local', name: 'Laniakea e universo locale', unit: { name: 'Mpc', m: C.Mpc },
    minDist: 0.25, maxDist: 3300, startDist: 300, startView: [1.9, 1.2], focus: 'gruppolocale_lu', sky: null, extent: 30000, nearFade: 0.05,
    parent: () => ({ level: 'cosmos', focus: 'vialattea_cosmo' }),
    build(inst) {
      const S = inst.scene;
      const nodes = [], voids = [];
      const byId = {};
      for (const o of U.LOCAL.objects) {
        const p = posFrom(o.pos); byId[o.id] = p;
        if (o.node) nodes.push({ p, w: o.node });
        if (o.void) voids.push({ p, r: o.void });
      }
      nodes.push({ p: new THREE.Vector3(), w: 0.8 });
      const sgp = U.galVec(47.37, 6.32, 1).normalize(); // polo supergalattico
      const web = U.makeCosmicWeb({
        seed: 2014, R: 420, nodes, nRandom: 1500, N: 150000, width: 2.6, voids, size: 0.9, intensity: 0.75, minPx: 1, maxPx: 5, falloff: 1.3,
        flatten: { normal: sgp, k: 0.75, scale: 70 },
        colorAt: (p, r) => { const d = p.length() / 420; const b = 0.55 + 0.45 * r(); return [(1.0 - 0.25 * d) * b, (0.9 - 0.12 * d) * b, (0.78 + 0.15 * d) * b]; },
      });
      S.add(web.points);
      // muraglie
      {
        const r = U.rng(9), pb = new U.PointBuilder();
        for (const o of U.LOCAL.objects) {
          if (!o.wall) continue;
          for (let k = 0; k < U.q(7000); k++) {
            const ra = o.wall.raFrom + (o.wall.raTo - o.wall.raFrom) * r();
            const dec = o.wall.dec + r.gauss() * 6;
            const d = o.pos.d + r.gauss() * o.pos.d * 0.05;
            const v = U.eqVec(ra, dec, d);
            pb.push(v.x, v.y, v.z, 0.95, 0.85, 0.75, 0.9 * (0.5 + r()));
          }
        }
        S.add(pb.build({ intensity: 0.7, minPx: 1, maxPx: 4, nearFade: true }));
      }
      // linee di flusso di Laniakea (schematiche)
      {
        const GA = byId.attrattore, VI = byId.virgo, CE = byId.centauro, HY = byId.hydra, PP = byId.perseopesci, SH = byId.shapley;
        const attr = [[GA, 1.0], [CE, 0.35], [HY, 0.25], [VI, 0.18]];
        const repel = [[PP, 0.55], [SH, 0.6], [byId.coma, 0.3]];
        const center = GA.clone().multiplyScalar(0.55);
        const r = U.rng(314), seg = [];
        let kept = 0;
        const acc = new THREE.Vector3(), cur = new THREE.Vector3(), tmp = new THREE.Vector3();
        const field = (p, out) => {
          out.set(0, 0, 0);
          for (const [a, w] of attr) { tmp.copy(a).sub(p); const d2 = tmp.lengthSq() + 400; out.addScaledVector(tmp, w / d2); }
          for (const [a, w] of repel) { tmp.copy(a).sub(p); const d2 = tmp.lengthSq() + 400; out.addScaledVector(tmp, -w * 0.25 / d2); }
          return out;
        };
        for (let t = 0; t < 1400 && kept < 420; t++) {
          const v = r.unitVec(); const rr = 85 * Math.cbrt(r());
          cur.set(center.x + v[0] * rr, center.y + v[2] * rr * 0.7, center.z + v[1] * rr);
          const pts = [cur.clone()];
          let ok = false;
          for (let s = 0; s < 160; s++) {
            field(cur, acc);
            if (acc.lengthSq() === 0) break;
            cur.addScaledVector(acc.normalize(), 1.6);
            pts.push(cur.clone());
            if (cur.distanceTo(GA) < 6) { ok = true; break; }
            if (cur.distanceTo(center) > 110) break;
          }
          if (!ok || pts.length < 8) continue;
          kept++;
          for (let k = 0; k < pts.length - 1; k++) seg.push(pts[k].x, pts[k].y, pts[k].z, pts[k + 1].x, pts[k + 1].y, pts[k + 1].z);
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
        const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xf2c46b, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
        lines.userData.isOrbit = true;
        S.add(lines);
        inst.marker({ id: 'laniakea', info: U.LOCAL.info.laniakea, pos: center.clone().add(new THREE.Vector3(0, 45, 0)), color: '#f2c46b', px: 6, halo: 0.4, label: 1, viewDist: 320, labelMinDist: 60 });
      }
      inst.marker({ id: 'webLocal', info: U.LOCAL.info.webLocal, pos: new THREE.Vector3(-250, 90, 180), color: '#b8b0a8', px: 4, halo: 0, opacity: 0.5, label: 3, viewDist: 900, labelMinDist: 400 });
      inst.marker({ id: 'gruppolocale_lu', info: U.LG.info.gruppolocale, pos: new THREE.Vector3(), color: '#ffe8b0', px: 9, halo: 0.8, label: 1, radius: 1.5, viewDist: 12,
        portal: { level: 'localgroup', focus: 'vialattea_lg', enterDist: 2.2 } });
      for (const o of U.LOCAL.objects) {
        const p = byId[o.id];
        const col = o.void ? '#6f8fd0' : o.cluster ? '#ffd8a0' : o.wall ? '#e8c8a0' : '#dfe6ff';
        inst.marker({ id: o.id, info: o, pos: p, color: col, px: o.cluster ? 6 : 5, halo: 0.4, label: o.label || 2, radius: o.void || 0, viewDist: Math.max(8, (o.void || 0) * 3, p.length() * 0.35),
          labelMaxDist: o.label === 3 ? 160 : null });
        if (o.void) { const w = U.makeWireSphere(o.void, '#5f7fc0', 0.12); w.position.copy(p); w.userData.isOrbit = true; inst.scene.add(w); }
      }
      // dipolo CMB
      const dip = U.galVec(264.02, 48.25, 45);
      const l = U.makeLineV([new THREE.Vector3(), dip], '#ff8a8a', 0.5, 1.5); l.userData.isOrbit = true; S.add(l);
      inst.marker({ id: 'dipolo', info: U.LOCAL.info.dipolo, pos: dip, color: '#ff8a8a', px: 5, halo: 0.2, label: 2, viewDist: 140, labelMaxDist: 700 });
      for (const R of [50, 100, 200, 300]) { const c = U.makeCircle(R, '#34466a', 0.12, 180); c.userData.isOrbit = true; S.add(c); }
    },
  });

  // --- Universo osservabile ----------------------------------------------------
  U.defineLevel({
    id: 'cosmos', name: 'Universo osservabile', unit: { name: 'miliardi di anni luce', m: C.Gly },
    minDist: 0.15, maxDist: 450, startDist: 150, startView: [0.8, 1.2], focus: 'vialattea_cosmo', sky: null, extent: 5000, nearFade: 0.05,
    parent: () => null,
    build(inst) {
      const S = inst.scene;
      const Rcmb = Co.MpcToGly(Co.comoving(Co.zCMB));
      const Rph = Co.MpcToGly(Co.particleHorizon());
      const Reh = Co.MpcToGly(Co.eventHorizon());
      const Rh = Co.MpcToGly(Co.DH_Mpc);
      const zMaxGal = 16;
      const Rgal = Co.MpcToGly(Co.comoving(zMaxGal));
      // tabella r -> z
      const zs = [], rs = [];
      for (let k = 0; k <= 160; k++) { const z = Math.pow(1 + zMaxGal, k / 160) - 1; zs.push(z); rs.push(Co.MpcToGly(Co.comoving(z))); }
      const zOf = (rr) => { let i = 1; while (i < rs.length - 1 && rs[i] < rr) i++; const t = (rr - rs[i - 1]) / (rs[i] - rs[i - 1] || 1); return zs[i - 1] + t * (zs[i] - zs[i - 1]); };

      // rete cosmica procedurale (rumore "ridged")
      {
        const r = U.rng(1337), pb = new U.PointBuilder();
        const N = U.q(170000);
        let tries = 0;
        while (pb.count < N && tries++ < N * 40) {
          const v = r.unitVec(); const rr = Rgal * Math.cbrt(r());
          const x = v[0] * rr, y = v[2] * rr, z = v[1] * rr;
          const f = 0.55;
          const n1 = 1 - Math.abs(U.noise3(x * f, y * f, z * f));
          const n2 = 1 - Math.abs(U.noise3(x * f * 2.3 + 7, y * f * 2.3, z * f * 2.3));
          const dens = Math.pow(n1, 7) * (0.6 + 0.4 * Math.pow(n2, 3));
          const zz = zOf(rr);
          const evo = zz < 2.5 ? 1 : Math.exp(-(zz - 2.5) / 3.2);
          if (r() > dens * evo * 1.6) continue;
          const t = Math.min(1, zz / 8);
          const b = (0.45 + 0.55 * r()) * (1 - 0.45 * Math.min(1, rr / Rgal));
          pb.push(x, y, z, (1.0 - 0.4 * t) * b, (0.9 - 0.15 * t) * b, (0.8 + 0.2 * t) * b, 0.07 * (0.6 + r()));
        }
        S.add(pb.build({ intensity: 1.25, minPx: 1, maxPx: 5, falloff: 1.0, nearFade: true }));
      }
      // fondo cosmico
      const cmbMat = new THREE.ShaderMaterial({ uniforms: { uOpacity: { value: 0.9 } }, vertexShader: U.SH.cmbVert, fragmentShader: U.SH.cmbFrag, side: THREE.BackSide, transparent: true, depthWrite: false });
      const cmb = new THREE.Mesh(new THREE.SphereGeometry(Rcmb, 160, 110), cmbMat);
      cmb.renderOrder = -1;
      S.add(cmb);
      inst.cmb = cmb; inst.Rcmb = Rcmb;
      inst.marker({ id: 'cmb', info: U.COSMIC.info.cmb, pos: new THREE.Vector3(0, Rcmb, 0), color: '#ffb070', px: 6, halo: 0.3, label: 1, viewDist: 150 });
      const ph = U.makeWireSphere(Rph, '#9ab0e0', 0.14); ph.userData.isOrbit = true; S.add(ph);
      inst.marker({ id: 'osservabile', info: U.COSMIC.info.osservabile, pos: new THREE.Vector3(Rph * 0.72, -Rph * 0.69, 0), color: '#c8d4f0', px: 6, halo: 0.3, label: 1, viewDist: 170 });
      const eh = U.makeWireSphere(Reh, '#e08a8a', 0.16); eh.userData.isOrbit = true; S.add(eh);
      inst.marker({ id: 'event_horizon', info: Object.assign({}, U.COSMIC.info.event_horizon, { facts: [['Raggio comovente', U.sig(Reh, 3) + ' miliardi di anni luce']] }), pos: new THREE.Vector3(-Reh * 0.7, Reh * 0.71, 0), color: '#e08a8a', px: 5, halo: 0.2, label: 2, viewDist: 60 });
      const hs = U.makeWireSphere(Rh, '#8ad0b0', 0.16); hs.userData.isOrbit = true; S.add(hs);
      inst.marker({ id: 'hubble_sphere', info: Object.assign({}, U.COSMIC.info.hubble_sphere, { facts: [['Raggio', 'c/H₀ = ' + U.sig(Rh, 3) + ' miliardi di anni luce']] }), pos: new THREE.Vector3(0, -Rh, 0), color: '#8ad0b0', px: 5, halo: 0.2, label: 2, viewDist: 55 });
      inst.marker({ id: 'eta_oscure', info: U.COSMIC.info.eta_oscure, pos: new THREE.Vector3(0, 0, (Rgal + Rcmb) / 2), color: '#7070a0', px: 4, halo: 0, opacity: 0.6, label: 2, viewDist: 130 });
      inst.marker({ id: 'web', info: U.COSMIC.info.web, pos: new THREE.Vector3(Rgal * 0.45, Rgal * 0.2, -Rgal * 0.3), color: '#c0b8b0', px: 4, halo: 0, opacity: 0.5, label: 3, viewDist: 60 });

      // Hubble Ultra Deep Field: cono stretto (apertura esagerata per visibilità)
      {
        const dir = U.eqVec(U.ra('03 32 39'), U.dec('-27 47 29'), 1).normalize();
        const len = Co.MpcToGly(Co.comoving(12));
        const a = new THREE.Vector3(0, 1, 0).cross(dir).normalize().multiplyScalar(len * 0.03);
        const b = new THREE.Vector3().crossVectors(dir, a).normalize().multiplyScalar(len * 0.03);
        const tip = dir.clone().multiplyScalar(len);
        const seg = [];
        for (const off of [a.clone().add(b), a.clone().sub(b), a.clone().negate().add(b), a.clone().negate().sub(b)]) { const e = tip.clone().add(off); seg.push(0, 0, 0, e.x, e.y, e.z); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
        const cone = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.35, depthWrite: false }));
        cone.userData.isOrbit = true; S.add(cone);
        inst.marker({ id: 'hudf', info: U.COSMIC.info.hudf, pos: tip, color: '#9fd8ff', px: 5, halo: 0.2, label: 2, viewDist: 30 });
      }

      // Oggetti a redshift noto
      for (const o of U.COSMIC.objects) {
        const dMpc = Co.comoving(o.pos.z);
        const dG = Co.MpcToGly(dMpc);
        const pos = U.eqVec(U.ra(o.pos.ra), U.dec(o.pos.dec), dG);
        const col = o.cert === 'ipo' ? '#d98cd9' : o.pos.z > 5 ? '#9fc4ff' : '#ffd8a0';
        const it = inst.marker({ id: o.id, info: o, pos, color: col, px: 6, halo: 0.4, label: o.label || 2, radius: 0, viewDist: Math.max(3, (o.size || 0) * 2.5) });
        it.dynamicFacts = () => {
          const z = o.pos.z;
          return [['Distanza comovente (oggi)', U.sig(dG, 3) + ' miliardi di anni luce'], ['Tempo di viaggio della luce', U.sig(Co.lookback(z), 3) + ' miliardi di anni'],
            ['Età dell\'universo all\'emissione', ageText(Co.age(z))], ['Distanza all\'emissione', U.sig(dG / (1 + z), 3) + ' miliardi di anni luce']];
        };
        if (o.size) {
          const r = U.rng(o.id.length * 17), pb = new U.PointBuilder();
          const u = new THREE.Vector3(0, 1, 0).cross(pos).normalize(), w = new THREE.Vector3().crossVectors(pos.clone().normalize(), u);
          for (let k = 0; k < 900; k++) {
            const t = r.gauss() * o.size * 0.35, s = r.gauss() * o.size * 0.12, q = r.gauss() * o.size * 0.08;
            const p = pos.clone().addScaledVector(u, t).addScaledVector(w, s).addScaledVector(pos.clone().normalize(), q);
            pb.push(p.x, p.y, p.z, 0.85, 0.55, 0.85, 0.08);
          }
          S.add(pb.build({ intensity: 0.5, minPx: 1, maxPx: 4 }));
        }
      }
      inst.marker({ id: 'vialattea_cosmo', info: Object.assign({}, U.MW.info.vialattea, { name: 'Via Lattea (Tu sei qui)', desc: 'Al centro della sfera osservabile c\'è l\'osservatore: noi. Zooma o premi "Entra" per scendere verso Laniakea, il Gruppo Locale e la Via Lattea.' }),
        pos: new THREE.Vector3(), color: '#ffe066', px: 9, halo: 1, label: 1, radius: 0, viewDist: 4, portal: { level: 'local', focus: 'gruppolocale_lu', enterDist: 1.1 } });
      void GLY_PER_MPC;
    },
    // Dall'esterno il fondo cosmico è un velo tenue (si vede la rete dentro); dall'interno torna pieno
    update(inst, ctx) {
      const d = ctx.E.camera.position.length();
      const target = d > inst.Rcmb * 1.02 ? 0.2 : 0.85;
      const u = inst.cmb.material.uniforms.uOpacity;
      u.value += (target - u.value) * Math.min(1, ctx.dt * 4 || 1);
    },
  });
})(window.U);
