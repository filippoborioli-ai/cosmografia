# Cosmografia di Claude

L'universo navigabile in 3D, dalla superficie della Terra al fondo cosmico a microonde, costruito su dati e
articoli scientifici reali. Ogni oggetto ha una scheda con dati, fonti, "cosa non sappiamo ancora" e un livello
di certezza dichiarato (misurato · modello · stima · ipotesi · illustrativo).

## Aprire

- **`dist/universo.html`** — file unico, funziona offline: doppio clic.
- **`index.html`** — versione di sviluppo (stessi contenuti, file separati).
- **Online (GitHub Pages):** https://filippoborioli-ai.github.io/cosmografia/
- **Online (artifact privato su claude.ai):** https://claude.ai/artifact/VWFjPRx3hqswuiVXRsREz1

Per usare la RTX 4070 invece della grafica Intel: Impostazioni di Windows → Sistema → Schermo → Grafica →
aggiungi il browser → "Prestazioni elevate". Densità particelle forzabile con `index.html?q=2`.

## Cosa contiene

- 8 scale annidate collegate dallo zoom: pianeti e lune → Sistema solare → stelle vicine ed esopianeti → Via Lattea →
  Gruppo Locale → Laniakea → universo osservabile.
- **Viaggio tra le scale**: clicca un oggetto (es. la Via Lattea) e nella scheda scegli dove andare (es. Terra, Titano):
  la camera vola attraverso i livelli. Anche la ricerca e il pulsante Terra (tasto H) fanno lo stesso viaggio.
- Pianeti e lune alla data simulata (JPL), mappe reali di Terra (con nubi), Luna, Mercurio, Venere, Marte, Giove,
  Saturno, Urano, Nettuno; ~42.000 asteroidi e oggetti transnettuniani con orbite vere; 16 sonde e oggetti
  interstellari con traiettorie JPL Horizons; 33.000 stelle reali del catalogo HYG.

## Comandi

Trascina per ruotare · rotella o pizzico per lo zoom (si passa da un livello di scala all'altro) · clic per la scheda ·
doppio clic per avvicinarti · tasto destro (o Maiusc) per spostarti · Backspace per salire di scala · H torna alla Terra ·
L etichette · O orbite · C costellazioni · Spazio pausa del tempo · Esc chiude.

## Sviluppo

```
python tools/fetch_data.py  # riscarica i dati reali (JPL, HYG, texture) in js/data/gen
node tools/test-levels.js   # collaudo di tutti i livelli senza browser
node tools/build.js         # rigenera dist/universo.html e dist/artifact.html
```

La guida tecnica completa per riprendere il lavoro è in [CLAUDE.md](CLAUDE.md).

## Crediti dei dati

- Motore 3D: [three.js](https://threejs.org) r149 (MIT).
- Terra giorno/notte: NASA Blue Marble e Black Marble (pubblico dominio).
- Texture di Sole, Luna e pianeti: [Solar System Scope](https://www.solarsystemscope.com/textures/), CC BY 4.0.
- Stelle: [HYG Database](https://github.com/astronexus/HYG-Database) v4.1 (astronexus), CC BY-SA 4.0.
- Orbite di asteroidi, Troiani, TNO e NEO: JPL Small-Body Database Query API. Lune: JPL SSD Planetary Satellite Mean Elements. Sonde e oggetti interstellari: JPL Horizons.
- Articoli e cataloghi citati nelle schede di ogni oggetto (`js/data/sources.js`).
