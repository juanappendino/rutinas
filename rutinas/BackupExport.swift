import SwiftUI
import UIKit

// MARK: — Copia de seguridad (JSON)
// Exporta rutinas, historial y catálogo con los mismos modelos Codable de la app (fechas ISO 8601),
// para importarlos en la versión web (carpeta web/ del repo). Incluye cualquier campo que tengan los modelos.

struct BackupPayload: Encodable {
    var app = "rutinas"
    var version = 1
    var exportedAt: Date
    var routines: [DayVariant]
    var history: [WorkoutSession]
    var exerciseCatalog: [ExerciseTemplate]
    var muscleGroupTemplates: [MuscleGroupTemplate]
}

extension WorkoutManager {
    /// Escribe la copia en un archivo temporal y devuelve su URL (lista para compartir o guardar en Archivos).
    func writeBackupFile() -> URL? {
        let payload = BackupPayload(
            exportedAt: Date(),
            routines: routines,
            history: history,
            exerciseCatalog: exerciseCatalog,
            muscleGroupTemplates: muscleGroupTemplates
        )
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let data = try? encoder.encode(payload) else { return nil }

        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("rutinas-backup-\(df.string(from: Date())).json")
        do {
            try data.write(to: url, options: .atomic)
            return url
        } catch {
            return nil
        }
    }
}

// MARK: — Botón de Historial

struct BackupShareButton: View {
    @Environment(WorkoutManager.self) var manager
    @State private var shareItem: BackupShareItem?

    var body: some View {
        Button {
            if let url = manager.writeBackupFile() { shareItem = BackupShareItem(url: url) }
        } label: {
            Image(systemName: "arrow.down.doc")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.dsFg2)
                .frame(width: 32, height: 32)
                .background(Color.dsSurface)
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsHairline, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .sheet(item: $shareItem) { item in
            ActivityView(items: [item.url])
        }
    }
}

private struct BackupShareItem: Identifiable {
    let id = UUID()
    let url: URL
}

private struct ActivityView: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ vc: UIActivityViewController, context: Context) {}
}
