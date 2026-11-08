import { test } from "node:test";
import assert from "node:assert/strict";
import { Bacheca, LIMITI, urlSessione, riduciInput, risposteValide, decisioneValida } from "../src/bacheca.js";

const S = { id: "cse_01ABCDEFGHJKLMNOP", idRemoto: "cse_01ABCDEFGHJKLMNOP", nome: "thecore-v2", cwd: "/home/user/thecore-v2" };
const DOMANDA = {
  questions: [{ question: "Quale ramo?", header: "Ramo", multiSelect: false, options: [{ label: "staging", description: "x" }, { label: "main" }] }],
};

test("il link della sessione viene dall'id del container, mai da un URL scritto da fuori", () => {
  assert.equal(urlSessione("cse_01Diygy571HAJtqwptnzLTDo"), "https://claude.ai/code/session_01Diygy571HAJtqwptnzLTDo");
  assert.equal(urlSessione("session_01Diygy571HAJtqwptnzLTDo"), "https://claude.ai/code/session_01Diygy571HAJtqwptnzLTDo");
  assert.equal(urlSessione("https://evil.example/x"), null);
  assert.equal(urlSessione("cse_../../x"), null);
  assert.equal(urlSessione(undefined), null);
});

test("una richiesta aperta mette la sessione in attesa, e il deck la vede", () => {
  const b = new Bacheca();
  const { id } = b.apri({ sessione: S, tool: "mcp__Supabase__execute_sql", input: { project_id: "abc", query: "select 1" } }, 1000);
  const d = b.perDeck(1000);
  assert.equal(d.richieste.length, 1);
  assert.equal(d.richieste[0].id, id);
  assert.equal(d.richieste[0].input.query, "select 1");
  assert.equal(d.sessioni[0].status, "waiting");
  assert.equal(d.sessioni[0].waitingFor, "permission prompt");
  assert.equal(d.sessioni[0].url, "https://claude.ai/code/session_01ABCDEFGHJKLMNOP");
});

test("una domanda mette la sessione in attesa di input, non di permesso", () => {
  const b = new Bacheca();
  b.apri({ sessione: S, tool: "AskUserQuestion", input: DOMANDA }, 1000);
  assert.equal(b.perDeck(1000).sessioni[0].waitingFor, "input needed");
});

test("approva: l'hook la ritira una volta sola, poi la sessione riparte", () => {
  const b = new Bacheca();
  const { id } = b.apri({ sessione: S, tool: "Bash", input: { command: "ls" } }, 1000);
  assert.deepEqual(b.ritira(id, 1100), { stato: "in_attesa", scade: 1000 + LIMITI.attesaDefaultS * 1000 });
  assert.deepEqual(b.decidi(id, { tipo: "approva" }, 1200), { ok: true });
  assert.equal(b.perDeck(1200).richieste.length, 0, "decisa: il deck non la mostra più");
  assert.deepEqual(b.ritira(id, 1300), { stato: "decisa", decisione: { tipo: "approva" } });
  assert.deepEqual(b.ritira(id, 1400), { stato: "sconosciuta" });
  assert.equal(b.perDeck(1400).sessioni[0].status, "busy");
});

test("una seconda decisione sulla stessa richiesta è rifiutata", () => {
  const b = new Bacheca();
  const { id } = b.apri({ sessione: S, tool: "Bash", input: {} }, 1000);
  b.decidi(id, { tipo: "rifiuta" }, 1100);
  assert.deepEqual(b.decidi(id, { tipo: "approva" }, 1200), { errore: "GIA_DECISA" });
});

test("niente «always»: dal deck arrivano solo approva, rifiuta, rispondi", () => {
  const b = new Bacheca();
  const { id } = b.apri({ sessione: S, tool: "Bash", input: {} }, 1000);
  assert.deepEqual(b.decidi(id, { tipo: "sempre" }, 1100), { errore: "DECISIONE_NON_VALIDA" });
  assert.deepEqual(b.decidi(id, { tipo: "approva", updatedPermissions: [{ type: "addRules" }] }, 1100), { ok: true });
  // Il campo in più non passa: la decisione consegnata è solo il tipo.
  assert.deepEqual(b.ritira(id, 1200).decisione, { tipo: "approva" });
});

