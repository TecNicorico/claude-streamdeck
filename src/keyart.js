// Key art: the pure SVG renderers for every Stream Deck key (144x144).
// Everything here is a pure function of its arguments — no module state, no I/O — so
// the whole deck can be rendered outside the plugin for review.
// localGauge() sta in view.js: riceve la fase del ticker come argomento.
//
// UN LINGUAGGIO SOLO, QUELLO DI DISCORD (09/11/2026). La terza pagina è nata così,
// accanto ai tasti di Discord; le pagine di Claude l'hanno seguita perché il deck parli
// una lingua sola: il fondo grigio di Discord, icone piene e bianche su una tessera
// colorata, i valori grandi e bianchi, una riga tenue sotto. Quattro regole, e ognuna
// viene da qualcosa che si era rotto (le misure sono nella storia di questo file):
//
//  1. IL COLORE È UN SIGNIFICATO, MAI UNA DECORAZIONE — e ha due posti, che non si
//     scambiano. La TESSERA dice CHI è il tasto: identità, fissa (Terminale è sempre
//     verde acqua, la terza pagina colora il gruppo). L'ANELLO intorno al tasto, il
//     numerino, il valore e la riga sotto dicono COSA SUCCEDE: lo stato, coi colori di
//     presenza di Discord (verde fatto, giallo aspetta te, rosso guasto o oltre il
//     limite) più blu al lavoro e viola una domanda. Le tessere d'identità sono le tinte
//     scure dei ruoli di Discord, gli stati sono vivi: scuro = chi, vivo = cosa. Colorare
//     per stato il posto dell'identità è ciò che aveva fatto passare un FOCUS al lavoro
//     per il tasto ALWAYS blu accanto. L'eccezione dichiarata è il tasto di una sessione:
//     lì il tasto È lo stato, e la tessera ne prende colore e icona. I dati restano
//     bianchi; ha colore solo ciò che passa una soglia (la percentuale di un consumo).
//
//  2. UNA TESSERA VUOL DIRE CHE LA PRESSIONE ESCE DAL DECK. Scorciatoie, sessioni, la
//     riga in basso: una tessera colorata con l'icona bianca, come un server di Discord.
//     I tasti che mostrano e basta (consumi, conteggi: la pressione cambia vista o
//     aggiorna) hanno l'icona nuda e il titolo tenue, come un canale. Sulla terza pagina
//     ogni tasto apre qualcosa, e infatti ognuno ha la sua tessera (della posta la busta).
//
//  3. LA FORMA PORTA CIÒ CHE IL COLORE NON PUÒ. Il verde di ALLOW e il rosso di DENY, per
//     un daltonico rosso-verde, finiscono entrambi oliva (1.34:1). Quindi ALLOW è un
//     TONDO con la spunta, DENY un OTTAGONO — lo stop — con la croce, il tasto centrale
//     un QUADRATO arrotondato con l'icona dello strumento (✓✓ sul vecchio ALWAYS): tre
//     sagome e tre segni, anche in scala di grigi. ALLOW a pressione lunga resta un'altra
//     cosa: tondo ambra con l'arco del «tieni premuto» intorno, anello ambra, la scritta.
//     Gli stati di una sessione hanno ognuno la sua icona (avviso, domanda, scintilla,
//     spunta, luna, campana, puntini): la si riconosce prima di leggere.
//
//  4. UNO SCHELETRO SOLO: testata 0-44 (tessera o icona, e il titolo accanto), il valore,
//     la riga sotto a y=126. La riga in basso ha la sua variante: la sagoma grande in
//     alto, il testo, la riga sotto.
import { describeRequest, alwaysRule } from "./approve.js";

// La tavolozza di Discord. È anche quella della terza pagina (postaKey, thecoreKey più
// sotto), che la usa così com'è: cambiarla cambia anche quei tasti.
const D = {
  bg: "#313338", // Discord, il fondo della chat
  testo: "#f2f3f5",
  tenue: "#b5bac1",
  spento: "#80848e",
  rosso: "#ed4245", // badge delle menzioni, «si è rotto»
  giallo: "#f0b232", // «c'è da fare»
  tessera: { Vendite: "#23a55a", Directory: "#5865f2", Hiring: "#eb459e", Operativo: "#6d6f78" },
};

// Le pagine di Claude parlano la stessa lingua. Gli stati sono i colori di presenza di
// Discord (online, inattivo, non disturbare) più due: blu al lavoro e viola una domanda,
// lontani di tinta fra loro (204° e 264°) perché il blu di Discord e il viola si
// confondevano già a colori normali. Ognuno regge sia il testo sul fondo (da 3.3:1, il
// rosso, a 4.0:1) sia l'icona bianca sopra (≥3.1:1): è il compromesso dei verdi e dei
// rossi di Discord, perché le due misure non possono superare insieme 3.6:1. Il giallo
// vuole l'inchiostro scuro (8.7:1).
const C = {
  bg: D.bg,
  panel: "#2b2d31",
  text: D.testo,
  dim: D.tenue,
  spento: D.spento,
  track: "#1e1f22", // il fondo di una barra, scavato come i campi di Discord
  rail: D.spento, // un segno neutro: lo usa la scheda di tools/gen-og.mjs
  // Tinte d'identità a bassa crominanza: le usa SOLO iconSvg (l'arte di riserva dei tasti
  // nel manifest, tools/gen-icons.mjs). Sui tasti l'identità è TESSERA, qui sotto.
  ident: {
    code: "#96b99e", launch: "#cbab8f", chat: "#b8abce", web: "#cda5bd",
    focus: "#7fbbbf", project: "#bbb08c", prompt: "#d7a4a6", custom: "#94b4d4",
    // La terza pagina (fork TecNicorico): stessa luminosità e croma delle altre
    // (OKLCH L 0.76, C 0.055), nei due buchi più larghi della ruota — 275° fra custom
    // (249°) e chat (302°), 122° fra project (93°) e code (152°). 8.4:1 e 8.6:1 sul fondo.
    posta: "#a6afd5", thecore: "#abb790",
  },
  ok: D.tessera.Vendite, // #23a55a, «online»
  warn: D.giallo,
  bad: D.rosso,
  info: "#3498db", // al lavoro
  ask: "#a970ff", // una domanda, un input
};

// La tessera d'identità di ogni scorciatoia: le tinte scure dei ruoli di Discord, e il
// blurple per la chat. Tutte reggono l'icona bianca sopra (da 3.4:1 a 8:1). Un colore
// per tasto, fisso: dice QUALE tasto è, mai cosa sta succedendo.
const TESSERA = {
  code: "#11806a", launch: "#c15f3c", chat: "#5865f2", web: "#206694",
  focus: "#546e7a", project: "#c27c0e", prompt: "#ad1457", custom: "#71368a",
};
// La tessera di un tasto che c'è ma adesso non chiama (nessuna richiesta): il grigio dei
// pulsanti secondari di Discord, con l'icona spenta.
const TESSERA_SPENTA = "#4e5058";

const pctColor = (p) => (p == null ? C.spento : p >= 85 ? C.bad : p >= 60 ? C.warn : C.ok);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const FONT = "-apple-system, Segoe UI, system-ui, sans-serif";

// Measured advance ratios for this font ran 0.528-0.576 of the font size per
// character. 0.60 over-estimates deliberately: it can only ever choose a SMALLER
// size, so nothing silently overflows the 144 box. Before this existed the ALWAYS
// key's rule line measured 199 units wide inside 144 and was clipped on both sides,
// and "$2399.28" rendered 143 wide — edge to edge with no margin.
const ADVANCE = 0.6;
const fit = (s, maxW, ideal, min = 11) =>
  Math.max(min, Math.min(ideal, Math.floor(maxW / (ADVANCE * Math.max(1, String(s).length)))));
const fits = (s, maxW, size) => String(s).length * ADVANCE * size <= maxW;
// Longest string that can be drawn at `size` inside `maxW`.
const capacity = (maxW, size) => Math.max(1, Math.floor(maxW / (ADVANCE * size)));

// fit() alone is NOT a guarantee: it stops shrinking at `min`, so anything long enough
// still overflows. Truncation is the backstop that makes it total. Every text in this
// module goes through line(), so overflow is structurally impossible rather than
// merely unlikely — which is the difference that let two strings ship clipped.
function fitClip(s, maxW, ideal, min = 11) {
  const str = String(s);
  const size = fit(str, maxW, ideal, min);
  if (fits(str, maxW, size)) return [str, size];
  return [str.slice(0, Math.max(1, capacity(maxW, size) - 1)) + "…", size];
}

const txt = (x, y, size, weight, fill, s, anchor = "middle", extra = "") =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}"${extra}>${esc(s)}</text>`;

// The only way text should be emitted: shrink to fit, then clip if even `min` is short.
const line = (x, y, maxW, ideal, weight, fill, s, anchor = "middle", extra = "", min = 11) => {
  const [t, size] = fitClip(s, maxW, ideal, min);
  return txt(x, y, size, weight, fill, t, anchor, extra);
};

