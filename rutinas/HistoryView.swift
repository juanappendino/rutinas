import SwiftUI

struct HistoryView: View {
    @Environment(WorkoutManager.self) var manager
    @State private var tab: Int = 0
    @State private var ejerciciosQuery: String = ""

    var body: some View {
        NavigationStack {
            ZStack {
                Color.dsCanvas.ignoresSafeArea()
                VStack(spacing: 0) {
                    // Header
                    DSPageHeader(eyebrow: "REGISTRO", title: "HISTORIAL") {
                        HStack(spacing: 12) {
                            MiniBars(history: manager.history)
                            ShareLink(item: csvExport, preview: SharePreview("historial.csv")) {
                                Image(systemName: "square.and.arrow.up")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(manager.history.isEmpty ? Color.dsFg4 : Color.dsFg2)
                                    .frame(width: 32, height: 32)
                                    .background(Color.dsSurface)
                                    .clipShape(RoundedRectangle(cornerRadius: 4))
                                    .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsHairline, lineWidth: 1))
                            }
                            .disabled(manager.history.isEmpty)
                        }
                    }

                    // Tab selector
                    DSSegmentedControl(labels: ["PROGRESO", "EJERCICIOS", "SESIONES"], selection: $tab)
                        .padding(.horizontal, 20)
                        .padding(.bottom, 16)

                    // Tab content
                    Group {
                        switch tab {
                        case 0: progresoContent
                        case 1: ejerciciosContent
                        default: sesionesContent
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .hideNavigationBar()
        .navigationBarBackButtonHidden(true)
        }
    }

    // MARK: — CSV export

    private var csvExport: String {
        var lines = ["Fecha,Rutina,Grupo,Ejercicio,Series completadas,Reps,Peso (kg),Tiempo (seg)"]
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        for session in manager.history.filter(\.isCompleted) {
            let fecha = df.string(from: session.date)
            let rutina = "Día \(session.dayNumber)\(session.variant)"
            if let variant = manager.routines.first(where: { $0.dayNumber == session.dayNumber && $0.variant == session.variant }) {
                for group in variant.muscleGroups {
                    for exercise in group.exercises {
                        let key = exercise.id.uuidString
                        let completedSets = session.completedSetsLog[key]?.count ?? 0
                        guard completedSets > 0 else { continue }
                        let reps = session.repsLog[key].map { "\($0)" } ?? ""
                        let weight = session.weightLog[key].map { String(format: "%.1f", $0) } ?? ""
                        let time = session.timeLog[key].map { String(format: "%.0f", $0) } ?? ""
                        let name = exercise.name.replacingOccurrences(of: ",", with: ";")
                        lines.append("\(fecha),\(rutina),\(group.name),\(name),\(completedSets),\(reps),\(weight),\(time)")
                    }
                }
            }
        }
        return lines.joined(separator: "\n")
    }

    // MARK: — Tab 0: Progreso

    @ViewBuilder private var progresoContent: some View {
        let streak = manager.currentStreak(history: manager.history)
        let best = manager.bestStreak(history: manager.history)
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                streakCard(streak: streak, best: best)
                    .padding(.horizontal, 20)
                statsGrid
                    .padding(.horizontal, 20)
                badgesSection
                Spacer().frame(height: 60)
            }
            .padding(.top, 8)
        }
    }