test("una domanda si risponde solo con un'etichetta offerta, per ogni domanda", () => {
  const q = riduciInput("AskUserQuestion", DOMANDA).input.questions;
  assert.deepEqual(risposteValide(q, { "Quale ramo?": "main" }), { "Quale ramo?": "main" });
  assert.equal(risposteValide(q, { "Quale ramo?": "produzione" }), null, "etichetta inventata");
  assert.equal(risposteValide(q, {}), null, "domanda senza risposta");
  const due = [...q, { question: "Sicuro?", header: "", multiSelect: false, options: [{ label: "sì" }, { label: "no" }] }];
  assert.equal(risposteValide(due, { "Quale ramo?": "main" }), null, "manca la seconda");
  assert.deepEqual(risposteValide(due, { "Quale ramo?": "main", "Sicuro?": "sì" }), { "Quale ramo?": "main", "Sicuro?": "sì" });
});

test("una domanda a scelta multipla non si risponde dal deck", () => {
  const q = [{ question: "Quali?", header: "", multiSelect: true, options: [{ label: "a" }, { label: "b" }] }];
  assert.equal(risposteValide(q, { "Quali?": "a" }), null);
});

test("una domanda non si «approva», e un permesso non si «risponde»", () => {
  assert.equal(decisioneValida({ tool: "AskUserQuestion", input: { questions: [] } }, { tipo: "approva" }), null);
  assert.equal(decisioneValida({ tool: "Bash", input: {} }, { tipo: "rispondi", risposte: {} }), null);
  assert.deepEqual(decisioneValida({ tool: "AskUserQuestion", input: {} }, { tipo: "rifiuta" }), { tipo: "rifiuta" });
});

test("un hook che smette di chiedere è morto: la richiesta sparisce senza decisione", () => {
  const b = new Bacheca();
  b.apri({ sessione: S, tool: "Bash", input: {} }, 1000);
  b.manutenzione(1000 + LIMITI.hookSilenzioMs - 1);
  assert.equal(b.perDeck(0).richieste.length, 1);
  b.manutenzione(1000 + LIMITI.hookSilenzioMs + 1);
  assert.equal(b.perDeck(0).richieste.length, 0);
  assert.equal(b.perDeck(0).sessioni[0].status, "busy", "non più in attesa: ha risposto qualcuno su claude.ai");
});

test("un hook che continua a chiedere tiene viva la richiesta fino alla scadenza", () => {
  const b = new Bacheca();
  const { id, scade } = b.apri({ sessione: S, tool: "Bash", input: {}, attesaS: 30 }, 0);
  for (let t = 5_000; t < 30_000; t += 5_000) { b.ritira(id, t); b.manutenzione(t); }
  assert.equal(b.perDeck(0).richieste.length, 1);
  b.ritira(id, scade + 4_000);
  b.manutenzione(scade + 6_000);
  assert.equal(b.perDeck(0).richieste.length, 0);
});

test("rinuncia dell'hook: nessuna decisione consegnata, la sessione resta come era", () => {
  const b = new Bacheca();
  const { id } = b.apri({ sessione: S, tool: "Bash", input: {} }, 1000);
  assert.deepEqual(b.rinuncia(id, 2000), { ok: true });
  assert.deepEqual(b.ritira(id, 2100), { stato: "sconosciuta" });
});

test("un comando tagliato lo dice, così il deck non lo prende per una lettura", () => {
  const lungo = "select 1; " + "x".repeat(LIMITI.testo + 10) + "; drop table t";
  const { input, troncato } = riduciInput("mcp__Supabase__execute_sql", { query: lungo, project_id: "p" });
  assert.equal(troncato, true);
  assert.equal(input.query.length, LIMITI.testo);
  assert.equal(input.project_id, "p");
});

