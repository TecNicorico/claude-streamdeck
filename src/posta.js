// Il tasto Posta: quante mail ci sono da leggere in una casella Gmail o Google
// Workspace, e premuto apre Gmail su quell'account. Tutto ciò che decide sta qui,
// puro; la lettura vera è src/imap.js, il poller è in plugin.js.
//
// Dove sta cosa:
//   impostazioni del TASTO   email, modo («principale» o «tutta»), etichetta
//   impostazioni GLOBALI     la password per le app, per indirizzo:
//                            { posta: { "<email>": { password } } }
// La password non sta nel tasto apposta: le impostazioni di un tasto finiscono
// dentro il profilo quando lo si esporta, quelle globali no.

export const INTERVALLO_POSTA_MS = 120_000;
// Dopo un guasto di rete o del server si riprova più piano.
export const RITARDO_ERRORE_MS = 300_000;

export function normEmail(s) {
  const e = String(s ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : "";
}

export function modoDi(settings) {
  return settings?.modo === "tutta" ? "tutta" : "principale";
}

// Gmail sull'account giusto, qualunque sia la sua posizione fra quelli collegati
// nel browser: `authuser` per indirizzo, non per numero (/u/0, /u/1 cambiano
// quando si aggiunge o si toglie un account).
export function urlGmail(email) {
  const e = normEmail(email);
  return e ? `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(e)}` : "https://mail.google.com/mail/";
}

export function passwordDi(globalSettings, email) {
  const e = normEmail(email);
  const p = e ? globalSettings?.posta?.[e]?.password : "";
  return typeof p === "string" ? p : "";
}

export function chiaveLettura(email, modo) {
  return `${normEmail(email)}|${modo}`;
}

// Le caselle che i tasti visibili chiedono, una volta sola per indirizzo e modo.
export function caselleDaLeggere(views, globalSettings) {
  const out = new Map();
  for (const v of views) {
    if (v?.kind !== "posta") continue;
    const email = normEmail(v.settings?.email);
    const pass = passwordDi(globalSettings, email);
    if (!email || !pass) continue;
    const modo = modoDi(v.settings);
    out.set(chiaveLettura(email, modo), { email, modo, pass });
  }
  return [...out.entries()].map(([chiave, c]) => ({ chiave, ...c }));
}

// Quando rileggere una casella. Una password rifiutata NON si riprova da sola:
// Google blocca un account dopo troppi accessi falliti, e il tasto che martella
// ogni due minuti sarebbe il modo più rapido per farselo bloccare. Si riprova
// quando la password cambia (`impronta`).
export function prossimaLettura(rec, now, impronta) {
  if (!rec) return now;
  if (rec.err === "credenziali" && rec.impronta === impronta) return Infinity;
  if (rec.err && rec.impronta === impronta) return rec.at + RITARDO_ERRORE_MS;
  if (rec.impronta !== impronta) return now;
  return rec.at + INTERVALLO_POSTA_MS;
}

const ora = (t) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function numeroBreve(n) {
  return n > 999 ? "999+" : String(n);
}

// Che cosa disegna il tasto. tono: null | "attenzione" (serve fare qualcosa qui).
export function vistaPosta({ settings, rec, haPassword }) {
  const email = normEmail(settings?.email);
  const etichetta = String(settings?.label ?? "").trim() || (email ? email.split("@")[0] : "posta");
  const modo = modoDi(settings);
  const out = (valore, sub, tono = null) => ({ titolo: etichetta, valore, sub, tono, email });
  if (!email) return out("—", "imposta l'indirizzo");
  if (!haPassword) return out("—", "manca la password", "attenzione");
  if (!rec) return out("…", "lettura…");
  if (rec.err === "credenziali") return out("!", "password rifiutata", "attenzione");
  if (rec.err === "rifiutato" && rec.n == null) return out("!", "IMAP rifiutato", "attenzione");
  if (rec.n == null) return out("--", rec.err === "timeout" ? "non risponde" : "non raggiungibile");
  const valore = numeroBreve(rec.n);
  // Un numero vecchio resta, ma dice di che ora è: meglio di un «--» che fa
  // credere di non avere posta, e meglio di un numero che sembra di adesso.
  if (rec.err) return out(valore, `offline · ${ora(rec.okAt ?? rec.at)}`);
  if (rec.n === 0) return out(valore, "tutto letto");
  return out(valore, modo === "tutta" ? "in arrivo" : "da leggere");
}

// Da ciò che il tasto dice a come lo disegna (keyart: postaKey). Il conteggio va nel
// badge delle menzioni di Discord: rosso se è di adesso, grigio se è l'ultimo letto
// prima di un guasto; un problema da risolvere è un badge giallo «!». Zero non ha
// badge, come in Discord. La busta è spenta finché non c'è un numero.
export function facciaPosta(v) {
  const conto = /^\d+\+?$/.test(v.valore);
  const offline = String(v.sub).startsWith("offline");
  const etichetta = String(v.titolo);
  return {
    etichetta: etichetta.charAt(0).toUpperCase() + etichetta.slice(1),
    badge: conto && v.valore !== "0" ? { testo: v.valore, tono: offline ? "spento" : "nuovo" }
      : v.valore === "!" ? { testo: "!", tono: "attenzione" } : null,
    riga: v.sub,
    rigaTono: v.tono === "attenzione" ? "attenzione" : "normale",
    spenta: !conto && v.valore !== "!",
  };
}

// La riga di stato del pannello delle impostazioni.
export function statoPosta({ settings, rec, haPassword }) {
  const email = normEmail(settings?.email);
  if (!email) return "Scrivi l'indirizzo della casella.";
  if (!haPassword) return "Manca la password per le app di questo indirizzo.";
  if (!rec) return "In lettura…";
  if (rec.err === "credenziali") return "Google ha rifiutato la password: generane una nuova e incollala qui. Il tasto non riprova da solo.";
  if (rec.err === "rifiutato") return "Google ha rifiutato l'accesso IMAP: per un account di lavoro, l'amministratore può averlo spento.";
  if (rec.err) return `Non raggiungibile (${rec.err})${rec.n != null ? `: l'ultimo numero è delle ${ora(rec.okAt ?? rec.at)}` : ""}.`;
  return `Collegato · ${rec.n} ${modoDi(settings) === "tutta" ? "messaggi" : "conversazioni"} da leggere · ${ora(rec.at)}`;
}
