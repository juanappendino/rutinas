import SwiftUI

struct TodayView: View {
    @Environment(WorkoutManager.self) var manager
    @Environment(RestTimer.self) var restTimer
    @Environment(StopwatchTimer.self) var stopwatch
    @AppStorage("restDuration") private var restDuration: Int = 45
    @State private var showFinish = false
    @State private var showCancel = false
    @State private var showRoutinePicker = false
    @State private var sessionSummary: SessionSummary? = nil

    private var allExercises: [Exercise] {
        manager.todayRoutine.muscleGroups.flatMap(\.exercises)
    }
    private var totalSets: Int { allExercises.reduce(0) { $0 + $1.sets } }
    private var doneSets: Int {
        allExercises.reduce(0) { $0 + manager.completedSetIndices(for: $1).count }
    }
    private var allDone: Bool { doneSets == totalSets && totalSets > 0 }

    // Índice global de cada ejercicio para el prefijo "01"
    private var exerciseIndex: [UUID: Int] {
        Dictionary(uniqueKeysWithValues: allExercises.enumerated().map { ($1.id, $0) })
    }

    // Próximo ejercicio activo (primero con series pendientes)
    private var nextActiveExercise: Exercise? {
        guard manager.activeSession != nil else { return nil }
        return allExercises.first {
            manager.completedSetIndices(for: $0).count < $0.sets
        }
    }

