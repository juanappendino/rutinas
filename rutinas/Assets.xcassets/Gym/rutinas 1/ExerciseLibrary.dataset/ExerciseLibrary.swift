import Foundation

// MARK: — Biblioteca precargada de ejercicios

struct ExerciseLibrary {

    static let all: [ExerciseTemplate] = pecho + espalda + hombros + biceps + triceps + piernas + gluteos + core + cardio

    // MARK: — PECHO

    static let pecho: [ExerciseTemplate] = [
        ExerciseTemplate(
            name: "Press banca plano",
            defaultSets: 4, defaultReps: "8-10",
            description: "Acostado en banco plano, agarre ligeramente más ancho que el hombro. Bajar la barra controlando hasta rozar el pecho, empujar hasta extensión completa sin bloquear codos.",
            muscleTag: "PECHO"
        ),
        ExerciseTemplate(
            name: "Press banca inclinado",
            defaultSets: 4, defaultReps: "10",
            description: "Banco a 30-45°. Énfasis en la porción clavicular del pectoral mayor. Mantener escápulas retraídas y pies apoyados en el suelo durante todo el movimiento.",
            muscleTag: "PECHO"
        ),
        ExerciseTemplate(
            name: "Press banca declinado",
            defaultSets: 3, defaultReps: "10-12",
            description: "Banco a -15-30°. Activa la porción esternal baja del pecho. Cuidar que los pies estén bien sujetos y no arquear excesivamente la espalda baja.",
            muscleTag: "PECHO"
        ),
        ExerciseTemplate(
            name: "Press con mancuernas plano",
            defaultSets: 4, defaultReps: "10-12",
            description: "Mayor rango de movimiento que con barra. Al bajar, los codos forman 75° con el torso (no 90°) para proteger el hombro. Girar levemente las mancuernas al subir.",
            muscleTag: "PECHO"
        ),
        ExerciseTemplate(
            name: "Aperturas con mancuernas",
            defaultSets: 3, defaultReps: "12-15",
            description: "Movimiento de aislamiento. Codos ligeramente flexionados durante todo el arco. Bajar hasta sentir estiramiento en el pecho, no más. Subir como si abrazaras un árbol.",
            muscleTag: "PECHO"
        ),
        ExerciseTemplate(
            name: "Fondos en paralelas (pecho)",
            defaultSets: 3, defaultReps: "10-12",
            description: "Inclinar el torso hacia adelante 20-30° para enfocar el pecho. Bajar hasta que los codos formen 90°. Empujar hasta casi extender sin bloquear los codos.",
            muscleTag: "PECHO"
        ),
        ExerciseTemplate(
            name: "Crossover en polea",
            defaultSets: 3, defaultReps: "15",
            description: "Polea alta. Cruzar las manos ligeramente al frente para maximizar la contracción del pectoral. Controlar la fase excéntrica. No usar impulso de cadera.",
            muscleTag: "PECHO"
        ),
        ExerciseTemplate(
            name: "Push-up",
            defaultSets: 4, defaultReps: "máx",
            description: "Manos a ancho de hombros, cuerpo en línea recta desde cabeza hasta talones. Codos a 45° del torso al bajar. Escápulas estables durante todo el movimiento.",
            muscleTag: "PECHO"
        ),
    ]

    // MARK: — ESPALDA

