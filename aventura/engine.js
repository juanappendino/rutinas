'use strict';

// ---------------------------------------------------------------------------
// Motor mínimo de aventura gráfica point & click (estilo SCUMM).
// Todo el contenido del juego (escenas, objetos, diálogos) vive en juego.js.
// Resolución interna 320x200, escalada por CSS sin suavizado.
// ---------------------------------------------------------------------------

const ANCHO = 320, ALTO = 200, ALTO_ESCENA = 144, ZOOM = 3;
const PANEL_Y = 156;
const FUENTE = '"Courier New", Courier, monospace';

const VERBOS = [
  { id: 'ir', texto: 'Ir a' }, { id: 'mirar', texto: 'Mirar' }, { id: 'hablar', texto: 'Hablar' },
  { id: 'agarrar', texto: 'Agarrar' }, { id: 'usar', texto: 'Usar' }, { id: 'abrir', texto: 'Abrir' },
  { id: 'cerrar', texto: 'Cerrar' }, { id: 'empujar', texto: 'Empujar' }, { id: 'dar', texto: 'Dar' },
];

const RESPUESTAS = {
  mirar: ['No veo nada especial.', 'Nada interesante.'],
  agarrar: ['No puedo llevarme eso.', 'Mejor lo dejo donde está.'],
  hablar: ['No creo que me conteste.', 'Hablar solo ya lo hago bastante.'],
  usar: ['No sé cómo usar eso.', 'Eso no sirve para nada.'],
  abrir: ['No se abre.'],
  cerrar: ['No se cierra.'],
  empujar: ['No se mueve.', 'Ni lo intento, me duele la espalda.'],
  dar: ['No creo que lo quiera.'],
  combinar: ['No pasa nada.', 'No creo que eso funcione.'],
};

// Definiciones que rellena juego.js
const ESCENAS = {};
const OBJETOS = {};

// Estado serializable (pensado para poder guardar la partida más adelante)
let estado = nuevoEstado();
function nuevoEstado() {
  return { escena: 'muelle', banderas: {}, inventario: [], ocultos: {} };
}

// ---------------------------------------------------------------------------
// Estado interno del motor
// ---------------------------------------------------------------------------

let canvas, c;
let modo = 'titulo';           // titulo | juego | fin
let tiempo = 0;
let mx = 0, my = 0;            // mouse en coordenadas del juego
let verbo = 'ir';
let origen = null;             // objeto del inventario ya elegido ("Usar pez con ...")
let ocupado = false;           // un guion se está ejecutando: se ignoran los clics
let orden = 0;                 // token para cancelar caminatas pendientes
let habla = null;              // línea de diálogo en pantalla
let menu = null;               // opciones de conversación
let invDesp = 0;               // filas de inventario desplazadas
let textoFin = [];
const temporizadores = [];
let fundido = { a: 0, desde: 0, hasta: 0, t: 0, ms: 0, res: null };
const heroe = { x: 160, y: 120, cara: 1, fase: 0, camino: null, vel: 55 };

const escena = () => ESCENAS[estado.escena];

// ---------------------------------------------------------------------------
// API para los guiones (se usa desde juego.js)
// ---------------------------------------------------------------------------

const bandera = n => !!estado.banderas[n];
const poner = (n, v = true) => { estado.banderas[n] = v; };
const tiene = id => estado.inventario.includes(id);
const recoger = id => { if (!tiene(id)) estado.inventario.push(id); };
const perder = id => { estado.inventario = estado.inventario.filter(i => i !== id); origen = null; };
const ocultar = id => { estado.ocultos[id] = true; };
const mostrar = id => { delete estado.ocultos[id]; };
const hablando = id => !!habla && habla.quien === id;

function esperar(ms) {
  return new Promise(res => temporizadores.push({ ms, res }));
}

// Muestra una línea de diálogo. `quien` es 'heroe' o el id de un hotspot de la escena.
function decir(texto, quien = 'heroe') {
  return new Promise(res => {
    const p = posicionHabla(quien);
    c.font = `bold 8px ${FUENTE}`;
    habla = {
      quien, color: p.color, x: p.x, y: p.y, lineas: partirTexto(texto, 150),
      ms: Math.max(1300, texto.length * 70), res,
    };
  });
}

function cerrarHabla() {
  const h = habla;
  habla = null;
  if (h) h.res();
}

// Opciones de conversación: devuelve el índice elegido.
function elegir(opciones) {
  return new Promise(res => { menu = { opciones: opciones.slice(0, 4), res }; });
}

