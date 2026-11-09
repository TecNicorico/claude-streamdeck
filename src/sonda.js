// La sonda dei consumi, senza I/O. Provata da test/sonda.test.js.
//
// Ogni sessione di Claude Code riceve, con ogni risposta, le percentuali dell'account
// (5 ore e settimana) e in modalità `--print --output-format stream-json` le scrive
// come `rate_limit_event`:
//   {"type":"rate_limit_event","rate_limit_info":{…,"unifiedWindows":{
//     "five_hour":{"utilization":0.07,"resetsAt":1794240000,"status":"allowed"},
//     "seven_day":{"utilization":0.12,"resetsAt":1794603600,"status":"allowed"}}}}
// (utilization 0–1, resetsAt in secondi; provato con Claude Code 2.1.319 il
// 09/11/2026). Quando nessuna sessione nel terminale alimenta la barra di stato,
// il plugin fa partire lui una richiesta minima — Haiku, nessuno strumento, nessun
// MCP, nessuna impostazione dell'utente (quindi nessun suo hook), niente salvato su
// disco — e legge quell'evento. Misurata: ~5 s, ~1.400 token d'ingresso quasi tutti
// in cache dopo la prima, 4 d'uscita. È l'unica fonte fresca che non chiede né un
// terminale aperto né l'endpoint dei consumi, che con molte sessioni risponde 429.

export const SONDA_MS = 10 * 60_000;       // al più una ogni dieci minuti
export const SONDA_TIMEOUT_MS = 60_000;
export const SONDA_ERRORE_MS = 30 * 60_000; // dopo un errore, mezz'ora
export const NOME_CARTELLA = "agent-vitals-sonda";

// Gli argomenti. `--tools=` con l'uguale e non `--tools ""`: un argomento vuoto non
// arriva intero da ogni shell di Windows, e senza strumenti la richiesta è minima.
// `--setting-sources project` con la cartella della sonda come cwd: nessuna
// impostazione dell'utente, quindi né i suoi hook né la sua barra di stato.
export const ARGOMENTI_SONDA = [
  "-p", "ok",
  "--model", "haiku",
  "--tools=",
  "--strict-mcp-config",
  "--setting-sources", "project",
  "--no-session-persistence",
  "--system-prompt", "Reply with: ok",
  "--output-format", "stream-json",
  "--verbose",
  "--max-turns", "1",
];

const percento01 = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10 ? Math.round(v * 1000) / 10 : null);
const istante = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n < 1e12 ? n * 1000 : n).toISOString();
};

// L'ultimo `rate_limit_event` con le finestre, nella forma dei tasti, o null.
export function letturaSonda(stdout, now) {
  let ultimo = null;
  for (const riga of String(stdout ?? "").split(/\r?\n/)) {
    if (!riga.includes("rate_limit_event")) continue;
    let e;
    try { e = JSON.parse(riga); } catch { continue; }
    const w = e?.type === "rate_limit_event" ? e.rate_limit_info?.unifiedWindows : null;
    if (w && typeof w === "object") ultimo = w;
  }
  if (!ultimo) return null;
  const fin = (x) => (percento01(x?.utilization) == null ? null : { pct: percento01(x.utilization), resetsAt: istante(x.resetsAt) });
  const fiveHour = fin(ultimo.five_hour), weekly = fin(ultimo.seven_day);
  if (!fiveHour && !weekly) return null;
  return { at: now, usage: { fiveHour, weekly, weeklyOpus: null, scopedPct: null, scopedName: null, models: [] } };
}

// Partire o no. Solo se c'è un tasto dei consumi a schermo, se la sonda non è spenta,
// se nessuna fonte ha dato un numero negli ultimi dieci minuti (la barra di stato del
// terminale, che è gratis, ha la precedenza), e mai più di una ogni dieci minuti.
export function serveSonda({ now, visibile, spenta = false, usageAt = 0, ultimaAt = 0, erroreAt = 0, forza = false }) {
  if (spenta || !visibile) return false;
  if (now - erroreAt < (forza ? 60_000 : SONDA_ERRORE_MS)) return false;
  if (forza) return now - ultimaAt >= 60_000;
  if (now - usageAt < SONDA_MS) return false;
  return now - ultimaAt >= SONDA_MS;
}

// Dove può essere Claude Code. Lo Stream Deck parte con il PATH del login, e su macOS
// quello di un'app grafica non ha né ~/.local/bin né Homebrew: si guardano prima i
// posti dell'installatore nativo e di npm, poi il PATH.
export function candidatiClaude({ platform, env = {}, home }) {
  const out = [];
  const win = platform === "win32";
  const sep = win ? "\\" : "/";
  const nomi = win ? ["claude.exe", "claude.cmd"] : ["claude"];
  if (win) {
    out.push(`${home}\\.local\\bin\\claude.exe`);
    if (env.APPDATA) out.push(`${env.APPDATA}\\npm\\claude.cmd`);
  } else {
    out.push(`${home}/.local/bin/claude`, "/opt/homebrew/bin/claude", "/usr/local/bin/claude", `${home}/.claude/local/claude`);
  }
  for (const dir of String(env.PATH ?? env.Path ?? "").split(win ? ";" : ":")) {
    if (!dir) continue;
    for (const n of nomi) out.push(`${dir.replace(/[\\/]+$/, "")}${sep}${n}`);
  }
  return [...new Set(out)];
}

// Una sessione che è la sonda (la riconosce la cartella da cui parte): i tasti delle
// sessioni non la devono contare.
export function eSonda(sessione, cartella) {
  const a = String(sessione?.cwd ?? "").replace(/[\\/]+$/, "").toLowerCase();
  const b = String(cartella ?? "").replace(/[\\/]+$/, "").toLowerCase();
  return !!a && a === b;
}

// Su Windows un .cmd (l'installazione da npm) si lancia solo da cmd.exe: la riga di
// comando, con le virgolette dove servono.
export function rigaCmd(eseguibile, args) {
  const q = (s) => (/[\s"&|<>^]/.test(s) || s === "" ? `"${String(s).replace(/"/g, '""')}"` : s);
  return `"${q(eseguibile).replace(/^"|"$/g, "")}" ${args.map(q).join(" ")}`;
}
