// Genera due file da cloud/deck-hook.mjs (rigenera dopo ogni sua modifica: un test
// controlla che i file committati corrispondano):
//   relay/src/hook-testo.js   l'hook come testo, servito dal relay su GET /v1/hook.mjs
//   cloud/setup-ambiente.sh   le righe da incollare nello script di setup dell'ambiente
//                             cloud: scaricano l'hook dal relay a ogni avvio. Un
//                             aggiornamento dell'hook è quindi un `wrangler deploy`.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

export const SEGNAPOSTO_RELAY = "https://claude-deck-relay.<tuo-nome>.workers.dev";

// `relay` è l'indirizzo del Worker: non è un segreto, e lo script di setup non può
// leggerlo dalle variabili d'ambiente, quindi ci va scritto dentro.
export function scriptSetup(relay = SEGNAPOSTO_RELAY) {
  return [
    "# --- Stream Deck: hook delle sessioni cloud (generato da tools/gen-setup.mjs) ---",
    "# Scarica l'hook dal tuo relay e lo installa. Le chiavi NON stanno qui:",
    "# DECK_RELAY_URL e DECK_RELAY_TOKEN vanno nelle variabili d'ambiente.",
    `DECK_RELAY="${relay}"`,
    "mkdir -p \"$HOME/.claude/deck\"",
    "if curl -fsSL --max-time 20 \"$DECK_RELAY/v1/hook.mjs\" -o \"$HOME/.claude/deck/nuovo.mjs\" && head -1 \"$HOME/.claude/deck/nuovo.mjs\" | grep -q '^#!/usr/bin/env node'; then",
    "  mv \"$HOME/.claude/deck/nuovo.mjs\" \"$HOME/.claude/deck/deck-hook.mjs\"",
    "  node \"$HOME/.claude/deck/deck-hook.mjs\" --installa || true",
    "else",
    "  echo \"deck: hook non scaricato da $DECK_RELAY\" >&2",
    "fi",
    "# --- fine Stream Deck ---",
    "",
  ].join("\n");
}

export function moduloHook(hook) {
  return "// Generato da tools/gen-setup.mjs da cloud/deck-hook.mjs: non modificarlo a mano.\n" +
    `export default ${JSON.stringify(hook)};\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const hook = readFileSync(join(radice, "cloud", "deck-hook.mjs"), "utf8");
  writeFileSync(join(radice, "relay", "src", "hook-testo.js"), moduloHook(hook));
  writeFileSync(join(radice, "cloud", "setup-ambiente.sh"), scriptSetup());
  console.log("relay/src/hook-testo.js e cloud/setup-ambiente.sh aggiornati");
}