// Camina al héroe hasta (x, y). Devuelve false si otra orden lo interrumpió.
function caminarA(x, y) {
  return new Promise(res => {
    if (heroe.camino) heroe.camino.res(false);
    const [px, py] = puntoCaminable(x, y);
    heroe.camino = { x: px, y: py, res };
  });
}

function fundir(hasta, ms = 250) {
  return new Promise(res => { fundido = { a: fundido.a, desde: fundido.a, hasta, t: 0, ms, res }; });
}

async function irA(id, x, y) {
  await fundir(1);
  orden++;
  estado.escena = id;
  const [ex, ey] = x === undefined ? escena().entrada : [x, y];
  Object.assign(heroe, { x: ex, y: ey, camino: null });
  await fundir(0);
}

async function fin(lineas) {
  await fundir(1, 800);
  textoFin = lineas;
  modo = 'fin';
}

// ---------------------------------------------------------------------------
// Geometría: área caminable (polígono convexo)
// ---------------------------------------------------------------------------

function dentro(poly, x, y) {
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) r = !r;
  }
  return r;
}

function puntoCaminable(x, y) {
  const poly = escena().poligono;
  if (dentro(poly, x, y)) return [x, y];
  let mejor = null, mejorD = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    const px = ax + t * dx, py = ay + t * dy;
    const d = (px - x) ** 2 + (py - y) ** 2;
    if (d < mejorD) { mejorD = d; mejor = [px, py]; }
  }
  return mejor;
}

function escalaEn(y) {
  const [y0, e0, y1, e1] = escena().profundidad;
  const t = Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
  return e0 + (e1 - e0) * t;
}

// ---------------------------------------------------------------------------
// Hotspots, inventario y ejecución de acciones
// ---------------------------------------------------------------------------

function hotspotsVisibles() {
  return escena().hotspots.filter(h => !estado.ocultos[h.id]);
}

function hotspotBajo(x, y) {
  const lista = hotspotsVisibles();
  for (let i = lista.length - 1; i >= 0; i--) {
    const [rx, ry, rw, rh] = lista[i].rect;
    if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) return lista[i];
  }
  return null;
}

function ranurasInventario() {
  const items = estado.inventario.slice(invDesp * 2, invDesp * 2 + 8);
  return items.map((id, i) => ({
    item: OBJETOS[id], x: 152 + (i % 2) * 76, y: PANEL_Y + 2 + Math.floor(i / 2) * 10, w: 76, h: 10,
  }));
}

function verboBajo(x, y) {
  for (let i = 0; i < VERBOS.length; i++) {
    const r = rectVerbo(i);
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return VERBOS[i];
  }
  return null;
}

const rectVerbo = i => ({ x: 4 + (i % 3) * 48, y: PANEL_Y + 2 + Math.floor(i / 3) * 13, w: 46, h: 12 });
const flechaArriba = { x: 306, y: PANEL_Y + 2, w: 10, h: 18 };
const flechaAbajo = { x: 306, y: PANEL_Y + 24, w: 10, h: 18 };
const enRect = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

function itemBajo(x, y) {
  const r = ranurasInventario().find(r => enRect(r, x, y));
  return r ? r.item : null;
}

// Lo que hay bajo el mouse (hotspot del mundo o item del inventario)
function objetoBajo(x, y) {
  return y < ALTO_ESCENA ? hotspotBajo(x, y) : itemBajo(x, y);
}

function puntoAcceso(h) {
  if (h.punto) return h.punto;
  const [rx, ry, rw, rh] = h.rect;
  return puntoCaminable(rx + rw / 2, ry + rh);
}

function buscarAccion(v, destino, orig) {
  if (orig) {
    const clave = v === 'dar' ? 'dar' : 'usarCon';
    return destino.acciones?.[clave]?.[orig.id] || orig.acciones?.[clave]?.[destino.id];
  }
  return destino.acciones?.[v];
}

const azar = lista => lista[Math.floor(Math.random() * lista.length)];

// Una acción puede ser una función, un texto o una lista de textos (que se dicen en orden).
async function correr(accion, quien) {
  if (typeof accion === 'string') await decir(accion, quien);
  else if (Array.isArray(accion)) { for (const t of accion) await decir(t, quien); }
  else await accion();
}

async function ejecutar(v, destino, orig = null) {
  const tok = ++orden;
  if (!destino.esItem) {
    if (v !== 'mirar') {
      const [px, py] = puntoAcceso(destino);
      if (!await caminarA(px, py) || tok !== orden) return;
    }
    const [rx, , rw] = destino.rect;
    heroe.cara = rx + rw / 2 >= heroe.x ? 1 : -1;
    if (destino.cara) heroe.cara = destino.cara;
  }
  ocupado = true;
  try {
    const accion = buscarAccion(v, destino, orig);
    if (accion) await correr(accion, 'heroe');
    else if (v !== 'ir') await decir(azar(RESPUESTAS[orig && v === 'usar' ? 'combinar' : v]));
  } finally {
    ocupado = false;
  }
}

