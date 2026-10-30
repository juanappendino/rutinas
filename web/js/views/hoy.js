// Pestaña HOY: rutina del día, sesión activa con series, cronómetro, descanso y registro de series.
import { h, svg, fmt1, trim1, pad2, mmss, weekdayLabel, haptic, storage, reduceMotion } from "../util.js";
import { icon } from "../icons.js";
import { eyebrow, numeral, ring, rule, openSheet, sheetHeader, openAlert, segmented, iconBtn } from "../ui.js";
import {
  state, startWorkout, cancelWorkout, finishWorkout, logSet, toggleSet, overrideNextRoutine, setRestDuration,
} from "../store.js";
import * as L from "../logic.js";
import { stopwatch, rest, onTick, unlockAudio } from "../timers.js";
import { showSessionComplete } from "./resumen.js";

const fmtPlate = (n) => String(Math.round(n * 100) / 100);   // 1.25, no 1.3
let activeExerciseID = null;   // ejercicio elegido a mano (si todavía le quedan series)
let lastUpID = null;           // ejercicio activo en el último dibujo (para llevar la vista hasta el nuevo)
const HINT_KEY = "rutinas:hint-instalar";

export function hoyView() {
  const unsubs = [];
  const routine = L.todayRoutine(state);
  const session = state.activeSession;
  const isActive = Boolean(session);
  const exercises = L.allExercises(routine);
  const totalSets = L.totalSetsOf(routine);
  const doneSets = L.doneSetsOf(state, routine);
  const allDone = totalSets > 0 && doneSets === totalSets;

  if (!isActive) { activeExerciseID = null; lastUpID = null; }
  const next = L.nextActiveExercise(state, routine);
  const picked = activeExerciseID && exercises.find((e) => e.id === activeExerciseID && L.completedSetIndices(state, e).size < e.sets);
  const upID = isActive ? (picked ? picked.id : next?.id ?? null) : null;
  const indexOf = new Map(exercises.map((e, i) => [e.id, i]));

  const root = h("div", { class: "screen-pad" });
  root.append(hero(), isActive ? h("span") : breakNote(), isActive ? h("span") : installHint(), statsStrip());

  routine.muscleGroups.forEach((group) => {
    const doneInGroup = group.exercises.filter((e) => L.isExerciseCompleted(state, e)).length;
    root.append(h("section", { class: "group" },
      rule(group.name, isActive ? `${doneInGroup}/${group.exercises.length}` : null),
      h("div", { class: "list" }, ...group.exercises.map((e) => exerciseRow(e)))));
  });

  const dock = dockBar();
  // Al pasar al ejercicio siguiente, la lista se desplaza sola hasta él
  const prevUp = lastUpID;
  lastUpID = upID;
  if (isActive && upID && upID !== prevUp) {
    const t = setTimeout(() => root.querySelector(".ex.up")?.scrollIntoView({ block: "center", behavior: reduceMotion() ? "auto" : "smooth" }), 80);
    unsubs.push(() => clearTimeout(t));
  }
  return { el: root, dock, destroy: () => unsubs.forEach((u) => u()) };

  // ---- Aviso al volver después de unos días sin entrenar

  function breakNote() {
    const days = L.daysSinceLastSession(state.history);
    if (days == null || days < 10) return h("span");
    return h("div", { class: "hint-card", role: "note" }, h("div", {}, h("b", { text: `Hace ${days} días que no entrenás` }),
      h("p", { text: "Arrancá con ~10% menos de peso que la última vez, dejá 1-2 repeticiones en reserva y subí de a poco." })));
  }

  // ---- Aviso para instalar la app (solo en iPhone/iPad, en el navegador)

  function installHint() {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const installed = navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
    if (!ios || installed || storage.get(HINT_KEY)) return h("span");
    const card = h("div", { class: "hint-card", role: "note" },
      h("div", {}, h("b", { text: "Instalala en tu pantalla de inicio" }),
        h("p", { text: "Compartir → Agregar a pantalla de inicio. Se abre a pantalla completa, funciona sin conexión y iOS no borra tus datos." })),
      h("button", { class: "iconbtn sm", type: "button", "aria-label": "Cerrar aviso", onclick: () => { storage.set(HINT_KEY, "1"); card.remove(); } }, icon("x", 13)));
    return card;
  }

  // ---- Encabezado

  function hero() {
    const el = h("div", { class: `hero${isActive ? " active" : ""}` });
    el.append(h("span", { class: "ghost", "aria-hidden": "true", text: String(routine.dayNumber) }));
    if (!isActive) el.append(h("div", { class: "hero-eyebrow" }, eyebrow(`Rutina de hoy · ${weekdayLabel(Date.now())}`)));

    const numBtn = h("button", { class: "hero-numeral", type: "button", "aria-label": "Elegir otra rutina", disabled: isActive, onclick: () => openRoutinePicker() },
      numeral(routine.dayNumber, routine.variant, isActive ? 42 : 72), isActive ? null : h("span", { class: "swap" }, icon("chevrons", 11)));
    const row = h("div", { class: "hero-row" }, numBtn);

    if (!isActive) {
      const streak = L.currentStreak(state.history);
      row.append(h("div", { class: "hero-info" },
        h("div", { class: "hero-name", text: L.routineName(routine) }),
        h("div", { class: "hero-groups", text: routine.muscleGroups.map((g) => g.name).join(" · ") }),
        h("span", { class: "pill", text: "PRÓXIMA" }),
        streak >= 2 ? h("span", { class: "streak-flame" }, icon("flame", 10), `${streak} días`) : null));
      const mini = miniRing();
      mini.style.marginLeft = "auto";
      row.append(mini);
    } else {
      const elapsed = h("span", { class: "eyebrow dim" });
      const paintElapsed = () => { const m = Math.max(0, Math.floor((Date.now() - session.startedAt) / 60000)); elapsed.textContent = m < 60 ? `· ${m} MIN` : `· ${Math.floor(m / 60)} H ${pad2(m % 60)}`; };
      paintElapsed();
      const iv = setInterval(paintElapsed, 15_000);
      unsubs.push(() => clearInterval(iv));
      row.append(h("div", { class: "in-session" },
        h("div", { class: "inline-row" }, eyebrow("En sesión", "accent"), elapsed),
        h("button", { class: "cancel-pill", type: "button", text: "CANCELAR", onclick: askCancel })));
      const w = watchWidget();
      w.style.marginLeft = "auto";
      row.append(w);
    }
    el.append(row);
    if (isActive) el.append(progressBar());
    return el;
  }

  function miniRing() {
    const r = ring(totalSets ? doneSets / totalSets : 0, { size: 76, line: 4, on: false });
    r.append(h("div", { class: "center" },
      h("div", { class: "big" }, String(doneSets), h("span", { text: `/${totalSets}` })),
      h("div", { class: "small", text: "SERIES" })));
    return r;
  }

  function progressBar() {
    const bar = h("div", { class: "bar" }, h("i", {}));
    bar.firstChild.style.width = totalSets ? `${(doneSets / totalSets) * 100}%` : "0%";
    return h("div", { class: "progress" },
      h("div", { class: "top" }, eyebrow("Progreso", "dim"), h("span", { class: "frac" }, h("b", { text: String(doneSets) }), `/${totalSets}`)), bar);
  }

  function statsStrip() {
    if (isActive || !exercises.length) return h("span");
    const cell = (label, value, unit) => h("div", {}, eyebrow(label, "dim"), h("div", { class: "v" }, value, unit ? h("small", { text: unit }) : null));
    return h("div", { class: "strip" }, cell("Ejercicios", String(exercises.length)), cell("Series", String(totalSets)), cell("Estimado", `~${L.estimatedMinutes(totalSets)}`, "MIN"));
  }

  // ---- Cronómetro compacto (cronómetro / temporizador con preroll 3-2-1)

  function watchWidget() {
    let preroll = null;
    const timers = [];
    const clearPreroll = () => { timers.splice(0).forEach(clearTimeout); preroll = null; };

    const head = h("div", { class: "head" }, h("b", {}), h("i", {}));
    const time = h("div", { class: "time" });
    const dial = buildDial();
    const resetBtn = h("button", { type: "button", "aria-label": "Reiniciar", onclick: onReset });
    const goBtn = h("button", { class: "go", type: "button", "aria-label": "Iniciar o pausar", onclick: () => { unlockAudio(); stopwatch.toggle(); } });
    const wrap = h("div", { class: "watch" }, head, h("div", { class: "row" }, dial.el, time, h("div", { class: "btns" }, resetBtn, goBtn)));
    dial.el.addEventListener("click", onDial);

    function onDial() {
      unlockAudio();
      if (stopwatch.mode === "countdown" && stopwatch.running) { stopwatch.addCountdown(30); haptic("medium"); return; }
      if (preroll != null) return;
      preroll = 3; haptic("light"); paint();
      const step = (n) => timers.push(setTimeout(() => {
        if (preroll == null) return;
        if (n > 1) { preroll = n - 1; haptic("light"); paint(); step(n - 1); }
        else { preroll = null; stopwatch.startCountdown(30); haptic("heavy"); paint(); }
      }, 1000));
      step(3);
    }
    function onReset() {
      if (preroll != null) { clearPreroll(); paint(); }
      else if (stopwatch.mode === "countdown") stopwatch.switchToStopwatch();
      else stopwatch.reset();
    }

    function paint() {
      const isTimer = stopwatch.mode === "countdown";
      const pre = preroll != null;
      const hint = pre ? `empieza en ${preroll}…` : isTimer ? (stopwatch.running ? "+30s al tocar" : "listo") : stopwatch.running ? "corriendo" : stopwatch.totalSeconds > 0 ? "pausado" : "";
      wrap.classList.toggle("timer", isTimer || pre);
      head.firstChild.textContent = isTimer || pre ? "TEMPORIZADOR" : "CRONÓMETRO";
      head.lastChild.textContent = hint;
      time.textContent = pre ? "0:30" : mmss(stopwatch.displaySeconds);
      resetBtn.replaceChildren(icon(isTimer || pre ? "x" : "reset", 10));
      goBtn.replaceChildren(icon(stopwatch.running ? "pause" : "play", 11));
      goBtn.disabled = isTimer || pre;
      dial.paint({ preroll, isTimer, progress: stopwatch.progress, seconds: stopwatch.totalSeconds });
    }
    paint();
    unsubs.push(onTick(paint), () => clearPreroll());
    return wrap;
  }

  function buildDial() {
    const el = h("div", { class: "dial", role: "button", "aria-label": "Temporizador de 30 segundos" });
    const S = 44, R = 22;
    const ticks = svg("g");
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0;
      const a = (i * 6 * Math.PI) / 180;
      const outer = R - 2, inner = major ? R - 8 : R - 5;
      ticks.append(svg("line", {
        x1: R + Math.sin(a) * outer, y1: R - Math.cos(a) * outer, x2: R + Math.sin(a) * inner, y2: R - Math.cos(a) * inner,
        stroke: major ? "#666666" : "rgba(58,58,58,.45)", "stroke-width": major ? 1.5 : 0.8, "stroke-linecap": "round",
      }));
    }
    const circ = 2 * Math.PI * (R - 1.25);
    const arc = svg("circle", { class: "arc", cx: R, cy: R, r: R - 1.25, fill: "none", stroke: "#ff6b00", "stroke-width": 2.5, "stroke-linecap": "round", "stroke-dasharray": circ, "stroke-dashoffset": 0 });
    arc.setAttribute("transform", `rotate(-90 ${R} ${R})`);
    const hand = svg("g", { class: "hand" }, svg("line", { x1: R, y1: R, x2: R, y2: R - 14, stroke: "#ff6b00", "stroke-width": 1.5, "stroke-linecap": "round" }));
    const count = h("div", { class: "count" });
    el.append(svg("svg", { viewBox: `0 0 ${S} ${S}`, width: S, height: S },
      ticks, svg("circle", { cx: R, cy: R, r: R - 0.5, fill: "none", stroke: "#2a2a2a", "stroke-width": 1 }), arc, hand, svg("circle", { cx: R, cy: R, r: 2, fill: "#ff6b00" })), count);
    let lastAngle = 0;
    return {
      el,
      paint({ preroll, isTimer, progress, seconds }) {
        count.textContent = preroll != null ? String(preroll) : "";
        count.hidden = preroll == null;
        arc.style.display = preroll == null && isTimer ? "" : "none";
        hand.style.display = preroll == null && !isTimer ? "" : "none";
        arc.setAttribute("stroke-dashoffset", String(circ * progress));
        const angle = seconds * 6;
        hand.style.transition = angle < lastAngle ? "none" : "";
        hand.style.transform = `rotate(${angle}deg)`;
        lastAngle = angle;
      },
    };
  }

  // ---- Fila de ejercicio

  function exerciseRow(exercise) {
    const completed = L.completedSetIndices(state, exercise);
    const isUp = isActive && upID === exercise.id;
    const isDone = L.isExerciseCompleted(state, exercise);
    const sessionWeight = session?.weightLog[exercise.id] ?? null;
    const lastW = L.lastWeight(state, exercise);
    const lastR = L.lastReps(state, exercise);
    const nextSet = [...Array(exercise.sets).keys()].find((i) => !completed.has(i));

    const el = h("div", { class: `ex${isDone ? " done" : ""}${isUp ? " up" : ""}${isActive && !isUp && !isDone ? " dim" : ""}`, role: isActive ? "button" : null, tabindex: isActive ? "0" : null });
    const name = h("div", { class: "name" }, h("span", { text: exercise.name }));
    if (exercise.description) name.append(h("button", { class: "info", type: "button", "aria-label": `Cómo se hace ${exercise.name}`, onclick: (e) => { e.stopPropagation(); openDescription(exercise); } }, icon("info", 15)));
    const head = h("div", { class: "name-row" }, name,
      isDone ? h("span", { class: "done-ico" }, icon("check", 16)) : h("span", { class: "frac", text: `${completed.size}/${exercise.sets}` }));

    const sub = h("div", { class: "sub" },
      h("span", {}, h("span", { text: String(exercise.sets) }), h("span", { class: "x", text: " × " }), h("span", { text: lastR != null ? String(lastR) : exercise.reps })));
    if (sessionWeight != null || lastW != null) {
      sub.append(h("span", { class: "dot" }));
      if (sessionWeight != null) {
        sub.append(h("button", { class: "cur", type: "button", text: `${fmt1(sessionWeight)} KG`, onclick: (e) => { e.stopPropagation(); openSetLog(exercise, nextSet ?? 0); } }));
      } else sub.append(h("span", { class: "prev", text: `${fmt1(lastW)} KG · ANT` }));
    }
    const body = h("div", { class: "body" }, head, sub);
    if (isUp) body.append(setButtons(exercise, completed, nextSet));
    el.append(h("span", { class: "idx", text: pad2((indexOf.get(exercise.id) ?? 0) + 1) }), body);
    if (isActive) {
      const activate = () => { activeExerciseID = exercise.id; rerender(); };
      el.addEventListener("click", activate);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } });
    }
    return el;
  }

  function setButtons(exercise, completed, nextSet) {
    return h("div", { class: "sets" }, ...[...Array(exercise.sets).keys()].map((i) => {
      const done = completed.has(i);
      const isNext = i === nextSet;
      const btn = h("button", { type: "button", class: `${done ? "done" : isNext ? "next" : "later"}`, "aria-label": `Serie ${i + 1}${done ? " completada" : ""}`, onclick: (e) => { e.stopPropagation(); onSetTap(exercise, i, completed, btn); } },
        done ? icon("check", 13) : String(i + 1));
      return btn;
    }));
  }

  function onSetTap(exercise, i, completed, btn) {
    unlockAudio();
    if (completed.has(i)) { toggleSet(i, exercise); haptic("light"); return; }
    if (![...Array(i).keys()].every((j) => completed.has(j))) { haptic("light"); return; }
    if (i === 0) { openSetLog(exercise, 0); return; }
    const willComplete = completed.size + 1 === exercise.sets;
    toggleSet(i, exercise);
    rest.start(willComplete ? state.restDuration : 25);
    haptic(willComplete ? "success" : "heavy");
  }

  // ---- Barra inferior: descanso + botón principal

  function dockBar() {
    const box = h("div", { class: "dock dock-stack" });
    if (rest.running) box.append(restBanner());
    if (!isActive) box.append(h("button", { class: "btn-primary", type: "button", text: "Empezar entrenamiento", onclick: () => { unlockAudio(); startWorkout(); } }));
    else if (allDone) box.append(h("button", { class: "btn-primary", type: "button", text: "Finalizar entrenamiento", onclick: askFinish }));
    else box.append(h("button", { class: "btn-dock-ghost", type: "button", onclick: askFinish }, h("span", { class: "l", text: "FINALIZAR" }), h("span", { class: "sep" }), h("span", { class: "r", text: `${doneSets}/${totalSets}` })));
    return box;
  }

  function restBanner() {
    const chips = [[30, "30S"], [45, "45S"], [60, "1M"], [90, "1M30"], [120, "2M"]];
    const time = h("div", { class: "time" });
    const r = ring(rest.progress, { size: 44, line: 4, on: true });
    const el = h("div", { class: "rest" },
      h("div", { class: "row" }, r, h("div", {}, eyebrow("Descansando"), time),
        h("button", { class: "skip", type: "button", text: "SALTAR", onclick: () => rest.skip() })),
      h("div", { class: "chips" }, ...chips.map(([s, label]) => h("button", { class: "chip sm", type: "button", text: label, "aria-pressed": String(state.restDuration === s), onclick: () => { setRestDuration(s); rest.start(s); } }))));
    const paint = () => { time.textContent = mmss(rest.secondsRemaining); r.setProgress(rest.progress); if (!rest.running) rerender(); };
    paint();
    unsubs.push(onTick(paint));
    return el;
  }

  // ---- Alertas y hojas

  function askFinish() {
    openAlert({
      title: "¿Finalizar entrenamiento?",
      buttons: [
        { label: "Finalizar", action: () => { const summary = finishWorkout(); rest.skip(); stopwatch.reset(); if (summary) showSessionComplete(summary); } },
        { label: "Cancelar", cancel: true },
      ],
    });
  }

  function askCancel() {
    openAlert({
      title: "¿Cancelar entrenamiento?",
      buttons: [
        { label: "Cancelar entrenamiento", destructive: true, action: () => { cancelWorkout(); rest.skip(); stopwatch.reset(); } },
        { label: "Seguir", cancel: true },
      ],
    });
  }

  function openRoutinePicker() {
    const nextID = L.nextWorkout(state).id;
    openSheet((close) => ({
      header: sheetHeader("Elegir rutina", close, { tight: true }),
      body: h("div", { class: "list" }, ...L.activeRoutines(state.routines).map((r) => h("button", {
        class: "row-link", type: "button", onclick: () => { overrideNextRoutine(r); close(); },
      }, numeral(r.dayNumber, r.variant, 44),
      h("div", { class: "mid" }, h("div", { class: "title", text: L.routineName(r) }), h("div", { class: "meta" }, h("span", { class: "t", text: `${L.allExercises(r).length} ejercicios · ${r.muscleGroups.map((g) => g.name).join(" · ")}` }))),
      r.id === nextID ? h("span", { class: "pill on", text: "SIGUIENTE" }) : null))),
    }));
  }
}

