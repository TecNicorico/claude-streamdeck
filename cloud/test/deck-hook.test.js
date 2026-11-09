import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { gestisci, rispostaPerClaude, conHook, attesaS, sessioneDa, titoloDa, TITOLO_MAX, aggiorna } from "../deck-hook.mjs";
import { mkdtempSync, writeFileSync as scrivi, readFileSync as leggi } from "node:fs";
import { tmpdir } from "node:os";
import { scriptSetup, moduloHook } from "../../tools/gen-setup.mjs";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENV = { DECK_RELAY_URL: "https://relay.example", DECK_RELAY_TOKEN: "c".repeat(40), CLAUDE_CODE_REMOTE: "true", CLAUDE_CODE_REMOTE_SESSION_ID: "cse_01ABCDEFGHJK" };
const DOMANDA = { questions: [{ question: "Ramo?", header: "Ramo", multiSelect: false, options: [{ label: "staging", description: "x" }, { label: "main" }] }] };

// Un relay finto: registra le chiamate e risponde secondo lo scenario.
function relayFinto(risposte) {
  const chiamate = [];
  const f = async (base, token, path, body) => {
    chiamate.push({ path, body, token });
    const r = risposte[path];
    return typeof r === "function" ? r(body, chiamate) : r ?? null;
  };
  return { f, chiamate };
}

test("approva dal deck: Claude riceve allow", async () => {
  const { f } = relayFinto({ "/v1/cloud/richiesta": { id: "r1" }, "/v1/cloud/attendi": { stato: "decisa", decisione: { tipo: "approva" } } });
  const out = await gestisci({ hook_event_name: "PermissionRequest", tool_name: "mcp__Supabase__execute_sql", tool_input: { query: "select 1" }, cwd: "/home/user/thecore-v2" }, { env: ENV, fetchAttesa: f });
  assert.deepEqual(out, { hookSpecificOutput: { hookEventName: "PermissionRequest", decision: { behavior: "allow" } } });
});

test("rifiuta dal deck: Claude riceve deny con un messaggio", async () => {
  const { f } = relayFinto({ "/v1/cloud/richiesta": { id: "r1" }, "/v1/cloud/attendi": { stato: "decisa", decisione: { tipo: "rifiuta" } } });
  const out = await gestisci({ hook_event_name: "PermissionRequest", tool_name: "Bash", tool_input: {} }, { env: ENV, fetchAttesa: f });
  assert.equal(out.hookSpecificOutput.decision.behavior, "deny");
  assert.match(out.hookSpecificOutput.decision.message, /Stream Deck/);
});

test("risposta a una domanda: le risposte vanno in updatedInput, con le domande originali intere", async () => {
  const { f } = relayFinto({ "/v1/cloud/richiesta": { id: "r1" }, "/v1/cloud/attendi": { stato: "decisa", decisione: { tipo: "rispondi", risposte: { "Ramo?": "main" } } } });
  const out = await gestisci({ hook_event_name: "PermissionRequest", tool_name: "AskUserQuestion", tool_input: DOMANDA }, { env: ENV, fetchAttesa: f });
  assert.deepEqual(out.hookSpecificOutput.decision, { behavior: "allow", updatedInput: { ...DOMANDA, answers: { "Ramo?": "main" } } });
  assert.equal(out.hookSpecificOutput.decision.updatedInput.questions[0].options[0].description, "x", "le descrizioni restano: Claude riceve il suo input, non quello ridotto del relay");
});

test("una risposta che non è fra le opzioni non arriva a Claude, anche se il relay la passa", () => {
  assert.equal(rispostaPerClaude({ tipo: "rispondi", risposte: { "Ramo?": "produzione" } }, DOMANDA), null);
  assert.equal(rispostaPerClaude({ tipo: "rispondi", risposte: {} }, DOMANDA), null);
  assert.equal(rispostaPerClaude({ tipo: "sempre" }, {}), null, "niente always");
  const multipla = { questions: [{ question: "Q", multiSelect: true, options: [{ label: "a" }, { label: "b" }, { label: "c" }] }] };
  assert.equal(rispostaPerClaude({ tipo: "rispondi", risposte: { "Q": "a" } }, multipla), null, "a scelta multipla serve un elenco");
  assert.equal(rispostaPerClaude({ tipo: "rispondi", risposte: { "Q": ["a", "z"] } }, multipla), null);
  assert.deepEqual(rispostaPerClaude({ tipo: "rispondi", risposte: { "Q": ["a", "c"] } }, multipla).hookSpecificOutput.decision.updatedInput.answers, { "Q": "a, c" });
});

