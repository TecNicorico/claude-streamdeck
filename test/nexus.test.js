// Il tasto Nexus: le decisioni che si sbagliano in silenzio. Una chiave revocata che
// continua a mostrare i conti; un errore di rete che diventa un saldo a zero; un
// «non si sa» (manca il prezzo, non c'è un tratto fra due pieni) letto come zero; un
// conto rinominato che mostra il saldo di un altro; un menu del pannello che offre una
// metrica che il codice non conosce.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  METRICHE_NEXUS, METRICA_NEXUS_DEFAULT, metricaNexusDi, confNexus, paginaNexus, leggiNexus, vistaNexus, statoNexus, nomiNexus,
  riassuntoNexusValido, NexusErrore, importoBreve, quoteDette, resaDetta, giornoBreve, quandoBreve, scelto, decimali,
} from "../src/nexus.js";

// La forma della risposta di `deck-metriche` di Nexus (migration 0011): le stesse
// chiavi di `RiassuntoDeck` (frontend/src/lib/deck/riassunto.ts) e di docs/STREAMDECK.md
// in quel repository, coi numeri del suo banco di prova (backend/scripts/deck.test.mjs).
const RIASSUNTO = {
  versione: 1, at: "2026-11-11T18:00:00.000Z",
  finanze: { patrimonio: -4104.8, liquidita: 3722.2, investimenti: 1173, debiti: -9000, usciteMese: 67.8, entrateMese: 1650, nettoMese: 1582.2, investitoMese: 550,
    usciteMeseScorso: 300, entrateMeseScorso: 1600, usciteOggi: 25.3, daClassificare: 1 },
  investimenti: { valore: 1173, versato: 1100, guadagno: 73, resa: 6.6, quote: 6.9, stimate: 1, prezzo: 170, prezzoDel: "2026-11-10" },
  conti: [
    { nome: "Hype", tipo: "conto", valuta: "EUR", saldo: 3722.2 }, { nome: "PAC", tipo: "investimento", valuta: "EUR", saldo: 1100 },
    { nome: "Prestito", tipo: "prestito", valuta: "EUR", saldo: -9000 }, { nome: "Dollari", tipo: "conto", valuta: "USD", saldo: 95 },
  ],
  banche: { collegate: 0, daGuardare: 0, senzaDescrizione: 0, ultimaLettura: null },
  veicoli: [{ nome: "Fiat Punto", km: 187900, kmMese: 500, consumo: 6.5, spesaMese: 60, scadenza: { titolo: "Revisione", giorni: 14, km: null, stato: "vicina" } }],
  oggi: { cose: 2, errori: 0, attenzioni: 1 },
};
const con = (pezzi) => ({ ...RIASSUNTO, ...Object.fromEntries(Object.entries(pezzi).map(([k, v]) => [k, Array.isArray(v) ? v : { ...RIASSUNTO[k], ...v }])) });
const vista = (id, d = RIASSUNTO, s = {}) => METRICHE_NEXUS[id].vista(d, s);

// Le pagine di Nexus (frontend/src/app/rotte.tsx; le schede di Finanze sono in pages/Finanze.tsx).
const PAGINE = new Set(["/", "/conti", "/finanze", "/finanze?scheda=flussi", "/finanze?scheda=investimenti", "/finanze?filtro=senza", "/veicoli", "/banche"]);

test("i numeri, come stanno su un tasto", () => {
  assert.equal(importoBreve(3722.2, "EUR"), "€ 3.722");
  assert.equal(importoBreve(95, "USD"), "USD 95");
  assert.equal(importoBreve(-9000, "EUR"), "€ -9.000");
  assert.equal(importoBreve(null, "USD"), "--");
  assert.equal(quoteDette(35.024748), "35,025");
  assert.equal(quoteDette(6.9), "6,9");
  assert.equal(quoteDette(12), "12");
  assert.equal(quoteDette(0), "0");
  assert.equal(quoteDette(null), "--");
  assert.equal(resaDetta(6.6), "▲ 6,6%");
  assert.equal(resaDetta(-2), "▼ 2%");
  assert.equal(resaDetta(0), "= 0%");
  assert.equal(resaDetta(null), null);
  assert.equal(decimali(6.5, 1), "6,5");
  assert.equal(giornoBreve("2026-11-10"), "10/11");
  assert.equal(giornoBreve(null), "");
  const adesso = new Date(2026, 10, 11, 19, 0);
  assert.equal(quandoBreve(new Date(2026, 10, 11, 8, 5).toISOString(), adesso), "08:05");
  assert.equal(quandoBreve(new Date(2026, 10, 9, 8, 5).toISOString(), adesso), "09/11");
  assert.equal(quandoBreve("non una data", adesso), "");
});

