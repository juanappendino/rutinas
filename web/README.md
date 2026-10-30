# Rut1nas web

Versión web (PWA) de la app. HTML + JS vanilla con módulos ES, **sin build ni dependencias**, igual que proppen.
Mismos datos, mismas pantallas (HOY, RUTINAS, LOG, progreso por ejercicio) y el mismo diseño que la app iOS.

```
cd web && python3 -m http.server 8787     # http://localhost:8787
node --test web/tests/*.test.mjs           # lógica, copias JSON/CSV, cronómetro, combinación de datos y Worker
python3 web/scripts/gen_data.py            # regenera js/defaults.js desde DefaultData.swift y ExerciseLibrary.swift
```

## Datos

Todo vive en `localStorage` (clave `rutinas:v1`) del navegador y funciona sin conexión. Opcionalmente se sincroniza entre dispositivos (ver abajo).
Para pasar los datos de la app iOS:

1. En la app iOS, **Historial → botón de descarga** (`BackupExport.swift`) guarda `rutinas-backup-AAAA-MM-DD.json`.
2. En la web, **LOG → botón de compartir → Importar archivo…** (o *Pegar copia…*). También acepta el CSV que ya exporta la app.
3. **LOG → Datos → Descargar copia completa** baja el mismo formato desde la web.

## Sincronización

**LOG → compartir → Sincronización → Crear espacio** genera un link secreto (`#espacio=…`). Abriéndolo en otro dispositivo se trae todo; después se mantiene solo
(sube unos segundos después de cada cambio, baja cada ~45 s con la pestaña visible, y al volver la señal). Quien tenga el link puede ver y editar los datos.

- `worker/index.js` + KV `ESPACIOS`: `GET/PUT /api/e/<código>`. El Worker une lo que llega con lo guardado con `js/merge.js` (el mismo código que corre en el navegador). El KV se crea solo en el primer `wrangler deploy`.
- Qué se sincroniza: rutinas, sesiones terminadas, ejercicios propios del catálogo y el descanso. La sesión en curso queda en su dispositivo hasta que se termina.
- Cómo se resuelven los conflictos: las rutinas por última edición (`t`), las sesiones se unen por id, y lo borrado deja una lápida para no volver. Un dispositivo sin uso adopta los datos del espacio; uno con datos los suma.
- Límite conocido: dos rutinas nuevas creadas a la vez, sin conexión, en dos dispositivos reciben números de día distintos; las sesiones viejas de la que cambia de número pueden quedar asociadas a la otra.

## Estructura

- `js/logic.js`: port puro de `WorkoutManager` (rotación, última vez, PRs, rachas, logros). `js/store.js`: estado y acciones.
- `js/merge.js` y `js/sync.js`: combinación de datos y cliente de sincronización. `js/backup.js`: copia JSON (fechas ISO 8601; acepta también las de Swift por defecto) y CSV.
- `js/timers.js`: cronómetro/temporizador y descanso, con marcas de tiempo (siguen bien en segundo plano).
- `js/views/*`: una pantalla por archivo. `style.css`: tokens de `DesignSystem.swift`.
- `sw.js`: la app abre sin conexión. `vercel.json` y `_headers` (Cloudflare Pages): CSP estricta y encabezados.

## Deploy

Cloudflare Workers (`wrangler.jsonc` en la raíz): deploy command `npx wrangler deploy`, build command vacío. Publica `web/` como archivos estáticos y el Worker atiende `/api/*`.

## Más que la app iOS

- **Log:** gráfico de las últimas 8 semanas, récords personales por ejercicio, y toque en una sesión para corregir el peso, las repeticiones, el tiempo o la distancia de cualquier ejercicio (se sincroniza con la marca de edición `t`).
- **Progreso por ejercicio:** también para cinta y planchas (distancia, velocidad y tiempo), no solo para ejercicios con peso.
- **Hoy:** tiempo transcurrido de la sesión, la lista se desplaza sola al ejercicio siguiente, calculadora de discos por lado en ejercicios con barra, y "Compartir" el resumen al terminar.
- **Rutina con tus favoritos:** RUTINAS → + → "Con mis favoritos" propone los ejercicios que más hiciste (uno por grupo y los más repetidos de relleno), con series, repeticiones y última carga; se destildan los que no querés. Al volver tras 10 días o más sin entrenar, la app arma sola una rutina «Vuelta» con esos favoritos (una vez por dispositivo, con aviso y Deshacer) y la deja como la próxima; HOY avisa que conviene arrancar con ~10% menos de peso.
- **Rotación:** "Orden de rotación" ahora sí cambia qué rutina toca después (la app iOS ordena siempre por número de día). El orden se sincroniza.
- **Datos:** pide almacenamiento persistente al navegador, avisa cómo instalarla en iPhone, e indica el estado de la sincronización en el botón de Datos.

## Diferencias con la app iOS

- Orden de rutinas con botones ▲▼ (en vez de arrastrar) y menú ⋯ en cada fila (en vez de mantener apretado).
- Tocar una sesión del historial abre su detalle y permite eliminarla.
- Las series 2+ también arrancan el descanso. Pantalla encendida mientras corre un temporizador (si el navegador lo permite).
- Sin Live Activities ni Apple Watch; la vibración sólo funciona en Android.
