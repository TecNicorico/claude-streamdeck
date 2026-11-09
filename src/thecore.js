// Il tasto TheCore: un numero del gestionale, e premuto apre la pagina da cui viene.
// Tutto ciò che decide sta qui, puro; la lettura la fa il poller in plugin.js, una
// sola per tutti i tasti (devono raccontare lo stesso istante).
//
// La risposta viene dalla Edge Function `deck-metriche` di TheCore (migration 0156):
// un riassunto di soli numeri della stagione attiva, letto con la chiave personale
// generata in TheCore da Impostazioni → Preferenze → Stream Deck. Le impostazioni
// globali del plugin tengono:
//   thecoreUrl   l'indirizzo della funzione (…/functions/v1/deck-metriche)
//   thecoreKey   la chiave (szd_…)
//   thecoreApp   l'indirizzo di TheCore, dove la pressione apre le pagine
//
// tono: null | "attenzione" (c'è da fare qualcosa) | "guasto" (qualcosa si è rotto).

export const INTERVALLO_THECORE_MS = 300_000;
export const RITARDO_ERRORE_THECORE_MS = 120_000;
export const VERSIONE = 1;

// "2025-2026" → "25/26".
export function stagioneBreve(codice) {
  const m = /^(\d{4})-(\d{4})$/.exec(String(codice ?? ""));
  return m ? `${m[1].slice(2)}/${m[2].slice(2)}` : String(codice ?? "");
}

const migliaia = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const decimale = (n, cifre) => n.toFixed(cifre).replace(".", ",");

// Un importo in euro che sta su un tasto: «€ 980», «€ 9.876», «€ 12,3k», «€ 123k», «€ 1,23M».
export function euroBreve(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "--";
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a < 10_000) return `€ ${s}${migliaia(a)}`;
  if (a < 100_000) return `€ ${s}${decimale(a / 1000, 1)}k`;
  if (a < 1_000_000) return `€ ${s}${Math.round(a / 1000)}k`;
  return `€ ${s}${decimale(a / 1_000_000, 2)}M`;
}

export function numero(n) {
  return typeof n === "number" && Number.isFinite(n) ? migliaia(n) : "--";
}

// La variazione contro l'anno scorso alla stessa data: «▲ 12%», «▼ 3%», «= 0%»;
// null senza un anno scorso con cui confrontare (zero non è un confronto).
export function variazione(adesso, prima) {
  if (typeof adesso !== "number" || typeof prima !== "number" || !(prima > 0)) return null;
  const p = Math.round(((adesso - prima) / prima) * 100);
  return p > 0 ? `▲ ${p}%` : p < 0 ? `▼ ${-p}%` : "= 0%";
}

const conto = (n, uno, molti) => `${numero(n)} ${n === 1 ? uno : molti}`;