    private var weekday: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es_AR")
        f.dateFormat = "EEE · d MMM"
        return f.string(from: Date()).uppercased()
    }

    private var currentStreak: Int {
        manager.currentStreak(history: manager.history)
    }

    var body: some View {
        let _ = print("🟢 TodayView rendering. routines: \(manager.routines.count), exercises: \(allExercises.count)")
        return NavigationStack {
            ZStack(alignment: .top) {
                Color.dsCanvas.ignoresSafeArea()

                // Sin glow — el estilo industrial no necesita efectos de luz

                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {

                        // ── Hero header ───────────────────────────
                        HStack(alignment: .top, spacing: 14) {
                            // Numeral tappeable para cambiar rutina (solo sin sesión activa)
                            Button {
                                guard manager.activeSession == nil else { return }
                                showRoutinePicker = true
                            } label: {
                                ZStack(alignment: .bottomTrailing) {
                                    DayNumeral(
                                        dayNumber: manager.todayRoutine.dayNumber,
                                        variant: manager.todayRoutine.variant,
                                        size: 56
                                    )
                                    if manager.activeSession == nil {
                                        Image(systemName: "chevron.up.chevron.down")
                                            .font(.system(size: 9, weight: .semibold))
                                            .foregroundStyle(Color.dsFg4)
                                            .offset(x: 2, y: 2)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                            .disabled(manager.activeSession != nil)

                            VStack(alignment: .leading, spacing: 4) {
                                // Fecha + cantidad ejercicios + racha
                                HStack(spacing: 8) {
                                    Text(weekday)
                                        .font(.geist(11, weight: .medium))
                                        .foregroundStyle(Color.dsFg3)
                                        .tracking(1.8)
                                    Circle().fill(Color.dsFg4).frame(width: 3, height: 3)
                                    Text("\(allExercises.count) ej")
                                        .font(.system(size: 11, weight: .medium).monospacedDigit())
                                        .foregroundStyle(Color.dsFg3)
                                    if currentStreak >= 2 {
                                        Circle().fill(Color.dsFg4).frame(width: 3, height: 3)
                                        HStack(spacing: 3) {
                                            Image(systemName: "flame.fill")
                                                .font(.system(size: 9, weight: .bold))
                                            Text("\(currentStreak)")
                                                .font(.system(size: 11, weight: .semibold).monospacedDigit())
                                        }
                                        .foregroundStyle(Color.dsNaranja)
                                    }
                                }
                                // Grupos musculares
                                Text(manager.todayRoutine.muscleGroups.map(\.name).joined(separator: " · "))
                                    .font(.geist(13, weight: .regular))
                                    .foregroundStyle(Color.dsFg2)
                                    .lineLimit(1)
                                // Status pill + cancelar inline
                                HStack(spacing: 8) {
                                    StatusPill(isActive: manager.activeSession != nil)
                                    if manager.activeSession != nil {
                                        Button {
                                            showCancel = true
                                        } label: {
                                            Text("CANCELAR")
                                                .font(.geist(9, weight: .semiBold))
                                                .tracking(1.2)
                                                .foregroundStyle(Color.dsRojo400)
                                                .padding(.horizontal, 8)
                                                .padding(.vertical, 4)
                                                .background(Color.dsRojo.opacity(0.08))
                                                .clipShape(RoundedRectangle(cornerRadius: 2))
                                                .overlay(RoundedRectangle(cornerRadius: 2).strokeBorder(Color.dsRojo400.opacity(0.25), lineWidth: 1))
                                        }
                                        .buttonStyle(.plain)
                                        .transition(.opacity.combined(with: .scale(scale: 0.9)))
                                    }
                                }
                                .animation(.easeOut(duration: 0.15), value: manager.activeSession != nil)
                                .padding(.top, 2)
                            }

                            Spacer()
                            MiniRing(done: doneSets, total: totalSets, isActive: manager.activeSession != nil)
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 8)
                        .padding(.bottom, manager.activeSession != nil ? 12 : 20)

                        // ── Reloj analógico (sesión activa) ───────
                        if manager.activeSession != nil {
                            AnalogStopwatchBlock()
                                .padding(.horizontal, 20)
                                .padding(.bottom, 12)
                        }

                        // ── Grupos de ejercicios ──────────────────
                        ForEach(Array(manager.todayRoutine.muscleGroups.enumerated()), id: \.element.id) { gi, group in
                            let doneInGroup = group.exercises.filter { manager.isCompleted($0) }.count

                            VStack(alignment: .leading, spacing: 0) {
                                SectionRule(
                                    label: group.name,
                                    right: manager.activeSession != nil ? "\(doneInGroup)/\(group.exercises.count)" : nil
                                )
                                .padding(.bottom, 4)

                                VStack(spacing: 0) {
                                    ForEach(Array(group.exercises.enumerated()), id: \.element.id) { i, exercise in
                                        if i > 0 {
                                            Rectangle().fill(Color.dsHairline).frame(height: 1)
                                        }
                                        let globalIdx = exerciseIndex[exercise.id] ?? 0
                                        let isNext = nextActiveExercise?.id == exercise.id
                                        ExerciseEditorialRow(
                                            exercise: exercise,
                                            index: globalIdx,
                                            isNextUp: isNext
                                        )
                                    }
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.top, gi == 0 ? 0 : 28)
                        }

                        Spacer().frame(height: 200)
                    }
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .hideNavigationBar()
        .navigationBarBackButtonHidden(true)
            .safeAreaInset(edge: .bottom) {
                VStack(spacing: 0) {
                    if restTimer.isRunning {
                        RestTimerBanner()
                            .padding(.horizontal, 20)
                            .padding(.top, 12)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                    DockButton(
                        isActive: manager.activeSession != nil,
                        allDone: allDone,
                        doneSets: doneSets,
                        totalSets: totalSets,
                        onStart: { manager.startWorkout() },
                        onFinish: { showFinish = true }
                    )
                    .padding(.horizontal, 20)
                    .padding(.bottom, 12)
                    .padding(.top, restTimer.isRunning ? 12 : 0)
                }
                .background(Color.dsCanvas)
                .overlay(alignment: .top) {
                    Rectangle().fill(Color.dsHairline).frame(height: 1)
                }
                .animation(.spring(response: 0.32, dampingFraction: 0.82), value: restTimer.isRunning)
                .animation(.spring(response: 0.32, dampingFraction: 0.82), value: manager.activeSession != nil)
            }
            .dsAlert(isPresented: $showFinish) {
                DSAlert(
                    title: "¿Finalizar entrenamiento?",
                    buttons: [
                        DSAlertButton(label: "Finalizar") {
                            showFinish = false
                            sessionSummary = manager.finishWorkout()
                            restTimer.skip(); stopwatch.reset()
                        },
                        DSAlertButton(label: "Cancelar", isCancel: true) {
                            showFinish = false
                        }
                    ]
                )
            }
            .dsAlert(isPresented: $showCancel) {
                DSAlert(
                    title: "¿Cancelar entrenamiento?",
                    buttons: [
                        DSAlertButton(label: "Cancelar entrenamiento", destructive: true) {
                            showCancel = false
                            manager.cancelWorkout(); restTimer.skip(); stopwatch.reset()
                        },
                        DSAlertButton(label: "Seguir", isCancel: true) {
                            showCancel = false
                        }
                    ]
                )
            }
            .sheet(isPresented: $showRoutinePicker) {
                RoutinePickerSheet { selected in
                    manager.overrideNextRoutine(selected)
                }
            }
            .fullScreenCover(item: $sessionSummary) { summary in
                SessionCompleteView(summary: summary) {
                    sessionSummary = nil
                }
            }
        }
    }
}

// MARK: — Routine picker sheet

private struct RoutinePickerSheet: View {
    @Environment(\.dismiss) var dismiss
    @Environment(WorkoutManager.self) var manager
    let onSelect: (DayVariant) -> Void

    private var activeRoutines: [DayVariant] {
        manager.routines.filter { !$0.isArchived }
    }

    var body: some View {
        ZStack {
            Color.dsCanvas.ignoresSafeArea()
            VStack(spacing: 0) {
                RoundedRectangle(cornerRadius: 999)
                    .fill(Color.dsFg4)
                    .frame(width: 38, height: 4)
                    .padding(.top, 12)
                    .padding(.bottom, 20)

                HStack {
                    Text("Elegir rutina")
                        .font(.geist(20, weight: .semiBold))
                        .foregroundStyle(Color.dsFg1)
                        .tracking(-0.3)
                    Spacer()
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Color.dsFg2)
                            .frame(width: 32, height: 32)
                            .background(Color.dsSurface)
                            .clipShape(Circle())
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)

                ScrollView {
                    VStack(spacing: 0) {
                        ForEach(Array(activeRoutines.enumerated()), id: \.element.id) { i, routine in
                            if i > 0 {
                                Rectangle().fill(Color.dsHairline).frame(height: 1)
                            }
                            let isNext = routine.id == manager.nextWorkout.id
                            Button {
                                onSelect(routine)
                                dismiss()
                            } label: {
                                HStack(spacing: 16) {
                                    DayNumeral(dayNumber: routine.dayNumber, variant: routine.variant, size: 44)
                                        .frame(width: 58, alignment: .leading)
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(routine.muscleGroups.map(\.name).joined(separator: " · "))
                                            .font(.geist(15, weight: .semiBold))
                                            .foregroundStyle(Color.dsFg1)
                                            .lineLimit(1)
                                        Text("\(routine.muscleGroups.flatMap(\.exercises).count) ejercicios")
                                            .font(.system(size: 11, weight: .medium).monospacedDigit())
                                            .foregroundStyle(Color.dsFg4)
                                    }
                                    Spacer()
                                    if isNext {
                                        Text("SIGUIENTE")
                                            .font(.geist(9, weight: .semiBold))
                                            .foregroundStyle(Color.dsNaranja)
                                            .tracking(1.4)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 3)
                                            .background(Color.dsNaranja.opacity(0.10))
                                            .clipShape(RoundedRectangle(cornerRadius: 2))
                                    }
                                }
                                .padding(.horizontal, 20)
                                .padding(.vertical, 18)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.bottom, 32)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationBackground(Color.dsCanvas)
    }
}

// MARK: — Status pill

private struct StatusPill: View {
    let isActive: Bool

    var body: some View {
        HStack(spacing: 5) {
            if isActive {
                Circle()
                    .fill(Color.dsNaranja)
                    .frame(width: 5, height: 5)
            }
            Text(isActive ? "EN PROGRESO" : "PRÓXIMA")
                .font(.geist(9, weight: .semiBold))
                .tracking(1.4)
                .foregroundStyle(isActive ? Color.dsNaranja : Color.dsFg3)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(isActive ? Color.dsNaranja.opacity(0.10) : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 2))
        .overlay(RoundedRectangle(cornerRadius: 2).strokeBorder(
            isActive ? Color.dsNaranja.opacity(0.3) : Color.dsHairline, lineWidth: 1
        ))
    }
}

// MARK: — Mini ring

private struct MiniRing: View {
    let done: Int
    let total: Int
    let isActive: Bool

    private var progress: Double { total > 0 ? Double(done) / Double(total) : 0 }

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.dsElevated, lineWidth: 4)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    isActive ? Color.dsNaranja : Color.dsFg3,
                    style: StrokeStyle(lineWidth: 4, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 0.22), value: progress)

            VStack(spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: 0) {
                    Text("\(done)")
                        .font(.system(size: 18, weight: .bold).monospacedDigit())
                        .foregroundStyle(Color.dsFg1)
                        .tracking(-0.4)
                    Text("/\(total)")
                        .font(.system(size: 13, weight: .medium).monospacedDigit())
                        .foregroundStyle(Color.dsFg4)
                }
                Text("SERIES")
                    .font(.geist(8, weight: .semiBold))
                    .foregroundStyle(Color.dsFg3)
                    .tracking(1.2)
            }
        }
        .frame(width: 76, height: 76)
    }
}

// MARK: — Analog stopwatch block

struct AnalogStopwatchBlock: View {
    @Environment(StopwatchTimer.self) var stopwatch

    private let countdownChips = [30, 60, 120, 180, 300]

    private var displaySeconds: Int {
        stopwatch.mode == .countdown
            ? max(0, stopwatch.countdownTarget - stopwatch.totalSeconds)
            : stopwatch.totalSeconds
    }
    private var minuteDegrees: Double { Double(displaySeconds % 3600) / 3600.0 * 360 }
    private var secondDegrees: Double { Double(displaySeconds % 60) / 60.0 * 360 }

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 14) {
                analogDial
                VStack(alignment: .leading, spacing: 4) {
                    Text(stopwatch.mode == .countdown ? "TEMPORIZADOR" : "CRONÓMETRO")
                        .font(.geist(9, weight: .semiBold))
                        .foregroundStyle(stopwatch.mode == .countdown ? Color.dsNaranja : Color.dsFg3)
                        .tracking(1.8)
                        .animation(.easeInOut(duration: 0.2), value: stopwatch.mode == .countdown)
                    Text(stopwatch.displayTime)
                        .font(.system(size: 20, weight: .bold).monospacedDigit())
                        .foregroundStyle(stopwatch.isFinished ? Color.dsNaranja : Color.dsFg1)
                    HStack(spacing: 8) {
                        Button { stopwatch.toggle() } label: {
                            Image(systemName: stopwatch.isRunning ? "pause.fill" : "play.fill")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Color.dsNaranja)
                                .frame(width: 34, height: 34)
                                .background(Color.dsSurface)
                                .clipShape(RoundedRectangle(cornerRadius: 3))
                                .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsHairline, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                        .animation(.easeInOut(duration: 0.14), value: stopwatch.isRunning)

                        Button {
                            if stopwatch.mode == .countdown { stopwatch.switchToStopwatch() }
                            else { stopwatch.reset() }
                        } label: {
                            Image(systemName: stopwatch.mode == .countdown ? "xmark" : "arrow.counterclockwise")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Color.dsFg2)
                                .frame(width: 34, height: 34)
                                .background(Color.dsSurface)
                                .clipShape(RoundedRectangle(cornerRadius: 3))
                                .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsHairline, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                    }
                }
                Spacer()
            }

            HStack(spacing: 4) {
                ForEach(countdownChips, id: \.self) { secs in
                    let isActive = stopwatch.mode == .countdown && stopwatch.countdownTarget == secs
                    Button {
                        stopwatch.startCountdown(seconds: secs)
                    } label: {
                        Text(secs < 60 ? "\(secs)S" : "\(secs / 60)M")
                            .font(.geist(11, weight: isActive ? .semiBold : .regular))
                            .tracking(0.5)
                            .foregroundStyle(isActive ? Color.dsOnPrimary : Color.dsFg3)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                            .background(isActive ? Color.dsNaranja : Color.clear)
                            .clipShape(RoundedRectangle(cornerRadius: 2))
                            .overlay(RoundedRectangle(cornerRadius: 2).strokeBorder(
                                isActive ? Color.clear : Color.dsHairline, lineWidth: 1
                            ))
                    }
                    .buttonStyle(.plain)
                    .animation(.easeInOut(duration: 0.12), value: isActive)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color.dsCard)
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsHairline, lineWidth: 1))
    }

    private var analogDial: some View {
        ZStack {
            Circle().fill(Color.dsCard)
            Circle().strokeBorder(Color.dsFg4, lineWidth: 1)

            if stopwatch.mode == .countdown && stopwatch.countdownTarget > 0 {
                Circle()
                    .trim(from: 0, to: 1.0 - stopwatch.progress)
                    .stroke(Color.dsNaranja.opacity(0.25), style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 1), value: stopwatch.progress)
            }

            ForEach(0..<12, id: \.self) { i in
                let isLong = i % 3 == 0
                Capsule()
                    .fill(isLong ? Color.dsFg2 : Color.dsFg3)
                    .frame(width: isLong ? 1.5 : 1, height: isLong ? 8 : 4)
                    .offset(y: -28)
                    .rotationEffect(.degrees(Double(i) / 12.0 * 360))
            }

            Capsule()
                .fill(Color.dsFg1)
                .frame(width: 2, height: 20)
                .offset(y: -10)
                .rotationEffect(.degrees(minuteDegrees))
                .animation(.linear(duration: 1), value: displaySeconds)

            Capsule()
                .fill(Color.dsNaranja)
                .frame(width: 1.5, height: 25)
                .offset(y: -12.5)
                .rotationEffect(.degrees(secondDegrees))
                .animation(.linear(duration: 1), value: displaySeconds)

            Circle().fill(Color.dsFg1).frame(width: 7, height: 7)
            Circle().fill(Color.dsNaranja).frame(width: 3, height: 3)
        }
        .frame(width: 72, height: 72)
    }
}

