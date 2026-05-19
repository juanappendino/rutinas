import Foundation
import WatchConnectivity

// MARK: — iOS WatchBridge
// WCBridge es el delegado de WCSession. Tiene referencia débil a WorkoutManager
// para poder llamar sus métodos sin que WorkoutManager tenga que heredar NSObject.

final class WCBridge: NSObject, WCSessionDelegate {

    weak var manager: WorkoutManager?

    init(manager: WorkoutManager) {
        self.manager = manager
        super.init()
    }

    // MARK: — Activar

    func activate() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    // MARK: — Recepción desde Watch

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async {
            guard let mgr = self.manager,
                  let type = message["type"] as? String else { return }

            switch type {
            case "startSession":
                if mgr.activeSession == nil {
                    mgr.startWorkout()
                    mgr.pushStateToWatch()
                }

            case "finishSession":
                _ = mgr.finishWorkout()
                mgr.pushStateToWatch()

            case "cancelSession":
                mgr.cancelWorkout()
                mgr.pushStateToWatch()

            case "logSet":
                mgr.handleWatchLogSet(message)

            default: break
            }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        // El Watch no manda contexto por ahora, solo mensajes directos
    }

    // MARK: — WCSessionDelegate requeridos (iOS)

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if activationState == .activated {
            DispatchQueue.main.async { self.manager?.pushStateToWatch() }
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        WCSession.default.activate()
    }
}

// MARK: — WorkoutManager watch helpers

extension WorkoutManager {

    /// Crea el bridge y activa WCSession. Llamar desde init().
    func activateWCSession() {
        let bridge = WCBridge(manager: self)
        self._wcBridge = bridge
        bridge.activate()
    }

    /// Manda el estado actual al Watch (rutina activa + sesión en progreso si hay).
    func pushStateToWatch() {
        guard WCSession.isSupported(),
              WCSession.default.activationState == .activated else { return }
        print("📡 pushStateToWatch — isWatchAppInstalled: \(WCSession.default.isWatchAppInstalled), isPaired: \(WCSession.default.isPaired)")

        var context: [String: Any] = [:]

        if let data = try? JSONEncoder().encode(todayRoutine) {
            context["routine"] = data
        }

        if let session = activeSession,
           let data = try? JSONEncoder().encode(session) {
            context["activeSession"] = data
        } else {
            context["activeSession"] = Data()
        }

        try? WCSession.default.updateApplicationContext(context)
    }

    /// Manda un update inmediato al Watch cuando se completa una serie.
    func sendSetUpdateToWatch(exercise: Exercise, completedSets: [Int], weight: Double?, reps: Int?) {
        guard WCSession.isSupported(),
              WCSession.default.activationState == .activated,
              WCSession.default.isReachable else { return }

        var msg: [String: Any] = [
            "type": "setUpdate",
            "exerciseID": exercise.id.uuidString,
            "completedSets": completedSets
        ]
        if let w = weight { msg["weight"] = w }
        if let r = reps   { msg["reps"] = r }
        WCSession.default.sendMessage(msg, replyHandler: nil, errorHandler: nil)
    }

    /// Procesa un logSet enviado desde el Watch.
    func handleWatchLogSet(_ msg: [String: Any]) {
        guard let exerciseIDStr = msg["exerciseID"] as? String,
              let exerciseID = UUID(uuidString: exerciseIDStr),
              let setIndex = msg["setIndex"] as? Int else { return }

        let exercise = todayRoutine.muscleGroups
            .flatMap(\.exercises)
            .first { $0.id == exerciseID }
        guard let exercise else { return }

        let weight = msg["weight"] as? Double
        let reps   = msg["reps"] as? Int
        let time   = msg["time"] as? Double
        let type: SetType = (msg["setType"] as? String).flatMap { SetType(rawValue: $0) } ?? .weightReps

        logSet(setIndex, for: exercise, type: type, weight: weight, reps: reps, time: time, speed: nil)
        pushStateToWatch()
    }
}
