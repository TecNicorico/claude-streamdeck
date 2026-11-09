// Le luci di Smart Life (Tuya) sul deck, e la logica del tasto Luce comune a tutte le
// fonti (pianoPer, vistaLuce; Alexa è in src/alexa.js). Provato da test/luci.test.js.
//
// Alexa non ha un modo ufficiale per comandare i dispositivi da un altro programma, e
// le strade non ufficiali usano il login di Amazon e si rompono quando Amazon cambia.
// Alexa però è solo un telecomando sopra Smart Life, e Smart Life è Tuya: il plugin
// parla col cloud di Tuya, con le chiavi di un progetto sviluppatore gratuito
// collegato all'app (DECK-REMOTO.md, «Le luci di Smart Life»).
//
// La firma è quella del kit ufficiale di Tuya per Node (@tuya/tuya-connector-nodejs
// 2.1.2, core/client.js) e di tinytuya (Cloud.py), letti il 09/11/2026:
//   stringToSign = METODO \n sha256(corpo) \n "" \n percorso?query-ordinata-non-codificata
//   sign = HMAC-SHA256(client_id + access_token + t + stringToSign, secret), esadecimale MAIUSCOLO
// (senza access_token per la richiesta del token). Un GET non ha corpo: sha256("").
import { createHash, createHmac } from "node:crypto";

export const HOST = {
  eu: "openapi.tuyaeu.com",          // Europa centrale: di solito l'Italia
  "eu-w": "openapi-weaz.tuyaeu.com", // Europa occidentale
  us: "openapi.tuyaus.com",
  "us-e": "openapi-ueaz.tuyaus.com",
  cn: "openapi.tuyacn.com",
  in: "openapi.tuyain.com",
};
export const REGIONI = Object.keys(HOST);

export const INTERVALLO_LUCI_MS = 60_000;    // lo stato, solo con un tasto a schermo
export const ELENCO_MS = 10 * 60_000;        // l'elenco dei dispositivi
export const RITARDO_ERRORE_LUCI_MS = 2 * 60_000;
export const RILETTURA_DOPO_MS = 1_500;      // dopo una pressione, lo stato vero

const sha256 = (s) => createHash("sha256").update(s ?? "", "utf8").digest("hex");

