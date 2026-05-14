import SwiftUI

struct ContentView: View {
    @State private var manager = WorkoutManager()
    @State private var stopwatch = StopwatchTimer()
    @State private var restTimer = RestTimer()
    @Environment(\.scenePhase) private var scenePhase
    @AppStorage("hasOnboarded") private var hasOnboarded = false

    var body: some View {
        Group {
            if !hasOnboarded {
                OnboardingView()
                    .environment(manager)
                    .environment(stopwatch)
                    .environment(restTimer)
                    .preferredColorScheme(.dark)
                    .tint(.dsNaranja)
            } else {
                TabView {
                    TodayView()
                        .tabItem { Label("HOY", systemImage: "figure.strengthtraining.traditional") }
                    RoutinesView()
                        .tabItem { Label("RUTINAS", systemImage: "list.bullet.clipboard") }
                    HistoryView()
                        .tabItem { Label("HISTORIAL", systemImage: "calendar") }
                }
                .environment(manager)
                .environment(stopwatch)
                .environment(restTimer)
                .preferredColorScheme(.dark)
                .tint(.dsNaranja)
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active { restTimer.syncWithCurrentTime(); stopwatch.syncWithCurrentTime() }
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