test("il deck non risponde in tempo: l'hook rinuncia e non scrive niente", async () => {
  let t = 0;
  const { f, chiamate } = relayFinto({ "/v1/cloud/richiesta": { id: "r1" }, "/v1/cloud/attendi": () => { t += 20_000; return { stato: "in_attesa" }; }, "/v1/cloud/rinuncia": { ok: true } });
  const out = await gestisci({ hook_event_name: "PermissionRequest", tool_name: "Bash", tool_input: {} }, { env: { ...ENV, DECK_ATTESA_S: "45" }, fetchAttesa: f, ora: () => t });
  assert.equal(out, null);
  assert.equal(chiamate.at(-1).path, "/v1/cloud/rinuncia");
  assert.equal(chiamate.filter((c) => c.path === "/v1/cloud/attendi").length, 3);
});

test("relay spento, chiave sbagliata o assente: nessuna decisione, mai un blocco", async () => {
  const { f } = relayFinto({});
  assert.equal(await gestisci({ hook_event_name: "PermissionRequest", tool_name: "Bash" }, { env: ENV, fetchAttesa: f }), null);
  assert.equal(await gestisci({ hook_event_name: "PermissionRequest", tool_name: "Bash" }, { env: { ...ENV, DECK_RELAY_TOKEN: "" }, fetchAttesa: f }), null);
  assert.equal(await gestisci({ hook_event_name: "PermissionRequest", tool_name: "Bash" }, { env: { ...ENV, DECK_RELAY_URL: "ftp://x" }, fetchAttesa: f }), null);
});

test("sul PC non fa niente: lì le richieste le prende il plugin", async () => {
  const { f, chiamate } = relayFinto({ "/v1/cloud/richiesta": { id: "r1" } });
  const out = await gestisci({ hook_event_name: "PermissionRequest", tool_name: "Bash" }, { env: { ...ENV, CLAUDE_CODE_REMOTE: "" }, fetchAttesa: f });
  assert.equal(out, null);
  assert.equal(chiamate.length, 0);
});

test("gli eventi della sessione diventano stati sul relay", async () => {
  const { f, chiamate } = relayFinto({ "/v1/cloud/stato": { ok: true } });
  for (const ev of ["SessionStart", "UserPromptSubmit", "Stop", "SessionEnd", "PostToolUse"]) {
    assert.equal(await gestisci({ hook_event_name: ev, cwd: "/home/user/thecore-v2" }, { env: ENV, fetchAttesa: f }), null);
  }
  assert.deepEqual(chiamate.map((c) => c.body.evento), ["avvio", "lavora", "fine", "chiusa"]);
  assert.deepEqual(chiamate[0].body.sessione, { id: "cse_01ABCDEFGHJK", idRemoto: "cse_01ABCDEFGHJK", nome: "thecore-v2", cwd: "/home/user/thecore-v2" });
});

test("la sessione prende l'id del container, e in sua assenza quello di Claude Code", () => {
  assert.equal(sessioneDa({ session_id: "abc" }, {}).id, "abc");
  assert.equal(sessioneDa({}, {}), null);
});

test("attesa: 5 minuti, configurabile fra 5 e 600 secondi", () => {
  assert.equal(attesaS({}), 300);
  assert.equal(attesaS({ DECK_ATTESA_S: "120" }), 120);
  assert.equal(attesaS({ DECK_ATTESA_S: "2" }), 300);
  assert.equal(attesaS({ DECK_ATTESA_S: "9999" }), 300);
});

test("quando apre la richiesta lo dice, così se Claude Code lo chiude può avvisare il relay", async () => {
  const visti = [];
  const { f } = relayFinto({ "/v1/cloud/richiesta": { id: "r9" }, "/v1/cloud/attendi": { stato: "decisa", decisione: { tipo: "rifiuta" } } });
  await gestisci({ hook_event_name: "PermissionRequest", tool_name: "Bash", tool_input: {} }, { env: ENV, fetchAttesa: f, quandoAperta: (id, base) => visti.push([id, base]) });
  assert.deepEqual(visti, [["r9", "https://relay.example"]]);
});