test("ogni metrica legge il riassunto e apre una pagina che esiste", () => {
  for (const [id, m] of Object.entries(METRICHE_NEXUS)) {
    const v = m.vista(RIASSUNTO, {});
    assert.equal(typeof v.valore, "string", id);
    assert.equal(typeof v.sub, "string", id);
    assert.ok(!/undefined|NaN|null/.test(v.valore + v.sub + (v.titolo ?? "")), `${id}: ${v.valore} / ${v.sub}`);
    assert.ok(PAGINE.has(m.pagina), `${id}: pagina sconosciuta ${m.pagina}`);
    assert.ok(["Finanze", "Investimenti", "Veicoli", "Oggi"].includes(m.gruppo), id);
  }
  assert.equal(metricaNexusDi({ metrica: "inesistente" }), METRICA_NEXUS_DEFAULT);
  assert.equal(metricaNexusDi({ metrica: "__proto__" }), METRICA_NEXUS_DEFAULT);
  assert.equal(metricaNexusDi({ metrica: "km" }), "km");
  assert.equal(metricaNexusDi(undefined), "patrimonio");
});

test("le finanze: patrimonio, liquidità, il mese, oggi, da classificare", () => {
  assert.deepEqual(vista("patrimonio"), { valore: "€ -4.105", sub: "liquidi € 3.722" });
  assert.deepEqual(vista("liquidita"), { valore: "€ 3.722", sub: "oggi -€ 25" });
  assert.deepEqual(vista("liquidita", con({ finanze: { usciteOggi: 0 } })), { valore: "€ 3.722", sub: "sui conti" });
  assert.deepEqual(vista("uscite_mese"), { valore: "€ 68", sub: "oggi € 25" });
  assert.deepEqual(vista("uscite_mese", con({ finanze: { usciteOggi: 0 } })), { valore: "€ 68", sub: "scorso € 300" });
  assert.deepEqual(vista("entrate_mese"), { valore: "€ 1.650", sub: "scorso € 1.600" });
  assert.deepEqual(vista("netto_mese"), { valore: "€ 1.582", sub: "investiti € 550" });
  assert.deepEqual(vista("netto_mese", con({ finanze: { nettoMese: -120, investitoMese: 0 } })), { valore: "€ -120", sub: "entrate − uscite" });
  assert.deepEqual(vista("uscite_oggi"), { valore: "€ 25", sub: "nel mese € 68" });
  assert.deepEqual(vista("da_classificare"), { valore: "1", sub: "da classificare", tono: "attenzione" });
  assert.equal(vista("da_classificare", con({ finanze: { daClassificare: 0 } })).tono, null);
});

test("il saldo di un conto: quello scelto per nome, nella sua valuta; un nome che non c'è più non ripiega su un altro", () => {
  assert.deepEqual(vista("saldo_conto"), { titolo: "Hype", valore: "€ 3.722", sub: "conto" }, "senza un nome, il primo");
  assert.deepEqual(vista("saldo_conto", RIASSUNTO, { conto: " dollari " }), { titolo: "Dollari", valore: "USD 95", sub: "conto" });
  assert.deepEqual(vista("saldo_conto", RIASSUNTO, { conto: "PAC" }), { titolo: "PAC", valore: "€ 1.100", sub: "versato" });
  // Rinominato o archiviato in Nexus: il tasto lo dice, non mostra il saldo del primo conto.
  assert.deepEqual(vista("saldo_conto", RIASSUNTO, { conto: "Revolut" }), { valore: "--", sub: "«Revolut» non c'è" });
  assert.deepEqual(vista("saldo_conto", con({ conti: [] })), { valore: "--", sub: "nessun conto" });
  assert.equal(scelto([{ nome: "A" }, { nome: "B" }], "b").nome, "B");
  assert.equal(scelto([{ nome: "A" }], "c"), null);
  assert.equal(scelto(undefined, ""), null);
});

