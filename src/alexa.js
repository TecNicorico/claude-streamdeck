// Le luci e le prese di Alexa sul deck. Provato da test/alexa.test.js.
//
// Alexa non ha un'interfaccia ufficiale per comandare i dispositivi da un altro
// programma. Questo modulo usa quella dell'app Alexa, attraverso alexa-remote2 (8.1.1,
// la libreria di ioBroker e Node-RED): l'elenco dei dispositivi da
// `POST /nexus/v1/graphql`, lo stato da `POST /api/phoenix/state` (stateRequests), i
// comandi da `PUT /api/phoenix/state` (controlRequests) — `turnOn`, `turnOff`,
// `setBrightness` con la luminosità in frazione («0.5»), come la manda ioBroker
// (lib/smarthomedevices.js, «verified!»). Non ufficiale vuol dire che Amazon può
// cambiarla: quando succede si aggiorna la libreria.
//
// L'accesso: la prima volta il plugin apre nel browser una pagina locale
// (alexa-cookie2, un proxy su 127.0.0.1) dove si fa il login ad Amazon come sempre,
// verifica in due passaggi compresa. Il risultato — la registrazione di un'«app
// Alexa» con il suo token di rinnovo — si salva in un file della cartella utente, e la
// libreria rinnova i cookie da sé ogni quattro giorni. È un accesso all'account
// Amazon: il file si tratta come una password, e il log non lo vede mai.

// ---------- l'elenco ----------
// Un dispositivo che si accende o si regola. Gli Echo, i gruppi e i sensori no.
export function dispositiviAlexa(items) {
  const out = [];
  for (const it of Array.isArray(items) ? items : []) {
    const a = it?.legacyAppliance ?? {};
    const id = String(a.applianceId ?? it?.id ?? "").trim();
    const entityId = String(a.entityId ?? it?.endpointId ?? it?.id ?? "").trim();
    if (!id || !entityId) continue;
    const azioni = Array.isArray(a.actions) ? a.actions : [];
    const interfacce = (Array.isArray(a.capabilities) ? a.capabilities : []).map((c) => c?.interfaceName).filter(Boolean);
    const interruttore = azioni.includes("turnOn") || azioni.includes("turnOff") || interfacce.includes("Alexa.PowerController");
    const luminosita = azioni.includes("setBrightness") || interfacce.includes("Alexa.BrightnessController");
    if (!interruttore && !luminosita) continue;
    const reach = a.applianceNetworkState?.reachability;
    const uniti = Array.isArray(a.mergedApplianceIds) ? a.mergedApplianceIds.map(String) : [];
    out.push({
      id,
      entityId,
      // Lo stato torna con uno di questi: l'applianceId, l'entityId o un id «unito»
      // (ioBroker.alexa2, updateSmarthomeDeviceStates, li prova tutti e tre).
      alias: [...new Set([id, entityId, ...uniti])],
      nome: String(it?.friendlyName ?? a.friendlyName ?? id).trim() || id,
      categoria: String(it?.displayCategories?.primary?.value ?? (Array.isArray(a.applianceTypes) ? a.applianceTypes[0] : "") ?? ""),
      produttore: String(a.manufacturerName ?? ""),
      online: reach !== "NOT_REACHABLE" && a.isEnabled !== false,
      cap: { interruttore, luminosita },
    });
  }
  return out;
}

// ---------- lo stato ----------
// `res` = { deviceStates:[{ entity:{entityId}, capabilityStates:[stringhe JSON] }],
// errors:[{ code, entity:{entityId} }] }. Ogni capacità: { namespace, name, value }.
const capDa = (c) => {
  if (c && typeof c === "object") return c;
  try { return JSON.parse(c); } catch { return null; }
};
export function statiAlexa(res) {
  const out = new Map();
  for (const ds of Array.isArray(res?.deviceStates) ? res.deviceStates : []) {
    const id = ds?.entity?.entityId;
    if (!id) continue;
    let acceso = null, pct = null, raggiungibile = true;
    for (const raw of Array.isArray(ds.capabilityStates) ? ds.capabilityStates : []) {
      const c = capDa(raw);
      if (!c) continue;
      const v = c.value && typeof c.value === "object" && "value" in c.value ? c.value.value : c.value;
      if (c.namespace === "Alexa.PowerController" && c.name === "powerState") acceso = v === "ON" ? true : v === "OFF" ? false : acceso;
      if (c.namespace === "Alexa.BrightnessController" && c.name === "brightness") {
        const n = Number(v);
        if (Number.isFinite(n)) pct = Math.max(0, Math.min(100, Math.round(n)));
      }
      if (c.namespace === "Alexa.EndpointHealth" && c.name === "connectivity" && v === "UNREACHABLE") raggiungibile = false;
    }
    out.set(id, { stato: { acceso, pct }, offline: !raggiungibile });
  }
  for (const e of Array.isArray(res?.errors) ? res.errors : []) {
    const id = e?.entity?.entityId;
    if (id && !out.has(id)) out.set(id, { stato: null, offline: e.code === "ENDPOINT_UNREACHABLE", errore: String(e.code ?? "errore") });
  }
  return out;
}