// MARK: — Rest timer banner

struct RestTimerBanner: View {
    @Environment(RestTimer.self) var restTimer
    @AppStorage("restDuration") private var restDuration: Int = 60

    private let chips = [30, 45, 60, 90, 120]

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 14) {
                ZStack {
                    Circle().stroke(Color.dsHairline, lineWidth: 4)
                    Circle()
                        .trim(from: 0, to: restTimer.progress)
                        .stroke(Color.dsNaranja, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .animation(.linear(duration: 1), value: restTimer.progress)
                }
                .frame(width: 44, height: 44)

                VStack(alignment: .leading, spacing: 3) {
                    DSEyebrow(text: "Descansando")
                    Text(restTimer.displayTime)
                        .font(.system(size: 26, weight: .bold).monospacedDigit())
                        .foregroundStyle(Color.dsNaranja)
                        .tracking(-0.5)
                }

                Spacer()

                Button { restTimer.skip() } label: {
                    Text("SALTAR")
                        .font(.geist(11, weight: .semiBold))
                        .tracking(1.0)
                        .foregroundStyle(Color.dsFg2)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.dsSurface)
                        .clipShape(RoundedRectangle(cornerRadius: 3))
                        .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsHairline, lineWidth: 1))
                }
            }

            // Chips de tiempo
            HStack(spacing: 6) {
                ForEach(chips, id: \.self) { secs in
                    let isSelected = restDuration == secs
                    Button {
                        restDuration = secs
                        restTimer.start(duration: secs)
                    } label: {
                        Text(secs < 60 ? "\(secs)S" : "\(secs / 60)M")
                            .font(.geist(11, weight: isSelected ? .semiBold : .regular))
                            .tracking(0.5)
                            .foregroundStyle(isSelected ? Color.dsOnPrimary : Color.dsFg3)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                            .background(isSelected ? Color.dsNaranja : Color.clear)
                            .clipShape(RoundedRectangle(cornerRadius: 2))
                            .overlay(RoundedRectangle(cornerRadius: 2).strokeBorder(
                                isSelected ? Color.clear : Color.dsHairline, lineWidth: 1
                            ))
                    }
                    .buttonStyle(.plain)
                    .animation(.easeInOut(duration: 0.12), value: isSelected)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.dsCard)
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsNaranja.opacity(0.3), lineWidth: 1))
        .shadow(color: .black.opacity(0.6), radius: 8, y: 2)
    }
}

