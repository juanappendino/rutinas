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
    restAt: 0,                                               // cuándo se cambió restDuration (para sincronizar)
    orderAt: 0,                                              // cuándo se reordenaron las rutinas (para sincronizar)
    flags: {},                                               // avisos y automatismos que ya se hicieron en este dispositivo
    bajas: { routines: {}, sessions: {}, templates: {} },   // lápidas {id: t} de lo borrado (para sincronizar)
  };
}

// ---- Construcción de datos por defecto

export function materializeRoutine(def) {
  return {
    id: uuid(),
    t: 0,   // última edición (ms); 0 = tal como vino de la plantilla
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
  id: uuid(), t: t.t ?? 0, name: t.name, defaultSets: t.defaultSets ?? 3, defaultReps: t.defaultReps ?? "12", description: t.description ?? "", muscleTag: t.muscleTag ?? "",
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
  state.bajas = { routines: {}, sessions: {}, templates: {}, ...(state.bajas ?? {}) };
  state.flags ??= {};
  for (const r of state.routines) r.t ??= 0;
  for (const t of state.exerciseCatalog) t.t ??= 0;
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
  const now = Date.now();
  state = { ...emptyState(), ...next };
  // Lo que se importa gana sobre cualquier copia sincronizada, y lo que ya no está se da de baja para que no vuelva.
  state.bajas = { routines: { ...previous.bajas?.routines }, sessions: { ...previous.bajas?.sessions }, templates: { ...previous.bajas?.templates } };
  for (const r of state.routines) r.t = now;
  const keep = { routines: new Set(state.routines.map((r) => r.id)), sessions: new Set(state.history.map((x) => x.id)) };
  for (const r of previous.routines) if (!keep.routines.has(r.id)) state.bajas.routines[r.id] = now;
  for (const x of previous.history) if (!keep.sessions.has(x.id)) state.bajas.sessions[x.id] = now;
  state.restAt = now;
  normalize();
  scheduleSave();
  for (const fn of listeners) fn(state);
  return previous;
}

/** ¿Es una instalación sin uso (plantilla sin tocar y sin sesiones)? Entonces conviene adoptar los datos de la nube en vez de unirlos. */
export const isPristine = () => state.history.length === 0 && state.routines.every((r) => !r.t) && !state.activeSession;

/** Aplica datos que llegaron de la sincronización (no cuenta como un cambio local). */
export function applyRemote(patch) {
  const a = state.activeSession;
  const routines = [...(patch.routines ?? state.routines)];
  // Si otro dispositivo borró la rutina de una sesión en curso, se conserva hasta que termine
  if (a && !routines.some((r) => r.dayNumber === a.dayNumber && r.variant === a.variant)) {
    const mine = state.routines.find((r) => r.dayNumber === a.dayNumber && r.variant === a.variant);
    if (mine) routines.push(mine);
  }
  state = { ...state, ...patch, routines };
  normalize();
  scheduleSave();
  for (const fn of listeners) fn(state);
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

/** Corrige una sesión ya terminada (por ejemplo el peso o las repeticiones de un ejercicio). */
export function updateSession(id, mutator) {
  commit((s) => {
    const x = s.history.find((h) => h.id === id);
    if (!x) return;
    mutator(x);
    x.t = Date.now();
  });
}

export function deleteSession(id) {
  commit((s) => { s.history = s.history.filter((x) => x.id !== id); s.bajas.sessions[id] = Date.now(); });
}

// ---- Rutinas

export function updateRoutine(routine) {
  commit((s) => {
    const i = s.routines.findIndex((r) => r.id === routine.id);
    if (i >= 0) s.routines[i] = { ...routine, t: Date.now() };
  });
}

export function toggleArchive(routine) {
  commit((s) => { const r = s.routines.find((x) => x.id === routine.id); if (r) { r.isArchived = !r.isArchived; r.t = Date.now(); } });
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
    s.orderAt = Date.now();
  });
}

export function addRoutine(routine) {
  commit((s) => {
    const maxDay = Math.max(0, ...s.routines.map((r) => r.dayNumber));
    s.routines.push({ ...routine, dayNumber: maxDay + 1, isArchived: false, t: Date.now() });
  });
}

export function deleteRoutine(routine) {
  commit((s) => {
    s.routines = s.routines.filter((r) => r.id !== routine.id);
    s.bajas.routines[routine.id] = Date.now();
    if (s.manualOverrideID === routine.id) s.manualOverrideID = null;
  });
}

/** Flujo "armar mi rutina" del onboarding: descarta la plantilla y arranca con una sola. */
export function clearDefaultsAndAdd(routine) {
  commit((s) => {
    const now = Date.now();
    for (const r of s.routines) s.bajas.routines[r.id] = now;
    s.routines = [{ ...routine, dayNumber: 1, isArchived: false, t: now }];
  });
}

export function finishOnboarding() {
  commit((s) => { s.hasOnboarded = true; });
}

export function setRestDuration(seconds) {
  commit((s) => { s.restDuration = seconds; s.restAt = Date.now(); });
}

// ---- Catálogo

export function addExerciseTemplate(t) {
  commit((s) => { s.exerciseCatalog.push({ ...t, t: Date.now() }); });
}

export function setFlag(name) {
  commit((s) => { s.flags[name] = Date.now(); });
}

/** Arma una rutina con los ejercicios favoritos (ver favoriteExercises en logic.js), agrupados por músculo en el orden recibido. */
export function routineFromFavorites(name, favorites) {
  const groups = [];
  for (const f of favorites) {
    let g = groups.find((x) => x.name === f.group);
    if (!g) { g = { id: uuid(), name: f.group, exercises: [] }; groups.push(g); }
    g.exercises.push(makeExercise({ name: f.name, sets: f.sets, reps: f.reps, description: f.description, templateID: f.templateID }));
  }
  return { id: uuid(), t: 0, dayNumber: 0, variant: "", name: name.trim(), isArchived: false, muscleGroups: groups };
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