// Lo stato di un dispositivo, sotto qualunque dei suoi id sia tornato.
export function statoPer(dispositivo, mappa) {
  for (const id of dispositivo?.alias ?? [dispositivo?.id]) if (mappa?.has(id)) return mappa.get(id);
  return null;
}

// ---------- i comandi ----------
// Da quello che deve cambiare (pianoPer in luci.js) ai parametri di Alexa, in ordine:
// prima accendere, poi la luminosità. La luminosità va in frazione, come la stringa
// che manda l'app.
export function azioniAlexa(cambia) {
  const out = [];
  if (!cambia) return out;
  if (cambia.acceso === false && cambia.pct == null) return [{ action: "turnOff" }];
  if (cambia.acceso === true) out.push({ action: "turnOn" });
  if (cambia.pct != null) {
    const p = Math.max(1, Math.min(100, Math.round(cambia.pct)));
    out.push({ action: "setBrightness", brightness: String(p / 100) });
  }
  return out;
}

// Una risposta di controllo è riuscita solo se dice SUCCESS: un 200 con errors dentro
// (ENDPOINT_UNREACHABLE, TargetOffline) non è un comando eseguito.
export function esitoControllo(res) {
  const ok = Array.isArray(res?.controlResponses) && res.controlResponses.some((r) => r?.code === "SUCCESS");
  if (ok) return { ok: true };
  const e = Array.isArray(res?.errors) ? res.errors[0] : null;
  return { ok: false, codice: String(e?.code ?? "NESSUNA_RISPOSTA") };
}

// L'indirizzo della pagina di accesso, dal messaggio che la libreria dà quando serve
// il login («Please open http://127.0.0.1:41234/ with your browser…»).
export function urlAccesso(messaggio) {
  const m = /Please open (http:\/\/(?:127\.0\.0\.1|localhost):\d+\/)/.exec(String(messaggio ?? ""));
  return m ? m[1] : null;
}

export const DOMINI_AMAZON = ["amazon.it", "amazon.de", "amazon.fr", "amazon.es", "amazon.co.uk", "amazon.com"];
const LINGUA = { "amazon.it": ["it-IT", "it_IT"], "amazon.de": ["de-DE", "de_DE"], "amazon.fr": ["fr-FR", "fr_FR"], "amazon.es": ["es-ES", "es_ES"], "amazon.co.uk": ["en-GB", "en_GB"], "amazon.com": ["en-US", "en_US"] };
export const dominioDi = (gs) => (DOMINI_AMAZON.includes(gs?.alexaDominio) ? gs.alexaDominio : "amazon.it");

// Le opzioni per alexa-remote2. Il proxy di accesso ascolta SOLO su 127.0.0.1 (il
// default della libreria è 0.0.0.0: la pagina di login di Amazon aperta a tutta la
// rete), su una porta libera qualunque. Niente connessione push, niente notifiche né
// Bluetooth degli Echo: al deck servono solo i dispositivi della casa. Nessun logger:
// la libreria scrive nel log i dati di registrazione, cioè i token.
export function opzioniAlexa({ dominio = "amazon.it", salvata = null, cartellaDati, versione = "0" }) {
  const [lingua, linguaProxy] = LINGUA[dominio] ?? LINGUA["amazon.it"];
  return {
    cookie: salvata ?? undefined,
    macDms: salvata?.macDms ?? undefined,
    amazonPage: dominio,
    acceptLanguage: lingua,
    amazonPageProxyLanguage: linguaProxy,
    setupProxy: true,
    proxyOwnIp: "127.0.0.1",
    proxyListenBind: "127.0.0.1",
    proxyPort: 0,
    proxyLogLevel: "error",
    formerDataStorePath: cartellaDati ? `${cartellaDati}/alexa-proxy.json` : undefined,
    bluetooth: false,
    notifications: false,
    useWsMqtt: false,
    usePushConnection: false,
    apiUserAgentPostfix: `AgentVitals/${versione}`,
  };
}

