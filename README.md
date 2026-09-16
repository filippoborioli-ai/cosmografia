# Cosmografia di Claude

L'universo navigabile in 3D, dalla superficie della Terra al fondo cosmico a microonde, costruito su dati e
articoli scientifici reali. Ogni oggetto ha una scheda con dati, fonti, "cosa non sappiamo ancora" e un livello
di certezza dichiarato (misurato · modello · stima · ipotesi · illustrativo).

## Aprire

- **`dist/universo.html`** — file unico, funziona offline: doppio clic.
- **`index.html`** — versione di sviluppo (stessi contenuti, file separati).
- **Online (privato, condivisibile dal menu della pagina):** https://claude.ai/artifact/VWFjPRx3hqswuiVXRsREz1

Per usare la RTX 4070 invece della grafica Intel: Impostazioni di Windows → Sistema → Schermo → Grafica →
aggiungi il browser → "Prestazioni elevate". Densità particelle forzabile con `index.html?q=2`.

## Comandi

Trascina per ruotare · rotella o pizzico per lo zoom (si passa da un livello di scala all'altro) · clic per la scheda ·
doppio clic per avvicinarti · tasto destro (o Maiusc) per spostarti · Backspace per salire di scala ·
L etichette · O orbite · C costellazioni · Spazio pausa del tempo · Esc chiude.

## Sviluppo

```
node tools/test-levels.js   # collaudo di tutti i livelli senza browser
node tools/build.js         # rigenera dist/universo.html e dist/artifact.html
```

La guida tecnica completa per riprendere il lavoro è in [CLAUDE.md](CLAUDE.md).
