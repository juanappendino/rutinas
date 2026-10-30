// Pestaña RUTINAS: lista de programas, orden de rotación, archivado y alta desde el catálogo de ejercicios.
import { h, trim1, uuid } from "../util.js";
import { icon } from "../icons.js";
import { numeral, pageHeader, iconBtn, openSheet, sheetHeader, menuSheet, confirmAlert, openAlert, eyebrow, rule, toast } from "../ui.js";
import {
  state, toggleArchive, deleteRoutine, reorderActiveRoutines, addRoutine, routineFromTemplates, makeTemplate, addExerciseTemplate, makeExercise,
} from "../store.js";
import { activeRoutines, allExercises, favoriteExercises, routineName, todayRoutine } from "../logic.js";

let showArchived = false;

export function rutinasView({ rerender }) {
  const routines = state.routines;
  const active = activeRoutines(routines);
  const archived = routines.filter((r) => r.isArchived);
  const todayID = todayRoutine(state).id;

  const root = h("div", { class: "screen-pad" });
  root.append(pageHeader(`Programas · ${active.length} activas`, "Rutinas",
    active.length > 1 ? iconBtn("sort", "Ordenar rotación", openReorder, "", 14) : null,
    iconBtn("plus", "Nueva rutina", openNewRoutine, "accent", 16)));

  root.append(h("div", { class: "list" }, ...active.map((r) => routineRow(r, r.id === todayID))));

  if (archived.length) {
    root.append(h("button", { class: "archived-toggle", type: "button", "aria-expanded": String(showArchived), onclick: () => { showArchived = !showArchived; rerender(); } },
      h("span", { text: "ARCHIVADAS" }), h("span", { class: "n", text: `[${archived.length}]` }), icon(showArchived ? "chevron-up" : "chevron-down", 12)));
    if (showArchived) root.append(h("div", { class: "list" }, ...archived.map((r) => routineRow(r, false))));
  }
  return { el: root };
}

function routineRow(r, isToday) {
  const exercises = allExercises(r);
  const meta = h("div", { class: "meta" }, h("span", { class: "t", text: `${exercises.length} EJ · ${r.muscleGroups.map((g) => g.name).join(" · ")}` }));
  if (isToday) meta.append(h("span", { class: "hoy", text: "· HOY" }));
  if (r.isArchived) meta.append(h("span", { text: "· ARCHIVADA" }));
  const row = h("div", { class: `row-link${r.isArchived ? " archived" : ""}` });
  const link = h("a", { href: `#/rutinas/${r.id}`, class: "row-main", "aria-label": `Abrir ${routineName(r)}` },
    numeral(r.dayNumber, r.variant, 44),
    h("div", { class: "mid" }, h("div", { class: "title", text: routineName(r) }), meta));
  const more = h("button", { class: "row-more", type: "button", "aria-label": `Opciones de ${routineName(r)}`, onclick: () => openRowMenu(r) }, icon("dots", 18));
  row.append(link, more, h("span", { class: "chev" }, icon("chevron-right", 14)));
  row.addEventListener("contextmenu", (e) => { e.preventDefault(); openRowMenu(r); });
  return row;
}

function openNewRoutine() {
  const created = (r) => { addRoutine(r); toast(`Rutina «${r.name}» creada`); };
  const favorites = favoriteExercises(state);
  if (favorites.length < 3) { openCatalogPicker(created); return; }
  menuSheet("Nueva rutina", [
    { label: "Con mis favoritos", sub: "Los ejercicios que más hacés, según tu historial", icon: "star", action: () => openFavoritesSheet(favorites, created) },
    { label: "Elegir ejercicios del catálogo", sub: "Armala desde cero", icon: "list", action: () => openCatalogPicker(created) },
  ]);
}

