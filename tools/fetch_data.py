#!/usr/bin/env python3
# =============================================================================
#  fetch_data.py — scarica dati astronomici reali e li incorpora in js/data/gen/*.js
#
#  Fonti (tutte pubbliche):
#   - HYG Database v4.1 (astronexus, CC BY-SA 4.0): stelle del cielo (mag <= 6.5) e vicinato (<= 100 pc)
#   - JPL SBDB Query API: elementi orbitali osculanti di asteroidi, Troiani, TNO, Centauri, NEO
#   - JPL SSD "Planetary Satellite Mean Elements" (epoca J2000, piani di Laplace)
#   - JPL Horizons API: vettori eliocentrici (eclittica J2000) di sonde e oggetti interstellari
#   - Solar System Scope textures (CC BY 4.0) + NASA Blue/Black Marble (pubblico dominio)
#
#  Uso:  python tools/fetch_data.py [--skip-textures] [--only hyg,sbdb,sats,horizons,textures]
#  Richiede: Python 3.9+, Pillow. Cache dei download in tools/.cache (ignorabile).
# =============================================================================
import base64, csv, html, io, json, math, os, re, struct, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'js', 'data', 'gen')
CACHE = os.path.join(ROOT, 'tools', '.cache')
os.makedirs(OUT, exist_ok=True)
os.makedirs(CACHE, exist_ok=True)
ARGS = sys.argv[1:]
ONLY = None
for a in ARGS:
    if a.startswith('--only'):
        ONLY = set(ARGS[ARGS.index(a) + 1].split(','))


def want(k):
    return ONLY is None or k in ONLY


def get(url, name=None, binary=False, retries=3):
    path = os.path.join(CACHE, name) if name else None
    if path and os.path.exists(path):
        with open(path, 'rb') as f:
            data = f.read()
        return data if binary else data.decode('utf-8', 'ignore')
    last = None
    for k in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'cosmografia-data-fetch/1.0'})
            with urllib.request.urlopen(req, timeout=300) as r:
                data = r.read()
            if path:
                with open(path, 'wb') as f:
                    f.write(data)
            return data if binary else data.decode('utf-8', 'ignore')
        except Exception as e:  # noqa
            last = e
            time.sleep(2 + 3 * k)
    raise last


def write_js(name, header, body):
    p = os.path.join(OUT, name)
    with open(p, 'w', encoding='utf-8') as f:
        f.write('// GENERATO da tools/fetch_data.py — non modificare a mano.\n// ' + header + '\n')
        f.write('window.U = window.U || {};\nU.GEN = U.GEN || {};\n')
        f.write(body)
    print('  scritto', p, round(os.path.getsize(p) / 1024), 'KB')


def b64(buf):
    return base64.b64encode(buf).decode('ascii')


