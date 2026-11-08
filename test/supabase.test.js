import test from "node:test";
import assert from "node:assert/strict";
import { classifica, sqlLegge, strumentoSupabase, etichetta, bersaglio, refs } from "../src/supabase.js";

const CONF = { prod: "prodref1234567890abc", staging: "stagref1234567890abc, altro" };
const sql = (query, project_id = "prodref1234567890abc", extra = {}) =>
  ({ toolName: "mcp__Supabase__execute_sql", toolInput: { project_id, query }, ...extra });

test("le letture vere sono letture", () => {
  for (const q of [
    "select * from public.school_season limit 10",
    "SELECT count(*) FROM engagement;",
    "with x as (select 1) select * from x",
    "explain select * from t",
    "-- commento\nselect 1",
    "select 'delete from t' as testo", // la parola è dentro una stringa
    "select coalesce(a, b), now() from t",
  ]) assert.equal(sqlLegge(q), true, q);
});

test("nel dubbio è una scrittura", () => {
  for (const q of [
    "delete from t",
    "update t set a = 1",
    "select 1; delete from t",              // due istruzioni
    "select 1; reindex table t",            // due istruzioni, e la seconda non ha parole «che scrivono»
    "select 1; discard all",
    "with x as (delete from t returning *) select * from x", // CTE che modifica
    "select * into nuova from t",           // crea una tabella
    "select public.rpc_qualcosa(1)",        // funzione con schema: non so cosa faccia
    "select set_config('x', 'y', false)",
    "select nextval('seq')",
    "explain analyze delete from t",
    "create table t()",
    "",
    "   ",
  ]) assert.equal(sqlLegge(q), false, q);
});

test("una query tagliata dal relay non è mai una lettura", () => {
  assert.equal(sqlLegge("select 1", true), false);
});

test("riconosce gli strumenti di Supabase dal nome del server MCP", () => {
  assert.equal(strumentoSupabase("mcp__Supabase__execute_sql"), "execute_sql");
  assert.equal(strumentoSupabase("mcp__claude_ai_Supabase__list_tables"), "list_tables");
  assert.equal(strumentoSupabase("mcp__github__create_pull_request"), null);
  assert.equal(strumentoSupabase("Bash"), null);
});

test("scrittura su PROD: pressione lunga", () => {
  const c = classifica(sql("delete from t"), CONF);
  assert.deepEqual(c, { strumento: "execute_sql", progetto: "PROD", scrive: true, lungo: true });
  assert.equal(etichetta(c), "PROD · scrive");
});

test("scrittura su STAGING: un tocco basta", () => {
  const c = classifica(sql("delete from t", "stagref1234567890abc"), CONF);
  assert.equal(c.progetto, "STAGING");
  assert.equal(c.lungo, false);
});

test("lettura su PROD: un tocco basta", () => {
  const c = classifica(sql("select 1"), CONF);
  assert.equal(c.scrive, false);
  assert.equal(c.lungo, false);
  assert.equal(etichetta(c), "PROD · legge");
});

test("un progetto sconosciuto vale come produzione", () => {
  const c = classifica(sql("delete from t", "chissà"), CONF);
  assert.equal(c.progetto, "?");
  assert.equal(c.lungo, true);
  assert.equal(etichetta(c), "PROD? · scrive");
  assert.equal(classifica(sql("delete from t"), {}).lungo, true, "senza riferimenti configurati");
});

test("gli strumenti che leggono e quelli che scrivono", () => {
  const t = (tool, input = { project_id: "prodref1234567890abc" }) => classifica({ toolName: `mcp__Supabase__${tool}`, toolInput: input }, CONF);
  assert.equal(t("list_tables").scrive, false);
  assert.equal(t("get_advisors").scrive, false);
  assert.equal(t("apply_migration").lungo, true);
  assert.equal(t("deploy_edge_function").lungo, true);
  assert.equal(t("uno_strumento_nuovo").scrive, true, "uno strumento che non conosco scrive");
});

test("la CLI di Supabase nel terminale", () => {
  const b = (command) => classifica({ toolName: "Bash", toolInput: { command } }, CONF);
  assert.deepEqual(b("npx supabase db push"), { strumento: "supabase CLI", progetto: "?", scrive: true, lungo: true });
  assert.equal(b("supabase migration list").scrive, false);
  assert.equal(b("supabase db push --project-ref stagref1234567890abc").lungo, false);
  assert.equal(b("npm test"), null);
});

test("cosa scrivere su ALLOW/DENY", () => {
  assert.equal(bersaglio(sql("delete from t"), classifica(sql("delete from t"), CONF)), "SQL DELETE");
  const m = { toolName: "mcp__Supabase__apply_migration", toolInput: { name: "0151_prova", query: "x" } };
  assert.equal(bersaglio(m, classifica(m, CONF)), "0151_prova");
  assert.equal(bersaglio({ toolName: "Bash", toolInput: { command: "npx supabase db push" } }, { strumento: "supabase CLI" }), "db push");
});

test("i riferimenti si scrivono separati da virgole o spazi", () => {
  assert.deepEqual(refs(" Abc, def;ghi  jkl "), ["abc", "def", "ghi", "jkl"]);
  assert.deepEqual(refs(undefined), []);
});
