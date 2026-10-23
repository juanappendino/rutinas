// Estado de la app y sus acciones (port de WorkoutManager.swift). Todo vive en localStorage.
// Modelo (igual al de la app iOS): rutinas → grupos musculares → ejercicios; sesiones con logs por id de ejercicio.
import { DEFAULT_ROUTINES, EXERCISE_LIBRARY } from "./defaults.js";
import {
  activeRoutines, allExercises, buildSummary, completedSetIndices, findRoutine, nextWorkout, todayRoutine,
} from "./logic.js";
import { firstInt, storage, uuid } from "./util.js";

const KEY = "rutinas:v1";
export const VERSION = 1;

/** @type {ReturnType<typeof emptyState>} */
export let state = emptyState();
const listeners = new Set();
let saveTimer = null;

function emptyState() {
  return {
    version: VERSION,
    routines: [],
    history: [],
    activeSession: null,
    exerciseCatalog: [],
    muscleGroupTemplates: [],
    manualOverrideID: null,
    hasOnboarded: false,
    restDuration: 45,
  };
}

// ---- Construcción de datos por defecto

export function materializeRoutine(def) {
  return {
    id: uuid(),
    dayNumber: def.dayNumber,
    variant: def.variant ?? "",
    name: def.name ?? "",
    isArchived: false,
    muscleGroups: def.muscleGroups.map((g) => ({
      id: uuid(),
      name: g.name,
      exercises: g.exercises.map((e) => ({ id: uuid(), name: e.name, sets: e.sets, reps: e.reps, description: e.description ?? "", templateID: null })),
    })),
  };
}

export const defaultRoutines = () => DEFAULT_ROUTINES.map(materializeRoutine);
export const makeTemplate = (t) => ({
  id: uuid(), name: t.name, defaultSets: t.defaultSets ?? 3, defaultReps: t.defaultReps ?? "12", description: t.description ?? "", muscleTag: t.muscleTag ?? "",
});
export const makeExercise = ({ name, sets, reps, description = "", templateID = null }) => ({ id: uuid(), name, sets, reps, description, templateID });
export const templateToExercise = (t) => makeExercise({ name: t.name, sets: t.defaultSets, reps: t.defaultReps, description: t.description, templateID: t.id });

// ---- Persistencia

export function load() {
  const raw = storage.get(KEY);
  let loaded = null;
  if (raw) { try { loaded = JSON.parse(raw); } catch { loaded = null; } }
  state = { ...emptyState(), ...(loaded && typeof loaded === "object" ? loaded : {}) };
  normalize();
  return Boolean(loaded);
}

/** Completa lo que falte (catálogo, rutinas por defecto, descripciones) igual que el arranque de la app iOS. */
export function normalize() {
  deduplicateCatalog();
  const existing = new Set(state.exerciseCatalog.map((t) => t.name.toLowerCase()));
  const missing = EXERCISE_LIBRARY.filter((t) => !existing.has(t.name.toLowerCase())).map(makeTemplate);
  if (missing.length) state.exerciseCatalog.push(...missing);
  if (!state.routines.length) state.routines = defaultRoutines();
  else migrateDescriptions();
  if (state.activeSession && !state.routines.some((r) => r.dayNumber === state.activeSession.dayNumber && r.variant === state.activeSession.variant)) {
    state.activeSession = null;   // la rutina de una sesión en curso ya no existe
  }
}

function migrateDescriptions() {
  const lookup = new Map();
  for (const r of DEFAULT_ROUTINES) for (const g of r.muscleGroups) for (const e of g.exercises) if (e.description) lookup.set(e.name, e.description);
  for (const r of state.routines) for (const g of r.muscleGroups) for (const e of g.exercises) {
    if (!e.description && lookup.has(e.name)) e.description = lookup.get(e.name);
  }
}

function deduplicateCatalog() {
  const seen = new Map();
  const deduped = [];
  for (const t of state.exerciseCatalog) {
    const k = t.name.toLowerCase();
    if (!seen.has(k)) { seen.set(k, t); deduped.push(t); }
  }
  if (deduped.length === state.exerciseCatalog.length) return;
  state.exerciseCatalog = deduped;
  for (const r of state.routines) for (const g of r.muscleGroups) for (const e of g.exercises) {
    const t = seen.get(e.name.toLowerCase());
    if (t) e.templateID = t.id;
  }
}

export function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  storage.set(KEY, JSON.stringify(state));
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(saveNow, 120);
}

