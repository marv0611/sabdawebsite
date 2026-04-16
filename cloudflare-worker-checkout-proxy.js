const MOMENCE = 'https://momence.com';

// Generate a random UUID v4 (Cloudflare Workers have crypto.randomUUID natively)
function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── BROWSER-LIKE HEADERS for Momence API calls ──
// Momence has multi-layer anti-bot protection. EVERY call to a Momence
// endpoint MUST go through this helper, otherwise the SABDA host
// (host_id 54278) gets rate-limited and ALL visitors see
// "You have reached the limit of number of failed retries for your payment".
//
// Layers we've identified and now address:
// 1. User-Agent / Accept-Language / sec-fetch-* fingerprint check
// 2. Per-IP rate limit (we forward visitor's real IP via cf-connecting-ip)
// 3. Per-session widget activity (we make warm-up calls)
// 4. Required Momence-specific headers: x-app, x-session-v2, x-idempotence-key
//    (these were in our CORS allowlist but never actually being sent —
//    real Momence widgets DO send them and Momence likely validates presence)
//
// CRITICAL: pass the original `request` object as the second arg so we
// forward the visitor's real IP and User-Agent. Without this, ALL visitors
// look identical to Momence (same Cloudflare edge IP, same headers) and they
// trip the per-IP rate limit on top of the per-host one.
function momenceHeaders(extra, originalRequest) {
  // Extract real visitor data from the incoming request if available
  let visitorIp = null;
  let visitorUa = null;
  let visitorLang = null;
  if (originalRequest && originalRequest.headers) {
    visitorIp =
      originalRequest.headers.get('cf-connecting-ip') ||
      originalRequest.headers.get('x-real-ip') ||
      originalRequest.headers.get('x-forwarded-for');
    visitorUa = originalRequest.headers.get('user-agent');
    visitorLang = originalRequest.headers.get('accept-language');
  }

  const requestId = uuid();
  const traceId = uuid().replace(/-/g, '').substring(0, 32);
  const spanId = uuid().replace(/-/g, '').substring(0, 16);

  const base = {
    'Host': 'momence.com',
    'User-Agent': visitorUa || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': visitorLang || 'en-US,en;q=0.9',
    'Origin': 'https://momence.com',
    'Referer': 'https://momence.com/u/sabda',
    'X-Requested-With': 'XMLHttpRequest',
    'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    // Momence-specific session headers (from CORS allowlist — these are what
    // their real widget sends and what their API likely validates):
    'x-app': 'momence-web',
    'x-origin': 'plugin',
    'x-session-v2': uuid(),
    'x-idempotence-key': requestId,
    'sentry-trace': traceId + '-' + spanId + '-1',
    'baggage': 'sentry-environment=production,sentry-public_key=momence,sentry-trace_id=' + traceId,
  };

  // CRITICAL: forward the visitor's real IP so Momence doesn't see all our
  // traffic as a single Cloudflare edge IP. This is the actual fix for the
  // per-IP rate limit that affects ALL users of the proxy at once.
  if (visitorIp) {
    base['X-Forwarded-For'] = visitorIp;
    base['CF-Connecting-IP'] = visitorIp;
    base['X-Real-IP'] = visitorIp;
  }

  if (extra) {
    for (const k in extra) {
      if (extra[k] !== undefined && extra[k] !== null) base[k] = extra[k];
    }
  }
  return base;
}

// Capture ALL Set-Cookie headers from a response. headers.get('set-cookie')
// only returns the first one in Cloudflare Workers; we need to iterate.
function captureCookies(res) {
  const cookies = [];
  for (const [k, v] of res.headers) {
    if (k.toLowerCase() === 'set-cookie') {
      cookies.push(v.split(';')[0]);
    }
  }
  return cookies.join('; ');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── STARTUP-TIME ASSERTION ──
    // Workers don't have true bootstrap (every fetch is independent), so we
    // log on every invocation if the secret is missing. Logging once per
    // invocation is fine — Cloudflare deduplicates identical lines in the
    // dashboard, and the cost is one string concat.
    if (!env.CAPI_ACCESS_TOKEN) {
      console.error('[FATAL] CAPI_ACCESS_TOKEN not set on Worker — CAPI will silently no-op');
    }

    const reqOrigin = request.headers.get('Origin') || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': reqOrigin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-v2, x-api-key, x-app, x-origin, sentry-trace, baggage, x-idempotence-key',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // ── SABDA API: server-side login + membership check ──
    if (url.pathname === '/sabda-api/health') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: corsHeaders(reqOrigin),
      });
    }
    // ── DIAGNOSTIC: report whether CAPI_ACCESS_TOKEN is configured ──
    // Returns boolean only, never the value. Lets us verify the secret is
    // live with a single curl, without waiting for a real Purchase to surface
    // in Meta Events Manager (10–20 min lag) or doing test card transactions.
    if (url.pathname === '/sabda-api/capi-status') {
      const tokenSet = !!(env && env.CAPI_ACCESS_TOKEN);
      return new Response(JSON.stringify({
        capi_token_set: tokenSet,
        pixel_id: '567636669734630',
        capi_endpoint: '/sabda-api/capi-purchase',
        message: tokenSet ? 'CAPI ready' : 'CAPI WILL SILENTLY NO-OP — set CAPI_ACCESS_TOKEN secret on Worker',
      }), {
        status: tokenSet ? 200 : 503,
        headers: corsHeaders(reqOrigin),
      });
    }
    if (url.pathname === '/sabda-api/promo') {
      return handlePromo(request, reqOrigin);
    }
    if (url.pathname === '/sabda-api/check-email') {
      return handleCheckEmail(request, reqOrigin);
    }
    if (url.pathname === '/sabda-api/check-memberships') {
      return handleCheckMemberships(request, reqOrigin);
    }
    if (url.pathname === '/sabda-api/login') {
      return handleLogin(request, reqOrigin);
    }
    if (url.pathname === '/sabda-api/mfa-verify') {
      return handleMfaVerify(request, reqOrigin);
    }
    if (url.pathname === '/sabda-api/book') {
      return handleBook(request, reqOrigin);
    }
    if (url.pathname === '/sabda-api/capi-purchase') {
      return handleCapiEvent(request, reqOrigin, env, ctx, /* defaultEvent */ 'Purchase', /* requireEmail */ true);
    }
    // Generic CAPI endpoint for Lead, InitiateCheckout, AddToCart, ViewContent.
    // Shares handleCapiEvent with /capi-purchase — difference is email is NOT
    // required (ViewContent fires before the user submits the form). Each event
    // sent via this endpoint still routes through sendCAPIEvent, so match-quality
    // fields (em/ph/fn/ln/ct/country/external_id/ip/ua/fbp/fbc incl. Safari-ITP
    // fallback) are all included when available.
    if (url.pathname === '/sabda-api/capi-event') {
      return handleCapiEvent(request, reqOrigin, env, ctx, /* defaultEvent */ null, /* requireEmail */ false);
    }
    if (url.pathname === '/sabda-api/pay') {
      return handlePay(request, reqOrigin, env, ctx);
    }

    if (url.pathname === '/sabda-api/contact') {
      return handleContact(request, reqOrigin, env);
    }

    // ── ATTRIBUTION STORAGE: persist email→attribution for Momence-native purchase matching ──
    if (url.pathname === '/sabda-api/store-attribution') {
      return handleStoreAttribution(request, reqOrigin, env);
    }

    // ── PURCHASE WEBHOOK: Momence→Zapier→here. Fires CAPI Purchase with stored attribution ──
    if (url.pathname === '/sabda-api/webhook/purchase') {
      return handleWebhookPurchase(request, reqOrigin, env, ctx);
    }

    // ── CUSTOM SIGN-IN PAGE: intercept /sign-in and show our form ──
    if (url.pathname === '/sign-in' || url.pathname.startsWith('/sign-in')) {
      return new Response(buildSignInPage(url.search), {
        headers: { 'Content-Type': 'text/html;charset=utf-8' },
      });
    }

    const target = MOMENCE + url.pathname + url.search;

    // Forward incoming request headers, then layer in browser-like defaults
    // for anything missing. The catch-all proxy is what serves the iframe-style
    // Momence pages, so the browser DOES send real headers we want to preserve.
    const fwd = new Headers();
    for (const [k, v] of request.headers) {
      if (k.startsWith('cf-') || k === 'host') continue;
      fwd.set(k, v);
    }
    // Layer in Momence-required defaults (don't overwrite real browser values)
    const mDefaults = momenceHeaders();
    for (const k in mDefaults) {
      if (!fwd.has(k)) fwd.set(k, mDefaults[k]);
    }
    // These MUST be overridden — browser sends its own Origin/Referer, but we
    // need Momence to see Momence as the origin
    fwd.set('Host', 'momence.com');
    fwd.set('Origin', MOMENCE);
    fwd.set('Referer', MOMENCE + '/');

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

    const h = new Headers();
    for (const [k, v] of res.headers) {
      if (k.toLowerCase() === 'set-cookie') {
        let c = v.replace(/;\s*[Dd]omain=[^;]*/g, '');
        c = c.replace(/;\s*[Ss]ame[Ss]ite=[^;]*/g, '');
        c += '; SameSite=None; Secure';
        h.append('Set-Cookie', c);
        continue;
      }
      if (k.toLowerCase() === 'x-frame-options' || k.toLowerCase() === 'content-security-policy') continue;
      h.set(k, v);
    }
    h.set('Access-Control-Allow-Origin', reqOrigin);
    h.set('Access-Control-Allow-Credentials', 'true');
    h.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-v2, x-api-key, x-app, x-origin, sentry-trace, baggage, x-idempotence-key');

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      let loc = h.get('Location') || '';
      if (loc.startsWith(MOMENCE)) loc = loc.replace(MOMENCE, '');
      h.set('Location', loc);
      return new Response(null, { status: res.status, headers: h });
    }

    const ct = h.get('Content-Type') || '';

    if (ct.includes('text/html')) {
      let html = await res.text();
      html = html.replace('<head>', '<head>' + INJECT_SCRIPT);
      return new Response(html, { status: res.status, headers: h });
    }

    return new Response(res.body, { status: res.status, headers: h });
  },
};

