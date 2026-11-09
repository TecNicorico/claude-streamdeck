#!/usr/bin/env node
// Hook delle sessioni Claude Code nel cloud: le collega allo Stream Deck tramite il relay.
//
//   PermissionRequest  apre una richiesta sul relay e aspetta la decisione dal deck
//   SessionStart       la sessione esiste           (stato: idle)
//   UserPromptSubmit   la sessione lavora            (stato: busy)
//   Stop               il turno è finito             (stato: idle, «finito» per un minuto)
//   SessionEnd         la sessione è chiusa          (sparisce dal deck)
//
// Configurazione, dalle variabili d'ambiente dell'ambiente cloud:
//   DECK_RELAY_URL    l'indirizzo del Worker, es. https://claude-deck-relay.<nome>.workers.dev
//   DECK_RELAY_TOKEN  la chiave CLOUD del relay (mai quella del deck)
//   DECK_ATTESA_S     quanti secondi aspettare il deck prima di lasciar decidere claude.ai
//
// Regola d'oro: questo script non blocca mai Claude per un suo guasto. Relay spento,
// chiave sbagliata, rete negata, risposta strana: esce senza scrivere niente, e Claude
// Code mostra la richiesta normale. L'unica cosa che scrive su stdout è una decisione
// che il deck ha preso davvero.
//
// `node deck-hook.mjs --installa` scrive gli hook in ~/.claude/settings.json (lo usa lo
// script di setup dell'ambiente) e lascia intatto tutto il resto del file.
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const MARCA = "deck-hook.mjs";
const EVENTI = { SessionStart: "avvio", UserPromptSubmit: "lavora", Stop: "fine", SessionEnd: "chiusa" };
const ATTESA_DEFAULT_S = 300;
const ATTESA_MAX_S = 600;
const RIFIUTO = "Rifiutato dallo Stream Deck";

export function attesaS(env = process.env) {
  const n = Number(env.DECK_ATTESA_S);
  return Number.isFinite(n) && n >= 5 && n <= ATTESA_MAX_S ? Math.round(n) : ATTESA_DEFAULT_S;
}

// La sessione come la conosce il relay: l'id del container (da cui viene il link su
// claude.ai) e il nome della cartella, che è quello che si legge sul tasto.
export function sessioneDa(payload, env = process.env) {
  const idRemoto = env.CLAUDE_CODE_REMOTE_SESSION_ID || "";
  const id = idRemoto || String(payload?.session_id ?? "");
  if (!id) return null;
  const cwd = String(payload?.cwd ?? "");
  const out = { id, idRemoto, nome: basename(cwd) || "cloud", cwd };
  const titolo = titoloDa(payload);
  if (titolo) out.titolo = titolo;
  return out;
}

// Il sottotitolo del tasto della sessione: le prime parole del messaggio, come il
// titolo che claude.ai dà alla sessione (che dentro il container non arriva). Il relay
// tiene solo quello del primo messaggio. Un comando (/qualcosa) non è un titolo.
export const TITOLO_MAX = 60;
export function titoloDa(payload) {
  if (payload?.hook_event_name !== "UserPromptSubmit") return "";
  const riga = String(payload?.prompt ?? "").split("\n").map((r) => r.trim()).find(Boolean) ?? "";
  if (!riga || riga.startsWith("/")) return "";
  const t = riga.replace(/\s+/g, " ");
  return t.length > TITOLO_MAX ? t.slice(0, TITOLO_MAX - 1).trimEnd() + "…" : t;
}

