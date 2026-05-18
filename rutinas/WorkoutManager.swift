import Foundation

struct SessionSummary: Identifiable {
    let id = UUID()
    let durationMinutes: Int
    let totalSets: Int
    let completedExercises: Int
    let heaviestExercise: (name: String, kg: Double)?
    let newPRs: [(name: String, kg: Double)]
    let routineName: String
}

enum WeightTrend { case up, flat, down }

struct Badge: Identifiable {
    let id: String
    let name: String
    let icon: String
    let unlocked: Bool
}

@Observable
class WorkoutManager {
    var routines: [DayVariant] = []
    var history: [WorkoutSession] = []
    var activeSession: WorkoutSession?
    /// ID de rutina seleccionada manualmente para la próxima sesión (se limpia al arrancar)
    var manualOverrideID: UUID? = nil

    // MARK: — Biblioteca global (átomos + moléculas)
    var exerciseCatalog: [ExerciseTemplate] = []
    var muscleGroupTemplates: [MuscleGroupTemplate] = []

    init() {
        print("🔵 WorkoutManager init comenzando...")
        loadAsync()
        print("🔵 WorkoutManager init completado (carga en background)")
    }

    private func migrateDescriptions() {
        var lookup: [String: String] = [:]
        for variant in DefaultData.all {
            for group in variant.muscleGroups {
                for ex in group.exercises where !ex.description.isEmpty {
                    lookup[ex.name] = ex.description
                }
            }
        }
        var changed = false
        for ri in routines.indices {
            for gi in routines[ri].muscleGroups.indices {
                for ei in routines[ri].muscleGroups[gi].exercises.indices {
                    let ex = routines[ri].muscleGroups[gi].exercises[ei]
                    if ex.description.isEmpty, let desc = lookup[ex.name] {
                        routines[ri].muscleGroups[gi].exercises[ei].description = desc
                        changed = true
                    }
                }
            }
        }
        if changed { saveRoutines() }
    }

    var nextWorkout: DayVariant {
        let active = routines.filter { !$0.isArchived }.sorted { $0.dayNumber < $1.dayNumber }
        guard !active.isEmpty else { return routines.first ?? DayVariant(dayNumber: 1, variant: "", muscleGroups: []) }
        // Override manual: el usuario eligió una rutina específica
        if let overrideID = manualOverrideID,
           let overridden = active.first(where: { $0.id == overrideID }) {
            return overridden
        }
        let done = history.filter(\.isCompleted).sorted { $0.date > $1.date }
        guard let last = done.first else { return active[0] }
        if let idx = active.firstIndex(where: { $0.dayNumber == last.dayNumber && $0.variant == last.variant }) {
            return active[(idx + 1) % active.count]
        }
        return active[0]
    }

    func overrideNextRoutine(_ routine: DayVariant) {
        manualOverrideID = routine.id
    }

    var todayRoutine: DayVariant {
        guard let s = activeSession else { return nextWorkout }
        return routines.first { $0.dayNumber == s.dayNumber && $0.variant == s.variant } ?? nextWorkout
    }

    func startWorkout() {
        let w = nextWorkout
        var session = WorkoutSession(dayNumber: w.dayNumber, variant: w.variant)
        session.startedAt = Date()
        activeSession = session
        manualOverrideID = nil
        saveSession()
    }

    func toggleExercise(_ exercise: Exercise) {
        guard var s = activeSession else { return }
        if let i = s.completedExerciseIDs.firstIndex(of: exercise.id) {
            s.completedExerciseIDs.remove(at: i)
        } else {
            s.completedExerciseIDs.append(exercise.id)
        }
        activeSession = s
        saveSession()
    }

    func isCompleted(_ exercise: Exercise) -> Bool {
        activeSession?.completedExerciseIDs.contains(exercise.id) ?? false
    }

    func logWeight(_ kg: Double, for exercise: Exercise) {
        guard var s = activeSession else { return }
        s.weightLog[exercise.id.uuidString] = kg
        activeSession = s
        saveSession()
    }

    func setType(for exercise: Exercise) -> SetType {
        guard let s = activeSession,
              let raw = s.setTypeLog[exercise.id.uuidString] else { return .weightReps }
        return SetType(rawValue: raw) ?? .weightReps
    }

