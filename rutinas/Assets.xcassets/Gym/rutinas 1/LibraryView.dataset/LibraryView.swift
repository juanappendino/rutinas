import SwiftUI

// MARK: — Pantalla principal de biblioteca

struct LibraryView: View {
    @Environment(WorkoutManager.self) var manager
    @State private var tab: Int = 0          // 0 = Ejercicios, 1 = Grupos
    @State private var showAddExercise = false
    @State private var showAddGroup = false
    @State private var searchText = ""

    var filteredExercises: [ExerciseTemplate] {
        if searchText.isEmpty { return manager.exerciseCatalog }
        return manager.exerciseCatalog.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.muscleTag.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        ZStack {
            Color.dsCanvas.ignoresSafeArea()
            VStack(spacing: 0) {
                // Header
                VStack(alignment: .leading, spacing: 6) {
                    Text("CATÁLOGO GLOBAL")
                        .font(.geist(9, weight: .semiBold))
                        .foregroundStyle(Color.dsFg3)
                        .tracking(1.8)
                    HStack {
                        Text("BIBLIOTECA")
                            .font(.geist(28, weight: .bold))
                            .foregroundStyle(Color.dsFg1)
                            .tracking(0.5)
                        Spacer()
                        Button {
                            if manager.exerciseCatalog.isEmpty {
                                manager.importExistingExercisesToCatalog()
                            }
                        } label: {
                            if manager.exerciseCatalog.isEmpty {
                                HStack(spacing: 5) {
                                    Image(systemName: "arrow.down.doc")
                                        .font(.system(size: 11, weight: .semibold))
                                    Text("IMPORTAR")
                                        .font(.geist(10, weight: .semiBold))
                                        .tracking(0.8)
                                }
                                .foregroundStyle(Color.dsNaranja)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(Color.dsNaranja.opacity(0.10))
                                .clipShape(RoundedRectangle(cornerRadius: 3))
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 16)

                // Tab selector
                HStack(spacing: 0) {
                    ForEach([(0, "EJERCICIOS"), (1, "GRUPOS")], id: \.0) { idx, label in
                        Button { withAnimation(.easeInOut(duration: 0.15)) { tab = idx } } label: {
                            Text(label)
                                .font(.geist(11, weight: tab == idx ? .semiBold : .regular))
                                .foregroundStyle(tab == idx ? Color.dsOnPrimary : Color.dsFg3)
                                .tracking(0.8)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .background(tab == idx ? Color.dsNaranja : Color.clear)
                                .clipShape(RoundedRectangle(cornerRadius: 2))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(3)
                .background(Color.dsSurface)
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsHairline, lineWidth: 1))
                .padding(.horizontal, 20)
                .padding(.bottom, 12)

                if tab == 0 {
                    exercisesTab
                } else {
                    groupsTab
                }
            }
        }
        .sheet(isPresented: $showAddExercise) {
            ExerciseTemplateSheet(existing: nil) { template in
                manager.addExerciseTemplate(template)
            }
        }
        .sheet(isPresented: $showAddGroup) {
            MuscleGroupTemplateSheet(existing: nil) { group in
                manager.addMuscleGroupTemplate(group)
            }
        }
    }

    // MARK: — Tab ejercicios

    private var exercisesTab: some View {
        VStack(spacing: 0) {
            // Buscador
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 13))
                    .foregroundStyle(Color.dsFg4)
                TextField("Buscar ejercicio o grupo muscular", text: $searchText)
                    .font(.geist(13, weight: .regular))
                    .foregroundStyle(Color.dsFg1)
                    .tint(Color.dsNaranja)
                if !searchText.isEmpty {
                    Button { searchText = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 13))
                            .foregroundStyle(Color.dsFg4)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color.dsCard)
            .clipShape(RoundedRectangle(cornerRadius: 4))
            .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsHairline, lineWidth: 1))
            .padding(.horizontal, 20)
            .padding(.bottom, 12)

            if filteredExercises.isEmpty {
                emptyExercises
            } else {
                ScrollView {
                    // Agrupar por muscleTag
                    let grouped = Dictionary(grouping: filteredExercises, by: \.muscleTag)
                    let tags = grouped.keys.sorted()
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(tags, id: \.self) { tag in
                            SectionRule(label: tag.isEmpty ? "SIN GRUPO" : tag)
                                .padding(.horizontal, 20)
                                .padding(.bottom, 4)
                                .padding(.top, 20)
                            VStack(spacing: 0) {
                                ForEach(Array((grouped[tag] ?? []).enumerated()), id: \.element.id) { i, template in
                                    if i > 0 { Rectangle().fill(Color.dsHairline).frame(height: 1) }
                                    ExerciseTemplateRow(template: template)
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                        Spacer().frame(height: 100)
                    }
                }
            }
        }
        .overlay(alignment: .bottomTrailing) {
            Button { showAddExercise = true } label: {
                HStack(spacing: 6) {
                    Image(systemName: "plus")
                        .font(.system(size: 13, weight: .semibold))
                    Text("EJERCICIO")
                        .font(.geist(11, weight: .semiBold))
                        .tracking(0.8)
                }
                .foregroundStyle(Color.dsOnPrimary)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.dsNaranja)
                .clipShape(RoundedRectangle(cornerRadius: 4))
            }
            .buttonStyle(.plain)
            .padding(.trailing, 20)
            .padding(.bottom, 20)
        }
    }

