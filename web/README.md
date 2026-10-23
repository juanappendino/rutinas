# Rut1nas web

Versión web (PWA) de la app. HTML + JS vanilla con módulos ES, **sin build ni dependencias**, igual que proppen.
Mismos datos, mismas pantallas (HOY, RUTINAS, LOG, progreso por ejercicio) y el mismo diseño que la app iOS.

```
cd web && python3 -m http.server 8787     # http://localhost:8787
node --test web/tests/logic.test.mjs       # lógica, copias JSON/CSV, cronómetro
python3 web/scripts/gen_data.py            # regenera js/defaults.js desde DefaultData.swift y ExerciseLibrary.swift
```

## Datos

Todo vive en `localStorage` (clave `rutinas:v1`) del navegador; no hay servidor. Para pasar los datos de la app iOS:

1. En la app iOS, **Historial → botón de descarga** (`BackupExport.swift`) guarda `rutinas-backup-AAAA-MM-DD.json`.
2. En la web, **LOG → botón de compartir → Importar archivo…** (o *Pegar copia…*). También acepta el CSV que ya exporta la app.
3. **LOG → Datos → Descargar copia completa** baja el mismo formato desde la web.

## Estructura

- `js/logic.js`: port puro de `WorkoutManager` (rotación, última vez, PRs, rachas, logros). `js/store.js`: estado y acciones.
- `js/backup.js`: copia JSON (fechas ISO 8601; acepta también las de Swift por defecto) y CSV.
- `js/timers.js`: cronómetro/temporizador y descanso, con marcas de tiempo (siguen bien en segundo plano).
- `js/views/*`: una pantalla por archivo. `style.css`: tokens de `DesignSystem.swift`.
- `sw.js`: la app abre sin conexión. `vercel.json` y `_headers` (Cloudflare Pages): CSP estricta y encabezados.

## Deploy

Publicar la carpeta `web/` como sitio estático (Vercel: *Root Directory* = `web`; Cloudflare Pages: directorio de salida `web`).

## Diferencias con la app iOS

- Orden de rutinas con botones ▲▼ (en vez de arrastrar) y menú ⋯ en cada fila (en vez de mantener apretado).
- Tocar una sesión del historial abre su detalle y permite eliminarla.
- Las series 2+ también arrancan el descanso. Pantalla encendida mientras corre un temporizador (si el navegador lo permite).
- Sin Live Activities ni Apple Watch; la vibración sólo funciona en Android.
