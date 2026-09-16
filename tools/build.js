#!/usr/bin/env node
// =============================================================================
//  build.js — genera:
//   dist/universo.html  file unico autonomo (three.js e texture incorporati, funziona offline)
//   dist/artifact.html  versione per la pubblicazione come Artifact: senza <html>/<head>/<body>,
//                       three.js da cdn.jsdelivr.net (CSP), resto incorporato
//  Uso: node tools/build.js
// =============================================================================
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('index.html');

const css = read('css/style.css');
const scriptSrcs = [...html.match(/<!--build:js-->([\s\S]*?)<!--\/build:js-->/)[1].matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const safe = (code) => code.replace(/<\/script/gi, '<\\/script');

function bundle(includeThree) {
  let out = '';
  for (const src of scriptSrcs) {
    if (src.startsWith('vendor/')) {
      if (includeThree) out += '<script>' + safe(read(src)) + '</script>\n';
      else out += '<script src="https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js"></script>\n';
      continue;
    }
    out += '<script>/* ' + src + ' */\n' + safe(read(src)) + '\n</script>\n';
  }
  return out;
}

const withCss = html.replace(/<!--build:css-->[\s\S]*?<!--\/build:css-->/, '<style>\n' + css + '\n</style>');

// 1) file unico autonomo
const standalone = withCss.replace(/<!--build:js-->[\s\S]*?<!--\/build:js-->/, () => bundle(true));
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/universo.html'), standalone);

// 2) versione Artifact (lo scheletro html/head/body viene aggiunto dalla piattaforma)
let art = withCss.replace(/<!--build:js-->[\s\S]*?<!--\/build:js-->/, () => bundle(false));
const title = art.match(/<title>[\s\S]*?<\/title>/)[0];
const fonts = art.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/)[0];
const style = art.match(/<style>[\s\S]*?<\/style>/)[0];
const body = art.match(/<body>([\s\S]*)<\/body>/)[1];
art = [title, fonts, style, body].join('\n');
fs.writeFileSync(path.join(root, 'dist/artifact.html'), art);

const kb = (p) => (fs.statSync(path.join(root, p)).size / 1024).toFixed(0) + ' KB';
console.log('dist/universo.html', kb('dist/universo.html'));
console.log('dist/artifact.html', kb('dist/artifact.html'));
