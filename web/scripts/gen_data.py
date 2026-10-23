#!/usr/bin/env python3
"""Genera web/js/defaults.js a partir de DefaultData.swift y ExerciseLibrary.swift.

Uso (desde la raíz del repo):  python3 web/scripts/gen_data.py
Así las rutinas por defecto y la biblioteca de ejercicios de la web son siempre
las mismas que las de la app iOS, sin copiarlas a mano.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SWIFT = ROOT / "rutinas"
OUT = ROOT / "web" / "js" / "defaults.js"

STR = r'"((?:[^"\\]|\\.)*)"'


def unescape(s: str) -> str:
    return json.loads('"' + s + '"')


def parse_default_data(src: str):
    """Devuelve [{dayNumber, variant, muscleGroups:[{name, exercises:[{name,sets,reps,description}]}]}]."""
    routines = []
    # Cada rutina: DayVariant(dayNumber: N, variant: "", muscleGroups: [ ... ])
    starts = [m for m in re.finditer(r'DayVariant\(dayNumber:\s*(\d+),\s*variant:\s*' + STR, src)]
    for i, m in enumerate(starts):
        end = starts[i + 1].start() if i + 1 < len(starts) else len(src)
        block = src[m.end():end]
        routine = {"dayNumber": int(m.group(1)), "variant": unescape(m.group(2)), "muscleGroups": []}
        groups = list(re.finditer(r'MuscleGroup\(name:\s*' + STR, block))
        for gi, g in enumerate(groups):
            gend = groups[gi + 1].start() if gi + 1 < len(groups) else len(block)
            gblock = block[g.end():gend]
            exercises = []
            for e in re.finditer(
                r'Exercise\(name:\s*' + STR + r',\s*sets:\s*(\d+),\s*reps:\s*' + STR + r'(?:,\s*description:\s*' + STR + r')?\)',
                gblock,
            ):
                exercises.append({
                    "name": unescape(e.group(1)),
                    "sets": int(e.group(2)),
                    "reps": unescape(e.group(3)),
                    "description": unescape(e.group(4)) if e.group(4) is not None else "",
                })
            routine["muscleGroups"].append({"name": unescape(g.group(1)), "exercises": exercises})
        routines.append(routine)
    return routines


def parse_library(src: str):
    out = []
    pat = re.compile(
        r'ExerciseTemplate\(\s*name:\s*' + STR + r',\s*defaultSets:\s*(\d+),\s*defaultReps:\s*' + STR
        + r',\s*description:\s*' + STR + r',\s*muscleTag:\s*' + STR + r'\s*\)'
    )
    for m in pat.finditer(src):
        out.append({
            "name": unescape(m.group(1)),
            "defaultSets": int(m.group(2)),
            "defaultReps": unescape(m.group(3)),
            "description": unescape(m.group(4)),
            "muscleTag": unescape(m.group(5)),
        })
    return out


def main():
    routines = parse_default_data((SWIFT / "DefaultData.swift").read_text(encoding="utf-8"))
    library_src = (SWIFT / "ExerciseLibrary.swift").read_text(encoding="utf-8")
    library = parse_library(library_src)

    expected_library = len(re.findall(r'ExerciseTemplate\(', library_src))
    assert len(library) == expected_library, f"biblioteca: parseé {len(library)} de {expected_library}"
    for r in routines:
        for g in r["muscleGroups"]:
            assert g["exercises"], f"grupo vacío: día {r['dayNumber']} {g['name']}"

    js = (
        "// Generado por web/scripts/gen_data.py desde DefaultData.swift y ExerciseLibrary.swift. No editar a mano.\n\n"
        "/** Rutinas de la plantilla incluida (sin ids: se generan al cargarlas). */\n"
        f"export const DEFAULT_ROUTINES = {json.dumps(routines, ensure_ascii=False, indent=2)};\n\n"
        "/** Biblioteca precargada de ejercicios (átomos del catálogo). */\n"
        f"export const EXERCISE_LIBRARY = {json.dumps(library, ensure_ascii=False, indent=2)};\n"
    )
    OUT.write_text(js, encoding="utf-8")
    n_ex = sum(len(g["exercises"]) for r in routines for g in r["muscleGroups"])
    print(f"{OUT.relative_to(ROOT)}: {len(routines)} rutinas ({n_ex} ejercicios), {len(library)} ejercicios en la biblioteca")


if __name__ == "__main__":
    main()
