import SwiftUI
import WatchKit

// MARK: — Colores (tokens del DS, re-declarados para el Watch target)

extension Color {
    static let wCanvas   = Color(hex: "0A0A0A")
    static let wCard     = Color(hex: "111111")
    static let wSurface  = Color(hex: "1E1E1E")
    static let wHairline = Color(hex: "2A2A2A")
    static let wFg1      = Color(hex: "F5F5F5")
    static let wFg2      = Color(hex: "AAAAAA")
    static let wFg3      = Color(hex: "666666")
    static let wFg4      = Color(hex: "3A3A3A")
    static let wNaranja  = Color(hex: "FF6B00")
    static let wRojo     = Color(hex: "E5443B")
    static let wOnPrimary = Color(hex: "0A0A0A")
}

// MARK: — Root View

struct WatchRootView: View {
    @State private var manager = WatchSessionManager()

    var body: some View {
        Group {
            if manager.activeSession != nil {
                WatchActiveView(manager: manager)
            } else {
                WatchIdleView(manager: manager)
            }
        }
        .background(Color.wCanvas)
    }
}

// MARK: — Idle View (sin sesión activa)

struct WatchIdleView: View {
    let manager: WatchSessionManager

    var body: some View {
        VStack(spacing: 8) {
            if let routine = manager.routine {
                // Nombre + grupos
                VStack(spacing: 2) {
                    Text("DÍA \(routine.dayNumber)\(routine.variant)")
                        .font(.system(size: 13, weight: .bold, design: .monospaced))
                        .foregroundStyle(Color.wNaranja)
                    Text(routine.muscleGroups.map(\.name).joined(separator: " · ").uppercased())
                        .font(.system(size: 10, weight: .regular))
                        .foregroundStyle(Color.wFg3)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                }
                .padding(.top, 4)

                // Cantidad ejercicios
                Text("\(manager.allExercises.count) ejercicios")
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundStyle(Color.wFg4)

                Spacer()

                // Botón empezar
                Button {
                    manager.startSession()
                } label: {
                    Text("EMPEZAR")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Color.wOnPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.wNaranja)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            } else {
                // Sin rutina cargada aún
                VStack(spacing: 8) {
                    Image(systemName: "iphone.and.arrow.right.inward")
                        .font(.system(size: 24))
                        .foregroundStyle(Color.wFg4)
                    Text("Abrí la app\nen el iPhone")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color.wFg3)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .padding(.horizontal, 8)
    }
}

// MARK: — Active View (sesión en progreso)

struct WatchActiveView: View {
    let manager: WatchSessionManager
    @State private var tab: Int = 0  // 0 = ejercicios, 1 = cronómetro

    var body: some View {
        TabView(selection: $tab) {
            WatchExercisesView(manager: manager)
                .tag(0)
            WatchStopwatchView(manager: manager)
                .tag(1)
        }
        .tabViewStyle(.page)
    }
}

// MARK: — Exercises View

struct WatchExercisesView: View {
    let manager: WatchSessionManager
    @State private var showFinish = false

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Header: ring + contadores
                HStack(spacing: 10) {
                    // Ring de progreso
                    ZStack {
                        Circle()
                            .stroke(Color.wSurface, lineWidth: 3)
                        Circle()
                            .trim(from: 0, to: manager.progress)
                            .stroke(Color.wNaranja, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                            .animation(.easeInOut(duration: 0.2), value: manager.progress)
                    }
                    .frame(width: 36, height: 36)
                    .overlay {
                        Text("\(manager.doneSets)")
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                            .foregroundStyle(Color.wFg1)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(manager.routine.map { "DÍA \($0.dayNumber)\($0.variant)" } ?? "—")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Color.wFg1)
                        Text("\(manager.doneSets)/\(manager.totalSets) series")
                            .font(.system(size: 10, weight: .regular, design: .monospaced))
                            .foregroundStyle(Color.wFg3)
                    }
                    Spacer()
                }
                .padding(.horizontal, 8)
                .padding(.bottom, 8)

                // Descanso activo
                if manager.isResting {
                    WatchRestBanner(manager: manager)
                        .padding(.horizontal, 8)
                        .padding(.bottom, 8)
                }

                // Lista de ejercicios por grupo
                ForEach(manager.routine?.muscleGroups ?? [], id: \.id) { group in
                    VStack(alignment: .leading, spacing: 0) {
                        // Separador de grupo
                        HStack {
                            Text(group.name.uppercased())
                                .font(.system(size: 9, weight: .semibold))
                                .foregroundStyle(Color.wFg4)
                                .tracking(1.5)
                            Rectangle().fill(Color.wHairline).frame(height: 1)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)

                        ForEach(group.exercises) { exercise in
                            WatchExerciseRow(exercise: exercise, manager: manager)
                        }
                    }
                }

                // Finalizar
                Button {
                    showFinish = true
                } label: {
                    Text("FINALIZAR")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color.wFg2)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.wSurface)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(Color.wHairline, lineWidth: 1))
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 8)
                .padding(.top, 12)
                .padding(.bottom, 16)
            }
        }
        .confirmationDialog("¿Finalizar?", isPresented: $showFinish) {
            Button("Finalizar", role: .destructive) { manager.finishSession() }
            Button("Cancelar", role: .cancel) {}
        }
    }
}

