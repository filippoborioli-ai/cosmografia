// =============================================================================
//  galactic.js — Via Lattea (struttura + oggetti notevoli) e Gruppo Locale.
//  Posizioni: coordinate galattiche (l, b) in gradi + distanza eliocentrica in kpc,
//  oppure RA/Dec. Il livello converte in galattocentrico con R0 = 8,178 kpc.
// =============================================================================
window.U = window.U || {};
(function (U) {
  'use strict';

  U.MW = {};

  // Bracci a spirale — Reid et al. (2014), tabella 2. β in gradi, Rref in kpc (R0 = 8,34 nel lavoro originale).
  // bmin/bmax estesi oltre i tratti misurati (vedi descrizione del braccio): la parte estrapolata è illustrativa.
  U.MW.arms = [
    { id: 'scutum', name: 'Braccio Scudo-Centauro', Rref: 5.0, bref: 27.6, pitch: 19.8, bmin: -150, bmax: 105, meas: [3, 101], w: 0.17 * 1.6, color: '#8fb4ff' },
    { id: 'sagittarius', name: 'Braccio Sagittario-Carena', Rref: 6.6, bref: 25.6, pitch: 6.9, bmin: -95, bmax: 150, meas: [-2, 68], w: 0.26 * 1.5, color: '#8fb4ff' },
    { id: 'local', name: 'Braccio di Orione (Locale)', Rref: 8.4, bref: 8.9, pitch: 12.8, bmin: -25, bmax: 40, meas: [-8, 27], w: 0.33 * 1.2, color: '#ffd27a', strength: 0.7 },
    { id: 'perseus', name: 'Braccio di Perseo', Rref: 9.9, bref: 14.2, pitch: 9.4, bmin: -100, bmax: 190, meas: [-21, 88], w: 0.38 * 1.4, color: '#8fb4ff' },
    { id: 'outer', name: 'Braccio Norma-Esterno', Rref: 13.0, bref: 18.6, pitch: 13.8, bmin: -60, bmax: 350, meas: [-6, 56], w: 0.63 * 1.1, color: '#8fb4ff' },
  ];

  U.MW.info = {
    vialattea: { id: 'vialattea', name: 'Via Lattea', type: 'Galassia a spirale barrata (SBbc)', cert: 'mod',
      facts: [['Diametro del disco stellare', '~30 kpc (~100.000 anni luce)'], ['Stelle', '100 – 400 miliardi'], ['Massa totale (con materia oscura)', '~1 – 1,5 × 10¹² masse solari'],
        ['Massa stellare', '~5 × 10¹⁰ masse solari'], ['Distanza del Sole dal centro', '8,178 kpc (26.670 anni luce)'], ['Età del disco sottile', '~8 – 10 miliardi di anni'], ['Barra', 'semilunghezza ~5 kpc, inclinata ~27°']],
      desc: 'La nostra galassia vista dall\'esterno: nessuno l\'ha mai fotografata così. Questa ricostruzione combina le parallassi VLBI dei maser nelle regioni di formazione stellare (Reid et al. 2014, 2019), la struttura della barra da conteggi stellari infrarossi (Wegg et al. 2015) e i parametri strutturali del disco (Bland-Hawthorn & Gerhard 2016). Il blu segue le stelle giovani nei bracci, il rosa le regioni HII, il giallo-arancio le stelle vecchie di bulge e barra, le macchie scure le polveri.',
      frontier: 'Il numero dei bracci principali (2 o 4) e la loro continuità dietro il centro galattico, dove la polvere nasconde quasi tutto, sono ancora discussi: circa metà del disco è di fatto non mappata. I tratti dei bracci oltre le regioni misurate sono estrapolazioni.',
      claude: 'Questa è l\'immagine più "ricostruita" dell\'intero modello: la vediamo da dentro, come un pesce che cerca di disegnare la forma del proprio lago.',
      src: ['reid2014', 'reid2019', 'wegg2015', 'blandhawthorn2016', 'gaia_dr3'] },
    sgra: { id: 'sgra', name: 'Sagittarius A*', type: 'Buco nero supermassiccio', cert: 'mis',
      facts: [['Massa', '4,3 milioni di masse solari'], ['Distanza', '8,178 kpc (26.670 anni luce)'], ['Raggio di Schwarzschild', '~12,7 milioni di km (0,085 UA)'], ['Prima immagine', 'EHT, maggio 2022']],
      desc: 'Il buco nero al centro della Via Lattea. La sua massa è misurata seguendo per decenni le orbite delle stelle vicine, come S2 che passa a sole ~120 UA con una velocità di quasi 8.000 km/s: lavoro premiato con il Nobel per la Fisica 2020 (Genzel, Ghez). La collaborazione Event Horizon Telescope ne ha pubblicato l\'immagine dell\'ombra nel 2022.',
      frontier: 'Perché sia oggi così poco attivo, e quando abbia generato l\'ultimo grande lampo (forse le bolle di Fermi, qualche milione di anni fa), è oggetto di ricerca.',
      src: ['gravity2019', 'eht_sgra', 'ghez_genzel'] },
    barra: { id: 'barra', name: 'Barra e bulge galattico', type: 'Struttura stellare centrale', cert: 'mod',
      facts: [['Semilunghezza della barra', '~5 kpc'], ['Angolo rispetto alla linea Sole–centro', '~27°'], ['Forma del bulge', 'a "nocciolina" (boxy/peanut)']],
      desc: 'Il centro della Via Lattea non è una sfera ma una barra di stelle vecchie, con l\'estremità più vicina a noi verso longitudini positive. Il bulge interno ha forma a "X" o nocciolina, tipica delle barre che si sono ispessite verticalmente.', src: ['wegg2015', 'blandhawthorn2016'] },
    fermi: { id: 'fermi', name: 'Bolle di Fermi', type: 'Lobi di emissione gamma', cert: 'mod',
      facts: [['Estensione', '~8 – 10 kpc sopra e sotto il piano'], ['Scoperta', 'Fermi-LAT, 2010'], ['Età stimata', 'alcuni milioni di anni']],
      desc: 'Due enormi lobi di raggi gamma e raggi X simmetrici rispetto al centro galattico, probabilmente prodotti da un episodio di attività di Sagittarius A* o da un\'intensa formazione stellare centrale. La forma qui è schematica.',
      frontier: 'Il meccanismo (getto del buco nero o venti stellari) è discusso; eROSITA nel 2020 ha trovato bolle ancora più grandi ai raggi X.', src: ['su2010'] },
    alone: { id: 'alone', name: 'Alone di materia oscura', type: 'Componente invisibile', cert: 'mod',
      facts: [['Raggio viriale', '~200 – 300 kpc'], ['Massa', '~10¹² masse solari'], ['Frazione di massa', '~85 – 90% della galassia']],
      desc: 'La curva di rotazione della Galassia resta quasi piatta fino a grande distanza: la massa visibile non basta a spiegarla. Serve un alone esteso di materia che non emette luce. La sfera tratteggiata ne indica la scala tipica.',
      frontier: 'Di che cosa sia fatta la materia oscura è una delle domande più grandi della fisica. Nessun esperimento di rivelazione diretta l\'ha ancora vista.',
      claude: 'Quasi tutta la massa di questa scena è invisibile. Disegno un cerchio vuoto perché è l\'onesta rappresentazione di ciò che sappiamo: che c\'è, non cosa sia.',
      src: ['blandhawthorn2016'] },
    bollalocale: { id: 'bollalocale', name: 'Bolla Locale', type: 'Cavità di gas caldo', cert: 'mod',
      facts: [['Dimensioni', '~300 pc (~1.000 anni luce)'], ['Origine', '~15 supernove negli ultimi ~14 milioni di anni']],
      desc: 'Il Sole si trova dentro una cavità di gas caldo e rarefatto scavata da una serie di esplosioni di supernova. La sua espansione ha compresso il gas circostante, innescando la formazione delle stelle giovani vicine a noi.', src: ['zucker2022'] },
    sole_mw: { id: 'sole_mw', name: 'Sole (Tu sei qui)', type: 'La nostra stella', cert: 'mis',
      facts: [['Distanza dal centro', '8,178 kpc'], ['Altezza sul piano', '~20 pc'], ['Velocità orbitale', '~240 km/s'], ['Anno galattico', '~230 milioni di anni']],
      desc: 'Il Sole sta al bordo interno del Braccio di Orione, uno sperone tra i bracci di Sagittario e Perseo. Zooma o premi "Esplora" per entrare nel vicinato solare.', src: ['gravity2019', 'reid2019'] },
    globulari: { id: 'globulari', name: 'Sistema di ammassi globulari', type: 'Popolazione dell\'alone', cert: 'mod',
      facts: [['Ammassi noti', '~160'], ['Età tipica', '10 – 13 miliardi di anni']],
      desc: 'Circa 160 ammassi globulari orbitano nell\'alone. Nel 1918 Harlow Shapley, notando che sono centrati lontano dal Sole, dedusse che non siamo al centro della Galassia. I punti gialli senza nome sono una distribuzione statistica; quelli etichettati sono reali.', src: ['harris2010'] },
  };

  // Oggetti notevoli: l, b [deg], d [kpc]  oppure ra/dec
  const O = (id, name, type, pos, extra) => Object.assign({ id, name, type, pos }, extra);
  U.MW.objects = [
    O('orione', 'Nebulosa di Orione (M42)', 'Regione di formazione stellare', { l: 209.01, b: -19.38, d: 0.39 }, { color: '#ff7aa8', cert: 'mis',
      facts: [['Distanza', '~1.300 anni luce'], ['Diametro', '~24 anni luce'], ['Età del Trapezio', '< 1 milione di anni']],
      desc: 'La regione di formazione di stelle massicce più vicina. Il Trapezio, al centro, illumina e ionizza il gas. Hubble e JWST vi hanno osservato dischi protoplanetari ("proplidi") e oggetti di massa planetaria liberi.', src: ['gaia_dr3'] }),
    O('pleiadi', 'Pleiadi (M45)', 'Ammasso aperto', { l: 166.57, b: -23.52, d: 0.136 }, { color: '#9fc4ff', cert: 'mis',
      facts: [['Distanza', '~444 anni luce'], ['Età', '~100 milioni di anni'], ['Stelle', '> 1.000']],
      desc: 'Ammasso di stelle giovani e calde. La sua distanza fu al centro di una lunga controversia tra Hipparcos e altri metodi, risolta da Gaia a favore dei ~136 pc.', src: ['gaia_dr3'] }),
    O('aquila', 'Nebulosa Aquila (M16)', 'Regione HII', { l: 16.95, b: 0.79, d: 1.74 }, { color: '#ff7aa8', cert: 'mis',
      facts: [['Distanza', '~5.700 anni luce']], desc: 'Sede dei "Pilastri della Creazione", colonne di gas freddo erose dalla radiazione di stelle massicce.' }),
    O('carina', 'Nebulosa della Carena', 'Regione HII gigante', { l: 287.6, b: -0.63, d: 2.35 }, { color: '#ff7aa8', cert: 'mis',
      facts: [['Distanza', '~7.500 anni luce'], ['Stella più famosa', 'Eta Carinae (~100 masse solari, binaria)']],
      desc: 'Una delle più grandi nebulose della Galassia. Eta Carinae, al suo interno, ebbe una "grande eruzione" nel 1843 e potrebbe esplodere come supernova in un futuro astronomicamente vicino.' }),
    O('granchio', 'Nebulosa del Granchio (M1)', 'Resto di supernova', { l: 184.56, b: -5.78, d: 2.0 }, { color: '#c8a8ff', cert: 'mis',
      facts: [['Distanza', '~6.500 anni luce'], ['Esplosione osservata', '1054 d.C. (astronomi cinesi)'], ['Pulsar centrale', '30 giri al secondo']],
      desc: 'Il resto della supernova registrata nel 1054. Al centro una stella di neutroni ruota 30 volte al secondo e alimenta la nebulosa con particelle relativistiche.' }),
    O('omegacen', 'Omega Centauri', 'Ammasso globulare', { l: 309.10, b: 14.97, d: 5.43 }, { color: '#ffd9a0', cert: 'mis',
      facts: [['Stelle', '~10 milioni'], ['Distanza', '~17.700 anni luce']],
      desc: 'Il più grande ammasso globulare della Via Lattea, con popolazioni stellari multiple: probabilmente il nucleo di una galassia nana assorbita. Nel 2024 vi è stata trovata evidenza di un buco nero di massa intermedia (Häberle et al., Nature).', src: ['harris2010'] }),
    O('m13', 'Ammasso di Ercole (M13)', 'Ammasso globulare', { l: 59.01, b: 40.91, d: 7.1 }, { color: '#ffd9a0', cert: 'mis',
      facts: [['Stelle', '~300.000'], ['Distanza', '~23.000 anni luce']], desc: 'Destinazione simbolica del messaggio di Arecibo del 1974, che arriverà tra circa 25.000 anni.', src: ['harris2010'] }),
    O('47tuc', '47 Tucanae', 'Ammasso globulare', { l: 305.90, b: -44.89, d: 4.5 }, { color: '#ffd9a0', cert: 'mis',
      facts: [['Distanza', '~14.700 anni luce']], desc: 'Secondo ammasso globulare più luminoso del cielo, vicino alla Piccola Nube di Magellano sulla volta celeste.', src: ['harris2010'] }),
    O('betelgeuse', 'Betelgeuse', 'Supergigante rossa', { l: 199.79, b: -8.96, d: 0.168 }, { color: '#ff9a6a', cert: 'mis',
      facts: [['Raggio', '~750 raggi solari'], ['Distanza', '~550 anni luce'], ['Fase', 'combustione dell\'elio nel nucleo']],
      desc: 'Se fosse al posto del Sole ne inghiottirebbe l\'orbita di Marte. Il "Grande Oscuramento" del 2019–2020 fu causato da una nube di polvere espulsa. Esploderà come supernova, probabilmente tra ~100.000 anni.', src: ['joyce2020'] }),
    O('rigel', 'Rigel', 'Supergigante blu', { l: 209.24, b: -25.25, d: 0.26 }, { color: '#a8c8ff', cert: 'mis', facts: [['Luminosità', '~120.000 Soli'], ['Distanza', '~860 anni luce']], desc: 'La stella più brillante di Orione.' }),
    O('antares', 'Antares', 'Supergigante rossa', { l: 351.95, b: 15.06, d: 0.17 }, { color: '#ff8a5a', cert: 'mis', facts: [['Raggio', '~700 raggi solari'], ['Distanza', '~550 anni luce']], desc: 'Il "cuore dello Scorpione", rivale di Marte per colore.' }),
    O('deneb', 'Deneb', 'Supergigante bianca', { l: 84.28, b: 1.99, d: 0.8 }, { color: '#dfe8ff', cert: 'sti', facts: [['Distanza', '~2.600 anni luce (incerta)'], ['Luminosità', '~100.000 – 200.000 Soli']], desc: 'Una delle stelle più luminose visibili a occhio nudo; la sua distanza è ancora incerta.' }),
    O('polare', 'Stella Polare', 'Supergigante gialla cefeide', { l: 123.28, b: 26.46, d: 0.133 }, { color: '#fff2c8', cert: 'mis', facts: [['Distanza', '~430 anni luce']], desc: 'La cefeide più vicina: le cefeidi sono il secondo gradino della scala delle distanze cosmiche.' }),
    O('canopo', 'Canopo', 'Supergigante bianco-gialla', { l: 261.21, b: -25.29, d: 0.095 }, { color: '#fff4dc', cert: 'mis', facts: [['Distanza', '~310 anni luce']], desc: 'Seconda stella più brillante del cielo; usata dalle sonde come riferimento di assetto.' }),
    O('vycma', 'VY Canis Majoris', 'Ipergigante rossa', { l: 239.35, b: -5.07, d: 1.2 }, { color: '#ff7a4a', cert: 'mis', facts: [['Raggio', '~1.400 raggi solari'], ['Distanza', '~3.900 anni luce']], desc: 'Una delle stelle più grandi conosciute, avvolta da nubi di materia espulsa.' }),
    O('cygx1', 'Cygnus X-1', 'Buco nero stellare in binaria', { l: 71.33, b: 3.07, d: 2.22 }, { color: '#c8a8ff', cert: 'mis',
      facts: [['Massa del buco nero', '~21 masse solari'], ['Distanza', '~7.200 anni luce']], desc: 'Il primo buco nero identificato (1972), che strappa gas a una supergigante blu compagna.', src: ['millerjones2021'] }),
    O('gaiabh3', 'Gaia BH3', 'Buco nero stellare dormiente', { ra: '19 39 19', dec: '+14 55 54', d: 0.59 }, { color: '#c8a8ff', cert: 'mis',
      facts: [['Massa', '~33 masse solari'], ['Distanza', '~1.900 anni luce'], ['Scoperta', 'Gaia, 2024']], desc: 'Il buco nero stellare più massiccio della Galassia noto, scoperto dal moto oscillante della stella compagna, senza emissione di raggi X.', src: ['gaia_bh3'] }),
    O('elica', 'Nebulosa Elica (NGC 7293)', 'Nebulosa planetaria', { l: 36.16, b: -57.12, d: 0.20 }, { color: '#7fe0d0', cert: 'mis', facts: [['Distanza', '~650 anni luce']], desc: 'Una delle nebulose planetarie più vicine: gli strati esterni espulsi da una stella simile al Sole alla fine della vita. Il destino del Sole.' }),
    O('casa', 'Cassiopea A', 'Resto di supernova', { l: 111.73, b: -2.13, d: 3.4 }, { color: '#c8a8ff', cert: 'mis', facts: [['Esplosione', '~1680 (non registrata con certezza)'], ['Distanza', '~11.000 anni luce']], desc: 'Il resto di supernova più giovane della Galassia noto, fortissima radiosorgente.' }),
    O('laguna', 'Nebulosa Laguna (M8)', 'Regione HII', { l: 6.0, b: -1.2, d: 1.25 }, { color: '#ff7aa8', cert: 'mis', facts: [['Distanza', '~4.100 anni luce']], desc: 'Grande nebulosa di emissione nel Sagittario, visibile a occhio nudo.' }),
    O('nordamerica', 'Nebulosa Nord America', 'Regione HII', { l: 85.6, b: -0.7, d: 0.8 }, { color: '#ff7aa8', cert: 'mis', facts: [['Distanza', '~2.600 anni luce']], desc: 'Regione di formazione stellare nel Cigno, parte del complesso Cygnus X.' }),
  ];

  // --- Gruppo Locale -----------------------------------------------------------
  // kind: spiral | irregular | dsph | elliptical ; R: raggio visivo [kpc]
  const G = (id, name, type, pos, extra) => Object.assign({ id, name, type, pos }, extra);
  U.LG = {
    info: {
      gruppolocale: { id: 'gruppolocale', name: 'Gruppo Locale', type: 'Gruppo di galassie', cert: 'mis',
        facts: [['Diametro', '~3 Mpc (~10 milioni di anni luce)'], ['Membri', '> 80 galassie, quasi tutte nane'], ['Massa', '~2 – 5 × 10¹² masse solari'], ['Galassie principali', 'Andromeda, Via Lattea, Triangolo']],
        desc: 'Il nostro "quartiere" cosmico: due grandi spirali, Via Lattea e Andromeda, ciascuna con il proprio corteo di galassie satelliti, più la Galassia del Triangolo e decine di nane. La sfera tratteggiata indica la superficie di velocità nulla (~1 Mpc), oltre la quale le galassie si allontanano con l\'espansione cosmica.',
        frontier: 'Ne scopriamo ancora: molte galassie nane ultradeboli sono state trovate solo con le survey digitali degli ultimi 20 anni, e il numero di satelliti è un test chiave del modello di materia oscura fredda.',
        src: ['mcconnachie2012'] },
      baricentro: { id: 'baricentro', name: 'Baricentro del Gruppo Locale', type: 'Punto di riferimento', cert: 'sti',
        facts: [['Posizione', 'tra Via Lattea e Andromeda (dipende dal rapporto delle masse)']],
        desc: 'Il centro di massa del Gruppo. La sua posizione esatta dipende dalle masse di Via Lattea e Andromeda, ancora incerte di un fattore ~2.', src: ['vandermarel2012'] },
    },
    galaxies: [
      G('m31', 'Galassia di Andromeda (M31)', 'Galassia a spirale (SA(s)b)', { ra: '00 42 44.3', dec: '+41 16 09', d: 761 }, {
        kind: 'spiral', R: 25, Rd: 5.3, inc: 77, pa: 38, n: 1.0, color: '#ffe2b8', cert: 'mis', label: 1,
        facts: [['Distanza', '761 kpc (~2,5 milioni di anni luce)'], ['Diametro del disco', '~46 kpc'], ['Stelle', '~1.000 miliardi'], ['Velocità radiale', '−300 km/s (−110 km/s rispetto alla Via Lattea)']],
        desc: 'La grande galassia più vicina e l\'oggetto più lontano visibile a occhio nudo. Nel 1923 Edwin Hubble vi identificò delle cefeidi, dimostrando che è una galassia esterna. Ha un anello di formazione stellare a ~10 kpc e un alone con flussi stellari di galassie cannibalizzate. Orientamento del disco (inclinazione 77°, angolo di posizione 38°) reale.',
        frontier: 'La collisione con la Via Lattea tra ~4–5 miliardi di anni era considerata quasi certa (van der Marel et al. 2012). Una nuova analisi con i dati Gaia e HST (Sawala et al. 2025) stima invece solo ~50% di probabilità di fusione nei prossimi 10 miliardi di anni.',
        claude: 'Uno dei miei esempi preferiti di scienza che cambia: una "certezza" da manuale è diventata un lancio di moneta non appena le incertezze sono state propagate per bene.',
        src: ['m31_distance', 'vandermarel2012', 'sawala2025'] }),
      G('m33', 'Galassia del Triangolo (M33)', 'Galassia a spirale (SA(s)cd)', { ra: '01 33 50.9', dec: '+30 39 37', d: 840 }, {
        kind: 'spiral', R: 9, Rd: 1.8, inc: 55, pa: 22, n: 0.35, color: '#cfe0ff', cert: 'mis', label: 1,
        facts: [['Distanza', '~840 kpc (2,7 milioni di anni luce)'], ['Diametro', '~18 kpc'], ['Stelle', '~40 miliardi']],
        desc: 'Terza galassia del Gruppo Locale, forse satellite di Andromeda. Ricca di gas e di formazione stellare, con la regione HII gigante NGC 604.', src: ['mcconnachie2012'] }),
      G('lmc', 'Grande Nube di Magellano', 'Irregolare barrata (SB(s)m)', { l: 280.47, b: -32.89, d: 49.59 }, {
        kind: 'irregular', R: 5, inc: 35, pa: 170, ra: '05 23 34.5', dec: '-69 45 22', n: 0.3, color: '#dfe8ff', cert: 'mis', label: 1,
        facts: [['Distanza', '49,59 kpc (±1%)'], ['Massa', '~1 – 2 × 10¹¹ masse solari (con alone)'], ['Supernova', 'SN 1987A']],
        desc: 'Il satellite più massiccio della Via Lattea, così grande da deformarne l\'alone e il disco. La sua distanza, misurata all\'1% con binarie a eclisse, è il gradino di base della scala delle distanze extragalattiche. Vi esplose SN 1987A, la supernova più vicina dell\'era moderna.',
        frontier: 'Se sia al primo passaggio vicino alla Via Lattea (ipotesi oggi favorita) o in orbita da tempo.', src: ['pietrzynski2019'] }),
      G('smc', 'Piccola Nube di Magellano', 'Irregolare nana', { l: 302.80, b: -44.30, d: 62.4 }, {
        kind: 'irregular', R: 3, inc: 60, pa: 45, ra: '00 52 44.8', dec: '-72 49 43', n: 0.15, color: '#dfe8ff', cert: 'mis', label: 1,
        facts: [['Distanza', '~62 kpc'], ['Legame', 'interagisce con la Grande Nube (Ponte Magellanico)']],
        desc: 'Galassia nana irregolare, allungata lungo la linea di vista e distorta dall\'interazione con la Grande Nube.', src: ['mcconnachie2012'] }),
      G('sgrdsph', 'Nana Sferoidale del Sagittario', 'Galassia nana in distruzione', { l: 5.57, b: -14.17, d: 26 }, {
        kind: 'dsph', R: 2.5, n: 0.12, color: '#ffe8c8', cert: 'mis', label: 2,
        facts: [['Distanza', '~26 kpc (dietro il centro galattico)'], ['Stato', 'lacerata dalle maree della Via Lattea']],
        desc: 'Galassia satellite in fase di distruzione: le sue stelle formano un flusso che avvolge la Galassia. I suoi passaggi attraverso il disco potrebbero aver innescato episodi di formazione stellare, incluso quello del Sole.', src: ['sagdsph'] }),
      G('m32', 'M32', 'Ellittica compatta', { l: 121.15, b: -21.98, d: 763 }, { kind: 'elliptical', R: 1.2, n: 0.08, color: '#ffe8c8', cert: 'mis', label: 2,
        facts: [['Satellite di', 'Andromeda']], desc: 'Piccola ellittica compatta, forse il nucleo superstite di una spirale più grande spogliata da Andromeda.' }),
      G('m110', 'M110 (NGC 205)', 'Ellittica nana', { l: 120.72, b: -21.14, d: 824 }, { kind: 'elliptical', R: 2.5, n: 0.08, color: '#ffe8c8', cert: 'mis', label: 2, facts: [['Satellite di', 'Andromeda']], desc: 'Ellittica nana con tracce di formazione stellare recente.' }),
      G('ngc185', 'NGC 185', 'Sferoidale nana', { l: 120.79, b: -14.48, d: 617 }, { kind: 'dsph', R: 1.5, n: 0.05, color: '#ffe8c8', cert: 'mis', label: 3, facts: [['Satellite di', 'Andromeda']], desc: 'Satellite di Andromeda.' }),
      G('ngc147', 'NGC 147', 'Sferoidale nana', { l: 119.82, b: -14.25, d: 676 }, { kind: 'dsph', R: 1.5, n: 0.05, color: '#ffe8c8', cert: 'mis', label: 3, facts: [['Satellite di', 'Andromeda']], desc: 'Satellite di Andromeda.' }),
      G('ic10', 'IC 10', 'Irregolare starburst', { l: 118.97, b: -3.33, d: 794 }, { kind: 'irregular', R: 1.5, n: 0.05, color: '#dfe8ff', cert: 'mis', label: 3, facts: [['Distanza', '~794 kpc']], desc: 'L\'unica galassia starburst del Gruppo Locale, nascosta dietro il piano della Via Lattea.' }),
      G('ngc6822', 'Galassia di Barnard (NGC 6822)', 'Irregolare barrata', { l: 25.34, b: -18.40, d: 500 }, { kind: 'irregular', R: 1.8, n: 0.05, color: '#dfe8ff', cert: 'mis', label: 2, facts: [['Distanza', '~500 kpc']], desc: 'Irregolare isolata, tra le prime galassie riconosciute come esterne alla Via Lattea (Hubble, 1925).' }),
      G('ic1613', 'IC 1613', 'Irregolare nana', { l: 129.73, b: -60.58, d: 730 }, { kind: 'irregular', R: 1.5, n: 0.04, color: '#dfe8ff', cert: 'mis', label: 3, facts: [['Distanza', '~730 kpc']], desc: 'Nana irregolare povera di polveri, usata per calibrare le distanze.' }),
      G('wlm', 'WLM', 'Irregolare nana', { l: 75.86, b: -73.62, d: 933 }, { kind: 'irregular', R: 1.5, n: 0.04, color: '#dfe8ff', cert: 'mis', label: 3, facts: [['Distanza', '~933 kpc']], desc: 'Nana isolata ai margini del Gruppo Locale; JWST vi ha studiato stelle antiche povere di metalli.' }),
      G('leoi', 'Leo I', 'Sferoidale nana', { l: 225.99, b: 49.11, d: 254 }, { kind: 'dsph', R: 0.6, n: 0.03, color: '#ffe8c8', cert: 'mis', label: 3, facts: [['Distanza', '~254 kpc']], desc: 'Uno dei satelliti più lontani della Via Lattea; nel 2021 vi è stato stimato un buco nero centrale sorprendentemente massiccio (dibattuto).' }),
      G('leoii', 'Leo II', 'Sferoidale nana', { l: 220.17, b: 67.23, d: 233 }, { kind: 'dsph', R: 0.4, n: 0.02, color: '#ffe8c8', cert: 'mis', label: 3, facts: [['Distanza', '~233 kpc']], desc: 'Satellite lontano della Via Lattea.' }),
      G('draco', 'Draco', 'Sferoidale nana', { l: 86.37, b: 34.72, d: 76 }, { kind: 'dsph', R: 0.5, n: 0.02, color: '#ffe8c8', cert: 'mis', label: 3, facts: [['Distanza', '~76 kpc']], desc: 'Una delle galassie più dominate dalla materia oscura: laboratorio per cercarne segnali di annichilazione.' }),
      G('ursaminor', 'Orsa Minore', 'Sferoidale nana', { l: 104.97, b: 44.80, d: 76 }, { kind: 'dsph', R: 0.5, n: 0.02, color: '#ffe8c8', cert: 'mis', label: 3, facts: [['Distanza', '~76 kpc']], desc: 'Nana sferoidale antica, senza formazione stellare recente.' }),
      G('sculptor', 'Sculptor', 'Sferoidale nana', { l: 287.53, b: -83.16, d: 86 }, { kind: 'dsph', R: 0.5, n: 0.02, color: '#ffe8c8', cert: 'mis', label: 3, facts: [['Distanza', '~86 kpc']], desc: 'La prima sferoidale nana scoperta (Shapley, 1937).' }),
      G('fornaxdsph', 'Fornace', 'Sferoidale nana', { l: 237.10, b: -65.65, d: 147 }, { kind: 'dsph', R: 1.0, n: 0.03, color: '#ffe8c8', cert: 'mis', label: 3, facts: [['Distanza', '~147 kpc']], desc: 'Nana sferoidale con propri ammassi globulari.' }),
      G('carinadsph', 'Carena', 'Sferoidale nana', { l: 260.11, b: -22.22, d: 105 }, { kind: 'dsph', R: 0.4, n: 0.02, color: '#ffe8c8', cert: 'mis', label: 3, facts: [['Distanza', '~105 kpc']], desc: 'Storia di formazione stellare a episodi distinti.' }),
      G('sextans', 'Sestante', 'Sferoidale nana', { l: 243.50, b: 42.27, d: 86 }, { kind: 'dsph', R: 0.7, n: 0.02, color: '#ffe8c8', cert: 'mis', label: 3, facts: [['Distanza', '~86 kpc']], desc: 'Nana molto diffusa e debole.' }),
      G('crater2', 'Crater II', 'Nana ultradiffusa', { l: 282.91, b: 42.03, d: 117.5 }, { kind: 'dsph', R: 1.1, n: 0.02, color: '#ffe8c8', cert: 'mis', label: 3, facts: [['Distanza', '~117 kpc'], ['Scoperta', '2016']], desc: 'Grande quanto la Grande Nube ma centinaia di volte più debole: una "galassia fantasma" scoperta solo nel 2016.' }),
      G('antlia2', 'Antlia 2', 'Nana ultradiffusa', { l: 264.90, b: 11.25, d: 130 }, { kind: 'dsph', R: 1.4, n: 0.02, color: '#ffe8c8', cert: 'mis', label: 3, facts: [['Distanza', '~130 kpc'], ['Scoperta', 'Gaia, 2018']], desc: 'Uno dei satelliti più estesi e più deboli mai trovati, scoperto con i moti propri di Gaia.' }),
      G('phoenix', 'Phoenix', 'Nana di transizione', { l: 272.16, b: -68.95, d: 415 }, { kind: 'irregular', R: 0.5, n: 0.02, color: '#dfe8ff', cert: 'mis', label: 3, facts: [['Distanza', '~415 kpc']], desc: 'A metà tra una nana irregolare e una sferoidale.' }),
      G('tucana', 'Tucana', 'Sferoidale nana isolata', { l: 322.91, b: -47.37, d: 887 }, { kind: 'dsph', R: 0.4, n: 0.02, color: '#ffe8c8', cert: 'mis', label: 3, facts: [['Distanza', '~887 kpc']], desc: 'Sferoidale isolata, lontana da entrambe le grandi spirali.' }),
      G('pegdig', 'Nana irregolare di Pegaso', 'Irregolare nana', { l: 94.77, b: -43.55, d: 920 }, { kind: 'irregular', R: 0.6, n: 0.02, color: '#dfe8ff', cert: 'mis', label: 3, facts: [['Distanza', '~920 kpc']], desc: 'Piccola irregolare vicina ad Andromeda sulla volta celeste.' }),
    ],
  };
})(window.U);