test("una domanda arriva al deck con le sole etichette", () => {
  const { input } = riduciInput("AskUserQuestion", DOMANDA);
  assert.deepEqual(input.questions[0].options, [{ label: "staging" }, { label: "main" }]);
});

test("gli stati: avvio, lavora, fine, chiusa", () => {
  const b = new Bacheca();
  b.evento({ sessione: S, evento: "avvio" }, 1000);
  assert.equal(b.perDeck(0).sessioni[0].status, "idle");
  b.evento({ sessione: S, evento: "lavora" }, 2000);
  assert.equal(b.perDeck(0).sessioni[0].status, "busy");
  b.evento({ sessione: S, evento: "fine" }, 3000);
  const s = b.perDeck(0).sessioni[0];
  assert.equal(s.status, "idle");
  assert.equal(s.statusUpdatedAt, 3000, "il deck mostra «finito» per un minuto");
  b.evento({ sessione: S, evento: "chiusa" }, 4000);
  assert.equal(b.perDeck(0).sessioni.length, 0);
  assert.deepEqual(b.evento({ sessione: S, evento: "boh" }, 5000), { errore: "EVENTO_SCONOSCIUTO" });
});

test("un evento non toglie l'attesa a una sessione con una richiesta aperta", () => {
  const b = new Bacheca();
  b.apri({ sessione: S, tool: "Bash", input: {} }, 1000);
  b.evento({ sessione: S, evento: "lavora" }, 1100);
  assert.equal(b.perDeck(0).sessioni[0].status, "waiting");
});

test("una sessione «al lavoro» senza notizie da un'ora e mezza si mostra ferma, e dopo otto ore sparisce", () => {
  const b = new Bacheca();
  b.evento({ sessione: S, evento: "lavora" }, 0);
  b.manutenzione(LIMITI.lavoroMaxMs + 1);
  assert.equal(b.perDeck(0).sessioni[0].status, "idle");
  b.manutenzione(LIMITI.sessioneMaxMs + 1);
  assert.equal(b.perDeck(0).sessioni.length, 0);
});

test("le sessioni sopravvivono a un riavvio, le richieste no", () => {
  const b = new Bacheca();
  b.evento({ sessione: S, evento: "lavora" }, 1000);
  b.apri({ sessione: S, tool: "Bash", input: {} }, 1100);
  const c = Bacheca.da(JSON.parse(JSON.stringify(b.daSalvare())));
  assert.equal(c.perDeck(0).sessioni.length, 1);
  assert.equal(c.perDeck(0).richieste.length, 0);
});

test("limiti: troppe richieste, troppe sessioni", () => {
  const b = new Bacheca();
  for (let i = 0; i < LIMITI.richieste; i++) assert.ok(b.apri({ sessione: S, tool: "Bash", input: {} }, i).id);
  assert.deepEqual(b.apri({ sessione: S, tool: "Bash", input: {} }, 99), { errore: "TROPPE_RICHIESTE" });
  const c = new Bacheca();
  for (let i = 0; i < LIMITI.sessioni + 3; i++) c.evento({ sessione: { id: `cse_0123456789s${i}` }, evento: "avvio" }, i);
  assert.equal(c.perDeck(0).sessioni.length, LIMITI.sessioni);
  assert.ok(!c.perDeck(0).sessioni.some((s) => s.id === "cse_0123456789s0"), "esce la più vecchia");
});

test("senza sessione o senza strumento non si apre niente", () => {
  const b = new Bacheca();
  assert.deepEqual(b.apri({ sessione: {}, tool: "Bash" }, 0), { errore: "SESSIONE_MANCANTE" });
  assert.deepEqual(b.apri({ sessione: S, tool: "" }, 0), { errore: "TOOL_MANCANTE" });
});
