// Lógica de entrenamiento: port de WorkoutManager.swift como funciones puras sobre el estado.
// El estado es { routines, history, activeSession, ... } (ver store.js); las fechas son milisegundos.
import { addDays, firstInt, sameMonth, sameWeek, startOfDay, startOfWeek, MESES } from "./util.js";

export const DAY_NAMES = { 1: "Impulso", 2: "Explosión", 3: "Ancla", 4: "Tensión", 5: "Raíz", 6: "Tierra" };

/** Nombre visible de una rutina: el propio, o el de la plantilla (días 1-6), o "Día N". */
export const routineName = (r) => (r.name && r.name.trim()) || DAY_NAMES[r.dayNumber] || `Día ${r.dayNumber}`;

export const findRoutine = (routines, session) =>
  routines.find((r) => r.dayNumber === session.dayNumber && r.variant === session.variant) ?? null;

/** Nombre de la rutina a la que pertenece una sesión (si la rutina ya no existe, el de la plantilla). */
export const sessionName = (routines, session) => {
  const r = findRoutine(routines, session);
  return r ? routineName(r) : DAY_NAMES[session.dayNumber] || `Día ${session.dayNumber}`;
};

export const allExercises = (routine) => (routine ? routine.muscleGroups.flatMap((g) => g.exercises) : []);
export const activeRoutines = (routines) => routines.filter((r) => !r.isArchived);
export const completedHistory = (history) => history.filter((s) => s.isCompleted);
const byDateDesc = (a, b) => b.date - a.date;

// ---- Tipo de serie

/** Infiere el tipo a partir del campo reps del ejercicio ("10 min", "30 seg", "45s" → time). */
export function inferSetType(reps) {
  const lower = String(reps ?? "").toLowerCase();
  return lower.includes("min") || lower.includes("seg") || lower.endsWith("s") ? "time" : "weightReps";
}

export function setTypeFor(state, exercise) {
  const raw = state.activeSession?.setTypeLog?.[exercise.id];
  if (raw === "weightReps" || raw === "reps" || raw === "time") return raw;
  return inferSetType(exercise.reps);
}

// ---- Qué toca hoy

export function nextWorkout(state) {
  const active = activeRoutines(state.routines);   // en el orden de la lista (se cambia en RUTINAS → ordenar)
  if (!active.length) return state.routines[0] ?? { id: "", dayNumber: 1, variant: "", name: "", muscleGroups: [], isArchived: false };
  if (state.manualOverrideID) {
    const overridden = active.find((r) => r.id === state.manualOverrideID);
    if (overridden) return overridden;
  }
  const done = completedHistory(state.history).sort(byDateDesc);
  if (!done.length) return active[0];
  const last = done[0];
  const idx = active.findIndex((r) => r.dayNumber === last.dayNumber && r.variant === last.variant);
  return idx >= 0 ? active[(idx + 1) % active.length] : active[0];
}

export function todayRoutine(state) {
  const s = state.activeSession;
  if (!s) return nextWorkout(state);
  return state.routines.find((r) => r.dayNumber === s.dayNumber && r.variant === s.variant) ?? nextWorkout(state);
}

export const estimatedMinutes = (totalSets) => Math.max(30, Math.ceil((totalSets * 1.5) / 5) * 5);

// ---- Búsqueda de datos históricos de un ejercicio

function hasData(key, s) {
  return s.weightLog[key] != null || s.repsLog[key] != null || s.timeLog[key] != null || s.completedSetsLog[key] != null;
}

/** Clave del ejercicio dentro de una sesión: 1) id exacto  2) mismo templateID  3) mismo nombre. */
export function keyFor(routines, exercise, session) {
  if (hasData(exercise.id, session)) return exercise.id;
  const sessionExercises = allExercises(findRoutine(routines, session));
  if (exercise.templateID) {
    const m = sessionExercises.find((e) => e.templateID === exercise.templateID);
    if (m && hasData(m.id, session)) return m.id;
  }
  const name = exercise.name.toLowerCase();
  const m = sessionExercises.find((e) => e.name.toLowerCase() === name);
  if (m && hasData(m.id, session)) return m.id;
  return null;
}