# -----------------------------------------------------------------------------
# HYG: cielo e vicinato
# -----------------------------------------------------------------------------
def hyg():
    print('HYG…')
    txt = get('https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv', 'hygdata_v41.csv')
    rows = list(csv.DictReader(io.StringIO(txt)))
    sky = bytearray()
    nsky = 0
    names = []
    near = bytearray()
    nnear = 0
    near_names = []
    for r in rows:
        if r['id'] == '0':
            continue
        try:
            ra = float(r['ra']) * 15.0
            dec = float(r['dec'])
            mag = float(r['mag'])
            dist = float(r['dist'])
            absmag = float(r['absmag'])
        except ValueError:
            continue
        try:
            ci = float(r['ci'])
        except ValueError:
            ci = 0.65
        if mag <= 6.5:
            sky += struct.pack('<HhBb', int(round(ra / 360.0 * 65535)) % 65536, int(round(dec / 90.0 * 32767)),
                               max(0, min(255, int(round((mag + 2.0) * 25)))), max(-128, min(127, int(round(ci * 50)))))
            if r['proper'] and mag <= 3.0:
                names.append([nsky, r['proper']])
            nsky += 1
        if 0 < dist <= 100.0:
            # coordinate equatoriali cartesiane (pc) -> galattiche (pc), quantizzate a 0,01 pc
            x, y, z = float(r['x']), float(r['y']), float(r['z'])
            M = [[-0.0548755604, -0.8734370902, -0.4838350155], [0.4941094279, -0.4448296300, 0.7469822445], [-0.8676661490, -0.1980763734, 0.4559837762]]
            gx = M[0][0] * x + M[0][1] * y + M[0][2] * z
            gy = M[1][0] * x + M[1][1] * y + M[1][2] * z
            gz = M[2][0] * x + M[2][1] * y + M[2][2] * z
            q = lambda v: max(-32767, min(32767, int(round(v * 300))))  # 1/300 pc
            near += struct.pack('<hhhhb', q(gx), q(gy), q(gz), max(-32767, min(32767, int(round(absmag * 1000)))), max(-128, min(127, int(round(ci * 50)))))
            label = r['proper'] or (('Gliese ' + r['gl'].replace('Gl ', '').replace('GJ ', '')) if r['gl'] else '') or \
                (r['bf'].strip() if r['bf'] else '') or (('HD ' + r['hd']) if r['hd'] else '') or (('HIP ' + r['hip']) if r['hip'] else '')
            near_names.append(label)
            nnear += 1
    body = 'U.GEN.skyStars = { n: %d, data: "%s", names: %s };\n' % (nsky, b64(bytes(sky)), json.dumps(names, ensure_ascii=False))
    write_js('hyg_sky.js', 'HYG v4.1 (CC BY-SA 4.0): %d stelle con mag <= 6.5. Record: uint16 RA, int16 Dec, uint8 (mag+2)*25, int8 B-V*50' % nsky, body)
    body = 'U.GEN.nearStars = { n: %d, data: "%s", names: %s };\n' % (nnear, b64(bytes(near)), json.dumps(near_names, ensure_ascii=False))
    write_js('hyg_near.js', 'HYG v4.1 (CC BY-SA 4.0): %d stelle entro 100 pc. Record: int16 x,y,z galattici (1/300 pc), int16 Mag.ass.*1000, int8 B-V*50' % nnear, body)


# -----------------------------------------------------------------------------
# JPL SBDB: popolazioni di piccoli corpi con orbite reali
# -----------------------------------------------------------------------------
SB_CLASSES = [
    # (codice, filtro SBDB, limite)
    ('MBA', {'sb-class': 'MBA', 'sb-cdata': '{"AND":["H|LT|14.2"]}'}, 30000),
    ('IMB', {'sb-class': 'IMB', 'sb-cdata': '{"AND":["H|LT|15.5"]}'}, 6000),
    ('OMB', {'sb-class': 'OMB', 'sb-cdata': '{"AND":["H|LT|13.2"]}'}, 9000),
    ('TJN', {'sb-class': 'TJN', 'sb-cdata': '{"AND":["H|LT|14.5"]}'}, 12000),
    ('TNO', {'sb-class': 'TNO'}, 9000),
    ('CEN', {'sb-class': 'CEN'}, 2000),
    ('NEO', {'sb-group': 'neo', 'sb-cdata': '{"AND":["H|LT|19"]}'}, 4000),
]
CLASS_CODE = {c[0]: k for k, c in enumerate(SB_CLASSES)}


