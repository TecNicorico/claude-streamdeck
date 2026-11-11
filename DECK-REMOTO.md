# Stream Deck per Claude Code, anche nel cloud

Questa versione del plugin aggiunge tre cose ad Agent Vitals:

1. **Le sessioni Claude Code nel cloud** (claude.ai/code) compaiono sui tasti
   Status, Waiting e Focus come quelle del PC. Premendo il tasto si apre la sessione
   su claude.ai.
2. **Si risponde a tutto quello che blocca una sessione**, locale o cloud: permessi
   (approva / rifiuta) e domande a scelta di Claude (le opzioni vanno sui tasti).
3. **Le richieste Supabase si leggono a colpo d'occhio**: strumento, progetto
   (PROD / STAGING) e se legge o scrive. Una scrittura su un progetto che non è di
   staging chiede di **tenere premuto ALLOW per 2 secondi**. Una **lettura** non
   arriva nemmeno: si approva da sola (vedi «Le letture su Supabase non chiedono»).

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
  rispondi lì sparisce anche dal deck — se la rifiuti subito, se la approvi quando lo
  strumento ha finito (Claude Code non avvisa l'hook: se ne accorge dal transcript
  della sessione). Il deck non approva mai niente da solo, e un guasto del relay non
  blocca mai Claude.
- **Non si fanno dal deck:** le risposte scritte a mano («altro») e le domande con
  più di quattro opzioni (si rispondono su Claude, e il tasto Waiting le segnala), e
  le domande della chat normale di claude.ai o della app desktop, che non hanno un
  modo per parlare con altri programmi.

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
   [`cloud/setup-ambiente.sh`](cloud/setup-ambiente.sh)). Scaricano l'hook dal tuo
   relay e lo installano; le chiavi non stanno lì dentro.
   ```bash
   # --- Stream Deck: hook delle sessioni cloud, setup v2 ---
   DECK_RELAY="https://claude-deck-relay.<tuo-nome>.workers.dev"
   mkdir -p "$HOME/.claude/deck"
   if curl -fsSL --max-time 20 "$DECK_RELAY/v1/hook.mjs" -o "$HOME/.claude/deck/nuovo.mjs" && head -1 "$HOME/.claude/deck/nuovo.mjs" | grep -q '^#!/usr/bin/env node'; then
     mv "$HOME/.claude/deck/nuovo.mjs" "$HOME/.claude/deck/deck-hook.mjs"
     node "$HOME/.claude/deck/deck-hook.mjs" --installa || true
   else
     echo "deck: hook non scaricato da $DECK_RELAY" >&2
   fi
   ```
   **Attenzione: l'ambiente non riesegue lo script a ogni sessione.** Lo esegue una
   volta, ne salva un'istantanea e fa partire da quella le sessioni dopo (nel registro
   di una sessione: «Restored saved setup»). Per questo l'hook, all'avvio di ogni
   sessione, si riscarica dal relay e usa la versione di adesso: per aggiornarlo basta
   ripubblicare il relay (`npx wrangler@4 deploy` dalla cartella `relay`). Lo script va
   ritoccato solo per rifare l'istantanea: cambiando anche solo la riga «setup v2».

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

## Le letture su Supabase non chiedono

Dal 09/11/2026 una **lettura** su Supabase si approva da sola, senza passare dal deck
né da claude.ai: nelle sessioni cloud la approva l'hook, in quelle del PC il plugin,
con la stessa regola (`letturaAutomatica` in `cloud/deck-hook.mjs`). Chiedono ancora
tutte le scritture, e tutto ciò che non è sicuramente una lettura.

È una lettura:
- `execute_sql` con **una sola istruzione** che comincia con `select`, `with`,
  `explain` (senza `analyze`), `show`, `values` o `table`, senza parole che scrivono
  (`insert`, `update`, `delete` anche dentro una CTE, `select … into`, `for update`…),
  e che chiama **solo funzioni di Postgres che leggono** (`count`, `coalesce`,
  `date_trunc`, `jsonb_build_object`…). Una funzione del database — `select
  rpc_apri_scuola(…)`, `select app.qualcosa(…)` — chiede sempre, perché una SELECT
  può scrivere attraverso una funzione;
