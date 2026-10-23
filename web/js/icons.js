// Íconos de línea (24×24, trazo redondeado), dibujados acá para no depender de ningún recurso externo.
// Una entrada es una lista de formas: un string es el `d` de un <path> de trazo; {d, fill} path relleno ({cut}: trazo oscuro encima);
// {c:[cx,cy,r]} círculo; {r:[x,y,w,h,rx]} rectángulo; ambos con {fill:true} salen rellenos.
import { svg } from "./util.js";

const I = {
  hoy: [{ c: [12, 4.5, 2] }, "M12 7.5v6.5m0 0-3.5 6m3.5-6 3.5 6", "M2.5 8h19M4.5 5.5v5M19.5 5.5v5M7 6.8v2.4M17 6.8v2.4"],
  rutinas: [{ r: [5.5, 4, 13, 17, 2.5] }, "M9 4V2.8h6V4", "M9.5 10h5M9.5 14h5M9.5 18h3"],
  log: [{ r: [3.5, 5, 17, 15.5, 2.5] }, "M3.5 10h17M8 3v4M16 3v4", "M8 14h.01M12 14h.01M16 14h.01M8 17.3h.01M12 17.3h.01"],
  info: [{ c: [12, 12, 9] }, "M12 11v5.5M12 7.9h.01"],
  "chevron-right": ["m9 5 7 7-7 7"],
  "chevron-left": ["m15 5-7 7 7 7"],
  "chevron-up": ["m5 15 7-7 7 7"],
  "chevron-down": ["m5 9 7 7 7-7"],
  chevrons: ["m8 9 4-4 4 4M8 15l4 4 4-4"],
  x: ["M6 6l12 12M18 6 6 18"],
  check: ["m5 12.5 4.5 4.5L19 7.5"],
  plus: ["M12 5v14M5 12h14"],
  minus: ["M5 12h14"],
  pencil: ["M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z", "m13.5 6.5 4 4"],
  trash: ["M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"],
  sort: ["M8 4v16M4 8l4-4 4 4M16 20V4m-4 12 4 4 4-4"],
  share: ["M12 15V3m-4 4 4-4 4 4", "M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"],
  play: [{ d: "M8 5.5v13l11-6.5z", fill: true }],
  pause: [{ r: [6.5, 5, 3.6, 14, 1], fill: true }, { r: [13.9, 5, 3.6, 14, 1], fill: true }],
  reset: ["M4 12a8 8 0 1 0 2.6-5.9", "M4 4v4.5h4.5"],
  search: [{ c: [11, 11, 6.5] }, "m16 16 4.5 4.5"],
  flame: [{ d: "M12 21c-3.6 0-6-2.5-6-6 0-2.6 1.6-4.2 2.8-5.6C10 8 10.6 6.6 10.5 4c3.2 1.6 5 4.4 5 7.2.9-.6 1.4-1.5 1.5-2.7 1.2 1.5 1.5 3.2 1.5 5.2 0 3.6-2.5 7.3-6.5 7.3z", fill: true }],
  bolt: [{ d: "M13 2.5 5 13.5h6l-1 8 8-11h-6z", fill: true }],
  dumbbell: ["M2.5 12h2M19.5 12h2M4.5 8v8M7.5 6v12M16.5 6v12M19.5 8v8M7.5 12h9"],
  star: [{ d: "m12 3 2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z", fill: true }],
  run: [{ c: [15, 4.5, 2], fill: true }, "m8 21 3.2-5.2 3 .7M11.2 15.8l-1-4.6 4.6-1.4 2.7 3.6 3-.2M10.2 11.2 7.5 12.5l-2.5-1"],
  seal: [{ d: "M12 2.5l2.4 1.8 3-.2 1 2.8 2.6 1.7-.9 2.9.9 2.9-2.6 1.7-1 2.8-3-.2L12 21.5l-2.4-1.8-3 .2-1-2.8L3 15.4l.9-2.9L3 9.6l2.6-1.7 1-2.8 3 .2z", fill: true }, { d: "m8.7 12.2 2.4 2.4 4.3-4.6", cut: true }],
  speedometer: [{ c: [12, 13, 8.5] }, "m12 13 3.5-3.5M12 4.5v1.6M3.5 13h1.6M18.9 13h1.6"],
  trophy: ["M7 4h10v5a5 5 0 0 1-10 0z", "M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8.5 20h7"],
  equal: ["M5 9h14M5 15h14"],
  "arrow-up": ["M12 19V5m-6 6 6-6 6 6"],
  "arrow-down": ["M12 5v14m-6-6 6 6 6-6"],
  backspace: ["M20 5H9L3 12l6 7h11z", "m12.5 9.5 5 5m0-5-5 5"],
  chart: ["M3 17l6-6 4 4 8-9", "M15 6h6v6"],
  archive: [{ r: [3, 4, 18, 4.5, 1] }, "M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5M10 12.5h4"],
  undo: ["M9 14 4 9l5-5", "M4 9h10.5a5.5 5.5 0 0 1 0 11H11"],
  dots: [{ c: [5, 12, 1.2], fill: true }, { c: [12, 12, 1.2], fill: true }, { c: [19, 12, 1.2], fill: true }],
  grip: ["M5 8h14M5 12h14M5 16h14"],
  down: ["M12 4v12m-4.5-4.5L12 16l4.5-4.5", "M5 20h14"],
  up: ["M12 16V4m-4.5 4.5L12 4l4.5 4.5", "M5 20h14"],
  list: ["M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"],
};

/** Ícono por nombre; toma el color del texto (currentColor). */
export function icon(name, size = 18) {
  const el = svg("svg", { class: "ic", viewBox: "0 0 24 24", width: size, height: size, "aria-hidden": "true", focusable: "false" });
  const line = { fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" };
  const solid = { fill: "currentColor", stroke: "currentColor", "stroke-width": 1.5, "stroke-linejoin": "round" };
  for (const s of I[name] ?? []) {
    if (typeof s === "string") el.append(svg("path", { d: s, ...line }));
    else if (s.d) el.append(svg("path", { d: s.d, ...(s.cut ? { ...line, class: "ic-cut" } : s.fill ? solid : line) }));
    else if (s.c) el.append(svg("circle", { cx: s.c[0], cy: s.c[1], r: s.c[2], ...(s.fill ? { fill: "currentColor" } : line) }));
    else if (s.r) el.append(svg("rect", { x: s.r[0], y: s.r[1], width: s.r[2], height: s.r[3], rx: s.r[4], ...(s.fill ? { fill: "currentColor" } : line) }));
  }
  return el;
}
