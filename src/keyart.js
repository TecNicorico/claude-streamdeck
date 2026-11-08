// Key art: the pure SVG renderers for every Stream Deck key (144x144).
// Everything here is a pure function of its arguments — no module state, no I/O — so
// the whole deck can be rendered outside the plugin for review.
// localGauge() stays in plugin.js: it reads the animPhase ticker.
//
// THREE RULES, each from a measurement rather than taste:
//
//  1. COLOUR IS MEANING, NEVER DECORATION. Data renders in bone (C.text); colour is
//     reserved for state and for the three approve decisions. This is forced, not
//     chosen: five hues are already spoken for (ok/warn/bad/info/ask) and every
//     candidate for a sixth "data accent" landed within 1.00-1.19:1 of one of them,
//     worse under deuteranopia. The old Claude orange was itself in that band, which
//     is why a deck showing four dollar amounts read as an alarm.
//
//  2. A BAND MEANS THE PRESS LEAVES THE DECK. Actions with an external side effect
//     (launch an app, focus a window, answer a permission prompt) get a top band and
//     a glyph; keys that only cycle or refresh what they already display get neither.
//     The band carries the key's own fixed IDENTITY hue and never varies with state,
//     while the frame tint carries state alone — different place on the key, and a
//     2.5x-4.6x chroma gap. Colouring the band BY state is what let a working FOCUS
//     key impersonate the vivid-blue ALWAYS key beside it in the bundled profile.
//     Band WEIGHT is a separate channel: rule / double / fill is what separates the
//     three approve keys in greyscale, which is why the identity cap must stay far
//     darker than DENY's fill (see WASH).
//
//  3. ONE SKELETON on every key, both classes: header 0-34, value, sub at y=127.
import { describeRequest, alwaysRule } from "./approve.js";

const C = {
  bg: "#16151c",
  panel: "#211f2b",
  text: "#f5f1ea",
  dim: "#9b96a8",
  // Band rule for an action. Achromatic on purpose: zero hue is zero collision with
  // any state colour, in any vision type and in greyscale. 3.56:1 as a graphic mark
  // once composited, above the 3:1 non-text target. The old solid-orange launch key
  // WAS findable — it was just shouting; this keeps the findability.
  rail: "#807b8d",
  // Identity hues, one per action: WHICH key is this, never what is happening. Hue
  // alone could not carry identity — every candidate collided with a state colour —
  // but CHROMA can. These sit at chroma ~20 against a state palette whose lowest is
  // 49 (info blue), a 2.5x-4.6x separation, so vivid reads as signal and muted reads
  // as identity. All land at 8.4:1 on the background. They colour the BAND and GLYPH
  // only; the frame tint stays exclusively for state, so a working FOCUS key still
  // cannot be mistaken for the vivid-blue ALWAYS key beside it.
  ident: {
    code: "#96b99e", launch: "#cbab8f", chat: "#b8abce", web: "#cda5bd",
    focus: "#7fbbbf", project: "#bbb08c", prompt: "#d7a4a6", custom: "#94b4d4",
  },
  ok: "#4ade80",
  warn: "#fbbf24",
  bad: "#f87171",
  track: "#3a3745",
  info: "#60a5fa", // status: working
  ask: "#a855f7", // status: input needed
};
const pctColor = (p) => (p == null ? C.dim : p >= 85 ? C.bad : p >= 60 ? C.warn : C.ok);
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

