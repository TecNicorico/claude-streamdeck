import test from "node:test";
import assert from "node:assert/strict";
import { fit, fits, ruleLines, approveKey, usageMeterKey, statusKey, labelKey, actionKey, linesKey, burnKey, bigCountKey, gaugeKey, opzioneKey, paginaKey, domandaKey, infoKey, aCapo, decisioneKey, sceltaKey, confermaKey, selettoreKey, vuotoKey, iconaStrumento, SPENTO, C } from "../src/keyart.js";

// Every key is 144 units wide. These tests exist because two strings shipped
// overflowing it silently: the ALWAYS key's rule line measured 199 units (clipped on
// both sides, so two different domains looked identical on the one key that writes a
// durable permission rule), and "$2399.28" measured 143 — edge to edge, no margin.
const BOX = 144;
const ADVANCE = 0.6; // same estimator keyart's fit() uses; validated against getBBox

// Pull every <text> back out of the data-URI SVG a renderer returns and work out how
// far it actually extends, honouring text-anchor.
function textExtents(dataUri) {
  const svg = decodeURIComponent(dataUri.replace(/^data:image\/svg\+xml,/, ""));
  const out = [];
  for (const m of svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)) {
    // Si misura il testo che si vede: «&&» è «&amp;&amp;» nell'SVG, ma sono due caratteri.
    const attrs = m[1], body = m[2].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    if (!body.trim()) continue;
    const num = (k) => Number((attrs.match(new RegExp(`${k}="([^"]+)"`)) ?? [])[1]);
    // eslint-disable-next-line no-sparse-arrays -- default array; only [1] is read
    const anchor = (attrs.match(/text-anchor="([^"]+)"/) ?? [, "start"])[1];
    const w = body.length * ADVANCE * num("font-size");
    const x = num("x");
    const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    out.push({ body, size: num("font-size"), y: num("y"), x, anchor, left, right: left + w });
  }
  return out;
}
function assertInsideBox(dataUri, label) {
  for (const t of textExtents(dataUri)) {
    assert.ok(t.left >= -0.5, `${label}: "${t.body}" @${t.size} starts at ${t.left.toFixed(1)}, off the left edge`);
    assert.ok(t.right <= BOX + 0.5, `${label}: "${t.body}" @${t.size} ends at ${t.right.toFixed(1)}, past ${BOX}`);
  }
}

test("fit never returns a size that overflows the width it was given", () => {
  for (const n of [1, 4, 8, 11, 14, 20, 25, 36, 60]) {
    const s = "W".repeat(n);
    const size = fit(s, 120, 42);
    // The floor (min) is allowed to overflow — that is the caller's cue to split, and
    // ruleLines() is what does it. Above the floor, fit must actually fit.
    if (size > 11) assert.ok(fits(s, 120, size), `${n} chars @${size} does not fit 120`);
  }
});

test("fit honours the minimum floor rather than shrinking to nothing", () => {
  assert.equal(fit("W".repeat(200), 120, 42), 11);
  assert.equal(fit("W".repeat(200), 120, 42, 14), 14);
});

test("fit never exceeds the ideal size for short strings", () => {
  assert.equal(fit("7", 120, 42), 42);
  assert.equal(fit("", 120, 42), 42);
});

test("ruleLines keeps a short rule on one line", () => {
  assert.deepEqual(ruleLines("Bash(npm test)"), ["Bash(npm test)"]);
});

test("ruleLines splits the WebFetch rule that used to render 199 units wide", () => {
  const lines = ruleLines("WebFetch(domain:docs.amplify.aws)");
  assert.ok(lines.length >= 2, "should have split");
  assert.equal(lines.join("").includes("docs.amplify.aws"), true, "must not lose the domain");
  for (const l of lines) assert.ok(fits(l, 132, 13), `"${l}" is not legible even at 13px`);
});

test("ruleLines keeps every line legible at the RULE_FIT ceiling of 36 chars", () => {
  // alwaysRule() refuses past RULE_FIT (36), so these are the worst cases that can
  // reach a key. Includes one with no "(" at all, which has no structure to split on
  // and must fall through to the hard wrap.
  for (const rule of [
    "WebFetch(domain:sub.example-lon.com)",
    "Bash(some --very --long --command here)".slice(0, 36),
    "x".repeat(36),
  ]) {
    const lines = ruleLines(rule);
    for (const l of lines) assert.ok(fits(l, 132, 13), `"${l}" from "${rule}" is illegible`);
    assert.ok(lines.length <= 4, `"${rule}" split into ${lines.length} lines, more than fit`);
  }
});