    private var emptyExercises: some View {
        VStack(spacing: 12) {
            Spacer()
            Text("SIN EJERCICIOS")
                .font(.geist(11, weight: .semiBold))
                .foregroundStyle(Color.dsFg4)
                .tracking(1.5)
            Text("Importá tus rutinas existentes\no agregá ejercicios manualmente")
                .font(.geist(13, weight: .regular))
                .foregroundStyle(Color.dsFg3)
                .multilineTextAlignment(.center)
            Button {
                manager.importExistingExercisesToCatalog()
            } label: {
                Text("IMPORTAR DESDE RUTINAS")
                    .font(.geist(11, weight: .semiBold))
                    .tracking(0.8)
                    .foregroundStyle(Color.dsNaranja)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.dsNaranja.opacity(0.10))
                    .clipShape(RoundedRectangle(cornerRadius: 3))
                    .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsNaranja.opacity(0.3), lineWidth: 1))
            }
            .buttonStyle(.plain)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: — Tab grupos

    private var groupsTab: some View {
        VStack(spacing: 0) {
            if manager.muscleGroupTemplates.isEmpty {
                emptyGroups
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(manager.muscleGroupTemplates) { group in
                            MuscleGroupTemplateRow(group: group)
                        }
                        Spacer().frame(height: 80)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 4)
                }
            }
        }
        .overlay(alignment: .bottomTrailing) {
            Button { showAddGroup = true } label: {
                HStack(spacing: 6) {
                    Image(systemName: "plus")
                        .font(.system(size: 13, weight: .semibold))
                    Text("GRUPO")
                        .font(.geist(11, weight: .semiBold))
                        .tracking(0.8)
                }
                .foregroundStyle(Color.dsOnPrimary)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.dsNaranja)
                .clipShape(RoundedRectangle(cornerRadius: 4))
            }
            .buttonStyle(.plain)
            .padding(.trailing, 20)
            .padding(.bottom, 20)
        }
    }

    private var emptyGroups: some View {
        VStack(spacing: 12) {
            Spacer()
            Text("SIN GRUPOS")
                .font(.geist(11, weight: .semiBold))
                .foregroundStyle(Color.dsFg4)
                .tracking(1.5)
            Text("Armá módulos musculares reutilizables\npara armar rutinas más rápido")
                .font(.geist(13, weight: .regular))
                .foregroundStyle(Color.dsFg3)
                .multilineTextAlignment(.center)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: — Exercise template row

private struct ExerciseTemplateRow: View {
    @Environment(WorkoutManager.self) var manager
    let template: ExerciseTemplate
    @State private var showEdit = false

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(template.name.uppercased())
                    .font(.geist(13, weight: .semiBold))
                    .foregroundStyle(Color.dsFg1)
                    .tracking(0.3)
                HStack(spacing: 6) {
                    Text("\(template.defaultSets) SERIES · \(template.defaultReps)")
                        .font(.geist(10, weight: .regular))
                        .foregroundStyle(Color.dsFg3)
                        .tracking(0.4)
                    if !template.muscleTag.isEmpty {
                        Text("· \(template.muscleTag)")
                            .font(.geist(10, weight: .regular))
                            .foregroundStyle(Color.dsNaranja.opacity(0.7))
                            .tracking(0.3)
                    }
                }
            }
            Spacer()
            Button { showEdit = true } label: {
                Image(systemName: "pencil")
                    .font(.system(size: 13))
                    .foregroundStyle(Color.dsFg3)
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, 14)
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) {
                manager.deleteExerciseTemplate(template)
            } label: {
                Label("Eliminar", systemImage: "trash")
            }
            .tint(Color.dsRojo)
        }
        .sheet(isPresented: $showEdit) {
            ExerciseTemplateSheet(existing: template) { updated in
                manager.updateExerciseTemplate(updated)
            }
        }
    }
}

