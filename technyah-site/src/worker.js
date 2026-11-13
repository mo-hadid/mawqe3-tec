/* Worker entry for technyah.com on Cloudflare Workers.
   Pages and files come from dist/ (built by build.mjs). Only /api/* reaches this code,
   where it runs the same handlers that live in functions/ (they also work on Cloudflare Pages). */
import * as submit from '../functions/api/submit.js';
import * as health from '../functions/api/health.js';
import * as admin from '../functions/api/admin/[action].js';
import { json } from '../functions/_shared/lib.js';

const SECURITY = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'cache-control': 'no-store',
};

function pick(mod, method) {
  const name = 'onRequest' + method.charAt(0) + method.slice(1).toLowerCase();
  return mod[name] || mod.onRequest || null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let mod = null, params = {};
    if (url.pathname === '/api/submit') mod = submit;
    else if (url.pathname === '/api/health') mod = health;
    else {
      const m = url.pathname.match(/^\/api\/admin\/([a-z]+)$/);
      if (m) { mod = admin; params = { action: m[1] }; }
    }
    if (!mod) {
      if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'Not found.' }, 404);
      return env.ASSETS.fetch(request);
    }
    const handler = pick(mod, request.method);
    if (!handler) return json({ ok: false, error: 'Method not allowed.' }, 405);
    const res = await handler({ request, env, params, waitUntil: p => ctx.waitUntil(p), next: () => env.ASSETS.fetch(request) });
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SECURITY)) if (!out.headers.has(k)) out.headers.set(k, v);
    return out;
  },
};
