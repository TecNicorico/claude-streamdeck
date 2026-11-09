import test from "node:test";
import assert from "node:assert/strict";
import { domandaRispondibile, facce, premi, statoIniziale, intestazione, SLOT, chiaveFaccia } from "../src/domande.js";

const opz = (...l) => l.map((label) => ({ label, description: "" }));
const domanda = (questions) => ({ id: 1, toolName: "AskUserQuestion", toolInput: { questions } });
const q = (question, options, extra = {}) => ({ question, header: "Prova", multiSelect: false, options, ...extra });

test("si risponde dal deck alle domande con 2-4 opzioni, singole o multiple", () => {
  assert.equal(domandaRispondibile(domanda([q("A?", opz("a", "b"))])), true);
  assert.equal(domandaRispondibile(domanda([q("A?", opz("a", "b", "c", "d"))])), true);
  assert.equal(domandaRispondibile(domanda([q("A?", opz("a"))])), false);
  assert.equal(domandaRispondibile(domanda([q("A?", opz("a", "b", "c", "d", "e"))])), false);
  assert.equal(domandaRispondibile(domanda([q("A?", opz("a", "b"), { multiSelect: true })])), true);
  assert.equal(domandaRispondibile({ toolName: "AskUserQuestion", toolInput: {} }), false);
  assert.equal(domandaRispondibile({ toolName: "Bash", toolInput: { questions: [q("A?", opz("a", "b"))] } }), false);
});

test("2 opzioni: ai lati, e al centro la domanda", () => {
  const f = facce(domanda([q("A?", opz("sì", "no"))]));
  assert.deepEqual(f.map((x) => x.tipo), ["opzione", "domanda", "opzione"]);
  assert.deepEqual([f[0].label, f[2].label], ["sì", "no"]);
});

test("3 opzioni: una per tasto, nell'ordine", () => {
  assert.deepEqual(facce(domanda([q("A?", opz("a", "b", "c"))])).map((x) => x.label), ["a", "b", "c"]);
});

test("4 opzioni: due pagine, il centro le scorre", () => {
  const r = domanda([q("A?", opz("a", "b", "c", "d"))]);
  let st = statoIniziale();
  assert.deepEqual(facce(r, st).map((x) => x.label ?? x.sub), ["a", "opzioni 3-4", "b"]);
  st = premi(r, st, SLOT["approve-always"]).stato;
  assert.deepEqual(facce(r, st).map((x) => x.label ?? x.sub), ["c", "opzioni 1-2", "d"]);
  const fine = premi(r, st, SLOT["approve-allow"]);
  assert.deepEqual(fine.risposte, { "A?": "d" });
});

test("più domande: si rispondono in fila, e le risposte partono insieme alla fine", () => {
  const r = domanda([q("Prima?", opz("x", "y")), q("Seconda?", opz("1", "2", "3"))]);
  let e = premi(r, statoIniziale(), SLOT["approve-deny"]);
  assert.equal(e.risposte, null);
  assert.equal(e.stato.passo, 1);
  assert.equal(intestazione(r, e.stato), "PROVA 2/2");
  e = premi(r, e.stato, SLOT["approve-always"]);
  assert.deepEqual(e.risposte, { "Prima?": "x", "Seconda?": "2" });
});

test("il tasto della domanda non risponde niente", () => {
  const r = domanda([q("A?", opz("sì", "no"))]);
  const e = premi(r, statoIniziale(), SLOT["approve-always"]);
  assert.equal(e.risposte, null);
  assert.equal(e.nulla, true);
});

// ---------- scelta multipla ----------
const multi = (n) => domanda([q("Quali linee?", opz("Annuari", "Merch", "Foto", "Gite").slice(0, n), { multiSelect: true })]);
const S0 = SLOT["approve-deny"], S1 = SLOT["approve-always"], S2 = SLOT["approve-allow"];

test("scelta multipla a 2 opzioni: si spunta e si toglie, e si conferma al centro", () => {
  const r = multi(2);
  let st = statoIniziale();
  assert.deepEqual(facce(r, st).map((f) => f.tipo), ["scelta", "conferma", "scelta"]);
  assert.equal(premi(r, st, S1).nulla, true, "niente spuntato: CONFERMA non risponde");
  st = premi(r, st, S0).stato;
  st = premi(r, st, S2).stato;
  st = premi(r, st, S0).stato; // tolta di nuovo
  assert.deepEqual(facce(r, st).map((f) => f.scelta ?? f.n), [false, 1, true]);
  assert.deepEqual(premi(r, st, S1).risposte, { "Quali linee?": ["Merch"] });
});

test("scelta multipla a 4 opzioni: due pagine di opzioni e una di conferma, risposte in ordine", () => {
  const r = multi(4);
  let st = statoIniziale();
  st = premi(r, st, S2).stato;                // spunta Merch
  st = premi(r, st, S1).stato;                // altre
  assert.deepEqual(facce(r, st).map((f) => f.label ?? f.testo), ["Foto", "avanti", "Gite"]);
  st = premi(r, st, S0).stato;                // spunta Foto
  st = premi(r, st, S1).stato;                // avanti
  assert.deepEqual(facce(r, st).map((f) => f.tipo), ["pagina", "conferma", "vuoto"]);
  assert.equal(premi(r, st, S2).nulla, true, "il tasto vuoto non fa niente");
  const fine = premi(r, st, S1);
  assert.deepEqual(fine.risposte, { "Quali linee?": ["Merch", "Foto"] });
});

test("scelta multipla a 3 opzioni: la seconda pagina ha un tasto vuoto, e «indietro» torna all'inizio", () => {
  const r = multi(3);
  let st = premi(r, statoIniziale(), S1).stato;
  assert.deepEqual(facce(r, st).map((f) => f.tipo), ["scelta", "pagina", "vuoto"]);
  st = premi(r, st, S1).stato;
  st = premi(r, st, S0).stato; // indietro
  assert.equal(st.pagina, 0);
});

test("l'impronta di un tasto cambia con la spunta, la pagina e il conteggio", () => {
  const r = multi(2);
  const st0 = statoIniziale();
  const st1 = premi(r, st0, S0).stato;
  assert.notEqual(chiaveFaccia(st0, facce(r, st0)[S0]), chiaveFaccia(st1, facce(r, st1)[S0]));
  assert.notEqual(chiaveFaccia(st0, facce(r, st0)[S1]), chiaveFaccia(st1, facce(r, st1)[S1]));
});
