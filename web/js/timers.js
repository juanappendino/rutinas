// Cronómetro/temporizador y descanso entre series (port de StopwatchTimer.swift y RestTimer.swift).
// Ambos cuentan con marcas de tiempo (no con un contador de ticks), así que siguen bien si la pestaña pasa a segundo plano.
import { haptic } from "./util.js";

let audioCtx = null;

/** Hay que crear el AudioContext dentro de un gesto del usuario para que iOS lo deje sonar después. */
export function unlockAudio() {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch { /* sin audio */ }
}

export function beep() {
  haptic("success");
  if (!audioCtx) return;
  try {
    const t0 = audioCtx.currentTime;
    for (const [i, freq] of [880, 1175].entries()) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.18 + 0.16);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0 + i * 0.18);
      osc.stop(t0 + i * 0.18 + 0.18);
    }
  } catch { /* sin audio */ }
}

// Mantiene la pantalla encendida mientras corre algún temporizador (equivale a isIdleTimerDisabled).
let wakeLock = null;
async function setAwake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch { /* el navegador puede negarlo */ }
}

const listeners = new Set();
let ticker = null;

/** Se llama en cada tick (4 veces por segundo mientras algo corre) y en cada cambio de estado. */
export const onTick = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => { for (const fn of listeners) fn(); };

function refreshTicker() {
  const needed = stopwatch.running || rest.running;
  if (needed && !ticker) ticker = setInterval(() => { stopwatch.sync(); rest.sync(); emit(); }, 250);
  if (!needed && ticker) { clearInterval(ticker); ticker = null; }
  setAwake(needed);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { stopwatch.sync(); rest.sync(); emit(); if (stopwatch.running || rest.running) setAwake(true); }
  });
}

class Stopwatch {
  mode = "stopwatch";          // "stopwatch" | "countdown"
  running = false;
  countdownTarget = 0;         // segundos objetivo en modo countdown
  #accumulatedMs = 0;
  #resumeAt = 0;

  get totalSeconds() {
    const ms = this.#accumulatedMs + (this.running ? Date.now() - this.#resumeAt : 0);
    return Math.floor(ms / 1000);
  }
  get displaySeconds() { return this.mode === "countdown" ? Math.max(0, this.countdownTarget - this.totalSeconds) : this.totalSeconds; }
  get progress() { return this.mode === "countdown" && this.countdownTarget > 0 ? this.totalSeconds / this.countdownTarget : 0; }
  get isFinished() { return this.mode === "countdown" && this.countdownTarget > 0 && this.totalSeconds >= this.countdownTarget; }

  toggle() { this.running ? this.#pause() : this.#resume(); }
  reset() { this.running = false; this.#accumulatedMs = 0; refreshTicker(); emit(); }
  startCountdown(seconds) { this.reset(); this.mode = "countdown"; this.countdownTarget = seconds; this.#resume(); }
  switchToStopwatch() { this.reset(); this.mode = "stopwatch"; this.countdownTarget = 0; emit(); }
  addCountdown(seconds) { if (this.mode === "countdown") { this.countdownTarget += seconds; emit(); } }

  /** Detecta el fin de la cuenta regresiva (también al volver de segundo plano). */
  sync() {
    if (this.running && this.isFinished) {
      this.#accumulatedMs = this.countdownTarget * 1000;
      this.#pause();
      beep();
    }
  }

  #resume() {
    if (this.running) return;
    this.running = true;
    this.#resumeAt = Date.now();
    refreshTicker();
    emit();
  }
  #pause() {
    if (this.running) { this.#accumulatedMs += Date.now() - this.#resumeAt; this.running = false; }
    refreshTicker();
    emit();
  }
}

class RestTimer {
  duration = 60;
  running = false;
  #endAt = 0;

  get secondsRemaining() { return this.running ? Math.max(0, Math.ceil((this.#endAt - Date.now()) / 1000)) : 0; }
  get progress() { return this.duration > 0 ? 1 - this.secondsRemaining / this.duration : 1; }

  start(duration) {
    this.duration = duration;
    this.#endAt = Date.now() + duration * 1000;
    this.running = true;
    refreshTicker();
    emit();
  }
  skip() {
    this.running = false;
    refreshTicker();
    emit();
  }
  sync() {
    if (this.running && Date.now() >= this.#endAt) { this.running = false; refreshTicker(); beep(); }
  }
}

export const stopwatch = new Stopwatch();
export const rest = new RestTimer();
