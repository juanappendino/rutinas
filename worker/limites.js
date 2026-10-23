// Límites del API de sincronización (aparte de index.js: un Worker solo puede exportar manejadores).
export const CODIGO = /^[A-Za-z0-9_-]{22,64}$/;
export const MAX_BODY = 4_000_000;