// MARK: — Muscle group template row

private struct MuscleGroupTemplateRow: View {
    @Environment(WorkoutManager.self) var manager
    let group: MuscleGroupTemplate
    @State private var showEdit = false
    @State private var expanded = false

    var exercises: [ExerciseTemplate] {
        group.exerciseIDs.compactMap { id in manager.exerciseCatalog.first { $0.id == id } }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.18)) { expanded.toggle() }
            } label: {
                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(group.name.uppercased())
                            .font(.geist(13, weight: .semiBold))
                            .foregroundStyle(Color.dsFg1)
                            .tracking(0.3)
                        Text("\(group.exerciseIDs.count) EJERCICIOS")
                            .font(.geist(10, weight: .regular))
                            .foregroundStyle(Color.dsFg3)
                            .tracking(0.4)
                    }
                    Spacer()
                    Button { showEdit = true } label: {
                        Image(systemName: "pencil")
                            .font(.system(size: 13))
                            .foregroundStyle(Color.dsFg3)
                    }
                    .buttonStyle(.plain)
                    Image(systemName: expanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(Color.dsFg4)
                }
                .padding(14)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if expanded && !exercises.isEmpty {
                Rectangle().fill(Color.dsHairline).frame(height: 1)
                VStack(spacing: 0) {
                    ForEach(Array(exercises.enumerated()), id: \.element.id) { i, ex in
                        if i > 0 { Rectangle().fill(Color.dsHairline).frame(height: 1) }
                        HStack {
                            Text(ex.name.uppercased())
                                .font(.geist(11, weight: .semiBold))
                                .foregroundStyle(Color.dsFg2)
                                .tracking(0.2)
                            Spacer()
                            Text("\(ex.defaultSets)×\(ex.defaultReps)")
                                .font(.geist(10, weight: .regular))
                                .foregroundStyle(Color.dsFg4)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.dsSurface)
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .background(Color.dsCard)
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color.dsHairline, lineWidth: 1))
        .sheet(isPresented: $showEdit) {
            MuscleGroupTemplateSheet(existing: group) { updated in
                manager.updateMuscleGroupTemplate(updated)
            }
        }
        .contextMenu {
            Button(role: .destructive) {
                manager.deleteMuscleGroupTemplate(group)
            } label: {
                Label("Eliminar grupo", systemImage: "trash")
            }
        }
    }
}

// MARK: — Exercise template sheet (crear/editar átomo)

struct ExerciseTemplateSheet: View {
    @Environment(\.dismiss) var dismiss
    @Environment(WorkoutManager.self) var manager
    let existing: ExerciseTemplate?
    let onSave: (ExerciseTemplate) -> Void

    @State private var name: String
    @State private var sets: Int
    @State private var reps: String
    @State private var desc: String
    @State private var muscleTag: String

    init(existing: ExerciseTemplate?, onSave: @escaping (ExerciseTemplate) -> Void) {
        self.existing = existing
        self.onSave = onSave
        _name = State(initialValue: existing?.name ?? "")
        _sets = State(initialValue: existing?.defaultSets ?? 3)
        _reps = State(initialValue: existing?.defaultReps ?? "12")
        _desc = State(initialValue: existing?.description ?? "")
        _muscleTag = State(initialValue: existing?.muscleTag ?? "")
    }