test("installazione: aggiunge i nostri hook, tiene gli altri, e rifatta non si duplica", () => {
  const prima = { model: "x", hooks: { PermissionRequest: [{ matcher: "", hooks: [{ type: "http", url: "http://altro" }] }], Stop: [{ hooks: [{ type: "command", command: "echo ciao" }] }] } };
  const cmd = 'node "$HOME/.claude/deck/deck-hook.mjs"';
  const una = conHook(prima, cmd, 60);
  const due = conHook(una, cmd, 60);
  assert.deepEqual(una, due, "idempotente");
  assert.equal(una.model, "x");
  assert.equal(una.hooks.PermissionRequest.length, 2);
  assert.equal(una.hooks.PermissionRequest[0].hooks[0].url, "http://altro");
  assert.equal(una.hooks.PermissionRequest[1].hooks[0].timeout, 615, "il timeout è il massimo: l'attesa vera la legge l'hook dall'ambiente");
  assert.deepEqual(una.hooks.Stop.map((g) => g.hooks[0].command), ["echo ciao", cmd]);
  for (const ev of ["SessionStart", "UserPromptSubmit", "SessionEnd"]) assert.equal(una.hooks[ev].length, 1);
});

test("il relay serve l'hook di adesso, e lo script di setup è quello generato", () => {
  const hook = readFileSync(join(radice, "cloud", "deck-hook.mjs"), "utf8");
  assert.equal(readFileSync(join(radice, "relay", "src", "hook-testo.js"), "utf8"), moduloHook(hook), "rigenera con: node tools/gen-setup.mjs");
  assert.equal(readFileSync(join(radice, "cloud", "setup-ambiente.sh"), "utf8"), scriptSetup(), "rigenera con: node tools/gen-setup.mjs");
});

test("lo script di setup scarica dal relay scritto dentro, e non contiene chiavi", () => {
  const s = scriptSetup("https://claude-deck-relay.prova.workers.dev");
  assert.match(s, /DECK_RELAY="https:\/\/claude-deck-relay\.prova\.workers\.dev"/);
  assert.match(s, /\/v1\/hook\.mjs/);
  assert.doesNotMatch(s, /TOKEN=|Bearer/);
});

test("il titolo della sessione: la prima riga del messaggio, mai un comando", () => {
  const ups = (prompt) => ({ hook_event_name: "UserPromptSubmit", prompt });
  assert.equal(titoloDa(ups("  \n Sistema la mappa delle scuole\nAltre righe")), "Sistema la mappa delle scuole");
  assert.equal(titoloDa(ups("/compact")), "", "un comando non è un titolo");
  assert.equal(titoloDa(ups("")), "");
  assert.equal(titoloDa({ hook_event_name: "Stop", prompt: "ciao" }), "", "solo dal messaggio della persona");
  const lungo = titoloDa(ups("parola ".repeat(30)));
  assert.ok(lungo.length <= TITOLO_MAX && lungo.endsWith("…"));
});

test("lo stato «lavora» porta il titolo al relay, gli altri eventi no", async () => {
  const { f, chiamate } = relayFinto({ "/v1/cloud/stato": { ok: true } });
  await gestisci({ hook_event_name: "UserPromptSubmit", prompt: "Aggiungi il pulsante", cwd: "/home/user/thecore-v2" }, { env: ENV, fetchAttesa: f });
  await gestisci({ hook_event_name: "Stop", cwd: "/home/user/thecore-v2" }, { env: ENV, fetchAttesa: f });
  assert.equal(chiamate[0].body.sessione.titolo, "Aggiungi il pulsante");
  assert.equal("titolo" in chiamate[1].body.sessione, false);
});

// ---------- l'hook si aggiorna da solo all'avvio della sessione ----------
// L'ambiente cloud riusa un'istantanea dello script di setup (il registro di una sessione
// dice «Restored saved setup»): l'hook scaricato lì resterebbe fermo per sempre.
const HOOK_VERO = readFileSync(join(radice, "cloud", "deck-hook.mjs"), "utf8");
const fileTemp = (contenuto) => { const f = join(mkdtempSync(join(tmpdir(), "deck-")), "deck-hook.mjs"); scrivi(f, contenuto); return f; };
const risposta = (status, testo) => async () => ({ ok: status >= 200 && status < 300, status, text: async () => testo });

test("all'avvio scarica dal relay la versione di adesso e si sostituisce", async () => {
  const f = fileTemp("#!/usr/bin/env node\n// versione vecchia deck-hook.mjs\n");
  assert.equal(await aggiorna(f, { env: ENV, scarica: risposta(200, HOOK_VERO) }), "aggiornato");
  assert.equal(leggi(f, "utf8"), HOOK_VERO);
  assert.equal(await aggiorna(f, { env: ENV, scarica: risposta(200, HOOK_VERO) }), "già aggiornato");
});

