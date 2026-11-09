// Il tasto TheCore: le decisioni che si sbagliano in silenzio. Una chiave revocata
// che continua a mostrare i numeri di prima; un errore di rete che diventa uno zero;
// un menu del pannello che offre una metrica che il codice non conosce più; una
// risposta di un'altra versione letta come se fosse questa.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  METRICHE, METRICA_DEFAULT, metricaDi, euroBreve, stagioneBreve, variazione, urlPagina, confTheCore,
  leggiTheCore, vistaTheCore, statoTheCore, riassuntoValido, TheCoreErrore,
} from "../src/thecore.js";

// La forma della risposta di `deck_metriche` (TheCore, migration 0156): il Test 6 di
// backend/supabase/tests/deck_metriche.sql nomina le stesse chiavi.
const RIASSUNTO = {
  versione: 1, at: "2026-11-09T10:00:00Z",
  stagione: { id: 2, codice: "2026-2027", nome: "Stagione 2026/2027", precedente: "2025-2026", sfasamentoGiorni: 365 },
  vendite: { fatturato: 123_456.78, fatturatoOggi: 1_234.5, fatturatoAnnoScorso: 110_000, ordiniOggi: 12, ordiniIeri: 9, ordiniAnnoScorsoOggi: 7, ufficializzate: 40,
    ufficializzateMerch: 31, ufficializzateAnnuari: 22, lineeMerch: 300, lineeAnnuari: 280 },
  directory: { raggiunte: 340, raggiunteAnnoScorso: 300, daAssegnare: 12, competitor: 2, richieste: 3 },
  hiring: { daScrutinare: 5, arrivateOggi: 2, candidatiAccettati: 44, risEletti: 150, documentiDaVerificare: 4, elettiSenzaDocumento: 1 },
  operativo: { jobFalliti: 0, jobInRitardo: 0, plaoFirmate: 3, plaoDaFirmare: 7, fornitoriProblema: 0 },
  personale: { notificheNonLette: 6, menzioniNonLette: 2 },
};

// Le pagine di TheCore (frontend/src/app/routes.tsx e lib/nav/schede.ts).
const PAGINE = new Set([
  "/dashboard", "/directory", "/metriche", "/contatti-senza-scuola", "/ordini-fornitori", "/l/merch", "/l/annuari",
  "/economics/pl", "/economics/dashboard-ordini", "/economics/paghe",
  "/ris/lavora", "/ris/candidature", "/ris/metriche",
]);

test("gli importi e le stagioni, come stanno su un tasto", () => {
  assert.equal(euroBreve(980), "€ 980");
  assert.equal(euroBreve(9_876.4), "€ 9.876");
  assert.equal(euroBreve(12_345), "€ 12,3k");
  assert.equal(euroBreve(123_456), "€ 123k");
  assert.equal(euroBreve(1_234_567), "€ 1,23M");
  assert.equal(euroBreve(null), "--");
  assert.equal(stagioneBreve("2025-2026"), "25/26");
  assert.equal(variazione(112, 100), "▲ 12%");
  assert.equal(variazione(97, 100), "▼ 3%");
  assert.equal(variazione(100, 100), "= 0%");
  assert.equal(variazione(5, 0), null, "contro zero non è un confronto");
  assert.equal(variazione(5, null), null);
});

