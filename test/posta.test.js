// Il tasto Posta: le decisioni che si sbagliano in silenzio. Una password letta dal
// tasto invece che dalle impostazioni globali finirebbe in un profilo esportato; un
// tasto che riprova una password rifiutata ogni due minuti fa bloccare l'account da
// Google; un numero vecchio senza l'ora sembra di adesso.
import test from "node:test";
import assert from "node:assert/strict";
import {
  urlGmail, passwordDi, caselleDaLeggere, prossimaLettura, vistaPosta, statoPosta, normEmail, numeroBreve,
  INTERVALLO_POSTA_MS, RITARDO_ERRORE_MS,
} from "../src/posta.js";

const GS = { posta: { "enrico@scuolazoo.com": { password: "abcdabcdabcdabcd" } } };

test("Gmail si apre sull'account per indirizzo, non per posizione", () => {
  assert.equal(urlGmail(" Enrico@ScuolaZoo.com "), "https://mail.google.com/mail/u/?authuser=enrico%40scuolazoo.com");
  assert.equal(urlGmail("non-un-indirizzo"), "https://mail.google.com/mail/");
});

test("la password sta nelle impostazioni globali, per indirizzo, e mai nel tasto", () => {
  assert.equal(passwordDi(GS, "ENRICO@scuolazoo.com"), "abcdabcdabcdabcd");
  assert.equal(passwordDi(GS, "altro@gmail.com"), "");
  const views = [
    { kind: "posta", settings: { email: "enrico@scuolazoo.com", password: "NEL-TASTO" } },
    { kind: "posta", settings: { email: "Enrico@ScuolaZoo.com" } },                // stessa casella e modo: una lettura
    { kind: "posta", settings: { email: "enrico@scuolazoo.com", modo: "tutta" } }, // altro modo: un'altra lettura
    { kind: "posta", settings: { email: "senza@password.it" } },                 // niente password: niente lettura
    { kind: "today", settings: { email: "enrico@scuolazoo.com" } },
  ];
  const c = caselleDaLeggere(views, GS);
  assert.deepEqual(c.map((x) => x.chiave), ["enrico@scuolazoo.com|principale", "enrico@scuolazoo.com|tutta"]);
  assert.ok(c.every((x) => x.pass === "abcdabcdabcdabcd"), "la password del tasto non si usa mai");
});

test("una password rifiutata non si riprova finché non cambia", () => {
  const now = 1_000_000;
  assert.equal(prossimaLettura(undefined, now, "imp"), now);
  assert.equal(prossimaLettura({ at: now, err: null, impronta: "imp" }, now, "imp"), now + INTERVALLO_POSTA_MS);
  assert.equal(prossimaLettura({ at: now, err: "rete", impronta: "imp" }, now, "imp"), now + RITARDO_ERRORE_MS);
  assert.equal(prossimaLettura({ at: now, err: "credenziali", impronta: "imp" }, now + 86_400_000, "imp"), Infinity);
  assert.equal(prossimaLettura({ at: now, err: "credenziali", impronta: "imp" }, now + 5, "nuova"), now + 5);
});

test("che cosa dice il tasto", () => {
  const s = { email: "enrico@scuolazoo.com" };
  assert.deepEqual(vistaPosta({ settings: {}, rec: null, haPassword: false }), { titolo: "posta", valore: "—", sub: "imposta l'indirizzo", tono: null, email: "" });
  assert.equal(vistaPosta({ settings: s, rec: null, haPassword: false }).sub, "manca la password");
  assert.equal(vistaPosta({ settings: s, rec: null, haPassword: false }).tono, "attenzione");
  assert.equal(vistaPosta({ settings: s, rec: null, haPassword: true }).valore, "…");
  assert.equal(vistaPosta({ settings: s, rec: { n: 4, at: 0 }, haPassword: true }).valore, "4");
  assert.equal(vistaPosta({ settings: s, rec: { n: 4, at: 0 }, haPassword: true }).titolo, "enrico");
  assert.equal(vistaPosta({ settings: { ...s, label: "Lavoro" }, rec: { n: 0, at: 0 }, haPassword: true }).sub, "tutto letto");
  assert.equal(vistaPosta({ settings: { ...s, modo: "tutta" }, rec: { n: 2, at: 0 }, haPassword: true }).sub, "in arrivo");
  const rifiutata = vistaPosta({ settings: s, rec: { n: null, at: 0, err: "credenziali" }, haPassword: true });
  assert.deepEqual([rifiutata.valore, rifiutata.sub, rifiutata.tono], ["!", "password rifiutata", "attenzione"]);
  // Un numero vecchio resta, ma dice di che ora è.
  const vecchio = vistaPosta({ settings: s, rec: { n: 3, at: 0, okAt: new Date(2026, 10, 9, 9, 5).getTime(), err: "rete" }, haPassword: true });
  assert.deepEqual([vecchio.valore, vecchio.sub], ["3", "offline · 09:05"]);
  assert.equal(vistaPosta({ settings: s, rec: { n: null, at: 0, err: "timeout" }, haPassword: true }).valore, "--");
  assert.equal(numeroBreve(1500), "999+");
  assert.equal(normEmail("a@b"), "");
});

test("la riga del pannello dice cosa fare", () => {
  const s = { email: "enrico@scuolazoo.com" };
  assert.match(statoPosta({ settings: s, rec: { err: "credenziali", at: 0 }, haPassword: true }), /non riprova da solo/);
  assert.match(statoPosta({ settings: s, rec: { err: "rifiutato", at: 0 }, haPassword: true }), /amministratore/);
  assert.match(statoPosta({ settings: s, rec: { n: 3, at: 0 }, haPassword: true }), /^Collegato · 3 conversazioni/);
});
