// Combinación de datos entre dispositivos (sin DOM ni estado global: se usa en el navegador y en el Worker, y se testea con node).
// Un "documento" de sincronización es { v, routines, sessions, templates, rest, bajas }:
//   - routines y templates se guardan por id con una marca de tiempo `t`: gana la edición más reciente.
//   - sessions (las sesiones terminadas) no se editan: se unen por id.
//   - bajas: lápidas {id: t} de lo que se borró, para que no "resucite" al sincronizar con otro dispositivo.
import { normalizeRoutine, normalizeSession, normalizeTemplate } from "./backup.js";
import { allExercises, routineName } from "./logic.js";

export const DOC_VERSION = 1;
export const MAX_ROUTINES = 200;
export const MAX_SESSIONS = 20_000;
export const MAX_TEMPLATES = 2_000;
const TOMBSTONE_TTL = 365 * 86_400_000;   // una lápida más vieja que esto se descarta

export const emptyDoc = () => ({
  v: DOC_VERSION, routines: {}, sessions: {}, templates: {}, rest: { v: 45, t: 0 },
  bajas: { routines: {}, sessions: {}, templates: {} },
});

const num = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

/** Lo que llega de afuera (red, almacenamiento) no es confiable: se normaliza y se acota. */
export function sanitizeDoc(raw) {
  const out = emptyDoc();
  if (!isObj(raw)) return out;
  const take = (obj, max, norm, ok) => {
    const res = {};
    if (!isObj(obj)) return res;
    for (const [id, v] of Object.entries(obj).slice(0, max)) {
      if (!id || id.length > 80) continue;
      const n = norm(v);
      if (ok(n)) res[id] = { ...n, id };
    }
    return res;
  };
  out.routines = take(raw.routines, MAX_ROUTINES, normalizeRoutine, (r) => r.muscleGroups.length >= 0);
  out.sessions = take(raw.sessions, MAX_SESSIONS, normalizeSession, () => true);
  out.templates = take(raw.templates, MAX_TEMPLATES, normalizeTemplate, (t) => t.name.length > 0);
  if (isObj(raw.rest) && typeof raw.rest.v === "number" && raw.rest.v >= 5 && raw.rest.v <= 3600) out.rest = { v: Math.round(raw.rest.v), t: num(raw.rest.t) };
  for (const kind of ["routines", "sessions", "templates"]) {
    const src = raw.bajas?.[kind];
    if (!isObj(src)) continue;
    for (const [id, t] of Object.entries(src).slice(0, MAX_SESSIONS)) if (id.length > 0 && id.length <= 80 && num(t) > 0) out.bajas[kind][id] = num(t);
  }
  return out;
}

const norm = (t) => String(t).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
/** Dos rutinas con distinto id pero igual nombre, día y ejercicios son la misma (p. ej. la plantilla sembrada en dos dispositivos). */
const signature = (r) => `${norm(routineName(r))}|${r.dayNumber}|${allExercises(r).map((e) => norm(e.name)).join(",")}`;

/** Une dos documentos. Es idempotente y da el mismo resultado sin importar el orden (salvo empates, que se resuelven por id). */
export function mergeDocs(a, b, now = Date.now()) {
  const out = emptyDoc();

  for (const kind of ["routines", "sessions", "templates"]) {
    const bajas = { ...a.bajas[kind] };
    for (const [id, t] of Object.entries(b.bajas[kind])) bajas[id] = Math.max(bajas[id] ?? 0, t);
    out.bajas[kind] = bajas;
  }

  for (const kind of ["routines", "templates"]) {
    const items = { ...a[kind] };
    for (const [id, item] of Object.entries(b[kind])) {
      const mine = items[id];
      if (!mine || item.t > mine.t) items[id] = item;
    }
    for (const [id, item] of Object.entries(items)) {
      const baja = out.bajas[kind][id];
      if (baja == null) continue;
      if (baja >= item.t) delete items[id];
      else delete out.bajas[kind][id];   // se volvió a editar después de borrarse
    }
    out[kind] = items;
  }

  const sessions = { ...b.sessions, ...a.sessions };
  for (const id of Object.keys(out.bajas.sessions)) delete sessions[id];
  out.sessions = sessions;

  out.rest = b.rest.t > a.rest.t ? b.rest : a.rest;

  dedupeRoutines(out, now);
  fixDayCollisions(out, now);
  for (const kind of Object.keys(out.bajas)) {
    for (const [id, t] of Object.entries(out.bajas[kind])) if (now - t > TOMBSTONE_TTL) delete out.bajas[kind][id];
  }
  return out;
}

const byRecency = (x, y) => y.t - x.t || (x.id < y.id ? -1 : 1);

function dedupeRoutines(doc, now) {
  const seen = new Map();
  for (const r of Object.values(doc.routines).sort(byRecency)) {
    const sig = signature(r);
    if (!seen.has(sig)) { seen.set(sig, r); continue; }
    delete doc.routines[r.id];   // la más vieja sobra: se da de baja para que no vuelva desde el otro dispositivo
    doc.bajas.routines[r.id] = Math.max(now, r.t);
  }
}

/** Dos rutinas distintas con el mismo día (creadas a la vez en dos dispositivos): la más nueva pasa al siguiente número libre. */
function fixDayCollisions(doc, now) {
  const used = new Map();
  let maxDay = Math.max(0, ...Object.values(doc.routines).map((r) => r.dayNumber));
  for (const r of Object.values(doc.routines).sort((x, y) => x.t - y.t || (x.id < y.id ? -1 : 1))) {
    const key = `${r.dayNumber}|${r.variant}`;
    if (!used.has(key)) { used.set(key, r.id); continue; }
    doc.routines[r.id] = { ...r, dayNumber: ++maxDay, t: Math.max(now, r.t) };
  }
}

/** ¿Tienen el mismo contenido? (se ignora el orden de las claves) */
export const sameDoc = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (isObj(v)) return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])]));
  return v;
}