// MARK: — Exercise Row

struct WatchExerciseRow: View {
    let exercise: Exercise
    let manager: WatchSessionManager
    @State private var showSetInput = false

    private var completed: Set<Int> { manager.completedSets(for: exercise) }
    private var allDone: Bool { completed.count == exercise.sets }
    private var nextSet: Int? { (0..<exercise.sets).first { !completed.contains($0) } }

    var body: some View {
        Button {
            if !allDone { showSetInput = true }
        } label: {
            HStack(spacing: 8) {
                // Dots de series
                HStack(spacing: 3) {
                    ForEach(0..<exercise.sets, id: \.self) { i in
                        Circle()
                            .fill(completed.contains(i) ? Color.wNaranja : Color.wSurface)
                            .frame(width: 7, height: 7)
                            .overlay(Circle().strokeBorder(
                                completed.contains(i) ? Color.clear : Color.wHairline, lineWidth: 1
                            ))
                    }
                }
                .frame(width: CGFloat(exercise.sets) * 10, alignment: .leading)

                VStack(alignment: .leading, spacing: 1) {
                    Text(exercise.name.uppercased())
                        .font(.system(size: 11, weight: allDone ? .regular : .semibold))
                        .foregroundStyle(allDone ? Color.wFg4 : Color.wFg1)
                        .lineLimit(1)
                    if manager.exerciseSetType(for: exercise) == .time {
                        if let t = manager.sessionTime(for: exercise) {
                            Text(t < 60 ? "\(Int(t))s" : "\(Int(t)/60):\(String(format: "%02d", Int(t)%60))")
                                .font(.system(size: 10, weight: .regular, design: .monospaced))
                                .foregroundStyle(Color.wNaranja)
                        }
                    } else if let kg = manager.sessionWeight(for: exercise) {
                        Text(String(format: "%.1f kg", kg))
                            .font(.system(size: 10, weight: .regular, design: .monospaced))
                            .foregroundStyle(Color.wNaranja)
                    }
                }

                Spacer()

                if allDone {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color.wNaranja)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 8)
            .opacity(allDone ? 0.45 : 1.0)
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showSetInput) {
            WatchSetInputView(exercise: exercise, manager: manager, setIndex: nextSet ?? 0)
        }
    }
}

// MARK: — Set Input View

struct WatchSetInputView: View {
    let exercise: Exercise
    let manager: WatchSessionManager
    let setIndex: Int
    @Environment(\.dismiss) var dismiss

    @State private var isTimeMode: Bool
    @State private var weight: Double
    @State private var reps: Int
    @State private var seconds: Double

    init(exercise: Exercise, manager: WatchSessionManager, setIndex: Int) {
        self.exercise = exercise
        self.manager = manager
        self.setIndex = setIndex

        let inferredTime = manager.exerciseSetType(for: exercise) == .time
        _isTimeMode = State(initialValue: inferredTime)

        let lastKg = manager.sessionWeight(for: exercise) ?? 0
        let lastReps = manager.sessionReps(for: exercise) ?? {
            exercise.reps
                .components(separatedBy: CharacterSet.decimalDigits.inverted)
                .compactMap(Int.init).first ?? 10
        }()
        let lastTime: Double = {
            if let t = manager.sessionTime(for: exercise) { return t }
            let num = exercise.reps
                .components(separatedBy: CharacterSet.decimalDigits.inverted)
                .compactMap(Int.init).first ?? 30
            return Double(num)
        }()

        _weight  = State(initialValue: lastKg)
        _reps    = State(initialValue: lastReps)
        _seconds = State(initialValue: lastTime)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                // Título
                VStack(spacing: 2) {
                    Text("SERIE \(setIndex + 1)")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(Color.wFg4)
                        .tracking(1.5)
                    Text(exercise.name.uppercased())
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color.wFg1)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                }
                .padding(.top, 4)

