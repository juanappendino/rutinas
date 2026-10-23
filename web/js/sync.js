// Sincronización entre dispositivos. El servidor (worker/index.js + KV) guarda un "espacio" identificado por un código secreto;
// cada navegador mantiene su copia local (sigue andando sin conexión) y la une con la del espacio con mergeDocs (merge.js).
//   - se sube lo propio unos segundos después de cada cambio y se baja cada ~45 s mientras la pestaña está visible
//   - el código viaja en un link (#espacio=…): quien lo tenga puede ver y editar los datos
import { EXERCISE_LIBRARY } from "./defaults.js";
import { emptyDoc, mergeDocs, sameDoc, sanitizeDoc } from "./merge.js";
import { applyRemote, isPristine, state, subscribe } from "./store.js";
import { completedHistory } from "./logic.js";
import { storage } from "./util.js";

const KEY = "rutinas:espacio";
export const CODE = /^[A-Za-z0-9_-]{22,64}$/;
const POLL_MS = 45_000;
const PUSH_MS = 3_000;
const LIBRARY = new Set(EXERCISE_LIBRARY.map((t) => t.name.toLowerCase()));

let code = (() => { const c = storage.get(KEY); return c && CODE.test(c) ? c : ""; })();
let info = { phase: code ? "pending" : "off", last: null, error: "" };   // off | pending | syncing | ok | error
let dirty = Boolean(code);   // hay cambios propios sin subir (al abrir se sube todo: el servidor une)
let rev = null;
let running = null, again = false, timer = null;
let lastLocal = "";           // foto del documento local tras la última sincronización, para saber si hubo cambios propios
const listeners = new Set();

export const onSyncChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const syncInfo = () => info;
export const hasSpace = () => Boolean(code);
export const inviteLink = () => `${location.origin}${location.pathname}#espacio=${code}`;

/** Acepta el link completo, "#espacio=…" o el código pelado. Devuelve el código o null. */
export function parseCode(text) {
  const m = /espacio=([A-Za-z0-9_-]+)/.exec(text) ?? /^\s*([A-Za-z0-9_-]{22,64})\s*$/.exec(text);
  return m && CODE.test(m[1]) ? m[1] : null;
}

function setInfo(patch) {
  info = { ...info, ...patch };
  for (const fn of listeners) fn(info);
}

// ---- Estado local ⇄ documento

/** Lo que se sincroniza: rutinas, sesiones terminadas, ejercicios propios del catálogo y descanso. La sesión en curso queda en cada dispositivo. */
export function toDoc(s = state) {
  const doc = emptyDoc();
  for (const r of s.routines) doc.routines[r.id] = r;
  for (const x of completedHistory(s.history)) doc.sessions[x.id] = x;
  for (const t of s.exerciseCatalog) if (!LIBRARY.has(t.name.toLowerCase())) doc.templates[t.id] = t;
  doc.rest = { v: s.restDuration, t: s.restAt ?? 0 };
  doc.bajas = structuredClone(s.bajas);
  return doc;
}

function patchFromDoc(doc) {
  // Se conserva el orden local de las rutinas; las nuevas van al final por número de día
  const known = new Set(state.routines.map((r) => r.id));
  const mine = state.routines.filter((r) => doc.routines[r.id]).map((r) => doc.routines[r.id]);
  const added = Object.values(doc.routines).filter((r) => !known.has(r.id)).sort((a, b) => a.dayNumber - b.dayNumber);
  return {
    routines: [...mine, ...added],
    history: Object.values(doc.sessions).sort((a, b) => b.date - a.date),
    exerciseCatalog: [...state.exerciseCatalog.filter((t) => LIBRARY.has(t.name.toLowerCase())), ...Object.values(doc.templates)],
    restDuration: doc.rest.v,
    restAt: doc.rest.t,
    bajas: doc.bajas,
  };
}

const snapshot = () => JSON.stringify(toDoc());

/** Aplica el documento del servidor sobre lo local (sin pisar lo que se editó mientras se esperaba la respuesta). */
function apply(remote, extra = {}, local = toDoc()) {
  const merged = mergeDocs(local, remote);
  applyRemote({ ...patchFromDoc(merged), ...extra });
  lastLocal = snapshot();
  if (!sameDoc(merged, remote)) dirty = true;   // lo local trae algo que el servidor no tiene
}

