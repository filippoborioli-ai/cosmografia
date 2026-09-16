// =============================================================================
//  realdata.js — decodifica dei dati reali generati da tools/fetch_data.py
//  (U.GEN.*) ed effemeridi: lune (elementi medi JPL), sonde (JPL Horizons),
//  stelle (HYG), piccoli corpi (JPL SBDB).
// =============================================================================
window.U = window.U || {};
(function (U) {
  'use strict';
  const C = U.C, D = C.DEG;
  const cache = {};

  U.b64view = function (s) {
    const bin = atob(s);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new DataView(u.buffer);
  };
  // B−V -> temperatura efficace (Ballesteros 2012)
  U.bvToTemp = (bv) => 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
  // Diametro stimato da magnitudine assoluta H e albedo geometrica p (km)
  U.diameterFromH = (H, p) => 1329 / Math.sqrt(p || 0.14) * Math.pow(10, -H / 5);

  // --- Stelle del cielo (HYG, mag <= 6.5) -------------------------------------
  U.skyStars = function () {
    if (cache.sky || !U.GEN || !U.GEN.skyStars) return cache.sky || null;
    const g = U.GEN.skyStars, dv = U.b64view(g.data), out = [];
    for (let k = 0; k < g.n; k++) {
      const o = k * 7;
      out.push({ ra: dv.getUint16(o, true) / 65535 * 360, dec: dv.getInt16(o + 2, true) / 32767 * 90, mag: dv.getUint8(o + 4) / 25 - 2, bv: dv.getInt8(o + 5) / 50, near: dv.getUint8(o + 6) === 1 });
    }
    for (const [i, name] of g.names) if (out[i]) out[i].name = name;
    return (cache.sky = out);
  };

  // --- Stelle entro 100 pc (HYG), coordinate galattiche THREE in anni luce ---
  U.nearStars = function () {
    if (cache.near || !U.GEN || !U.GEN.nearStars) return cache.near || null;
    const g = U.GEN.nearStars, dv = U.b64view(g.data);
    const PC_LY = C.pc / C.ly;
    const n = g.n, pos = new Float32Array(n * 3), absMag = new Float32Array(n), bv = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const o = k * 9;
      const gx = dv.getInt16(o, true) / 300, gy = dv.getInt16(o + 2, true) / 300, gz = dv.getInt16(o + 4, true) / 300;
      pos[k * 3] = gx * PC_LY; pos[k * 3 + 1] = gz * PC_LY; pos[k * 3 + 2] = -gy * PC_LY;
      absMag[k] = dv.getInt16(o + 6, true) / 1000;
      bv[k] = dv.getInt8(o + 8) / 50;
    }
    return (cache.near = { n, pos, absMag, bv, names: g.names });
  };

  // --- Piccoli corpi (JPL SBDB) --------------------------------------------------
  U.smallBodies = function () {
    if (cache.sb || !U.GEN || !U.GEN.smallBodies) return cache.sb || null;
    const g = U.GEN.smallBodies, dv = U.b64view(g.data), n = g.n;
    const r = { n, classes: g.classes, counts: g.counts, a: new Float32Array(n), e: new Float32Array(n), i: new Float32Array(n), node: new Float32Array(n), peri: new Float32Array(n), M0: new Float32Array(n), cls: new Uint8Array(n), H: new Float32Array(n) };
    for (let k = 0; k < n; k++) {
      const o = k * 16;
      r.a[k] = dv.getFloat32(o, true);
      r.e[k] = dv.getUint16(o + 4, true) / 65535;
      r.i[k] = dv.getUint16(o + 6, true) / 65535 * 180;
      r.node[k] = dv.getUint16(o + 8, true) / 65535 * 360;
      r.peri[k] = dv.getUint16(o + 10, true) / 65535 * 360;
      r.M0[k] = dv.getUint16(o + 12, true) / 65535 * 360;
      r.cls[k] = dv.getUint8(o + 14);
      r.H[k] = dv.getUint8(o + 15) / 10;
    }
    return (cache.sb = r);
  };

  // --- JPL Horizons: serie temporali di posizione --------------------------------
  U.hzSeries = function (id) {
    if (!U.GEN || !U.GEN.horizons || !U.GEN.horizons[id]) return null;
    return U.GEN.horizons[id];
  };
  // posizione [x,y,z] (UA, eclittica J2000) al giorno giuliano jd; fuori intervallo estrapola linearmente
  U.hzAt = function (s, jd) {
    const t = s.jd, n = t.length, X = s.xyz;
    let i;
    if (jd <= t[0]) i = 0;
    else if (jd >= t[n - 1]) i = n - 2;
    else {
      let lo = 0, hi = n - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (t[m] <= jd) lo = m; else hi = m; }
      i = lo;
    }
    const f = (jd - t[i]) / (t[i + 1] - t[i]);
    return {
      p: [X[i * 3] + (X[i * 3 + 3] - X[i * 3]) * f, X[i * 3 + 1] + (X[i * 3 + 4] - X[i * 3 + 1]) * f, X[i * 3 + 2] + (X[i * 3 + 5] - X[i * 3 + 2]) * f],
      inRange: jd >= t[0] && jd <= t[n - 1],
    };
  };

  // --- Lune: elementi medi JPL (epoca J2000) ------------------------------------
  // planetPole: [RA, Dec] IAU; retro: true se il pianeta ruota in senso retrogrado (Urano, Plutone)
  U.satAt = function (code, jd, planetPole, retro) {
    const s = U.GEN && U.GEN.sats && U.GEN.sats[code];
    if (!s) return null;
    const t = jd - C.J2000;
    const M = s.M + 360 / s.P * t;
    const w = s.w + (s.Pw ? 360 / (s.Pw * 365.25) * t : 0);
    const node = s.node - (s.Pnode ? 360 / (s.Pnode * 365.25) * t : 0);
    const E = U.solveKepler(M * D, s.e);
    const v = U.orbitalToXYZ({ a: s.a, e: s.e, i: s.i, node, peri: w }, E);
    if (s.plane === 'ecliptic') return v;
    let P = s.plane === 'laplace' && s.ra != null ? U.eqUnit(s.ra, s.dec) : U.eqUnit(planetPole[0], planetPole[1]);
    if (s.plane === 'equatorial' && retro) P = [-P[0], -P[1], -P[2]];
    let Q = [-P[1], P[0], 0];
    const nq = Math.hypot(Q[0], Q[1]) || 1; Q = [Q[0] / nq, Q[1] / nq, 0];
    const Y = [P[1] * Q[2] - P[2] * Q[1], P[2] * Q[0] - P[0] * Q[2], P[0] * Q[1] - P[1] * Q[0]];
    const eq = [0, 1, 2].map((k) => v[0] * Q[k] + v[1] * Y[k] + v[2] * P[k]);
    return U.eqToEcl(eq);
  };
  U.satElements = (code) => (U.GEN && U.GEN.sats ? U.GEN.sats[code] : null);
})(window.U);
