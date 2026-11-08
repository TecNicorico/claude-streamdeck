// Relay fra le sessioni Claude Code nel cloud e lo Stream Deck.
//
// Il Worker controlla la chiave e passa la richiesta all'unico Durable Object, che
// tiene la bacheca (bacheca.js) in memoria. Due chiavi diverse, due porte diverse:
//   TOKEN_CLOUD  — gli hook delle sessioni cloud: aprono richieste, mandano stati,
//                  ritirano le decisioni. Non possono decidere niente.
//   TOKEN_DECK   — lo Stream Deck: legge la bacheca e decide. Non può aprire richieste.
// Chi trova una delle due non ha l'altra metà.
//
// Il relay non scrive su disco le richieste né i comandi: restano in memoria finché
// l'hook li ritira o rinuncia. Su disco vanno solo le sessioni (nome, stato, link).
import { DurableObject } from "cloudflare:workers";
import { Bacheca, LIMITI } from "./bacheca.js";
import HOOK from "./hook-testo.js";

const CORPO_MAX = 128 * 1024;
const ATTESA_LUNGA_MS = LIMITI.attesaLungaMs;

const json = (dati, status = 200) =>
  new Response(JSON.stringify(dati), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function stessaChiave(a, b) {
  if (!a || !b) return false;
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  return crypto.subtle.timingSafeEqual(ha, hb);
}

function chiaveDi(request) {
  const h = request.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

async function corpo(request) {
  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > CORPO_MAX) return null;
  const testo = await request.text();
  if (testo.length > CORPO_MAX) return null;
  try { return JSON.parse(testo || "{}"); } catch { return null; }
}

const PORTE = {
  "POST /v1/cloud/richiesta": "cloud",
  "POST /v1/cloud/attendi": "cloud",
  "POST /v1/cloud/rinuncia": "cloud",
  "POST /v1/cloud/stato": "cloud",
  "GET /v1/deck": "deck",
  "POST /v1/deck/decisione": "deck",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const porta = `${request.method} ${url.pathname}`;
    if (porta === "GET /v1/salute") return json({ ok: true, configurato: !!(env.TOKEN_CLOUD && env.TOKEN_DECK) });
    // L'hook delle sessioni cloud, scaricato dallo script di setup a ogni avvio: così un
    // aggiornamento è un `wrangler deploy` e non un copia-incolla. È codice aperto, senza
    // segreti (le chiavi le legge dall'ambiente), quindi non chiede una chiave.
    if (porta === "GET /v1/hook.mjs") {
      return new Response(HOOK, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" } });
    }
    const chi = PORTE[porta];
    if (!chi) return json({ errore: "NON_TROVATO" }, 404);
    const attesa = chi === "cloud" ? env.TOKEN_CLOUD : env.TOKEN_DECK;
    if (!attesa || attesa.length < 32) return json({ errore: "RELAY_NON_CONFIGURATO" }, 503);
    if (!(await stessaChiave(chiaveDi(request), attesa))) return json({ errore: "CHIAVE_ERRATA" }, 401);
    const dati = request.method === "POST" ? await corpo(request) : {};
    if (dati == null) return json({ errore: "CORPO_NON_VALIDO" }, 400);
    const stub = env.BACHECA.get(env.BACHECA.idFromName("unica"));
    const out = await stub.esegui(porta, dati);
    return json(out, out?.errore ? 400 : 200);
  },
};

export class BachecaDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.attese = new Map(); // id richiesta -> Set di funzioni da svegliare
    this.ctx.blockConcurrencyWhile(async () => {
      this.b = Bacheca.da(await this.ctx.storage.get("sessioni"));
      this.salvate = JSON.stringify(this.b.daSalvare());
    });
  }

  async salva() {
    const ora = JSON.stringify(this.b.daSalvare());
    if (ora === this.salvate) return;
    this.salvate = ora;
    await this.ctx.storage.put("sessioni", this.b.daSalvare());
  }

  sveglia(id) {
    for (const f of this.attese.get(id) ?? []) f();
    this.attese.delete(id);
  }

  // Aspetta che il deck decida, per al massimo ATTESA_LUNGA_MS. Una connessione
  // lunga invece di un'interrogazione al secondo: meno richieste, risposta immediata.
  attendi(id) {
    return new Promise((resolve) => {
      const set = this.attese.get(id) ?? new Set();
      let timer = null;
      const fine = () => { clearTimeout(timer); set.delete(fine); resolve(); };
      timer = setTimeout(fine, ATTESA_LUNGA_MS);
      set.add(fine);
      this.attese.set(id, set);
    });
  }

  async esegui(porta, d) {
    const ora = Date.now();
    this.b.manutenzione(ora);
    let out;
    switch (porta) {
      case "POST /v1/cloud/richiesta":
        out = this.b.apri(d, ora);
        break;
      case "POST /v1/cloud/attendi": {
        out = this.b.ritira(d.id, ora);
        if (out.stato === "in_attesa") {
          await this.attendi(String(d.id));
          out = this.b.ritira(d.id, Date.now());
        }
        break;
      }
      case "POST /v1/cloud/rinuncia":
        out = this.b.rinuncia(d.id, ora);
        this.sveglia(String(d.id));
        break;
      case "POST /v1/cloud/stato":
        out = this.b.evento(d, ora);
        break;
      case "GET /v1/deck":
        out = this.b.perDeck(ora);
        break;
      case "POST /v1/deck/decisione":
        out = this.b.decidi(d.id, d.decisione, ora);
        if (out.ok) this.sveglia(String(d.id));
        break;
      default:
        out = { errore: "NON_TROVATO" };
    }
    await this.salva();
    return out;
  }
}
