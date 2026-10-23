// node --test web/tests
import test from "node:test";
import assert from "node:assert/strict";
import * as store from "../js/store.js";
import * as L from "../js/logic.js";
import { BackupError, parseBackup, parseCSV, summarizeBackup, toBackup, toCSV } from "../js/backup.js";
import { DEFAULT_ROUTINES, EXERCISE_LIBRARY } from "../js/defaults.js";

const DAY = 86_400_000;
const find = (name) => store.state.routines.flatMap((r) => L.allExercises(r)).find((e) => e.name === name);

function fresh() {
  store.resetAll();
  return store.state;
}

function doSession(routine, { kg = null, daysAgo = 0, sets = 1 } = {}) {
  store.commit((s) => { s.manualOverrideID = routine.id; });
  store.startWorkout();
  const ex = L.allExercises(routine).find((e) => e.name !== "Cinta");
  for (let i = 0; i < Math.min(sets, ex.sets); i++) store.logSet(i, ex, { type: "weightReps", weight: kg, reps: 10 });
  const summary = store.finishWorkout();
  if (daysAgo) store.commit((s) => { s.history[0].date -= daysAgo * DAY; s.history[0].startedAt -= daysAgo * DAY; });
  return { summary, ex };
}

test("defaults: 6 rutinas, 53 ejercicios, catálogo completo", () => {
  const s = fresh();
  assert.equal(s.routines.length, DEFAULT_ROUTINES.length);
  assert.equal(s.routines.reduce((n, r) => n + L.allExercises(r).length, 0), 53);
  assert.equal(s.exerciseCatalog.length, EXERCISE_LIBRARY.length);
  assert.equal(s.hasOnboarded, false);
  assert.deepEqual(s.routines.map((r) => L.routineName(r)), ["Impulso", "Explosión", "Ancla", "Tensión", "Raíz", "Tierra"]);
});

test("infiere tipo de serie por el texto de reps", () => {
  assert.equal(L.inferSetType("10 min"), "time");
  assert.equal(L.inferSetType("30 seg"), "time");
  assert.equal(L.inferSetType("45s"), "time");
  assert.equal(L.inferSetType("12"), "weightReps");
  assert.equal(L.inferSetType("15 c/lado"), "weightReps");
});

test("la rotación pasa a la siguiente rutina activa y vuelve al principio", () => {
  const s = fresh();
  assert.equal(L.nextWorkout(s).dayNumber, 1);
  const [r1, , , r4, , r6] = s.routines;
  doSession(r1);
  assert.equal(L.nextWorkout(store.state).dayNumber, 2);
  doSession(r6);
  assert.equal(L.nextWorkout(store.state).dayNumber, 1);
  store.toggleArchive(r1);
  assert.equal(L.nextWorkout(store.state).dayNumber, 2);   // la archivada se saltea
  store.overrideNextRoutine(r4);
  assert.equal(L.nextWorkout(store.state).dayNumber, 4);
});

test("serie: logSet completa el ejercicio al llegar a todas las series; toggleSet deshace", () => {
  fresh();
  store.startWorkout();
  const ex = find("Plancha");
  store.logSet(0, ex, { type: "time", time: 60 });
  assert.equal(L.setTypeFor(store.state, ex), "time");
  store.toggleSet(1, ex);
  store.toggleSet(2, ex);
  assert.ok(L.isExerciseCompleted(store.state, ex));
  store.toggleSet(2, ex);
  assert.ok(!L.isExerciseCompleted(store.state, ex));
  assert.deepEqual([...L.completedSetIndices(store.state, ex)], [0, 1]);
  assert.equal(store.state.activeSession.repsLog[ex.id], 1);   // reps por defecto = primer número de "1 min"
});

test("última vez y resumen con PR", () => {
  const s = fresh();
  const r = s.routines[0];
  const press = L.allExercises(r).find((e) => e.name === "Press con barra banco plano");
  const run = (kg, daysAgo) => {
    store.commit((st) => { st.manualOverrideID = r.id; });
    store.startWorkout();
    store.logSet(0, press, { type: "weightReps", weight: kg, reps: 8 });
    const summary = store.finishWorkout();
    store.commit((st) => { st.history[0].date -= daysAgo * DAY; st.history[0].startedAt -= daysAgo * DAY; });
    return summary;
  };
  const first = run(60, 6);
  assert.deepEqual(first.newPRs, [{ name: press.name, kg: 60 }]);
  const second = run(60, 4);
  assert.equal(second.newPRs.length, 0);
  const third = run(62.5, 0);
  assert.deepEqual(third.newPRs, [{ name: press.name, kg: 62.5 }]);
  assert.equal(third.heaviest.kg, 62.5);
  assert.equal(L.lastWeight(store.state, press), 62.5);
  assert.equal(L.lastReps(store.state, press), 8);
  assert.deepEqual(L.weightHistory(store.state, press).map((p) => p.kg).sort(), [60, 60, 62.5]);
  assert.equal(L.weightTrend(store.state, press), "up");
});

