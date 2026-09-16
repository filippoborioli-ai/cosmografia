// =============================================================================
//  stars.js — stelle brillanti (cielo di sfondo), costellazioni, vicinato solare
//  (posizioni RA/Dec J2000 + distanze Gaia/Hipparcos/RECONS) e sistemi extrasolari.
// =============================================================================
window.U = window.U || {};
(function (U) {
  'use strict';

  // Stelle più brillanti. near: rappresentata anche in 3D nel vicinato solare.
  const B = (name, ra, dec, mag, sp, near) => ({ name, ra, dec, mag, sp, near: !!near });
  U.BRIGHT = [
    B('Sirio', '06 45 08.9', '-16 42 58', -1.46, 'A1V', 1), B('Canopo', '06 23 57.1', '-52 41 45', -0.74, 'F0II'),
    B('Arturo', '14 15 39.7', '+19 10 57', -0.05, 'K1.5III', 1), B('Rigil Kentaurus', '14 39 36.5', '-60 50 02', -0.27, 'G2V', 1),
    B('Vega', '18 36 56.3', '+38 47 01', 0.03, 'A0V', 1), B('Capella', '05 16 41.4', '+45 59 53', 0.08, 'G3III', 1),
    B('Rigel', '05 14 32.3', '-08 12 06', 0.13, 'B8Ia'), B('Procione', '07 39 18.1', '+05 13 30', 0.34, 'F5IV', 1),
    B('Achernar', '01 37 42.8', '-57 14 12', 0.46, 'B6V'), B('Betelgeuse', '05 55 10.3', '+07 24 25', 0.50, 'M1Ia'),
    B('Hadar', '14 03 49.4', '-60 22 23', 0.61, 'B1III'), B('Altair', '19 50 47.0', '+08 52 06', 0.76, 'A7V', 1),
    B('Acrux', '12 26 35.9', '-63 05 57', 0.76, 'B0.5IV'), B('Aldebaran', '04 35 55.2', '+16 30 33', 0.86, 'K5III', 1),
    B('Antares', '16 29 24.4', '-26 25 55', 0.96, 'M1.5Iab'), B('Spica', '13 25 11.6', '-11 09 41', 0.97, 'B1V'),
    B('Polluce', '07 45 18.9', '+28 01 34', 1.14, 'K0III', 1), B('Fomalhaut', '22 57 39.0', '-29 37 20', 1.16, 'A3V', 1),
    B('Deneb', '20 41 25.9', '+45 16 49', 1.25, 'A2Ia'), B('Mimosa', '12 47 43.3', '-59 41 19', 1.25, 'B0.5III'),
    B('Regolo', '10 08 22.3', '+11 58 02', 1.35, 'B8IV', 1), B('Adhara', '06 58 37.5', '-28 58 20', 1.50, 'B2II'),
    B('Castore', '07 34 36.0', '+31 53 18', 1.58, 'A1V', 1), B('Gacrux', '12 31 09.9', '-57 06 48', 1.63, 'M3.5III'),
    B('Shaula', '17 33 36.5', '-37 06 14', 1.62, 'B2IV'), B('Bellatrix', '05 25 07.9', '+06 20 59', 1.64, 'B2III'),
    B('Elnath', '05 26 17.5', '+28 36 27', 1.65, 'B7III'), B('Miaplacidus', '09 13 12.0', '-69 43 02', 1.67, 'A1III'),
    B('Alnilam', '05 36 12.8', '-01 12 07', 1.69, 'B0Ia'), B('Alnair', '22 08 14.0', '-46 57 40', 1.74, 'B6V'),
    B('Alnitak', '05 40 45.5', '-01 56 34', 1.77, 'O9.5Ib'), B('Alioth', '12 54 01.7', '+55 57 35', 1.77, 'A1III'),
    B('Dubhe', '11 03 43.7', '+61 45 03', 1.79, 'K0III'), B('Mirfak', '03 24 19.4', '+49 51 40', 1.79, 'F5Ib'),
    B('Wezen', '07 08 23.5', '-26 23 36', 1.84, 'F8Ia'), B('Kaus Australis', '18 24 10.3', '-34 23 05', 1.85, 'B9.5III'),
    B('Avior', '08 22 30.8', '-59 30 34', 1.86, 'K3III'), B('Alkaid', '13 47 32.4', '+49 18 48', 1.86, 'B3V'),
    B('Sargas', '17 37 19.1', '-42 59 52', 1.86, 'F1II'), B('Menkalinan', '05 59 31.7', '+44 56 51', 1.90, 'A1IV'),
    B('Atria', '16 48 39.9', '-69 01 40', 1.91, 'K2II'), B('Alhena', '06 37 42.7', '+16 23 57', 1.92, 'A1IV'),
    B('Peacock', '20 25 38.9', '-56 44 06', 1.94, 'B2IV'), B('Polare', '02 31 49.1', '+89 15 51', 1.98, 'F7Ib'),
    B('Mirzam', '06 22 42.0', '-17 57 21', 1.98, 'B1II'), B('Alphard', '09 27 35.2', '-08 39 31', 1.99, 'K3II'),
    B('Hamal', '02 07 10.4', '+23 27 45', 2.00, 'K2III'), B('Diphda', '00 43 35.4', '-17 59 12', 2.02, 'K0III'),
    B('Nunki', '18 55 15.9', '-26 17 48', 2.05, 'B2.5V'), B('Menkent', '14 06 41.0', '-36 22 12', 2.06, 'K0III'),
    B('Alpheratz', '00 08 23.3', '+29 05 26', 2.06, 'B8IV'), B('Mirach', '01 09 43.9', '+35 37 14', 2.05, 'M0III'),
    B('Saiph', '05 47 45.4', '-09 40 11', 2.09, 'B0.5Ia'), B('Kochab', '14 50 42.3', '+74 09 20', 2.08, 'K4III'),
    B('Rasalhague', '17 34 56.1', '+12 33 36', 2.08, 'A5III'), B('Algol', '03 08 10.1', '+40 57 20', 2.12, 'B8V'),
    B('Denebola', '11 49 03.6', '+14 34 19', 2.13, 'A3V', 1), B('Mintaka', '05 32 00.4', '-00 17 57', 2.23, 'O9II'),
    B('Schedar', '00 40 30.4', '+56 32 14', 2.24, 'K0III'), B('Caph', '00 09 10.7', '+59 08 59', 2.28, 'F2III'),
    B('Gamma Cas', '00 56 42.5', '+60 43 00', 2.47, 'B0IV'), B('Merak', '11 01 50.5', '+56 22 57', 2.37, 'A1V'),
    B('Phecda', '11 53 49.8', '+53 41 41', 2.44, 'A0V'), B('Megrez', '12 15 25.6', '+57 01 57', 3.31, 'A3V'),
    B('Mizar', '13 23 55.5', '+54 55 31', 2.23, 'A2V'), B('Ruchbah', '01 25 49.0', '+60 14 07', 2.68, 'A5III'),
    B('Segin', '01 54 23.7', '+63 40 12', 3.37, 'B3III'), B('Dschubba', '16 00 20.0', '-22 37 18', 2.29, 'B0.3IV'),
    B('Larawag', '16 50 09.8', '-34 17 36', 2.29, 'K1III'), B('Lesath', '17 30 45.8', '-37 17 45', 2.70, 'B2IV'),
    B('Enif', '21 44 11.2', '+09 52 30', 2.39, 'K2Ib'), B('Scheat', '23 03 46.5', '+28 04 58', 2.42, 'M2.5II'),
    B('Markab', '23 04 45.7', '+15 12 19', 2.48, 'B9III'), B('Algenib', '00 13 14.2', '+15 11 01', 2.83, 'B2IV'),
    B('Sadr', '20 22 13.7', '+40 15 24', 2.23, 'F8Ib'), B('Gienah Cygni', '20 46 12.7', '+33 58 13', 2.48, 'K0III'),
    B('Albireo', '19 30 43.3', '+27 57 35', 3.08, 'K3II'), B('Delta Cygni', '19 44 58.5', '+45 07 51', 2.87, 'B9.5III'),
    B('Eltanin', '17 56 36.4', '+51 29 20', 2.24, 'K5III'), B('Alcyone', '03 47 29.1', '+24 06 18', 2.87, 'B7III'),
    B('Kaus Media', '18 20 59.6', '-29 49 41', 2.70, 'K3III'), B('Kaus Borealis', '18 27 58.2', '-25 25 18', 2.81, 'K1III'),
    B('Ascella', '19 02 36.7', '-29 52 49', 2.60, 'A2III'), B('Phi Sgr', '18 45 39.4', '-26 59 27', 3.17, 'B8III'),
    B('Tau Sgr', '19 06 56.4', '-27 40 13', 3.32, 'K1III'), B('Alnasl', '18 05 48.5', '-30 25 27', 2.98, 'K0III'),
    B('Algieba', '10 19 58.4', '+19 50 29', 2.08, 'K1III'), B('Zosma', '11 14 06.5', '+20 31 25', 2.56, 'A4V'),
    B('Chertan', '11 14 14.4', '+15 25 46', 3.33, 'A2V'), B('Ras Elased', '09 45 51.1', '+23 46 27', 2.98, 'G1II'),
    B('Adhafera', '10 16 41.4', '+23 25 02', 3.43, 'F0III'), B('Rasalas', '09 52 45.8', '+26 00 25', 3.88, 'K2III'),
    B('Eta Leonis', '10 07 19.9', '+16 45 45', 3.49, 'A0Ib'), B('Imai', '12 15 08.7', '-58 44 56', 2.79, 'B2IV'),
    B('Meissa', '05 35 08.3', '+09 56 03', 3.33, 'O8III'),
  ];
  U.CONSTELLATIONS = [
    // Orione
    ['Betelgeuse', 'Bellatrix'], ['Bellatrix', 'Mintaka'], ['Mintaka', 'Alnilam'], ['Alnilam', 'Alnitak'], ['Alnitak', 'Saiph'],
    ['Saiph', 'Rigel'], ['Rigel', 'Mintaka'], ['Betelgeuse', 'Alnitak'], ['Betelgeuse', 'Meissa'], ['Bellatrix', 'Meissa'],
    // Grande Carro
    ['Dubhe', 'Merak'], ['Merak', 'Phecda'], ['Phecda', 'Megrez'], ['Megrez', 'Dubhe'], ['Megrez', 'Alioth'], ['Alioth', 'Mizar'], ['Mizar', 'Alkaid'],
    // Cassiopea
    ['Caph', 'Schedar'], ['Schedar', 'Gamma Cas'], ['Gamma Cas', 'Ruchbah'], ['Ruchbah', 'Segin'],
    // Croce del Sud
    ['Acrux', 'Gacrux'], ['Mimosa', 'Imai'],
    // Cigno
    ['Deneb', 'Sadr'], ['Sadr', 'Albireo'], ['Gienah Cygni', 'Sadr'], ['Sadr', 'Delta Cygni'],
    // Scorpione
    ['Dschubba', 'Antares'], ['Antares', 'Larawag'], ['Larawag', 'Sargas'], ['Sargas', 'Shaula'], ['Shaula', 'Lesath'],
    // Leone
    ['Regolo', 'Eta Leonis'], ['Eta Leonis', 'Algieba'], ['Algieba', 'Adhafera'], ['Adhafera', 'Rasalas'], ['Rasalas', 'Ras Elased'],
    ['Algieba', 'Zosma'], ['Zosma', 'Denebola'], ['Denebola', 'Chertan'], ['Chertan', 'Regolo'], ['Zosma', 'Chertan'],
    // Pegaso (quadrato)
    ['Alpheratz', 'Scheat'], ['Scheat', 'Markab'], ['Markab', 'Algenib'], ['Algenib', 'Alpheratz'],
    // Sagittario (teiera)
    ['Alnasl', 'Kaus Media'], ['Kaus Media', 'Kaus Australis'], ['Kaus Australis', 'Ascella'], ['Ascella', 'Phi Sgr'], ['Phi Sgr', 'Kaus Media'],
    ['Phi Sgr', 'Nunki'], ['Nunki', 'Tau Sgr'], ['Tau Sgr', 'Ascella'], ['Kaus Borealis', 'Kaus Media'], ['Kaus Borealis', 'Phi Sgr'], ['Alnasl', 'Kaus Australis'],
    // Triangolo estivo (asterismo)
    ['Vega', 'Deneb'], ['Deneb', 'Altair'], ['Altair', 'Vega'],
  ];

  // --- Vicinato solare ------------------------------------------------------
  // d in anni luce; M massa solare; L luminosità solare; sys: id sistema planetario
  const S = (id, name, ra, dec, d, sp, M, L, extra) => Object.assign({ id, name, ra, dec, d, sp, M, L }, extra || {});
  U.NEAR = [
    S('alfacena', 'Alfa Centauri A', '14 39 36.5', '-60 50 02', 4.367, 'G2V', 1.08, 1.52, { sys: 'alfacen', R: 1.22,
      desc: 'Stella simile al Sole, la più brillante del sistema triplo più vicino. Con B forma una binaria stretta (periodo 79,9 anni). Nel 2025 JWST ha individuato un possibile pianeta gigante nella sua zona abitabile, ancora da confermare.', src: ['recons'] }),
    S('alfacenb', 'Alfa Centauri B', '14 39 35.1', '-60 50 14', 4.367, 'K1V', 0.91, 0.50, { sys: 'alfacen', R: 0.86,
      desc: 'Nana arancione compagna di Alfa Centauri A: le due stelle si avvicinano fino a ~11 UA e si allontanano fino a ~36 UA.', src: ['recons'] }),
    S('proxima', 'Proxima Centauri', '14 29 42.9', '-62 40 46', 4.2465, 'M5.5V', 0.122, 0.0016, { sys: 'alfacen', R: 0.154,
      desc: 'La stella più vicina al Sole: una nana rossa a flare legata gravitazionalmente ad Alfa Centauri A e B, da cui dista circa 13.000 UA. Ospita Proxima b, un pianeta di massa terrestre nella zona abitabile, e il più piccolo Proxima d.', src: ['anglada2016', 'faria2022'] }),
    S('barnard', 'Stella di Barnard', '17 57 48.5', '+04 41 36', 5.963, 'M4.0V', 0.162, 0.0035, { sys: 'barnard',
      desc: 'La stella con il moto proprio più grande del cielo (10,4″ l\'anno). Nel 2024–2025 sono stati confermati quattro pianeti più piccoli della Terra, tutti troppo vicini alla stella per essere temperati.', src: ['gonzalez2024', 'basant2025'] }),
    S('wolf359', 'Wolf 359', '10 56 29.2', '+07 00 53', 7.856, 'M6.0V', 0.11, 0.0011, { desc: 'Nana rossa molto debole e attiva, tra le stelle più piccole conosciute.' }),
    S('lalande21185', 'Lalande 21185', '11 03 20.2', '+35 58 12', 8.304, 'M2.0V', 0.39, 0.02, { desc: 'La nana rossa più brillante del cielo boreale; ospita almeno un pianeta confermato.' }),
    S('sirioa', 'Sirio A', '06 45 08.9', '-16 42 58', 8.611, 'A1V', 2.06, 25.4, { R: 1.71, label: 1,
      desc: 'La stella più brillante del cielo notturno. Ha una compagna, Sirio B: una nana bianca con la massa del Sole compressa nel volume della Terra, prima prova osservativa della materia degenere.', src: ['hipparcos'] }),
    S('siriob', 'Sirio B', '06 45 09.3', '-16 43 06', 8.611, 'DA2', 1.02, 0.056, { desc: 'Nana bianca: il nucleo spento di una stella che era più massiccia di Sirio A. Densità di circa una tonnellata per centimetro cubo.' }),
    S('luyten726', 'Luyten 726-8 (UV Ceti)', '01 39 01.3', '-17 57 01', 8.79, 'M5.5V', 0.10, 0.00006, { desc: 'Coppia di nane rosse; UV Ceti è il prototipo delle stelle a flare, capaci di raddoppiare la luminosità in pochi secondi.' }),
    S('ross154', 'Ross 154', '18 49 49.4', '-23 50 10', 9.70, 'M3.5V', 0.17, 0.0038, { desc: 'Nana rossa giovane e attiva nel Sagittario.' }),
    S('ross248', 'Ross 248', '23 41 54.7', '+44 10 30', 10.30, 'M6.0V', 0.14, 0.0018, { desc: 'Si sta avvicinando al Sole: tra circa 36.000 anni sarà la stella più vicina, a ~3 anni luce.' }),
    S('epseri', 'Epsilon Eridani', '03 32 55.8', '-09 27 30', 10.47, 'K2V', 0.82, 0.34, { sys: 'epseri',
      desc: 'Stella giovane (~400–800 milioni di anni) circondata da dischi di detriti simili alla nostra fascia di Kuiper, con un pianeta gigante a ~3,5 UA.', src: ['mawet2019'] }),
    S('lacaille9352', 'Lacaille 9352', '23 05 52.0', '-35 51 11', 10.72, 'M0.5V', 0.48, 0.033, { desc: 'Nana rossa con due super-Terre note.' }),
    S('ross128', 'Ross 128', '11 47 44.4', '+00 48 16', 11.01, 'M4.0V', 0.17, 0.0036, { sys: 'ross128', desc: 'Nana rossa tranquilla, con pochi flare: il suo pianeta Ross 128 b è uno dei mondi temperati più vicini.', src: ['bonfils2018'] }),
    S('procione', 'Procione A', '07 39 18.1', '+05 13 30', 11.46, 'F5IV', 1.50, 6.9, { R: 2.05, label: 1, desc: 'Stella bianco-gialla che sta lasciando la sequenza principale, con una nana bianca compagna (Procione B).' }),
    S('61cyg', '61 Cygni', '21 06 53.9', '+38 44 58', 11.40, 'K5V', 0.70, 0.15, { desc: 'La prima stella di cui fu misurata la distanza, con la parallasse, da Friedrich Bessel nel 1838: da lì cominciò la misura dell\'universo.' }),
    S('struve2398', 'Struve 2398', '18 42 46.7', '+59 37 49', 11.49, 'M3.0V', 0.33, 0.01, {}),
    S('groombridge34', 'Groombridge 34', '00 18 22.9', '+44 01 23', 11.62, 'M1.5V', 0.38, 0.016, {}),
    S('dxcnc', 'DX Cancri', '08 29 49.3', '+26 46 37', 11.68, 'M6.5V', 0.09, 0.0006, {}),
    S('epsind', 'Epsilon Indi', '22 03 21.7', '-56 47 10', 11.87, 'K5V', 0.76, 0.22, { desc: 'Nana arancione con una coppia di nane brune e un pianeta gigante freddo fotografato direttamente da JWST nel 2024.' }),
    S('tauceti', 'Tau Ceti', '01 44 04.1', '-15 56 15', 11.91, 'G8V', 0.78, 0.52, { sys: 'tauceti', label: 1,
      desc: 'La stella singola di tipo solare più vicina, antica e povera di metalli. Ha un disco di detriti dieci volte più massiccio della fascia di Kuiper e quattro pianeti candidati.', src: ['feng2017'] }),
    S('gj1061', 'GJ 1061', '03 35 59.7', '-44 30 45', 11.98, 'M5.5V', 0.12, 0.0017, { sys: 'gj1061', desc: 'Nana rossa con tre pianeti di massa terrestre; il terzo (d) è in zona abitabile.' }),
    S('yzceti', 'YZ Ceti', '01 12 30.6', '-16 59 56', 12.11, 'M4.5V', 0.13, 0.0022, { desc: 'Tre pianeti rocciosi molto vicini alla stella; possibile emissione radio da interazione stella–pianeta.' }),
    S('luyten', 'Stella di Luyten', '07 27 24.5', '+05 13 33', 12.35, 'M3.5V', 0.29, 0.0088, { sys: 'luyten', desc: 'Ospita GJ 273 b, super-Terra nella zona abitabile. Nel 2017 le fu inviato il messaggio radio "Sónar Calling GJ 273b".' }),
    S('teegarden', 'Stella di Teegarden', '02 53 00.9', '+16 52 53', 12.50, 'M7.0V', 0.097, 0.00073, { sys: 'teegarden', desc: 'Nana rossa ultrafredda scoperta solo nel 2003; ha tre pianeti di massa terrestre, due in zona abitabile.', src: ['zechmeister2019'] }),
    S('kapteyn', 'Stella di Kapteyn', '05 11 40.6', '-45 01 06', 12.83, 'sdM1', 0.27, 0.012, { desc: 'Stella dell\'alone galattico, antica circa 11 miliardi di anni, che attraversa il disco a grande velocità: forse un resto di una galassia nana assorbita.' }),
    S('lacaille8760', 'Lacaille 8760 (AX Mic)', '21 17 15.3', '-38 52 03', 12.95, 'M0V', 0.60, 0.07, {}),
    S('kruger60', 'Kruger 60', '22 27 59.5', '+57 41 45', 13.07, 'M3V', 0.27, 0.01, {}),
    S('wolf1061', 'Wolf 1061', '16 30 18.1', '-12 39 45', 14.05, 'M3.5V', 0.29, 0.011, { sys: 'wolf1061', desc: 'Nana rossa con tre pianeti; Wolf 1061 c orbita al bordo interno della zona abitabile.' }),
    S('vanmaanen', 'Stella di van Maanen', '00 49 09.9', '+05 23 19', 14.07, 'DZ7', 0.68, 0.0002, { desc: 'La nana bianca isolata più vicina. Nel suo spettro ci sono metalli: resti di pianeti o asteroidi caduti sulla stella.' }),
    S('altair', 'Altair', '19 50 47.0', '+08 52 06', 16.73, 'A7V', 1.86, 10.6, { label: 1, desc: 'Ruota così velocemente (un giro in ~9 ore) da essere schiacciata ai poli: la prima stella di sequenza principale di cui è stata fotografata la superficie con l\'interferometria.' }),
    S('gl581', 'Gliese 581', '15 19 26.8', '-07 43 20', 20.5, 'M3V', 0.31, 0.012, { desc: 'Sistema storico nella ricerca di esopianeti abitabili: alcuni pianeti annunciati si sono poi rivelati artefatti dell\'attività stellare.' }),
    S('gj667c', 'Gliese 667 C', '17 18 58.8', '-34 59 48', 23.6, 'M1.5V', 0.33, 0.014, { desc: 'Parte di un sistema triplo; ospita almeno due pianeti, uno in zona abitabile.' }),
    S('vega', 'Vega', '18 36 56.3', '+38 47 01', 25.04, 'A0V', 2.14, 40, { R: 2.5, label: 1, desc: 'Riferimento storico del sistema di magnitudini (magnitudine 0). Circondata da un disco di polveri, fu la prima stella fotografata (1850).' }),
    S('fomalhaut', 'Fomalhaut', '22 57 39.0', '-29 37 20', 25.13, 'A3V', 1.92, 16.6, { label: 1, desc: 'Circondata da un anello di detriti a ~140 UA. Il presunto pianeta "Fomalhaut b" si è rivelato una nube di polvere in espansione, probabilmente da una collisione.' }),
    S('polluce', 'Polluce', '07 45 18.9', '+28 01 34', 33.78, 'K0III', 1.9, 43, { label: 1, desc: 'La gigante più vicina al Sole, con un pianeta gigante confermato.' }),
    S('arturo', 'Arturo', '14 15 39.7', '+19 10 57', 36.7, 'K1.5III', 1.08, 170, { R: 25, label: 1, desc: 'Gigante rossa, la stella più brillante del cielo boreale. Anticipa il futuro del Sole: ha già esaurito l\'idrogeno nel nucleo.' }),
    S('trappist1', 'TRAPPIST-1', '23 06 29.3', '-05 02 29', 40.66, 'M8V', 0.0898, 0.000553, { sys: 'trappist1', label: 1, R: 0.1192,
      desc: 'Nana ultrafredda grande poco più di Giove con sette pianeti rocciosi in transito, tutti più vicini alla stella di quanto Mercurio lo sia al Sole. Tre sono nella zona abitabile.', src: ['gillon2017', 'agol2021'] }),
    S('55cnc', '55 Cancri', '08 52 35.8', '+28 19 51', 41.0, 'K0IV', 0.91, 0.58, { desc: 'Cinque pianeti, tra cui 55 Cnc e, una super-Terra probabilmente coperta da un oceano di magma.' }),
    S('capella', 'Capella', '05 16 41.4', '+45 59 53', 42.9, 'G3III', 2.57, 78, { label: 1, desc: 'Due giganti gialle in orbita stretta (104 giorni), più una coppia di nane rosse lontana.' }),
    S('51peg', '51 Pegasi', '22 57 28.0', '+20 46 08', 50.6, 'G2IV', 1.11, 1.36, { desc: 'Qui Mayor e Queloz scoprirono nel 1995 il primo pianeta attorno a una stella simile al Sole: un "Giove caldo" con un anno di 4,2 giorni. Premio Nobel 2019.' }),
    S('castore', 'Castore', '07 34 36.0', '+31 53 18', 51.6, 'A1V', 2.76, 30, { label: 1, desc: 'Sistema sestuplo: tre coppie binarie legate gravitazionalmente.' }),
    S('aldebaran', 'Aldebaran', '04 35 55.2', '+16 30 33', 65.3, 'K5III', 1.16, 439, { R: 45, label: 1, desc: 'Gigante arancione 45 volte il Sole. Pioneer 10 viaggia nella sua direzione.' }),
    S('regolo', 'Regolo', '10 08 22.3', '+11 58 02', 79.3, 'B8IV', 3.8, 288, { label: 1, desc: 'Ruota vicino alla velocità di rottura, assumendo una forma molto schiacciata.' }),
  ];

  // --- Sistemi planetari extrasolari --------------------------------------
  // pianeti: P giorni, a UA (se assente calcolato da Keplero), m masse terrestri, R raggi terrestri (se assente stimato)
  U.EXO = {
    alfacen: {
      name: 'Sistema di Alfa Centauri', primary: 'alfacena',
      stars: ['alfacena', 'alfacenb', 'proxima'],
      binary: { a: 23.3, e: 0.518, P: 79.91, T: 1955.6, M: 1.99 },
      planets: [
        { id: 'proximab', host: 'proxima', name: 'Proxima b', P: 11.186, m: 1.07, cert: 'mis', note: 'massa minima', desc: 'Pianeta di massa almeno terrestre nella zona abitabile di Proxima. Riceve circa il 65% dell\'energia che la Terra riceve dal Sole, ma anche forti flare e probabilmente è in rotazione sincrona. Se abbia un\'atmosfera è sconosciuto.', src: ['anglada2016'] },
        { id: 'proximad', host: 'proxima', name: 'Proxima d', P: 5.122, m: 0.26, cert: 'mis', note: 'massa minima', desc: 'Uno dei pianeti più leggeri mai scoperti con le velocità radiali (ESPRESSO), circa un quarto della massa terrestre.', src: ['faria2022'] },
        { id: 'alfacenab', host: 'alfacena', name: 'α Cen A b (candidato)', a: 1.5, m: 100, R: 9, cert: 'ipo', note: 'candidato JWST 2025, orbita incerta', desc: 'Nel 2025 lo strumento MIRI di JWST ha rilevato una possibile sorgente puntiforme compatibile con un gigante gassoso di massa simile a Saturno nella zona abitabile di Alfa Centauri A. Non è confermato: le osservazioni successive non l\'hanno ancora rivisto.' },
      ],
    },
    barnard: { name: 'Sistema della Stella di Barnard', primary: 'barnard', stars: ['barnard'], planets: [
      { id: 'barnardd', name: 'Barnard d', P: 2.3402, m: 0.26, cert: 'mis', desc: 'Sub-Terra caldissima.', src: ['basant2025'] },
      { id: 'barnardb', name: 'Barnard b', P: 3.1542, m: 0.30, cert: 'mis', desc: 'Primo dei quattro pianeti annunciato (2024): circa un terzo della massa terrestre.', src: ['gonzalez2024'] },
      { id: 'barnardc', name: 'Barnard c', P: 4.1244, m: 0.34, cert: 'mis', desc: 'Sub-Terra, orbita compatta.', src: ['basant2025'] },
      { id: 'barnarde', name: 'Barnard e', P: 6.7392, m: 0.19, cert: 'mis', desc: 'Il più leggero dei quattro, circa il doppio della massa di Marte.', src: ['basant2025'] },
    ] },
    trappist1: { name: 'Sistema TRAPPIST-1', primary: 'trappist1', stars: ['trappist1'], planets: [
      { id: 't1b', name: 'TRAPPIST-1 b', a: 0.01154, P: 1.5109, m: 1.374, R: 1.116, cert: 'mis', desc: 'JWST ha misurato la sua emissione termica (~230 °C sul lato diurno): compatibile con una roccia nuda senza atmosfera densa.', src: ['greene2023', 'agol2021'] },
      { id: 't1c', name: 'TRAPPIST-1 c', a: 0.01580, P: 2.4219, m: 1.308, R: 1.097, cert: 'mis', desc: 'JWST esclude un\'atmosfera densa di CO₂ simile a quella di Venere.', src: ['agol2021'] },
      { id: 't1d', name: 'TRAPPIST-1 d', a: 0.02227, P: 4.0492, m: 0.388, R: 0.788, cert: 'mis', desc: 'Al bordo interno della zona abitabile.', src: ['agol2021'] },
      { id: 't1e', name: 'TRAPPIST-1 e', a: 0.02925, P: 6.1010, m: 0.692, R: 0.920, cert: 'mis', desc: 'Il candidato più promettente per l\'abitabilità: densità simile alla Terra e insolazione vicina a quella terrestre. JWST ne sta studiando l\'eventuale atmosfera.', src: ['agol2021'] },
      { id: 't1f', name: 'TRAPPIST-1 f', a: 0.03849, P: 9.2075, m: 1.039, R: 1.045, cert: 'mis', desc: 'Nella zona abitabile; potrebbe essere ricco di acqua ghiacciata.', src: ['agol2021'] },
      { id: 't1g', name: 'TRAPPIST-1 g', a: 0.04683, P: 12.3524, m: 1.321, R: 1.129, cert: 'mis', desc: 'Al bordo esterno della zona abitabile.', src: ['agol2021'] },
      { id: 't1h', name: 'TRAPPIST-1 h', a: 0.06189, P: 18.7729, m: 0.326, R: 0.775, cert: 'mis', desc: 'Il più esterno e freddo. I sette pianeti formano una catena di risonanze orbitali.', src: ['agol2021'] },
    ] },
    epseri: { name: 'Sistema di Epsilon Eridani', primary: 'epseri', stars: ['epseri'], disks: [[2.5, 3.5, 0.25], [18, 22, 0.25], [60, 70, 0.5]], planets: [
      { id: 'epserib', name: 'Epsilon Eridani b', a: 3.48, P: 2690, m: 248, R: 11, e: 0.07, cert: 'mis', desc: 'Gigante gassoso di circa 0,8 masse di Giove, confermato combinando 30 anni di velocità radiali e immagini ad alto contrasto.', src: ['mawet2019'] },
    ] },
    tauceti: { name: 'Sistema di Tau Ceti', primary: 'tauceti', stars: ['tauceti'], disks: [[6, 52, 0.12]], planets: [
      { id: 'taucetig', name: 'Tau Ceti g', a: 0.133, P: 20.0, m: 1.75, cert: 'ipo', desc: 'Candidato: segnale di velocità radiale al limite della sensibilità.', src: ['feng2017'] },
      { id: 'tauceth', name: 'Tau Ceti h', a: 0.243, P: 49.41, m: 1.83, cert: 'ipo', desc: 'Candidato.', src: ['feng2017'] },
      { id: 'tautcetie', name: 'Tau Ceti e', a: 0.538, P: 162.87, m: 3.93, cert: 'ipo', desc: 'Candidato al bordo interno della zona abitabile.', src: ['feng2017'] },
      { id: 'taucetif', name: 'Tau Ceti f', a: 1.334, P: 636.13, m: 3.93, cert: 'ipo', desc: 'Candidato al bordo esterno della zona abitabile.', src: ['feng2017'] },
    ] },
    teegarden: { name: 'Sistema della Stella di Teegarden', primary: 'teegarden', stars: ['teegarden'], planets: [
      { id: 'teegardenb', name: 'Teegarden b', P: 4.91, m: 1.16, cert: 'mis', desc: 'Tra i pianeti con l\'indice di somiglianza terrestre più alto noto, in zona abitabile.', src: ['zechmeister2019'] },
      { id: 'teegardenc', name: 'Teegarden c', P: 11.42, m: 1.05, cert: 'mis', desc: 'Al bordo esterno della zona abitabile.', src: ['zechmeister2019'] },
      { id: 'teegardend', name: 'Teegarden d', P: 26.13, m: 0.82, cert: 'mis', desc: 'Scoperto nel 2024, più freddo.' },
    ] },
    ross128: { name: 'Sistema di Ross 128', primary: 'ross128', stars: ['ross128'], planets: [
      { id: 'ross128b', name: 'Ross 128 b', P: 9.866, m: 1.40, cert: 'mis', desc: 'Pianeta temperato di massa terrestre attorno a una stella calma: meno esposto ai flare rispetto a Proxima b.', src: ['bonfils2018'] },
    ] },
    luyten: { name: 'Sistema della Stella di Luyten', primary: 'luyten', stars: ['luyten'], planets: [
      { id: 'gj273c', name: 'GJ 273 c', P: 4.72, m: 1.18, cert: 'mis', desc: 'Pianeta caldo interno.' },
      { id: 'gj273b', name: 'GJ 273 b', P: 18.65, m: 2.89, cert: 'mis', desc: 'Super-Terra nella zona abitabile.' },
    ] },
    gj1061: { name: 'Sistema di GJ 1061', primary: 'gj1061', stars: ['gj1061'], planets: [
      { id: 'gj1061b', name: 'GJ 1061 b', P: 3.204, m: 1.37, cert: 'mis', desc: 'Pianeta caldo.' },
      { id: 'gj1061c', name: 'GJ 1061 c', P: 6.689, m: 1.74, cert: 'mis', desc: 'Al bordo interno della zona abitabile.' },
      { id: 'gj1061d', name: 'GJ 1061 d', P: 13.03, m: 1.64, cert: 'mis', desc: 'Nella zona abitabile.' },
    ] },
    wolf1061: { name: 'Sistema di Wolf 1061', primary: 'wolf1061', stars: ['wolf1061'], planets: [
      { id: 'wolf1061b', name: 'Wolf 1061 b', P: 4.888, m: 1.91, cert: 'mis', desc: 'Super-Terra calda.' },
      { id: 'wolf1061c', name: 'Wolf 1061 c', P: 17.87, m: 3.41, cert: 'mis', desc: 'Super-Terra al bordo interno della zona abitabile.' },
      { id: 'wolf1061d', name: 'Wolf 1061 d', P: 217.2, m: 7.7, cert: 'mis', desc: 'Pianeta freddo esterno.' },
    ] },
  };
})(window.U);