test("gli investimenti: senza un prezzo è «non si sa», non un guadagno a zero", () => {
  assert.deepEqual(vista("investimenti"), { valore: "€ 1.173", sub: "▲ 6,6% · € 73" });
  assert.deepEqual(vista("guadagno"), { valore: "€ 73", sub: "▲ 6,6% sul versato" });
  const senza = con({ investimenti: { valore: 1100, guadagno: null, resa: null, prezzo: null, prezzoDel: null, stimate: 0 } });
  assert.deepEqual(vista("investimenti", senza), { valore: "€ 1.100", sub: "al versato" });
  assert.deepEqual(vista("guadagno", senza), { valore: "--", sub: "manca il prezzo" });
  assert.deepEqual(vista("prezzo", senza), { valore: "--", sub: "non c'è un prezzo solo" });
  assert.deepEqual(vista("quote", senza), { valore: "6,9", sub: "possedute" });
  assert.deepEqual(vista("guadagno", con({ investimenti: { guadagno: -40, resa: -3.6 } })), { valore: "€ -40", sub: "▼ 3,6% sul versato" });
  assert.deepEqual(vista("versato"), { valore: "€ 1.100", sub: "€ 550 nel mese" });
  assert.deepEqual(vista("versato", con({ finanze: { investitoMese: 0 } })), { valore: "€ 1.100", sub: "in tutto" });
  // Una quota stimata si dice: l'estratto conto la rende esatta.
  assert.deepEqual(vista("quote"), { valore: "6,9", sub: "1 stimata", tono: "attenzione" });
  assert.deepEqual(vista("quote", con({ investimenti: { stimate: 0 } })), { valore: "6,9", sub: "a € 170,00" });
  assert.deepEqual(vista("prezzo"), { valore: "€ 170,00", sub: "chiusura 10/11" });
});

test("i veicoli: chilometri, consumo, spesa, la scadenza più urgente", () => {
  assert.deepEqual(vista("km"), { titolo: "Fiat Punto", valore: "187.900", sub: "+500 km nel mese" });
  assert.deepEqual(vista("consumo"), { valore: "6,5", sub: "l/100 km" });
  assert.deepEqual(vista("spesa_veicolo"), { valore: "€ 60", sub: "Fiat Punto · nel mese" });
  assert.deepEqual(vista("scadenza"), { valore: "14 g", sub: "Revisione", tono: "attenzione" });
  const punto = (v) => con({ veicoli: [{ ...RIASSUNTO.veicoli[0], ...v }] });
  assert.deepEqual(vista("km", punto({ kmMese: 0 })), { titolo: "Fiat Punto", valore: "187.900", sub: "km" });
  // Senza un tratto misurabile il consumo non è zero.
  assert.deepEqual(vista("consumo", punto({ consumo: null })), { valore: "--", sub: "servono due pieni" });
  assert.deepEqual(vista("scadenza", punto({ scadenza: null })), { valore: "ok", sub: "nessuna scadenza" });
  const scad = (x) => vista("scadenza", punto({ scadenza: { titolo: "Bollo", giorni: null, km: null, stato: "futura", ...x } }));
  assert.deepEqual(scad({ giorni: -3, stato: "scaduta" }), { valore: "scaduta", sub: "Bollo", tono: "guasto" });
  assert.deepEqual(scad({ giorni: 0, stato: "vicina" }), { valore: "oggi", sub: "Bollo", tono: "attenzione" });
  assert.deepEqual(scad({ giorni: 120 }), { valore: "120 g", sub: "Bollo", tono: null });
  assert.deepEqual(scad({ km: 2580 }), { valore: "2.580 km", sub: "Bollo", tono: null });
  assert.deepEqual(scad({ km: -40, stato: "scaduta" }), { valore: "superata", sub: "Bollo", tono: "guasto" });
  // Il veicolo per nome; senza veicoli, o con un nome che non c'è, lo dice.
  const due = con({ veicoli: [RIASSUNTO.veicoli[0], { nome: "Vespa", km: 21000, kmMese: 0, consumo: null, spesaMese: 0, scadenza: null }] });
  assert.equal(vista("km", due, { veicolo: "vespa" }).valore, "21.000");
  assert.deepEqual(vista("km", due, { veicolo: "Panda" }), { valore: "--", sub: "«Panda» non c'è" });
  for (const id of ["km", "consumo", "spesa_veicolo", "scadenza"]) assert.deepEqual(vista(id, con({ veicoli: [] })), { valore: "--", sub: "nessun veicolo" }, id);
});