// ---- Red

async function api(method, body = null, query = "", spaceCode = code) {
  const r = await fetch(`api/e/${spaceCode}${query}`, {
    method, cache: "no-store",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!(r.headers.get("content-type") || "").includes("json")) throw new Error("Este sitio no tiene la sincronización activada (falta publicar el Worker).");
  const data = await r.json();
  if (r.status === 404 && method === "GET") return { missing: true };
  if (!r.ok) throw new Error(data.error || `error ${r.status}`);
  return data;
}

/** Sube lo propio y baja lo ajeno. Seguro de llamar muchas veces: si ya hay una en curso, hace una más al terminar. */
export function syncNow() {
  if (!code) return Promise.resolve();
  if (running) { again = true; return running; }
  running = (async () => {
    try {
      setInfo({ phase: "syncing", error: "" });
      let r;
      if (dirty || rev == null) {
        dirty = false;
        r = await api("PUT", { doc: toDoc() });             // el servidor une y devuelve el resultado
        apply(sanitizeDoc(r.doc));
        if (dirty) again = true;                             // se editó algo mientras tanto
      } else {
        r = await api("GET", null, `?desde=${rev}`);
        if (r.missing) { dirty = true; again = true; }       // el espacio se perdió: se vuelve a crear con lo que hay acá
        else if (!r.igual) {
          const remote = sanitizeDoc(r.doc);
          apply(remote);
          if (dirty) { dirty = false; r = await api("PUT", { doc: toDoc() }); apply(sanitizeDoc(r.doc)); }
        }
      }
      if (r.rev != null) rev = r.rev;
      setInfo({ phase: "ok", last: Date.now() });
    } catch (err) {
      dirty = true;                                         // se reintenta en el próximo ciclo
      setInfo({ phase: "error", error: err.message });
    } finally {
      running = null;
      if (again) { again = false; syncNow(); }
    }
  })();
  return running;
}

export function startSync() {
  lastLocal = snapshot();
  let sessions = completedHistory(state.history).length;
  subscribe(() => {
    if (!code) return;
    const now = snapshot();
    if (now === lastLocal) return;   // p. ej. una serie de la sesión en curso: no se sincroniza
    lastLocal = now;
    dirty = true;
    clearTimeout(timer);
    // Al terminar un entrenamiento se sube al instante; el resto de los cambios esperan unos segundos para agruparse
    const finished = completedHistory(state.history).length;
    const immediate = finished > sessions;
    sessions = finished;
    if (immediate) syncNow(); else timer = setTimeout(syncNow, PUSH_MS);
  });
  setInterval(() => { if (code && !document.hidden) syncNow(); }, POLL_MS);
  // Al salir de la app (o cambiar de pestaña) se sube lo pendiente; al volver se baja lo nuevo
  document.addEventListener("visibilitychange", () => { if (code && (!document.hidden || dirty)) syncNow(); });
  addEventListener("online", () => { if (code) syncNow(); });
  if (code) syncNow();
}

const newCode = () => {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function connect(spaceCode) {
  code = spaceCode; rev = null; dirty = true;
  storage.set(KEY, spaceCode);
  await syncNow();
  if (info.phase === "error") { const msg = info.error; leave(); throw new Error(msg); }
}

export async function createSpace() {
  await connect(newCode());
}

/** Entra a un espacio existente. Si este dispositivo no tiene nada propio, adopta los datos del espacio; si no, se unen. */
export async function joinSpace(spaceCode) {
  const r = await api("GET", null, "", spaceCode);
  if (r.missing) throw new Error("Ese espacio de sincronización no existe (¿el link es viejo?).");
  const remote = sanitizeDoc(r.doc);
  if (isPristine() && Object.keys(remote.routines).length) {
    apply(remote, { hasOnboarded: true }, emptyDoc());   // instalación sin uso: se queda con los datos del espacio, sin mezclar la plantilla
  }
  await connect(spaceCode);
  applyRemote({ hasOnboarded: true });
}

export function leave() {
  code = ""; rev = null; dirty = false;
  clearTimeout(timer);
  storage.del(KEY);
  setInfo({ phase: "off", last: null, error: "" });
}