/** Propone una rutina con los ejercicios que más hacés (se pueden destildar) y la crea con el nombre que elijas. */
function openFavoritesSheet(favorites, onCreate) {
  const selected = new Set(favorites.map((f) => f.name));
  const list = h("div", {});
  const create = h("button", { class: "btn-primary", type: "button" });
  const paint = () => {
    list.replaceChildren(...favorites.map((f) => {
      const on = selected.has(f.name);
      const kg = f.lastKg ? ` · ${trim1(f.lastKg)} kg` : "";
      return h("button", { class: `pick${on ? " sel" : ""}`, type: "button", "aria-pressed": String(on), onclick: () => { on ? selected.delete(f.name) : selected.add(f.name); paint(); } },
        h("span", { class: "box" }, on ? icon("check", 11) : null),
        h("span", { class: "mid" }, h("div", { class: "n", text: f.name }),
          h("div", { class: "m", text: `${f.group} · ${f.uses} ${f.uses === 1 ? "vez" : "veces"} · ${f.sets} × ${f.reps}${kg}` })));
    }));
    create.disabled = !selected.size;
    create.textContent = selected.size ? `Crear rutina (${selected.size} ej)` : "Elegí al menos uno";
  };
  paint();
  const sheet = openSheet((close) => ({
    header: h("div", { class: "sheet-head tight" },
      h("div", {}, eyebrow("Nueva rutina"), h("h2", { text: "Tus favoritos" }), h("p", { class: "eyebrow dim", text: "Los que más hiciste, uno por grupo" })),
      iconBtn("x", "Cerrar", close, "sm", 14)),
    body: list,
    footer: h("div", { class: "sheet-foot" }, create),
  }), { full: true });
  create.addEventListener("click", () => askName((name) => {
    const chosen = favorites.filter((f) => selected.has(f.name));
    const groups = [];
    for (const f of chosen) {
      let g = groups.find((x) => x.name === f.group);
      if (!g) { g = { id: uuid(), name: f.group, exercises: [] }; groups.push(g); }
      g.exercises.push(makeExercise({ name: f.name, sets: f.sets, reps: f.reps, description: f.description, templateID: f.templateID }));
    }
    onCreate({ id: uuid(), t: 0, dayNumber: 0, variant: "", name, isArchived: false, muscleGroups: groups });
    sheet.close();
  }, "Favoritos"));
}

export function openRowMenu(r) {
  menuSheet(routineName(r), [
    { label: r.isArchived ? "Activar" : "Archivar", icon: r.isArchived ? "undo" : "archive", action: () => toggleArchive(r) },
    { label: "Eliminar rutina", icon: "trash", destructive: true, action: () => confirmAlert({
      title: `¿Eliminar «${routineName(r)}»?`, message: "El historial de sesiones se conserva.", confirmLabel: "Eliminar", destructive: true, onConfirm: () => deleteRoutine(r),
    }) },
  ]);
}

// ---- Orden de rotación

function openReorder() {
  let ordered = activeRoutines(state.routines).map((r) => r.id);
  const byID = new Map(state.routines.map((r) => [r.id, r]));
  const list = h("div", {});
  const paint = () => {
    list.replaceChildren(...ordered.map((id, i) => {
      const r = byID.get(id);
      const move = (d) => { const j = i + d; [ordered[i], ordered[j]] = [ordered[j], ordered[i]]; paint(); };
      return h("div", { class: "reorder-row" }, numeral(r.dayNumber, r.variant, 32),
        h("div", { class: "mid" }, h("div", { class: "t", text: routineName(r) }), h("div", { class: "m", text: r.muscleGroups.map((g) => g.name).join(" · ") })),
        h("div", { class: "mv" },
          iconBtn("chevron-up", "Subir", () => move(-1), "sm", 14),
          iconBtn("chevron-down", "Bajar", () => move(1), "sm", 14)));
    }));
    list.querySelectorAll(".reorder-row").forEach((row, i) => {
      row.querySelector(".mv button:first-child").disabled = i === 0;
      row.querySelector(".mv button:last-child").disabled = i === ordered.length - 1;
    });
  };
  paint();
  openSheet((close) => ({
    header: h("div", { class: "sheet-head tight" },
      h("div", {}, h("h2", { text: "Orden de rotación" }), h("p", { class: "eyebrow dim", text: "Cambiá el orden en que rotan" })),
      h("button", { class: "linkbtn accent", type: "button", text: "LISTO", onclick: () => { reorderActiveRoutines(ordered); close(); } })),
    body: list,
  }));
}

// ---- Alta de ejercicios y rutinas

/** Hoja "Nuevo ejercicio": nombre, series y repeticiones. `onAdd(name, sets, reps)`. */
export function openAddExerciseSheet(onAdd) {
  const f = { name: "", sets: 3, reps: "12" };
  const sets = h("span", { class: "v", text: "3" });
  const add = h("button", { class: "btn-primary", type: "button", text: "Agregar ejercicio", disabled: true });
  const name = h("input", { class: "field", type: "text", placeholder: "Ej: Press banca", autocomplete: "off", "aria-label": "Nombre" });
  const reps = h("input", { class: "field", type: "text", value: "12", placeholder: "12, 8-10, 1 min", autocomplete: "off", "aria-label": "Repeticiones" });
  name.addEventListener("input", () => { f.name = name.value.trim(); add.disabled = !f.name; });
  reps.addEventListener("input", () => { f.reps = reps.value; });
  const setSets = (n) => { f.sets = Math.max(1, n); sets.textContent = String(f.sets); };
  const { close } = openSheet((close) => ({
    header: sheetHeader("Nuevo ejercicio", close),
    body: h("div", { class: "form" },
      h("label", {}, eyebrow("Nombre"), name),
      h("label", {}, eyebrow("Series"), h("div", { class: "hbox" }, h("span", { text: "Series" }), h("div", { class: "stepper" },
        h("button", { type: "button", "aria-label": "Menos series", onclick: () => setSets(f.sets - 1) }, icon("minus", 13)), sets,
        h("button", { type: "button", "aria-label": "Más series", onclick: () => setSets(f.sets + 1) }, icon("plus", 13))))),
      h("label", {}, eyebrow("Repeticiones o tiempo"), reps)),
    footer: h("div", { class: "sheet-foot" }, add),
  }), { full: true });
  add.addEventListener("click", () => { onAdd(f.name, f.sets, f.reps.trim() || "12"); close(); });
  setTimeout(() => name.focus(), 350);
}

