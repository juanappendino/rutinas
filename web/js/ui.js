// Piezas de interfaz compartidas: encabezados, numeral, anillos, hojas inferiores, diálogos, menús y avisos.
import { $, h, svg, reduceMotion } from "./util.js";
import { icon } from "./icons.js";

export const eyebrow = (text, cls = "") => h("span", { class: `eyebrow ${cls}`.trim(), text: String(text).toUpperCase() });

/** "1A": número grande en mono + letra de variante en naranja. */
export function numeral(dayNumber, variant = "", size = 56) {
  const el = h("span", { class: "numeral" }, h("span", { class: "n", text: String(dayNumber) }));
  el.querySelector(".n").style.fontSize = `${size}px`;
  el.querySelector(".n").style.letterSpacing = `${size * -0.02}px`;
  if (variant) {
    const v = h("span", { class: "variant", text: variant });
    v.style.fontSize = `${size * 0.34}px`;
    el.append(v);
  }
  return el;
}

/** "ABS ———— 0/2" */
export const rule = (label, right = null) => h("div", { class: "rule" },
  h("span", { class: "label", text: label }), h("span", { class: "line" }), right != null ? h("span", { class: "right", text: String(right) }) : null);

export function pageHeader(eyebrowText, title, ...actions) {
  return h("header", { class: "page-header" },
    h("div", {}, eyebrow(eyebrowText), h("h1", { text: title })),
    actions.length ? h("div", { class: "page-actions" }, ...actions) : null);
}

export const iconBtn = (name, label, onclick, cls = "", size = 15) =>
  h("button", { class: `iconbtn ${cls}`.trim(), type: "button", "aria-label": label, title: label, onclick }, icon(name, size));

/** Selector de pestañas estilo píldora. */
export function segmented(labels, selected, onSelect) {
  return h("div", { class: "seg", role: "group" }, ...labels.map((label, i) =>
    h("button", { type: "button", text: label, "aria-pressed": String(i === selected), onclick: () => onSelect(i) })));
}

export function emptyArchive(label = "REGISTRÁ TU PRIMERA\nSESIÓN PARA GENERAR\nMÉTRICAS.") {
  return h("div", { class: "empty" }, h("div", { class: "l" }), h("p", { class: "tag-t", text: "[ ARCHIVO VACÍO ]" }), h("p", { class: "big", text: label }), h("div", { class: "l" }));
}

/** Anillo de progreso (0..1). */
export function ring(progress, { size = 76, line = 4, on = false } = {}) {
  const r = (size - line) / 2;
  const c = 2 * Math.PI * r;
  const arc = svg("circle", { class: "arc", cx: size / 2, cy: size / 2, r, fill: "none", "stroke-width": line, "stroke-linecap": "round", "stroke-dasharray": c, "stroke-dashoffset": c * (1 - Math.min(1, Math.max(0, progress))) });
  const wrap = h("div", { class: `ring${on ? " on" : ""}` },
    svg("svg", { viewBox: `0 0 ${size} ${size}`, width: size, height: size }, svg("circle", { class: "track", cx: size / 2, cy: size / 2, r, fill: "none", "stroke-width": line }), arc));
  wrap.style.width = `${size}px`;
  wrap.style.height = `${size}px`;
  wrap.setProgress = (p) => arc.setAttribute("stroke-dashoffset", String(c * (1 - Math.min(1, Math.max(0, p)))));
  return wrap;
}

// ---- Hojas inferiores

const stack = [];

function lockScroll(on) {
  document.body.style.overflow = on ? "hidden" : "";
}

/**
 * Abre una hoja inferior. `build(close)` devuelve { header?, body, footer? } con nodos DOM.
 * Opciones: full (altura completa), elevated (fondo más claro), onClose.
 */
export function openSheet(build, { full = false, elevated = false, onClose = null } = {}) {
  const scrim = h("div", { class: "scrim" });
  const sheet = h("div", { class: `sheet${full ? " full" : ""}${elevated ? " elevated" : ""}`, role: "dialog", "aria-modal": "true" });
  let closed = false;
  const opener = document.activeElement;   // para devolverle el foco al cerrar

  const close = () => {
    if (closed) return;
    closed = true;
    stack.splice(stack.indexOf(entry), 1);
    scrim.classList.remove("in");
    sheet.classList.remove("in");
    sheet.style.transform = "";
    const done = () => { scrim.remove(); sheet.remove(); if (!stack.length) lockScroll(false); onClose?.(); try { opener?.isConnected && opener.focus(); } catch { /* sin foco */ } };
    if (reduceMotion()) done(); else setTimeout(done, 320);
  };
  const entry = { close };
  stack.push(entry);

  const parts = build(close);
  const handle = h("div", { class: "handle" });
  const grab = h("div", { class: "grab" }, handle);
  grab.style.touchAction = "none";
  grab.style.padding = "0 0 4px";
  sheet.append(grab);
  if (parts.header) sheet.append(parts.header);
  const scroll = h("div", { class: "scroll" }, parts.body);
  sheet.append(scroll);
  if (parts.footer) sheet.append(parts.footer);

  scrim.addEventListener("click", close);
  addDragToClose(grab, sheet, close);

  sheet.tabIndex = -1;
  sheet.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const items = [...sheet.querySelectorAll("button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])")].filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items.at(-1);
    if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  lockScroll(true);
  document.body.append(scrim, sheet);
  requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add("in"); sheet.classList.add("in"); if (!sheet.contains(document.activeElement)) sheet.focus({ preventScroll: true }); }));
  return { close, sheet, scroll };
}

