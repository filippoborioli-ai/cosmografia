// =============================================================================
//  engine.js — renderer, camera orbitale logaritmica, livelli di scala annidati,
//  transizioni tra livelli, selezione (picking in spazio schermo), etichette.
// =============================================================================
window.U = window.U || {};
(function (U) {
  'use strict';
  const C = U.C;

  // --- Registro livelli ------------------------------------------------------
  U.levels = {};
  U.levelFamilies = {};
  U.defineLevel = (def) => { U.levels[def.id] = def; };
  U.defineLevelFamily = (prefix, make) => { U.levelFamilies[prefix] = make; };
  U.getLevelDef = function (id) {
    if (U.levels[id]) return U.levels[id];
    const [prefix, key] = id.split(':');
    if (U.levelFamilies[prefix]) { const d = U.levelFamilies[prefix](key); if (d) { d.id = id; U.levels[id] = d; return d; } }
    return null;
  };

  class LevelInstance {
    constructor(def) {
      this.def = def; this.id = def.id;
      this.scene = new THREE.Scene();
      this.items = []; this.byId = {};
      this.built = false;
    }
    add(item) {
      item.level = this;
      item.pos = item.pos || new THREE.Vector3();
      if (item.radius == null) item.radius = 0;
      if (item.label == null) item.label = 0;
      if (item.pickable == null) item.pickable = true;
      if (!item.name && item.info) item.name = item.info.name;
      this.items.push(item); this.byId[item.id] = item;
      return item;
    }
    // Marcatore + item in un colpo
    marker(o) {
      const m = U.makeMarker(o.color || '#ffffff', o.px || 9, o.halo, o.opacity);
      m.position.copy(o.pos);
      (o.parent || this.scene).add(m);
      const it = this.add(Object.assign({}, o, { marker: m }));
      delete it.parent;
      return it;
    }
  }
  U.LevelInstance = LevelInstance;

  // --- Engine ------------------------------------------------------------------
  const E = U.Engine = {
    instances: {},
    cur: null,
    selected: null,
    hovered: null,
    listeners: {},
    opts: { labels: true, orbits: true, constellations: true, exaggerate: false },
  };
  E.on = (ev, fn) => { (E.listeners[ev] = E.listeners[ev] || []).push(fn); };
  E.emit = (ev, a) => { (E.listeners[ev] || []).forEach((fn) => fn(a)); };

  E.init = function (canvas, labelLayer) {
    E.canvas = canvas; E.labelLayer = labelLayer;
    const renderer = E.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance', alpha: false });
    renderer.setClearColor(0x020308, 1);
    renderer.autoClear = false;
    E.detectQuality();
    E.camera = new THREE.PerspectiveCamera(55, 1, 1e-6, 1e9);
    E.skyScene = new THREE.Scene();
    E.skyCamera = new THREE.PerspectiveCamera(55, 1, 1, 5000);
    E.skyGroups = {};
    E.skySun = U.makeMarker('#fff1c8', 30, 1.2); E.skySun.material.depthTest = false; E.skySun.visible = false;
    E.skyScene.add(E.skySun);

    E.ctrl = {
      target: new THREE.Vector3(), goal: new THREE.Vector3(), offset: new THREE.Vector3(),
      logDist: 0, goalLogDist: 0, theta: 0.6, goalTheta: 0.6, phi: 1.1, goalPhi: 1.1, follow: null,
    };
    E.time = { jd: U.dateToJD(new Date()), speed: 3600 / 86400, paused: false };
    E.clock = performance.now();
    E.resize();
    window.addEventListener('resize', E.resize);
    E.bindInput();
    E.labelPool = [];
    E.ring = document.getElementById('sel-ring');
    requestAnimationFrame(E.frame);
  };

  E.detectQuality = function () {
    let q = 1, gpu = '';
    try {
      const gl = E.renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    } catch (e) { /* ignora */ }
    if (/NVIDIA|GeForce|RTX|Quadro|Radeon RX|Radeon Pro|Apple M[1-9]/i.test(gpu)) q = 1.6;
    else if (/Intel|UHD|Iris|Radeon\(TM\) Graphics/i.test(gpu)) q = 0.8;
    if (/Mali|Adreno|PowerVR|SwiftShader|llvmpipe/i.test(gpu) || /Mobi|Android/i.test(navigator.userAgent)) q = 0.45;
    const m = /[?&]q=([\d.]+)/.exec(location.search || '');
    if (m) q = parseFloat(m[1]);
    U.QUALITY = q; E.gpu = gpu || 'sconosciuta';
  };

  E.resize = function () {
    const w = window.innerWidth, h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, U.QUALITY >= 1.5 ? 2 : 1.5);
    E.renderer.setPixelRatio(pr);
    E.renderer.setSize(w, h, false);
    E.canvas.style.width = w + 'px'; E.canvas.style.height = h + 'px';
    E.camera.aspect = w / h; E.camera.updateProjectionMatrix();
    E.skyCamera.aspect = w / h; E.skyCamera.updateProjectionMatrix();
    E.W = w; E.H = h; E.pr = pr;
    U.G.uPixelRatio.value = pr;
    U.G.uScale.value = (h * pr) / (2 * Math.tan((E.camera.fov * Math.PI / 180) / 2));
  };

  // --- Livelli -------------------------------------------------------------
  E.instance = function (id) {
    if (E.instances[id]) return E.instances[id];
    const def = U.getLevelDef(id);
    if (!def) throw new Error('Livello sconosciuto: ' + id);
    const inst = new LevelInstance(def);
    def.build(inst, E);
    inst.built = true;
    E.instances[id] = inst;
    return inst;
  };
  E.dist = () => Math.exp(E.ctrl.logDist);
  E.unitM = () => E.cur.def.unit.m;

  E.sky = function (kind) {
    if (!kind) return null;
    if (E.skyGroups[kind]) return E.skyGroups[kind];
    const g = U.makeSky({ skipNear: kind === 'galactic_far' });
    if (kind === 'ecliptic') g.quaternion.copy(U.eclipticToGalacticQuat()).invert();
    g.visible = false;
    E.skyScene.add(g);
    E.skyGroups[kind] = g;
    return g;
  };

  // Passa a un livello. o: {focus: id, dist, dir: Vector3 (camera - target, frame del livello), select}
  E.switchTo = function (id, o, instant) {
    o = o || {};
    if (E.transitioning) return;
    const go = () => {
      let inst;
      try { inst = E.instance(id); } catch (err) { console.error(err); E.emit('error', err); return; }
      const def = inst.def;
      if (E.cur && E.cur.def.onExit) E.cur.def.onExit(E.cur, E);
      E.cur = inst;
      for (const k in E.skyGroups) E.skyGroups[k].visible = false;
      const sky = E.sky(def.sky); if (sky) sky.visible = true;
      E.skySun.visible = false;
      const focus = inst.byId[o.focus || def.focus] || null;
      const c = E.ctrl;
      const dist = U.clamp(o.dist || def.startDist, def.minDist * 1.001, def.maxDist * 0.98);
      if (def.update) def.update(inst, { dt: 0, jd: E.time.jd, E });
      c.follow = focus;
      c.goal.copy(focus ? focus.pos : new THREE.Vector3());
      c.target.copy(c.goal); c.offset.set(0, 0, 0);
      c.logDist = c.goalLogDist = Math.log(dist);
      if (o.dir && o.dir.lengthSq() > 0) {
        const d = o.dir.clone().normalize();
        c.theta = c.goalTheta = Math.atan2(d.x, d.z);
        c.phi = c.goalPhi = U.clamp(Math.acos(U.clamp(d.y, -1, 1)), 0.03, Math.PI - 0.03);
      } else if (def.startView) {
        const sv = typeof def.startView === 'function' ? def.startView(inst, E) : def.startView;
        c.theta = c.goalTheta = sv[0]; c.phi = c.goalPhi = sv[1];
      }
      if (def.onEnter) def.onEnter(inst, E);
      E.applyOptions();
      if (o.select !== false && focus && (o.select || E.selected)) E.select(focus, true);
      else if (E.selected && E.selected.level !== inst) E.select(null);
      E.emit('level', inst);
    };
    if (instant || !E.cur) { go(); return; }
    // livello già costruito: passaggio immediato con una breve dissolvenza del canvas
    if (E.instances[id]) { go(); E.emit('dip'); return; }
    E.transitioning = true;
    E.emit('fade', { on: true, id });
    setTimeout(() => {
      try { go(); } finally {
        setTimeout(() => { E.emit('fade', { on: false, id }); E.transitioning = false; }, 60);
      }
    }, E.instances[id] ? 170 : 240);
  };

  // Entra nel livello figlio di un portale mantenendo la scala
  E.enterPortal = function (item) {
    const p = item.portal; if (!p || E.transitioning) return;
    const childDef = U.getLevelDef(p.level);
    const scale = E.unitM() / childDef.unit.m;
    const dir = E.camera.position.clone().sub(E.ctrl.target);
    const q = childDef.frameQuat ? (typeof childDef.frameQuat === 'function' ? childDef.frameQuat() : childDef.frameQuat) : null;
    if (q) dir.applyQuaternion(q.clone().invert());
    E.switchTo(p.level, { focus: p.focus || childDef.focus, dist: E.dist() * scale, dir, select: !!E.selected });
  };
  E.exitToParent = function () {
    const def = E.cur.def;
    const par = def.parent ? def.parent(E.cur) : null;
    if (!par || E.transitioning) return false;
    const parDef = U.getLevelDef(par.level);
    const scale = E.unitM() / parDef.unit.m;
    const dir = E.camera.position.clone().sub(E.ctrl.target);
    const q = def.frameQuat ? (typeof def.frameQuat === 'function' ? def.frameQuat() : def.frameQuat) : null;
    if (q) dir.applyQuaternion(q);
    E.switchTo(par.level, { focus: par.focus, dist: Math.max(E.dist() * scale, (par.minDist || 0)), dir, select: !!E.selected });
    return true;
  };

  // --- Selezione e volo ------------------------------------------------------
  E.select = function (item, silent) {
    E.selected = item;
    E.emit('select', item);
    void silent;
  };
  E.flyTo = function (item, dist) {
    const c = E.ctrl;
    c.offset.copy(c.target).sub(item.pos);
    c.follow = item;
    c.goal.copy(item.pos);
    const def = E.cur.def;
    const d = dist != null ? dist : (item.viewDist || Math.max(item.radius * 6, E.dist()));
    c.goalLogDist = Math.log(U.clamp(d, def.minDist * 1.001, def.maxDist * 0.98));
  };
  E.center = function (item) {
    const c = E.ctrl;
    c.offset.copy(c.target).sub(item.pos);
    c.follow = item; c.goal.copy(item.pos);
  };
  E.explore = function (item) {
    if (!item.portal) return;
    if (item.level !== E.cur) return;
    E.flyTo(item, item.portal.enterDist * 0.45);
    E.pendingPortal = item;
  };
  E.goToItem = function (levelId, itemId) {
    const go = () => {
      const it = E.cur.byId[itemId];
      if (it) { E.select(it); E.flyTo(it); }
    };
    if (E.cur && E.cur.id === levelId) { go(); return; }
    const def = U.getLevelDef(levelId);
    E.switchTo(levelId, { focus: def.focus, select: false });
    const wait = () => { if (E.transitioning || !E.cur || E.cur.id !== levelId) requestAnimationFrame(wait); else go(); };
    requestAnimationFrame(wait);
  };

  // --- Viaggio tra le scale ("potenze di dieci") ------------------------------
  // Catena dei livelli dal più interno al più esterno
  E.chainOf = function (id) {
    const out = [];
    let cur = id, guard = 0;
    while (cur && guard++ < 20) {
      out.push(cur);
      const d = U.getLevelDef(cur);
      const p = d && d.parent ? d.parent(E.instances[cur] || null) : null;
      cur = p ? p.level : null;
    }
    return out;
  };
  // Vola in modo continuo dal punto attuale all'oggetto itemId del livello levelId:
  // zoom indietro fino al livello comune, poi zoom avanti attraverso i portali.
  E.travel = function (levelId, itemId) {
    if (!E.cur || !U.getLevelDef(levelId)) return;
    if (E.cur.id === levelId) {
      const it = E.cur.byId[itemId];
      if (it) { E.select(it); E.trip = { levelId, itemId, path: [levelId], common: levelId, t0: performance.now() }; E.emit('trip', E.trip); }
      return;
    }
    const up = E.chainOf(E.cur.id), down = E.chainOf(levelId);
    const common = up.find((l) => down.includes(l));
    if (!common) { E.goToItem(levelId, itemId); return; }
    const path = down.slice(0, down.indexOf(common) + 1).reverse();
    E.trip = { levelId, itemId, path, common, t0: performance.now() };
    E.emit('trip', E.trip);
  };
  E.cancelTrip = function () { if (E.trip) { E.trip = null; E.emit('trip', null); } };
  E.skipTrip = function () { const t = E.trip; if (!t) return; E.cancelTrip(); E.goToItem(t.levelId, t.itemId); };
  // passo del viaggio, chiamato ogni frame
  function tripStep(dt) {
    const T = E.trip, c = E.ctrl, def = E.cur.def;
    const approach = (from, to, max) => (Math.abs(to - from) <= max ? to : from + Math.sign(to - from) * max);
    if (performance.now() - T.t0 > 90000) { E.skipTrip(); return; } // salvagente
    const idx = T.path.indexOf(E.cur.id);
    if (idx < 0) {
      // risalita: zoom indietro costante, l'uscita dal livello avviene da sola
      const rate = 2.2 + 0.5 * Math.max(0, Math.log(def.maxDist) - c.logDist);
      c.goalLogDist = Math.min(c.goalLogDist + rate * dt, Math.log(def.maxDist) + 0.4);
      return;
    }
    if (E.cur.id === T.levelId) {
      const it = E.cur.byId[T.itemId];
      if (!it) { E.cancelTrip(); return; }
      if (!T.final) {
        T.final = true;
        E.select(it);
        c.offset.copy(c.target).sub(it.pos); c.follow = it; c.goal.copy(it.pos);
        let want = it.viewDist || Math.max(it.radius * 6, E.dist());
        if (it.portal) want = Math.max(want, it.portal.enterDist * 1.4); // fermarsi prima di entrare nel livello interno
        T.goalLog = Math.log(U.clamp(want, def.minDist * 1.01, def.maxDist * 0.95));
      }
      if (c.offset.length() < Math.exp(c.logDist) * 0.6) c.goalLogDist = approach(c.goalLogDist, T.goalLog, (2 + 0.4 * Math.abs(T.goalLog - c.logDist)) * dt);
      if (Math.abs(c.logDist - T.goalLog) < 0.04 && c.offset.length() < Math.exp(c.logDist) * 0.02) E.cancelTrip();
      return;
    }
    // discesa: centra il portale verso il livello successivo e zooma dentro
    const next = T.path[idx + 1];
    const nextDef = U.getLevelDef(next);
    const portal = E.cur.items.find((it) => it.portal && it.portal.level === next && (it.portal.focus || nextDef.focus) === nextDef.focus && it.id === (it.portal.focus || it.id))
      || E.cur.items.find((it) => it.portal && it.portal.level === next);
    if (!portal) { E.skipTrip(); return; }
    if (c.follow !== portal) { c.offset.copy(c.target).sub(portal.pos); c.follow = portal; c.goal.copy(portal.pos); }
    const want = Math.log(portal.portal.enterDist * 0.3);
    const dist = Math.exp(c.logDist);
    if (c.offset.length() < dist * 0.35) c.goalLogDist = approach(c.goalLogDist, want, (2.2 + 0.45 * Math.abs(want - c.logDist)) * dt);
    else c.goalLogDist = Math.max(c.logDist, Math.min(c.goalLogDist, c.logDist + 0.5));
  }

  // --- Input -----------------------------------------------------------------
  E.bindInput = function () {
    const cv = E.canvas;
    const pointers = new Map();
    let down = null, pinch0 = 0, moved = false, lastTap = 0;
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      down = { x: e.clientX, y: e.clientY, button: e.button, shift: e.shiftKey, t: performance.now() };
      moved = false;
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); }
    });
    cv.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) { E.hoverAt(e.clientX, e.clientY); return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) moved = true;
      const c = E.ctrl;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch0 > 0) { c.goalLogDist -= Math.log(d / pinch0) * 1.2; }
        pinch0 = d;
        return;
      }
      if (down && (down.button === 2 || down.shift)) {
        // panoramica: stacca l'inseguimento
        E.cancelTrip();
        const dist = E.dist();
        const right = new THREE.Vector3().setFromMatrixColumn(E.camera.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(E.camera.matrixWorld, 1);
        const k = dist * 1.1 / E.H;
        const delta = right.multiplyScalar(-dx * k).add(up.multiplyScalar(dy * k));
        if (c.follow) { c.goal.copy(c.follow.pos); c.follow = null; }
        c.goal.add(delta);
      } else {
        c.goalTheta -= dx * 0.0055;
        c.goalPhi = U.clamp(c.goalPhi - dy * 0.0055, 0.03, Math.PI - 0.03);
      }
    });
    const up = (e) => {
      const wasDown = down;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch0 = 0;
      if (!wasDown || pointers.size > 0) return;
      down = null;
      if (moved || wasDown.button !== 0) return;
      const now = performance.now();
      const it = E.pickAt(e.clientX, e.clientY);
      if (now - lastTap < 320 && it) { E.select(it); E.flyTo(it); lastTap = 0; return; }
      lastTap = now;
      if (it) { E.select(it); E.center(it); }
      else if (E.selected) E.select(null);
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      E.cancelTrip();
      const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      E.ctrl.goalLogDist += U.clamp(dy, -120, 120) * 0.0016;
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 'Escape') E.select(null);
      else if (e.key === '+' || e.key === '=') E.ctrl.goalLogDist -= 0.35;
      else if (e.key === '-' || e.key === '_') E.ctrl.goalLogDist += 0.35;
      else if (e.key === 'Backspace' || e.key === 'u') { E.exitToParent(); e.preventDefault(); }
      else if (e.key === ' ') { E.time.paused = !E.time.paused; E.emit('time'); e.preventDefault(); }
    });
  };

  // --- Proiezione e picking -----------------------------------------------------
  const _v = new THREE.Vector3();
  E.project = function (pos, out) {
    _v.copy(pos).project(E.camera);
    if (_v.z > 1 || _v.z < -1) return null;
    out = out || {};
    out.x = (_v.x * 0.5 + 0.5) * E.W; out.y = (-_v.y * 0.5 + 0.5) * E.H;
    out.d = E.camera.position.distanceTo(pos);
    return out;
  };
  E.radiusPx = (radius, d) => radius / Math.max(d, 1e-30) * (E.H / (2 * Math.tan((E.camera.fov * Math.PI / 180) / 2)));
  E.pickAt = function (x, y) {
    if (!E.cur) return null;
    let best = null, bestScore = Infinity;
    const s = {};
    for (const it of E.cur.items) {
      if (!it.pickable || it.hidden) continue;
      if (!E.project(it.pos, s)) continue;
      const rp = E.radiusPx(it.radius || 0, s.d);
      const d = Math.hypot(s.x - x, s.y - y);
      const reach = Math.max(14, rp + 6);
      if (d > reach) continue;
      const score = (d < rp ? -1000 + rp * 0.001 : d) + (it.label ? it.label * 0.5 : 3) + (it.pickPenalty || 0);
      if (score < bestScore) { bestScore = score; best = it; }
    }
    return best;
  };
  E.hoverAt = function (x, y) {
    const now = performance.now();
    if (E._lastHover && now - E._lastHover < 40) return;
    E._lastHover = now;
    const it = E.pickAt(x, y);
    if (it !== E.hovered) { E.hovered = it; E.canvas.style.cursor = it ? 'pointer' : 'grab'; }
  };

  // --- Opzioni visive ---------------------------------------------------------
  E.applyOptions = function () {
    if (!E.cur) return;
    E.cur.scene.traverse((o) => {
      if (o.userData.isOrbit) o.visible = E.opts.orbits;
    });
    for (const k in E.skyGroups) { const g = E.skyGroups[k]; if (g.userData.constellations) g.userData.constellations.visible = E.opts.constellations; }
    if (E.cur.def.applyOptions) E.cur.def.applyOptions(E.cur, E);
  };

  // --- Etichette ---------------------------------------------------------------
  E.updateLabels = function () {
    const layer = E.labelLayer;
    const pool = E.labelPool;
    let used = 0;
    const place = [];
    if (E.opts.labels && E.cur) {
      const camDist = E.dist();
      const cands = [];
      const s = {};
      for (const it of E.cur.items) {
        if (!it.label || it.hidden) continue;
        const forced = it === E.selected || it === E.hovered;
        if (!forced) {
          if (it.labelMaxDist && camDist > it.labelMaxDist) continue;
          if (it.labelMinDist && camDist < it.labelMinDist) continue;
        }
        if (!E.project(it.pos, s)) continue;
        if (s.x < -50 || s.x > E.W + 50 || s.y < -20 || s.y > E.H + 20) continue;
        cands.push({ it, x: s.x, y: s.y, d: s.d, pr: forced ? -1 : it.label, rp: E.radiusPx(it.radius || 0, s.d) });
      }
      cands.sort((a, b) => a.pr - b.pr || (b.it.prio || 0) - (a.it.prio || 0) || a.d - b.d);
      for (const c of cands) {
        if (used >= 140) break;
        const w = c.it.name.length * 6.6 + 16, h = 18;
        const ox = Math.max(8, Math.min(c.rp, 400) + 6);
        const rx = c.x + ox, ry = c.y - h / 2;
        let clash = false;
        if (c.pr >= 0) for (const r of place) { if (rx < r.x + r.w && rx + w > r.x && ry < r.y + r.h && ry + h > r.y) { clash = true; break; } }
        if (clash) continue;
        place.push({ x: rx, y: ry, w, h });
        let el = pool[used];
        if (!el) { el = document.createElement('div'); el.className = 'lbl'; layer.appendChild(el); pool.push(el); }
        if (el._name !== c.it.name) { el.textContent = c.it.name; el._name = c.it.name; }
        const cls = 'lbl r' + Math.max(0, c.pr) + (c.it === E.selected ? ' sel' : '') + ((c.it.cert || (c.it.info && c.it.info.cert)) === 'ipo' ? ' hyp' : '');
        if (el._cls !== cls) { el.className = cls; el._cls = cls; }
        el.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)';
        el.style.display = '';
        used++;
      }
    }
    for (let k = used; k < pool.length; k++) if (pool[k].style.display !== 'none') pool[k].style.display = 'none';
    // suggerimento: il fuoco è un portale e si è vicini alla soglia
    const hint = E.hint || (E.hint = document.getElementById('portal-hint'));
    if (hint) {
      const f = E.ctrl.follow, dist = E.dist();
      const s = f && f.portal && !E.trip && dist < f.portal.enterDist * 12 && dist > f.portal.enterDist ? E.project(f.pos, {}) : null;
      if (s) {
        const txt = '↓ zooma per entrare: ' + (U.getLevelDef(f.portal.level) || {}).name;
        if (hint._t !== txt) { hint.textContent = txt; hint._t = txt; }
        hint.style.transform = 'translate(' + (s.x + 14).toFixed(1) + 'px,' + (s.y + 14).toFixed(1) + 'px)';
        hint.hidden = false;
      } else if (!hint.hidden) hint.hidden = true;
    }
    // anello di selezione
    const ring = E.ring;
    if (ring) {
      const sel = E.selected;
      const s = sel && sel.level === E.cur ? E.project(sel.pos, {}) : null;
      if (s) {
        const r = Math.max(13, Math.min(E.radiusPx(sel.radius || 0, s.d) + 8, 2000));
        ring.style.display = '';
        ring.style.width = ring.style.height = (2 * r) + 'px';
        ring.style.transform = 'translate(' + (s.x - r).toFixed(1) + 'px,' + (s.y - r).toFixed(1) + 'px)';
      } else ring.style.display = 'none';
    }
  };

  // --- Ciclo principale ----------------------------------------------------------
  E.frame = function (now) {
    requestAnimationFrame(E.frame);
    const dt = Math.min(0.1, (now - E.clock) / 1000);
    E.clock = now;
    if (!E.cur) return;
    const T = E.time;
    if (!T.paused) T.jd += T.speed * dt;
    U.G.uTime.value += dt;
    const def = E.cur.def;
    if (def.update) def.update(E.cur, { dt, jd: T.jd, E });

    const c = E.ctrl;
    const k = 1 - Math.exp(-dt * 5.5);
    // limiti di zoom e transizioni
    const lmin = Math.log(def.minDist), lmax = Math.log(def.maxDist);
    if (E.trip && !E.transitioning) tripStep(dt);
    if (!E.transitioning) {
      if (c.goalLogDist > lmax) {
        if (c.logDist > lmax - 0.05 && def.parent && def.parent(E.cur)) { E.exitToParent(); }
        else if (!def.parent || !def.parent(E.cur)) c.goalLogDist = lmax;
      }
      if (c.goalLogDist < lmin) c.goalLogDist = lmin;
      const f = c.follow;
      if (f && f.portal && Math.exp(c.logDist) < f.portal.enterDist && c.offset.length() < f.portal.enterDist) {
        E.pendingPortal = null;
        E.enterPortal(f);
      }
    }
    c.logDist += (c.goalLogDist - c.logDist) * k;
    let dth = c.goalTheta - c.theta;
    c.theta += dth * k;
    c.phi += (c.goalPhi - c.phi) * k;
    if (c.follow) c.goal.copy(c.follow.pos);
    c.offset.multiplyScalar(1 - k);
    c.target.copy(c.goal).add(c.offset);

    const dist = Math.exp(c.logDist);
    const cam = E.camera;
    const sp = Math.sin(c.phi);
    cam.position.set(c.target.x + dist * sp * Math.sin(c.theta), c.target.y + dist * Math.cos(c.phi), c.target.z + dist * sp * Math.cos(c.theta));
    cam.up.set(0, 1, 0);
    cam.lookAt(c.target);
    cam.near = dist * 2e-4;
    cam.far = Math.max(dist * 1e5, def.extent || 1e6);
    cam.updateProjectionMatrix();
    U.G.uNearFade.value = dist * (def.nearFade != null ? def.nearFade : 0.04);

    const r = E.renderer;
    r.clear();
    if (def.sky) {
      E.skyCamera.quaternion.copy(cam.quaternion);
      E.skyCamera.updateMatrixWorld();
      r.render(E.skyScene, E.skyCamera);
      r.clearDepth();
    }
    r.render(E.cur.scene, cam);
    E.updateLabels();
    E.emit('tick', dt);
  };
})(window.U);
