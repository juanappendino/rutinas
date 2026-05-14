import SwiftUI
import Charts

struct ExerciseProgressView: View {
    @Environment(WorkoutManager.self) var manager
    @Environment(\.dismiss) var dismiss
    let exercise: Exercise

    var data: [(date: Date, kg: Double)] { manager.weightHistory(for: exercise) }

    private var maxKg: Double { data.map(\.kg).max() ?? 0 }
    private var lastKg: Double { data.last?.kg ?? 0 }
    private var avgKg: Double {
        data.isEmpty ? 0 : data.map(\.kg).reduce(0, +) / Double(data.count)
    }
    private var gain: Double { data.count > 1 ? lastKg - (data.first?.kg ?? 0) : 0 }

    var body: some View {
        ZStack {
            Color.dsCanvas.ignoresSafeArea()
            if data.isEmpty {
                VStack(spacing: 0) {
                    HStack {
                        Button { dismiss() } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 12, weight: .semibold))
                                Text("ATRÁS")
                                    .font(.geist(11, weight: .semiBold))
                                    .tracking(0.6)
                            }
                            .foregroundStyle(Color.dsFg2)
                        }
                        .buttonStyle(.plain)
                        Spacer()
                    }
                    .padding(.horizontal, 20).padding(.top, 16)
                    Spacer()
                    ContentUnavailableView(
                        "Sin datos aún",
                        systemImage: "chart.line.uptrend.xyaxis",
                        description: Text("Registrá cargas durante el entrenamiento para ver tu progreso acá")
                    )
                    Spacer()
                }
            } else {
                ScrollView {
                        VStack(alignment: .leading, spacing: 0) {

                            // Nav bar custom
                            HStack {
                                Button { dismiss() } label: {
                                    HStack(spacing: 6) {
                                        Image(systemName: "chevron.left")
                                            .font(.system(size: 12, weight: .semibold))
                                        Text("ATRÁS")
                                            .font(.geist(11, weight: .semiBold))
                                            .tracking(0.6)
                                    }
                                    .foregroundStyle(Color.dsFg2)
                                }
                                .buttonStyle(.plain)
                                Spacer()
                                Text(exercise.name.uppercased())
                                    .font(.geist(11, weight: .semiBold))
                                    .foregroundStyle(Color.dsFg3)
                                    .tracking(0.6)
                                    .lineLimit(1)
                            }
                            .padding(.horizontal, 20)
                            .padding(.top, 16)
                            .padding(.bottom, 8)

                            // Hero: máximo + ganancia
                            HStack(alignment: .bottom) {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("MÁXIMO")
                                        .font(.geist(10, weight: .semiBold))
                                        .foregroundStyle(Color.dsFg3)
                                        .tracking(2)
                                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                                        Text(String(format: "%.1f", maxKg))
                                            .font(.custom("Geist-Bold", size: 64))
                                            .foregroundStyle(Color.dsFg1)
                                            .monospacedDigit()
                                            .tracking(64 * -0.04)
                                        Text("kg")
                                            .font(.system(size: 18, weight: .medium).monospacedDigit())
                                            .foregroundStyle(Color.dsFg3)
                                    }
                                }
                                Spacer()
                                if gain > 0 {
                                    VStack(alignment: .trailing, spacing: 6) {
                                        Text("GANANCIA")
                                            .font(.geist(10, weight: .semiBold))
                                            .foregroundStyle(Color.dsFg3)
                                            .tracking(2)
                                        Text(String(format: "+%.1f kg", gain))
                                            .font(.system(size: 18, weight: .semibold).monospacedDigit())
                                            .foregroundStyle(Color.dsNaranja)
                                            .tracking(-0.36)
                                    }
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.top, 20)
                            .padding(.bottom, 24)

                            // Gráfico
                            DSCard {
                                VStack(alignment: .leading, spacing: 12) {
                                    DSEyebrow(text: "Progreso")

                                    Chart(Array(data.enumerated()), id: \.offset) { i, point in
                                        LineMark(
                                            x: .value("Sesión", i + 1),
                                            y: .value("Kg", point.kg)
                                        )
                                        .foregroundStyle(Color.dsNaranja)
                                        .interpolationMethod(.catmullRom)
                                        AreaMark(
                                            x: .value("Sesión", i + 1),
                                            y: .value("Kg", point.kg)
                                        )
                                        .foregroundStyle(
                                            LinearGradient(
                                                colors: [Color.dsNaranja.opacity(0.30), Color.dsNaranja.opacity(0)],
                                                startPoint: .top, endPoint: .bottom
                                            )
                                        )
                                        .interpolationMethod(.catmullRom)
                                        PointMark(
                                            x: .value("Sesión", i + 1),
                                            y: .value("Kg", point.kg)
                                        )
                                        .foregroundStyle(Color.dsNaranja)
                                        .symbolSize(data.count == 1 ? 60 : (i == data.count - 1 ? 60 : 0))
                                        .annotation(position: .top) {
                                            if i == data.count - 1 {
                                                Text(String(format: "%.1f", point.kg))
                                                    .font(.system(size: 11, weight: .medium).monospacedDigit())
                                                    .foregroundStyle(Color.dsFg2)
                                            }
                                        }
                                    }
                                    .chartXAxis {
                                        AxisMarks(values: .automatic) { value in
                                            if let i = value.as(Int.self), i > 0, i <= data.count {
                                                AxisValueLabel {
                                                    Text(data[i - 1].date.formatted(.dateTime.day().month()))
                                                        .font(.system(size: 10))
                                                        .foregroundStyle(Color.dsFg3)
                                                }
                                            }
                                            AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                                                .foregroundStyle(Color.dsHairline)
                                        }
                                    }
                                    .chartYAxis {
                                        AxisMarks { value in
                                            if let v = value.as(Double.self) {
                                                AxisValueLabel {
                                                    Text("\(v, specifier: "%.0f")")
                                                        .font(.system(size: 10).monospacedDigit())
                                                        .foregroundStyle(Color.dsFg3)
                                                }
                                                AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                                                    .foregroundStyle(Color.dsHairline)
                                            }
                                        }
                                    }
                                    .chartBackground { _ in Color.clear }
                                    .frame(height: 180)
                                }
                                .padding(18)
                            }
                            .padding(.horizontal, 20)

                            // Stat strip: último · sesiones · promedio
                            HStack(spacing: 0) {
                                StatStrip(label: "ÚLTIMO", value: String(format: "%.1f", lastKg), unit: "kg")
                                Rectangle().fill(Color.dsHairline).frame(width: 1).padding(.vertical, 16)
                                StatStrip(label: "SESIONES", value: "\(data.count)", unit: "")
                                Rectangle().fill(Color.dsHairline).frame(width: 1).padding(.vertical, 16)
                                StatStrip(label: "PROMEDIO", value: String(format: "%.1f", avgKg), unit: "kg")
                            }
                            .overlay(alignment: .top) { Rectangle().fill(Color.dsHairline).frame(height: 1) }
                            .overlay(alignment: .bottom) { Rectangle().fill(Color.dsHairline).frame(height: 1) }
                            .padding(.horizontal, 20)
                            .padding(.top, 24)

                            // Log de sesiones
                            VStack(alignment: .leading, spacing: 0) {
                                SectionRule(label: "Sesiones pasadas")
                                    .padding(.bottom, 4)
                                    .padding(.top, 28)

                                let reversed = Array(data.reversed())
                                ForEach(reversed.indices, id: \.self) { i in
                                    let point = reversed[i]
                                    if i > 0 {
                                        Rectangle().fill(Color.dsHairline).frame(height: 1)
                                    }
                                    HStack(alignment: .firstTextBaseline) {
                                        Text(point.date.formatted(.dateTime.weekday(.abbreviated).day().month()).uppercased())
                                            .font(.geist(11, weight: .medium))
                                            .foregroundStyle(Color.dsFg2)
                                            .tracking(1.6)
                                        Spacer()
                                        HStack(alignment: .firstTextBaseline, spacing: 3) {
                                            Text(String(format: "%.1f", point.kg))
                                                .font(.system(size: 16, weight: .semibold).monospacedDigit())
                                                .foregroundStyle(Color.dsFg1)
                                            Text("kg")
                                                .font(.geist(12, weight: .regular))
                                                .foregroundStyle(Color.dsFg3)
                                        }
                                    }
                                    .padding(.vertical, 16)
                                }
                            }
                            .padding(.horizontal, 20)

                            Spacer().frame(height: 40)
                        }
                    }
                }
        }
        .toolbar(.hidden, for: .navigationBar)
            .hideNavigationBar()
        .navigationBarBackButtonHidden(true)
    }
}

private struct StatStrip: View {
    let label: String
    let value: String
    let unit: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.geist(10, weight: .semiBold))
                .foregroundStyle(Color.dsFg3)
                .tracking(1.8)
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(value)
                    .font(.system(size: 22, weight: .bold).monospacedDigit())
                    .foregroundStyle(Color.dsFg1)
                    .tracking(-0.44)
                if !unit.isEmpty {
                    Text(unit)
                        .font(.system(size: 12, weight: .medium).monospacedDigit())
                        .foregroundStyle(Color.dsFg3)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
    }
}
