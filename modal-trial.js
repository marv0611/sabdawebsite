/* ═══════════════════════════════════════════════════════════
   SABDA TRIAL MODAL v1 — External loader
   Cookie sets ONLY on /intro/. Reads everywhere.
   Intercepts momence.com/m/443934 links when variant=modal.
   ═══════════════════════════════════════════════════════════ */
(function(){
'use strict';

var PROXY = 'https://sabda-checkout-proxy.sabda.workers.dev';
var PRODUCT_ID = '443934';
var PRICE = 18;
var STRIPE_PK = 'pk_live_RoPa2iuvwBbqEISUd2LYTmKF';
var STRIPE_ACCT = 'acct_1RUWnoBf6nsynAht';

var COOKIE_NAME = 'sabda_checkout_variant';
var COOKIE_DAYS = 30;

function getVariant(){
  var m = document.cookie.match('(^|;)\\s*' + COOKIE_NAME + '\\s*=\\s*([^;]+)');
  return m ? m.pop() : null;
}
function setVariant(v){
  var d = new Date();
  d.setTime(d.getTime() + COOKIE_DAYS * 86400000);
  document.cookie = COOKIE_NAME + '=' + v + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
}

// Cookie sets ONLY on /intro/ pages
var isIntroPage = /\/(intro\/|m\/intro\.)/.test(location.pathname);
var variant = getVariant();
if (!variant) {
  if (isIntroPage) {
    variant = Math.random() < 0.5 ? 'modal' : 'momence';
    setVariant(variant);
  } else {
    return;
  }
}
if (variant !== 'modal') return;
if (!document.querySelector('a[href*="momence.com/m/443934"]')) return;

// Auto-detect language for customerFields
var _pageLang = (document.documentElement.lang || 'en').toLowerCase().substr(0,2);
var _cfLang = (_pageLang === 'es' || _pageLang === 'ca') ? 'Castellano' : 'English';

// Inject CSS
var _s = document.createElement('style');
_s.textContent = ".tm{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.75);backdrop-filter:blur(12px);display:none;align-items:center;justify-content:center;opacity:0;transition:opacity .3s}\n.tm.open{display:flex;opacity:1}\n.tm-box{width:95vw;max-width:440px;max-height:90vh;background:#131842;border:1px solid rgba(240,239,233,.12);border-radius:16px;overflow-y:auto;transform:translateY(20px);transition:transform .35s cubic-bezier(.16,1,.3,1);box-shadow:0 32px 80px rgba(0,0,0,.5)}\n.tm.open .tm-box{transform:none}\n.tm-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid rgba(240,239,233,.06);position:sticky;top:0;background:#131842;z-index:2}\n.tm-t{font-family:'PT Serif',serif;font-size:1rem;font-weight:700;color:#f0efe9}\n.tm-sub{font-size:.78rem;color:rgba(240,239,233,.6);margin-top:2px}\n.tm-x{background:none;border:1px solid rgba(240,239,233,.12);color:rgba(240,239,233,.6);width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color .25s,color .25s;flex-shrink:0}\n.tm-x:hover{border-color:rgba(240,239,233,.38);color:#f0efe9}\n.tm-x svg{width:14px;height:14px}\n.tm-bd{padding:24px}\n.tm-ft{padding:14px 24px;border-top:1px solid rgba(240,239,233,.06);text-align:center;position:sticky;bottom:0;background:#131842}\n.tm-sec{font-size:.68rem;color:rgba(240,239,233,.38);display:flex;align-items:center;justify-content:center;gap:6px}\n.tm-sec svg{width:12px;height:12px;opacity:.5}\n.tm-fb{margin-top:8px;font-size:.68rem;text-align:center}.tm-fb a{color:rgba(240,239,233,.6);text-decoration:none;transition:color .2s}.tm-fb a:hover{color:#02F3C5}.tm-fb strong{color:#02F3C5;font-weight:600}\n.tm-pkg{background:rgba(2,243,197,.05);border:1px solid rgba(2,243,197,.15);border-radius:10px;padding:14px 18px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}\n.tm-pkg-name{font-weight:600;font-size:.88rem;color:#f0efe9}.tm-pkg-desc{font-size:.75rem;color:rgba(240,239,233,.55);margin-top:2px}\n.tm-pkg-price{font-family:'PT Serif',serif;font-weight:700;font-size:1.1rem;color:#02F3C5}\n.tm .bk-label{display:block;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:rgba(240,239,233,.38);font-weight:600;margin-bottom:6px}\n.tm .bk-input{width:100%;padding:12px 14px;background:rgba(240,239,233,.04);border:1px solid rgba(240,239,233,.12);border-radius:8px;color:#f0efe9;font-family:'DM Sans',sans-serif;font-size:1rem;outline:none;transition:border-color .25s;margin-bottom:16px;box-sizing:border-box;-webkit-appearance:none}\n.tm .bk-input:focus{border-color:rgba(2,243,197,.4)}\n.tm .bk-input::placeholder{color:rgba(240,239,233,.4)}\n.tm .bk-input.err{border-color:#F8A6A3;background:rgba(248,166,163,.04)}\n.tm .bk-input:-webkit-autofill,.tm .bk-input:-webkit-autofill:hover,.tm .bk-input:-webkit-autofill:focus,.tm .bk-input:-webkit-autofill:active{-webkit-text-fill-color:#f0efe9 !important;-webkit-box-shadow:0 0 0 1000px rgba(11,18,49,1) inset !important;caret-color:#f0efe9;transition:background-color 5000s ease-in-out 0s}\n.tm-err{color:#F8A6A3;font-size:.78rem;min-height:0;margin-bottom:10px;text-align:center;line-height:1.4}\n.tm-err:empty{display:none}\n.tm-err a{color:#02F3C5;text-decoration:underline}\n.tm-btn{width:100%;padding:14px;background:#02F3C5;color:#0e1235;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:700;letter-spacing:.02em;cursor:pointer;transition:background .25s,transform .2s}\n.tm-btn:hover{background:#33f5d1;transform:translateY(-1px)}\n.tm-btn:disabled{opacity:.5;cursor:default;transform:none}\n.tm-link{display:block;text-align:center;margin-top:14px;font-size:.82rem;color:rgba(240,239,233,.6);cursor:pointer;transition:color .25s}.tm-link:hover{color:#f0efe9}\n.tm-card{background:rgba(240,239,233,.06);border:1px solid rgba(240,239,233,.12);border-radius:8px;padding:14px;margin-bottom:16px}\n.tm-card.StripeElement--focus{border-color:rgba(2,243,197,.4)}\n.tm-card.StripeElement--invalid{border-color:#F8A6A3}\n.tm-divider{display:flex;align-items:center;gap:12px;margin:16px 0;color:rgba(240,239,233,.38);font-size:.72rem;letter-spacing:.06em;text-transform:uppercase}\n.tm-divider::before,.tm-divider::after{content:'';flex:1;height:1px;background:rgba(240,239,233,.06)}\n.tm-success{text-align:center;padding:20px 0}\n.tm-success svg{width:56px;height:56px;margin-bottom:16px}\n.tm-success h3{font-family:'PT Serif',serif;font-size:1.2rem;font-weight:700;color:#f0efe9;margin-bottom:8px}\n.tm-success p{font-size:.85rem;color:rgba(240,239,233,.6);line-height:1.5}\n.tm-step{animation:tmIn .3s cubic-bezier(.16,1,.3,1)}\n@keyframes tmIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}\n@media(max-width:860px){.tm-box{width:100vw;height:100vh;max-height:none;border-radius:0}.tm .bk-input{font-size:16px}}";
document.head.appendChild(_s);

// Inject HTML
document.body.insertAdjacentHTML('beforeend', "<div class=\"tm\" id=\"tm\">\n  <div class=\"tm-box\">\n    <div class=\"tm-head\">\n      <div><div class=\"tm-t\">Trial Class</div><div class=\"tm-sub\">Your first class at SABDA</div></div>\n      <button class=\"tm-x\" type=\"button\" aria-label=\"Close\" onclick=\"SABDA_TM.close()\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/></svg></button>\n    </div>\n    <div class=\"tm-bd\" id=\"tm-bd\"></div>\n    <div class=\"tm-ft\">\n      <div class=\"tm-sec\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/></svg>Secure checkout via SABDA</div>\n      <div class=\"tm-fb\"><a href=\"https://momence.com/m/443934\" target=\"_blank\" rel=\"noopener noreferrer\">Having trouble? <strong>Book on Momence</strong> &rarr;</a></div>\n    </div>\n  </div>\n</div>");

// Load Stripe.js dynamically
var _ss = document.createElement('script');
_ss.src = 'https://js.stripe.com/v3/';
_ss.onload = function(){
// ── STATE ──
var stripe = null, cardEl = null, payReq = null;
var processing = false;
var purchaseEventId = null;
var sessionToken = null;
var loggedInUser = null;

// ── HELPERS ──
function esc(s){ var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function validateEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function getCookie(n){ var m=document.cookie.match('(^|;)\\s*'+n+'\\s*=\\s*([^;]+)'); return m?m.pop():''; }
function getAttribution(){ return (window._sabdaGetAttribution && window._sabdaGetAttribution()) || null; }

// ── INTERCEPT TRIAL CLICKS ──
document.addEventListener('click', function(e){
  var a = e.target.closest ? e.target.closest('a[href*="momence.com/m/443934"]') : null;
  if (!a) return;
  e.preventDefault();
  e.stopPropagation();
  openModal();
}, true);

// ── MODAL OPEN / CLOSE ──
function openModal(){
  var mo = document.getElementById('tm');
  mo.style.display = 'flex';
  requestAnimationFrame(function(){ mo.classList.add('open'); });
  document.body.style.overflow = 'hidden'; document.body.style.position = 'fixed'; document.body.style.width = '100%'; document.body.style.top = '-' + window.scrollY + 'px';
  showEmailStep();
  // Fire AddToCart + InitiateCheckout
  try {
    var params = {value:PRICE, currency:'EUR', content_name:'Trial Class', content_ids:[PRODUCT_ID], content_type:'product'};
    var atcEid = 'atc_' + Date.now() + '_' + Math.random().toString(36).substr(2,9);
    var icEid = 'ic_' + Date.now() + '_' + Math.random().toString(36).substr(2,9);
    _sabdaFireWithCAPI('AddToCart', atcEid, params);
    _sabdaFireWithCAPI('InitiateCheckout', icEid, params);
  } catch(e){}
}

function closeModal(){
  var mo = document.getElementById('tm');
  mo.classList.remove('open');
  var _scrollY = parseInt(document.body.style.top || '0') * -1; document.body.style.overflow = ''; document.body.style.position = ''; document.body.style.width = ''; document.body.style.top = ''; window.scrollTo(0, _scrollY);
  setTimeout(function(){
    mo.style.display = 'none';
    document.getElementById('tm-bd').innerHTML = '';
  }, 300);
  processing = false;
  purchaseEventId = null;
  sessionToken = null;
  loggedInUser = null;
  if (cardEl) { try { cardEl.destroy(); } catch(e){} cardEl = null; }
}

// Close on overlay click / Escape
document.getElementById('tm').addEventListener('click', function(e){ if(e.target===this) closeModal(); });
document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeModal(); });

// ── STEP 1: EMAIL CHECK ──
function showEmailStep(){
  var bd = document.getElementById('tm-bd');
  bd.innerHTML = '<div class="tm-step">'
    + '<div class="tm-pkg"><div><div class="tm-pkg-name">Trial Class</div><div class="tm-pkg-desc">One class &middot; No commitment</div></div><div class="tm-pkg-price">&euro;18</div></div>'
    + '<div class="bk-label">Email</div>'
    + '<input class="bk-input" id="tm-email" type="email" placeholder="your@email.com" autocomplete="email">'
    + '<div class="tm-err" id="tm-err"></div>'
    + '<button class="tm-btn" id="tm-email-btn" onclick="SABDA_TM.checkEmail()">Continue</button>'
    + '</div>';
  var inp = document.getElementById('tm-email');
  inp.focus();
  inp.addEventListener('keydown', function(e){ if(e.key==='Enter') SABDA_TM.checkEmail(); });
}

function checkEmail(){
  if (processing) return;
  var inp = document.getElementById('tm-email');
  var email = inp.value.trim();
  var err = document.getElementById('tm-err');
  if (!email || !validateEmail(email)) { inp.classList.add('err'); err.textContent='Enter a valid email'; return; }
  inp.classList.remove('err');
  err.textContent = '';
  processing = true;
  document.getElementById('tm-email-btn').textContent = 'Checking...';
  document.getElementById('tm-email-btn').disabled = true;

  fetch(PROXY + '/sabda-api/check-email', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ email: email })
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    processing = false;
    if (d.exists) {
      showLoginStep(email);
    } else {
      showRegisterStep(email);
    }
  })
  .catch(function(e){
    processing = false;
    // On error, assume new user
    showRegisterStep(email);
  });
}