// Overflow and collision are different failures. The box checks above pass happily
// while two texts sit on top of each other, which is how "THIS MONTH" and its "est"
// corner marker ran together into "THIS MONTHest".
function assertNoCollision(dataUri, label) {
  const items = textExtents(dataUri);
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      const sameLine = Math.abs(a.y - b.y) < 6;
      const overlaps = a.left < b.right - 0.5 && b.left < a.right - 0.5;
      assert.ok(!(sameLine && overlaps),
        `${label}: "${a.body}" and "${b.body}" share baseline y=${a.y} and overlap ` +
        `(${a.left.toFixed(1)}-${a.right.toFixed(1)} vs ${b.left.toFixed(1)}-${b.right.toFixed(1)})`);
    }
  }
}

test("a header and its corner marker never collide", () => {
  // usageMeterKey is the only renderer that puts a header and a corner tag on the same
  // baseline. Long window labels plus the "est" tag are the tight case.
  for (const head of ["today", "this month", "7-day", "opus 7d 1/3", "this month xl"]) {
    for (const isCost of [true, false]) {
      assertNoCollision(usageMeterKey(head, "$2420.37", "cost", isCost), `usageMeter "${head}" cost=${isCost}`);
    }
  }
  assertNoCollision(statusKey("agent-vitals", "working", 1, "", "code"), "status name+tag");
  assertNoCollision(statusKey("agent-vitals", "working", 4, "", "code"), "status name+badge");
});

// A fill that reaches the top edge has to follow the key's rx=18 corners. A plain rect
// paints straight over them and the key reads as square-cornered along its top — which
// is exactly what the identity cap and DENY's filled band both did.
test("nothing square-cornered paints over the key's rounded top edge", () => {
  const cases = [
    ["allow", approveKey("approve-allow", null, {})],
    ["deny idle", approveKey("approve-deny", null, {})],
    ["deny pending", approveKey("approve-deny", { cwd: "/a/b", toolName: "Bash", toolInput: { command: "npm test" }, suggestions: [] }, {})],
    ["launch", actionKey("launch", "launch", "Desktop", "claude app")],
    ["focus", labelKey("FOCUS", "agent-vitals", "working")],
    ["status", statusKey("agent-vitals", "working", 1, "", "cli")],
    ["usage", usageMeterKey("today", "$60.33", "cost", true)],
  ];
  for (const [label, art] of cases) {
    const svg = decodeURIComponent(art.replace(/^data:image\/svg\+xml,/, ""));
    for (const m of svg.matchAll(/<rect([^>]*)\/>/g)) {
      const a = m[1];
      const num = (k) => { const v = a.match(new RegExp(`${k}="([^"]+)"`)); return v ? Number(v[1]) : 0; };
      const touchesTop = num("y") <= 0.5;
      const fullWidth = num("width") >= 143;
      const rounded = /\brx="/.test(a);
      const isFill = /\bfill="(?!none)/.test(a);
      assert.ok(!(touchesTop && fullWidth && isFill && !rounded),
        `${label}: <rect${a}> is a square-cornered full-width fill at the top edge`);
    }
  }
});

