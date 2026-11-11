// Il tasto Nexus: un numero delle finanze personali, e premuto apre la pagina da cui
// viene. Gemello di src/thecore.js: tutto ciò che decide sta qui, puro; la lettura la
// fa il poller in plugin.js, una sola per tutti i tasti (devono raccontare lo stesso
// istante).
//
// La risposta viene dalla Edge Function `deck-metriche` di Nexus (migration 0011): un
// riassunto di totali, saldi e conteggi — mai un movimento —, letto con la chiave
// personale generata in Nexus da Altro → Stream Deck. Le impostazioni globali tengono:
//   nexusUrl   l'indirizzo della funzione (…/functions/v1/deck-metriche)
//   nexusKey   la chiave (nxd_…)
//   nexusApp   l'indirizzo di Nexus, dove la pressione apre le pagine
//
// tono: null | "attenzione" (c'è da fare qualcosa) | "guasto" (qualcosa si è rotto).
import { euroBreve, numero, urlPagina } from "./thecore.js";

export const INTERVALLO_NEXUS_MS = 300_000;
export const RITARDO_ERRORE_NEXUS_MS = 120_000;
export const VERSIONE_NEXUS = 1;

const eNumero = (n) => typeof n === "number" && Number.isFinite(n);
export const decimali = (n, cifre) => (eNumero(n) ? n.toFixed(cifre).replace(".", ",") : "--");

// Un importo nella valuta del conto: «€ 3.722», «USD 95».
export function importoBreve(n, valuta) {
  const e = euroBreve(n);
  return !valuta || valuta === "EUR" || e === "--" ? e : e.replace("€", valuta);
}

// Le quote: fino a tre decimali, senza zeri in coda («35,025», «6,9», «12»).
export function quoteDette(n) {
  if (!eNumero(n)) return "--";
  return n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",");
}

// «▲ 6,6%», «▼ 2%», «= 0%»: la resa sul versato.
export function resaDetta(resa) {
  if (!eNumero(resa)) return null;
  const p = decimali(Math.abs(resa), 1).replace(/,0$/, "");
  return resa > 0 ? `▲ ${p}%` : resa < 0 ? `▼ ${p}%` : "= 0%";
}

const due = (n) => String(n).padStart(2, "0");
// Il giorno di una data «2026-11-10» come sta su un tasto: «10/11».
export const giornoBreve = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  return m ? `${m[3]}/${m[2]}` : "";
};
// Un istante: l'ora se è di oggi, altrimenti il giorno.
export function quandoBreve(iso, adesso = new Date()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const oggi = d.getFullYear() === adesso.getFullYear() && d.getMonth() === adesso.getMonth() && d.getDate() === adesso.getDate();
  return oggi ? `${due(d.getHours())}:${due(d.getMinutes())}` : `${due(d.getDate())}/${due(d.getMonth() + 1)}`;
}

const conta = (n, uno, molti) => `${numero(n)} ${n === 1 ? uno : molti}`;

// Il conto o il veicolo scelto nel tasto, per nome; senza un nome, il primo. Un nome
// che non c'è più NON ripiega sul primo: mostrerebbe il saldo di un altro conto.
export function scelto(elenco, nome) {
  if (!Array.isArray(elenco) || elenco.length === 0) return null;
  const n = String(nome ?? "").trim().toLowerCase();
  if (!n) return elenco[0];
  return elenco.find((x) => String(x?.nome ?? "").trim().toLowerCase() === n) ?? null;
}

const senzaVeicolo = (d, s) => ({ valore: "--", sub: (d.veicoli ?? []).length === 0 ? "nessun veicolo" : `«${String(s?.veicolo ?? "").trim()}» non c'è` });