// ---------- la casa, attorno ad alexa-remote2 ----------
// stato: "spento" (nessun accesso), "accesso" (la pagina di login aspetta), "avvio",
// "connesso", "errore". `AlexaRemote` e il file si iniettano, così i test non toccano
// Amazon.
export class CasaAlexa {
  constructor({ AlexaRemote, leggi, scrivi, cancella, cartellaDati, versione, quandoCambia = () => {} }) {
    this.AlexaRemote = AlexaRemote;
    this.leggi = leggi;       // () => oggetto salvato | null
    this.scrivi = scrivi;     // (oggetto) => void
    this.cancella = cancella; // () => void
    this.cartellaDati = cartellaDati;
    this.versione = versione;
    this.quandoCambia = quandoCambia;
    this.stato = "spento";
    this.url = null;
    this.err = null;
    this.remote = null;
    this.giro = 0;
  }

  imposta(stato, extra = {}) {
    Object.assign(this, { stato, url: null, err: null }, extra);
    this.quandoCambia(this);
  }

  // Avvia con la sessione salvata; senza, o con `nuovoAccesso`, apre la pagina di login.
  avvia({ dominio = "amazon.it", nuovoAccesso = false } = {}) {
    const salvata = nuovoAccesso ? null : this.leggi();
    if (!salvata && !nuovoAccesso) { this.imposta("spento"); return; }
    this.ferma();
    const giro = ++this.giro;
    const remote = new this.AlexaRemote();
    this.remote = remote;
    remote.on?.("cookie", () => {
      // Ogni rinnovo dei cookie: si salva la registrazione intera, che è ciò che
      // serve al prossimo avvio (alexa-cookie2: «store the returned object»).
      if (giro !== this.giro) return;
      const dati = remote.cookieData && typeof remote.cookieData === "object" ? remote.cookieData : null;
      if (dati) this.scrivi({ ...dati, macDms: remote.macDms ?? dati.macDms, dominio });
    });
    this.imposta("avvio");
    remote.init(opzioniAlexa({ dominio, salvata, cartellaDati: this.cartellaDati, versione: this.versione }), (err) => {
      if (giro !== this.giro) return;
      if (err) {
        const url = urlAccesso(err.message);
        if (url) { this.imposta("accesso", { url }); return; }
        this.imposta("errore", { err: String(err.message ?? err).slice(0, 200) });
        return;
      }
      this.imposta("connesso");
    });
  }

  ferma() {
    this.giro++;
    try { this.remote?.alexaCookie?.stopProxyServer?.(); } catch { /* già fermo */ }
    try { if (this.remote?.cookieRefreshTimeout) clearTimeout(this.remote.cookieRefreshTimeout); } catch { /* niente */ }
    this.remote = null;
  }

  esci() {
    this.ferma();
    this.cancella();
    this.imposta("spento");
  }

  chiama(metodo, ...args) {
    const r = this.remote;
    if (!r || this.stato !== "connesso") return Promise.reject(Object.assign(new Error("Alexa non è collegata"), { tipo: "accesso" }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Object.assign(new Error("Alexa non risponde"), { tipo: "rete" })), 30_000);
      r[metodo](...args, (err, res) => {
        clearTimeout(timer);
        if (err) {
          const msg = String(err?.message ?? err);
          // 401/403: la sessione non vale più (password cambiata, accesso revocato).
          const tipo = /\b(401|403)\b|unauthori[sz]ed/i.test(msg) ? "accesso" : "rete";
          return reject(Object.assign(new Error(msg.slice(0, 200)), { tipo }));
        }
        resolve(res);
      });
    });
  }

  async dispositivi() { return dispositiviAlexa(await this.chiama("getSmarthomeDevicesV2")); }

  async stati(ids) {
    if (!ids.length) return new Map();
    const res = await this.chiama("querySmarthomeDevices", ids.map((id) => ({ entityId: id, entityType: "APPLIANCE" })), "APPLIANCE");
    return statiAlexa(res);
  }

  // I parametri uno dopo l'altro: accendere e poi regolare, non insieme.
  async esegui(entityId, azioni) {
    for (const parametri of azioni) {
      const esito = esitoControllo(await this.chiama("executeSmarthomeDeviceAction", entityId, parametri, "APPLIANCE"));
      if (!esito.ok) throw Object.assign(new Error(esito.codice), { tipo: esito.codice === "ENDPOINT_UNREACHABLE" ? "offline" : "rete" });
    }
  }
}
