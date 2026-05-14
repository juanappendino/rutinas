import SwiftUI
import Foundation
import CoreText

// MARK: — Color tokens

extension Color {
    static let dsCanvas    = Color(hex: "0A0A0A")
    static let dsCard      = Color(hex: "111111")
    static let dsElevated  = Color(hex: "161616")
    static let dsSurface   = Color(hex: "1E1E1E")
    static let dsHairline  = Color(hex: "2A2A2A")

    static let dsFg1 = Color(hex: "F5F5F5")
    static let dsFg2 = Color(hex: "AAAAAA")
    static let dsFg3 = Color(hex: "666666")
    static let dsFg4 = Color(hex: "3A3A3A")

    // Naranja real — acento único
    static let dsVerde     = Color(hex: "FF6B00")   // alias mantenido para no tocar lógica
    static let dsVerde400  = Color(hex: "FF8533")
    static let dsVerde300  = Color(hex: "FFA366")
    static let dsNaranja   = Color(hex: "FF6B00")
    static let dsRojo      = Color(hex: "E5443B")
    static let dsRojo400   = Color(hex: "FF5A52")
    static let dsOnPrimary = Color(hex: "0A0A0A")

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

// MARK: — Font helpers

extension Font {
    /// Fuente principal: IBM Plex Mono — monoespaciada, industrial, sin adornos.
    static func geist(_ size: CGFloat, weight: GeistWeight = .regular) -> Font {
        .custom(weight.plexMonoName, size: size)
    }

    enum GeistWeight {
        case thin, light, regular, medium, semiBold, bold, extraBold, black

        var fontWeight: Font.Weight {
            switch self {
            case .thin:      return .thin
            case .light:     return .light
            case .regular:   return .regular
            case .medium:    return .medium
            case .semiBold:  return .semibold
            case .bold:      return .bold
            case .extraBold: return .heavy
            case .black:     return .black
            }
        }

        var plexMonoName: String {
            switch self {
            case .thin:      return "IBMPlexMono-Thin"
            case .light:     return "IBMPlexMono-Light"
            case .regular:   return "IBMPlexMono-Regular"
            case .medium:    return "IBMPlexMono-Medium"
            case .semiBold:  return "IBMPlexMono-SemiBold"
            case .bold:      return "IBMPlexMono-Bold"
            case .extraBold: return "IBMPlexMono-Bold"
            case .black:     return "IBMPlexMono-Bold"
            }
        }
    }
}

// MARK: — Font registration

func registerGeistFonts() {
    let names = [
        "IBMPlexMono-Thin", "IBMPlexMono-Light", "IBMPlexMono-Regular",
        "IBMPlexMono-Medium", "IBMPlexMono-SemiBold", "IBMPlexMono-Bold",
    ]
    let basePath = "Geist,IBM_Plex_Mono,Karla/IBM_Plex_Mono"
    for name in names {
        let paths = [name, "\(basePath)/\(name)"]
        for path in paths {
            if let url = Bundle.main.url(forResource: path, withExtension: "ttf") {
                var error: Unmanaged<CFError>?
                if CTFontManagerRegisterFontsForURL(url as CFURL, .process, &error) {
                    print("✅ \(name) registrada")
                    break
                }
            }
        }
    }
}

// MARK: — Shared UI pieces

// "1A" — número grande en mono + letra en naranja
struct DayNumeral: View {
    let dayNumber: Int
    let variant: String
    var size: CGFloat = 56

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 1) {
            Text("\(dayNumber)")
                .font(.custom("IBMPlexMono-Bold", size: size))
                .foregroundStyle(Color.dsFg1)
                .tracking(size * -0.02)
            Text(variant)
                .font(.custom("IBMPlexMono-Medium", size: size * 0.34))
                .foregroundStyle(Color.dsNaranja)
        }
    }
}

// "ABS ———————— 0/2"
struct SectionRule: View {
    let label: String
    var right: String? = nil

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(label.uppercased())
                .font(.geist(11, weight: .semiBold))
                .foregroundStyle(Color.dsFg3)
                .tracking(2.0)
            Rectangle()
                .fill(Color.dsHairline)
                .frame(height: 1)
            if let right {
                Text(right)
                    .font(.geist(11, weight: .medium))
                    .foregroundStyle(Color.dsFg4)
            }
        }
    }
}

struct DSEyebrow: View {
    let text: String
    var color: Color = .dsFg3