test("la última vez también se encuentra por nombre en otra rutina", () => {
  const s = fresh();
  const cinta1 = L.allExercises(s.routines[0]).find((e) => e.name === "Cinta");
  const cinta2 = L.allExercises(s.routines[1]).find((e) => e.name === "Cinta");
  store.commit((st) => { st.manualOverrideID = s.routines[0].id; });
  store.startWorkout();
  store.logSet(0, cinta1, { type: "time", time: 600, distance: 1.5 });
  store.finishWorkout();
  assert.equal(L.lastDistance(store.state, cinta2), 1.5);
});

test("rachas, estadísticas y logros", () => {
  const s = fresh();
  const now = new Date(2026, 9, 23, 15).getTime();
  for (const d of [0, 1, 2, 3, 4, 10]) doSession(s.routines[d % 6], { daysAgo: d, kg: d === 4 ? 85 : null });
  // doSession usa Date.now(): reubicamos las fechas respecto de `now` para no depender del reloj
  const base = Date.now();
  store.commit((st) => { for (const x of st.history) { const off = base - x.date; x.date = now - off; x.startedAt = now - off; } });
  const h = store.state.history;
  assert.equal(L.currentStreak(h, now), 5);
  assert.equal(L.bestStreak(h), 5);
  assert.equal(L.totalSessions(h), 6);
  const b = L.badges(h, now);
  assert.deepEqual(b.filter((x) => x.unlocked).map((x) => x.id), ["first", "week", "heavy"]);
  assert.equal(L.currentMonthDays(h, now), 6);
  const hm = L.heatmap(h, now);
  assert.equal(hm.length, 28);
  assert.ok(hm[27].isToday && hm[27].level > 0);
  assert.equal(hm[27 - 6].level, 0);
  assert.equal(hm[27 - 10].level > 0, true);
  assert.equal(L.groupSessionsByMonth(h, now)[0].label, "OCTUBRE");
});

test("copia JSON: ida y vuelta conserva todo", () => {
  const s = fresh();
  doSession(s.routines[3], { kg: 20, daysAgo: 2 });
  doSession(s.routines[1], { kg: 30 });
  const text = JSON.stringify(toBackup(store.state));
  const parsed = parseBackup(text);
  assert.equal(parsed.routines.length, 6);
  assert.equal(parsed.history.length, 2);
  assert.deepEqual(summarizeBackup(parsed), { routines: 6, sessions: 2, exercises: 53 });
  const orig = store.state.history[1];
  const back = parsed.history.find((x) => x.id === orig.id);
  assert.equal(Math.floor(back.date / 1000), Math.floor(orig.date / 1000));
  assert.deepEqual(back.weightLog, orig.weightLog);
  assert.deepEqual(back.completedSetsLog, orig.completedSetsLog);
  const restored = store.replaceState(parsed);
  assert.equal(restored.history.length, 2);
  assert.equal(store.state.hasOnboarded, true);
});

test("copia de la app iOS: ids en minúscula, fechas numéricas y speedLog", () => {
  const ios = {
    routines: [{ id: "abc-1", dayNumber: 8, variant: "", name: "One", muscleGroups: [{ id: "g1", name: "CORE", exercises: [{ id: "e1", name: "Plancha", sets: 3, reps: "1 min" }] }] }],
    history: [{ id: "s1", date: 783_000_000, startedAt: 782_999_000, dayNumber: 8, variant: "", completedExerciseIDs: ["e1"], isCompleted: true, weightLog: { e1: 0 }, completedSetsLog: { e1: [0, 1, 2] }, speedLog: { e1: 2 } }],
  };
  const p = parseBackup(JSON.stringify(ios));
  assert.equal(p.routines[0].id, "ABC-1");
  assert.equal(p.history[0].completedSetsLog.E1.length, 3);
  assert.equal(p.history[0].distanceLog.E1, 2);
  assert.equal(new Date(p.history[0].date).getUTCFullYear(), 2025);   // 783e6 s desde 2001 → 2025
  assert.equal(L.routineName(p.routines[0]), "One");
});

test("copia inválida da errores claros", () => {
  assert.throws(() => parseBackup("no json"), BackupError);
  assert.throws(() => parseBackup("[]"), BackupError);
  assert.throws(() => parseBackup('{"app":"otra"}'), BackupError);
  assert.throws(() => parseBackup('{"foo":1}'), BackupError);
});