test("no approve key overflows its box, in any state", () => {
  const w = (r) => [{ type: "addRules", behavior: "allow", rules: [{ toolName: r.split("(")[0], ruleContent: r.slice(r.indexOf("(") + 1, -1) }] }];
  const reqs = [
    { label: "bash", req: { cwd: "/a/agent-vitals", toolName: "Bash", toolInput: { command: "npm test" }, suggestions: w("Bash(npm test)") } },
    { label: "webfetch", req: { cwd: "/a/agent-vitals", toolName: "WebFetch", toolInput: { url: "https://docs.amplify.aws/x" }, suggestions: w("WebFetch(domain:docs.amplify.aws)") } },
    { label: "long-edit", req: { cwd: "/a/a-very-long-project-name", toolName: "Edit", toolInput: { file_path: "/a/b/an-extremely-long-filename.js" }, suggestions: w("Edit(/a/b/**)") } },
    { label: "no-rule", req: { cwd: "/a/agent-vitals", toolName: "Bash", toolInput: { command: "rm -rf /" }, suggestions: [] } },
  ];
  for (const kind of ["approve-allow", "approve-always", "approve-deny"]) {
    assertInsideBox(approveKey(kind, null, {}), `${kind} idle`);
    assertInsideBox(approveKey(kind, null, { err: "port in use" }), `${kind} err`);
    for (const { label, req } of reqs) {
      for (const o of [{}, { depth: 8 }, { sessionOnly: true }, { denied: "just denied" }, { label: "verylonglabel" }]) {
        assertInsideBox(approveKey(kind, req, o), `${kind} ${label} ${JSON.stringify(o)}`);
      }
    }
  }
});

test("no report or action key overflows its box on adversarial input", () => {
  const LONG = "an-extremely-long-value-that-should-shrink";
  assertInsideBox(usageMeterKey("this month", "$2399.28", "cost", true), "usageMeter money");
  assertInsideBox(usageMeterKey("7-day", "$1234567.89", "cost", true), "usageMeter huge");
  assertInsideBox(usageMeterKey("today", "--", "no data", true), "usageMeter empty");
  assertInsideBox(gaugeKey("session 5h", 97, "1h 5m left", 1), "gauge");
  assertInsideBox(burnKey(40_600_000, "$39.25 last 5h"), "burn");
  assertInsideBox(bigCountKey("claude code", 7, "1 working", null, 2, null, false), "bigCount");
  assertInsideBox(linesKey("today", [{ text: "16 chats" }, { text: LONG }, { text: "58.6M tok" }]), "lines");
  assertInsideBox(statusKey("monorepo-ui", "needs-approval", 3, "WebFetch · 4s", "cli", 1), "status");
  assertInsideBox(statusKey(LONG, "working", 1, LONG, "code"), "status long");
  assertInsideBox(labelKey("FOCUS", LONG, LONG), "label long");
  assertInsideBox(labelKey("PROJECT", "agent-vitals", "set folder in settings"), "label");
  assertInsideBox(actionKey("launch", "launch", "Desktop", "claude app"), "action");
  assertInsideBox(actionKey("web", "claude.ai", LONG, LONG), "action long");
});

test("i tasti nuovi della riga in basso non escono mai dal loro riquadro", () => {
  const LUNGO = "un'opzione con un testo davvero molto lungo che non sta su un tasto da settantadue pixel";
  for (const label of ["Sì", "staging", LUNGO, "supercalifragilistichespiralidoso"]) {
    assertInsideBox(opzioneKey(4, "INTESTAZIONELUNGA", label, "2/3", null, true), `opzione ${label}`);
    assertInsideBox(domandaKey("INTESTAZIONELUNGA", label + " " + LUNGO, "1/2", true), `domanda ${label}`);
    assertInsideBox(infoKey("database", [label], "a-very-long-project-name", "prod", { cloud: true, testo2: "STAGING · scrive" }), `info supabase ${label}`);
    assertInsideBox(infoKey("code", aCapo(label, 15, 3), "a-very-long-project-name"), `info ${label}`);
  }
  assertInsideBox(paginaKey("altre 2", "opzioni 3-4", true, true), "pagina");
  for (const label of ["Sì", "un'opzione lunghissima che va a capo più volte"]) {
    for (const scelta of [true, false]) assertInsideBox(sceltaKey(4, label, scelta, "INTESTAZIONE 2/3", true), `scelta ${scelta} ${label}`);
  }
  for (const n of [0, 1, 4]) assertInsideBox(confermaKey(n, "INTESTAZIONE LUNGA 2/3", true), `conferma ${n}`);
  const comandi = ["npm run db:test:security", "rm -rf /a/very/long/path/that/never/ends/and/goes/on/forever", "x".repeat(80), "ls"];
  for (const command of comandi) {
    const req = { cwd: "/home/user/a-very-long-project-name", toolName: "Bash", toolInput: { command }, cloud: true };
    for (const kind of ["approve-allow", "approve-deny"]) {
      for (const o of [{}, { depth: 8 }, { lungo: true }, { lungo: true, depth: 3 }, { target: "SQL SELECT" }, { label: "etichetta-lunghissima" }]) {
        assertInsideBox(decisioneKey(kind, req, o), `${kind} ${command.slice(0, 12)} ${JSON.stringify(o)}`);
      }
    }
  }
  for (const kind of ["approve-allow", "approve-deny"]) {
    assertInsideBox(decisioneKey(kind, null, {}), `${kind} vuoto`);
    assertInsideBox(decisioneKey(kind, null, { err: "port in use" }), `${kind} errore`);
  }
  for (const st of ["needs-approval", "input-needed", "working", "finished", "idle", "none", "quiet"]) {
    assertInsideBox(statusKey("thecore-v2-lunghissimo", st, 1, "permission · 5s", "cloud"), `status ${st}`);
    for (const titolo of ["Mappa", "Sistema la mappa delle scuole e poi altre cose ancora", "x".repeat(60)]) {
      assertInsideBox(statusKey("thecore-v2-lunghissimo", st, 3, "permission · 5s", "cloud", null, titolo), `status ${st} ${titolo.slice(0, 8)}`);
    }
  }
});

