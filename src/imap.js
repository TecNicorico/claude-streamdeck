// Il minimo di IMAP per contare le mail da leggere di una casella Gmail o Google
// Workspace, senza dipendenze (il plugin ha solo `ws`).
//
// Una lettura è una connessione: TLS su imap.gmail.com:993, LOGIN con la password
// per le app, EXAMINE (sola lettura: aprire la casella NON segna niente come letto,
// a differenza di SELECT), la ricerca, LOGOUT. Niente IDLE, niente connessioni
// tenute aperte: il tasto legge ogni due minuti, e una connessione ferma è una cosa
// in più che si rompe di notte.
//
// Due modi di contare:
//   principale  le CONVERSAZIONI non lette della scheda Principale, cioè il numero
//               che Gmail scrive accanto a «Posta in arrivo» con le schede accese
//               (X-GM-RAW è la ricerca di Gmail, X-GM-THRID il filo della
//               conversazione);
//   tutta       i MESSAGGI non letti di tutta la posta in arrivo (STATUS UNSEEN),
//               promozioni e social compresi.
//
// Le funzioni di parsing sono pure e testate; `contaNonLette` riceve la connessione
// da fuori (`connect`), così il test la fa parlare con un server finto.
import tls from "node:tls";

export const HOST_GMAIL = "imap.gmail.com";
export const PORTA_IMAPS = 993;
export const MODI = ["principale", "tutta"];
// Oltre questo numero di non lette non si chiede il filo di ognuna: il tasto
// scriverebbe comunque «999+», e una FETCH di migliaia di righe ogni due minuti
// non dice niente di più.
export const MAX_FILI = 999;

export class ImapErrore extends Error {
  // tipo: "credenziali" | "rifiutato" | "timeout" | "rete" | "protocollo"
  constructor(tipo, messaggio) {
    super(messaggio);
    this.name = "ImapErrore";
    this.tipo = tipo;
  }
}

