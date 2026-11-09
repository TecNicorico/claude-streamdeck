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
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, statSync, openSync, readSync, closeSync } from "node:fs";
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

// ---------- le letture SQL non chiedono ----------
// Una lettura su Supabase si approva qui, subito, senza passare dal deck né da
// claude.ai (richiesta di Enrico del 09/11/2026: «chiedimelo solo per le scritture»).
// Approvare senza nessuno che guarda è il punto delicato, quindi il riconoscimento è
// più stretto di quello che sul deck colora un tasto (src/supabase.js): lì sbagliare
// vuol dire un tocco invece di una pressione lunga, qui un comando eseguito da solo.
//
//   1. Una sola istruzione, che comincia con select / with / explain (senza analyze) /
//      show / values / table, senza parole che scrivono (anche dentro una CTE:
//      `with x as (delete … returning *)`), senza `select … into`, senza `for update`.
//   2. Ogni funzione chiamata è una di un elenco noto di funzioni di Postgres che
//      leggono e basta. Una SELECT può scrivere attraverso una funzione — in TheCore
//      `select fn_next_officialization_code(…)` consuma un numero, `select
//      rpc_apri_scuola(…)` apre una scuola — e una funzione dello schema (con o senza
//      `public.`/`app.`) da qui non si sa cosa faccia: chiede.
//   3. Commenti e stringhe non contano, in nessun senso: si tolgono prima di guardare.
// Nel dubbio chiede, come prima. Si spegne con DECK_LETTURE_SQL=0 nell'ambiente.

// Strumenti del server MCP di Supabase che leggono e basta (confirm_cost no: è il
// consenso a una spesa).
export const SUPABASE_LETTURA = new Set([
  "list_projects", "get_project", "list_organizations", "get_organization", "list_tables",
  "list_extensions", "list_migrations", "get_logs", "query_logs", "get_advisors", "get_project_url",
  "get_anon_key", "get_publishable_keys", "list_edge_functions", "get_edge_function", "list_branches",
  "search_docs", "generate_typescript_types", "get_cost", "list_storage_buckets", "get_storage_config",
]);