// ── STEP 2A: LOGIN (returning user) ──
function showLoginStep(email){
  var bd = document.getElementById('tm-bd');
  bd.innerHTML = '<div class="tm-step">'
    + '<div class="tm-pkg"><div><div class="tm-pkg-name">Trial Class</div><div class="tm-pkg-desc">One class &middot; No commitment</div></div><div class="tm-pkg-price">&euro;18</div></div>'
    + '<div style="font-size:.82rem;color:rgba(240,239,233,.6);margin-bottom:16px">Welcome back! Sign in to continue.</div>'
    + '<div class="bk-label">Email</div>'
    + '<input class="bk-input" id="tm-email" type="email" value="' + esc(email) + '" autocomplete="email">'
    + '<div class="bk-label">Password</div>'
    + '<input class="bk-input" id="tm-pass" type="password" placeholder="Password" autocomplete="current-password">'
    + '<div style="text-align:right;margin:-10px 0 12px"><a href="https://momence.com/forgot-password" target="_blank" rel="noopener noreferrer" style="font-size:.75rem;color:rgba(240,239,233,.38);text-decoration:none;border-bottom:1px solid rgba(240,239,233,.12)">Forgot password?</a></div>'
    + '<div class="tm-err" id="tm-err"></div>'
    + '<button class="tm-btn" id="tm-login-btn" onclick="SABDA_TM.doLogin()">Sign In &amp; Continue</button>'
    + '<div class="tm-link" onclick="SABDA_TM.showRegisterStep(\'' + esc(email).replace(/'/g,"\\&apos;") + '\')">New to SABDA? Register here</div>'
    + '</div>';
  document.getElementById('tm-pass').focus();
  document.getElementById('tm-pass').addEventListener('keydown', function(e){ if(e.key==='Enter') SABDA_TM.doLogin(); });
}

function doLogin(){
  if (processing) return;
  var email = document.getElementById('tm-email').value.trim();
  var pass = document.getElementById('tm-pass').value;
  var err = document.getElementById('tm-err');
  var btn = document.getElementById('tm-login-btn');
  if (!email || !pass) { err.textContent = 'Enter email and password'; return; }
  err.textContent = '';
  processing = true;
  btn.textContent = 'Signing in...';
  btn.disabled = true;

  fetch(PROXY + '/sabda-api/login', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ email: email, password: pass })
  })
  .then(function(r){ return r.json().then(function(d){ return {ok:r.ok, data:d}; }); })
  .then(function(r){
    processing = false;
    if (!r.ok || r.data.error) {
      err.innerHTML = 'Wrong email or password. <a href="https://momence.com/m/443934" target="_blank">Book on Momence &rarr;</a>';
      btn.textContent = 'Sign In & Continue';
      btn.disabled = false;
      return;
    }
    if (r.data.mfaRequired) {
      showMfaStep(r.data.mfaToken, email);
      return;
    }
    var d = r.data;
    if (!d || !d.user) { err.innerHTML = 'Unexpected response. <a href="https://momence.com/m/443934" target="_blank">Book on Momence &rarr;</a>'; err.style.display='block'; btn.textContent='Sign In & Continue'; btn.disabled=false; return; }
    loggedInUser = { email: d.user.email || email, firstName: d.user.firstName || '', lastName: d.user.lastName || '' };
    sessionToken = d.sessionToken;
    showPaymentStep(email, loggedInUser.firstName, loggedInUser.lastName, '', true);
  })
  .catch(function(e){
    processing = false;
    err.innerHTML = 'Connection error. <a href="https://momence.com/m/443934" target="_blank">Book on Momence &rarr;</a>';
    btn.textContent = 'Sign In & Continue';
    btn.disabled = false;
  });
}