test("aCapo non perde la fine senza dirlo", () => {
  assert.deepEqual(aCapo("Sì, procedi con la migration", 12, 3), ["Sì, procedi", "con la", "migration"]);
  const tre = aCapo("uno due tre quattro cinque sei sette otto nove dieci undici dodici", 12, 3);
  assert.equal(tre.length, 3);
  assert.ok(tre[2].endsWith("…"));
});

test("i tasti della terza pagina non escono dal riquadro, con i numeri più lunghi", async () => {
  const { postaKey, thecoreKey } = await import("../src/keyart.js");
  const { METRICHE, vistaTheCore } = await import("../src/thecore.js");
  const { vistaPosta, facciaPosta } = await import("../src/posta.js");
  const recs = [null, { n: 0, at: 0 }, { n: 7, at: 0 }, { n: 1500, at: 0 }, { n: 3, at: 0, okAt: 0, err: "rete" },
    { n: null, at: 0, err: "credenziali" }, { n: null, at: 0, err: "timeout" }];
  for (const rec of recs) {
    for (const settings of [{ email: "enrico.malachin.lavoro.lungo@scuolazoo.com" }, { email: "a@b.it", label: "Un'etichetta lunghissima" }, {}]) {
      for (const haPassword of [true, false]) {
        const f = facciaPosta(vistaPosta({ settings, rec, haPassword }));
        assertInsideBox(postaKey(f), `posta ${JSON.stringify(rec)} ${settings.email ?? "-"}`);
      }
    }
  }
  // Ogni metrica con i numeri più grandi che una stagione può dare.
  const grande = {
    versione: 1,
    stagione: { id: 2, codice: "2026-2027", nome: "Stagione 2026/2027", precedente: "2025-2026", sfasamentoGiorni: 365 },
    vendite: { fatturato: 12_345_678.9, fatturatoOggi: 98_765.4, fatturatoAnnoScorso: 1, ordiniOggi: 12_345, ordiniIeri: 9_999, ordiniAnnoScorsoOggi: 1, ufficializzate: 4_321,
      ufficializzateMerch: 4_321, ufficializzateAnnuari: 4_321, lineeMerch: 12_345, lineeAnnuari: 12_345 },
    directory: { raggiunte: 4_253, raggiunteAnnoScorso: 1, daAssegnare: 1_234, competitor: 321, richieste: 1_234 },
    hiring: { daScrutinare: 12_345, arrivateOggi: 1_234, candidatiAccettati: 12_345, risEletti: 3_000, documentiDaVerificare: 1_234, elettiSenzaDocumento: 1_234 },
    operativo: { jobFalliti: 12_345, jobInRitardo: 12_345, plaoFirmate: 1_234, plaoDaFirmare: 1_234, fornitoriProblema: 1_234 },
    personale: { notificheNonLette: 12_345, menzioniNonLette: 1_234 },
  };
  const conf = { completa: true };
  for (const metrica of Object.keys(METRICHE)) {
    for (const tc of [{ dati: grande, at: 0, err: null }, { dati: grande, at: 0, okAt: 0, err: "rete" }, { dati: null, at: 0, err: "chiave" }, null]) {
      const v = vistaTheCore({ settings: { metrica }, tc, conf });
      assertInsideBox(thecoreKey(v), `thecore ${metrica} ${tc?.err ?? "ok"}`);
    }
  }
});

