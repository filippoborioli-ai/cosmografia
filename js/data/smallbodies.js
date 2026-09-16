// =============================================================================
//  smallbodies.js — corpi minori con nome (elementi reali da U.GEN.named, JPL SBDB)
//  e schede delle popolazioni (orbite reali da U.GEN.smallBodies).
//  Caricare dopo solar.js.
// =============================================================================
window.U = window.U || {};
(function (U) {
  'use strict';
  const B = (id, name, type, color, facts, desc, extra) => Object.assign({ id, name, type, color, facts, desc, cert: 'mis', src: ['sbdb'] }, extra || {});

  U.SOLAR.small = [
    B('cerere', 'Cerere', 'Pianeta nano · fascia principale', '#c9c2b8', [['Diametro', '~940 km'], ['Periodo', '4,6 anni']],
      'Il corpo più grande della fascia principale e l\'unico pianeta nano del Sistema solare interno. La sonda Dawn ha trovato depositi brillanti di carbonato di sodio nel cratere Occator: residui di salamoia risalita dall\'interno.', { label: 1 }),
    B('pallade', 'Pallade', 'Asteroide', '#b8b0a6', [['Diametro', '~510 km'], ['Scoperta', '1802']],
      'Il secondo asteroide scoperto, su un\'orbita molto inclinata (~35°) rispetto al piano dei pianeti.'),
    B('giunone', 'Giunone', 'Asteroide', '#b8b0a6', [['Diametro', '~250 km'], ['Scoperta', '1804']], 'Uno dei primi quattro asteroidi scoperti, tra i più riflettenti della fascia.'),
    B('vesta', 'Vesta', 'Protopianeta', '#d8cfc0', [['Diametro', '~525 km'], ['Sonda', 'Dawn (2011–2012)']],
      'Un protopianeta differenziato, con crosta, mantello e nucleo di ferro. Il cratere Rheasilvia al polo sud, largo 500 km, ha lanciato nello spazio i frammenti da cui provengono le meteoriti HED cadute sulla Terra.', { label: 1 }),
    B('igea', 'Igea', 'Asteroide · candidato pianeta nano', '#9a948c', [['Diametro', '~430 km']], 'Quarto corpo della fascia per dimensioni e quasi sferico: per questo è candidato allo status di pianeta nano.'),
    B('psiche', 'Psiche', 'Asteroide metallico', '#c0c4cc', [['Diametro', '~220 km'], ['Missione', 'Psyche (NASA), arrivo 2029']],
      'Asteroide di tipo M, forse il nucleo metallico esposto di un protopianeta distrutto da collisioni.'),
    B('eros', 'Eros', 'Asteroide near-Earth', '#e0906a', [['Dimensioni', '34 × 11 × 11 km'], ['Sonda', 'NEAR Shoemaker (2000–2001)']],
      'Il primo asteroide attorno a cui ha orbitato una sonda e su cui una sonda si è posata (febbraio 2001).'),
    B('bennu', 'Bennu', 'Asteroide near-Earth', '#e0906a', [['Diametro', '~490 m'], ['Campioni', 'OSIRIS-REx, riportati a Terra nel settembre 2023']],
      'Un cumulo di macerie carbonioso. Nei campioni riportati da OSIRIS-REx sono stati trovati minerali formati in acqua, amminoacidi e tutte e cinque le basi azotate di DNA e RNA.'),
    B('apophis', 'Apophis', 'Asteroide near-Earth', '#ff8a6a', [['Diametro', '~340 m'], ['Passaggio ravvicinato', '13 aprile 2029, ~32.000 km dalla superficie']],
      'Il 13 aprile 2029 passerà più vicino dei satelliti geostazionari e sarà visibile a occhio nudo. Le misure radar escludono un impatto per almeno un secolo.', { label: 2 }),
    B('didymos', 'Didymos–Dimorphos', 'Asteroide binario', '#e0906a', [['Diametri', '~780 m e ~160 m'], ['Impatto DART', '26 settembre 2022']],
      'Il primo test di difesa planetaria: l\'impatto della sonda DART ha accorciato di circa 32 minuti l\'orbita di Dimorphos attorno a Didymos. La sonda Hera (ESA) ne studierà gli effetti.'),
    B('ryugu', 'Ryugu', 'Asteroide near-Earth', '#e0906a', [['Diametro', '~900 m'], ['Campioni', 'Hayabusa2 (JAXA), 2020']],
      'Asteroide carbonioso a forma di trottola da cui la sonda giapponese Hayabusa2 ha riportato campioni sulla Terra.'),
    B('dinkinesh', 'Dinkinesh', 'Asteroide', '#b8b0a6', [['Diametro', '~790 m'], ['Sorvolo', 'Lucy, 1 novembre 2023']],
      'Sorvolato da Lucy, che vi ha scoperto una luna fatta di due lobi a contatto, Selam.'),
    B('eurybates', 'Eurybates', 'Troiano di Giove', '#b48c70', [['Diametro', '~64 km'], ['Luna', 'Queta'], ['Sorvolo Lucy', 'agosto 2027']],
      'Il primo Troiano che la sonda Lucy sorvolerà: forse il frammento principale di un\'antica collisione.'),
    B('arrokoth', 'Arrokoth', 'Oggetto della fascia di Kuiper', '#d0806a', [['Dimensioni', '~36 km'], ['Sorvolo', 'New Horizons, 1 gennaio 2019']],
      'Un "pupazzo di neve" rosso formato dall\'unione lenta di due planetesimi: una prova diretta di come nascevano i mattoni dei pianeti.'),
    B('eris', 'Eris', 'Pianeta nano · disco diffuso', '#e6e2dc', [['Raggio', '~1.163 km'], ['Massa', '1,27 × Plutone'], ['Periodo', '~559 anni']],
      'Poco più piccolo di Plutone ma più massiccio. La sua scoperta, nel 2005, costrinse l\'IAU a definire che cosa sia un pianeta. Oggi è vicino all\'afelio.', { label: 1 }),
    B('haumea', 'Haumea', 'Pianeta nano · fascia di Kuiper', '#e8e8ea', [['Dimensioni', '~2.100 × 1.680 × 1.070 km'], ['Rotazione', '3,9 ore'], ['Anello', 'scoperto nel 2017']],
      'Ruota così in fretta da essersi allungata in un ellissoide. Possiede due lune e un anello.'),
    B('makemake', 'Makemake', 'Pianeta nano · fascia di Kuiper', '#e8c8b0', [['Diametro', '~1.430 km'], ['Periodo', '~306 anni']],
      'Pianeta nano luminoso, ricoperto di ghiacci di metano ed etano, con una piccola luna scura.'),
    B('quaoar', 'Quaoar', 'Oggetto transnettuniano', '#c89a80', [['Diametro', '~1.100 km'], ['Anelli', 'scoperti nel 2023']],
      'Ha un anello molto più lontano del limite di Roche, dove secondo la teoria il materiale avrebbe dovuto aggregarsi in una luna.'),
    B('gonggong', 'Gonggong', 'Oggetto transnettuniano', '#d08070', [['Diametro', '~1.230 km'], ['Luna', 'Xiangliu']], 'Tra i più grandi candidati pianeti nani, molto rosso.'),
    B('orco', 'Orco', 'Plutino', '#b8b8c0', [['Diametro', '~910 km'], ['Luna', 'Vanth']],
      'L\'"anti-Plutone": è nella stessa risonanza 3:2 con Nettuno, ma sempre dalla parte opposta dell\'orbita rispetto a Plutone.'),
    B('sedna', 'Sedna', 'Oggetto transnettuniano estremo', '#e07860', [['Diametro', '~1.000 km'], ['Perielio', '~76 UA (nel 2076)'], ['Periodo', '~11.000 anni']],
      'Uno degli oggetti più remoti noti. Il perielio è così lontano che Nettuno non può averne plasmato l\'orbita: serve una causa esterna, come una stella passata vicino al Sole quando era ancora nel suo ammasso natale.',
      { frontier: 'Sedna e altri oggetti "distaccati" alimentano l\'ipotesi del Pianeta Nove.', src: ['sbdb', 'brown2004'], label: 1 }),
    B('halley', 'Cometa di Halley (1P)', 'Cometa periodica', '#9fd8ff', [['Periodo', '~76 anni'], ['Ultimo perielio', '9 febbraio 1986'], ['Prossimo perielio', 'luglio 2061']],
      'La cometa periodica più famosa, su un\'orbita retrograda molto allungata. Edmond Halley ne predisse il ritorno del 1758. Nel 1986 la sonda Giotto ne fotografò il nucleo. Oggi è vicina all\'afelio, oltre l\'orbita di Nettuno.', { label: 1 }),
    B('halebopp', 'Cometa Hale-Bopp', 'Cometa di lungo periodo', '#9fd8ff', [['Perielio', '1 aprile 1997'], ['Nucleo', '~60 km (stima)']],
      'La "grande cometa" del 1997, visibile a occhio nudo per 18 mesi.'),
    B('chury', '67P/Churyumov–Gerasimenko', 'Cometa della famiglia di Giove', '#9fd8ff', [['Dimensioni', '~4 km'], ['Missione', 'Rosetta e Philae (2014–2016)']],
      'La cometa di Rosetta: il lander Philae vi compì il primo atterraggio su una cometa (novembre 2014).'),
    B('tempel1', '9P/Tempel 1', 'Cometa della famiglia di Giove', '#9fd8ff', [['Dimensioni', '~7,6 × 4,9 km'], ['Impatto', 'Deep Impact, 4 luglio 2005']],
      'Colpita dal proiettile di Deep Impact per studiare il materiale sotto la superficie.'),
  ];

  const sb = U.GEN && U.GEN.smallBodies ? U.GEN.smallBodies.counts : null;
  const nf = (x) => Number(x || 0).toLocaleString('it-IT');
  Object.assign(U.SOLAR.regions, {
    fascia: { id: 'fascia', name: 'Fascia principale degli asteroidi', type: 'Popolazione di piccoli corpi', cert: 'mis',
      facts: [['Estensione', '~2,1 – 3,3 UA'], ['Asteroidi > 1 km', '~1–2 milioni'], ['Massa totale', '~3% della Luna'],
        ['Orbite reali mostrate', sb ? nf(sb.MBA + sb.IMB + sb.OMB) + ' (JPL SBDB, i più grandi)' : '—'], ['Lacune di Kirkwood', '2,50 · 2,82 · 2,95 · 3,27 UA']],
      desc: 'Ogni punto è un asteroide vero, con la sua orbita presa dal database JPL e animata con le leggi di Keplero. Le lacune di Kirkwood non sono disegnate: emergono dai dati, dove il periodo orbitale sarebbe in risonanza con Giove (3:1, 5:2, 7:3, 2:1). Nonostante il numero, la fascia è quasi vuota: le sonde la attraversano senza rischi.',
      claude: 'Mi piace che le lacune compaiano da sole: nessuno le ha disegnate, sono l\'impronta di Giove nei dati.',
      src: ['sbdb', 'bottke2002'] },
    troiani: { id: 'troiani', name: 'Asteroidi Troiani di Giove', type: 'Popolazione in risonanza 1:1', cert: 'mis',
      facts: [['Posizione', 'punti lagrangiani L4 e L5'], ['Orbite reali mostrate', sb ? nf(sb.TJN) : '—'], ['Missione', 'Lucy (NASA), sorvoli dal 2027']],
      desc: 'Asteroidi intrappolati 60° davanti (L4) e 60° dietro (L5) Giove lungo la sua orbita. Con le orbite reali si vede che lo sciame L4 è più popoloso di L5. Potrebbero essere corpi della regione esterna catturati durante la migrazione dei pianeti giganti.',
      src: ['sbdb'] },
    kuiper: { id: 'kuiper', name: 'Fascia di Kuiper', type: 'Disco di corpi ghiacciati', cert: 'mis',
      facts: [['Estensione', '~30 – 50 UA'], ['Oggetti transnettuniani mostrati', sb ? nf(sb.TNO) + ' (tutti quelli con orbita nota nel SBDB)' : '—'], ['Plutini', 'risonanza 3:2 con Nettuno, ~39,4 UA'], ['Classici freddi', '~42 – 47 UA']],
      desc: 'Oggetti ghiacciati residui della formazione dei pianeti, con orbite reali. Si riconoscono i plutini, agganciati in risonanza 3:2 con Nettuno come Plutone, i "classici freddi" su orbite quasi circolari e il disco diffuso, molto eccentrico.',
      frontier: 'Il campione è distorto dalle survey: vediamo più facilmente gli oggetti vicini al perielio e vicini al piano dell\'eclittica.',
      src: ['sbdb', 'kuiper_gladman'] },
    neo: { id: 'neo', name: 'Asteroidi vicini alla Terra', type: 'Popolazione near-Earth', cert: 'mis',
      facts: [['Definizione', 'perielio < 1,3 UA'], ['Mostrati', sb ? nf(sb.NEO) + ' (H < 19, circa > 500 m)' : '—']],
      desc: 'Asteroidi le cui orbite si avvicinano a quella terrestre, in rosso. Ne sono noti decine di migliaia; la sorveglianza (NASA, ESA, Osservatorio Rubin, la futura missione NEO Surveyor) serve a trovarli prima che siano un pericolo.',
      src: ['sbdb'] },
    centauri: { id: 'centauri', name: 'Centauri', type: 'Popolazione instabile', cert: 'mis',
      facts: [['Regione', 'tra Giove e Nettuno'], ['Mostrati', sb ? nf(sb.CEN) : '—']],
      desc: 'Corpi ghiacciati su orbite instabili tra i pianeti giganti: un ponte tra la fascia di Kuiper e le comete della famiglia di Giove. Chariklo, il più grande, ha due anelli.',
      src: ['sbdb'] },
  });
})(window.U);
