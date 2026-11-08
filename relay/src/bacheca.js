// La bacheca del relay: le sessioni cloud che si sono fatte vive e le richieste che
// aspettano una risposta dallo Stream Deck. Logica pura, senza rete né Cloudflare:
// il Worker (index.js) la tiene dentro un Durable Object e ci passa l'orologio.
//
// Tre regole che si rompono senza errori, quindi stanno qui e nei test:
//
//  1. La bacheca non decide mai al posto della persona. Una richiesta che scade, o
//     il cui hook è sparito, si toglie e basta: l'hook non riceve niente e Claude Code
//     mostra la richiesta normale su claude.ai.
//  2. Una risposta a una domanda vale solo se nomina, per OGNI domanda, una delle
//     opzioni offerte. Un'etichetta inventata non arriva mai a Claude.
//  3. Dal deck arrivano solo tre tipi di decisione: approva, rifiuta, rispondi. Niente
//     regole permanenti («always allow»): nel cloud finirebbero in un container che
//     sparisce, e approvare per sempre da un tasto è il rischio da evitare.

export const LIMITI = {
  sessioni: 12,
  richieste: 20,
  // Quanto aspetta al massimo una richiesta, anche se l'hook chiede di più.
  attesaMaxS: 600,
  // Cinque minuti: il tempo di aprire la sessione su claude.ai, leggere, e tornare
  // a rispondere dal deck. La richiesta su claude.ai resta rispondibile per tutto il tempo.
  attesaDefaultS: 300,
  // Quanto dura una singola attesa lunga dell'hook su /attendi (vedi index.js).
  attesaLungaMs: 20_000,
  // Se l'hook non si fa vivo per più di così, è morto (Claude Code l'ha chiuso). Deve
  // stare ben sopra l'attesa lunga: fra una e l'altra l'hook tace per costruzione, e una
  // soglia più corta faceva sparire dal deck ogni richiesta dopo un quarto di minuto.
  hookSilenzioMs: 45_000,
  // Una sessione che non dà notizie da tanto si toglie; una «al lavoro» senza notizie
  // da un'ora e mezza si mostra ferma, perché un container morto non manda la sua fine.
  // (Gli hook non mandano un segnale per ogni strumento, apposta: costerebbe un avvio
  // di node a ogni comando. Un turno lungo senza richieste resta «al lavoro».)
  sessioneMaxMs: 8 * 3600_000,
  lavoroMaxMs: 90 * 60_000,
  testo: 16_000,
  totaleInput: 48_000,
};

export const EVENTI = new Set(["avvio", "lavora", "fine", "chiusa"]);

const pulisci = (v, max) => String(v ?? "").replace(/[\p{Cc}]+/gu, " ").slice(0, max);

// Il link su claude.ai si ricava dall'id che il container dà alla sessione
// (CLAUDE_CODE_REMOTE_SESSION_ID = "cse_01…" → claude.ai/code/session_01…).
// Mai un link scelto da chi scrive: il deck lo apre nel browser.
export function urlSessione(idRemoto) {
  const m = /^(?:cse|session)_([A-Za-z0-9]{8,64})$/.exec(String(idRemoto ?? ""));
  return m ? `https://claude.ai/code/session_${m[1]}` : null;
}

// L'input di uno strumento come lo vede il deck: abbastanza per decidere, non di più.
// Le stringhe lunghe si tagliano e la richiesta lo dice (`troncato`), così il deck
// tratta come scrittura una query SQL di cui non ha visto la fine.
export function riduciInput(tool, input) {
  if (!input || typeof input !== "object") return { input: {}, troncato: false };
  if (tool === "AskUserQuestion") {
    const questions = (Array.isArray(input.questions) ? input.questions : []).slice(0, 4).map((q) => ({
      question: pulisci(q?.question, 500),
      header: pulisci(q?.header, 40),
      multiSelect: !!q?.multiSelect,
      options: (Array.isArray(q?.options) ? q.options : []).slice(0, 6).map((o) => ({ label: pulisci(o?.label, 200) })),
    }));
    return { input: { questions }, troncato: false };
  }
  let troncato = false, totale = 0;
  const out = {};
  for (const [k, v] of Object.entries(input).slice(0, 30)) {
    let s = typeof v === "string" ? v : JSON.stringify(v ?? null);
    if (s.length > LIMITI.testo) { s = s.slice(0, LIMITI.testo); troncato = true; }
    if (totale + s.length > LIMITI.totaleInput) { troncato = true; break; }
    totale += s.length;
    out[pulisci(k, 60)] = typeof v === "string" || s !== JSON.stringify(v ?? null) ? s : v;
  }
  return { input: out, troncato };
}

