// What each key should look like, as a pure function of state.
//
// This is the state -> pixels mapping, lifted out of plugin.js so it can be
// tested without a Stream Deck, a websocket or a ~/.claude directory. Every recent
// display bug lived in here (the Sessions cycle label, the Status sub-line, the
// Focus pool index) and none of it was reachable from a test before.
//
// The contract is deliberately narrow: viewFor() returns the image to draw and,
// for the approve keys, a record of what it painted. It never touches a socket and
// never mutates anything the caller owns — the caller applies both.
import path from "node:path";
import {
  C, gaugeKey, linesKey, bigCountKey, burnKey, usageMeterKey, labelKey, actionKey,
  statusKey, fmtNum, aCapo, decisioneKey, opzioneKey, paginaKey, domandaKey, infoKey, iconaStrumento,
} from "./keyart.js";
import { budgetPct, gaugeSource, familyOf } from "./usage.js";
import {
  resolveStatusKey, statusEntry, sessionWhere, fmtShort, shortWait, sessionState,
  blockedSessions, titoloSessione,
} from "./status.js";
import { approvable, approvableDepth, isQuestion, describeRequest } from "./approve.js";
import { SLOT, facce, testoDomanda, statoIniziale } from "./domande.js";
import { classifica, etichetta, bersaglio, confDa } from "./supabase.js";

// The state a request still held in the approver queue implies for one session, or null.
// Read by every key that asks "is this session blocked", because for a VS Code session
// (which writes no status of its own) the queue is the only place that answer exists.
const pendKindOf = (state, s) => state.pending?.get(s?.sessionId)?.kind ?? null;

// A blocked session can sit unanswered all night, and unlike the other ticker
// animations this state does not self-terminate. Breathe long enough to catch the
// eye, then hold static instead of pushing frames until morning.
export const PULSE_MS = 120_000;

