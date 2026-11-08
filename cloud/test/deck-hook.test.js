import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { gestisci, rispostaPerClaude, conHook, attesaS, sessioneDa } from "../deck-hook.mjs";
import { scriptSetup } from "../../tools/gen-setup.mjs";

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
  assert.equal(rispostaPerClaude({ tipo: "rispondi", risposte: { "Q": "a" } }, { questions: [{ question: "Q", multiSelect: true, options: [{ label: "a" }] }] }), null);
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

test("attesa: 60 secondi, configurabile fra 5 e 600", () => {
  assert.equal(attesaS({}), 60);
  assert.equal(attesaS({ DECK_ATTESA_S: "120" }), 120);
  assert.equal(attesaS({ DECK_ATTESA_S: "2" }), 60);
  assert.equal(attesaS({ DECK_ATTESA_S: "9999" }), 60);
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
  assert.equal(una.hooks.PermissionRequest[1].hooks[0].timeout, 75, "il timeout dell'hook supera l'attesa");
  assert.deepEqual(una.hooks.Stop.map((g) => g.hooks[0].command), ["echo ciao", cmd]);
  for (const ev of ["SessionStart", "UserPromptSubmit", "SessionEnd"]) assert.equal(una.hooks[ev].length, 1);
});

test("lo script di setup committato contiene l'hook di adesso", () => {
  const hook = readFileSync(join(radice, "cloud", "deck-hook.mjs"), "utf8");
  const committato = readFileSync(join(radice, "cloud", "setup-ambiente.sh"), "utf8");
  assert.equal(committato, scriptSetup(hook), "rigenera con: node tools/gen-setup.mjs");
});