    var body: some View {
        Text(text.uppercased())
            .font(.geist(10, weight: .semiBold))
            .tracking(1.4)
            .foregroundStyle(color)
    }
}

struct DSCard<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        VStack(spacing: 0) { content }
            .background(Color.dsCard)
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .strokeBorder(Color.dsHairline, lineWidth: 1)
            )
    }
}

struct DSPrimaryButton: View {
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label.uppercased())
                .font(.geist(15, weight: .bold))
                .tracking(1.5)
                .foregroundStyle(Color.dsOnPrimary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.dsNaranja)
                .clipShape(RoundedRectangle(cornerRadius: 4))
        }
    }
}

// MARK: — DS Secondary Button

struct DSSecondaryButton: View {
    let label: String
    var destructive: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label.uppercased())
                .font(.geist(15, weight: .semiBold))
                .tracking(1.0)
                .foregroundStyle(destructive ? Color.dsRojo400 : Color.dsFg2)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.dsSurface)
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(
                    destructive ? Color.dsRojo.opacity(0.4) : Color.dsHairline, lineWidth: 1
                ))
        }
    }
}

// MARK: — DS TextField

struct DSTextField: View {
    let placeholder: String
    @Binding var text: String
    var axis: Axis = .horizontal
    var lineLimit: ClosedRange<Int>? = nil

    var body: some View {
        Group {
            if let limit = lineLimit {
                TextField(placeholder, text: $text, axis: .vertical)
                    .lineLimit(limit)
            } else {
                TextField(placeholder, text: $text, axis: axis)
            }
        }
        .font(.geist(15, weight: .regular))
        .foregroundStyle(Color.dsFg1)
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Color.dsSurface)
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsHairline, lineWidth: 1))
        .tint(Color.dsNaranja)
    }
}

// MARK: — DS Alert

struct DSAlertButton {
    let label: String
    var destructive: Bool = false
    var isCancel: Bool = false
    let action: () -> Void
}

struct DSAlert: View {
    let title: String
    var message: String? = nil
    let buttons: [DSAlertButton]
    var inputField: (placeholder: String, binding: Binding<String>)? = nil

    var body: some View {
        ZStack {
            Color.black.opacity(0.6)
                .ignoresSafeArea()
                .allowsHitTesting(true)

            VStack(spacing: 0) {
                VStack(spacing: 6) {
                    Text(title)
                        .font(.geist(17, weight: .semiBold))
                        .foregroundStyle(Color.dsFg1)
                        .multilineTextAlignment(.center)
                    if let msg = message {
                        Text(msg)
                            .font(.geist(13, weight: .regular))
                            .foregroundStyle(Color.dsFg3)
                            .multilineTextAlignment(.center)
                    }
                    if let field = inputField {
                        DSTextField(placeholder: field.placeholder, text: field.binding)
                            .padding(.top, 8)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .padding(.bottom, 20)

                Rectangle().fill(Color.dsHairline).frame(height: 1)

                VStack(spacing: 0) {
                    ForEach(Array(buttons.enumerated()), id: \.offset) { i, btn in
                        if i > 0 { Rectangle().fill(Color.dsHairline).frame(height: 1) }
                        Button(action: btn.action) {
                            Text(btn.label.uppercased())
                                .font(.geist(14, weight: btn.isCancel ? .regular : .semiBold))
                                .tracking(0.8)
                                .foregroundStyle(
                                    btn.destructive ? Color.dsRojo400 :
                                    btn.isCancel    ? Color.dsFg3 :
                                                      Color.dsNaranja
                                )
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .background(Color.dsCard)
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(Color.dsHairline, lineWidth: 1))
            .padding(.horizontal, 40)
            .shadow(color: Color.black.opacity(0.6), radius: 32, y: 12)
        }
    }
}

// MARK: — DS Alert modifier

extension View {
    func dsAlert(isPresented: Binding<Bool>, content: @escaping () -> DSAlert) -> some View {
        self.overlay {
            if isPresented.wrappedValue {
                content()
                    .transition(.opacity.combined(with: .scale(scale: 0.94)))
                    .animation(.spring(duration: 0.22, bounce: 0.1), value: isPresented.wrappedValue)
                    .zIndex(999)
            }
        }
        .animation(.spring(duration: 0.22, bounce: 0.1), value: isPresented.wrappedValue)
    }
}