// Il percorso da firmare: la query in ordine di chiave e NON codificata (la firma si
// calcola prima della codifica); quello da chiamare: la stessa, codificata.
export function percorso(path, query = {}) {
  const chiavi = Object.keys(query ?? {}).filter((k) => query[k] != null && query[k] !== "").sort();
  const firmato = chiavi.length ? `${path}?${chiavi.map((k) => `${k}=${query[k]}`).join("&")}` : path;
  const chiamato = chiavi.length ? `${path}?${chiavi.map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`).join("&")}` : path;
  return { firmato, chiamato };
}

export function stringaDaFirmare(metodo, corpo, firmato) {
  return [String(metodo).toUpperCase(), sha256(corpo ?? ""), "", firmato].join("\n");
}

export function firma({ clientId, secret, token = "", t, metodo, corpo = "", firmato }) {
  const s = String(clientId) + String(token ?? "") + String(t) + stringaDaFirmare(metodo, corpo, firmato);
  return createHmac("sha256", String(secret)).update(s, "utf8").digest("hex").toUpperCase();
}

// Le impostazioni globali del deck (Property Inspector del tasto Luce).
export function confLuci(gs) {
  const clientId = String(gs?.tuyaId ?? "").trim();
  const secret = String(gs?.tuyaSecret ?? "").trim();
  const regione = HOST[gs?.tuyaRegione] ? gs.tuyaRegione : "eu";
  return { clientId, secret, regione, ok: !!(clientId && secret) };
}

export class ErroreTuya extends Error {
  constructor(messaggio, { codice = null, tipo = "server" } = {}) {
    super(messaggio);
    this.codice = codice;
    this.tipo = tipo; // "chiave" (credenziali, permessi), "server", "rete", "formato"
  }
}

// Che cosa vuol dire un errore di Tuya per chi guarda il tasto. I codici sono quelli
// che Tuya manda nel campo `code` (1004 firma, 1010/1011 token, 1106/28841xxx
// permessi o servizio non attivo): una chiave sbagliata non si riprova in un minuto.
export function tipoErrore(codice) {
  const c = Number(codice);
  if ([1004, 1005, 1100, 1101, 1106, 2009, 2017].includes(c) || String(codice).startsWith("2884")) return "chiave";
  return "server";
}

// Il client: un token alla volta, rinnovato prima che scada o quando Tuya dice 1010.
export class TuyaCloud {
  constructor({ clientId, secret, regione = "eu", base = null, fetch: f = globalThis.fetch, ora = Date.now } = {}) {
    this.clientId = clientId;
    this.secret = secret;
    // `base` solo per le prove (un Tuya finto in locale): di solito il data center.
    this.base = base ?? `https://${HOST[regione] ?? HOST.eu}`;
    this.fetch = f;
    this.ora = ora;
    this.token = null;
    this.scade = 0;
    this.scarto = 0; // l'orologio del server meno il nostro, se diverso di più di un minuto
  }

  t() { return String(this.ora() + this.scarto); }

  async chiama(metodo, path, { query, body, conToken = true } = {}) {
    const corpo = body == null ? "" : JSON.stringify(body);
    const { firmato, chiamato } = percorso(path, query);
    const t = this.t();
    const token = conToken ? this.token : "";
    const headers = {
      client_id: this.clientId,
      sign: firma({ clientId: this.clientId, secret: this.secret, token, t, metodo, corpo, firmato }),
      t,
      sign_method: "HMAC-SHA256",
    };
    if (conToken) headers.access_token = token;
    if (corpo) headers["Content-Type"] = "application/json";
    let res;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 10_000);
    try {
      res = await this.fetch(`${this.base}${chiamato}`, { method: metodo, headers, ...(corpo ? { body: corpo } : {}), signal: ac.signal });
    } catch (e) {
      throw new ErroreTuya(`rete: ${e?.message ?? e}`, { tipo: "rete" });
    } finally {
      clearTimeout(timer);
    }
    let j;
    try { j = await res.json(); } catch { throw new ErroreTuya(`HTTP ${res.status}`, { tipo: res.status >= 500 ? "server" : "formato" }); }
    // Tuya rifiuta una richiesta con l'orologio troppo lontano dal suo: un PC indietro
    // di qualche minuto si allinea alla prima risposta, come fa tinytuya.
    if (typeof j?.t === "number" && Math.abs(j.t - this.ora() - this.scarto) > 60_000) this.scarto = j.t - this.ora();
    return j;
  }

  async assicuraToken() {
    if (this.token && this.ora() < this.scade - 60_000) return;
    const j = await this.chiama("GET", "/v1.0/token", { query: { grant_type: 1 }, conToken: false });
    if (!j?.success || !j.result?.access_token) {
      throw new ErroreTuya(j?.msg || `token: codice ${j?.code}`, { codice: j?.code ?? null, tipo: tipoErrore(j?.code) });
    }
    this.token = j.result.access_token;
    this.scade = this.ora() + Number(j.result.expire_time ?? 3600) * 1000;
  }

  async richiesta(metodo, path, opzioni = {}) {
    await this.assicuraToken();
    let j = await this.chiama(metodo, path, opzioni);
    if (!j?.success && (j?.code === 1010 || j?.code === 1011)) {
      this.token = null;
      await this.assicuraToken();
      j = await this.chiama(metodo, path, opzioni);
    }
    if (!j?.success) throw new ErroreTuya(j?.msg || `codice ${j?.code}`, { codice: j?.code ?? null, tipo: tipoErrore(j?.code) });
    return j.result;
  }

  // I dispositivi dell'account Smart Life collegato al progetto, a pagine.
  async dispositivi() {
    const out = [];
    let query = { size: 50 };
    for (let pagina = 0; pagina < 10; pagina++) {
      const r = await this.richiesta("GET", "/v1.0/iot-01/associated-users/devices", { query });
      for (const d of Array.isArray(r?.devices) ? r.devices : Array.isArray(r?.list) ? r.list : []) out.push(d);
      if (!r?.has_more || !r?.last_row_key) break;
      query = { size: 50, last_row_key: r.last_row_key };
    }
    return out.map(dispositivoDa).filter(Boolean);
  }

  specifica(id) { return this.richiesta("GET", `/v1.0/iot-03/devices/${encodeURIComponent(id)}/specification`); }
  stato(id) { return this.richiesta("GET", `/v1.0/iot-03/devices/${encodeURIComponent(id)}/status`); }
  comandi(id, commands) { return this.richiesta("POST", `/v1.0/iot-03/devices/${encodeURIComponent(id)}/commands`, { body: { commands } }); }
}

