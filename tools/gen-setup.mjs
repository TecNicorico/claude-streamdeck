// Genera cloud/setup-ambiente.sh: le righe da incollare nello script di setup
// dell'ambiente cloud. L'hook ci sta DENTRO, scritto per intero, invece di essere
// scaricato a ogni avvio: niente rete in più, e lo script che gira è quello che hai
// letto. Rigenera dopo ogni modifica a cloud/deck-hook.mjs (la CI controlla che il
// file committato corrisponda).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const FINE = "DECK_HOOK_FINE";

export function scriptSetup(hook) {
  if (hook.includes(FINE)) throw new Error(`l'hook contiene ${FINE}: cambia il terminatore`);
  return [
    "# --- Stream Deck: hook delle sessioni cloud (generato da tools/gen-setup.mjs) ---",
    "# Le chiavi NON stanno qui: DECK_RELAY_URL e DECK_RELAY_TOKEN vanno nelle variabili",
    "# d'ambiente dell'ambiente cloud. Senza, l'hook non fa niente.",
    "mkdir -p \"$HOME/.claude/deck\"",
    `cat > "$HOME/.claude/deck/deck-hook.mjs" <<'${FINE}'`,
    hook.replace(/\n$/, ""),
    FINE,
    "node \"$HOME/.claude/deck/deck-hook.mjs\" --installa || true",
    "# --- fine Stream Deck ---",
    "",
  ].join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const hook = readFileSync(join(radice, "cloud", "deck-hook.mjs"), "utf8");
  writeFileSync(join(radice, "cloud", "setup-ambiente.sh"), scriptSetup(hook));
  console.log("cloud/setup-ambiente.sh aggiornato");
}