// ---------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------

function posicion(e) {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) * ANCHO / r.width, (e.clientY - r.top) * ALTO / r.height];
}

function alHacerClic(e) {
  [mx, my] = posicion(e);
  e.preventDefault();
  if (modo === 'titulo') return comenzar();
  if (modo === 'fin') return location.reload();

  if (menu) {
    const i = Math.floor((my - PANEL_Y - 2) / 10);
    if (my >= PANEL_Y && i >= 0 && i < menu.opciones.length) {
      const m = menu;
      menu = null;
      m.res(i);
    }
    return;
  }
  if (habla) return cerrarHabla();
  if (ocupado || fundido.res) return;

  if (e.button === 2) {                    // clic derecho: mirar
    const o = objetoBajo(mx, my);
    if (o) ejecutar('mirar', o);
    else { verbo = 'ir'; origen = null; }
    return;
  }

  if (my >= PANEL_Y) return clicPanel();

  const h = hotspotBajo(mx, my);
  const v = verbo, o = origen;
  verbo = 'ir'; origen = null;
  if (!h) {
    orden++;
    caminarA(mx, my);
  } else {
    ejecutar(v, h, o);
  }
}

function clicPanel() {
  const vb = verboBajo(mx, my);
  if (vb) { verbo = vb.id; origen = null; return; }
  if (enRect(flechaArriba, mx, my)) { invDesp = Math.max(0, invDesp - 1); return; }
  if (enRect(flechaAbajo, mx, my)) {
    if (invDesp * 2 + 8 < estado.inventario.length) invDesp++;
    return;
  }
  const item = itemBajo(mx, my);
  if (!item) return;
  if ((verbo === 'usar' || verbo === 'dar') && !origen) { origen = item; return; }
  if (origen === item) return;
  const v = verbo === 'ir' ? 'mirar' : verbo, o = origen;
  verbo = 'ir'; origen = null;
  ejecutar(v, item, o);
}

// ---------------------------------------------------------------------------
// Actualización
// ---------------------------------------------------------------------------

function actualizar(dt) {
  tiempo += dt;

  for (const t of temporizadores.slice()) {
    t.ms -= dt * 1000;
    if (t.ms <= 0) { temporizadores.splice(temporizadores.indexOf(t), 1); t.res(); }
  }

  if (habla && (habla.ms -= dt * 1000) <= 0) cerrarHabla();

  if (fundido.res) {
    fundido.t += dt * 1000;
    const k = Math.min(1, fundido.t / fundido.ms);
    fundido.a = fundido.desde + (fundido.hasta - fundido.desde) * k;
    if (k >= 1) { const r = fundido.res; fundido.res = null; r(); }
  }

  if (modo === 'juego' && heroe.camino) {
    const m = heroe.camino;
    const dx = m.x - heroe.x, dy = m.y - heroe.y;
    const dist = Math.hypot(dx, dy);
    const paso = heroe.vel * escalaEn(heroe.y) * dt;
    if (Math.abs(dx) > 0.5) heroe.cara = dx > 0 ? 1 : -1;
    if (dist <= paso) {
      heroe.x = m.x; heroe.y = m.y; heroe.camino = null; m.res(true);
    } else {
      heroe.x += dx / dist * paso; heroe.y += dy / dist * paso;
      heroe.fase += paso * 0.5;
    }
  }
}

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------