test("CSV: exporta y vuelve a importar el mismo historial", () => {
  const s = fresh();
  doSession(s.routines[3], { kg: 22.5, sets: 2, daysAgo: 3 });
  const csv = toCSV(store.state);
  assert.match(csv.split("\n")[0], /^Fecha,Rutina,Grupo,Ejercicio/);
  const { sessions, skipped } = parseCSV(csv, store.state.routines);
  assert.equal(skipped, 0);
  assert.equal(sessions.length, 1);
  const ex = L.allExercises(store.state.routines[3]).find((e) => e.name !== "Cinta");
  assert.equal(sessions[0].weightLog[ex.id], 22.5);
  assert.deepEqual(sessions[0].completedSetsLog[ex.id], [0, 1]);
  assert.throws(() => parseCSV("hola", []), BackupError);
});

test("cronómetro: reiniciar vuelve a cero y el temporizador suma 30 s", async () => {
  const { stopwatch } = await import("../js/timers.js");
  stopwatch.toggle();
  stopwatch.toggle();
  stopwatch.reset();
  assert.equal(stopwatch.totalSeconds, 0);
  stopwatch.startCountdown(30);
  assert.equal(stopwatch.mode, "countdown");
  stopwatch.addCountdown(30);
  assert.equal(stopwatch.countdownTarget, 60);
  assert.equal(stopwatch.displaySeconds, 60);
  stopwatch.switchToStopwatch();
  assert.equal(stopwatch.mode, "stopwatch");
  assert.equal(stopwatch.running, false);
});

test("CSV de la app: rutinas por nombre, rutina propia nueva y ejercicios que ya no existen", () => {
  const s = fresh();
  const csv = [
    "Fecha,Rutina,Grupo,Ejercicio,Series completadas,Reps,Peso (kg),Tiempo (seg)",
    "2026-10-20,Ancla,ESPALDA,Remo con barra,4,15,40.0,",
    "2026-10-20,Ancla,BÍCEPS,Curl con barra,4,10,25.0,",
    "2026-10-08,One,ESPALDA,Remo con barra,4,15,40.0,",
    "2026-10-08,One,CORE,Plancha,2,45,,30",
    "2026-09-21,One,CORE,Plancha,2,45,,30",
    "2026-09-21,One,PIERNAS,Sentadilla con barra,4,10,30.0,",
    "2026-05-14,Explosión,PIERNAS,Ejercicio que ya no existe,3,1,,",
  ].join("\n");
  const { sessions, newRoutines, skipped } = parseCSV(csv, s.routines);
  assert.equal(newRoutines.length, 1);
  assert.equal(L.routineName(newRoutines[0]), "One");
  assert.equal(newRoutines[0].dayNumber, 7);
  assert.deepEqual(newRoutines[0].muscleGroups.map((g) => g.name), ["ESPALDA", "CORE"]);   // armada con su sesión más reciente
  assert.equal(skipped, 2);   // la sentadilla (no está en la última sesión de One) y el ejercicio inexistente
  assert.equal(sessions.length, 3);
  const ancla = sessions.find((x) => x.dayNumber === 3);
  const remo = L.allExercises(s.routines[2]).find((e) => e.name === "Remo con barra");
  assert.equal(ancla.weightLog[remo.id], 40);
  assert.equal(ancla.repsLog[remo.id], 15);
  const plancha = L.allExercises(newRoutines[0]).find((e) => e.name === "Plancha");
  assert.equal(plancha.reps, "1 min");
  const one = sessions.find((x) => x.dayNumber === 7 && x.date < sessions[0].date);
  assert.equal(one.setTypeLog[plancha.id], "time");
  assert.equal(one.timeLog[plancha.id], 30);
});

test("worker: sirve web/ bajo /rutinas y en la raíz", async () => {
  const { default: worker } = await import("../../worker/index.js");
  const env = { ASSETS: { fetch: async (r) => new Response(new URL(r.url).pathname) } };
  const call = async (u) => { const r = await worker.fetch(new Request(u), env); return [r.status, r.headers.get("location"), await r.text()]; };
  assert.deepEqual(await call("https://x.com.ar/rutinas"), [301, "https://x.com.ar/rutinas/", ""]);
  assert.deepEqual(await call("https://x.com.ar/rutinas/"), [200, null, "/"]);
  assert.deepEqual(await call("https://x.com.ar/rutinas/js/app.js"), [200, null, "/js/app.js"]);
  assert.deepEqual(await call("https://x.workers.dev/js/app.js"), [200, null, "/js/app.js"]);
  assert.deepEqual(await call("https://x.com.ar/rutinasfoo"), [200, null, "/rutinasfoo"]);   // otro path que empieza igual: no se toca
});