// ── STEP 2B: MFA ──
function showMfaStep(mfaToken, email){
  var bd = document.getElementById('tm-bd');
  bd.innerHTML = '<div class="tm-step">'
    + '<div style="text-align:center;margin-bottom:20px"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#02F3C5" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>'
    + '<div style="font-size:.88rem;color:rgba(240,239,233,.8);text-align:center;margin-bottom:20px;line-height:1.5">Check your email for a verification code</div>'
    + '<div class="bk-label">Verification Code</div>'
    + '<input class="bk-input" id="tm-mfa" type="text" placeholder="6-digit code" autocomplete="one-time-code" inputmode="numeric" maxlength="6" style="text-align:center;font-size:1.2rem;letter-spacing:.3em">'
    + '<div class="tm-err" id="tm-err"></div>'
    + '<button class="tm-btn" id="tm-mfa-btn" onclick="SABDA_TM.doMfa()">Verify</button>'
    + '</div>';
  // Store mfaToken + email in closure
  document.getElementById('tm-mfa').dataset.token = mfaToken;
  document.getElementById('tm-mfa').dataset.email = email;
  document.getElementById('tm-mfa').focus();
  document.getElementById('tm-mfa').addEventListener('keydown', function(e){ if(e.key==='Enter') SABDA_TM.doMfa(); });
}

