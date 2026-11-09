# Stream Deck per Claude Code, anche nel cloud

Questa versione del plugin aggiunge tre cose ad Agent Vitals:

1. **Le sessioni Claude Code nel cloud** (claude.ai/code) compaiono sui tasti
   Status, Waiting e Focus come quelle del PC. Premendo il tasto si apre la sessione
   su claude.ai.
2. **Si risponde a tutto quello che blocca una sessione**, locale o cloud: permessi
   (approva / rifiuta) e domande a scelta di Claude (le opzioni vanno sui tasti).
3. **Le richieste Supabase si leggono a colpo d'occhio**: strumento, progetto
   (PROD / STAGING) e se legge o scrive. Una scrittura su un progetto che non è di
   staging chiede di **tenere premuto ALLOW per 2 secondi**.

Il tasto «Always Allow» non scrive più regole permanenti: è diventato il tasto
centrale della riga (vedi sotto).

## Come funziona

```
sessione cloud ──hook──▶ relay (Worker Cloudflare tuo) ◀──legge e decide── Stream Deck
sessione sul PC ──hook──▶ plugin (http://127.0.0.1, come prima)
```

- **Il relay** è un piccolo Worker sul tuo account Cloudflare, con due chiavi
  diverse: la chiave **CLOUD** la usano le sessioni cloud per aprire le richieste
  (non possono decidere niente), la chiave **DECK** la usa lo Stream Deck per
  leggere e decidere (non può aprire richieste). Le richieste e i comandi restano
  solo in memoria, finché la sessione non ritira la risposta.
- **La richiesta resta sul deck per 5 minuti** (`DECK_ATTESA_S`, fino a 600
  secondi), anche se intanto apri la sessione su claude.ai per leggerla. Su
  claude.ai resta rispondibile per tutto il tempo: vale la prima risposta, e se
  rispondi lì sparisce anche dal deck. Il deck non approva mai niente da solo, e un
  guasto del relay non blocca mai Claude.
- **Non si fanno dal deck:** le domande a scelta multipla e le risposte scritte a
  mano (si rispondono su Claude, e il tasto Waiting le segnala), e le domande della
  chat normale di claude.ai o della app desktop, che non hanno un modo per parlare
  con altri programmi.

## 1. Installare il plugin aggiornato (Windows)

Serve Node.js per pubblicare il relay al punto 2. Se non ce l'hai, in PowerShell:

```powershell
winget install OpenJS.NodeJS.LTS
```

Poi chiudi e riapri PowerShell. Scarica questa versione del plugin:

```powershell
cd $env:USERPROFILE
git clone -b deck-remoto https://github.com/TecNicorico/claude-streamdeck.git
```

Senza git: scarica lo ZIP da
`https://github.com/TecNicorico/claude-streamdeck/archive/refs/heads/deck-remoto.zip`,
estrailo e usa quella cartella al posto di `claude-streamdeck` qui sotto.

Installa il plugin. Lo script chiude Stream Deck, sostituisce il plugin e lo
riapre; i tasti che hai già messo restano dove sono:

```powershell
cd $env:USERPROFILE\claude-streamdeck
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

## 2. Pubblicare il relay sul tuo account Cloudflare

Dalla cartella `relay`:

```powershell
cd $env:USERPROFILE\claude-streamdeck\relay
npx wrangler@4 login
npx wrangler@4 deploy
```

Alla fine stampa l'indirizzo del Worker, tipo
`https://claude-deck-relay.<tuo-nome>.workers.dev`: tienilo, serve ai punti 3 e 4.

Genera le due chiavi. Lancia questo comando due volte e copia i due risultati: il
primo è la chiave CLOUD, il secondo la chiave DECK.

```powershell
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Salvale nel Worker. Ognuno dei due comandi chiede di incollare il valore:

```powershell
npx wrangler@4 secret put TOKEN_CLOUD
```

```powershell
npx wrangler@4 secret put TOKEN_DECK
```

Controlla che risponda: apri nel browser `https://claude-deck-relay.<tuo-nome>.workers.dev/v1/salute`.
Deve dire `{"ok":true,"configurato":true}`.

## 3. Impostare l'ambiente cloud

Su claude.ai/code, apri il menu dell'ambiente nella barra in alto di una sessione,
poi **Edit**:

