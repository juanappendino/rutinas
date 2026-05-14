import Foundation

enum DefaultData {
    static var all: [DayVariant] { [impulso, explosion, ancla, tension, raiz, tierra] }

    // MARK: — IMPULSO (Empuje I)

    static let impulso = DayVariant(dayNumber: 1, variant: "", muscleGroups: [
        MuscleGroup(name: "CARDIO", exercises: [
            Exercise(name: "Cinta", sets: 1, reps: "10 min",
                description: "Ritmo moderado para entrar en calor. Cargá tiempo y distancia."),
        ]),
        MuscleGroup(name: "ABS", exercises: [
            Exercise(name: "Plancha", sets: 3, reps: "1 min",
                description: "Apoyá antebrazos y pies. Cuerpo en línea recta, cadera sin subir ni bajar. Apretá el abdomen y los glúteos durante todo el tiempo."),
            Exercise(name: "Twist ruso con disco", sets: 3, reps: "20",
                description: "Sentado con rodillas flexionadas y espalda inclinada ~45°. Rotá el torso llevando el disco de lado a lado, manteniendo la espalda recta."),
        ]),
        MuscleGroup(name: "PECHO", exercises: [
            Exercise(name: "Press con barra banco plano", sets: 4, reps: "10",
                description: "Agarre algo más ancho que los hombros. Pies firmes en el piso, espalda ligeramente arqueada. Bajá la barra hasta el pecho con control y empujá explosivo."),
            Exercise(name: "Press con mancuernas banco inclinado", sets: 4, reps: "12",
                description: "Banco a 30-45°. Empujá hacia arriba juntando las mancuernas. Trabaja la parte alta del pecho."),
        ]),
        MuscleGroup(name: "HOMBROS", exercises: [
            Exercise(name: "Press militar con barra de pie", sets: 4, reps: "10",
                description: "De pie, agarre al ancho de hombros. Empujá la barra por encima de la cabeza sin arquear la espalda lumbar. Contraé el core."),
            Exercise(name: "Vuelo lateral con mancuernas", sets: 4, reps: "15",
                description: "Subí los brazos lateralmente hasta la altura del hombro con codos ligeramente flexionados. Bajá con control. No uses impulso."),
        ]),
        MuscleGroup(name: "TRÍCEPS", exercises: [
            Exercise(name: "Fondos en paralelas", sets: 3, reps: "12",
                description: "Bajá hasta que los codos lleguen a 90°. Torso vertical para más tríceps. Empujá fuerte arriba."),
            Exercise(name: "Francés tras nuca con barra", sets: 3, reps: "12",
                description: "Sentado. Bajá la barra detrás de la cabeza flexionando solo los codos. Mantené los codos apuntando al techo."),
        ]),
        MuscleGroup(name: "PIERNAS", exercises: [
            Exercise(name: "Extensión de cuádriceps", sets: 3, reps: "15",
                description: "Máquina. Subí hasta la extensión completa y bajá con control. No te deja las piernas quemadas para el tenis."),
        ]),
    ])

    // MARK: — EXPLOSIÓN (Empuje II)

    static let explosion = DayVariant(dayNumber: 2, variant: "", muscleGroups: [
        MuscleGroup(name: "CARDIO", exercises: [
            Exercise(name: "Cinta", sets: 1, reps: "10 min",
                description: "Ritmo moderado para entrar en calor. Cargá tiempo y distancia."),
        ]),
        MuscleGroup(name: "ABS", exercises: [
            Exercise(name: "Abdominal con subida de piernas", sets: 3, reps: "15",
                description: "Acostado boca arriba. Subí las piernas rectas a 90° y bajá con control sin dejar que los talones toquen el piso."),
            Exercise(name: "Oblicuo con disco", sets: 3, reps: "15 c/lado",
                description: "De pie, sostené el disco con una mano colgando al costado. Inclinación lateral controlada. Volvé con el oblicuo."),
        ]),
        MuscleGroup(name: "PECHO", exercises: [
            Exercise(name: "Press con mancuernas banco plano", sets: 4, reps: "12",
                description: "Mayor rango de movimiento que con barra. Bajá hasta sentir el estiramiento y empujá juntando las mancuernas arriba."),
            Exercise(name: "Apertura con mancuernas banco plano", sets: 3, reps: "15",
                description: "Brazos casi extendidos, codos ligeramente flexionados. Abrí en arco amplio y cerrá contrayendo el pecho."),
        ]),
        MuscleGroup(name: "HOMBROS", exercises: [
            Exercise(name: "Arnold press sentado", sets: 4, reps: "12",
                description: "Empezás con palmas hacia vos y rotás mientras empujás. Trabaja más fibras que el press clásico."),
            Exercise(name: "Vuelo lateral con mancuernas", sets: 4, reps: "15",
                description: "Subí los brazos lateralmente hasta la altura del hombro. Bajá con control. No uses impulso."),
        ]),
        MuscleGroup(name: "TRÍCEPS", exercises: [
            Exercise(name: "Empuje agarre cerrado banco plano", sets: 3, reps: "12",
                description: "Press plano con barra agarre estrecho. Codos pegados al cuerpo durante el movimiento para aislar el tríceps."),
            Exercise(name: "Francés tras nuca con mancuerna", sets: 3, reps: "12",
                description: "Con una mancuerna sostenida con ambas manos. Bajá detrás de la cabeza flexionando solo los codos."),
        ]),
        MuscleGroup(name: "PIERNAS", exercises: [
            Exercise(name: "Curl de isquiotibiales", sets: 3, reps: "15",
                description: "Máquina. Curlá los talones hacia los glúteos con control. Liviano, no te compromete para el tenis."),
        ]),
    ])