    var body: some View {
        ZStack {
            Color.dsCanvas.ignoresSafeArea()
            VStack(spacing: 0) {
                sheetHandle()
                sheetHeader(
                    title: existing == nil ? "NUEVO EJERCICIO" : "EDITAR EJERCICIO",
                    onDismiss: { dismiss() }
                )

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            DSEyebrow(text: "NOMBRE")
                            DSTextField(placeholder: "Ej: Press banca", text: $name)
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            DSEyebrow(text: "GRUPO MUSCULAR")
                            // Picker de tags existentes + campo libre
                            let existingTags = Array(Set(manager.exerciseCatalog.map { $0.muscleTag }.filter { !$0.isEmpty })).sorted()
                            if !existingTags.isEmpty {
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 6) {
                                        ForEach(existingTags, id: \.self) { tag in
                                            Button {
                                                muscleTag = muscleTag == tag ? "" : tag
                                            } label: {
                                                Text(tag.uppercased())
                                                    .font(.geist(10, weight: .semiBold))
                                                    .tracking(0.8)
                                                    .foregroundStyle(muscleTag == tag ? Color.dsOnPrimary : Color.dsFg3)
                                                    .padding(.horizontal, 10)
                                                    .padding(.vertical, 6)
                                                    .background(muscleTag == tag ? Color.dsNaranja : Color.dsCard)
                                                    .clipShape(RoundedRectangle(cornerRadius: 3))
                                                    .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(
                                                        muscleTag == tag ? Color.clear : Color.dsHairline, lineWidth: 1
                                                    ))
                                            }
                                            .buttonStyle(.plain)
                                        }
                                    }
                                }
                            }
                            DSTextField(placeholder: "Ej: PECHO, ESPALDA, CARDIO", text: $muscleTag)
                        }

                        HStack(spacing: 16) {
                            VStack(alignment: .leading, spacing: 6) {
                                DSEyebrow(text: "SERIES")
                                HStack(spacing: 12) {
                                    Button { if sets > 1 { sets -= 1 } } label: {
                                        Text("−").font(.geist(16, weight: .semiBold)).foregroundStyle(Color.dsFg2)
                                            .frame(width: 36, height: 36).background(Color.dsSurface)
                                            .clipShape(RoundedRectangle(cornerRadius: 3))
                                            .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsHairline, lineWidth: 1))
                                    }.buttonStyle(.plain)
                                    Text("\(sets)").font(.geist(18, weight: .bold)).foregroundStyle(Color.dsFg1)
                                        .frame(minWidth: 24, alignment: .center)
                                    Button { sets += 1 } label: {
                                        Text("+").font(.geist(16, weight: .semiBold)).foregroundStyle(Color.dsFg2)
                                            .frame(width: 36, height: 36).background(Color.dsSurface)
                                            .clipShape(RoundedRectangle(cornerRadius: 3))
                                            .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsHairline, lineWidth: 1))
                                    }.buttonStyle(.plain)
                                }
                            }
                            VStack(alignment: .leading, spacing: 6) {
                                DSEyebrow(text: "REPS / TIEMPO")
                                DSTextField(placeholder: "12, 8-10, 1 min", text: $reps)
                                    .keyboardType(.numbersAndPunctuation)
                            }
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            DSEyebrow(text: "DESCRIPCIÓN TÉCNICA (OPCIONAL)")
                            DSTextField(placeholder: "Cómo ejecutarlo correctamente", text: $desc, lineLimit: 2...4)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 100)
                }
            }

            VStack {
                Spacer()
                DSPrimaryButton(label: existing == nil ? "Agregar ejercicio" : "Guardar cambios") {
                    let template = ExerciseTemplate(
                        id: existing?.id ?? UUID(),
                        name: name,
                        defaultSets: sets,
                        defaultReps: reps,
                        description: desc,
                        muscleTag: muscleTag.uppercased()
                    )
                    onSave(template)
                    dismiss()
                }
                .disabled(name.isEmpty)
                .opacity(name.isEmpty ? 0.35 : 1)
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
                .background(
                    LinearGradient(
                        colors: [Color.dsCanvas.opacity(0), Color.dsCanvas],
                        startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.4)
                    )
                )
            }
        }
        .presentationDetents([.large])
        .presentationBackground(Color.dsCanvas)
    }
}

// MARK: — Muscle group template sheet (crear/editar molécula)

struct MuscleGroupTemplateSheet: View {
    @Environment(\.dismiss) var dismiss
    @Environment(WorkoutManager.self) var manager
    let existing: MuscleGroupTemplate?
    let onSave: (MuscleGroupTemplate) -> Void

    @State private var name: String
    @State private var selectedIDs: [UUID]
    @State private var searchText = ""

    init(existing: MuscleGroupTemplate?, onSave: @escaping (MuscleGroupTemplate) -> Void) {
        self.existing = existing
        self.onSave = onSave
        _name = State(initialValue: existing?.name ?? "")
        _selectedIDs = State(initialValue: existing?.exerciseIDs ?? [])
    }

