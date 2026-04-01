const MOMENCE = 'https://momence.com';

export default {
  async fetch(request) {
    const url = new URL(request.url);

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
        if (!/SameSite/i.test(c)) c += '; SameSite=Lax; Secure';
        h.append('Set-Cookie', c);
        continue;
      }
      if (k.toLowerCase() === 'x-frame-options' || k.toLowerCase() === 'content-security-policy') continue;
      h.set(k, v);
    }
    h.set('Access-Control-Allow-Origin', url.origin);
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

      const inject = `
<script>
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

// Block SPA navigation to /dashboard via pushState/replaceState
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
    if(typeof u==='string'&&isDash(u)){
      var d=sessionStorage.getItem('sabda_checkout');
      if(d){_la(d);return;}
    }
    _la(u);
  };
  var _lr=window.location.replace.bind(window.location);
  window.location.replace=function(u){
    if(typeof u==='string'&&isDash(u)){
      var d=sessionStorage.getItem('sabda_checkout');
      if(d){_lr(d);return;}
    }
    _lr(u);
  };
}catch(e){}

// Intercept sign-in clicks
document.addEventListener('click',function(e){
  var a=e.target.closest?e.target.closest('a'):null;
  if(!a)return;
  var hr=a.getAttribute('href')||a.href||'';
  if(hr.indexOf('/sign-in')>-1||hr.indexOf('momence.com/sign-in')>-1){
    e.preventDefault();e.stopPropagation();
    showSabdaLogin();return;
  }
  if(hr.indexOf('momence.com/')>-1){
    e.preventDefault();e.stopPropagation();
    window.location.href=hr.replace(/https:\\/\\/momence\\.com/,'');
  }
},true);

var _wo=window.open;
window.open=function(u){
  if(u&&typeof u==='string'){
    if(u.indexOf('/sign-in')>-1||u.indexOf('momence.com/sign-in')>-1){showSabdaLogin();return window;}
    if(u.indexOf('momence.com/')>-1){window.location.href=u.replace(/https:\\/\\/momence\\.com/,'');return window;}
  }
  return _wo.apply(window,arguments);
};

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

function showSabdaLogin(){
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
    +'<button id="sl-btn" onclick="doSabdaLogin()" style="width:100%;padding:12px;background:#6c63ff;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">Log in</button>'
    +'<div style="text-align:center;margin-top:16px"><a href="#" onclick="closeSabdaLogin();return false" style="font-size:13px;color:#666;text-decoration:none">Cancel</a></div></div>';
  document.body.appendChild(d);
  document.getElementById('sl-email').focus();
  document.getElementById('sl-pass').addEventListener('keydown',function(e){if(e.key==='Enter')doSabdaLogin();});
}
function closeSabdaLogin(){var d=document.getElementById('sabda-login');if(d)d.remove();}
function doSabdaLogin(){
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
      closeSabdaLogin();
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
}
})();
<\/script>`;

      html = html.replace('<head>', '<head>' + inject);
      return new Response(html, { status: res.status, headers: h });
    }

    return new Response(res.body, { status: res.status, headers: h });
  },
};
