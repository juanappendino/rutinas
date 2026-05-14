import ActivityKit
import WidgetKit
import SwiftUI

private let verde   = Color(red: 31/255,  green: 191/255, blue: 85/255)
private let canvas  = Color(red: 17/255,  green: 22/255,  blue: 19/255)
private let surface = Color(red: 26/255,  green: 34/255,  blue: 29/255)
private let fg1     = Color.white
private let fg3     = Color(white: 0.55)

// MARK: — Widget

struct RestTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RestTimerAttributes.self) { context in
            LockScreenBanner(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    ExpandedCenter(context: context)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Descansando")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(fg3)
                        .tracking(1.4)
                        .textCase(.uppercase)
                }
            } compactLeading: {
                Image(systemName: "timer")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(verde)
            } compactTrailing: {
                Text(timerInterval: Date.now...context.state.endDate, countsDown: true)
                    .font(.system(size: 14, weight: .semibold).monospacedDigit())
                    .foregroundStyle(verde)
                    .frame(width: 48)
            } minimal: {
                Image(systemName: "timer")
                    .font(.system(size: 12))
                    .foregroundStyle(verde)
            }
            .keylineTint(verde)
        }
    }
}

// MARK: — Lock Screen Banner

private struct LockScreenBanner: View {
    let context: ActivityViewContext<RestTimerAttributes>

    var body: some View {
        HStack(spacing: 20) {
            TimelineView(.animation(minimumInterval: 1)) { timeline in
                let remaining = max(0, context.state.endDate.timeIntervalSince(timeline.date))
                let progress  = context.state.duration > 0
                    ? 1.0 - remaining / Double(context.state.duration)
                    : 1.0
                ArcDial(progress: progress)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text("DESCANSANDO")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(fg3)
                    .tracking(1.6)

                Text(timerInterval: Date.now...context.state.endDate, countsDown: true)
                    .font(.system(size: 36, weight: .bold).monospacedDigit())
                    .foregroundStyle(fg1)
                    .tracking(-0.72)
            }

            Spacer()

            Text("Saltar")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(verde)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 18)
        .background(canvas)
    }
}

// MARK: — Dynamic Island Expanded Center

private struct ExpandedCenter: View {
    let context: ActivityViewContext<RestTimerAttributes>

    var body: some View {
        HStack(spacing: 14) {
            TimelineView(.animation(minimumInterval: 1)) { timeline in
                let remaining = max(0, context.state.endDate.timeIntervalSince(timeline.date))
                let progress  = context.state.duration > 0
                    ? 1.0 - remaining / Double(context.state.duration)
                    : 1.0
                ArcDial(progress: progress, size: 44, lineWidth: 3)
            }

            Text(timerInterval: Date.now...context.state.endDate, countsDown: true)
                .font(.system(size: 30, weight: .bold).monospacedDigit())
                .foregroundStyle(fg1)
                .tracking(-0.6)
        }
        .padding(.vertical, 6)
    }
}

// MARK: — Arc Dial

private struct ArcDial: View {
    var progress: Double
    var size: CGFloat = 52
    var lineWidth: CGFloat = 3.5

    var body: some View {
        ZStack {
            Circle()
                .stroke(verde.opacity(0.18), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: CGFloat(progress))
                .stroke(verde, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
        .frame(width: size, height: size)
        .animation(.linear(duration: 1), value: progress)
    }
}
