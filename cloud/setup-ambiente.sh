# --- Stream Deck: hook delle sessioni cloud (generato da tools/gen-setup.mjs) ---
# Scarica l'hook dal tuo relay e lo installa. Le chiavi NON stanno qui:
# DECK_RELAY_URL e DECK_RELAY_TOKEN vanno nelle variabili d'ambiente.
DECK_RELAY="https://claude-deck-relay.<tuo-nome>.workers.dev"
mkdir -p "$HOME/.claude/deck"
if curl -fsSL --max-time 20 "$DECK_RELAY/v1/hook.mjs" -o "$HOME/.claude/deck/nuovo.mjs" && head -1 "$HOME/.claude/deck/nuovo.mjs" | grep -q '^#!/usr/bin/env node'; then
  mv "$HOME/.claude/deck/nuovo.mjs" "$HOME/.claude/deck/deck-hook.mjs"
  node "$HOME/.claude/deck/deck-hook.mjs" --installa || true
else
  echo "deck: hook non scaricato da $DECK_RELAY" >&2
fi
# --- fine Stream Deck ---