    static let espalda: [ExerciseTemplate] = [
        ExerciseTemplate(
            name: "Dominadas",
            defaultSets: 4, defaultReps: "máx",
            description: "Agarre prono, más ancho que el hombro. Iniciar el movimiento con la retracción de escápulas. Subir hasta que la barbilla supere la barra. Bajar de forma controlada.",
            muscleTag: "ESPALDA"
        ),
        ExerciseTemplate(
            name: "Jalón al pecho",
            defaultSets: 4, defaultReps: "10-12",
            description: "Agarre prono a ancho de hombros. Llevar la barra hacia el esternón mientras se retrae y deprime la escápula. No reclinarse excesivamente hacia atrás.",
            muscleTag: "ESPALDA"
        ),
        ExerciseTemplate(
            name: "Remo con barra",
            defaultSets: 4, defaultReps: "8-10",
            description: "Torso a 45° con la horizontal, rodillas ligeramente flexionadas. Llevar la barra hacia el ombligo, no hacia el pecho. Retraer escápulas al final del recorrido.",
            muscleTag: "ESPALDA"
        ),
        ExerciseTemplate(
            name: "Remo con mancuerna",
            defaultSets: 4, defaultReps: "10-12",
            description: "Apoyo en banco, torso paralelo al suelo. Llevar la mancuerna al lateral de la cadera traccionando con el codo, no con la mano. Evitar rotación de torso.",
            muscleTag: "ESPALDA"
        ),
        ExerciseTemplate(
            name: "Remo en polea baja",
            defaultSets: 3, defaultReps: "12",
            description: "Sentado, espalda recta. Llevar el agarre hacia el abdomen manteniendo el torso vertical. Hacer pausa de 1 segundo con las escápulas retraídas.",
            muscleTag: "ESPALDA"
        ),
        ExerciseTemplate(
            name: "Peso muerto",
            defaultSets: 4, defaultReps: "5-6",
            description: "Barra sobre mediotarso, agarre a ancho de caderas. Empujar el suelo, no tirar la barra. Espalda neutra en todo momento. Bloquear con glúteos al final.",
            muscleTag: "ESPALDA"
        ),
        ExerciseTemplate(
            name: "Peso muerto rumano",
            defaultSets: 3, defaultReps: "10-12",
            description: "Bisagra de cadera con espalda neutra. Bajar hasta sentir estiramiento en isquiotibiales (generalmente a la mitad de la tibia). No doblar rodillas excesivamente.",
            muscleTag: "ESPALDA"
        ),
        ExerciseTemplate(
            name: "Pull-over con mancuerna",
            defaultSets: 3, defaultReps: "12-15",
            description: "Acostado transversal en banco, caderas abajo. Arco controlado por encima de la cabeza hasta sentir estiramiento en dorsal. Codos ligeramente flexionados.",
            muscleTag: "ESPALDA"
        ),
    ]

    // MARK: — HOMBROS

    static let hombros: [ExerciseTemplate] = [
        ExerciseTemplate(
            name: "Press militar con barra",
            defaultSets: 4, defaultReps: "8-10",
            description: "De pie o sentado, barra a la altura de la clavícula. Empujar verticalmente sin hiperextender la espalda baja. Cabeza ligeramente hacia atrás al pasar la frente.",
            muscleTag: "HOMBROS"
        ),
        ExerciseTemplate(
            name: "Press Arnold",
            defaultSets: 3, defaultReps: "10-12",
            description: "Comenzar con palmas hacia vos y codos a altura de hombros. Rotar las manos hacia adelante mientras se presiona hacia arriba. Rango completo de rotación.",
            muscleTag: "HOMBROS"
        ),
        ExerciseTemplate(
            name: "Elevaciones laterales",
            defaultSets: 4, defaultReps: "15",
            description: "Leve inclinación del torso hacia adelante. Elevar los brazos hasta la horizontal con los codos ligeramente más altos que las muñecas. Control en la bajada.",
            muscleTag: "HOMBROS"
        ),
        ExerciseTemplate(
            name: "Elevaciones frontales",
            defaultSets: 3, defaultReps: "12-15",
            description: "Alternar brazos o levantar simultáneamente hasta la altura del hombro. Codos ligeramente flexionados. No usar impulso del torso. Bajar de forma controlada.",
            muscleTag: "HOMBROS"
        ),
        ExerciseTemplate(
            name: "Pájaro con mancuernas",
            defaultSets: 3, defaultReps: "15",
            description: "Torso paralelo al suelo, codos ligeramente flexionados. Elevar los brazos hacia los lados hasta la horizontal activando el deltoides posterior. Cabeza neutra.",
            muscleTag: "HOMBROS"
        ),
        ExerciseTemplate(
            name: "Face pull en polea",
            defaultSets: 3, defaultReps: "15-20",
            description: "Polea alta con cuerda. Tirar hacia la cara separando las manos al final, codos a altura de hombros o ligeramente más altos. Fundamental para la salud del manguito.",
            muscleTag: "HOMBROS"
        ),
        ExerciseTemplate(
            name: "Encogimientos con barra",
            defaultSets: 4, defaultReps: "12-15",
            description: "Elevar los hombros directamente hacia arriba sin rotar. Mantener 1-2 segundos arriba. No rotar hacia adelante ni atrás. Movimiento de trapecio superior.",
            muscleTag: "HOMBROS"
        ),
    ]