    func logSet(_ index: Int, for exercise: Exercise, type: SetType, weight: Double?, reps: Int?, time: Double?, speed: Double? = nil) {
        guard var s = activeSession else { return }
        let key = exercise.id.uuidString
        if let kg = weight { s.weightLog[key] = kg }
        s.setTypeLog[key] = type.rawValue
        // Siempre guardar reps: usa el valor provisto o parsea el default del ejercicio
        if let r = reps {
            s.repsLog[key] = r
        } else if s.repsLog[key] == nil {
            let defaultReps = exercise.reps
                .components(separatedBy: CharacterSet.decimalDigits.inverted)
                .compactMap(Int.init).first ?? 10
            s.repsLog[key] = defaultReps
        }
        if let t = time { s.timeLog[key] = t }
        if let sp = speed { s.distanceLog[key] = sp }
        s.lastSetAt = Date()
        var indices = Set(s.completedSetsLog[key] ?? [])
        indices.insert(index)
        if indices.count == exercise.sets, !s.completedExerciseIDs.contains(exercise.id) {
            s.completedExerciseIDs.append(exercise.id)
        }
        s.completedSetsLog[key] = Array(indices)
        activeSession = s
        saveSession()
    }

    /// Obtiene todos los ejercicios de una sesión buscando en las rutinas
    private func allExercises(in session: WorkoutSession) -> [Exercise] {
        let variant = routines.first { $0.dayNumber == session.dayNumber && $0.variant == session.variant }
        return variant?.muscleGroups.flatMap(\.exercises) ?? []
    }

    /// Clave del ejercicio dentro de una sesión dada.
    /// Prioridad: 1) ID exacto  2) mismo templateID  3) mismo nombre (fallback para datos pre-catálogo)
    private func key(for exercise: Exercise, in session: WorkoutSession) -> String? {
        let directKey = exercise.id.uuidString
        if hasData(key: directKey, in: session) { return directKey }

        let sessionExercises = allExercises(in: session)

        // Buscar por templateID (dos instancias del mismo átomo en rutinas distintas)
        if let tid = exercise.templateID {
            if let match = sessionExercises.first(where: { $0.templateID == tid }) {
                let k = match.id.uuidString
                if hasData(key: k, in: session) { return k }
            }
        }

        // Fallback: buscar por nombre normalizado (ejercicios viejos sin templateID)
        let name = exercise.name.lowercased()
        if let match = sessionExercises.first(where: { $0.name.lowercased() == name }) {
            let k = match.id.uuidString
            if hasData(key: k, in: session) { return k }
        }

        return nil
    }

    private func hasData(key: String, in session: WorkoutSession) -> Bool {
        session.weightLog[key] != nil || session.repsLog[key] != nil ||
        session.timeLog[key] != nil || session.completedSetsLog[key] != nil
    }

    func lastWeight(for exercise: Exercise) -> Double? {
        return history
            .filter { $0.isCompleted }
            .sorted { $0.date > $1.date }
            .compactMap { s -> Double? in
                guard let k = key(for: exercise, in: s) else { return nil }
                return s.weightLog[k]
            }
            .first
    }

    func lastDistance(for exercise: Exercise) -> Double? {
        return history
            .filter { $0.isCompleted }
            .sorted { $0.date > $1.date }
            .compactMap { s -> Double? in
                guard let k = key(for: exercise, in: s) else { return nil }
                return s.distanceLog[k]
            }
            .first
    }

    func lastReps(for exercise: Exercise) -> Int? {
        return history
            .filter { $0.isCompleted }
            .sorted { $0.date > $1.date }
            .compactMap { s -> Int? in
                guard let k = key(for: exercise, in: s) else { return nil }
                return s.repsLog[k]
            }
            .first
    }

    func weightHistory(for exercise: Exercise) -> [(date: Date, kg: Double)] {
        return history
            .filter { $0.isCompleted }
            .compactMap { s -> (Date, Double)? in
                guard let k = key(for: exercise, in: s),
                      let kg = s.weightLog[k] else { return nil }
                return (s.date, kg)
            }
            .sorted { $0.0 < $1.0 }
    }

    @discardableResult
    func finishWorkout() -> SessionSummary? {
        guard var s = activeSession else { return nil }
        s.isCompleted = true
        s.date = Date()
        let summary = buildSummary(for: s)
        history.insert(s, at: 0)
        activeSession = nil
        saveHistory()
        saveSession()
        return summary
    }