// MARK: — Dock button

private struct DockButton: View {
    let isActive: Bool
    let allDone: Bool
    let doneSets: Int
    let totalSets: Int
    let onStart: () -> Void
    let onFinish: () -> Void

    var body: some View {
        if !isActive {
            DSPrimaryButton(label: "Empezar entrenamiento", action: onStart)
        } else if allDone {
            DSPrimaryButton(label: "Finalizar entrenamiento", action: onFinish)
        } else {
            Button(action: onFinish) {
                HStack(spacing: 10) {
                    Text("FINALIZAR")
                        .font(.geist(14, weight: .semiBold))
                        .tracking(1.2)
                        .foregroundStyle(Color.dsFg2)
                    Rectangle().fill(Color.dsHairline).frame(width: 1, height: 14)
                    Text("\(doneSets)/\(totalSets)")
                        .font(.geist(14, weight: .bold))
                        .foregroundStyle(Color.dsFg3)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.dsCard)
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .strokeBorder(Color.dsHairline, lineWidth: 1)
                )
            }
        }
    }
}

// MARK: — Exercise editorial row

struct ExerciseEditorialRow: View {
    @Environment(WorkoutManager.self) var manager
    @Environment(RestTimer.self) var restTimer
    @AppStorage("restDuration") private var restDuration: Int = 60
    let exercise: Exercise
    let index: Int
    let isNextUp: Bool
    @State private var showSetLog = false
    @State private var pendingSetIndex: Int = 0
    @State private var showDescription = false
    /// Índices de series que acaban de completarse (para micro-animación)
    @State private var justCompletedSets: Set<Int> = []

    private let impactHeavy = UIImpactFeedbackGenerator(style: .heavy)
    private let impactLight = UIImpactFeedbackGenerator(style: .light)

    var isCompleted: Bool { manager.isCompleted(exercise) }
    var isSessionActive: Bool { manager.activeSession != nil }
    var sessionWeight: Double? { manager.activeSession?.weightLog[exercise.id.uuidString] }
    var lastWeight: Double? { manager.lastWeight(for: exercise) }
    var lastReps: Int? { manager.lastReps(for: exercise) }
    var lastDistance: Double? { manager.lastDistance(for: exercise) }
    var completedSets: Set<Int> { manager.completedSetIndices(for: exercise) }
    /// Máximo histórico de peso para este ejercicio (busca por nombre para unificar rutinas)
    var allTimeMaxKg: Double? {
        let values = manager.weightHistory(for: exercise).map(\.kg)
        return values.isEmpty ? nil : values.max()
    }