    // MARK: — ANCLA (Jalar I)

    static let ancla = DayVariant(dayNumber: 3, variant: "", muscleGroups: [
        MuscleGroup(name: "CARDIO", exercises: [
            Exercise(name: "Cinta", sets: 1, reps: "10 min",
                description: "Ritmo moderado para entrar en calor. Cargá tiempo y distancia."),
        ]),
        MuscleGroup(name: "ABS", exercises: [
            Exercise(name: "Plancha dinámica", sets: 3, reps: "30 seg",
                description: "Alternás entre apoyar antebrazos y extender los brazos. Mantené la cadera estable sin rotarla."),
            Exercise(name: "Frontal con disco", sets: 3, reps: "15",
                description: "Acostado, disco con ambas manos extendidas. Crunch llevando el disco hacia los pies. Exhalá al subir."),
        ]),
        MuscleGroup(name: "ESPALDA", exercises: [
            Exercise(name: "Dominadas", sets: 4, reps: "máx",
                description: "Agarre prono al ancho de hombros. Subí hasta que la barbilla supere la barra. Bajá completamente. No uses impulso."),
            Exercise(name: "Remo con barra", sets: 4, reps: "10",
                description: "Torso inclinado ~45°, tirá hacia el abdomen bajo manteniendo los codos cerca del cuerpo. Apretá los omóplatos al final."),
        ]),
        MuscleGroup(name: "BÍCEPS", exercises: [
            Exercise(name: "Curl con barra", sets: 4, reps: "12",
                description: "Agarre supino, codos pegados al cuerpo. Curlá hasta la contracción máxima sin arquear la espalda."),
            Exercise(name: "Curl martillo alternado", sets: 3, reps: "12",
                description: "Agarre neutro, alternando brazos. Trabaja braquial además del bíceps. Codos fijos."),
        ]),
        MuscleGroup(name: "PIERNAS", exercises: [
            Exercise(name: "Aductor", sets: 3, reps: "15",
                description: "Máquina. Cerrá las piernas con control y abrí lentamente. Liviano, no te compromete para el tenis."),
        ]),
    ])

    // MARK: — TENSIÓN (Jalar II)

    static let tension = DayVariant(dayNumber: 4, variant: "", muscleGroups: [
        MuscleGroup(name: "CARDIO", exercises: [
            Exercise(name: "Cinta", sets: 1, reps: "10 min",
                description: "Ritmo moderado para entrar en calor. Cargá tiempo y distancia."),
        ]),
        MuscleGroup(name: "ABS", exercises: [
            Exercise(name: "Sit-ups con disco", sets: 3, reps: "15",
                description: "Sujetá el disco contra el pecho. Al subir contraé el abdomen; al bajar controlá sin rebotar."),
            Exercise(name: "Cortos a 90°", sets: 3, reps: "20",
                description: "Acostado, piernas a 90°. Empujá los talones hacia el techo levantando la cadera. Movimiento pequeño y controlado."),
        ]),
        MuscleGroup(name: "ESPALDA", exercises: [
            Exercise(name: "Remo con mancuerna", sets: 4, reps: "12",
                description: "Una mano y rodilla apoyadas en el banco. Tirá hacia la cadera manteniendo el codo cerca del cuerpo. Apretá el omóplato al final."),
            Exercise(name: "Jalón al pecho en polea", sets: 4, reps: "12",
                description: "Agarre ancho, tirá la barra hasta el pecho superior. Codos van hacia abajo y atrás. Controlá la subida."),
        ]),
        MuscleGroup(name: "BÍCEPS", exercises: [
            Exercise(name: "Curl con mancuernas alternado", sets: 4, reps: "12",
                description: "Rotá la muñeca al subir para mejor contracción. Codos pegados al cuerpo, sin balancear el torso."),
            Exercise(name: "Curl concentrado a un brazo", sets: 3, reps: "12",
                description: "Sentado, codo apoyado en la cara interna del muslo. Máxima contracción arriba y estiramiento abajo."),
        ]),
        MuscleGroup(name: "PIERNAS", exercises: [
            Exercise(name: "Abductor", sets: 3, reps: "15",
                description: "Máquina. Abrí las piernas contra la resistencia y cerrá con control. Liviano, no te compromete para el tenis."),
        ]),
    ])