                // Selector Reps / Tiempo
                HStack(spacing: 0) {
                    ForEach([(false, "REPS"), (true, "TIEMPO")], id: \.1) { isTime, label in
                        Button {
                            withAnimation(.easeInOut(duration: 0.15)) { isTimeMode = isTime }
                        } label: {
                            Text(label)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(isTimeMode == isTime ? Color.wOnPrimary : Color.wFg3)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 6)
                                .background(isTimeMode == isTime ? Color.wNaranja : Color.clear)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(3)
                .background(Color.wSurface)
                .clipShape(RoundedRectangle(cornerRadius: 8))

                if isTimeMode {
                    // ── MODO TIEMPO ──────────────────────────────
                    VStack(spacing: 4) {
                        Text("TIEMPO")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(Color.wFg4)
                            .tracking(1.5)

                        HStack(alignment: .firstTextBaseline, spacing: 3) {
                            Text(timeDisplay(seconds))
                                .font(.system(size: 28, weight: .bold, design: .monospaced))
                                .foregroundStyle(Color.wFg1)
                            Text("s")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Color.wFg3)
                        }
                        .focusable()
                        .digitalCrownRotation(
                            $seconds,
                            from: 5, through: 600,
                            by: 5,
                            sensitivity: .medium,
                            isContinuous: false,
                            isHapticFeedbackEnabled: true
                        )

                        // Botones ±15s
                        HStack(spacing: 12) {
                            Button { seconds = max(5, seconds - 15) } label: {
                                Text("−15s")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(Color.wFg2)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 6)
                                    .background(Color.wSurface)
                                    .clipShape(RoundedRectangle(cornerRadius: 6))
                            }
                            .buttonStyle(.plain)
                            Button { seconds = min(600, seconds + 15) } label: {
                                Text("+15s")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(Color.wFg2)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 6)
                                    .background(Color.wSurface)
                                    .clipShape(RoundedRectangle(cornerRadius: 6))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 8)
                    .padding(.horizontal, 4)
                    .background(Color.wCard)
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                } else {
                    // ── MODO PESO + REPS ─────────────────────────

                    // Peso con Digital Crown
                    VStack(spacing: 4) {
                        Text("PESO")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(Color.wFg4)
                            .tracking(1.5)
                        HStack(alignment: .firstTextBaseline, spacing: 3) {
                            Text(weight > 0 ? String(format: "%.1f", weight) : "—")
                                .font(.system(size: 28, weight: .bold, design: .monospaced))
                                .foregroundStyle(weight > 0 ? Color.wFg1 : Color.wFg4)
                            Text("kg")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Color.wFg3)
                        }
                        .focusable()
                        .digitalCrownRotation(
                            $weight,
                            from: 0, through: 300,
                            by: 2.5,
                            sensitivity: .low,
                            isContinuous: false,
                            isHapticFeedbackEnabled: true
                        )

                        // Botones ±2.5
                        HStack(spacing: 12) {
                            Button { weight = max(0, weight - 2.5) } label: {
                                Text("−2.5")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(Color.wFg2)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 6)
                                    .background(Color.wSurface)
                                    .clipShape(RoundedRectangle(cornerRadius: 6))
                            }
                            .buttonStyle(.plain)
                            Button { weight += 2.5 } label: {
                                Text("+2.5")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(Color.wFg2)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 6)
                                    .background(Color.wSurface)
                                    .clipShape(RoundedRectangle(cornerRadius: 6))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 8)
                    .padding(.horizontal, 4)
                    .background(Color.wCard)
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                    // Reps
                    VStack(spacing: 4) {
                        Text("REPS")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(Color.wFg4)
                            .tracking(1.5)
                        HStack(spacing: 16) {
                            Button { if reps > 1 { reps -= 1 } } label: {
                                Image(systemName: "minus")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Color.wFg2)
                                    .frame(width: 36, height: 36)
                                    .background(Color.wSurface)
                                    .clipShape(Circle())
                            }
                            .buttonStyle(.plain)
                            Text("\(reps)")
                                .font(.system(size: 28, weight: .bold, design: .monospaced))
                                .foregroundStyle(Color.wFg1)
                                .frame(minWidth: 40, alignment: .center)
                            Button { reps += 1 } label: {
                                Image(systemName: "plus")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Color.wFg2)
                                    .frame(width: 36, height: 36)
                                    .background(Color.wSurface)
                                    .clipShape(Circle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 8)
                    .padding(.horizontal, 4)
                    .background(Color.wCard)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                // Confirmar
                Button {
                    WKInterfaceDevice.current().play(.success)
                    if isTimeMode {
                        manager.logSet(exercise: exercise, setIndex: setIndex,
                                       weight: nil, reps: nil, time: seconds)
                    } else {
                        manager.logSet(exercise: exercise, setIndex: setIndex,
                                       weight: weight > 0 ? weight : nil, reps: reps)
                    }
                    dismiss()
                } label: {
                    Text("CONFIRMAR")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Color.wOnPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.wNaranja)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 16)
        }
    }

    /// Formatea segundos: <60 → "45s", ≥60 → "1:30"
    private func timeDisplay(_ s: Double) -> String {
        let total = Int(s)
        if total < 60 { return "\(total)" }
        return "\(total / 60):\(String(format: "%02d", total % 60))"
    }
}

