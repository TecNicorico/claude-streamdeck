import { test } from "node:test";
import assert from "node:assert/strict";
import {
  letturaSonda, serveSonda, candidatiClaude, eSonda, rigaCmd, ARGOMENTI_SONDA, SONDA_MS, SONDA_ERRORE_MS,
} from "../src/sonda.js";

const NOW = 1_800_000_000_000;

// L'uscita vera di `claude -p … --output-format stream-json --verbose` (2.1.319,
// 09/11/2026), accorciata alle righe che contano e con altre righe intorno.
const USCITA = [
  JSON.stringify({ type: "system", subtype: "init", tools: [], mcp_servers: [] }),
  JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "ok" }] } }),
  JSON.stringify({ type: "rate_limit_event", rate_limit_info: {
    status: "allowed", resetsAt: 1794240000, rateLimitType: "five_hour",
    unifiedWindows: {
      five_hour: { utilization: 0.07, resetsAt: 1794240000, status: "allowed" },
      seven_day: { utilization: 0.12, resetsAt: 1794603600, status: "allowed" },
    },
  } }),
  JSON.stringify({ type: "result", subtype: "success", total_cost_usd: 0.00027 }),
].join("\n");

test("sonda: le due finestre dall'evento, in percento e con l'ora di reset", () => {
  const l = letturaSonda(USCITA, NOW);
  assert.equal(l.at, NOW);
  assert.deepEqual(l.usage.fiveHour, { pct: 7, resetsAt: "2026-11-09T16:00:00.000Z" });
  assert.equal(l.usage.weekly.pct, 12);
  assert.equal(l.usage.weekly.resetsAt, new Date(1794603600 * 1000).toISOString());
});

test("sonda: 0.235 è 23.5%, non 0.235% e non 24", () => {
  const riga = JSON.stringify({ type: "rate_limit_event", rate_limit_info: { unifiedWindows: { five_hour: { utilization: 0.235, resetsAt: 1 } } } });
  assert.equal(letturaSonda(riga, NOW).usage.fiveHour.pct, 23.5);
});

test("sonda: senza l'evento, con righe rotte o senza finestre, nessuna lettura", () => {
  assert.equal(letturaSonda("", NOW), null);
  assert.equal(letturaSonda("non json\n{\"type\":\"result\"}", NOW), null);
  assert.equal(letturaSonda(JSON.stringify({ type: "rate_limit_event", rate_limit_info: { status: "allowed" } }), NOW), null);
  assert.equal(letturaSonda('{"type":"rate_limit_event", rotto', NOW), null);
  // Una finestra sola c'è; l'altra resta assente, non zero.
  const solo = JSON.stringify({ type: "rate_limit_event", rate_limit_info: { unifiedWindows: { seven_day: { utilization: 0.4, resetsAt: 1 } } } });
  const l = letturaSonda(solo, NOW);
  assert.equal(l.usage.fiveHour, null);
  assert.equal(l.usage.weekly.pct, 40);
});

test("sonda: parte solo se serve, e mai più di una ogni dieci minuti", () => {
  const base = { now: NOW, visibile: true, usageAt: 0, ultimaAt: 0, erroreAt: 0 };
  assert.equal(serveSonda(base), true);
  assert.equal(serveSonda({ ...base, visibile: false }), false, "nessun tasto dei consumi a schermo");
  assert.equal(serveSonda({ ...base, spenta: true }), false);
  assert.equal(serveSonda({ ...base, usageAt: NOW - 3 * 60_000 }), false, "un numero fresco c'è già (la barra di stato)");
  assert.equal(serveSonda({ ...base, ultimaAt: NOW - 5 * 60_000 }), false);
  assert.equal(serveSonda({ ...base, ultimaAt: NOW - SONDA_MS }), true);
  assert.equal(serveSonda({ ...base, erroreAt: NOW - 10 * 60_000 }), false, "dopo un errore mezz'ora");
  assert.equal(serveSonda({ ...base, erroreAt: NOW - SONDA_ERRORE_MS }), true);
  // Un tasto premuto: anche con un numero fresco, ma non due volte in un minuto.
  assert.equal(serveSonda({ ...base, forza: true, usageAt: NOW - 3 * 60_000, ultimaAt: NOW - 2 * 60_000 }), true);
  assert.equal(serveSonda({ ...base, forza: true, ultimaAt: NOW - 30_000 }), false);
});

test("sonda: gli argomenti tengono la richiesta minima e lontana dalle impostazioni dell'utente", () => {
  const a = ARGOMENTI_SONDA;
  assert.ok(a.includes("--tools="), "nessuno strumento, senza un argomento vuoto");
  assert.ok(!a.includes(""), "nessun argomento vuoto");
  assert.ok(a.includes("--no-session-persistence"));
  assert.ok(a.includes("--strict-mcp-config"));
  assert.equal(a[a.indexOf("--setting-sources") + 1], "project");
  assert.equal(a[a.indexOf("--model") + 1], "haiku");
  assert.equal(a[a.indexOf("--output-format") + 1], "stream-json");
  assert.ok(a.includes("--verbose"), "stream-json in --print lo chiede");
  assert.ok(!a.includes("--bare"), "--bare non legge il login OAuth");
});

test("sonda: dove cercare Claude Code su Windows e su macOS", () => {
  const w = candidatiClaude({ platform: "win32", home: "C:\\Users\\malac", env: { APPDATA: "C:\\Users\\malac\\AppData\\Roaming", Path: "C:\\Windows\\System32;C:\\tools\\" } });
  assert.equal(w[0], "C:\\Users\\malac\\.local\\bin\\claude.exe");
  assert.ok(w.includes("C:\\Users\\malac\\AppData\\Roaming\\npm\\claude.cmd"));
  assert.ok(w.includes("C:\\tools\\claude.exe"));
  const m = candidatiClaude({ platform: "darwin", home: "/Users/e", env: { PATH: "/usr/bin:/bin" } });
  assert.deepEqual(m.slice(0, 2), ["/Users/e/.local/bin/claude", "/opt/homebrew/bin/claude"]);
  assert.ok(m.includes("/usr/bin/claude"));
});

test("sonda: la sua sessione non conta fra quelle in corso", () => {
  assert.equal(eSonda({ cwd: "C:\\Users\\malac\\AppData\\Local\\Temp\\agent-vitals-sonda" }, "c:\\users\\malac\\appdata\\local\\temp\\agent-vitals-sonda\\"), true);
  assert.equal(eSonda({ cwd: "/home/u/progetto" }, "/tmp/agent-vitals-sonda"), false);
  assert.equal(eSonda({}, "/tmp/agent-vitals-sonda"), false);
});

test("sonda: la riga per cmd.exe mette le virgolette dove servono", () => {
  assert.equal(
    rigaCmd("C:\\Users\\Mario Rossi\\AppData\\Roaming\\npm\\claude.cmd", ["-p", "ok", "--tools=", "--system-prompt", "Reply with: ok"]),
    '"C:\\Users\\Mario Rossi\\AppData\\Roaming\\npm\\claude.cmd" -p ok --tools= --system-prompt "Reply with: ok"',
  );
});