// Una stringa IMAP fra virgolette (RFC 3501 §4.3): \ e " si proteggono, e un a capo
// non può starci — sarebbe un comando nuovo nel mezzo di questo.
export function quoted(s) {
  const t = String(s ?? "");
  if (/[\r\n\0]/.test(t)) throw new ImapErrore("protocollo", "un a capo non può stare in una stringa IMAP");
  return '"' + t.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

// La password per le app Google si mostra a gruppi di quattro («abcd efgh ijkl
// mnop»): gli spazi non fanno parte della password.
export function passwordPulita(p) {
  return String(p ?? "").replace(/\s+/g, "");
}

// «* SEARCH 4 7 12» → [4, 7, 12]; «* SEARCH» → [].
export function idDaSearch(righe) {
  const out = [];
  for (const r of righe) {
    const m = /^\* SEARCH(?: (.*))?$/i.exec(r);
    if (!m) continue;
    for (const x of (m[1] ?? "").trim().split(/\s+/)) if (/^\d+$/.test(x)) out.push(Number(x));
  }
  return out;
}

// «* STATUS "INBOX" (UNSEEN 5)» → 5, o null se la riga non c'è.
export function unseenDaStatus(righe) {
  for (const r of righe) {
    const m = /^\* STATUS .*\(.*\bUNSEEN (\d+).*\)\s*$/i.exec(r);
    if (m) return Number(m[1]);
  }
  return null;
}

// «* 12 FETCH (X-GM-THRID 1278455344230334865)» → l'insieme dei fili.
export function filiDaFetch(righe) {
  const fili = new Set();
  for (const r of righe) {
    const m = /^\* \d+ FETCH \(.*\bX-GM-THRID (\d+)/i.exec(r);
    if (m) fili.add(m[1]);
  }
  return fili;
}

// 4,5,6,9 → "4:6,9": una FETCH su mille id resta una riga corta.
export function insieme(ids) {
  const s = [...new Set(ids)].sort((a, b) => a - b);
  const parti = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    parti.push(j > i ? `${s[i]}:${s[j]}` : String(s[i]));
    i = j;
  }
  return parti.join(",");
}

// Il tipo di un rifiuto, dal codice di risposta che Gmail mette fra quadre.
export function tipoRifiuto(testo) {
  if (/\[(AUTHENTICATIONFAILED|AUTHORIZATIONFAILED)\]/i.test(testo) || /invalid credentials/i.test(testo)) return "credenziali";
  return "rifiutato";
}

// ---------- la conversazione ----------
// Un comando alla volta: si manda, si raccolgono le righe non etichettate, ci si
// ferma alla riga col proprio tag. Nessuna delle risposte che chiediamo porta
// letterali ({n}), quindi le righe bastano.
function sessione(sock, timeoutMs) {
  let buf = "";
  let attesa = null; // { tag, righe, resolve, reject } oppure { saluto, resolve, reject }
  let fine = null;
  let seq = 0;

  const chiudi = (err) => {
    if (fine) return;
    fine = err ?? new ImapErrore("rete", "connessione chiusa");
    clearTimeout(timer);
    if (attesa) { attesa.reject(fine); attesa = null; }
    sock.destroy();
  };
  const timer = setTimeout(() => chiudi(new ImapErrore("timeout", `nessuna risposta in ${Math.round(timeoutMs / 1000)} s`)), timeoutMs);

  const riga = (l) => {
    if (!attesa) return;
    if (attesa.saluto) {
      if (/^\* (OK|PREAUTH)\b/i.test(l)) { const a = attesa; attesa = null; a.resolve(); }
      else if (/^\* BYE\b/i.test(l)) chiudi(new ImapErrore("rifiutato", l.slice(2)));
      return;
    }
    if (l.startsWith(attesa.tag + " ")) {
      const resto = l.slice(attesa.tag.length + 1);
      const a = attesa;
      attesa = null;
      if (/^OK\b/i.test(resto)) a.resolve(a.righe);
      else a.reject(new ImapErrore(tipoRifiuto(resto), resto.replace(/^(NO|BAD)\s*/i, "")));
      return;
    }
    attesa.righe.push(l);
  };

  sock.setEncoding?.("utf8");
  sock.on("data", (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf("\r\n")) >= 0) {
      const l = buf.slice(0, i);
      buf = buf.slice(i + 2);
      riga(l);
    }
  });
  sock.on("error", (e) => chiudi(new ImapErrore("rete", String(e?.code ?? e?.message ?? e))));
  sock.on("close", () => chiudi());

  return {
    saluto() {
      if (fine) return Promise.reject(fine);
      return new Promise((resolve, reject) => { attesa = { saluto: true, resolve, reject }; });
    },
    comando(testo) {
      if (fine) return Promise.reject(fine);
      const tag = "a" + ++seq;
      return new Promise((resolve, reject) => {
        attesa = { tag, righe: [], resolve, reject };
        sock.write(`${tag} ${testo}\r\n`);
      });
    },
    // LOGOUT di cortesia: se il server chiude prima di rispondere, va bene lo stesso.
    async esci() {
      try { await this.comando("LOGOUT"); } catch { /* il server può chiudere per primo */ }
      chiudi(new ImapErrore("rete", "chiusa"));
    },
    chiudi,
  };
}

function connettiTls({ host, port }) {
  return tls.connect({ host, port, servername: host });
}

// { n, messaggi, modo }: n = conversazioni (principale) o messaggi (tutta);
// messaggi = i messaggi non letti trovati. Ogni guasto è un ImapErrore col suo tipo.
export async function contaNonLette(
  { user, pass, modo = "principale", host = HOST_GMAIL, port = PORTA_IMAPS, timeoutMs = 20_000 },
  { connect = connettiTls } = {},
) {
  if (!user || !pass) throw new ImapErrore("credenziali", "mancano indirizzo o password");
  const m = MODI.includes(modo) ? modo : "principale";
  const s = sessione(connect({ host, port }), timeoutMs);
  try {
    await s.saluto();
    await s.comando(`LOGIN ${quoted(user)} ${quoted(passwordPulita(pass))}`);
    if (m === "tutta") {
      const n = unseenDaStatus(await s.comando('STATUS "INBOX" (UNSEEN)'));
      if (n == null) throw new ImapErrore("protocollo", "STATUS senza UNSEEN");
      return { n, messaggi: n, modo: m };
    }
    await s.comando('EXAMINE "INBOX"');
    const ids = idDaSearch(await s.comando(`SEARCH X-GM-RAW ${quoted("category:primary is:unread")}`));
    if (!ids.length) return { n: 0, messaggi: 0, modo: m };
    if (ids.length > MAX_FILI) return { n: ids.length, messaggi: ids.length, modo: m };
    const fili = filiDaFetch(await s.comando(`FETCH ${insieme(ids)} (X-GM-THRID)`));
    // Un server che non dà i fili: si contano i messaggi, che è meglio di zero.
    return { n: fili.size || ids.length, messaggi: ids.length, modo: m };
  } finally {
    await s.esci();
  }
}