// Il catalogo. `pagina` è il percorso in TheCore (null = la pressione rilegge e
// basta); `vista(d)` riceve il riassunto e restituisce { valore, sub, tono }.
export const METRICHE = {
  // --------------------------------------------------------------- vendite
  fatturato: {
    gruppo: "Vendite", nome: "Fatturato della stagione", titolo: "Fatturato", glifo: "euro", pagina: "/economics/pl",
    vista: (d) => {
      const v = d.vendite.fatturato, p = d.vendite.fatturatoAnnoScorso;
      const varia = variazione(v, p);
      return { valore: euroBreve(v), sub: varia ? `${varia} vs ${stagioneBreve(d.stagione.precedente)}` : `oggi ${euroBreve(d.vendite.fatturatoOggi)}` };
    },
  },
  ordini_oggi: {
    gruppo: "Vendite", nome: "Ordini di oggi", titolo: "Ordini", glifo: "carrello", pagina: "/economics/dashboard-ordini",
    vista: (d) => ({ valore: numero(d.vendite.ordiniOggi), sub: `${euroBreve(d.vendite.fatturatoOggi)} · ieri ${numero(d.vendite.ordiniIeri)}` }),
  },
  ufficializzate: {
    gruppo: "Vendite", nome: "Scuole ufficializzate", titolo: "Firmate", glifo: "sigillo", pagina: "/directory",
    vista: (d) => ({ valore: numero(d.vendite.ufficializzate), sub: `su ${numero(d.directory.raggiunte)} raggiunte` }),
  },
  // Le ufficializzate linea per linea (TheCore 0157): una scuola col merch firmato
  // e l'annuario no conta in una sola delle due.
  ufficializzate_merch: {
    gruppo: "Vendite", nome: "Merch ufficializzati", titolo: "Merch", glifo: "maglietta", pagina: "/l/merch",
    vista: (d) => ({ valore: numero(d.vendite.ufficializzateMerch), sub: `firmati su ${numero(d.vendite.lineeMerch)}` }),
  },
  ufficializzate_annuari: {
    gruppo: "Vendite", nome: "Annuari ufficializzati", titolo: "Annuari", glifo: "libro", pagina: "/l/annuari",
    vista: (d) => ({ valore: numero(d.vendite.ufficializzateAnnuari), sub: `firmati su ${numero(d.vendite.lineeAnnuari)}` }),
  },
  // ------------------------------------------------------------- directory
  raggiunte: {
    gruppo: "Directory", nome: "Scuole raggiunte", titolo: "Raggiunte", glifo: "scuola", pagina: "/metriche",
    vista: (d) => {
      const v = d.directory.raggiunte, p = d.directory.raggiunteAnnoScorso;
      const varia = variazione(v, p);
      return { valore: numero(v), sub: varia ? `${varia} vs ${stagioneBreve(d.stagione.precedente)}` : "in Directory" };
    },
  },
  da_assegnare: {
    gruppo: "Directory", nome: "Scuole senza sales", titolo: "Senza sales", glifo: "utentePiu", pagina: "/directory",
    vista: (d) => {
      const c = d.directory.competitor;
      // Il competitor è l'urgenza (0124): una scuola segnalata va assegnata prima.
      return c > 0
        ? { valore: numero(d.directory.daAssegnare), sub: conto(c, "competitor", "competitor"), tono: "attenzione" }
        : { valore: numero(d.directory.daAssegnare), sub: "da assegnare" };
    },
  },
  richieste: {
    gruppo: "Directory", nome: "Richieste dal form da assegnare", titolo: "Richieste", glifo: "vassoio", pagina: "/contatti-senza-scuola",
    vista: (d) => ({ valore: numero(d.directory.richieste), sub: "dal form", tono: d.directory.richieste > 0 ? "attenzione" : null }),
  },
  // ---------------------------------------------------------------- hiring
  ris_da_scrutinare: {
    gruppo: "Hiring", nome: "Candidature da scrutinare", titolo: "Candidature", glifo: "persone", pagina: "/ris/lavora",
    vista: (d) => ({
      valore: numero(d.hiring.daScrutinare),
      sub: d.hiring.arrivateOggi > 0 ? `da scrutinare · +${numero(d.hiring.arrivateOggi)}` : "da scrutinare",
      tono: d.hiring.daScrutinare > 0 ? "attenzione" : null,
    }),
  },
  candidati_accettati: {
    // Accettati e non ancora eletti (TheCore 0157): i candidati RIS degli inviti.
    gruppo: "Hiring", nome: "Candidati RIS accettati", titolo: "Accettati", glifo: "utenteSpunta", pagina: "/ris/candidature",
    vista: (d) => ({ valore: numero(d.hiring.candidatiAccettati), sub: "non ancora eletti" }),
  },
  ris_documenti: {
    gruppo: "Hiring", nome: "Documenti da verificare", titolo: "Documenti", glifo: "documento", pagina: "/ris/candidature",
    vista: (d) => ({ valore: numero(d.hiring.documentiDaVerificare), sub: "da verificare", tono: d.hiring.documentiDaVerificare > 0 ? "attenzione" : null }),
  },
  eletti_senza_documento: {
    gruppo: "Hiring", nome: "Eletti senza documento", titolo: "Senza doc.", glifo: "documentoManca", pagina: "/ris/candidature",
    vista: (d) => ({ valore: numero(d.hiring.elettiSenzaDocumento), sub: "da contattare", tono: d.hiring.elettiSenzaDocumento > 0 ? "attenzione" : null }),
  },
  ris_eletti: {
    gruppo: "Hiring", nome: "RIS eletti", titolo: "RIS", glifo: "stella", pagina: "/ris/metriche",
    vista: (d) => ({ valore: numero(d.hiring.risEletti), sub: "eletti col documento" }),
  },
  // ------------------------------------------------------------- operativo
  notifiche: {
    // Le TUE notifiche non lette (TheCore 0157): la chiave è personale, e la
    // campanella è di chi la guarda. La cronologia sta nella Dashboard.
    gruppo: "Operativo", nome: "Le mie notifiche", titolo: "Notifiche", glifo: "campana", pagina: "/dashboard",
    vista: (d) => {
      const n = d.personale?.notificheNonLette, m = d.personale?.menzioniNonLette ?? 0;
      if (typeof n !== "number") return { valore: "--", sub: "TheCore da aggiornare" };
      return { valore: numero(n), sub: m > 0 ? conto(m, "menzione", "menzioni") : "non lette", tono: n > 0 ? "attenzione" : null };
    },
  },
  job: {
    // Nessuna pagina mostra l'outbox: premuto rilegge.
    gruppo: "Operativo", nome: "Job dell'outbox", titolo: "Outbox", glifo: "battito", pagina: null,
    vista: (d) => {
      const f = d.operativo.jobFalliti, r = d.operativo.jobInRitardo;
      if (f === 0 && r === 0) return { valore: "ok", sub: "nessun job fermo" };
      return { valore: numero(f + r), sub: `${conto(f, "fallito", "falliti")} · ${conto(r, "fermo", "fermi")}`, tono: "guasto" };
    },
  },
  plao: {
    gruppo: "Operativo", nome: "PLAO da controllare", titolo: "PLAO", glifo: "penna", pagina: "/economics/paghe",
    vista: (d) => ({
      // Il numero sono le firmate, che il coordinatore controlla prima dell'ultimo
      // lunedì; quelle ancora da firmare aspettano un'altra persona.
      valore: numero(d.operativo.plaoFirmate),
      sub: d.operativo.plaoFirmate > 0 ? "da controllare" : `${numero(d.operativo.plaoDaFirmare)} da firmare`,
      tono: d.operativo.plaoFirmate > 0 ? "attenzione" : null,
    }),
  },
  fornitori: {
    gruppo: "Operativo", nome: "Ordini fornitori con un problema", titolo: "Fornitori", glifo: "camion", pagina: "/ordini-fornitori",
    vista: (d) => ({ valore: numero(d.operativo.fornitoriProblema), sub: "con un problema", tono: d.operativo.fornitoriProblema > 0 ? "guasto" : null }),
  },
};