test("ogni metrica legge il riassunto e apre una pagina che esiste", () => {
  for (const [id, m] of Object.entries(METRICHE)) {
    const v = m.vista(RIASSUNTO);
    assert.equal(typeof v.valore, "string", id);
    assert.equal(typeof v.sub, "string", id);
    assert.ok(!/undefined|NaN|null/.test(v.valore + v.sub), `${id}: ${v.valore} / ${v.sub}`);
    assert.ok(m.pagina === null || PAGINE.has(m.pagina), `${id}: pagina sconosciuta ${m.pagina}`);
  }
  assert.equal(METRICHE.fatturato.vista(RIASSUNTO).sub, "▲ 12% vs 25/26");
  assert.equal(METRICHE.da_assegnare.vista(RIASSUNTO).tono, "attenzione");
  assert.equal(METRICHE.job.vista(RIASSUNTO).valore, "ok");
  assert.equal(METRICHE.job.vista({ ...RIASSUNTO, operativo: { ...RIASSUNTO.operativo, jobFalliti: 2, jobInRitardo: 1 } }).tono, "guasto");
  assert.deepEqual(METRICHE.notifiche.vista(RIASSUNTO), { valore: "6", sub: "2 menzioni", tono: "attenzione" });
  assert.deepEqual(METRICHE.notifiche.vista({ ...RIASSUNTO, personale: { notificheNonLette: 0, menzioniNonLette: 0 } }),
    { valore: "0", sub: "non lette", tono: null });
  // Un TheCore senza la 0157 non ha la parte personale: «--», non uno zero.
  const senzaPersonale = { ...RIASSUNTO };
  delete senzaPersonale.personale;
  assert.equal(METRICHE.notifiche.vista(senzaPersonale).valore, "--");
  assert.deepEqual(METRICHE.ufficializzate_merch.vista(RIASSUNTO), { valore: "31", sub: "firmati su 300" });
  assert.deepEqual(METRICHE.ufficializzate_annuari.vista(RIASSUNTO), { valore: "22", sub: "firmati su 280" });
  assert.deepEqual(METRICHE.candidati_accettati.vista(RIASSUNTO), { valore: "44", sub: "non ancora eletti" });
  // senza anno scorso il confronto non si inventa
  const senza = { ...RIASSUNTO, stagione: { ...RIASSUNTO.stagione, precedente: null }, vendite: { ...RIASSUNTO.vendite, fatturatoAnnoScorso: null } };
  assert.equal(METRICHE.fatturato.vista(senza).sub, "oggi € 1.235", "1.234,5 si arrotonda all'euro");
  assert.equal(metricaDi({ metrica: "inesistente" }), METRICA_DEFAULT);
  assert.equal(metricaDi({ metrica: "__proto__" }), METRICA_DEFAULT);
  // Un tasto configurato «Avvisi» prima del 09/11/2026 diventa «Notifiche» da solo.
  assert.equal(metricaDi({ metrica: "avvisi" }), "notifiche");
});

test("il menu del pannello è lo stesso elenco del codice, nello stesso ordine", () => {
  const html = fs.readFileSync(new URL("../dev.tapparello.agent-vitals.sdPlugin/pi/pi.html", import.meta.url), "utf8");
  const blocco = html.slice(html.indexOf("const METRICHE_PI = ["), html.indexOf("];", html.indexOf("const METRICHE_PI = [")));
  const pi = [...blocco.matchAll(/\["([a-z_]+)", "([^"]+)", "([^"]+)"\]/g)].map((m) => [m[1], m[2], m[3]]);
  assert.deepEqual(pi, Object.entries(METRICHE).map(([id, m]) => [id, m.gruppo, m.nome]));
});

test("la configurazione e gli indirizzi", () => {
  assert.equal(confTheCore({}).completa, false);
  assert.equal(confTheCore({ thecoreUrl: "http://x", thecoreKey: "k" }).completa, false, "solo https");
  assert.equal(confTheCore({ thecoreUrl: " https://x.supabase.co/functions/v1/deck-metriche/ ", thecoreKey: " k " }).url, "https://x.supabase.co/functions/v1/deck-metriche");
  assert.equal(urlPagina("https://thecore.example.it/", "/ris/lavora"), "https://thecore.example.it/ris/lavora");
  assert.equal(urlPagina("", "/ris/lavora"), null);
  assert.equal(urlPagina("https://thecore.example.it", null), null);
});

function fetchFinto(risposta) {
  const chiamate = [];
  const fn = async (url, opz) => {
    chiamate.push({ url, opz });
    if (risposta instanceof Error) throw risposta;
    return risposta;
  };
  return { fn, chiamate };
}
const json = (corpo, status = 200) => ({ status, ok: status >= 200 && status < 300, json: async () => corpo });

