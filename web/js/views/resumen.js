// Pantalla "Sesión completa": duración, series, ejercicio más pesado y nuevos récords.
import { h, fmt1, longDayLabel, haptic } from "../util.js";
import { eyebrow, numeral } from "../ui.js";
import { icon } from "../icons.js";

export function showSessionComplete(summary) {
  let step = 0;
  const reveal = (el, delay = 0.05 * ++step * 2) => { el.classList.add("reveal"); el.style.animationDelay = `${delay}s`; return el; };
  const stat = (label, value, unit = "") => h("div", { class: "stat" }, eyebrow(label, "dim"), h("div", { class: "v" }, value, unit ? h("span", { class: "u", text: unit }) : null));

  const title = h("div", {},
    reveal(h("div", { class: "t1", text: "SESIÓN COMPLETA" }), 0.05),
    reveal(h("div", { class: "t2" }, numeral(summary.dayNumber, summary.variant, 56), h("span", { text: longDayLabel(summary.sessionDate).toLowerCase() })), 0.1),
    summary.muscleGroupNames.length ? reveal(h("div", { class: "t3", text: summary.muscleGroupNames.join(" · ") }), 0.15) : null);

  const stats = h("div", { class: "stats" },
    reveal(h("div", { class: "pair" },
      stat("Duración", summary.durationMinutes > 0 ? String(summary.durationMinutes) : "—", summary.durationMinutes > 0 ? "MIN" : ""),
      stat("Series", String(summary.totalSets))), 0.18));

  if (summary.heaviest) {
    stats.append(reveal(h("div", { class: "heavy" },
      h("div", {}, eyebrow("Más pesado", "dim"), h("div", { class: "n", text: summary.heaviest.name })),
      h("div", { class: "k" }, fmt1(summary.heaviest.kg), h("span", { text: "KG" }))), 0.3));
  }
  if (summary.newPRs.length) {
    stats.append(reveal(h("div", { class: "prs" },
      h("div", { class: "h" }, icon("star", 11), eyebrow(summary.newPRs.length === 1 ? "Nuevo PR" : `${summary.newPRs.length} nuevos PRs`, "accent")),
      h("ul", {}, ...summary.newPRs.map((pr) => h("li", {}, h("span", { text: pr.name }),
        pr.name.includes(" · ") ? null : h("b", {}, fmt1(pr.kg), h("small", { text: " KG" })))))), 0.36));
  }

  const overlay = h("div", { class: "complete", role: "dialog", "aria-modal": "true", "aria-label": "Sesión completa" },
    h("div", { class: "stack" }, title, stats),
    reveal(h("button", { class: "btn-primary", type: "button", text: "Listo", onclick: () => overlay.remove() }), 0.5));
  document.body.append(overlay);
  haptic("success");
  overlay.querySelector("button").focus();
}
