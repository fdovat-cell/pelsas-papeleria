import { sesionValida, leerCookie } from '../_lib/session.js';

// GET /api/check-session
export async function onRequestGet({ request, env }) {
  const token = leerCookie(request, 'pp_session');
  const valida = await sesionValida(env.SESSION_SECRET, token);
  return new Response(JSON.stringify({ ok: valida }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