    private func buildSummary(for session: WorkoutSession) -> SessionSummary {
        let variant = routines.first { $0.dayNumber == session.dayNumber && $0.variant == session.variant }
        let allExercises = variant?.muscleGroups.flatMap(\.exercises) ?? []

        // Series totales completadas
        let totalSets = session.completedSetsLog.values.reduce(0) { $0 + $1.count }

        // Ejercicio más pesado de la sesión (excluye cardio/tiempo)
        let heaviest: (name: String, kg: Double)? = allExercises.compactMap { ex -> (String, Double)? in
            let key = ex.id.uuidString
            let type = SetType(rawValue: session.setTypeLog[key] ?? "") ?? .weightReps
            guard type != .time, let kg = session.weightLog[key] else { return nil }
            return (ex.name, kg)
        }.max { $0.1 < $1.1 }

        // PRs: peso, reps o tiempo superan el máximo histórico previo (busca por nombre para unificar rutinas)
        let priorSessions = history.filter { $0.isCompleted && $0.id != session.id }
        let newPRs: [(name: String, kg: Double)] = allExercises.compactMap { ex -> (String, Double)? in
            let sessionKey = ex.id.uuidString
            let sessionType = SetType(rawValue: session.setTypeLog[sessionKey] ?? "") ?? .weightReps

            // Para histórico: recoge todas las keys que corresponden a este ejercicio por nombre
            let priorKeys: [[String]: String] = [:]  // placeholder
            let _ = priorKeys
            func priorKey(in s: WorkoutSession) -> String? { self.key(for: ex, in: s) }

            switch sessionType {
            case .weightReps:
                guard let sessionKg = session.weightLog[sessionKey] else { return nil }
                let prevMax = priorSessions.compactMap { s -> Double? in
                    guard let k = priorKey(in: s) else { return nil }
                    return s.weightLog[k]
                }.max() ?? 0
                return sessionKg > prevMax + 0.01 ? (ex.name, sessionKg) : nil

            case .reps:
                guard let sessionReps = session.repsLog[sessionKey] else { return nil }
                let sessionSets = session.completedSetsLog[sessionKey]?.count ?? 0
                let prevMaxReps = priorSessions.compactMap { s -> Int? in
                    guard let k = priorKey(in: s) else { return nil }
                    return s.repsLog[k]
                }.max() ?? 0
                let prevMaxSets = priorSessions.compactMap { s -> Int? in
                    guard let k = priorKey(in: s) else { return nil }
                    return s.completedSetsLog[k]?.count
                }.max() ?? 0
                if sessionReps > prevMaxReps || sessionSets > prevMaxSets {
                    return (ex.name + " · \(sessionReps) REPS", Double(sessionReps))
                }
                return nil

            case .time:
                guard let sessionTime = session.timeLog[sessionKey] else { return nil }
                let prevMax = priorSessions.compactMap { s -> Double? in
                    guard let k = priorKey(in: s) else { return nil }
                    return s.timeLog[k]
                }.max() ?? 0
                return sessionTime > prevMax + 0.1 ? (ex.name, sessionTime) : nil
            }
        }

        return SessionSummary(
            durationMinutes: session.durationMinutes,
            totalSets: totalSets,
            completedExercises: session.completedExerciseIDs.count,
            heaviestExercise: heaviest,
            newPRs: newPRs,
            routineName: variant?.displayName ?? "Día \(session.dayNumber)"
        )
    }

    func cancelWorkout() {
        activeSession = nil
        saveSession()
    }

    func completedSetIndices(for exercise: Exercise) -> Set<Int> {
        let key = exercise.id.uuidString
        return Set(activeSession?.completedSetsLog[key] ?? [])
    }

    func toggleSet(_ index: Int, for exercise: Exercise) {
        guard var s = activeSession else { return }
        let key = exercise.id.uuidString
        var indices = Set(s.completedSetsLog[key] ?? [])
        if indices.contains(index) {
            indices.remove(index)
            s.completedExerciseIDs.removeAll { $0 == exercise.id }
        } else {
            indices.insert(index)
            if indices.count == exercise.sets, !s.completedExerciseIDs.contains(exercise.id) {
                s.completedExerciseIDs.append(exercise.id)
            }
        }
        s.completedSetsLog[key] = Array(indices)
        activeSession = s
        saveSession()
    }

    func deleteSession(_ session: WorkoutSession) {
        history.removeAll { $0.id == session.id }
        saveHistory()
    }