// Il catalogo. `pagina` è il percorso in Nexus; `vista(d, settings)` riceve il
// riassunto e le impostazioni del tasto e restituisce { valore, sub, tono, titolo? }.
export const METRICHE_NEXUS = {
  // --------------------------------------------------------------- finanze
  patrimonio: {
    gruppo: "Finanze", nome: "Patrimonio", titolo: "Patrimonio", glifo: "portafoglio", pagina: "/",
    vista: (d) => ({ valore: euroBreve(d.finanze.patrimonio), sub: `liquidi ${euroBreve(d.finanze.liquidita)}` }),
  },
  liquidita: {
    gruppo: "Finanze", nome: "Liquidità", titolo: "Liquidità", glifo: "goccia", pagina: "/conti",
    vista: (d) => ({ valore: euroBreve(d.finanze.liquidita), sub: d.finanze.usciteOggi > 0 ? `oggi -${euroBreve(d.finanze.usciteOggi)}` : "sui conti" }),
  },
  uscite_mese: {
    gruppo: "Finanze", nome: "Uscite del mese", titolo: "Uscite", glifo: "giu", pagina: "/finanze?scheda=flussi",
    vista: (d) => ({
      valore: euroBreve(d.finanze.usciteMese),
      sub: d.finanze.usciteOggi > 0 ? `oggi ${euroBreve(d.finanze.usciteOggi)}` : `scorso ${euroBreve(d.finanze.usciteMeseScorso)}`,
    }),
  },
  entrate_mese: {
    gruppo: "Finanze", nome: "Entrate del mese", titolo: "Entrate", glifo: "su", pagina: "/finanze?scheda=flussi",
    vista: (d) => ({ valore: euroBreve(d.finanze.entrateMese), sub: `scorso ${euroBreve(d.finanze.entrateMeseScorso)}` }),
  },
  netto_mese: {
    gruppo: "Finanze", nome: "Risparmio del mese (entrate − uscite)", titolo: "Risparmio", glifo: "euro", pagina: "/finanze?scheda=flussi",
    vista: (d) => ({
      valore: euroBreve(d.finanze.nettoMese),
      sub: d.finanze.investitoMese > 0 ? `investiti ${euroBreve(d.finanze.investitoMese)}` : "entrate − uscite",
    }),
  },
  uscite_oggi: {
    gruppo: "Finanze", nome: "Uscite di oggi", titolo: "Spesi oggi", glifo: "carrello", pagina: "/finanze",
    vista: (d) => ({ valore: euroBreve(d.finanze.usciteOggi), sub: `nel mese ${euroBreve(d.finanze.usciteMese)}` }),
  },
  da_classificare: {
    gruppo: "Finanze", nome: "Movimenti da classificare", titolo: "Da classif.", glifo: "etichetta", pagina: "/finanze?filtro=senza",
    vista: (d) => ({ valore: numero(d.finanze.daClassificare), sub: "da classificare", tono: d.finanze.daClassificare > 0 ? "attenzione" : null }),
  },
  saldo_conto: {
    gruppo: "Finanze", nome: "Saldo di un conto", titolo: "Conto", glifo: "carta", pagina: "/conti",
    vista: (d, s) => {
      const c = scelto(d.conti, s?.conto);
      if (!c) return { valore: "--", sub: (d.conti ?? []).length === 0 ? "nessun conto" : `«${String(s?.conto ?? "").trim()}» non c'è` };
      return { titolo: c.nome, valore: importoBreve(c.saldo, c.valuta), sub: c.tipo === "investimento" ? "versato" : c.tipo };
    },
  },
  // ---------------------------------------------------------- investimenti
  investimenti: {
    gruppo: "Investimenti", nome: "Controvalore degli investimenti", titolo: "Investiti", glifo: "grafico", pagina: "/finanze?scheda=investimenti",
    vista: (d) => {
      const i = d.investimenti, resa = resaDetta(i.resa);
      // Senza un prezzo il totale è il versato, e lo dice: non è «guadagno zero».
      return { valore: euroBreve(i.valore), sub: i.guadagno === null || !resa ? "al versato" : `${resa} · ${euroBreve(i.guadagno)}` };
    },
  },
  guadagno: {
    gruppo: "Investimenti", nome: "Guadagno degli investimenti", titolo: "Guadagno", glifo: "moneta", pagina: "/finanze?scheda=investimenti",
    vista: (d) => {
      const i = d.investimenti, resa = resaDetta(i.resa);
      if (i.guadagno === null) return { valore: "--", sub: "manca il prezzo" };
      return { valore: euroBreve(i.guadagno), sub: resa ? `${resa} sul versato` : "sul versato" };
    },
  },
  versato: {
    gruppo: "Investimenti", nome: "Versato negli investimenti", titolo: "Versato", glifo: "vassoio", pagina: "/finanze?scheda=investimenti",
    vista: (d) => ({ valore: euroBreve(d.investimenti.versato), sub: d.finanze.investitoMese > 0 ? `${euroBreve(d.finanze.investitoMese)} nel mese` : "in tutto" }),
  },
  quote: {
    gruppo: "Investimenti", nome: "Quote possedute", titolo: "Quote", glifo: "layers", pagina: "/finanze?scheda=investimenti",
    vista: (d) => {
      const i = d.investimenti;
      // Una stima non è un numero sbagliato, ma va detto: l'estratto conto la toglie.
      if (i.stimate > 0) return { valore: quoteDette(i.quote), sub: conta(i.stimate, "stimata", "stimate"), tono: "attenzione" };
      return { valore: quoteDette(i.quote), sub: eNumero(i.prezzo) ? `a € ${decimali(i.prezzo, 2)}` : "possedute" };
    },
  },
  prezzo: {
    gruppo: "Investimenti", nome: "Prezzo del titolo (ultima chiusura)", titolo: "Prezzo", glifo: "battito", pagina: "/finanze?scheda=investimenti",
    vista: (d) => {
      const i = d.investimenti;
      if (!eNumero(i.prezzo)) return { valore: "--", sub: "non c'è un prezzo solo" };
      return { valore: `€ ${decimali(i.prezzo, 2)}`, sub: i.prezzoDel ? `chiusura ${giornoBreve(i.prezzoDel)}` : "ultima chiusura" };
    },
  },
  // --------------------------------------------------------------- veicoli
  km: {
    gruppo: "Veicoli", nome: "Chilometri del veicolo", titolo: "Chilometri", glifo: "auto", pagina: "/veicoli",
    vista: (d, s) => {
      const v = scelto(d.veicoli, s?.veicolo);
      if (!v) return senzaVeicolo(d, s);
      return { titolo: v.nome, valore: numero(v.km), sub: v.kmMese > 0 ? `+${numero(v.kmMese)} km nel mese` : "km" };
    },
  },
  consumo: {
    gruppo: "Veicoli", nome: "Consumo medio del veicolo", titolo: "Consumo", glifo: "pompa", pagina: "/veicoli",
    vista: (d, s) => {
      const v = scelto(d.veicoli, s?.veicolo);
      if (!v) return senzaVeicolo(d, s);
      // null = non c'è ancora un tratto misurabile fra due pieni: non è zero.
      return v.consumo === null ? { valore: "--", sub: "servono due pieni" } : { valore: decimali(v.consumo, 1), sub: "l/100 km" };
    },
  },
  spesa_veicolo: {
    gruppo: "Veicoli", nome: "Spesa del mese per il veicolo", titolo: "Spesa auto", glifo: "euro", pagina: "/veicoli",
    vista: (d, s) => {
      const v = scelto(d.veicoli, s?.veicolo);
      if (!v) return senzaVeicolo(d, s);
      return { valore: euroBreve(v.spesaMese), sub: `${v.nome} · nel mese` };
    },
  },
  scadenza: {
    gruppo: "Veicoli", nome: "Prossima scadenza del veicolo", titolo: "Scadenza", glifo: "calendario", pagina: "/veicoli",
    vista: (d, s) => {
      const v = scelto(d.veicoli, s?.veicolo);
      if (!v) return senzaVeicolo(d, s);
      const x = v.scadenza;
      if (!x) return { valore: "ok", sub: "nessuna scadenza" };
      const tono = x.stato === "scaduta" ? "guasto" : x.stato === "vicina" ? "attenzione" : null;
      // La soglia che il riassunto dice per prima è la data; a soli chilometri, quelli.
      const valore = eNumero(x.giorni)
        ? (x.giorni < 0 ? "scaduta" : x.giorni === 0 ? "oggi" : `${numero(x.giorni)} g`)
        : eNumero(x.km) ? (x.km < 0 ? "superata" : `${numero(x.km)} km`) : "--";
      return { valore, sub: String(x.titolo ?? "scadenza"), tono };
    },
  },
  // ------------------------------------------------------------------ oggi
  oggi: {
    gruppo: "Oggi", nome: "Cose da guardare oggi", titolo: "Oggi", glifo: "campana", pagina: "/",
    vista: (d) => {
      const o = d.oggi;
      if (o.cose === 0) return { valore: "ok", sub: "niente da guardare" };
      return { valore: numero(o.cose), sub: o.errori > 0 ? conta(o.errori, "errore", "errori") : "da guardare", tono: o.errori > 0 ? "guasto" : "attenzione" };
    },
  },
  banche: {
    gruppo: "Oggi", nome: "Banche: la lettura e ciò che chiede attenzione", titolo: "Banche", glifo: "scuola", pagina: "/banche",
    vista: (d) => {
      const b = d.banche;
      if (b.collegate === 0) return { valore: "--", sub: "nessuna collegata" };
      if (b.daGuardare > 0) return { valore: numero(b.daGuardare), sub: "da guardare", tono: "attenzione" };
      const quando = b.ultimaLettura ? quandoBreve(b.ultimaLettura) : "";
      return { valore: "ok", sub: quando ? `lette ${quando}` : conta(b.collegate, "collegata", "collegate") };
    },
  },
  senza_descrizione: {
    gruppo: "Oggi", nome: "Movimenti senza descrizione (serve l'estratto conto)", titolo: "Estratto", glifo: "documentoManca", pagina: "/banche",
    vista: (d) => ({ valore: numero(d.banche.senzaDescrizione), sub: "senza descrizione", tono: d.banche.senzaDescrizione > 0 ? "attenzione" : null }),
  },
};

