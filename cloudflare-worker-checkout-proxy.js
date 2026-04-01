/**
 * SABDA Checkout Proxy — Cloudflare Worker
 * 
 * Routes:
 *   sabdastudio.com/book/*        → momence.com/*
 *   sabdastudio.com/book/_api/*   → momence.com/_api/*
 *   sabdastudio.com/book/s/*      → momence.com/s/* (shortlinks)
 *   sabdastudio.com/book/m/*      → momence.com/m/* (membership links)
 *   sabdastudio.com/book/sign-in  → momence.com/sign-in
 * 
 * SETUP (5 minutes):
 *   1. Log in to Cloudflare → dash.cloudflare.com
 *   2. Left sidebar → Workers & Pages → Create Application → Create Worker
 *   3. Name it: sabda-checkout-proxy
 *   4. Click "Edit Code" → delete default code → paste this entire file
 *   5. Click "Save and Deploy"
 *   6. Go to your worker → Settings → Triggers → Add Route
 *   7. Route: sabdastudio.com/book/* | Zone: sabdastudio.com
 *   8. Done. Test: visit sabdastudio.com/book/SABDA-54278
 */

const MOMENCE = 'https://momence.com';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-v2, x-api-key, x-app, x-origin, sentry-trace, baggage, x-idempotence-key',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Strip /book prefix to get Momence path
    const path = url.pathname.replace(/^\/book/, '') || '/';
    const target = MOMENCE + path + url.search;

    // Build headers to forward
    const fwd = new Headers();
    for (const [k, v] of request.headers) {
      if (k.startsWith('cf-') || k === 'host') continue;
      fwd.set(k, v);
    }
    fwd.set('Host', 'momence.com');
    fwd.set('Origin', 'https://momence.com');
    fwd.set('Referer', 'https://momence.com/');

    let res;
    try {
      res = await fetch(target, {
        method: request.method,
        headers: fwd,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'manual',
      });
    } catch (err) {
      return new Response('Proxy error: ' + err.message, { status: 502 });
    }

    // Rewrite redirects to stay on our domain
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      let loc = res.headers.get('Location') || '';
      if (loc.startsWith('https://momence.com/')) {
        loc = '/book/' + loc.slice('https://momence.com/'.length);
      } else if (loc.startsWith('/')) {
        loc = '/book' + loc;
      }
      const h = new Headers(res.headers);
      h.set('Location', loc);
      h.delete('X-Frame-Options');
      h.delete('Content-Security-Policy');
      return new Response(null, { status: res.status, headers: h });
    }

    const ct = res.headers.get('Content-Type') || '';

    // HTML pages: inject iframe override + rewrite links
    if (ct.includes('text/html')) {
      let html = await res.text();

      // Override iframe detection before any other script runs
      html = html.replace('<head>', `<head>
<script>
try{
  Object.defineProperty(window,'top',{get:function(){return window},configurable:true});
  Object.defineProperty(window,'parent',{get:function(){return window},configurable:true});
}catch(e){}
</script>`);

      // Rewrite all momence.com URLs to proxy
      html = html.replace(/https:\/\/momence\.com\/_api/g, '/book/_api');
      html = html.replace(/https:\/\/momence\.com\/sign-in/g, '/book/sign-in');
      html = html.replace(/https:\/\/momence\.com\/sign-up/g, '/book/sign-up');
      html = html.replace(/https:\/\/momence\.com\/SABDA/g, '/book/SABDA');
      html = html.replace(/https:\/\/momence\.com\/s\//g, '/book/s/');
      html = html.replace(/https:\/\/momence\.com\/m\//g, '/book/m/');
      html = html.replace(/https:\/\/momence\.com\/gcc\//g, '/book/gcc/');

      const h = new Headers(res.headers);
      h.delete('X-Frame-Options');
      h.delete('Content-Security-Policy');
      h.set('Access-Control-Allow-Origin', '*');
      return new Response(html, { status: res.status, headers: h });
    }

    // JavaScript: rewrite API base URLs in bundles
    if (ct.includes('javascript') || path.endsWith('.js')) {
      let js = await res.text();
      js = js.replace(/https:\/\/momence\.com\/_api/g, '/book/_api');
      js = js.replace(/"https:\/\/momence\.com\/sign-in/g, '"/book/sign-in');
      js = js.replace(/"https:\/\/momence\.com\/sign-up/g, '"/book/sign-up');
      js = js.replace(/"https:\/\/momence\.com"/g, '""');

      const h = new Headers(res.headers);
      h.set('Access-Control-Allow-Origin', '*');
      return new Response(js, { status: res.status, headers: h });
    }

    // Everything else: pass through with CORS headers
    const h = new Headers(res.headers);
    h.set('Access-Control-Allow-Origin', '*');
    h.delete('X-Frame-Options');
    h.delete('Content-Security-Policy');
    return new Response(res.body, { status: res.status, headers: h });
  },
};