    func updateRoutine(_ r: DayVariant) {
        if let i = routines.firstIndex(where: { $0.id == r.id }) {
            routines[i] = r
            saveRoutines()
        }
    }

    func toggleArchive(_ r: DayVariant) {
        if let i = routines.firstIndex(where: { $0.id == r.id }) {
            routines[i].isArchived.toggle()
            saveRoutines()
        }
    }

    /// Reordena las rutinas activas según el nuevo orden de IDs recibido
    func reorderActiveRoutines(ids: [UUID]) {
        let archived = routines.filter { $0.isArchived }
        var active   = routines.filter { !$0.isArchived }
        // Reordenar activas según el array de ids
        active.sort { a, b in
            let ai = ids.firstIndex(of: a.id) ?? Int.max
            let bi = ids.firstIndex(of: b.id) ?? Int.max
            return ai < bi
        }
        routines = active + archived
        saveRoutines()
    }

    func addRoutine(_ r: DayVariant) {
        let maxDay = routines.map(\.dayNumber).max() ?? 0
        let newRoutine = DayVariant(
            id: r.id,
            dayNumber: maxDay + 1,
            variant: r.variant,
            muscleGroups: r.muscleGroups,
            isArchived: false
        )
        routines.append(newRoutine)
        saveRoutines()
    }

    func deleteRoutine(_ r: DayVariant) {
        routines.removeAll { $0.id == r.id }
        saveRoutines()
    }

    /// Borra todas las rutinas y arranca con una nueva (flujo onboarding "crear desde cero")
    func clearDefaultsAndAdd(_ r: DayVariant) {
        routines = []
        let newRoutine = DayVariant(
            id: r.id,
            dayNumber: 1,
            variant: r.variant,
            muscleGroups: r.muscleGroups,
            isArchived: false
        )
        routines.append(newRoutine)
        saveRoutines()
    }

