# Cosmografia — guida per riprendere il lavoro

Guida scritta per una futura sessione di Claude (o per chiunque riprenda il codice).
Il progetto è un **universo navigabile in WebGL**, dalla superficie della Terra al bordo
dell'universo osservabile, costruito su dati e articoli reali. Tutto il testo per l'utente è in **italiano**.

Richiesta originale dell'utente (settembre 2026): "l'universo visto con i tuoi occhi", basato su
ricerche reali, con galassie, stelle e pianeti esplorabili con lo zoom e una scheda descrittiva per ogni
oggetto cliccato; il sistema deve essere il più reale e accurato possibile. Deve funzionare aprendo un file HTML.

## Principi (non negoziabili)

1. **Onestà epistemica.** Ogni oggetto ha `cert`: `mis` misurato · `mod` modello da dati · `sti` stima/indicativo ·
   `ipo` ipotesi · `ill` illustrativo. Mai presentare come misurato ciò che è generato (rete cosmica, filamenti,
   fase orbitale delle lune, aspetto degli esopianeti, texture non terrestri).
2. **Niente dati o citazioni inventati.** In `js/data/sources.js` si mette un link arXiv/DOI **solo se verificato**;
   altrimenti solo il testo della citazione. Se aggiungi fonti incerte, verificale con WebSearch prima.
3. **Scale reali**: distanze e raggi veri. L'unica esagerazione è il pulsante "Ingrandisci pianeti ×600" (esplicito).
4. **Calcolare invece di disegnare**: posizioni planetarie da elementi JPL alla data simulata, Luna dall'Astronomical
   Almanac, distanze cosmologiche integrando Friedmann (Planck 2018).
5. Ogni scheda può avere `frontier` ("Cosa non sappiamo ancora") e `claude` ("Nota di Claude": breve riflessione
   ancorata ai dati, mai enfatica).

## Repository e posizione