    // MARK: — BÍCEPS

    static let biceps: [ExerciseTemplate] = [
        ExerciseTemplate(
            name: "Curl con barra",
            defaultSets: 4, defaultReps: "10-12",
            description: "Agarre supino a ancho de hombros. Codos fijos a los costados del torso. Subir hasta la contracción máxima, bajar con 3 segundos de fase excéntrica.",
            muscleTag: "BÍCEPS"
        ),
        ExerciseTemplate(
            name: "Curl con mancuernas",
            defaultSets: 3, defaultReps: "12",
            description: "Alternar brazos o levantar simultáneamente. Supinar la muñeca al subir (girar la palma hacia arriba). No mover los codos hacia adelante al subir.",
            muscleTag: "BÍCEPS"
        ),
        ExerciseTemplate(
            name: "Curl martillo",
            defaultSets: 3, defaultReps: "12",
            description: "Agarre neutro (palmas enfrentadas). Activa el braquial y el braquiorradial además del bíceps. Codos fijos. Subir hasta 90° manteniendo el agarre neutro.",
            muscleTag: "BÍCEPS"
        ),
        ExerciseTemplate(
            name: "Curl en polea baja",
            defaultSets: 3, defaultReps: "15",
            description: "Tensión constante durante todo el recorrido. Ideal para el pico del bíceps. Mantener los codos fijos y hacer pausa de 1 segundo en la contracción máxima.",
            muscleTag: "BÍCEPS"
        ),
        ExerciseTemplate(
            name: "Curl concentrado",
            defaultSets: 3, defaultReps: "12-15",
            description: "Sentado, codo apoyado en la cara interna del muslo. Movimiento de aislamiento puro. Rotar la muñeca al subir. Evitar el impulso girando el torso.",
            muscleTag: "BÍCEPS"
        ),
    ]

    // MARK: — TRÍCEPS

    static let triceps: [ExerciseTemplate] = [
        ExerciseTemplate(
            name: "Fondos en paralelas (tríceps)",
            defaultSets: 4, defaultReps: "10-12",
            description: "Torso vertical para enfocar tríceps. Bajar hasta 90° de flexión de codo y empujar hasta extensión completa. Codos mirando hacia atrás, no hacia los lados.",
            muscleTag: "TRÍCEPS"
        ),
        ExerciseTemplate(
            name: "Press francés con barra EZ",
            defaultSets: 3, defaultReps: "10-12",
            description: "Acostado, bajar la barra hacia la frente doblando solo los codos. Los codos apuntan al techo y no deben abrirse. Extensión completa al subir.",
            muscleTag: "TRÍCEPS"
        ),
        ExerciseTemplate(
            name: "Extensión de tríceps en polea",
            defaultSets: 4, defaultReps: "12-15",
            description: "Polea alta con barra recta o V. Codos pegados al torso y fijos. Extender completamente y hacer pausa. El codo es el único punto de movimiento.",
            muscleTag: "TRÍCEPS"
        ),
        ExerciseTemplate(
            name: "Patada de tríceps",
            defaultSets: 3, defaultReps: "15",
            description: "Torso paralelo al suelo, codo a 90°. Extender el brazo hacia atrás hasta la horizontal. Mantener 1 segundo y bajar controlando. No bajar el codo al extender.",
            muscleTag: "TRÍCEPS"
        ),
        ExerciseTemplate(
            name: "Extensión sobre la cabeza con mancuerna",
            defaultSets: 3, defaultReps: "12",
            description: "Mancuerna con ambas manos sobre la cabeza, codos apuntando al techo. Bajar detrás de la nuca doblando los codos. Excelente para la porción larga del tríceps.",
            muscleTag: "TRÍCEPS"
        ),
    ]

    // MARK: — PIERNAS