function doMfa(){
  if (processing) return;
  var inp = document.getElementById('tm-mfa');
  var code = inp.value.trim();
  var token = inp.dataset.token;
  var email = inp.dataset.email;
  var err = document.getElementById('tm-err');
  var btn = document.getElementById('tm-mfa-btn');
  if (!code) { err.textContent = 'Enter the code'; return; }
  err.textContent = '';
  processing = true;
  btn.textContent = 'Verifying...';
  btn.disabled = true;

  fetch(PROXY + '/sabda-api/mfa-verify', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ mfaToken: token, code: code, email: email })
  })
  .then(function(r){ return r.json().then(function(d){ return {ok:r.ok, data:d}; }); })
  .then(function(r){
    processing = false;
    if (!r.ok || r.data.error) {
      err.textContent = r.data.error || 'Invalid code';
      btn.textContent = 'Verify';
      btn.disabled = false;
      return;
    }
    if (!r.data || !r.data.user) { err.textContent = 'Verification failed. Please try again.'; btn.textContent='Verify'; btn.disabled=false; return; }
    loggedInUser = { email: r.data.user.email || email, firstName: r.data.user.firstName || '', lastName: r.data.user.lastName || '' };
    sessionToken = r.data.sessionToken;
    showPaymentStep(email, loggedInUser.firstName, loggedInUser.lastName, '', true);
  })
  .catch(function(e){
    processing = false;
    err.textContent = 'Connection error';
    btn.textContent = 'Verify';
    btn.disabled = false;
  });
}