// La decisione del deck tradotta nella risposta che Claude Code si aspetta. Una
// risposta a una domanda si riscontra con le domande VERE, quelle dell'input originale
// che ha solo questo processo: un'etichetta che non è fra le opzioni non passa. Una
// scelta multipla arriva come elenco e parte come le etichette unite da «, », che è
// come le scrive il dialogo di Claude Code.
export function rispostaPerClaude(decisione, toolInput) {
  const wrap = (d) => ({ hookSpecificOutput: { hookEventName: "PermissionRequest", decision: d } });
  if (decisione?.tipo === "approva") return wrap({ behavior: "allow" });
  if (decisione?.tipo === "rifiuta") return wrap({ behavior: "deny", message: RIFIUTO });
  if (decisione?.tipo === "rispondi") {
    const qs = Array.isArray(toolInput?.questions) ? toolInput.questions : [];
    if (!qs.length) return null;
    const answers = {};
    for (const q of qs) {
      const etichette = (q?.options ?? []).map((o) => o?.label);
      const scelta = decisione.risposte?.[q?.question];
      if (q?.multiSelect) {
        if (!Array.isArray(scelta) || !scelta.length || new Set(scelta).size !== scelta.length) return null;
        if (!scelta.every((x) => typeof x === "string" && etichette.includes(x))) return null;
        answers[q.question] = scelta.join(", ");
      } else {
        if (typeof scelta !== "string" || !etichette.includes(scelta)) return null;
        answers[q.question] = scelta;
      }
    }
    return wrap({ behavior: "allow", updatedInput: { ...toolInput, answers } });
  }
  return null;
}

async function chiama(base, token, path, body, ms) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(base.replace(/\/+$/, "") + path, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function gestisci(payload, { env = process.env, fetchAttesa = chiama, ora = Date.now, quandoAperta = () => {} } = {}) {
  const base = env.DECK_RELAY_URL, token = env.DECK_RELAY_TOKEN;
  if (!base || !token || !/^https?:\/\//.test(base)) return null;
  // Solo nel cloud: sul PC le richieste le prende già il plugin, col suo hook locale.
  if (env.CLAUDE_CODE_REMOTE !== "true" && env.DECK_ANCHE_LOCALE !== "1") return null;
  const sessione = sessioneDa(payload, env);
  if (!sessione) return null;
  const ev = payload?.hook_event_name;

  if (EVENTI[ev]) {
    await fetchAttesa(base, token, "/v1/cloud/stato", { sessione, evento: EVENTI[ev] }, 5_000);
    return null;
  }
  if (ev !== "PermissionRequest" || !payload?.tool_name) return null;

  const s = attesaS(env);
  const aperta = await fetchAttesa(base, token, "/v1/cloud/richiesta", {
    sessione, tool: payload.tool_name, input: payload.tool_input ?? {}, attesaS: s,
  }, 8_000);
  if (!aperta?.id) return null;
  quandoAperta(aperta.id, base, token);
  const fine = ora() + s * 1000;
  while (ora() < fine) {
    const r = await fetchAttesa(base, token, "/v1/cloud/attendi", { id: aperta.id }, 25_000);
    if (r?.stato === "decisa") return rispostaPerClaude(r.decisione, payload.tool_input ?? {});
    if (r?.stato === "sconosciuta") return null;
    // Relay irraggiungibile per un attimo: si riprova, senza martellare.
    if (!r) await new Promise((res) => setTimeout(res, 1_000));
  }
  await fetchAttesa(base, token, "/v1/cloud/rinuncia", { id: aperta.id }, 5_000);
  return null;
}

// ---------- aggiornamento ----------
// L'ambiente cloud non riesegue lo script di setup a ogni sessione: lo esegue una volta,
// ne salva un'istantanea, e le sessioni dopo partono da quella (nel registro di una
// sessione: «Restored saved setup», «Setup script cached from previous run»). L'hook
// scaricato dallo script resterebbe quindi fermo alla versione dell'istantanea, anche
// dopo un `wrangler deploy`. Per questo all'avvio di ogni sessione l'hook si riscarica
// dal relay e si sostituisce: da lì in poi la sessione usa la versione di adesso.
// Si sostituisce solo con un file che sembra davvero l'hook; ogni guasto lascia quello
// che c'era.
export async function aggiorna(file, { env = process.env, scarica = fetch } = {}) {
  const base = env.DECK_RELAY_URL;
  if (!base || !/^https?:\/\//.test(base)) return "senza relay";
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 5_000);
  let testo;
  try {
    const r = await scarica(base.replace(/\/+$/, "") + "/v1/hook.mjs", { signal: ac.signal });
    if (!r.ok) return "relay " + r.status;
    testo = await r.text();
  } catch {
    return "non raggiungibile";
  } finally {
    clearTimeout(t);
  }
  if (!testo.startsWith("#!/usr/bin/env node") || !testo.includes(MARCA) || !testo.includes("export async function gestisci")) return "non è l'hook";
  let attuale = "";
  try { attuale = readFileSync(file, "utf8"); } catch {}
  if (attuale === testo) return "già aggiornato";
  writeFileSync(file + ".nuovo", testo);
  renameSync(file + ".nuovo", file);
  return "aggiornato";
}

// ---------- installazione: gli hook in ~/.claude/settings.json ----------
export function conHook(settings, comando, attesa) {
  const out = settings && typeof settings === "object" ? { ...settings } : {};
  const hooks = out.hooks && typeof out.hooks === "object" ? { ...out.hooks } : {};
  const nostro = (timeout, matcher) => ({ ...(matcher != null ? { matcher } : {}), hooks: [{ type: "command", command: comando, timeout }] });
  const evento = (nome, gruppo) => {
    // Toglie le nostre voci di prima (riconosciute dal nome dello script) e tiene le altrui.
    const altri = (Array.isArray(hooks[nome]) ? hooks[nome] : [])
      .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !String(h?.command ?? "").includes(MARCA)) }))
      .filter((g) => g.hooks.length);
    hooks[nome] = [...altri, gruppo];
  };
  // Il timeout è il massimo possibile, non l'attesa di adesso: l'attesa la legge l'hook
  // dall'ambiente quando parte (DECK_ATTESA_S), e lo script di setup, che scrive queste
  // righe, l'ambiente non lo vede. Con un timeout più corto Claude Code chiuderebbe
  // l'hook prima che finisca di aspettare.
  evento("PermissionRequest", nostro(Math.max(attesa, ATTESA_MAX_S) + 15, ""));
  for (const nome of Object.keys(EVENTI)) evento(nome, nostro(10, null));
  out.hooks = hooks;
  return out;
}

