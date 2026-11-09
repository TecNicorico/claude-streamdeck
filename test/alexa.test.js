import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  dispositiviAlexa, statiAlexa, statoPer, azioniAlexa, esitoControllo, urlAccesso, opzioniAlexa, CasaAlexa, dominioDi,
} from "../src/alexa.js";
import { pianoPer, vistaLuce } from "../src/luci.js";

// La forma della risposta di /nexus/v1/graphql come la chiede alexa-remote2 8.1.1
// (SmartHomeEndpointsGraphQlQuery): endpoints.items, con legacyAppliance dentro.
const PRESA = {
  endpointId: "amzn1.alexa.endpoint.presa1", id: "amzn1.alexa.endpoint.presa1", friendlyName: "Ciabatta presa 1",
  displayCategories: { primary: { value: "SMARTPLUG" } },
  legacyAppliance: {
    applianceId: "SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLm1lcm9zcyJ9_presa1", entityId: "4b8e-presa1",
    applianceTypes: ["SMARTPLUG"], manufacturerName: "Meross", friendlyName: "Ciabatta presa 1",
    actions: ["turnOn", "turnOff"], capabilities: [{ interfaceName: "Alexa.PowerController" }],
    applianceNetworkState: { reachability: "REACHABLE" }, isEnabled: true,
  },
};
const LUCE = {
  id: "amzn1.alexa.endpoint.luce", friendlyName: "Luce studio", displayCategories: { primary: { value: "LIGHT" } },
  legacyAppliance: {
    applianceId: "SKILL_awox_luce", entityId: "9c1d-luce", applianceTypes: ["LIGHT"], manufacturerName: "AwoX",
    actions: [], capabilities: [{ interfaceName: "Alexa.PowerController" }, { interfaceName: "Alexa.BrightnessController" }, { interfaceName: "Alexa.ColorController" }],
    applianceNetworkState: { reachability: "REACHABLE" },
  },
};
const ECHO = { id: "echo", friendlyName: "Echo Dot di Enrico", legacyAppliance: { applianceId: "AAA_echo", entityId: "e-echo", actions: [], capabilities: [{ interfaceName: "Alexa.Speaker" }] } };
const SENSORE = { id: "s", friendlyName: "Termometro", legacyAppliance: { applianceId: "SKILL_t", entityId: "e-t", capabilities: [{ interfaceName: "Alexa.TemperatureSensor" }] } };
const SPENTA_DAL_MURO = { ...PRESA, friendlyName: "Ciabatta presa 4", legacyAppliance: { ...PRESA.legacyAppliance, applianceId: "SKILL_presa4", entityId: "e4", applianceNetworkState: { reachability: "NOT_REACHABLE" } } };

test("elenco: prese e luci sì, con quello che sanno fare; Echo e sensori no", () => {
  const d = dispositiviAlexa([PRESA, LUCE, ECHO, SENSORE, SPENTA_DAL_MURO, null, {}]);
  assert.deepEqual(d.map((x) => [x.nome, x.cap.interruttore, x.cap.luminosita, x.online]), [
    ["Ciabatta presa 1", true, false, true],
    ["Luce studio", true, true, true], // dalle capacità, anche senza `actions`
    ["Ciabatta presa 4", true, false, false],
  ]);
  assert.equal(d[0].entityId, "4b8e-presa1", "i comandi vanno all'entityId");
  assert.equal(d[0].id, PRESA.legacyAppliance.applianceId, "lo stato si chiede per applianceId");
  assert.equal(d[1].produttore, "AwoX");
});