const R = (ctx, color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

function poli(ctx, color, pts) {
  ctx.fillStyle = color;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

function elipse(ctx, color, x, y, rx, ry) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function txt(ctx, s, x, y, color, align = 'left', borde = true) {
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  if (borde) {
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

function partirTexto(texto, max) {
  const lineas = [];
  let actual = '';
  for (const palabra of texto.split(' ')) {
    const prueba = actual ? actual + ' ' + palabra : palabra;
    if (actual && c.measureText(prueba).width > max) { lineas.push(actual); actual = palabra; }
    else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function posicionHabla(quien) {
  if (quien === 'heroe') {
    return { x: heroe.x, y: heroe.y - 36 * escalaEn(heroe.y), color: '#7fd4ff' };
  }
  const h = escena().hotspots.find(h => h.id === quien);
  const [rx, ry, rw] = h.rect;
  const [bx, by] = h.boca || [rx + rw / 2, ry];
  return { x: bx, y: by, color: h.color || '#ffffff' };
}

function dibujarHeroe() {
  const esc = escalaEn(heroe.y);
  const camina = !!heroe.camino;
  const paso = camina ? Math.round(Math.sin(heroe.fase) * 3) : 0;
  const rebote = camina ? Math.abs(Math.sin(heroe.fase)) > 0.7 ? -1 : 0 : 0;

  c.save();
  c.translate(Math.round(heroe.x), Math.round(heroe.y));
  c.scale(heroe.cara * esc, esc);
  elipse(c, 'rgba(0,0,0,.3)', 0, 0, 9, 2.5);
  // piernas y botas
  R(c, '#2d3a6b', -4 + paso, -11, 3, 8); R(c, '#2d3a6b', 1 - paso, -11, 3, 8);
  R(c, '#24160c', -5 + paso, -3, 5, 3); R(c, '#24160c', 1 - paso, -3, 5, 3);
  // torso
  R(c, '#2f5fa8', -6, -23 + rebote, 12, 12);
  R(c, '#f0e6d2', -1, -23 + rebote, 3, 6);
  R(c, '#2a1a0c', -6, -13 + rebote, 12, 2); R(c, '#e8c24a', 0, -13 + rebote, 2, 2);
  // brazos
  R(c, '#2f5fa8', -8, -22 + rebote - Math.round(paso / 3), 3, 9);
  R(c, '#2f5fa8', 5, -22 + rebote + Math.round(paso / 3), 3, 9);
  // cabeza
  R(c, '#f0b987', -4, -31 + rebote, 8, 8);
  R(c, '#d02f2f', -5, -33 + rebote, 10, 3); R(c, '#d02f2f', -7, -32 + rebote, 3, 3);
  R(c, '#5a3a1e', -6, -29 + rebote, 2, 6);
  R(c, '#111', 1, -28 + rebote, 1, 2);
  R(c, '#d99a6a', 4, -27 + rebote, 1, 2);
  const boca = hablando('heroe') && Math.floor(tiempo * 10) % 2;
  R(c, '#7a2a2a', 1, -25 + rebote, 3, boca ? 2 : 1);
  c.restore();
}

function dibujarHabla() {
  if (!habla) return;
  c.font = `bold 8px ${FUENTE}`;
  const n = habla.lineas.length;
  const ancho = Math.max(...habla.lineas.map(l => c.measureText(l).width));
  const x = Math.max(ancho / 2 + 4, Math.min(ANCHO - ancho / 2 - 4, habla.x));
  const y0 = Math.max(2, habla.y - n * 9 - 2);
  habla.lineas.forEach((l, i) => txt(c, l, x, y0 + i * 9, habla.color, 'center'));
}

function dibujarPanel() {
  R(c, '#0a0a14', 0, ALTO_ESCENA, ANCHO, ALTO - ALTO_ESCENA);
  R(c, '#2a2a44', 0, PANEL_Y - 1, ANCHO, 1);
  c.font = `bold 8px ${FUENTE}`;

  // frase de acción
  if (!ocupado && !menu) {
    const v = VERBOS.find(v => v.id === verbo);
    let s = v.texto;
    if (origen) s += ` ${origen.nombre} ${verbo === 'dar' ? 'a' : 'con'}`;
    const h = objetoBajo(mx, my);
    if (h && h !== origen && my < PANEL_Y) s += ` ${h.nombre}`;
    else if (h && h !== origen && my >= PANEL_Y) s += ` ${h.nombre}`;
    txt(c, s, ANCHO / 2, ALTO_ESCENA + 3, '#5ee6e6', 'center');
  }

  if (menu) {
    const hover = Math.floor((my - PANEL_Y - 2) / 10);
    menu.opciones.forEach((o, i) => {
      txt(c, o, 6, PANEL_Y + 2 + i * 10, hover === i && my >= PANEL_Y ? '#ffe36b' : '#c58cff', 'left', false);
    });
    return;
  }

  const vb = verboBajo(mx, my);
  VERBOS.forEach((v, i) => {
    const r = rectVerbo(i);
    const color = vb === v ? '#ffe36b' : v.id === verbo ? '#5ee6e6' : '#b57cf0';
    txt(c, v.texto, r.x, r.y + 2, color, 'left', false);
  });

  const hover = itemBajo(mx, my);
  ranurasInventario().forEach(r => {
    const color = r.item === origen ? '#5ee6e6' : r.item === hover ? '#ffe36b' : '#4fc3a1';
    txt(c, r.item.nombre, r.x, r.y + 1, color, 'left', false);
  });
  txt(c, '▲', flechaArriba.x + 5, flechaArriba.y + 3, invDesp > 0 ? '#b57cf0' : '#33334d', 'center', false);
  txt(c, '▼', flechaAbajo.x + 5, flechaAbajo.y + 3,
    invDesp * 2 + 8 < estado.inventario.length ? '#b57cf0' : '#33334d', 'center', false);
}

function dibujarTitulo() {
  const cielo = ['#12082e', '#1d0e47', '#2d1560', '#46206d', '#6a2d73', '#964079', '#c85f6b', '#f08a5d', '#fbc46b'];
  cielo.forEach((col, i) => R(c, col, 0, i * 14, ANCHO, 14));
  R(c, '#0d2a4a', 0, 126, ANCHO, 74);
  for (let i = 0; i < 7; i++) R(c, '#ffd98a', 150 - i * 8 + Math.round(Math.sin(tiempo * 2 + i) * 3), 128 + i * 4, 20 + i * 16, 1);
  elipse(c, '#ffe9a0', 160, 126, 26, 26);
  R(c, '#0d2a4a', 0, 126, ANCHO, 74);
  for (let i = 0; i < 7; i++) R(c, 'rgba(255,217,138,.7)', 160 - (10 + i * 8) / 2 + Math.round(Math.sin(tiempo * 2 + i) * 3), 129 + i * 5, 10 + i * 8, 1);
  // barco pirata
  c.save();
  c.translate(0, Math.round(Math.sin(tiempo * 1.5) * 1.5));
  poli(c, '#120a1c', [[120, 118], [200, 118], [190, 132], [130, 132]]);
  R(c, '#120a1c', 158, 70, 3, 48);
  poli(c, '#120a1c', [[162, 74], [192, 112], [162, 112]]);
  poli(c, '#120a1c', [[156, 82], [132, 112], [156, 112]]);
  c.restore();

  c.font = `bold 20px ${FUENTE}`;
  txt(c, 'EL SECRETO DE LA', ANCHO / 2, 14, '#ffd24a', 'center');
  txt(c, 'ISLA CALAMAR', ANCHO / 2, 38, '#ffd24a', 'center');
  c.font = `bold 8px ${FUENTE}`;
  txt(c, 'Una aventura gráfica', ANCHO / 2, 66, '#ffffff', 'center');
  if (Math.floor(tiempo * 1.5) % 2 === 0) txt(c, 'Clic para empezar', ANCHO / 2, 168, '#5ee6e6', 'center');
}

function dibujarFin() {
  R(c, '#000', 0, 0, ANCHO, ALTO);
  c.font = `bold 8px ${FUENTE}`;
  textoFin.forEach((l, i) => txt(c, l, ANCHO / 2, 60 + i * 14, i === 0 ? '#ffd24a' : '#ffffff', 'center'));
  if (Math.floor(tiempo * 1.5) % 2 === 0) txt(c, 'Clic para volver a empezar', ANCHO / 2, 170, '#5ee6e6', 'center');
}

function dibujar() {
  c.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);
  c.imageSmoothingEnabled = false;
  c.font = `bold 8px ${FUENTE}`;
  if (modo === 'titulo') return dibujarTitulo();
  if (modo === 'fin') return dibujarFin();

  c.save();
  c.beginPath();
  c.rect(0, 0, ANCHO, ALTO_ESCENA);
  c.clip();
  escena().dibujar(c, tiempo, estado);
  dibujarHeroe();
  dibujarHabla();
  c.restore();
  dibujarPanel();
  if (fundido.a > 0) {
    c.fillStyle = `rgba(0,0,0,${fundido.a})`;
    c.fillRect(0, 0, ANCHO, ALTO);
  }
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

async function comenzar() {
  estado = nuevoEstado();
  modo = 'juego';
  const [x, y] = escena().entrada;
  Object.assign(heroe, { x, y, cara: -1, camino: null });
  ocupado = true;
  await intro();
  ocupado = false;
}

function arrancar() {
  for (const [id, o] of Object.entries(OBJETOS)) { o.id = id; o.esItem = true; }
  canvas = document.getElementById('juego');
  canvas.width = ANCHO * ZOOM;
  canvas.height = ALTO * ZOOM;
  c = canvas.getContext('2d');
  canvas.addEventListener('pointermove', e => { [mx, my] = posicion(e); });
  canvas.addEventListener('pointerdown', alHacerClic);
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  let ultimo = performance.now();
  const bucle = ahora => {
    actualizar(Math.min(0.05, (ahora - ultimo) / 1000));
    ultimo = ahora;
    dibujar();
    requestAnimationFrame(bucle);
  };
  requestAnimationFrame(bucle);
}