function lastValue(state, exercise, pick) {
  for (const s of completedHistory(state.history).sort(byDateDesc)) {
    const k = keyFor(state.routines, exercise, s);
    if (!k) continue;
    const v = pick(s, k);
    if (v != null) return v;
  }
  return null;
}

export const lastWeight = (state, ex) => lastValue(state, ex, (s, k) => s.weightLog[k]);
export const lastReps = (state, ex) => lastValue(state, ex, (s, k) => s.repsLog[k]);
export const lastDistance = (state, ex) => lastValue(state, ex, (s, k) => s.distanceLog[k]);

/** [{date, kg}] ascendente por fecha. */
export function weightHistory(state, exercise) {
  const out = [];
  for (const s of completedHistory(state.history)) {
    const k = keyFor(state.routines, exercise, s);
    if (!k) continue;
    const kg = s.weightLog[k];
    if (kg != null) out.push({ date: s.date, kg });
  }
  return out.sort((a, b) => a.date - b.date);
}

/** [{date, secs, km}] ascendente por fecha, para ejercicios de tiempo (cinta, plancha…). */
export function timeHistory(state, exercise) {
  const out = [];
  for (const s of completedHistory(state.history)) {
    const k = keyFor(state.routines, exercise, s);
    const secs = k ? s.timeLog[k] : null;
    if (secs != null && secs > 0) out.push({ date: s.date, secs, km: s.distanceLog[k] ?? null });
  }
  return out.sort((a, b) => a.date - b.date);
}

/** "up" | "flat" | "down": compara las dos últimas cargas registradas con el id exacto del ejercicio. */
export function weightTrend(state, exercise) {
  const weights = completedHistory(state.history)
    .filter((s) => s.weightLog[exercise.id] != null)
    .sort((a, b) => a.date - b.date)
    .map((s) => s.weightLog[exercise.id]);
  if (weights.length < 2) return "flat";
  const diff = weights[weights.length - 1] - weights[weights.length - 2];
  if (diff > 0.01) return "up";
  if (diff < -0.01) return "down";
  return "flat";
}

// ---- Sesión activa

export const completedSetIndices = (state, exercise) => new Set(state.activeSession?.completedSetsLog?.[exercise.id] ?? []);
export const isExerciseCompleted = (state, exercise) => state.activeSession?.completedExerciseIDs.includes(exercise.id) ?? false;

export function totalSetsOf(routine) {
  return allExercises(routine).reduce((n, e) => n + e.sets, 0);
}

export function doneSetsOf(state, routine) {
  return allExercises(routine).reduce((n, e) => n + completedSetIndices(state, e).size, 0);
}

/** Primer ejercicio con series pendientes. */
export function nextActiveExercise(state, routine) {
  if (!state.activeSession) return null;
  return allExercises(routine).find((e) => completedSetIndices(state, e).size < e.sets) ?? null;
}

// ---- Resumen al finalizar