    private func loadAsync() {
        // Snapshot de los datos de UserDefaults en background para no bloquear el main thread
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self else { return }
            let d = JSONDecoder()
            let newRoutines     = UserDefaults.standard.data(forKey: "routines").flatMap { try? d.decode([DayVariant].self, from: $0) }
            let newHistory      = UserDefaults.standard.data(forKey: "history").flatMap { try? d.decode([WorkoutSession].self, from: $0) }
            let newSession      = UserDefaults.standard.data(forKey: "session").flatMap { try? d.decode(WorkoutSession.self, from: $0) }
            let newCatalog      = UserDefaults.standard.data(forKey: "exerciseCatalog").flatMap { try? d.decode([ExerciseTemplate].self, from: $0) }
            let newMuscleGroups = UserDefaults.standard.data(forKey: "muscleGroupTemplates").flatMap { try? d.decode([MuscleGroupTemplate].self, from: $0) }

            DispatchQueue.main.async {
                if let v = newRoutines      { self.routines = v }
                if let v = newHistory       { self.history = v }
                if let v = newSession       { self.activeSession = v }
                if let v = newCatalog       { self.exerciseCatalog = v }
                if let v = newMuscleGroups  { self.muscleGroupTemplates = v }

                self.deduplicateCatalog()

                let existingNames = Set(self.exerciseCatalog.map { $0.name.lowercased() })
                let missing = ExerciseLibrary.all.filter { !existingNames.contains($0.name.lowercased()) }
                if !missing.isEmpty {
                    self.exerciseCatalog.append(contentsOf: missing)
                    self.saveCatalog()
                }

                if self.routines.isEmpty {
                    self.routines = DefaultData.all
                    self.saveRoutines()
                } else {
                    self.migrateDescriptions()
                }

                print("🔵 Datos cargados en background. Rutinas: \(self.routines.count)")
            }
        }
    }

    private func load() {
        let d = JSONDecoder()
        if let data = UserDefaults.standard.data(forKey: "routines"),
           let v = try? d.decode([DayVariant].self, from: data) { routines = v }
        if let data = UserDefaults.standard.data(forKey: "history"),
           let v = try? d.decode([WorkoutSession].self, from: data) { history = v }
        if let data = UserDefaults.standard.data(forKey: "session"),
           let v = try? d.decode(WorkoutSession.self, from: data) { activeSession = v }
        if let data = UserDefaults.standard.data(forKey: "exerciseCatalog"),
           let v = try? d.decode([ExerciseTemplate].self, from: data) { exerciseCatalog = v }
        if let data = UserDefaults.standard.data(forKey: "muscleGroupTemplates"),
           let v = try? d.decode([MuscleGroupTemplate].self, from: data) { muscleGroupTemplates = v }

        // Limpiar duplicados primero (importaciones previas pueden haberlos generado)
        deduplicateCatalog()

        // Agregar ejercicios de la biblioteca precargada que no estén ya en el catálogo
        let existingNames = Set(exerciseCatalog.map { $0.name.lowercased() })
        let missing = ExerciseLibrary.all.filter { !existingNames.contains($0.name.lowercased()) }
        if !missing.isEmpty {
            exerciseCatalog.append(contentsOf: missing)
            saveCatalog()
        }
    }

    /// Fusiona entradas duplicadas del catálogo (mismo nombre, ignorando mayúsculas).
    /// Mantiene el primer template encontrado y retroasigna templateID en las rutinas.
    private func deduplicateCatalog() {
        var seen: [String: ExerciseTemplate] = [:]
        var deduped: [ExerciseTemplate] = []
        for template in exerciseCatalog {
            let key = template.name.lowercased()
            if seen[key] == nil {
                seen[key] = template
                deduped.append(template)
            }
        }
        guard deduped.count != exerciseCatalog.count else { return }
        exerciseCatalog = deduped

        // Retroasignar templateIDs correctos en rutinas
        for ri in routines.indices {
            for gi in routines[ri].muscleGroups.indices {
                for ei in routines[ri].muscleGroups[gi].exercises.indices {
                    let name = routines[ri].muscleGroups[gi].exercises[ei].name.lowercased()
                    if let template = seen[name] {
                        routines[ri].muscleGroups[gi].exercises[ei].templateID = template.id
                    }
                }
            }
        }
        saveCatalog()
        saveRoutines()
    }

    func saveRoutines() { persist(routines, key: "routines") }
    func saveHistory() { persist(history, key: "history") }
    func saveCatalog() {
        persist(exerciseCatalog, key: "exerciseCatalog")
        persist(muscleGroupTemplates, key: "muscleGroupTemplates")
    }
    private func saveSession() {
        if let s = activeSession { persist(s, key: "session") }
        else { UserDefaults.standard.removeObject(forKey: "session") }
    }

    private func persist<T: Encodable>(_ value: T, key: String) {
        if let data = try? JSONEncoder().encode(value) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    // MARK: — Biblioteca (átomos + moléculas)

    func addExerciseTemplate(_ t: ExerciseTemplate) {
        exerciseCatalog.append(t)
        saveCatalog()
    }

    func updateExerciseTemplate(_ t: ExerciseTemplate) {
        if let i = exerciseCatalog.firstIndex(where: { $0.id == t.id }) {
            exerciseCatalog[i] = t
            saveCatalog()
        }
    }

    func deleteExerciseTemplate(_ t: ExerciseTemplate) {
        exerciseCatalog.removeAll { $0.id == t.id }
        // Limpiar referencias en grupos template
        for i in muscleGroupTemplates.indices {
            muscleGroupTemplates[i].exerciseIDs.removeAll { $0 == t.id }
        }
        saveCatalog()
    }

    func addMuscleGroupTemplate(_ g: MuscleGroupTemplate) {
        muscleGroupTemplates.append(g)
        saveCatalog()
    }

    func updateMuscleGroupTemplate(_ g: MuscleGroupTemplate) {
        if let i = muscleGroupTemplates.firstIndex(where: { $0.id == g.id }) {
            muscleGroupTemplates[i] = g
            saveCatalog()
        }
    }

    func deleteMuscleGroupTemplate(_ g: MuscleGroupTemplate) {
        muscleGroupTemplates.removeAll { $0.id == g.id }
        saveCatalog()
    }

    /// Importa todos los ejercicios existentes en las rutinas actuales al catálogo (sin duplicados)
    /// y retroasigna templateID a los Exercise de las rutinas para unificar el historial.
    func importExistingExercisesToCatalog() {
        // 1. Construir mapa nombre→template con los ya existentes
        var nameToTemplate: [String: ExerciseTemplate] = Dictionary(
            uniqueKeysWithValues: exerciseCatalog.map { ($0.name.lowercased(), $0) }
        )

        // 2. Recorrer todas las rutinas y agregar al catálogo solo nombres nuevos
        for routine in routines {
            for group in routine.muscleGroups {
                for ex in group.exercises {
                    let key = ex.name.lowercased()
                    if nameToTemplate[key] == nil {
                        let template = ExerciseTemplate(
                            name: ex.name,
                            defaultSets: ex.sets,
                            defaultReps: ex.reps,
                            description: ex.description,
                            muscleTag: group.name
                        )
                        exerciseCatalog.append(template)
                        nameToTemplate[key] = template
                    }
                }
            }
        }

        // 3. Retroasignar templateID a todos los Exercise en las rutinas
        for ri in routines.indices {
            for gi in routines[ri].muscleGroups.indices {
                for ei in routines[ri].muscleGroups[gi].exercises.indices {
                    let name = routines[ri].muscleGroups[gi].exercises[ei].name.lowercased()
                    if let template = nameToTemplate[name] {
                        routines[ri].muscleGroups[gi].exercises[ei].templateID = template.id
                    }
                }
            }
        }

        saveCatalog()
        saveRoutines()
    }

    // MARK: — Streak

    func currentStreak(history: [WorkoutSession]) -> Int {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        let days = Set(history.filter(\.isCompleted).map { cal.startOfDay(for: $0.date) })
        var check = days.contains(today) ? today : (cal.date(byAdding: .day, value: -1, to: today) ?? today)
        guard days.contains(check) else { return 0 }
        var n = 0
        while days.contains(check) {
            n += 1
            guard let prev = cal.date(byAdding: .day, value: -1, to: check) else { break }
            check = prev
        }
        return n
    }

    func bestStreak(history: [WorkoutSession]) -> Int {
        let cal = Calendar.current
        let days = Array(Set(history.filter(\.isCompleted).map { cal.startOfDay(for: $0.date) })).sorted()
        guard !days.isEmpty else { return 0 }
        var best = 1, cur = 1
        for i in 1..<days.count {
            if cal.dateComponents([.day], from: days[i - 1], to: days[i]).day == 1 {
                cur += 1; best = max(best, cur)
            } else { cur = 1 }
        }
        return best
    }

    // MARK: — Stats

    var totalSessions: Int { history.filter(\.isCompleted).count }

    var totalExercisesCompleted: Int {
        history.filter(\.isCompleted).reduce(0) { $0 + $1.completedExerciseIDs.count }
    }

    var currentWeekSessions: Int {
        let cal = Calendar.current; let now = Date()
        return history.filter { $0.isCompleted && cal.isDate($0.date, equalTo: now, toGranularity: .weekOfYear) }.count
    }

    var currentMonthDays: Int {
        let cal = Calendar.current; let now = Date()
        return Set(history.filter { $0.isCompleted && cal.isDate($0.date, equalTo: now, toGranularity: .month) }
            .map { cal.startOfDay(for: $0.date) }).count
    }

    // MARK: — Trend

    func weightTrend(for exercise: Exercise) -> WeightTrend {
        let key = exercise.id.uuidString
        let weights = history.filter { $0.isCompleted && $0.weightLog[key] != nil }
            .sorted { $0.date < $1.date }
            .compactMap { $0.weightLog[key] }
        guard weights.count >= 2 else { return .flat }
        let diff = (weights.last ?? 0) - (weights.dropLast().last ?? 0)
        if diff > 0.01 { return .up }
        if diff < -0.01 { return .down }
        return .flat
    }

    // MARK: — Badges

    var badges: [Badge] {
        let total = totalSessions
        let streak = currentStreak(history: history)
        let best = bestStreak(history: history)
        let hasHeavy = history.flatMap { $0.weightLog.values }.contains { $0 > 80 }
        return [
            Badge(id: "first",      name: "Primera vez",     icon: "figure.run",          unlocked: total >= 1),
            Badge(id: "week",       name: "5 días seguidos", icon: "flame.fill",           unlocked: streak >= 5 || best >= 5),
            Badge(id: "consistent", name: "10 sesiones",     icon: "checkmark.seal.fill", unlocked: total >= 10),
            Badge(id: "streak30",   name: "Racha 30 días",   icon: "bolt.fill",           unlocked: streak >= 30 || best >= 30),
            Badge(id: "heavy",      name: "+80 kg",          icon: "dumbbell.fill",       unlocked: hasHeavy),
            Badge(id: "century",    name: "100 sesiones",    icon: "star.fill",           unlocked: total >= 100),
        ]
    }
}
