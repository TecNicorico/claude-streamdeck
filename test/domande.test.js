import test from "node:test";
import assert from "node:assert/strict";
import { domandaRispondibile, facce, premi, statoIniziale, intestazione, SLOT } from "../src/domande.js";

const opz = (...l) => l.map((label) => ({ label, description: "" }));
const domanda = (questions) => ({ id: 1, toolName: "AskUserQuestion", toolInput: { questions } });
const q = (question, options, extra = {}) => ({ question, header: "Prova", multiSelect: false, options, ...extra });

test("si risponde dal deck solo a scelta singola con 2-4 opzioni", () => {
  assert.equal(domandaRispondibile(domanda([q("A?", opz("a", "b"))])), true);
  assert.equal(domandaRispondibile(domanda([q("A?", opz("a", "b", "c", "d"))])), true);
  assert.equal(domandaRispondibile(domanda([q("A?", opz("a"))])), false);
  assert.equal(domandaRispondibile(domanda([q("A?", opz("a", "b", "c", "d", "e"))])), false);
  assert.equal(domandaRispondibile(domanda([q("A?", opz("a", "b"), { multiSelect: true })])), false);
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
  assert.deepEqual(facce(r, st).map((x) => x.label ?? x.testo), ["a", "altre ▸", "b"]);
  st = premi(r, st, SLOT["approve-always"]).stato;
  assert.deepEqual(facce(r, st).map((x) => x.label ?? x.testo), ["c", "◂ altre", "d"]);
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