// Le parole davanti a una parentesi che non sono funzioni, e i tipi con un argomento.
const PRIMA_DI_PARENTESI = new Set([
  "select", "from", "join", "in", "exists", "any", "all", "some", "values", "over", "filter",
  "within", "as", "on", "and", "or", "not", "where", "when", "then", "else", "lateral", "using",
  "by", "having", "case", "cast", "array", "row", "is", "like", "ilike", "between", "union",
  "intersect", "except", "explain", "limit", "offset", "sets", "rollup", "cube", "grouping",
  "varchar", "char", "character", "numeric", "decimal", "timestamp", "timestamptz", "time", "bit",
  "interval", "float",
]);
// Funzioni di Postgres che leggono e basta.
const FUNZIONI_LETTURA = new Set([
  "count", "sum", "avg", "min", "max", "coalesce", "nullif", "greatest", "least", "now",
  "date_trunc", "date_part", "extract", "to_char", "to_date", "to_timestamp", "to_number", "age",
  "make_date", "make_interval", "make_timestamp", "make_timestamptz", "generate_series", "timezone",
  "lower", "upper", "initcap", "length", "char_length", "octet_length", "substring", "substr",
  "position", "strpos", "replace", "translate", "trim", "btrim", "ltrim", "rtrim", "split_part",
  "concat", "concat_ws", "format", "left", "right", "lpad", "rpad", "repeat", "reverse", "unaccent",
  "regexp_replace", "regexp_match", "regexp_matches", "regexp_split_to_array", "regexp_split_to_table",
  "regexp_count", "regexp_like", "starts_with", "md5", "encode", "decode", "string_to_array",
  "array_to_string", "string_to_table", "round", "floor", "ceil", "ceiling", "trunc", "abs", "mod",
  "power", "sqrt", "ln", "log", "exp", "sign", "div", "width_bucket", "percentile_cont",
  "percentile_disc", "mode", "stddev", "stddev_pop", "stddev_samp", "variance", "var_pop",
  "var_samp", "corr", "bool_and", "bool_or", "every", "array_agg", "string_agg", "json_agg",
  "jsonb_agg", "json_object_agg", "jsonb_object_agg", "json_build_object", "jsonb_build_object",
  "json_build_array", "jsonb_build_array", "to_json", "to_jsonb", "row_to_json", "array_to_json",
  "json_array_length", "jsonb_array_length", "json_array_elements", "jsonb_array_elements",
  "json_array_elements_text", "jsonb_array_elements_text", "json_each", "jsonb_each",
  "json_each_text", "jsonb_each_text", "json_object_keys", "jsonb_object_keys", "json_typeof",
  "jsonb_typeof", "jsonb_set", "jsonb_insert", "jsonb_strip_nulls", "jsonb_pretty",
  "jsonb_path_query", "jsonb_path_query_array", "jsonb_path_query_first", "jsonb_path_exists",
  "jsonb_path_match", "json_extract_path", "jsonb_extract_path", "json_extract_path_text",
  "jsonb_extract_path_text", "array_length", "array_position", "array_positions", "array_remove",
  "array_append", "array_prepend", "array_cat", "array_upper", "array_lower", "cardinality",
  "unnest", "row_number", "rank", "dense_rank", "lag", "lead", "first_value", "last_value",
  "nth_value", "ntile", "cume_dist", "percent_rank", "pg_size_pretty", "pg_total_relation_size",
  "pg_relation_size", "pg_table_size", "pg_indexes_size", "pg_database_size", "pg_column_size",
  "pg_get_functiondef", "pg_get_function_arguments", "pg_get_function_result", "pg_get_viewdef",
  "pg_get_constraintdef", "pg_get_indexdef", "pg_get_triggerdef", "pg_get_expr", "pg_get_userbyid",
  "pg_get_serial_sequence", "format_type", "obj_description", "col_description", "shobj_description",
  "has_table_privilege", "has_column_privilege", "has_function_privilege", "has_schema_privilege",
  "has_sequence_privilege", "pg_has_role", "current_setting", "version", "pg_typeof", "quote_ident",
  "quote_literal", "quote_nullable", "to_regclass", "to_regproc", "to_regprocedure", "to_regtype",
  "pg_relation_filenode", "pg_postmaster_start_time", "pg_backend_pid", "inet_client_addr",
  "date", "isfinite", "justify_days", "justify_hours", "justify_interval", "clock_timestamp",
  "statement_timestamp", "transaction_timestamp", "array_dims", "num_nulls", "num_nonnulls",
]);
const SQL_SCRIVE_ANCHE_IN_SELECT = /\b(insert|update|delete|merge|truncate|drop|alter|create|grant|revoke|copy|call|into|vacuum|refresh|execute|prepare|reindex|cluster|listen|notify|unlisten)\b|\bcomment\s+on\b|\block\s+table\b|\bfor\s+(no\s+key\s+)?(update|share|key\s+share)\b/i;

