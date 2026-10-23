// Copia de seguridad: exportar/importar todos los datos (JSON) y el historial en CSV.
// El JSON usa los mismos campos que los modelos Codable de la app iOS (ver BackupExport.swift), con fechas ISO 8601.
import { firstInt, uuid } from "./util.js";
import { allExercises, completedHistory, findRoutine, routineName } from "./logic.js";

const APP = "rutinas";
const REFERENCE_DATE_SECONDS = 978_307_200;   // 2001-01-01: la fecha de referencia del JSONEncoder de Swift

// ---- Exportar

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");   // sin fracciones: Swift .iso8601 no las acepta

export function toBackup(state, now = Date.now()) {
  return {
    app: APP,
    version: 1,
    exportedAt: iso(now),
    restDuration: state.restDuration,
    routines: state.routines,
    history: state.history.map((s) => ({ ...s, date: iso(s.date), startedAt: iso(s.startedAt), lastSetAt: s.lastSetAt == null ? undefined : iso(s.lastSetAt) })),
    exerciseCatalog: state.exerciseCatalog,
    muscleGroupTemplates: state.muscleGroupTemplates,
  };
}

export const backupFileName = (now = Date.now()) => `rutinas-backup-${new Date(now).toISOString().slice(0, 10)}.json`;

// ---- Importar JSON

export class BackupError extends Error {}

function parseDate(v, fallback = null) {
  if (typeof v === "number" && Number.isFinite(v)) return v < 1e11 ? (v + REFERENCE_DATE_SECONDS) * 1000 : v;   // segundos desde 2001 o milisegundos
  if (typeof v === "string") { const t = Date.parse(v); if (!Number.isNaN(t)) return t; }
  return fallback;
}

const upper = (v) => String(v).toUpperCase();
const asArray = (v) => (Array.isArray(v) ? v : []);
const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const str = (v, d = "") => (typeof v === "string" ? v : d);

function mapKeys(obj, mapValue = (v) => v) {
  const out = {};
  if (obj && typeof obj === "object" && !Array.isArray(obj)) for (const [k, v] of Object.entries(obj)) out[upper(k)] = mapValue(v);
  return out;
}

function normalizeExercise(e) {
  return {
    id: e?.id ? upper(e.id) : uuid(),
    name: str(e?.name, "Ejercicio"),
    sets: Math.max(1, Math.round(num(e?.sets, 3))),
    reps: str(e?.reps, String(e?.reps ?? "12")),
    description: str(e?.description),
    templateID: e?.templateID ? upper(e.templateID) : null,
  };
}

export function normalizeRoutine(r) {
  return {
    t: num(r?.t, 0),
    id: r?.id ? upper(r.id) : uuid(),
    dayNumber: Math.round(num(r?.dayNumber, 1)),
    variant: str(r?.variant),
    name: str(r?.name),
    isArchived: Boolean(r?.isArchived),
    muscleGroups: asArray(r?.muscleGroups).map((g) => ({
      id: g?.id ? upper(g.id) : uuid(),
      name: str(g?.name, "GRUPO"),
      exercises: asArray(g?.exercises).map(normalizeExercise),
    })),
  };
}

export function normalizeSession(s) {
  const date = parseDate(s?.date, Date.now());
  return {
    t: num(s?.t, 0),
    id: s?.id ? upper(s.id) : uuid(),
    date,
    startedAt: parseDate(s?.startedAt, date),
    dayNumber: Math.round(num(s?.dayNumber, 1)),
    variant: str(s?.variant),
    completedExerciseIDs: asArray(s?.completedExerciseIDs).map(upper),
    weightLog: mapKeys(s?.weightLog, (v) => num(v, 0)),
    completedSetsLog: mapKeys(s?.completedSetsLog, (v) => asArray(v).map((n) => Math.round(num(n, 0)))),
    isCompleted: s?.isCompleted !== false,
    setTypeLog: mapKeys(s?.setTypeLog, (v) => str(v, "weightReps")),
    repsLog: mapKeys(s?.repsLog, (v) => Math.round(num(v, 0))),
    timeLog: mapKeys(s?.timeLog, (v) => num(v, 0)),
    distanceLog: mapKeys(s?.distanceLog ?? s?.speedLog, (v) => num(v, 0)),   // speedLog: nombre anterior del campo
    lastSetAt: parseDate(s?.lastSetAt, null),
  };
}

