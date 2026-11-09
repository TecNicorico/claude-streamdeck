import { test } from "node:test";
import assert from "node:assert/strict";
import {
  usageDaRisposta, percorsiDesktop, letturaDesktop, completa, serveEndpoint, ritardoDopo429,
  API_BASE_MS, API_MAX_MS, FRESCA_MS,
} from "../src/consumi.js";
import { gaugeSource } from "../src/usage.js";

const NOW = 1_800_000_000_000;
const iso = (ms) => new Date(ms).toISOString();

// ---------- il file di Claude Desktop ----------
// La forma è quella riportata da chi lo legge già (anthropics/claude-code #96716,
// #98664, #106622): {version, samples:[{t (ms), org, u:{fh, sd, so?, sn?, xu?}}]}.
const fileDesktop = (samples) => JSON.stringify({ version: 1, samples });

test("Desktop: l'ultimo campione, in percento, senza ore di reset", () => {
  const l = letturaDesktop(fileDesktop([
    { t: NOW - 600_000, org: "o1", u: { fh: 60, sd: 28 } },
    { t: NOW - 60_000, org: "o1", u: { fh: 64, sd: 29, so: 12, sn: 5, xu: 3 } },
  ]));
  assert.equal(l.at, NOW - 60_000);
  assert.deepEqual(l.usage.fiveHour, { pct: 64, resetsAt: null });
  assert.deepEqual(l.usage.weekly, { pct: 29, resetsAt: null });
  assert.deepEqual(l.usage.weeklyOpus, { pct: 12, resetsAt: null });
  assert.deepEqual(l.usage.models.map((m) => [m.name, m.pct]), [["Opus", 12], ["Sonnet", 5]]);
});

test("Desktop: vince il campione più recente anche se non è l'ultimo della lista", () => {
  const l = letturaDesktop(fileDesktop([
    { t: NOW - 60_000, u: { fh: 10, sd: 20 } },
    { t: NOW - 900_000, u: { fh: 99, sd: 99 } },
  ]));
  assert.equal(l.usage.fiveHour.pct, 10);
});

test("Desktop: un campione che non ha la forma attesa non c'è", () => {
  const l = letturaDesktop(fileDesktop([
    { t: NOW, u: { fh: "64", sd: null } },        // non numeri
    { t: "ieri", u: { fh: 50, sd: 50 } },          // istante illeggibile
    { t: NOW + 1, u: null },                        // niente percentuali
    { t: NOW - 120_000, u: { fh: 30, sd: 40 } },   // l'unico buono
  ]));
  assert.equal(l.at, NOW - 120_000);
  assert.equal(l.usage.fiveHour.pct, 30);
  assert.equal(letturaDesktop("non è json"), null);
  assert.equal(letturaDesktop(fileDesktop([])), null);
  assert.equal(letturaDesktop("{}"), null);
});

test("Desktop: una percentuale che manca resta assente, non zero", () => {
  const l = letturaDesktop(fileDesktop([{ t: NOW, u: { sd: 41 } }]));
  assert.equal(l.usage.fiveHour, null);
  assert.equal(l.usage.weekly.pct, 41);
  assert.deepEqual(l.usage.models, []);
});

test("Desktop su Windows: %APPDATA% e la cartella del pacchetto del Microsoft Store", () => {
  const p = percorsiDesktop({
    platform: "win32", home: "C:\\Users\\enrico",
    env: { APPDATA: "C:\\Users\\enrico\\AppData\\Roaming", LOCALAPPDATA: "C:\\Users\\enrico\\AppData\\Local" },
    listDir: () => ["Claude_pzs8sxrjxfjjc", "Microsoft.WindowsTerminal_8wekyb3d8bbwe"],
  });
  assert.deepEqual(p, [
    "C:\\Users\\enrico\\AppData\\Roaming\\Claude\\plan-usage-history.json",
    "C:\\Users\\enrico\\AppData\\Local\\Packages\\Claude_pzs8sxrjxfjjc\\LocalCache\\Roaming\\Claude\\plan-usage-history.json",
  ]);
});

test("Desktop su macOS: Application Support", () => {
  assert.deepEqual(percorsiDesktop({ platform: "darwin", home: "/Users/e" }),
    ["/Users/e/Library/Application Support/Claude/plan-usage-history.json"]);
});

// ---------- mettere insieme le due fonti ----------

const daApi = (at) => ({
  fiveHour: { pct: 50, resetsAt: iso(at + 2 * 3.6e6) },
  weekly: { pct: 20, resetsAt: iso(at + 3 * 24 * 3.6e6) },
  weeklyOpus: null,
  scopedPct: 38, scopedName: "Fable",
  models: [{ name: "Fable", pct: 38, resetsAt: iso(at + 3 * 24 * 3.6e6) }],
});

test("una lettura di Desktop prende le ore di reset che non sono ancora passate", () => {
  const vecchia = daApi(NOW - 10 * 60_000);
  const nuova = letturaDesktop(fileDesktop([{ t: NOW, u: { fh: 55, sd: 21 } }])).usage;
  const u = completa(nuova, vecchia, NOW - 10 * 60_000, NOW);
  assert.equal(u.fiveHour.pct, 55);                         // il numero è quello nuovo
  assert.equal(u.fiveHour.resetsAt, vecchia.fiveHour.resetsAt);
  assert.equal(u.weekly.resetsAt, vecchia.weekly.resetsAt);
  assert.equal(u.scopedName, "Fable");                       // Desktop non ha Fable
  assert.ok(u.models.some((m) => m.name === "Fable"));
});