test("non si sostituisce mai con qualcosa che non è l'hook", async () => {
  const vecchio = "#!/usr/bin/env node\n// deck-hook.mjs vecchio ma funzionante\nexport async function gestisci() {}\n";
  const casi = [
    [risposta(200, "<html>errore di Cloudflare</html>"), "non è l'hook"],
    [risposta(200, HOOK_VERO.slice(0, 200)), "non è l'hook"],
    [risposta(404, "non trovato"), "relay 404"],
    [async () => { throw new Error("rete negata"); }, "non raggiungibile"],
  ];
  for (const [scarica, atteso] of casi) {
    const f = fileTemp(vecchio);
    assert.equal(await aggiorna(f, { env: ENV, scarica }), atteso);
    assert.equal(leggi(f, "utf8"), vecchio, atteso);
  }
  assert.equal(await aggiorna(fileTemp(vecchio), { env: { ...ENV, DECK_RELAY_URL: "" }, scarica: risposta(200, HOOK_VERO) }), "senza relay");
});

// ---------- le letture SQL non chiedono (09/11/2026) ----------
import { sqlSoloLettura, letturaAutomatica, sorvegliaTranscript, toolUseUguali, LETTURA_APPROVATA } from "../deck-hook.mjs";
import { appendFileSync } from "node:fs";

const LETTURE = [
  "select count(*) from public.engagement where season_id = 3",
  "SELECT e.id, coalesce(e.prezzo, 0), jsonb_build_object('a', 1) FROM engagement e JOIN (select id from school_season) s ON s.id = e.school_season_id WHERE e.id IN (1, 2) AND exists (select 1) GROUP BY 1 ORDER BY 2 DESC LIMIT 10;",
  "with a as (select 1 as n) select * from a",
  "select date_trunc('day', created_at)::date, count(*) filter (where is_official) over (partition by sales_id) from engagement",
  "select column_name, data_type from information_schema.columns where table_name = 'contact'",
  "show search_path",
  "explain (format json) select * from engagement",
  "select pg_get_functiondef('app.is_staff'::regproc)",
  "select * from comment where body like '%delete from%; drop table%'",
  "select 1 -- ; drop table t\n",
  "select 1 /* /* annidato */ ; drop table t; */",
  "select E'a\\'; drop table t; --'",
  "select $$a; drop table t$$",
  "table season",
];
const SCRITTURE = [
  // Una SELECT che scrive attraverso una funzione: in TheCore ce ne sono.
  "select fn_next_officialization_code(3)",
  "select rpc_apri_scuola(12, null)",
  "select public.rpc_totali(3)",
  "select app.apri_engagement(1, 2)",
  "select \"rpc_apri_scuola\"(1)",
  "select nextval('season_id_seq')",
  "select set_config('request.jwt.claims', '', false)",
  "select pg_terminate_backend(123)",
  "select dblink_exec('dbname=x', 'drop table t')",
  "select pg_read_file('/etc/passwd')",
  "select pg_sleep(30)",
  // Le scritture vere, anche dentro una CTE o dopo un punto e virgola.
  "with x as (delete from t returning *) select * from x",
  "select * into nuova from engagement",
  "select * from engagement for update",
  "select 1; delete from engagement",
  "explain analyze delete from engagement",
  "explain analyze select 1",
  "insert into t values (1)",
  "update t set a = 1",
  "copy t to stdout",
  "set role postgres",
  "do $$ begin delete from t; end $$",
  // Un falso commento o una falsa stringa che nascondono una seconda istruzione.
  "select '/*', 1; drop table t; select '*/'",
  "select '--', 1; drop table t",
  "select a$x$ from t; drop table t; select $x$",
  "select x from t where y = $1",
  // Non chiusi.
  "select 'aperta",
  "select 1 /* aperto",
  "",
];

test("letture SQL: si riconoscono quelle vere", () => {
  for (const q of LETTURE) assert.equal(sqlSoloLettura(q), true, q);
});

test("letture SQL: una SELECT che scrive, o un trucco, non passa", () => {
  for (const q of SCRITTURE) assert.equal(sqlSoloLettura(q), false, q);
});