- gli strumenti di Supabase che leggono e basta: `list_tables`, `get_logs`,
  `get_advisors`, `list_migrations`, `search_docs`…

Commenti e stringhe si leggono come li legge Postgres, così un `'/*'` o un `--`
dentro un testo non nascondono una seconda istruzione.

Per spegnerlo: nelle sessioni cloud la variabile d'ambiente `DECK_LETTURE_SQL=0`;
sul PC la casella «Approva da solo le letture su Supabase» nelle impostazioni del
tasto Allow.

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
| scelta multipla, 2 opzioni | casella 1 | CONFERMA | casella 2 |
| scelta multipla, 3-4 opzioni | caselle 1, poi 3 | altre ▸, avanti ▸, poi CONFERMA | caselle 2, poi 4 |

- Più richieste insieme si mettono in fila, dalla più vecchia; «+1» in alto a destra
  vuol dire che dopo questa ce n'è un'altra.
- La nuvola in alto a sinistra vuol dire che la richiesta viene da una sessione nel
  cloud. Sui tasti delle sessioni la nuvola è in alto a destra, e in alto a sinistra
  c'è l'icona dello stato: triangolo = aspetta un permesso, punto di domanda = ti fa
  una domanda, raggiera = lavora, spunta = ha appena finito, luna = ferma.
- Se lasci ALLOW prima dei 2 secondi, non approva e il tasto lampeggia.
- Una domanda con più quesiti si risponde un quesito alla volta; le risposte partono
  tutte insieme alla fine.
- A scelta multipla ogni pressione spunta o toglie l'opzione (disco pieno con la spunta
  = scelta, cerchio col numero = no), e si risponde con CONFERMA, che dice quante ne
  hai scelte. CONFERMA senza niente spuntato lampeggia e non risponde.
- Una pressione troppo vicina a un cambio (richiesta nuova, pagina girata) fa
  lampeggiare il tasto e non conta: premi di nuovo.

## La terza pagina: posta, TheCore e Nexus

Tre tasti, pensati per una pagina tutta loro accanto ai due di Discord.

- **Posta (Gmail)**: quante mail ci sono da leggere in una casella Gmail o Google
  Workspace. Premuto apre Gmail su quell'account nel browser (per indirizzo, con
  `?authuser=`, quindi non importa in che ordine sono collegati gli account).
- **TheCore**: un numero del gestionale, scelto dal menu del tasto. Premuto apre la
  pagina di TheCore da cui quel numero viene.
