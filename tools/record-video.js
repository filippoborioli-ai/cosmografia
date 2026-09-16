#!/usr/bin/env node
// =============================================================================
//  record-video.js — video di presentazione: dal bordo dell'universo osservabile
//  alla Terra, attraversando tutti i livelli di scala.
//
//  Rendering deterministico: requestAnimationFrame e performance.now vengono
//  sostituiti da un orologio virtuale, quindi ogni fotogramma avanza di 1/FPS s
//  indipendentemente dalla velocità della GPU. Poi dissolvenze ai cambi di livello
//  (Python + Pillow) e codifica H.264 con ffmpeg.
//
//  Requisiti (non inclusi nel repo): npm i puppeteer-core@23 ffmpeg-static@5 in una
//  cartella qualsiasi, indicata con MODULES; Chrome installato; Python con Pillow.
//  Uso:  MODULES=/percorso/node_modules node tools/record-video.js [uscita.mp4]
// =============================================================================
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const MOD = process.env.MODULES || path.join(process.cwd(), 'node_modules');
const puppeteer = require(path.join(MOD, 'puppeteer-core'));
const ffmpeg = require(path.join(MOD, 'ffmpeg-static'));

const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'video', 'cosmografia-presentazione.mp4'));
const WORK = path.join(path.dirname(OUT), '_frames');
const FPS = 30, W = 1920, H = 1080;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(WORK, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force_high_performance_gpu', `--window-size=${W},${H}`],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('pageerror:', e.message));

  // orologio virtuale
  await page.evaluateOnNewDocument(() => {
    let vt = 0, queue = [];
    performance.now = () => vt;
    window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
    window.__step = (ms) => { vt += ms; const q = queue; queue = []; for (const cb of q) cb(vt); };
  });
  const url = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/').replace(/ /g, '%20') + '?q=1.6';
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.U && U.Engine && U.Engine.cur && U.TEX && U.TEX.moon, { timeout: 120000 });

  const gpu = await page.evaluate(async () => {
    const E = U.Engine;
    document.getElementById('intro').hidden = true;
    const css = document.createElement('style');
    css.textContent = `
      .topbar,.scale,.readout,.timebar,.info,.tripbar,.portal-hint,.toast,#sel-ring,#fade{display:none!important}
      #scene.dip{animation:none}
      .lbl.r2,.lbl.r3{display:none}
      .cine{position:fixed;inset:0;pointer-events:none;font-family:'IBM Plex Sans',system-ui,sans-serif;color:#ece8de;text-shadow:0 0 12px rgba(0,0,0,.9),0 0 3px rgba(0,0,0,.9)}
      .cine .shade{position:absolute;left:0;right:0;bottom:0;height:420px;background:linear-gradient(to top,rgba(2,3,8,.82),rgba(2,3,8,0))}
      .cine .title{position:absolute;inset:0;display:grid;place-content:center;text-align:center;gap:14px;background:radial-gradient(ellipse 55% 45% at center,rgba(2,3,8,.78),rgba(2,3,8,0))}
      .cine .title h1{font-family:'Spectral',Georgia,serif;font-style:italic;font-weight:400;font-size:112px;margin:0;letter-spacing:-.01em}
      .cine .title p{margin:0;font-size:26px;color:#bdb9ae;letter-spacing:.02em}
      .cine .title small{font-family:'IBM Plex Mono',monospace;font-size:16px;color:#8b8fa2;letter-spacing:.08em;text-transform:uppercase;margin-top:18px}
      .cine .cap{position:absolute;left:96px;bottom:92px;max-width:900px}
      .cine .eyebrow{font-family:'IBM Plex Mono',monospace;font-size:17px;letter-spacing:.14em;text-transform:uppercase;color:#f3c06b}
      .cine .cap h2{font-family:'Spectral',Georgia,serif;font-weight:400;font-style:italic;font-size:76px;line-height:1.05;margin:10px 0 12px}
      .cine .cap p{margin:0;font-size:25px;line-height:1.45;color:#d6d2c8}
      .cine .dist{position:absolute;right:96px;bottom:96px;text-align:right;font-family:'IBM Plex Mono',monospace}
      .cine .dist b{display:block;font-weight:400;font-size:34px;color:#ece8de}
      .cine .dist span{font-size:16px;letter-spacing:.12em;text-transform:uppercase;color:#8b8fa2}
      .cine .end{position:absolute;inset:0;display:grid;place-content:center;text-align:center;gap:16px;background:rgba(4,5,10,.72)}
      .cine .end h1{font-family:'Spectral',Georgia,serif;font-style:italic;font-weight:400;font-size:100px;margin:0}
      .cine .end p{margin:0;font-size:28px;color:#bdb9ae}
      .cine .end code{font-family:'IBM Plex Mono',monospace;font-size:26px;color:#f3c06b;margin-top:22px}`;
    document.head.appendChild(css);
    const cine = document.createElement('div');
    cine.className = 'cine';
    cine.innerHTML = `
      <div class="shade" id="c-shade"></div>
      <div class="title" id="c-title"><h1>Cosmografia</h1><p>l'universo come lo leggo io</p><small>Dati reali · JPL · Planck · Gaia/HYG · NASA</small></div>
      <div class="cap" id="c-cap"><div class="eyebrow" id="c-eye"></div><h2 id="c-h"></h2><p id="c-p"></p></div>
      <div class="dist" id="c-dist"><span>distanza di vista</span><b id="c-d"></b></div>
      <div class="end" id="c-end"><h1>Cosmografia</h1><p>Dal bordo dell'universo osservabile alla Terra: 27 ordini di grandezza, costruiti su dati reali.</p><code>filippoborioli-ai.github.io/cosmografia</code></div>`;
    document.body.appendChild(cine);
    await document.fonts.ready;

    // livelli costruiti prima di registrare (niente schermate di caricamento)
    for (const id of ['cosmos', 'local', 'localgroup', 'milkyway', 'neighborhood', 'solar', 'planet:terra']) E.instance(id);
    E.time.speed = 60 / 86400;
    E.tripSpeed = 0.4;
    E.opts.constellations = false;
    E.switchTo('cosmos', { focus: 'vialattea_cosmo', dist: 190, select: false }, true);
    E.ctrl.theta = E.ctrl.goalTheta = 0.9; E.ctrl.phi = E.ctrl.goalPhi = 1.25;

    const CAP = {
      cosmos: ['Universo osservabile', '93 miliardi di anni luce di diametro. Oltre le galassie, la luce più antica: il fondo cosmico a microonde.'],
      local: ['Laniakea', 'Il superammasso che ci contiene: circa 100.000 galassie che cadono verso il Grande Attrattore.'],
      localgroup: ['Gruppo Locale', 'La Via Lattea, Andromeda e oltre 80 galassie nane in 10 milioni di anni luce.'],
      milkyway: ['Via Lattea', 'Da 100 a 400 miliardi di stelle. Il Sole orbita a 26.670 anni luce dal centro.'],
      neighborhood: ['Vicinato solare', '24.700 stelle vere entro 326 anni luce, nelle loro posizioni misurate.'],
      solar: ['Sistema solare', 'Pianeti alla data di oggi e 42.000 asteroidi con orbite reali JPL.'],
      'planet:terra': ['Terra', "L'unico luogo dove sappiamo che esiste la vita, e il punto da cui abbiamo misurato tutto il resto."],
    };
    const ORDER = ['cosmos', 'local', 'localgroup', 'milkyway', 'neighborhood', 'solar', 'planet:terra'];
    const $ = (id) => document.getElementById(id);
    const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
    const S = { level: null, capT: 0, started: false, arrived: null, viewSet: false };
    window.__cine = (t) => {
      const c = E.ctrl, dt = 1 / 30;
      // titolo iniziale
      $('c-title').style.opacity = smooth(0.3, 1.6, t) * (1 - smooth(4.2, 5.4, t));
      if (!S.started) { c.goalLogDist -= 0.035 * dt; }
      if (!S.started && t >= 5.2) { S.started = true; E.travel('planet:terra', 'terra'); }
      c.goalTheta += (E.cur.id === 'planet:terra' ? 0.05 : 0.035) * dt;
      // didascalie per livello
      if (E.cur.id !== S.level) {
        S.level = E.cur.id; S.capT = t;
        const [h, p] = CAP[S.level] || [E.cur.def.name, ''];
        $('c-h').textContent = h; $('c-p').textContent = p;
        $('c-eye').textContent = 'Scala ' + (ORDER.indexOf(S.level) + 1) + ' di ' + ORDER.length;
      }
      const capIn = S.level === 'cosmos' ? smooth(5.6, 6.6, t) : smooth(S.capT + 0.35, S.capT + 1.1, t);
      $('c-cap').style.opacity = capIn;
      const m = E.dist() * E.unitM();
      $('c-d').textContent = U.fmtDist(m);
      $('c-dist').style.opacity = smooth(5.6, 6.6, t);
      // arrivo: vista dal lato illuminato, giro lento, titolo finale
      if (E.cur.id === 'planet:terra' && !S.viewSet) {
        S.viewSet = true;
        const sv = E.cur.def.startView(E.cur, E);
        c.goalTheta = sv[0]; c.goalPhi = sv[1];
      }
      if (S.started && !E.trip && E.cur.id === 'planet:terra' && S.arrived == null) S.arrived = t;
      const endA = S.arrived == null ? 0 : smooth(S.arrived + 6, S.arrived + 7.5, t);
      $('c-end').style.opacity = endA;
      $('c-cap').style.opacity = capIn * (1 - endA);
      $('c-dist').style.opacity = parseFloat($('c-dist').style.opacity) * (1 - endA);
      $('c-shade').style.opacity = smooth(5.2, 6.6, t) * (1 - endA);
      return { level: E.cur.id, done: S.arrived != null && t > S.arrived + 10, trip: !!E.trip };
    };
    // un passo a vuoto per disegnare il primo fotogramma
    window.__step(1000 / 30);
    return E.gpu + ' · Q=' + U.QUALITY;
  });
  console.log('GPU:', gpu);

  const levels = [];
  const t0 = Date.now();
  const MAXF = Number(process.env.MAXF) || FPS * 120; // MAXF=60 per una prova veloce
  for (let f = 0; f < MAXF; f++) {
    const st = await page.evaluate((t) => window.__cine(t), f / FPS);
    await page.evaluate(() => window.__step(1000 / 30));
    await page.screenshot({ path: path.join(WORK, String(f).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 93 });
    levels.push(st.level);
    if (f % 60 === 0) console.log(`frame ${f} · ${st.level} · viaggio ${st.trip} · ${Math.round((Date.now() - t0) / 1000)} s`);
    if (st.done) break;
  }
  await browser.close();
  fs.writeFileSync(path.join(WORK, 'levels.json'), JSON.stringify(levels));
  console.log('fotogrammi:', levels.length);

  // dissolvenza incrociata ai cambi di livello
  const py = `
import json, os, sys
from PIL import Image
work = sys.argv[1]
lv = json.load(open(os.path.join(work, 'levels.json')))
N = 12
for k in range(1, len(lv)):
    if lv[k] != lv[k - 1]:
        prev = Image.open(os.path.join(work, '%05d.jpg' % (k - 1))).convert('RGB')
        for j in range(N):
            idx = k + j
            if idx >= len(lv): break
            cur = Image.open(os.path.join(work, '%05d.jpg' % idx)).convert('RGB')
            a = (j + 1) / (N + 1)
            a = a * a * (3 - 2 * a)
            Image.blend(prev, cur, a).save(os.path.join(work, '%05d.jpg' % idx), quality=93)
`;
  fs.writeFileSync(path.join(WORK, 'xfade.py'), py);
  execFileSync('python', [path.join(WORK, 'xfade.py'), WORK], { stdio: 'inherit' });

  execFileSync(ffmpeg, ['-y', '-framerate', String(FPS), '-i', path.join(WORK, '%05d.jpg'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-maxrate', '12M', '-bufsize', '24M', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  console.log('video:', OUT, Math.round(fs.statSync(OUT).size / 1048576) + ' MB');
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