test("un reset già passato non si porta avanti: la finestra è ripartita", () => {
  const vecchia = daApi(NOW - 3 * 3.6e6);                    // il 5h resettava un'ora fa
  const nuova = letturaDesktop(fileDesktop([{ t: NOW, u: { fh: 3, sd: 22 } }])).usage;
  const u = completa(nuova, vecchia, NOW - 3 * 3.6e6, NOW);
  assert.equal(u.fiveHour.resetsAt, null);
  assert.equal(u.weekly.resetsAt, vecchia.weekly.resetsAt);  // la settimana no
});

test("Fable da una lettura vecchia non si mostra come se fosse di adesso", () => {
  const at = NOW - FRESCA_MS - 60_000;
  const nuova = letturaDesktop(fileDesktop([{ t: NOW, u: { fh: 5, sd: 22 } }])).usage;
  const u = completa(nuova, daApi(at), at, NOW);
  assert.equal(u.scopedPct, null);
  assert.ok(!u.models.some((m) => m.name === "Fable"));
});

test("con Desktop fresco i tasti mostrano i numeri anche mentre l'endpoint risponde 429", () => {
  const usage = letturaDesktop(fileDesktop([{ t: NOW - 4 * 60_000, u: { fh: 64, sd: 29 } }])).usage;
  assert.equal(gaugeSource({ usage, usageErr: "usage endpoint HTTP 429 (backing off to 600s)", usageAt: NOW - 4 * 60_000, now: NOW }), "subscription");
  // Un campione di ore fa invece no: torna il motivo per cui non c'è un numero.
  assert.equal(gaugeSource({ usage, usageErr: "usage endpoint HTTP 429", usageAt: NOW - 3 * 3.6e6, now: NOW }), "throttled");
});

// ---------- quando chiamare l'endpoint ----------

test("l'endpoint si chiama solo quando Desktop non basta", () => {
  // Nessun Desktop: sì.
  assert.equal(serveEndpoint({ now: NOW, usageAt: 0, src: null, apiOkAt: 0 }), true);
  // Desktop fresco e una risposta buona da poco: no.
  assert.equal(serveEndpoint({ now: NOW, usageAt: NOW - 60_000, src: "desktop", apiOkAt: NOW - 10 * 60_000 }), false);
  // Desktop fresco, ma l'ultima risposta buona è di oltre mezz'ora fa: una, per i reset e Fable.
  assert.equal(serveEndpoint({ now: NOW, usageAt: NOW - 60_000, src: "desktop", apiOkAt: NOW - 31 * 60_000 }), true);
  // Desktop fermo da più di dieci minuti: sì.
  assert.equal(serveEndpoint({ now: NOW, usageAt: NOW - 11 * 60_000, src: "desktop", apiOkAt: NOW - 60_000 }), true);
});

test("dopo un 429 si aspetta il retry-after, o il doppio, fino a mezz'ora", () => {
  assert.equal(ritardoDopo429(API_BASE_MS, null), 2 * API_BASE_MS);
  assert.equal(ritardoDopo429(API_BASE_MS, "1500"), 1_500_000);   // il server chiede di più
  assert.equal(ritardoDopo429(API_BASE_MS, "0"), 2 * API_BASE_MS); // «0» non vuol dire «subito»
  assert.equal(ritardoDopo429(API_MAX_MS, "5000"), API_MAX_MS);
  assert.equal(ritardoDopo429(1000, null), API_BASE_MS);
});

// ---------- la risposta dell'endpoint ----------

test("la risposta dell'endpoint: 5h e settimana, più i limiti per modello", () => {
  const u = usageDaRisposta({
    five_hour: { utilization: 13, resets_at: "2026-11-09T18:00:00Z" },
    seven_day: { utilization: 1, resets_at: "2026-11-14T05:00:00Z" },
    seven_day_opus: { utilization: 7, resets_at: null },
    limits: [{ kind: "weekly_scoped", percent: 38, resets_at: "2026-11-14T05:00:00Z", scope: { model: { display_name: "Fable" } } }],
  });
  assert.deepEqual(u.fiveHour, { pct: 13, resetsAt: "2026-11-09T18:00:00Z" });
  assert.equal(u.weekly.pct, 1); // l'1% resta 1%, non 100%
  assert.equal(u.scopedName, "Fable");
  assert.deepEqual(u.models.map((m) => m.name), ["Fable", "Opus"]);
});

test("la risposta dell'endpoint nella forma con i soli limits", () => {
  const u = usageDaRisposta({ limits: [
    { kind: "session", percent: 22, resets_at: "a" },
    { kind: "weekly_all", percent: 41, resets_at: "b" },
  ] });
  assert.deepEqual(u.fiveHour, { pct: 22, resetsAt: "a" });
  assert.deepEqual(u.weekly, { pct: 41, resetsAt: "b" });
});
