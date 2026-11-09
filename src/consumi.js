// Da dove vengono i consumi dell'abbonamento (Session 5h, Weekly, Model), senza I/O.
// Provato da test/consumi.test.js.
//
// Le fonti sono tre, e le prime due non costano niente (la barra di stato, più sotto,
// è la più fresca; il file di Desktop il ripiego senza configurazione):
//
// 1. Il file in cui Claude Desktop salva da sé le percentuali,
//    `plan-usage-history.json`. Un campione ogni pochi minuti, `{t, org, u:{fh, sd,
//    so, sn}}`: 5 ore, 7 giorni, Opus e Sonnet della settimana, in percento. Non ha
//    l'ora di reset né i limiti per modello più nuovi (Fable). È un formato interno
//    di Desktop, non documentato: lo si legge con tolleranza, e un campione che non
//    ha la forma attesa non c'è.
// 2. L'endpoint `api/oauth/usage`, con il token di Claude Code. Ha tutto, ma il suo
//    limite è PER ACCOUNT e lo condividono tutte le sessioni di Claude Code, che lo
//    interrogano anche loro: con molte sessioni aperte risponde 429 per ore, e
//    riaccendere il PC non cambia niente (anthropics/claude-code #77477, #31637,
//    #30930; visto sul deck il 09/11/2026). Quindi lo si chiama solo quando il file
//    di Desktop non basta, di rado, e rispettando il `retry-after` che manda.

// ---------- l'endpoint ----------

export function pickBucket(o) {
  if (!o || typeof o !== "object") return null;
  let pct = null;
  // L'endpoint dà la percentuale in 0–100 (13 = 13%): la si prende com'è. Una vecchia
  // euristica 0–1 portava l'1% esatto al 100%.
  if (typeof o.utilization === "number") pct = o.utilization;
  const resetsAt = o.resets_at ?? o.resetsAt ?? null;
  return pct == null && !resetsAt ? null : { pct, resetsAt };
}

// La risposta dell'endpoint nella forma dei tasti.
export function usageDaRisposta(j) {
  const limits = Array.isArray(j?.limits) ? j.limits : [];
  const fromLimit = (kind) => {
    const l = limits.find((x) => x.kind === kind);
    return l ? { pct: l.percent, resetsAt: l.resets_at } : null;
  };
  const scoped = limits.find((x) => x.kind === "weekly_scoped");
  // Ogni limite per modello che l'account espone, per il tasto Model.
  const models = [];
  for (const l of limits) {
    if (l.kind !== "weekly_scoped") continue;
    const name = l.scope?.model?.display_name;
    if (name && typeof l.percent === "number") models.push({ name, pct: l.percent, resetsAt: l.resets_at ?? null });
  }
  for (const [key, name] of [["seven_day_opus", "Opus"], ["seven_day_sonnet", "Sonnet"]]) {
    const b = pickBucket(j?.[key]);
    if (b?.pct != null && !models.some((m) => m.name === name)) models.push({ name, pct: b.pct, resetsAt: b.resetsAt });
  }
  return {
    fiveHour: pickBucket(j?.five_hour) ?? fromLimit("session"),
    weekly: pickBucket(j?.seven_day) ?? fromLimit("weekly_all"),
    weeklyOpus: pickBucket(j?.seven_day_opus),
    scopedPct: scoped?.percent ?? null,
    scopedName: scoped?.scope?.model?.display_name ?? null,
    models,
  };
}

// ---------- il file di Claude Desktop ----------

// Dove Claude Desktop tiene il file. Su Windows dipende da come è installato, e si
// guardano tutti i posti noti; vince il campione più recente:
// - `%LOCALAPPDATA%\Claude-Data\<pacchetto>\`: la build del Microsoft Store di oggi
//   (`claude_pzs8sxrjxfjjc`, trovata sul PC di Enrico il 09/11/2026);
// - `%APPDATA%\Claude\`: quella riportata nelle segnalazioni su GitHub;
// - `%LOCALAPPDATA%\Packages\Claude_<id>\LocalCache\Roaming\Claude\`: dove un'app
//   MSIX scrive l'AppData virtualizzato.
export const FILE_DESKTOP = "plan-usage-history.json";
export function percorsiDesktop({ platform, env = {}, home, listDir = () => [] }) {
  const out = [];
  if (platform === "darwin") {
    out.push(`${home}/Library/Application Support/Claude/${FILE_DESKTOP}`);
    return out;
  }
  if (platform === "win32") {
    const sep = "\\";
    const roaming = env.APPDATA || `${home}${sep}AppData${sep}Roaming`;
    const local = env.LOCALAPPDATA || `${home}${sep}AppData${sep}Local`;
    const dati = `${local}${sep}Claude-Data`;
    for (const nome of listDir(dati)) out.push(`${dati}${sep}${nome}${sep}${FILE_DESKTOP}`);
    out.push(`${roaming}${sep}Claude${sep}${FILE_DESKTOP}`);
    const pacchetti = `${local}${sep}Packages`;
    for (const nome of listDir(pacchetti)) {
      if (/^Claude_/i.test(nome)) out.push(`${pacchetti}${sep}${nome}${sep}LocalCache${sep}Roaming${sep}Claude${sep}${FILE_DESKTOP}`);
    }
    return out;
  }
  // Linux: Desktop non c'è ufficialmente; la cartella di Electron, se mai ci fosse.
  out.push(`${env.XDG_CONFIG_HOME || `${home}/.config`}/Claude/${FILE_DESKTOP}`);
  return out;
}