test("la lettura: la chiave in X-Api-Key, ogni guasto col suo nome", async () => {
  const conf = { url: "https://x.supabase.co/functions/v1/deck-metriche", chiave: "szd_abc" };
  const ok = fetchFinto(json(RIASSUNTO));
  assert.deepEqual(await leggiTheCore(conf, { fetchFn: ok.fn }), RIASSUNTO);
  assert.equal(ok.chiamate[0].opz.headers["x-api-key"], "szd_abc");
  const tipo = async (r) => { try { await leggiTheCore(conf, { fetchFn: fetchFinto(r).fn }); return "nessun errore"; } catch (e) { assert.ok(e instanceof TheCoreErrore); return e.tipo; } };
  assert.equal(await tipo(json({ error: "x" }, 401)), "chiave");
  assert.equal(await tipo(json({ error: "x" }, 500)), "server");
  assert.equal(await tipo(new Error("ECONNRESET")), "rete");
  assert.equal(await tipo({ status: 200, ok: true, json: async () => { throw new SyntaxError("x"); } }), "formato");
  assert.equal(await tipo(json({ ...RIASSUNTO, versione: 2 })), "formato");
  assert.equal(await tipo(json({ versione: 1, at: "x", stagione: null })), "stagione");
  assert.ok(riassuntoValido(RIASSUNTO));
});

test("che cosa dice il tasto, anche quando qualcosa non va", () => {
  const conf = { completa: true };
  assert.equal(vistaTheCore({ settings: {}, tc: null, conf: { completa: false } }).sub, "imposta TheCore");
  assert.equal(vistaTheCore({ settings: {}, tc: null, conf }).valore, "…");
  // Una chiave rifiutata non mostra numeri, nemmeno quelli di prima.
  const rifiutata = vistaTheCore({ settings: { metrica: "fatturato" }, tc: { dati: RIASSUNTO, at: 0, err: "chiave" }, conf });
  assert.deepEqual([rifiutata.valore, rifiutata.sub], ["!", "chiave rifiutata"]);
  // Un guasto di rete tiene il numero di prima, con l'ora.
  const okAt = new Date(2026, 10, 9, 10, 30).getTime();
  const offline = vistaTheCore({ settings: { metrica: "fatturato" }, tc: { dati: RIASSUNTO, at: 0, okAt, err: "rete" }, conf });
  assert.deepEqual([offline.valore, offline.sub, offline.tono], ["€ 123k", "offline · 10:30", null]);
  assert.equal(vistaTheCore({ settings: { metrica: "fatturato" }, tc: { dati: null, at: 0, err: "rete" }, conf }).valore, "--");
  const ok = vistaTheCore({ settings: { metrica: "ris_da_scrutinare" }, tc: { dati: RIASSUNTO, at: 0, err: null }, conf });
  assert.deepEqual([ok.valore, ok.sub, ok.tono, ok.pagina], ["5", "da scrutinare · +2", "attenzione", "/ris/lavora"]);
  assert.match(statoTheCore({ tc: { dati: RIASSUNTO, at: 0, err: null }, conf }), /^Collegato · stagione Stagione 2026\/2027/);
  assert.match(statoTheCore({ tc: { dati: null, at: 0, err: "chiave" }, conf }), /rifiutato la chiave/);
});

test("sulla terza pagina un tasto TheCore può fare da riga in basso mentre Claude chiede", async () => {
  const { tipoDaMostrare, slotDi } = await import("../src/view.js");
  const coda = [{ id: 1, toolName: "Bash", toolInput: { command: "ls" }, receivedAt: 0 }];
  assert.equal(slotDi("thecore", { slot: "approve-allow" }), "approve-allow");
  assert.equal(tipoDaMostrare("thecore", { slot: "approve-allow", metrica: "fatturato" }, coda), "approve-allow");
  assert.equal(tipoDaMostrare("thecore", { slot: "approve-allow" }, []), "thecore", "senza richieste torna il numero");
  // La posta no: premuta apre Gmail, e un tocco per leggere la posta non deve diventare un'approvazione.
  assert.equal(slotDi("posta", { slot: "approve-allow" }), null);
});