// ── INJECTED SCRIPT for checkout pages ──
const INJECT_SCRIPT = `
<script>
// Make login functions global so onclick attributes work
window.showSabdaLogin=function(){
  if(document.getElementById('sabda-login'))return;
  if(window.location.pathname.indexOf('/SABDA')>-1){
    sessionStorage.setItem('sabda_checkout',window.location.pathname+window.location.search);
  }
  var d=document.createElement('div');d.id='sabda-login';
  d.style.cssText='position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif';
  d.innerHTML='<div style="background:#fff;border-radius:12px;padding:32px;width:340px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,.3)">'
    +'<div style="text-align:center;margin-bottom:24px"><div style="font-size:20px;font-weight:700;color:#1a1a2e">Welcome back</div><div style="font-size:13px;color:#666;margin-top:4px">Sign in to your Momence account</div></div>'
    +'<label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:4px">Email</label>'
    +'<input id="sl-email" type="email" placeholder="your@email.com" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:15px;margin-bottom:16px;box-sizing:border-box;outline:none" />'
    +'<label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:4px">Password</label>'
    +'<input id="sl-pass" type="password" placeholder="Password" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:15px;margin-bottom:8px;box-sizing:border-box;outline:none" />'
    +'<div id="sl-err" style="color:#e53e3e;font-size:12px;min-height:18px;margin-bottom:8px"></div>'
    +'<button id="sl-btn" onclick="window.doSabdaLogin()" style="width:100%;padding:12px;background:#6c63ff;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">Log in</button>'
    +'<div style="text-align:center;margin-top:16px"><a href="#" onclick="window.closeSabdaLogin();return false" style="font-size:13px;color:#666;text-decoration:none">Cancel</a></div></div>';
  document.body.appendChild(d);
  document.getElementById('sl-email').focus();
  document.getElementById('sl-pass').addEventListener('keydown',function(e){if(e.key==='Enter')window.doSabdaLogin();});
};
window.closeSabdaLogin=function(){var d=document.getElementById('sabda-login');if(d)d.remove();};
window.doSabdaLogin=function(){
  var email=document.getElementById('sl-email').value.trim();
  var pass=document.getElementById('sl-pass').value;
  var err=document.getElementById('sl-err');
  var btn=document.getElementById('sl-btn');
  if(!email||!pass){err.textContent='Please enter email and password';return;}
  err.textContent='';btn.textContent='Signing in...';btn.disabled=true;
  fetch('/_api/primary/auth/login',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    credentials:'include',
    body:JSON.stringify({email:email,password:pass})
  }).then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d}});})
  .then(function(r){
    if(r.ok){
      if(r.data.id) localStorage.setItem('userId',String(r.data.id));
      if(r.data.email) localStorage.setItem('userEmail',r.data.email);
      if(r.data.firstName) localStorage.setItem('userFirstName',r.data.firstName);
      window.closeSabdaLogin();
      var dest=sessionStorage.getItem('sabda_checkout');
      if(dest) window.location.replace(dest);
      else window.location.reload();
    } else {
      err.textContent=r.data.message||r.data.error||'Invalid credentials';
      btn.textContent='Log in';btn.disabled=false;
    }
  }).catch(function(){
    err.textContent='Connection error. Please try again.';
    btn.textContent='Log in';btn.disabled=false;
  });
};

(function(){
try{
  Object.defineProperty(window,'top',{get:function(){return window},configurable:true});
  Object.defineProperty(window,'parent',{get:function(){return window},configurable:true});
}catch(e){}

function isDash(p){return p&&p.indexOf('/dashboard')>-1;}
function bounceBack(){
  var dest=sessionStorage.getItem('sabda_checkout');
  if(dest&&isDash(window.location.pathname)){
    window.location.replace(dest);
    return true;
  }
  return false;
}
if(bounceBack()) return;

// Auto-save checkout URL when on a checkout page
if(window.location.pathname.indexOf('/SABDA')>-1){
  sessionStorage.setItem('sabda_checkout',window.location.pathname+window.location.search);
}

// Block SPA navigation to /dashboard
var _ps=history.pushState;
history.pushState=function(){
  var u=arguments[2]||'';
  if(typeof u==='string'&&isDash(u)){
    var d=sessionStorage.getItem('sabda_checkout');
    if(d){_ps.apply(history,[arguments[0],arguments[1],d]);return;}
    return;
  }
  return _ps.apply(history,arguments);
};
var _rs=history.replaceState;
history.replaceState=function(){
  var u=arguments[2]||'';
  if(typeof u==='string'&&isDash(u)){
    var d=sessionStorage.getItem('sabda_checkout');
    if(d){_rs.apply(history,[arguments[0],arguments[1],d]);return;}
    return;
  }
  return _rs.apply(history,arguments);
};

// Poll URL every 200ms for 10s as safety net
var pn=0;
var pid=setInterval(function(){
  pn++;
  if(isDash(window.location.pathname)){
    var d=sessionStorage.getItem('sabda_checkout');
    if(d){clearInterval(pid);window.location.replace(d);return;}
  }
  if(pn>15&&!isDash(window.location.pathname)&&window.location.pathname.indexOf('/SABDA')>-1){
    sessionStorage.removeItem('sabda_checkout');
    clearInterval(pid);
  }
  if(pn>50) clearInterval(pid);
},200);

window.addEventListener('popstate',function(){
  if(isDash(window.location.pathname)){bounceBack();}
});

// Intercept location.assign and location.replace for /dashboard
try{
  var _la=window.location.assign.bind(window.location);
  window.location.assign=function(u){
    if(typeof u==='string'&&isDash(u)){var d=sessionStorage.getItem('sabda_checkout');if(d){_la(d);return;}}
    _la(u);
  };
  var _lr=window.location.replace.bind(window.location);
  window.location.replace=function(u){
    if(typeof u==='string'&&isDash(u)){var d=sessionStorage.getItem('sabda_checkout');if(d){_lr(d);return;}}
    _lr(u);
  };
}catch(e){}

// ── BROAD CLICK INTERCEPTOR: catch <a>, <button>, and any clickable with sign-in text ──
document.addEventListener('click',function(e){
  var el=e.target;
  // Walk up the DOM tree checking each element
  while(el&&el!==document){
    var hr=(el.getAttribute&&el.getAttribute('href'))||'';
    var txt=(el.textContent||'').toLowerCase();
    // Check href for sign-in
    if(hr&&(hr.indexOf('/sign-in')>-1||hr.indexOf('momence.com/sign-in')>-1)){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      window.showSabdaLogin();return;
    }
    // Check href for other momence.com links
    if(hr&&hr.indexOf('momence.com/')>-1){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      window.location.href=hr.replace(/https:\\/\\/momence\\.com/,'');return;
    }
    // Check text content for sign-in buttons/links (narrow: only small elements)
    if(txt.length<30&&(txt.indexOf('sign in')>-1||txt.indexOf('log in')>-1||txt.indexOf('sign-in')>-1)){
      var tag=el.tagName;
      if(tag==='A'||tag==='BUTTON'||tag==='SPAN'||(el.getAttribute&&el.getAttribute('role')==='button')){
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        window.showSabdaLogin();return;
      }
    }
    el=el.parentElement;
  }
},true);

// ── INTERCEPT window.open for sign-in ──
var _wo=window.open;
window.open=function(u){
  if(u&&typeof u==='string'){
    if(u.indexOf('/sign-in')>-1||u.indexOf('momence.com/sign-in')>-1){window.showSabdaLogin();return window;}
    if(u.indexOf('momence.com/')>-1){window.location.href=u.replace(/https:\\/\\/momence\\.com/,'');return window;}
  }
  return _wo.apply(window,arguments);
};

// ── REWRITE FETCH/XHR to stay on proxy ──
var _fetch=window.fetch;
window.fetch=function(u,o){
  if(typeof u==='string'&&u.indexOf('momence.com/')>-1) u=u.replace('https://momence.com','');
  if(!o)o={};o.credentials='include';
  return _fetch.call(window,u,o);
};
var _xo=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){
  if(typeof u==='string'&&u.indexOf('momence.com/')>-1) u=u.replace('https://momence.com','');
  this.withCredentials=true;
  return _xo.apply(this,[m,u].concat(Array.prototype.slice.call(arguments,2)));
};
})();
<\/script>`;

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };
}

// ── CHECK IF EMAIL HAS EXISTING ACCOUNT ──
async function handleCheckEmail(request, origin) {
  try {
    const { email } = await request.json();
    if (!email) {
      return new Response(JSON.stringify({ exists: false }), {
        status: 200, headers: corsHeaders(origin),
      });
    }

    const res = await fetch(MOMENCE + '/_api/primary/checkout/customer/alert', {
      method: 'POST',
      headers: momenceHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email, hostId: 54278 }),
    });

    const data = await res.json().catch(() => ({}));

    return new Response(JSON.stringify({
      exists: !!data.memberId,
    }), { status: 200, headers: corsHeaders(origin) });

  } catch (e) {
    return new Response(JSON.stringify({ exists: false }), {
      status: 200, headers: corsHeaders(origin),
    });
  }
}