// ── STEP 3: REGISTER (new user) ──
function showRegisterStep(email){
  var bd = document.getElementById('tm-bd');
  bd.innerHTML = '<div class="tm-step">'
    + '<div class="tm-pkg"><div><div class="tm-pkg-name">Trial Class</div><div class="tm-pkg-desc">One class &middot; No commitment</div></div><div class="tm-pkg-price">&euro;18</div></div>'
    + '<div class="bk-label">First Name</div>'
    + '<input class="bk-input" id="tm-fn" type="text" placeholder="First name" autocomplete="given-name">'
    + '<div class="bk-label">Last Name</div>'
    + '<input class="bk-input" id="tm-ln" type="text" placeholder="Last name" autocomplete="family-name">'
    + '<div class="bk-label">Email</div>'
    + '<input class="bk-input" id="tm-email" type="email" value="' + esc(email) + '" autocomplete="email">'
    + '<div class="bk-label">Confirm Email</div>'
    + '<input class="bk-input" id="tm-email2" type="email" placeholder="Repeat your email" autocomplete="off">'
    + '<div class="bk-label">Create Password</div>'
    + '<input class="bk-input" id="tm-pass" type="password" placeholder="Min. 8 characters" autocomplete="new-password">'
    + '<div class="bk-label">Confirm Password</div>'
    + '<input class="bk-input" id="tm-pass2" type="password" placeholder="Repeat password" autocomplete="new-password">'
    + '<div class="bk-label">' + (_pageLang==='es'?'' + (_pageLang==='es'?'Ciudad de Residencia':(_pageLang==='ca'?'' + (_pageLang==='es'?'Ciudad de Residencia':(_pageLang==='ca'?'Ciutat de Resid\u00e8ncia':'City of Residence')) + '':'City of Residence')) + '':(_pageLang==='ca'?'' + (_pageLang==='es'?'Ciudad de Residencia':(_pageLang==='ca'?'Ciutat de Resid\u00e8ncia':'City of Residence')) + '':'City of Residence')) + '</div>'
    + '<input class="bk-input" id="tm-city" type="text" placeholder="Barcelona" autocomplete="address-level2">'
    + '<div class="tm-divider"></div>'
    + '<div id="tm-pay-request"></div>'
    + '<div id="tm-pay-divider" class="tm-divider" style="display:none">or pay with card</div>'
    + '<div class="bk-label" id="tm-card-label">Card Details</div>'
    + '<div class="tm-card" id="tm-card"></div>'
    + '<div class="tm-err" id="tm-err"></div>'
    + '<button class="tm-btn" id="tm-pay-btn" onclick="SABDA_TM.doRegisterPay()">Pay &euro;18</button>'
    + '<div class="tm-link" onclick="SABDA_TM.showEmailStep()">&larr; Back</div>'
    + '</div>';
  document.getElementById('tm-fn').focus();
  mountStripe(false);
}