- Cartella locale: `C:\Users\borio\Desktop\Cartelle\00_github progetti\cosmografia` (spostata da `progetti/claudio v1`
  il 16/09/2026; convenzione dell'utente: nome cartella = nome repo, vedi `clone_all.ps1` nella cartella superiore).
- GitHub: https://github.com/filippoborioli-ai/cosmografia (pubblico, necessario per GitHub Pages gratuito).
- Sito: https://filippoborioli-ai.github.io/cosmografia/ (Pages dal ramo `main`, radice; `.nojekyll` presente).
- Dopo ogni modifica: `node tools/test-levels.js`, `node tools/build.js`, commit (con riga Co-Authored-By) e push:
  Pages si aggiorna in 1–2 minuti.

## Come si avvia

- **Sviluppo**: doppio clic su `index.html` (script classici, niente moduli ES → funziona da `file://`).
  three.js r149 è in `vendor/three.min.js` (fallback CDN jsdelivr se manca).
- **File unico offline**: `node tools/build.js` → `dist/universo.html` (tutto incorporato, ~1,3 MB).
- **Versione Artifact** (claude.ai): stesso comando → `dist/artifact.html` (senza html/head/body, three.js da
  `cdn.jsdelivr.net`, unico host di script ammesso insieme a cdnjs). Pubblicare con lo strumento Artifact passando
  `file_path` = `dist/artifact.html`. Per aggiornare lo stesso URL: stesso percorso nella stessa sessione, altrimenti
  passare `url` dell'artifact esistente (vedi sotto) dopo averlo letto con `action: "read"`.
- **Qualità particelle**: `U.QUALITY` automatico dalla GPU (NVIDIA/RTX 1,6 · Intel 0,8 · mobile 0,45); forzabile con
  `index.html?q=2`. PC dell'utente: ASUS ROG Zephyrus G16, RTX 4070 Laptop + Intel UHD, 2560×1600@240Hz. Chrome/Edge
  spesso usano la Intel: per la RTX, Impostazioni Windows → Schermo → Grafica → browser → "Prestazioni elevate".

## Collaudo

- `node tools/test-levels.js` — costruisce **tutti** i livelli senza WebGL e verifica: focus esistenti, portali verso
  livelli esistenti, isteresi ingresso/uscita, chiavi fonte valide, posizioni non-NaN. Eseguire dopo ogni modifica ai dati.
- `node --check` su ogni file JS per la sintassi.
- Browser reale: la skill `browser-automation` richiede patchright (non installato su questo PC). Funziona invece
  `puppeteer-core` installato nello scratchpad (`npm i puppeteer-core@23`) con
  `executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'`, `headless: 'new'`,
  args `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist`. Attendere `U.Engine.cur.id === id && !U.Engine.transitioning`.
  Nascondere l'intro con `document.getElementById('intro').hidden = true`. Per risparmiare token: più screenshot
  riuniti in un mosaico con PIL, poi una sola lettura dell'immagine.
  Risultati verificati (16–17/09/2026): 0 errori console, 60 fps su Intel UHD, zoom continuo con la rotella
  cosmos → local → localgroup → milkyway → neighborhood → solar → planet:terra e ritorno.

## Dati reali (v2, 17/09/2026) — `python tools/fetch_data.py`

Script unico che scarica e incorpora i dati in `js/data/gen/*.js` (base64 binario compatto, decodificato da
`js/core/realdata.js`). Cache in `tools/.cache/` (ignorata da git). Opzioni: `--only hyg,sbdb,named,sats,horizons,textures`.

| File generato | Fonte | Contenuto | Uso |
|---|---|---|---|
| `hyg_sky.js` | HYG v4.1 (CC BY-SA 4.0) | 8.921 stelle mag ≤ 6,5 (RA, Dec, mag, B−V, flag entro 100 pc) | cielo di sfondo reale (`U.makeSky`) |
| `hyg_near.js` | HYG v4.1 | 24.705 stelle entro 100 pc (x,y,z galattici, M, B−V, nome; `*` = nome proprio) | vicinato: nuvola 3D con magnitudine apparente calcolata dalla camera (`U.SH.star3dVert`) + item selezionabili con scheda generata al volo (getter `info`) |
| `sbdb.js` | JPL SBDB Query API | ~42.000 orbite: MBA H<14,2, IMB, OMB, Troiani, tutti i TNO, Centauri, NEO H<19 | fascia/Kuiper/Troiani animati nel vertex shader (le lacune di Kirkwood emergono dai dati) |
| `named.js` | JPL SBDB API (full-prec) | 25 corpi con nome (Cerere, Vesta, Bennu, Apophis, Arrokoth, Eris, Sedna, Halley, 67P…) | `U.SOLAR.small` in `js/data/smallbodies.js` |
| `sats.js` | JPL SSD satellite mean elements | 169 lune, epoca J2000; `plane`: laplace (polo RA/Dec) · equatorial · ecliptic | `U.satAt(naif, jd, polo, retro)`; le lune in `solar.js` hanno `naif` |
| `horizons.js` | JPL Horizons API | 16 sonde/oggetti interstellari eliocentrici + JWST geocentrico | `U.hzAt` interpola; fuori intervallo estrapola (la scheda lo dice) |
| `../textures.js` | NASA Blue/Black Marble 4K + Solar System Scope (CC BY 4.0) | Terra giorno/notte/nubi, Luna, Mercurio, Venere, Marte, Giove, Saturno, Urano, Nettuno | `look.tex` → shader tipo 11; caricato **dopo** `main.js`, poi `U.onTextures()` aggiorna i materiali |

Note tecniche verificate: la mappa lunare ha il meridiano 0 al centro (u = 0,5 = +X locale) → la faccia visibile guarda la
Terra con la base `(toP, polo, toP×polo)`. Urano: elementi "equatorial" riferiti al polo di rotazione effettivo, quindi
il polo IAU va invertito se `W` ha tasso negativo (`retro`). SBDB senza `full-prec=1` arrotonda a 3 cifre.

## Navigazione v2

- **Viaggio tra le scale** `E.travel(levelId, itemId)`: zoom indietro fino al livello comune, poi zoom avanti
  seguendo i portali (`tripStep` nel ciclo). Barra "In viaggio verso… · Salta · Fermati qui". Rotella/pan annullano.
  Usato da ricerca, pulsante Terra (tasto H) e dai chip "Qui dentro" delle schede (`UI.contentsFor`): la scheda della
  Via Lattea elenca i pianeti, quella di un pianeta le lune, ecc.
- Cambio livello già costruito: istantaneo con breve dissolvenza del canvas (evento `dip`); livello nuovo: schermo di caricamento.
- Suggerimento "↓ zooma per entrare: …" quando il fuoco è un portale vicino alla soglia (`#portal-hint`).

## Video di presentazione — `tools/record-video.js`

Registra il volo dal bordo dell'universo osservabile alla Terra (~1 minuto, 1920×1080, 30 fps) con titolo iniziale,
didascalia per ogni scala, distanza di vista e titolo finale. Output: `video/cosmografia-presentazione.mp4` (cartella
ignorata da git: il video pesa decine di MB).

- Rendering deterministico: `evaluateOnNewDocument` sostituisce `requestAnimationFrame` e `performance.now` con un
  orologio virtuale (`window.__step(ms)`), quindi il video è fluido anche se ogni fotogramma richiede 200 ms.
- Tutti i livelli vengono costruiti prima di registrare; il volo usa `E.travel` con `E.tripSpeed = 0.4`.
- Ai cambi di livello Python/Pillow applica una dissolvenza incrociata di 12 fotogrammi; poi ffmpeg (H.264, CRF 20, max 12 Mbps).
- Requisiti fuori dal repo: `npm i puppeteer-core@23 ffmpeg-static@5` in una cartella, indicata con `MODULES=…/node_modules`.
  Prova veloce: `MAXF=240` (8 secondi).
- Registrato il 17/09/2026: con `--force_high_performance_gpu` Chrome headless usa la RTX 4070 (senza, usa la Intel UHD); `?q=1.6`.
  Circa 4 fotogrammi al secondo di registrazione (screenshot 1080p), quindi ~7 minuti per il video intero.

## Architettura (ordine di caricamento in `index.html`)

| File | Ruolo |
|---|---|
| `js/data/textures.js` | Blue Marble / Black Marble NASA (pubblico dominio) in base64. Generato con PIL (2048×1024 e 1024×512). Le immagini da `file://` non si possono caricare in WebGL, per questo sono data URI. |
| `js/core/util.js` | Costanti SI, RNG deterministico `U.rng`, rumore simplex JS `U.noise3`, conversioni RA/Dec↔galattiche↔eclittiche, Keplero, elementi Standish, Luna, **cosmologia** `U.Cosmo` (comovente, età, orizzonti), colore di corpo nero, formattazione italiana. |
| `js/core/shaders.js` | GLSL: punti luminosi, marcatori, cielo, pianeti procedurali (tipi 0–10), atmosfera, Sole, anelli con profilo reale e ombra, CMB sintetico, **cinture kepleriane risolte nel vertex shader**. Tutti includono i chunk `logdepthbuf`. |
| `js/core/factory.js` | `U.G` (uniform condivise), `U.PointBuilder`, marcatori, linee, `U.makeGalaxy` (disco esponenziale, bracci a spirale logaritmica alla Reid, bulge, barra, polveri, HII, grumi, Plummer), `U.diskQuaternion` (orientamento da inclinazione e PA), `U.makeSky` (stelle brillanti reali + costellazioni + bagliore galattico), materiali pianeta, `U.bodyQuaternion` (polo IAU + meridiano W), `U.makeCosmicWeb` (nodi reali + filamenti). |
| `js/core/engine.js` | Renderer (logarithmicDepthBuffer, high-performance), camera orbitale in **log-distanza**, registro livelli, transizioni con dissolvenza, picking in spazio schermo, etichette HTML con anti-sovrapposizione, anello di selezione, ciclo principale. |
| `js/data/*.js` | Cataloghi: `sources` (bibliografia), `solar` (Sole, pianeti, lune, piccoli corpi, sonde, regioni), `stars` (stelle brillanti, costellazioni, `U.NEAR` vicinato, `U.EXO` sistemi planetari), `galactic` (`U.MW` bracci/oggetti, `U.LG` Gruppo Locale), `cosmic` (`U.LOCAL` Laniakea, `U.COSMIC` universo osservabile). |
| `js/levels/*.js` | Costruttori di livello: `bodies` (corpo planetario riusabile), `solar` (Sistema solare + famiglia `planet:<id>`), `stellar` (vicinato + famiglia `exo:<id>`), `galactic` (Via Lattea, Gruppo Locale), `cosmic` (Laniakea, universo osservabile). |
| `js/ui.js` | Scheda informativa, ricerca (indice costruito dai dati, non dai livelli), percorso di scala, righello logaritmico 10⁶–10²⁷ m, barra del tempo, interruttori, intro. |
| `js/main.js` | Avvio: livello iniziale `solar` dietro l'intro. |
| `tools/build.js`, `tools/test-levels.js` | Build e collaudo. |

## Livelli di scala

| id | unità | frame | min–max distanza camera | genitore (focus) |
|---|---|---|---|---|
| `planet:<id>` | km | eclittico J2000 | 1,06 R – max(80 R, 3,2 × orbita lunare più esterna) | `solar` (pianeta) |
| `solar` | UA | eclittico J2000 | 2e-5 – 2,2e5 | `neighborhood` (`sole`) |
| `exo:<id>` | UA | arbitrario (piano orbitale = XZ) | 1e-5 – max(300, 60 × orbita esterna) | `neighborhood` (stella primaria) |
| `neighborhood` | anni luce | galattico, origine Sole | 1e-4 – 360 | `milkyway` (`sole_mw`) |
| `milkyway` | kpc | galattico, origine centro galattico | 0,003 – 480 | `localgroup` (`vialattea_lg`) |
| `localgroup` | kpc | galattico, origine centro galattico | 2 – 6500 | `local` (`gruppolocale_lu`) |
| `local` | Mpc | galattico | 0,25 – 3300 | `cosmos` (`vialattea_cosmo`) |
| `cosmos` | Gyr-luce comoventi | galattico | 0,15 – 450 | — |

**Transizioni.** Zoom oltre `maxDist` → livello genitore (distanza convertita con il rapporto delle unità, direzione di
vista convertita con `frameQuat` se i frame differiscono, es. eclittico→galattico). Zoom sotto `portal.enterDist` mentre
la camera **segue** un oggetto con `portal` → livello figlio. **Regola di isteresi**: `maxDist(figlio)` convertita nelle
unità del genitore deve essere > `enterDist` del portale, altrimenti si rimbalza tra i livelli (il test lo controlla).
Lungo lo zoom-in i portali puntano verso "casa": cosmos→`gruppolocale_lu`→`vialattea_lg`(focus `sole_mw`)→`sole`→Terra.

### Convenzioni di coordinate (importanti)

- Frame astronomico (x, y, z) → THREE `(x, z, −y)`: l'asse Y di THREE è sempre il polo nord del frame. Funzioni: `U.toThree`, `U.galVec(l, b, d)`, `U.eqVec(ra, dec, d)`.
- Galattico: x verso il centro galattico, y verso l = 90° (rotazione), z polo nord galattico. Il Sole nel frame
  galattocentrico sta in `(−8,178, 0,0208, 0)` kpc (`U.SUN_GC()`, `U.helioToGC`).
- Bracci (Reid et al. 2014): `ln(R/Rref) = −(β−βref)·tanψ`, posizione `(−R cosβ, z, −R sinβ)`; β = 0 verso il Sole,
  crescente nel verso di rotazione. Barra: estremo vicino a longitudini positive, angolo 27°.
- Corpi: mesh locale +Y = polo, +X = meridiano 0 (per la Terra Greenwich = GMST). UV della SphereGeometry: u = 0,5 a +X.

## API rapida

```js
U.defineLevel({ id, name, unit: {name, m}, minDist, maxDist, startDist, startView: [theta, phi] | (inst,E)=>[..],
  focus, sky: null|'galactic'|'galactic_far'|'ecliptic', extent, nearFade, timeControls, frameQuat, parent: (inst)=>({level, focus}),
  build(inst, E) { inst.scene.add(...); inst.marker({...}) / inst.add({...}) }, update(inst, {dt, jd, E}), onEnter, onExit, applyOptions })
U.defineLevelFamily('prefisso', (key) => def)   // livelli parametrici "prefisso:key"

// item (oggetto selezionabile)
{ id, info /*scheda*/, pos: Vector3, radius, viewDist, label: 0|1|2|3, labelMinDist, labelMaxDist, prio,
  portal: {level, focus, enterDist}, dynamicFacts: () => [[k, v]], pickable }
// scheda
{ name, type, cert, facts: [[k, v]], desc, frontier, claude, src: ['chiaveFonte'] }
```

Engine: `E.switchTo(id, {focus, dist, dir, select})`, `E.flyTo(item, dist)`, `E.center(item)`, `E.explore(item)`,
`E.goToItem(levelId, itemId)`, `E.exitToParent()`, eventi `level | select | tick | fade | time | error`.

### Aggiungere…

- **un oggetto** in un livello esistente: aggiungere il record nel file `js/data/` appropriato (con `cert`, `src`),
  poi se serve l'indice di ricerca in `buildIndex()` di `ui.js` (per `U.MW.objects`, `U.LG.galaxies`, `U.LOCAL.objects`,
  `U.COSMIC.objects`, `U.NEAR`, lune ed esopianeti è automatico).