// Un dispositivo come lo usa il deck. `status`, se l'elenco lo porta, è lo stato.
export function dispositivoDa(d) {
  const id = String(d?.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    nome: String(d?.name ?? d?.product_name ?? id).trim() || id,
    categoria: String(d?.category ?? ""),
    online: d?.online !== false,
    status: Array.isArray(d?.status) ? d.status : null,
  };
}

// ---------- che cosa sa fare una luce ----------
// Le istruzioni standard di Tuya: le luci (categoria dj) e le strisce (dd) usano
// `switch_led` e `bright_value_v2` (10–1000) o `bright_value` (25–255 o 10–1000); una
// presa o un interruttore `switch_1` o `switch`. L'intervallo vero lo dice la
// specifica del dispositivo, in `values` (una stringa JSON con min, max, step).
const INTERRUTTORI = ["switch_led", "switch", "switch_1", "led_switch"];
const LUMINOSITA = ["bright_value_v2", "bright_value", "bright_value_1", "bright"];

const valoriDi = (f) => {
  if (!f) return {};
  if (typeof f.values === "object" && f.values) return f.values;
  try { return JSON.parse(f.values ?? "{}") ?? {}; } catch { return {}; }
};

export function capacitaDa(spec) {
  const funzioni = Array.isArray(spec?.functions) ? spec.functions : [];
  const per = (codici) => codici.map((c) => funzioni.find((f) => f?.code === c)).find(Boolean) ?? null;
  const sw = per(INTERRUTTORI);
  const br = per(LUMINOSITA);
  let luminosita = null;
  if (br) {
    const v = valoriDi(br);
    const min = Number.isFinite(Number(v.min)) ? Number(v.min) : 10;
    const max = Number.isFinite(Number(v.max)) && Number(v.max) > min ? Number(v.max) : 1000;
    const step = Number(v.step) > 0 ? Number(v.step) : 1;
    luminosita = { code: br.code, min, max, step };
  }
  return { interruttore: sw?.code ?? null, luminosita };
}

// Percento (1–100) ↔ valore del dispositivo, lineare fra min e max, sul passo.
export function pctDaValore(v, r) {
  const n = Number(v);
  if (!r || !Number.isFinite(n)) return null;
  const p = ((n - r.min) / (r.max - r.min)) * 99 + 1;
  return Math.max(1, Math.min(100, Math.round(p)));
}
export function valoreDaPct(pct, r) {
  const p = Math.max(1, Math.min(100, Number(pct) || 1));
  const grezzo = r.min + ((p - 1) / 99) * (r.max - r.min);
  const sulPasso = r.min + Math.round((grezzo - r.min) / r.step) * r.step;
  return Math.max(r.min, Math.min(r.max, sulPasso));
}

// Lo stato del dispositivo ([{code, value}]) nella forma del tasto.
export function statoDa(status, cap) {
  if (!Array.isArray(status) || !cap) return null;
  const di = (code) => status.find((s) => s?.code === code)?.value;
  const acceso = cap.interruttore ? (di(cap.interruttore) == null ? null : !!di(cap.interruttore)) : null;
  const pct = cap.luminosita ? pctDaValore(di(cap.luminosita.code), cap.luminosita) : null;
  return { acceso, pct };
}

// ---------- che cosa fa una pressione ----------
export const AZIONI = ["interruttore", "piu", "meno", "livello"];
export const azioneDi = (settings) => (AZIONI.includes(settings?.azione) ? settings.azione : "interruttore");
const passoDi = (settings) => {
  const n = Number(settings?.passo);
  return Number.isFinite(n) && n >= 1 && n <= 100 ? Math.round(n) : 20;
};
const livelloDi = (settings) => {
  const n = Number(settings?.livello);
  return Number.isFinite(n) && n >= 1 && n <= 100 ? Math.round(n) : 50;
};