// ── STEP 4: PAYMENT (logged-in user) ──
function showPaymentStep(email, fn, ln, phone, isLoggedIn){
  var bd = document.getElementById('tm-bd');
  bd.innerHTML = '<div class="tm-step">'
    + '<div class="tm-pkg"><div><div class="tm-pkg-name">Trial Class</div><div class="tm-pkg-desc">One class &middot; No commitment</div></div><div class="tm-pkg-price">&euro;18</div></div>'
    + '<div style="font-size:.82rem;color:rgba(240,239,233,.6);margin-bottom:16px;text-align:center">Booking as <strong style="color:#f0efe9">' + esc(fn) + ' ' + esc(ln) + '</strong></div>'
    + '<div class="bk-label">' + (_pageLang==='es'?'' + (_pageLang==='es'?'Ciudad de Residencia':(_pageLang==='ca'?'' + (_pageLang==='es'?'Ciudad de Residencia':(_pageLang==='ca'?'Ciutat de Resid\u00e8ncia':'City of Residence')) + '':'City of Residence')) + '':(_pageLang==='ca'?'' + (_pageLang==='es'?'Ciudad de Residencia':(_pageLang==='ca'?'Ciutat de Resid\u00e8ncia':'City of Residence')) + '':'City of Residence')) + '</div>'
    + '<input class="bk-input" id="tm-city" type="text" placeholder="Barcelona" autocomplete="address-level2">'
    + '<div id="tm-pay-request"></div>'
    + '<div id="tm-pay-divider" class="tm-divider" style="display:none">or pay with card</div>'
    + '<div class="bk-label" id="tm-card-label">Card Details</div>'
    + '<div class="tm-card" id="tm-card"></div>'
    + '<div class="tm-err" id="tm-err"></div>'
    + '<button class="tm-btn" id="tm-pay-btn" onclick="SABDA_TM.doLoggedInPay()">Pay &euro;18</button>'
    + '</div>';
  mountStripe(true);
}

// ── STRIPE ELEMENTS ──
function mountStripe(isLoggedIn){
  if (!stripe) {
    try { stripe = Stripe(STRIPE_PK, { stripeAccount: STRIPE_ACCT }); }
    catch(e) { showError('Payment system unavailable. Please book on Momence.'); return; }
  }
  if (cardEl) { try { cardEl.destroy(); } catch(e){} cardEl = null; }
  var elements = stripe.elements();
  cardEl = elements.create('card', {
    style: {
      base: { color:'#f0efe9', fontFamily:'DM Sans, sans-serif', fontSize:'15px', '::placeholder':{ color:'rgba(240,239,233,.4)' } },
      invalid: { color:'#F8A6A3' }
    },
    hidePostalCode: true
  });
  var wrap = document.getElementById('tm-card');
  if (wrap) cardEl.mount('#tm-card');

  // Apple Pay / Google Pay
  try {
    payReq = stripe.paymentRequest({
      country: 'ES', currency: 'eur',
      total: { label: 'SABDA Studio — Trial Class', amount: PRICE * 100 },
      requestPayerEmail: true, requestPayerName: true
    });
    var prBtn = stripe.elements().create('paymentRequestButton', { paymentRequest: payReq, style: { paymentRequestButton: { theme:'light', height:'44px' } } });
    payReq.canMakePayment().then(function(result){
      if (result) {
        var prWrap = document.getElementById('tm-pay-request');
        if (prWrap) { prBtn.mount('#tm-pay-request'); }
        var divider = document.getElementById('tm-pay-divider');
        if (divider) divider.style.display = '';
      }
    });
    payReq.on('paymentmethod', function(ev){
      submitPayment({
        stripePaymentMethodId: ev.paymentMethod.id,
        email: ev.payerEmail || (loggedInUser ? loggedInUser.email : ''),
        firstName: (ev.payerName || '').split(' ')[0] || (loggedInUser ? loggedInUser.firstName : ''),
        lastName: (ev.payerName || '').split(' ').slice(1).join(' ') || (loggedInUser ? loggedInUser.lastName : ''),
        isApplePay: true
      }, ev);
    });
  } catch(e){ /* Payment Request not supported */ }
}

