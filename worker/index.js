// API de sincronización de Rut1nas (Cloudflare Worker + KV). Solo atiende /api/*; el resto del sitio lo sirve Cloudflare
// directamente como archivos estáticos (ver wrangler.jsonc).
//
// Un "espacio" es el conjunto de datos de una persona, identificado por un código largo y secreto: quien lo tiene puede leer y escribir.
// El Worker nunca pisa: une lo que llega con lo guardado con la misma función que usa el navegador (web/js/merge.js).
//
//   GET /api/e/<código>[?desde=<rev>]  →  { v, doc, rev }  |  { v, rev, igual: true }  |  404 si no existe
//   PUT /api/e/<código>  { doc }       →  { v, doc, rev }  (crea el espacio si no existe; devuelve el documento unido)
import { DOC_VERSION, emptyDoc, mergeDocs, sameDoc, sanitizeDoc } from "../web/js/merge.js";
import { CODIGO, MAX_BODY } from "./limites.js";

const json = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
});

async function manejar(request, env) {
  const url = new URL(request.url);
  const m = /^\/api\/e\/([^/]+)$/.exec(url.pathname);
  if (!m) return json({ error: "no encontrado" }, 404);
  if (!CODIGO.test(m[1])) return json({ error: "código inválido" }, 400);
  if (!env.ESPACIOS) return json({ error: "el almacenamiento (KV) no está configurado" }, 503);
  const clave = `e:${m[1]}`;
  const guardado = () => env.ESPACIOS.get(clave, "json");

  if (request.method === "GET") {
    const g = await guardado();
    if (!g) return json({ error: "no existe" }, 404);
    if (url.searchParams.get("desde") === String(g.rev)) return json({ v: DOC_VERSION, rev: g.rev, igual: true });
    return json({ v: DOC_VERSION, doc: g.doc, rev: g.rev });
  }

  if (request.method === "PUT") {
    const origen = request.headers.get("origin");
    if (origen && origen !== url.origin) return json({ error: "origen no permitido" }, 403);
    if (Number(request.headers.get("content-length") || 0) > MAX_BODY) return json({ error: "demasiado grande" }, 413);
    const texto = await request.text();
    if (texto.length > MAX_BODY) return json({ error: "demasiado grande" }, 413);
    let cuerpo;
    try { cuerpo = JSON.parse(texto); } catch { return json({ error: "JSON inválido" }, 400); }
    if (!cuerpo || typeof cuerpo.doc !== "object" || !cuerpo.doc) return json({ error: "falta el documento" }, 400);

    const g = await guardado();
    const previo = g ? sanitizeDoc(g.doc) : emptyDoc();
    const unido = mergeDocs(previo, sanitizeDoc(cuerpo.doc));
    let rev = g?.rev ?? 0;
    if (!g || !sameDoc(unido, previo)) {   // sin cambios no se escribe: el plan gratuito de KV tiene un tope diario de escrituras
      rev = Date.now();
      await env.ESPACIOS.put(clave, JSON.stringify({ doc: unido, rev }));
    }
    return json({ v: DOC_VERSION, doc: unido, rev });
  }

  return json({ error: "método no permitido" }, 405);
}

// Un Worker solo puede exportar manejadores: las constantes viven en limites.js.
export default { fetch: manejar };
