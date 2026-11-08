import test from "node:test";
import assert from "node:assert/strict";
import { sessioniCloud, richiesteNuove, richiesteSparite, voceDa, decisioneDa, intervallo, urlValido } from "../src/relay.js";
import { decisionBody, answerBody } from "../src/approve.js";
import { sessionState, resolveStatusKey, sessionWhere } from "../src/status.js";

const SNAP = {
  versione: 3, ora: 1_000_000,
  sessioni: [{ id: "cse_01ABC", nome: "thecore-v2", cwd: "/home/user/thecore-v2", url: "https://claude.ai/code/session_01ABC", status: "waiting", waitingFor: "permission prompt", statusUpdatedAt: 990_000, updatedAt: 999_000, startedAt: 900_000 }],
  richieste: [{ id: "r1", sessione: "cse_01ABC", tool: "mcp__Supabase__execute_sql", input: { query: "select 1" }, troncato: false, ricevuta: 995_000, scade: 1_055_000 }],
};

test("una sessione cloud diventa una sessione come le altre, con l'orologio di questo computer", () => {
  const [s] = sessioniCloud(SNAP, 1_000_500);
  assert.equal(s.sessionId, "cloud:cse_01ABC");
  assert.equal(s.pid, null);
  assert.equal(s.statusUpdatedAt, 990_500, "spostata di 500 ms");
  assert.equal(sessionWhere(s), "cloud");
  assert.equal(sessionState(s, 1_000_500), "needs-approval");
  const r = resolveStatusKey([s], "thecore-v2", 0, 1_000_500);
  assert.equal(r.list[0].url, "https://claude.ai/code/session_01ABC", "il tasto Status sa cosa aprire");
});

test("un link che non è di claude.ai non arriva mai al browser", () => {
  const [s] = sessioniCloud({ ...SNAP, sessioni: [{ ...SNAP.sessioni[0], url: "https://evil.example" }] }, 0);
  assert.equal(s.url, null);
});

test("richieste nuove, già in fila, già gestite, sparite", () => {
  assert.deepEqual(richiesteNuove([], SNAP).map((r) => r.id), ["r1"]);
  assert.deepEqual(richiesteNuove([{ cloud: true, cloudId: "r1" }], SNAP), []);
  assert.deepEqual(richiesteNuove([], SNAP, new Set(["r1"])), [], "il deck ha appena risposto");
  assert.deepEqual(richiesteSparite([{ id: 9, cloud: true, cloudId: "r0" }, { id: 10, cloud: true, cloudId: "r1" }, { id: 11 }], SNAP), [9]);
});

test("una richiesta cloud in fila porta la sua scadenza e salta i controlli delle sessioni locali", () => {
  const sessioni = sessioniCloud(SNAP, 1_000_000);
  const v = voceDa(SNAP.richieste[0], sessioni, 1_000_000, SNAP.ora);
  assert.equal(v.cloud, true);
  assert.equal(v.holdMs, 60_000);
  assert.equal(v.cwd, "/home/user/thecore-v2");
  assert.equal(v.baselined, true);
  assert.deepEqual(v.suggestions, []);
});

test("le risposte del plugin tradotte per il relay", () => {
  assert.deepEqual(decisioneDa(decisionBody("allow", {})), { tipo: "approva" });
  assert.deepEqual(decisioneDa(decisionBody("deny", {})), { tipo: "rifiuta" });
  assert.deepEqual(decisioneDa(answerBody({ toolInput: { questions: [] } }, { "A?": "sì" })), { tipo: "rispondi", risposte: { "A?": "sì" } });
  assert.equal(decisioneDa(null), null, "nessuna risposta: resta a claude.ai");
  const always = { hookSpecificOutput: { decision: { behavior: "allow", updatedPermissions: [{ type: "addRules" }] } } };
  assert.equal(decisioneDa(always), null, "mai regole permanenti verso il cloud");
});

test("ritmo di lettura: svelto quando qualcosa si muove, piano quando è fermo, sempre più piano se il relay non c'è", () => {
  assert.equal(intervallo({ snap: SNAP }), 1_500);
  assert.equal(intervallo({ snap: { sessioni: [{ status: "idle" }], richieste: [] } }), 4_000);
  assert.ok(intervallo({ errori: 1 }) < intervallo({ errori: 3 }));
  assert.equal(intervallo({ errori: 99 }), 60_000);
});

test("l'indirizzo del relay deve essere https", () => {
  assert.equal(urlValido("https://claude-deck-relay.x.workers.dev"), true);
  assert.equal(urlValido("http://claude-deck-relay.x.workers.dev"), false);
  assert.equal(urlValido("http://127.0.0.1:8787"), true, "wrangler dev, sullo stesso computer");
  assert.equal(urlValido("http://127.0.0.1.evil.example"), false);
  assert.equal(urlValido(""), false);
});
