// Il lato deck del relay (relay/ nella radice): sessioni e richieste delle sessioni
// Claude Code nel cloud, trasformate nella forma che il resto del plugin già conosce.
// Logica pura; la rete la fa plugin.js.
//
// Una sessione cloud diventa un record come quelli di ~/.claude/sessions (status,
// waitingFor, statusUpdatedAt…), con `pid: null`, `entrypoint: "cloud"` e il link su
// claude.ai: così i tasti Status, WAITING e FOCUS la mostrano senza saperlo, e la
// pressione la apre nel browser invece di cercare una finestra.
//
// Una richiesta cloud entra nella stessa fila di quelle locali. Il suo «ticket»
// non risponde a un socket: traduce la risposta che il plugin darebbe a Claude Code
// in una decisione per il relay (approva / rifiuta / rispondi).

import { RISPOSTE_GREZZE } from "./approve.js";

export const PREFISSO = "cloud:";

// Gli orari del relay sono quelli di Cloudflare: si spostano sull'orologio di questo
// computer con la differenza misurata a ogni lettura, o «finito un minuto fa» e le
// scadenze sbaglierebbero di quanto sbaglia l'orologio.
export function sessioniCloud(snap, adesso) {
  if (!snap || !Array.isArray(snap.sessioni)) return [];
  const delta = Number.isFinite(snap.ora) ? adesso - snap.ora : 0;
  const t = (v) => (Number.isFinite(v) ? v + delta : undefined);
  return snap.sessioni.map((s) => ({
    sessionId: PREFISSO + s.id,
    pid: null,
    cwd: s.cwd || `/${s.nome ?? "cloud"}`,
    name: s.nome ?? "cloud",
    status: s.status ?? "idle",
    waitingFor: s.waitingFor ?? undefined,
    statusUpdatedAt: t(s.statusUpdatedAt),
    updatedAt: t(s.updatedAt),
    startedAt: t(s.startedAt),
    entrypoint: "cloud",
    url: typeof s.url === "string" && s.url.startsWith("https://claude.ai/code/session_") ? s.url : null,
    titolo: typeof s.titolo === "string" ? s.titolo.slice(0, 60) : "",
    cloud: true,
  }));
}

// Le richieste del relay che la fila non ha ancora. `decise` sono quelle a cui il deck
// ha appena risposto: il relay le toglie quando l'hook passa a ritirarle, e fino ad
// allora una lettura potrebbe rimetterle in fila.
export function richiesteNuove(queue, snap, decise = new Set()) {
  if (!snap || !Array.isArray(snap.richieste)) return [];
  const presenti = new Set((queue ?? []).filter((r) => r.cloud).map((r) => r.cloudId));
  return snap.richieste.filter((r) => r?.id && !presenti.has(r.id) && !decise.has(r.id));
}

// Le richieste cloud in fila che il relay non elenca più: risposte su claude.ai,
// scadute, o hook morto. Escono dalla fila senza che il deck risponda niente.
export function richiesteSparite(queue, snap) {
  if (!snap || !Array.isArray(snap.richieste)) return [];
  const vive = new Set(snap.richieste.map((r) => r?.id));
  return (queue ?? []).filter((r) => r.cloud && !vive.has(r.cloudId)).map((r) => r.id);
}

// La richiesta del relay come voce della fila.
export function voceDa(r, sessioni, adesso, snapOra) {
  const delta = Number.isFinite(snapOra) ? adesso - snapOra : 0;
  const s = (sessioni ?? []).find((x) => x.sessionId === PREFISSO + r.sessione);
  const ricevuta = Number.isFinite(r.ricevuta) ? r.ricevuta + delta : adesso;
  const scade = Number.isFinite(r.scade) ? r.scade + delta : adesso + 60_000;
  return {
    cloud: true,
    cloudId: r.id,
    receivedAt: ricevuta,
    holdMs: Math.max(1_000, scade - ricevuta),
    sessionId: PREFISSO + r.sessione,
    cwd: s?.cwd ?? "",
    toolName: String(r.tool ?? ""),
    toolInput: r.input ?? {},
    troncato: !!r.troncato,
    suggestions: [],
    statusSnapshot: null,
    activitySnapshot: null,
    baselined: true,
  };
}

// La risposta che il plugin darebbe a Claude Code, tradotta per il relay. null =
// nessuna decisione: il deck tace e la richiesta resta a claude.ai.
export function decisioneDa(body) {
  const d = body?.hookSpecificOutput?.decision;
  if (!d) return null;
  if (d.behavior === "deny") return { tipo: "rifiuta" };
  if (d.behavior !== "allow") return null;
  // Mai regole permanenti dal deck verso il cloud.
  if (Array.isArray(d.updatedPermissions) && d.updatedPermissions.length) return null;
  // Le risposte com'erano, con gli elenchi della scelta multipla (vedi answerBody).
  const answers = body?.[RISPOSTE_GREZZE] ?? d.updatedInput?.answers;
  if (answers && typeof answers === "object") return { tipo: "rispondi", risposte: answers };
  return { tipo: "approva" };
}

// Ogni quanto leggere il relay: spesso quando qualcosa aspetta o lavora, piano
// quando è tutto fermo, e sempre più piano se il relay non risponde.
export function intervallo({ errori = 0, snap = null } = {}) {
  if (errori > 0) return Math.min(60_000, 3_000 * 2 ** Math.min(errori, 5));
  const vivo = snap && ((snap.richieste ?? []).length || (snap.sessioni ?? []).some((s) => s.status === "busy" || s.status === "waiting"));
  return vivo ? 1_500 : 4_000;
}

// https, oppure http solo verso questo computer (per provare il relay con `wrangler dev`).
export const urlValido = (u) => {
  const v = String(u ?? "").trim();
  return /^https:\/\/[^\s/]+(\/[^\s]*)?$/.test(v) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/[^\s]*)?$/.test(v);
};