export function normalizeTemplate(t) {
  return {
    t: num(t?.t, 0),
    id: t?.id ? upper(t.id) : uuid(),
    name: str(t?.name, "Ejercicio"),
    defaultSets: Math.max(1, Math.round(num(t?.defaultSets, 3))),
    defaultReps: str(t?.defaultReps, "12"),
    description: str(t?.description),
    muscleTag: str(t?.muscleTag),
  };
}

/** Valida y normaliza una copia JSON. Devuelve el estado a aplicar (sin sesión en curso). */
export function parseBackup(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new BackupError("El archivo no es un JSON válido."); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new BackupError("El archivo no tiene el formato de una copia de Rutinas.");
  if (data.app && data.app !== APP) throw new BackupError("Este archivo no es una copia de Rutinas.");
  if (!Array.isArray(data.routines) && !Array.isArray(data.history)) throw new BackupError("No encontré rutinas ni historial en el archivo.");

  const routines = asArray(data.routines).map(normalizeRoutine);
  const history = asArray(data.history).map(normalizeSession).sort((a, b) => b.date - a.date);
  const out = {
    routines,
    history,
    exerciseCatalog: asArray(data.exerciseCatalog).map(normalizeTemplate),
    muscleGroupTemplates: asArray(data.muscleGroupTemplates).map((g) => ({ id: g?.id ? upper(g.id) : uuid(), name: str(g?.name), exerciseIDs: asArray(g?.exerciseIDs).map(upper) })),
    activeSession: null,
    manualOverrideID: null,
    hasOnboarded: true,
  };
  if (typeof data.restDuration === "number") out.restDuration = data.restDuration;
  return out;
}

export const summarizeBackup = (parsed) => ({
  routines: parsed.routines.length,
  sessions: completedHistory(parsed.history).length,
  exercises: parsed.routines.reduce((n, r) => n + allExercises(r).length, 0),
});

// ---- CSV (mismo formato que el que exporta la app iOS desde Historial)

const CSV_HEADER = "Fecha,Rutina,Grupo,Ejercicio,Series completadas,Reps,Peso (kg),Tiempo (seg)";
const ymd = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function toCSV(state) {
  const lines = [CSV_HEADER];
  for (const session of completedHistory(state.history)) {
    const routine = findRoutine(state.routines, session);
    if (!routine) continue;
    for (const group of routine.muscleGroups) {
      for (const ex of group.exercises) {
        const sets = session.completedSetsLog[ex.id]?.length ?? 0;
        if (sets === 0) continue;
        const reps = session.repsLog[ex.id] ?? "";
        const kg = session.weightLog[ex.id] != null ? session.weightLog[ex.id].toFixed(1) : "";
        const time = session.timeLog[ex.id] != null ? Math.round(session.timeLog[ex.id]) : "";
        lines.push([ymd(session.date), routineName(routine), group.name, ex.name.replaceAll(",", ";"), sets, reps, kg, time].join(","));
      }
    }
  }
  return lines.join("\n");
}

const norm = (t) => String(t).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

/**
 * Convierte filas de un CSV exportado por la app en sesiones. La columna "Rutina" puede traer el nombre ("Ancla") o "Día 3".
 * Cada fila se ubica por rutina y nombre de ejercicio entre las rutinas actuales. Si una rutina del CSV no existe todavía
 * (por ejemplo una propia), se arma a partir de su sesión más reciente. Devuelve { sessions, newRoutines, skipped };
 * `skipped` son filas de ejercicios que ya no están en la rutina.
 */
