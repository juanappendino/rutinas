import ActivityKit
import Foundation

struct RestTimerAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var secondsRemaining: Int
        var duration: Int
        var isRunning: Bool
        var endDate: Date
    }
}
