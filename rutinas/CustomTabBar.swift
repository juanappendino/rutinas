import SwiftUI

// MARK: — Tab enum

enum AppTab: String, CaseIterable {
    case hoy      = "HOY"
    case rutinas  = "RUTINAS"
    case historial = "LOG"

    var icon: String {
        switch self {
        case .hoy:       return "figure.strengthtraining.traditional"
        case .rutinas:   return "list.bullet.clipboard"
        case .historial: return "calendar"
        }
    }
}

// MARK: — Custom Tab Bar

struct CustomTabBar: View {
    @Binding var selectedTab: AppTab

    var body: some View {
        VStack(spacing: 0) {
            // Línea divisora superior de 1px — sello brutalista
            Rectangle()
                .fill(Color.dsHairline)
                .frame(height: 1)

            HStack(spacing: 0) {
                ForEach(AppTab.allCases, id: \.self) { tab in
                    Button {
                        selectedTab = tab
                    } label: {
                        VStack(spacing: 5) {
                            Image(systemName: tab.icon)
                                .font(.system(size: 17, weight: .medium))
                            Text(tab.rawValue)
                                .font(.geist(9, weight: .semiBold))
                                .tracking(1.6)
                        }
                        .foregroundStyle(selectedTab == tab ? Color.dsNaranja : Color.dsFg3)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 12)
                        .padding(.bottom, 4)
                    }
                    .buttonStyle(.plain)
                }
            }
            .background(Color.dsCanvas)
        }
        .background(Color.dsCanvas)
    }
}
