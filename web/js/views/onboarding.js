// Primera pantalla: armar una rutina propia, usar la plantilla incluida o traer los datos de la app iOS.
import { h } from "../util.js";
import { icon } from "../icons.js";
import { eyebrow, menuSheet } from "../ui.js";
import { clearDefaultsAndAdd, finishOnboarding } from "../store.js";
import { openCatalogPicker } from "./rutinas.js";
import { pickFile, openPaste } from "./datos.js";

export function onboardingView() {
  const option = (cls, iconName, title, sub, onclick) => h("button", { class: `opt ${cls}`.trim(), type: "button", onclick },
    h("span", { class: "ico" }, icon(iconName, 20)), h("span", { class: "mid" }, h("b", { text: title }), h("span", { text: sub })), h("span", { class: "chev" }, icon("chevron-right", 14)));

  const el = h("div", { class: "onb" },
    h("div", { class: "brand" }, eyebrow("RUT1NAS"), h("h1", { text: "Tu herramienta\nde entrenamiento." }), h("p", { text: "Sin ruido. Sin planes mágicos.\nAnotá, superáte, repetí." })),
    h("div", { class: "opts" },
      option("accent", "plus", "Armar mi rutina", "Creo mi programa desde cero", () => openCatalogPicker((r) => { clearDefaultsAndAdd(r); finishOnboarding(); }, { eyebrowText: "Tu primera rutina" })),
      option("", "list", "Usar plantilla incluida", "Push / Pull / Legs · 6 días · editable", () => finishOnboarding()),
      option("", "up", "Traer mis datos de la app", "Importar la copia de la app de iPhone", () => menuSheet("Importar datos", [
        { label: "Importar archivo…", sub: "Copia JSON o historial CSV", icon: "up", action: pickFile },
        { label: "Pegar copia…", sub: "Si la copiaste como texto", icon: "pencil", action: openPaste },
      ]))));
  return { el };
}