function addDragToClose(grab, sheet, close) {
  let y0 = null, dy = 0, t0 = 0;
  grab.addEventListener("pointerdown", (e) => { y0 = e.clientY; dy = 0; t0 = performance.now(); grab.setPointerCapture(e.pointerId); sheet.style.transition = "none"; });
  grab.addEventListener("pointermove", (e) => {
    if (y0 == null) return;
    dy = Math.max(0, e.clientY - y0);
    sheet.style.transform = `translate(-50%, ${dy}px)`;
  });
  const end = () => {
    if (y0 == null) return;
    const fast = dy / Math.max(1, performance.now() - t0) > 0.6;
    y0 = null;
    sheet.style.transition = "";
    if (dy > 110 || (fast && dy > 30)) close(); else sheet.style.transform = "";
  };
  grab.addEventListener("pointerup", end);
  grab.addEventListener("pointercancel", end);
}

export const closeTopSheet = () => { stack.at(-1)?.close(); return stack.length > 0; };
export const closeAllSheets = () => { for (const e of [...stack]) e.close(); };
if (typeof document !== "undefined") document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeTopSheet(); });

/** Encabezado estándar de hoja: título + botón cerrar. */
export function sheetHeader(title, close, { eyebrowText = null, tight = false } = {}) {
  return h("div", { class: `sheet-head${tight ? " tight" : ""}` },
    h("div", {}, eyebrowText ? eyebrow(eyebrowText) : null, h("h2", { text: title })),
    iconBtn("x", "Cerrar", close, "sm", 14));
}

// ---- Diálogos

/**
 * Alerta modal centrada. `buttons`: [{label, destructive?, cancel?, action?}]; con `input`, la acción recibe el texto.
 * Devuelve { close }.
 */
export function openAlert({ title, message = "", buttons, input = null }) {
  const wrap = h("div", { class: "alert-wrap", role: "alertdialog", "aria-modal": "true" });
  let field = null;
  const close = () => { wrap.classList.remove("in"); setTimeout(() => wrap.remove(), reduceMotion() ? 0 : 200); };
  const msg = h("div", { class: "msg" }, h("h2", { text: title }), message ? h("p", { text: message }) : null);
  if (input) {
    field = h("input", { class: "field", type: "text", placeholder: input.placeholder ?? "", value: input.value ?? "", autocomplete: "off", autocapitalize: "sentences" });
    msg.append(field);
  }
  const acts = h("div", { class: "acts" }, ...buttons.map((b) => h("button", {
    type: "button", class: `${b.cancel ? "cancel" : ""} ${b.destructive ? "destructive" : ""}`.trim(), text: b.label.toUpperCase(),
    onclick: () => { if (b.action && b.action(field?.value ?? "") === false) return; close(); },
  })));
  wrap.append(h("div", { class: "alert" }, msg, acts));
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  document.body.append(wrap);
  requestAnimationFrame(() => { wrap.classList.add("in"); field?.focus(); });
  field?.addEventListener("keydown", (e) => { if (e.key === "Enter") acts.querySelector("button:not(.cancel)")?.click(); });
  return { close };
}

export const confirmAlert = ({ title, message, confirmLabel, cancelLabel = "Cancelar", destructive = false, onConfirm }) =>
  openAlert({ title, message, buttons: [{ label: confirmLabel, destructive, action: onConfirm }, { label: cancelLabel, cancel: true }] });

/** Hoja con acciones: items = [{label, sub?, icon?, destructive?, action}]. */
export function menuSheet(title, items) {
  return openSheet((close) => ({
    header: sheetHeader(title, close, { tight: true }),
    body: h("div", { class: "menu" }, ...items.map((it) => h("button", {
      type: "button", class: it.destructive ? "destructive" : "", onclick: () => { close(); setTimeout(it.action, 60); },
    }, it.icon ? icon(it.icon, 18) : null, h("span", {}, it.label, it.sub ? h("div", { class: "sub", text: it.sub }) : null)))),
  }));
}

// ---- Avisos

/** Aviso breve abajo de la pantalla, con una acción opcional ("Deshacer"). */
export function toast(message, { action = null, ms = 5000 } = {}) {
  if (typeof document === "undefined") return;   // sin DOM (tests)
  const box = $("toasts");
  if (!box) return;
  const el = h("div", { class: "toast", role: "status" }, h("span", { text: message }));
  const remove = () => el.remove();
  if (action) el.append(h("button", { type: "button", text: action.label, onclick: () => { action.fn(); remove(); } }));
  while (box.children.length >= 3) box.firstChild.remove();
  box.append(el);
  setTimeout(remove, ms);
}