1. **Variabili d'ambiente:**
   ```
   DECK_RELAY_URL=https://claude-deck-relay.<tuo-nome>.workers.dev
   DECK_RELAY_TOKEN=<la chiave CLOUD>
   ```
   Facoltativa: `DECK_ATTESA_S=300`, per quanti secondi una richiesta resta sul
   deck (da 5 a 600).
2. **Accesso alla rete:** fra i domini permessi aggiungi
   `claude-deck-relay.<tuo-nome>.workers.dev`, lasciando spuntata la casella dei
   gestori di pacchetti.
3. **Script di setup:** incolla in fondo queste righe, con l'indirizzo del tuo
   Worker al posto di quello d'esempio (sono anche in
   [`cloud/setup-ambiente.sh`](cloud/setup-ambiente.sh)). A ogni avvio di una sessione
   scaricano l'hook dal tuo relay e lo installano; le chiavi non stanno lì dentro.
   ```bash
   DECK_RELAY="https://claude-deck-relay.<tuo-nome>.workers.dev"
   mkdir -p "$HOME/.claude/deck"
   if curl -fsSL --max-time 20 "$DECK_RELAY/v1/hook.mjs" -o "$HOME/.claude/deck/nuovo.mjs" && head -1 "$HOME/.claude/deck/nuovo.mjs" | grep -q '^#!/usr/bin/env node'; then
     mv "$HOME/.claude/deck/nuovo.mjs" "$HOME/.claude/deck/deck-hook.mjs"
     node "$HOME/.claude/deck/deck-hook.mjs" --installa || true
   else
     echo "deck: hook non scaricato da $DECK_RELAY" >&2
   fi
   ```
   Siccome l'hook lo serve il relay, per aggiornarlo basta ripubblicare il relay
   (`npx wrangler@4 deploy` dalla cartella `relay`): lo script non si ricopia.

Vale per le sessioni nuove: quelle già aperte non cambiano.

## 4. Impostare lo Stream Deck

Apri le impostazioni del tasto **Claude Allow** (un clic sul tasto nell'app Stream
Deck). In fondo c'è la sezione **Sessioni cloud e Supabase**, condivisa da tutti i
tasti:

| Campo | Cosa scrivere |
|---|---|
| Relay per le sessioni cloud | `https://claude-deck-relay.<tuo-nome>.workers.dev` |
| Chiave DECK del relay | la chiave DECK (mai la CLOUD) |
| Progetti Supabase di PRODUZIONE | `yejgskgnpdkzoycixool` |
| Progetti Supabase di STAGING | `xpochgxtficnoyvolnvn` |

Sotto deve comparire «Collegato». Un progetto che non è in nessuno dei due campi
vale come produzione.

**Per le sessioni sul PC** serve anche l'hook locale, come prima: nello stesso
pannello copia il testo di «One-time setup» e incollalo dentro `"hooks"` nel file
`%USERPROFILE%\.claude\settings.json`, poi riavvia le sessioni di Claude Code.

## Scegliere a quale sessione rispondere

Con più sessioni in attesa, la riga in basso risponde alla richiesta più vecchia, a
meno che tu non ne scelga un'altra:

- **Focus** diventa il selettore: «RISPONDI A», il nome e il titolo della sessione,
  e «1/3». Ogni pressione passa alla sessione dopo. Senza richieste torna a portare
  davanti le finestre delle sessioni, come prima.
- Il **tasto Status** della sessione a cui stai rispondendo porta l'etichetta
  **RISPONDI**. Premere il tasto Status di un'altra sessione in attesa la sceglie;
  premerlo di nuovo la apre.
- In fondo ai tasti della riga c'è il titolo della sessione, così due sessioni sulla
  stessa repo non si confondono.

Quando la sessione scelta non ha più richieste, la riga torna alla più vecchia.

## Il titolo della sessione sui tasti Status

Sotto il nome della repo, al posto della parola dello stato («Working»), c'è il titolo
della sessione; lo stato resta nel colore del riquadro e del titolo e nell'icona in
alto a sinistra. Per una sessione nel cloud il titolo sono le prime parole del suo
primo messaggio (quello di claude.ai dentro la sessione non arriva), e il relay lo
tiene finché la sessione esiste. Per una sessione sul PC è il nome che le hai dato con
`/rename` o che le ha dato l'app; il nome che Claude Code ricava dalla cartella
(«thecore-v2-4f») non dice niente di nuovo, e lì resta la parola dello stato.