export const METRICA_DEFAULT = "fatturato";
// Metriche che hanno cambiato nome: un tasto già configurato segue la nuova.
// «avvisi» è diventato «notifiche» il 09/11/2026 («Avvisi → trasformalo in notifiche»).
export const METRICHE_RINOMINATE = { avvisi: "notifiche" };
export function metricaDi(settings) {
  const m = METRICHE_RINOMINATE[settings?.metrica] ?? settings?.metrica;
  return Object.hasOwn(METRICHE, m) ? m : METRICA_DEFAULT;
}

export function urlPagina(app, pagina) {
  const base = String(app ?? "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//.test(base) || !pagina) return null;
  return base + pagina;
}

export function confTheCore(globalSettings) {
  const url = String(globalSettings?.thecoreUrl ?? "").trim().replace(/\/+$/, "");
  const chiave = String(globalSettings?.thecoreKey ?? "").trim();
  const app = String(globalSettings?.thecoreApp ?? "").trim();
  return { url, chiave, app, completa: /^https:\/\//.test(url) && chiave !== "" };
}

// Un riassunto che il tasto sa leggere: la versione giusta e i quattro gruppi.
export function riassuntoValido(d) {
  return !!d && d.versione === VERSIONE &&
    ["vendite", "directory", "hiring", "operativo"].every((g) => d[g] && typeof d[g] === "object") &&
    !!d.stagione;
}

export class TheCoreErrore extends Error {
  // tipo: "chiave" | "server" | "rete" | "formato" | "stagione"
  constructor(tipo, messaggio) {
    super(messaggio);
    this.name = "TheCoreErrore";
    this.tipo = tipo;
  }
}

// La lettura, con `fetch` iniettata per i test.
export async function leggiTheCore({ url, chiave }, { fetchFn = fetch, timeoutMs = 20_000 } = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  let r;
  try {
    r = await fetchFn(url, { headers: { "x-api-key": chiave, accept: "application/json" }, signal: ac.signal });
  } catch (e) {
    throw new TheCoreErrore("rete", String(e?.cause?.code ?? e?.message ?? e));
  } finally {
    clearTimeout(t);
  }
  if (r.status === 401) throw new TheCoreErrore("chiave", "chiave non valida o revocata");
  if (!r.ok) throw new TheCoreErrore("server", `HTTP ${r.status}`);
  let d;
  try { d = await r.json(); } catch { throw new TheCoreErrore("formato", "risposta non JSON"); }
  if (d && d.versione === VERSIONE && d.stagione === null) throw new TheCoreErrore("stagione", "nessuna stagione attiva");
  if (!riassuntoValido(d)) throw new TheCoreErrore("formato", `risposta inattesa (versione ${d?.versione ?? "?"})`);
  return d;
}

const ora = (t) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const MESSAGGIO_ERRORE = { chiave: "chiave?", server: "TheCore in errore", rete: "non raggiungibile", formato: "risposta strana", stagione: "nessuna stagione" };

// Che cosa disegna il tasto. `tc` è state.thecore: { dati, at, okAt, err }.
export function vistaTheCore({ settings, tc, conf }) {
  const id = metricaDi(settings);
  const m = METRICHE[id];
  const base = { titolo: m.titolo, glifo: m.glifo, gruppo: m.gruppo, pagina: m.pagina, metrica: id, attenuato: false };
  if (!conf?.completa) return { ...base, valore: "—", sub: "imposta TheCore", tono: null, attenuato: true };
  // Una chiave rifiutata: niente numeri vecchi, perché una chiave revocata deve
  // smettere di mostrare i dati, non mostrarli fermi.
  if (tc?.err === "chiave") return { ...base, valore: "!", sub: "chiave rifiutata", tono: "attenzione" };
  if (!tc?.dati) {
    if (tc?.err) return { ...base, valore: "--", sub: MESSAGGIO_ERRORE[tc.err] ?? tc.err, tono: tc.err === "stagione" ? null : "attenzione" };
    return { ...base, valore: "…", sub: "lettura…", tono: null, attenuato: true };
  }
  const v = m.vista(tc.dati);
  // Un numero vecchio resta, con l'ora: un guasto della rete non diventa uno zero.
  if (tc.err) return { ...base, valore: v.valore, sub: `offline · ${ora(tc.okAt ?? tc.at)}`, tono: null, attenuato: true };
  return { ...base, valore: v.valore, sub: v.sub, tono: v.tono ?? null };
}

export function statoTheCore({ tc, conf }) {
  if (!conf?.completa) return "Incolla l'indirizzo della funzione e la chiave generata in TheCore (Impostazioni → Preferenze → Stream Deck).";
  if (!tc) return "In lettura…";
  if (tc.err === "chiave") return "TheCore ha rifiutato la chiave: è stata rigenerata o revocata, o il tuo ruolo non la può più usare.";
  if (tc.err === "stagione") return "Collegato, ma in TheCore non c'è una stagione attiva.";
  if (tc.err) return `Non raggiungibile (${MESSAGGIO_ERRORE[tc.err] ?? tc.err})${tc.dati ? `: i numeri sono delle ${ora(tc.okAt ?? tc.at)}` : ""}.`;
  if (!tc.dati) return "In lettura…";
  return `Collegato · stagione ${tc.dati.stagione.nome ?? stagioneBreve(tc.dati.stagione.codice)} · ${ora(tc.at)}`;
}