const percento = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1000 ? v : null);
const bucket = (v) => (percento(v) == null ? null : { pct: v, resetsAt: null });

// L'ultimo campione del file nella forma dei tasti, o null. `at` è l'istante del
// campione (ms): è da lì, non dal file, che si giudica quanto è fresco.
export function letturaDesktop(raw) {
  let j;
  try { j = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return null; }
  const samples = Array.isArray(j?.samples) ? j.samples : Array.isArray(j) ? j : [];
  let best = null;
  for (const s of samples) {
    const t = typeof s?.t === "number" ? s.t : Date.parse(s?.t);
    if (!Number.isFinite(t) || !s?.u || typeof s.u !== "object") continue;
    if (percento(s.u.fh) == null && percento(s.u.sd) == null) continue;
    if (!best || t > best.t) best = { t, u: s.u };
  }
  if (!best) return null;
  const { u } = best;
  const models = [];
  if (percento(u.so) != null) models.push({ name: "Opus", pct: u.so, resetsAt: null });
  if (percento(u.sn) != null) models.push({ name: "Sonnet", pct: u.sn, resetsAt: null });
  return {
    at: best.t,
    usage: {
      fiveHour: bucket(u.fh),
      weekly: bucket(u.sd),
      weeklyOpus: bucket(u.so),
      scopedPct: null,
      scopedName: null,
      models,
    },
  };
}

// Il file c'è ma non se ne è tirato fuori niente: com'è fatto, per il log. Solo i
// nomi dei campi, mai i valori (ci sono gli id dell'organizzazione).
export function formaDesktop(raw) {
  let j;
  try { j = JSON.parse(raw); } catch { return "not JSON"; }
  const chiavi = (o) => (o && typeof o === "object" && !Array.isArray(o) ? Object.keys(o).join(",") : typeof o);
  const samples = Array.isArray(j?.samples) ? j.samples : Array.isArray(j) ? j : null;
  if (!samples) return `top {${chiavi(j)}}`;
  const ultimo = samples[samples.length - 1];
  return `${samples.length} samples, last {${chiavi(ultimo)}}, u {${chiavi(ultimo?.u)}}`;
}

// ---------- la barra di stato di Claude Code ----------
// A ogni aggiornamento Claude Code passa alla barra di stato `rate_limits`: le stesse
// percentuali che riceve con ogni risposta, dalle intestazioni della risposta e non
// dall'endpoint dei consumi, quindi fresche anche mentre l'endpoint risponde 429.
// `{five_hour:{used_percentage, resets_at}, seven_day:{…}}`, percento 0–100 e
// resets_at in secondi (code.claude.com/docs/en/statusline; anthropics/claude-code
// #92081). Una finestra che quella sessione non conosce ancora manca dall'oggetto:
// non è uno zero.
const istante = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n < 1e12 ? n * 1000 : n).toISOString();
};
export function letturaStatusline(payload, now) {
  const rl = payload?.rate_limits;
  if (!rl || typeof rl !== "object") return null;
  const fin = (w) => (percento(w?.used_percentage) == null ? null : { pct: w.used_percentage, resetsAt: istante(w.resets_at) });
  const fiveHour = fin(rl.five_hour), weekly = fin(rl.seven_day);
  if (!fiveHour && !weekly) return null;
  return { at: now, usage: { fiveHour, weekly, weeklyOpus: null, scopedPct: null, scopedName: null, models: [] } };
}

// La riga che la barra di stato mostra: modello, cartella, le due percentuali.
export function rigaStatusline(payload) {
  const parti = [];
  const modello = payload?.model?.display_name;
  if (typeof modello === "string" && modello) parti.push(modello);
  const dir = payload?.workspace?.current_dir ?? payload?.cwd;
  if (typeof dir === "string" && dir) parti.push(dir.split(/[\\/]/).filter(Boolean).pop() ?? dir);
  const rl = payload?.rate_limits;
  const p = (w) => (percento(w?.used_percentage) == null ? null : Math.round(w.used_percentage));
  if (p(rl?.five_hour) != null) parti.push(`5h ${p(rl.five_hour)}%`);
  if (p(rl?.seven_day) != null) parti.push(`7d ${p(rl.seven_day)}%`);
  return parti.join(" · ");
}