/**
 * Hoja "Elegí ejercicios": elige del catálogo (con buscador y alta de ejercicios nuevos), agrupa por músculo y pide un nombre.
 * `onCreate(routine)` recibe la rutina armada.
 */
export function openCatalogPicker(onCreate, { title = "Elegí ejercicios", eyebrowText = "Nueva rutina" } = {}) {
  const selected = new Set();
  let query = "";
  const list = h("div", {});
  const chips = h("div", { class: "tag-scroll" });
  chips.style.padding = "0 20px 10px";
  const create = h("button", { class: "btn-primary", type: "button", disabled: true });
  const search = h("input", { type: "text", placeholder: "Buscar por nombre o músculo", autocomplete: "off", "aria-label": "Buscar" });
  const clear = h("button", { class: "clear", type: "button", "aria-label": "Borrar búsqueda", hidden: true, onclick: () => { search.value = ""; query = ""; paint(); search.focus(); } }, icon("x", 13));
  search.addEventListener("input", () => { query = search.value; paint(); });
  const searchBox = h("div", { class: "search" }, icon("search", 13), search, clear);
  searchBox.style.margin = "0 20px 8px";

  const paint = () => {
    const q = query.trim().toLowerCase();
    clear.hidden = !q;
    const filtered = state.exerciseCatalog.filter((t) => !q || t.name.toLowerCase().includes(q) || t.muscleTag.toLowerCase().includes(q));
    const tags = [...new Set(filtered.map((t) => t.muscleTag))].sort();
    list.replaceChildren(...tags.flatMap((tag) => [
      h("div", { class: "grp-rule" }, rule(tag ? tag.toUpperCase() : "SIN GRUPO")),
      ...filtered.filter((t) => t.muscleTag === tag).map((t) => {
        const on = selected.has(t.id);
        return h("button", { class: `pick${on ? " sel" : ""}`, type: "button", "aria-pressed": String(on), onclick: () => { on ? selected.delete(t.id) : selected.add(t.id); paint(); } },
          h("span", { class: "box" }, on ? icon("check", 11) : null),
          h("span", { class: "mid" }, h("div", { class: "n", text: t.name }), h("div", { class: "m", text: `${t.defaultSets} ${t.defaultSets === 1 ? "serie" : "series"} · ${t.defaultReps}${t.description ? " · con descripción" : ""}` })));
      }),
    ]));
    if (!tags.length) list.replaceChildren(h("p", { class: "empty-note", text: "Sin resultados" }));
    const chosen = state.exerciseCatalog.filter((t) => selected.has(t.id));
    const byTag = new Map();
    for (const t of chosen) byTag.set((t.muscleTag || "GENERAL").toUpperCase(), (byTag.get((t.muscleTag || "GENERAL").toUpperCase()) ?? 0) + 1);
    chips.replaceChildren(...[...byTag.keys()].sort().map((tag) => h("span", { class: "tag accent", text: `${tag} · ${byTag.get(tag)}` })));
    chips.hidden = !byTag.size;
    create.disabled = !selected.size;
    create.textContent = selected.size ? `Crear rutina (${selected.size} ej)` : "Seleccioná ejercicios";
  };

  const sheet = openSheet((close) => ({
    header: h("div", {},
      h("div", { class: "sheet-head tight" }, h("div", {}, eyebrow(eyebrowText), h("h2", { text: title })), iconBtn("x", "Cerrar", close, "sm", 14)),
      searchBox,
      h("button", { class: "newline", type: "button", onclick: () => openAddExerciseSheet((name, sets, reps) => {
        const t = makeTemplate({ name, defaultSets: sets, defaultReps: reps });
        addExerciseTemplate(t);
        selected.add(t.id);
        paint();
      }) }, icon("plus", 12), h("span", { text: "Nuevo ejercicio" })),
      chips),
    body: list,
    footer: h("div", { class: "sheet-foot" }, create),
  }), { full: true });
  create.addEventListener("click", () => askName((name) => {
    onCreate(routineFromTemplates(name, state.exerciseCatalog.filter((t) => selected.has(t.id))));
    sheet.close();
  }));
  paint();
}

function askName(onName, initial = "") {
  openAlert({
    title: "Nombre del día",
    input: { placeholder: "Ej: Empuje, Piernas, Full body…", value: initial },
    buttons: [
      { label: "Crear", action: (value) => { if (!value.trim()) return false; onName(value.trim()); } },
      { label: "Cancelar", cancel: true },
    ],
  });
}