// /api/phoenix/state con stateRequests: le capacità arrivano come stringhe JSON.
test("stato: acceso dal powerState, percentuale dalla brightness, irraggiungibile dagli errori", () => {
  const s = statiAlexa({
    deviceStates: [
      { entity: { entityId: "SKILL_awox_luce" }, capabilityStates: [
        JSON.stringify({ namespace: "Alexa.PowerController", name: "powerState", value: "ON" }),
        JSON.stringify({ namespace: "Alexa.BrightnessController", name: "brightness", value: 64 }),
        JSON.stringify({ namespace: "Alexa.EndpointHealth", name: "connectivity", value: { value: "OK" } }),
      ] },
      { entity: { entityId: "presa1" }, capabilityStates: [{ namespace: "Alexa.PowerController", name: "powerState", value: "OFF" }] },
      { entity: { entityId: "rotta" }, capabilityStates: ["non json", JSON.stringify({ namespace: "Alexa.EndpointHealth", name: "connectivity", value: { value: "UNREACHABLE" } })] },
    ],
    errors: [{ code: "ENDPOINT_UNREACHABLE", entity: { entityId: "SKILL_presa4" } }],
  });
  assert.deepEqual(s.get("SKILL_awox_luce"), { stato: { acceso: true, pct: 64 }, offline: false });
  assert.deepEqual(s.get("presa1").stato, { acceso: false, pct: null });
  assert.equal(s.get("rotta").offline, true);
  assert.deepEqual(s.get("SKILL_presa4"), { stato: null, offline: true, errore: "ENDPOINT_UNREACHABLE" });
  assert.equal(statiAlexa(null).size, 0);
});

test("stato: si trova sotto l'applianceId, l'entityId o un id unito", () => {
  const [presa] = dispositiviAlexa([{ ...PRESA, legacyAppliance: { ...PRESA.legacyAppliance, mergedApplianceIds: ["SKILL_vecchio"] } }]);
  const st = (id) => statiAlexa({ deviceStates: [{ entity: { entityId: id }, capabilityStates: [JSON.stringify({ namespace: "Alexa.PowerController", name: "powerState", value: "ON" })] }] });
  for (const id of [PRESA.legacyAppliance.applianceId, "4b8e-presa1", "SKILL_vecchio"]) assert.equal(statoPer(presa, st(id))?.stato.acceso, true, id);
  assert.equal(statoPer(presa, st("altro")), null);
});

test("comandi: spegnere è un turnOff; più luce su una spenta è turnOn e poi setBrightness in frazione", () => {
  const luce = { interruttore: true, luminosita: true };
  const presa = { interruttore: true, luminosita: false };
  assert.deepEqual(azioniAlexa(pianoPer({}, { acceso: true }, presa).cambia), [{ action: "turnOff" }]);
  assert.deepEqual(azioniAlexa(pianoPer({}, { acceso: false }, presa).cambia), [{ action: "turnOn" }]);
  assert.deepEqual(azioniAlexa(pianoPer({ azione: "piu", passo: 20 }, { acceso: false, pct: 10 }, luce).cambia),
    [{ action: "turnOn" }, { action: "setBrightness", brightness: "0.2" }]);
  assert.deepEqual(azioniAlexa(pianoPer({ azione: "meno", passo: 20 }, { acceso: true, pct: 64 }, luce).cambia),
    [{ action: "setBrightness", brightness: "0.44" }]);
  assert.deepEqual(azioniAlexa(pianoPer({ azione: "livello", livello: 30 }, { acceso: false }, luce).cambia),
    [{ action: "turnOn" }, { action: "setBrightness", brightness: "0.3" }]);
  assert.equal(pianoPer({ azione: "piu" }, { acceso: true }, presa), null, "una presa non si regola");
  assert.deepEqual(azioniAlexa(null), []);
});

test("esito: riuscito solo con SUCCESS, anche se la risposta è un 200", () => {
  assert.deepEqual(esitoControllo({ controlResponses: [{ code: "SUCCESS" }], errors: [] }), { ok: true });
  assert.deepEqual(esitoControllo({ controlResponses: [], errors: [{ code: "ENDPOINT_UNREACHABLE" }] }), { ok: false, codice: "ENDPOINT_UNREACHABLE" });
  assert.deepEqual(esitoControllo({}), { ok: false, codice: "NESSUNA_RISPOSTA" });
  assert.equal(esitoControllo({ controlResponses: [{ code: "TargetOffline" }], errors: [] }).ok, false, "una risposta che non è SUCCESS non è un comando eseguito");
});

test("la pagina di accesso: l'indirizzo dal messaggio della libreria, solo se è locale", () => {
  assert.equal(urlAccesso("Please open http://127.0.0.1:41234/ with your browser and login to Amazon."), "http://127.0.0.1:41234/");
  assert.equal(urlAccesso("Please open http://192.168.1.5:41234/ with your browser"), null);
  assert.equal(urlAccesso("no csrf found"), null);
});