/** Resumen de una sesión recién terminada. `state.history` NO debe incluirla todavía (o se excluye por id). */
export function buildSummary(state, session) {
  const routine = findRoutine(state.routines, session);
  const exercises = allExercises(routine);
  const totalSets = Object.values(session.completedSetsLog).reduce((n, a) => n + a.length, 0);

  let heaviest = null;
  for (const ex of exercises) {
    const type = session.setTypeLog[ex.id] ?? "weightReps";
    const kg = session.weightLog[ex.id];
    if (type === "time" || kg == null) continue;
    if (!heaviest || kg > heaviest.kg) heaviest = { name: ex.name, kg };
  }

  const prior = completedHistory(state.history).filter((s) => s.id !== session.id);
  const priorValues = (ex, pick) => prior.map((s) => { const k = keyFor(state.routines, ex, s); return k ? pick(s, k) : null; }).filter((v) => v != null);
  const max = (arr) => (arr.length ? Math.max(...arr) : 0);

  const newPRs = [];
  for (const ex of exercises) {
    const type = session.setTypeLog[ex.id] ?? "weightReps";
    if (type === "weightReps") {
      const kg = session.weightLog[ex.id];
      if (kg == null) continue;
      if (kg > max(priorValues(ex, (s, k) => s.weightLog[k])) + 0.01) newPRs.push({ name: ex.name, kg });
    } else if (type === "reps") {
      const reps = session.repsLog[ex.id];
      if (reps == null) continue;
      const sets = session.completedSetsLog[ex.id]?.length ?? 0;
      const prevReps = max(priorValues(ex, (s, k) => s.repsLog[k]));
      const prevSets = max(priorValues(ex, (s, k) => s.completedSetsLog[k]?.length));
      if (reps > prevReps || sets > prevSets) newPRs.push({ name: `${ex.name} · ${reps} REPS`, kg: reps });
    } else {
      const t = session.timeLog[ex.id];
      if (t == null) continue;
      if (t > max(priorValues(ex, (s, k) => s.timeLog[k])) + 0.1) newPRs.push({ name: ex.name, kg: t });
    }
  }

  return {
    dayNumber: session.dayNumber,
    variant: session.variant,
    sessionDate: session.date,
    muscleGroupNames: routine ? routine.muscleGroups.map((g) => g.name) : [],
    durationMinutes: durationMinutes(session),
    totalSets,
    completedExercises: session.completedExerciseIDs.length,
    heaviest,
    newPRs,
    routineName: routine ? routineName(routine) : DAY_NAMES[session.dayNumber] || `Día ${session.dayNumber}`,
  };
}

/** Desde el inicio hasta la última serie registrada (o hasta el fin si no hubo). */
export function durationMinutes(session) {
  const end = session.lastSetAt ?? session.date;
  const secs = (end - session.startedAt) / 1000;
  return secs > 0 ? Math.floor(secs / 60) : 0;
}

// ---- Rachas y estadísticas

const daySet = (history) => new Set(completedHistory(history).map((s) => startOfDay(s.date)));

export function currentStreak(history, now = Date.now()) {
  const days = daySet(history);
  const today = startOfDay(now);
  let check = days.has(today) ? today : addDays(today, -1);
  if (!days.has(check)) return 0;
  let n = 0;
  while (days.has(check)) { n++; check = addDays(check, -1); }
  return n;
}

export function bestStreak(history) {
  const days = [...daySet(history)].sort((a, b) => a - b);
  if (!days.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < days.length; i++) {
    if (Math.round((days[i] - days[i - 1]) / 86_400_000) === 1) { cur++; best = Math.max(best, cur); } else cur = 1;
  }
  return best;
}

export const totalSessions = (history) => completedHistory(history).length;
export const totalExercisesCompleted = (history) => completedHistory(history).reduce((n, s) => n + s.completedExerciseIDs.length, 0);
export const currentWeekSessions = (history, now = Date.now()) => completedHistory(history).filter((s) => sameWeek(s.date, now)).length;
export const currentMonthDays = (history, now = Date.now()) => new Set(completedHistory(history).filter((s) => sameMonth(s.date, now)).map((s) => startOfDay(s.date))).size;

export function badges(history, now = Date.now()) {
  const total = totalSessions(history);
  const streak = currentStreak(history, now);
  const best = bestStreak(history);
  const heavy = history.some((s) => Object.values(s.weightLog).some((kg) => kg > 80));
  return [
    { id: "first", name: "Primera vez", icon: "run", unlocked: total >= 1 },
    { id: "week", name: "5 días seguidos", icon: "flame", unlocked: streak >= 5 || best >= 5 },
    { id: "consistent", name: "10 sesiones", icon: "seal", unlocked: total >= 10 },
    { id: "streak30", name: "Racha 30 días", icon: "bolt", unlocked: streak >= 30 || best >= 30 },
    { id: "heavy", name: "+80 kg", icon: "dumbbell", unlocked: heavy },
    { id: "century", name: "100 sesiones", icon: "star", unlocked: total >= 100 },
  ];
}