/** Aplica un cambio, lo guarda y avisa a la interfaz. */
export function commit(mutator) {
  mutator(state);
  scheduleSave();
  for (const fn of listeners) fn(state);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Reemplaza todo el estado (importación). Devuelve el estado anterior para poder deshacer. */
export function replaceState(next) {
  const previous = JSON.parse(JSON.stringify(state));
  state = { ...emptyState(), ...next };
  normalize();
  scheduleSave();
  for (const fn of listeners) fn(state);
  return previous;
}

export function resetAll() {
  state = emptyState();
  normalize();
  saveNow();
  for (const fn of listeners) fn(state);
}

if (typeof window !== "undefined") {
  const flush = () => { if (saveTimer) saveNow(); };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
}

// ---- Acciones de sesión

export function newSession(routine) {
  const now = Date.now();
  return {
    id: uuid(), date: now, startedAt: now, dayNumber: routine.dayNumber, variant: routine.variant,
    completedExerciseIDs: [], weightLog: {}, completedSetsLog: {}, isCompleted: false,
    setTypeLog: {}, repsLog: {}, timeLog: {}, distanceLog: {}, lastSetAt: null,
  };
}

export function startWorkout() {
  commit((s) => {
    s.activeSession = newSession(nextWorkout(s));
    s.manualOverrideID = null;
  });
}

export function overrideNextRoutine(routine) {
  commit((s) => { s.manualOverrideID = routine.id; });
}

/** Registra una serie (equivale a logSet de la app). `weight/reps/time/distance` pueden ser null. */
export function logSet(index, exercise, { type, weight = null, reps = null, time = null, distance = null }) {
  commit((s) => {
    const a = s.activeSession;
    if (!a) return;
    const key = exercise.id;
    if (weight != null) a.weightLog[key] = weight;
    a.setTypeLog[key] = type;
    if (reps != null) a.repsLog[key] = reps;
    else if (a.repsLog[key] == null) a.repsLog[key] = firstInt(exercise.reps, 10);
    if (time != null) a.timeLog[key] = time;
    if (distance != null) a.distanceLog[key] = distance;
    a.lastSetAt = Date.now();
    const indices = new Set(a.completedSetsLog[key] ?? []);
    indices.add(index);
    if (indices.size === exercise.sets && !a.completedExerciseIDs.includes(exercise.id)) a.completedExerciseIDs.push(exercise.id);
    a.completedSetsLog[key] = [...indices].sort((x, y) => x - y);
  });
}

/** Marca o desmarca una serie sin pedir datos (hereda los de la anterior). */
export function toggleSet(index, exercise) {
  commit((s) => {
    const a = s.activeSession;
    if (!a) return;
    const key = exercise.id;
    const indices = new Set(a.completedSetsLog[key] ?? []);
    if (indices.has(index)) {
      indices.delete(index);
      a.completedExerciseIDs = a.completedExerciseIDs.filter((id) => id !== exercise.id);
    } else {
      indices.add(index);
      a.lastSetAt = Date.now();
      if (indices.size === exercise.sets && !a.completedExerciseIDs.includes(exercise.id)) a.completedExerciseIDs.push(exercise.id);
    }
    a.completedSetsLog[key] = [...indices].sort((x, y) => x - y);
  });
}

/** Cierra la sesión, la agrega al historial y devuelve el resumen. */
export function finishWorkout() {
  const a = state.activeSession;
  if (!a) return null;
  const finished = { ...a, isCompleted: true, date: Date.now() };
  const summary = buildSummary(state, finished);
  commit((s) => {
    s.history.unshift(finished);
    s.activeSession = null;
  });
  return summary;
}

export function cancelWorkout() {
  commit((s) => { s.activeSession = null; });
}

export function deleteSession(id) {
  commit((s) => { s.history = s.history.filter((x) => x.id !== id); });
}

// ---- Rutinas

export function updateRoutine(routine) {
  commit((s) => {
    const i = s.routines.findIndex((r) => r.id === routine.id);
    if (i >= 0) s.routines[i] = routine;
  });
}

export function toggleArchive(routine) {
  commit((s) => { const r = s.routines.find((x) => x.id === routine.id); if (r) r.isArchived = !r.isArchived; });
}

export function reorderActiveRoutines(ids) {
  commit((s) => {
    const archived = s.routines.filter((r) => r.isArchived);
    const active = s.routines.filter((r) => !r.isArchived);
    active.sort((a, b) => {
      const ai = ids.indexOf(a.id), bi = ids.indexOf(b.id);
      return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi);
    });
    s.routines = [...active, ...archived];
  });
}

export function addRoutine(routine) {
  commit((s) => {
    const maxDay = Math.max(0, ...s.routines.map((r) => r.dayNumber));
    s.routines.push({ ...routine, dayNumber: maxDay + 1, isArchived: false });
  });
}

export function deleteRoutine(routine) {
  commit((s) => {
    s.routines = s.routines.filter((r) => r.id !== routine.id);
    if (s.manualOverrideID === routine.id) s.manualOverrideID = null;
  });
}

/** Flujo "armar mi rutina" del onboarding: descarta la plantilla y arranca con una sola. */
export function clearDefaultsAndAdd(routine) {
  commit((s) => { s.routines = [{ ...routine, dayNumber: 1, isArchived: false }]; });
}

export function finishOnboarding() {
  commit((s) => { s.hasOnboarded = true; });
}

export function setRestDuration(seconds) {
  commit((s) => { s.restDuration = seconds; });
}

// ---- Catálogo

export function addExerciseTemplate(t) {
  commit((s) => { s.exerciseCatalog.push(t); });
}

/** Arma una rutina a partir de ejercicios del catálogo, agrupados por músculo (orden alfabético, como la app). */
export function routineFromTemplates(name, templates) {
  const byTag = new Map();
  for (const t of templates) {
    const tag = (t.muscleTag || "GENERAL").toUpperCase();
    if (!byTag.has(tag)) byTag.set(tag, []);
    byTag.get(tag).push(t);
  }
  const groups = [...byTag.keys()].sort().map((tag) => ({ id: uuid(), name: tag, exercises: byTag.get(tag).map(templateToExercise) }));
  return { id: uuid(), dayNumber: 0, variant: "", name: name.trim(), isArchived: false, muscleGroups: groups };
}

// ---- Selectores cómodos para las vistas

export const selectors = {
  today: () => todayRoutine(state),
  next: () => nextWorkout(state),
  active: () => activeRoutines(state.routines),
  doneSets: (exercise) => completedSetIndices(state, exercise).size,
  routineOf: (session) => findRoutine(state.routines, session),
  exercisesOf: (routine) => allExercises(routine),
};
