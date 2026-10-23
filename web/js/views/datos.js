// Exportar e importar datos: copia completa (JSON), historial en CSV, importar desde la app iOS o pegando texto.
import { h, download } from "../util.js";
import { menuSheet, openSheet, sheetHeader, confirmAlert, toast } from "../ui.js";
import { state, replaceState, resetAll, commit } from "../store.js";
import { BackupError, backupFileName, parseBackup, parseCSV, summarizeBackup, toBackup, toCSV } from "../backup.js";
import { completedHistory, routineName } from "../logic.js";
import { hasSpace, leave } from "../sync.js";
import { openSyncSheet } from "./sincro.js";

export function openDataMenu() {
  menuSheet("Datos", [
    { label: "Sincronización", sub: hasSpace() ? "Activada en este dispositivo" : "Usá tus datos en el celular y en la compu", icon: "reset", action: openSyncSheet },
    { label: "Descargar copia completa", sub: "Rutinas, historial y catálogo (JSON)", icon: "down", action: exportJSON },
    { label: "Exportar historial (CSV)", sub: "Para abrir en una planilla", icon: "list", action: exportCSV },
    { label: "Importar archivo…", sub: "Copia JSON de la app o historial CSV", icon: "up", action: pickFile },
    { label: "Pegar copia…", sub: "Si la copiaste como texto desde el iPhone", icon: "pencil", action: openPaste },
    { label: "Borrar todos los datos", icon: "trash", destructive: true, action: askReset },
  ]);
}

function exportJSON() {
  download(backupFileName(), JSON.stringify(toBackup(state), null, 2));
  toast("Copia descargada");
}

function exportCSV() {
  if (!completedHistory(state.history).length) { toast("Todavía no hay sesiones para exportar"); return; }
  download("historial.csv", toCSV(state), "text/csv");
}

/** Abre el selector de archivos del sistema. También lo usa el onboarding. */
export function pickFile() {
  const input = h("input", { type: "file", accept: ".json,.csv,.txt,application/json,text/csv,text/plain", class: "hidden-input" });
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    importText(await file.text(), file.name);
  });
  document.body.append(input);
  input.click();
}

export function openPaste() {
  const area = h("textarea", { class: "field", rows: "10", placeholder: "Pegá acá el contenido de la copia (JSON) o del historial (CSV)", "aria-label": "Contenido a importar" });
  const go = h("button", { class: "btn-primary", type: "button", text: "Importar" });
  const { close } = openSheet((close) => ({
    header: sheetHeader("Pegar copia", close, { tight: true }),
    body: h("div", { class: "form" }, area),
    footer: h("div", { class: "sheet-foot" }, go),
  }), { full: true });
  go.addEventListener("click", () => { const t = area.value; close(); importText(t, "texto pegado"); });
  setTimeout(() => area.focus(), 350);
}

/** Detecta si es CSV o JSON y arranca el flujo de confirmación correspondiente. */
export function importText(text, source = "archivo") {
  const trimmed = text.trim();
  try {
    if (/^fecha,rutina/i.test(trimmed)) importCSV(trimmed);
    else importJSON(trimmed);
  } catch (e) {
    if (e instanceof BackupError) toast(e.message, { ms: 7000 });
    else { console.error(e); toast(`No pude leer ${source}.`, { ms: 7000 }); }
  }
}

function importJSON(text) {
  const parsed = parseBackup(text);
  const { routines, sessions, exercises } = summarizeBackup(parsed);
  confirmAlert({
    title: "¿Reemplazar tus datos?",
    message: `La copia trae ${routines} rutinas (${exercises} ejercicios) y ${sessions} sesiones. Tus datos actuales se reemplazan; podés deshacerlo enseguida.`,
    confirmLabel: "Reemplazar",
    onConfirm: () => {
      const previous = replaceState(parsed);
      toast("Copia importada", { ms: 9000, action: { label: "Deshacer", fn: () => replaceState(previous) } });
    },
  });
}

function importCSV(text) {
  const { sessions, newRoutines, skipped } = parseCSV(text, state.routines);
  const known = new Set(state.history.map((s) => `${new Date(s.date).toDateString()}|${s.dayNumber}|${s.variant}`));
  const fresh = sessions.filter((s) => !known.has(`${new Date(s.date).toDateString()}|${s.dayNumber}|${s.variant}`));
  if (!fresh.length) { toast(skipped ? `No encontré sesiones nuevas (${skipped} filas no coinciden con tus rutinas).` : "Ese historial ya está cargado.", { ms: 7000 }); return; }
  const used = new Set(fresh.map((s) => `${s.dayNumber}|${s.variant}`));
  const addRoutines = newRoutines.filter((r) => used.has(`${r.dayNumber}|${r.variant}`));
  const notes = [];
  if (addRoutines.length) notes.push(`Se crea ${addRoutines.length === 1 ? "la rutina" : "las rutinas"} ${addRoutines.map((r) => `«${routineName(r)}»`).join(", ")}.`);
  if (skipped) notes.push(`${skipped} filas se ignoran porque su ejercicio ya no está en la rutina.`);
  confirmAlert({
    title: `¿Agregar ${fresh.length} ${fresh.length === 1 ? "sesión" : "sesiones"}?`,
    message: `Se suman al historial. ${notes.join(" ")}`.trim(),
    confirmLabel: "Agregar",
    onConfirm: () => {
      commit((s) => {
        s.routines.push(...addRoutines.map((r) => ({ ...r, t: Date.now() })));
        s.history = [...fresh, ...s.history].sort((a, b) => b.date - a.date);
        s.hasOnboarded = true;
      });
      toast(`${fresh.length} sesiones agregadas`);
    },
  });
}

function askReset() {
  confirmAlert({
    title: "¿Borrar todos los datos?",
    message: "Se eliminan rutinas, historial y catálogo de este navegador y se deja de sincronizar (la copia en la nube no se toca). No se puede deshacer, salvo que tengas una copia.",
    confirmLabel: "Borrar todo", destructive: true,
    onConfirm: () => { leave(); resetAll(); toast("Datos borrados"); },
  });
}