export const METRICA_NEXUS_DEFAULT = "patrimonio";
export function metricaNexusDi(settings) {
  const m = settings?.metrica;
  return typeof m === "string" && Object.hasOwn(METRICHE_NEXUS, m) ? m : METRICA_NEXUS_DEFAULT;
}

export function confNexus(globalSettings) {
  const url = String(globalSettings?.nexusUrl ?? "").trim().replace(/\/+$/, "");
  const chiave = String(globalSettings?.nexusKey ?? "").trim();
  const app = String(globalSettings?.nexusApp ?? "").trim();
  return { url, chiave, app, completa: /^https:\/\//.test(url) && chiave !== "" };
}

export const paginaNexus = (app, pagina) => urlPagina(app, pagina);

const oggetto = (x) => !!x && typeof x === "object" && !Array.isArray(x);
// Un riassunto che il tasto sa leggere: la versione giusta, i quattro gruppi e i due elenchi.
export function riassuntoNexusValido(d) {
  return oggetto(d) && d.versione === VERSIONE_NEXUS &&
    ["finanze", "investimenti", "banche", "oggi"].every((g) => oggetto(d[g])) &&
    Array.isArray(d.conti) && Array.isArray(d.veicoli);
}

export class NexusErrore extends Error {
  // tipo: "chiave" | "server" | "rete" | "formato"
  constructor(tipo, messaggio) {
    super(messaggio);
    this.name = "NexusErrore";
    this.tipo = tipo;
  }
}

// La lettura, con `fetch` iniettata per i test.
export async function leggiNexus({ url, chiave }, { fetchFn = fetch, timeoutMs = 20_000 } = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  let r;
  try {
    r = await fetchFn(url, { headers: { "x-api-key": chiave, accept: "application/json" }, signal: ac.signal });
  } catch (e) {
    throw new NexusErrore("rete", String(e?.cause?.code ?? e?.message ?? e));
  } finally {
    clearTimeout(t);
  }
  if (r.status === 401) throw new NexusErrore("chiave", "chiave non valida o revocata");
  if (!r.ok) throw new NexusErrore("server", `HTTP ${r.status}`);
  let d;
  try { d = await r.json(); } catch { throw new NexusErrore("formato", "risposta non JSON"); }
  if (!riassuntoNexusValido(d)) throw new NexusErrore("formato", `risposta inattesa (versione ${d?.versione ?? "?"})`);
  return d;
}

const ora = (t) => {
  const d = new Date(t);
  return `${due(d.getHours())}:${due(d.getMinutes())}`;
};

const MESSAGGIO_ERRORE = { chiave: "chiave?", server: "Nexus in errore", rete: "non raggiungibile", formato: "risposta strana" };

// Che cosa disegna il tasto. `nx` è state.nexus: { dati, at, okAt, err }.
export function vistaNexus({ settings, nx, conf }) {
  const id = metricaNexusDi(settings);
  const m = METRICHE_NEXUS[id];
  const base = { titolo: m.titolo, glifo: m.glifo, gruppo: m.gruppo, pagina: m.pagina, metrica: id, attenuato: false };
  if (!conf?.completa) return { ...base, valore: "—", sub: "imposta Nexus", tono: null, attenuato: true };
  // Una chiave rifiutata: niente numeri vecchi. Una chiave revocata deve smettere di
  // mostrare i conti, non mostrarli fermi.
  if (nx?.err === "chiave") return { ...base, valore: "!", sub: "chiave rifiutata", tono: "attenzione" };
  if (!nx?.dati) {
    if (nx?.err) return { ...base, valore: "--", sub: MESSAGGIO_ERRORE[nx.err] ?? nx.err, tono: "attenzione" };
    return { ...base, valore: "…", sub: "lettura…", tono: null, attenuato: true };
  }
  const v = m.vista(nx.dati, settings ?? {});
  const titolo = v.titolo ?? base.titolo;
  // Un numero vecchio resta, con l'ora: un guasto della rete non diventa uno zero.
  if (nx.err) return { ...base, titolo, valore: v.valore, sub: `offline · ${ora(nx.okAt ?? nx.at)}`, tono: null, attenuato: true };
  return { ...base, titolo, valore: v.valore, sub: v.sub, tono: v.tono ?? null };
}

// Per il pannello delle impostazioni: lo stato a parole, e i nomi fra cui scegliere.
export function statoNexus({ nx, conf }) {
  if (!conf?.completa) return "Incolla l'indirizzo della funzione e la chiave generata in Nexus (Altro → Stream Deck).";
  if (!nx) return "In lettura…";
  if (nx.err === "chiave") return "Nexus ha rifiutato la chiave: è stata rigenerata o revocata.";
  if (nx.err) return `Non raggiungibile (${MESSAGGIO_ERRORE[nx.err] ?? nx.err})${nx.dati ? `: i numeri sono delle ${ora(nx.okAt ?? nx.at)}` : ""}.`;
  if (!nx.dati) return "In lettura…";
  return `Collegato · ${conta(nx.dati.conti.length, "conto", "conti")}, ${conta(nx.dati.veicoli.length, "veicolo", "veicoli")} · ${ora(nx.at)}`;
}
export function nomiNexus(nx) {
  const nomi = (elenco) => (Array.isArray(elenco) ? elenco.map((x) => String(x?.nome ?? "")).filter(Boolean) : []);
  return { conti: nomi(nx?.dati?.conti), veicoli: nomi(nx?.dati?.veicoli) };
}
