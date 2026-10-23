// node --test web/tests
import test from "node:test";
import assert from "node:assert/strict";
import { emptyDoc, mergeDocs, sameDoc, sanitizeDoc } from "../js/merge.js";
import worker from "../../worker/index.js";

const NOW = 1_800_000_000_000;
const ex = (id, name) => ({ id, name, sets: 3, reps: "10", description: "", templateID: null });
const routine = (id, t, over = {}) => ({ id, t, dayNumber: 1, variant: "", name: "Uno", isArchived: false, muscleGroups: [{ id: `g${id}`, name: "PECHO", exercises: [ex(`e${id}`, `Press ${id}`)] }], ...over });
const session = (id, date = NOW) => ({ id, date, startedAt: date, dayNumber: 1, variant: "", completedExerciseIDs: [], weightLog: {}, completedSetsLog: {}, isCompleted: true, setTypeLog: {}, repsLog: {}, timeLog: {}, distanceLog: {}, lastSetAt: null });
const doc = (parts = {}) => sanitizeDoc({ ...emptyDoc(), ...parts });
const keys = (o) => Object.keys(o).sort();

test("une sesiones de dos dispositivos sin perder ninguna", () => {
  const a = doc({ sessions: { S1: session("S1"), S2: session("S2") } });
  const b = doc({ sessions: { S2: session("S2"), S3: session("S3") } });
  assert.deepEqual(keys(mergeDocs(a, b, NOW).sessions), ["S1", "S2", "S3"]);
});

test("gana la edición más reciente de una rutina", () => {
  const a = doc({ routines: { R1: routine("R1", 100, { name: "Vieja" }) } });
  const b = doc({ routines: { R1: routine("R1", 200, { name: "Nueva" }) } });
  assert.equal(mergeDocs(a, b, NOW).routines.R1.name, "Nueva");
  assert.equal(mergeDocs(b, a, NOW).routines.R1.name, "Nueva");
});

test("una baja gana sobre una copia más vieja, y una edición posterior la deshace", () => {
  const borrada = doc({ bajas: { routines: { R1: 300 }, sessions: { S1: 300 }, templates: {} } });
  const vieja = doc({ routines: { R1: routine("R1", 200) }, sessions: { S1: session("S1") } });
  const m = mergeDocs(vieja, borrada, NOW);
  assert.deepEqual([keys(m.routines), keys(m.sessions)], [[], []]);
  const nueva = doc({ routines: { R1: routine("R1", 400) } });
  const m2 = mergeDocs(nueva, borrada, NOW);
  assert.deepEqual(keys(m2.routines), ["R1"]);
  assert.equal(m2.bajas.routines.R1, undefined);
});

test("es idempotente y no depende del orden", () => {
  const a = doc({ routines: { R1: routine("R1", NOW - 500), R2: routine("R2", NOW - 900, { dayNumber: 2, name: "Dos" }) }, sessions: { S1: session("S1") }, rest: { v: 60, t: 10 } });
  const b = doc({ routines: { R1: routine("R1", NOW - 600, { name: "X" }) }, sessions: { S2: session("S2") }, bajas: { routines: { R2: NOW - 800 }, sessions: {}, templates: {} }, rest: { v: 90, t: 20 } });
  const ab = mergeDocs(a, b, NOW);
  assert.ok(sameDoc(ab, mergeDocs(b, a, NOW)));
  assert.ok(sameDoc(ab, mergeDocs(ab, a, NOW)));
  assert.ok(sameDoc(ab, mergeDocs(ab, ab, NOW)));
  assert.equal(ab.rest.v, 90);
  assert.deepEqual(keys(ab.routines), ["R1"]);
});

