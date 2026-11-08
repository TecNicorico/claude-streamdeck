// Che cosa sta chiedendo di fare una richiesta su Supabase, in tre parole che si
// leggono su un tasto da 72 pixel: lo strumento, il progetto (PROD / STAGING) e se
// legge o scrive. Logica pura: la usano la vista e il tasto Allow, per decidere se
// basta un tocco o serve la pressione lunga.
//
// Due regole, entrambe dalla parte della prudenza:
//  1. Nel dubbio è una scrittura. Più istruzioni, un comando sconosciuto, una query
//     di cui il relay ha tagliato la fine: tutto conta come scrittura.
//  2. Un progetto che non riconosco vale come produzione. Il costo di sbagliare è
//     una pressione di due secondi in più, quello dell'errore opposto una migration
//     in produzione approvata con un tocco.

// Strumenti del server MCP di Supabase che leggono e basta.
export const SOLO_LETTURA = new Set([
  "list_projects", "get_project", "list_organizations", "get_organization", "list_tables",
  "list_extensions", "list_migrations", "get_logs", "query_logs", "get_advisors", "get_project_url",
  "get_anon_key", "get_publishable_keys", "list_edge_functions", "get_edge_function", "list_branches",
  "search_docs", "generate_typescript_types", "get_cost", "confirm_cost", "list_storage_buckets",
  "get_storage_config",
]);

// Dentro una SELECT, le cose che la fanno scrivere: una CTE che modifica
// (`with x as (delete … returning *) select …`), `select … into` (crea una tabella),
// una funzione con effetti. Una funzione chiamata col suo schema (`app.apri_x(…)`)
// da qui non si sa cosa faccia: conta come scrittura.
const SQL_SCRIVE = /\b(insert|update|delete|merge|truncate|drop|alter|create|grant|revoke|copy|call|into|vacuum|refresh|lock|notify|execute|prepare)\b/i;
const SQL_EFFETTI = /\b(set_config|pg_terminate_backend|pg_cancel_backend|nextval|setval|pg_advisory\w*|lo_\w+|dblink\w*|pg_reload_conf|pg_switch_wal|pg_promote|pg_file_\w+|pg_read_\w+|pg_ls_\w+|pg_sleep\w*)\s*\(|\b[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*\s*\(/i;

// Toglie commenti e stringhe, così una parola dentro un testo non fa scattare niente
// (né in un senso né nell'altro).
export function sqlNudo(sql) {
  return String(sql ?? "")
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, " '' ")
    .replace(/'(?:[^']|'')*'/g, " '' ")
    .replace(/"(?:[^"]|"")*"/g, " x ");
}

// Una query è una lettura se è UNA sola istruzione che comincia con select / with /
// explain (senza analyze) / show / values / table, e non contiene parole che scrivono.
export function sqlLegge(sql, troncato = false) {
  if (troncato) return false;
  const nudo = sqlNudo(sql).trim().replace(/;\s*$/, "");
  if (!nudo) return false;
  if (nudo.includes(";")) return false;
  if (!/^(select|with|explain|show|values|table)\b/i.test(nudo)) return false;
  if (/^explain\b/i.test(nudo) && /\banalyze\b/i.test(nudo)) return false;
  return !SQL_SCRIVE.test(nudo) && !SQL_EFFETTI.test(nudo);
}

const parti = (toolName) => String(toolName ?? "").split("__");

export function strumentoSupabase(toolName) {
  const [pre, server, ...resto] = parti(toolName);
  if (pre !== "mcp" || !server || !resto.length) return null;
  return /supabase/i.test(server) ? resto.join("__") : null;
}

// Comandi della CLI di Supabase che cambiano un progetto remoto.
const CLI_SCRIVE = /\b(db\s+(push|reset|dump\s+--data-only)|migration\s+(repair|squash|up|down)|functions\s+(deploy|delete)|secrets\s+(set|unset)|projects\s+(create|delete)|branches\s+(create|delete|update)|link|storage\s+(rm|mv|cp)|config\s+push|sso|domains)\b/i;

// I riferimenti dei progetti si scrivono nelle impostazioni del deck, separati da
// virgole o spazi: `abcdefghijklmnopqrst, ...`.
export const refs = (s) => String(s ?? "").split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);

function progettoDi(ref, conf) {
  const r = String(ref ?? "").toLowerCase();
  if (r && refs(conf?.prod).includes(r)) return "PROD";
  if (r && refs(conf?.staging).includes(r)) return "STAGING";
  return "?";
}

// null quando la richiesta non riguarda Supabase.
//   { strumento, progetto: "PROD"|"STAGING"|"?", scrive, lungo }
// `lungo` = il tasto Allow chiede la pressione lunga.
export function classifica(req, conf = {}) {
  const tool = String(req?.toolName ?? "");
  const input = req?.toolInput && typeof req.toolInput === "object" ? req.toolInput : {};
  const s = strumentoSupabase(tool);
  if (s) {
    const progetto = progettoDi(input.project_id ?? input.projectId ?? input.project_ref, conf);
    let scrive;
    if (s === "execute_sql") scrive = !sqlLegge(input.query, !!req?.troncato);
    else scrive = !SOLO_LETTURA.has(s);
    return { strumento: s, progetto, scrive, lungo: scrive && progetto !== "STAGING" };
  }
  if (tool === "Bash") {
    const cmd = String(input.command ?? "");
    if (!/\bsupabase\b/i.test(cmd)) return null;
    const scrive = CLI_SCRIVE.test(cmd);
    // La CLI parla col progetto collegato, che da qui non si vede: si guarda solo se
    // il comando nomina un riferimento noto.
    const nominato = refs(conf.prod).find((r) => cmd.toLowerCase().includes(r)) ? "PROD"
      : refs(conf.staging).find((r) => cmd.toLowerCase().includes(r)) ? "STAGING" : "?";
    return { strumento: "supabase CLI", progetto: nominato, scrive, lungo: scrive && nominato !== "STAGING" };
  }
  return null;
}

export const etichetta = (c) => (c ? `${c.progetto === "?" ? "PROD?" : c.progetto} · ${c.scrive ? "scrive" : "legge"}` : "");

// Che cosa scrivere sui tasti ALLOW/DENY al posto del nome dello strumento, che su
// un tasto non dice niente: per una query la sua prima parola, per una migration o
// una funzione il suo nome.
export function bersaglio(req, c) {
  if (!c) return null;
  const input = req?.toolInput ?? {};
  if (c.strumento === "execute_sql") {
    const primo = sqlNudo(input.query).trim().split(/\s+/)[0] ?? "";
    return `SQL ${primo.toUpperCase()}`.trim();
  }
  if (c.strumento === "apply_migration" && input.name) return String(input.name);
  if (c.strumento === "deploy_edge_function" && (input.name || input.slug)) return String(input.name || input.slug);
  if (c.strumento === "supabase CLI") {
    const m = /\bsupabase\s+([a-z-]+(?:\s+[a-z-]+)?)/i.exec(String(input.command ?? ""));
    return m ? m[1] : "supabase";
  }
  return c.strumento;
}

export const confDa = (gs) => ({ prod: gs?.supabaseProd ?? "", staging: gs?.supabaseStaging ?? "" });
