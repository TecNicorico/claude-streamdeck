// Il client IMAP del tasto Posta contro un server finto che parla come Gmail.
//
// Il modo in cui si rompe è silenzioso: un SELECT al posto di EXAMINE segna come
// lette le mail di chi guarda il deck; una password con gli spazi della schermata
// di Google viene rifiutata e sembra «credenziali sbagliate»; i messaggi contati al
// posto delle conversazioni danno un numero diverso da quello di Gmail. Ogni test
// guarda cosa il client MANDA, non solo cosa restituisce.
import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import {
  contaNonLette, quoted, passwordPulita, idDaSearch, unseenDaStatus, filiDaFetch, insieme, tipoRifiuto, ImapErrore,
} from "../src/imap.js";

// Un server IMAP finto: risponde ai comandi con `risposte(comando)` e ricorda cosa
// ha ricevuto. `risposte` restituisce le righe non etichettate e lo stato del tag.
async function serverFinto(risposte, { saluto = "* OK Gimap ready", muto = false } = {}) {
  const ricevuti = [];
  const srv = net.createServer((sock) => {
    if (!muto) sock.write(saluto + "\r\n");
    let buf = "";
    sock.on("data", (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf("\r\n")) >= 0) {
        const l = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const [tag, ...resto] = l.split(" ");
        const cmd = resto.join(" ");
        ricevuti.push(cmd);
        if (/^LOGOUT/i.test(cmd)) { sock.end(`* BYE\r\n${tag} OK LOGOUT completed\r\n`); return; }
        const { righe = [], stato = "OK done" } = risposte(cmd) ?? {};
        sock.write(righe.map((r) => r + "\r\n").join("") + `${tag} ${stato}\r\n`);
      }
    });
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const port = srv.address().port;
  return {
    ricevuti,
    connect: () => net.connect(port, "127.0.0.1"),
    chiudi: () => new Promise((r) => srv.close(r)),
  };
}

const GMAIL = (cmd) => {
  if (/^LOGIN/.test(cmd)) return { righe: ["* CAPABILITY IMAP4rev1 X-GM-EXT-1"], stato: "OK user authenticated (Success)" };
  if (/^EXAMINE/.test(cmd)) return { righe: ["* FLAGS (\\Seen)", "* 120 EXISTS"], stato: "OK [READ-ONLY] INBOX selected." };
  if (/^SEARCH X-GM-RAW/.test(cmd)) return { righe: ["* SEARCH 4 5 6 9"] };
  if (/^FETCH/.test(cmd)) {
    return { righe: [
      "* 4 FETCH (X-GM-THRID 1001)", "* 5 FETCH (X-GM-THRID 1001)",
      "* 6 FETCH (X-GM-THRID 1002)", "* 9 FETCH (X-GM-THRID 1003)",
    ] };
  }
  if (/^STATUS/.test(cmd)) return { righe: ['* STATUS "INBOX" (UNSEEN 17)'] };
  return { stato: "BAD unknown" };
};

test("principale: conta le conversazioni, apre in sola lettura, toglie gli spazi dalla password", { timeout: 5000 }, async () => {
  const s = await serverFinto(GMAIL);
  try {
    const r = await contaNonLette({ user: "enrico@example.com", pass: "abcd efgh ijkl mnop" }, { connect: s.connect });
    assert.deepEqual(r, { n: 3, messaggi: 4, modo: "principale" });
    assert.equal(s.ricevuti[0], 'LOGIN "enrico@example.com" "abcdefghijklmnop"');
    assert.ok(s.ricevuti.includes('EXAMINE "INBOX"'), "deve aprire con EXAMINE");
    assert.ok(!s.ricevuti.some((c) => /^SELECT/i.test(c)), "SELECT segnerebbe le mail come lette");
    assert.ok(s.ricevuti.includes('SEARCH X-GM-RAW "category:primary is:unread"'));
    assert.ok(s.ricevuti.includes("FETCH 4:6,9 (X-GM-THRID)"));
    assert.equal(s.ricevuti.at(-1), "LOGOUT");
  } finally { await s.chiudi(); }
});