    var filteredCatalog: [ExerciseTemplate] {
        if searchText.isEmpty { return manager.exerciseCatalog }
        return manager.exerciseCatalog.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.muscleTag.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        ZStack {
            Color.dsCanvas.ignoresSafeArea()
            VStack(spacing: 0) {
                sheetHandle()
                sheetHeader(
                    title: existing == nil ? "NUEVO GRUPO" : "EDITAR GRUPO",
                    onDismiss: { dismiss() }
                )

                VStack(alignment: .leading, spacing: 12) {
                    DSTextField(placeholder: "Nombre del grupo (ej: PECHO)", text: $name)
                        .padding(.horizontal, 20)

                    // Buscador de ejercicios
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass").font(.system(size: 12)).foregroundStyle(Color.dsFg4)
                        TextField("Buscar ejercicio", text: $searchText)
                            .font(.geist(13, weight: .regular)).foregroundStyle(Color.dsFg1).tint(Color.dsNaranja)
                    }
                    .padding(.horizontal, 10).padding(.vertical, 8)
                    .background(Color.dsCard)
                    .clipShape(RoundedRectangle(cornerRadius: 3))
                    .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.dsHairline, lineWidth: 1))
                    .padding(.horizontal, 20)
                }

                if manager.exerciseCatalog.isEmpty {
                    VStack(spacing: 8) {
                        Spacer()
                        Text("Primero agregá ejercicios al catálogo")
                            .font(.geist(13, weight: .regular))
                            .foregroundStyle(Color.dsFg3)
                        Spacer()
                    }
                } else {
                    ScrollView {
                        VStack(spacing: 0) {
                            ForEach(Array(filteredCatalog.enumerated()), id: \.element.id) { i, template in
                                if i > 0 { Rectangle().fill(Color.dsHairline).frame(height: 1) }
                                let selected = selectedIDs.contains(template.id)
                                Button {
                                    if selected {
                                        selectedIDs.removeAll { $0 == template.id }
                                    } else {
                                        selectedIDs.append(template.id)
                                    }
                                } label: {
                                    HStack(spacing: 12) {
                                        // Checkbox
                                        ZStack {
                                            RoundedRectangle(cornerRadius: 3)
                                                .fill(selected ? Color.dsNaranja : Color.dsSurface)
                                                .frame(width: 20, height: 20)
                                                .overlay(RoundedRectangle(cornerRadius: 3)
                                                    .strokeBorder(selected ? Color.clear : Color.dsHairline, lineWidth: 1))
                                            if selected {
                                                Image(systemName: "checkmark")
                                                    .font(.system(size: 10, weight: .bold))
                                                    .foregroundStyle(Color.dsOnPrimary)
                                            }
                                        }
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(template.name.uppercased())
                                                .font(.geist(13, weight: .semiBold))
                                                .foregroundStyle(Color.dsFg1)
                                                .tracking(0.3)
                                            if !template.muscleTag.isEmpty {
                                                Text(template.muscleTag.uppercased())
                                                    .font(.geist(9, weight: .regular))
                                                    .foregroundStyle(Color.dsFg4)
                                                    .tracking(0.8)
                                            }
                                        }
                                        Spacer()
                                        Text("\(template.defaultSets)×\(template.defaultReps)")
                                            .font(.geist(10, weight: .regular))
                                            .foregroundStyle(Color.dsFg4)
                                    }
                                    .padding(.horizontal, 20)
                                    .padding(.vertical, 12)
                                    .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                                .background(selected ? Color.dsNaranja.opacity(0.04) : Color.clear)
                            }
                        }
                        .padding(.bottom, 100)
                    }
                }
            }

            VStack {
                Spacer()
                DSPrimaryButton(label: existing == nil ? "Crear grupo (\(selectedIDs.count) ej)" : "Guardar cambios") {
                    let group = MuscleGroupTemplate(
                        id: existing?.id ?? UUID(),
                        name: name.uppercased(),
                        exerciseIDs: selectedIDs
                    )
                    onSave(group)
                    dismiss()
                }
                .disabled(name.isEmpty || selectedIDs.isEmpty)
                .opacity(name.isEmpty || selectedIDs.isEmpty ? 0.35 : 1)
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
                .background(
                    LinearGradient(
                        colors: [Color.dsCanvas.opacity(0), Color.dsCanvas],
                        startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.4)
                    )
                )
            }
        }
        .presentationDetents([.large])
        .presentationBackground(Color.dsCanvas)
    }
}