// Il pezzo da incollare in ~/.claude/settings.json. `curl` manda alla porta del plugin
// ciò che Claude Code passa alla barra di stato e stampa la riga che il plugin
// risponde; a plugin spento non stampa niente, e dopo due secondi lascia perdere.
// Su Windows `curl.exe`, che c'è da Windows 10 e si chiama uguale da cmd, PowerShell
// e Git Bash (in Windows PowerShell `curl` è un altro comando).
export function statuslineFragment(url, { windows = false } = {}) {
  // `"@-"` fra virgolette: in PowerShell una @ nuda all'inizio di un argomento è
  // l'operatore di splatting.
  const command = `${windows ? "curl.exe" : "curl"} -s -m 2 --data-binary "@-" ${url}`;
  return ['"statusLine": {', '  "type": "command",', `  "command": ${JSON.stringify(command)}`, "}"].join("\n");
}

// ---------- quanto vale una finestra ----------
// Dall'endpoint un numero si mostra com'è: se l'ora di reset è passata il tasto dice
// «resetting…» e il giro lo rilegge subito. Le fonti locali (Desktop, barra di stato)
// non si rileggono a comando, e un numero di una finestra già ripartita non dice
// niente di adesso: non si mostra. Decide l'ora di reset se c'è, se no l'età della
// lettura contro la durata della finestra — un campione di Desktop più vecchio di
// cinque ore viene per forza da una finestra chiusa.
export const CINQUE_ORE_MS = 5 * 3.6e6;
export const SETTE_GIORNI_MS = 7 * 24 * 3.6e6;
export const daEndpoint = (src) => !src || src === "api";
export function finestraValida(b, src, at, now, durataMs) {
  if (!b || daEndpoint(src)) return b ?? null;
  if (b.resetsAt) return new Date(b.resetsAt).getTime() > now ? b : null;
  return now - (at ?? 0) < durataMs ? b : null;
}
export const cinqueOre = (usage, src, at, now) => finestraValida(usage?.fiveHour ?? null, src, at, now, CINQUE_ORE_MS);

// ---------- mettere insieme le due ----------

export const FRESCA_MS = 30 * 60_000; // la stessa soglia di USAGE_FRESH_MS (usage.js)
const futuro = (iso, now) => !!iso && new Date(iso).getTime() > now;

// Una lettura locale (Desktop: niente ore di reset né Fable; barra di stato: niente
// Opus, Sonnet, Fable, e a volte una finestra che manca) completata con la lettura di
// prima, quando questa vale ancora: l'ora di reset solo se è nel futuro (quella
// finestra non è ancora ripartita, quindi è la stessa); una finestra o un modello che
// mancano solo se la lettura di prima è fresca, e la sua finestra non è ripartita.
export function completa(nuova, vecchia, vecchiaAt, now) {
  if (!vecchia) return nuova;
  const fresca = now - (vecchiaAt ?? 0) < FRESCA_MS;
  const unisci = (b, old) => {
    if (!b) return fresca && old && (!old.resetsAt || futuro(old.resetsAt, now)) ? old : null;
    return b.resetsAt == null && futuro(old?.resetsAt, now) ? { ...b, resetsAt: old.resetsAt } : b;
  };
  const models = nuova.models.map((m) => unisci(m, (vecchia.models ?? []).find((o) => o.name === m.name)));
  if (fresca) for (const o of vecchia.models ?? []) if (!models.some((m) => m.name === o.name)) models.push(o);
  return {
    ...nuova,
    fiveHour: unisci(nuova.fiveHour, vecchia.fiveHour),
    weekly: unisci(nuova.weekly, vecchia.weekly),
    weeklyOpus: unisci(nuova.weeklyOpus, vecchia.weeklyOpus),
    scopedPct: nuova.scopedPct ?? (fresca ? vecchia.scopedPct ?? null : null),
    scopedName: nuova.scopedName ?? (fresca ? vecchia.scopedName ?? null : null),
    models,
  };
}

// ---------- quando chiamare l'endpoint ----------

export const API_BASE_MS = 5 * 60_000;
export const API_MAX_MS = 30 * 60_000;
// Con una fonte locale fresca (Desktop o la barra di stato) l'endpoint serve solo per
// Fable e, per Desktop, le ore di reset: una volta ogni mezz'ora basta, e lascia il
// limite dell'account alle sessioni.
export const DESKTOP_BASTA_MS = 10 * 60_000;
export const API_CON_DESKTOP_MS = 30 * 60_000;

export function serveEndpoint({ now, usageAt, src, apiOkAt }) {
  const localeFresca = !daEndpoint(src) && now - (usageAt ?? 0) < DESKTOP_BASTA_MS;
  if (!localeFresca) return true;
  return now - (apiOkAt ?? 0) >= API_CON_DESKTOP_MS;
}

// Il prossimo ritardo dopo un 429: il doppio di prima, ma mai meno di quanto dice
// `retry-after` (in secondi; «0», che l'endpoint a volte manda, non vuol dire niente)
// e mai oltre API_MAX_MS.
export function ritardoDopo429(attuale, retryAfter) {
  const ra = Number(retryAfter);
  const dalServer = Number.isFinite(ra) && ra > 0 ? ra * 1000 : 0;
  return Math.min(Math.max(attuale * 2, dalServer, API_BASE_MS), API_MAX_MS);
}
