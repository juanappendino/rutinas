// Sirve web/ bajo /rutinas (makeitjappen.com.ar/rutinas) y también en la raíz (workers.dev, pruebas locales).
// Los archivos viven en la raíz de ./web, así que bajo /rutinas ningún asset coincide: acá se le quita el prefijo y se sirve con ASSETS.
// La app usa rutas relativas (js/…, fonts/…, sw.js), por eso /rutinas necesita la barra final.
const PREFIX = "/rutinas";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === PREFIX) {
      url.pathname = `${PREFIX}/`;
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname.startsWith(`${PREFIX}/`)) url.pathname = url.pathname.slice(PREFIX.length);
    return env.ASSETS.fetch(new Request(url, request));
  },
};