test("letture SQL: solo gli strumenti di Supabase, e fra quelli solo i lettori", () => {
  assert.equal(letturaAutomatica("mcp__Supabase__execute_sql", { project_id: "x", query: "select 1" }), true);
  assert.equal(letturaAutomatica("mcp__supabase_prod__execute_sql", { query: "select 1" }), true);
  assert.equal(letturaAutomatica("mcp__Supabase__execute_sql", { query: "delete from t" }), false);
  assert.equal(letturaAutomatica("mcp__Supabase__list_tables", { project_id: "x" }), true);
  assert.equal(letturaAutomatica("mcp__Supabase__get_logs", {}), true);
  assert.equal(letturaAutomatica("mcp__Supabase__apply_migration", { query: "select 1" }), false);
  assert.equal(letturaAutomatica("mcp__Supabase__deploy_edge_function", {}), false);
  assert.equal(letturaAutomatica("mcp__Supabase__confirm_cost", {}), false, "è il consenso a una spesa");
  assert.equal(letturaAutomatica("mcp__Postgres__query", { sql: "select 1" }), false);
  assert.equal(letturaAutomatica("Bash", { command: "psql -c 'select 1'" }), false);
});

test("una lettura si approva subito, senza aprire niente sul relay", { timeout: 5000 }, async () => {
  const { f, chiamate } = relayFinto({ "/v1/cloud/richiesta": { id: "r1" }, "/v1/cloud/attendi": { stato: "sconosciuta" } });
  const out = await gestisci({ hook_event_name: "PermissionRequest", tool_name: "mcp__Supabase__execute_sql", tool_input: { project_id: "yejg", query: "select count(*) from contact" } }, { env: ENV, fetchAttesa: f, sorveglia: () => () => {} });
  assert.deepEqual(out, LETTURA_APPROVATA);
  assert.equal(chiamate.length, 0);
  // Anche senza relay configurato.
  const senzaRelay = { CLAUDE_CODE_REMOTE: "true" };
  assert.deepEqual(await gestisci({ hook_event_name: "PermissionRequest", tool_name: "mcp__Supabase__list_tables", tool_input: {} }, { env: senzaRelay, fetchAttesa: f, sorveglia: () => () => {} }), LETTURA_APPROVATA);
});

test("una scrittura va al deck come prima, e DECK_LETTURE_SQL=0 spegne le letture automatiche", { timeout: 5000 }, async () => {
  for (const [env, q] of [[ENV, "delete from contact"], [{ ...ENV, DECK_LETTURE_SQL: "0" }, "select 1"]]) {
    const { f, chiamate } = relayFinto({ "/v1/cloud/richiesta": { id: "r1" }, "/v1/cloud/attendi": { stato: "decisa", decisione: { tipo: "approva" } } });
    await gestisci({ hook_event_name: "PermissionRequest", tool_name: "mcp__Supabase__execute_sql", tool_input: { query: q } }, { env, fetchAttesa: f, sorveglia: () => () => {} });
    assert.equal(chiamate[0].path, "/v1/cloud/richiesta", q);
  }
});

// ---------- risolta altrove: il transcript ----------
const riga = (o) => JSON.stringify(o) + "\n";
const toolUse = (id, name, input) => riga({ type: "assistant", message: { content: [{ type: "tool_use", id, name, input }] } });
const toolResult = (id, testo = "ok", isError = false) => riga({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: id, content: testo, is_error: isError }] } });
const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));

test("transcript: lo stesso input in un altro ordine di chiavi è lo stesso strumento", () => {
  const righe = [JSON.parse(toolUse("t1", "Bash", { command: "ls", description: "x" }))];
  assert.deepEqual(toolUseUguali(righe, "Bash", { description: "x", command: "ls" }), ["t1"]);
  assert.deepEqual(toolUseUguali(righe, "Bash", { command: "ls -la", description: "x" }), []);
});

