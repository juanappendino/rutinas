// Arranque: carga el estado, arma el router por hash (#/hoy, #/rutinas, #/rutinas/:id, #/log, #/ejercicio/:id) y la barra de pestañas.
import { $, h } from "./util.js";
import { icon } from "./icons.js";
import { load, state, subscribe, saveNow } from "./store.js";
import { hoyView, setRerender } from "./views/hoy.js";
import { rutinasView } from "./views/rutinas.js";
import { rutinaView } from "./views/rutina.js";
import { logView } from "./views/log.js";
import { ejercicioView } from "./views/ejercicio.js";
import { onboardingView } from "./views/onboarding.js";
import { unlockAudio } from "./timers.js";
import { closeAllSheets } from "./ui.js";
import { startSync, parseCode } from "./sync.js";
import { askJoin } from "./views/sincro.js";
import { startComeback } from "./comeback.js";

const TABS = [
  { id: "hoy", label: "HOY", href: "#/hoy" },
  { id: "rutinas", label: "RUTINAS", href: "#/rutinas" },
  { id: "log", label: "LOG", href: "#/log" },
];

let current = null;      // vista montada ({el, dock?, destroy?})
let currentKey = null;   // ruta de la vista montada, para conservar el scroll al redibujar la misma
let lastTab = "hoy";
let queued = false;

function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const [a, b] = parts;
  if (a === "rutinas" && b) return { name: "rutina", tab: "rutinas", id: b, key: `rutina/${b}` };
  if (a === "ejercicio" && b) return { name: "ejercicio", tab: lastTab, id: b, key: `ejercicio/${b}` };
  if (a === "rutinas") return { name: "rutinas", tab: "rutinas", key: "rutinas" };
  if (a === "log") return { name: "log", tab: "log", key: "log" };
  return { name: "hoy", tab: "hoy", key: "hoy" };
}

function mount(view, route, keepScroll) {
  const screen = $("screen");
  const scrollTop = keepScroll ? screen.scrollTop : 0;
  current?.destroy?.();
  current = view;
  screen.replaceChildren(view.el);
  if (!keepScroll) view.el.classList.add("view-in");   // entrada suave al cambiar de pantalla (no al redibujar la misma)
  $("dock").replaceChildren(...(view.dock ? [view.dock] : []));
  screen.scrollTop = scrollTop;
  currentKey = route.key;
}

function render() {
  queued = false;
  const tabbar = $("tabbar");
  if (!state.hasOnboarded) {
    tabbar.hidden = true;
    mount(onboardingView(), { key: "onboarding" }, false);
    return;
  }
  tabbar.hidden = false;
  const route = parseRoute();
  if (route.name !== "ejercicio") lastTab = route.tab;
  const keep = currentKey === route.key;
  const ctx = { rerender: scheduleRender };
  const view = route.name === "hoy" ? hoyView()
    : route.name === "rutinas" ? rutinasView(ctx)
    : route.name === "rutina" ? rutinaView(route.id, ctx)
    : route.name === "log" ? logView(ctx)
    : ejercicioView(route.id);
  mount(view, route, keep);
  for (const a of tabbar.querySelectorAll("a")) {
    if (a.dataset.tab === route.tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  }
}

function scheduleRender() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(render);
}

function buildTabbar() {
  const bar = $("tabbar");
  bar.replaceChildren(...TABS.map((t) => h("a", { class: "tab", href: t.href, "data-tab": t.id }, icon(t.id, 20), h("span", { text: t.label }))));
}

load();
setRerender(scheduleRender);
subscribe(scheduleRender);
buildTabbar();
// #espacio=<código>: link de invitación de otro dispositivo
function handleInvite() {
  const code = location.hash.startsWith("#espacio=") ? parseCode(location.hash) : null;
  if (!code) return false;
  history.replaceState(null, "", `${location.pathname}${location.search}#/hoy`);
  askJoin(code);
  return true;
}
window.addEventListener("hashchange", () => { if (!handleInvite()) { closeAllSheets(); render(); } });
document.addEventListener("pointerdown", unlockAudio, { once: true });
window.addEventListener("pagehide", saveNow);
startSync();
render();
startComeback();
// Pide al navegador que no borre los datos si hace falta liberar espacio
try { navigator.storage?.persist?.(); } catch { /* sin soporte */ }
handleInvite();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => { /* sin offline: la app anda igual con conexión */ });
}