/** Últimos 28 días (el último es hoy): series completadas por día y nivel de intensidad 0-3. */
export function heatmap(history, now = Date.now(), days = 28) {
  const today = startOfDay(now);
  const sets = new Map();
  for (const s of completedHistory(history)) {
    const d = startOfDay(s.date);
    const n = Object.values(s.completedSetsLog).reduce((acc, a) => acc + a.length, 0);
    sets.set(d, (sets.get(d) ?? 0) + n);
  }
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    cells.push({ date, sets: sets.get(date) ?? 0, isToday: i === 0 });
  }
  const peak = Math.max(0, ...cells.map((c) => c.sets));
  for (const c of cells) c.level = c.sets === 0 || peak === 0 ? 0 : Math.max(1, Math.ceil((3 * c.sets) / peak));
  return cells;
}

/** Barras del encabezado: ejercicios completados en las últimas 7 sesiones (la más vieja primero). */
export const miniBars = (history) => history.slice().sort(byDateDesc).slice(0, 7).reverse().map((s) => s.completedExerciseIDs.length);

/** Sesiones agrupadas por mes (la más reciente primero): [{label, sessions}]. */
export function groupSessionsByMonth(history, now = Date.now()) {
  const currentYear = new Date(now).getFullYear();
  const buckets = [];
  for (const s of history.slice().sort(byDateDesc)) {
    const d = new Date(s.date);
    const y = d.getFullYear(), m = d.getMonth();
    let b = buckets.find((x) => x.year === y && x.month === m);
    if (!b) { b = { year: y, month: m, sessions: [] }; buckets.push(b); }
    b.sessions.push(s);
  }
  return buckets.map((b) => ({
    label: (b.year === currentYear ? MESES[b.month] : `${MESES[b.month]} ${b.year}`).toUpperCase(),
    sessions: b.sessions,
  }));
}

/** Ejercicios de las rutinas agrupados por músculo, sin repetir nombres, filtrados por búsqueda. */
export function groupedExercises(routines, query = "") {
  const q = query.trim().toLowerCase();
  const seen = new Set();
  const groups = [];
  for (const routine of routines) {
    for (const group of routine.muscleGroups) {
      for (const ex of group.exercises) {
        const key = ex.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        if (q && !key.includes(q)) continue;
        let g = groups.find((x) => x.name === group.name);
        if (!g) { g = { name: group.name, exercises: [] }; groups.push(g); }
        g.exercises.push(ex);
      }
    }
  }
  return groups;
}

/** Sesiones terminadas por semana (lunes a domingo): las últimas `weeks`, la más vieja primero. */
export function weeklySessions(history, weeks = 8, now = Date.now()) {
  const thisWeek = startOfWeek(now);
  const counts = new Map();
  for (const s of completedHistory(history)) {
    const w = startOfWeek(s.date);
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisWeek, -7 * (weeks - 1 - i));
    return { start, count: counts.get(start) ?? 0, isCurrent: i === weeks - 1 };
  });
}

/** Mejor carga de cada ejercicio con peso (sin cardio ni tiempo): [{id, name, kg, date}] de mayor a menor. */
export function personalRecords(state, limit = 8) {
  const best = new Map();
  for (const s of completedHistory(state.history)) {
    const routine = findRoutine(state.routines, s);
    for (const ex of allExercises(routine)) {
      const kg = s.weightLog[ex.id];
      if (kg == null || kg <= 0 || (s.setTypeLog[ex.id] ?? setTypeFor({ activeSession: null }, ex)) === "time") continue;
      const key = ex.name.toLowerCase();
      const cur = best.get(key);
      if (!cur || kg > cur.kg || (kg === cur.kg && s.date < cur.date)) best.set(key, { id: ex.id, name: ex.name, kg, date: s.date });
    }
  }
  return [...best.values()].sort((a, b) => b.kg - a.kg || a.name.localeCompare(b.name)).slice(0, limit);
}

