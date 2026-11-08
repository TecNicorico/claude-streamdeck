// Le domande di Claude (AskUserQuestion) sulla riga in basso del deck.
//
// I tre tasti di approvazione cambiano faccia quando la richiesta in testa alla fila è
// una domanda. Si chiamano per posizione, sinistra / centro / destra, che sono i tasti
// DENY / (ex ALWAYS) / ALLOW:
//   2 opzioni   →  [1]      [domanda]   [2]
//   3 opzioni   →  [1]      [2]         [3]
//   4 opzioni   →  [1]      [altre ▸]   [2]      poi   [3]   [◂ altre]   [4]
// Più domande nella stessa richiesta si rispondono una dopo l'altra; le risposte
// partono tutte insieme alla fine, come fa Claude Code.
//
// Logica pura. Si sbaglia in silenzio in un modo solo — un tasto che mostra
// un'opzione e ne manda un'altra — quindi il tasto ricorda cosa ha DISEGNATO e la
// pressione si confronta con quello (vedi plugin.js).

export const SLOT = { "approve-deny": 0, "approve-always": 1, "approve-allow": 2 };
export const MAX_OPZIONI = 4;
export const MAX_DOMANDE = 4;

// Si risponde dal deck solo a domande a scelta singola con 2-4 opzioni. Il resto
// (scelta multipla, «altro» scritto a mano) resta su Claude: il tasto WAITING lo segnala.
export function domandaRispondibile(req) {
  if (String(req?.toolName ?? "") !== "AskUserQuestion") return false;
  const qs = req?.toolInput?.questions;
  if (!Array.isArray(qs) || !qs.length || qs.length > MAX_DOMANDE) return false;
  return qs.every((q) =>
    q && typeof q.question === "string" && q.question && !q.multiSelect &&
    Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= MAX_OPZIONI &&
    q.options.every((o) => o && typeof o.label === "string" && o.label));
}

export const statoIniziale = () => ({ passo: 0, pagina: 0, risposte: {} });

// Che cosa mostra ognuno dei tre tasti, per la domanda al passo corrente.
//   { tipo: "opzione", indice, label } | { tipo: "pagina", verso, testo } | { tipo: "domanda" }
export function facce(req, stato = statoIniziale()) {
  const qs = req?.toolInput?.questions ?? [];
  const q = qs[stato.passo];
  if (!q) return [null, null, null];
  const opz = q.options.map((o, indice) => ({ tipo: "opzione", indice, label: o.label }));
  if (opz.length === 2) return [opz[0], { tipo: "domanda" }, opz[1]];
  if (opz.length === 3) return [opz[0], opz[1], opz[2]];
  return stato.pagina === 0
    ? [opz[0], { tipo: "pagina", verso: 1, testo: "altre ▸" }, opz[1]]
    : [opz[2], { tipo: "pagina", verso: 0, testo: "◂ altre" }, opz[3]];
}

// Una pressione sul tasto `slot`. Ritorna lo stato nuovo e, se era l'ultima risposta,
// le risposte complete da mandare a Claude: { stato, risposte|null }.
export function premi(req, stato, slot) {
  const qs = req?.toolInput?.questions ?? [];
  const faccia = facce(req, stato)[slot];
  if (!faccia || faccia.tipo === "domanda") return { stato, risposte: null, nulla: true };
  if (faccia.tipo === "pagina") return { stato: { ...stato, pagina: faccia.verso }, risposte: null };
  const q = qs[stato.passo];
  const risposte = { ...stato.risposte, [q.question]: faccia.label };
  if (stato.passo + 1 < qs.length) {
    return { stato: { passo: stato.passo + 1, pagina: 0, risposte }, risposte: null };
  }
  return { stato: { ...stato, risposte }, risposte };
}

// Il testo da mostrare in cima ai tasti: l'intestazione breve della domanda (Claude
// la scrive per essere lunga al massimo 12 caratteri), e a che punto siamo.
export function intestazione(req, stato = statoIniziale()) {
  const qs = req?.toolInput?.questions ?? [];
  const q = qs[stato.passo];
  if (!q) return "";
  const h = String(q.header || "domanda").toUpperCase();
  return qs.length > 1 ? `${h} ${stato.passo + 1}/${qs.length}` : h;
}

export const testoDomanda = (req, stato = statoIniziale()) =>
  String(req?.toolInput?.questions?.[stato.passo]?.question ?? "");