// Commenti e stringhe via, gli identificatori fra virgolette diventano `x` (una
// funzione fra virgolette, `"rpc_x"(…)`, resta una chiamata sconosciuta). Un carattere
// alla volta e nell'ordine in cui li legge Postgres, non con espressioni in fila: con
// quelle `select '/*', 1; drop table t; select '*/'` diventava una stringa sola, e la
// DROP spariva dentro un «commento» che per Postgres non c'è. Commenti /* */ annidati,
// stringhe E'…' con le barre, $tag$…$tag$. Qualcosa di non chiuso: null.
const IDENT = /[A-Za-z0-9_$]/;
export function sqlSenzaTesti(sql) {
  const t = String(sql ?? "");
  let out = "", i = 0;
  while (i < t.length) {
    const c = t[i], d = t[i + 1];
    const primaIdent = i > 0 && IDENT.test(t[i - 1]);
    if (c === "-" && d === "-") {
      const nl = t.indexOf("\n", i);
      i = nl < 0 ? t.length : nl;
      out += " ";
    } else if (c === "/" && d === "*") {
      let livello = 1;
      i += 2;
      while (i < t.length && livello) {
        if (t[i] === "/" && t[i + 1] === "*") { livello++; i += 2; } else if (t[i] === "*" && t[i + 1] === "/") { livello--; i += 2; } else i++;
      }
      if (livello) return null;
      out += " ";
    } else if (c === "'" || ((c === "e" || c === "E") && d === "'" && !primaIdent)) {
      const conBarre = c !== "'";
      i += conBarre ? 2 : 1;
      let chiusa = false;
      while (i < t.length) {
        if (conBarre && t[i] === "\\") { i += 2; continue; }
        if (t[i] === "'") { if (t[i + 1] === "'") { i += 2; continue; } i++; chiusa = true; break; }
        i++;
      }
      if (!chiusa) return null;
      out += " '' ";
    } else if (c === '"') {
      i++;
      let chiusa = false;
      while (i < t.length) {
        if (t[i] === '"') { if (t[i + 1] === '"') { i += 2; continue; } i++; chiusa = true; break; }
        i++;
      }
      if (!chiusa) return null;
      out += " x ";
    } else if (c === "$" && !primaIdent) {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(t.slice(i));
      if (!m) { out += c; i++; continue; } // $1: un parametro, resta e fa dire no più avanti
      const fine = t.indexOf(m[0], i + m[0].length);
      if (fine < 0) return null;
      i = fine + m[0].length;
      out += " '' ";
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

export function sqlSoloLettura(sql) {
  const senza = sqlSenzaTesti(sql);
  if (senza == null) return false;
  const nudo = senza.trim().replace(/;\s*$/, "");
  if (!nudo || nudo.includes(";")) return false;
  // Un $ rimasto (un parametro, un identificatore con $) o un */ spaiato: no.
  if (/\$|\*\//.test(nudo)) return false;
  if (!/^(select|with|explain|show|values|table)\b/i.test(nudo)) return false;
  if (/^explain\b/i.test(nudo) && /\banaly[sz]e\b/i.test(nudo)) return false;
  if (SQL_SCRIVE_ANCHE_IN_SELECT.test(nudo)) return false;
  for (const m of nudo.matchAll(/([A-Za-z_][A-Za-z0-9_$]*)(\s*\.\s*[A-Za-z_][A-Za-z0-9_$]*)?\s*\(/g)) {
    if (m[2]) return false; // schema.funzione(…): da qui non si sa cosa faccia
    const nome = m[1].toLowerCase();
    if (!PRIMA_DI_PARENTESI.has(nome) && !FUNZIONI_LETTURA.has(nome)) return false;
  }
  return true;
}

// Lo strumento chiamato, se è del server MCP di Supabase: `mcp__<server>__<strumento>`.
export function strumentoSupabase(toolName) {
  const [pre, server, ...resto] = String(toolName ?? "").split("__");
  if (pre !== "mcp" || !server || !resto.length || !/supabase/i.test(server)) return null;
  return resto.join("__");
}

export function letturaAutomatica(toolName, toolInput) {
  const s = strumentoSupabase(toolName);
  if (!s) return false;
  if (s === "execute_sql") return sqlSoloLettura(toolInput?.query);
  return SUPABASE_LETTURA.has(s);
}

export const LETTURA_APPROVATA = { hookSpecificOutput: { hookEventName: "PermissionRequest", decision: { behavior: "allow" } } };

// ---------- risolta altrove ----------
// Claude Code non chiude questo hook quando la persona risponde su claude.ai: lo fa
// girare col segnale del turno, non con quello della richiesta (visto nel codice di
// Claude Code 2.1.319, 09/11/2026), e la sua risposta arrivata dopo la ignora. La
// richiesta restava quindi sul deck fino alla scadenza, cinque minuti. Mentre aspetta,
// l'hook guarda il transcript della sessione: quando compare il risultato dello
// strumento che ha chiesto — subito se è stato rifiutato, alla fine se è stato
// approvato — la richiesta è decisa, e la ritira dal relay.

// JSON con le chiavi in ordine: lo stesso input scritto in due ordini è lo stesso input.
export function stabile(v) {
  if (Array.isArray(v)) return "[" + v.map(stabile).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stabile(v[k])).join(",") + "}";
  return JSON.stringify(v ?? null);
}

export function righeDa(testo) {
  const out = [];
  for (const riga of String(testo ?? "").split("\n")) {
    if (!riga.trim()) continue;
    try { out.push(JSON.parse(riga)); } catch {}
  }
  return out;
}

const blocchi = (r) => (Array.isArray(r?.message?.content) ? r.message.content : []);

// Gli id dei tool_use di quello strumento con quell'input, in ordine.
export function toolUseUguali(righe, toolName, toolInput) {
  const voluto = stabile(toolInput ?? {});
  const ids = [];
  for (const r of righe) {
    for (const b of blocchi(r)) {
      if (b?.type === "tool_use" && b.name === toolName && stabile(b.input ?? {}) === voluto) ids.push(b.id);
    }
  }
  return ids;
}

export function risultatiIn(righe) {
  const ids = new Set();
  for (const r of righe) for (const b of blocchi(r)) if (b?.type === "tool_result" && b.tool_use_id) ids.add(b.tool_use_id);
  return ids;
}

const FS_VERO = { statSync, openSync, readSync, closeSync };
function leggiDa(fs, file, da, a) {
  const n = Math.max(0, a - da);
  if (!n) return "";
  const buf = Buffer.alloc(n);
  const fd = fs.openSync(file, "r");
  try { fs.readSync(fd, buf, 0, n, da); } finally { fs.closeSync(fd); }
  return buf.toString("utf8");
}

// Guarda il transcript finché lo strumento chiesto non ha un risultato; allora chiama
// `quandoRisolta` una volta. Restituisce la funzione che la ferma. Ogni guasto (file che
// non c'è, che si accorcia, righe rotte) la ferma in silenzio: si torna alla scadenza.
export function sorvegliaTranscript(file, toolName, toolInput, { quandoRisolta, ogniMs = 1_500, coda = 512 * 1024, fs = FS_VERO } = {}) {
  if (!file || typeof quandoRisolta !== "function") return () => {};
  let fermata = false, timer = null, offset = 0, resto = "", mio = null;
  const visti = new Set(); // risultati già nel transcript: un tool_use con risultato non è il mio
  const esamina = (righe) => {
    for (const id of risultatiIn(righe)) visti.add(id);
    if (!mio) mio = toolUseUguali(righe, toolName, toolInput).filter((id) => !visti.has(id)).pop() ?? null;
    return !!mio && visti.has(mio);
  };
  const stop = () => { fermata = true; clearTimeout(timer); };
  try {
    const size = fs.statSync(file).size;
    const da = Math.max(0, size - coda);
    let testo = leggiDa(fs, file, da, size);
    if (da > 0) testo = testo.slice(testo.indexOf("\n") + 1);
    offset = size;
    esamina(righeDa(testo));
  } catch { return () => {}; }
  const giro = () => {
    if (fermata) return;
    try {
      const size = fs.statSync(file).size;
      if (size < offset) { offset = size; resto = ""; }
      if (size > offset) {
        const testo = resto + leggiDa(fs, file, offset, size);
        offset = size;
        const fine = testo.lastIndexOf("\n");
        resto = fine < 0 ? testo : testo.slice(fine + 1);
        if (esamina(righeDa(fine < 0 ? "" : testo.slice(0, fine)))) { stop(); quandoRisolta(); return; }
      }
    } catch { stop(); return; }
    timer = setTimeout(giro, ogniMs);
    timer.unref?.();
  };
  timer = setTimeout(giro, ogniMs);
  timer.unref?.();
  return stop;
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

export async function gestisci(payload, { env = process.env, fetchAttesa = chiama, ora = Date.now, quandoAperta = () => {}, sorveglia = sorvegliaTranscript } = {}) {
  // Solo nel cloud: sul PC le richieste le prende già il plugin, col suo hook locale
  // (che approva le letture con la stessa regola, importandola da qui).
  if (env.CLAUDE_CODE_REMOTE !== "true" && env.DECK_ANCHE_LOCALE !== "1") return null;
  // Una lettura su Supabase non aspetta nessuno, nemmeno se il relay non c'è.
  if (payload?.hook_event_name === "PermissionRequest" && env.DECK_LETTURE_SQL !== "0"
      && letturaAutomatica(payload.tool_name, payload.tool_input)) return LETTURA_APPROVATA;
  const base = env.DECK_RELAY_URL, token = env.DECK_RELAY_TOKEN;
  if (!base || !token || !/^https?:\/\//.test(base)) return null;
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
  // Deciso su claude.ai: il risultato dello strumento compare nel transcript, e la
  // richiesta si ritira dal relay (che sveglia l'attesa qui sotto con «sconosciuta»).
  let altrove = false;
  const ferma = sorveglia(payload.transcript_path, payload.tool_name, payload.tool_input ?? {}, {
    quandoRisolta: () => { altrove = true; fetchAttesa(base, token, "/v1/cloud/rinuncia", { id: aperta.id }, 5_000); },
  });
  try {
    const fine = ora() + s * 1000;
    while (ora() < fine && !altrove) {
      const r = await fetchAttesa(base, token, "/v1/cloud/attendi", { id: aperta.id }, 25_000);
      // Una decisione del deck arrivata dopo una su claude.ai non vale più: Claude ha
      // già la sua risposta, e questa la ignorerebbe comunque.
      if (r?.stato === "decisa") return altrove ? null : rispostaPerClaude(r.decisione, payload.tool_input ?? {});
      if (r?.stato === "sconosciuta") return null;
      // Relay irraggiungibile per un attimo: si riprova, senza martellare.
      if (!r) await new Promise((res) => setTimeout(res, 1_000));
    }
    if (!altrove) await fetchAttesa(base, token, "/v1/cloud/rinuncia", { id: aperta.id }, 5_000);
    return null;
  } finally {
    ferma();
  }
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