test("oggi e le banche: «ok» quando non c'è niente, il numero e il colore quando c'è", () => {
  assert.deepEqual(vista("oggi"), { valore: "2", sub: "da guardare", tono: "attenzione" });
  assert.deepEqual(vista("oggi", con({ oggi: { cose: 3, errori: 1 } })), { valore: "3", sub: "1 errore", tono: "guasto" });
  assert.deepEqual(vista("oggi", con({ oggi: { cose: 0, errori: 0, attenzioni: 0 } })), { valore: "ok", sub: "niente da guardare" });
  assert.deepEqual(vista("banche"), { valore: "--", sub: "nessuna collegata" });
  assert.deepEqual(vista("banche", con({ banche: { collegate: 3, daGuardare: 2 } })), { valore: "2", sub: "da guardare", tono: "attenzione" });
  assert.deepEqual(vista("banche", con({ banche: { collegate: 3 } })), { valore: "ok", sub: "3 collegate" });
  assert.match(vista("banche", con({ banche: { collegate: 1, ultimaLettura: new Date().toISOString() } })).sub, /^lette \d\d:\d\d$/);
  assert.deepEqual(vista("senza_descrizione"), { valore: "0", sub: "senza descrizione", tono: null });
  assert.equal(vista("senza_descrizione", con({ banche: { senzaDescrizione: 4 } })).tono, "attenzione");
});

test("il menu del pannello è lo stesso elenco del codice, nello stesso ordine", () => {
  const html = fs.readFileSync(new URL("../dev.tapparello.agent-vitals.sdPlugin/pi/pi.html", import.meta.url), "utf8");
  const da = html.indexOf("const METRICHE_NEXUS_PI = [");
  assert.ok(da > 0);
  const blocco = html.slice(da, html.indexOf("\n];", da));
  const pi = [...blocco.matchAll(/\["([a-z_]+)", "([^"]+)", "([^"]+)"\]/g)].map((m) => [m[1], m[2], m[3]]);
  assert.deepEqual(pi, Object.entries(METRICHE_NEXUS).map(([id, m]) => [id, m.gruppo, m.nome]));
  // Le tre impostazioni condivise hanno gli stessi nomi che legge confNexus.
  for (const k of ["nexusUrl", "nexusKey", "nexusApp"]) assert.ok(html.includes(`key: "${k}"`), k);
});

test("il manifest dichiara il tasto, con le sue icone", () => {
  const manifest = JSON.parse(fs.readFileSync(new URL("../dev.tapparello.agent-vitals.sdPlugin/manifest.json", import.meta.url), "utf8"));
  const a = manifest.Actions.find((x) => x.UUID === "dev.tapparello.agent-vitals.nexus");
  assert.ok(a, "manca l'azione nexus");
  assert.equal(a.PropertyInspectorPath, "pi/pi.html");
  for (const f of [`${a.Icon}.svg`, `${a.States[0].Image}.svg`]) {
    assert.ok(fs.existsSync(new URL(`../dev.tapparello.agent-vitals.sdPlugin/${f}`, import.meta.url)), f);
  }
});