- **Nexus**: un numero delle finanze di casa (patrimonio, liquidità, spese,
  investimenti, i chilometri dell'auto). Premuto apre la pagina di Nexus da cui viene.

Sono disegnati nello stile di Discord, per stare accanto ai suoi tasti: fondo grigio
di Discord, e per ogni metrica un'icona bianca su una tessera colorata. Il colore
della **tessera** dice il gruppo (verde vendite, blu Directory, fucsia Hiring, grigio
operativo); il **pallino** sull'angolo dice lo stato: **giallo** c'è da fare qualcosa,
**rosso** qualcosa si è rotto, e la riga sotto prende lo stesso colore. La busta della
posta porta il numero nel **badge rosso delle menzioni**, e senza mail da leggere il
badge non c'è. Un numero che non si è potuto aggiornare resta, con scritto «offline ·
10:32» (sulla busta il badge diventa grigio): non diventa mai uno zero. Si legge solo
mentre la pagina è aperta: la posta ogni due minuti (e 45 secondi dopo che l'hai
aperta), TheCore e Nexus ogni cinque.

### Il tasto Posta

1. Sull'account Google serve la **verifica in due passaggi**. Poi apri
   <https://myaccount.google.com/apppasswords>, crea una password per le app
   (chiamala «Stream Deck») e copia le 16 lettere.
2. Trascina **Posta (Gmail)** sulla pagina e, nelle impostazioni del tasto, scrivi
   l'indirizzo e incolla la password. Gli spazi non contano.
3. **Cosa contare**: «Principale, come Gmail» conta le conversazioni non lette della
   scheda Principale, cioè il numero che Gmail scrive accanto a «Posta in arrivo»;
   «Tutta la posta in arrivo» conta i messaggi, promozioni e social compresi.
4. Un tasto per casella. L'etichetta in alto è la parte prima della @, o quella che
   scrivi.

La password sta nelle impostazioni del plugin su questo PC, non in quelle del
tasto: un profilo esportato non se la porta dietro. La casella si apre in sola
lettura (`EXAMINE`): contare non segna niente come letto. Se Google rifiuta la
password il tasto scrive «password rifiutata» e **non riprova da solo** (troppi
accessi falliti fanno bloccare l'account): riprova appena ne incolli una nuova. Su
un account di lavoro l'amministratore può aver spento IMAP o le password per le app:
il tasto lo dice («IMAP rifiutato»).

### Il tasto TheCore

Serve TheCore con la migration `0156` (branch `claude/wizardly-brown-t2ivdl` del
repository `thecore-v2`, da portare su staging e poi in produzione).

1. In TheCore: **Impostazioni → Preferenze → Stream Deck → Genera la chiave**. La
   chiave si vede una volta sola, insieme all'indirizzo della funzione e a quello di
   TheCore. Possono generarla coordinatore e visualizzatore: i numeri sono di tutta
   la stagione.
2. Trascina **TheCore** sulla pagina e, in fondo alle sue impostazioni, nella
   sezione **TheCore — condivise**, incolla le tre cose. Valgono per tutti i tasti
   TheCore. Sotto deve comparire «Collegato · stagione …».
3. Per ogni tasto scegli **Che numero mostra**:

| Gruppo | Metrica | Il tasto dice | Premuto apre |
|---|---|---|---|
| Vendite | Fatturato della stagione | lordo dello shop, al netto dei resi, e la variazione contro l'anno scorso alla stessa data | P&L effettivo |
| Vendite | Ordini di oggi | ordini di oggi, incasso di oggi e ordini di ieri | Dashboard ordini |
| Vendite | Scuole ufficializzate | firmate, su quante raggiunte | Directory |
| Vendite | Merch ufficializzati | scuole col merch firmato, su quante lavorano il merch | Merch |
| Vendite | Annuari ufficializzati | scuole con l'annuario firmato, su quante lavorano l'annuario | Annuari |
| Directory | Scuole raggiunte | in Directory, contro l'anno scorso alla stessa data | Metriche |
| Directory | Scuole senza sales | da assegnare; ambra se ce n'è una segnalata per competitor | Directory |
| Directory | Richieste dal form | da assegnare | Contatti senza scuola |
| Hiring | Candidature da scrutinare | la coda di Lavora, e quante oggi | Lavora |
| Hiring | Candidati RIS accettati | accettati e non ancora eletti | Tutte le candidature |
| Hiring | Documenti da verificare | candidature con un documento in verifica | Tutte le candidature |
| Hiring | Eletti senza documento | da contattare | Tutte le candidature |
| Hiring | RIS eletti | col documento verificato | Metriche RIS |
| Operativo | Le mie notifiche | le tue notifiche non lette (le stesse della campanella) e quante sono menzioni; un tasto «Avvisi» configurato prima diventa questo da solo | Dashboard |
| Operativo | Job dell'outbox | falliti nell'ultima settimana e fermi; «ok» se niente | (rilegge) |
| Operativo | PLAO da controllare | le firmate, da controllare prima dell'ultimo lunedì (o, se non ce n'è, quante sono da firmare) | Paghe |
| Operativo | Ordini fornitori con un problema | in rosso se ce n'è uno | Ordini fornitori |

Se TheCore rifiuta la chiave (rigenerata, revocata, o il ruolo è cambiato) il tasto
scrive «chiave rifiutata» e smette di mostrare i numeri.

### Il tasto Nexus

I numeri di Nexus, il gestionale di casa: finanze, investimenti, veicoli. Si disegna
come i tasti TheCore, con quattro tessere sue: **azzurro** finanze, **viola**
investimenti, **arancio** veicoli, **grigio** ciò che c'è da guardare oggi.

1. In Nexus: **Altro → Stream Deck → Genera la chiave**. La scheda mostra tre cose,
   ognuna col suo «Copia»: l'indirizzo, la chiave e l'indirizzo di Nexus. La chiave si
   vede una volta sola.
2. Trascina **Nexus** sulla pagina e, in fondo alle sue impostazioni, nella sezione
   **Nexus — condivise**, incolla le tre cose. Valgono per tutti i tasti Nexus. Sotto
   deve comparire «Collegato · N conti, N veicoli».
3. Per ogni tasto scegli **Che numero mostra**. Per «Saldo di un conto» e per i numeri
   dei veicoli scegli anche **quale conto** e **quale veicolo** (l'elenco arriva dopo la
   prima lettura; senza una scelta è il primo).

| Gruppo | Metrica | Il tasto dice | Premuto apre |
|---|---|---|---|
| Finanze | Patrimonio | il totale di Home, e sotto la liquidità | Home |
| Finanze | Liquidità | i conti in euro che non sono investimenti né debiti, e quanto è uscito oggi | Conti |
| Finanze | Uscite del mese | senza anticipi e senza giroconti; sotto, le uscite di oggi (o il mese scorso) | Flussi |
| Finanze | Entrate del mese | e il mese scorso | Flussi |
| Finanze | Risparmio del mese | entrate meno uscite, e quanto è andato negli investimenti | Flussi |
| Finanze | Uscite di oggi | e il totale del mese | Movimenti |
| Finanze | Movimenti da classificare | ambra se ce n'è | Movimenti senza categoria |
| Finanze | Saldo di un conto | il conto scelto, nella sua valuta | Conti |
| Investimenti | Controvalore | il totale della scheda Investiti, con la resa e il guadagno; «al versato» se manca un prezzo | Investiti |
| Investimenti | Guadagno | controvalore meno versato, e la resa; «--» se manca il prezzo | Investiti |
| Investimenti | Versato | e quanto questo mese | Investiti |
| Investimenti | Quote possedute | ambra se qualcuna è ancora una stima (l'estratto conto la rende esatta) | Investiti |
| Investimenti | Prezzo del titolo | l'ultima chiusura e il suo giorno, se il titolo è uno solo | Investiti |
| Veicoli | Chilometri | il contachilometri, e i chilometri del mese | Veicoli |
| Veicoli | Consumo medio | litri per 100 km; «--» finché non ci sono due pieni | Veicoli |
| Veicoli | Spesa del mese | carburante e manutenzione del mese | Veicoli |
| Veicoli | Prossima scadenza | fra quanti giorni (o chilometri) e quale; ambra se è vicina, rosso se è scaduta | Veicoli |
| Oggi | Cose da guardare oggi | quelle di «Oggi» in Home; «ok» se non c'è niente, rosso se c'è un errore | Home |
| Oggi | Banche | «ok» e l'ora dell'ultima lettura, o quante cose chiedono attenzione | Banche |
| Oggi | Movimenti senza descrizione | quelli che aspettano l'estratto conto | Banche |

La chiave legge **solo questo riassunto**: totali, saldi, conteggi, i nomi dei conti e
dei veicoli. Mai un movimento, e non scrive niente. Se Nexus la rifiuta (rigenerata o
revocata) il tasto scrive «chiave rifiutata» e smette di mostrare i numeri. Si legge
ogni cinque minuti, solo con un tasto Nexus a schermo; premuto un tasto, si rilegge un
minuto dopo.

### Una disposizione per lo Stream Deck MK.2 (15 tasti)

```
| Posta personale | Posta lavoro   | Fatturato       | Discord        | Discord       |
| Ordini          | Raggiunte      | Senza sales     | Candidature    | Documenti     |
| Firmate         | Avvisi         | PLAO            | Outbox         | Fornitori     |
```

Sposta i due Discord dove stanno nelle altre pagine. **Mentre guardi questa pagina
Claude può chiedere qualcosa**: dai a tre tasti TheCore della riga in basso la voce
**Con una richiesta in attesa diventa** (Deny / Info / Allow, nelle stesse posizioni
della pagina di Claude), e la riga diventa quella delle risposte finché la richiesta
è aperta, per tornare ai numeri subito dopo.

## Le luci e le prese, con Alexa

Il tasto **Luce o presa** comanda i dispositivi della casa che comandi con Alexa — le
luci (anche l'intensità) e le prese, per esempio quelle di una ciabatta — senza le app
dei produttori. Accende e spegne, dà più o meno luce, o accende a una percentuale, e
mostra se è acceso e quanto.

Alexa non ha un modo ufficiale per farsi comandare da un altro programma: il plugin
usa quello dell'app Alexa, con la libreria che usano ioBroker e Node-RED
(`alexa-remote2`). Funziona da anni, ma Amazon può cambiare qualcosa: quando succede
si aggiorna il plugin.

1. Trascina **Luce o presa** su un tasto e apri le sue impostazioni. **Da dove**:
   **Alexa**.
2. In fondo, **Alexa — condivisa**: scegli il tuo Amazon (di solito `amazon.it`) e
   premi **Accedi ad Amazon**. Si apre nel browser una pagina del tuo PC
   (`http://127.0.0.1:…`): fai il login ad Amazon come sempre, verifica in due
   passaggi compresa. Finito, la pagina lo dice e la riga sotto il pulsante diventa
   «Collegato · N dispositivi».
3. In alto scegli **La luce o la presa** e cosa fa **Premuto**. Le prese accendono e
   spengono; le luci regolabili anche l'intensità.

Lo si fa una volta: la sessione si salva in `.agent-vitals\alexa.json` nella tua
cartella utente e si rinnova da sola. **È l'accesso al tuo account Amazon**: quel
file non si condivide. «Esci», nelle stesse impostazioni, lo cancella. Se cambi la
password di Amazon il tasto dice «accedi ad Alexa»: si rifà l'accesso.

- Lo stato si legge una volta al minuto, solo mentre la pagina è a schermo, e subito
  dopo ogni pressione.
- **«offline»**: Alexa non raggiunge il dispositivo (spento dall'interruttore, Wi-Fi,
  il ponte della luce scollegato).
- La pagina di accesso ascolta solo sul tuo PC e si chiude da sola dopo un quarto
  d'ora se non la usi.

## Le luci di Smart Life (in alternativa)

Se le luci sono di Smart Life (Tuya), lo stesso tasto può parlare direttamente con
Tuya: **Da dove** → **Smart Life (Tuya)**, con le chiavi di un progetto sviluppatore.

Le luci e le strisce LED che comandi con Alexa si comandano anche dal deck, con il
tasto **Luce (Smart Life)**: accende e spegne, dà più o meno luce, o accende a una
percentuale. Il tasto mostra se la luce è accesa e quanto.

Alexa non ha un modo ufficiale per farsi comandare da un altro programma (le strade
non ufficiali usano il login di Amazon e si rompono quando Amazon cambia). Ma Alexa
è solo un telecomando sopra **Smart Life**, che è **Tuya**: il plugin parla con il
cloud di Tuya, con le chiavi di un progetto sviluppatore gratuito collegato alla tua
app. Si fa una volta.

### 1. Il progetto su Tuya (una volta)

1. Vai su <https://platform.tuya.com> e registrati: va bene un account nuovo, non
   serve quello di Smart Life.
2. **Cloud → Development → Create Cloud Project**:
   - nome: «Stream Deck»;
   - Industry: **Smart Home**; Development Method: **Smart Home**;
   - Data Center: quello del tuo account Smart Life. Per l'Italia di solito è
     **Central Europe Data Center**.
   Alla finestra dei servizi API lascia quelli proposti (fra questi **IoT Core**) e
   conferma.
3. Nel progetto apri **Devices → Link App Account → Add App Account**: compare un
   codice QR. Nell'app **Smart Life**, su **Io** tocca l'icona di scansione in alto e
   inquadra il QR, poi conferma. Le tue luci compaiono nell'elenco del progetto.
4. In **Overview** copia **Access ID / Client ID** e **Access Secret / Client
   Secret**.

### 2. Sul deck

1. Trascina **Luce (Smart Life)** su un tasto e apri le sue impostazioni.
2. In fondo, in **Smart Life (Tuya) — condivise**, incolla le due chiavi e scegli
   il data center (lo stesso del progetto). La riga sotto deve dire «Collegato · N
   dispositivi».
3. In alto scegli **La luce** e cosa fa **Premuto**: accende e spegne, più luce,
   meno luce (di quanto: «Di quanto, in %», di solito 20), o accende a una
   percentuale.

Un tasto per luce: per esempio **Studio** (accende e spegne), **+20%** e **−20%**
accanto. Lo stato si legge una volta al minuto, solo mentre la pagina è a schermo, e
subito dopo ogni pressione: il tasto mostra il risultato atteso appena premi e lo
corregge se Tuya dice altro. Una luce comandata da Alexa o dall'app compare sul deck
entro un minuto.

- **«Più luce» su una luce spenta la accende**; **«meno luce» si ferma all'1% e non
  la spegne**: per spegnere c'è l'interruttore.
- **«chiavi Tuya?»**: mancano le chiavi, o Tuya le rifiuta (data center diverso da
  quello del progetto, chiave copiata male, servizio scaduto).
- **Il servizio gratuito IoT Core scade**: Tuya lo dà in prova e lo fa rinnovare
  ogni tanto (avvisa per mail). Si rinnova gratis dal pannello: **Cloud → Cloud
  Services → IoT Core**, «Extend Trial Period». Se un giorno tutti i tasti Luce
  dicono «chiavi Tuya?», guarda prima lì.
- **«offline»**: la luce non è raggiungibile dal cloud (spenta dall'interruttore a
  muro, Wi-Fi). Il tasto tiene l'ultimo stato che conosceva.

## Se qualcosa non va

- **Il pannello dice «chiave deck errata»:** nel campo c'è la chiave CLOUD, o una
  chiave diversa da quella salvata con `wrangler secret put TOKEN_DECK`.
- **Le sessioni cloud non compaiono:** controlla in una sessione nuova che le
  variabili `DECK_RELAY_URL` e `DECK_RELAY_TOKEN` ci siano, e che il dominio del
  Worker sia fra quelli permessi. Senza rete o senza chiavi l'hook tace apposta.
- **Le richieste del PC non arrivano:** manca l'hook locale in `settings.json`
  (punto 4), o Claude Code non è stato riavviato dopo averlo aggiunto.
- **Una novità dell'hook cloud non si vede:** l'hook lo serve il relay, quindi va
  ripubblicato (`npx wrangler@4 deploy` dalla cartella `relay`), e lo prendono le
  sessioni cloud aperte dopo: quelle già aperte tengono il loro.

## Per chi sviluppa

- Relay: `relay/src/bacheca.js` (logica, testata), `relay/src/index.js` (Worker).
  Prova in locale con `npx wrangler@4 dev` e un file `relay/.dev.vars` con
  `TOKEN_CLOUD` e `TOKEN_DECK`.
- Hook cloud: `cloud/deck-hook.mjs`. Dopo una modifica rigenera lo script di setup
  con `node tools/gen-setup.mjs`: un test fallisce se non corrispondono.
- Plugin: `src/relay.js` (sessioni e richieste cloud), `src/domande.js` (opzioni sui
  tasti), `src/supabase.js` (lettura o scrittura, PROD o STAGING), la riga in basso
  in `rigaInBasso` di `src/view.js`.
- Terza pagina: `src/imap.js` (il minimo di IMAP, senza dipendenze), `src/posta.js`
  `src/thecore.js` e `src/nexus.js` (cosa disegnano i tasti, puri), il disegno in
  `postaKey` e `thecoreKey` di `src/keyart.js` (il tasto Nexus usa la seconda).
- `npm test` esegue tutti i test, compresi quelli del relay e dell'hook.