    static let piernas: [ExerciseTemplate] = [
        ExerciseTemplate(
            name: "Sentadilla con barra",
            defaultSets: 4, defaultReps: "8-10",
            description: "Barra en trapecios, pies a ancho de hombros. Bajar hasta que los muslos queden paralelos al suelo manteniendo el torso recto y las rodillas alineadas con los pies.",
            muscleTag: "PIERNAS"
        ),
        ExerciseTemplate(
            name: "Prensa de piernas",
            defaultSets: 4, defaultReps: "10-12",
            description: "Pies a ancho de hombros en la mitad superior de la plataforma. No bloquear las rodillas al extender. No despegar los glúteos de la base. Rango completo.",
            muscleTag: "PIERNAS"
        ),
        ExerciseTemplate(
            name: "Estocada con mancuernas",
            defaultSets: 3, defaultReps: "10 c/lado",
            description: "Paso adelante, bajar la rodilla trasera casi hasta el suelo. Rodilla delantera no debe superar la punta del pie. Torso erguido durante todo el movimiento.",
            muscleTag: "PIERNAS"
        ),
        ExerciseTemplate(
            name: "Extensión de cuádriceps",
            defaultSets: 3, defaultReps: "15",
            description: "Máquina de extensión. Extender completamente la pierna y mantener 1 segundo. Bajar con 3 segundos de control. No usar impulso del torso al subir.",
            muscleTag: "PIERNAS"
        ),
        ExerciseTemplate(
            name: "Curl femoral tumbado",
            defaultSets: 3, defaultReps: "12-15",
            description: "Máquina de curl. Flexionar hasta 90° o más. Controlar la bajada con 3 segundos. Caderas pegadas al banco durante todo el recorrido.",
            muscleTag: "PIERNAS"
        ),
        ExerciseTemplate(
            name: "Sentadilla búlgara",
            defaultSets: 3, defaultReps: "10 c/lado",
            description: "Pie trasero elevado en banco. Bajar el cuerpo de forma vertical, rodilla delantera alineada con el pie. Gran activación de cuádriceps y glúteo. Peso corporal o mancuernas.",
            muscleTag: "PIERNAS"
        ),
        ExerciseTemplate(
            name: "Peso muerto sumo",
            defaultSets: 4, defaultReps: "8",
            description: "Pies a mayor ancho que los hombros, puntas hacia afuera. La barra sube pegada a las piernas. Menor demanda lumbar que el peso muerto convencional. Activa aductores.",
            muscleTag: "PIERNAS"
        ),
        ExerciseTemplate(
            name: "Gemelos de pie",
            defaultSets: 4, defaultReps: "15-20",
            description: "En máquina o con mancuerna. Rango completo: bajar el talón hasta estiramiento máximo. Subir en dos tiempos y hacer pausa arriba. Rodillas ligeramente flexionadas.",
            muscleTag: "PIERNAS"
        ),
    ]

    // MARK: — GLÚTEOS

    static let gluteos: [ExerciseTemplate] = [
        ExerciseTemplate(
            name: "Hip thrust con barra",
            defaultSets: 4, defaultReps: "10-12",
            description: "Espalda alta apoyada en banco, barra sobre caderas con almohadilla. Empujar las caderas hacia arriba hasta que el cuerpo forme una línea recta. Apretar glúteos arriba.",
            muscleTag: "GLÚTEOS"
        ),
        ExerciseTemplate(
            name: "Patada de glúteo en polea",
            defaultSets: 3, defaultReps: "15 c/lado",
            description: "De pie frente a la polea baja, extender la pierna hacia atrás controlando. No arquear la espalda lumbar. La extensión viene del glúteo, no de la columna.",
            muscleTag: "GLÚTEOS"
        ),
        ExerciseTemplate(
            name: "Abducción de cadera",
            defaultSets: 3, defaultReps: "15-20",
            description: "Máquina de abducción o con banda. Separar las rodillas contra la resistencia. Mantener 1 segundo y volver controlando. Activa glúteo medio y menor.",
            muscleTag: "GLÚTEOS"
        ),
        ExerciseTemplate(
            name: "Puente de glúteos",
            defaultSets: 4, defaultReps: "15",
            description: "Acostado, pies apoyados. Elevar las caderas apretando glúteos. Mantener 2 segundos arriba. Versión corporal del hip thrust. Ideal para principiantes o finisher.",
            muscleTag: "GLÚTEOS"
        ),
    ]

    // MARK: — CORE