const svgWrap = (inner) =>
  "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="18" fill="${C.bg}"/>${inner}</svg>`);

// L'anello di stato intorno al tasto, come l'anello di chi parla intorno a un avatar di
// Discord, più una velatura leggera. `strong` è per gli stati «bloccato su di te».
// Un anello solo e non una sfumatura: sullo Stream Deck i filtri non sono affidabili.
function tintFrame(col, strong = false, phase = null) {
  if (!col) return "";
  // phase != null → respira sui 3 fotogrammi del ticker. È lo spessore dell'anello che
  // l'occhio segue, quindi è l'opacità dell'anello a oscillare: tenerla ferma rendeva il
  // respiro invisibile a un braccio di distanza, pagando comunque i fotogrammi.
  const p = phase == null ? 1 : [0.3, 0.65, 1][phase % 3];
  const velo = (strong ? 0.13 : 0.06) * (phase == null ? 1 : 0.55 + 0.45 * p);
  const op = phase == null ? (strong ? 1 : 0.75) : 0.25 + 0.75 * p;
  return `<rect width="144" height="144" rx="18" fill="${col}" opacity="${velo.toFixed(3)}"/>` +
    `<rect x="3.5" y="3.5" width="137" height="137" rx="15" fill="none" stroke="${col}" stroke-width="${strong ? 5 : 3}" opacity="${op.toFixed(3)}"/>`;
}

// ---------- glyphs (authored in a 24-unit box, stroked) ----------
// Sui tasti non si disegnano più: le icone dei tasti sono ICONE, piene. Restano per le
// due superfici fuori dal deck, che le vogliono a tratto: l'arte di riserva del manifest
// (iconSvg) e l'elenco delle azioni dell'app Stream Deck (listIconSvg, bianco e basta).
const GLYPHS = {
  allow: ["M4 13 L9.5 18.5 L20 6"],
  always: ["M2 13 L7 18 L16.5 6.5", "M10.5 18 L20 6.5"],
  deny: ["M6.5 6.5 L17.5 17.5", "M17.5 6.5 L6.5 17.5"],
  launch: ["M14 4 h6 v6", "M20 4 L12.5 11.5", "M17 14 v5 a1 1 0 0 1 -1 1 H5 a1 1 0 0 1 -1 -1 V8 a1 1 0 0 1 1 -1 h5"],
  chat: ["M3.5 6 h17 v10 h-9 l-5 4 v-4 h-3 z"],
  web: ["M12 3 a9 9 0 1 0 0.01 0", "M3 12 h18", "M12 3 a13 13 0 0 0 0 18 a13 13 0 0 0 0 -18"],
  code: ["M6 8 L10.5 12.5 L6 17", "M13 17 h5.5"],
  project: ["M3 18 V6 h6 l2 2.5 h10 V18 z"],
  prompt: ["M4 7 h16", "M4 12.5 h11", "M4 18 h7"],
  custom: ["M4 7.5 h16", "M4 16.5 h16", "M9 7.5 m0 0 a2.4 2.4 0 1 0 0.01 0", "M15 16.5 m0 0 a2.4 2.4 0 1 0 0.01 0"],
  focus: ["M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", "M12 1.5 v4", "M12 18.5 v4", "M1.5 12 h4", "M18.5 12 h4"],
  // Report-kind marks, for the action list: it needs one row icon per action.
  gauge: ["M3.5 18 a8.5 8.5 0 1 1 17 0", "M12 18 L16.5 10.5"],
  meter: ["M3.5 12.5 h17 a3 3 0 0 1 0 6 h-17 a3 3 0 0 1 0 -6 z", "M7 15.5 h6"],
  rising: ["M4 16.5 L10 10 L14 14 L20 7", "M20 12 V7 h-5"],
  layers: ["M12 3 L21 8 L12 13 L3 8 z", "M3 12.5 L12 17.5 L21 12.5", "M3 16.5 L12 21.5 L21 16.5"],
  list: ["M4 7 h13", "M4 12 h13", "M4 17 h13", "M20 7 m0 0 a1 1 0 1 0 0.01 0", "M20 12 m0 0 a1 1 0 1 0 0.01 0", "M20 17 m0 0 a1 1 0 1 0 0.01 0"],
  dot: ["M12 12 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0", "M12 12 m-2.6 0 a2.6 2.6 0 1 0 5.2 0 a2.6 2.6 0 1 0 -5.2 0"],
  clock: ["M12 12 m-8.5 0 a8.5 8.5 0 1 0 17 0 a8.5 8.5 0 1 0 -17 0", "M12 6.5 V12 l4 2.5"],
  calendar: ["M4 6.5 h16 v14 H4 z", "M4 11 h16", "M8 3 v4", "M16 3 v4"],
  week: ["M4 6.5 h16 v14 H4 z", "M4 11 h16", "M8 3 v4", "M16 3 v4", "M7.5 15 h3", "M13.5 15 h3"],
  grid: ["M4 4.5 h6 v6 H4 z", "M14 4.5 h6 v6 h-6 z", "M4 13.5 h6 v6 H4 z", "M14 13.5 h6 v6 h-6 z"],
  // La terza pagina: la posta e il gruppo di TheCore, per le stesse due superfici.
  posta: ["M3.5 6 h17 v12 h-17 z", "M3.5 6.5 L12 13 L20.5 6.5"],
  scuola: ["M3 10 L12 4.5 L21 10", "M5 10 v9", "M19 10 v9", "M3 19.5 h18", "M10 19.5 v-5 h4 v5"],
};

// A standalone 72x72 icon for the Stream Deck action list, drawn from the same glyph
// table the keys use so the two surfaces can never drift. Before this, the 21 icon
// files carried FOUR different backgrounds (#1F1E1D, #16151c, a solid #D97757, and one
// with none at all) and their own hand-drawn art.
function iconSvg(glyphName, col = C.text) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
    `<rect width="72" height="72" rx="14" fill="${C.bg}"/>` +
    glyph(glyphName, 16, 16, 40, col, 2.4).replace(/^<g /, '<g ') +
    `</svg>\n`;
}
// The SAME glyph, drawn for the Stream Deck app's ACTION LIST rather than for a key.
//
// That surface has its own rules, and they are the opposite of the key art's:
// Elgato requires action-list icons to be monochrome white stroke (#FFFFFF) on a
// TRANSPARENT background at 20x20 (40x40 for high-DPI), with the category icon at
// 28x28. The key icons are 72x72 with a filled plate and carry identity
// hues — a solid background and colour, both of which the list explicitly forbids.
// One glyph table feeds both so the two surfaces can never drift apart.
function listIconSvg(glyphName, px = 20) {
  // 24-unit glyph geometry inset by 2 units on each side, so strokes cannot clip
  // at the edge once the app scales this down to 20px.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24">` +
    glyph(glyphName, 2, 2, 20, "#FFFFFF", 2.0) +
    `</svg>\n`;
}
function glyph(name, x, y, size, col, sw = 2.6) {
  const s = size / 24;
  // stroke-width is pre-divided by the scale so `sw` stays in final key units.
  return `<g transform="translate(${x},${y}) scale(${s.toFixed(4)})" fill="none" stroke="${col}" stroke-width="${(sw / s).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round">` +
    (GLYPHS[name] ?? []).map((d) => `<path d="${d}"/>`).join("") + "</g>";
}