test("le opzioni: il proxy solo su 127.0.0.1, niente push, niente logger, la lingua del dominio", () => {
  const o = opzioniAlexa({ dominio: "amazon.it", cartellaDati: "/home/e/.agent-vitals", versione: "1.17.0" });
  assert.equal(o.proxyListenBind, "127.0.0.1", "mai 0.0.0.0: la pagina di login di Amazon aperta a tutta la rete");
  assert.equal(o.proxyOwnIp, "127.0.0.1");
  assert.equal(o.amazonPage, "amazon.it");
  assert.equal(o.acceptLanguage, "it-IT");
  assert.equal(o.amazonPageProxyLanguage, "it_IT");
  assert.equal(o.useWsMqtt, false);
  assert.equal(o.usePushConnection, false);
  assert.equal(o.logger, undefined, "la libreria scriverebbe nel log i token");
  assert.equal(o.apiUserAgentPostfix, "AgentVitals/1.17.0", "senza, la libreria legge un package.json che nel bundle non c'è");
  assert.equal(o.formerDataStorePath, "/home/e/.agent-vitals/alexa-proxy.json");
  assert.equal(dominioDi({ alexaDominio: "amazon.de" }), "amazon.de");
  assert.equal(dominioDi({ alexaDominio: "amazon.xyz" }), "amazon.it");
});

// ---------- la casa, con un alexa-remote2 finto ----------
function remotoFinto(scenario) {
  const istanze = [];
  class Finto extends EventEmitter {
    constructor() { super(); istanze.push(this); this.chiamate = []; }
    init(opzioni, cb) { this.opzioni = opzioni; this.cb = cb; scenario.init?.(this, opzioni, cb); }
    getSmarthomeDevicesV2(cb) { this.chiamate.push(["devices"]); cb(null, [PRESA, LUCE, ECHO]); }
    querySmarthomeDevices(req, tipo, cb) { this.chiamate.push(["query", req, tipo]); cb(null, scenario.stati ?? { deviceStates: [] }); }
    executeSmarthomeDeviceAction(entityId, parametri, tipo, cb) {
      this.chiamate.push(["exec", entityId, parametri, tipo]);
      cb(null, scenario.esegui?.(parametri) ?? { controlResponses: [{ code: "SUCCESS" }] });
    }
  }
  return { Finto, istanze };
}
function memoria(iniziale = null) {
  const m = { dati: iniziale, cancellato: false };
  return { m, leggi: () => m.dati, scrivi: (d) => { m.dati = d; }, cancella: () => { m.dati = null; m.cancellato = true; } };
}

test("casa: senza sessione salvata resta spenta; l'accesso apre la pagina e poi si collega", () => {
  const { Finto, istanze } = remotoFinto({
    init: (r, o, cb) => cb(new Error("Please open http://127.0.0.1:41234/ with your browser and login to Amazon. The cookie will be output here after successfull login.")),
  });
  const mem = memoria();
  const visti = [];
  const casa = new CasaAlexa({ AlexaRemote: Finto, ...mem, cartellaDati: "/d", versione: "1", quandoCambia: (c) => visti.push(c.stato) });
  casa.avvia();
  assert.equal(casa.stato, "spento");
  assert.equal(istanze.length, 0, "senza sessione non si apre niente da soli");
  casa.avvia({ nuovoAccesso: true });
  assert.equal(casa.stato, "accesso");
  assert.equal(casa.url, "http://127.0.0.1:41234/");
  // Login fatto nella pagina: la libreria rinnova il cookie e richiama la stessa callback.
  const r = istanze[0];
  r.cookieData = { localCookie: "csrf=abc; x=y", macDms: { device_private_key: "k" }, tokenDate: 1 };
  r.macDms = r.cookieData.macDms;
  r.emit("cookie", "csrf=abc", "abc", r.macDms);
  r.cb(null);
  assert.equal(casa.stato, "connesso");
  assert.deepEqual(mem.m.dati, { ...r.cookieData, dominio: "amazon.it" }, "si salva la registrazione intera, per il prossimo avvio");
  assert.deepEqual(visti, ["spento", "avvio", "accesso", "connesso"]);
});