- **un sistema extrasolare**: record in `U.EXO` + `sys: '<id>'` sulla stella in `U.NEAR`. `a` si calcola dal periodo con Keplero se manca.
- **un livello**: nuovo file in `js/levels/`, includerlo in `index.html` prima di `ui.js`, collegare `parent` e un
  `portal` nel genitore rispettando l'isteresi, aggiungere eventuale ancora in `ANCHORS` (`ui.js`) e ricordare `tools/test-levels.js` (lista `ids`).

## Limiti noti e scelte consapevoli

- Elementi Standish validi 1800–2050 (la barra del tempo lo segnala). Piccoli corpi con elementi osculanti fissi;
  Cerere calibrata sull'opposizione del 21/03/2023; Eris/Sedna/Haumea/Makemake da data di perielio (indicative).
- Lune (tranne la Luna) su orbite circolari con fase indicativa; satelliti artificiali senza TLE reali; sonde Voyager/New Horizons con direzione e velocità medie.
- Texture: solo la Terra è reale; gli altri corpi sono procedurali con palette plausibili (Grande Macchia Rossa e "cuore" di Plutone indicativi).
- Via Lattea: bracci estrapolati oltre i tratti misurati; lato opposto al centro galattico poco vincolato.
- Gruppo Locale: orientamenti reali per M31 (i 77°, PA 38°), M33, Nubi; nane con orientamento casuale.
- Laniakea: nodi = ammassi reali; filamenti, galassie di campo e linee di flusso sono schematici (`ill`/`mod`).
- Universo osservabile: rete da rumore procedurale; CMB sintetico (non la mappa Planck); posizioni in cielo di Giant Arc, Big Ring, HCB Great Wall, MoM-z14 approssimate.
- Dall'esterno il CMB è un velo al 20% di opacità, dall'interno all'85% (`update` del livello `cosmos`).