const GROUP_ORDER = ["CARDIO", "ABS", "PECHO", "ESPALDA", "HOMBROS", "BÍCEPS", "TRÍCEPS", "PIERNAS"];
const groupRank = (g) => { const i = GROUP_ORDER.indexOf(g); return i < 0 ? GROUP_ORDER.length : i; };

/**
 * Los ejercicios que más hacés, para armar una rutina: primero el más frecuente de cada grupo muscular (para cubrir todo)
 * y después los más frecuentes que sobren (hasta `perGroup` por grupo). Se cuenta en cuántos días distintos lo hiciste.
 * Devuelve [{name, group, uses, last, lastKg, sets, reps, description, templateID}] en el orden de los grupos.
 */
export function favoriteExercises(state, { max = 10, perGroup = 2, minUses = 2 } = {}) {
  const stats = new Map();
  for (const s of completedHistory(state.history)) {
    const routine = findRoutine(state.routines, s);
    if (!routine) continue;
    for (const group of routine.muscleGroups) {
      for (const ex of group.exercises) {
        if (!s.completedSetsLog[ex.id]?.length) continue;
        const key = ex.name.toLowerCase();
        const e = stats.get(key) ?? { name: ex.name, group: group.name.toUpperCase(), days: new Set(), last: 0, lastKg: null, sets: ex.sets, reps: ex.reps, description: ex.description, templateID: ex.templateID ?? null };
        e.days.add(startOfDay(s.date));
        if (s.date >= e.last) { e.last = s.date; e.group = group.name.toUpperCase(); e.sets = ex.sets; e.reps = ex.reps; const kg = s.weightLog[ex.id]; e.lastKg = kg > 0 ? kg : null; }
        stats.set(key, e);
      }
    }
  }
  const ranked = [...stats.values()].map((e) => ({ ...e, uses: e.days.size })).filter((e) => e.uses >= minUses).sort((a, b) => b.uses - a.uses || b.last - a.last);
  const picked = [];
  const perGroupCount = new Map();
  const take = (e) => { picked.push(e); perGroupCount.set(e.group, (perGroupCount.get(e.group) ?? 0) + 1); };
  for (const e of ranked) if (!perGroupCount.has(e.group) && picked.length < max) take(e);                                          // uno por grupo
  for (const e of ranked) if (!picked.includes(e) && picked.length < max && (perGroupCount.get(e.group) ?? 0) < perGroup) take(e);   // y los más usados que sobren
  return picked.map(({ days, ...e }) => e).sort((a, b) => groupRank(a.group) - groupRank(b.group) || b.uses - a.uses);
}

/** Días desde la última sesión terminada (null si no hay ninguna). */
export function daysSinceLastSession(history, now = Date.now()) {
  const done = completedHistory(history);
  if (!done.length) return null;
  return Math.round((startOfDay(now) - startOfDay(Math.max(...done.map((s) => s.date)))) / 86_400_000);
}

export const BAR_KG = 20;
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Discos de cada lado para una barra con `total` kg (barra olímpica de 20 kg): { plates, leftover } o null si no pasa de la barra. */
export function platesPerSide(total, bar = BAR_KG) {
  let rest = (total - bar) / 2;
  if (!(rest > 0)) return null;
  const plates = [];
  for (const p of PLATES) while (rest + 1e-9 >= p) { plates.push(p); rest -= p; }
  return { plates, leftover: Math.round(rest * 100) / 100 };
}

/** Valor por defecto de reps al abrir el registro de una serie. */
export const defaultReps = (reps) => firstInt(reps, 10);
