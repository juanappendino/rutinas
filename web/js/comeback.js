// Al volver al gimnasio después de unos días: arma sola una rutina con los ejercicios que más hacés y la deja como la próxima.
// Se hace una vez por dispositivo (flag) y se puede deshacer desde el aviso. Con la sincronización, la rutina llega a los demás dispositivos.
import { addRoutine, deleteRoutine, overrideNextRoutine, routineFromFavorites, setFlag, state, subscribe } from "./store.js";
import { activeRoutines, daysSinceLastSession, favoriteExercises } from "./logic.js";
import { toast } from "./ui.js";

const FLAG = "rutinaDeVuelta";
const NAME = "Vuelta";
export const MIN_DAYS = 10;

/** ¿Corresponde armarla ahora? Devuelve los favoritos si sí, o null. */
export function comebackFavorites(s = state) {
  if (!s.hasOnboarded || s.flags?.[FLAG] || s.activeSession) return null;
  const days = daysSinceLastSession(s.history);
  if (days == null || days < MIN_DAYS) return null;
  if (s.routines.some((r) => r.name === NAME)) return null;
  const favorites = favoriteExercises(s);
  return favorites.length >= 3 ? favorites : null;
}

export function maybeCreateComeback() {
  const favorites = comebackFavorites();
  if (!favorites) return false;
  const routine = routineFromFavorites(NAME, favorites);
  setFlag(FLAG);
  addRoutine(routine);
  const created = state.routines.at(-1);
  overrideNextRoutine(created);
  const days = daysSinceLastSession(state.history);
  toast(`Hace ${days} días que no entrenás: armé la rutina «${NAME}» con tus ${favorites.length} ejercicios favoritos.`, {
    ms: 15_000,
    action: { label: "Deshacer", fn: () => deleteRoutine(created) },
  });
  return true;
}

/** Se revisa al abrir y cada vez que llegan datos nuevos (por ejemplo, el historial de la sincronización). */
export function startComeback() {
  maybeCreateComeback();
  subscribe(() => maybeCreateComeback());
}
