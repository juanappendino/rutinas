import Foundation

enum SetType: String, Codable {
    case weightReps, reps, time

    var label: String {
        switch self {
        case .weightReps: return "Reps"
        case .reps:       return "Reps"   // alias — unificado con weightReps en UI
        case .time:       return "Tiempo"
        }
    }

    /// Infiere el tipo a partir del campo reps del ejercicio (ej. "10 min", "30 seg", "45s").
    /// Usado cuando todavía no hay setTypeLog para ese ejercicio.
    static func inferred(from reps: String) -> SetType {
        let lower = reps.lowercased()
        if lower.contains("min") || lower.contains("seg") || lower.hasSuffix("s") {
            return .time
        }
        return .weightReps
    }
}

struct Exercise: Codable, Identifiable, Hashable {
    var id: UUID
    var name: String
    var sets: Int
    var reps: String
    var description: String
    var templateID: UUID?   // ID del ExerciseTemplate de origen (nil en ejercicios pre-catálogo)

    init(id: UUID = UUID(), name: String, sets: Int, reps: String, description: String = "", templateID: UUID? = nil) {
        self.id = id; self.name = name; self.sets = sets; self.reps = reps
        self.description = description; self.templateID = templateID
    }

    enum CodingKeys: String, CodingKey { case id, name, sets, reps, description, templateID }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)
        sets = try c.decode(Int.self, forKey: .sets)
        reps = try c.decode(String.self, forKey: .reps)
        description = try c.decodeIfPresent(String.self, forKey: .description) ?? ""
        templateID = try c.decodeIfPresent(UUID.self, forKey: .templateID)
    }
}

// MARK: — Biblioteca global (átomos → moléculas → organismos)

/// Átomo: ejercicio reutilizable en el catálogo global
struct ExerciseTemplate: Codable, Identifiable, Hashable {
    var id: UUID
    var name: String
    var defaultSets: Int
    var defaultReps: String
    var description: String
    var muscleTag: String      // ej: "PECHO", "ESPALDA", "PIERNAS"

    init(id: UUID = UUID(), name: String, defaultSets: Int = 3, defaultReps: String = "12",
         description: String = "", muscleTag: String = "") {
        self.id = id; self.name = name; self.defaultSets = defaultSets
        self.defaultReps = defaultReps; self.description = description; self.muscleTag = muscleTag
    }

    /// Convierte a Exercise para insertar en una rutina (preserva templateID para historial unificado)
    func toExercise() -> Exercise {
        Exercise(name: name, sets: defaultSets, reps: defaultReps, description: description, templateID: id)
    }
}

/// Molécula: grupo muscular reutilizable con su lista de ejercicios template
struct MuscleGroupTemplate: Codable, Identifiable, Hashable {
    var id: UUID
    var name: String
    var exerciseIDs: [UUID]    // IDs de ExerciseTemplate en el catálogo

    init(id: UUID = UUID(), name: String, exerciseIDs: [UUID] = []) {
        self.id = id; self.name = name; self.exerciseIDs = exerciseIDs
    }

    /// Materializa el grupo a MuscleGroup usando el catálogo
    func toMuscleGroup(catalog: [ExerciseTemplate]) -> MuscleGroup {
        let exs = exerciseIDs.compactMap { id in catalog.first { $0.id == id }?.toExercise() }
        return MuscleGroup(name: name, exercises: exs)
    }
}

struct MuscleGroup: Codable, Identifiable, Hashable {
    var id: UUID
    var name: String
    var exercises: [Exercise]

    init(id: UUID = UUID(), name: String, exercises: [Exercise]) {
        self.id = id; self.name = name; self.exercises = exercises
    }
}

struct DayVariant: Codable, Identifiable, Hashable {
    var id: UUID
    var dayNumber: Int
    var variant: String
    var muscleGroups: [MuscleGroup]
    var isArchived: Bool

    init(id: UUID = UUID(), dayNumber: Int, variant: String, muscleGroups: [MuscleGroup], isArchived: Bool = false) {
        self.id = id; self.dayNumber = dayNumber; self.variant = variant; self.muscleGroups = muscleGroups; self.isArchived = isArchived
    }

    enum CodingKeys: String, CodingKey { case id, dayNumber, variant, muscleGroups, isArchived }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        dayNumber = try c.decode(Int.self, forKey: .dayNumber)
        variant = try c.decode(String.self, forKey: .variant)
        muscleGroups = try c.decode([MuscleGroup].self, forKey: .muscleGroups)
        isArchived = try c.decodeIfPresent(Bool.self, forKey: .isArchived) ?? false
    }

    var routineName: String {
        switch dayNumber {
        case 1: return "Impulso"
        case 2: return "Explosión"
        case 3: return "Ancla"
        case 4: return "Tensión"
        case 5: return "Raíz"
        case 6: return "Tierra"
        default: return "Día \(dayNumber)"
        }
    }
    var groupName: String {
        switch dayNumber {
        case 1: return "Pecho · Hombros · Tríceps"
        case 2: return "Pecho · Hombros · Tríceps"
        case 3: return "Espalda · Bíceps"
        case 4: return "Espalda · Bíceps"
        case 5: return "Hombros · Piernas"
        case 6: return "Hombros · Piernas"
        default: return "Día \(dayNumber)"
        }
    }
    var displayName: String { routineName }
}