test("la plantilla sembrada en dos dispositivos no se duplica", () => {
  const a = doc({ routines: { A1: routine("A1", 0, { name: "" }) } });
  const b = doc({ routines: { B1: routine("B1", 0, { name: "" }) } });
  // mismas rutinas con ids distintos: se las reconoce por nombre, día y ejercicios iguales
  const a2 = doc({ routines: { A1: { ...routine("A1", 0, { name: "Impulso" }), muscleGroups: routine("X", 0).muscleGroups } } });
  const b2 = doc({ routines: { B1: { ...routine("B1", 0, { name: "Impulso" }), muscleGroups: routine("X", 0).muscleGroups } } });
  const m = mergeDocs(a2, b2, NOW);
  assert.equal(Object.keys(m.routines).length, 1);
  assert.equal(Object.keys(m.bajas.routines).length, 1);   // la otra queda dada de baja
  assert.ok(sameDoc(m, mergeDocs(b2, a2, NOW)));
  assert.equal(Object.keys(mergeDocs(a, b, NOW).routines).length, 2);   // distintas de verdad (otros ejercicios): se conservan
});

test("dos rutinas nuevas con el mismo día reciben días distintos", () => {
  const a = doc({ routines: { A: routine("A", 100, { dayNumber: 7, name: "Alfa" }) } });
  const b = doc({ routines: { B: routine("B", 200, { dayNumber: 7, name: "Beta" }) } });
  const days = Object.values(mergeDocs(a, b, NOW).routines).map((r) => r.dayNumber).sort();
  assert.deepEqual(days, [7, 8]);
});

test("sanitizeDoc descarta lo que no tiene forma y acota ids", () => {
  assert.deepEqual(sanitizeDoc(null), emptyDoc());
  assert.deepEqual(sanitizeDoc("x"), emptyDoc());
  const d = sanitizeDoc({ routines: { ["x".repeat(100)]: routine("R", 1), OK: routine("OK", 1) }, rest: { v: 99999, t: 1 }, bajas: { routines: { Z: -5, W: 3 } } });
  assert.deepEqual(keys(d.routines), ["OK"]);
  assert.equal(d.rest.v, 45);
  assert.deepEqual(d.bajas.routines, { W: 3 });
});

// ---- Worker (KV simulado)
const kv = () => { const m = new Map(); return { get: async (k) => (m.has(k) ? JSON.parse(m.get(k)) : null), put: async (k, v) => { m.set(k, v); }, _m: m }; };
const CODE = "a".repeat(22);
const call = (env, method, path, body, headers = {}) => worker.fetch(new Request(`https://x.com.ar${path}`, { method, body: body ? JSON.stringify(body) : undefined, headers }), env);

test("worker: crea el espacio, une lo de cada dispositivo y evita escrituras sin cambios", async () => {
  const env = { ESPACIOS: kv() };
  assert.equal((await call(env, "GET", `/api/e/${CODE}`)).status, 404);
  const a = await (await call(env, "PUT", `/api/e/${CODE}`, { doc: doc({ sessions: { S1: session("S1") } }) })).json();
  assert.deepEqual(keys(a.doc.sessions), ["S1"]);
  const b = await (await call(env, "PUT", `/api/e/${CODE}`, { doc: doc({ sessions: { S2: session("S2") } }) })).json();
  assert.deepEqual(keys(b.doc.sessions), ["S1", "S2"]);
  const again = await (await call(env, "PUT", `/api/e/${CODE}`, { doc: doc({ sessions: { S2: session("S2") } }) })).json();
  assert.equal(again.rev, b.rev);   // nada cambió: no se reescribió
  const same = await (await call(env, "GET", `/api/e/${CODE}?desde=${b.rev}`)).json();
  assert.equal(same.igual, true);
  assert.deepEqual(keys((await (await call(env, "GET", `/api/e/${CODE}`)).json()).doc.sessions), ["S1", "S2"]);
});

test("worker: rechaza códigos cortos, métodos raros, JSON inválido y otros orígenes", async () => {
  const env = { ESPACIOS: kv() };
  assert.equal((await call(env, "GET", "/api/e/corto")).status, 400);
  assert.equal((await call(env, "DELETE", `/api/e/${CODE}`)).status, 405);
  assert.equal((await worker.fetch(new Request(`https://x.com.ar/api/e/${CODE}`, { method: "PUT", body: "no json" }), env)).status, 400);
  assert.equal((await call(env, "PUT", `/api/e/${CODE}`, { doc: emptyDoc() }, { origin: "https://otro.com" })).status, 403);
  assert.equal((await call({}, "GET", `/api/e/${CODE}`)).status, 503);
  assert.equal((await call(env, "GET", "/api/otra-cosa")).status, 404);
});