test("transcript: il risultato dello strumento chiesto ferma l'attesa, una volta sola", { timeout: 5000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "deck-transcript-"));
  const file = join(dir, "s.jsonl");
  const input = { project_id: "x", query: "delete from t where id = 1" };
  // Prima: la stessa identica chiamata, già fatta e già risolta, e altre righe.
  scrivi(file, toolUse("vecchia", "mcp__Supabase__execute_sql", input) + toolResult("vecchia") + riga({ type: "user", message: { content: "ciao" } }) + toolUse("mia", "mcp__Supabase__execute_sql", input));
  let volte = 0;
  const stop = sorvegliaTranscript(file, "mcp__Supabase__execute_sql", input, { quandoRisolta: () => volte++, ogniMs: 10 });
  await aspetta(40);
  assert.equal(volte, 0, "il risultato della chiamata vecchia non conta");
  appendFileSync(file, toolResult("altra"));
  await aspetta(40);
  assert.equal(volte, 0, "il risultato di un altro strumento non conta");
  // Rifiutata su claude.ai: il risultato è un errore, e arriva subito. Scritto in due
  // pezzi, come può capitare a una riga lunga.
  const r = toolResult("mia", "The user doesn't want to proceed with this tool use.", true);
  appendFileSync(file, r.slice(0, 20));
  await aspetta(30);
  appendFileSync(file, r.slice(20));
  await aspetta(60);
  assert.equal(volte, 1);
  appendFileSync(file, toolResult("mia"));
  await aspetta(40);
  assert.equal(volte, 1, "una volta sola");
  stop();
});

test("transcript: il tool_use scritto dopo che l'hook è partito si trova lo stesso", { timeout: 5000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "deck-transcript-"));
  const file = join(dir, "s.jsonl");
  // La stessa chiamata fatta un'ora fa, già risolta: non è quella che si aspetta.
  scrivi(file, toolUse("t1", "Bash", { command: "rm -rf build" }) + toolResult("t1") + riga({ type: "user", message: { content: "rifallo" } }));
  let volte = 0;
  const stop = sorvegliaTranscript(file, "Bash", { command: "rm -rf build" }, { quandoRisolta: () => volte++, ogniMs: 10 });
  appendFileSync(file, riga({ type: "assistant", message: { content: [{ type: "text", text: "Rifaccio." }] } }));
  await aspetta(40);
  assert.equal(volte, 0, "il risultato della chiamata di prima non decide questa");
  appendFileSync(file, toolUse("t9", "Bash", { command: "rm -rf build" }));
  await aspetta(40);
  assert.equal(volte, 0);
  appendFileSync(file, toolResult("t9"));
  await aspetta(40);
  assert.equal(volte, 1);
  stop();
  // Un file che non c'è non rompe niente.
  assert.equal(typeof sorvegliaTranscript(join(dir, "manca.jsonl"), "Bash", {}, { quandoRisolta: () => {} }), "function");
});

test("deciso su claude.ai: la richiesta si ritira dal relay e l'hook esce senza decidere", { timeout: 5000 }, async () => {
  let sveglia;
  const { f, chiamate } = relayFinto({
    "/v1/cloud/richiesta": { id: "r7" },
    // Il relay tiene l'attesa finché la richiesta non viene ritirata, poi risponde «sconosciuta».
    "/v1/cloud/attendi": () => new Promise((res) => { sveglia = () => res({ stato: "sconosciuta" }); }),
    "/v1/cloud/rinuncia": () => { sveglia?.(); return { ok: true }; },
  });
  let fermata = false;
  const sorveglia = (file, tool, input, { quandoRisolta }) => { setTimeout(quandoRisolta, 20); return () => { fermata = true; }; };
  const out = await gestisci({ hook_event_name: "PermissionRequest", tool_name: "Bash", tool_input: { command: "make" }, transcript_path: "/x.jsonl" }, { env: ENV, fetchAttesa: f, sorveglia });
  assert.equal(out, null);
  assert.deepEqual(chiamate.map((c) => c.path), ["/v1/cloud/richiesta", "/v1/cloud/attendi", "/v1/cloud/rinuncia"]);
  assert.equal(fermata, true, "la sorveglianza si ferma con l'hook");
});

test("una decisione del deck arrivata dopo quella su claude.ai non si consegna", { timeout: 5000 }, async () => {
  let risolvi;
  const { f } = relayFinto({
    "/v1/cloud/richiesta": { id: "r8" },
    "/v1/cloud/attendi": () => new Promise((res) => { risolvi = res; }),
    "/v1/cloud/rinuncia": { ok: true },
  });
  const sorveglia = (file, tool, input, { quandoRisolta }) => { setTimeout(() => { quandoRisolta(); risolvi({ stato: "decisa", decisione: { tipo: "approva" } }); }, 10); return () => {}; };
  const out = await gestisci({ hook_event_name: "PermissionRequest", tool_name: "Bash", tool_input: { command: "make" } }, { env: ENV, fetchAttesa: f, sorveglia });
  assert.equal(out, null);
});
