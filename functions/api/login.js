import { crearSesion } from '../_lib/session.js';

// POST /api/login   body: { usuario, clave }
export async function onRequestPost({ request, env }) {
  const { usuario, clave } = await request.json().catch(() => ({}));

  // ADMIN_USER, ADMIN_PASS y SESSION_SECRET se configuran en Cloudflare,
  // Settings del proyecto → Environment variables (como secretas, no en el repo).
  if (usuario !== env.ADMIN_USER || clave !== env.ADMIN_PASS) {
    return new Response(JSON.stringify({ ok: false, error: 'Usuario o clave incorrectos' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const token = await crearSesion(env.SESSION_SECRET);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `pp_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`
    }
  });
}
