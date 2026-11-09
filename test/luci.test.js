import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import {
  percorso, stringaDaFirmare, firma, confLuci, TuyaCloud, ErroreTuya, capacitaDa, pctDaValore, valoreDaPct,
  statoDa, comandiPer, vistaLuce, dispositivoDa, HOST,
} from "../src/luci.js";

// ---------- la firma ----------
// Ricalcolata qui a mano, nella forma del kit ufficiale di Tuya per Node
// (@tuya/tuya-connector-nodejs 2.1.2): signStr = client_id + access_token + t +
// [METODO, sha256(corpo), "", url].join("\n"), HMAC-SHA256, esadecimale maiuscolo.
const VUOTO = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const hmac = (s, k) => createHmac("sha256", k).update(s, "utf8").digest("hex").toUpperCase();

test("firma: la stringa da firmare, con il corpo vuoto di un GET", () => {
  assert.equal(stringaDaFirmare("get", "", "/v1.0/token?grant_type=1"), `GET\n${VUOTO}\n\n/v1.0/token?grant_type=1`);
  const corpo = JSON.stringify({ commands: [{ code: "switch_led", value: true }] });
  const h = createHash("sha256").update(corpo).digest("hex");
  assert.equal(stringaDaFirmare("POST", corpo, "/v1.0/iot-03/devices/abc/commands"), `POST\n${h}\n\n/v1.0/iot-03/devices/abc/commands`);
});

test("firma: token senza access_token, richieste con, maiuscola", () => {
  const base = { clientId: "cid123", secret: "segreto", t: "1700000000000" };
  const s1 = firma({ ...base, metodo: "GET", firmato: "/v1.0/token?grant_type=1" });
  assert.equal(s1, hmac(`cid1231700000000000GET\n${VUOTO}\n\n/v1.0/token?grant_type=1`, "segreto"));
  assert.match(s1, /^[0-9A-F]{64}$/);
  const s2 = firma({ ...base, token: "tok", metodo: "GET", firmato: "/v1.0/iot-03/devices/d1/status" });
  assert.equal(s2, hmac(`cid123tok1700000000000GET\n${VUOTO}\n\n/v1.0/iot-03/devices/d1/status`, "segreto"));
});

test("firma: la query si firma in ordine e senza codifica, si chiama codificata", () => {
  const p = percorso("/v1.0/iot-01/associated-users/devices", { size: 50, last_row_key: "a b/c" });
  assert.equal(p.firmato, "/v1.0/iot-01/associated-users/devices?last_row_key=a b/c&size=50");
  assert.equal(p.chiamato, "/v1.0/iot-01/associated-users/devices?last_row_key=a%20b%2Fc&size=50");
  assert.deepEqual(percorso("/x"), { firmato: "/x", chiamato: "/x" });
});

test("le impostazioni: chiavi e data center (Europa centrale se non detto)", () => {
  assert.deepEqual(confLuci({ tuyaId: " abc ", tuyaSecret: "s" }), { clientId: "abc", secret: "s", regione: "eu", ok: true });
  assert.equal(confLuci({ tuyaId: "a", tuyaSecret: "s", tuyaRegione: "eu-w" }).regione, "eu-w");
  assert.equal(confLuci({ tuyaId: "a", tuyaSecret: "s", tuyaRegione: "marte" }).regione, "eu");
  assert.equal(confLuci({ tuyaId: "a" }).ok, false);
});

