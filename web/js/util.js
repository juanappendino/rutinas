// Utilidades compartidas: DOM, fechas, formato y almacenamiento local.

export const $ = (id) => document.getElementById(id);

// localStorage puede no estar disponible (modo privado, bloqueado): siempre con try/catch. `set` dice si pudo guardar.
export const storage = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* idem */ } },
};

/** Crea un elemento solo con textContent (nunca innerHTML). `class` acepta string; `on*` registra listeners. */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** Elemento SVG (los atributos van por setAttribute: el CSP no permite style="" inline). */
export function svg(tag, props = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.setAttribute("class", v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, String(v));
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

export const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : fallbackUUID()).toUpperCase();

function fallbackUUID() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const x = [...b].map((n) => n.toString(16).padStart(2, "0")).join("");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

// ---- Fechas (todas en hora local; las sesiones guardan milisegundos desde epoch)

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const DIAS_CORTO = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const addDays = (ms, n) => { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); };
/** Días de calendario entre dos instantes (positivo si `b` es posterior). */
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86_400_000);

/** Lunes de la semana de `ms` a las 00:00. */
export function startOfWeek(ms) {
  const d = new Date(startOfDay(ms));
  const dow = (d.getDay() + 6) % 7;   // lunes = 0
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

export const sameMonth = (a, b) => { const x = new Date(a), y = new Date(b); return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth(); };
export const sameWeek = (a, b) => startOfWeek(a) === startOfWeek(b);

/** "VIE · 23 OCT" */
export function weekdayLabel(ms) {
  const d = new Date(ms);
  return `${DIAS_CORTO[d.getDay()]} · ${d.getDate()} ${MESES_CORTO[d.getMonth()]}`.toUpperCase();
}

/** "20 OCT" */
export function dayMonthLabel(ms) {
  const d = new Date(ms);
  return `${d.getDate()} ${MESES_CORTO[d.getMonth()]}`.toUpperCase();
}

/** "VIE 20 OCT" */
export function longDayLabel(ms) {
  const d = new Date(ms);
  return `${DIAS_CORTO[d.getDay()]} ${d.getDate()} ${MESES_CORTO[d.getMonth()]}`.toUpperCase();
}

// ---- Formato

/** m:ss */
export function mmss(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
/** Entero si no tiene decimales; si no, un decimal ("7" / "7.5"). */
export const trim1 = (n) => (Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : fmt1(n));
export const pad2 = (n) => String(n).padStart(2, "0");

/** Primer número entero de un texto ("15 c/lado" → 15). */
export function firstInt(s, fallback = 10) {
  const m = /\d+/.exec(String(s ?? ""));
  return m ? parseInt(m[0], 10) : fallback;
}

export function download(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h("a", { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Vibración corta si el dispositivo la soporta (Android; iOS Safari la ignora). */
export function haptic(kind = "light") {
  const pattern = { light: 8, medium: 16, heavy: 28, success: [14, 40, 22] }[kind] ?? 8;
  try { navigator.vibrate?.(pattern); } catch { /* sin vibración */ }
}