test("la configurazione e gli indirizzi", () => {
  assert.equal(confNexus({}).completa, false);
  assert.equal(confNexus({ nexusUrl: "http://x", nexusKey: "k" }).completa, false, "solo https");
  assert.equal(confNexus({ nexusUrl: "https://x.supabase.co/functions/v1/deck-metriche" }).completa, false, "senza chiave");
  const c = confNexus({ nexusUrl: " https://x.supabase.co/functions/v1/deck-metriche/ ", nexusKey: " nxd_k ", nexusApp: " https://nexus.example.it/ " });
  assert.deepEqual(c, { url: "https://x.supabase.co/functions/v1/deck-metriche", chiave: "nxd_k", app: "https://nexus.example.it/", completa: true });
  // Le impostazioni di TheCore non sono quelle di Nexus: due gestionali, due chiavi.
  assert.equal(confNexus({ thecoreUrl: "https://x", thecoreKey: "szd_k" }).completa, false);
  assert.deepEqual(confNexus({ thecoreUrl: "https://x", thecoreKey: "szd_k", thecoreApp: "https://t", nexusKey: "nxd_k" }), { url: "", chiave: "nxd_k", app: "", completa: false });
  assert.equal(confNexus({ nexusUrl: "https://x", thecoreKey: "szd_k" }).completa, false, "la chiave di TheCore non apre Nexus");
  assert.equal(paginaNexus("https://nexus.example.it/", "/finanze?scheda=flussi"), "https://nexus.example.it/finanze?scheda=flussi");
  assert.equal(paginaNexus("https://nexus.example.it", "/"), "https://nexus.example.it/");
  assert.equal(paginaNexus("", "/banche"), null);
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
  const conf = { url: "https://x.supabase.co/functions/v1/deck-metriche", chiave: "nxd_abc" };
  const ok = fetchFinto(json(RIASSUNTO));
  assert.deepEqual(await leggiNexus(conf, { fetchFn: ok.fn }), RIASSUNTO);
  assert.equal(ok.chiamate[0].url, conf.url);
  assert.equal(ok.chiamate[0].opz.headers["x-api-key"], "nxd_abc");
  assert.equal(ok.chiamate[0].opz.method ?? "GET", "GET");
  const tipo = async (r) => { try { await leggiNexus(conf, { fetchFn: fetchFinto(r).fn }); return "nessun errore"; } catch (e) { assert.ok(e instanceof NexusErrore); return e.tipo; } };
  assert.equal(await tipo(json({ error: "x" }, 401)), "chiave");
  assert.equal(await tipo(json({ error: "x" }, 500)), "server");
  assert.equal(await tipo(json({ error: "x" }, 405)), "server");
  assert.equal(await tipo(new Error("ECONNRESET")), "rete");
  assert.equal(await tipo({ status: 200, ok: true, json: async () => { throw new SyntaxError("x"); } }), "formato");
  // Un'altra versione, o il riassunto di TheCore incollato per sbaglio: non si legge come se fosse questo.
  assert.equal(await tipo(json({ ...RIASSUNTO, versione: 2 })), "formato");
  assert.equal(await tipo(json({ versione: 1, stagione: {}, vendite: {}, directory: {}, hiring: {}, operativo: {} })), "formato");
  assert.equal(await tipo(json({ ...RIASSUNTO, conti: null })), "formato");
  assert.equal(await tipo(json(null)), "formato");
  assert.ok(riassuntoNexusValido(RIASSUNTO));
});