def sbdb():
    print('SBDB…')
    J2000 = 2451545.0
    buf = bytearray()
    counts = {}
    for code, filt, limit in SB_CLASSES:
        q = {'fields': 'a,e,i,om,w,ma,epoch,H', 'limit': str(limit)}
        q.update(filt)
        url = 'https://ssd-api.jpl.nasa.gov/sbdb_query.api?' + urllib.parse.urlencode(q)
        data = json.loads(get(url, 'sbdb_%s.json' % code))
        n = 0
        for a, e, i, om, w, ma, ep, H in data['data']:
            try:
                a, e, i, om, w, ma, ep = map(float, (a, e, i, om, w, ma, ep))
            except (TypeError, ValueError):
                continue
            if not (0 < e < 0.995) or a <= 0 or a > 3000:
                continue
            n_deg = 0.9856076686 / (a ** 1.5)
            M0 = (ma - n_deg * (ep - J2000)) % 360.0
            try:
                Hq = int(round(float(H) * 10))
            except (TypeError, ValueError):
                Hq = 200
            buf += struct.pack('<fHHHHHBB', a, int(e * 65535), int(i / 180.0 * 65535), int(om / 360.0 * 65535) % 65536,
                               int(w / 360.0 * 65535) % 65536, int(M0 / 360.0 * 65535) % 65536, CLASS_CODE[code], max(0, min(255, Hq)))
            n += 1
        counts[code] = n
        print('  ', code, n, 'di', data.get('count'))
    body = 'U.GEN.smallBodies = { n: %d, counts: %s, classes: %s, data: "%s" };\n' % (
        len(buf) // 16, json.dumps(counts), json.dumps([c[0] for c in SB_CLASSES]), b64(bytes(buf)))
    write_js('sbdb.js', 'JPL SBDB Query API, scaricato il %s. Record 16 byte: float32 a[UA], uint16 e, i, Ω, ω, M(J2000), uint8 classe, uint8 H*10' % time.strftime('%Y-%m-%d'), body)


# -----------------------------------------------------------------------------
# JPL: elementi medi dei satelliti
# -----------------------------------------------------------------------------
def sats():
    print('Satelliti JPL…')
    s = get('https://ssd.jpl.nasa.gov/sats/elem/sep.html', 'sats_sep.html')
    t = html.unescape(re.sub(r'<[^>]+>', '|', s))
    t = re.sub(r'\s*\|\s*', '|', t)
    t = re.sub(r'\|+', '|', t)
    out = {}
    # blocchi: nome|codice|a|e|w|M|i|node|P|Pw|Pnode|RA|Dec|Tilt|ref
    num = r'(-?[\d.]+)'
    pat = re.compile(r'\|([A-Z][A-Za-z\'\- ]{1,20})\|(\d{3})\|' + r'\|'.join([num] * 13) + r'\|')
    for m in pat.finditer(t):
        name, code = m.group(1).strip(), m.group(2)
        v = [float(x) for x in m.groups()[2:]]
        out[code] = {'name': name, 'a': v[0], 'e': v[1], 'w': v[2], 'M': v[3], 'i': v[4], 'node': v[5], 'P': v[6], 'Pw': v[7], 'Pnode': v[8], 'ra': v[9], 'dec': v[10], 'tilt': v[11]}
    print('  satelliti trovati:', len(out))
    write_js('sats.js', 'JPL SSD Planetary Satellite Mean Elements (epoca 2000-01-01.5 TDB, piani di Laplace). Chiave: codice NAIF.',
             'U.GEN.sats = %s;\n' % json.dumps(out))


# -----------------------------------------------------------------------------
# JPL Horizons: sonde e oggetti interstellari (vettori eliocentrici, eclittica J2000, UA)
# -----------------------------------------------------------------------------
CRAFT = [
    # id, nome, comando Horizons, inizio, fine, passo, centro
    ('voyager1', 'Voyager 1', '-31', '1977-09-08', '2036-01-01', '20d', '500@10'),
    ('voyager2', 'Voyager 2', '-32', '1977-08-23', '2036-01-01', '20d', '500@10'),
    ('pioneer10', 'Pioneer 10', '-23', '1972-03-05', '2036-01-01', '30d', '500@10'),
    ('pioneer11', 'Pioneer 11', '-24', '1973-04-08', '2036-01-01', '30d', '500@10'),
    ('newhorizons', 'New Horizons', '-98', '2006-01-21', '2036-01-01', '10d', '500@10'),
    ('parker', 'Parker Solar Probe', '-96', '2018-08-14', '2030-01-01', '1d', '500@10'),
    ('solo', 'Solar Orbiter', '-144', '2020-02-12', '2030-01-01', '2d', '500@10'),
    ('bepicolombo', 'BepiColombo', '-121', '2018-10-22', '2029-01-01', '2d', '500@10'),
    ('juice', 'JUICE', '-28', '2023-04-16', '2034-01-01', '4d', '500@10'),
    ('clipper', 'Europa Clipper', '-159', '2024-10-16', '2030-06-01', '4d', '500@10'),
    ('lucy', 'Lucy', '-49', '2021-10-18', '2033-06-01', '4d', '500@10'),
    ('psyche', 'Psyche', '-255', '2023-10-15', '2029-12-01', '4d', '500@10'),
    ('hera', 'Hera', '-91', '2024-10-09', '2027-06-01', '4d', '500@10'),
    ('oumuamua', "1I/ʻOumuamua", 'DES=1I;', '2012-01-01', '2032-01-01', '10d', '500@10'),
    ('borisov', '2I/Borisov', 'DES=2I;', '2014-01-01', '2034-01-01', '10d', '500@10'),
    ('atlas3i', '3I/ATLAS', 'DES=3I;', '2020-01-01', '2036-01-01', '5d', '500@10'),
    ('jwst', 'JWST (geocentrico)', '-170', '2022-01-26', '2030-01-01', '1d', '500@399'),
]


def horizons_vectors(cmd, start, stop, step, center):
    q = {
        'format': 'json', 'COMMAND': "'%s'" % cmd, 'OBJ_DATA': "'NO'", 'MAKE_EPHEM': "'YES'", 'EPHEM_TYPE': "'VECTORS'",
        'CENTER': "'%s'" % center, 'START_TIME': "'%s'" % start, 'STOP_TIME': "'%s'" % stop, 'STEP_SIZE': "'%s'" % step,
        'OUT_UNITS': "'AU-D'", 'REF_PLANE': "'ECLIPTIC'", 'REF_SYSTEM': "'ICRF'", 'VEC_TABLE': "'1'", 'CSV_FORMAT': "'YES'",
    }
    url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + urllib.parse.urlencode(q)
    return json.loads(get(url, None))


def horizons():
    print('Horizons…')
    res = {}
    for cid, name, cmd, start, stop, step, center in CRAFT:
        cache = os.path.join(CACHE, 'hz_%s.json' % cid)
        if os.path.exists(cache):
            res[cid] = json.load(open(cache, encoding='utf-8'))
            print('  ', cid, 'cache', len(res[cid]['jd']))
            continue
        s, e = start, stop
        ok = False
        for attempt in range(6):
            try:
                d = horizons_vectors(cmd, s, e, step, center)
            except Exception as ex:  # noqa
                print('   errore rete', cid, ex)
                time.sleep(3)
                continue
            r = d.get('result', '') or d.get('error', '')
            if '$$SOE' in r:
                block = r.split('$$SOE')[1].split('$$EOE')[0]
                jd, xyz = [], []
                for line in block.strip().splitlines():
                    p = [x.strip() for x in line.split(',')]
                    if len(p) >= 5:
                        jd.append(round(float(p[0]), 4))
                        xyz += [round(float(p[2]), 6), round(float(p[3]), 6), round(float(p[4]), 6)]
                res[cid] = {'name': name, 'center': center, 'jd': jd, 'xyz': xyz}
                json.dump(res[cid], open(cache, 'w', encoding='utf-8'))
                print('  ', cid, len(jd), 'campioni', s, '→', e)
                ok = True
                break
            # limiti di copertura dell'effemeride: estrae le date suggerite
            m1 = re.search(r'prior to A\.D\. (\d{4}-[A-Z]{3}-\d{2})', r)
            m2 = re.search(r'after A\.D\. (\d{4}-[A-Z]{3}-\d{2})', r)
            conv = lambda sdate: time.strftime('%Y-%m-%d', time.strptime(sdate.title(), '%Y-%b-%d'))
            changed = False
            if m1:
                s = conv(m1.group(1)); changed = True
            if m2:
                e = conv(m2.group(1)); changed = True
            if not changed:
                print('   non disponibile', cid, r[:300].replace('\n', ' '))
                break
            time.sleep(1)
        if not ok:
            print('   SALTATO', cid)
        time.sleep(1)
    write_js('horizons.js', 'JPL Horizons API, scaricato il %s. Vettori eclittica J2000 [UA]; centro 500@10 = Sole, 500@399 = Terra.' % time.strftime('%Y-%m-%d'),
             'U.GEN.horizons = %s;\n' % json.dumps(res, separators=(',', ':')))


# -----------------------------------------------------------------------------
# Texture
# -----------------------------------------------------------------------------
TEX = [
    # nome, url, dimensione, qualità
    ('earthDay', 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg', (4096, 2048), 84),
    ('earthNight', 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg', (2048, 1024), 80),
    ('earthClouds', 'https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg', (2048, 1024), 80),
    ('moon', 'https://www.solarsystemscope.com/textures/download/2k_moon.jpg', (2048, 1024), 84),
    ('mercury', 'https://www.solarsystemscope.com/textures/download/2k_mercury.jpg', (1024, 512), 84),
    ('venus', 'https://www.solarsystemscope.com/textures/download/2k_venus_atmosphere.jpg', (1024, 512), 84),
    ('venusSurface', 'https://www.solarsystemscope.com/textures/download/2k_venus_surface.jpg', (1024, 512), 82),
    ('mars', 'https://www.solarsystemscope.com/textures/download/2k_mars.jpg', (2048, 1024), 84),
    ('jupiter', 'https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg', (2048, 1024), 86),
    ('saturn', 'https://www.solarsystemscope.com/textures/download/2k_saturn.jpg', (1024, 512), 86),
    ('uranus', 'https://www.solarsystemscope.com/textures/download/2k_uranus.jpg', (512, 256), 86),
    ('neptune', 'https://www.solarsystemscope.com/textures/download/2k_neptune.jpg', (1024, 512), 86),
    ('sun', 'https://www.solarsystemscope.com/textures/download/2k_sun.jpg', (1024, 512), 84),
]


def textures():
    from PIL import Image
    print('Texture…')
    lines = []
    for name, url, size, q in TEX:
        raw = get(url, 'tex_' + name + os.path.splitext(url)[1], binary=True)
        im = Image.open(io.BytesIO(raw)).convert('L' if name == 'earthClouds' else 'RGB')
        im = im.resize(size, Image.LANCZOS)
        out = io.BytesIO()
        im.save(out, 'JPEG', quality=q, optimize=True, progressive=True)
        lines.append('U.TEX.%s = "data:image/jpeg;base64,%s";' % (name, b64(out.getvalue())))
        print('  ', name, size, round(len(out.getvalue()) / 1024), 'KB')
    p = os.path.join(ROOT, 'js', 'data', 'textures.js')
    with open(p, 'w', encoding='utf-8') as f:
        f.write('// GENERATO da tools/fetch_data.py — non modificare a mano.\n')
        f.write('// Terra giorno/notte: NASA Blue Marble / Black Marble (pubblico dominio).\n')
        f.write('// Altre texture: Solar System Scope (www.solarsystemscope.com), licenza CC BY 4.0, basate su dati NASA.\n')
        f.write('window.U = window.U || {};\nU.TEX = {};\n' + '\n'.join(lines) + '\n')
    print('  scritto', p, round(os.path.getsize(p) / 1024), 'KB')


if __name__ == '__main__':
    if want('hyg'):
        hyg()
    if want('sbdb'):
        sbdb()
    if want('sats'):
        sats()
    if want('horizons'):
        horizons()
    if want('textures') and '--skip-textures' not in ARGS:
        textures()