    // Primera serie no completada (en orden)
    var nextSetIndex: Int? {
        (0..<exercise.sets).first { !completedSets.contains($0) }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            // Índice
            Text(String(format: "%02d", index + 1))
                .font(.system(size: 11, weight: .medium).monospacedDigit())
                .foregroundStyle(isNextUp && isSessionActive ? Color.dsNaranja : Color.dsFg4)
                .tracking(0.4)
                .padding(.top, 3)
                .frame(width: 22, alignment: .leading)

            VStack(alignment: .leading, spacing: 0) {
                // Nombre + fracción
                HStack(alignment: .top, spacing: 8) {
                    HStack(spacing: 6) {
                        Text(exercise.name.uppercased())
                            .font(.geist(14, weight: .bold))
                            .foregroundStyle(isCompleted ? Color.dsFg3 : Color.dsFg1)
                            .strikethrough(isCompleted, color: Color.dsFg3.opacity(0.5))
                            .tracking(0.5)
                            .fixedSize(horizontal: false, vertical: true)
                        if !exercise.description.isEmpty {
                            Button { showDescription = true } label: {
                                Image(systemName: "info.circle")
                                    .font(.system(size: 13))
                                    .foregroundStyle(Color.dsFg4)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    // Fracción series
                    HStack(spacing: 0) {
                        Text("\(completedSets.count)")
                            .foregroundStyle(isCompleted ? Color.dsNaranja : Color.dsFg4)
                        Text("/\(exercise.sets)")
                            .foregroundStyle(Color.dsFg4)
                    }
                    .font(.system(size: 11, weight: .medium).monospacedDigit())
                    .tracking(0.4)
                    .padding(.top, 4)
                }

                // Subtítulo: sets×reps + peso
                HStack(spacing: 8) {
                    HStack(spacing: 0) {
                        Text("\(exercise.sets)")
                            .foregroundStyle(Color.dsFg3)
                        Text(" × ")
                            .foregroundStyle(Color.dsFg4)
                        if let lr = lastReps {
                            Text("\(lr)")
                                .foregroundStyle(Color.dsFg3)
                        } else {
                            Text(exercise.reps)
                                .foregroundStyle(Color.dsFg3)
                        }
                    }
                    .font(.system(size: 12, weight: .regular).monospacedDigit())

                    if sessionWeight != nil || lastWeight != nil {
                        Circle().fill(Color.dsFg4).frame(width: 3, height: 3)

                        if let kg = sessionWeight {
                            Button {
                                pendingSetIndex = nextSetIndex ?? 0
                                showSetLog = true
                            } label: {
                                Text(String(format: "%.1f KG", kg))
                                    .font(.geist(11, weight: .semiBold))
                                    .foregroundStyle(Color.dsNaranja)
                                    .padding(.horizontal, 7)
                                    .padding(.vertical, 2)
                                    .background(Color.dsNaranja.opacity(0.10))
                                    .clipShape(RoundedRectangle(cornerRadius: 2))
                            }
                        } else if let lw = lastWeight {
                            Text(String(format: "%.1f KG · ANT", lw))
                                .font(.geist(11, weight: .regular))
                                .foregroundStyle(Color.dsFg4)
                        }
                    }
                }
                .padding(.top, 4)

                // Botones de series (solo en sesión activa)
                if isSessionActive {
                    HStack(spacing: 4) {
                        ForEach(0..<exercise.sets, id: \.self) { i in
                            let done = completedSets.contains(i)
                            let isNext = i == nextSetIndex
                            let justDone = justCompletedSets.contains(i)
                            Button { handleSetTap(i) } label: {
                                ZStack {
                                    if done {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 10, weight: .bold))
                                            .foregroundStyle(Color.dsOnPrimary)
                                    } else {
                                        Text("\(i + 1)")
                                            .font(.geist(11, weight: .semiBold))
                                            .foregroundStyle(isNext ? Color.dsNaranja : Color.dsFg4)
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 28)
                                .background(
                                    done ? Color.dsNaranja :
                                    isNext ? Color.dsNaranja.opacity(0.08) :
                                    Color.clear
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 3))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 3)
                                        .strokeBorder(
                                            done ? Color.clear :
                                            isNext ? Color.dsNaranja :
                                            Color.dsHairline,
                                            lineWidth: 1
                                        )
                                )
                                .scaleEffect(justDone ? 1.07 : 1.0)
                                .animation(
                                    justDone
                                        ? .spring(response: 0.18, dampingFraction: 0.72)
                                        : .easeOut(duration: 0.12),
                                    value: justDone
                                )
                            }
                            .buttonStyle(.plain)
                            .opacity(!done && !isNext ? 0.35 : 1.0)
                            .animation(.easeOut(duration: 0.12), value: done)
                        }
                    }
                    .padding(.top, 8)
                }
            }
        }
        .padding(.vertical, 14)
        .opacity(isCompleted ? 0.4 : 1.0)
        .animation(.easeOut(duration: 0.18), value: isCompleted)
        .overlay(alignment: .leading) {
            Rectangle()
                .fill(Color.dsNaranja)
                .frame(width: 2)
                .opacity(isNextUp && isSessionActive ? 1 : 0)
                .animation(.easeOut(duration: 0.2), value: isNextUp && isSessionActive)
        }
        .background(
            Color.dsNaranja.opacity(isNextUp && isSessionActive ? 0.04 : 0)
                .animation(.easeOut(duration: 0.2), value: isNextUp && isSessionActive)
        )
        .sheet(isPresented: $showSetLog) {
            SetLogSheet(
                exercise: exercise,
                setIndex: pendingSetIndex,
                sessionType: manager.setType(for: exercise),
                sessionWeight: sessionWeight,
                lastWeight: lastWeight,
                lastReps: lastReps,
                lastDistance: lastDistance,
                allTimeMaxKg: allTimeMaxKg,
                defaultReps: defaultReps(exercise.reps)
            ) { type, weight, reps, time, distance in
                let willComplete = completedSets.count + 1 == exercise.sets
                manager.logSet(pendingSetIndex, for: exercise, type: type, weight: weight, reps: reps, time: time, speed: distance)
                restTimer.start(duration: willComplete ? restDuration : 25)
                fireCompletion(setIndex: pendingSetIndex, willComplete: willComplete)
            }
        }
        .sheet(isPresented: $showDescription) {
            ExerciseDescriptionSheet(exercise: exercise)
        }
    }

    private func fireCompletion(setIndex i: Int, willComplete: Bool) {
        // Haptic: fuerte si completa el ejercicio, medio si es serie intermedia
        if willComplete {
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } else {
            impactHeavy.impactOccurred()
        }
        // Micro-animación de rebote en el botón
        justCompletedSets.insert(i)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) {
            justCompletedSets.remove(i)
        }
    }

    private func handleSetTap(_ i: Int) {
        if completedSets.contains(i) {
            manager.toggleSet(i, for: exercise)
            impactLight.impactOccurred()
            return
        }
        let allPreviousDone = (0..<i).allSatisfy { completedSets.contains($0) }
        guard allPreviousDone else {
            impactLight.impactOccurred()
            return
        }
        guard completedSets.isEmpty else {
            // Series siguientes heredan valores y se confirman directo
            let key = exercise.id.uuidString
            let type = manager.setType(for: exercise)
            let weight = manager.activeSession?.weightLog[key]
            let reps = manager.activeSession?.repsLog[key]
            let time = manager.activeSession?.timeLog[key]
            let speed = manager.activeSession?.distanceLog[key]
            let willComplete = completedSets.count + 1 == exercise.sets
            manager.logSet(i, for: exercise, type: type, weight: weight, reps: reps, time: time, speed: speed)
            restTimer.start(duration: willComplete ? restDuration : 25)
            fireCompletion(setIndex: i, willComplete: willComplete)
            return
        }
        pendingSetIndex = i
        showSetLog = true
    }

    private func defaultReps(_ s: String) -> Int {
        s.components(separatedBy: CharacterSet.decimalDigits.inverted)
            .compactMap(Int.init).first ?? 10
    }
}

// MARK: — Set type picker

private struct SetTypePicker: View {
    @Binding var selection: SetType

    // Solo dos modos visibles: Reps (unifica weightReps + reps) y Tiempo
    private let modes: [(label: String, type: SetType)] = [
        ("REPS", .weightReps),
        ("TIEMPO", .time)
    ]

    private var isRepsMode: Bool { selection != .time }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(modes, id: \.type) { item in
                let selected = item.type == .time ? selection == .time : isRepsMode
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { selection = item.type }
                } label: {
                    Text(item.label)
                        .font(.geist(11, weight: selected ? .semiBold : .medium))
                        .tracking(0.8)
                        .foregroundStyle(selected ? Color.dsOnPrimary : Color.dsFg3)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 9)
                        .background(selected ? Color.dsNaranja : Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 2))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(3)
        .background(Color.dsSurface)
        .clipShape(RoundedRectangle(cornerRadius: 3))
        .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsHairline, lineWidth: 1))
    }
}

// MARK: — Set log sheet

struct SetLogSheet: View {
    @Environment(\.dismiss) var dismiss

    let exercise: Exercise
    let setIndex: Int
    let lastWeight: Double?
    let lastReps: Int?
    let allTimeMaxKg: Double?
    let lastDistance: Double?
    let onConfirm: (SetType, Double?, Int?, Double?, Double?) -> Void

    @State private var mode: SetType
    @State private var weightStr: String
    @State private var reps: Int
    @State private var timeMinutes: Int
    @State private var timeSeconds: Int
    @State private var distanceStr: String

    private let numpadKeys = ["1","2","3","4","5","6","7","8","9",".","0","del"]

    init(exercise: Exercise, setIndex: Int, sessionType: SetType, sessionWeight: Double?,
         lastWeight: Double?, lastReps: Int?, lastDistance: Double?, allTimeMaxKg: Double?, defaultReps: Int,
         onConfirm: @escaping (SetType, Double?, Int?, Double?, Double?) -> Void) {
        self.exercise = exercise
        self.setIndex = setIndex
        self.lastWeight = lastWeight
        self.lastReps = lastReps
        self.lastDistance = lastDistance
        self.allTimeMaxKg = allTimeMaxKg
        self.onConfirm = onConfirm
        _mode = State(initialValue: sessionType)
        _reps = State(initialValue: max(1, lastReps ?? defaultReps))
        _timeMinutes = State(initialValue: 0)
        _timeSeconds = State(initialValue: 30)
        let w = sessionWeight ?? lastWeight
        if let w {
            _weightStr = State(initialValue: w == Double(Int(w)) ? "\(Int(w))" : String(format: "%.1f", w))
        } else {
            _weightStr = State(initialValue: "0")
        }
        if let d = lastDistance {
            _distanceStr = State(initialValue: d == Double(Int(d)) ? "\(Int(d))" : String(format: "%.1f", d))
        } else {
            _distanceStr = State(initialValue: "")
        }
    }