// Che cosa deve cambiare e lo stato atteso subito dopo (il tasto lo mostra senza
// aspettare, poi rilegge quello vero), per qualunque fonte: `cap` dice solo SE la luce
// ha un interruttore e una luminosità. null = questa luce non sa farlo.
//   interruttore  accesa ↔ spenta
//   piu / meno    la luminosità di `passo` punti; «più» su una luce spenta la accende,
//                 «meno» si ferma all'1% e non spegne (spegnere è dell'interruttore)
//   livello       accende a `livello` %
export function pianoPer(settings, stato, cap) {
  if (!cap) return null;
  const azione = azioneDi(settings);
  const acceso = stato?.acceso ?? null;
  const pct = stato?.pct ?? null;
  const sw = !!cap.interruttore, br = !!cap.luminosita;
  if (azione === "interruttore") {
    if (!sw) return null;
    const nuovo = acceso === false; // sconosciuto: si spegne, che è la cosa innocua
    return { cambia: { acceso: nuovo }, atteso: { acceso: nuovo, pct } };
  }
  if (!br) return null;
  if (azione === "livello") {
    const p = livelloDi(settings);
    return { cambia: { ...(sw ? { acceso: true } : {}), pct: p }, atteso: { acceso: true, pct: p } };
  }
  const passo = passoDi(settings);
  const base = pct ?? 50;
  if (azione === "piu") {
    const p = acceso === false ? Math.max(base, passo) : Math.min(100, base + passo);
    return { cambia: { ...(sw && acceso !== true ? { acceso: true } : {}), pct: p }, atteso: { acceso: true, pct: p } };
  }
  const p = Math.max(1, base - passo);
  return { cambia: { pct: p }, atteso: { acceso, pct: p } };
}

// Lo stesso piano, nei comandi di Tuya: prima l'interruttore, poi la luminosità sul
// suo intervallo.
export function comandiPer(settings, stato, cap) {
  const piano = pianoPer(settings, stato, cap);
  if (!piano) return null;
  const commands = [];
  if (piano.cambia.acceso != null) commands.push({ code: cap.interruttore, value: piano.cambia.acceso });
  if (piano.cambia.pct != null) commands.push({ code: cap.luminosita.code, value: valoreDaPct(piano.cambia.pct, cap.luminosita) });
  return { commands, atteso: piano.atteso };
}

// ---------- che cosa mostra il tasto ----------
// `rec` = { stato:{acceso,pct}, at, err, errTipo } per il dispositivo del tasto;
// `dispositivo` = la voce dell'elenco (nome, online).
// `conf.ok` dice se la fonte è pronta; `conf.messaggio`, se non lo è, cosa scrivere
// (le chiavi di Tuya, l'accesso ad Amazon).
export function vistaLuce({ settings = {}, dispositivo = null, rec = null, conf = { ok: false }, cap = null }) {
  const azione = azioneDi(settings);
  const nome = String(settings.label ?? "").trim() || dispositivo?.nome || "Luce";
  const sotto = azione === "piu" ? `+${passoDi(settings)}%` : azione === "meno" ? `−${passoDi(settings)}%`
    : azione === "livello" ? `al ${livelloDi(settings)}%` : null;
  const base = { azione, titolo: nome, breve: sotto ?? "Luce", acceso: null, valore: "--", sub: "", tono: null };
  const manca = conf.messaggio ?? "chiavi Tuya?";
  if (!conf.ok) return { ...base, sub: manca, tono: "attenzione" };
  if (!settings.dispositivo) return { ...base, sub: "scegli la luce" };
  if (rec?.errTipo === "chiave" || rec?.errTipo === "accesso") return { ...base, valore: "!", sub: manca, tono: "guasto" };
  if ((dispositivo && dispositivo.online === false) || (rec?.offline && !rec?.stato)) return { ...base, sub: "offline", tono: "attenzione" };
  const st = rec?.stato ?? null;
  if (!st) return { ...base, sub: rec?.err ? "non risponde" : "…", tono: rec?.err ? "attenzione" : null };
  const acceso = st.acceso;
  const valore = acceso === false ? "Spenta" : st.pct != null ? `${st.pct}%` : acceso ? "Accesa" : "--";
  const sub = sotto ?? (acceso === false ? "tocca per accendere" : acceso ? "tocca per spegnere" : "");
  const noCap = cap && ((azione === "interruttore" && !cap.interruttore) || (azione !== "interruttore" && !cap.luminosita));
  const breve = sotto ?? (acceso === false ? "Accendi" : acceso ? "Spegni" : "Luce");
  const fuori = rec?.err || rec?.offline;
  return { ...base, breve, acceso, pct: acceso === false ? null : st.pct, valore, sub: noCap ? "non regolabile" : fuori ? "offline" : sub, tono: fuori || noCap ? "attenzione" : null };
}