    // MARK: — RAÍZ (Piernas I)

    static let raiz = DayVariant(dayNumber: 5, variant: "", muscleGroups: [
        MuscleGroup(name: "CARDIO", exercises: [
            Exercise(name: "Cinta", sets: 1, reps: "10 min",
                description: "Ritmo moderado para entrar en calor. Cargá tiempo y distancia."),
        ]),
        MuscleGroup(name: "ABS", exercises: [
            Exercise(name: "Con ruedita", sets: 3, reps: "10",
                description: "Arrodillado, rodá hacia adelante manteniendo el core activo y la espalda recta. Volvé sin dejar caer las caderas."),
            Exercise(name: "Plancha lateral", sets: 3, reps: "30 seg c/lado",
                description: "Apoyá un antebrazo y el borde del pie. Cuerpo en línea recta. Cadera sin caer."),
        ]),
        MuscleGroup(name: "PIERNAS", exercises: [
            Exercise(name: "Sentadilla con barra", sets: 4, reps: "10",
                description: "Barra sobre los trapecios. Pies al ancho de hombros. Bajá hasta que los muslos queden paralelos al piso. Rodillas siguen la dirección de los pies."),
            Exercise(name: "Peso muerto con barra", sets: 4, reps: "10",
                description: "Pies al ancho de caderas, barra sobre el mediopié. Espalda recta, empujá el piso con los pies. No redondees la espalda baja nunca."),
            Exercise(name: "Prensa", sets: 3, reps: "12",
                description: "Pies al ancho de hombros en la plataforma. Bajá hasta 90° de rodilla. No bloquees las rodillas arriba."),
            Exercise(name: "Curl de isquiotibiales", sets: 3, reps: "15",
                description: "Máquina. Curlá los talones hacia los glúteos con control. Bajá lentamente."),
            Exercise(name: "Gemelos de pie con barra", sets: 4, reps: "20",
                description: "Barra sobre los hombros. Subí en puntillas lo más alto posible y bajá hasta el estiramiento completo."),
        ]),
    ])

    // MARK: — TIERRA (Piernas II)

    static let tierra = DayVariant(dayNumber: 6, variant: "", muscleGroups: [
        MuscleGroup(name: "CARDIO", exercises: [
            Exercise(name: "Cinta", sets: 1, reps: "10 min",
                description: "Ritmo moderado para entrar en calor. Cargá tiempo y distancia."),
        ]),
        MuscleGroup(name: "ABS", exercises: [
            Exercise(name: "Agrupados", sets: 3, reps: "20",
                description: "Acostado, llevá las rodillas al pecho al mismo tiempo que subís el torso. Controlá la bajada sin apoyar pies ni espalda completamente."),
            Exercise(name: "Oblicuo con disco", sets: 3, reps: "15 c/lado",
                description: "De pie, sostené el disco con una mano colgando al costado. Inclinación lateral controlada. Volvé con el oblicuo."),
        ]),
        MuscleGroup(name: "HOMBROS", exercises: [
            Exercise(name: "Press militar con barra de pie", sets: 4, reps: "10",
                description: "De pie, empujá la barra por encima de la cabeza sin arquear la espalda lumbar. Contraé el core."),
            Exercise(name: "Vuelo lateral con mancuernas", sets: 4, reps: "15",
                description: "Subí los brazos lateralmente hasta la altura del hombro. Bajá con control. No uses impulso."),
            Exercise(name: "Barra al mentón", sets: 3, reps: "12",
                description: "Agarre estrecho, subí la barra pegada al cuerpo hasta la altura del mentón. Codos guían el movimiento hacia arriba."),
        ]),
        MuscleGroup(name: "PIERNAS", exercises: [
            Exercise(name: "Sentadilla sumo con barra", sets: 4, reps: "10",
                description: "Pies bien abiertos, puntillas hacia afuera. Bajá manteniendo el torso erguido. Trabaja más aductores, isquios y glúteos."),
            Exercise(name: "Zancadas con mancuernas", sets: 3, reps: "12 c/lado",
                description: "Paso largo adelante, bajá la rodilla trasera casi al piso. Torso erguido. Empujá con el pie delantero para volver."),
            Exercise(name: "Gemelos sentado", sets: 4, reps: "20",
                description: "Con mancuernas sobre las rodillas. Subí en puntillas y bajá hasta el estiramiento completo."),
        ]),
    ])
}
