import SwiftUI

struct OnboardingView: View {
    @Environment(WorkoutManager.self) var manager
    @AppStorage("hasOnboarded") private var hasOnboarded = false
    @State private var showCreate = false

    var body: some View {
        ZStack {
            Color.dsCanvas.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 0) {
                Spacer()

                // — Logo / marca
                VStack(alignment: .leading, spacing: 12) {
                    Text("BITÁCORA")
                        .font(.geist(11, weight: .semiBold))
                        .foregroundStyle(Color.dsNaranja)
                        .tracking(3)

                    Text("Tu herramienta\nde entrenamiento.")
                        .font(.geist(38, weight: .bold))
                        .foregroundStyle(Color.dsFg1)
                        .tracking(-1)
                        .lineSpacing(2)

                    Text("Sin ruido. Sin planes mágicos.\nAnotá, superáte, repetí.")
                        .font(.geist(16, weight: .regular))
                        .foregroundStyle(Color.dsFg3)
                        .lineSpacing(4)
                        .padding(.top, 4)
                }
                .padding(.horizontal, 28)

                Spacer()

                // — Opciones
                VStack(spacing: 12) {
                    // Opción A: crear propia
                    Button {
                        showCreate = true
                    } label: {
                        HStack(spacing: 16) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(Color.dsNaranja.opacity(0.12))
                                    .frame(width: 44, height: 44)
                                Image(systemName: "plus.circle.fill")
                                    .font(.system(size: 20))
                                    .foregroundStyle(Color.dsNaranja)
                            }
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Armar mi rutina")
                                    .font(.geist(16, weight: .semiBold))
                                    .foregroundStyle(Color.dsFg1)
                                Text("Creo mi programa desde cero")
                                    .font(.geist(13, weight: .regular))
                                    .foregroundStyle(Color.dsFg3)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(Color.dsFg4)
                        }
                        .padding(16)
                        .background(Color.dsCard)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                        .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsNaranja.opacity(0.35), lineWidth: 1))
                    }
                    .buttonStyle(.plain)

                    // Opción B: usar plantilla
                    Button {
                        // La plantilla ya está cargada en DefaultData, solo marcar onboarded
                        hasOnboarded = true
                    } label: {
                        HStack(spacing: 16) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(Color.dsSurface)
                                    .frame(width: 44, height: 44)
                                Image(systemName: "list.bullet.clipboard")
                                    .font(.system(size: 18))
                                    .foregroundStyle(Color.dsFg2)
                            }
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Usar plantilla incluida")
                                    .font(.geist(16, weight: .semiBold))
                                    .foregroundStyle(Color.dsFg1)
                                Text("Push / Pull / Legs · 6 días · editable")
                                    .font(.geist(13, weight: .regular))
                                    .foregroundStyle(Color.dsFg3)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(Color.dsFg4)
                        }
                        .padding(16)
                        .background(Color.dsCard)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                        .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsHairline, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 48)
            }
        }
        .sheet(isPresented: $showCreate) {
            CreateRoutineSheet(existingCount: 0) { newRoutine in
                // Reemplazar las rutinas default con la nueva del usuario
                manager.clearDefaultsAndAdd(newRoutine)
                hasOnboarded = true
            }
        }
    }
}