// Translucent wash plus concentric strokes that read as a glow. Concentric strokes
// rather than feGaussianBlur: the Stream Deck renderer can't be relied on for filters.
// `strong` is for the "blocked on you" states.
function tintFrame(col, strong = false, phase = null) {
  if (!col) return "";
  // phase != null → breathe across the ticker's 3 frames. The 5px stroke is what the
  // eye tracks, so it has to swing; holding it constant made the breath imperceptible
  // at arm's length while still paying the full frame cost.
  const p = phase == null ? 1 : [0.3, 0.65, 1][phase % 3];
  const washOp = (strong ? 0.22 : 0.1) * (phase == null ? 1 : 0.6 + 0.4 * p);
  const mainOp = phase == null ? (strong ? 1 : 0.8) : 0.25 + 0.75 * p;
  return `<rect width="144" height="144" rx="18" fill="${col}" opacity="${washOp.toFixed(3)}"/>
    <rect x="2" y="2" width="140" height="140" rx="17" fill="none" stroke="${col}" stroke-width="2" opacity="${((strong ? 0.45 : 0.22) * p).toFixed(3)}"/>
    <rect x="5" y="5" width="134" height="134" rx="15" fill="none" stroke="${col}" stroke-width="${strong ? 5 : 3}" opacity="${mainOp.toFixed(3)}"/>
    <rect x="9.5" y="9.5" width="125" height="125" rx="12" fill="none" stroke="${col}" stroke-width="1" opacity="${(0.18 * p).toFixed(3)}"/>`;
}

// ---------- glyphs (authored in a 24-unit box, stroked) ----------
// The redundant, colour-independent channel. ALLOW green and DENY red are 1.59:1
// apart in normal vision and 1.34:1 as a deuteranope sees them — both collapse to
// olive — so the mark, not the hue, is what separates them.
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
  // Report-kind marks. Report KEYS carry no glyph — that absence is the action-class
  // signal — but the Stream Deck action list needs one row icon per action, so these
  // exist for iconSvg() only.
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
  // Riga in basso e sessioni (fork TecNicorico): un'icona per ciò che il tasto fa o dice.
  database: ["M5 6 a7 2.6 0 1 0 14 0 a7 2.6 0 1 0 -14 0", "M5 6 v12 a7 2.6 0 0 0 14 0 V6", "M5 12 a7 2.6 0 0 0 14 0"],
  question: ["M12 12 m-9.5 0 a9.5 9.5 0 1 0 19 0 a9.5 9.5 0 1 0 -19 0", "M9.3 9.4 a2.8 2.8 0 1 1 4 2.5 c-0.85 0.42 -1.3 1 -1.3 2.1", "M12 17.3 v0.2"],
  alert: ["M12 3.5 L21.5 20 H2.5 Z", "M12 9.5 v5", "M12 17.3 v0.2"],
  spark: ["M12 3 v4", "M12 17 v4", "M3 12 h4", "M17 12 h4", "M5.6 5.6 l2.8 2.8", "M15.6 15.6 l2.8 2.8", "M5.6 18.4 l2.8 -2.8", "M15.6 8.4 l2.8 -2.8"],
  moon: ["M19.5 14.6 A8 8 0 1 1 9.4 4.5 a6.3 6.3 0 0 0 10.1 10.1 z"],
  cloud: ["M7.2 18.5 h10 a4 4 0 0 0 0.4 -7.98 a5.6 5.6 0 0 0 -10.9 1.5 a3.3 3.3 0 0 0 0.5 6.48 z"],
  file: ["M6.5 3 h7.5 l4 4 v14 h-11.5 z", "M14 3 v4 h4"],
  plug: ["M9 3 v4.5", "M15 3 v4.5", "M6.5 7.5 h11 v3 a5.5 5.5 0 0 1 -11 0 z", "M12 16 v5"],
  arrowR: ["M4.5 12 h15", "M13.5 6 l6 6 -6 6"],
  arrowL: ["M19.5 12 h-15", "M10.5 6 l-6 6 6 6"],
  hold: ["M12 12 m-9.5 0 a9.5 9.5 0 1 0 19 0 a9.5 9.5 0 1 0 -19 0", "M7.5 12.5 l3 3 6 -7"],
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
// 28x28. The key icons are 72x72 with a filled #16151c plate and carry identity
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

// ---------- shared skeleton ----------
// `narrow` reserves room for a corner marker. Without it a long header ran straight
// into the "est" tag and "THIS MONTH" + "est" read as one word.
const header = (s, narrow = false) =>
  line(12, 25, narrow ? 88 : 106, 15, 700, C.dim, String(s).toUpperCase(), "start", ' letter-spacing="0.6"');
