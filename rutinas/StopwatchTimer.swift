import Foundation
import AudioToolbox
#if canImport(UIKit)
import UIKit
#endif

@Observable
class StopwatchTimer {
    enum Mode { case stopwatch, countdown }

    var totalSeconds: Int = 0
    var isRunning: Bool = false
    var mode: Mode = .stopwatch
    var countdownTarget: Int = 0  // segundos objetivo en modo countdown

    private var timerRef: Timer?
    private var resumeDate: Date?
    private var accumulatedSeconds: Int = 0

    // MARK: — Display

    var displayTime: String {
        let secs = mode == .countdown ? max(0, countdownTarget - totalSeconds) : totalSeconds
        let m = secs / 60
        let s = secs % 60
        return String(format: "%d:%02d", m, s)
    }

    var progress: Double {
        guard mode == .countdown, countdownTarget > 0 else { return 0 }
        return Double(totalSeconds) / Double(countdownTarget)
    }

    var isFinished: Bool {
        mode == .countdown && totalSeconds >= countdownTarget && countdownTarget > 0
    }

    // MARK: — Controls

    func toggle() {
        isRunning ? pause() : resume()
    }

    func reset() {
        pause()
        accumulatedSeconds = 0
        resumeDate = nil
        totalSeconds = 0
    }

    func startCountdown(seconds: Int) {
        reset()
        mode = .countdown
        countdownTarget = seconds
        resume()
    }

    func switchToStopwatch() {
        reset()
        mode = .stopwatch
    }

    func addCountdown(seconds: Int) {
        guard mode == .countdown else { return }
        countdownTarget += seconds
    }

    func syncWithCurrentTime() {
        guard isRunning, let start = resumeDate else { return }
        let elapsed = Int(Date().timeIntervalSince(start))
        totalSeconds = accumulatedSeconds + elapsed
        if isFinished { finish() }
    }

    // MARK: — Private

    private func resume() {
        isRunning = true
        accumulatedSeconds = totalSeconds
        resumeDate = Date()
        timerRef?.invalidate()
        timerRef = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self, let start = self.resumeDate else { return }
            self.totalSeconds = self.accumulatedSeconds + Int(Date().timeIntervalSince(start))
            if self.isFinished { self.finish() }
        }
        updateIdleTimer()
    }

    private func pause() {
        accumulatedSeconds = totalSeconds
        resumeDate = nil
        timerRef?.invalidate()
        timerRef = nil
        isRunning = false
        updateIdleTimer()
    }

    private func finish() {
        pause()
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
}