    private var weekDayData: [(letter: String, hasSession: Bool, isToday: Bool)] {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        var comps = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: today)
        comps.weekday = 2 // Lunes
        let monday = cal.date(from: comps) ?? today
        let letters = ["L", "M", "M", "J", "V", "S", "D"]
        let sessionDays = Set(manager.history.filter(\.isCompleted).map { cal.startOfDay(for: $0.date) })
        return (0..<7).map { i in
            let day = cal.date(byAdding: .day, value: i, to: monday) ?? today
            return (letters[i], sessionDays.contains(day), day == today)
        }
    }

    private func streakCard(streak: Int, best: Int) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("RACHA ACTUAL")
                    .font(.geist(9, weight: .semiBold))
                    .foregroundStyle(streak > 0 ? Color.dsNaranja : Color.dsFg3)
                    .tracking(1.8)
                Spacer()
                if best > 0 {
                    Text("RÉCORD · \(best) DÍAS")
                        .font(.geist(9, weight: .regular))
                        .foregroundStyle(Color.dsFg4)
                        .tracking(1.0)
                }
            }

            if streak > 0 {
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text("\(streak)")
                        .font(.custom("IBMPlexMono-Bold", size: 52))
                        .foregroundStyle(Color.dsNaranja)
                        .tracking(-1.5)
                    VStack(alignment: .leading, spacing: 3) {
                        Text("DÍA\(streak == 1 ? "" : "S")")
                            .font(.geist(11, weight: .semiBold))
                            .foregroundStyle(Color.dsFg1)
                            .tracking(0.8)
                        Text("seguido\(streak == 1 ? "" : "s")")
                            .font(.geist(10, weight: .regular))
                            .foregroundStyle(Color.dsFg3)
                    }
                    .padding(.bottom, 6)
                }
            } else {
                Text("\(manager.currentMonthDays) entrenamientos este mes")
                    .font(.geist(15, weight: .semiBold))
                    .foregroundStyle(Color.dsFg1)
            }

            // Week strip — 7 días de la semana actual
            HStack(spacing: 5) {
                ForEach(Array(weekDayData.enumerated()), id: \.offset) { _, day in
                    VStack(spacing: 5) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(day.hasSession ? Color.dsNaranja : Color.clear)
                            .frame(height: 20)
                            .overlay(
                                RoundedRectangle(cornerRadius: 2)
                                    .strokeBorder(
                                        day.hasSession ? Color.clear :
                                        day.isToday ? Color.dsNaranja.opacity(0.5) :
                                        Color.dsHairline,
                                        lineWidth: 1
                                    )
                            )
                        Text(day.letter)
                            .font(.geist(9, weight: .medium))
                            .foregroundStyle(
                                day.hasSession ? Color.dsNaranja :
                                day.isToday ? Color.dsFg2 :
                                Color.dsFg4
                            )
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(streak > 0 ? Color.dsNaranja.opacity(0.06) : Color.dsCard)
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(
            streak > 0 ? Color.dsNaranja.opacity(0.25) : Color.dsHairline, lineWidth: 1
        ))
    }

    private var statsGrid: some View {
        LazyVGrid(
            columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)],
            spacing: 8
        ) {
            DSStatBlock(label: "SESIONES",    value: "\(manager.totalSessions)",             unit: "")
            DSStatBlock(label: "EJERCICIOS",  value: "\(manager.totalExercisesCompleted)",   unit: "")
            DSStatBlock(label: "ESTA SEMANA", value: "\(manager.currentWeekSessions)",        unit: "")
            DSStatBlock(label: "ESTE MES",    value: "\(manager.currentMonthDays)",           unit: "")
        }
    }

    private var badgesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionRule(label: "LOGROS")
                .padding(.horizontal, 20)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(manager.badges) { badge in
                        BadgeView(badge: badge)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 4)
            }
        }
    }

    // MARK: — Tab 1: Ejercicios

    @ViewBuilder private var ejerciciosContent: some View {
        let groups = groupedExercises
        if groups.isEmpty && ejerciciosQuery.isEmpty {
            emptyState(label: "SIN RUTINAS")
        } else {
            ScrollView {
                VStack(spacing: 0) {
                    // Campo de búsqueda
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Color.dsFg3)
                        TextField("Buscar ejercicio…", text: $ejerciciosQuery)
                            .font(.geist(14, weight: .regular))
                            .foregroundStyle(Color.dsFg1)
                            .tint(Color.dsNaranja)
                        if !ejerciciosQuery.isEmpty {
                            Button { ejerciciosQuery = "" } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.system(size: 13))
                                    .foregroundStyle(Color.dsFg4)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color.dsCard)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsHairline, lineWidth: 1))
                    .padding(.horizontal, 20)
                    .padding(.bottom, 4)

                    if groups.isEmpty {
                        Text("Sin resultados")
                            .font(.geist(13, weight: .regular))
                            .foregroundStyle(Color.dsFg4)
                            .padding(.top, 40)
                            .frame(maxWidth: .infinity)
                    } else {
                        ForEach(Array(groups.enumerated()), id: \.offset) { gi, group in
                            VStack(alignment: .leading, spacing: 0) {
                                SectionRule(label: group.name)
                                    .padding(.bottom, 4)
                                VStack(spacing: 0) {
                                    ForEach(Array(group.exercises.enumerated()), id: \.element.id) { i, exercise in
                                        if i > 0 { Rectangle().fill(Color.dsHairline).frame(height: 1) }
                                        NavigationLink {
                                            ExerciseProgressView(exercise: exercise)
                                        } label: {
                                            exerciseRow(exercise)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.top, gi == 0 ? 8 : 24)
                        }
                    }

                    Spacer().frame(height: 60)
                }
            }
        }
    }

    private func exerciseRow(_ exercise: Exercise) -> some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text(exercise.name.uppercased())
                    .font(.geist(13, weight: .semiBold))
                    .foregroundStyle(Color.dsFg1)
                    .tracking(0.3)
                if let kg = manager.lastWeight(for: exercise) {
                    Text(String(format: "%.1f KG", kg))
                        .font(.geist(11, weight: .regular))
                        .foregroundStyle(Color.dsFg3)
                } else {
                    Text("SIN REGISTROS")
                        .font(.geist(10, weight: .regular))
                        .foregroundStyle(Color.dsFg4)
                        .tracking(0.5)
                }
            }
            Spacer()
            if manager.lastWeight(for: exercise) != nil {
                trendView(manager.weightTrend(for: exercise))
            }
            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color.dsFg4)
        }
        .padding(.vertical, 14)
        .contentShape(Rectangle())
    }

    @ViewBuilder private func trendView(_ trend: WeightTrend) -> some View {
        switch trend {
        case .up:   Text("↑").font(.geist(13, weight: .semiBold)).foregroundStyle(Color.dsNaranja)
        case .flat: Text("→").font(.geist(13, weight: .semiBold)).foregroundStyle(Color.dsFg3)
        case .down: Text("↓").font(.geist(13, weight: .semiBold)).foregroundStyle(Color.dsRojo)
        }
    }

    /// Ejercicios agrupados por músculo, filtrados por búsqueda, sin duplicados por nombre.
    private var groupedExercises: [(name: String, exercises: [Exercise])] {
        let query = ejerciciosQuery.trimmingCharacters(in: .whitespaces).lowercased()
        var seenNames = Set<String>()

        // Construir grupos en el orden en que aparecen en las rutinas
        var groupMap: [(name: String, exercises: [Exercise])] = []

        for routine in manager.routines {
            for group in routine.muscleGroups {
                for exercise in group.exercises {
                    let key = exercise.name.lowercased()
                    guard seenNames.insert(key).inserted else { continue }
                    guard query.isEmpty || key.contains(query) else { continue }

                    if let idx = groupMap.firstIndex(where: { $0.name == group.name }) {
                        groupMap[idx].exercises.append(exercise)
                    } else {
                        groupMap.append((group.name, [exercise]))
                    }
                }
            }
        }
        return groupMap
    }

    // MARK: — Tab 2: Sesiones

    @ViewBuilder private var sesionesContent: some View {
        if manager.history.isEmpty {
            emptyState(label: "SIN HISTORIAL")
        } else {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(grouped.enumerated()), id: \.offset) { gi, group in
                        VStack(alignment: .leading, spacing: 0) {
                            SectionRule(label: group.label, right: "\(group.sessions.count)")
                                .padding(.bottom, 4)
                            ForEach(Array(group.sessions.enumerated()), id: \.element.id) { i, session in
                                if i > 0 { Rectangle().fill(Color.dsHairline).frame(height: 1) }
                                HistorySessionRow(session: session, index: i)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, gi > 0 ? 28 : 0)
                    }
                    Spacer().frame(height: 60)
                }
            }
        }
    }

    private func emptyState(label: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Rectangle()
                .fill(Color.dsHairline)
                .frame(height: 1)
            Text("[ ARCHIVO VACÍO ]")
                .font(.geist(11, weight: .semiBold))
                .foregroundStyle(Color.dsFg4)
                .tracking(2.0)
            Text("REGISTRÁ TU PRIMERA\nSESIÓN PARA GENERAR\nMÉTRICAS.")
                .font(.geist(28, weight: .bold))
                .foregroundStyle(Color.dsFg4)
                .tracking(0.3)
                .lineSpacing(2)
            Rectangle()
                .fill(Color.dsHairline)
                .frame(height: 1)
        }
        .padding(.horizontal, 20)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    }

    private var grouped: [(label: String, sessions: [WorkoutSession])] {
        let calendar = Calendar.current
        let now = Date()
        let currentYear = calendar.component(.year, from: now)

        let df = DateFormatter()
        df.locale = Locale(identifier: "es_AR")

        // Agrupa por año+mes preservando el orden de manager.history (más reciente primero)
        var buckets: [(year: Int, month: Int, sessions: [WorkoutSession])] = []
        for s in manager.history {
            let comps = calendar.dateComponents([.year, .month], from: s.date)
            let y = comps.year ?? 0
            let m = comps.month ?? 0
            if let idx = buckets.firstIndex(where: { $0.year == y && $0.month == m }) {
                buckets[idx].sessions.append(s)
            } else {
                buckets.append((y, m, [s]))
            }
        }

        return buckets.map { bucket in
            var comps = DateComponents()
            comps.year = bucket.year
            comps.month = bucket.month
            comps.day = 1
            let date = calendar.date(from: comps) ?? now
            df.dateFormat = bucket.year == currentYear ? "MMMM" : "MMMM yyyy"
            let label = df.string(from: date).uppercased()
            return (label, bucket.sessions)
        }
    }
}