const foot = (s, col = C.dim) => (s ? line(72, 127, 130, 14, 400, col, s) : "");
const corner = (tag, col = C.dim) => (tag ? txt(132, 25, 12, 600, col, String(tag).slice(0, 8), "end") : "");
const badge = (n, col) =>
  `<circle cx="121" cy="20" r="11.5" fill="${C.panel}" stroke="${col}" stroke-width="1.5"/>` +
  txt(121, 25, 14, 700, C.text, n);

// The action-class marker. Weight differs by consequence so the three approve keys
// stay distinct in greyscale, where hue tells you nothing.
// WASH is the ceiling, not a preference. As the cap brightens it climbs toward DENY's
// filled band, and once the two land in the same lightness class "filled cap" stops
// identifying DENY — which is the channel that makes the approve trio separable in
// greyscale. At 0.24 the cap is 3.4x darker than DENY's fill and identity text still
// measures 5.17:1 on it. 0.30 sits exactly on AA (4.50:1) with no margin left, and
// 0.38 drops the text to 3.69:1, below AA.
const WASH = 0.24;
// A band that reaches y=0 must follow the key's rounded top corners. A plain rect paints
// straight over the rx=18 corner and the key reads as square-cornered along its top edge.
// Authored as a path rather than a clipPath so each key SVG stays self-contained — the
// showcase composes many of them into one document, where duplicate ids would collide.
const R = 18;
const topCap = (h) =>
  `M0 ${h} V${R} A${R} ${R} 0 0 1 ${R} 0 H${144 - R} A${R} ${R} 0 0 1 144 ${R} V${h} Z`;
const band = {
  rule: (col, m = 1) => `<rect x="0" y="33" width="144" height="2.5" fill="${col}" opacity="${(0.85 * m).toFixed(2)}"/>`,
  // Identity cap for an action key: a tinted header zone closed by a bright rule.
  cap: (col, m = 1) =>
    `<path d="${topCap(37)}" fill="${col}" opacity="${(WASH * m).toFixed(3)}"/>` +
    `<rect x="0" y="34" width="144" height="3" fill="${col}" opacity="${(0.95 * m).toFixed(2)}"/>`,
  double: (col, m = 1) => `<rect x="0" y="33" width="144" height="2.5" fill="${col}" opacity="${(0.85 * m).toFixed(2)}"/><rect x="0" y="38" width="144" height="1.5" fill="${col}" opacity="${(0.55 * m).toFixed(2)}"/>`,
  fill: (col, m = 1) => `<path d="${topCap(35)}" fill="${col}" opacity="${(0.9 * m).toFixed(2)}"/>`,
};
// Header row for an action key: glyph + title. Both in dim so they clear AA — drawing
// them in the rail colour measured 1.99:1, worse than what it replaced.
const actionHead = (glyphName, title, fg = C.dim) =>
  glyph(glyphName, 10, 8, 22, fg) +
  line(38, 25, 82, 16, 800, fg, String(title).toUpperCase(), "start", ' letter-spacing="0.5"');

// ================= REPORT KEYS — no band, no glyph, value in bone =================
// A press only cycles or refreshes what is already on screen, so nothing warns you.

function usageMeterKey(head, big, sub, isCost) {
  const none = String(big) === "--";
  const est = isCost && !none;
  return svgWrap(`
    ${header(head, est)}
    ${est ? corner("est") : ""}
    ${line(72, 88, 128, 42, 700, none ? C.dim : C.text, big, "middle", "", 20)}
    ${foot(sub)}`);
}

function gaugeKey(label, pct, sub, pulsePhase = null) {
  const has = typeof pct === "number" && isFinite(pct);
  const p = has ? Math.max(0, Math.min(100, pct)) : 0;
  // The percentage crosses thresholds, so it IS state and keeps its colour.
  const col = has ? pctColor(p) : C.dim;
  const pulse = pulsePhase == null ? "" :
    `<rect x="4" y="4" width="136" height="136" rx="16" fill="none" stroke="${C.bad}" stroke-width="6" opacity="${[0.2, 0.55, 0.95][pulsePhase % 3]}"/>`;
  return svgWrap(`
    ${pulse}
    ${header(label)}
    ${line(72, 82, 128, has ? 44 : 32, 700, col, has ? Math.round(p) + "%" : "--")}
    <rect x="12" y="94" width="120" height="10" rx="5" fill="${C.track}"/>
    ${has ? `<rect x="12" y="94" width="${Math.max(7, (120 * p) / 100).toFixed(1)}" height="10" rx="5" fill="${col}"/>` : ""}
    ${foot(sub)}`);
}

