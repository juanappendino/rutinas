import Foundation
import WatchConnectivity
import SwiftUI

// MARK: — Watch Session Manager
// Fuente de verdad en el Watch. Recibe la rutina y sesión desde el iPhone via WCSession.
// También envía acciones al iPhone (iniciar, logSet, finalizar).

@Observable
class WatchSessionManager: NSObject, WCSessionDelegate {

    // Estado recibido del iPhone
    var routine: DayVariant? = nil
    var activeSession: WorkoutSession? = nil

    // UI local
    var restSecondsRemaining: Int = 0
    var isResting: Bool = false
    private var restTimer: Timer? = nil

    // Cronómetro local
    var stopwatchSeconds: Int = 0
    var stopwatchRunning: Bool = false
    private var stopwatchTimer: Timer? = nil

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    // MARK: — Computed helpers

    var allExercises: [Exercise] {
        routine?.muscleGroups.flatMap(\.exercises) ?? []
    }

    var totalSets: Int {
        allExercises.reduce(0) { $0 + $1.sets }
    }

    var doneSets: Int {
        guard let s = activeSession else { return 0 }
        return s.completedSetsLog.values.reduce(0) { $0 + $1.count }
    }

    var progress: Double {
        totalSets > 0 ? Double(doneSets) / Double(totalSets) : 0
    }

    func completedSets(for exercise: Exercise) -> Set<Int> {
        let key = exercise.id.uuidString
        return Set(activeSession?.completedSetsLog[key] ?? [])
    }

    func sessionWeight(for exercise: Exercise) -> Double? {
        activeSession?.weightLog[exercise.id.uuidString]
    }

    func sessionReps(for exercise: Exercise) -> Int? {
        activeSession?.repsLog[exercise.id.uuidString]
    }

    var nextExercise: Exercise? {
        guard activeSession != nil else { return nil }
        return allExercises.first { exercise in
            completedSets(for: exercise).count < exercise.sets
        }
    }

    // MARK: — Acciones → iPhone

    func startSession() {
        send(["type": "startSession"])
        // Optimistic: arrancar cronómetro local
        startStopwatch()
    }

    func finishSession() {
        send(["type": "finishSession"])
        stopStopwatch()
        stopRest()
    }

    func cancelSession() {
        send(["type": "cancelSession"])
        stopStopwatch()
        stopRest()
    }

    func exerciseSetType(for exercise: Exercise) -> SetType {
        if let raw = activeSession?.setTypeLog[exercise.id.uuidString],
           let type = SetType(rawValue: raw) {
            return type
        }
        // Fallback: inferir del campo reps del ejercicio ("10 min", "30 seg", etc.)
        return SetType.inferred(from: exercise.reps)
    }

    func sessionTime(for exercise: Exercise) -> Double? {
        activeSession?.timeLog[exercise.id.uuidString]
    }

    func logSet(exercise: Exercise, setIndex: Int, weight: Double?, reps: Int?, time: Double? = nil) {
        let type: SetType = time != nil ? .time : .weightReps
        var msg: [String: Any] = [
            "type": "logSet",
            "exerciseID": exercise.id.uuidString,
            "setIndex": setIndex,
            "setType": type.rawValue
        ]
        if let w = weight { msg["weight"] = w }
        if let r = reps   { msg["reps"] = r }
        if let t = time   { msg["time"] = t }
        send(msg)

        // Optimistic local update
        var s = activeSession ?? WorkoutSession(dayNumber: routine?.dayNumber ?? 1, variant: routine?.variant ?? "")
        let key = exercise.id.uuidString
        s.setTypeLog[key] = type.rawValue
        if let w = weight { s.weightLog[key] = w }
        if let r = reps   { s.repsLog[key] = r }
        if let t = time   { s.timeLog[key] = t }
        var indices = Set(s.completedSetsLog[key] ?? [])
        indices.insert(setIndex)
        s.completedSetsLog[key] = Array(indices)
        if indices.count == exercise.sets, !s.completedExerciseIDs.contains(exercise.id) {
            s.completedExerciseIDs.append(exercise.id)
        }
        activeSession = s

        // Iniciar descanso
        startRest(seconds: indices.count == exercise.sets ? 60 : 25)
    }

    private func send(_ message: [String: Any]) {
        guard WCSession.default.activationState == .activated else { return }
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(message, replyHandler: nil, errorHandler: nil)
        }
    }

    // MARK: — Descanso local

    func startRest(seconds: Int) {
        stopRest()
        restSecondsRemaining = seconds
        isResting = true
        restTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self else { return }
            if self.restSecondsRemaining > 0 {
                self.restSecondsRemaining -= 1
            } else {
                self.stopRest()
                WKInterfaceDevice.current().play(.notification)
            }
        }
    }

    func stopRest() {
        restTimer?.invalidate()
        restTimer = nil
        isResting = false
        restSecondsRemaining = 0
    }

    var restProgress: Double {
        0 // calculado en la vista con el valor inicial
    }

    // MARK: — Cronómetro local

    func startStopwatch() {
        guard !stopwatchRunning else { return }
        stopwatchRunning = true
        stopwatchTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            self?.stopwatchSeconds += 1
        }
    }

    func stopStopwatch() {
        stopwatchTimer?.invalidate()
        stopwatchTimer = nil
        stopwatchRunning = false
        stopwatchSeconds = 0
    }

    var stopwatchDisplay: String {
        let m = stopwatchSeconds / 60
        let s = stopwatchSeconds % 60
        return String(format: "%d:%02d", m, s)
    }

    // MARK: — WCSessionDelegate: recibir del iPhone

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async {
            if let data = applicationContext["routine"] as? Data,
               let r = try? JSONDecoder().decode(DayVariant.self, from: data) {
                self.routine = r
            }
            if let data = applicationContext["activeSession"] as? Data, !data.isEmpty,
               let s = try? JSONDecoder().decode(WorkoutSession.self, from: data) {
                self.activeSession = s
                if !self.stopwatchRunning { self.startStopwatch() }
            } else if let data = applicationContext["activeSession"] as? Data, data.isEmpty {
                self.activeSession = nil
                self.stopStopwatch()
                self.stopRest()
            }
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async {
            guard let type = message["type"] as? String, type == "setUpdate" else { return }
            guard let exerciseIDStr = message["exerciseID"] as? String,
                  let exerciseID = UUID(uuidString: exerciseIDStr),
                  let completedSets = message["completedSets"] as? [Int] else { return }

            guard var s = self.activeSession else { return }
            let key = exerciseID.uuidString
            s.completedSetsLog[key] = completedSets
            if let w = message["weight"] as? Double { s.weightLog[key] = w }
            if let r = message["reps"] as? Int      { s.repsLog[key] = r }
            self.activeSession = s
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
}

// MARK: — WKInterfaceDevice shim para compilar sin import WatchKit en previews
import WatchKit