// ── SUBMIT: NEW USER ──
function doRegisterPay(){
  if (processing) return;
  var fn = document.getElementById('tm-fn').value.trim();
  var ln = document.getElementById('tm-ln').value.trim();
  var email = document.getElementById('tm-email').value.trim();
  var email2 = document.getElementById('tm-email2').value.trim();
  var pass = document.getElementById('tm-pass').value;
  var pass2 = document.getElementById('tm-pass2').value;
  var err = document.getElementById('tm-err');
  var btn = document.getElementById('tm-pay-btn');

  // Validation
  var fields = ['tm-fn','tm-ln','tm-email','tm-email2','tm-pass','tm-pass2'];
  fields.forEach(function(id){ document.getElementById(id).classList.remove('err'); });
  var ok = true;
  if (!fn) { document.getElementById('tm-fn').classList.add('err'); ok=false; }
  if (!ln) { document.getElementById('tm-ln').classList.add('err'); ok=false; }
  if (!email || !validateEmail(email)) { document.getElementById('tm-email').classList.add('err'); ok=false; }
  if (email !== email2) { document.getElementById('tm-email2').classList.add('err'); err.textContent='Emails don\u2019t match'; if(ok) ok=false; }
  if (!pass || pass.length < 8) { document.getElementById('tm-pass').classList.add('err'); if(!err.textContent) err.textContent='Password must be at least 8 characters'; ok=false; }
  if (pass !== pass2) { document.getElementById('tm-pass2').classList.add('err'); err.textContent='Passwords don\u2019t match'; ok=false; }
  if (!ok) { if(!err.textContent) err.textContent='Please fill in the highlighted fields'; return; }

  err.textContent = '';
  processing = true;
  btn.textContent = 'Processing...';
  btn.disabled = true;

  // Create Stripe payment method from card element
  stripe.createPaymentMethod({
    type: 'card',
    card: cardEl,
    billing_details: { name: fn + ' ' + ln, email: email }
  }).then(function(result){
    if (result.error) {
      processing = false;
      err.textContent = result.error.message || 'Card error';
      btn.textContent = 'Pay \u20AC18';
      btn.disabled = false;
      return;
    }
    submitPayment({
      stripePaymentMethodId: result.paymentMethod.id,
      email: email,
      firstName: fn,
      lastName: ln,
      password: pass
    });
  }).catch(function(e){
    processing = false;
    err.textContent = 'Card processing error. Please try again.';
    btn.textContent = 'Pay \u20AC18';
    btn.disabled = false;
  });
}

// ── SUBMIT: LOGGED-IN USER ──
function doLoggedInPay(){
  if (processing) return;
  var err = document.getElementById('tm-err');
  var btn = document.getElementById('tm-pay-btn');
  err.textContent = '';
  processing = true;
  btn.textContent = 'Processing...';
  btn.disabled = true;

  stripe.createPaymentMethod({
    type: 'card',
    card: cardEl,
    billing_details: { name: loggedInUser.firstName + ' ' + loggedInUser.lastName, email: loggedInUser.email }
  }).then(function(result){
    if (result.error) {
      processing = false;
      err.textContent = result.error.message || 'Card error';
      btn.textContent = 'Pay \u20AC18';
      btn.disabled = false;
      return;
    }
    submitPayment({
      stripePaymentMethodId: result.paymentMethod.id,
      email: loggedInUser.email,
      firstName: loggedInUser.firstName,
      lastName: loggedInUser.lastName
    });
  }).catch(function(e){
    processing = false;
    err.textContent = 'Card processing error. Please try again.';
    btn.textContent = 'Pay \u20AC18';
    btn.disabled = false;
  });
}