// ---------- il linguaggio di Discord sulle pagine di Claude (09/11/2026) ----------
const svgDi = (uri) => decodeURIComponent(uri.replace(/^data:image\/svg\+xml,/, ""));
// La sagoma grande della riga in basso, letta dalla geometria e mai dal colore: è ciò
// che resta a chi non distingue il verde dal rosso, e in scala di grigi.
function sagomaDi(uri) {
  const svg = svgDi(uri);
  if (/<circle cx="72" cy="35" r="22"/.test(svg)) return "tondo";
  if (/<rect x="50" y="13" width="44" height="44"/.test(svg)) return "tessera";
  for (const m of svg.matchAll(/<path d="M([^"]+) Z"[^>]*stroke-linejoin="round"/g)) {
    if (m[1].split(" L").length === 8) return "ottagono";
  }
  return null;
}
const SEGNO = { allow: "M5 12.8 L10 17.6 L19.4 7.2", deny: "M7 7 L17 17" };

test("ALLOW, DENY e il tasto centrale si distinguono senza colore: sagoma e segno", () => {
  const req = { id: 1, cwd: "/a/thecore-v2", toolName: "Bash", toolInput: { command: "npm test" } };
  const [icona, tessera] = iconaStrumento("Bash");
  const stati = [
    ["in attesa", (k) => decisioneKey(k, req, { depth: 2, phase: 1 }), infoKey(icona, ["npm test"], "x", null, { colIcona: tessera })],
    ["senza richieste", (k) => decisioneKey(k, null), infoKey("dot", [], "all clear", null, { colIcona: SPENTO })],
    ["guasto", (k) => decisioneKey(k, null, { err: "port in use" }), infoKey("alert", ["—"], "port in use", "prod")],
  ];
  for (const [nome, decisione, centro] of stati) {
    const allow = decisione("approve-allow"), deny = decisione("approve-deny");
    assert.equal(sagomaDi(allow), "tondo", `ALLOW ${nome}`);
    assert.equal(sagomaDi(deny), "ottagono", `DENY ${nome}`);
    assert.equal(sagomaDi(centro), "tessera", `centro ${nome}`);
    if (nome !== "guasto") {
      assert.ok(svgDi(allow).includes(SEGNO.allow) && !svgDi(allow).includes(SEGNO.deny), `ALLOW ${nome}: la spunta`);
      assert.ok(svgDi(deny).includes(SEGNO.deny) && !svgDi(deny).includes(SEGNO.allow), `DENY ${nome}: la croce`);
    }
  }
});

test("ALLOW a pressione lunga resta un altro tasto: l'arco, l'ambra e «tieni premuto»", () => {
  const req = { id: 1, cwd: "/a/thecore-v2", toolName: "mcp__supabase__execute_sql", toolInput: { query: "delete" } };
  const lungo = svgDi(decisioneKey("approve-allow", req, { lungo: true, target: "SQL DELETE" }));
  const breve = svgDi(decisioneKey("approve-allow", req, { target: "SQL DELETE" }));
  const arco = /A27 27 0 1 1/;
  assert.match(lungo, arco);
  assert.doesNotMatch(breve, arco);
  assert.match(lungo, />tieni premuto 2 s</);
  assert.match(lungo, new RegExp(`stroke="${C.warn}"`), "l'anello è ambra");
  assert.doesNotMatch(breve, new RegExp(`stroke="${C.warn}"`));
});

