import { sesionValida, leerCookie } from '../_lib/session.js';

// POST /api/save-price   body: { categoria, codigo, precio }
// precio puede ser un numero, o null para marcar "sin stock / sin precio cargado".
export async function onRequestPost({ request, env }) {
  const token = leerCookie(request, 'pp_session');
  const valida = await sesionValida(env.SESSION_SECRET, token);
  if (!valida) {
    return new Response(JSON.stringify({ ok: false, error: 'Sesión inválida, iniciá sesión de nuevo' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { categoria, codigo, precio } = await request.json().catch(() => ({}));
  if (!categoria || !codigo) {
    return new Response(JSON.stringify({ ok: false, error: 'Faltan datos (categoria o codigo)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // GITHUB_TOKEN, GITHUB_REPO ("usuario/repo") y GITHUB_BRANCH se configuran
  // como variables de entorno en Cloudflare, igual que las de sesión.
  const repo = env.GITHUB_REPO;
  const branch = env.GITHUB_BRANCH || 'main';
  const path = `data/${categoria}.json`;
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;

  const headersGitHub = {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'pelsas-papeleria-admin'
  };

  // 1. Leer el archivo actual (necesitamos el sha para poder sobreescribirlo)
  const resGet = await fetch(apiUrl, { headers: headersGitHub });
  if (!resGet.ok) {
    return new Response(JSON.stringify({ ok: false, error: `No pude leer ${path} de GitHub` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const archivo = await resGet.json();
  const contenidoActual = JSON.parse(decodeURIComponent(escape(atob(archivo.content))));

  // 2. Buscar el producto por código en todas las páginas y actualizar el precio
  let encontrado = false;
  for (const pagina of contenidoActual.paginas) {
    const producto = pagina.productos.find(p => p.codigo === codigo);
    if (producto) {
      producto.precio = precio;
      encontrado = true;
      break;
    }
  }

  if (!encontrado) {
    return new Response(JSON.stringify({ ok: false, error: `Código ${codigo} no encontrado en ${categoria}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 3. Escribir de nuevo el archivo completo con el precio actualizado
  const nuevoContenido = JSON.stringify(contenidoActual, null, 2);
  const nuevoContenidoB64 = btoa(unescape(encodeURIComponent(nuevoContenido)));

  const resPut = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...headersGitHub, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Admin: actualizar precio de ${codigo} en ${categoria}`,
      content: nuevoContenidoB64,
      sha: archivo.sha,
      branch
    })
  });

  if (!resPut.ok) {
    const detalle = await resPut.text();
    return new Response(JSON.stringify({ ok: false, error: 'GitHub rechazó el guardado', detalle }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