function burnKey(tokensHour, sub) {
  const has = tokensHour != null;
  return svgWrap(`
    ${header("burn rate")}
    ${line(72, 84, 128, has ? 42 : 32, 700, has ? C.text : C.dim, has ? fmtNum(tokensHour) : "--")}
    ${txt(72, 105, 15, 400, C.dim, "tok/hr")}
    ${foot(sub)}`);
}

function linesKey(title, rows) {
  const rowSvg = rows.map((r, i) =>
    line(12, 64 + i * 30, 122, 21, r.big ? 700 : 600, r.color ?? C.text, r.text, "start")).join("");
  return svgWrap(`${header(title)}${rowSvg}`);
}

function bigCountKey(title, count, sub, subColor, animPhase = null, tint = null, strong = false) {
  // animPhase non-null → cycling activity dots beside the count (frame-pushed).
  const dots = animPhase == null ? "" : [0, 1, 2]
    .map((i) => `<circle cx="128" cy="${58 + i * 15}" r="${i === animPhase ? 4.5 : 3}" fill="${i === animPhase ? (tint ?? C.info) : C.track}"/>`)
    .join("");
  return svgWrap(`
    ${tintFrame(tint, strong)}
    ${header(title)}
    ${dots}
    ${line(72, 97, 118, 60, 700, count > 0 ? C.text : C.dim, count)}
    ${foot(sub, subColor ?? C.dim)}`);
}

const STATUS_LOOK = {
  "needs-approval": { label: "Needs approval", col: C.warn, strong: true },
  "input-needed": { label: "Input needed", col: C.ask, strong: true },
  working: { label: "Working", col: C.info },
  finished: { label: "Finished", col: C.ok },
  idle: { label: "Idle", col: C.dim },
  none: { label: "no session", col: C.dim },
  quiet: { label: "all clear", col: C.dim }, // Waiting key, nothing pending
  // A session that reports no status (VS Code extension) and whose transcript we
  // couldn't stat. Saying "no status" beats inventing "Idle".
  unknown: { label: "no status", col: C.dim },
};
// L'icona di ogni stato, in alto a sinistra: si riconosce da lontano prima di leggere.
const STATUS_ICON = { "needs-approval": "alert", "input-needed": "question", working: "spark", finished: "allow", idle: "moon" };
function statusKey(name, st, count, detail = "", tag = "", phase = null, sottotitolo = "") {
  const look = STATUS_LOOK[st] ?? STATUS_LOOK.none;
  const shown = String(name || "CLAUDE").slice(0, 11);
  const icona = STATUS_ICON[st] ? glyph(STATUS_ICON[st], 10, 8, 22, look.col, 2.4) : "";
  // Count badge wins the corner; otherwise the "cli"/"code" tag, which is the only
  // way to tell two sessions in the same project apart. Una sessione nel cloud ha la
  // nuvola al posto della parola.
  const angolo = count > 1 ? badge(count, look.col) : tag === "cloud" ? glyph("cloud", 110, 7, 24, C.info, 2.2) : corner(tag);
  return svgWrap(`
    ${tintFrame(look.col, !!look.strong, phase)}
    ${icona}
    ${angolo}
    ${sottotitolo ? conTitolo(shown, sottotitolo, look.col) : `
    ${line(72, 78, 128, 25, 700, st === "none" ? C.dim : C.text, shown)}
    ${line(72, 104, 130, 17, 700, look.col, look.label)}`}
    ${detail ? line(72, 127, 132, 13, 400, C.dim, detail) : ""}`);
}

// Con un titolo, il titolo prende il posto della parola dello stato («Working»): lo
// stato resta nel colore del riquadro, del titolo e nell'icona in alto a sinistra.
function conTitolo(nome, titolo, col) {
  const righe = aCapo(titolo, 16, 2);
  return line(72, righe.length > 1 ? 70 : 78, 128, 22, 700, C.text, nome) +
    righe.map((t, i) => line(72, (righe.length > 1 ? 93 : 103) + i * 17, 130, 15, 700, col, t)).join("");
}