test("ogni stato di una sessione ha la sua icona, e chi aspetta te respira", () => {
  const STATI = ["needs-approval", "input-needed", "working", "finished", "idle", "none", "quiet", "unknown"];
  // L'icona nella tessera in alto a sinistra, senza i colori: la forma da sola.
  const iconaDi = (st) => {
    const svg = svgDi(statusKey("thecore-v2", st, 1, ""));
    const g = svg.match(/<g transform="translate\((16,15|18,17)\)[^>]*>(.*?)<\/g>/);
    return g ? g[2].replace(/#[0-9a-f]{6}/gi, "") : null;
  };
  const icone = new Map(STATI.map((st) => [st, iconaDi(st)]));
  for (const st of STATI) assert.ok(icone.get(st), `${st} senza icona`);
  const cinque = ["needs-approval", "input-needed", "working", "finished", "idle"].map((st) => icone.get(st));
  assert.equal(new Set(cinque).size, 5, "avviso, domanda, scintilla, spunta e luna sono cinque icone diverse");
  // Le facce intere restano tutte diverse (le tre calme si distinguono anche per tessera e parola).
  assert.equal(new Set(STATI.map((st) => statusKey("thecore-v2", st, 1, ""))).size, STATI.length);
  for (const st of ["needs-approval", "input-needed"]) {
    assert.notEqual(statusKey("x", st, 1, "", "", 0), statusKey("x", st, 1, "", "", 2), `${st} deve respirare`);
  }
});

test("nessun testo delle pagine di Claude scende sotto i 13 px, tranne le etichette", () => {
  const LUNGO = "un-nome-di-progetto-davvero-lunghissimo-che-non-finisce";
  const req = { id: 1, cwd: "/a/" + LUNGO, toolName: "Bash", toolInput: { command: "npm run db:test:security && " + LUNGO }, cloud: true };
  const keys = [
    gaugeKey("SONNET 7D 2/2", 97, "$25 / $50 · 120%", 1), gaugeKey("WEEKLY", null, "sign in?"),
    usageMeterKey("THIS MONTH", "$2399.28", "cost · " + LUNGO, true), usageMeterKey("7-DAY", "1.1B", "812M in · 300M out", false),
    burnKey(43_800_000, "cap in ~2h 10m"), bigCountKey("CLAUDE CODE", 12, "3 needs you", C.warn, 1, C.warn, true),
    linesKey("2/5", [{ text: LUNGO }, { text: "needs you", color: C.warn }, { text: "2h 5m old" }]),
    actionKey("web", "claude.ai", LUNGO, LUNGO), labelKey("CLAUDE", "custom", "set command in settings"),
    labelKey("FOCUS", LUNGO, LUNGO, C.warn, true),
    selettoreKey(LUNGO, LUNGO, 2, 3, C.ask), selettoreKey(LUNGO, "", 1, 1),
    decisioneKey("approve-allow", req, { depth: 12, label: LUNGO }), decisioneKey("approve-deny", req, { depth: 3 }),
    decisioneKey("approve-allow", req, { lungo: true, target: "SQL DELETE" }),
    infoKey("database", ["execute_sql"], LUNGO, "staging", { cloud: true, testo2: "STAGING · scrive" }),
    infoKey("code", aCapo(req.toolInput.command, 15, 3), LUNGO, null, { colIcona: "#11806a", ideale: 18 }),
    opzioneKey(4, "INTESTAZIONELUNGA", LUNGO, "2/3", 1, true), sceltaKey(2, LUNGO, false, "LINEE 1/2"), confermaKey(3, "LINEE 1/2"),
    paginaKey("altre 2", "opzioni 3-4"), domandaKey("DEPLOY", LUNGO + " " + LUNGO, "1/2 · " + LUNGO), vuotoKey(),
    approveKey("approve-always", null, {}), approveKey("approve-allow", req, { lungo: true, target: "SQL DELETE", depth: 3, label: "lab" }),
  ];
  for (const st of ["needs-approval", "input-needed", "working", "finished", "idle", "none", "quiet", "unknown"]) {
    keys.push(statusKey(LUNGO, st, 4, "permission · 12s · " + LUNGO, "code", 1, "", true));
    keys.push(statusKey(LUNGO, st, 1, "2/3 · " + LUNGO, "cloud", null, LUNGO + " " + LUNGO));
  }
  for (const k of keys) {
    for (const t of textExtents(k)) {
      // Le etichette: l'angolo in alto a destra («cli», «est»…), la pillola RISPONDI e il
      // numero sull'angolo della tessera. Tutto il resto si legge a un braccio.
      const etichetta = t.y <= 31 && (t.anchor === "end" || t.body === "RISPONDI" || t.x === 42);
      if (!etichetta) assert.ok(t.size >= 13, `"${t.body}" a ${t.size} px`);
      assertInsideBox(k, `13px ${t.body}`);
    }
  }
});
