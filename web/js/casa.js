// Rutina «Casa»: circuito de unos 35 minutos con una kettlebell de 8 kg (sin gimnasio).
// Se suma sola una vez por dispositivo (con aviso y Deshacer) y también desde RUTINAS → + → «Rutina en casa».
import { addRoutine, deleteRoutine, overrideNextRoutine, routineFromPreset, setFlag, state } from "./store.js";
import { toast } from "./ui.js";

const FLAG = "rutinaCasa";
export const HOME_NAME = "Casa";

export const HOME_GROUPS = [
  { name: "CARDIO", exercises: [
    { name: "Entrada en calor", sets: 1, reps: "5 min",
      description: "Círculos de brazos y de cadera, 10 sentadillas sin peso, 10 bisagras de cadera sin peso (empujando la cola hacia atrás con la espalda recta) y 5 vueltas de la kettlebell alrededor de la cabeza por lado. Movete suave hasta sentir el cuerpo caliente." },
  ] },
  { name: "PIERNAS", exercises: [
    { name: "Sentadilla goblet con kettlebell", sets: 4, reps: "15",
      description: "Sostené la kettlebell contra el pecho con las dos manos y los codos hacia abajo. Pies al ancho de hombros, con las puntas apenas hacia afuera. Bajá en 3 segundos con el pecho alto y la espalda recta, hasta que los muslos queden paralelos al piso. Pausá un instante abajo y subí empujando el piso con los talones. Con 8 kg, la lentitud y la pausa son lo que la hace exigente." },
    { name: "Swing con kettlebell", sets: 4, reps: "20",
      description: "Pies un poco más anchos que los hombros y la kettlebell con las dos manos delante de las piernas. Llevala hacia atrás entre las piernas flexionando las caderas (como un peso muerto), con la espalda recta. Empujá las caderas hacia adelante de golpe y dejá que la kettlebell suba hasta la altura del pecho: el movimiento sale de la cadera y los glúteos, no de los brazos. Dejá que vuelva y encadená las repeticiones. Si se te redondea la espalda, pará." },
  ] },
  { name: "PECHO", exercises: [
    { name: "Flexiones", sets: 4, reps: "8-15",
      description: "Manos un poco más anchas que los hombros y el cuerpo en línea recta de la cabeza a los talones, con el abdomen y los glúteos apretados. Bajá hasta que el pecho casi roce el piso, con los codos a unos 45° del cuerpo, y empujá hasta extender los brazos. Si te cuesta, apoyá las rodillas o las manos en una silla o un sillón firme." },
  ] },
  { name: "ESPALDA", exercises: [
    { name: "Remo a una mano con kettlebell", sets: 4, reps: "12-15 c/lado",
      description: "Apoyá una mano y la rodilla del mismo lado en una silla o un banco, con la espalda paralela al piso. Con la otra mano agarrá la kettlebell colgando. Tirá del codo hacia la cadera juntando el omóplato, sin girar el torso, y bajá lento en 2 segundos hasta extender el brazo. Hacé todas las repeticiones de un lado y después cambiá." },
  ] },
  { name: "HOMBROS", exercises: [
    { name: "Press militar a una mano con kettlebell", sets: 4, reps: "12 c/lado",
      description: "De pie, con los pies al ancho de las caderas y el abdomen y los glúteos apretados. Llevá la kettlebell a la altura del hombro con la muñeca recta. Empujá hacia arriba hasta extender el brazo sin arquear la espalda baja y bajá lento en 2 a 3 segundos. Hacé todas las repeticiones de un lado y después del otro." },
  ] },
  { name: "BÍCEPS", exercises: [
    { name: "Curl martillo con kettlebell", sets: 4, reps: "15 c/lado",
      description: "De pie, con el codo pegado al cuerpo. Agarrá la kettlebell por el asa con la palma hacia adentro (agarre neutro) y subila hasta el hombro sin balancear el torso. Bajá lento en 3 segundos. Hacé todas las repeticiones de un brazo y después del otro." },
  ] },
  { name: "ABS", exercises: [
    { name: "Giros rusos con kettlebell", sets: 4, reps: "20",
      description: "Sentado con las rodillas flexionadas y los talones apoyados (levantalos para más dificultad), con el torso inclinado hacia atrás unos 45° y la espalda recta. Sostené la kettlebell con las dos manos y llevala de un lado al otro rotando el torso, no solo los brazos. Tocar el piso de cada lado cuenta como 2 repeticiones." },
    { name: "Plancha", sets: 1, reps: "45 seg",
      description: "Apoyá los antebrazos y las puntas de los pies, con el cuerpo en línea recta de la cabeza a los talones. Apretá el abdomen y los glúteos, sin dejar caer ni subir la cadera. Respirá normal y aguantá el tiempo indicado." },
  ] },
  { name: "FINISHER", exercises: [
    { name: "Swings: 20 seg sí, 10 seg no", sets: 1, reps: "5 min",
      description: "Durante 5 minutos alterná 20 segundos de swings con 10 segundos de descanso, sin parar el cronómetro (son 10 rondas). Mantené la técnica: si se te redondea la espalda, descansá más tiempo." },
  ] },
];

/** ¿Hay que sumarla? (una vez por dispositivo; no si ya existe una rutina «Casa») */
export function shouldAddHome(s = state) {
  return Boolean(s.hasOnboarded && !s.flags?.[FLAG] && !s.activeSession && !s.routines.some((r) => r.name === HOME_NAME));
}

export function addHomeRoutine({ announce = true, makeNext = true } = {}) {
  const routine = routineFromPreset(HOME_NAME, HOME_GROUPS);
  setFlag(FLAG);
  addRoutine(routine);
  const created = state.routines.at(-1);
  if (makeNext) overrideNextRoutine(created);
  if (announce) toast(`Sumé la rutina «${HOME_NAME}»: circuito de 35 min con kettlebell de 8 kg.`, { ms: 15_000, action: { label: "Deshacer", fn: () => deleteRoutine(created) } });
  return created;
}

export function maybeAddHome() {
  if (!shouldAddHome()) return false;
  addHomeRoutine();
  return true;
}
