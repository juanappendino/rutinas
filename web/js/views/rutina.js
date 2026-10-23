// Detalle de una rutina: grupos y ejercicios editables (series, repeticiones, descripción), orden y alta de ejercicios/grupos.
import { h, uuid } from "../util.js";
import { icon } from "../icons.js";
import { numeral, eyebrow, openAlert, toast } from "../ui.js";
import { state, updateRoutine, makeExercise } from "../store.js";
import { allExercises, routineName } from "../logic.js";
import { openAddExerciseSheet } from "./rutinas.js";

let editMode = false;
let editingID = null;   // ejercicio con el formulario inline abierto

export function rutinaView(routineID, { rerender }) {
  const routine = state.routines.find((r) => r.id === routineID);
  if (!routine) {
    return { el: h("div", { class: "nodata" }, h("h2", { text: "Rutina no encontrada" }), h("a", { class: "back", href: "#/rutinas" }, icon("chevron-left", 12), "Rutinas")) };
  }
  const save = (mutate) => { const copy = structuredClone(routine); mutate(copy); updateRoutine(copy); };
  const focus = routine.muscleGroups.map((g) => g.name).join(" · ");

  const root = h("div", { class: "screen-pad" });
  root.append(h("div", { class: "navbar" },
    h("a", { class: "back", href: "#/rutinas" }, icon("chevron-left", 12), "Rutinas"),
    h("button", { class: `edit${editMode ? " on" : ""}`, type: "button", text: editMode ? "LISTO" : "EDITAR", onclick: () => { editMode = !editMode; editingID = null; rerender(); } })));

  const name = h("div", { class: `dh-name${editMode ? " editable" : ""}`, text: routineName(routine) });
  if (editMode) {
    name.setAttribute("role", "button");
    name.tabIndex = 0;
    name.addEventListener("click", () => openAlert({
      title: "Nombre de la rutina", input: { placeholder: "Ej: Empuje", value: routineName(routine) },
      buttons: [{ label: "Guardar", action: (v) => { if (!v.trim()) return false; save((r) => { r.name = v.trim(); }); } }, { label: "Cancelar", cancel: true }],
    }));
  }
  root.append(h("div", { class: "detail-head" },
    h("div", { class: "top" },
      h("div", { class: "dh-col" }, eyebrow("Día"), numeral(routine.dayNumber, routine.variant, 60)),
      h("div", { class: "focus" }, h("b", { text: focus }), h("span", { text: `${allExercises(routine).length} EJERCICIOS` }))),
    name,
    h("div", { class: "tag-scroll" }, ...routine.muscleGroups.map((g) => h("span", { class: "tag", text: g.name })))));

  routine.muscleGroups.forEach((group) => {
    const g = h("section", { class: "edit-group" });
    const head = h("div", { class: "ghead" }, eyebrow(group.name));
    if (editMode) head.append(h("button", { class: "iconbtn sm", type: "button", "aria-label": `Eliminar grupo ${group.name}`, onclick: () => save((r) => { r.muscleGroups = r.muscleGroups.filter((x) => x.id !== group.id); }) }, icon("trash", 14)));
    g.append(head);
    group.exercises.forEach((ex, i) => g.append(editingID === ex.id ? editForm(group, ex) : exerciseRow(group, ex, i)));
    g.append(h("button", { class: "add-line", type: "button", onclick: () => openAddExerciseSheet((n, sets, reps) => save((r) => { r.muscleGroups.find((x) => x.id === group.id).exercises.push(makeExercise({ name: n, sets, reps })); })) },
      icon("plus", 12), "Agregar ejercicio"));
    root.append(g);
  });

  root.append(h("div", { class: "edit-group" }, h("button", { class: "add-line grey", type: "button", onclick: () => openAlert({
    title: "Nuevo grupo muscular", input: { placeholder: "Ej: CARDIO" },
    buttons: [{ label: "Agregar", action: (v) => { if (!v.trim()) return false; save((r) => { r.muscleGroups.push({ id: uuid(), name: v.trim().toUpperCase(), exercises: [] }); }); } }, { label: "Cancelar", cancel: true }],
  }) }, icon("plus", 12), "Agregar grupo muscular")));
  return { el: root };

  function exerciseRow(group, ex, i) {
    const tools = h("div", { class: "tools" });
    if (editMode) {
      const move = (d) => save((r) => { const arr = r.muscleGroups.find((x) => x.id === group.id).exercises; const j = i + d; [arr[i], arr[j]] = [arr[j], arr[i]]; });
      tools.append(
        Object.assign(iconBtnPlain("chevron-up", "Subir", () => move(-1)), { disabled: i === 0 }),
        Object.assign(iconBtnPlain("chevron-down", "Bajar", () => move(1)), { disabled: i === group.exercises.length - 1 }),
        iconBtnPlain("trash", "Eliminar ejercicio", () => save((r) => { const gr = r.muscleGroups.find((x) => x.id === group.id); gr.exercises = gr.exercises.filter((e) => e.id !== ex.id); }), "del"));
    }
    tools.append(h("a", { class: "acc", href: `#/ejercicio/${ex.id}`, "aria-label": `Progreso de ${ex.name}` }, icon("chart", 16)));
    tools.append(iconBtnPlain("pencil", "Editar ejercicio", () => { editingID = ex.id; rerender(); }));
    return h("div", { class: "erow" }, h("div", { class: "mid" }, h("div", { class: "n", text: ex.name }), h("div", { class: "m", text: `${ex.sets} series · ${ex.reps}` })), tools);
  }

  function editForm(group, ex) {
    const f = { name: ex.name, sets: ex.sets, reps: ex.reps, desc: ex.description };
    const sets = h("span", { class: "v", text: String(f.sets) });
    const setSets = (n) => { f.sets = Math.max(1, n); sets.textContent = String(f.sets); };
    const name = h("input", { class: "field", type: "text", value: f.name, "aria-label": "Nombre", placeholder: "Nombre" });
    const reps = h("input", { class: "field", type: "text", value: f.reps, "aria-label": "Repeticiones", placeholder: "Repeticiones o tiempo" });
    const desc = h("textarea", { class: "field", rows: "3", "aria-label": "Descripción técnica", placeholder: "Descripción técnica (opcional)" });
    desc.value = f.desc;
    return h("div", { class: "eform" }, name,
      h("div", { class: "r" }, eyebrow("Series"), h("div", { class: "stepper" },
        h("button", { type: "button", "aria-label": "Menos series", onclick: () => setSets(f.sets - 1) }, icon("minus", 13)), sets,
        h("button", { type: "button", "aria-label": "Más series", onclick: () => setSets(f.sets + 1) }, icon("plus", 13)))),
      reps, desc,
      h("div", { class: "btns" },
        h("button", { class: "btn-secondary", type: "button", text: "Cancelar", onclick: () => { editingID = null; rerender(); } }),
        h("button", { class: "btn-primary", type: "button", text: "Guardar", onclick: () => {
          const n = name.value.trim();
          if (!n) { toast("El ejercicio necesita un nombre"); return; }
          editingID = null;
          save((r) => { const e = r.muscleGroups.find((x) => x.id === group.id).exercises.find((x) => x.id === ex.id); e.name = n; e.sets = f.sets; e.reps = reps.value.trim() || e.reps; e.description = desc.value; });
        } })));
  }
}

function iconBtnPlain(name, label, onclick, cls = "") {
  return h("button", { type: "button", class: cls, "aria-label": label, title: label, onclick }, icon(name, 16));
}