// ── CORE PAYMENT SUBMISSION ──
function submitPayment(opts, applePayEvent){
  // Generate Purchase event_id BEFORE /pay so browser + CAPI share the same ID
  purchaseEventId = 'modal_' + Date.now() + '_' + Math.random().toString(36).substr(2,9);

  var body = {
    productId: PRODUCT_ID,
    stripePaymentMethodId: opts.stripePaymentMethodId,
    firstName: opts.firstName,
    lastName: opts.lastName,
    email: opts.email,
    password: opts.password || undefined,
    phoneNumber: opts.phoneNumber || undefined,
    customerFields: {'164360': _cfLang, '164361': (document.getElementById('tm-city') || {}).value || ''},
    actualPrice: PRICE,
    fbEventId: purchaseEventId,
    fbIcEventId: null,
    fbp: getCookie('_fbp') || undefined,
    fbc: getCookie('_fbc') || undefined,
    clientIp: '',
    clientUserAgent: navigator.userAgent,
    sessionToken: sessionToken || undefined,
    attribution: getAttribution()
  };

  // Clean undefined
  Object.keys(body).forEach(function(k){ if(body[k] === undefined) delete body[k]; });

  fetch(PROXY + '/sabda-api/pay', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body)
  })
  .then(function(r){ return r.json().then(function(d){ return {ok:r.ok, data:d, status:r.status}; }); })
  .then(function(r){
    if (applePayEvent) {
      if (r.ok && r.data.success) {
        applePayEvent.complete('success');
      } else if (r.ok && r.data.clientSecret) {
        applePayEvent.complete('success');
      } else {
        applePayEvent.complete('fail');
      }
    }

    if (r.ok && r.data.clientSecret) {
      // ── 3DS REQUIRED ──
      stripe.confirmCardPayment(r.data.clientSecret).then(function(conf){
        if (conf.error) {
          showError(conf.error.message || 'Card verification failed');
          return;
        }
        // Fire CAPI Purchase after 3DS
        try {
          fetch(PROXY + '/sabda-api/capi-purchase', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
              eventName: 'Purchase',
              fbEventId: purchaseEventId,
              email: opts.email,
              firstName: opts.firstName,
              lastName: opts.lastName,
              value: PRICE,
              currency: 'EUR',
              fbp: getCookie('_fbp'),
              fbc: getCookie('_fbc'),
              clientUserAgent: navigator.userAgent,
              eventSourceUrl: window.location.href,
              attribution: getAttribution()
            })
          }).catch(function(){});
        } catch(e){}
        // Auto-enroll after 3DS if Worker stored enrollment context
        if (r.data.enrollKey) {
          try {
            fetch(PROXY + '/sabda-api/auto-enroll', {
              method: 'POST',
              headers: {'Content-Type':'application/json'},
              body: JSON.stringify({ enrollKey: r.data.enrollKey })
            }).catch(function(){});
          } catch(e){}
        }
        fireBrowserPurchase(opts.email, opts.firstName, opts.lastName);
        showSuccess();
      });
      return;
    }

    if (r.ok && r.data.success) {
      // ── SUCCESS (no 3DS) ──
      fireBrowserPurchase(opts.email, opts.firstName, opts.lastName);
      showSuccess();
      return;
    }

    // ── ERROR ──
    var msg = (r.data && r.data.error) || 'Payment failed';
    showError(msg);
  })
  .catch(function(e){
    if (applePayEvent) try { applePayEvent.complete('fail'); } catch(ex){}
    showError('Connection error. Please try again.');
  });
}

// ── BROWSER PIXEL PURCHASE EVENT ──
function fireBrowserPurchase(email, fn, ln){
  try {
    // Browser Pixel event
    if (typeof fbq === 'function') {
      fbq('track', 'Purchase', {
        value: PRICE, currency: 'EUR',
        content_name: 'Trial Class',
        content_ids: [PRODUCT_ID],
        content_type: 'product',
        checkout_variant: 'modal'
      }, { eventID: purchaseEventId });
    }
    // GA4 purchase
    if (typeof gtag === 'function') {
      gtag('event', 'purchase', {
        transaction_id: purchaseEventId,
        value: PRICE,
        currency: 'EUR',
        checkout_variant: 'modal',
        items: [{ item_name: 'Trial Class', price: PRICE, quantity: 1 }]
      });
    }
  } catch(e){}
}

// ── SUCCESS STATE ──
function showSuccess(){
  processing = false;
  var bd = document.getElementById('tm-bd');
  bd.innerHTML = '<div class="tm-success">'
    + '<svg viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="27" stroke="#02F3C5" stroke-width="2"/><path d="M17 28l7 7 15-15" stroke="#02F3C5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    + '<h3>You\u2019re in!</h3>'
    + '<p>Check your email for booking confirmation.<br>See you at the studio.</p>'
    + '<button class="tm-btn" style="margin-top:20px" onclick="SABDA_TM.close()">Done</button>'
    + '</div>';
}

// ── ERROR STATE ──
function showError(msg){
  processing = false;
  var err = document.getElementById('tm-err');
  var btn = document.getElementById('tm-pay-btn');
  if (err) {
    err.innerHTML = esc(msg) + ' <a href="https://momence.com/m/443934" target="_blank">Book on Momence &rarr;</a>';
  }
  if (btn) {
    btn.textContent = 'Pay \u20AC18';
    btn.disabled = false;
  }
}

// ── PUBLIC API ──
window.SABDA_TM = {
  close: closeModal,
  checkEmail: checkEmail,
  doLogin: doLogin,
  doMfa: doMfa,
  doRegisterPay: doRegisterPay,
  doLoggedInPay: doLoggedInPay,
  showEmailStep: showEmailStep,
  showRegisterStep: showRegisterStep,
  showLoginStep: showLoginStep
};
};
_ss.onerror = function(){ console.warn('[SABDA-TM] Stripe.js blocked'); };
document.head.appendChild(_ss);

})();
