// Da dove vengono i consumi dell'abbonamento (Session 5h, Weekly, Model), senza I/O.
// Provato da test/consumi.test.js.
//
// Le fonti sono due, e la prima non costa niente:
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

// Dove Claude Desktop tiene il file. Su Windows Desktop arriva anche dal Microsoft
// Store, e un'app MSIX scrive l'AppData virtualizzato sotto il suo pacchetto
// (`%LOCALAPPDATA%\Packages\Claude_<id>\LocalCache\Roaming`), non in `%APPDATA%`:
// si guardano tutti e due, e vince il campione più recente.
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

// ---------- mettere insieme le due ----------

export const FRESCA_MS = 30 * 60_000; // la stessa soglia di USAGE_FRESH_MS (usage.js)
const futuro = (iso, now) => !!iso && new Date(iso).getTime() > now;

// Una lettura di Desktop (senza ore di reset né Fable) completata con la lettura di
// prima, quando questa vale ancora: l'ora di reset solo se è nel futuro (quella
// finestra non è ancora ripartita, quindi è la stessa), i limiti per modello che
// Desktop non ha solo se la lettura di prima è fresca.
export function completa(nuova, vecchia, vecchiaAt, now) {
  if (!vecchia) return nuova;
  const reset = (b, old) => (b && b.resetsAt == null && futuro(old?.resetsAt, now) ? { ...b, resetsAt: old.resetsAt } : b);
  const fresca = now - (vecchiaAt ?? 0) < FRESCA_MS;
  const models = nuova.models.map((m) => reset(m, (vecchia.models ?? []).find((o) => o.name === m.name)));
  if (fresca) for (const o of vecchia.models ?? []) if (!models.some((m) => m.name === o.name)) models.push(o);
  return {
    ...nuova,
    fiveHour: reset(nuova.fiveHour, vecchia.fiveHour),
    weekly: reset(nuova.weekly, vecchia.weekly),
    weeklyOpus: reset(nuova.weeklyOpus, vecchia.weeklyOpus),
    scopedPct: nuova.scopedPct ?? (fresca ? vecchia.scopedPct ?? null : null),
    scopedName: nuova.scopedName ?? (fresca ? vecchia.scopedName ?? null : null),
    models,
  };
}

// ---------- quando chiamare l'endpoint ----------

export const API_BASE_MS = 5 * 60_000;
export const API_MAX_MS = 30 * 60_000;
// Con Desktop fresco l'endpoint serve solo per le ore di reset e Fable: una volta
// ogni mezz'ora basta, e lascia il limite dell'account alle sessioni.
export const DESKTOP_BASTA_MS = 10 * 60_000;
export const API_CON_DESKTOP_MS = 30 * 60_000;

export function serveEndpoint({ now, usageAt, src, apiOkAt }) {
  const desktopFresco = src === "desktop" && now - (usageAt ?? 0) < DESKTOP_BASTA_MS;
  if (!desktopFresco) return true;
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