function fmtNum(n) {
  if (n == null) return "--";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(n);
}

// ================= ACTION KEYS — band + glyph, the press leaves the deck =========

// The four actions that had no renderer at all and shipped as flat icon art, which is
// what ran two visual languages on one deck.
function actionKey(glyphName, title, label, sub) {
  const id = C.ident[glyphName] ?? C.rail;
  return svgWrap(`
    ${band.cap(id)}
    ${actionHead(glyphName, title, id)}
    ${line(72, 92, 128, 24, 700, C.text, label)}
    ${foot(sub)}`);
}

// Glyph is derived from the header so the call signature stays close to the original.
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
    line(72, use.length > 1 ? 76 + i * 26 : 92, 128, 23, 700, C.text, l)).join("");
  // The band carries this key's fixed IDENTITY hue and never varies with state; the
  // frame tint carries state alone. Colouring the band BY state is what made a working
  // FOCUS key impersonate the vivid-blue ALWAYS key sitting next to it in the profile.
  const g = GLYPH_FOR[String(title).toUpperCase()] ?? "custom";
  const id = C.ident[g] ?? C.rail;
  return svgWrap(`
    ${tintFrame(tint, strong)}
    ${band.cap(id)}
    ${actionHead(g, title, id)}
    ${body}
    ${foot(sub)}`);
}