// Una risposta valida per QUESTE domande, o null. Ogni domanda deve avere una
// risposta, e la risposta deve essere una delle sue etichette.
export function risposteValide(questions, risposte) {
  if (!Array.isArray(questions) || !questions.length) return null;
  if (!risposte || typeof risposte !== "object") return null;
  const out = {};
  for (const q of questions) {
    if (q.multiSelect) return null;
    const scelta = risposte[q.question];
    if (typeof scelta !== "string") return null;
    if (!(q.options ?? []).some((o) => o.label === scelta)) return null;
    out[q.question] = scelta;
  }
  return out;
}

export function decisioneValida(richiesta, d) {
  if (!d || typeof d !== "object") return null;
  if (d.tipo === "approva") return richiesta.tool === "AskUserQuestion" ? null : { tipo: "approva" };
  if (d.tipo === "rifiuta") return { tipo: "rifiuta" };
  if (d.tipo === "rispondi" && richiesta.tool === "AskUserQuestion") {
    const r = risposteValide(richiesta.input?.questions, d.risposte);
    return r ? { tipo: "rispondi", risposte: r } : null;
  }
  return null;
}

function sessioneDa(s) {
  const id = pulisci(s?.id, 80);
  if (!id) return null;
  return {
    id,
    nome: pulisci(s?.nome, 60) || "cloud",
    cwd: pulisci(s?.cwd, 300),
    url: urlSessione(s?.idRemoto ?? s?.id),
    // Le prime parole del primo messaggio: il sottotitolo del tasto della sessione.
    titolo: pulisci(s?.titolo, 60).trim(),
  };
}

export class Bacheca {
  constructor() {
    this.sessioni = new Map();
    this.richieste = new Map();
    this.versione = 0;
    this.seq = 0;
  }

  // Le sessioni sopravvivono a un riavvio del Durable Object; le richieste no,
  // perché sono legate a un hook vivo che le sta aspettando.
  static da(salvate) {
    const b = new Bacheca();
    for (const s of Array.isArray(salvate) ? salvate : []) if (s?.id) b.sessioni.set(s.id, s);
    return b;
  }

  daSalvare() { return [...this.sessioni.values()]; }

  cambiata() { this.versione++; }

  tocca(s, ora) {
    const base = sessioneDa(s);
    if (!base) return null;
    const prima = this.sessioni.get(base.id);
    // Il titolo lo dà il primo messaggio, e poi resta: come su claude.ai.
    const rec = prima
      ? { ...prima, ...base, titolo: prima.titolo || base.titolo, aggiornata: ora }
      : { ...base, stato: "idle", statoDal: ora, iniziata: ora, aggiornata: ora };
    this.sessioni.set(base.id, rec);
    if (this.sessioni.size > LIMITI.sessioni) {
      const vecchia = [...this.sessioni.values()].sort((a, b) => a.aggiornata - b.aggiornata)[0];
      this.sessioni.delete(vecchia.id);
    }
    return rec;
  }

  imposta(rec, stato, attesa, ora) {
    if (rec.stato === stato && (rec.attesa ?? null) === (attesa ?? null)) return;
    rec.stato = stato;
    rec.attesa = attesa ?? null;
    rec.statoDal = ora;
  }

  // Lo stato che una sessione ha quando le sue richieste si chiudono.
  riallinea(rec, ora) {
    const aperte = [...this.richieste.values()].filter((r) => r.sessione === rec.id);
    if (aperte.some((r) => r.tool !== "AskUserQuestion")) this.imposta(rec, "waiting", "permission prompt", ora);
    else if (aperte.length) this.imposta(rec, "waiting", "input needed", ora);
    else if (rec.stato === "waiting") this.imposta(rec, "busy", null, ora);
  }

  evento({ sessione, evento }, ora) {
    if (!EVENTI.has(evento)) return { errore: "EVENTO_SCONOSCIUTO" };
    const id = sessioneDa(sessione)?.id;
    if (!id) return { errore: "SESSIONE_MANCANTE" };
    if (evento === "chiusa") {
      this.sessioni.delete(id);
      for (const r of [...this.richieste.values()]) if (r.sessione === id) this.richieste.delete(r.id);
      this.cambiata();
      return { ok: true };
    }
    const rec = this.tocca(sessione, ora);
    // Un turno che finisce, o un messaggio nuovo, vuol dire che le richieste aperte di
    // quella sessione non aspettano più: qualcuno ha risposto su claude.ai (o ha scritto
    // altro). Si tolgono dal deck subito, senza aspettare che l'hook se ne vada.
    if (evento === "fine" || evento === "lavora") {
      for (const r of [...this.richieste.values()]) if (r.sessione === id && !r.decisione) this.richieste.delete(r.id);
    }
    this.imposta(rec, evento === "lavora" ? "busy" : "idle", null, ora);
    this.cambiata();
    return { ok: true };
  }

