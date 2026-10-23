// Sincronización: crear un espacio, invitar otro dispositivo con un link, unirse a uno existente y salir.
import { h } from "../util.js";
import { eyebrow, openSheet, sheetHeader, openAlert, confirmAlert, toast } from "../ui.js";
import { isPristine } from "../store.js";
import { createSpace, hasSpace, inviteLink, joinSpace, leave, onSyncChange, parseCode, syncInfo, syncNow } from "../sync.js";

const hhmm = (t) => new Date(t).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

export function openSyncSheet() {
  const body = h("div", { class: "form" });
  let unsub = () => {};
  const { close } = openSheet((close) => ({
    header: sheetHeader("Sincronización", close, { tight: true }),
    body: h("div", {}, body),
  }), { onClose: () => unsub() });

  const paint = () => {
    if (!hasSpace()) {
      body.replaceChildren(
        h("p", { class: "desc-text pad0", text: "Guardá tus rutinas y tu historial en la nube para usarlos en el celular y en la compu. Funciona sin conexión y se pone al día solo cuando hay señal. Se arma con un link secreto: quien lo tenga puede ver y editar tus datos." }),
        h("button", { class: "btn-primary", type: "button", text: "Crear espacio y sincronizar", onclick: async (e) => {
          e.currentTarget.disabled = true;
          try { await createSpace(); toast("Listo. Copiá el link e abrilo en tu otro dispositivo."); }
          catch (err) { toast(err.message, { ms: 8000 }); }
          paint();
        } }),
        h("button", { class: "btn-secondary", type: "button", text: "Ya tengo un link", onclick: () => { close(); askLink(); } }));
      return;
    }
    const s = syncInfo();
    const status = s.phase === "ok" ? `Al día${s.last ? ` · ${hhmm(s.last)}` : ""}`
      : s.phase === "error" ? `No se pudo sincronizar: ${s.error}. Se reintenta solo.` : s.phase === "syncing" ? "Sincronizando…" : "Conectando…";
    body.replaceChildren(
      h("p", { class: `sync-status ${s.phase}`, role: "status", text: status }),
      h("button", { class: "btn-primary", type: "button", text: "Copiar link de invitación", onclick: copyLink }),
      h("button", { class: "btn-secondary", type: "button", text: "Sincronizar ahora", onclick: () => syncNow() }),
      h("button", { class: "btn-secondary destructive", type: "button", text: "Dejar de sincronizar", onclick: () => confirmAlert({
        title: "¿Dejar de sincronizar?", message: "Tus datos en este dispositivo se quedan como están; en la nube también.", confirmLabel: "Dejar", destructive: true,
        onConfirm: () => { leave(); paint(); },
      }) }),
      h("p", { class: "desc-text pad0 small", text: "El link da acceso a todos tus datos: compartilo solo con tus propios dispositivos. Una sesión en curso queda en el dispositivo donde la hacés y se sube al terminarla." }));
  };
  unsub = onSyncChange(paint);
  paint();
}

async function copyLink() {
  const link = inviteLink();
  try { await navigator.clipboard.writeText(link); toast("Link copiado"); return; } catch { /* sin permiso de portapapeles */ }
  openAlert({ title: "Copiá el link", message: link, buttons: [{ label: "Cerrar", cancel: true }] });
}

/** Pide un link o código pegado. */
export function askLink() {
  openAlert({
    title: "Link de sincronización", input: { placeholder: "Pegá el link o el código" },
    buttons: [
      { label: "Continuar", action: (v) => { const c = parseCode(v); if (!c) { toast("Ese link no parece válido."); return false; } askJoin(c); } },
      { label: "Cancelar", cancel: true },
    ],
  });
}

/** Confirma y entra a un espacio (también lo usa el link #espacio=… al abrirlo). */
export function askJoin(code) {
  if (hasSpace()) { toast("Ya estás sincronizando."); return; }
  const fresh = isPristine();
  confirmAlert({
    title: "¿Sincronizar con este espacio?",
    message: fresh ? "Este dispositivo todavía no tiene datos propios: va a traer los que están en la nube." : "Lo que tenés guardado acá se suma a lo de la nube (no se pierde nada) y de ahora en más se sincroniza.",
    confirmLabel: "Sincronizar",
    onConfirm: async () => {
      try { await joinSpace(code); toast("Listo: sincronizando."); }
      catch (err) { toast(err.message, { ms: 8000 }); }
    },
  });
}
