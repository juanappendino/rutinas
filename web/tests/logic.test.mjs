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

test("sincronización: el documento local ya está en forma canónica (no se ve distinto del que devuelve el servidor)", async () => {
  const { toDoc } = await import("../js/sync.js");
  const { sanitizeDoc, sameDoc } = await import("../js/merge.js");
  const s = fresh();
  const csv = [
    "Fecha,Rutina,Grupo,Ejercicio,Series completadas,Reps,Peso (kg),Tiempo (seg)",
    "2026-10-08,One,ESPALDA,Remo con barra,4,15,40.0,",
    "2026-10-20,Ancla,ESPALDA,Remo con barra,4,15,40.0,",
  ].join("\n");
  const { sessions, newRoutines } = parseCSV(csv, s.routines);
  // una rutina que llega sin marca de edición (p. ej. de una versión anterior) no debe provocar un ciclo de sincronización
  store.commit((st) => { st.routines.push(...newRoutines); st.history = sessions; });
  assert.ok(sameDoc(toDoc(), sanitizeDoc(JSON.parse(JSON.stringify(toDoc())))));
});

test("la rotación sigue el orden de la lista", () => {
  const s = fresh();
  const [r1, r2, r3] = s.routines;
  store.reorderActiveRoutines([r3.id, r1.id, r2.id, ...s.routines.slice(3).map((r) => r.id)]);
  assert.equal(L.nextWorkout(store.state).id, r3.id);
  doSession(r3);
  assert.equal(L.nextWorkout(store.state).id, r1.id);
  doSession(r1);
  assert.equal(L.nextWorkout(store.state).id, r2.id);
  assert.ok(store.state.orderAt > 0);
});

test("sesiones por semana y récords personales", () => {
  const s = fresh();
  const now = new Date(2026, 9, 23, 15).getTime();   // viernes 23 oct 2026
  const base = Date.now();
  const press = L.allExercises(s.routines[0]).find((e) => e.name !== "Cinta");   // el que registra doSession
  const dates = [0, 1, 8, 9, 10, 70];
  dates.forEach((d, i) => doSession(s.routines[0], { kg: 40 + i * 5, daysAgo: 0 }));
  store.commit((st) => { st.history.forEach((x, i) => { const at = now - dates[dates.length - 1 - i] * DAY; x.date = at; x.startedAt = at; }); });
  const weeks = L.weeklySessions(store.state.history, 8, now);
  assert.equal(weeks.length, 8);
  assert.equal(weeks.at(-1).isCurrent, true);
  assert.equal(weeks.at(-1).count, 2);            // vie 23 y jue 22
  assert.equal(weeks.reduce((n, w) => n + w.count, 0), 5);   // la de hace 70 días queda fuera de las 8 semanas
  const prs = L.personalRecords(store.state);
  const row = prs.find((p) => p.name === press.name);
  assert.equal(row.kg, 65);
  assert.ok(prs.every((p, i) => i === 0 || prs[i - 1].kg >= p.kg));
});

test("discos por lado para una barra de 20 kg", () => {
  assert.equal(L.platesPerSide(20), null);
  assert.equal(L.platesPerSide(15), null);
  assert.deepEqual(L.platesPerSide(60), { plates: [20], leftover: 0 });
  assert.deepEqual(L.platesPerSide(100), { plates: [25, 15], leftover: 0 });
  assert.deepEqual(L.platesPerSide(42.5), { plates: [10, 1.25], leftover: 0 });
  assert.deepEqual(L.platesPerSide(61), { plates: [20], leftover: 0.5 });
});

test("historial de tiempo y distancia de la cinta", () => {
  const s = fresh();
  const cinta = L.allExercises(s.routines[0]).find((e) => e.name === "Cinta");
  const run = (secs, km, daysAgo) => {
    store.commit((st) => { st.manualOverrideID = s.routines[0].id; });
    store.startWorkout();
    store.logSet(0, cinta, { type: "time", time: secs, distance: km });
    store.finishWorkout();
    store.commit((st) => { st.history[0].date -= daysAgo * DAY; });
  };
  run(600, 1.2, 6); run(900, 2, 3); run(0, null, 1);
  const th = L.timeHistory(store.state, cinta);
  assert.deepEqual(th.map((p) => [p.secs, p.km]), [[600, 1.2], [900, 2]]);   // el de 0 s no cuenta
  assert.equal(L.weightHistory(store.state, cinta).length, 0);
});

function sessionWith(routine, names, daysAgo, kg = 20) {
  const s = { id: crypto.randomUUID().toUpperCase(), t: 0, date: Date.now() - daysAgo * DAY, startedAt: Date.now() - daysAgo * DAY, dayNumber: routine.dayNumber, variant: "", completedExerciseIDs: [], weightLog: {}, completedSetsLog: {}, isCompleted: true, setTypeLog: {}, repsLog: {}, timeLog: {}, distanceLog: {}, lastSetAt: null };
  for (const ex of L.allExercises(routine)) if (names.includes(ex.name)) { s.completedSetsLog[ex.id] = [0, 1]; s.weightLog[ex.id] = kg; s.repsLog[ex.id] = 10; s.setTypeLog[ex.id] = "weightReps"; }
  return s;
}

test("favoritos: uno por grupo y después los más usados, en el orden de los grupos", () => {
  const s = fresh();
  const [impulso, explosion] = s.routines;
  const history = [];
  // Impulso: Plancha (ABS) ×5, Press con barra (PECHO) ×4, Press militar (HOMBROS) ×3, Fondos (TRÍCEPS) ×1
  for (let i = 0; i < 5; i++) history.push(sessionWith(impulso, ["Plancha"].concat(i < 4 ? ["Press con barra banco plano"] : [], i < 3 ? ["Press militar con barra de pie"] : [], i < 1 ? ["Fondos en paralelas"] : []), 30 - i * 3));
  // Explosión: Apertura (PECHO) ×3
  for (let i = 0; i < 3; i++) history.push(sessionWith(explosion, ["Apertura con mancuernas banco plano"], 25 - i * 3));
  store.commit((st) => { st.history = history; });
  const favs = L.favoriteExercises(store.state, { max: 4 });
  assert.deepEqual(favs.map((f) => f.name), ["Plancha", "Press con barra banco plano", "Apertura con mancuernas banco plano", "Press militar con barra de pie"]);
  assert.deepEqual(favs.map((f) => f.group), ["ABS", "PECHO", "PECHO", "HOMBROS"]);   // uno por grupo, el segundo de PECHO de relleno, y todo en el orden de los grupos
  assert.equal(favs[1].uses, 4);
  assert.equal(favs[1].lastKg, 20);
  assert.ok(!favs.some((f) => f.name === "Fondos en paralelas"));   // una sola vez: no es un favorito
  assert.equal(L.favoriteExercises({ ...store.state, history: [] }).length, 0);
});

test("días desde la última sesión", () => {
  assert.equal(L.daysSinceLastSession([]), null);
  const now = new Date(2026, 9, 30, 12).getTime();
  const h = [{ isCompleted: true, date: new Date(2026, 9, 20, 18).getTime() }, { isCompleted: true, date: new Date(2026, 9, 8, 18).getTime() }];
  assert.equal(L.daysSinceLastSession(h, now), 10);
});