test("tutta: STATUS UNSEEN, senza aprire la casella", { timeout: 5000 }, async () => {
  const s = await serverFinto(GMAIL);
  try {
    const r = await contaNonLette({ user: "a@b.it", pass: "x", modo: "tutta" }, { connect: s.connect });
    assert.deepEqual(r, { n: 17, messaggi: 17, modo: "tutta" });
    assert.ok(!s.ricevuti.some((c) => /^(SELECT|EXAMINE)/i.test(c)));
  } finally { await s.chiudi(); }
});

test("nessuna non letta: zero, senza FETCH", { timeout: 5000 }, async () => {
  const s = await serverFinto((cmd) => (/^SEARCH/.test(cmd) ? { righe: ["* SEARCH"] } : GMAIL(cmd)));
  try {
    const r = await contaNonLette({ user: "a@b.it", pass: "x" }, { connect: s.connect });
    assert.deepEqual(r, { n: 0, messaggi: 0, modo: "principale" });
    assert.ok(!s.ricevuti.some((c) => /^FETCH/.test(c)));
  } finally { await s.chiudi(); }
});

test("una password rifiutata è «credenziali», e si esce lo stesso", { timeout: 5000 }, async () => {
  const s = await serverFinto((cmd) =>
    /^LOGIN/.test(cmd) ? { stato: "NO [AUTHENTICATIONFAILED] Invalid credentials (Failure)" } : GMAIL(cmd));
  try {
    await assert.rejects(
      contaNonLette({ user: "a@b.it", pass: "sbagliata" }, { connect: s.connect }),
      (e) => e instanceof ImapErrore && e.tipo === "credenziali",
    );
    assert.equal(s.ricevuti.at(-1), "LOGOUT");
  } finally { await s.chiudi(); }
});

test("un server muto va in timeout, non resta appeso", { timeout: 5000 }, async () => {
  const s = await serverFinto(GMAIL, { muto: true });
  try {
    await assert.rejects(
      contaNonLette({ user: "a@b.it", pass: "x", timeoutMs: 300 }, { connect: s.connect }),
      (e) => e instanceof ImapErrore && e.tipo === "timeout",
    );
  } finally { await s.chiudi(); }
});

test("una porta chiusa è un errore di rete", { timeout: 5000 }, async () => {
  const s = await serverFinto(GMAIL);
  await s.chiudi();
  await assert.rejects(
    contaNonLette({ user: "a@b.it", pass: "x" }, { connect: s.connect }),
    (e) => e instanceof ImapErrore && e.tipo === "rete",
  );
});

test("senza indirizzo o password non ci si collega nemmeno", async () => {
  let chiamato = false;
  await assert.rejects(contaNonLette({ user: "", pass: "x" }, { connect: () => { chiamato = true; } }),
    (e) => e.tipo === "credenziali");
  assert.equal(chiamato, false);
});

test("le stringhe IMAP: virgolette e barre protette, un a capo rifiutato", () => {
  assert.equal(quoted('pa"ss\\w'), '"pa\\"ss\\\\w"');
  assert.throws(() => quoted("a\r\nb LOGOUT"), ImapErrore);
  assert.equal(passwordPulita(" abcd efgh\tijkl mnop "), "abcdefghijklmnop");
});

test("le risposte del server", () => {
  assert.deepEqual(idDaSearch(["* SEARCH 1 2 30"]), [1, 2, 30]);
  assert.deepEqual(idDaSearch(["* SEARCH"]), []);
  assert.equal(unseenDaStatus(['* STATUS "INBOX" (MESSAGES 5 UNSEEN 3)']), 3);
  assert.equal(unseenDaStatus(["* OK"]), null);
  assert.deepEqual([...filiDaFetch(["* 1 FETCH (X-GM-THRID 7 UID 3)", "* 2 FETCH (UID 4 X-GM-THRID 7)", "* 3 FETCH (X-GM-THRID 8)"])], ["7", "8"]);
  assert.equal(insieme([9, 4, 5, 6, 6, 12, 13]), "4:6,9,12:13");
  assert.equal(tipoRifiuto("NO [AUTHENTICATIONFAILED] Invalid credentials (Failure)"), "credenziali");
  assert.equal(tipoRifiuto("NO [ALERT] IMAP access is disabled for your domain."), "rifiutato");
});