// MARK: — BadgeView

private struct BadgeView: View {
    let badge: Badge
    @State private var appeared = false

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                RoundedRectangle(cornerRadius: 4)
                    .fill(badge.unlocked ? Color.dsNaranja.opacity(0.12) : Color.dsSurface)
                    .frame(width: 56, height: 56)
                RoundedRectangle(cornerRadius: 4)
                    .strokeBorder(badge.unlocked ? Color.dsNaranja.opacity(0.3) : Color.dsHairline, lineWidth: 1)
                    .frame(width: 56, height: 56)
                Image(systemName: badge.icon)
                    .font(.system(size: 20))
                    .foregroundStyle(badge.unlocked ? Color.dsNaranja : Color.dsFg4)
            }
            .scaleEffect(badge.unlocked ? (appeared ? 1.0 : 0.7) : 1.0)
            .animation(.spring(duration: 0.4, bounce: 0.3), value: appeared)
            .onAppear { if badge.unlocked { appeared = true } }

            Text(badge.name.uppercased())
                .font(.geist(8, weight: .semiBold))
                .foregroundStyle(badge.unlocked ? Color.dsFg2 : Color.dsFg4)
                .tracking(0.6)
                .multilineTextAlignment(.center)
                .frame(width: 64)
        }
    }
}