test("casa: con una sessione salvata parte da quella, e i comandi vanno in fila all'entityId", async () => {
  const { Finto, istanze } = remotoFinto({ init: (r, o, cb) => cb(null), stati: { deviceStates: [{ entity: { entityId: "SKILL_awox_luce" }, capabilityStates: [JSON.stringify({ namespace: "Alexa.PowerController", name: "powerState", value: "ON" })] }] } });
  const salvata = { localCookie: "csrf=1", macDms: { a: 1 }, dominio: "amazon.it" };
  const casa = new CasaAlexa({ AlexaRemote: Finto, ...memoria(salvata), cartellaDati: "/d", versione: "1" });
  casa.avvia({ dominio: "amazon.it" });
  assert.equal(casa.stato, "connesso");
  assert.equal(istanze[0].opzioni.cookie, salvata);
  assert.equal(istanze[0].opzioni.macDms, salvata.macDms);
  const d = await casa.dispositivi();
  assert.deepEqual(d.map((x) => x.nome), ["Ciabatta presa 1", "Luce studio"]);
  const st = await casa.stati(["SKILL_awox_luce"]);
  assert.equal(st.get("SKILL_awox_luce").stato.acceso, true);
  assert.deepEqual(istanze[0].chiamate.find((c) => c[0] === "query").slice(1), [[{ entityId: "SKILL_awox_luce", entityType: "APPLIANCE" }], "APPLIANCE"]);
  await casa.esegui("9c1d-luce", [{ action: "turnOn" }, { action: "setBrightness", brightness: "0.5" }]);
  assert.deepEqual(istanze[0].chiamate.filter((c) => c[0] === "exec").map((c) => [c[1], c[2].action]), [["9c1d-luce", "turnOn"], ["9c1d-luce", "setBrightness"]]);
});

test("casa: un comando che Alexa non esegue è un errore, con il suo codice", async () => {
  const { Finto } = remotoFinto({ init: (r, o, cb) => cb(null), esegui: () => ({ controlResponses: [], errors: [{ code: "ENDPOINT_UNREACHABLE" }] }) });
  const casa = new CasaAlexa({ AlexaRemote: Finto, ...memoria({ localCookie: "csrf=1" }), cartellaDati: "/d", versione: "1" });
  casa.avvia();
  await assert.rejects(casa.esegui("e4", [{ action: "turnOn" }]), (e) => e.message === "ENDPOINT_UNREACHABLE" && e.tipo === "offline");
});

test("casa: prima di collegarsi non si chiama Amazon; uscire cancella la sessione e ferma il proxy", async () => {
  let fermato = 0;
  const { Finto, istanze } = remotoFinto({ init: (r) => { r.alexaCookie = { stopProxyServer: () => fermato++ }; } });
  const mem = memoria({ localCookie: "csrf=1" });
  const casa = new CasaAlexa({ AlexaRemote: Finto, ...mem, cartellaDati: "/d", versione: "1" });
  casa.avvia();
  assert.equal(casa.stato, "avvio");
  await assert.rejects(casa.dispositivi(), (e) => e.tipo === "accesso");
  assert.equal(istanze[0].chiamate.length, 0);
  casa.esci();
  assert.equal(casa.stato, "spento");
  assert.equal(mem.m.cancellato, true);
  assert.equal(fermato, 1);
  // Una risposta in ritardo del giro di prima non riaccende niente.
  istanze[0].cb(null);
  assert.equal(casa.stato, "spento");
});

test("il tasto con Alexa: senza accesso lo dice, con l'accesso mostra lo stato", () => {
  const conf = { ok: false, messaggio: "accedi ad Alexa" };
  assert.equal(vistaLuce({ conf, settings: { dispositivo: "x" } }).sub, "accedi ad Alexa");
  const ok = { ok: true, messaggio: "accedi ad Alexa" };
  const d = { id: "SKILL_awox_luce", nome: "Luce", online: true, cap: { interruttore: true, luminosita: true } };
  const v = vistaLuce({ conf: ok, settings: { dispositivo: d.id }, dispositivo: d, cap: d.cap, rec: { stato: { acceso: true, pct: 64 } } });
  assert.deepEqual([v.valore, v.pct, v.acceso], ["64%", 64, true]);
  assert.equal(vistaLuce({ conf: ok, settings: { dispositivo: d.id }, dispositivo: d, cap: d.cap, rec: { errTipo: "accesso" } }).sub, "accedi ad Alexa");
  assert.equal(vistaLuce({ conf: ok, settings: { dispositivo: d.id }, dispositivo: d, cap: d.cap, rec: { stato: null, offline: true } }).sub, "offline");
});
