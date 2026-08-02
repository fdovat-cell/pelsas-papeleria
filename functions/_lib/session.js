// Helpers de sesión firmada. Se usan desde las funciones de /functions/api.
// No dependen de node:crypto porque Cloudflare Workers corre en un runtime
// tipo navegador — usamos la Web Crypto API (crypto.subtle), que sí está disponible.

async function hmac(secret, mensaje) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const firma = await crypto.subtle.sign('HMAC', key, encoder.encode(mensaje));
  return btoa(String.fromCharCode(...new Uint8Array(firma)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Crea un token de sesión: "expiraEn.firma"
export async function crearSesion(secret, horasValidez = 12) {
  const expira = Date.now() + horasValidez * 60 * 60 * 1000;
  const firma = await hmac(secret, String(expira));
  return `${expira}.${firma}`;
}

// Verifica el token de la cookie. Devuelve true/false.
export async function sesionValida(secret, token) {
  if (!token) return false;
  const [expira, firma] = token.split('.');
  if (!expira || !firma) return false;
  if (Date.now() > Number(expira)) return false; // expiró
  const firmaEsperada = await hmac(secret, expira);
  return firma === firmaEsperada;
}

export function leerCookie(request, nombre) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|; )${nombre}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}