## Idee per le prossime versioni (in ordine di valore)

Fatto in v2: catalogo HYG, lune JPL, mappe reali, asteroidi reali, sonde Horizons, viaggio tra le scale.

1. Macchina del tempo cosmica: slider di redshift che ricostruisce l'universo a epoche diverse (fattore di scala `a(t)`).
2. Galassie reali per Laniakea: catalogo 2MASS Redshift Survey / Cosmicflows-4 al posto della rete statistica.
3. Mappe globali delle lune (Galileiane, Titano, Encelado, Plutone/Caronte da USGS/NASA, pubblico dominio).
4. Tour guidati con narrazione e modalità "confronta dimensioni" (Betelgeuse/Sole/Terra).
5. Superficie planetaria: mappe ad alta risoluzione a tasselli quando la camera è a meno di 2 raggi.
6. Satelliti artificiali reali da TLE (CelesTrak) — richiede fetch a runtime o aggiornamento frequente.
7. Riscaricare periodicamente i dati (`fetch_data.py`): lune, NEO, sonde e record cambiano ogni anno.

## Pubblicazione

Artifact pubblicato da `dist/artifact.html` (titolo "Cosmografia di Claude", favicon 🌌):
https://claude.ai/artifact/VWFjPRx3hqswuiVXRsREz1
Da un'altra conversazione: `Artifact action:"read" url:<questo>` poi publish con `url` e `file_path` = `dist/artifact.html`.
