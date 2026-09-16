// =============================================================================
//  bodies.js — corpo planetario riutilizzabile (sfera + atmosfera + anelli) in km.
//  Orientamento da polo IAU (RA/Dec) e angolo del meridiano W(t).
// =============================================================================
window.U = window.U || {};
(function (U) {
  'use strict';
  const C = U.C;
  U.AU_KM = C.AU / 1000;

  U.makePlanetBody = function (p, segs) {
    const R = p.R_km;
    const group = new THREE.Group();
    const geo = new THREE.SphereGeometry(R, segs || 96, Math.round((segs || 96) * 0.66));
    const mat = U.planetMaterial(p.look || { type: 0 });
    const spin = new THREE.Mesh(geo, mat);
    group.add(spin);
    const mats = [mat];
    let atmo = null, ring = null, ringMat = null;
    if (p.atmo) {
      const k = p.id === 'titano' ? 1.08 : p.id === 'terra' ? 1.025 : 1.02;
      const am = U.atmoMaterial(p.atmo[0], p.atmo[1]);
      atmo = new THREE.Mesh(new THREE.SphereGeometry(R * k, 64, 48), am);
      group.add(atmo); mats.push(am);
    }
    if (p.ring != null) {
      const spans = { 0: [66000, 141000], 1: [41000, 52000], 2: [40000, 64000], 3: [90000, 228000] }[p.ring];
      const color = { 0: '#e6d6b4', 1: '#9aa4aa', 2: '#8c95a8', 3: '#b8a48c' }[p.ring];
      ringMat = U.ringMaterial(p.ring, color, R);
      ring = new THREE.Mesh(new THREE.RingGeometry(spans[0], spans[1], 256, 1), ringMat);
      ring.rotation.x = -Math.PI / 2;
      const ringFrame = new THREE.Group();
      ringFrame.add(ring);
      group.add(ringFrame);
      group.userData.ringFrame = ringFrame;
    }
    const body = { group, spin, atmo, ring, ringMat, mats, R };
    const tmpC = new THREE.Vector3();
    body.update = function (jd, sunDirWorld) {
      const d = jd - C.J2000;
      let q;
      if (p.earth) q = U.bodyQuaternion(0, 90, 0, U.gmstDeg(jd));
      else if (p.pole) q = U.bodyQuaternion(p.pole[0], p.pole[1], p.W ? p.W[0] + p.W[1] * d : 0);
      if (q) spin.quaternion.copy(q);
      if (group.userData.ringFrame && p.pole) {
        if (!body._ringQ) body._ringQ = U.bodyQuaternion(p.pole[0], p.pole[1], 0);
        group.userData.ringFrame.quaternion.copy(body._ringQ);
      }
      for (const m of mats) m.uniforms.uSunDir.value.copy(sunDirWorld);
      if (ringMat) {
        ringMat.uniforms.uSunDir.value.copy(sunDirWorld);
        group.getWorldPosition(tmpC);
        ringMat.uniforms.uCenter.value.copy(tmpC);
        const ws = new THREE.Vector3(); group.getWorldScale(ws);
        ringMat.uniforms.uR.value = R * ws.x;
      }
    };
    return body;
  };

  // Stella come sfera luminosa + marcatore (unità del livello: scale = km per unità)
  U.makeStarBody = function (R_km, tempK, kmPerUnit) {
    const col = U.bbColor(tempK);
    const c1 = col.clone().lerp(new THREE.Color('#ffffff'), 0.55), c2 = col.clone().multiplyScalar(0.85);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(R_km / kmPerUnit, 64, 48), U.sunMaterial('#' + c1.getHexString(), '#' + c2.getHexString()));
    return mesh;
  };

  // Stima raggio (raggi terrestri) da massa (masse terrestri) — relazione tipo Chen & Kipping (2017)
  U.radiusFromMass = (m) => m <= 2 ? Math.pow(m, 0.279) : m < 130 ? Math.pow(2, 0.279) * Math.pow(m / 2, 0.589) : 11.2;
})(window.U);
