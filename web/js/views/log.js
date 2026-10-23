// Pestaña LOG (Historial): progreso y logros, ejercicios con su última carga, y sesiones por mes.
import { h, fmt1, pad2, dayMonthLabel, longDayLabel, mmss, trim1 } from "../util.js";
import { icon } from "../icons.js";
import { pageHeader, iconBtn, segmented, rule, emptyArchive, eyebrow, openSheet, sheetHeader, confirmAlert, toast } from "../ui.js";
import { state, deleteSession } from "../store.js";
import * as L from "../logic.js";
import { openDataMenu } from "./datos.js";

let tab = 0;          // 0 progreso · 1 ejercicios · 2 sesiones
let query = "";

export function logView({ rerender }) {
  const root = h("div", { class: "screen-pad" });
  const bars = L.miniBars(state.history);
  const peak = Math.max(1, ...bars);
  const mini = h("div", { class: "minibars", "aria-hidden": "true" }, ...bars.map((v) => { const i = h("i"); i.style.height = `${Math.max(3, 48 * (v / peak))}px`; return i; }));
  root.append(pageHeader("Registro", "Historial", mini, iconBtn("share", "Exportar o importar datos", openDataMenu, "", 15)));
  root.append(h("div", { class: "tabs" }, segmented(["PROGRESO", "EJERCICIOS", "SESIONES"], tab, (i) => { tab = i; rerender(); })));
  root.append(tab === 0 ? progreso() : tab === 1 ? ejercicios() : sesiones());
  return { el: root };
}

// ---- Progreso

function progreso() {
  const wrap = h("div", {});
  const streak = L.currentStreak(state.history);
  const best = L.bestStreak(state.history);

  const card = h("div", { class: `streak${streak > 0 ? " on" : ""}` });
  card.append(h("div", { class: "top" }, eyebrow("Racha actual", streak > 0 ? "accent" : ""), best > 0 ? h("span", { class: "rec", text: `RÉCORD · ${best} DÍAS` }) : null));
  if (streak > 0) {
    card.append(h("div", { class: "big" }, h("b", { text: String(streak) }), h("div", {}, h("b", { text: streak === 1 ? "DÍA" : "DÍAS" }), h("span", { text: streak === 1 ? "seguido" : "seguidos" }))));
  } else {
    card.append(h("div", { class: "month", text: `${L.currentMonthDays(state.history)} entrenamientos este mes` }));
  }
  card.append(h("div", { class: "heat", role: "img", "aria-label": "Actividad de los últimos 28 días" }, ...L.heatmap(state.history).map((c) =>
    h("i", { class: `${c.level ? `l${c.level}` : ""}${c.isToday ? " today" : ""}`.trim(), title: `${longDayLabel(c.date)} · ${c.sets} series` }))));
  card.append(h("div", { class: "heat-note", text: "Últimos 28 días · intensidad por series" }));
  wrap.append(card);

  const stat = (label, value) => h("div", { class: "stat" }, eyebrow(label, "dim"), h("div", { class: "v", text: String(value) }));
  wrap.append(h("div", { class: "stat-pad" }, h("div", { class: "stat-grid" },
    stat("Sesiones", L.totalSessions(state.history)), stat("Ejercicios", L.totalExercisesCompleted(state.history)),
    stat("Esta semana", L.currentWeekSessions(state.history)), stat("Este mes", L.currentMonthDays(state.history)))));

  wrap.append(h("div", { class: "stat-pad" }, rule("Logros")));
  wrap.lastChild.style.marginTop = "28px";
  wrap.lastChild.style.marginBottom = "12px";
  wrap.append(h("div", { class: "badges" }, ...L.badges(state.history).map((b) =>
    h("div", { class: `badge${b.unlocked ? " on" : ""}`, title: b.unlocked ? "Logro desbloqueado" : "Bloqueado" }, h("div", { class: "b" }, icon(b.icon, 22)), h("span", { text: b.name })))));
  return wrap;
}

// ---- Ejercicios