export function parseCSV(text, routines) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length || !lines[0].toLowerCase().startsWith("fecha,rutina")) throw new BackupError("El archivo no parece un historial CSV de Rutinas.");

  const rows = [];
  let skipped = 0;
  for (const line of lines.slice(1)) {
    const [fecha, rutina, grupo, ...rest] = line.split(",");
    if (rest.length < 5) { skipped++; continue; }
    const [nombre, series, reps, kg, tiempo] = rest.slice(-5);
    const [y, m, d] = (fecha || "").split("-").map(Number);
    if (!y || !m || !d || !rutina) { skipped++; continue; }
    rows.push({ fecha, rutina: rutina.trim(), grupo, nombre, series, reps, kg, tiempo, date: new Date(y, m - 1, d, 12, 0, 0).getTime() });
  }

  const findRoutine = (list, label) => {
    const byName = list.find((r) => norm(routineName(r)) === norm(label));
    if (byName) return byName;
    const mm = /^D[ií]a (\d+)(.*)$/i.exec(label);
    return mm ? list.find((r) => r.dayNumber === Number(mm[1]) && r.variant === mm[2]) : undefined;
  };

  // Rutinas que el CSV nombra y todavía no existen: se arman con las filas de su sesión más reciente
  const all = [...routines];
  const newRoutines = [];
  for (const label of new Set(rows.map((r) => r.rutina))) {
    if (findRoutine(all, label)) continue;
    const mine = rows.filter((r) => r.rutina === label);
    const latest = Math.max(...mine.map((r) => r.date));
    const groups = [];
    for (const r of mine.filter((x) => x.date === latest)) {
      let g = groups.find((x) => x.name === r.grupo);
      if (!g) { g = { id: uuid(), name: r.grupo, exercises: [] }; groups.push(g); }
      const secs = Number(r.tiempo);
      g.exercises.push({
        id: uuid(), name: r.nombre.replaceAll(";", ","), sets: Math.max(1, firstInt(r.series, 3)),
        reps: r.tiempo !== "" && secs > 0 ? `${Math.max(1, Math.round(secs / 60))} min` : String(r.reps || "12"),
        description: "", templateID: null,
      });
    }
    const maxDay = Math.max(0, ...all.map((x) => x.dayNumber));
    const created = { id: uuid(), dayNumber: maxDay + 1, variant: "", name: label, isArchived: false, muscleGroups: groups };
    all.push(created);
    newRoutines.push(created);
  }

  const buckets = new Map();
  for (const r of rows) {
    const routine = findRoutine(all, r.rutina);
    const ex = routine && allExercises(routine).find((e) => norm(e.name) === norm(r.nombre.replaceAll(";", ",")) || e.name.replaceAll(",", ";").toLowerCase() === r.nombre.toLowerCase());
    if (!ex) { skipped++; continue; }
    const key = `${r.fecha}|${routine.id}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        id: uuid(), date: r.date, startedAt: r.date, dayNumber: routine.dayNumber, variant: routine.variant,
        completedExerciseIDs: [], weightLog: {}, completedSetsLog: {}, isCompleted: true,
        setTypeLog: {}, repsLog: {}, timeLog: {}, distanceLog: {}, lastSetAt: null,
      });
    }
    const s = buckets.get(key);
    const n = Math.max(1, firstInt(r.series, 1));
    s.completedSetsLog[ex.id] = Array.from({ length: n }, (_, i) => i);
    if (n >= ex.sets) s.completedExerciseIDs.push(ex.id);
    if (r.kg !== "") s.weightLog[ex.id] = Number(r.kg);
    if (r.reps !== "") s.repsLog[ex.id] = Math.round(Number(r.reps));
    if (r.tiempo !== "") s.timeLog[ex.id] = Number(r.tiempo);
    s.setTypeLog[ex.id] = r.tiempo !== "" && Number(r.tiempo) > 0 ? "time" : "weightReps";
  }
  return { sessions: [...buckets.values()].sort((a, b) => b.date - a.date), newRoutines, skipped };
}