## I tasti dei consumi possono fare da Deny e Allow

Se non vuoi tenere Deny e Allow sempre sul deck, i tasti che mostrano e basta
(Session 5H, Weekly, Model, Burn rate, Today, Usage, Claude Code) possono prenderne il
posto solo mentre c'è una richiesta in attesa. Nelle impostazioni del tasto:
**Con una richiesta in attesa diventa** → Deny / opzione a sinistra, Info / opzione
centrale, oppure Allow / opzione a destra. Senza richieste tornano a mostrare i
consumi. Appena cambiano faccia aspettano un secondo prima di accettare una
pressione, così un tocco per aggiornare i consumi non diventa un'approvazione.

## Come si usa: la riga in basso

I tre tasti di approvazione cambiano faccia secondo cosa c'è in attesa.

| In attesa | Sinistra (Deny) | Centro (Info) | Destra (Allow) |
|---|---|---|---|
| niente | ✕ spenta | — | ✓ spenta |
| un permesso | ✕ rosso, il comando | l'icona dello strumento e il comando; premuto apre la sessione | ✓ verde, il comando |
| una lettura Supabase | ✕ rosso | database blu · «PROD · legge» | ✓ verde, un tocco |
| una scrittura su staging | ✕ rosso | database ambra · «STAGING · scrive» | ✓ verde, un tocco |
| una scrittura in produzione | ✕ rosso | database rosso · «PROD · scrive» | ✓ ambra nel cerchio, **tieni premuto 2 s** |
| domanda con 2 opzioni | opzione 1 | il testo della domanda | opzione 2 |
| domanda con 3 opzioni | opzione 1 | opzione 2 | opzione 3 |
| domanda con 4 opzioni | opzione 1 (poi 3) | altre ▸ / ◂ altre | opzione 2 (poi 4) |

- Più richieste insieme si mettono in fila, dalla più vecchia; «+1» in alto a destra
  vuol dire che dopo questa ce n'è un'altra.
- La nuvola in alto a sinistra vuol dire che la richiesta viene da una sessione nel
  cloud. Sui tasti delle sessioni la nuvola è in alto a destra, e in alto a sinistra
  c'è l'icona dello stato: triangolo = aspetta un permesso, punto di domanda = ti fa
  una domanda, raggiera = lavora, spunta = ha appena finito, luna = ferma.
- Se lasci ALLOW prima dei 2 secondi, non approva e il tasto lampeggia.
- Una domanda con più quesiti si risponde un quesito alla volta; le risposte partono
  tutte insieme alla fine.

## Se qualcosa non va

- **Il pannello dice «chiave deck errata»:** nel campo c'è la chiave CLOUD, o una
  chiave diversa da quella salvata con `wrangler secret put TOKEN_DECK`.
- **Le sessioni cloud non compaiono:** controlla in una sessione nuova che le
  variabili `DECK_RELAY_URL` e `DECK_RELAY_TOKEN` ci siano, e che il dominio del
  Worker sia fra quelli permessi. Senza rete o senza chiavi l'hook tace apposta.
- **Le richieste del PC non arrivano:** manca l'hook locale in `settings.json`
  (punto 4), o Claude Code non è stato riavviato dopo averlo aggiunto.

## Per chi sviluppa

- Relay: `relay/src/bacheca.js` (logica, testata), `relay/src/index.js` (Worker).
  Prova in locale con `npx wrangler@4 dev` e un file `relay/.dev.vars` con
  `TOKEN_CLOUD` e `TOKEN_DECK`.
- Hook cloud: `cloud/deck-hook.mjs`. Dopo una modifica rigenera lo script di setup
  con `node tools/gen-setup.mjs`: un test fallisce se non corrispondono.
- Plugin: `src/relay.js` (sessioni e richieste cloud), `src/domande.js` (opzioni sui
  tasti), `src/supabase.js` (lettura o scrittura, PROD o STAGING), la riga in basso
  in `rigaInBasso` di `src/view.js`.
- `npm test` esegue tutti i test, compresi quelli del relay e dell'hook.