// ---------- il client, contro un Tuya finto che controlla la firma ----------
function tuyaFinto({ clientId = "cid", secret = "sec", dispositivi = [], token1010 = false, rifiutaToken = null, scadenzaS = 7200 } = {}) {
  const chiamate = [];
  let tokenNum = 0, scaduto = token1010;
  const f = async (url, init) => {
    const u = new URL(url);
    const h = init.headers;
    const corpo = init.body ?? "";
    const q = [...u.searchParams.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join("&");
    const firmato = u.pathname + (q ? `?${q}` : "");
    const atteso = hmac(clientId + (h.access_token ?? "") + h.t + `${init.method}\n${createHash("sha256").update(corpo).digest("hex")}\n\n${firmato}`, secret);
    chiamate.push({ metodo: init.method, path: u.pathname, query: Object.fromEntries(u.searchParams), headers: h, corpo });
    const rispondi = (o) => ({ status: 200, json: async () => ({ t: Date.now(), ...o }) });
    if (h.client_id !== clientId || h.sign !== atteso || h.sign_method !== "HMAC-SHA256") return rispondi({ success: false, code: 1004, msg: "sign invalid" });
    if (u.pathname === "/v1.0/token") {
      if (rifiutaToken) return rispondi({ success: false, code: rifiutaToken, msg: "permission deny" });
      tokenNum++;
      return rispondi({ success: true, result: { access_token: `tok${tokenNum}`, expire_time: scadenzaS, refresh_token: "r", uid: "u1" } });
    }
    if (h.access_token !== `tok${tokenNum}`) return rispondi({ success: false, code: 1010, msg: "token invalid" });
    if (scaduto) { scaduto = false; return rispondi({ success: false, code: 1010, msg: "token invalid" }); }
    if (u.pathname === "/v1.0/iot-01/associated-users/devices") {
      const da = u.searchParams.get("last_row_key") ? 2 : 0;
      const pagina = dispositivi.slice(da, da + 2);
      return rispondi({ success: true, result: { devices: pagina, has_more: da + 2 < dispositivi.length, last_row_key: da + 2 < dispositivi.length ? "k2" : "" } });
    }
    const m = /^\/v1\.0\/iot-03\/devices\/([^/]+)\/(specification|status|commands)$/.exec(u.pathname);
    if (m && m[2] === "specification") return rispondi({ success: true, result: { category: "dj", functions: [
      { code: "switch_led", type: "Boolean", values: "{}" },
      { code: "bright_value_v2", type: "Integer", values: "{\"min\":10,\"max\":1000,\"scale\":0,\"step\":1}" },
    ] } });
    if (m && m[2] === "status") return rispondi({ success: true, result: [{ code: "switch_led", value: true }, { code: "bright_value_v2", value: 500 }] });
    if (m && m[2] === "commands") return rispondi({ success: true, result: true });
    return { status: 404, json: async () => ({ success: false, code: 1108, msg: "uri path invalid" }) };
  };
  return { f, chiamate };
}

test("client: token, poi elenco a pagine, specifica, stato e comandi, tutti firmati", async () => {
  const devs = [{ id: "d1", name: "Lampada studio", category: "dj", online: true }, { id: "d2", name: "Striscia LED", category: "dd", online: true }, { id: "d3", name: "Presa", category: "cz", online: false }];
  const { f, chiamate } = tuyaFinto({ dispositivi: devs });
  const c = new TuyaCloud({ clientId: "cid", secret: "sec", regione: "eu", fetch: f });
  const elenco = await c.dispositivi();
  assert.deepEqual(elenco.map((d) => [d.id, d.nome, d.online]), [["d1", "Lampada studio", true], ["d2", "Striscia LED", true], ["d3", "Presa", false]]);
  assert.equal(chiamate[0].path, "/v1.0/token");
  assert.equal(chiamate[0].headers.access_token, undefined, "la richiesta del token non porta un token");
  assert.equal(chiamate.filter((x) => x.path === "/v1.0/token").length, 1, "un token solo per più richieste");
  const cap = capacitaDa(await c.specifica("d1"));
  assert.deepEqual(statoDa(await c.stato("d1"), cap), { acceso: true, pct: 50 });
  await c.comandi("d1", [{ code: "switch_led", value: false }]);
  const ultimo = chiamate.at(-1);
  assert.equal(ultimo.metodo, "POST");
  assert.deepEqual(JSON.parse(ultimo.corpo), { commands: [{ code: "switch_led", value: false }] });
  assert.equal(ultimo.headers["Content-Type"], "application/json");
  // Che ogni richiesta sia andata a buon fine vuol dire che il Tuya finto ha
  // riconosciuto ogni firma: altrimenti risponde 1004 e la richiesta solleva.
  assert.match(new URL("https://" + HOST.eu).host, /tuyaeu/);
});

test("client: un token scaduto (1010) si rinnova una volta e la richiesta riparte", async () => {
  const { f, chiamate } = tuyaFinto({ dispositivi: [{ id: "d1", name: "x" }], token1010: true });
  const c = new TuyaCloud({ clientId: "cid", secret: "sec", fetch: f });
  assert.equal((await c.dispositivi()).length, 1);
  assert.equal(chiamate.filter((x) => x.path === "/v1.0/token").length, 2);
});

test("client: un token scaduto si richiede senza mandare quello vecchio", async () => {
  const { f, chiamate } = tuyaFinto({ dispositivi: [{ id: "d1", name: "x" }], scadenzaS: 120 });
  let adesso = 1_800_000_000_000;
  const c = new TuyaCloud({ clientId: "cid", secret: "sec", fetch: f, ora: () => adesso });
  await c.dispositivi();
  adesso += 5 * 60_000; // oltre la scadenza
  await c.dispositivi();
  const token = chiamate.filter((x) => x.path === "/v1.0/token");
  assert.equal(token.length, 2);
  assert.equal(token[1].headers.access_token, undefined);
});

test("client: chiavi sbagliate o permessi mancanti sono un errore di chiave, non di rete", async () => {
  const sbagliata = new TuyaCloud({ clientId: "cid", secret: "altro", fetch: tuyaFinto().f });
  await assert.rejects(sbagliata.dispositivi(), (e) => e instanceof ErroreTuya && e.tipo === "chiave" && e.codice === 1004);
  const senzaPermessi = new TuyaCloud({ clientId: "cid", secret: "sec", fetch: tuyaFinto({ rifiutaToken: 1106 }).f });
  await assert.rejects(senzaPermessi.dispositivi(), (e) => e.tipo === "chiave");
  const giu = new TuyaCloud({ clientId: "cid", secret: "sec", fetch: async () => { throw new Error("ECONNRESET"); } });
  await assert.rejects(giu.dispositivi(), (e) => e.tipo === "rete");
});

// ---------- che cosa sa fare una luce ----------
const SPEC_LUCE = { functions: [
  { code: "switch_led", type: "Boolean", values: "{}" },
  { code: "work_mode", type: "Enum", values: "{\"range\":[\"white\",\"colour\"]}" },
  { code: "bright_value_v2", type: "Integer", values: "{\"min\":10,\"max\":1000,\"scale\":0,\"step\":1}" },
] };
const SPEC_VECCHIA = { functions: [{ code: "switch_led", values: "{}" }, { code: "bright_value", values: "{\"min\":25,\"max\":255,\"step\":1}" }] };
const SPEC_PRESA = { functions: [{ code: "switch_1", type: "Boolean", values: "{}" }, { code: "countdown_1", type: "Integer", values: "{}" }] };

test("capacità: interruttore e luminosità dalla specifica, con il loro intervallo", () => {
  assert.deepEqual(capacitaDa(SPEC_LUCE), { interruttore: "switch_led", luminosita: { code: "bright_value_v2", min: 10, max: 1000, step: 1 } });
  assert.deepEqual(capacitaDa(SPEC_VECCHIA).luminosita, { code: "bright_value", min: 25, max: 255, step: 1 });
  assert.deepEqual(capacitaDa(SPEC_PRESA), { interruttore: "switch_1", luminosita: null });
  assert.deepEqual(capacitaDa({}), { interruttore: null, luminosita: null });
});

test("percentuali: 1–100 sull'intervallo del dispositivo, andata e ritorno", () => {
  const r = { min: 10, max: 1000, step: 1 };
  assert.equal(valoreDaPct(1, r), 10);
  assert.equal(valoreDaPct(100, r), 1000);
  assert.equal(valoreDaPct(50, r), 500);
  for (const p of [1, 7, 20, 33, 50, 81, 100]) assert.equal(pctDaValore(valoreDaPct(p, r), r), p, `andata e ritorno ${p}`);
  const v = { min: 25, max: 255, step: 1 };
  for (const p of [1, 20, 50, 100]) assert.equal(pctDaValore(valoreDaPct(p, v), v), p);
  assert.equal(valoreDaPct(500, r), 1000, "oltre il 100 resta al massimo");
});

test("stato: acceso e percentuale; una presa ha solo acceso", () => {
  const cap = capacitaDa(SPEC_LUCE);
  assert.deepEqual(statoDa([{ code: "switch_led", value: false }, { code: "bright_value_v2", value: 1000 }], cap), { acceso: false, pct: 100 });
  assert.deepEqual(statoDa([{ code: "switch_1", value: true }], capacitaDa(SPEC_PRESA)), { acceso: true, pct: null });
  assert.equal(statoDa(null, cap), null);
});

test("pressione: l'interruttore accende e spegne; uno stato sconosciuto spegne", () => {
  const cap = capacitaDa(SPEC_LUCE);
  assert.deepEqual(comandiPer({}, { acceso: true, pct: 60 }, cap), { commands: [{ code: "switch_led", value: false }], atteso: { acceso: false, pct: 60 } });
  assert.deepEqual(comandiPer({ azione: "interruttore" }, { acceso: false, pct: 60 }, cap).commands, [{ code: "switch_led", value: true }]);
  assert.deepEqual(comandiPer({}, null, cap).commands, [{ code: "switch_led", value: false }]);
});

test("pressione: più e meno di un passo; più su una luce spenta la accende, meno non la spegne", () => {
  const cap = capacitaDa(SPEC_LUCE);
  const piu = comandiPer({ azione: "piu", passo: 20 }, { acceso: true, pct: 60 }, cap);
  assert.deepEqual(piu.commands, [{ code: "bright_value_v2", value: valoreDaPct(80, cap.luminosita) }]);
  assert.equal(comandiPer({ azione: "piu" }, { acceso: true, pct: 95 }, cap).atteso.pct, 100);
  const accende = comandiPer({ azione: "piu", passo: 20 }, { acceso: false, pct: 5 }, cap);
  assert.deepEqual(accende.commands[0], { code: "switch_led", value: true });
  assert.equal(accende.atteso.pct, 20);
  const meno = comandiPer({ azione: "meno", passo: 25 }, { acceso: true, pct: 10 }, cap);
  assert.equal(meno.atteso.pct, 1);
  assert.ok(!meno.commands.some((c) => c.code === "switch_led"), "meno non tocca l'interruttore");
});

test("pressione: livello accende a quella percentuale; una presa non sa regolare", () => {
  const cap = capacitaDa(SPEC_LUCE);
  assert.deepEqual(comandiPer({ azione: "livello", livello: 30 }, { acceso: false, pct: 90 }, cap).commands,
    [{ code: "switch_led", value: true }, { code: "bright_value_v2", value: valoreDaPct(30, cap.luminosita) }]);
  assert.equal(comandiPer({ azione: "piu" }, { acceso: true }, capacitaDa(SPEC_PRESA)), null);
  assert.equal(comandiPer({}, { acceso: true }, null), null);
});

test("il tasto: cosa dice in ogni caso", () => {
  const conf = { ok: true };
  const d = dispositivoDa({ id: "d1", name: "Lampada studio", online: true });
  const cap = capacitaDa(SPEC_LUCE);
  assert.equal(vistaLuce({ conf: { ok: false } }).sub, "chiavi Tuya?");
  assert.equal(vistaLuce({ conf }).sub, "scegli la luce");
  const acc = vistaLuce({ conf, settings: { dispositivo: "d1" }, dispositivo: d, cap, rec: { stato: { acceso: true, pct: 60 } } });
  assert.deepEqual([acc.titolo, acc.valore, acc.acceso, acc.sub], ["Lampada studio", "60%", true, "tocca per spegnere"]);
  const sp = vistaLuce({ conf, settings: { dispositivo: "d1", label: "Studio" }, dispositivo: d, cap, rec: { stato: { acceso: false, pct: 60 } } });
  assert.deepEqual([sp.titolo, sp.valore, sp.acceso], ["Studio", "Spenta", false]);
  assert.equal(vistaLuce({ conf, settings: { dispositivo: "d1", azione: "piu", passo: 10 }, dispositivo: d, cap, rec: { stato: { acceso: true, pct: 60 } } }).sub, "+10%");
  assert.equal(vistaLuce({ conf, settings: { dispositivo: "d1" }, dispositivo: { ...d, online: false }, rec: {} }).sub, "offline");
  assert.equal(vistaLuce({ conf, settings: { dispositivo: "d1" }, dispositivo: d, rec: { errTipo: "chiave" } }).valore, "!");
  // Un errore di rete non cancella lo stato che si sapeva: lo dice e lo tiene.
  const vecchio = vistaLuce({ conf, settings: { dispositivo: "d1" }, dispositivo: d, cap, rec: { stato: { acceso: true, pct: 40 }, err: "rete" } });
  assert.deepEqual([vecchio.valore, vecchio.sub], ["40%", "offline"]);
  assert.equal(vistaLuce({ conf, settings: { dispositivo: "d3", azione: "piu" }, dispositivo: d, cap: capacitaDa(SPEC_PRESA), rec: { stato: { acceso: true, pct: null } } }).sub, "non regolabile");
});
