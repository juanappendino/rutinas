// Copia de seguridad: exportar/importar todos los datos (JSON) y el historial en CSV.
// El JSON usa los mismos campos que los modelos Codable de la app iOS (ver BackupExport.swift), con fechas ISO 8601.
import { firstInt, uuid } from "./util.js";
import { allExercises, completedHistory, findRoutine } from "./logic.js";

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

function normalizeRoutine(r) {
  return {
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

function normalizeSession(s) {
  const date = parseDate(s?.date, Date.now());
  return {
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

function normalizeTemplate(t) {
  return {
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
        lines.push([ymd(session.date), `Día ${session.dayNumber}${session.variant}`, group.name, ex.name.replaceAll(",", ";"), sets, reps, kg, time].join(","));
      }
    }
  }
  return lines.join("\n");
}

/**
 * Convierte filas de un CSV exportado por la app en sesiones, usando las rutinas actuales para ubicar cada ejercicio por nombre.
 * Devuelve { sessions, skipped }: `skipped` son filas cuyo ejercicio o rutina no se encontró.
 */
export function parseCSV(text, routines) {
  const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!rows.length || !rows[0].toLowerCase().startsWith("fecha,rutina")) throw new BackupError("El archivo no parece un historial CSV de Rutinas.");
  const buckets = new Map();
  let skipped = 0;
  for (const line of rows.slice(1)) {
    const [fecha, rutina, , ...rest] = line.split(",");
    if (rest.length < 5) { skipped++; continue; }
    const [nombre, series, reps, kg, tiempo] = rest.slice(-5);
    const [y, m, d] = (fecha || "").split("-").map(Number);
    const mm = /^Día (\d+)(.*)$/.exec(rutina || "");
    if (!y || !m || !d || !mm) { skipped++; continue; }
    const routine = routines.find((r) => r.dayNumber === Number(mm[1]) && r.variant === mm[2]);
    const ex = routine && allExercises(routine).find((e) => e.name.replaceAll(",", ";").toLowerCase() === nombre.toLowerCase());
    if (!ex) { skipped++; continue; }
    const key = `${fecha}|${rutina}`;
    if (!buckets.has(key)) {
      const date = new Date(y, m - 1, d, 12, 0, 0).getTime();
      buckets.set(key, {
        id: uuid(), date, startedAt: date, dayNumber: routine.dayNumber, variant: routine.variant,
        completedExerciseIDs: [], weightLog: {}, completedSetsLog: {}, isCompleted: true,
        setTypeLog: {}, repsLog: {}, timeLog: {}, distanceLog: {}, lastSetAt: null,
      });
    }
    const s = buckets.get(key);
    const n = Math.max(1, firstInt(series, 1));
    s.completedSetsLog[ex.id] = Array.from({ length: n }, (_, i) => i);
    if (n >= ex.sets) s.completedExerciseIDs.push(ex.id);
    if (kg !== "") s.weightLog[ex.id] = Number(kg);
    if (reps !== "") s.repsLog[ex.id] = Math.round(Number(reps));
    if (tiempo !== "") s.timeLog[ex.id] = Number(tiempo);
    s.setTypeLog[ex.id] = tiempo !== "" ? "time" : "weightReps";
  }
  return { sessions: [...buckets.values()].sort((a, b) => b.date - a.date), skipped };
}
