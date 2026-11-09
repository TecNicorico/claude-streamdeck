// Renders every key, in every interesting state, into a single SVG for the README.
// Run with `npm run showcase`.
//
// Generated from src/keyart.js rather than screenshotted, for the same reason the
// action-list icons are generated: a hand-captured image goes stale the moment the art
// changes, and the old README shots outlived the design they documented by one whole
// redesign. This regenerates in a second with zero dependencies.
//
// docs/keys.svg is the canonical artifact. docs/keys.png is a raster snapshot of it for
// hosts that will not render SVG; see the README for how to refresh it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../src/keyart.js";

const C = K.C;
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PHASE = 2; // fixed, so the output is byte-stable between runs

// Each renderer returns a complete <svg> as a data URI. Unwrap it so several can be
// composed into one canvas.
const inner = (dataUri) => {
  const svg = decodeURIComponent(dataUri.replace(/^data:image\/svg\+xml,/, ""));
  return svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
};

const BASH = { id: 1, cwd: "/Users/you/dev/agent-vitals", toolName: "Bash", toolInput: { command: "npm run test:e2e" } };
const SQL = { id: 2, cwd: "/Users/you/dev/agent-vitals", toolName: "mcp__supabase__execute_sql", toolInput: { query: "delete from x" } };
const [BASH_ICONA, BASH_TESSERA] = K.iconaStrumento("Bash");
// view.js puts the session's title under the bottom row, so the three keys say whose request it is.
const TITOLO = "Fix the e2e tests";

// The titles arrive in capitals from view.js, as here; keyart sets them in sentence case.
const ROWS = [
  ["Usage and activity — the press only cycles or refreshes, so the icon is bare", [
    ["session 5h", K.gaugeKey("SESSION 5H", 94, "1h 5m left", PHASE)],
    ["weekly", K.gaugeKey("WEEKLY", 61, "3d left")],
    ["cost", K.usageMeterKey("THIS MONTH", "$2420.37", "cost", true)],
    ["tokens", K.usageMeterKey("7-DAY", "1.1B", "tokens", false)],
    ["per model", K.usageMeterKey("OPUS 7D 1/3", "$927.96", "est", true)],
    ["burn rate", K.burnKey(43_800_000, "$60.33 last 5h")],
    ["today", K.linesKey("TODAY", [{ text: "16 chats" }, { text: "804 msgs" }, { text: "95.4M tok" }])],
    ["sessions", K.bigCountKey("CLAUDE CODE", 7, "1 working", C.info, PHASE, C.info, false)],
  ]],
  ["Shortcuts — a tile in the key's own colour, because the press leaves the deck", [
    ["launch", K.actionKey("launch", "launch", "Desktop", "claude app")],
    ["quick chat", K.actionKey("chat", "chat", "New chat", "claude desktop")],
    ["claude.ai", K.actionKey("web", "claude.ai", "Open", "in browser")],
    ["terminal", K.actionKey("code", "code", "Terminal", "~/Developer")],
    ["focus", K.labelKey("FOCUS", "agent-vitals", "working", C.info)],
    ["project", K.labelKey("PROJECT", "agent-vitals", "")],
    ["quick prompt", K.labelKey("PROMPT", "ship it", "")],
    ["custom", K.labelKey("CLAUDE", "custom", "")],
  ]],
  ["Session status — the tile is the state, the ring says it is happening now", [
    ["idle", K.statusKey("agent-vitals", "idle", 1, "24m idle", "cli")],
    ["working", K.statusKey("agent-vitals", "working", 1, "", "cli", PHASE)],
    ["finished", K.statusKey("agent-vitals", "finished", 1, "just now", "cli")],
    ["needs approval", K.statusKey("agent-vitals", "needs-approval", 1, "WebFetch · 4s", "cli", PHASE)],
    ["input needed", K.statusKey("agent-vitals", "input-needed", 1, "", "cli", PHASE)],
    ["two sessions", K.statusKey("agent-vitals", "working", 2, "", "", PHASE)],
    ["waiting, quiet", K.statusKey("WAITING", "quiet", 1, "7 sessions ok")],
    ["no session", K.statusKey("", "none", 1, "")],
  ]],
  ["Answering from the deck — octagon, rounded square, circle: three silhouettes", [
    ["deny, idle", K.decisioneKey("approve-deny", null)],
    ["centre, idle", K.infoKey("dot", [], "all clear", null, { colIcona: K.SPENTO })],
    ["allow, idle", K.decisioneKey("approve-allow", null)],
    ["deny", K.decisioneKey("approve-deny", BASH, { depth: 2, phase: PHASE, label: TITOLO })],
    ["what is asked", K.infoKey(BASH_ICONA, K.aCapo(BASH.toolInput.command, 15, 3), TITOLO, null, { colIcona: BASH_TESSERA, ideale: 18 })],
    ["allow", K.decisioneKey("approve-allow", BASH, { depth: 2, phase: PHASE, label: TITOLO })],
    ["allow, hold 2 s", K.decisioneKey("approve-allow", SQL, { lungo: true, target: "SQL DELETE", phase: PHASE, label: TITOLO })],
    ["a question", K.opzioneKey(1, "Deploy", "Yes, run the migration", "", PHASE)],
  ]],
  ["La terza pagina — nello stile di Discord: la tessera è il gruppo, il pallino lo stato", [
    ["posta", K.postaKey({ etichetta: "Personale", badge: { testo: "7", tono: "nuovo" }, riga: "da leggere", rigaTono: "normale", spenta: false })],
    ["posta, letta", K.postaKey({ etichetta: "Lavoro", badge: null, riga: "tutto letto", rigaTono: "normale", spenta: false })],
    ["password?", K.postaKey({ etichetta: "Lavoro", badge: { testo: "!", tono: "attenzione" }, riga: "password rifiutata", rigaTono: "attenzione", spenta: false })],
    ["fatturato", K.thecoreKey({ glifo: "euro", gruppo: "Vendite", titolo: "Fatturato", valore: "€ 184k", sub: "▲ 14% vs 25/26" })],
    ["senza sales", K.thecoreKey({ glifo: "utentePiu", gruppo: "Directory", titolo: "Senza sales", valore: "14", sub: "2 competitor", tono: "attenzione" })],
    ["candidature", K.thecoreKey({ glifo: "persone", gruppo: "Hiring", titolo: "Candidature", valore: "23", sub: "da scrutinare · +6", tono: "attenzione" })],
    ["outbox", K.thecoreKey({ glifo: "battito", gruppo: "Operativo", titolo: "Outbox", valore: "3", sub: "2 falliti · 1 fermo", tono: "guasto" })],
    ["fornitori", K.thecoreKey({ glifo: "camion", gruppo: "Operativo", titolo: "Fornitori", valore: "0", sub: "con un problema" })],
  ]],
];