// ---------- formatting ----------
// `now` is injected for the same reason viewFor injects it: without it the three
// gauge keys' countdown text depends on the real wall clock, which quietly breaks
// viewFor's purity contract and makes the countdown impossible to assert on.
export function fmtReset(iso, now = Date.now()) {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - now;
  if (!isFinite(ms) || ms <= 0) return "resetting…";
  const h = Math.floor(ms / 3.6e6), m = Math.round((ms % 3.6e6) / 6e4);
  if (h >= 48) return `${Math.round(h / 24)}d left`;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export function fmtAgo(ms) {
  const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ---------- gauge sourcing ----------
// Which local window each gauge key needs when it falls back.
export const GAUGE_WINDOW = { "usage-session": "5h", "usage-weekly": "7day", "usage-model": "7day" };

// Source for the gauge keys. Kept in one place so the poller and all three render
// cases can never disagree about which mode they are in.
export function gaugeMode(state, kind, now) {
  const win = GAUGE_WINDOW[kind];
  const hasLocal = !!(win && state.usageMeter?.[win]);
  return gaugeSource({ usage: state.usage, usageErr: state.usageErr, usageAt: state.usageAt, now }, hasLocal);
}

// A gauge key rendered from local transcript data. With a budget it becomes the
// familiar ring (gaugeKey clamps the drawn bar at 100%, so an overage is carried
// in the sub-line instead); without one it shows the absolute spend. A missing
// aggregate renders "--" — never "$0.00", which would claim zero spend on a
// machine that has spent hundreds today.
export function localGauge(header, agg, budget, view = "cost", animPhase = null) {
  if (!agg) return usageMeterKey(header, "--", "no data yet", true);
  // Token view: the grand total big, with the plain input/output split beneath,
  // since that is what you compare against a provider's per-token billing.
  if (view === "tokens") {
    return usageMeterKey(header, fmtNum(agg.tokens), `${fmtNum(agg.in)} in · ${fmtNum(agg.out)} out`, false);
  }
  const pct = budgetPct(agg.cost, budget);
  if (pct == null) return usageMeterKey(header, "$" + agg.cost.toFixed(2), "est", true);
  const over = pct > 100 ? " · " + Math.round(pct) + "%" : "";
  return gaugeKey(header, pct, `$${Math.round(agg.cost)} / $${Math.round(Number(budget))}${over}`, pct >= 90 ? animPhase : null);
}

// The models a Model key can rotate through: subscription buckets, or the local
// per-family split. One shape for both so the render/press paths agree.
export function modelList(state, mode) {
  if (mode === "local") return state.usageMeterModels ?? [];
  return state.usage?.models ?? [];
}

// Index this key is showing: an explicit press wins, else the configured model
// (matched by family, since a name saved from API days won't equal "opus"), else
// the first (priciest / highest) entry.
export function modelListIndex(pressed, list, want) {
  if (pressed != null && list.length) return pressed % list.length;
  if (!want || !list.length) return 0;
  const w = String(want).toLowerCase();
  const byName = list.findIndex((e) => String(e.name ?? e.model).toLowerCase() === w);
  if (byName >= 0) return byName;
  const fam = familyOf(w) ?? w;
  const byFam = list.findIndex((e) => String(e.model ?? e.name).toLowerCase() === fam);
  return byFam >= 0 ? byFam : 0;
}

// Projects time-to-cap from the trend of 5h utilization samples.
export function sessionEta(state, now) {
  // pctHistory is fed only from the subscription 5h percentage, so on an account
  // without one it stays empty forever and this used to read "measuring…"
  // indefinitely — implying a number was coming that never would. Say what is
  // actually true instead; the tok/hr figure above it is still real.
  if (gaugeMode(state, "usage-session", now) !== "subscription") {
    const b5 = state.usageMeter?.["5h"];
    return b5 ? "$" + b5.cost.toFixed(2) + " last 5h" : "no cap";
  }
  const h = state.pctHistory ?? [];
  if (h.length < 2) return "measuring…";
  const latest = h[h.length - 1];
  const past = h.find((s) => latest.t - s.t >= 10 * 60_000) ?? h[0];
  const dt = latest.t - past.t;
  if (dt < 4 * 60_000) return "measuring…";
  const slope = (latest.pct - past.pct) / dt;
  if (slope <= 5e-8) return "steady";
  const msLeft = (100 - latest.pct) / slope;
  const resetMs = state.usage?.fiveHour?.resetsAt ? new Date(state.usage.fiveHour.resetsAt).getTime() - latest.t : Infinity;
  if (msLeft >= resetMs) return "resets first";
  const hh = Math.floor(msLeft / 3.6e6), mm = Math.round((msLeft % 3.6e6) / 6e4);
  return hh > 0 ? `cap in ~${hh}h ${mm}m` : `cap in ~${mm}m`;
}

// ---------- tasti che fanno da riga in basso ----------
// Un tasto che si limita a mostrare (i consumi, il conteggio delle sessioni…) può
// prendere il posto di un tasto della riga in basso finché c'è una richiesta in attesa:
// lo dice la sua impostazione `slot`. Senza richieste torna a mostrare ciò che mostrava.
// Solo tasti che mostrano e basta: uno che apre una finestra o un'app, cambiando faccia
// sotto il dito, farebbe qualcosa che la persona non ha scelto.
export const TASTI_CON_SLOT = new Set(["usage-session", "usage-weekly", "usage-model", "burn-rate", "today", "usage-meter", "sessions"]);
export const SLOT_VALIDI = new Set(["approve-deny", "approve-always", "approve-allow"]);
export function slotDi(kind, settings) {
  const s = settings?.slot;
  return TASTI_CON_SLOT.has(kind) && SLOT_VALIDI.has(s) ? s : null;
}
// Che cosa disegna (e a cosa risponde) adesso un tasto di tipo `kind`.
export function tipoDaMostrare(kind, settings, queue) {
  const slot = slotDi(kind, settings);
  return slot && approvable(queue) ? slot : kind;
}

// ---------- the view ----------
// `env` carries everything the switch used to read from module scope:
//   state           the data state (usage, sessions, approveQueue, …)
//   settings        this key's own settings ({} when unset)
//   now             injected clock
//   animPhase       ticker phase, or null to hold still
//   usageViewMode   "cost" | "tokens" (the Usage/local-gauge press toggle)
//   pressedModelIdx explicit Model-key rotation index, or null
//   cycleIdx        active cycle offset, or -1 when not cycling
//   focus           Focus key's remembered { i, sig }, or null
//   autoSlot        slot for an unbound Status key
//   authFlagged     repeated wrong-path hits on the hook port
//   defaultCodeDir  target of the Claude Code Terminal key
//
// Returns { image, painted }. `painted` is set only by the approve keys, which must
// record the request id and rule they actually drew so a press cannot answer
// something the user never saw; the caller stores it.
export function viewFor(kind, env) {
  const {
    state, settings = {}, now, animPhase = null, usageViewMode = "cost",
    pressedModelIdx = null, cycleIdx = -1, focus = null, autoSlot = 0,
    defaultCodeDir = "",
  } = env;
  const img = (image) => ({ image });

  switch (kind) {
    case "usage-session": {
      const mode = gaugeMode(state, "usage-session", now);
      if (mode === "local") return img(localGauge("LAST 5H", state.usageMeter?.["5h"], settings.budget, usageViewMode, animPhase));
      if (mode !== "subscription") return img(gaugeKey("SESSION 5H", null, mode === "throttled" ? "throttled" : mode === "error" ? "sign in?" : "no data"));
      const b = state.usage?.fiveHour;
      return img(gaugeKey("SESSION 5H", b?.pct ?? null, b ? fmtReset(b.resetsAt, now) : "no data", b?.pct >= 90 ? animPhase : null));
    }
    case "usage-weekly": {
      const mode = gaugeMode(state, "usage-weekly", now);
      if (mode === "local") return img(localGauge("LAST 7D", state.usageMeter?.["7day"], settings.budget, usageViewMode, animPhase));
      if (mode !== "subscription") return img(gaugeKey("WEEKLY", null, mode === "throttled" ? "throttled" : mode === "error" ? "sign in?" : "no data"));
      const b = state.usage?.weekly;
      const u = state.usage;
      const sub = u?.scopedPct != null && u.scopedName
        ? `${u.scopedName} ${Math.round(u.scopedPct)}%`
        : u?.weeklyOpus?.pct != null ? `opus ${Math.round(u.weeklyOpus.pct)}%`
        : b ? fmtReset(b.resetsAt, now) : "no data";
      return img(gaugeKey("WEEKLY", b?.pct ?? null, sub, b?.pct >= 90 ? animPhase : null));
    }
    case "usage-model": {
      const mmode = gaugeMode(state, "usage-model", now);
      if (mmode !== "subscription" && mmode !== "local") {
        return img(gaugeKey("MODEL 7D", null, mmode === "throttled" ? "throttled" : mmode === "error" ? "sign in?" : "no data"));
      }
      const list = modelList(state, mmode);
      const want = settings.model;
      const i = modelListIndex(pressedModelIdx, list, want);
      const pick = list[i];
      const head_ = ((pick?.name ?? pick?.model ?? want ?? "MODEL") + "").toUpperCase().slice(0, 8) + " 7D";
      const more = list.length > 1 ? ` ${i + 1}/${list.length}` : "";
      if (!pick) return img(usageMeterKey(head_, "--", mmode === "local" ? "no data yet" : "no data", true));
      if (mmode === "local") {
        return img(localGauge(head_ + more, pick, settings.budget, usageViewMode, animPhase));
      }
      return img(gaugeKey(head_ + more, pick.pct ?? null, pick.resetsAt ? fmtReset(pick.resetsAt, now) : "no data", pick.pct >= 90 ? animPhase : null));
    }
    case "burn-rate":
      return img(burnKey(state.burn?.tokensHour ?? null, sessionEta(state, now)));
    case "project": {
      const label = settings.label || (settings.path ? path.basename(settings.path) : "");
      return img(labelKey("PROJECT", label || "configure", settings.path ? "" : "set folder in settings"));
    }
    case "focus-session": {
      // Blocked sessions take priority: pressing goes straight to the one that
      // needs you, and the key advertises that with the reason + a warm accent.
      const blocked = blockedSessions(state.sessions, now, state.activity, state.pending);
      const pool = blocked.length ? blocked : state.sessions;
      const poolSig = pool.map((x) => x.pid ?? x.sessionId).join(",");
      // Only trust the remembered index while the pool is unchanged; otherwise
      // show the top of the pool rather than a session the user never focused.
      const s = pool.length ? (focus && focus.sig === poolSig ? pool[focus.i % pool.length] : pool[0]) : null;
      if (blocked.length) {
        const b = s ?? blocked[0];
        return img(labelKey("FOCUS", b.name ?? "session", String(b.waitingFor ?? "needs you"), C.warn, true));
      }
      const anyWorking = state.sessions.some((x) => sessionState(x, now, state.activity.get(x.sessionId) ?? null, pendKindOf(state, x)) === "working");
      return img(labelKey("FOCUS", s ? s.name : `${state.sessions.length} sessions`, s ? sessionState(s, now, state.activity.get(s.sessionId) ?? null, pendKindOf(state, s)) : "press to cycle", anyWorking ? C.info : null));
    }
    case "quick-prompt":
      return img(labelKey("PROMPT", settings.label || "configure", settings.prompt ? "" : "set prompt in settings"));
    case "custom":
      return img(labelKey("CLAUDE", settings.label || "custom", settings.command ? "" : "set command in settings"));
    // These four used to have no case at all, so they never called setImage and kept
    // their manifest icon forever — three flat pieces of icon art next to seventeen
    // data panels, which is what ran two visual languages on one deck. Rendering them
    // costs the ability to set a custom image on these keys from the Stream Deck app.
    case "launch":
      return img(actionKey("launch", "launch", "Desktop", "claude app"));
    case "quick-chat":
      return img(actionKey("chat", "chat", "New chat", "claude desktop"));
    case "open-web":
      return img(actionKey("web", "claude.ai", "Open", "in browser"));
    case "claude-code":
      return img(actionKey("code", "code", "Terminal", "~/" + path.basename(defaultCodeDir)));
    case "sessions": {
      const n = state.sessions.length;
      if (cycleIdx >= 0 && state.sessions[cycleIdx]) {
        const s = state.sessions[cycleIdx];
        // Use the derived state, not the raw status: "waiting" is blocked-on-you,
        // and rendering it in success-green was the very bug phase 2 fixes.
        const st = sessionState(s, now, state.activity.get(s.sessionId) ?? null, pendKindOf(state, s));
        const stLabel = { "needs-approval": "needs you", "input-needed": "input needed", working: "working", finished: "done", idle: "idle" }[st] ?? st;
        const stColor = st === "needs-approval" ? C.warn : st === "input-needed" ? C.ask : st === "working" ? C.info : C.dim;
        return img(linesKey(`${cycleIdx + 1}/${n}`, [
          { text: (s.name ?? "session").slice(0, 11), big: false, color: C.text },
          { text: stLabel, color: stColor },
          { text: fmtAgo(now - (s.startedAt ?? now)) + " old", color: C.dim },
        ]));
      }
      // "waiting" means blocked on the human — never count that as working.
      const blocked = blockedSessions(state.sessions, now, state.activity, state.pending).length;
      const busy = state.sessions.filter((s) => sessionState(s, now, state.activity.get(s.sessionId) ?? null, pendKindOf(state, s)) === "working").length;
      const sub = blocked > 0 ? `${blocked} needs you` : busy > 0 ? `${busy} working` : n > 0 ? "all idle" : "none running";
      const subCol = blocked > 0 ? C.warn : busy > 0 ? C.info : C.dim;
      return img(bigCountKey("CLAUDE CODE", n, sub, subCol, busy > 0 ? animPhase : null, blocked > 0 ? C.warn : busy > 0 ? C.info : null, blocked > 0));
    }
    case "today": {
      const t = state.today;
      return img(linesKey("TODAY", [
        { text: `${t?.chats ?? "--"} chats`, color: C.text },
        { text: `${fmtNum(t?.msgs)} msgs`, color: C.text },
        { text: `${fmtNum(t?.tokens)} tok`, color: C.text },
      ]));
    }
    case "usage-meter": {
      const win = settings.window ?? "today";
      const header = { today: "TODAY", month: "THIS MONTH", "7day": "7-DAY" }[win] ?? "TODAY";
      const agg = state.usageMeter?.[win];
      const suffix = settings.label ? " · " + settings.label : "";
      if (!agg) return img(usageMeterKey(header, "--", "no data", usageViewMode === "cost"));
      if (usageViewMode === "cost") return img(usageMeterKey(header, "$" + agg.cost.toFixed(2), "cost" + suffix, true));
      return img(usageMeterKey(header, fmtNum(agg.tokens), agg.in != null ? `${fmtNum(agg.in)} in · ${fmtNum(agg.out)} out` : "tokens" + suffix, false));
    }
    case "approver-status": {
      const resolved = resolveStatusKey(state.sessions, settings.project ?? "", autoSlot, now, state.activity, state.pending);
      // Only honour an in-flight cycle while the key opts into cycling, so
      // unchecking the box takes effect immediately instead of leaving the key
      // parked on a cycled session.
      const cycling = !!settings.cycle && cycleIdx >= 0;
      const entry = statusEntry(resolved, cycling ? cycleIdx : null);
      const explicit = !!(settings.project && settings.project.trim());
      const name = settings.label || entry.name || (settings.project ?? "");
      let detail = "";
      if (cycling && resolved.count > 1) {
        const parent = entry.cwd ? path.basename(path.dirname(entry.cwd)) : "";
        detail = `${cycleIdx + 1}/${resolved.count}${parent ? " · " + parent : ""}`;
      } else if (entry.waitingFor) {
        // why it's blocked, plus how long — "just asked" vs "stuck since coffee"
        const waited = entry.waitingSince ? fmtShort(now - entry.waitingSince) : "";
        detail = shortWait(entry.waitingFor) + (waited ? " · " + waited : "");
      } else if (entry.state === "finished") {
        detail = "just now"; // fmtAgo floors to minutes, so it would always read "0m"
      } else if (entry.state === "idle" && entry.statusAge != null) {
        detail = fmtAgo(entry.statusAge) + " idle";
      }
      const blockedNow = entry.state === "needs-approval" || entry.state === "input-needed";
      const fresh = blockedNow && (!entry.waitingSince || now - entry.waitingSince < PULSE_MS);
      return img(statusKey(name, entry.state, explicit ? resolved.count : 1, detail, entry.where, fresh ? animPhase : null, entry.titolo));
    }
    case "approver-waiting": {
      // Dark and quiet until a session is actually blocked on you.
      const blocked = blockedSessions(state.sessions, now, state.activity, state.pending);
      if (!blocked.length) {
        const n = state.sessions.length;
        return img(statusKey("WAITING", "quiet", 1, n ? `${n} session${n > 1 ? "s" : ""} ok` : "no sessions"));
      }
      const i = cycleIdx >= 0 ? cycleIdx % blocked.length : 0;
      const b = blocked[i];
      // A VS Code session carries no status of its own, so the held request is the only
      // source for the state, the reason AND the age. Without it this key read a bare
      // "needs you" and pulsed forever.
      const p = state.pending?.get(b.sessionId) ?? null;
      const st = sessionState(b, now, state.activity.get(b.sessionId) ?? null, p?.kind ?? null);
      const since = b.status === "waiting" && b.statusUpdatedAt ? b.statusUpdatedAt : (p?.since ?? null);
      const waited = since ? fmtShort(now - since) : "";
      const why = shortWait(b.waitingFor ?? p?.reason ?? "") || "needs you";
      const fresh = !since || now - since < PULSE_MS;
      return img(statusKey(path.basename(b.cwd ?? "") || "claude", st, blocked.length, why + (waited ? " · " + waited : ""), sessionWhere(b), fresh ? animPhase : null, titoloSessione(b)));
    }
    case "approve-allow":
    case "approve-always":
    case "approve-deny":
      return rigaInBasso(kind, env);
  }
  return {};
}

// La riga in basso: DENY / centro / ALLOW. Con un permesso sono rifiuta, che cosa si
// sta approvando, approva; con una domanda diventano le sue opzioni (domande.js).
// Il tasto centrale era ALWAYS: non scrive più regole permanenti, mai.
//
// `painted` registra ciò che il tasto ha DISEGNATO — la richiesta, la faccia della
// domanda, se chiedeva la pressione lunga — perché una pressione non risponda mai a
// qualcosa che la persona non ha visto.
export function rigaInBasso(kind, env) {
  const { state, settings = {}, now, animPhase = null, authFlagged = false } = env;
  const req = approvable(state.approveQueue);
  const fresh = req && now - req.receivedAt < PULSE_MS;
  const phase = fresh ? animPhase : null;
  // Un guasto dell'hook locale non riguarda le richieste del cloud.
  const err = req?.cloud ? null : state.hookErr ?? (!state.approveQueue.length && authFlagged ? "auth?" : null);
  const depth = approvableDepth(state.approveQueue);
  const nome = req ? describeRequest(req).name : "";
  const cloud = !!req?.cloud;

  if (!err && req && isQuestion(req)) {
    const st = state.risposte?.get(req.id) ?? statoIniziale();
    const f = facce(req, st)[SLOT[kind]];
    const qs = req.toolInput?.questions ?? [];
    const passo = qs.length > 1 ? `${st.passo + 1}/${qs.length}` : "";
    const head = String(qs[st.passo]?.header || "domanda");
    const painted = { reqId: req.id, rule: null, faccia: f ? `${st.passo}:${st.pagina}:${f.tipo}:${f.indice ?? f.verso ?? ""}` : null, lungo: false };
    if (!f) return { image: infoKey("question", ["—"], nome, null, { cloud }), painted };
    if (f.tipo === "opzione") return { image: opzioneKey(f.indice + 1, head, f.label, passo, phase, cloud), painted };
    if (f.tipo === "pagina") return { image: paginaKey("altre 2", f.verso ? "opzioni 3-4" : "opzioni 1-2", !!f.verso, cloud), painted };
    return { image: domandaKey(head, testoDomanda(req, st), passo, cloud), painted };
  }

  const c = req ? classifica(req, confDa(state.globalSettings)) : null;
  if (kind === "approve-always") {
    const painted = { reqId: req?.id ?? null, rule: null, faccia: null, lungo: false };
    if (err) return { image: infoKey("alert", ["—"], err, "prod"), painted };
    if (!req) return { image: infoKey("dot", [], "all clear", null, { colIcona: "#4a4658" }), painted };
    if (c) {
      const tinta = !c.scrive ? "legge" : c.progetto === "STAGING" ? "staging" : "prod";
      return { image: infoKey("database", [c.strumento], nome, tinta, { cloud, testo2: etichetta(c) }), painted };
    }
    const [icona, colIcona] = iconaStrumento(req.toolName);
    const bersaglioPieno = req.toolName === "Bash" ? String(req.toolInput?.command ?? "") : describeRequest({ ...req, cwd: "" }).target;
    return { image: infoKey(icona, aCapo(bersaglioPieno, 15, 3), nome, null, { cloud, colIcona, ideale: 18 }), painted };
  }

  const lungo = kind === "approve-allow" && !!c?.lungo;
  return {
    image: decisioneKey(kind, req, { err, depth, phase, lungo, target: c ? bersaglio(req, c) : "", label: settings.label }),
    painted: { reqId: req?.id ?? null, rule: null, faccia: null, lungo },
  };
}