// Se redibuja con el router cuando cambia el estado; este gancho lo asigna app.js.
let rerender = () => {};
export const setRerender = (fn) => { rerender = fn; };

function openDescription(exercise) {
  openSheet((close) => ({
    header: sheetHeader(exercise.name, close, { tight: true }),
    body: h("p", { class: "desc-text", text: exercise.description }),
  }));
}

// ---- Registro de una serie

export function openSetLog(exercise, setIndex) {
  const sessionType = L.setTypeFor(state, exercise);
  const sessionWeight = state.activeSession?.weightLog[exercise.id] ?? null;
  const lastW = L.lastWeight(state, exercise);
  const lastR = L.lastReps(state, exercise);
  const lastD = L.lastDistance(state, exercise);
  const maxKg = (() => { const v = L.weightHistory(state, exercise).map((p) => p.kg); return v.length ? Math.max(...v) : null; })();

  const w0 = sessionWeight ?? lastW;
  const f = {
    mode: sessionType === "time" ? "time" : "weightReps",
    weightStr: w0 != null ? trim1(w0) : "0",
    reps: Math.max(1, lastR ?? L.defaultReps(exercise.reps)),
    min: 0, sec: 30,
    distStr: lastD != null ? trim1(lastD) : "",
    perSide: false,
  };
  const raw = () => parseFloat(f.weightStr.replace(",", ".")) || 0;
  const total = () => (f.perSide ? raw() * 2 : raw());
  const timeSecs = () => f.min * 60 + f.sec;

  const body = h("div", {});
  const footBtn = h("button", { class: "btn-primary", type: "button", text: "Confirmar serie", onclick: confirm });
  const sheetRef = openSheet((close) => {
    f.close = close;
    return {
      header: h("div", { class: "sheet-head tight" },
        h("div", {}, eyebrow(`Serie ${setIndex + 1}`), h("h2", { text: exercise.name })),
        iconBtn("x", "Cerrar", close, "sm", 14)),
      body,
      footer: h("div", { class: "sheet-foot" }, footBtn),
    };
  }, { elevated: true });
  paint();
  return sheetRef;

  function paint() {
    body.replaceChildren();
    if (lastW != null && f.mode !== "time") body.append(lastBlock());
    body.append(h("div", { class: "setmode" }, segmented(["REPS", "TIEMPO"], f.mode === "time" ? 1 : 0, (i) => { f.mode = i === 1 ? "time" : "weightReps"; paint(); })));
    body.append(f.mode === "time" ? timeContent() : weightContent());
  }

  function lastBlock() {
    const last = f.perSide ? lastW / 2 : lastW;
    const delta = total() - lastW;
    const above = delta > 0.01, below = delta < -0.01;
    const pr = maxKg != null && total() > maxKg + 0.01;
    const cls = pr || above ? "up" : below ? "down" : "";
    const text = pr ? "NUEVO PR" : above ? `+${fmt1(delta)} kg` : below ? `${fmt1(delta)} kg` : "igual";
    const ic = pr ? "trophy" : above ? "arrow-up" : below ? "arrow-down" : "equal";
    return h("div", { class: `last${pr ? " pr" : ""}` },
      h("div", {}, h("div", { class: "inline-row" }, eyebrow("Última vez", "dim"), f.perSide ? h("span", { class: "eyebrow accent", text: "· POR LADO" }) : null),
        h("div", { class: "v" }, h("b", { text: fmt1(last) }), h("span", { text: "kg" }), lastR != null ? h("em", { text: `· ${lastR} reps` }) : null)),
      h("span", { class: `delta ${cls}` }, icon(ic, 12), text));
  }

  function weightContent() {
    const frag = h("div", {});
    const num = h("b", { class: raw() > 0 ? "" : "empty", text: f.weightStr });
    frag.append(h("div", { class: "bigval" },
      h("button", { class: "adjust", type: "button", text: "−2.5", onclick: () => adjust(-2.5) }),
      h("div", { class: "n" }, num, h("div", {}, h("span", { class: `unit${f.perSide ? " accent" : ""}`, text: f.perSide ? "KG/LADO" : "KG" }), raw() === 0 ? h("span", { class: "hint", text: "opcional" }) : null)),
      h("button", { class: "adjust", type: "button", text: "+2.5", onclick: () => adjust(2.5) })));
    const pl = /barra/i.test(exercise.name) ? L.platesPerSide(total()) : null;
    if (pl) frag.append(h("p", { class: "plates", text: `Discos por lado: ${pl.plates.map(fmtPlate).join(" · ")}${pl.leftover ? ` (sobran ${fmtPlate(pl.leftover)} kg)` : ""} · barra ${L.BAR_KG} kg` }));
    frag.append(h("div", { class: "numpad" }, ...["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map((k) =>
      h("button", { type: "button", "aria-label": k === "del" ? "Borrar" : k, onclick: () => tap(k) }, k === "del" ? icon("backspace", 18) : k))));
    frag.append(h("button", { class: "checkrow", type: "button", "aria-pressed": String(f.perSide), onclick: togglePerSide },
      h("span", { class: "box" }, f.perSide ? icon("check", 11) : null), h("span", { text: "Por lado" }),
      f.perSide && raw() > 0 ? h("small", { text: `→ ${fmt1(total())} kg total` }) : null));
    frag.append(h("div", { class: "rowfield" }, eyebrow("Reps"), h("div", { class: "stepper sm" },
      h("button", { type: "button", "aria-label": "Menos reps", onclick: () => { if (f.reps > 1) { f.reps--; paint(); } } }, icon("minus", 12)),
      h("span", { class: "v", text: String(f.reps) }),
      h("button", { type: "button", "aria-label": "Más reps", onclick: () => { f.reps++; paint(); } }, icon("plus", 12)))));
    return frag;
  }

  function timeContent() {
    const frag = h("div", {});
    const presets = [[0, 30, "30S"], [1, 0, "1M"], [2, 0, "2M"], [5, 0, "5M"], [10, 0, "10M"]];
    frag.append(h("div", { class: "timechips" }, ...presets.map(([m, s, label]) =>
      h("button", { class: "chip", type: "button", text: label, "aria-pressed": String(f.min === m && f.sec === s), onclick: () => { f.min = m; f.sec = s; paint(); } }))));
    frag.append(h("div", { class: "timeread" }, h("b", { text: String(f.min) }), h("span", { text: "MIN" }), h("b", { class: f.sec > 0 ? "" : "zero", text: pad2(f.sec) }), h("span", { text: "SEG" })));
    const stepper = (label, value, dec, inc) => h("div", { class: "card" }, eyebrow(label),
      h("div", { class: "stepper" }, h("button", { type: "button", "aria-label": `Menos ${label}`, onclick: dec }, icon("minus", 13)), h("span", { class: "v", text: value }), h("button", { type: "button", "aria-label": `Más ${label}`, onclick: inc }, icon("plus", 13))));
    frag.append(h("div", { class: "twocol" },
      stepper("Minutos", String(f.min), () => { if (f.min > 0) { f.min--; paint(); } }, () => { f.min++; paint(); }),
      stepper("Segundos", pad2(f.sec),
        () => { if (f.sec >= 15) f.sec -= 15; else if (f.min > 0) { f.min--; f.sec = 45; } paint(); },
        () => { const n = f.sec + 15; if (n >= 60) { f.min++; f.sec = n - 60; } else f.sec = n; paint(); })));
    const dist = parseFloat(f.distStr);
    const step = (d) => { const v = Math.max(0, (parseFloat(f.distStr) || 0) + d); f.distStr = trim1(v); paint(); };
    const box = h("div", { class: "distance" },
      h("div", { class: "row" }, eyebrow("Distancia (km)"), h("div", { class: "ctl" },
        h("button", { type: "button", "aria-label": "Menos distancia", onclick: () => step(-0.5) }, icon("minus", 12)),
        h("span", { class: `v${f.distStr ? "" : " empty"}`, text: f.distStr || "—" }),
        h("button", { type: "button", "aria-label": "Más distancia", onclick: () => step(0.5) }, icon("plus", 12)))));
    if (dist > 0 && timeSecs() > 0) box.append(h("div", { class: "speed" }, icon("speedometer", 11), `${fmt1(dist / (timeSecs() / 3600))} km/h`));
    frag.append(box);
    return frag;
  }

  function adjust(d) { f.weightStr = trim1(Math.max(0, raw() + d)); paint(); }

  function togglePerSide() {
    const cur = raw();
    f.perSide = !f.perSide;
    if (cur > 0) f.weightStr = trim1(f.perSide ? cur / 2 : cur * 2);
    paint();
  }

  function tap(key) {
    if (key === "del") f.weightStr = f.weightStr.length > 1 ? f.weightStr.slice(0, -1) : "0";
    else if (key === ".") { if (!f.weightStr.includes(".")) f.weightStr += "."; }
    else {
      const cand = f.weightStr === "0" ? key : f.weightStr + key;
      const dot = cand.indexOf(".");
      if (dot >= 0 && cand.length - dot - 1 > 1) return;
      if (parseFloat(cand) < 1000) f.weightStr = cand;
    }
    paint();
  }

  function confirm() {
    const willComplete = L.completedSetIndices(state, exercise).size + 1 === exercise.sets;
    const dist = parseFloat(f.distStr);
    logSet(setIndex, exercise, {
      type: f.mode,
      weight: total() > 0 ? total() : null,
      reps: f.mode === "time" ? null : f.reps,
      time: f.mode === "time" ? timeSecs() : null,
      distance: f.mode === "time" && Number.isFinite(dist) ? dist : null,
    });
    rest.start(willComplete ? state.restDuration : 25);
    haptic(willComplete ? "success" : "heavy");
    f.close();
  }
}
