// Progreso de un ejercicio: máximo, ganancia, gráfico de cargas por sesión y lista de sesiones pasadas.
import { h, svg, fmt1, DIAS_CORTO, MESES_CORTO, dayMonthLabel } from "../util.js";
import { icon } from "../icons.js";
import { eyebrow, rule } from "../ui.js";
import { state } from "../store.js";
import { allExercises, weightHistory } from "../logic.js";

export function ejercicioView(exerciseID) {
  const ex = state.routines.flatMap(allExercises).find((e) => e.id === exerciseID);
  const back = h("button", { class: "back", type: "button", onclick: () => (history.length > 1 ? history.back() : (location.hash = "#/log")) }, icon("chevron-left", 12), "Atrás");
  if (!ex) return { el: h("div", { class: "nodata" }, h("h2", { text: "Ejercicio no encontrado" }), back) };

  const data = weightHistory(state, ex);
  const root = h("div", { class: "screen-pad" });
  if (!data.length) {
    root.append(h("div", { class: "navbar" }, back, h("span", { class: "t", text: ex.name })));
    root.append(h("div", { class: "nodata" }, icon("chart", 40), h("h2", { text: "Sin datos aún" }), h("p", { text: "Registrá cargas durante el entrenamiento para ver tu progreso acá" })));
    return { el: root };
  }

  const kgs = data.map((d) => d.kg);
  const max = Math.max(...kgs), last = kgs.at(-1);
  const avg = kgs.reduce((a, b) => a + b, 0) / kgs.length;
  const gain = data.length > 1 ? last - kgs[0] : 0;

  root.append(h("div", { class: "navbar" }, back, h("span", { class: "t", text: ex.name })));
  root.append(h("div", { class: "hero-max" },
    h("div", {}, eyebrow("Máximo", "lg"), h("div", { class: "big" }, h("b", { text: fmt1(max) }), h("span", { text: "kg" }))),
    gain > 0 ? h("div", { class: "gain" }, eyebrow("Ganancia", "lg"), h("b", { text: `+${fmt1(gain)} kg` })) : null));
  root.append(h("div", { class: "card chartcard" }, eyebrow("Progreso"), chart(data)));
  const cell = (label, value, unit) => h("div", {}, eyebrow(label), h("div", { class: "v" }, value, unit ? h("span", { text: unit }) : null));
  root.append(h("div", { class: "strip3" }, cell("Último", fmt1(last), "kg"), cell("Sesiones", String(data.length)), cell("Promedio", fmt1(avg), "kg")));

  const past = h("section", { class: "group" }, rule("Sesiones pasadas"), ...[...data].reverse().map((p) => {
    const d = new Date(p.date);
    return h("div", { class: "past" }, h("span", { class: "d", text: `${DIAS_CORTO[d.getDay()]} ${d.getDate()} ${MESES_CORTO[d.getMonth()]}` }), h("span", { class: "k" }, fmt1(p.kg), h("span", { text: "kg" })));
  }));
  past.style.marginTop = "28px";
  root.append(past);
  return { el: root };
}

/** Línea suavizada (Catmull-Rom) con área degradada y etiquetas; una sola sesión se muestra como punto. */
function chart(data) {
  const W = 320, H = 190, L = 30, R = 10, T = 22, B = 24;
  const n = data.length;
  const ys = data.map((d) => d.kg);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  const span = hi - lo;
  if (span < 0.01) { lo = Math.max(0, lo * 0.8); hi = hi * 1.2 + 1; } else { lo = Math.max(0, lo - span * 0.25); hi += span * 0.25; }
  const step = niceStep((hi - lo) / 4);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const x = (i) => (n === 1 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);

  const el = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Gráfico de cargas por sesión" });
  const grad = svg("linearGradient", { id: "g-area", x1: 0, y1: 0, x2: 0, y2: 1 },
    svg("stop", { offset: "0%", "stop-color": "#ff6b00", "stop-opacity": 0.3 }), svg("stop", { offset: "100%", "stop-color": "#ff6b00", "stop-opacity": 0 }));
  el.append(svg("defs", {}, grad));

  for (let v = lo; v <= hi + 1e-9; v += step) {
    el.append(svg("line", { class: "chart-grid", x1: L, x2: W - R, y1: y(v), y2: y(v) }));
    el.append(svg("text", { class: "chart-label", x: L - 6, y: y(v) + 3, "text-anchor": "end" }, String(Math.round(v * 10) / 10)));
  }
  const labelCount = Math.min(n, 5);
  const labelAt = new Set(Array.from({ length: labelCount }, (_, k) => (labelCount === 1 ? 0 : Math.round((k * (n - 1)) / (labelCount - 1)))));
  data.forEach((d, i) => {
    if (!labelAt.has(i)) return;
    el.append(svg("text", { class: "chart-label", x: x(i), y: H - 6, "text-anchor": n === 1 ? "middle" : i === 0 ? "start" : i === n - 1 ? "end" : "middle" }, dayMonthLabel(d.date).toLowerCase()));
  });

  if (n > 1) {
    const pts = data.map((d, i) => [x(i), y(d.kg)]);
    const path = smooth(pts);
    el.append(svg("path", { d: `${path} L ${pts.at(-1)[0]} ${H - B} L ${pts[0][0]} ${H - B} Z`, fill: "url(#g-area)", stroke: "none" }));
    el.append(svg("path", { d: path, fill: "none", stroke: "#ff6b00", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  }
  const [lx, ly] = [x(n - 1), y(ys.at(-1))];
  el.append(svg("circle", { cx: lx, cy: ly, r: 4, fill: "#ff6b00" }));
  el.append(svg("text", { class: "chart-last", x: lx, y: ly - 10, "text-anchor": n === 1 ? "middle" : "end" }, fmt1(ys.at(-1))));
  return el;
}

const niceStep = (raw) => {
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
};

/** Spline Catmull-Rom → Béziers cúbicas. */
function smooth(pts) {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}
