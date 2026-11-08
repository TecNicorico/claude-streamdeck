// Prova di fattibilita' (ramo prova-cloud, da cancellare): un hook PermissionRequest
// in una sessione cloud viene chiamato? La sua risposta viene rispettata?
//   - Bash con PROVA_SI  -> allow
//   - Bash con PROVA_NO  -> deny
//   - AskUserQuestion    -> allow con le risposte gia' scelte (la seconda opzione)
//   - tutto il resto     -> nessuna risposta: decide la richiesta normale
import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let input = {};
try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch {}

const tool = input.tool_name ?? "";
const ti = input.tool_input ?? {};
let decision = null;
if (tool === "Bash" && /PROVA_SI|prova-hook\.log/.test(String(ti.command ?? ""))) {
  decision = { behavior: "allow" };
} else if (tool === "Bash" && /PROVA_NO/.test(String(ti.command ?? ""))) {
  decision = { behavior: "deny", message: "Rifiutato dallo Stream Deck (prova)" };
} else if (tool === "AskUserQuestion" && Array.isArray(ti.questions)) {
  const answers = {};
  for (const q of ti.questions) {
    const opt = q.options?.[1] ?? q.options?.[0];
    if (q.question && opt?.label) answers[q.question] = opt.label;
  }
  decision = { behavior: "allow", updatedInput: { ...ti, answers } };
}

appendFileSync(join(dir, ".prova-hook.log"), JSON.stringify({
  at: new Date().toISOString(),
  keys: Object.keys(input),
  tool,
  tool_input: ti,
  permission_mode: input.permission_mode,
  suggestions: input.permission_suggestions ?? null,
  remote_session: process.env.CLAUDE_CODE_REMOTE_SESSION_ID ?? null,
  remote: process.env.CLAUDE_CODE_REMOTE ?? null,
  decision,
}) + "\n");

if (decision) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PermissionRequest", decision } }));
}
