// =============================================================================
//  ui.js — interfaccia: scheda informativa, ricerca, percorso di scala,
//  righello logaritmico, controlli del tempo, interruttori, introduzione.
// =============================================================================
window.U = window.U || {};
(function (U) {
  'use strict';
  const E = U.Engine;
  const $ = (id) => document.getElementById(id);
  const UI = U.UI = {};
  const CERT = { mis: 'Misurato', mod: 'Modello da dati', sti: 'Stima · indicativo', ipo: 'Ipotesi', ill: 'Illustrativo' };
  const UNIT_TEXT = {
    km: 'chilometri',
    UA: 'unità astronomiche · 1 UA = 149,6 milioni di km',
    'anni luce': 'anni luce · 1 al = 9.461 miliardi di km',
    kpc: 'kiloparsec · 1 kpc = 3.262 anni luce',
    Mpc: 'megaparsec · 1 Mpc = 3,26 milioni di anni luce',
    'miliardi di anni luce': 'miliardi di anni luce, distanze comoventi',
  };

  function h(tag, attrs, kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    for (const c of [].concat(kids || [])) if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return el;
  }
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // --- Toast ---------------------------------------------------------------------
  let toastTimer = 0;
  UI.toast = function (html, ms) {
    const t = $('toast');
    t.innerHTML = html;
    t.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.style.opacity = '0'; }, ms || 3200);
  };

  // --- Scheda informativa ----------------------------------------------------------
  let liveDD = null, liveItem = null, liveTimer = 0;
  function levelLabel(id) {
    const d = U.getLevelDef(id);
    return d ? d.name : id;
  }
  UI.renderInfo = function (item) {
    const panel = $('info');
    if (!item) { panel.hidden = true; liveItem = null; return; }
    const info = item.info || {};
    const cert = info.cert || item.cert || 'mod';
    const eb = $('i-eyebrow'); eb.textContent = '';
    eb.appendChild(h('span', { text: info.type || '' }));
    eb.appendChild(h('span', { class: 'chip ' + cert, text: CERT[cert] || cert }));
    $('i-title').textContent = info.name || item.name;

    const act = $('i-actions'); act.textContent = '';
    act.appendChild(h('button', { class: 'btn', text: 'Avvicinati', onclick: () => { if (item.level === E.cur) E.flyTo(item); } }));
    if (item.portal) act.appendChild(h('button', { class: 'btn primary', text: 'Entra: ' + levelLabel(item.portal.level) + ' ›', onclick: () => E.explore(item) }));
    const ctrl = E.ctrl;
    if (ctrl.follow !== item) act.appendChild(h('button', { class: 'btn', text: 'Centra', onclick: () => E.center(item) }));

    const body = $('i-body'); body.textContent = '';
    const dl = h('dl', { class: 'facts' });
    for (const [k, v] of info.facts || []) { dl.appendChild(h('dt', { text: k })); dl.appendChild(h('dd', { text: v })); }
    liveDD = null;
    if (item.dynamicFacts) {
      liveDD = [];
      for (const [k, v] of item.dynamicFacts()) { dl.appendChild(h('dt', { text: k })); const dd = h('dd', { class: 'live', text: v }); dl.appendChild(dd); liveDD.push(dd); }
    }
    if (dl.childNodes.length) body.appendChild(dl);
    if (info.desc) body.appendChild(h('p', { class: 'prose', text: info.desc }));
    if (info.frontier) body.appendChild(h('section', { class: 'sec' }, [h('h3', { text: 'Cosa non sappiamo ancora' }), h('p', { class: 'prose', text: info.frontier })]));
    if (info.claude) body.appendChild(h('section', { class: 'sec' }, [h('p', { class: 'claude', text: '«' + info.claude + '»' }), h('div', { class: 'claude-sig', text: 'Nota di Claude' })]));
    const inside = UI.contentsFor(item);
    for (const group of inside) {
      const wrap = h('div', { class: 'inside' });
      for (const e of group.items) {
        wrap.appendChild(h('button', { class: 'go-chip', title: e.type || '', onclick: () => E.travel(e.level, e.id) }, [e.name]));
      }
      body.appendChild(h('section', { class: 'sec' }, [h('h3', { text: group.title }), wrap]));
    }
    const srcs = (info.src || []).map((k) => U.SRC[k]).filter(Boolean);
    if (srcs.length) {
      const ol = h('ol', { class: 'sources' });
      for (const s of srcs) ol.appendChild(h('li', null, s.u ? [h('a', { href: s.u, target: '_blank', rel: 'noopener', text: s.t })] : [s.t]));
      body.appendChild(h('section', { class: 'sec' }, [h('h3', { text: 'Fonti' }), ol]));
    }
    body.scrollTop = 0;
    panel.hidden = false;
    liveItem = item;
  };
  // --- "Qui dentro": scorciatoie di viaggio verso gli oggetti contenuti -----------------
  const PLANETS = () => U.SOLAR.planets.concat([U.SOLAR.pluto]).map((p) => ({ level: 'planet:' + p.id, id: p.id, name: p.name, type: p.type }));
  const ofLevel = (level, ids, src) => ids.map((id) => { const d = src(id); return d ? { level, id, name: d.name, type: d.type } : null; }).filter(Boolean);
  const mwObj = (id) => U.MW.info[id] || U.MW.objects.find((o) => o.id === id);
  const lgObj = (id) => U.LG.galaxies.find((o) => o.id === id);
  const luObj = (id) => U.LOCAL.objects.find((o) => o.id === id) || U.LOCAL.info[id];
  const nearObj = (id) => U.NEAR.find((o) => o.id === id);
  function childContents(level) {
    if (level.startsWith('planet:')) {
      const key = level.split(':')[1];
      return [{ title: 'Lune e satelliti', items: (U.SOLAR.moons[key] || []).map((m) => ({ level, id: m.id, name: m.name, type: m.type })) }];
    }
    if (level.startsWith('exo:')) {
      const key = level.split(':')[1];
      return [{ title: 'Pianeti', items: U.EXO[key].planets.map((p) => ({ level, id: p.id, name: p.name, type: 'Esopianeta' })) }];
    }
    if (level === 'solar') return [{ title: 'Pianeti', items: PLANETS() }, { title: 'Altri oggetti', items: ofLevel('solar', ['cerere', 'vesta', 'bennu', 'apophis', 'halley', 'arrokoth', 'voyager1', 'parker', 'atlas3i'], (id) => U.SOLAR.small.find((s) => s.id === id) || U.CRAFT[id]) }];
    if (level === 'neighborhood') return [{ title: 'Pianeti del Sistema solare', items: PLANETS() }, { title: 'Stelle vicine', items: ofLevel('neighborhood', ['proxima', 'alfacena', 'barnard', 'sirioa', 'epseri', 'tauceti', 'trappist1', 'vega'], nearObj) }];
    if (level === 'milkyway') return [{ title: 'Pianeti del Sistema solare', items: PLANETS() }, { title: 'Nella Via Lattea', items: ofLevel('milkyway', ['sgra', 'orione', 'pleiadi', 'betelgeuse', 'granchio', 'omegacen', 'cygx1', 'carina'], mwObj) }];
    if (level === 'localgroup') return [{ title: 'Galassie', items: ofLevel('localgroup', ['m31', 'm33', 'lmc', 'smc', 'sgrdsph', 'm32'], lgObj) }];
    if (level === 'local') return [{ title: 'Universo locale', items: ofLevel('local', ['virgo', 'm87', 'attrattore', 'laniakea', 'coma', 'perseo', 'shapley', 'cena'], luObj) }];
    return [];
  }
  UI.contentsFor = function (item) {
    if (item.portal) {
      const groups = childContents(item.portal.level);
      // dalla Via Lattea in su, i pianeti restano a portata di clic
      if (item.portal.level === 'localgroup' || item.portal.level === 'local') groups.unshift({ title: 'Casa: pianeti del Sistema solare', items: PLANETS() });
      return groups.filter((g) => g.items.length);
    }
    if (item.id === 'vialattea') return childContents('milkyway');
    return [];
  };

  function refreshLive() {
    if (!liveItem || !liveDD || !liveItem.dynamicFacts) return;
    const vals = liveItem.dynamicFacts();
    vals.forEach(([, v], i) => { if (liveDD[i] && liveDD[i].textContent !== v) liveDD[i].textContent = v; });
  }

  // --- Ricerca ---------------------------------------------------------------------
  const INDEX = [];
  function buildIndex() {
    const add = (level, id, name, type) => INDEX.push({ level, id, name, type: type || '', n: norm(name) });
    const S = U.SOLAR;
    add('solar', 'sole', S.sun.name, S.sun.type);
    for (const p of S.planets.concat([S.pluto])) add('solar', p.id, p.name, p.type);
    for (const s of S.small) add('solar', s.id, s.name, s.type);
    for (const id in U.CRAFT || {}) { const s = U.hzSeries && U.hzSeries(id); if (s && s.center === '500@10') add('solar', id, U.CRAFT[id].name, U.CRAFT[id].type); }
    for (const k in S.regions) add('solar', k, S.regions[k].name, S.regions[k].type);
    const hyg = U.GEN && U.GEN.nearStars;
    if (hyg) hyg.names.forEach((nm, k) => { if (nm.startsWith('*')) add('neighborhood', 'hyg' + k, nm.slice(1), 'Stella (catalogo HYG)'); });
    for (const key in S.moons) for (const m of S.moons[key]) add('planet:' + key, m.id, m.name, m.type);
    for (const s of U.NEAR) add('neighborhood', s.id, s.name, 'Stella · ' + s.sp);
    for (const key in U.EXO) for (const pl of U.EXO[key].planets) add('exo:' + key, pl.id, pl.name, 'Esopianeta');
    for (const k of ['vialattea', 'sgra', 'barra', 'bollalocale', 'fermi', 'alone', 'globulari']) add('milkyway', k, U.MW.info[k].name, U.MW.info[k].type);
    for (const a of U.MW.arms) add('milkyway', 'arm_' + a.id, a.name, 'Braccio a spirale');
    for (const o of U.MW.objects) add('milkyway', o.id, o.name, o.type);
    for (const g of U.LG.galaxies) add('localgroup', g.id, g.name, g.type);
    add('localgroup', 'baricentro', U.LG.info.baricentro.name, U.LG.info.baricentro.type);
    add('local', 'gruppolocale_lu', U.LG.info.gruppolocale.name, U.LG.info.gruppolocale.type);
    add('local', 'laniakea', U.LOCAL.info.laniakea.name, U.LOCAL.info.laniakea.type);
    add('local', 'dipolo', U.LOCAL.info.dipolo.name, U.LOCAL.info.dipolo.type);
    for (const o of U.LOCAL.objects) add('local', o.id, o.name, o.type);
    for (const k of ['osservabile', 'cmb', 'event_horizon', 'hubble_sphere', 'eta_oscure', 'web', 'hudf']) add('cosmos', k, U.COSMIC.info[k].name, U.COSMIC.info[k].type);
    for (const o of U.COSMIC.objects) add('cosmos', o.id, o.name, o.type);
  }
  const SHORT = (id) => ({ solar: 'Sist. solare', neighborhood: 'Vicinato', milkyway: 'Via Lattea', localgroup: 'Gruppo Locale', local: 'Laniakea', cosmos: 'Universo' })[id]
    || (id.startsWith('planet:') ? levelLabel(id) : id.startsWith('exo:') ? 'Esosistema' : id);

  function bindSearch() {
    const input = $('search'), box = $('results');
    let sel = 0, hits = [];
    const render = () => {
      const q = norm(input.value.trim());
      box.textContent = '';
      if (!q) { box.hidden = true; return; }
      hits = INDEX.filter((e) => e.n.includes(q)).sort((a, b) => (a.n.startsWith(q) ? 0 : 1) - (b.n.startsWith(q) ? 0 : 1) || a.name.length - b.name.length).slice(0, 12);
      if (!hits.length) box.appendChild(h('div', { class: 'empty', text: 'Nessun oggetto con questo nome nel catalogo.' }));
      hits.forEach((e, i) => box.appendChild(h('button', { class: i === sel ? 'on' : '', onclick: () => choose(e) },
        [h('span', { class: 'n', text: e.name }), h('span', { class: 'l', text: SHORT(e.level) }), h('span', { class: 't', text: e.type })])));
      box.hidden = false;
    };
    const choose = (e) => { input.value = ''; box.hidden = true; input.blur(); E.travel(e.level, e.id); };
    input.addEventListener('input', () => { sel = 0; render(); });
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown') { sel = Math.min(sel + 1, hits.length - 1); render(); ev.preventDefault(); }
      else if (ev.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); render(); ev.preventDefault(); }
      else if (ev.key === 'Enter' && hits[sel]) choose(hits[sel]);
      else if (ev.key === 'Escape') { input.value = ''; render(); input.blur(); }
    });
    document.addEventListener('pointerdown', (ev) => { if (!ev.target.closest('.search')) box.hidden = true; });
  }

  // --- Percorso di scala -------------------------------------------------------------
  function renderCrumbs() {
    const nav = $('crumbs'); nav.textContent = '';
    const chain = [];
    let def = E.cur.def;
    chain.push({ id: def.id, name: def.name, focus: def.focus });
    let par = def.parent ? def.parent(E.cur) : null;
    let guard = 0;
    while (par && guard++ < 12) {
      const pd = U.getLevelDef(par.level);
      chain.push({ id: par.level, name: pd.name, focus: par.focus });
      par = pd.parent ? pd.parent(E.instances[par.level] || null) : null;
    }
    chain.reverse().forEach((c, i) => {
      if (i) nav.appendChild(h('span', { class: 'sep', text: '›' }));
      const current = c.id === E.cur.id;
      nav.appendChild(h('button', { 'aria-current': current ? 'true' : 'false', text: c.name, onclick: () => { if (!current) E.switchTo(c.id, { focus: c.focus, select: false }); } }));
    });
  }

  // --- Righello logaritmico ------------------------------------------------------------
  const LOG_TOP = 27.3, LOG_BOT = 5.8;
  const ANCHORS = [
    { m: 1.27e7, t: 'Terra', level: 'planet:terra' },
    { m: 7.7e8, t: 'Orbita della Luna', level: 'planet:terra', dist: 1.1e6 },
    { m: 1.5e11, t: '1 UA', level: 'solar', dist: 3 },
    { m: 9e12, t: 'Orbita di Nettuno', level: 'solar', dist: 70 },
    { m: 9.46e15, t: '1 anno luce', level: 'neighborhood', dist: 2 },
    { m: 4e17, t: 'Stelle vicine', level: 'neighborhood', dist: 40 },
    { m: 9.5e20, t: 'Via Lattea', level: 'milkyway' },
    { m: 3e22, t: 'Gruppo Locale', level: 'localgroup' },
    { m: 5e24, t: 'Laniakea', level: 'local', dist: 250 },
    { m: 8.8e26, t: 'Universo osservabile', level: 'cosmos' },
  ];
  const yOf = (lg) => (LOG_TOP - lg) / (LOG_TOP - LOG_BOT);
  function buildScale() {
    const bar = $('scale-bar'), anc = $('scale-anchors');
    for (let p = 6; p <= 27; p++) bar.appendChild(h('div', { class: 'tick' + (p % 3 === 0 ? ' major' : ''), style: 'top:' + (yOf(p) * 100).toFixed(2) + '%' }));
    for (const a of ANCHORS) {
      anc.appendChild(h('button', {
        class: 'anchor', style: 'top:' + (yOf(Math.log10(a.m)) * 100).toFixed(2) + '%', text: a.t, title: 'Vai a: ' + a.t,
        onclick: () => { const d = U.getLevelDef(a.level); E.switchTo(a.level, { focus: d.focus, dist: a.dist || d.startDist, select: false }); },
      }));
    }
  }

  // --- Tempo -------------------------------------------------------------------------
  function bindTime() {
    const play = $('tb-play');
    const iconPause = '<svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';
    const iconPlay = '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>';
    const sync = () => {
      play.innerHTML = E.time.paused ? iconPlay : iconPause;
      document.querySelectorAll('#timebar [data-speed]').forEach((b) => b.setAttribute('aria-pressed', String(Math.abs(+b.dataset.speed / 86400 - E.time.speed) < 1e-9)));
    };
    play.addEventListener('click', () => { E.time.paused = !E.time.paused; sync(); });
    document.querySelectorAll('#timebar [data-speed]').forEach((b) => b.addEventListener('click', () => { E.time.speed = +b.dataset.speed / 86400; E.time.paused = false; sync(); }));
    $('tb-now').addEventListener('click', () => { E.time.jd = U.dateToJD(new Date()); UI.toast('Data impostata su <b>adesso</b>'); });
    E.on('time', sync);
    sync();
  }
  const fmtDate = (jd) => {
    const d = U.jdToDate(jd);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('it-IT', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' UTC';
  };

  // --- Interruttori --------------------------------------------------------------------
  function bindToggles() {
    const map = { 't-labels': 'labels', 't-orbits': 'orbits', 't-const': 'constellations', 't-exag': 'exaggerate' };
    for (const id in map) {
      const btn = $(id), key = map[id];
      btn.setAttribute('aria-pressed', String(!!E.opts[key]));
      btn.addEventListener('click', () => {
        E.opts[key] = !E.opts[key];
        btn.setAttribute('aria-pressed', String(E.opts[key]));
        E.applyOptions();
        if (key === 'exaggerate') UI.toast(E.opts[key] ? 'Pianeti ingranditi <b>×600</b>: le distanze restano reali, le dimensioni no' : 'Pianeti in <b>scala reale</b>');
      });
    }
    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === 'l') $('t-labels').click(); else if (k === 'o') $('t-orbits').click(); else if (k === 'c') $('t-const').click();
    });
    $('t-help').addEventListener('click', () => { $('intro').hidden = false; });
    $('t-home').addEventListener('click', () => E.travel('planet:terra', 'terra'));
    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key.toLowerCase() === 'h') E.travel('planet:terra', 'terra');
    });
  }

  // --- Barra di viaggio ----------------------------------------------------------------
  function bindTrip() {
    const bar = $('tripbar');
    $('trip-skip').addEventListener('click', () => E.skipTrip());
    $('trip-stop').addEventListener('click', () => E.cancelTrip());
    const render = () => {
      const t = E.trip;
      if (!t) { bar.hidden = true; return; }
      const d = U.getLevelDef(t.levelId);
      const target = (() => {
        const inst = E.instances[t.levelId];
        const it = inst && inst.byId[t.itemId];
        if (it) return it.name;
        const hit = INDEX.find((x) => x.level === t.levelId && x.id === t.itemId) || INDEX.find((x) => x.id === t.itemId);
        return hit ? hit.name : t.itemId;
      })();
      $('trip-text').textContent = 'In viaggio verso ' + target + ' · ' + (E.cur.id === t.levelId ? d.name : levelLabel(E.cur.id) + ' → ' + d.name);
      bar.hidden = false;
    };
    E.on('trip', render);
    E.on('level', render);
  }

  // --- Avvio -----------------------------------------------------------------------------
  UI.init = function () {
    buildIndex();
    bindSearch();
    buildScale();
    bindTime();
    bindToggles();
    bindTrip();
    E.on('dip', () => { const cv = $('scene'); cv.classList.remove('dip'); void cv.offsetWidth; cv.classList.add('dip'); });
    $('i-close').addEventListener('click', () => E.select(null));
    E.on('select', UI.renderInfo);
    E.on('fade', (o) => {
      $('fade').classList.toggle('on', !!o.on);
      $('fade-text').textContent = o.on && !E.instances[o.id] ? 'Genero ' + levelLabel(o.id).toLowerCase() + '…' : '';
    });
    E.on('level', (inst) => {
      renderCrumbs();
      $('timebar').hidden = !inst.def.timeControls;
      $('t-exag').hidden = inst.id !== 'solar';
      UI.toast('<b>' + inst.def.name + '</b> · ' + (UNIT_TEXT[inst.def.unit.name] || inst.def.unit.name));
    });
    E.on('error', (err) => UI.toast('Errore: ' + (err && err.message ? err.message : err), 6000));
    let acc = 0;
    E.on('tick', (dt) => {
      acc += dt;
      const m = E.dist() * E.unitM();
      const lg = Math.log10(Math.max(m, 1));
      $('scale-now').style.top = (U.clamp(yOf(lg), 0, 1) * 100).toFixed(2) + '%';
      if (acc > 0.12) {
        acc = 0;
        $('ro-dist').innerHTML = 'Distanza di vista <b>' + U.fmtDist(m) + '</b>';
        $('ro-light').textContent = 'la luce la percorre in ' + U.fmtLightTime(m);
        if (!$('timebar').hidden) {
          const year = 2000 + (E.time.jd - U.C.J2000) / 365.25;
          const warn = (E.cur.id === 'solar' || E.cur.id.startsWith('planet:')) && (year < 1800 || year > 2050) ? ' · fuori validità JPL 1800–2050' : '';
          $('tb-date').textContent = fmtDate(E.time.jd) + warn;
        }
        refreshLive();
      }
    });
  };
})(window.U);
