const MOMENCE = 'https://momence.com';

export default {
  async fetch(request) {
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
    if (url.pathname === '/sabda-api/login') {
      return handleLogin(request, reqOrigin);
    }
    if (url.pathname === '/sabda-api/book') {
      return handleBook(request, reqOrigin);
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

    if (!loginRes.ok) {
      const err = await loginRes.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: err.message || 'Invalid credentials' }), {
        status: 401, headers: corsHeaders(origin),
      });
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
    if (sessionId && memberId) {
      try {
        const mRes = await fetch(
          MOMENCE + '/_api/primary/plugin/memberships/session-compatible-memberships?sessionId=' + sessionId + '&hostId=54278',
          { headers: { 'Cookie': cookieStr, 'Host': 'momence.com' } }
        );
        const mData = await mRes.json().catch(() => []);
        memberships = Array.isArray(mData) ? mData : (mData.memberships || mData.message || []);
      } catch (e) {}
    }

    // Encode session for client to pass back on booking
    const sessionToken = btoa(cookieStr);

    return new Response(JSON.stringify({
      user: {
        id: profile.id,
        email: profile.email || email,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        memberId,
      },
      memberships,
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
    const { sessionId, sessionToken, memberId, memberMembershipId, firstName, lastName, email } = await request.json();

    if (!sessionId || !sessionToken) {
      return new Response(JSON.stringify({ error: 'Missing sessionId or sessionToken' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    const cookieStr = atob(sessionToken);

    // Fetch session details to get the correct price
    let sessionPrice = 0;
    try {
      const sessRes = await fetch(
        MOMENCE + '/_api/readonly/plugin/sessions/' + sessionId + '?hostId=54278',
        { headers: { 'Host': 'momence.com' } }
      );
      const sessData = await sessRes.json();
      if (sessData.message) {
        sessionPrice = sessData.message.fixedTicketPrice || sessData.message.price || 0;
      }
    } catch (e) {}

    const body = {
      tickets: [{ firstName, lastName, email, isAdditionalTicket: false }],
      totalPriceInCurrency: sessionPrice,
      loadDate: new Date().toISOString(),
    };
    if (memberId) body.memberId = memberId;
    if (memberMembershipId) {
      body.memberMembershipId = memberMembershipId;
      body.boughtMembershipIds = [memberMembershipId];
    } else {
      body.boughtMembershipIds = [];
    }

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
