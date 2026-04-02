const MOMENCE = 'https://momence.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
    if (url.pathname === '/sabda-api/promo') {
      return handlePromo(request, reqOrigin);
    }
    if (url.pathname === '/sabda-api/check-email') {
      return handleCheckEmail(request, reqOrigin);
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
    if (url.pathname === '/sabda-api/pay') {
      return handlePay(request, reqOrigin);
    }

    if (url.pathname === '/sabda-api/contact') {
      return handleContact(request, reqOrigin, env);
    }

    // ── CUSTOM SIGN-IN PAGE: intercept /sign-in and show our form ──
    if (url.pathname === '/sign-in' || url.pathname.startsWith('/sign-in')) {
      return new Response(buildSignInPage(url.search), {
        headers: { 'Content-Type': 'text/html;charset=utf-8' },
      });
    }

    const target = MOMENCE + url.pathname + url.search;

    const fwd = new Headers();
    for (const [k, v] of request.headers) {
      if (k.startsWith('cf-') || k === 'host') continue;
      fwd.set(k, v);
    }
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
      headers: { 'Content-Type': 'application/json', 'Host': 'momence.com' },
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
      headers: { 'Content-Type': 'application/json', 'Host': 'momence.com' },
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
      headers: {
        'Content-Type': 'application/json',
        'Cookie': partialCookies,
        'Host': 'momence.com',
      },
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
      headers: { 'Cookie': cookieStr, 'Host': 'momence.com' },
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
          { headers: { 'Cookie': cookieStr, 'Host': 'momence.com' } }
        );
        const mData = await mRes.json().catch(() => []);
        const rawList = Array.isArray(mData) ? mData : (mData.memberships || mData.message || []);
        memberships = rawList.filter(m => {
          return (m.remainingCredits > 0) || (m.eventsRemaining > 0) || (m.creditsRemaining > 0)
            || (m.remainingEvents > 0) || (m.unlimited === true)
            || (m.type === 'subscription' && m.status === 'active');
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
        const sRes = await fetch(MOMENCE + '/_api/readonly/plugin/sessions/' + sessionId + '?hostId=54278', { headers: { 'Host': 'momence.com' } });
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
      headers: { 'Content-Type': 'application/json', 'Host': 'momence.com' },
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
      headers: { 'Cookie': cookieStr, 'Host': 'momence.com' },
    });
    const profile = profileRes.ok ? await profileRes.json().catch(() => ({})) : {};

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
          { headers: { 'Cookie': cookieStr, 'Host': 'momence.com' } }
        );
        const mData = await mRes.json().catch(() => []);
        const rawList = Array.isArray(mData) ? mData : (mData.memberships || mData.message || []);
        
        // Filter to only memberships that actually have remaining credits
        memberships = rawList.filter(m => {
          // Check various fields that indicate usable credits
          const hasCredits = (m.remainingCredits && m.remainingCredits > 0)
            || (m.eventsRemaining && m.eventsRemaining > 0)
            || (m.creditsRemaining && m.creditsRemaining > 0)
            || (m.remainingEvents && m.remainingEvents > 0)
            || (m.unlimited === true)
            || (m.type === 'subscription' && m.status === 'active');
          return hasCredits;
        });

        // If filtering removed everything, try the raw list but mark as unverified
        // Some memberships may use different field names
        if (memberships.length === 0 && rawList.length > 0) {
          // Log the raw data so we can see the actual structure
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
        const sRes = await fetch(MOMENCE + '/_api/readonly/plugin/sessions/' + sessionId + '?hostId=54278', { headers: { 'Host': 'momence.com' } });
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
        { headers: { 'Host': 'momence.com' } }
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
    if (memberMembershipId) {
      body.memberMembershipId = memberMembershipId;
    }
    body.boughtMembershipIds = [];
    if (phoneNumber) body.phoneNumber = phoneNumber;
    if (customerFields) body.customerFields = customerFields;

    const bookRes = await fetch(
      MOMENCE + '/_api/primary/plugin/sessions/' + sessionId + '/membership-pay',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieStr,
          'Host': 'momence.com',
        },
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

// ── SERVER-SIDE PAYMENT: pay for a class with Stripe ──
async function handlePay(request, origin) {
  try {
    const { sessionId, sessionToken, stripePaymentMethodId, firstName, lastName, email, phoneNumber, customerFields, type, productId, discountCode, actualPrice } = await request.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    const isFree = stripePaymentMethodId === 'free' || actualPrice === 0;
    if (!isFree && !stripePaymentMethodId) {
      return new Response(JSON.stringify({ error: 'Missing payment method' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    const cookieStr = sessionToken ? atob(sessionToken) : '';

    // Fetch session details for price and stripe account
    const sessRes = await fetch(
      MOMENCE + '/_api/readonly/plugin/sessions/' + sessionId + '?hostId=54278',
      { headers: { 'Host': 'momence.com' } }
    );
    const sessData = await sessRes.json();
    const session = sessData.message || {};
    let price = session.fixedTicketPrice || 0;
    const stripeAcct = session.stripeConnectedAccount || '';
    const loadDate = session.loadDate || new Date().toISOString();

    // If buying a membership/pack, use known price
    // /host/54278/memberships returns 401 from CF Workers — hardcode instead
    if (productId) {
      const PRODUCT_PRICES = {
        443934: 18,   // Trial Drop-in
        443935: 50,   // Intro 3-Pack
        445630: 22,   // Drop-in
        443937: 85,   // 5 Pack
        443939: 149,  // 10 Pack
        706876: 99,   // Flex monthly
        709976: 109,  // Ritual monthly
        431216: 130,  // Immerse monthly
        445600: 330,  // Immerse 3-Month
        507726: 12,   // Ice Bath single
        507728: 30,   // Ice Bath 3-Pack
        507729: 40,   // Ice Bath 5-Pack
      };
      const knownPrice = PRODUCT_PRICES[Number(productId)];
      if (knownPrice !== undefined) price = knownPrice;
    }

    // If frontend sent an actualPrice (e.g. after promo discount), use that
    if (actualPrice !== undefined && actualPrice !== null) {
      price = actualPrice;
    }

    const body = {
      tickets: [{ firstName, lastName, email, isAdditionalTicket: false }],
      totalPriceInCurrency: price,
      loadDate,
      shouldSavePaymentMethod: false,
      boughtMembershipIds: productId ? [productId] : [],
    };
    if (!isFree && stripePaymentMethodId) body.stripePaymentMethodId = stripePaymentMethodId;
    if (stripeAcct) body.stripeConnectedAccountId = stripeAcct;
    if (phoneNumber) body.phoneNumber = phoneNumber;
    if (customerFields) body.customerFields = customerFields;
    if (discountCode) body.discountCode = discountCode;

    const payRes = await fetch(
      MOMENCE + '/_api/primary/plugin/sessions/' + sessionId + '/pay',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieStr,
          'Host': 'momence.com',
        },
        body: JSON.stringify(body),
      }
    );

    const payData = await payRes.json().catch(() => ({}));

    if (payRes.ok) {
      // Check if 3D Secure is needed
      if (payData.payload && payData.payload.clientSecret) {
        return new Response(JSON.stringify({
          clientSecret: payData.payload.clientSecret,
          newMemberId: payData.payload.newMemberId,
        }), { status: 200, headers: corsHeaders(origin) });
      }
      return new Response(JSON.stringify({ success: true, data: payData }), {
        status: 200, headers: corsHeaders(origin),
      });
    } else {
      return new Response(JSON.stringify({
        error: payData.message || payData.error || 'Payment failed',
        data: payData,
      }), { status: payRes.status, headers: corsHeaders(origin) });
    }

  } catch (e) {
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
      if (env.Notion && env.NOTION_DATABASE_ID) {
        notionLogged = await logToNotion(env.Notion, env.NOTION_DATABASE_ID, { name, email, phone, topic, message, classification });
      } else { notionError = 'missing_key:Notion=' + !!env.Notion + ',DB=' + !!env.NOTION_DATABASE_ID; }
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
      to: ['connect@sabdastudio.com', 'marvyn@sabdastudio.com'],
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
        'Notes': { rich_text: [
          { text: { content: 'AI Summary: ' }, annotations: { bold: true } },
          { text: { content: summaryText.substring(0, 400) + '\n\n' }, annotations: { bold: false } },
          { text: { content: '"' + msgText.substring(0, 1500) + '"' }, annotations: { italic: true } }
        ] },
        'Date': { date: { start: today } },
      },
    }),
  });

  const result = await res.json();
  if (!result.id) throw new Error(JSON.stringify(result).substring(0, 300));
  return true;
}