    static let core: [ExerciseTemplate] = [
        ExerciseTemplate(
            name: "Plancha",
            defaultSets: 3, defaultReps: "45 seg",
            description: "Cuerpo en línea recta, codos bajo los hombros. Contraer abdomen, glúteos y cuádriceps simultáneamente. Respirar de forma controlada. No elevar ni bajar la cadera.",
            muscleTag: "CORE"
        ),
        ExerciseTemplate(
            name: "Crunch abdominal",
            defaultSets: 3, defaultReps: "20",
            description: "Manos detrás de la cabeza sin jalar el cuello. Elevar los hombros del suelo contrayendo el abdomen. No llegar a sentado completo. Controlar la bajada.",
            muscleTag: "CORE"
        ),
        ExerciseTemplate(
            name: "Rueda abdominal",
            defaultSets: 3, defaultReps: "10-12",
            description: "Desde rodillas, extender la rueda hacia adelante manteniendo la espalda neutral. Volver contrayendo el core sin arquear la lumbar. Movimiento lento y controlado.",
            muscleTag: "CORE"
        ),
        ExerciseTemplate(
            name: "Elevación de piernas",
            defaultSets: 3, defaultReps: "15",
            description: "Acostado o en barra. Elevar las piernas hasta 90° con control. Bajar sin que los talones toquen el suelo. No arquear la lumbar. Activa el recto inferior.",
            muscleTag: "CORE"
        ),
        ExerciseTemplate(
            name: "Rotación rusa",
            defaultSets: 3, defaultReps: "20",
            description: "Sentado a 45°, pies elevados o apoyados. Rotar el torso de lado a lado tocando el suelo. Con o sin peso. Activa oblicuos. Mantener la espalda recta durante la rotación.",
            muscleTag: "CORE"
        ),
        ExerciseTemplate(
            name: "Dead bug",
            defaultSets: 3, defaultReps: "10 c/lado",
            description: "Acostado, brazos al techo y caderas a 90°. Extender simultáneamente el brazo opuesto y la pierna opuesta. Zona lumbar pegada al suelo en todo momento.",
            muscleTag: "CORE"
        ),
    ]

    // MARK: — CARDIO

    static let cardio: [ExerciseTemplate] = [
        ExerciseTemplate(
            name: "Cinta",
            defaultSets: 1, defaultReps: "20 min",
            description: "Caminar o trotar a ritmo constante. Comenzar con 5 minutos de calentamiento y terminar con 3 minutos de enfriamiento. Ajustar la inclinación para mayor intensidad.",
            muscleTag: "CARDIO"
        ),
        ExerciseTemplate(
            name: "Bicicleta estática",
            defaultSets: 1, defaultReps: "20 min",
            description: "Ajustar el asiento para que la rodilla quede ligeramente flexionada al extender. Mantener una cadencia entre 70-90 RPM. Variar la resistencia según el objetivo.",
            muscleTag: "CARDIO"
        ),
        ExerciseTemplate(
            name: "Remo ergómetro",
            defaultSets: 1, defaultReps: "10 min",
            description: "Secuencia: piernas primero, luego inclinación del torso, finalmente brazos. Al volver: brazos primero, torso, piernas. Mantener la espalda recta durante todo el movimiento.",
            muscleTag: "CARDIO"
        ),
        ExerciseTemplate(
            name: "Elíptica",
            defaultSets: 1, defaultReps: "20 min",
            description: "Movimiento de bajo impacto articular. Usar también los brazos para aumentar el gasto calórico. Mantener una postura erguida y no apoyarse en los manubrios.",
            muscleTag: "CARDIO"
        ),
        ExerciseTemplate(
            name: "Saltar la soga",
            defaultSets: 5, defaultReps: "1 min",
            description: "Saltar con ambos pies juntos o alternando. Mantener los codos cerca del torso y rotar la soga desde las muñecas. Aterrizaje suave sobre el antepié.",
            muscleTag: "CARDIO"
        ),
        ExerciseTemplate(
            name: "Burpee",
            defaultSets: 4, defaultReps: "10",
            description: "Desde de pie: bajar en cuclillas, apoyar manos, extender las piernas a posición de plancha, push-up opcional, traer piernas, saltar con brazos arriba. Movimiento explosivo.",
            muscleTag: "CARDIO"
        ),
    ]
}
