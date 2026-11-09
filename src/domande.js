// Le domande di Claude (AskUserQuestion) sulla riga in basso del deck.
//
// I tre tasti di approvazione cambiano faccia quando la richiesta in testa alla fila è
// una domanda. Si chiamano per posizione, sinistra / centro / destra, che sono i tasti
// DENY / (ex ALWAYS) / ALLOW.
//
// A scelta singola la pressione risponde:
//   2 opzioni   →  [1]      [domanda]   [2]
//   3 opzioni   →  [1]      [2]         [3]
//   4 opzioni   →  [1]      [altre ▸]   [2]      poi   [3]   [◂ altre]   [4]
//
// A scelta multipla la pressione spunta o toglie, e si risponde con CONFERMA. Niente
// gesti nascosti: ogni pagina dice cosa fa il centro.
//   2 opzioni   →  [☐1]     [CONFERMA]  [☐2]
//   3 opzioni   →  [☐1] [altre ▸] [☐2]  →  [☐3] [avanti ▸] [ ]  →  [◂ indietro] [CONFERMA] [ ]
//   4 opzioni   →  [☐1] [altre ▸] [☐2]  →  [☐3] [avanti ▸] [☐4] →  [◂ indietro] [CONFERMA] [ ]
//
// Più domande nella stessa richiesta si rispondono una dopo l'altra; le risposte
// partono tutte insieme alla fine, come fa Claude Code.
//
// Logica pura. Si sbaglia in silenzio in un modo solo — un tasto che mostra
// un'opzione e ne manda un'altra — quindi il tasto ricorda cosa ha DISEGNATO
// (chiaveFaccia) e la pressione si confronta con quello (vedi plugin.js).

export const SLOT = { "approve-deny": 0, "approve-always": 1, "approve-allow": 2 };
export const MAX_OPZIONI = 4;
export const MAX_DOMANDE = 4;

// Si risponde dal deck alle domande con 2-4 opzioni, a scelta singola o multipla. La
// risposta scritta a mano («altro») resta su Claude.
export function domandaRispondibile(req) {
  if (String(req?.toolName ?? "") !== "AskUserQuestion") return false;
  const qs = req?.toolInput?.questions;
  if (!Array.isArray(qs) || !qs.length || qs.length > MAX_DOMANDE) return false;
  return qs.every((q) =>
    q && typeof q.question === "string" && q.question &&
    Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= MAX_OPZIONI &&
    q.options.every((o) => o && typeof o.label === "string" && o.label));
}

export const statoIniziale = () => ({ passo: 0, pagina: 0, risposte: {}, scelte: [] });

const pagina = (verso, testo, sub, avanti = true) => ({ tipo: "pagina", verso, testo, sub, avanti });
const VUOTO = { tipo: "vuoto" };

// Che cosa mostra ognuno dei tre tasti, per la domanda al passo corrente.
//   opzione  { indice, label }             scelta singola: la pressione risponde
//   scelta   { indice, label, scelta }     scelta multipla: la pressione spunta/toglie
//   conferma { n }                         scelta multipla: risponde con le spuntate
//   pagina   { verso, testo, sub, avanti } porta alla pagina `verso`
//   domanda                                il testo della domanda (premuto apre la sessione)
//   vuoto                                  niente da fare
export function facce(req, stato = statoIniziale()) {
  const qs = req?.toolInput?.questions ?? [];
  const q = qs[stato.passo];
  if (!q) return [null, null, null];
  if (q.multiSelect) {
    const scelte = stato.scelte ?? [];
    const s = q.options.map((o, indice) => ({ tipo: "scelta", indice, label: o.label, scelta: scelte.includes(indice) }));
    const conferma = { tipo: "conferma", n: scelte.length };
    if (s.length === 2) return [s[0], conferma, s[1]];
    if (stato.pagina === 0) return [s[0], pagina(1, "altre", s.length === 3 ? "opzione 3" : "opzioni 3-4"), s[1]];
    if (stato.pagina === 1) return [s[2], pagina(2, "avanti", "per confermare"), s[3] ?? VUOTO];
    return [pagina(0, "indietro", "opzioni 1-2", false), conferma, VUOTO];
  }
  const opz = q.options.map((o, indice) => ({ tipo: "opzione", indice, label: o.label }));
  if (opz.length === 2) return [opz[0], { tipo: "domanda" }, opz[1]];
  if (opz.length === 3) return [opz[0], opz[1], opz[2]];
  return stato.pagina === 0
    ? [opz[0], pagina(1, "altre 2", "opzioni 3-4"), opz[1]]
    : [opz[2], pagina(0, "altre 2", "opzioni 1-2", false), opz[3]];
}

// L'impronta di ciò che un tasto ha disegnato: la pressione vale solo se coincide con
// quella di adesso (una spunta cambiata, una pagina girata, un passo avanti la cambiano).
export function chiaveFaccia(stato, f) {
  if (!f) return null;
  const extra = f.tipo === "scelta" ? `:${f.scelta ? 1 : 0}` : f.tipo === "conferma" ? `:${f.n}` : "";
  return `${stato.passo}:${stato.pagina}:${f.tipo}:${f.indice ?? f.verso ?? ""}${extra}`;
}

// Una pressione sul tasto `slot`. Ritorna lo stato nuovo e, se era l'ultima risposta,
// le risposte complete da mandare a Claude: { stato, risposte|null, nulla? }.
// Una risposta a scelta multipla è l'elenco delle etichette, nell'ordine delle opzioni.
export function premi(req, stato, slot) {
  const qs = req?.toolInput?.questions ?? [];
  const faccia = facce(req, stato)[slot];
  const nulla = { stato, risposte: null, nulla: true };
  if (!faccia || faccia.tipo === "domanda" || faccia.tipo === "vuoto") return nulla;
  if (faccia.tipo === "pagina") return { stato: { ...stato, pagina: faccia.verso }, risposte: null };
  if (faccia.tipo === "scelta") {
    const scelte = stato.scelte ?? [];
    const nuove = scelte.includes(faccia.indice) ? scelte.filter((i) => i !== faccia.indice) : [...scelte, faccia.indice];
    return { stato: { ...stato, scelte: nuove }, risposte: null };
  }
  const q = qs[stato.passo];
  let risposta;
  if (faccia.tipo === "conferma") {
    if (!faccia.n) return nulla; // niente spuntato: non si conferma il vuoto
    risposta = [...stato.scelte].sort((a, b) => a - b).map((i) => q.options[i].label);
  } else {
    risposta = faccia.label;
  }
  const risposte = { ...stato.risposte, [q.question]: risposta };
  if (stato.passo + 1 < qs.length) {
    return { stato: { passo: stato.passo + 1, pagina: 0, risposte, scelte: [] }, risposte: null };
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
