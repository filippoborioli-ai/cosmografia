// Collaudo headless dei livelli (senza WebGL): costruisce tutti i livelli, verifica portali, isteresi, fonti, posizioni.
// Uso: node tools/test-levels.js
const root = require("path").resolve(__dirname, "..");
global.window = global; global.THREE = require(root + '/vendor/three.min.js');
global.location = { search: '' }; global.navigator = { userAgent: 'node' };
// stesso ordine di caricamento di index.html (senza three.js e texture, che richiedono il DOM)
const html = require('fs').readFileSync(root + '/index.html', 'utf8');
const files = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map((m) => m[1]).filter((f) => !/textures\.js|ui\.js|main\.js/.test(f));
global.U = { TEX: {} };
for (const f of files) require(root + '/' + f);
const U = global.U, E = U.Engine;
const blank = new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1);
U.TEX = { earthDay: 'x', earthNight: 'x', earthClouds: 'x', moon: 'x', mars: 'x' };
U.texture = () => blank;
E.time = { jd: U.dateToJD(new Date()), speed: 0, paused: false };
E.opts = { labels: true, orbits: true, constellations: true, exaggerate: false };
E.skySun = new THREE.Object3D();
E.H = 1000; E.W = 1600; E.camera = new THREE.PerspectiveCamera(55, 1.6, 1e-6, 1e9); E.camera.position.set(0,0,10); E.camera.updateMatrixWorld();
E.ctrl = { logDist: Math.log(10) };
U.QUALITY = 0.3;
const ids = ['solar','planet:terra','planet:giove','planet:saturno','planet:urano','planet:nettuno','planet:marte','planet:plutone','planet:mercurio','planet:venere','neighborhood','exo:alfacen','exo:trappist1','exo:barnard','exo:epseri','exo:tauceti','exo:teegarden','exo:ross128','exo:luyten','exo:gj1061','exo:wolf1061','milkyway','localgroup','local','cosmos'];
const errors = [];
for (const id of ids) {
  const t0 = Date.now();
  try {
    const inst = E.instance(id);
    const def = inst.def;
    if (def.update) def.update(inst, { dt: 0.016, jd: E.time.jd, E });
    if (!inst.byId[def.focus]) errors.push(id + ': focus mancante ' + def.focus);
    for (const it of inst.items) {
      if (it.id.startsWith('hyg') && Number(it.id.slice(3)) % 500 !== 0) continue; // schede HYG generate al volo: ne campiona alcune
      if (!it.name) errors.push(id + ': item senza nome ' + it.id);
      if (!isFinite(it.pos.x) || !isFinite(it.pos.y) || !isFinite(it.pos.z)) errors.push(id + ': pos NaN ' + it.id);
      if (it.portal) { const cd = U.getLevelDef(it.portal.level); if (!cd) errors.push(id + ': portale verso livello inesistente ' + it.portal.level); else {
        const foc = it.portal.focus || cd.focus; const conv = it.portal.enterDist * def.unit.m / cd.unit.m;
        if (conv > cd.maxDist) errors.push(id + ': ' + it.id + ' enterDist convertita ' + conv + ' > maxDist figlio ' + cd.maxDist);
        void foc; } }
      for (const s of (it.info && it.info.src) || []) if (!U.SRC[s]) errors.push(id + ': fonte mancante ' + s + ' in ' + it.id);
    }
    const par = def.parent && def.parent(inst);
    if (par) { const pd = U.getLevelDef(par.level); const conv = def.maxDist * def.unit.m / pd.unit.m; const pinst = E.instances[par.level];
      if (conv < pd.minDist) errors.push(id + ': uscita sotto minDist genitore');
      console.log(id.padEnd(16), 'items', String(inst.items.length).padStart(4), 'ms', String(Date.now()-t0).padStart(5), '-> parent', par.level, 'exitDist(parent units)', conv.toPrecision(3), pinst ? '' : '(genitore non ancora costruito)');
    } else console.log(id.padEnd(16), 'items', String(inst.items.length).padStart(4), 'ms', String(Date.now()-t0).padStart(5));
  } catch (e) { errors.push(id + ': ' + e.stack.split('\n').slice(0,3).join(' | ')); }
}
// check parent focus ids exist
for (const id of ids) { const inst = E.instances[id]; if (!inst) continue; const par = inst.def.parent && inst.def.parent(inst); if (par && E.instances[par.level] && !E.instances[par.level].byId[par.focus]) errors.push(id + ': focus genitore mancante ' + par.focus); }
// exit/enter hysteresis: parent portal enterDist vs child exit
for (const id of ids) { const inst = E.instances[id]; if (!inst) continue; for (const it of inst.items) if (it.portal) { const cd = U.getLevelDef(it.portal.level); const exitInParent = cd.maxDist * cd.unit.m / inst.def.unit.m; if (exitInParent <= it.portal.enterDist) errors.push(id+': isteresi assente per '+it.id); } }
const moon = E.instances['planet:terra'].byId.luna; console.log('Luna km', moon.pos.length().toFixed(0));
const earth = E.instances['solar'].byId.terra; console.log('Terra UA', earth.pos.length().toFixed(4));
console.log(errors.length ? 'ERRORI:\n' + errors.join('\n') : 'nessun errore');
