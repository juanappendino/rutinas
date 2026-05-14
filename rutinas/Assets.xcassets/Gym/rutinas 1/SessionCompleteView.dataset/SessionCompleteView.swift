import SwiftUI

struct SessionCompleteView: View {
    let summary: SessionSummary
    let onDismiss: () -> Void

    @State private var appeared = false

    var body: some View {
        ZStack {
            Color.dsCanvas.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // — Título
                VStack(spacing: 8) {
                    Text("SESIÓN COMPLETA")
                        .font(.geist(9, weight: .semiBold))
                        .foregroundStyle(Color.dsNaranja)
                        .tracking(2.5)
                        .opacity(appeared ? 1 : 0)
                        .offset(y: appeared ? 0 : 12)
                        .animation(.easeOut(duration: 0.3).delay(0.05), value: appeared)

                    Text(summary.routineName.uppercased())
                        .font(.geist(36, weight: .bold))
                        .foregroundStyle(Color.dsFg1)
                        .tracking(0.5)
                        .opacity(appeared ? 1 : 0)
                        .offset(y: appeared ? 0 : 16)
                        .animation(.easeOut(duration: 0.35).delay(0.1), value: appeared)
                }
                .padding(.bottom, 40)

                // — Stats grid
                VStack(spacing: 8) {
                    HStack(spacing: 8) {
                        StatBlock(label: "DURACIÓN",
                                  value: summary.durationMinutes > 0 ? "\(summary.durationMinutes)" : "—",
                                  unit: summary.durationMinutes > 0 ? "MIN" : "",
                                  delay: 0.18)
                        StatBlock(label: "SERIES",
                                  value: "\(summary.totalSets)",
                                  unit: "",
                                  delay: 0.24)
                    }

                    if let h = summary.heaviestExercise {
                        HeaviestBlock(name: h.name, kg: h.kg, delay: 0.30)
                    }

                    if !summary.newPRs.isEmpty {
                        PRsBlock(prs: summary.newPRs, delay: 0.36)
                    }
                }
                .padding(.horizontal, 24)

                Spacer()

                // — CTA
                DSPrimaryButton(label: "Listo") { onDismiss() }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 48)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 20)
                    .animation(.easeOut(duration: 0.35).delay(0.5), value: appeared)
            }
        }
        .onAppear {
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            }
            withAnimation { appeared = true }
        }
    }
}

// MARK: — Stat block

private struct StatBlock: View {
    let label: String
    let value: String
    let unit: String
    let delay: Double
    @State private var appeared = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.geist(9, weight: .semiBold))
                .foregroundStyle(Color.dsFg4)
                .tracking(1.8)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value)
                    .font(.geist(28, weight: .bold))
                    .foregroundStyle(Color.dsFg1)
                if !unit.isEmpty {
                    Text(unit)
                        .font(.geist(12, weight: .medium))
                        .foregroundStyle(Color.dsFg3)
                        .tracking(0.5)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.dsCard)
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsHairline, lineWidth: 1))
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 14)
        .animation(.easeOut(duration: 0.32).delay(delay), value: appeared)
        .onAppear { appeared = true }
    }
}

// MARK: — Heaviest block

private struct HeaviestBlock: View {
    let name: String
    let kg: Double
    let delay: Double
    @State private var appeared = false

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text("MÁS PESADO")
                    .font(.geist(9, weight: .semiBold))
                    .foregroundStyle(Color.dsFg4)
                    .tracking(1.8)
                Text(name.uppercased())
                    .font(.geist(14, weight: .semiBold))
                    .foregroundStyle(Color.dsFg1)
                    .tracking(0.3)
                    .lineLimit(1)
            }
            Spacer()
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(String(format: "%.1f", kg))
                    .font(.geist(28, weight: .bold))
                    .foregroundStyle(Color.dsFg1)
                Text("KG")
                    .font(.geist(13, weight: .medium))
                    .foregroundStyle(Color.dsFg3)
                    .tracking(0.5)
            }
        }
        .padding(16)
        .background(Color.dsCard)
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsHairline, lineWidth: 1))
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 14)
        .animation(.easeOut(duration: 0.32).delay(delay), value: appeared)
        .onAppear { appeared = true }
    }
}

// MARK: — PRs block

private struct PRsBlock: View {
    let prs: [(name: String, kg: Double)]
    let delay: Double
    @State private var appeared = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "trophy.fill")
                    .font(.system(size: 11))
                    .foregroundStyle(Color.dsNaranja)
                Text(prs.count == 1 ? "NUEVO PR" : "\(prs.count) NUEVOS PRs")
                    .font(.geist(9, weight: .semiBold))
                    .foregroundStyle(Color.dsNaranja)
                    .tracking(1.8)
            }

            VStack(spacing: 6) {
                ForEach(Array(prs.enumerated()), id: \.offset) { _, pr in
                    HStack {
                        Text(pr.name.uppercased())
                            .font(.geist(12, weight: .semiBold))
                            .foregroundStyle(Color.dsFg1)
                            .tracking(0.2)
                            .lineLimit(1)
                        Spacer()
                        // Si el nombre incluye "· N REPS" o el valor es entero de reps, no mostrar KG
                        if pr.name.contains(" · ") {
                            // PR de reps o tiempo — el valor ya está embebido en el nombre
                            EmptyView()
                        } else {
                            HStack(alignment: .firstTextBaseline, spacing: 3) {
                                Text(String(format: "%.1f", pr.kg))
                                    .font(.geist(15, weight: .bold))
                                    .foregroundStyle(Color.dsNaranja)
                                Text("KG")
                                    .font(.geist(10, weight: .medium))
                                    .foregroundStyle(Color.dsNaranja.opacity(0.7))
                                    .tracking(0.5)
                            }
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.dsNaranja.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsNaranja.opacity(0.25), lineWidth: 1))
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 14)
        .animation(.easeOut(duration: 0.32).delay(delay), value: appeared)
        .onAppear { appeared = true }
    }
}
