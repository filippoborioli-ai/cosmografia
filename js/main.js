// =============================================================================
//  main.js — avvio.
// =============================================================================
(function (U) {
  'use strict';
  const E = U.Engine;
  const $ = (id) => document.getElementById(id);

  function start() {
    if (!window.THREE) {
      document.body.insertAdjacentHTML('beforeend', '<div class="intro"><div class="card"><h1>Three.js non disponibile</h1><p class="lead">Serve il file vendor/three.min.js oppure una connessione a Internet.</p></div></div>');
      return;
    }
    E.init($('scene'), $('labels'));
    U.UI.init();
    E.switchTo('solar', { focus: 'sole', select: false }, true);

    const foot = $('intro-foot');
    foot.textContent += ' GPU in uso dal browser: ' + E.gpu + ' · densità particelle ×' + U.nf(U.QUALITY, 2) + '.';

    const close = () => { $('intro').hidden = true; };
    $('go-earth').addEventListener('click', () => { close(); E.switchTo('planet:terra', { focus: 'terra', select: true }); });
    $('go-solar').addEventListener('click', () => { close(); if (E.cur.id !== 'solar') E.switchTo('solar', { focus: 'sole', select: false }); });
    $('go-cosmos').addEventListener('click', () => { close(); E.switchTo('cosmos', { focus: 'vialattea_cosmo', select: false }); });
    $('intro').addEventListener('pointerdown', (e) => { if (e.target.id === 'intro') close(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    window.addEventListener('error', (e) => U.UI.toast('Errore: ' + e.message, 6000));
  }
  // gli script sono in fondo al body: il DOM esiste già. Si parte subito, le texture arrivano dopo.
  start();
})(window.U);
