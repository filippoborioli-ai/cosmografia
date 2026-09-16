// =============================================================================
//  util.js — costanti fisiche, conversioni di coordinate, Keplero, cosmologia.
//  Tutto il resto del progetto dipende da questo file. Nessuna dipendenza DOM.
// =============================================================================
window.U = window.U || {};
(function (U) {
  'use strict';

  // --- Costanti (SI) ---------------------------------------------------------
  const C = U.C = {
    c: 299792458,
    km: 1e3,
    AU: 1.495978707e11,
    ly: 9.4607304725808e15,
    pc: 3.0856775814913673e16,
    kpc: 3.0856775814913673e19,
    Mpc: 3.0856775814913673e22,
    Gly: 9.4607304725808e24,
    DEG: Math.PI / 180,
    J2000: 2451545.0,
    OBLIQUITY: 23.4392911, // obliquità dell'eclittica J2000 [deg]
    R0_KPC: 8.178,         // distanza Sole–centro galattico (GRAVITY 2019)
    ZSUN_KPC: 0.0208,      // altezza del Sole sul piano galattico (Bennett & Bovy 2019)
    GM_SUN_AU3_D2: 2.959122082855911e-4, // costante gaussiana^2 [AU^3/giorno^2]
  };
  const D = C.DEG;

  // --- RNG deterministico ----------------------------------------------------
  U.rng = function (seed) {
    let a = seed >>> 0;
    const r = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.gauss = function () {
      let u = 0, v = 0;
      while (u === 0) u = r();
      while (v === 0) v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    r.range = (lo, hi) => lo + (hi - lo) * r();
    r.laplace = (s) => { const u = r() - 0.5; return -s * Math.sign(u) * Math.log(1 - 2 * Math.abs(u)); };
    r.unitVec = () => {
      const z = 2 * r() - 1, t = 2 * Math.PI * r(), s = Math.sqrt(1 - z * z);
      return [s * Math.cos(t), s * Math.sin(t), z];
    };
    return r;
  };

  // --- Rumore 3D (simplex, Gustavson) per generatori procedurali in JS -------
  U.noise3 = (function () {
    const grad = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
    const p = new Uint8Array(256), perm = new Uint8Array(512), permMod12 = new Uint8Array(512);
    const r = U.rng(1337);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; permMod12[i] = perm[i] % 12; }
    const F3 = 1 / 3, G3 = 1 / 6;
    return function (xin, yin, zin) {
      let n0, n1, n2, n3;
      const s = (xin + yin + zin) * F3;
      const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
      const t = (i + j + k) * G3;
      const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
      let i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
        else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
        else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
      } else {
        if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
        else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
        else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
      }
      const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
      const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
      const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
      const ii = i & 255, jj = j & 255, kk = k & 255;
      const dot = (g, x, y, z) => g[0] * x + g[1] * y + g[2] * z;
      let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
      n0 = t0 < 0 ? 0 : (t0 *= t0, t0 * t0 * dot(grad[permMod12[ii + perm[jj + perm[kk]]]], x0, y0, z0));
      let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
      n1 = t1 < 0 ? 0 : (t1 *= t1, t1 * t1 * dot(grad[permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]]], x1, y1, z1));
      let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
      n2 = t2 < 0 ? 0 : (t2 *= t2, t2 * t2 * dot(grad[permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]]], x2, y2, z2));
      let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
      n3 = t3 < 0 ? 0 : (t3 *= t3, t3 * t3 * dot(grad[permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]]], x3, y3, z3));
      return 32 * (n0 + n1 + n2 + n3);
    };
  })();

  // --- Angoli e coordinate ---------------------------------------------------
  // "14 29 42.9" -> gradi
  U.ra = function (s) {
    const p = String(s).trim().split(/[\s:hms]+/).filter(Boolean).map(Number);
    return 15 * (p[0] + (p[1] || 0) / 60 + (p[2] || 0) / 3600);
  };
  // "-62 40 46" -> gradi
  U.dec = function (s) {
    s = String(s).trim().replace('−', '-');
    const neg = s[0] === '-';
    const p = s.replace(/^[+-]/, '').split(/[\s:°'"dms]+/).filter(Boolean).map(Number);
    const v = p[0] + (p[1] || 0) / 60 + (p[2] || 0) / 3600;
    return neg ? -v : v;
  };

  // Matrice ICRS(equatoriale J2000) -> galattico (Hipparcos / ESA 1997)
  const EQ2GAL = [
    [-0.0548755604, -0.8734370902, -0.4838350155],
    [ 0.4941094279, -0.4448296300,  0.7469822445],
    [-0.8676661490, -0.1980763734,  0.4559837762],
  ];
  const mul3 = (M, v) => [
    M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
    M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
    M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
  ];
  U.eqUnit = (raDeg, decDeg) => [Math.cos(decDeg * D) * Math.cos(raDeg * D), Math.cos(decDeg * D) * Math.sin(raDeg * D), Math.sin(decDeg * D)];
  U.eqToGalUnit = (v) => mul3(EQ2GAL, v);
  U.eqToGal = function (raDeg, decDeg) {
    const g = mul3(EQ2GAL, U.eqUnit(raDeg, decDeg));
    let l = Math.atan2(g[1], g[0]) / D; if (l < 0) l += 360;
    return { l, b: Math.asin(Math.max(-1, Math.min(1, g[2]))) / D };
  };
  // Eclittica J2000 <-> equatoriale J2000
  const eps = C.OBLIQUITY * D, ce = Math.cos(eps), se = Math.sin(eps);
  U.eclToEq = (v) => [v[0], ce * v[1] - se * v[2], se * v[1] + ce * v[2]];
  U.eqToEcl = (v) => [v[0], ce * v[1] + se * v[2], -se * v[1] + ce * v[2]];

  // Convenzione Three.js del progetto: asse Y = polo nord del sistema di riferimento.
  //   (x, y, z)_frame -> THREE(x, z, -y)
  U.toThree = (v, s) => new THREE.Vector3(v[0] * (s || 1), v[2] * (s || 1), -v[1] * (s || 1));
  U.fromThree = (v) => [v.x, -v.z, v.y];

  // Coordinate galattiche eliocentriche -> Vector3 (unità di d)
  U.galVec = function (lDeg, bDeg, d) {
    const cl = Math.cos(lDeg * D), sl = Math.sin(lDeg * D), cb = Math.cos(bDeg * D), sb = Math.sin(bDeg * D);
    return new THREE.Vector3(d * cb * cl, d * sb, -d * cb * sl);
  };
  // RA/Dec + distanza -> Vector3 galattico eliocentrico
  U.eqVec = function (raDeg, decDeg, d) {
    const g = U.eqToGalUnit(U.eqUnit(raDeg, decDeg));
    return U.toThree(g, d);
  };
  // Eliocentrico galattico [kpc] -> galattocentrico [kpc] (il Sole sta a x = -R0)
  U.helioToGC = function (vKpc) {
    return new THREE.Vector3(vKpc.x - C.R0_KPC, vKpc.y + C.ZSUN_KPC, vKpc.z);
  };
  U.SUN_GC = () => new THREE.Vector3(-C.R0_KPC, C.ZSUN_KPC, 0);

  // Quaternione che ruota vettori espressi nel frame "eclittica THREE" nel frame "galattico THREE"
  U.eclipticToGalacticQuat = function () {
    const img = (eclVec) => U.toThree(U.eqToGalUnit(U.eclToEq(eclVec)));
    const bx = img([1, 0, 0]);          // THREE x  = ecl x
    const by = img([0, 0, 1]);          // THREE y  = ecl z
    const bz = img([0, -1, 0]);         // THREE z  = -ecl y
    const m = new THREE.Matrix4().makeBasis(bx, by, bz);
    return new THREE.Quaternion().setFromRotationMatrix(m);
  };

  // Direzione di un polo (RA/Dec equatoriale) nel frame eclittica-THREE
  U.eqDirInEclThree = (raDeg, decDeg) => U.toThree(U.eqToEcl(U.eqUnit(raDeg, decDeg)));

  // --- Tempo ----------------------------------------------------------------
  U.dateToJD = (date) => date.getTime() / 86400000 + 2440587.5;
  U.jdToDate = (jd) => new Date((jd - 2440587.5) * 86400000);
  U.gmstDeg = (jd) => {
    const T = (jd - C.J2000) / 36525;
    let g = 280.46061837 + 360.98564736629 * (jd - C.J2000) + 0.000387933 * T * T;
    return ((g % 360) + 360) % 360;
  };

  // --- Keplero ---------------------------------------------------------------
  U.solveKepler = function (M, e) {
    M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let E = e < 0.8 ? M : Math.PI;
    for (let k = 0; k < 30; k++) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-12) break;
    }
    return E;
  };
  // Elementi: {a, e, i, node, peri (argomento del perielio ω), M0 [deg], epoch [JD], n [deg/giorno]}
  // Restituisce [x,y,z] nel piano di riferimento (eclittica per il Sistema solare).
  U.orbitalToXYZ = function (el, E) {
    const a = el.a, e = el.e;
    const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const cO = Math.cos(el.node * D), sO = Math.sin(el.node * D);
    const cw = Math.cos(el.peri * D), sw = Math.sin(el.peri * D);
    const ci = Math.cos(el.i * D), si = Math.sin(el.i * D);
    return [
      (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
      (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp,
      (sw * si) * xp + (cw * si) * yp,
    ];
  };
  U.meanMotion = (aAU, massSun) => Math.sqrt(C.GM_SUN_AU3_D2 * (massSun || 1) / (aAU * aAU * aAU)) / D; // deg/giorno
  U.keplerAt = function (el, jd) {
    const n = el.n != null ? el.n : U.meanMotion(el.a, el.mass);
    const M = (el.M0 + n * (jd - el.epoch)) * D;
    return U.orbitalToXYZ(el, U.solveKepler(M, el.e));
  };
  U.orbitPath = function (el, segments) {
    const pts = [];
    segments = segments || 256;
    for (let k = 0; k <= segments; k++) pts.push(U.orbitalToXYZ(el, (k / segments) * 2 * Math.PI));
    return pts;
  };
  // Elementi JPL (Standish) a, e, I, L, ϖ, Ω con tassi per secolo -> elementi istantanei
  U.standish = function (row, jd) {
    const T = (jd - C.J2000) / 36525;
    const v = row.el.map((x, k) => x + row.rate[k] * T);
    const [a, e, I, L, lp, node] = v;
    return { a, e, i: I, node, peri: lp - node, M0: L - lp, epoch: jd, n: 0 };
  };

  // Posizione geocentrica della Luna, formule a bassa precisione (Astronomical Almanac)
  // -> [x,y,z] eclittica, km
  U.moonGeocentric = function (jd) {
    const T = (jd - C.J2000) / 36525, s = (deg) => Math.sin(deg * D), c = (deg) => Math.cos(deg * D);
    const lam = 218.32 + 481267.881 * T + 6.29 * s(134.9 + 477198.85 * T) - 1.27 * s(259.2 - 413335.38 * T)
      + 0.66 * s(235.7 + 890534.23 * T) + 0.21 * s(269.9 + 954397.70 * T) - 0.19 * s(357.5 + 35999.05 * T)
      - 0.11 * s(186.6 + 966404.05 * T);
    const bet = 5.13 * s(93.3 + 483202.03 * T) + 0.28 * s(228.2 + 960400.87 * T) - 0.28 * s(318.3 + 6003.18 * T)
      - 0.17 * s(217.6 - 407332.20 * T);
    const par = 0.9508 + 0.0518 * c(134.9 + 477198.85 * T) + 0.0095 * c(259.2 - 413335.38 * T)
      + 0.0078 * c(235.7 + 890534.23 * T) + 0.0028 * c(269.9 + 954397.70 * T);
    const r = 6378.14 / Math.sin(par * D);
    return [r * c(bet) * c(lam), r * c(bet) * s(lam), r * s(bet)];
  };

  // --- Cosmologia (Planck 2018, TT,TE,EE+lowE+lensing+BAO) ------------------
  const Cosmo = U.Cosmo = { H0: 67.66, Om: 0.3111, OL: 0.6889, Or: 9.1e-5, zCMB: 1089.9 };
  Cosmo.DH_Mpc = 299792.458 / Cosmo.H0;              // raggio di Hubble c/H0
  Cosmo.tH_Gyr = 977.792 / Cosmo.H0;                  // tempo di Hubble 1/H0
  Cosmo.E = (z) => Math.sqrt(Cosmo.Or * Math.pow(1 + z, 4) + Cosmo.Om * Math.pow(1 + z, 3) + Cosmo.OL);
  function simpson(f, a, b, n) {
    n = n || 2000; if (n % 2) n++;
    const h = (b - a) / n; let s = f(a) + f(b);
    for (let k = 1; k < n; k++) s += f(a + k * h) * (k % 2 ? 4 : 2);
    return s * h / 3;
  }
  // distanza comovente [Mpc]
  Cosmo.comoving = (z) => z <= 0 ? 0 : Cosmo.DH_Mpc * simpson((x) => { const zz = Math.exp(x) - 1; return (1 + zz) / Cosmo.E(zz); }, 0, Math.log(1 + z), 1200);
  // età dell'universo al redshift z [Gyr]
  Cosmo.age = (z) => {
    const a1 = 1 / (1 + z);
    return Cosmo.tH_Gyr * simpson((a) => a === 0 ? 0 : 1 / Math.sqrt(Cosmo.Or / (a * a) + Cosmo.Om / a + Cosmo.OL * a * a), 0, a1, 4000);
  };
  Cosmo.lookback = (z) => Cosmo.age(0) - Cosmo.age(z);
  Cosmo.particleHorizon = () => Cosmo.DH_Mpc * simpson((a) => 1 / Math.sqrt(Cosmo.Or + Cosmo.Om * a + Cosmo.OL * Math.pow(a, 4)), 0, 1, 4000);
  Cosmo.eventHorizon = () => Cosmo.DH_Mpc * simpson((u) => 1 / Math.sqrt(Cosmo.Or * Math.pow(u, 4) + Cosmo.Om * Math.pow(u, 3) + Cosmo.OL), 0, 1, 4000);
  Cosmo.MpcToGly = (m) => m * C.Mpc / C.Gly;
  // redshift da distanza comovente (bisezione) — utile per etichette
  Cosmo.zFromComoving = function (dMpc) {
    let lo = 0, hi = 1500;
    for (let k = 0; k < 60; k++) { const mid = Math.sqrt(lo * hi) || (lo + hi) / 2; if (Cosmo.comoving(mid) < dMpc) lo = mid; else hi = mid; if (hi - lo < 1e-5) break; }
    return (lo + hi) / 2;
  };

  // --- Colore del corpo nero (approssimazione di T. Helland) -----------------
  U.bbColor = function (T) {
    const t = Math.max(1000, Math.min(40000, T)) / 100;
    let r, g, b;
    if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307; }
    else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); b = 255; }
    const cl = (x) => Math.max(0, Math.min(255, x)) / 255;
    return new THREE.Color(cl(r), cl(g), cl(b));
  };
  // Temperatura efficace indicativa per classe spettrale (es. "M5.5V", "G2V", "DA2")
  U.spectralTemp = function (sp) {
    if (!sp) return 5800;
    const s = sp.trim().toUpperCase();
    if (s[0] === 'D') return 12000; // nane bianche (valore indicativo)
    const cls = s.replace(/^SD/, '')[0];
    const sub = parseFloat(s.replace(/^SD/, '').slice(1)) || 5;
    const T = { O: [42000, 30000], B: [30000, 10500], A: [9800, 7400], F: [7200, 6100], G: [6000, 5300], K: [5250, 3900], M: [3850, 2400], L: [2300, 1400], T: [1300, 600] }[cls];
    if (!T) return 5800;
    return T[0] + (T[1] - T[0]) * (sub / 10);
  };

  // --- Formattazione (italiano) ---------------------------------------------
  const nf = (x, d) => Number(x).toLocaleString('it-IT', { maximumFractionDigits: d == null ? 2 : d });
  U.nf = nf;
  U.sig = function (x, n) {
    if (x === 0 || !isFinite(x)) return String(x);
    const p = Math.floor(Math.log10(Math.abs(x)));
    const d = Math.max(0, (n || 3) - 1 - p);
    return nf(x, Math.min(d, 8));
  };
  U.sci = function (x, n) {
    if (x === 0) return '0';
    const p = Math.floor(Math.log10(Math.abs(x)));
    if (p >= -2 && p < 6) return U.sig(x, n || 3);
    const m = x / Math.pow(10, p);
    return nf(m, (n || 3) - 1) + ' × 10' + U.sup(p);
  };
  U.sup = (p) => String(p).split('').map((ch) => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' })[ch] || ch).join('');
  // distanza in metri -> stringa leggibile
  U.fmtDist = function (m) {
    const a = Math.abs(m);
    if (a < 1e6) return U.sig(m / 1e3, 3) + ' km';
    if (a < 0.05 * C.AU) return U.sci(m / 1e3, 3) + ' km';
    if (a < 0.2 * C.ly) return U.sig(m / C.AU, 3) + ' UA';
    if (a < 1e5 * C.ly) return U.sig(m / C.ly, 3) + ' anni luce';
    if (a < 1e8 * C.ly) return U.sig(m / C.ly / 1e6, 3) + ' milioni di anni luce';
    return U.sig(m / C.ly / 1e9, 3) + ' miliardi di anni luce';
  };
  U.fmtLightTime = function (m) {
    const s = Math.abs(m) / C.c;
    if (s < 60) return U.sig(s, 3) + ' s';
    if (s < 3600) return U.sig(s / 60, 3) + ' min';
    if (s < 86400 * 2) return U.sig(s / 3600, 3) + ' ore';
    const y = s / (365.25 * 86400);
    if (y < 1) return U.sig(s / 86400, 3) + ' giorni';
    if (y < 1e6) return U.sig(y, 3) + ' anni';
    if (y < 1e9) return U.sig(y / 1e6, 3) + ' milioni di anni';
    return U.sig(y / 1e9, 3) + ' miliardi di anni';
  };
  U.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smooth = (t) => t * t * (3 - 2 * t);
})(window.U);