function ejercicios() {
  const wrap = h("div", {});
  if (!L.groupedExercises(state.routines).length) { wrap.append(emptyArchive()); return wrap; }
  const search = h("input", { type: "text", placeholder: "Buscar ejercicio…", value: query, autocomplete: "off", "aria-label": "Buscar ejercicio" });
  const clear = h("button", { class: "clear", type: "button", "aria-label": "Borrar búsqueda", hidden: !query, onclick: () => { search.value = ""; query = ""; paint(); search.focus(); } }, icon("x", 13));
  const box = h("div", { class: "search" }, icon("search", 13), search, clear);
  box.style.margin = "0 20px 4px";
  const list = h("div", {});
  const paint = () => {
    clear.hidden = !query;
    const groups = L.groupedExercises(state.routines, query);
    if (!groups.length) { list.replaceChildren(h("p", { class: "empty-note", text: "Sin resultados" })); return; }
    list.replaceChildren(...groups.map((g, gi) => {
      const sec = h("section", { class: "group" }, rule(g.name), h("div", { class: "list" }, ...g.exercises.map((ex) => exerciseLink(ex))));
      sec.style.marginTop = gi === 0 ? "8px" : "24px";
      return sec;
    }));
  };
  search.addEventListener("input", () => { query = search.value; paint(); });
  paint();
  wrap.append(box, list);
  return wrap;
}

function exerciseLink(ex) {
  const kg = L.lastWeight(state, ex);
  const trend = kg != null ? L.weightTrend(state, ex) : null;
  return h("a", { class: "erow-link", href: `#/ejercicio/${ex.id}` },
    h("div", { class: "mid" }, h("div", { class: "n", text: ex.name }), kg != null ? h("div", { class: "m", text: `${fmt1(kg)} KG` }) : h("div", { class: "m none", text: "SIN REGISTROS" })),
    trend ? h("span", { class: `trend ${trend}`, text: { up: "↑", flat: "→", down: "↓" }[trend] }) : null,
    h("span", { class: "chev" }, icon("chevron-right", 14)));
}

// ---- Sesiones

function sesiones() {
  if (!state.history.length) return emptyArchive();
  const wrap = h("div", {});
  L.groupSessionsByMonth(state.history).forEach((g, gi) => {
    const sec = h("section", { class: "group" }, rule(g.label, g.sessions.length), ...g.sessions.map((s, i) => sessionRow(s, i)));
    sec.style.marginTop = gi ? "28px" : "0";
    wrap.append(sec);
  });
  return wrap;
}

function sessionRow(s, i) {
  const routine = L.findRoutine(state.routines, s);
  const label = `DÍA ${s.dayNumber}${s.variant}`;
  const groups = routine ? routine.muscleGroups.map((g) => g.name).join(" · ") : "";
  return h("button", { class: "sess", type: "button", onclick: () => openSessionDetail(s) },
    h("span", { class: "i", text: pad2(i + 1) }),
    h("div", { class: "mid" }, h("div", { class: "n", text: L.sessionName(state.routines, s) }), h("div", { class: "m", text: groups ? `${label} · ${groups}` : label })),
    h("div", { class: "d" }, h("b", { text: dayMonthLabel(s.date) }), h("span", { text: `${s.completedExerciseIDs.length} EJ` })));
}

function openSessionDetail(s) {
  const routine = L.findRoutine(state.routines, s);
  const rows = [];
  for (const group of routine?.muscleGroups ?? []) {
    for (const ex of group.exercises) {
      const sets = s.completedSetsLog[ex.id]?.length ?? 0;
      if (!sets) continue;
      const parts = [`${sets} ${sets === 1 ? "serie" : "series"}`];
      if (s.setTypeLog[ex.id] === "time" || (s.timeLog[ex.id] != null && s.repsLog[ex.id] == null)) {
        if (s.timeLog[ex.id] != null) parts.push(mmss(s.timeLog[ex.id]));
        if (s.distanceLog[ex.id] != null) parts.push(`${trim1(s.distanceLog[ex.id])} km`);
      } else {
        if (s.weightLog[ex.id]) parts.push(`${fmt1(s.weightLog[ex.id])} kg`);
        if (s.repsLog[ex.id] != null) parts.push(`${s.repsLog[ex.id]} reps`);
      }
      rows.push(h("div", { class: "erow" }, h("div", { class: "mid" }, h("div", { class: "n", text: ex.name }), h("div", { class: "m", text: parts.join(" · ") }))));
    }
  }
  openSheet((close) => ({
    header: sheetHeader(L.sessionName(state.routines, s), close, { eyebrowText: `${longDayLabel(s.date)} · ${L.durationMinutes(s) > 0 ? `${L.durationMinutes(s)} min` : "sin duración"}`, tight: true }),
    body: h("div", { class: "edit-group" }, ...(rows.length ? rows : [h("p", { class: "empty-note", text: "No hay series registradas para esta sesión." })]),
      h("button", { class: "btn-secondary destructive", type: "button", text: "Eliminar sesión", onclick: () => confirmAlert({
        title: "¿Eliminar esta sesión?", message: "Se borra del historial y de las estadísticas.", confirmLabel: "Eliminar", destructive: true,
        onConfirm: () => { deleteSession(s.id); close(); toast("Sesión eliminada"); },
      }) })),
  }));
}