// MARK: — MiniBars

private struct MiniBars: View {
    let history: [WorkoutSession]

    private var bars: [Int] {
        Array(history.prefix(7).reversed().map { $0.completedExerciseIDs.count })
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 3) {
            ForEach(Array(bars.enumerated()), id: \.offset) { i, v in
                let maxVal = bars.max() ?? 1
                let pct = maxVal > 0 ? Double(v) / Double(maxVal) : 0
                Rectangle()
                    .fill(i == bars.count - 1 ? Color.dsNaranja : Color.dsFg4)
                    .frame(width: 5, height: max(3, 48 * pct))
            }
        }
        .frame(height: 48)
    }
}

// MARK: — HistorySessionRow

private struct HistorySessionRow: View {
    @Environment(WorkoutManager.self) var manager
    let session: WorkoutSession
    let index: Int

    private var focusText: String {
        if let variant = manager.routines.first(where: {
            $0.dayNumber == session.dayNumber && $0.variant == session.variant
        }) {
            let groups = variant.muscleGroups.map(\.name).joined(separator: " · ")
            return groups.isEmpty ? "DÍA \(session.dayNumber)\(session.variant)" : groups.uppercased()
        }
        return "DÍA \(session.dayNumber)\(session.variant)"
    }

    var body: some View {
        HStack(spacing: 14) {
            Text(String(format: "%02d", index + 1))
                .font(.geist(10, weight: .medium))
                .foregroundStyle(Color.dsFg4)
                .frame(width: 22, alignment: .leading)

            VStack(alignment: .leading, spacing: 4) {
                Text("DÍA \(session.dayNumber)\(session.variant)")
                    .font(.geist(14, weight: .bold))
                    .foregroundStyle(Color.dsFg1)
                    .tracking(0.3)
                Text(focusText)
                    .font(.geist(10, weight: .regular))
                    .foregroundStyle(Color.dsFg3)
                    .tracking(0.5)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text("\(session.completedExerciseIDs.count) EJ")
                    .font(.geist(13, weight: .bold))
                    .foregroundStyle(Color.dsFg1)
                Text(session.date.formatted(.dateTime.day().month()).uppercased())
                    .font(.geist(9, weight: .medium))
                    .foregroundStyle(Color.dsFg4)
                    .tracking(1.2)
            }
        }
        .padding(.vertical, 14)
        .contentShape(Rectangle())
        .contextMenu {
            Button(role: .destructive) {
                manager.deleteSession(session)
            } label: {
                Label("Eliminar sesión", systemImage: "trash")
            }
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            Button(role: .destructive) {
                manager.deleteSession(session)
            } label: {
                Label("Eliminar", systemImage: "trash")
            }
        }
    }
}