  apri({ sessione, tool, input, attesaS }, ora) {
    const t = pulisci(tool, 120);
    if (!t) return { errore: "TOOL_MANCANTE" };
    const rec = this.tocca(sessione, ora);
    if (!rec) return { errore: "SESSIONE_MANCANTE" };
    if (this.richieste.size >= LIMITI.richieste) return { errore: "TROPPE_RICHIESTE" };
    const { input: ridotto, troncato } = riduciInput(t, input);
    const s = Math.min(LIMITI.attesaMaxS, Math.max(5, Number(attesaS) || LIMITI.attesaDefaultS));
    const id = `r${ora.toString(36)}${(++this.seq).toString(36)}`;
    const r = { id, sessione: rec.id, tool: t, input: ridotto, troncato, ricevuta: ora, scade: ora + s * 1000, vista: ora, decisione: null };
    this.richieste.set(id, r);
    this.riallinea(rec, ora);
    this.cambiata();
    return { id, scade: r.scade };
  }

  // Il deck ha deciso. La richiesta resta finché l'hook non passa a prenderla.
  decidi(id, d, ora) {
    const r = this.richieste.get(String(id ?? ""));
    if (!r) return { errore: "RICHIESTA_SCONOSCIUTA" };
    if (r.decisione) return { errore: "GIA_DECISA" };
    const ok = decisioneValida(r, d);
    if (!ok) return { errore: "DECISIONE_NON_VALIDA" };
    r.decisione = ok;
    r.decisa = ora;
    this.cambiata();
    return { ok: true };
  }

  // L'hook passa a vedere. Se c'è una decisione la consegna e chiude la richiesta.
  ritira(id, ora) {
    const r = this.richieste.get(String(id ?? ""));
    if (!r) return { stato: "sconosciuta" };
    r.vista = ora;
    if (!r.decisione) return { stato: "in_attesa", scade: r.scade };
    this.chiudi(r, ora);
    return { stato: "decisa", decisione: r.decisione };
  }

  // L'hook rinuncia (tempo scaduto): niente decisione, si torna alla richiesta normale.
  rinuncia(id, ora) {
    const r = this.richieste.get(String(id ?? ""));
    if (!r) return { ok: true };
    this.chiudi(r, ora);
    return { ok: true };
  }

  chiudi(r, ora) {
    this.richieste.delete(r.id);
    const rec = this.sessioni.get(r.sessione);
    if (rec) {
      this.riallinea(rec, ora);
      // Approvato o risposto: Claude riparte. Rifiutato: riparte anche lui, e adatta.
      if (r.decisione && rec.stato !== "waiting") this.imposta(rec, "busy", null, ora);
    }
    this.cambiata();
  }

  manutenzione(ora) {
    let cambiato = false;
    for (const r of [...this.richieste.values()]) {
      const scaduta = ora > r.scade + 5_000;
      const abbandonata = !r.decisione && ora - r.vista > LIMITI.hookSilenzioMs;
      // Decisa ma mai ritirata: l'hook è morto dopo che hai premuto.
      const orfana = r.decisione && ora - r.decisa > LIMITI.hookSilenzioMs;
      if (scaduta || abbandonata || orfana) {
        this.richieste.delete(r.id);
        const rec = this.sessioni.get(r.sessione);
        if (rec) this.riallinea(rec, ora);
        cambiato = true;
      }
    }
    for (const s of [...this.sessioni.values()]) {
      if (ora - s.aggiornata > LIMITI.sessioneMaxMs) { this.sessioni.delete(s.id); cambiato = true; continue; }
      if (s.stato === "busy" && ora - s.statoDal > LIMITI.lavoroMaxMs) { this.imposta(s, "idle", null, ora); cambiato = true; }
    }
    if (cambiato) this.cambiata();
    return cambiato;
  }

  // Ciò che il deck legge: sessioni nella forma dei file di sessione di Claude Code
  // (status / waitingFor / statusUpdatedAt), e le richieste ancora da decidere.
  perDeck(ora) {
    return {
      versione: this.versione,
      ora,
      sessioni: [...this.sessioni.values()].map((s) => ({
        id: s.id, nome: s.nome, cwd: s.cwd, url: s.url, titolo: s.titolo || "",
        status: s.stato, waitingFor: s.attesa, statusUpdatedAt: s.statoDal,
        updatedAt: s.aggiornata, startedAt: s.iniziata,
      })),
      richieste: [...this.richieste.values()].filter((r) => !r.decisione).map((r) => ({
        id: r.id, sessione: r.sessione, tool: r.tool, input: r.input, troncato: r.troncato,
        ricevuta: r.ricevuta, scade: r.scade,
      })),
    };
  }
}