// MARK: — Rest Banner

struct WatchRestBanner: View {
    let manager: WatchSessionManager
    @State private var initialSeconds: Int = 0

    var progress: Double {
        guard initialSeconds > 0 else { return 0 }
        return Double(manager.restSecondsRemaining) / Double(initialSeconds)
    }

    var body: some View {
        HStack(spacing: 8) {
            ZStack {
                Circle().stroke(Color.wSurface, lineWidth: 3)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(Color.wNaranja, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 1), value: manager.restSecondsRemaining)
            }
            .frame(width: 28, height: 28)

            VStack(alignment: .leading, spacing: 1) {
                Text("DESCANSO")
                    .font(.system(size: 8, weight: .semibold))
                    .foregroundStyle(Color.wFg4)
                    .tracking(1.2)
                Text("\(manager.restSecondsRemaining)s")
                    .font(.system(size: 16, weight: .bold, design: .monospaced))
                    .foregroundStyle(Color.wNaranja)
            }

            Spacer()

            Button { manager.stopRest() } label: {
                Text("SALTAR")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(Color.wFg3)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.wSurface)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color.wCard)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(Color.wNaranja.opacity(0.3), lineWidth: 1))
        .onAppear { initialSeconds = manager.restSecondsRemaining }
    }
}

// MARK: — Stopwatch View

struct WatchStopwatchView: View {
    let manager: WatchSessionManager
    @State private var countdownTarget: Int = 60
    @State private var countdownRemaining: Int = 0
    @State private var countdownRunning: Bool = false
    @State private var countdownTimer: Timer? = nil

    private let presets = [(30, "30s"), (60, "1m"), (120, "2m"), (180, "3m"), (300, "5m")]

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                // Cronómetro
                VStack(spacing: 2) {
                    Text("CRONÓMETRO")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(Color.wFg4)
                        .tracking(1.5)
                    Text(manager.stopwatchDisplay)
                        .font(.system(size: 32, weight: .bold, design: .monospaced))
                        .foregroundStyle(Color.wFg1)
                        .tracking(-1)
                }
                .padding(.top, 4)

                // Temporizador de cuenta regresiva
                VStack(spacing: 6) {
                    Text("TEMPORIZADOR")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(Color.wFg4)
                        .tracking(1.5)

                    if countdownRunning {
                        ZStack {
                            Circle()
                                .stroke(Color.wSurface, lineWidth: 4)
                            Circle()
                                .trim(from: 0, to: Double(countdownRemaining) / Double(countdownTarget))
                                .stroke(Color.wNaranja, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                                .rotationEffect(.degrees(-90))
                                .animation(.linear(duration: 1), value: countdownRemaining)
                        }
                        .frame(width: 52, height: 52)
                        .overlay {
                            Text("\(countdownRemaining)")
                                .font(.system(size: 16, weight: .bold, design: .monospaced))
                                .foregroundStyle(Color.wNaranja)
                        }

                        Button { stopCountdown() } label: {
                            Text("CANCELAR")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(Color.wFg3)
                        }
                        .buttonStyle(.plain)
                    } else {
                        // Chips de preset
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 6) {
                            ForEach(presets, id: \.0) { secs, label in
                                Button {
                                    startCountdown(seconds: secs)
                                } label: {
                                    Text(label)
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundStyle(Color.wFg2)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 8)
                                        .background(Color.wSurface)
                                        .clipShape(RoundedRectangle(cornerRadius: 6))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(.vertical, 8)
                .padding(.horizontal, 4)
                .background(Color.wCard)
                .clipShape(RoundedRectangle(cornerRadius: 8))

                Spacer().frame(height: 8)
            }
            .padding(.horizontal, 8)
        }
    }

    private func startCountdown(seconds: Int) {
        stopCountdown()
        countdownTarget = seconds
        countdownRemaining = seconds
        countdownRunning = true
        countdownTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if countdownRemaining > 0 {
                countdownRemaining -= 1
            } else {
                stopCountdown()
                WKInterfaceDevice.current().play(.notification)
            }
        }
    }

    private func stopCountdown() {
        countdownTimer?.invalidate()
        countdownTimer = nil
        countdownRunning = false
        countdownRemaining = 0
    }
}

// MARK: — Color hex extension (duplicado para el Watch target)

private extension Color {
    init(hex: String) {
        let h = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var n: UInt64 = 0
        Scanner(string: h).scanHexInt64(&n)
        self.init(
            red:   Double((n >> 16) & 0xFF) / 255,
            green: Double((n >> 8)  & 0xFF) / 255,
            blue:  Double( n        & 0xFF) / 255
        )
    }
}