struct WorkoutSession: Codable, Identifiable {
    var id: UUID
    var date: Date
    var startedAt: Date
    var dayNumber: Int
    var variant: String
    var completedExerciseIDs: [UUID]
    var weightLog: [String: Double]
    var completedSetsLog: [String: [Int]]
    var isCompleted: Bool
    var setTypeLog: [String: String]
    var repsLog: [String: Int]
    var timeLog: [String: Double]
    var distanceLog: [String: Double]  // km para ejercicios de tipo tiempo (cardio); velocidad = distancia/tiempo
    var lastSetAt: Date?               // timestamp de la última serie confirmada (para calcular duración real)

    /// Duración real = desde startedAt hasta la última serie logueada (o date si ya finalizó)
    var durationMinutes: Int {
        let end = lastSetAt ?? date
        let secs = end.timeIntervalSince(startedAt)
        return secs > 0 ? Int(secs / 60) : 0
    }

    init(id: UUID = UUID(), date: Date = Date(), dayNumber: Int, variant: String) {
        self.id = id; self.date = date; self.startedAt = date; self.dayNumber = dayNumber
        self.variant = variant; self.completedExerciseIDs = []
        self.weightLog = [:]; self.completedSetsLog = [:]; self.isCompleted = false
        self.setTypeLog = [:]; self.repsLog = [:]; self.timeLog = [:]; self.distanceLog = [:]
        self.lastSetAt = nil
    }

    enum CodingKeys: String, CodingKey {
        case id, date, startedAt, dayNumber, variant, completedExerciseIDs, weightLog, completedSetsLog, isCompleted
        case setTypeLog, repsLog, timeLog, distanceLog, lastSetAt
        // Alias para migrar datos viejos
        case speedLog
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        date = try c.decode(Date.self, forKey: .date)
        startedAt = try c.decodeIfPresent(Date.self, forKey: .startedAt) ?? (try c.decode(Date.self, forKey: .date))
        dayNumber = try c.decode(Int.self, forKey: .dayNumber)
        variant = try c.decode(String.self, forKey: .variant)
        completedExerciseIDs = try c.decode([UUID].self, forKey: .completedExerciseIDs)
        weightLog = try c.decodeIfPresent([String: Double].self, forKey: .weightLog) ?? [:]
        completedSetsLog = try c.decodeIfPresent([String: [Int]].self, forKey: .completedSetsLog) ?? [:]
        isCompleted = try c.decode(Bool.self, forKey: .isCompleted)
        setTypeLog = try c.decodeIfPresent([String: String].self, forKey: .setTypeLog) ?? [:]
        repsLog = try c.decodeIfPresent([String: Int].self, forKey: .repsLog) ?? [:]
        timeLog = try c.decodeIfPresent([String: Double].self, forKey: .timeLog) ?? [:]
        // Migración: leer distanceLog o, si no existe, speedLog (nombre anterior)
        if let d = try c.decodeIfPresent([String: Double].self, forKey: .distanceLog) {
            distanceLog = d
        } else {
            distanceLog = try c.decodeIfPresent([String: Double].self, forKey: .speedLog) ?? [:]
        }
        lastSetAt = try c.decodeIfPresent(Date.self, forKey: .lastSetAt)
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(date, forKey: .date)
        try c.encode(startedAt, forKey: .startedAt)
        try c.encode(dayNumber, forKey: .dayNumber)
        try c.encode(variant, forKey: .variant)
        try c.encode(completedExerciseIDs, forKey: .completedExerciseIDs)
        try c.encode(weightLog, forKey: .weightLog)
        try c.encode(completedSetsLog, forKey: .completedSetsLog)
        try c.encode(isCompleted, forKey: .isCompleted)
        try c.encode(setTypeLog, forKey: .setTypeLog)
        try c.encode(repsLog, forKey: .repsLog)
        try c.encode(timeLog, forKey: .timeLog)
        try c.encode(distanceLog, forKey: .distanceLog)
        try c.encodeIfPresent(lastSetAt, forKey: .lastSetAt)
    }

    var displayName: String {
        switch dayNumber {
        case 1: return "Impulso"
        case 2: return "Explosión"
        case 3: return "Ancla"
        case 4: return "Tensión"
        case 5: return "Raíz"
        case 6: return "Tierra"
        default: return "Día \(dayNumber)"
        }
    }
}
