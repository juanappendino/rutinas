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
                MainContainerView()
                    .environment(manager)
                    .environment(stopwatch)
                    .environment(restTimer)
                    .preferredColorScheme(.dark)
                    .tint(.dsNaranja)
                    .onChange(of: scenePhase) { _, phase in
                        if phase == .active {
                            restTimer.syncWithCurrentTime()
                            stopwatch.syncWithCurrentTime()
                            manager.pushStateToWatch()
                        }
                    }
            }
        }
    }
}

// MARK: — Main Container (navegación custom)

struct MainContainerView: View {
    @State private var selectedTab: AppTab = .hoy

    var body: some View {
        VStack(spacing: 0) {
            // Contenido activo
            Group {
                switch selectedTab {
                case .hoy:       TodayView()
                case .rutinas:   RoutinesView()
                case .historial: HistoryView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Barra de navegación propia
            CustomTabBar(selectedTab: $selectedTab)
        }
        .background(Color.dsCanvas)
        .ignoresSafeArea(.keyboard)
    }
}

#Preview {
    ContentView()
}