function installa() {
  const dir = join(homedir(), ".claude");
  const file = join(dir, "settings.json");
  mkdirSync(dir, { recursive: true });
  let attuali = {};
  if (existsSync(file)) {
    try { attuali = JSON.parse(readFileSync(file, "utf8")); } catch {
      process.stderr.write(`deck-hook: ${file} non è JSON valido, non lo tocco\n`);
      return 1;
    }
  }
  const comando = `node "$HOME/.claude/deck/${MARCA}"`;
  writeFileSync(file, JSON.stringify(conHook(attuali, comando, attesaS()), null, 2) + "\n");
  process.stdout.write(`deck-hook: hook installati in ${file}\n`);
  return 0;
}

async function principale() {
  if (process.argv.includes("--installa")) process.exit(installa());
  let payload = {};
  try { payload = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { return; }
  // All'avvio della sessione, prima di tutto, la versione di adesso dal relay (vedi aggiorna).
  const aggiornamento = payload?.hook_event_name === "SessionStart" && process.env.CLAUDE_CODE_REMOTE === "true"
    ? aggiorna(fileURLToPath(import.meta.url)).catch(() => "errore")
    : null;
  // Se Claude Code chiude l'hook mentre aspetta (la persona ha risposto su claude.ai),
  // prima di uscire lo dice al relay: la richiesta sparisce subito anche dal deck.
  const quandoAperta = (id, base, token) => {
    const esci = () => { chiama(base, token, "/v1/cloud/rinuncia", { id }, 2_000).finally(() => process.exit(0)); };
    for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) process.once(sig, esci);
  };
  const out = await gestisci(payload, { quandoAperta }).catch(() => null);
  if (aggiornamento) await aggiornamento;
  if (out) process.stdout.write(JSON.stringify(out));
}

// Eseguito come script (non importato dai test).
if (process.argv[1] && basename(process.argv[1]) === MARCA) principale();
