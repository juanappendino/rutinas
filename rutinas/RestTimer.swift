import Foundation
import AudioToolbox
#if canImport(UIKit)
import UIKit
#endif
#if canImport(ActivityKit)
import ActivityKit
#endif

@Observable
class RestTimer {
    var secondsRemaining: Int = 0
    var duration: Int = 60
    var isRunning: Bool = false
    private var timerRef: Timer?
    private var startDate: Date?
    private var _liveActivity: Any?

    @available(iOS 16.2, *)
    private var liveActivity: Activity<RestTimerAttributes>? {
        get { _liveActivity as? Activity<RestTimerAttributes> }
        set { _liveActivity = newValue }
    }

    var progress: Double {
        guard duration > 0 else { return 1 }
        return 1.0 - Double(secondsRemaining) / Double(duration)
    }

    var displayTime: String {
        let m = secondsRemaining / 60
        let s = secondsRemaining % 60
        return String(format: "%d:%02d", m, s)
    }

    func start(duration: Int) {
        self.duration = duration
        self.secondsRemaining = duration
        self.isRunning = true
        self.startDate = Date()
        timerRef?.invalidate()
        timerRef = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self else { return }
            if self.secondsRemaining > 0 {
                self.secondsRemaining -= 1
            } else {
                self.finish()
            }
        }
        updateIdleTimer()
        startLiveActivity(duration: duration)
    }

    // Recalcula el tiempo restante al volver del background
    func syncWithCurrentTime() {
        guard isRunning, let start = startDate else { return }
        let elapsed = Int(Date().timeIntervalSince(start))
        let remaining = max(0, duration - elapsed)
        if remaining == 0 { finish() } else { secondsRemaining = remaining }
    }

    func skip() {
        timerRef?.invalidate()
        timerRef = nil
        isRunning = false
        secondsRemaining = 0
        startDate = nil
        updateIdleTimer()
        endLiveActivity()
    }

    private func finish() {
        timerRef?.invalidate()
        timerRef = nil
        isRunning = false
        secondsRemaining = 0
        startDate = nil
        updateIdleTimer()
        endLiveActivity()
        #if canImport(UIKit)
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        AudioServicesPlaySystemSound(1005)
        #endif
    }

    private func updateIdleTimer() {
        #if canImport(UIKit)
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = self.isRunning
        }
        #endif
    }

    // MARK: — Live Activity

    private func startLiveActivity(duration: Int) {
        guard #available(iOS 16.2, *) else { return }
        #if canImport(ActivityKit)
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        let state = RestTimerAttributes.ContentState(
            secondsRemaining: duration,
            duration: duration,
            isRunning: true,
            endDate: Date().addingTimeInterval(Double(duration))
        )
        liveActivity = try? Activity<RestTimerAttributes>.request(
            attributes: RestTimerAttributes(),
            content: ActivityContent(state: state, staleDate: nil)
        )
        #endif
    }

    func updateLiveActivity(secondsRemaining: Int) {
        guard #available(iOS 16.2, *) else { return }
        #if canImport(ActivityKit)
        guard let activity = liveActivity else { return }
        let state = RestTimerAttributes.ContentState(
            secondsRemaining: secondsRemaining,
            duration: duration,
            isRunning: true,
            endDate: Date().addingTimeInterval(Double(secondsRemaining))
        )
        Task { await activity.update(ActivityContent(state: state, staleDate: nil)) }
        #endif
    }

    private func endLiveActivity() {
        guard #available(iOS 16.2, *) else { return }
        #if canImport(ActivityKit)
        guard let activity = liveActivity else { return }
        let state = RestTimerAttributes.ContentState(
            secondsRemaining: 0,
            duration: duration,
            isRunning: false,
            endDate: Date()
        )
        Task {
            await activity.end(
                ActivityContent(state: state, staleDate: nil),
                dismissalPolicy: .after(Date().addingTimeInterval(3))
            )
        }
        liveActivity = nil
        #endif
    }
}