test("che cosa dice il tasto, anche quando qualcosa non va", () => {
  const conf = { completa: true };
  assert.deepEqual(
    (({ valore, sub, attenuato }) => [valore, sub, attenuato])(vistaNexus({ settings: {}, nx: null, conf: { completa: false } })),
    ["—", "imposta Nexus", true]);
  assert.equal(vistaNexus({ settings: {}, nx: null, conf }).valore, "…");
  // Una chiave rifiutata non mostra numeri, nemmeno quelli di prima.
  const rifiutata = vistaNexus({ settings: { metrica: "liquidita" }, nx: { dati: RIASSUNTO, at: 0, err: "chiave" }, conf });
  assert.deepEqual([rifiutata.valore, rifiutata.sub, rifiutata.tono], ["!", "chiave rifiutata", "attenzione"]);
  // Un guasto di rete tiene il numero di prima, con l'ora, e spento: non diventa uno zero.
  const okAt = new Date(2026, 10, 11, 10, 30).getTime();
  const offline = vistaNexus({ settings: { metrica: "liquidita" }, nx: { dati: RIASSUNTO, at: 0, okAt, err: "rete" }, conf });
  assert.deepEqual([offline.valore, offline.sub, offline.tono, offline.attenuato], ["€ 3.722", "offline · 10:30", null, true]);
  const mai = vistaNexus({ settings: { metrica: "liquidita" }, nx: { dati: null, at: 0, err: "server" }, conf });
  assert.deepEqual([mai.valore, mai.sub, mai.tono], ["--", "Nexus in errore", "attenzione"]);
  const ok = vistaNexus({ settings: { metrica: "scadenza" }, nx: { dati: RIASSUNTO, at: 0, err: null }, conf });
  assert.deepEqual([ok.titolo, ok.valore, ok.sub, ok.tono, ok.pagina, ok.gruppo, ok.glifo], ["Scadenza", "14 g", "Revisione", "attenzione", "/veicoli", "Veicoli", "calendario"]);
  // Il titolo è il nome del conto o del veicolo, dove la metrica ne riguarda uno.
  assert.equal(vistaNexus({ settings: { metrica: "saldo_conto", conto: "Dollari" }, nx: { dati: RIASSUNTO, at: 0, err: null }, conf }).titolo, "Dollari");
  assert.equal(vistaNexus({ settings: { metrica: "km" }, nx: { dati: RIASSUNTO, at: 0, okAt, err: "rete" }, conf }).titolo, "Fiat Punto");
  assert.equal(vistaNexus({ settings: { metrica: "saldo_conto", conto: "Sparito" }, nx: { dati: RIASSUNTO, at: 0, err: null }, conf }).titolo, "Conto");
});

test("il pannello: lo stato a parole e i nomi fra cui scegliere", () => {
  const conf = { completa: true };
  assert.match(statoNexus({ nx: null, conf: { completa: false } }), /Altro → Stream Deck/);
  assert.equal(statoNexus({ nx: null, conf }), "In lettura…");
  assert.match(statoNexus({ nx: { dati: RIASSUNTO, at: new Date(2026, 10, 11, 9, 5).getTime(), err: null }, conf }), /^Collegato · 4 conti, 1 veicolo · 09:05$/);
  assert.match(statoNexus({ nx: { dati: null, at: 0, err: "chiave" }, conf }), /rifiutato la chiave/);
  assert.match(statoNexus({ nx: { dati: RIASSUNTO, at: 0, okAt: new Date(2026, 10, 11, 9, 5).getTime(), err: "rete" }, conf }), /non raggiungibile\): i numeri sono delle 09:05\.$/);
  assert.deepEqual(nomiNexus({ dati: RIASSUNTO }), { conti: ["Hype", "PAC", "Prestito", "Dollari"], veicoli: ["Fiat Punto"] });
  assert.deepEqual(nomiNexus(null), { conti: [], veicoli: [] });
});

test("un tasto Nexus può fare da riga in basso mentre Claude chiede, come quelli di TheCore", async () => {
  const { tipoDaMostrare, slotDi } = await import("../src/view.js");
  const coda = [{ id: 1, toolName: "Bash", toolInput: { command: "ls" }, receivedAt: 0 }];
  assert.equal(slotDi("nexus", { slot: "approve-allow" }), "approve-allow");
  assert.equal(tipoDaMostrare("nexus", { slot: "approve-allow", metrica: "patrimonio" }, coda), "approve-allow");
  assert.equal(tipoDaMostrare("nexus", { slot: "approve-allow" }, []), "nexus", "senza richieste torna il numero");
});