// ================= LE ICONE — piene, in un riquadro da 24 =================
// Poligoni calcolati una volta: la rosetta del sigillo e la stella.
const stellaD = (punte, rFuori, rDentro, cx, cy, ruota = -90) => {
  const p = [];
  for (let i = 0; i < punte * 2; i++) {
    const r = i % 2 ? rDentro : rFuori;
    const a = ((ruota + (i * 180) / punte) * Math.PI) / 180;
    p.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return "M" + p.join(" L") + " Z";
};
const cerchio = (cx, cy, r) => `M${cx} ${cy} m-${r} 0 a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 -${2 * r} 0`;
const foglio = "M6.3 2.8 H13.8 L18.8 7.8 V19.6 A1.6 1.6 0 0 1 17.2 21.2 H6.3 A1.6 1.6 0 0 1 4.7 19.6 V4.4 A1.6 1.6 0 0 1 6.3 2.8 Z";
const fumetto = "M5 3.8 H19 A2.5 2.5 0 0 1 21.5 6.3 V14.6 A2.5 2.5 0 0 1 19 17.1 H11.4 L6.6 20.9 V17.1 H5 A2.5 2.5 0 0 1 2.5 14.6 V6.3 A2.5 2.5 0 0 1 5 3.8 Z";

// Quattro modi di disegnare un pezzo:
//   p  pieno, nel colore dell'icona;
//   l  linea, nel colore dell'icona;
//   L  linea grossa: i segni che devono leggersi da lontano (✓, ✗, le frecce);
//   t  taglio: una linea nel colore del FONDO, che apre il pieno (la piega della busta,
//      la spunta del sigillo). Così l'icona resta un solo colore e si legge da lontano.
//   b  pieno col bordo del fondo: separa una figura da quella dietro (le due persone).
// Le icone delle pagine di Claude hanno i nomi dei glifi che sostituiscono (allow,
// code, database…): view.js le chiama per nome, e i nomi restano quelli.
const ICONE = {
  posta: [["p", "M4.8 5 H19.2 A2.3 2.3 0 0 1 21.5 7.3 V16.7 A2.3 2.3 0 0 1 19.2 19 H4.8 A2.3 2.3 0 0 1 2.5 16.7 V7.3 A2.3 2.3 0 0 1 4.8 5 Z"],
    ["t", "M4.4 7.5 L12 12.8 L19.6 7.5"]],
  euro: [["l", "M17.6 6.9 A6.4 6.4 0 1 0 17.6 17.1"], ["l", "M4.6 10.3 H13.2"], ["l", "M4.6 13.7 H12.4"]],
  carrello: [["l", "M2.8 4.5 H5.4 L7.7 14.6 H18.1 L20.6 7.6 H6.3"], ["p", cerchio(9.2, 19, 1.8)], ["p", cerchio(16.8, 19, 1.8)]],
  sigillo: [["p", stellaD(12, 9.6, 8.1, 12, 12)], ["t", "M8.2 12.2 L10.9 14.9 L15.9 9.6"]],
  scuola: [["p", "M12 2.9 L21.3 8.4 H2.7 Z"], ["l", "M5.6 10.6 V17.4"], ["l", "M9.9 10.6 V17.4"], ["l", "M14.1 10.6 V17.4"],
    ["l", "M18.4 10.6 V17.4"], ["l", "M3 20.2 H21"]],
  utentePiu: [["p", cerchio(9.5, 7.9, 3.9)], ["p", "M2.3 20.5 C2.3 16.3 5.5 13.6 9.5 13.6 C13.5 13.6 16.7 16.3 16.7 20.5 Z"],
    ["l", "M19.6 7.2 V13.2"], ["l", "M16.6 10.2 H22.6"]],
  vassoio: [["l", "M3 13.4 L5.5 5.9 A1.6 1.6 0 0 1 7 4.8 H17 A1.6 1.6 0 0 1 18.5 5.9 L21 13.4 V17.9 A1.6 1.6 0 0 1 19.4 19.5 H4.6 A1.6 1.6 0 0 1 3 17.9 Z"],
    ["l", "M3 13.4 H8 L9.6 16 H14.4 L16 13.4 H21"]],
  persone: [["p", cerchio(16.7, 7.6, 3)], ["p", "M15 13.2 C18.9 12.9 22 15.3 22 19.6 H17.6 C17.4 16.8 16.6 14.7 15 13.2 Z"],
    ["b", cerchio(8.6, 8.1, 3.7)], ["b", "M1.8 20.4 C1.8 16.4 4.8 13.8 8.6 13.8 C12.4 13.8 15.4 16.4 15.4 20.4 Z"]],
  documento: [["p", foglio], ["t", "M13.8 2.8 V7.8 H18.8"], ["t", "M8.4 14 L10.7 16.3 L15.1 11.8"]],
  documentoManca: [["p", foglio], ["t", "M13.8 2.8 V7.8 H18.8"], ["t", "M11.75 10 V14.2"], ["t", "M11.75 17.3 V17.4"]],
  stella: [["p", stellaD(5, 9.8, 4.3, 12, 12.8)]],
  campana: [["p", "M12 2.8 C8.5 2.8 6.2 5.4 6.2 9.1 V12.9 L4.4 16 V17.4 H19.6 V16 L17.8 12.9 V9.1 C17.8 5.4 15.5 2.8 12 2.8 Z"],
    ["p", "M9.6 18.9 A2.4 2.4 0 0 0 14.4 18.9 Z"]],
  battito: [["l", "M2.4 12.4 H6.6 L9 6.2 L13.6 18.6 L16.2 12.4 H21.6"]],
  penna: [["p", "M16.1 3.6 L20.4 7.9 L9.8 18.5 L4.4 19.6 L5.5 14.2 Z"], ["t", "M14.2 5.5 L18.5 9.8"], ["l", "M12.6 21 H21"]],
  camion: [["p", "M3.6 6.2 H14.6 V16.4 H2.4 V7.4 A1.2 1.2 0 0 1 3.6 6.2 Z"], ["p", "M15.6 9.2 H18.7 L21.6 12.6 V16.4 H15.6 Z"],
    ["b", cerchio(7, 17.4, 2.3)], ["b", cerchio(17.6, 17.4, 2.3)]],

  // ---- le pagine di Claude ----
  // La riga in basso: i tre segni che separano le decisioni anche senza colore.
  allow: [["L", "M5 12.8 L10 17.6 L19.4 7.2"]],
  always: [["L", "M2.4 12.8 L7.1 17.4 L16.3 7.4"], ["L", "M11.6 17.4 L21.4 7.4"]],
  deny: [["L", "M7 7 L17 17"], ["L", "M17 7 L7 17"]],
  arrowR: [["L", "M4.5 12 H19"], ["L", "M13.4 6.3 L19.1 12 L13.4 17.7"]],
  arrowL: [["L", "M19.5 12 H5"], ["L", "M10.6 6.3 L4.9 12 L10.6 17.7"]],
  // Gli stati di una sessione.
  alert: [["p", "M10.27 4 A2 2 0 0 1 13.73 4 L21.6 17.7 A2 2 0 0 1 19.87 20.7 H4.13 A2 2 0 0 1 2.4 17.7 Z"],
    ["t", "M12 9.2 V13.6"], ["t", "M12 16.9 V17"]],
  question: [["p", cerchio(12, 12, 10)], ["t", "M9.3 9.6 A2.75 2.75 0 1 1 13.3 12 C12.4 12.45 12 13 12 14"], ["t", "M12 17.1 V17.2"]],
  spark: [["p", "M12 2.4 C12.9 8.1 15.9 11.1 21.6 12 C15.9 12.9 12.9 15.9 12 21.6 C11.1 15.9 8.1 12.9 2.4 12 C8.1 11.1 11.1 8.1 12 2.4 Z"]],
  moon: [["p", "M20.2 14.9 A8.7 8.7 0 1 1 9.1 3.8 A6.9 6.9 0 0 0 20.2 14.9 Z"]],
  puntini: [["p", cerchio(5, 12, 2.3)], ["p", cerchio(12, 12, 2.3)], ["p", cerchio(19, 12, 2.3)]],
  // Lo stesso tracciato del glifo: una richiesta del cloud la nuvola la porta in alto.
  cloud: [["p", "M7.2 18.5 h10 a4 4 0 0 0 0.4 -7.98 a5.6 5.6 0 0 0 -10.9 1.5 a3.3 3.3 0 0 0 0.5 6.48 z"]],
  // Le scorciatoie, e gli strumenti che chiedono un permesso.
  code: [["p", "M4.6 3.8 H19.4 A2.1 2.1 0 0 1 21.5 5.9 V18.1 A2.1 2.1 0 0 1 19.4 20.2 H4.6 A2.1 2.1 0 0 1 2.5 18.1 V5.9 A2.1 2.1 0 0 1 4.6 3.8 Z"],
    ["t", "M6.8 8.8 L10.1 12 L6.8 15.2"], ["t", "M12.3 15.4 H17.2"]],
  launch: [["l", "M13.6 3.4 H20.6 V10.4"], ["l", "M20.4 3.6 L11.6 12.4"],
    ["l", "M18 13.8 V19 A1.6 1.6 0 0 1 16.4 20.6 H5 A1.6 1.6 0 0 1 3.4 19 V7.6 A1.6 1.6 0 0 1 5 6 H10.2"]],
  chat: [["p", fumetto]],
  web: [["p", cerchio(12, 12, 9.8)], ["t", "M2.6 12 H21.4"], ["t", "M12 2.4 C8.3 6.2 8.3 17.8 12 21.6 C15.7 17.8 15.7 6.2 12 2.4 Z"]],
  project: [["p", "M3.9 4.4 H9.4 L11.6 6.8 H20.1 A1.5 1.5 0 0 1 21.6 8.3 V18.1 A1.5 1.5 0 0 1 20.1 19.6 H3.9 A1.5 1.5 0 0 1 2.4 18.1 V5.9 A1.5 1.5 0 0 1 3.9 4.4 Z"],
    ["t", "M2.4 9.4 H21.6"]],
  focus: [["l", cerchio(12, 12, 6.6)], ["p", cerchio(12, 12, 2.5)], ["l", "M12 1.8 V5"], ["l", "M12 19 V22.2"],
    ["l", "M1.8 12 H5"], ["l", "M19 12 H22.2"]],
  // Quick prompt: il fulmine, perché è un prompt già scritto che parte con un tocco.
  prompt: [["p", "M13.6 2 L4.6 13.6 H11.1 L10.1 22 L19.4 10 H12.9 Z"]],
  custom: [["l", "M3.2 7.4 H20.8"], ["l", "M3.2 16.6 H20.8"], ["b", cerchio(9, 7.4, 2.9)], ["b", cerchio(15, 16.6, 2.9)]],
  file: [["p", foglio], ["t", "M13.8 2.8 V7.8 H18.8"], ["t", "M8.3 12.6 H15.2"], ["t", "M8.3 16.4 H13"]],
  layers: [["p", "M12 2.8 L21.4 8.2 L12 13.6 L2.6 8.2 Z"], ["l", "M2.9 12.4 L12 17.6 L21.1 12.4"], ["l", "M2.9 16.5 L12 21.7 L21.1 16.5"]],
  plug: [["l", "M9 2.6 V7"], ["l", "M15 2.6 V7"], ["p", "M5.8 7 H18.2 V10.4 A6.2 6.2 0 0 1 5.8 10.4 Z"], ["l", "M12 16.4 V21.6"]],
  database: [["p", "M5 6 A7 2.9 0 0 1 19 6 V18 A7 2.9 0 0 1 5 18 Z"], ["t", "M5 6 A7 2.9 0 0 0 19 6"], ["t", "M5 12 A7 2.9 0 0 0 19 12"]],
  dot: [["p", cerchio(12, 12, 4.6)]],
  // I tasti che mostrano e basta.
  gauge: [["l", "M3.6 17.6 A8.8 8.8 0 1 1 20.4 17.6"], ["L", "M12 15.4 L16.2 9.8"], ["p", cerchio(12, 15.4, 2.3)]],
  moneta: [["p", cerchio(12, 12, 10)], ["t", "M15.1 8.7 C14.4 7.8 13.4 7.4 12.1 7.4 C10.4 7.4 9.3 8.3 9.3 9.6 C9.3 12.6 15 11.4 15 14.5 C15 15.8 13.8 16.7 12 16.7 C10.6 16.7 9.5 16.2 8.8 15.3"],
    ["t", "M12 5.4 V18.6"]],
  fiamma: [["p", "M12 2.3 C13.1 6.2 18.2 8.4 18.2 14.1 A6.2 6.2 0 0 1 5.8 14.1 C5.8 11.2 7.3 9.3 8.8 8.1 C8.9 10.4 9.9 11.7 11.2 12.1 C10.7 8.5 11.1 5.2 12 2.3 Z"]],
  list: [["p", cerchio(4.6, 6.5, 1.9)], ["p", cerchio(4.6, 12, 1.9)], ["p", cerchio(4.6, 17.5, 1.9)],
    ["l", "M9.4 6.5 H20.6"], ["l", "M9.4 12 H20.6"], ["l", "M9.4 17.5 H17.4"]],
};

function icona(nome, x, y, size, colore, fondo) {
  const s = size / 24;
  const linea = 2.2; // in unità del riquadro da 24: lo spessore scala con l'icona
  const pezzi = (ICONE[nome] ?? ICONE.battito).map(([m, d]) => {
    if (m === "p") return `<path d="${d}" fill="${colore}"/>`;
    if (m === "b") return `<path d="${d}" fill="${colore}" stroke="${fondo}" stroke-width="1.7" paint-order="stroke"/>`;
    const col = m === "t" ? fondo : colore;
    const w = m === "t" ? 1.9 : m === "L" ? 3 : linea;
    return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");
  return `<g transform="translate(${x},${y}) scale(${s.toFixed(4)})">${pezzi}</g>`;
}

// Il pallino di stato, sull'angolo della tessera, con l'anello del fondo come i
// pallini di presenza di Discord.
const pallino = (cx, cy, col) =>
  `<circle cx="${cx}" cy="${cy}" r="9" fill="${D.bg}"/><circle cx="${cx}" cy="${cy}" r="6" fill="${col}"/>`;

// ================= IL LINGUAGGIO COMUNE delle pagine di Claude =================
// Luminanza relativa (WCAG) di un #rrggbb: decide l'inchiostro sopra una tessera. Sul
// giallo l'icona bianca misura 1.9:1, quella scura 8.7:1 — come i badge gialli di Discord.
const luce = (hex) => {
  const n = parseInt(String(hex).slice(1), 16);
  const c = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * c(n >> 16) + 0.7152 * c((n >> 8) & 255) + 0.0722 * c(n & 255);
};
const inchiostro = (fondo) => (luce(fondo) > 0.4 ? "#1e1f22" : "#ffffff");

// I titoli arrivano da view.js in maiuscolo («SESSION 5H», «THIS MONTH»): qui diventano
// come i nomi della terza pagina («Fatturato»), con la maiuscola solo all'inizio. Un
// titolo già scritto in minuscolo prende la maiuscola iniziale, tranne un dominio
// («claude.ai»). Claude resta Claude.
function comeTitolo(s) {
  const t = String(s ?? "");
  const su = (t.match(/[A-Z]/g) ?? []).length, giu = (t.match(/[a-z]/g) ?? []).length;
  const base = su > giu ? t.toLowerCase() : t;
  if (/^[a-z0-9-]+\.[a-z]{2,}$/.test(base)) return base;
  return (base.charAt(0).toUpperCase() + base.slice(1)).replace(/\bclaude\b/g, "Claude").replace(/^Claude code\b/, "Claude Code");
}

// Le sagome: la tessera (quadrato arrotondato, come i server di Discord), il tondo e
// l'ottagono della riga in basso. `r` è mezzo lato; l'ottagono è un po' più largo del
// tondo, così le due sagome pesano uguale e gli spigoli si vedono.
function sagoma(tipo, cx, cy, r, fill, extra = "") {
  if (tipo === "tondo") return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${extra}/>`;
  if (tipo === "ottagono") {
    const R = r * 1.07;
    const p = [];
    for (let i = 0; i < 8; i++) {
      const a = ((22.5 + 45 * i) * Math.PI) / 180;
      p.push(`${(cx + R * Math.cos(a)).toFixed(2)} ${(cy + R * Math.sin(a)).toFixed(2)}`);
    }
    return `<path d="M${p.join(" L")} Z" fill="${fill}" stroke="${fill}" stroke-width="${(r * 0.16).toFixed(1)}" stroke-linejoin="round"${extra}/>`;
  }
  return `<rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" rx="${(r * 0.62).toFixed(1)}" fill="${fill}"${extra}/>`;
}

// La testata di un tasto che fa qualcosa: la sagoma col suo colore e l'icona, il titolo
// accanto. È quella di thecoreKey: stessa tessera, stesso posto, stesso titolo.
//   o.forma    "tessera" (di solito), "tondo" o "ottagono" (il vecchio ALLOW/DENY)
//   o.ink      l'inchiostro dell'icona, se non quello che il fondo chiede
//   o.largo    lo spazio del titolo (meno, se c'è qualcosa nell'angolo)
const testata = (nomeIcona, titolo, fondo, o = {}) =>
  sagoma(o.forma ?? "tessera", 28, 27, 16, fondo) +
  icona(nomeIcona, 16, 15, 24, o.ink ?? inchiostro(fondo), fondo) +
  line(52, 33, o.largo ?? 86, 16, 700, o.colTitolo ?? C.text, comeTitolo(titolo), "start", "", 13);

// La testata di un tasto che mostra e basta: l'icona nuda e tenue, come quella di un
// canale, e il titolo tenue. Più stretta di quella con la tessera, perché i titoli dei
// consumi sono lunghi («Sonnet 7d 2/2») e devono restare interi a 13 px.
const testataReport = (nomeIcona, titolo) =>
  icona(nomeIcona, 11, 14, 19, C.dim, C.bg) +
  line(35, 31, 102, 16, 700, C.dim, comeTitolo(titolo), "start", "", 13);

// La riga sotto, tenue: la stessa della terza pagina, ma mai sotto i 13 px (il tasto si
// vede a metà, 72 px veri: 13 sono 6,5 px). Una riga che a 13 non ci sta va a capo su
// due righe dove il tasto ha posto (`due`), altrimenti si tronca coi puntini.
const SOTTO_W = 134;
function sotto(s, col = C.dim, due = false) {
  if (!s) return "";
  const str = String(s);
  if (due && !fits(str, SOTTO_W, 13)) {
    // Prima al «·», che separa già due cose («812M in · 300M out»), poi a parole.
    const i = str.indexOf(" · ");
    const righe = i > 0 && [str.slice(0, i), str.slice(i + 3)].every((t) => fits(t, SOTTO_W, 13))
      ? [str.slice(0, i), str.slice(i + 3)]
      : aCapo(str, capacity(SOTTO_W, 13), 2);
    return righe.map((t, k) => line(72, 113 + k * 15, SOTTO_W, 13, 500, col, t, "middle", "", 13)).join("");
  }
  return line(72, 126, SOTTO_W, 15, 500, col, str, "middle", "", 13);
}
const corner = (tag, col = C.dim) => (tag ? txt(132, 25, 12, 600, col, String(tag).slice(0, 8), "end") : "");

// Il numerino di Discord: una pillola col bordo del fondo, sull'angolo di ciò che conta.
// Bianco e non rosso: qui conta quante cose ci sono, non che qualcosa si è rotto.
function numerino(cx, cy, testo, fondo = C.text) {
  const [t, size] = fitClip(String(testo), 30, 14, 13);
  const w = Math.max(22, Math.ceil(t.length * ADVANCE * size) + 10);
  return `<rect x="${(cx - w / 2 - 3).toFixed(1)}" y="${cy - 14}" width="${w + 6}" height="28" rx="14" fill="${C.bg}"/>` +
    `<rect x="${(cx - w / 2).toFixed(1)}" y="${cy - 11}" width="${w}" height="22" rx="11" fill="${fondo}"/>` +
    txt(cx, cy + 5, size, 800, inchiostro(fondo), t);
}

// Lo stesso numero, tondo e piccolo, sull'angolo in alto della tessera: dove la terza
// pagina mette il pallino di stato. Serve dove accanto alla tessera c'è il titolo.
function pallinoNumero(cx, cy, n) {
  const [t, size] = fitClip(String(n), 13, 12, 9);
  return `<circle cx="${cx}" cy="${cy}" r="10.5" fill="${C.bg}"/><circle cx="${cx}" cy="${cy}" r="8.5" fill="${C.text}"/>` +
    txt(cx, cy + 4.2, size, 800, C.bg, t);
}

// ================= REPORT KEYS — icona nuda, titolo tenue, valore in bianco ===========
// A press only cycles or refreshes what is already on screen, so nothing marks it.

function usageMeterKey(head, big, sub, isCost) {
  const none = String(big) === "--";
  // «est» dice che la cifra è una stima. Stava nell'angolo in alto, ma accanto all'icona
  // e al titolo non c'è posto («This month» + «est» si toccavano già una volta): va in
  // fondo, dopo la riga sotto — che per una spesa senza budget è già «est».
  const stima = isCost && !none && sub !== "est" ? (sub ? `${sub} · est` : "est") : sub;
  return svgWrap(`
    ${testataReport(isCost ? "moneta" : "layers", head)}
    ${line(72, 88, 128, 42, 800, none ? C.spento : C.text, big, "middle", "", 20)}
    ${sotto(stima, C.dim, true)}`);
}

function gaugeKey(label, pct, sub, pulsePhase = null) {
  const has = typeof pct === "number" && isFinite(pct);
  const p = has ? Math.max(0, Math.min(100, pct)) : 0;
  // The percentage crosses thresholds, so it IS state and keeps its colour.
  const col = has ? pctColor(p) : C.spento;
  return svgWrap(`
    ${pulsePhase == null ? "" : tintFrame(C.bad, true, pulsePhase)}
    ${testataReport("gauge", label)}
    ${line(72, 82, 128, has ? 44 : 32, 800, col, has ? Math.round(p) + "%" : "--", "middle", "", 20)}
    <rect x="14" y="94" width="116" height="9" rx="4.5" fill="${C.track}"/>
    ${has ? `<rect x="14" y="94" width="${Math.max(9, (116 * p) / 100).toFixed(1)}" height="9" rx="4.5" fill="${col}"/>` : ""}
    ${sotto(sub)}`);
}

function burnKey(tokensHour, sub) {
  const has = tokensHour != null;
  return svgWrap(`
    ${testataReport("fiamma", "burn rate")}
    ${line(72, 82, 128, has ? 42 : 32, 800, has ? C.text : C.spento, has ? fmtNum(tokensHour) : "--", "middle", "", 20)}
    ${txt(72, 104, 15, 500, C.dim, "tok/hr")}
    ${sotto(sub)}`);
}

function linesKey(title, rows) {
  const rowSvg = rows.map((r, i) =>
    line(14, 68 + i * 26, 120, 20, r.big ? 800 : 700, r.color ?? C.text, r.text, "start", "", 13)).join("");
  return svgWrap(`${testataReport("list", title)}${rowSvg}`);
}

function bigCountKey(title, count, sub, subColor, animPhase = null, tint = null, strong = false) {
  // animPhase non-null → i tre puntini di «sta scrivendo…» di Discord sotto il numero,
  // uno acceso alla volta (frame-pushed).
  const dots = animPhase == null ? "" : [0, 1, 2]
    .map((i) => `<circle cx="${60 + i * 12}" cy="105" r="${i === animPhase ? 4.5 : 3.2}" fill="${i === animPhase ? (tint ?? C.info) : C.spento}"/>`)
    .join("");
  return svgWrap(`
    ${tintFrame(tint, strong)}
    ${testataReport("code", title)}
    ${line(72, 90, 118, 52, 800, count > 0 ? C.text : C.spento, count, "middle", "", 20)}
    ${dots}
    ${sotto(sub, subColor ?? C.dim)}`);
}

// ================= SESSIONI — il tasto è lo stato =================
// `col` colora testo e anello; `tessera` (se diversa) è il fondo dell'icona in alto.
// Gli stati calmi non hanno anello: un anello vuol dire che sta succedendo qualcosa.
const STATUS_LOOK = {
  "needs-approval": { label: "Needs approval", col: C.warn, strong: true, anello: true },
  "input-needed": { label: "Input needed", col: C.ask, strong: true, anello: true },
  working: { label: "Working", col: C.info, anello: true },
  finished: { label: "Finished", col: C.ok, anello: true },
  idle: { label: "Idle", col: C.dim, tessera: C.spento },
  none: { label: "no session", col: C.spento, tessera: null },
  quiet: { label: "all clear", col: C.dim, tessera: TESSERA_SPENTA }, // Waiting key, nothing pending
  // A session that reports no status (VS Code extension) and whose transcript we
  // couldn't stat. Saying "no status" beats inventing "Idle".
  unknown: { label: "no status", col: C.dim, tessera: TESSERA_SPENTA },
};
// L'icona di ogni stato, nella tessera in alto a sinistra: si riconosce da lontano prima
// di leggere. La luna è quella di «inattivo» di Discord.
const STATUS_ICON = {
  "needs-approval": "alert", "input-needed": "question", working: "spark", finished: "allow", idle: "moon",
  quiet: "campana", unknown: "puntini", none: "puntini",
};
function statusKey(name, st, count, detail = "", tag = "", phase = null, sottotitolo = "", inRisposta = false) {
  const look = STATUS_LOOK[st] ?? STATUS_LOOK.none;
  const shown = String(name || "CLAUDE").slice(0, 11);
  const fondo = look.tessera === undefined ? look.col : look.tessera;
  // Senza sessione la tessera c'è ma è vuota: solo il bordo, come un posto libero.
  const tessera = fondo
    ? sagoma("tessera", 28, 27, 16, fondo) + icona(STATUS_ICON[st] ?? "puntini", 16, 15, 24, fondo === TESSERA_SPENTA ? C.dim : inchiostro(fondo), fondo)
    : sagoma("tessera", 28, 27, 14.75, "none", ` stroke="${C.spento}" stroke-width="2.5"`) + icona("puntini", 18, 17, 20, C.spento, C.bg);
  // Quante sessioni: il numerino vince l'angolo. Se no il «cli»/«code», che è l'unico
  // modo di distinguere due sessioni nella stessa cartella; una sessione nel cloud ha la
  // nuvola.
  const angolo = count > 1 ? numerino(120, 25, count)
    : tag === "cloud" ? icona("cloud", 107, 9, 27, C.info, C.bg) : corner(tag);
  // La sessione a cui sta rispondendo la riga in basso: un'etichetta piena in alto, fra
  // la tessera e l'angolo.
  const pill = inRisposta
    ? `<rect x="47" y="16" width="62" height="21" rx="10.5" fill="${look.col}"/>` + txt(78, 30.3, 10.5, 800, inchiostro(look.col), "RISPONDI")
    : "";
  return svgWrap(`
    ${look.anello ? tintFrame(look.col, !!look.strong, phase) : ""}
    ${tessera}
    ${angolo}
    ${pill}
    ${sottotitolo ? conTitolo(shown, sottotitolo, look.col) : `
    ${line(72, 80, 128, 25, 800, st === "none" ? C.spento : C.text, shown, "middle", "", 13)}
    ${line(72, 105, 130, 18, 700, look.col, look.label, "middle", "", 13)}`}
    ${sotto(detail)}`);
}

// Il tasto Focus quando ci sono richieste: a quale sessione sta rispondendo la riga in
// basso. Premuto passa alla sessione dopo (vedi prossimaScelta in approve.js).
function selettoreKey(nome, titolo, indice, totale, col = C.warn) {
  const righe = titolo ? aCapo(titolo, 16, 2) : [];
  return svgWrap(`
    ${tintFrame(col, true)}
    ${testata("focus", "rispondi a", TESSERA.focus)}
    ${line(72, righe.length ? 70 : 86, 128, 22, 800, C.text, String(nome || "claude"), "middle", "", 13)}
    ${righe.map((t, i) => line(72, 91 + i * 17, 130, 15, 700, col, t, "middle", "", 13)).join("")}
    ${sotto(totale > 1 ? `${indice}/${totale} · cambia` : "l'unica in attesa", C.dim, !righe.length)}`);
}

// Con un titolo, il titolo prende il posto della parola dello stato («Working»): lo
// stato resta nel colore dell'anello, del titolo e nella tessera in alto a sinistra.
function conTitolo(nome, titolo, col) {
  const righe = aCapo(titolo, 16, 2);
  return line(72, righe.length > 1 ? 70 : 78, 128, 22, 800, C.text, nome, "middle", "", 13) +
    righe.map((t, i) => line(72, (righe.length > 1 ? 92 : 102) + i * 17, 130, 15, 700, col, t, "middle", "", 13)).join("");
}

function fmtNum(n) {
  if (n == null) return "--";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(n);
}

// ================= SCORCIATOIE — la tessera d'identità, la pressione lascia il deck ====

// The four actions that had no renderer at all and shipped as flat icon art, which is
// what ran two visual languages on one deck.
function actionKey(glyphName, title, label, sub) {
  return svgWrap(`
    ${testata(glyphName, title, TESSERA[glyphName] ?? TESSERA_SPENTA)}
    ${line(72, 86, 128, 26, 800, C.text, label, "middle", "", 13)}
    ${sotto(sub, C.dim, true)}`);
}

// L'icona si ricava dal titolo, così la firma resta quella di prima.
const GLYPH_FOR = { PROJECT: "project", FOCUS: "focus", PROMPT: "prompt", CLAUDE: "custom" };

// Generic key for configurable actions: header + wrapped label + footer.
function labelKey(title, label, sub, tint = null, strong = false) {
  const text = String(label ?? "").trim() || "—";
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length <= 11) cur = (cur + " " + w).trim();
    else { lines.push(cur); cur = w; if (lines.length === 2) break; }
  }
  if (cur && lines.length < 2) lines.push(cur);
  const use = lines.slice(0, 2).filter(Boolean);
  const body = use.map((l, i) =>
    line(72, use.length > 1 ? 76 + i * 24 : 86, 128, use.length > 1 ? 21 : 24, 800, C.text, l, "middle", "", 13)).join("");
  // La tessera porta l'IDENTITÀ di questo tasto e non cambia mai con lo stato; lo stato
  // sta nell'anello. Colorare per stato il posto dell'identità è ciò che aveva fatto
  // passare un FOCUS al lavoro per il tasto ALWAYS blu accanto, nel profilo di serie.
  const g = GLYPH_FOR[String(title).toUpperCase()] ?? "custom";
  return svgWrap(`
    ${tintFrame(tint, strong)}
    ${testata(g, title, TESSERA[g])}
    ${body}
    ${sotto(sub, C.dim, use.length < 2)}`);
}

// ================= LA TERZA PAGINA — posta e TheCore, nello stile di Discord =========
// La terza pagina sta accanto ai tasti di Discord, e il 09/11/2026 è stata chiesta
// «nello stesso stile»: fondo grigio di Discord, icone piene e bianche su una tessera
// colorata (come le icone dei server), e il pallino rosso delle menzioni per ciò che
// c'è da leggere. Lo stesso giorno le pagine di Claude l'hanno seguita (le regole sono
// in cima a questo file); qui la tessera dice il GRUPPO.
//
// Il colore resta comunque un significato:
//   la TESSERA  dice il gruppo (vendite, Directory, Hiring, operativo): identità, fissa;
//   il PALLINO  sulla tessera dice lo stato: giallo c'è da fare, rosso si è rotto;
//   la BUSTA    porta il conteggio nel badge rosso di Discord; grigio se il numero è vecchio.
const TONO_D = { attenzione: D.giallo, guasto: D.rosso };

const svgDiscord = (inner) =>
  "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="18" fill="${D.bg}"/>${inner}</svg>`);

const VUOTI = new Set(["0", "—", "…", "--", "ok"]);

// Una casella di posta: la busta, e il conteggio nel badge delle menzioni.
// `f` è facciaPosta(vistaPosta(...)) di src/posta.js.
function postaKey(f) {
  const busta = f.spenta ? D.spento : D.testo;
  let badge = "";
  if (f.badge) {
    const testo = String(f.badge.testo);
    const [t, size] = fitClip(testo, 52, 20, 13);
    const w = Math.max(30, Math.ceil(t.length * ADVANCE * size) + 16);
    const cx = Math.min(144 - 6 - w / 2, 96);
    const fondo = f.badge.tono === "attenzione" ? D.giallo : f.badge.tono === "spento" ? D.spento : D.rosso;
    const scritta = f.badge.tono === "attenzione" ? "#1e1f22" : "#ffffff";
    badge = `<rect x="${(cx - w / 2 - 4).toFixed(1)}" y="7" width="${w + 8}" height="38" rx="19" fill="${D.bg}"/>` +
      `<rect x="${(cx - w / 2).toFixed(1)}" y="11" width="${w}" height="30" rx="15" fill="${fondo}"/>` +
      txt(cx, 33, size, 800, scritta, t);
  }
  const rigaCol = f.rigaTono === "attenzione" ? D.giallo : D.tenue;
  return svgDiscord(`
    ${icona("posta", 40, 14, 64, busta, D.bg)}
    ${badge}
    ${line(72, 100, 128, 20, 700, D.testo, f.etichetta)}
    ${line(72, 126, 130, 15, 500, rigaCol, f.riga)}`);
}

// Una metrica di TheCore: la tessera del gruppo con l'icona della metrica, il nome,
// il numero grande e la riga sotto. `v` è vistaTheCore(...) di src/thecore.js.
function thecoreKey(v) {
  const tessera = D.tessera[v.gruppo] ?? D.tessera.Operativo;
  const tono = TONO_D[v.tono] ?? null;
  const valore = String(v.valore);
  const numCol = v.attenuato || VUOTI.has(valore) ? D.spento : D.testo;
  return svgDiscord(`
    <rect x="12" y="11" width="32" height="32" rx="10" fill="${tessera}"/>
    ${icona(v.glifo, 16, 15, 24, "#ffffff", tessera)}
    ${tono ? pallino(42, 13, tono) : ""}
    ${line(52, 33, 86, 16, 700, D.testo, v.titolo, "start")}
    ${line(72, 92, 126, 46, 800, numCol, valore, "middle", "", 20)}
    ${line(72, 126, 130, 15, 500, tono ?? (v.attenuato ? D.spento : D.tenue), v.sub)}`);
}

// ================= IL VECCHIO ALLOW / ALWAYS / DENY =================
// Nessuna pressione lo disegna più (la riga in basso è decisioneKey/infoKey, più sotto),
// ma il README e la scheda di anteprima lo mostrano ancora: parla la stessa lingua.
const APPROVE_LOOK = {
  "approve-allow": { word: "ALLOW", col: C.ok, icona: "allow", forma: "tondo" },
  "approve-always": { word: "ALWAYS", col: C.info, icona: "always", forma: "tessera" },
  "approve-deny": { word: "DENY", col: C.bad, icona: "deny", forma: "ottagono" },
};

// Splits a rule until every line reaches a legible size, rather than trusting a single
// break at "(": the shipped version's second line measured 199 units in a 144 box and
// was clipped on both sides, so every WebFetch domain grant was unreadable on the one
// key that produces a durable write.
//
// The gate is the size a line can ACHIEVE, not a fixed size it must fit at. Asking
// "does it fit at 19px" split `Bash(npm test)` across two lines even though it renders
// perfectly well at 15.
const RULE_W = 132;
const RULE_IDEAL = 19;
const RULE_GOOD = 13; // below this a line is too small to read at arm's length
function ruleLines(rule) {
  const good = (s) => fit(s, RULE_W, RULE_IDEAL) >= RULE_GOOD;
  if (good(rule)) return [rule];

  const at = rule.indexOf("(");
  let parts = at >= 0 ? [rule.slice(0, at), rule.slice(at)] : [rule];
  if (!parts.every(good)) {
    // Break the tail at ":" — for `WebFetch(domain:x)` that isolates the part which
    // actually identifies the grant, which is the part that must stay legible.
    const tail = parts[parts.length - 1];
    const colon = tail.indexOf(":");
    if (colon >= 0) {
      parts = [
        ...parts.slice(0, -1),
        tail.slice(0, colon + 1).replace(/^\(/, ""),
        tail.slice(colon + 1).replace(/\)$/, ""),
      ];
    }
  }
  // Last resort for a rule that structure alone can't tame: hard-wrap at the widest
  // chunk RULE_GOOD allows, so a line is never clipped just because it lacked a "(".
  const out = [];
  for (const p of parts.filter(Boolean)) {
    if (good(p)) { out.push(p); continue; }
    const max = capacity(RULE_W, RULE_GOOD);
    for (let i = 0; i < p.length; i += max) out.push(p.slice(i, i + max));
  }
  return out;
}

// Nothing pending -> a calm grey look. A pending request rings the key and (while
// fresh) breathes. ALLOW/DENY show the command; ALWAYS shows the RULE it would
// persist, because Claude Code's suggestions are wildcards.
function approveKey(kind, req, o = {}) {
  const look = APPROVE_LOOK[kind];
  // `attivo` false → la sagoma resta (tondo, quadrato, ottagono: la forma dice quale
  // tasto è anche spento), ma grigia, e niente anello.
  const shell = (col, attivo, bodyLines, sub, angolo = {}, wordOverride = null) => {
    const fondo = attivo ? col : TESSERA_SPENTA;
    // Il corpo sta fra la testata (fino a y=44) e la riga sotto (y=126). Le linee di base
    // sono in tabella, non calcolate, così una regola di quattro righe non esce dal tasto.
    const n = Math.min(4, bodyLines.length);
    const [top, step] = [[90, 0], [77, 24], [68, 20], [61, 17]][n - 1] ?? [90, 0];
    const body = bodyLines.slice(0, n).map((l, i) =>
      line(72, top + i * step, l.w ?? RULE_W, Math.min(l.max ?? 22, n === 4 ? 17 : 22), 800, l.col ?? C.text, l.t, "middle", "", 13)).join("");
    return svgWrap(`
      ${attivo ? tintFrame(col, true, o.phase ?? null) : ""}
      ${testata(look.icona, wordOverride ?? look.word, fondo, {
        forma: look.forma, ink: attivo ? undefined : C.spento, colTitolo: attivo ? C.text : C.dim,
        largo: angolo.label ? 86 - angolo.label : 86,
      })}
      ${angolo.svg ?? ""}
      ${body}
      ${sotto(sub)}`);
  };

  if (o.err) return shell(C.bad, true, [], o.err);
  if (!req) return shell(C.dim, false, [], "all clear");

  const d = describeRequest(req);
  // Una richiesta del cloud lo dice in fondo, accanto al progetto: in alto a destra
  // si scontrerebbe col titolo.
  const name = req.cloud ? `${d.name} · cloud` : d.name;
  const target = o.target || d.target;
  const rule = kind === "approve-always" ? alwaysRule(req, !!o.sessionOnly) : null;
  // o.denied is set when this target's rule was DENIED in the last DENY_WINDOW_MS. The
  // rule still renders, greyed: the user needs to see WHAT is blocked, and hiding it
  // would make this look like the unrelated "n/a" case.
  const denied = kind === "approve-always" && rule !== null && !!o.denied;
  const disabled = kind === "approve-always" && (rule === null || denied);
  const col = look.col;
  // Depth badge on the tile's corner, like a server's mentions; an optional user label
  // in the key's corner. The project name keeps the footer unconditionally: it is a
  // wrong-request mitigation, so a cosmetic label must not be able to hide it.
  const angolo = o.depth > 1
    ? { svg: pallinoNumero(42, 12, o.depth) }
    : o.label ? { svg: corner(o.label), label: Math.ceil(String(o.label).slice(0, 8).length * ADVANCE * 12) + 6 } : {};
  const word = kind === "approve-always"
    ? (denied ? "ALWAYS" : rule === null ? "ALWAYS n/a" : `ALWAYS ·${o.sessionOnly ? "ses" : "prj"}`)
    : look.word;

  // Una scrittura in produzione: il tasto ALLOW chiede la pressione lunga e lo dice
  // in ambra, con il progetto e cosa fa sotto al comando.
  if (kind === "approve-allow" && o.lungo) {
    return shell(C.warn, true, [{ t: target, max: 22, w: 120 }, { t: o.dettaglio || "tieni premuto", col: C.warn, max: 16, w: 120 }], "tieni premuto 2 s", angolo, "ALLOW 2s");
  }

  if (denied) {
    return shell(col, false, ruleLines(rule).map((t) => ({ t, col: C.dim, max: 18 })), String(o.denied), angolo, word);
  }
  const shown = kind === "approve-always" ? (rule ?? target) : target;
  const lines = kind === "approve-always" && rule != null
    ? ruleLines(rule).map((t) => ({ t, max: 19 }))
    : [{ t: shown, max: 24, w: 120 }];
  return shell(col, !disabled, lines, name, angolo, word);
}

// ================= DOMANDE E INFO — la riga in basso quando cambia faccia ==========
// Spezza un testo in al più `righe` righe di `max` caratteri, a parole; l'ultima riga
// finisce con "…" se il testo non ci sta. line() resta il paracadute contro l'overflow.
function aCapo(testo, max, righe) {
  // Una parola più lunga della riga (un comando, un percorso) si spezza dove si spezza
  // da sé — dopo `:` `/` `-` `.` `_` `=` `,` — e solo se non c'è, a misura di riga.
  const pezzi = [];
  for (const p of String(testo ?? "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean)) {
    let resto = p;
    while (resto.length > max) {
      let k = max;
      for (let i = max - 1; i >= 1; i--) if (/[:/\\\-._=,]/.test(resto[i])) { k = i + 1; break; }
      pezzi.push(resto.slice(0, k));
      resto = resto.slice(k);
    }
    if (resto) pezzi.push(resto);
  }
  const out = [];
  let cur = "", i = 0;
  for (; i < pezzi.length; i++) {
    const prova = cur ? cur + " " + pezzi[i] : pezzi[i];
    if (prova.length <= max) { cur = prova; continue; }
    out.push(cur);
    cur = pezzi[i];
    if (out.length === righe) { cur = ""; break; }
  }
  if (cur && out.length < righe) { out.push(cur); i = pezzi.length; }
  // Rimasto fuori qualcosa: l'ultima riga lo dice con i puntini.
  if (i < pezzi.length && out.length) {
    const u = out[out.length - 1];
    out[out.length - 1] = (u.length >= max ? u.slice(0, max - 1) : u) + "…";
  }
  return out.length ? out : ["—"];
}

// Il tasto a sagoma grande della riga in basso: in alto ciò che il tasto FA (una sagoma
// da 48 px con l'icona, leggibile da lontano), sotto il testo che dice SU COSA, in fondo
// da dove viene. La sagoma dice quale tasto è (tondo ALLOW, ottagono DENY, quadrato il
// centro); il colore quanto è delicato: verde approva, rosso rifiuta, ambra una scrittura
// che chiede la pressione lunga, viola una domanda, blu una lettura.
//   forma     "tondo" | "ottagono" | "tessera"; senza, l'icona è nuda
//   fondo     il colore della sagoma; ink l'inchiostro dell'icona, se non quello che serve
//   testo     righe principali (al più 3; con testo2, una sola)
//   testo2    riga di dettaglio sotto, nel suo colore
//   numero    al posto dell'icona, un disco col numero (le opzioni di una domanda)
//   casella   scelta multipla: quadrato pieno con la spunta, o vuoto col numero
//   arco      l'arco del «tieni premuto» intorno alla sagoma, in quel colore
//   cloud     la nuvola in alto a sinistra: la richiesta viene da una sessione cloud
//   angolo    { badge: n } (il numerino sulla sagoma) oppure { testo: "2 s" }
const CY = 35; // il centro della sagoma grande: abbastanza in basso che l'arco non tocchi l'anello
function grandeKey(o = {}) {
  const colIcona = o.colIcona ?? C.text;
  let figura = "";
  if (o.casella != null) {
    // Scelta multipla: la casella di Discord, un quadrato arrotondato. Scelta, piena con
    // la spunta; da scegliere, il bordo col numero dell'opzione.
    figura = o.casella
      ? sagoma("tessera", 72, CY, 21, colIcona) + icona("allow", 57, CY - 15, 30, inchiostro(colIcona), colIcona)
      : sagoma("tessera", 72, CY, 19.5, "none", ` stroke="${colIcona}" stroke-width="3"`) + txt(72, CY + 8.5, 24, 800, colIcona, String(o.numero ?? ""));
  } else if (o.numero != null) {
    figura = sagoma("tondo", 72, CY, 22, colIcona) + txt(72, CY + 9.5, 27, 800, inchiostro(colIcona), String(o.numero));
  } else if (o.icona) {
    figura = o.forma
      ? sagoma(o.forma, 72, CY, 22, o.fondo) + icona(o.icona, 57, CY - 15, 30, o.ink ?? inchiostro(o.fondo), o.fondo)
      : icona(o.icona, 54, CY - 18, 36, colIcona, C.bg);
  }
  // L'arco del «tieni premuto»: tre quarti di giro intorno al tondo, come una pressione
  // che si sta riempiendo. È ciò che fa di ALLOW-lungo un altro tasto anche in grigio.
  const arco = o.arco
    ? `<path d="M72 ${CY - 27} A27 27 0 1 1 45 ${CY}" fill="none" stroke="${o.arco}" stroke-width="3.5" stroke-linecap="round"/>`
    : "";
  const righe = (o.testo ?? []).filter((t) => t != null && t !== "");
  let corpoSvg = "";
  // 120 e non 130 di larghezza: le maiuscole in grassetto sono più larghe della stima
  // di fit(), e «SQL SELECT» a 130 toccava i bordi del tasto. La riga di dettaglio è in
  // minuscolo e più piccola, e ha bisogno di tutta la riga per restare a 13 px.
  const LARGO = 120;
  if (o.testo2) {
    corpoSvg = (righe[0] != null ? line(72, 86, LARGO, o.ideale ?? 20, 800, o.col ?? C.text, righe[0], "middle", "", 13) : "") +
      line(72, 106, SOTTO_W, 15, 700, o.col2 ?? C.dim, o.testo2, "middle", "", 13);
  } else if (righe.length) {
    const n = Math.min(3, righe.length);
    const [ys, size] = [[[90], o.ideale ?? 20], [[83, 103], Math.min(o.ideale ?? 20, 18)], [[75, 91, 107], 14]][n - 1];
    corpoSvg = righe.slice(0, n).map((t, i) => line(72, ys[i], LARGO, size, n > 2 ? 700 : 800, o.col ?? C.text, t, "middle", "", 13)).join("");
  }
  // Quante ALTRE richieste aspettano dopo questa: «+1», non «2», che accanto a una
  // pressione lunga si leggerebbe «2 secondi». Sta sulla sagoma, come le menzioni.
  const altre = (o.angolo?.badge ?? 0) - 1;
  const angolo = altre > 0
    ? numerino(96, CY - 17, `+${altre}`)
    : o.angolo?.testo ? txt(132, 28, 16, 800, o.arco ?? colIcona, o.angolo.testo, "end") : "";
  // La riga in fondo è un po' più piccola che sugli altri tasti: sopra ci sono fino a tre
  // righe di testo.
  const piede = o.piede ? line(72, 128, SOTTO_W, 14, 500, o.colPiede ?? C.dim, o.piede, "middle", "", 13) : "";
  return svgWrap(`
    ${tintFrame(o.tinta ?? null, !!o.forte, o.phase ?? null)}
    ${o.cloud ? icona("cloud", 9, 8, 26, C.info, C.bg) : ""}
    ${arco}
    ${figura}
    ${angolo}
    ${corpoSvg}
    ${piede}`);
}

// La sentinella che view.js passa per «un tasto senza niente da fare» (l'icona spenta
// del centro senza richieste). Il valore resta quello di prima perché view.js lo scrive
// a mano: qui vuol dire «disegnalo spento», non questo grigio.
const SPENTO = "#4a4658";

// ALLOW e DENY con una richiesta (o senza): la sagoma è il tasto, il segno la decisione.
//   o.lungo      ALLOW chiede la pressione lunga (scrittura in produzione)
//   o.target     il testo da mostrare al posto del comando (es. "SQL DELETE")
//   o.depth      quante richieste aspettano
function decisioneKey(kind, req, o = {}) {
  const allow = kind === "approve-allow";
  const forma = allow ? "tondo" : "ottagono";
  const segno = allow ? "allow" : "deny";
  if (o.err) return grandeKey({ forma, fondo: C.bad, icona: "alert", tinta: C.bad, piede: o.err });
  if (!req) return grandeKey({ forma, fondo: TESSERA_SPENTA, ink: C.spento, icona: segno, piede: "all clear" });
  const d = describeRequest(req);
  const testo = o.target ? [o.target] : aCapo(targetIntero(req), 14, 3);
  // L'etichetta scelta nelle impostazioni del tasto, se c'è, prende il posto del progetto.
  const comune = { cloud: !!req.cloud, piede: o.label || d.name, phase: o.phase ?? null, angolo: { badge: o.depth } };
  if (allow && o.lungo) {
    return grandeKey({
      ...comune, forma: "tondo", fondo: C.warn, icona: "allow", arco: C.warn, tinta: C.warn, forte: true,
      testo: testo.slice(0, 1), testo2: "tieni premuto 2 s", col2: C.warn,
      angolo: o.depth > 1 ? { badge: o.depth } : { testo: "2 s" },
    });
  }
  const col = allow ? C.ok : C.bad;
  return grandeKey({ ...comune, forma, fondo: col, icona: segno, tinta: col, forte: true, testo });
}

// Il comando intero, per andare a capo invece di troncarlo a 14 caratteri.
function targetIntero(req) {
  const t = String(req?.toolName ?? "");
  const i = req?.toolInput ?? {};
  if (t === "Bash" && i.command) return String(i.command).replace(/\s+/g, " ").trim();
  return describeRequest(req).target;
}

// Un'opzione di una domanda di Claude: il disco col numero (lo stesso della lista di
// Claude) e l'etichetta. La pressione risponde con QUESTA opzione.
function opzioneKey(numero, intestazione, label, sub, phase = null, cloud = false) {
  return grandeKey({
    numero, colIcona: C.ask, tinta: C.ask, forte: true, phase, cloud,
    testo: aCapo(label, 12, 3), piede: String(intestazione || "domanda").toUpperCase() + (sub ? ` ${sub}` : ""),
  });
}

// Un'opzione di una domanda a scelta multipla: la pressione la spunta o la toglie.
function sceltaKey(numero, label, scelta, intestazione, cloud = false, phase = null) {
  return grandeKey({
    casella: !!scelta, numero, colIcona: C.ask, tinta: C.ask, forte: !!scelta, phase: scelta ? null : phase, cloud,
    testo: aCapo(label, 12, 3), piede: scelta ? "scelta" : String(intestazione || "domanda").toUpperCase(),
    colPiede: scelta ? C.ask : C.dim,
  });
}

// CONFERMA di una scelta multipla: risponde con le opzioni spuntate.
function confermaKey(n, intestazione, cloud = false) {
  return grandeKey({
    forma: "tessera", fondo: n ? C.ask : TESSERA_SPENTA, ink: n ? undefined : C.spento, icona: "allow",
    tinta: n ? C.ask : null, forte: !!n, cloud,
    testo: ["CONFERMA"], testo2: n ? `${n} ${n === 1 ? "scelta" : "scelte"}` : "nessuna scelta", col2: n ? C.ask : C.dim,
    piede: String(intestazione || "domanda").toUpperCase(),
  });
}

// Un tasto della riga senza niente da fare, dentro una domanda.
function vuotoKey() {
  return grandeKey({ tinta: null, piede: "" });
}

// Il tasto centrale con 4 opzioni: fa vedere le altre due.
function paginaKey(testo, sub, avanti = true, cloud = false) {
  return grandeKey({ forma: "tessera", fondo: C.ask, icona: avanti ? "arrowR" : "arrowL", tinta: C.ask, cloud, testo: [testo], piede: sub });
}

// Il tasto centrale con 2 opzioni: la domanda. Premuto apre la sessione.
function domandaKey(intestazione, testo, sub, cloud = false) {
  return grandeKey({
    forma: "tessera", fondo: C.ask, icona: "question", tinta: C.ask, cloud,
    // In fondo, di quale sessione è la domanda: l'intestazione la portano già le opzioni.
    testo: aCapo(testo, 15, 3), ideale: 16, piede: sub || String(intestazione || "domanda").toUpperCase(),
  });
}

// Il tasto centrale con un permesso: che cosa si sta per approvare. Premuto apre la
// sessione. La tessera è quella dello strumento (verde acqua il terminale, come la
// scorciatoia Terminale); per Supabase il database nel colore del rischio: rosso una
// scrittura in produzione, ambra su staging, blu una lettura.
const INFO_TINTA = { prod: C.bad, staging: C.warn, legge: C.info };
function infoKey(icona_, righe, sub, tinta = null, opz = {}) {
  const col = tinta ? INFO_TINTA[tinta] ?? null : null;
  const spento = !col && opz.colIcona === SPENTO;
  const fondo = col ?? (spento ? TESSERA_SPENTA : opz.colIcona ?? TESSERA.focus);
  const base = { forma: "tessera", fondo, ink: spento ? C.spento : undefined, icona: icona_, cloud: opz.cloud, piede: sub, tinta: col };
  if (opz.testo2) {
    return grandeKey({ ...base, forte: tinta === "prod", testo: righe.slice(0, 1), testo2: opz.testo2, col2: col ?? C.dim });
  }
  return grandeKey({ ...base, testo: righe, ideale: opz.ideale });
}

// L'icona del tasto centrale secondo lo strumento che chiede il permesso, con la tessera
// della scorciatoia che fa la stessa cosa: Bash quella del Terminale, un file quella dei
// progetti, un agente quella della chat, un server MCP quella dei comandi su misura.
function iconaStrumento(toolName) {
  const t = String(toolName ?? "");
  if (t === "Bash") return ["code", TESSERA.code];
  if (t === "WebFetch" || t === "WebSearch") return ["web", TESSERA.web];
  if (["Edit", "Write", "Read", "NotebookEdit", "MultiEdit"].includes(t)) return ["file", TESSERA.project];
  if (t === "Task" || t === "Agent") return ["layers", TESSERA.chat];
  if (t.startsWith("mcp__")) return ["plug", TESSERA.custom];
  return ["custom", TESSERA.custom];
}

export {
  C, pctColor, esc, tintFrame, svgWrap, fit, fits, txt, glyph, iconSvg, listIconSvg, ruleLines,
  gaugeKey, linesKey, bigCountKey, burnKey, usageMeterKey, labelKey, actionKey,
  STATUS_LOOK, statusKey, APPROVE_LOOK, approveKey, fmtNum,
  aCapo, grandeKey, decisioneKey, opzioneKey, paginaKey, domandaKey, infoKey, iconaStrumento, SPENTO, selettoreKey,
  sceltaKey, confermaKey, vuotoKey, postaKey, thecoreKey, icona, D as DISCORD, TESSERA, comeTitolo,
};