const KEY = 144, GAP = 18, PAD = 34, CAPH = 22, HEADH = 34, ROWGAP = 30;
const FONT = "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif";

// Lays rows of keys onto one canvas. `heading` is optional; without it the sheet is
// just the keys, which is what the action-key strip wants.
function sheet(rows, heading = null) {
  const cols = Math.max(...rows.map(([, keys]) => keys.length));
  const W = PAD * 2 + cols * KEY + (cols - 1) * GAP;
  const top0 = PAD + (heading ? 26 : 0);
  const H = top0 + rows.length * (HEADH + KEY + CAPH) + (rows.length - 1) * ROWGAP + PAD;
  let out = heading
    ? `<text x="${PAD}" y="${PAD + 4}" font-family="${FONT}" font-size="19" font-weight="700" fill="${C.text}">${heading}</text>`
    : "";
  let y = top0;
  for (const [title, keys] of rows) {
    out += `<text x="${PAD}" y="${y + 14}" font-family="${FONT}" font-size="13" font-weight="600" fill="${C.dim}" letter-spacing="0.3">${title}</text>`;
    const top = y + HEADH;
    keys.forEach(([cap, art], i) => {
      const x = PAD + i * (KEY + GAP);
      out += `<g transform="translate(${x},${top})">${inner(art)}</g>`;
      out += `<text x="${x + KEY / 2}" y="${top + KEY + 15}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="${C.dim}">${cap}</text>`;
    });
    y = top + KEY + CAPH + ROWGAP;
  }
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#0d0d11"/>
${out}
</svg>
`, W, H };
}

fs.mkdirSync(path.join(ROOT, "docs"), { recursive: true });
const files = [
  ["keys.svg", sheet(ROWS, "Agent Vitals — key art"), ROWS.reduce((n, r) => n + r[1].length, 0)],
  // The shortcut strip on its own: one identity hue per action, which is the clearest
  // single view of the design.
  ["actions.svg", sheet([ROWS[1]]), ROWS[1][1].length],
];
for (const [name, { svg, W, H }, n] of files) {
  fs.writeFileSync(path.join(ROOT, "docs", name), svg);
  console.log(`wrote docs/${name} (${W}x${H}, ${n} keys)`);
}