const APPROVE_LOOK = {
  "approve-allow": { word: "ALLOW", col: C.ok, glyphName: "allow", weight: "rule" },
  "approve-always": { word: "ALWAYS", col: C.info, glyphName: "always", weight: "double" },
  "approve-deny": { word: "DENY", col: C.bad, glyphName: "deny", weight: "fill" },
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

// Nothing pending -> a calm dim look. A pending request tints the frame and (while
// fresh) breathes. ALLOW/DENY show the command; ALWAYS shows the RULE it would
// persist, because Claude Code's suggestions are wildcards.
function approveKey(kind, req, o = {}) {
  const look = APPROVE_LOOK[kind];
  const shell = (col, mult, bodyLines, sub, cornerSvg = "", wordOverride = null) => {
    // On DENY the band is a solid fill, so its glyph and word sit ON the fill.
    const onBand = kind === "approve-deny" && mult === 1 ? C.bg : col;
    // Body lives between the band (ends y=40) and the footer (y=127). Baselines are
    // tabulated rather than computed so a 4-line rule can't push text off the key.
    const n = Math.min(4, bodyLines.length);
    const [top, step] = [[92, 0], [78, 26], [68, 22], [62, 18]][n - 1] ?? [92, 0];
    const body = bodyLines.slice(0, n).map((l, i) =>
      line(72, top + i * step, RULE_W, l.max ?? 22, 700, l.col ?? C.text, l.t)).join("");
    return svgWrap(`
      ${tintFrame(col, mult === 1, o.phase ?? null)}
      ${band[look.weight](col, mult)}
      ${actionHead(look.glyphName, wordOverride ?? look.word, onBand)}
      ${cornerSvg}
      ${body}
      ${foot(sub)}`);
  };

  if (o.err) return shell(C.bad, 1, [], o.err);
  if (!req) return shell(C.dim, 0.4, [], "all clear");

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
  const col = disabled ? C.dim : look.col;
  const mult = disabled ? 0.4 : 1;
  // Depth badge wins the corner, else an optional user label. The project name keeps
  // the footer unconditionally: it is a wrong-request mitigation, so a cosmetic label
  // must not be able to hide it.
  const cornerSvg = o.depth > 1 ? badge(o.depth, col) : corner(o.label);
  const word = kind === "approve-always"
    ? (denied ? "ALWAYS" : rule === null ? "ALWAYS n/a" : `ALWAYS ·${o.sessionOnly ? "ses" : "prj"}`)
    : look.word;

  // Una scrittura in produzione: il tasto ALLOW chiede la pressione lunga e lo dice
  // in ambra, con il progetto e cosa fa sotto al comando.
  if (kind === "approve-allow" && o.lungo) {
    return shell(C.warn, 1, [{ t: target, max: 22 }, { t: o.dettaglio || "tieni premuto", col: C.warn, max: 16 }], "tieni premuto 2 s", cornerSvg, "ALLOW 2s");
  }

  if (denied) {
    return shell(col, mult, ruleLines(rule).map((t) => ({ t, col: C.dim, max: 18 })), String(o.denied), cornerSvg, word);
  }
  const shown = kind === "approve-always" ? (rule ?? target) : target;
  const lines = kind === "approve-always" && rule != null
    ? ruleLines(rule).map((t) => ({ t, max: 19 }))
    : [{ t: shown, max: 24 }];
  return shell(col, mult, lines, name, cornerSvg, word);
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

// Il tasto a icona grande della riga in basso: in alto ciò che il tasto FA (un'icona da
// 44 px, leggibile da lontano), sotto il testo che dice SU COSA, in fondo da dove viene.
// Il colore dice quanto è delicato: verde approva, rosso rifiuta, ambra una scrittura
// che chiede la pressione lunga, viola una domanda, blu una lettura.
//   testo     righe principali (al più 3; con testo2, una sola)
//   testo2    riga di dettaglio sotto, nel suo colore
//   numero    al posto dell'icona, un disco col numero (le opzioni di una domanda)
//   cloud     la nuvola in alto a sinistra: la richiesta viene da una sessione cloud
//   angolo    in alto a destra: { badge: n } oppure { testo: "2 s" }
function grandeKey(o = {}) {
  const colIcona = o.colIcona ?? C.text;
  const icona = o.numero != null
    ? `<circle cx="72" cy="34" r="21" fill="${colIcona}"/>${txt(72, 43, 26, 800, C.bg, String(o.numero))}`
    : o.icona ? glyph(o.icona, 50, 12, 44, colIcona, 3.2) : "";
  const righe = (o.testo ?? []).filter((t) => t != null && t !== "");
  let corpoSvg = "";
  // 120 e non 130 di larghezza: le maiuscole in grassetto sono più larghe della stima
  // di fit(), e «SQL SELECT» a 130 toccava i bordi del tasto.
  const LARGO = 120;
  if (o.testo2) {
    corpoSvg = (righe[0] != null ? line(72, 82, LARGO, o.ideale ?? 20, 700, o.col ?? C.text, righe[0]) : "") +
      line(72, 104, LARGO, 15, 700, o.col2 ?? C.dim, o.testo2);
  } else if (righe.length) {
    const n = Math.min(3, righe.length);
    const [ys, size] = [[[88], o.ideale ?? 20], [[80, 101], Math.min(o.ideale ?? 20, 18)], [[72, 90, 108], 15]][n - 1];
    corpoSvg = righe.slice(0, n).map((t, i) => line(72, ys[i], LARGO, size, 700, o.col ?? C.text, t)).join("");
  }
  // Quante ALTRE richieste aspettano dopo questa: «+1», non «2», che accanto a una
  // pressione lunga si leggerebbe «2 secondi».
  const altre = (o.angolo?.badge ?? 0) - 1;
  const angolo = altre > 0
    ? `<circle cx="119" cy="20" r="13" fill="${C.panel}" stroke="${colIcona}" stroke-width="1.5"/>` + txt(119, 25, 13, 800, C.text, `+${altre}`)
    : o.angolo?.testo ? txt(132, 26, 15, 800, colIcona, o.angolo.testo, "end") : "";
  return svgWrap(`
    ${tintFrame(o.tinta ?? null, !!o.forte, o.phase ?? null)}
    ${o.cloud ? glyph("cloud", 9, 7, 24, C.info, 2.2) : ""}
    ${angolo}
    ${icona}
    ${corpoSvg}
    ${foot(o.piede ?? "", o.colPiede ?? C.dim)}`);
}

const SPENTO = "#4a4658"; // icona di un tasto senza niente da fare: c'è, ma non chiama

// ALLOW e DENY con una richiesta (o senza): l'icona è la decisione.
//   o.lungo      ALLOW chiede la pressione lunga (scrittura in produzione)
//   o.target     il testo da mostrare al posto del comando (es. "SQL DELETE")
//   o.depth      quante richieste aspettano
function decisioneKey(kind, req, o = {}) {
  const allow = kind === "approve-allow";
  if (o.err) return grandeKey({ icona: "alert", colIcona: C.bad, tinta: C.bad, piede: o.err });
  if (!req) return grandeKey({ icona: allow ? "allow" : "deny", colIcona: SPENTO, piede: "all clear" });
  const d = describeRequest(req);
  const testo = o.target ? [o.target] : aCapo(targetIntero(req), 14, 3);
  // L'etichetta scelta nelle impostazioni del tasto, se c'è, prende il posto del progetto.
  const comune = { cloud: !!req.cloud, piede: o.label || d.name, phase: o.phase ?? null, angolo: { badge: o.depth } };
  if (allow && o.lungo) {
    return grandeKey({
      ...comune, icona: "hold", colIcona: C.warn, tinta: C.warn, forte: true,
      testo: testo.slice(0, 1), testo2: "tieni premuto 2 s", col2: C.warn,
      angolo: o.depth > 1 ? { badge: o.depth } : { testo: "2 s" },
    });
  }
  const col = allow ? C.ok : C.bad;
  return grandeKey({ ...comune, icona: allow ? "allow" : "deny", colIcona: col, tinta: col, forte: true, testo });
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

// Il tasto centrale con 4 opzioni: fa vedere le altre due.
function paginaKey(testo, sub, avanti = true, cloud = false) {
  return grandeKey({ icona: avanti ? "arrowR" : "arrowL", colIcona: C.ask, tinta: C.ask, cloud, testo: [testo], piede: sub });
}

// Il tasto centrale con 2 opzioni: la domanda. Premuto apre la sessione.
function domandaKey(intestazione, testo, sub, cloud = false) {
  return grandeKey({
    icona: "question", colIcona: C.ask, tinta: C.ask, cloud,
    testo: aCapo(testo, 15, 3), ideale: 16, piede: String(intestazione || "domanda").toUpperCase() + (sub ? ` ${sub}` : ""),
  });
}

// Il tasto centrale con un permesso: che cosa si sta per approvare. Premuto apre la
// sessione. Per Supabase il database nel colore del rischio: rosso una scrittura in
// produzione, ambra su staging, blu una lettura.
const INFO_TINTA = { prod: C.bad, staging: C.warn, legge: C.info };
function infoKey(icona, righe, sub, tinta = null, opz = {}) {
  const col = tinta ? INFO_TINTA[tinta] ?? null : null;
  if (opz.testo2) {
    return grandeKey({ icona, colIcona: col ?? C.ident.focus, tinta: col, forte: tinta === "prod", cloud: opz.cloud, testo: righe.slice(0, 1), testo2: opz.testo2, col2: col ?? C.dim, piede: sub });
  }
  return grandeKey({ icona, colIcona: col ?? opz.colIcona ?? C.ident.focus, tinta: col, cloud: opz.cloud, testo: righe, ideale: opz.ideale, piede: sub });
}

// L'icona del tasto centrale secondo lo strumento che chiede il permesso.
function iconaStrumento(toolName) {
  const t = String(toolName ?? "");
  if (t === "Bash") return ["code", C.ident.code];
  if (t === "WebFetch" || t === "WebSearch") return ["web", C.ident.web];
  if (["Edit", "Write", "Read", "NotebookEdit", "MultiEdit"].includes(t)) return ["file", C.ident.project];
  if (t === "Task" || t === "Agent") return ["layers", C.ident.chat];
  if (t.startsWith("mcp__")) return ["plug", C.ident.custom];
  return ["custom", C.ident.custom];
}

export {
  C, pctColor, esc, tintFrame, svgWrap, fit, fits, txt, glyph, iconSvg, listIconSvg, ruleLines,
  gaugeKey, linesKey, bigCountKey, burnKey, usageMeterKey, labelKey, actionKey,
  STATUS_LOOK, statusKey, APPROVE_LOOK, approveKey, fmtNum,
  aCapo, grandeKey, decisioneKey, opzioneKey, paginaKey, domandaKey, infoKey, iconaStrumento, SPENTO,
};