    private var numericWeight: Double {
        Double(weightStr.replacingOccurrences(of: ",", with: ".")) ?? 0
    }

    // Altura fija por modo — se aplica solo al inicializar, no cambia durante la sesión
    private var initialDetent: PresentationDetent {
        let hasLast = lastWeight != nil
        let h: CGFloat = 16 + 18 + 60 + (hasLast ? 80 : 0) + 44 + 88 + 186 + 52 + 70 + 28
        return .height(min(h, 720))
    }
    private var numericTime: Double { Double(timeMinutes * 60 + timeSeconds) }
    private var weightDelta: Double? {
        guard let lw = lastWeight, abs(numericWeight - lw) > 0.01 else { return nil }
        return numericWeight - lw
    }

    var body: some View {
        ZStack {
            Color.dsElevated.ignoresSafeArea()
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.dsFg4)
                        .frame(width: 32, height: 3)
                        .padding(.top, 12)
                        .padding(.bottom, 18)

                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 5) {
                            Text("SERIE \(setIndex + 1)")
                                .font(.geist(9, weight: .semiBold))
                                .foregroundStyle(Color.dsFg3)
                                .tracking(2.0)
                            Text(exercise.name.uppercased())
                                .font(.geist(16, weight: .bold))
                                .foregroundStyle(Color.dsFg1)
                                .tracking(0.3)
                        }
                        Spacer()
                        Button { dismiss() } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Color.dsFg3)
                                .frame(width: 28, height: 28)
                                .background(Color.dsSurface)
                                .clipShape(RoundedRectangle(cornerRadius: 3))
                                .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsHairline, lineWidth: 1))
                        }
                    }
                    .padding(.horizontal, 20)

                    // — Referencia anterior (bloque prominente)
                    if let lw = lastWeight, mode != .time {
                        lastSessionBlock(lastKg: lw)
                            .padding(.horizontal, 20)
                            .padding(.top, 14)
                            .transition(.opacity.combined(with: .move(edge: .top)))
                    }

                    SetTypePicker(selection: $mode)
                        .padding(.horizontal, 20)
                        .padding(.top, 14)

                    // Contenido por modo — transición simple de opacidad
                    Group {
                        if mode == .time {
                            timeContent
                        } else {
                            weightRepsContent
                        }
                    }
                    .id(mode == .time ? "time" : "reps")
                    .transition(.opacity)
                    .animation(.easeInOut(duration: 0.18), value: mode)
                }
            }
            .scrollDisabled(true)
            .safeAreaInset(edge: .bottom) {
                DSPrimaryButton(label: "Confirmar serie") { confirm() }
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                    .padding(.bottom, 24)
                    .background(Color.dsElevated)
            }
        }
        .presentationDetents([initialDetent, .large])
        .presentationDragIndicator(.hidden)
        .presentationBackground(Color.dsElevated)
    }

    // — Bloque "última vez"
    private func lastSessionBlock(lastKg: Double) -> some View {
        let delta = numericWeight - lastKg
        let isAbove  = delta > 0.01
        let isBelow  = delta < -0.01

        // PR: supera el máximo histórico
        let isPR: Bool = {
            guard let maxKg = allTimeMaxKg else { return false }
            return numericWeight > maxKg + 0.01
        }()

        let accentColor: Color = isPR ? .dsNaranja : isAbove ? .dsNaranja : isBelow ? .dsRojo400 : .dsFg3
        let deltaText: String = isPR     ? "NUEVO PR"
                              : isAbove  ? String(format: "+%.1f kg", delta)
                              : isBelow  ? String(format: "%.1f kg", delta)
                              : "igual"
        let icon: String = isPR ? "trophy.fill" : isAbove ? "arrow.up" : isBelow ? "arrow.down" : "equal"

        return HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                Text("ÚLTIMA VEZ")
                    .font(.geist(9, weight: .semiBold))
                    .foregroundStyle(Color.dsFg4)
                    .tracking(1.8)
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(String(format: "%.1f", lastKg))
                        .font(.system(size: 28, weight: .bold).monospacedDigit())
                        .foregroundStyle(Color.dsFg1)
                        .tracking(-0.56)
                    Text("kg")
                        .font(.geist(14, weight: .medium))
                        .foregroundStyle(Color.dsFg3)
                    if let lr = lastReps {
                        Text("· \(lr) reps")
                            .font(.system(size: 13, weight: .regular).monospacedDigit())
                            .foregroundStyle(Color.dsFg4)
                    }
                }
            }
            Spacer()
            // Delta / PR chip en tiempo real
            HStack(spacing: 5) {
                Image(systemName: icon)
                    .font(.system(size: 12, weight: .bold))
                Text(deltaText)
                    .font(.system(size: 14, weight: .semibold).monospacedDigit())
            }
            .foregroundStyle(accentColor)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(accentColor.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 3))
            .animation(.easeInOut(duration: 0.15), value: isPR)
            .animation(.easeInOut(duration: 0.15), value: isAbove)
            .animation(.easeInOut(duration: 0.15), value: isBelow)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(isPR ? Color.dsNaranja.opacity(0.06) : Color.dsCard)
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(
            isPR ? Color.dsNaranja.opacity(0.3) : Color.dsHairline, lineWidth: 1
        ))
        .animation(.easeInOut(duration: 0.2), value: isPR)
    }

    // MARK: — weightReps

    @ViewBuilder private var weightRepsContent: some View {
        // Peso (opcional — queda en 0 si no se carga)
        HStack(spacing: 14) {
            AdjustButton(label: "−2.5") { adjustWeight(-2.5) }
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(weightStr)
                    .font(.custom("IBMPlexMono-Bold", size: 56))
                    .foregroundStyle(numericWeight > 0 ? Color.dsFg1 : Color.dsFg4)
                    .tracking(-1.5)
                    .frame(minWidth: 120, alignment: .trailing)
                VStack(alignment: .leading, spacing: 2) {
                    Text("KG")
                        .font(.geist(14, weight: .semiBold))
                        .foregroundStyle(Color.dsFg3)
                        .tracking(1.2)
                    if numericWeight == 0 {
                        Text("opcional")
                            .font(.geist(9, weight: .regular))
                            .foregroundStyle(Color.dsFg4)
                            .tracking(0.5)
                    }
                }
                .padding(.bottom, 4)
            }
            AdjustButton(label: "+2.5") { adjustWeight(2.5) }
        }
        .padding(.vertical, 16)
        .frame(maxWidth: .infinity)
        .overlay(alignment: .top) { Rectangle().fill(Color.dsHairline).frame(height: 1) }
        .overlay(alignment: .bottom) { Rectangle().fill(Color.dsHairline).frame(height: 1) }
        .padding(.top, 16)

        weightNumpad
            .padding(.horizontal, 20)
            .padding(.top, 12)

        repsStepperRow
            .padding(.horizontal, 20)
            .padding(.top, 10)
    }

    // MARK: — reps only

    @ViewBuilder private var repsContent: some View {
        HStack(spacing: 14) {
            AdjustButton(label: "−1") { if reps > 1 { reps -= 1 } }
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("\(reps)")
                    .font(.custom("IBMPlexMono-Bold", size: 56))
                    .foregroundStyle(Color.dsFg1)
                    .tracking(-1.5)
                    .frame(minWidth: 100, alignment: .trailing)
                Text("REPS")
                    .font(.geist(14, weight: .semiBold))
                    .foregroundStyle(Color.dsFg3)
                    .tracking(1.2)
                    .padding(.bottom, 4)
            }
            AdjustButton(label: "+1") { reps += 1 }
        }
        .padding(.vertical, 16)
        .frame(maxWidth: .infinity)
        .overlay(alignment: .top) { Rectangle().fill(Color.dsHairline).frame(height: 1) }
        .overlay(alignment: .bottom) { Rectangle().fill(Color.dsHairline).frame(height: 1) }
        .padding(.top, 16)

        HStack(spacing: 12) {
            DSEyebrow(text: "Peso (opcional)")
            Spacer()
            AdjustButton(label: "−2.5") { adjustWeight(-2.5) }
            Text(numericWeight > 0 ? String(format: "%.1f kg", numericWeight) : "— kg")
                .font(.system(size: 15, weight: .semibold).monospacedDigit())
                .foregroundStyle(numericWeight > 0 ? Color.dsNaranja : Color.dsFg4)
                .frame(minWidth: 70, alignment: .center)
            AdjustButton(label: "+2.5") { adjustWeight(2.5) }
        }
        .padding(.horizontal, 20)
        .padding(.top, 20)
    }

    // MARK: — time

    @ViewBuilder private var timeContent: some View {
        // Chips de preset
        HStack(spacing: 6) {
            ForEach([(0,30,"30s"),(1,0,"1m"),(2,0,"2m"),(5,0,"5m"),(10,0,"10m")], id: \.2) { min, sec, label in
                let isSelected = timeMinutes == min && timeSeconds == sec
                Button {
                    timeMinutes = min
                    timeSeconds = sec
                } label: {
                    Text(label)
                        .font(.geist(13, weight: .medium))
                        .foregroundStyle(isSelected ? Color.dsOnPrimary : Color.dsFg2)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(isSelected ? Color.dsNaranja : Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 2))
                        .overlay(RoundedRectangle(cornerRadius: 2).strokeBorder(
                            isSelected ? Color.clear : Color.dsHairline, lineWidth: 1
                        ))
                }
                .buttonStyle(.plain)
                .animation(.easeInOut(duration: 0.12), value: isSelected)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 20)

        // Display mm:ss grande
        HStack(alignment: .firstTextBaseline, spacing: 4) {
            Text(String(format: "%d", timeMinutes))
                .font(.custom("IBMPlexMono-Bold", size: 56))
                .foregroundStyle(Color.dsFg1)
                .tracking(-1.5)
            Text("MIN")
                .font(.geist(13, weight: .semiBold))
                .foregroundStyle(Color.dsFg3)
                .tracking(1.0)
                .padding(.trailing, 10)
                .padding(.bottom, 4)
            Text(String(format: "%02d", timeSeconds))
                .font(.custom("IBMPlexMono-Bold", size: 56))
                .foregroundStyle(timeSeconds > 0 ? Color.dsFg1 : Color.dsFg4)
                .tracking(-1.5)
            Text("SEG")
                .font(.geist(13, weight: .semiBold))
                .foregroundStyle(Color.dsFg3)
                .tracking(1.0)
                .padding(.bottom, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .overlay(alignment: .top) { Rectangle().fill(Color.dsHairline).frame(height: 1) }
        .overlay(alignment: .bottom) { Rectangle().fill(Color.dsHairline).frame(height: 1) }
        .padding(.top, 16)

        // Steppers minutos y segundos
        HStack(spacing: 12) {
            // Minutos
            VStack(spacing: 8) {
                DSEyebrow(text: "Minutos")
                HStack(spacing: 14) {
                    Button { if timeMinutes > 0 { timeMinutes -= 1 } } label: {
                        Image(systemName: "minus")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Color.dsFg2)
                            .frame(width: 40, height: 40)
                            .background(Color.dsSurface)
                            .clipShape(RoundedRectangle(cornerRadius: 3))
                            .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsHairline, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    Text("\(timeMinutes)")
                        .font(.system(size: 22, weight: .bold).monospacedDigit())
                        .foregroundStyle(Color.dsFg1)
                        .frame(minWidth: 28, alignment: .center)
                    Button { timeMinutes += 1 } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Color.dsFg2)
                            .frame(width: 40, height: 40)
                            .background(Color.dsSurface)
                            .clipShape(RoundedRectangle(cornerRadius: 3))
                            .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsHairline, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(14)
            .background(Color.dsCard)
            .clipShape(RoundedRectangle(cornerRadius: 4))
            .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsHairline, lineWidth: 1))

            // Segundos
            VStack(spacing: 8) {
                DSEyebrow(text: "Segundos")
                HStack(spacing: 14) {
                    Button {
                        if timeSeconds >= 15 { timeSeconds -= 15 }
                        else if timeMinutes > 0 { timeMinutes -= 1; timeSeconds = 45 }
                    } label: {
                        Image(systemName: "minus")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Color.dsFg2)
                            .frame(width: 40, height: 40)
                            .background(Color.dsSurface)
                            .clipShape(RoundedRectangle(cornerRadius: 3))
                            .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsHairline, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    Text(String(format: "%02d", timeSeconds))
                        .font(.system(size: 22, weight: .bold).monospacedDigit())
                        .foregroundStyle(Color.dsFg1)
                        .frame(minWidth: 36, alignment: .center)
                    Button {
                        let newSec = timeSeconds + 15
                        if newSec >= 60 { timeMinutes += 1; timeSeconds = newSec - 60 }
                        else { timeSeconds = newSec }
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Color.dsFg2)
                            .frame(width: 40, height: 40)
                            .background(Color.dsSurface)
                            .clipShape(RoundedRectangle(cornerRadius: 3))
                            .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsHairline, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(14)
            .background(Color.dsCard)
            .clipShape(RoundedRectangle(cornerRadius: 4))
            .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsHairline, lineWidth: 1))
        }
        .padding(.horizontal, 20)
        .padding(.top, 16)

        // Distancia opcional (km) — velocidad se calcula automáticamente
        VStack(spacing: 6) {
            HStack(spacing: 0) {
                DSEyebrow(text: "DISTANCIA (KM)")
                Spacer()
                HStack(spacing: 6) {
                    Button {
                        let v = max(0, (Double(distanceStr) ?? 0) - 0.5)
                        distanceStr = v == Double(Int(v)) ? "\(Int(v))" : String(format: "%.1f", v)
                    } label: {
                        Image(systemName: "minus")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Color.dsFg2)
                            .frame(width: 34, height: 34)
                            .background(Color.dsSurface)
                            .clipShape(RoundedRectangle(cornerRadius: 3))
                            .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsHairline, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    Text(distanceStr.isEmpty ? "—" : distanceStr)
                        .font(.system(size: 16, weight: .bold).monospacedDigit())
                        .foregroundStyle(distanceStr.isEmpty ? Color.dsFg4 : Color.dsNaranja)
                        .frame(minWidth: 44, alignment: .center)
                    Button {
                        let v = (Double(distanceStr) ?? 0) + 0.5
                        distanceStr = v == Double(Int(v)) ? "\(Int(v))" : String(format: "%.1f", v)
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Color.dsFg2)
                            .frame(width: 34, height: 34)
                            .background(Color.dsSurface)
                            .clipShape(RoundedRectangle(cornerRadius: 3))
                            .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsHairline, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            // Velocidad calculada
            if let dist = Double(distanceStr), dist > 0, numericTime > 0 {
                let speedKmh = dist / (numericTime / 3600)
                HStack(spacing: 4) {
                    Image(systemName: "speedometer")
                        .font(.system(size: 10))
                        .foregroundStyle(Color.dsFg4)
                    Text(String(format: "%.1f km/h", speedKmh))
                        .font(.geist(11, weight: .regular))
                        .foregroundStyle(Color.dsFg3)
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color.dsCard)
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsHairline, lineWidth: 1))
        .padding(.horizontal, 20)
        .padding(.top, 12)
    }

    // MARK: — Shared sub-views

    private var repsStepperRow: some View {
        HStack(spacing: 0) {
            DSEyebrow(text: "REPS")
            Spacer()
            HStack(spacing: 14) {
                Button { if reps > 1 { reps -= 1 } } label: {
                    Image(systemName: "minus")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color.dsFg2)
                        .frame(width: 32, height: 32)
                        .background(Color.dsSurface)
                        .clipShape(RoundedRectangle(cornerRadius: 2))
                        .overlay(RoundedRectangle(cornerRadius: 2).strokeBorder(Color.dsHairline, lineWidth: 1))
                }
                .buttonStyle(.plain)
                Text("\(reps)")
                    .font(.custom("IBMPlexMono-Bold", size: 18))
                    .foregroundStyle(Color.dsFg1)
                    .frame(minWidth: 28, alignment: .center)
                Button { reps += 1 } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color.dsFg2)
                        .frame(width: 32, height: 32)
                        .background(Color.dsSurface)
                        .clipShape(RoundedRectangle(cornerRadius: 2))
                        .overlay(RoundedRectangle(cornerRadius: 2).strokeBorder(Color.dsHairline, lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 14)
        .background(Color.dsCard)
        .clipShape(RoundedRectangle(cornerRadius: 3))
        .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsHairline, lineWidth: 1))
    }

    private var weightNumpad: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 3), spacing: 6) {
            ForEach(Array(numpadKeys.enumerated()), id: \.offset) { _, key in
                Button { tapWeightKey(key) } label: {
                    Group {
                        if key == "del" {
                            Image(systemName: "delete.left")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundStyle(Color.dsFg2)
                        } else {
                            Text(key)
                                .font(.custom("IBMPlexMono-Medium", size: 18))
                                .foregroundStyle(Color.dsFg1)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 42)
                    .background(Color.dsCard)
                    .clipShape(RoundedRectangle(cornerRadius: 2))
                    .overlay(RoundedRectangle(cornerRadius: 2).strokeBorder(Color.dsHairline, lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: — Logic

    private func tapWeightKey(_ key: String) {
        if key == "del" {
            weightStr = weightStr.count > 1 ? String(weightStr.dropLast()) : "0"
        } else if key == "." {
            if !weightStr.contains(".") { weightStr += "." }
        } else {
            let candidate = weightStr == "0" ? key : weightStr + key
            if let dotIdx = candidate.firstIndex(of: ".") {
                let decimals = candidate.distance(from: candidate.index(after: dotIdx), to: candidate.endIndex)
                if decimals > 1 { return }
            }
            if let v = Double(candidate), v < 1000 { weightStr = candidate }
        }
    }

    private func adjustWeight(_ delta: Double) {
        let new = max(0, numericWeight + delta)
        weightStr = new == Double(Int(new)) ? "\(Int(new))" : String(format: "%.1f", new)
    }

    private func confirm() {
        let weight: Double? = numericWeight > 0 ? numericWeight : nil
        let r: Int? = (mode == .weightReps || mode == .reps) ? reps : nil
        let t: Double? = mode == .time ? numericTime : nil
        let dist: Double? = mode == .time ? Double(distanceStr) : nil
        onConfirm(mode, weight, r, t, dist)
        dismiss()
    }
}

private struct AdjustButton: View {
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.geist(12, weight: .semiBold))
                .tracking(0.3)
                .foregroundStyle(Color.dsFg2)
                .frame(width: 48, height: 36)
                .background(Color.dsElevated)
                .clipShape(RoundedRectangle(cornerRadius: 2))
                .overlay(RoundedRectangle(cornerRadius: 2).strokeBorder(Color.dsHairline, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

// MARK: — Exercise description sheet

struct ExerciseDescriptionSheet: View {
    @Environment(\.dismiss) var dismiss
    let exercise: Exercise

    var body: some View {
        ZStack {
            Color.dsCanvas.ignoresSafeArea()
            VStack(alignment: .leading, spacing: 0) {
                sheetHandle()
                HStack {
                    Text(exercise.name.uppercased())
                        .font(.geist(14, weight: .bold))
                        .foregroundStyle(Color.dsFg1)
                        .tracking(0.4)
                    Spacer()
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Color.dsFg3)
                            .frame(width: 28, height: 28)
                            .background(Color.dsSurface)
                            .clipShape(RoundedRectangle(cornerRadius: 3))
                            .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsHairline, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 12)
                Text(exercise.description)
                    .font(.geist(16, weight: .regular))
                    .foregroundStyle(Color.dsFg1)
                    .lineSpacing(5)
                    .padding(.horizontal, 24)
                Spacer()
            }
        }
        .presentationDetents([.medium])
        .presentationBackground(Color.dsCanvas)
    }
}