// ── SERVER-SIDE PROMO CODE VALIDATION ──
async function handlePromo(request, origin) {
  try {
    const { code, sessionId, membershipId, price, hostId } = await request.json();
    if (!code) {
      return new Response(JSON.stringify({ error: 'No code provided' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    const body = {
      accessCode: code,
      hostId: hostId || 54278,
      price: price || 0,
      numberOfTickets: 1,
    };
    if (sessionId) body.sessionId = Number(sessionId);
    if (membershipId) body.membershipId = Number(membershipId);

    const res = await fetch(MOMENCE + '/_api/primary/plugin/CheckAccessCode', {
      method: 'POST',
      headers: momenceHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (data.status === 'error') {
      return new Response(JSON.stringify({ error: 'Invalid promo code' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    if (data.status === 'success' && data.message) {
      const m = data.message;
      return new Response(JSON.stringify({
        valid: true,
        code: m.usedCode,
        discountCodeId: m.discountCodeId,
        type: m.type,
        appliedDiscount: m.appliedDiscount,
        newPrice: m.priceInCurrency,
        renewalsValid: m.numberOfRenewalsDiscountIsValidFor,
      }), { status: 200, headers: corsHeaders(origin) });
    }

    return new Response(JSON.stringify({ error: 'Invalid promo code' }), {
      status: 400, headers: corsHeaders(origin),
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error: ' + e.message }), {
      status: 500, headers: corsHeaders(origin),
    });
  }
}

// ── SERVER-SIDE MFA VERIFICATION ──
async function handleMfaVerify(request, origin) {
  try {
    const { mfaToken, code, sessionId } = await request.json();
    if (!mfaToken || !code) {
      return new Response(JSON.stringify({ error: 'Missing code or session' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    const partialCookies = atob(mfaToken);

    // Verify TOTP code
    const verifyRes = await fetch(MOMENCE + '/_api/primary/auth/mfa/totp/verify', {
      method: 'POST',
      headers: momenceHeaders({ 'Content-Type': 'application/json', 'Cookie': partialCookies }),
      body: JSON.stringify({ token: code }),
    });

    const verifyData = await verifyRes.json().catch(() => ({}));

    if (!verifyRes.ok || verifyData.error) {
      return new Response(JSON.stringify({ error: verifyData.error || verifyData.message || 'Invalid code. Please try again.' }), {
        status: 401, headers: corsHeaders(origin),
      });
    }

    // MFA succeeded — collect all cookies (partial + new from verify)
    const allCookies = [partialCookies];
    for (const [k, v] of verifyRes.headers) {
      if (k.toLowerCase() === 'set-cookie') allCookies.push(v.split(';')[0]);
    }
    const cookieStr = allCookies.join('; ');

    // Fetch profile
    const profileRes = await fetch(MOMENCE + '/_api/primary/auth/profile', {
      headers: momenceHeaders({ 'Cookie': cookieStr }),
    });
    const profile = profileRes.ok ? await profileRes.json().catch(() => ({})) : {};

    let memberId = null;
    if (profile.userRoles) {
      const mr = profile.userRoles.find(r => r.type === 'member');
      if (mr) memberId = mr.memberId || mr.id;
    }

    // Check compatible memberships
    let memberships = [];
    if (sessionId) {
      try {
        const memberEmail = profile.email || '';
        const mRes = await fetch(
          MOMENCE + '/_api/primary/plugin/memberships/session-compatible-memberships?sessionId=' + sessionId + '&email=' + encodeURIComponent(memberEmail) + '&tickets=1&isGuestOnlyBooking=false',
          { headers: momenceHeaders({ 'Cookie': cookieStr }) }
        );
        const mData = await mRes.json().catch(() => []);
        const rawList = Array.isArray(mData) ? mData : (mData.memberships || mData.message || []);
        memberships = rawList.filter(m => {
          // Real Momence API fields (verified via live API test Apr 2026):
          // classesLeft = credits for packs (null for subscriptions)
          // moneyLeft = money credits (null for class-based)
          // type = "package-events" for packs, "subscription" for monthly memberships
          // SABDA-MEMBERSHIPS-V2: also accept not-yet-activated subscriptions
          // (e.g. IMMERSE with "Activates on first usage" — booking will activate it).
          const hasClassCredits = m.classesLeft !== null && m.classesLeft !== undefined && m.classesLeft > 0;
          const hasMoneyCredits = m.moneyLeft !== null && m.moneyLeft !== undefined && m.moneyLeft > 0;
          const isActiveSubscription = m.type === 'subscription' && m.classesLeft === null;
          // Accept un-activated subscriptions: type=subscription AND (activatedAt is null/undefined OR activates-on-first-use flag)
          const isPendingActivation = m.type === 'subscription' && (m.activatedAt === null || m.activatedAt === undefined || m.activatesOnFirstUsage === true);
          return hasClassCredits || hasMoneyCredits || isActiveSubscription || isPendingActivation;
        });
        if (memberships.length === 0 && rawList.length > 0) {
          memberships = rawList.map(m => ({ ...m, _unverified: true }));
        }
      } catch (e) {}
    }

    const sessionToken = btoa(cookieStr);

    let sessionPrice = 0;
    if (sessionId) {
      try {
        const sRes = await fetch(MOMENCE + '/_api/readonly/plugin/sessions/' + sessionId + '?hostId=54278', { headers: momenceHeaders() });
        const sData = await sRes.json();
        if (sData.message) sessionPrice = sData.message.fixedTicketPrice || 0;
      } catch(e) {}
    }

    return new Response(JSON.stringify({
      user: {
        id: profile.id,
        email: profile.email,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        memberId,
      },
      memberships,
      hasUsableMembership: memberships.length > 0 && !memberships[0]._unverified,
      sessionPrice,
      sessionToken,
    }), { status: 200, headers: corsHeaders(origin) });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error: ' + e.message }), {
      status: 500, headers: corsHeaders(origin),
    });
  }
}

// ── SERVER-SIDE LOGIN: login + fetch profile + check memberships ──
// ── SABDA-MEMBERSHIPS-V3: re-check memberships for already-logged-in user ──
// Used when modal re-opens for a different session after a prior booking.
// curUser + curSessionToken still valid, but memberships may have changed
// (one credit consumed by the prior booking). Re-query with the saved cookie.
async function handleCheckMemberships(request, origin) {
  try {
    const { email, sessionId, sessionToken } = await request.json();
    if (!email || !sessionId || !sessionToken) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    const cookieStr = atob(sessionToken);

    const mRes = await fetch(
      MOMENCE + '/_api/primary/plugin/memberships/session-compatible-memberships?sessionId=' + sessionId + '&email=' + encodeURIComponent(email) + '&tickets=1&isGuestOnlyBooking=false',
      { headers: momenceHeaders({ 'Cookie': cookieStr }) }
    );

    if (mRes.status === 401 || mRes.status === 403) {
      // Session expired — caller should fall back to fresh login
      return new Response(JSON.stringify({ error: 'Session expired', code: 'session_expired' }), {
        status: 401, headers: corsHeaders(origin),
      });
    }

    const mData = await mRes.json().catch(() => []);
    const rawList = Array.isArray(mData) ? mData : (mData.memberships || mData.message || []);
    const memberships = rawList.filter(m => {
      const hasClassCredits = m.classesLeft !== null && m.classesLeft !== undefined && m.classesLeft > 0;
      const hasMoneyCredits = m.moneyLeft !== null && m.moneyLeft !== undefined && m.moneyLeft > 0;
      const isActiveSubscription = m.type === 'subscription' && m.classesLeft === null;
      const isPendingActivation = m.type === 'subscription' && (m.activatedAt === null || m.activatedAt === undefined || m.activatesOnFirstUsage === true);
      return hasClassCredits || hasMoneyCredits || isActiveSubscription || isPendingActivation;
    });

    // Also fetch session price for the new session
    let sessionPrice = 0;
    try {
      const sRes = await fetch(MOMENCE + '/_api/readonly/plugin/sessions/' + sessionId + '?hostId=54278', { headers: momenceHeaders() });
      const sData = await sRes.json();
      if (sData.message) sessionPrice = sData.message.fixedTicketPrice || 0;
    } catch (e) {}

    return new Response(JSON.stringify({
      memberships,
      hasUsableMembership: memberships.length > 0,
      sessionPrice,
    }), { status: 200, headers: corsHeaders(origin) });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error: ' + e.message }), {
      status: 500, headers: corsHeaders(origin),
    });
  }
}

async function handleLogin(request, origin) {
  try {
    const { email, password, sessionId } = await request.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    // Step 1: Login to Momence
    const loginRes = await fetch(MOMENCE + '/_api/primary/auth/login', {
      method: 'POST',
      headers: momenceHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email, password }),
    });

    const loginData = await loginRes.json().catch(() => ({}));

    if (!loginRes.ok) {
      return new Response(JSON.stringify({ error: loginData.message || 'Invalid credentials' }), {
        status: 401, headers: corsHeaders(origin),
      });
    }

    // Handle MFA-enabled accounts
    if (loginData.verificationRequired) {
      // Collect cookies from partial login — needed for MFA verification
      const mfaCookies = [];
      for (const [k, v] of loginRes.headers) {
        if (k.toLowerCase() === 'set-cookie') mfaCookies.push(v.split(';')[0]);
      }
      return new Response(JSON.stringify({
        mfaRequired: true,
        mfaToken: btoa(mfaCookies.join('; ')),
      }), { status: 200, headers: corsHeaders(origin) });
    }

    // Collect cookies from login response
    const cookies = [];
    for (const [k, v] of loginRes.headers) {
      if (k.toLowerCase() === 'set-cookie') cookies.push(v.split(';')[0]);
    }
    const cookieStr = cookies.join('; ');

    // Step 2: Fetch profile
    const profileRes = await fetch(MOMENCE + '/_api/primary/auth/profile', {
      headers: momenceHeaders({ 'Cookie': cookieStr }),
    });
    const profile = profileRes.ok ? await profileRes.json().catch(() => ({})) : {};
    // DIAGNOSTIC (temporary): log what fields Momence's profile actually returns
    // so we can see if firstName/lastName are present, and what other fields might
    // contain the customer's real name. Will remove after investigation.
    console.log('[LOGIN-DIAG] profile keys:', Object.keys(profile).join(','),
      'firstName:', profile.firstName ? 'present' : 'EMPTY',
      'lastName:', profile.lastName ? 'present' : 'EMPTY',
      'name:', profile.name ? 'present' : 'EMPTY',
      'fullName:', profile.fullName ? 'present' : 'EMPTY');

    // Extract memberId from profile
    let memberId = null;
    if (profile.userRoles) {
      const mr = profile.userRoles.find(r => r.type === 'member');
      if (mr) memberId = mr.memberId || mr.id;
    }

    // Step 3: Check compatible memberships (if sessionId provided)
    let memberships = [];
    if (sessionId) {
      try {
        const memberEmail = profile.email || email;
        const mRes = await fetch(
          MOMENCE + '/_api/primary/plugin/memberships/session-compatible-memberships?sessionId=' + sessionId + '&email=' + encodeURIComponent(memberEmail) + '&tickets=1&isGuestOnlyBooking=false',
          { headers: momenceHeaders({ 'Cookie': cookieStr }) }
        );
        const mData = await mRes.json().catch(() => []);
        const rawList = Array.isArray(mData) ? mData : (mData.memberships || mData.message || []);
        
        // Real Momence API fields (verified Apr 2026):
        // classesLeft = credits for packs (null for subscriptions)
        // moneyLeft = money credits (null for class-based)
        // type = "package-events" for packs, "subscription" for monthly memberships
        memberships = rawList.filter(m => {
          const hasClassCredits = m.classesLeft !== null && m.classesLeft !== undefined && m.classesLeft > 0;
          const hasMoneyCredits = m.moneyLeft !== null && m.moneyLeft !== undefined && m.moneyLeft > 0;
          const isActiveSubscription = m.type === 'subscription' && m.classesLeft === null;
          return hasClassCredits || hasMoneyCredits || isActiveSubscription;
        });

        if (memberships.length === 0 && rawList.length > 0) {
          memberships = rawList.map(m => ({ ...m, _unverified: true }));
        }
      } catch (e) {}
    }

    // Encode session for client to pass back on booking
    const sessionToken = btoa(cookieStr);

    // Get session price for display
    let sessionPrice = 0;
    if (sessionId) {
      try {
        const sRes = await fetch(MOMENCE + '/_api/readonly/plugin/sessions/' + sessionId + '?hostId=54278', { headers: momenceHeaders() });
        const sData = await sRes.json();
        if (sData.message) sessionPrice = sData.message.fixedTicketPrice || 0;
      } catch(e) {}
    }

    return new Response(JSON.stringify({
      user: {
        id: profile.id,
        email: profile.email || email,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        memberId,
      },
      memberships,
      hasUsableMembership: memberships.length > 0 && !memberships[0]._unverified,
      sessionPrice,
      sessionToken,
    }), { status: 200, headers: corsHeaders(origin) });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error: ' + e.message }), {
      status: 500, headers: corsHeaders(origin),
    });
  }
}

// ── SERVER-SIDE BOOKING: book with membership using session token ──
async function handleBook(request, origin) {
  try {
    const { sessionId, sessionToken, memberId, memberMembershipId, firstName, lastName, email, phoneNumber, customerFields } = await request.json();

    if (!sessionId || !sessionToken) {
      return new Response(JSON.stringify({ error: 'Missing sessionId or sessionToken' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    const cookieStr = atob(sessionToken);

    // Fetch session details to get the correct price and loadDate
    let sessionPrice = 0;
    let loadDate = new Date().toISOString();
    try {
      const sessRes = await fetch(
        MOMENCE + '/_api/readonly/plugin/sessions/' + sessionId + '?hostId=54278',
        { headers: momenceHeaders() }
      );
      const sessData = await sessRes.json();
      if (sessData.message) {
        sessionPrice = sessData.message.fixedTicketPrice || sessData.message.price || 0;
        if (sessData.message.loadDate) loadDate = sessData.message.loadDate;
      }
    } catch (e) {}

    const body = {
      tickets: [{ firstName, lastName, email, isAdditionalTicket: false }],
      totalPriceInCurrency: sessionPrice,
      loadDate,
    };
    if (memberId) body.memberId = memberId;
    // Verified via live API test: memberMembershipId goes in boughtMembershipIds array
    // Sending it as top-level memberMembershipId causes "Expected type never" error
    body.boughtMembershipIds = memberMembershipId ? [Number(memberMembershipId)] : [];
    if (phoneNumber) body.phoneNumber = phoneNumber;
    if (customerFields) body.customerFields = customerFields;

    const bookRes = await fetch(
      MOMENCE + '/_api/primary/plugin/sessions/' + sessionId + '/membership-pay',
      {
        method: 'POST',
        headers: momenceHeaders({ 'Content-Type': 'application/json', 'Cookie': cookieStr }),
        body: JSON.stringify(body),
      }
    );

    const bookData = await bookRes.json().catch(() => ({}));

    if (bookRes.ok) {
      return new Response(JSON.stringify({ success: true, data: bookData }), {
        status: 200, headers: corsHeaders(origin),
      });
    } else {
      return new Response(JSON.stringify({ error: bookData.message || bookData.error || 'Booking failed', data: bookData }), {
        status: bookRes.status, headers: corsHeaders(origin),
      });
    }

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error: ' + e.message }), {
      status: 500, headers: corsHeaders(origin),
    });
  }
}


// ── META CAPI HELPERS ──
async function sha256hex(str) {
  if (!str) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(str.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Normalize a phone string to E.164 for CAPI hashing.
// Strips spaces, dashes, parentheses, leading zeros after country code.
// If no country code present, defaults to +34 (Spain — primary SABDA market).
// Returns empty string if input doesn't look like a phone.
function normalizePhoneE164(raw) {
  if (!raw) return '';
  let p = String(raw).replace(/[\s\-()._]/g, '');
  if (!p) return '';
  // Already has + → trust it (but strip non-digits after +)
  if (p.startsWith('+')) {
    p = '+' + p.slice(1).replace(/\D/g, '');
  } else if (p.startsWith('00')) {
    // 00xx... → +xx...
    p = '+' + p.slice(2).replace(/\D/g, '');
  } else {
    // No country code: assume Spain (+34). Strip leading zeros.
    const digits = p.replace(/\D/g, '').replace(/^0+/, '');
    if (!digits) return '';
    // If digits already start with 34 and length looks like Spain mobile (11), trust
    if (digits.startsWith('34') && digits.length >= 11) {
      p = '+' + digits;
    } else {
      p = '+34' + digits;
    }
  }
  // Sanity: must be at least +CCN (5 chars) and at most 16
  if (p.length < 5 || p.length > 16) return '';
  return p;
}

async function sendCAPIEvent(eventName, eventId, email, firstName, lastName, value, currency, eventSourceUrl, clientIp, clientUserAgent, fbp, fbc, env, phone, externalId, testEventCode, city, country, attribution, contentMeta) {
  const CAPI_TOKEN = (env && env.CAPI_ACCESS_TOKEN) || '';
  if (!CAPI_TOKEN) {
    console.log('[CAPI] Skipping — CAPI_ACCESS_TOKEN not set');
    return;
  }
  const PIXEL_ID = '567636669734630';
  try {
    // Normalize phone to E.164 BEFORE hashing
    const phoneE164 = normalizePhoneE164(phone);
    // External ID: hash if it looks like a stable identifier; pass empty otherwise
    const extIdStr = externalId ? String(externalId).trim() : '';
    // Normalize city and country per Meta spec before hashing:
    // - ct: lowercase, no spaces, no punctuation
    // - country: 2-letter ISO lowercase
    const ctNorm = city ? String(city).trim().toLowerCase().replace(/[^a-z]/g, '') : '';
    const countryNorm = country ? String(country).trim().toLowerCase().slice(0, 2) : '';
    const [emHash, fnHash, lnHash, phHash, extIdHash, ctHash, countryHash] = await Promise.all([
      sha256hex(email),
      sha256hex(firstName),
      sha256hex(lastName),
      // Phone: hash WITHOUT the leading +, per Meta CAPI spec
      phoneE164 ? sha256hex(phoneE164.replace(/^\+/, '')) : Promise.resolve(''),
      extIdStr ? sha256hex(extIdStr) : Promise.resolve(''),
      ctNorm ? sha256hex(ctNorm) : Promise.resolve(''),
      countryNorm ? sha256hex(countryNorm) : Promise.resolve(''),
    ]);

    // Build user_data with conditional inclusion — Meta penalizes empty values
    // (e.g., em:[""] or em:[]). Only include keys with actual data.
    const user_data = {};
    if (emHash)  user_data.em  = [emHash];
    if (phHash)  user_data.ph  = [phHash];
    if (fnHash)  user_data.fn  = [fnHash];
    if (lnHash)  user_data.ln  = [lnHash];
    if (ctHash)  user_data.ct  = [ctHash];
    if (countryHash) user_data.country = [countryHash];
    if (extIdHash) user_data.external_id = [extIdHash];
    if (clientIp) user_data.client_ip_address = clientIp;
    if (clientUserAgent) user_data.client_user_agent = clientUserAgent;
    if (fbp) user_data.fbp = fbp;

    // fbc handling:
    //  Primary:  browser-sent _fbc cookie value (passed verbatim, never modified)
    //  Fallback: construct from attribution.fbclid if cookie is missing
    //
    // WHY THE FALLBACK EXISTS:
    // Safari ITP deletes the _fbc cookie after 24 hours when the URL contained
    // tracking parameters. For returning users who bought >24h after clicking
    // an ad, _fbc is gone → we'd send no fbc → Meta loses click attribution.
    //
    // Our attribution system captures fbclid at landing and stores it in
    // localStorage for 30 days, surviving Safari's cookie purge. When _fbc is
    // empty but attribution has a real fbclid, we build spec-compliant fbc:
    //   fb.1.{timestamp_ms}.{fbclid}
    //
    // This is explicitly allowed by Meta's CAPI spec (see Everflow, dataally.ai
    // 2026 guides). We only FILL the gap — never overwrite an existing cookie
    // value, so Meta's "modified fbclid" diagnostic cannot be triggered.
    //
    // fbc_source tag in [CAPI-EMQ] log lets us measure cookie-vs-fallback split
    // and quantify recovered Safari-ITP attribution over time.
    let fbcFinal = fbc || '';
    let fbcSource = fbc ? 'cookie' : 'none';
    if (!fbcFinal && attribution && typeof attribution === 'object' && attribution.fbclid) {
      // Use attribution capture timestamp (stored at landing), not current time.
      // This matches the actual click moment more accurately for Meta's model.
      const ts = Number(attribution.ts) || Date.now();
      const cleanFbclid = String(attribution.fbclid).trim();
      // Sanity: fbclid must be non-empty, reasonable length (real fbclids are
      // 40-200+ chars), and not contain whitespace/semicolons
      if (cleanFbclid.length >= 10 && cleanFbclid.length <= 500 && !/[\s;,]/.test(cleanFbclid)) {
        fbcFinal = 'fb.1.' + ts + '.' + cleanFbclid;
        fbcSource = 'constructed';
      }
    }
    if (fbcFinal) user_data.fbc = fbcFinal;

    // Diagnostic: count which fields we're sending (for matching-quality debug)
    const fieldsSent = Object.keys(user_data).join(',');
    // EMQ attribution analytics: track how many purchases carry each optional
    // high-signal field. fbc presence ≈ user arrived from a Meta ad click.
    // city presence = user went through checkout (vs API-only fires).
    // Use this log (grep '[CAPI-EMQ]') to measure ad-driven vs organic split
    // and city-coverage over time via Cloudflare Workers Logs.
    if (eventName === 'Purchase') {
      console.log('[CAPI-EMQ] fbc_present:', !!fbcFinal, 'fbc_source:', fbcSource, 'ct_present:', !!ctHash, 'country_present:', !!countryHash, 'extid_present:', !!extIdHash);
    }

    const eventData = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId || (eventName + '_' + Date.now()),
      event_source_url: eventSourceUrl || 'https://sabdastudio.com/classes/',
      action_source: 'website',
      user_data: user_data,
      custom_data: {
        currency: currency || 'EUR',
        value: Number(value) || 0,
      },
    };
    // Content metadata for ViewContent / AddToCart / InitiateCheckout events.
    // Meta uses content_ids + content_type for catalog-based optimization
    // (e.g., Advantage+ Shopping). content_name improves human-readability in
    // Test Events. All three are optional and only emitted when provided.
    if (contentMeta && typeof contentMeta === 'object') {
      if (contentMeta.contentName) eventData.custom_data.content_name = String(contentMeta.contentName).slice(0, 200);
      if (Array.isArray(contentMeta.contentIds) && contentMeta.contentIds.length > 0) {
        eventData.custom_data.content_ids = contentMeta.contentIds.map((x) => String(x).slice(0, 100));
      }
      if (contentMeta.contentType) eventData.custom_data.content_type = String(contentMeta.contentType).slice(0, 50);
    }
    // Append attribution UTMs/click IDs to custom_data. Meta surfaces these
    // in Events Manager → Test Events / Event Details, letting you compare
    // ground-truth campaign attribution against Meta's own attribution model.
    // Custom_data accepts arbitrary key-value fields; values must be strings,
    // numbers, or booleans (no nested objects). We slice values to 200 chars
    // per Meta's recommendation.
    if (attribution && typeof attribution === 'object') {
      ['utm_source','utm_medium','utm_campaign','utm_content','utm_term',
       'fbclid','gclid','ttclid','msclkid','li_fat_id'].forEach((k) => {
        if (attribution[k]) eventData.custom_data[k] = String(attribution[k]).slice(0, 200);
      });
      if (attribution.landing_path) eventData.custom_data.landing_path = String(attribution.landing_path).slice(0, 200);
    }
    const capiRes = await fetch(
      `https://graph.facebook.com/v21.0/${PIXEL_ID}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          testEventCode
            ? { data: [eventData], access_token: CAPI_TOKEN, test_event_code: testEventCode }
            : { data: [eventData], access_token: CAPI_TOKEN }
        ),
      }
    );
    const capiData = await capiRes.json().catch(() => ({}));
    console.log('[CAPI]', eventName, 'status:', capiRes.status, 'events_received:', capiData.events_received, 'fields_sent:', fieldsSent);
    // Diagnostic: log full response body when test_event_code is present (for debugging Test Events tab routing)
    if (testEventCode) {
      console.log('[CAPI-DEBUG] test_event_code=' + testEventCode + ' full_response=' + JSON.stringify(capiData));
    }
  } catch (e) {
    console.log('[CAPI] Error:', e.message);
  }
}

// ── SERVER-SIDE PAYMENT: pay via Momence /checkout/cart endpoints ──
// Two-step flow:
//   1. POST /checkout/cart/recalculate to get signature + numeric stripeConnectedAccountId
//   2. POST /checkout/cart/pay with signature, items, ticket info, payment method
// ── SERVER-SIDE PAYMENT: pay via correct Momence /plugin endpoints ──
// Two code paths:
//   1. productId set    → /plugin/memberships/{id}/pay  (membership/pack purchase)
//   2. sessionId only   → /plugin/sessions/{id}/pay     (paid class booking)
// Both use paymentMethod:{id:stripePaymentMethodId} format, NOT stripePaymentMethodId at top level.
// stripeConnectedAccountId is NUMERIC (38966), discovered from /load-stripe-connected-account.
// ── 3DS CAPI bridge: frontend calls this AFTER stripeInstance.confirmCardPayment
//   succeeds for 3D Secure purchases. The server-side /sabda-api/pay branch
//   that returns clientSecret can't fire CAPI yet (purchase not confirmed).
//   This endpoint fires the same rich user_data block as the non-3DS path.
async function handleCapiEvent(request, origin, env, ctx, defaultEvent, requireEmail) {
  try {
    const {
      eventName, fbEventId, email, firstName, lastName, phoneNumber,
      value, currency, externalId, fbp, fbc, clientUserAgent, eventSourceUrl,
      test_event_code, city, country, attribution, contentName, contentIds, contentType,
    } = await request.json();

    // Determine the event — explicit eventName in payload wins, otherwise route default
    const effectiveEventName = eventName || defaultEvent;
    if (!effectiveEventName) {
      return new Response(JSON.stringify({ error: 'Missing eventName' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    // Only require email for Purchase (bottom-of-funnel, always has it).
    // Lead / InitiateCheckout / AddToCart / ViewContent may have empty email
    // for anonymous top-of-funnel users — send the event anyway with IP/UA/
    // fbc/fbp match signals, which still produce usable EMQ.
    if (requireEmail && !email) {
      return new Response(JSON.stringify({ error: 'Missing email' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    const externalIdForCAPI = externalId || email || '';
    const cityForCAPI = city || '';
    const countryForCAPI = country || 'es';

    // Attribution log — same format regardless of event type for observability
    if (attribution && typeof attribution === 'object') {
      const attrFields = ['email=' + (email || '-'), 'event=' + effectiveEventName];
      ['utm_source','utm_medium','utm_campaign','utm_content','utm_term',
       'fbclid','gclid','ttclid','msclkid','li_fat_id'].forEach((k) => {
        if (attribution[k]) attrFields.push(k + '=' + String(attribution[k]).slice(0,100));
      });
      if (attribution.landing_path) attrFields.push('landing=' + String(attribution.landing_path).slice(0,80));
      console.log('[ATTR] ' + attrFields.join(' '));
    }

    const capiPromise = sendCAPIEvent(
      effectiveEventName,
      fbEventId,
      email || '',
      firstName || '',
      lastName || '',
      Number(value) || 0,
      currency || 'EUR',
      eventSourceUrl || 'https://sabdastudio.com/classes/',
      request.headers.get('CF-Connecting-IP') || '',
      clientUserAgent || request.headers.get('User-Agent') || '',
      fbp || '',
      fbc || '',
      env,
      phoneNumber || '',
      externalIdForCAPI,
      test_event_code || '',
      cityForCAPI,
      countryForCAPI,
      attribution,
      { contentName, contentIds, contentType }
    );
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(capiPromise);
    } else {
      await capiPromise;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: corsHeaders(origin),
    });
  } catch (e) {
    console.log('[CAPI-EVENT] EXCEPTION:', e.message);
    return new Response(JSON.stringify({ error: 'Server error: ' + e.message }), {
      status: 500, headers: corsHeaders(origin),
    });
  }
}

async function handlePay(request, origin, env, ctx) {
  try {
    const { sessionId, sessionToken, stripePaymentMethodId, firstName, lastName, email, password, phoneNumber, customerFields, type, productId, discountCode, discountCodeId, actualPrice, fbEventId, fbIcEventId, fbp, fbc, clientIp, clientUserAgent, autoEnroll, attribution } = await request.json();

    if (!firstName || !lastName || !email) {
      return new Response(JSON.stringify({ error: 'Missing customer details' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    // ── Attribution log: structured single-line per /pay invocation ──
    // Forwarded by frontend from window._sabdaGetAttribution() — captured
    // at landing from URL params (utm_*/fbclid/gclid/etc) and persisted in
    // localStorage 30 days. Logged here so we can correlate purchases back
    // to specific ad creatives via Cloudflare Workers Logs query:
    //   $.message ~ "[ATTR]" AND $.message ~ "EMAIL_OF_INTEREST"
    // Even if Momence loses attribution downstream (it doesn't accept
    // arbitrary metadata), we keep ground truth here forever.
    if (attribution && typeof attribution === 'object') {
      const attrFields = [];
      attrFields.push('email=' + email);
      ['utm_source','utm_medium','utm_campaign','utm_content','utm_term',
       'fbclid','gclid','ttclid','msclkid','li_fat_id'].forEach((k) => {
        if (attribution[k]) attrFields.push(k + '=' + String(attribution[k]).slice(0,100));
      });
      if (attribution.landing_path) attrFields.push('landing=' + String(attribution.landing_path).slice(0,80));
      if (attribution.referrer) attrFields.push('ref=' + String(attribution.referrer).slice(0,80));
      console.log('[ATTR] ' + attrFields.join(' '));
    } else {
      // No attribution = direct/organic visit. Still log for completeness so
      // we can compute "% of purchases with attribution data" over time.
      console.log('[ATTR] email=' + email + ' direct=true');
    }

    // ── FIRE CAPI InitiateCheckout at request entry ──
    // Browser Pixel fires 'InitiateCheckout' right before POSTing to /sabda-api/pay.
    // Server-side mirror fires here with matching event_id (fbIcEventId) for dedup.
    // Rich user_data block — same fields as Purchase (em/ph/fn/ln/ct/country/external_id
    // + IP/UA/fbp/fbc) — lifts IC EMQ score ≈ 6.0 → 7.5 and unblocks Meta's
    // 'Improve CAPI coverage for InitiateCheckout' diagnostic warning. Fires even
    // if the payment ultimately fails, which is correct: IC = intent, not success.
    // Uses waitUntil so the fetch to graph.facebook.com survives beyond the pay response.
    if (fbIcEventId) {
      const icPrice = (actualPrice !== undefined && actualPrice !== null) ? actualPrice
        : (productId ? (PRODUCT_PRICES[Number(productId)] || 0) : 0);
      const icCity = (customerFields && customerFields['164361']) ? customerFields['164361'] : '';
      const icPromise = sendCAPIEvent(
        'InitiateCheckout', fbIcEventId, email, firstName, lastName,
        icPrice, 'EUR',
        'https://sabdastudio.com/classes/',
        clientIp || request.headers.get('CF-Connecting-IP') || '',
        clientUserAgent || request.headers.get('User-Agent') || '',
        fbp || '', fbc || '', env,
        phoneNumber || '', email || '', '',
        icCity, 'es', attribution
      ).catch((e) => console.log('[CAPI-IC] fire-and-forget error:', e && e.message));
      if (ctx && ctx.waitUntil) ctx.waitUntil(icPromise);
    }

    const isFree = stripePaymentMethodId === 'free' || actualPrice === 0;

    // SAFETY NET: Momence's /plugin/{memberships|sessions}/{id}/pay endpoint
    // does not accept priceInCurrency:0 — it routes through Stripe and rejects
    // with a generic error that increments the failed-retry counter and locks
    // out the customer/IP. Refuse server-side as a backstop in case the modal
    // gets bypassed.
    if (isFree && !discountCode && !discountCodeId) {
      console.log('[PAY] REFUSED — €0 booking with no discount code; would fail at Momence and trigger anti-fraud lockout');
      return new Response(JSON.stringify({
        error: 'Free bookings (€0) cannot be processed through this checkout. Please claim directly via Momence.',
      }), { status: 400, headers: corsHeaders(origin) });
    }
    if (isFree && (discountCode || discountCodeId)) {
      console.log('[PAY] €0 booking with discount code — routing to Momence with appliedPriceRuleIds');
    }

    if (!stripePaymentMethodId) {
      return new Response(JSON.stringify({ error: 'Missing payment method' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    // ── First-time-only products: block repeat purchases at server edge ──
    // Trial (443934) and Intro 3-Pack (443935) are new-customer-only offers.
    // Momence would reject with 'You have already bought a membership with SABDA'
    // AFTER the user fills out payment. Catch it earlier for better UX.
    const FIRST_TIME_ONLY_IDS = new Set([443934, 443935]);
    if (productId && FIRST_TIME_ONLY_IDS.has(Number(productId)) && email) {
      try {
        const alertRes = await fetch(MOMENCE + '/_api/primary/checkout/customer/alert', {
          method: 'POST',
          headers: momenceHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ email, hostId: 54278 }),
        });
        const alertData = await alertRes.json().catch(() => ({}));
        if (alertData && alertData.memberId) {
          console.log('[PAY] BLOCKED — first-time-only offer attempted by existing customer:', email);
          return new Response(JSON.stringify({
            error: 'This offer is for first-time students. Try a Drop-in, Pack, or membership instead.',
            code: 'first_time_only_ineligible',
          }), { status: 400, headers: corsHeaders(origin) });
        }
      } catch (e) {
        // If check fails, proceed — Momence will still reject, better than false-blocking
        console.warn('[PAY] customer/alert pre-check failed, proceeding:', e && e.message);
      }
    }

    const cookieStr = sessionToken ? atob(sessionToken) : '';
    const STRIPE_ACCOUNT_ID = 38966; // SABDA's numeric Momence-side account ID
    const HOME_LOCATION_ID = 49623;  // Studio location ID
    const HOST_ID = 54278;

    // Hardcoded prices (Cloudflare Workers can't reach Momence's authenticated /memberships endpoint)
    const PRODUCT_PRICES = {
      443934: 18, 443935: 50, 443641: 50, 445630: 22, 443937: 85, 443939: 149,
      706876: 99, 709976: 109, 431216: 130, 445600: 330,
      507726: 12, 507728: 30, 507729: 40,
    };

    let momenceUrl;
    let body;

    if (productId) {
      // ── PATH 1: MEMBERSHIP / PACKAGE PURCHASE ──
      const price = (actualPrice !== undefined && actualPrice !== null)
        ? actualPrice
        : (PRODUCT_PRICES[Number(productId)] || 0);

      momenceUrl = MOMENCE + '/_api/primary/plugin/memberships/' + Number(productId) + '/pay';
      body = {
        priceInCurrency: price,
        email: email,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: phoneNumber || undefined,
        password: password || undefined,
        isGift: false,
        isPaymentPlanUsed: false,
        applyDiscountToPaidTrial: true,
        stripeConnectedAccountId: STRIPE_ACCOUNT_ID,
        customerFields: customerFields || {},
        smsCommunicationsTransactionalConsent: false,
        smsCommunicationsMarketingConsent: false,
        isLoginRedirectDisabled: true,
        customQuestionAnswers: [],
        appliedPriceRuleIds: [], // discountCodeId from CheckAccessCode is NOT a priceRuleId; use string discountCode below
        homeLocationId: HOME_LOCATION_ID,
        hasRecurringChargesConsent: true,
        enableCardAutofill: false,
      };
      if (discountCode) body.discountCode = discountCode;
      if (stripePaymentMethodId && stripePaymentMethodId !== 'free') { body.paymentMethod = { id: stripePaymentMethodId }; }

    } else if (sessionId) {
      // ── PATH 2: PAID CLASS BOOKING ──
      // Need to fetch session details for loadDate
      let loadDate = new Date().toISOString();
      let sessionPrice = 0;
      try {
        const sessRes = await fetch(
          MOMENCE + '/_api/readonly/plugin/sessions/' + sessionId + '?hostId=' + HOST_ID,
          { headers: momenceHeaders(null, request) }
        );
        const sessData = await sessRes.json();
        if (sessData.message) {
          sessionPrice = sessData.message.fixedTicketPrice || 0;
          if (sessData.message.loadDate) loadDate = sessData.message.loadDate;
        }
      } catch (e) {}

      const price = (actualPrice !== undefined && actualPrice !== null) ? actualPrice : sessionPrice;

      momenceUrl = MOMENCE + '/_api/primary/plugin/sessions/' + sessionId + '/pay';
      body = {
        tickets: [{
          firstName: firstName,
          lastName: lastName,
          email: email,
          isAdditionalTicket: false,
        }],
        totalPriceInCurrency: price,
        loadDate: loadDate,
        stripeConnectedAccountId: STRIPE_ACCOUNT_ID,
        phoneNumber: phoneNumber || undefined,
        customerFields: customerFields || {},
        appliedPriceRuleIds: [], // discountCodeId from CheckAccessCode is NOT a priceRuleId; use string discountCode below
        isLoginRedirectDisabled: true,
        isGuestOnlyBooking: true,
      };
      if (discountCode) body.discountCode = discountCode;
      if (stripePaymentMethodId && stripePaymentMethodId !== 'free') { body.paymentMethod = { id: stripePaymentMethodId }; }

    } else {
      return new Response(JSON.stringify({ error: 'Missing productId or sessionId' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    // Strip undefined fields
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);

    // ── WARM-UP SEQUENCE ──
    // A real Momence checkout widget hits multiple endpoints during page
    // initialization to establish a "session of activity" before posting
    // payment. We mimic that pattern to look like a legitimate widget user.
    // Each warm-up call's Set-Cookie headers are accumulated and forwarded
    // with the actual /pay request.
    let warmupCookie = '';
    try {
      // 1. Load the connected Stripe account (this is what set 38966 originally)
      const u1 = MOMENCE + '/_api/readonly/plugin/load-stripe-connected-account?hostId=' + HOST_ID;
      console.log('[PAY] warm-up 1 →', u1);
      const r1 = await fetch(u1, { headers: momenceHeaders(null, request) });
      const c1 = captureCookies(r1);
      if (c1) warmupCookie = c1;
      console.log('[PAY] warm-up 1 status', r1.status, 'cookies:', c1 ? c1.split(';').length : 0);
    } catch (e) {
      console.log('[PAY] warm-up 1 failed (non-fatal):', e.message);
    }

    // 2. Load host info — another endpoint a real widget calls on init
    try {
      const u2 = MOMENCE + '/_api/readonly/plugin/host-info?hostId=' + HOST_ID;
      console.log('[PAY] warm-up 2 →', u2);
      const r2 = await fetch(u2, {
        headers: momenceHeaders(warmupCookie ? { 'Cookie': warmupCookie } : null, request),
      });
      const c2 = captureCookies(r2);
      if (c2) warmupCookie = warmupCookie ? warmupCookie + '; ' + c2 : c2;
      console.log('[PAY] warm-up 2 status', r2.status, 'cookies:', c2 ? c2.split(';').length : 0);
    } catch (e) {
      console.log('[PAY] warm-up 2 failed (non-fatal):', e.message);
    }

    // 3. For session bookings, also load the session details (already done above
    //    in the sessionId branch, but for membership purchases we should load
    //    the membership info too).
    if (productId) {
      try {
        const u3 = MOMENCE + '/_api/readonly/plugin/memberships/' + Number(productId) + '?hostId=' + HOST_ID;
        console.log('[PAY] warm-up 3 →', u3);
        const r3 = await fetch(u3, {
          headers: momenceHeaders(warmupCookie ? { 'Cookie': warmupCookie } : null, request),
        });
        const c3 = captureCookies(r3);
        if (c3) warmupCookie = warmupCookie ? warmupCookie + '; ' + c3 : c3;
        console.log('[PAY] warm-up 3 status', r3.status, 'cookies:', c3 ? c3.split(';').length : 0);
      } catch (e) {
        console.log('[PAY] warm-up 3 failed (non-fatal):', e.message);
      }
    }

    console.log('[PAY] total warmup cookies:', warmupCookie ? warmupCookie.split(';').length : 0);

    // Small delay to look more human (real users don't tap Pay 0ms after page load)
    await new Promise(resolve => setTimeout(resolve, 350));

    // Log outgoing request to Momence (visible in Cloudflare Workers Logs tab)
    console.log('[PAY] →', momenceUrl);
    console.log('[PAY] body:', JSON.stringify({
      ...body,
      paymentMethod: body.paymentMethod ? { id: body.paymentMethod.id } : undefined,
    }));

    // Combine warm-up cookies with any existing session cookies
    const combinedCookies = [warmupCookie, cookieStr].filter(Boolean).join('; ');

    const payRes = await fetch(momenceUrl, {
      method: 'POST',
      headers: momenceHeaders(
        { 'Content-Type': 'application/json', ...(combinedCookies ? { 'Cookie': combinedCookies } : {}) },
        request
      ),
      body: JSON.stringify(body),
    });

    // Capture Set-Cookie headers from pack-pay response for auto-enroll follow-up.
    // Momence's session-pay endpoint authenticates the booking via these cookies to
    // associate the seat with the just-created/charged customer.
    let payRespCookies = '';
    try {
      const sc = payRes.headers.get('set-cookie') || '';
      // Collect cookie name=value pairs; drop attributes like Path, Expires, Secure, HttpOnly
      payRespCookies = sc.split(/,(?=[^;]+=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
    } catch (e) {}
    const payData = await payRes.json().catch(() => ({}));

    // Log Momence response (status + first 1500 chars of body)
    console.log('[PAY] ← status', payRes.status, 'body:', JSON.stringify(payData).slice(0, 1500));

    if (payRes.ok) {
      // 3D Secure check — CAPI fires after 3DS confirmation (client-side)
      if (payData.payload && payData.payload.clientSecret) {
        return new Response(JSON.stringify({
          clientSecret: payData.payload.clientSecret,
          newMemberId: payData.payload.newMemberId,
        }), { status: 200, headers: corsHeaders(origin) });
      }
      // Auto-enroll: if the client requested auto-enrollment and we just bought a pack/membership,
      // fire a follow-up session-pay call to book the class using the newly-acquired credit.
      // Best-effort — failures don't block the purchase success.
      if (autoEnroll && sessionId && productId && !stripePaymentMethodId) {
        // skip — shouldn't happen, defensive
      } else if (autoEnroll && sessionId && productId) {
        try {
          const enrollUrl = MOMENCE + '/_api/primary/plugin/sessions/' + sessionId + '/pay';
          // Fetch session metadata for loadDate
          const sessFetch = await fetch(
            MOMENCE + '/_api/readonly/plugin/sessions/' + sessionId + '?hostId=' + HOST_ID,
            { headers: momenceHeaders(null, request) }
          ).then(r => r.json()).catch(() => ({}));
          const loadDate = (sessFetch.message && sessFetch.message.loadDate) || (sessFetch.loadDate) || new Date().toISOString();
          const enrollBody = {
            tickets: [{ firstName, lastName, email, isAdditionalTicket: false }],
            totalPriceInCurrency: 0,
            loadDate: loadDate,
            stripeConnectedAccountId: STRIPE_ACCOUNT_ID,
            phoneNumber: phoneNumber || undefined,
            customerFields: customerFields || {},
            appliedPriceRuleIds: [],
            isLoginRedirectDisabled: true,
          };
          Object.keys(enrollBody).forEach(k => enrollBody[k] === undefined && delete enrollBody[k]);
          // Build headers: inherit Momence standard headers, override Cookie with pack-pay session cookies
          // to authenticate the newly-created/charged member for this booking.
          const enrollHeaders = momenceHeaders({ 'Content-Type': 'application/json' }, request);
          if (payRespCookies) enrollHeaders['Cookie'] = payRespCookies;
          const enrollRes = await fetch(enrollUrl, {
            method: 'POST',
            headers: enrollHeaders,
            body: JSON.stringify(enrollBody),
          });
          const enrollData = await enrollRes.json().catch(() => ({}));
          if (!enrollRes.ok || enrollData.error) {
            console.warn('[PAY] auto-enroll failed (non-fatal). status=', enrollRes.status, 'err=', enrollData.error, 'cookies_forwarded=', !!payRespCookies);
          } else {
            console.log('[PAY] auto-enroll success for session', sessionId, '(cookies_forwarded=' + !!payRespCookies + ')');
          }
        } catch (e) {
          console.warn('[PAY] auto-enroll exception (non-fatal):', e && e.message);
        }
      }

      // Fire CAPI Purchase event (non-3DS success)
      const priceForCAPI = (actualPrice !== undefined && actualPrice !== null) ? actualPrice
        : (productId ? (PRODUCT_PRICES[Number(productId)] || 0) : 0);
      // External_id: use email as stable per-customer pseudonymous ID.
      // Momence's /pay response returns boughtMembershipId (the purchase
      // record, NEW every time) — NOT a customer ID, so useless for matching.
      // Email IS stable per customer and is Meta's recommended fallback when
      // a user_id isn't available. Hashed independently of `em` by Meta.
      const externalIdForCAPI = email || '';
      // City: pulled from checkout modal's customerFields.164361 ("CITY OF RESIDENCE"
      // field). Typed by customer, always 'Barcelona' in practice but use actual value.
      const cityForCAPI = (customerFields && customerFields['164361']) ? customerFields['164361'] : '';
      // Country: SABDA operates only in Spain, hardcode 'es' per Meta 2-char ISO spec.
      const countryForCAPI = 'es';
      // waitUntil keeps the Meta fetch alive past the client response. Without
      // this, the Worker isolate is killed the moment we return, and the fetch
      // to graph.facebook.com is aborted before Meta's response arrives —
      // no [CAPI] log line ever appears.
      const capiPromise = sendCAPIEvent(
        'Purchase', fbEventId, email, firstName, lastName,
        priceForCAPI, 'EUR',
        'https://sabdastudio.com/classes/',
        clientIp || request.headers.get('CF-Connecting-IP') || '',
        clientUserAgent || request.headers.get('User-Agent') || '',
        fbp, fbc, env,
        phoneNumber, externalIdForCAPI, '',
        cityForCAPI, countryForCAPI, attribution
      ).catch((e) => console.log('[CAPI] fire-and-forget error:', e && e.message));
      if (ctx && ctx.waitUntil) {
        ctx.waitUntil(capiPromise);
      }
      return new Response(JSON.stringify({ success: true, data: payData }), {
        status: 200, headers: corsHeaders(origin),
      });
    } else {
      // Translate known Momence validation errors into clean user-facing messages.
      // Momence uses a superstruct-style validator that returns raw debug strings
      // like: "At path: email -- Expected a value of type `email`, but received: ..."
      // These are unhelpful and confusing to end users — they leak internal type
      // names ('email', 'string') and surface the user's invalid input verbatim
      // (which can be embarrassing or alarming if the input was malformed).
      // Map them to short, actionable messages instead.
      const rawErr = payData.message || payData.error || 'Payment failed';
      const cleanErr = humanizeMomenceError(rawErr);
      return new Response(JSON.stringify({
        error: cleanErr,
        momenceStatus: payRes.status,
        momenceData: payData,
      }), { status: payRes.status, headers: corsHeaders(origin) });
    }

  } catch (e) {
    console.log('[PAY] EXCEPTION:', e.message, e.stack);
    return new Response(JSON.stringify({ error: 'Server error: ' + e.message }), {
      status: 500, headers: corsHeaders(origin),
    });
  }
}

// Translate Momence/superstruct/Stripe validation errors into clean user messages.
// Three categories caught:
//   1. Momence superstruct validators ("At path: email -- Expected ...")
//   2. Stripe errors that pass through Momence verbatim (No such PaymentMethod,
//      card_declined, insufficient_funds, etc.)
//   3. Common Momence business-logic errors (already a member, full class, etc.)
// Falls back to the raw message if nothing matches — no regression risk.
function humanizeMomenceError(raw) {
  if (!raw || typeof raw !== 'string') return raw;

  // Category 1: superstruct field validation errors
  const fieldMatch = raw.match(/At path:\s*(\w+)\s*--\s*Expected a value of type/i);
  if (fieldMatch) {
    const field = fieldMatch[1].toLowerCase();
    const map = {
      email: 'Invalid email address',
      phonenumber: 'Invalid phone number',
      phone: 'Invalid phone number',
      firstname: 'First name is invalid',
      lastname: 'Last name is invalid',
      password: 'Password is invalid',
    };
    return map[field] || ('Invalid ' + fieldMatch[1]);
  }

  // Category 2: Stripe errors passed through Momence
  const lower = raw.toLowerCase();
  // "No such PaymentMethod: 'pm_xxx'" — happens when card token expires before submit,
  // or when card is re-tried after a previous attempt's pm was already consumed.
  // This is a likely cause of repeated card declines on mobile (slow networks let
  // the pm expire before submit completes).
  if (lower.includes('no such paymentmethod') || lower.includes('no such payment_method')) {
    return 'Your card session expired. Please re-enter your card details and try again.';
  }
  if (lower.includes('card was declined') || lower.includes('card_declined')) {
    return 'Your card was declined by your bank. Please try a different card or contact your bank.';
  }
  if (lower.includes('insufficient_funds') || lower.includes('insufficient funds')) {
    return 'Your card has insufficient funds. Please try a different card.';
  }
  if (lower.includes('expired_card') || lower.includes('card has expired') || lower.includes('expired card')) {
    return 'Your card has expired. Please use a different card.';
  }
  if (lower.includes('incorrect_cvc') || (lower.includes('cvc') && lower.includes('incorrect'))) {
    return 'The security code (CVC) is incorrect. Please check the back of your card.';
  }
  if (lower.includes('processing_error') || (lower.includes('error processing') && lower.includes('card'))) {
    return 'There was a problem processing your card. Please wait a moment and try again.';
  }
  if (lower.includes('authentication_required') || lower.includes('3d secure') || lower.includes('3ds')) {
    return 'Your bank requires extra verification. Please complete 3D Secure and try again.';
  }

  // Category 3: Momence business-logic errors
  if (lower.includes('already bought') || lower.includes('already a member') || lower.includes('already purchased')) {
    return 'This first-timer offer is for new customers only. Please choose a different package.';
  }
  if (lower.includes('session is full') || lower.includes('no spots') || lower.includes('class is full')) {
    return 'This class is full. Please choose a different time or join the waitlist.';
  }

  return raw;
}

// ═══════════════════════════════════════════════════════════════════
// ATTRIBUTION STORAGE + PURCHASE WEBHOOK
// ═══════════════════════════════════════════════════════════════════
// Problem: Momence-native purchases fire Meta Pixel Purchase events
// without fbc/fbclid, dragging Purchase EMQ to ~4.6/10. Our custom
// booking flow sends fbc, but most sales route through Momence native.
//
// Solution: two-part system:
// 1. store-attribution: client POSTs {email, attribution} when user
//    types email in our booking form. Stored in KV keyed by SHA-256
//    of lowercase email. 30-day TTL. Captures attribution BEFORE the
//    user potentially abandons our form and buys through Momence.
// 2. webhook/purchase: Momence→Zapier→here on every purchase. Looks
//    up stored attribution by email hash. Fires CAPI Purchase with
//    full fbc/attribution so Meta can attribute to the ad click.
//
// Dedup: Momence fires browser-side Pixel Purchase. We fire CAPI
// Purchase. Meta deduplicates by (pixel_id + event_name + event_id).
// Since Momence's event_id differs from ours, Meta would double-count.
// Fix: disable Momence's native Meta Pixel integration once this
// CAPI path is confirmed working. Then all Purchase events come from
// our system with full match quality.
// ═══════════════════════════════════════════════════════════════════

async function handleStoreAttribution(request, origin, env) {
  try {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    const { email, attribution } = await request.json();
    if (!email || !attribution) {
      return new Response(JSON.stringify({ error: 'Missing email or attribution' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }
    const emailHash = await sha256hex(email.toLowerCase().trim());
    const key = 'attr:' + emailHash;
    const value = JSON.stringify({
      ...attribution,
      stored_at: Date.now(),
      email_hint: email.slice(0, 3) + '***',
    });

    if (env && env.ATTRIBUTION_KV) {
      // KV: 30-day TTL (2592000 seconds)
      await env.ATTRIBUTION_KV.put(key, value, { expirationTtl: 2592000 });
      console.log('[ATTR-STORE] ' + emailHash.slice(0, 12) + ' fbclid=' + (attribution.fbclid ? 'yes' : 'no') + ' utm_source=' + (attribution.utm_source || '-'));
    } else {
      console.log('[ATTR-STORE] SKIPPED — ATTRIBUTION_KV not bound. Create KV namespace and bind as ATTRIBUTION_KV.');
    }

    return new Response(JSON.stringify({ stored: true }), {
      status: 200, headers: corsHeaders(origin),
    });
  } catch (e) {
    console.log('[ATTR-STORE] ERROR:', e.message);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: corsHeaders(origin),
    });
  }
}

async function handleWebhookPurchase(request, origin, env, ctx) {
  try {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Accept from Zapier or any webhook source. Flexible field mapping.
    const body = await request.json();
    const email = body.email || body.customer_email || body.Email || '';
    const firstName = body.firstName || body.first_name || body.FirstName || '';
    const lastName = body.lastName || body.last_name || body.LastName || '';
    const phone = body.phone || body.phoneNumber || body.Phone || '';
    const amount = Number(body.amount || body.price || body.value || body.Amount || 0);
    const productName = body.productName || body.product_name || body.item || body.ProductName || 'Momence Purchase';
    const transactionId = body.transactionId || body.transaction_id || body.id || ('momence_' + Date.now());

    if (!email) {
      return new Response(JSON.stringify({ error: 'Missing email' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    // Look up stored attribution by email hash
    let attribution = null;
    let fbcFromAttribution = '';
    if (env && env.ATTRIBUTION_KV) {
      const emailHash = await sha256hex(email.toLowerCase().trim());
      const stored = await env.ATTRIBUTION_KV.get('attr:' + emailHash);
      if (stored) {
        try {
          attribution = JSON.parse(stored);
          // Construct fbc from stored fbclid (same logic as sendCAPIEvent fallback)
          if (attribution.fbclid) {
            const ts = attribution.ts || Date.now();
            fbcFromAttribution = 'fb.1.' + ts + '.' + String(attribution.fbclid).trim();
          }
          console.log('[WEBHOOK] attribution found: fbclid=' + (attribution.fbclid ? 'yes' : 'no') + ' utm_source=' + (attribution.utm_source || '-'));
        } catch (e) {
          console.log('[WEBHOOK] attribution parse error:', e.message);
        }
      } else {
        console.log('[WEBHOOK] no stored attribution for ' + emailHash.slice(0, 12));
      }
    } else {
      console.log('[WEBHOOK] ATTRIBUTION_KV not bound — firing CAPI without attribution');
    }

    // Fire CAPI Purchase with whatever we have
    const eventId = 'wh_' + Date.now() + '_' + uuid().slice(0, 8);
    const clientIp = request.headers.get('CF-Connecting-IP') || '';
    const clientUA = request.headers.get('User-Agent') || 'Zapier-Webhook/1.0';

    console.log('[WEBHOOK] Purchase email=' + email.slice(0, 3) + '*** amount=' + amount + ' product=' + productName + ' fbc=' + (fbcFromAttribution ? 'constructed' : 'none'));

    const capiPromise = sendCAPIEvent(
      'Purchase', eventId, email, firstName, lastName,
      amount, 'EUR',
      'https://sabdastudio.com/classes/',
      clientIp,
      clientUA,
      '', // fbp — not available from webhook
      fbcFromAttribution, // fbc — constructed from stored attribution
      env,
      phone,
      '', // externalId
      '', // testEventCode
      '', // city
      'es', // country
      attribution // full attribution object
    ).catch((e) => console.log('[WEBHOOK] CAPI error:', e && e.message));

    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(capiPromise);
    } else {
      await capiPromise;
    }

    return new Response(JSON.stringify({
      success: true,
      eventId,
      attribution_found: !!attribution,
      fbc_constructed: !!fbcFromAttribution,
    }), { status: 200, headers: corsHeaders(origin) });
  } catch (e) {
    console.log('[WEBHOOK] ERROR:', e.message);
    return new Response(JSON.stringify({ error: 'Server error: ' + e.message }), {
      status: 500, headers: corsHeaders(origin),
    });
  }
}


// ── CUSTOM SIGN-IN PAGE (served when /sign-in is hit on proxy) ──
function buildSignInPage(qs) {
  // Extract redirect param if present
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign In</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.card{background:#fff;border-radius:16px;padding:40px 36px;width:380px;max-width:92vw;box-shadow:0 8px 30px rgba(0,0,0,.08)}
.logo{text-align:center;margin-bottom:28px}
.logo svg{width:32px;height:32px}
h1{font-size:22px;font-weight:700;color:#1a1a2e;text-align:center;margin-bottom:6px}
.sub{font-size:14px;color:#666;text-align:center;margin-bottom:28px}
label{display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:5px}
input{width:100%;padding:11px 14px;border:1px solid #ddd;border-radius:8px;font-size:15px;margin-bottom:18px;outline:none;transition:border-color .2s}
input:focus{border-color:#6c63ff}
.err{color:#e53e3e;font-size:13px;min-height:20px;margin-bottom:10px;text-align:center}
button{width:100%;padding:13px;background:#6c63ff;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s}
button:hover{background:#5a52e0}
button:disabled{opacity:.6;cursor:default}
.back{text-align:center;margin-top:20px}
.back a{font-size:13px;color:#6c63ff;text-decoration:none}
</style></head><body>
<div class="card">
<h1>Welcome back</h1>
<p class="sub">Sign in to complete your booking</p>
<label for="em">Email</label>
<input id="em" type="email" placeholder="your@email.com" autofocus>
<label for="pw">Password</label>
<input id="pw" type="password" placeholder="Password">
<div class="err" id="err"></div>
<button id="btn" onclick="doLogin()">Log in</button>
<div class="back"><a href="#" onclick="goBack();return false">Back to checkout</a></div>
</div>
<script>
document.getElementById('pw').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});
function goBack(){
  var dest=sessionStorage.getItem('sabda_checkout');
  if(dest) window.location.replace(dest);
  else history.back();
}
function doLogin(){
  var email=document.getElementById('em').value.trim();
  var pass=document.getElementById('pw').value;
  var err=document.getElementById('err');
  var btn=document.getElementById('btn');
  if(!email||!pass){err.textContent='Please enter email and password';return;}
  err.textContent='';btn.textContent='Signing in...';btn.disabled=true;
  fetch('/_api/primary/auth/login',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    credentials:'include',
    body:JSON.stringify({email:email,password:pass})
  }).then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d}});})
  .then(function(r){
    if(r.ok){
      if(r.data.id)localStorage.setItem('userId',String(r.data.id));
      if(r.data.email)localStorage.setItem('userEmail',r.data.email);
      if(r.data.firstName)localStorage.setItem('userFirstName',r.data.firstName);
      var dest=sessionStorage.getItem('sabda_checkout');
      if(dest){window.location.replace(dest);}
      else{window.location.replace('/');}
    }else{
      err.textContent=r.data.message||r.data.error||'Invalid email or password';
      btn.textContent='Log in';btn.disabled=false;
    }
  }).catch(function(){
    err.textContent='Connection error. Please try again.';
    btn.textContent='Log in';btn.disabled=false;
  });
}
</script></body></html>`;
}

// ══════════════════════════════════════════════════════════
// CONTACT FORM HANDLER — AI classification + email + Notion
// ══════════════════════════════════════════════════════════

// API keys stored as Cloudflare Worker secrets (set via dashboard or wrangler):
// ANTHROPIC_API_KEY — Claude Haiku for classification
// RESEND_API_KEY — email delivery
// NOTION_TOKEN — Notion API integration token
// NOTION_DATABASE_ID — Deals database ID

async function handleContact(request, origin, env) {
  try {
    const body = await request.json();
    const { name, email, phone, topic, message } = body;

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Name, email, and message are required' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    env = env || {};

    // Step 1: Classify with Claude Haiku
    let classification = { category: topic || 'general', action: 'send_to_katrina', confidence: 'low', summary: message.substring(0, 200), send_brochure: false };
    let classifyError = null;

    try {
      if (env.Claude) {
        var aiResult = await classifyWithClaude(env.Claude, { name, email, phone, topic, message });
        if (aiResult && aiResult.category) {
          classification = aiResult;
        } else {
          classifyError = 'no_category_in_response: ' + JSON.stringify(aiResult).substring(0, 200);
        }
      } else { classifyError = 'no_claude_key'; }
    } catch (e) {
      classifyError = e.message;
    }

    // Step 2: Send email to Katrina via Resend
    let emailSent = false;
    let emailError = null;
    try {
      if (env.Resend) {
        emailSent = await sendEmailViaResend(env.Resend, { name, email, phone, topic, message, classification });
      } else { emailError = 'no_resend_key'; }
    } catch (e) {
      emailError = e.message;
    }

    // Step 3: Log to Notion
    let notionLogged = false;
    let notionError = null;
    try {
      // Notion log only for sales-relevant topics (Marvyn's spec 2026-04-12)
      const NOTION_TOPICS = ['events','corporate','partnership','rental'];
      const shouldLogToNotion = NOTION_TOPICS.includes(topic);
      if (env.Notion && env.NOTION_DATABASE_ID && shouldLogToNotion) {
        notionLogged = await logToNotion(env.Notion, env.NOTION_DATABASE_ID, { name, email, phone, topic, message, classification });
      } else if (!shouldLogToNotion) { notionError = 'skipped:topic_not_sales_relevant'; } else { notionError = 'missing_key:Notion=' + !!env.Notion + ',DB=' + !!env.NOTION_DATABASE_ID; }
    } catch (e) {
      notionError = e.message;
    }

    return new Response(JSON.stringify({
      ok: true,
      emailSent,
      emailError,
      notionLogged,
      notionError,
      classifyError,
      category: classification.category,
      summary: classification.summary || null,
      send_brochure: classification.send_brochure || false,
    }), {
      status: 200, headers: corsHeaders(origin),
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error', detail: e.message }), {
      status: 500, headers: corsHeaders(origin),
    });
  }
}

async function classifyWithClaude(apiKey, data) {
  const prompt = `You are SABDA's intake system. SABDA is an immersive wellness studio in Barcelona offering classes (yoga, pilates, sound healing, breathwork), venue rental, corporate events, and exhibitions.

Read this form submission and classify it. Return ONLY valid JSON, no other text.

Form data:
- Name: ${data.name}
- Email: ${data.email}
- Phone: ${data.phone || 'not provided'}
- Topic selected: ${data.topic || 'not selected'}
- Message: ${data.message}

Classify into exactly one category:
- "rental_high_value" — company/brand wanting to rent the space for an activation, launch, production, dinner, or large event (20+ people). These get the venue brochure.
- "rental_low_value" — individual wanting to rent the space for their own class/workshop/small gathering. No brochure.
- "corporate_wellness" — company wanting to book wellness classes/team building for their employees.
- "class_inquiry" — someone asking about booking classes, pricing, schedule, memberships.
- "press_media" — journalist, blogger, or media outlet wanting to feature SABDA.
- "partnership" — brand or business proposing a collaboration or sponsorship.
- "general" — anything else.

Return JSON: {"category":"...","summary":"one sentence summary of what they want","confidence":"high|medium|low","send_brochure":true|false}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const result = await res.json();
  if (result.error) throw new Error('Claude API: ' + (result.error.message || JSON.stringify(result.error)).substring(0, 200));
  const text = result.content && result.content[0] && result.content[0].text || '{}';
  // Strip markdown fences if present
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}


// ── Topic-based recipient routing ──
// Routes contact form submissions to the right inbox based on user-selected topic.
// Maps the form's topic values (classes/events/corporate/press/partnership/general)
// to the appropriate email aliases on sabdastudio.com. 'connect@' is silently CC'd
// on all routes EXCEPT where it's already primary, so nothing falls through the
// cracks if a primary recipient is OOO.
function resolveRecipients(topic) {
  const routing = {
    'classes':     ['manager@sabdastudio.com'],
    'events':      ['connect@sabdastudio.com'],
    'corporate':   ['connect@sabdastudio.com'],
    'partnership': ['connect@sabdastudio.com'],
    'press':       ['marketing@sabdastudio.com', 'marvyn@sabdastudio.com', 'juliet@sabdastudio.com'],
    'general':     ['manager@sabdastudio.com', 'info@sabdastudio.com'],
  };
  const recipients = routing[topic] || routing['general'];
  // Silent-CC connect@ on all non-connect routes (except press) so Katrina has sight
  // of everything that's sales-relevant. Press is handled by co-founders + marketing,
  // and doesn't need sales-ops visibility.
  if (topic !== 'press' && !recipients.includes('connect@sabdastudio.com')) {
    recipients.push('connect@sabdastudio.com');
  }
  return recipients;
}

async function sendEmailViaResend(apiKey, data) {
  const { name, email, phone, topic, message, classification } = data;

  const topicLabels = {
    classes: 'Classes & Booking', events: 'Events & Venue Rental',
    corporate: 'Corporate & Team Building', press: 'Press & Media',
    partnership: 'Partnership', general: 'General Inquiry',
  };

  const categoryLabels = {
    rental_high_value: 'Rental (High Value)', rental_low_value: 'Rental (Individual)',
    corporate_wellness: 'Corporate Wellness', class_inquiry: 'Class Inquiry',
    press_media: 'Press & Media', partnership: 'Partnership', general: 'General',
  };

  const emailBody = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
<h2 style="color:#203999;margin-bottom:4px">New Lead from sabdastudio.com</h2>
<p style="color:#888;font-size:13px;margin-top:0">AI Classification: <strong style="color:#02F3C5">${categoryLabels[classification.category] || classification.category}</strong> (${classification.confidence || 'n/a'} confidence)</p>
<hr style="border:none;border-top:1px solid #eee;margin:16px 0">
<table style="width:100%;font-size:14px;line-height:1.6">
<tr><td style="color:#888;width:120px;vertical-align:top;padding:4px 0">Name</td><td style="padding:4px 0"><strong>${name}</strong></td></tr>
<tr><td style="color:#888;vertical-align:top;padding:4px 0">Email</td><td style="padding:4px 0"><a href="mailto:${email}">${email}</a></td></tr>
${phone ? `<tr><td style="color:#888;vertical-align:top;padding:4px 0">Phone</td><td style="padding:4px 0">${phone}</td></tr>` : ''}
<tr><td style="color:#888;vertical-align:top;padding:4px 0">Topic</td><td style="padding:4px 0">${topicLabels[topic] || topic || 'Not selected'}</td></tr>
<tr><td style="color:#888;vertical-align:top;padding:4px 0">AI Summary</td><td style="padding:4px 0;color:#203999"><em>${classification.summary || 'No summary'}</em></td></tr>
</table>
<hr style="border:none;border-top:1px solid #eee;margin:16px 0">
<p style="font-size:14px;line-height:1.7;white-space:pre-wrap">${message}</p>
<hr style="border:none;border-top:1px solid #eee;margin:16px 0">
<p style="font-size:12px;color:#aaa">Send brochure: ${classification.send_brochure ? 'YES' : 'No'} | Reply directly to ${email}</p>
</div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'SABDA Website <noreply@sabdastudio.com>',
      to: resolveRecipients(topic),
      reply_to: email,
      subject: `New Lead: ${categoryLabels[classification.category] || 'Inquiry'} from ${name}`,
      html: emailBody,
    }),
  });

  const result = await res.json();
  if (!result.id) throw new Error(JSON.stringify(result).substring(0, 200));
  return true;
}

async function logToNotion(token, databaseId, data) {
  const { name, email, phone, topic, message, classification } = data;

  const categoryLabels = {
    rental_high_value: 'Rental (High Value)', rental_low_value: 'Rental (Individual)',
    corporate_wellness: 'Corporate Wellness', class_inquiry: 'Class Inquiry',
    press_media: 'Press & Media', partnership: 'Partnership', general: 'General',
  };

  const today = new Date().toISOString().split('T')[0];
  const summaryText = classification.summary || '';
  const msgText = message || '';

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        'Booking ref': { title: [{ text: { content: name + ' — Website Lead' } }] },
        'Contact Name': { rich_text: [{ text: { content: name } }] },
        'Contact Email': { email: email },
        'Contact Phone': { phone_number: phone || null },
        'Company': { rich_text: [{ text: { content: (msgText.match(/[Cc]ompany:\s*([^\n]*)/)?.[1] || '').substring(0, 200) } }] },
        'Type': { rich_text: [{ text: { content: categoryLabels[classification.category] || classification.category || topic || 'General' } }] },
        'AI Summary': { rich_text: [{ text: { content: summaryText.substring(0, 400) }, annotations: { bold: true } }] },
        'Message': { rich_text: [{ text: { content: msgText.substring(0, 2000) }, annotations: { italic: true } }] },
        'Notes': { rich_text: [
          { text: { content: 'Send brochure: ' + (classification.send_brochure ? 'YES' : 'No') + ' | Confidence: ' + (classification.confidence || 'n/a') } }
        ] },
        'Date': { date: { start: today } },
      },
    }),
  });

  const result = await res.json();
  if (!result.id) throw new Error(JSON.stringify(result).substring(0, 300));
  return true;
}
