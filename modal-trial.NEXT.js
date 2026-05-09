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

var COOKIE_NAME = 'sabda_checkout_variant_v2';
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
if (!document.querySelector('a[href="https://momence.com/m/443934"], a[href^="https://momence.com/m/443934?"], a[href^="https://momence.com/m/443934#"]')) return;

// Auto-detect language for customerFields
var _pageLang = (document.documentElement.lang || 'en').toLowerCase().substr(0,2);
var _cfLang = (_pageLang === 'es' || _pageLang === 'ca') ? 'Castellano' : 'English';

// Inject CSS
var _s = document.createElement('style');
_s.textContent = ".tm{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.75);backdrop-filter:blur(12px);display:none;align-items:center;justify-content:center;opacity:0;transition:opacity .3s}\n.tm.open{display:flex;opacity:1}\n.tm-box{width:95vw;max-width:440px;max-height:90vh;background:#131842;border:1px solid rgba(240,239,233,.12);border-radius:16px;overflow-y:auto;transform:translateY(20px);transition:transform .35s cubic-bezier(.16,1,.3,1);box-shadow:0 32px 80px rgba(0,0,0,.5)}\n.tm.open .tm-box{transform:none}\n.tm-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid rgba(240,239,233,.06);position:sticky;top:0;background:#131842;z-index:2}\n.tm-t{font-family:'PT Serif',serif;font-size:1rem;font-weight:700;color:#f0efe9}\n.tm-sub{font-size:.78rem;color:rgba(240,239,233,.6);margin-top:2px}\n.tm-x{background:none;border:1px solid rgba(240,239,233,.12);color:rgba(240,239,233,.6);width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color .25s,color .25s;flex-shrink:0}\n.tm-x:hover{border-color:rgba(240,239,233,.38);color:#f0efe9}\n.tm-x svg{width:14px;height:14px}\n.tm-bd{padding:24px}\n.tm-ft{padding:14px 24px;border-top:1px solid rgba(240,239,233,.06);text-align:center;position:sticky;bottom:0;background:#131842}\n.tm-sec{font-size:.68rem;color:rgba(240,239,233,.38);display:flex;align-items:center;justify-content:center;gap:6px}\n.tm-sec svg{width:12px;height:12px;opacity:.5}\n.tm-fb{margin-top:8px;font-size:.68rem;text-align:center}.tm-fb a{color:rgba(240,239,233,.6);text-decoration:none;transition:color .2s}.tm-fb a:hover{color:#02F3C5}.tm-fb strong{color:#02F3C5;font-weight:600}\n.tm-pkg{background:rgba(2,243,197,.05);border:1px solid rgba(2,243,197,.15);border-radius:10px;padding:14px 18px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}\n.tm-pkg-name{font-weight:600;font-size:.88rem;color:#f0efe9}.tm-pkg-desc{font-size:.75rem;color:rgba(240,239,233,.55);margin-top:2px}\n.tm-pkg-price{font-family:'PT Serif',serif;font-weight:700;font-size:1.1rem;color:#02F3C5}\n.tm .bk-label{display:block;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:rgba(240,239,233,.38);font-weight:600;margin-bottom:6px}\n.tm .bk-input{width:100%;padding:12px 14px;background:rgba(240,239,233,.04);border:1px solid rgba(240,239,233,.12);border-radius:8px;color:#f0efe9;font-family:'DM Sans',sans-serif;font-size:1rem;outline:none;transition:border-color .25s;margin-bottom:16px;box-sizing:border-box;-webkit-appearance:none}\n.tm .bk-input:focus{border-color:rgba(2,243,197,.4)}\n.tm .bk-input::placeholder{color:rgba(240,239,233,.4)}\n.tm .bk-input.err{border-color:#F8A6A3;background:rgba(248,166,163,.04)}\n.tm .bk-input:-webkit-autofill,.tm .bk-input:-webkit-autofill:hover,.tm .bk-input:-webkit-autofill:focus,.tm .bk-input:-webkit-autofill:active{-webkit-text-fill-color:#f0efe9 !important;-webkit-box-shadow:0 0 0 1000px rgba(11,18,49,1) inset !important;caret-color:#f0efe9;transition:background-color 5000s ease-in-out 0s}\n.tm-err{color:#F8A6A3;font-size:.78rem;min-height:0;margin-bottom:10px;text-align:center;line-height:1.4}\n.tm-err:empty{display:none}\n.tm-err a{color:#02F3C5;text-decoration:underline}\n.tm-btn{width:100%;padding:14px;background:#02F3C5;color:#0e1235;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:700;letter-spacing:.02em;cursor:pointer;transition:background .25s,transform .2s}\n.tm-btn:hover{background:#33f5d1;transform:translateY(-1px)}\n.tm-btn:disabled{opacity:.5;cursor:default;transform:none}\n.tm-link{display:block;text-align:center;margin-top:14px;font-size:.82rem;color:rgba(240,239,233,.6);cursor:pointer;transition:color .25s}.tm-link:hover{color:#f0efe9}\n.tm-card{background:rgba(240,239,233,.06);border:1px solid rgba(240,239,233,.12);border-radius:8px;padding:14px;margin-bottom:16px}\n.tm-card.StripeElement--focus{border-color:rgba(2,243,197,.4)}\n.tm-card.StripeElement--invalid{border-color:#F8A6A3}\n.tm-divider{display:flex;align-items:center;gap:12px;margin:16px 0;color:rgba(240,239,233,.38);font-size:.72rem;letter-spacing:.06em;text-transform:uppercase}\n.tm-divider::before,.tm-divider::after{content:'';flex:1;height:1px;background:rgba(240,239,233,.06)}\n.tm-success{text-align:center;padding:20px 0}\n.tm-success svg{width:56px;height:56px;margin-bottom:16px}\n.tm-success h3{font-family:'PT Serif',serif;font-size:1.2rem;font-weight:700;color:#f0efe9;margin-bottom:8px}\n.tm-success p{font-size:.85rem;color:rgba(240,239,233,.6);line-height:1.5}\n.tm-step{animation:tmIn .3s cubic-bezier(.16,1,.3,1)}\n@keyframes tmIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}\n@keyframes tmShake{0%,100%{transform:none}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}\n@media(max-width:860px){.tm-box{width:100vw;height:100vh;max-height:none;border-radius:0}.tm .bk-input{font-size:16px}}";
document.head.appendChild(_s);

// Inject HTML
document.body.insertAdjacentHTML('beforeend', "<div class=\"tm\" id=\"tm\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"tm-aria-title\">\n  <div class=\"tm-box\">\n    <div class=\"tm-head\">\n      <div><div class=\"tm-t\" id=\"tm-aria-title\">" + t.title + "</div><div class=\"tm-sub\">" + t.subtitle + "</div></div>\n      <button class=\"tm-x\" type=\"button\" aria-label=\"Close\" onclick=\"SABDA_TM.close()\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/></svg></button>\n    </div>\n    <div class=\"tm-bd\" id=\"tm-bd\"></div>\n    <div class=\"tm-ft\">\n      <div class=\"tm-sec\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/></svg>" + t.secure + "</div>\n      <div class=\"tm-fb\"><a href=\"https://momence.com/m/443934\" target=\"_blank\" rel=\"noopener noreferrer\">" + t.havingTrouble + " <strong>" + t.bookOnMomence + "</strong> &rarr;</a></div>\n    </div>\n  </div>\n</div>");

// ── Load Stripe.js dynamically (non-blocking) ──
var _stripeReady = false;
var _ss = document.createElement('script');
_ss.src = 'https://js.stripe.com/v3/';
_ss.onload = function(){ _stripeReady = true; };
_ss.onerror = function(){ console.warn('[SABDA-TM] Stripe.js blocked'); };
document.head.appendChild(_ss);

// ═══════════════════════════════════════════════════════════
// All modal logic below runs immediately — no dependency on Stripe.js.
// Only mountStripe() checks _stripeReady before using the Stripe global.
// ═══════════════════════════════════════════════════════════

// ── STATE ──
var stripe = null, cardEl = null, payReq = null;
var processing = false;
var purchaseEventId = null;
var sessionToken = null;
var loggedInUser = null;

// ── HELPERS ──
function esc(s){ var d=document.createElement('div'); d.textContent=s; return d.innerHTML.replace(/"/g,'&quot;'); }
function validateEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function getCookie(n){ var m=document.cookie.match('(^|;)\\s*'+n+'\\s*=\\s*([^;]+)'); return m?m.pop():''; }
function getAttribution(){ return (window._sabdaGetAttribution && window._sabdaGetAttribution()) || null; }

// ── LOCALIZATION ──
var _T = {
  en: {
    title: 'Trial Class', subtitle: 'Your first class at SABDA',
    pkgName: 'Trial Class', pkgDesc: 'One class \u00b7 No commitment',
    firstName: 'First Name', firstNamePh: 'First name',
    lastName: 'Last Name', lastNamePh: 'Last name',
    email: 'Email', emailPh: 'your@email.com',
    confirmEmail: 'Confirm Email', confirmEmailPh: 'Repeat your email',
    createPass: 'Create Password', createPassPh: 'Min. 8 characters',
    confirmPass: 'Confirm Password', confirmPassPh: 'Repeat password',
    pwdLabel: 'Password', pwdPh: 'Password',
    prefLang: 'Preferred language', langSelect: 'Select',
    phone: 'Phone number', phonePh: '612 345 678',
    city: 'City of Residence', cityPh: 'Barcelona',
    cardDetails: 'Card Details', orPayCard: 'or pay with card',
    pay18: 'Pay \u20ac18', processing: t.processing,
    cardError: t.cardError, cardProcError: t.cardProcError,
    payFailed: t.payFailed, connError: t.connError,
    connErrorLogin: 'Connection error.', verifyFailed: t.verifyFailed,
    cardVerifyFailed: t.cardVerifyFailed,
    paySysUnavailable: t.paySysUnavailable,
    fillHighlighted: t.fillHighlighted,
    emailsDontMatch: t.emailsDontMatch,
    passMin: t.passMin,
    passDontMatch: t.passDontMatch,
    ccRequired: t.ccRequired, phoneRequired: t.phoneRequired,
    langRequired: t.langRequired, cityRequired: t.cityRequired,
    aPayPassNeeded: t.aPayPassNeeded,
    emailExists: 'You already have a SABDA account.',
    signInLink: 'Sign in here',
    signInLabel: 'Already have an account? ', signInCta: 'Sign in here',
    newUserLabel: 'New to SABDA? ', newUserCta: 'Register here',
    forgotPass: 'Forgot password?',
    loginBtn: t.loginBtn, signingIn: t.signingIn,
    wrongPass: 'Wrong email or password.',
    bookOnMomence: 'Book on Momence', havingTrouble: 'Having trouble?',
    secure: 'Secure checkout via SABDA',
    enterEmailPass: t.enterEmailPass, unexpected: 'Unexpected response.',
    mfaTitle: t.mfaTitle, mfaLabel: 'Verification Code',
    mfaPh: '6-digit code', mfaBtn: t.mfaBtn, mfaVerifying: t.mfaVerifying,
    mfaInvalid: t.mfaInvalid, mfaFailed: t.mfaFailed,
    mfaEnterCode: t.mfaEnterCode,
    successTitle: 'Trial purchased!',
    successBody: 'Your trial credit is ready. Pick a class to book your first session at SABDA.',
    successCta: 'Browse Schedule', successDone: 'Done',
    bookingAs: 'Booking as'
  },
  es: {
    title: 'Clase de Prueba', subtitle: 'Tu primera clase en SABDA',
    pkgName: 'Clase de Prueba', pkgDesc: 'Una clase \u00b7 Sin compromiso',
    firstName: 'Nombre', firstNamePh: 'Nombre',
    lastName: 'Apellido', lastNamePh: 'Apellido',
    email: 'Correo electr\u00f3nico', emailPh: 'tu@correo.com',
    confirmEmail: 'Confirmar correo', confirmEmailPh: 'Repite tu correo',
    createPass: 'Crear contrase\u00f1a', createPassPh: 'M\u00edn. 8 caracteres',
    confirmPass: 'Confirmar contrase\u00f1a', confirmPassPh: 'Repite la contrase\u00f1a',
    pwdLabel: 'Contrase\u00f1a', pwdPh: 'Contrase\u00f1a',
    prefLang: 'Idioma preferido', langSelect: 'Selecciona',
    phone: 'N\u00famero de tel\u00e9fono', phonePh: '612 345 678',
    city: 'Ciudad de Residencia', cityPh: 'Barcelona',
    cardDetails: 'Datos de la tarjeta', orPayCard: 'o paga con tarjeta',
    pay18: 'Pagar \u20ac18', processing: 'Procesando...',
    cardError: 'Error de tarjeta', cardProcError: 'Error al procesar la tarjeta. Int\u00e9ntalo de nuevo.',
    payFailed: 'Pago fallido', connError: 'Error de conexi\u00f3n. Int\u00e9ntalo de nuevo.',
    connErrorLogin: 'Error de conexi\u00f3n.', verifyFailed: 'Verificaci\u00f3n fallida. Int\u00e9ntalo de nuevo.',
    cardVerifyFailed: 'Error al verificar la tarjeta',
    paySysUnavailable: 'Sistema de pago no disponible. Reserva en Momence.',
    fillHighlighted: 'Completa los campos resaltados',
    emailsDontMatch: 'Los correos no coinciden',
    passMin: 'La contrase\u00f1a debe tener al menos 8 caracteres',
    passDontMatch: 'Las contrase\u00f1as no coinciden',
    ccRequired: 'Prefijo requerido', phoneRequired: 'Tel\u00e9fono requerido',
    langRequired: 'Selecciona un idioma', cityRequired: 'Ciudad requerida',
    aPayPassNeeded: 'Crea una contrase\u00f1a (m\u00edn. 8 caracteres) antes de usar Apple Pay.',
    emailExists: 'Ya tienes una cuenta en SABDA.',
    signInLink: 'Inicia sesi\u00f3n aqu\u00ed',
    signInLabel: '\u00bfYa tienes cuenta? ', signInCta: 'Inicia sesi\u00f3n aqu\u00ed',
    newUserLabel: '\u00bfNuevo en SABDA? ', newUserCta: 'Reg\u00edstrate aqu\u00ed',
    forgotPass: '\u00bfOlvidaste tu contrase\u00f1a?',
    loginBtn: 'Iniciar sesi\u00f3n y reservar', signingIn: 'Iniciando sesi\u00f3n...',
    wrongPass: 'Correo o contrase\u00f1a incorrectos.',
    bookOnMomence: 'Reservar en Momence', havingTrouble: '\u00bfProblemas?',
    secure: 'Pago seguro v\u00eda SABDA',
    enterEmailPass: 'Introduce correo y contrase\u00f1a', unexpected: 'Respuesta inesperada.',
    mfaTitle: 'Revisa tu correo para el c\u00f3digo de verificaci\u00f3n',
    mfaLabel: 'C\u00f3digo de verificaci\u00f3n', mfaPh: 'C\u00f3digo de 6 d\u00edgitos',
    mfaBtn: 'Verificar', mfaVerifying: 'Verificando...',
    mfaInvalid: 'C\u00f3digo no v\u00e1lido', mfaFailed: 'Verificaci\u00f3n fallida.',
    mfaEnterCode: 'Introduce el c\u00f3digo',
    successTitle: '\u00a1Trial comprado!',
    successBody: 'Tu cr\u00e9dito de prueba est\u00e1 listo. Elige una clase para reservar tu primera sesi\u00f3n en SABDA.',
    successCta: 'Ver horario', successDone: 'Listo',
    bookingAs: 'Reservando como'
  },
  ca: {
    title: 'Classe de prova', subtitle: 'La teva primera classe a SABDA',
    pkgName: 'Classe de prova', pkgDesc: 'Una classe \u00b7 Sense compromisos',
    firstName: 'Nom', firstNamePh: 'Nom',
    lastName: 'Cognom', lastNamePh: 'Cognom',
    email: 'Correu electr\u00f2nic', emailPh: 'el-teu@correu.com',
    confirmEmail: 'Confirma el correu', confirmEmailPh: 'Repeteix el correu',
    createPass: 'Crea una contrasenya', createPassPh: 'M\u00edn. 8 car\u00e0cters',
    confirmPass: 'Confirma la contrasenya', confirmPassPh: 'Repeteix la contrasenya',
    pwdLabel: 'Contrasenya', pwdPh: 'Contrasenya',
    prefLang: 'Idioma preferit', langSelect: 'Selecciona',
    phone: 'N\u00famero de tel\u00e8fon', phonePh: '612 345 678',
    city: 'Ciutat de Resid\u00e8ncia', cityPh: 'Barcelona',
    cardDetails: 'Detalls de la targeta', orPayCard: 'o paga amb targeta',
    pay18: 'Paga \u20ac18', processing: 'Processant...',
    cardError: 'Error de targeta', cardProcError: 'Error processant la targeta. Torna-ho a provar.',
    payFailed: 'Pagament fallit', connError: 'Error de connexi\u00f3. Torna-ho a provar.',
    connErrorLogin: 'Error de connexi\u00f3.', verifyFailed: 'Verificaci\u00f3 fallida. Torna-ho a provar.',
    cardVerifyFailed: 'Error verificant la targeta',
    paySysUnavailable: 'Sistema de pagament no disponible. Reserva a Momence.',
    fillHighlighted: 'Omple els camps marcats',
    emailsDontMatch: 'Els correus no coincideixen',
    passMin: 'La contrasenya ha de tenir almenys 8 car\u00e0cters',
    passDontMatch: 'Les contrasenyes no coincideixen',
    ccRequired: 'Prefix requerit', phoneRequired: 'Tel\u00e8fon requerit',
    langRequired: 'Selecciona un idioma', cityRequired: 'Ciutat requerida',
    aPayPassNeeded: 'Crea una contrasenya (m\u00edn. 8 car\u00e0cters) abans d\u2019usar Apple Pay.',
    emailExists: 'Ja tens un compte a SABDA.',
    signInLink: 'Inicia sessi\u00f3 aqu\u00ed',
    signInLabel: 'Ja tens un compte? ', signInCta: 'Inicia sessi\u00f3 aqu\u00ed',
    newUserLabel: 'Nou a SABDA? ', newUserCta: 'Registra\u2019t aqu\u00ed',
    forgotPass: 'Has oblidat la contrasenya?',
    loginBtn: 'Inicia sessi\u00f3 i reserva', signingIn: 'Iniciant sessi\u00f3...',
    wrongPass: 'Correu o contrasenya incorrectes.',
    bookOnMomence: 'Reserva a Momence', havingTrouble: 'Problemes?',
    secure: 'Pagament segur via SABDA',
    enterEmailPass: 'Introdueix correu i contrasenya', unexpected: 'Resposta inesperada.',
    mfaTitle: 'Revisa el correu per al codi de verificaci\u00f3',
    mfaLabel: 'Codi de verificaci\u00f3', mfaPh: 'Codi de 6 d\u00edgits',
    mfaBtn: 'Verifica', mfaVerifying: 'Verificant...',
    mfaInvalid: 'Codi no v\u00e0lid', mfaFailed: 'Verificaci\u00f3 fallida.',
    mfaEnterCode: 'Introdueix el codi',
    successTitle: 'Trial comprat!',
    successBody: 'El teu cr\u00e8dit de prova \u00e9s a punt. Tria una classe per reservar la teva primera sessi\u00f3 a SABDA.',
    successCta: 'Veure horari', successDone: 'Fet',
    bookingAs: 'Reservant com a'
  }
};
var t = _T[_pageLang] || _T.en;
var _scheduleHref = (_pageLang==='es'?'/es/schedule.html':(_pageLang==='ca'?'/ca/schedule.html':'/schedule.html'));



// ── CUSTOMER FIELD VALIDATION ──
// Phone (cc + 6+ digits), language, city must all be filled before pay.
// Returns null if valid, or error message string.
function validateModalFields(){
  var ok = true;
  var msg = '';
  function fail(id, m){ var el=document.getElementById(id); if(el)el.classList.add('err'); if(!msg)msg=m; ok=false; }
  function clear(id){ var el=document.getElementById(id); if(el)el.classList.remove('err'); }
  ['tm-cc','tm-phone','tm-lang','tm-city'].forEach(clear);
  var cc = (document.getElementById('tm-cc')||{}).value || '';
  var phone = (document.getElementById('tm-phone')||{}).value || '';
  var lang = (document.getElementById('tm-lang')||{}).value || '';
  var city = (document.getElementById('tm-city')||{}).value || '';
  if (!/^\+\d{1,4}$/.test(cc)) fail('tm-cc', t.ccRequired);
  if (!/^\d{6,}$/.test(phone.replace(/[\s\-()]/g,''))) fail('tm-phone', t.phoneRequired);
  if (!lang) fail('tm-lang', t.langRequired);
  if (city.trim().length < 2) fail('tm-city', t.cityRequired);
  return ok ? null : (msg || t.fillHighlighted);
}

// ── INTERCEPT TRIAL CLICKS ──
document.addEventListener('click', function(e){
  if (!e.target.closest) return;
  // Exact match: only intercept the Trial product (443934), not derivatives like 4439340
  var a = e.target.closest('a[href="https://momence.com/m/443934"], a[href^="https://momence.com/m/443934?"], a[href^="https://momence.com/m/443934#"]');
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
  showGuestStep();
  try {
    var params = {value:PRICE, currency:'EUR', content_name:t.pkgName, content_ids:[PRODUCT_ID], content_type:'product'};
    var atcEid = 'atc_' + Date.now() + '_' + Math.random().toString(36).substr(2,9);
    var icEid = 'ic_' + Date.now() + '_' + Math.random().toString(36).substr(2,9);
    _sabdaFireWithCAPI('AddToCart', atcEid, params);
    _sabdaFireWithCAPI('InitiateCheckout', icEid, params);
  } catch(e){}
}

function closeModal(forceClose){
  // Don't allow close mid-payment unless forced (success / explicit cancel)
  if (processing && !forceClose) {
    // Visual feedback: shake the modal
    var box = document.querySelector('.tm-box');
    if (box) {
      box.style.animation = 'tmShake .4s';
      setTimeout(function(){ box.style.animation = ''; }, 400);
    }
    return;
  }
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
  payReq = null;
  if (mountStripe._retries) mountStripe._retries = 0;
  if (cardEl) { try { cardEl.destroy(); } catch(e){} cardEl = null; }
}

document.getElementById('tm').addEventListener('click', function(e){
  if (e.target === this && document.getElementById('tm').classList.contains('open')) closeModal();
});
document.addEventListener('keydown', function(e){
  var modal = document.getElementById('tm');
  if (!modal.classList.contains('open')) return;
  if (e.key === 'Escape') { closeModal(); return; }
  // Focus trap: cycle tabbable elements
  if (e.key === 'Tab') {
    var focusables = modal.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href]');
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || !modal.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
});

// ══════════════════════════════════════════════════════════
// STEP 1: GUEST (default) — single page, all fields visible
// ══════════════════════════════════════════════════════════
function showGuestStep(){
  var bd = document.getElementById('tm-bd');
  bd.innerHTML = '<div class="tm-step">'
    + '<div class="tm-pkg"><div><div class="tm-pkg-name">' + t.pkgName + '</div><div class="tm-pkg-desc">' + t.pkgDesc + '</div></div><div class="tm-pkg-price">&euro;18</div></div>'
    + '<div onclick="SABDA_TM.showLoginStep()" style="border:1.5px solid rgba(240,239,233,.12);border-radius:10px;padding:14px;margin-bottom:16px;font-size:.82rem;color:rgba(240,239,233,.6);text-align:center;cursor:pointer;transition:border-color .2s">' + t.signInLabel + '<span style="color:#02F3C5;font-weight:600">' + t.signInCta + ' &rarr;</span></div>'
    + '<div class="bk-label">' + t.firstName + '</div>'
    + '<input class="bk-input" id="tm-fn" type="text" placeholder="' + t.firstNamePh + '" autocomplete="given-name">'
    + '<div class="bk-label">' + t.lastName + '</div>'
    + '<input class="bk-input" id="tm-ln" type="text" placeholder="' + t.lastNamePh + '" autocomplete="family-name">'
    + '<div class="bk-label">' + t.email + '</div>'
    + '<input class="bk-input" id="tm-email" type="email" placeholder="' + t.emailPh + '" autocomplete="email">'
    + '<div class="bk-label">' + t.confirmEmail + '</div>'
    + '<input class="bk-input" id="tm-email2" type="email" placeholder="' + t.confirmEmailPh + '" autocomplete="off">'
    + '<div class="bk-label">' + t.createPass + '</div>'
    + '<input class="bk-input" id="tm-pass" type="password" placeholder="' + t.createPassPh + '" autocomplete="new-password">'
    + '<div class="bk-label">' + t.confirmPass + '</div>'
    + '<input class="bk-input" id="tm-pass2" type="password" placeholder="' + t.confirmPassPh + '" autocomplete="new-password">'
    + '<div class="bk-label">' + t.prefLang + '</div>'
    + '<select class="bk-input" id="tm-lang" style="appearance:auto;cursor:pointer">'
    + '<option value="">' + t.langSelect + '</option>'
    + '<option value="English"' + (_pageLang==='en'?' selected':'') + '>English</option>'
    + '<option value="Castellano"' + (_pageLang!=='en'?' selected':'') + '>Castellano</option>'
    + '</select>'
    + '<div class="bk-label">' + t.phone + '</div>'
    + '<div style="display:flex;gap:8px">'
    + '<input class="bk-input" id="tm-cc" type="text" value="+34" style="width:68px;flex-shrink:0;text-align:center;font-weight:600" autocomplete="tel-country-code">'
    + '<input class="bk-input" id="tm-phone" type="tel" placeholder="' + t.phonePh + '" style="flex:1" autocomplete="tel-national">'
    + '</div>'
    + '<div class="bk-label">' + t.city + '</div>'
    + '<input class="bk-input" id="tm-city" type="text" placeholder="' + t.cityPh + '" autocomplete="address-level2">'
    + '<div class="tm-divider"></div>'
    + '<div id="tm-pay-request"></div>'
    + '<div id="tm-pay-divider" class="tm-divider" style="display:none">' + t.orPayCard + '</div>'
    + '<div class="bk-label" id="tm-card-label">' + t.cardDetails + '</div>'
    + '<div class="tm-card" id="tm-card"></div>'
    + '<div class="tm-err" id="tm-err"></div>'
    + '<button class="tm-btn" id="tm-pay-btn" onclick="SABDA_TM.doGuestPay()">' + t.pay18 + '</button>'
    + '</div>';
  document.getElementById('tm-fn').focus();
  document.getElementById('tm-email').addEventListener('blur', checkEmailExists);
  mountStripe();
}

// ══════════════════════════════════════════════════════════
// STEP 2: LOGIN (returning user)
// ══════════════════════════════════════════════════════════
function showLoginStep(prefillEmail){
  if (!prefillEmail) {
    var existingEm = document.getElementById('tm-email');
    if (existingEm) prefillEmail = existingEm.value.trim();
  }
  var bd = document.getElementById('tm-bd');
  bd.innerHTML = '<div class="tm-step">'
    + '<div class="tm-pkg"><div><div class="tm-pkg-name">' + t.pkgName + '</div><div class="tm-pkg-desc">' + t.pkgDesc + '</div></div><div class="tm-pkg-price">&euro;18</div></div>'
    + '<div class="bk-label">' + t.email + '</div>'
    + '<input class="bk-input" id="tm-email" type="email" placeholder="' + t.emailPh + '" autocomplete="email">'
    + '<div class="bk-label">' + t.pwdLabel + '</div>'
    + '<input class="bk-input" id="tm-pass" type="password" placeholder="' + t.pwdPh + '" autocomplete="current-password">'
    + '<div style="text-align:right;margin:-10px 0 12px"><a href="https://momence.com/forgot-password" target="_blank" rel="noopener noreferrer" style="font-size:.75rem;color:rgba(240,239,233,.38);text-decoration:none;border-bottom:1px solid rgba(240,239,233,.12)">' + t.forgotPass + '</a></div>'
    + '<div class="tm-err" id="tm-err"></div>'
    + '<button class="tm-btn" id="tm-login-btn" onclick="SABDA_TM.doLogin()">' + t.loginBtn + '</button>'
    + '<div class="tm-link" onclick="SABDA_TM.showGuestStep()">' + t.newUserLabel + '<span style="color:#02F3C5;font-weight:600">' + t.newUserCta + '</span></div>'
    + '</div>';
  if (prefillEmail) {
    document.getElementById('tm-email').value = prefillEmail;
    document.getElementById('tm-pass').focus();
  } else {
    document.getElementById('tm-email').focus();
  }
  document.getElementById('tm-pass').addEventListener('keydown', function(e){ if(e.key==='Enter') SABDA_TM.doLogin(); });
}

function doLogin(){
  if (processing) return;
  var email = document.getElementById('tm-email').value.trim();
  var pass = document.getElementById('tm-pass').value;
  var err = document.getElementById('tm-err');
  var btn = document.getElementById('tm-login-btn');
  if (!email || !pass) { err.textContent = t.enterEmailPass; return; }
  err.textContent = '';
  processing = true;
  btn.textContent = t.signingIn;
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
      err.innerHTML = t.wrongPass + ' <a href="https://momence.com/m/443934" target="_blank">' + t.bookOnMomence + ' &rarr;</a>';
      btn.textContent = t.loginBtn;
      btn.disabled = false;
      return;
    }
    if (r.data.mfaRequired) {
      showMfaStep(r.data.mfaToken, email);
      return;
    }
    var d = r.data;
    if (!d || !d.user) { err.innerHTML = t.unexpected + ' <a href="https://momence.com/m/443934" target="_blank">' + t.bookOnMomence + ' &rarr;</a>'; btn.textContent=t.loginBtn; btn.disabled=false; return; }
    loggedInUser = { email: d.user.email || email, firstName: d.user.firstName || email.split('@')[0], lastName: d.user.lastName || '' };
    sessionToken = d.sessionToken;
    showPaymentStep();
  })
  .catch(function(e){
    processing = false;
    err.innerHTML = t.connErrorLogin + ' <a href="https://momence.com/m/443934" target="_blank">' + t.bookOnMomence + ' &rarr;</a>';
    btn.textContent = t.loginBtn;
    btn.disabled = false;
  });
}

// ── MFA ──
function showMfaStep(mfaToken, email){
  var bd = document.getElementById('tm-bd');
  bd.innerHTML = '<div class="tm-step">'
    + '<div style="text-align:center;margin-bottom:20px"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#02F3C5" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>'
    + '<div style="font-size:.88rem;color:rgba(240,239,233,.8);text-align:center;margin-bottom:20px;line-height:1.5">Check your email for a verification code</div>'
    + '<div class="bk-label">' + t.mfaLabel + '</div>'
    + '<input class="bk-input" id="tm-mfa" type="text" placeholder="' + t.mfaPh + '" autocomplete="one-time-code" inputmode="numeric" maxlength="6" style="text-align:center;font-size:1.2rem;letter-spacing:.3em">'
    + '<div class="tm-err" id="tm-err"></div>'
    + '<button class="tm-btn" id="tm-mfa-btn" onclick="SABDA_TM.doMfa()">' + t.mfaBtn + '</button>'
    + '</div>';
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
  if (!code) { err.textContent = t.mfaEnterCode; return; }
  err.textContent = '';
  processing = true;
  btn.textContent = t.mfaVerifying;
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
      err.textContent = r.data.error || t.mfaInvalid;
      btn.textContent = t.mfaBtn;
      btn.disabled = false;
      return;
    }
    if (!r.data || !r.data.user) { err.textContent = t.mfaFailed; btn.textContent=t.mfaBtn; btn.disabled=false; return; }
    loggedInUser = { email: r.data.user.email || email, firstName: r.data.user.firstName || email.split('@')[0], lastName: r.data.user.lastName || '' };
    sessionToken = r.data.sessionToken;
    showPaymentStep();
  })
  .catch(function(e){
    processing = false;
    err.textContent = t.connErrorLogin;
    btn.textContent = t.mfaBtn;
    btn.disabled = false;
  });
}

// ══════════════════════════════════════════════════════════
// STEP 3: PAYMENT (logged-in user — card only, single page)
// ══════════════════════════════════════════════════════════
function showPaymentStep(){
  var bd = document.getElementById('tm-bd');
  bd.innerHTML = '<div class="tm-step">'
    + '<div class="tm-pkg"><div><div class="tm-pkg-name">' + t.pkgName + '</div><div class="tm-pkg-desc">' + t.pkgDesc + '</div></div><div class="tm-pkg-price">&euro;18</div></div>'
    + '<div style="font-size:.82rem;color:rgba(240,239,233,.6);margin-bottom:16px;text-align:center">' + t.bookingAs + ' <strong style="color:#f0efe9">' + esc(loggedInUser.firstName || loggedInUser.email) + (loggedInUser.lastName ? ' ' + esc(loggedInUser.lastName) : '') + '</strong></div>'
    + '<div class="bk-label">' + t.prefLang + '</div>'
    + '<select class="bk-input" id="tm-lang" style="appearance:auto;cursor:pointer">'
    + '<option value="">' + t.langSelect + '</option>'
    + '<option value="English"' + (_pageLang==='en'?' selected':'') + '>English</option>'
    + '<option value="Castellano"' + (_pageLang!=='en'?' selected':'') + '>Castellano</option>'
    + '</select>'
    + '<div class="bk-label">' + t.phone + '</div>'
    + '<div style="display:flex;gap:8px">'
    + '<input class="bk-input" id="tm-cc" type="text" value="+34" style="width:68px;flex-shrink:0;text-align:center;font-weight:600" autocomplete="tel-country-code">'
    + '<input class="bk-input" id="tm-phone" type="tel" placeholder="' + t.phonePh + '" style="flex:1" autocomplete="tel-national">'
    + '</div>'
    + '<div class="bk-label">' + t.city + '</div>'
    + '<input class="bk-input" id="tm-city" type="text" placeholder="' + t.cityPh + '" autocomplete="address-level2">'
    + '<div id="tm-pay-request"></div>'
    + '<div id="tm-pay-divider" class="tm-divider" style="display:none">' + t.orPayCard + '</div>'
    + '<div class="bk-label">' + t.cardDetails + '</div>'
    + '<div class="tm-card" id="tm-card"></div>'
    + '<div class="tm-err" id="tm-err"></div>'
    + '<button class="tm-btn" id="tm-pay-btn" onclick="SABDA_TM.doLoggedInPay()">' + t.pay18 + '</button>'
    + '</div>';
  mountStripe();
}

// ── STRIPE ELEMENTS ──
function mountStripe(){
  if (!_stripeReady || typeof Stripe === 'undefined') {
    if (!mountStripe._retries) mountStripe._retries = 0;
    if (mountStripe._retries++ < 10) {
      setTimeout(function(){ mountStripe(); }, 500);
      return;
    }
    showError(t.paySysUnavailable);
    return;
  }
  mountStripe._retries = 0;
  if (!stripe) {
    try { stripe = Stripe(STRIPE_PK, { stripeAccount: STRIPE_ACCT }); }
    catch(e) { showError(t.paySysUnavailable); return; }
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
      total: { label: 'SABDA Studio \u2014 ' + t.pkgName, amount: PRICE * 100 },
      requestPayerEmail: true, requestPayerName: true
    });
    var prBtn = elements.create('paymentRequestButton', { paymentRequest: payReq, style: { paymentRequestButton: { theme:'light', height:'44px' } } });
    payReq.canMakePayment().then(function(result){
      if (result) {
        var prWrap = document.getElementById('tm-pay-request');
        if (prWrap) { prBtn.mount('#tm-pay-request'); }
        var divider = document.getElementById('tm-pay-divider');
        if (divider) divider.style.display = '';
      }
    });
    payReq.on('paymentmethod', function(ev){
      // Validate phone/language/city BEFORE accepting Apple Pay
      var fieldErr = validateModalFields();
      if (fieldErr) {
        ev.complete('fail');
        var errEl = document.getElementById('tm-err');
        if (errEl) errEl.textContent = fieldErr;
        return;
      }
      // Read name/email from Apple Pay, password from form (if guest step)
      var _fn = (ev.payerName || '').split(' ')[0] || (loggedInUser ? loggedInUser.firstName : '');
      var _ln = (ev.payerName || '').split(' ').slice(1).join(' ') || (loggedInUser ? loggedInUser.lastName : '');
      var _em = ev.payerEmail || (loggedInUser ? loggedInUser.email : '');
      var _pw = (document.getElementById('tm-pass') || {}).value || '';
      // For new users (guest step), require password (account creation needs it)
      var _isGuest = !loggedInUser;
      if (_isGuest && (!_pw || _pw.length < 8)) {
        ev.complete('fail');
        var errEl2 = document.getElementById('tm-err');
        if (errEl2) errEl2.textContent = t.aPayPassNeeded;
        var pe = document.getElementById('tm-pass'); if (pe) pe.classList.add('err');
        return;
      }
      submitPayment({
        stripePaymentMethodId: ev.paymentMethod.id,
        email: _em, firstName: _fn, lastName: _ln,
        password: _pw || undefined
      }, ev);
    });
  } catch(e){}
}

// ══════════════════════════════════════════════════════════
// PAYMENT HANDLERS
// ══════════════════════════════════════════════════════════


// ── EMAIL EXISTS PRE-FLIGHT (guest step) ──
var _emailCheckCache = {};  // email → {exists, ts}
var _emailCheckInFlight = null;

function checkEmailExists(){
  var emInput = document.getElementById('tm-email');
  if (!emInput) return;
  var em = emInput.value.trim();
  if (!em || !validateEmail(em)) return;
  var noticeId = 'tm-email-exists-notice';
  var existing = document.getElementById(noticeId);
  if (existing) existing.remove();
  _emailCheckInFlight = em;
  fetch(PROXY + '/sabda-api/check-email', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ email: em })
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    _emailCheckInFlight = null;
    _emailCheckCache[em] = { exists: !!(d && d.exists), ts: Date.now() };
    if (d && d.exists) {
      var prevEm = emInput.value.trim();
      if (prevEm !== em) return;
      var notice = document.createElement('div');
      notice.id = noticeId;
      notice.style.cssText = 'background:rgba(2,243,197,.08);border:1px solid rgba(2,243,197,.25);border-radius:8px;padding:10px 12px;margin:-10px 0 16px;font-size:.78rem;color:rgba(240,239,233,.85);line-height:1.5';
      notice.innerHTML = t.emailExists + ' <a href="javascript:SABDA_TM.showLoginStep()" style="color:#02F3C5;font-weight:600;text-decoration:underline">' + t.signInLink + ' &rarr;</a>';
      var emConfirm = document.getElementById('tm-email2');
      if (emConfirm && emConfirm.parentNode) {
        var lbl = emConfirm.previousElementSibling;
        if (lbl) lbl.parentNode.insertBefore(notice, lbl);
      }
    }
  })
  .catch(function(){ _emailCheckInFlight = null; });
}

// Synchronous email-exists guard for doGuestPay — uses cached result.
// If no cached result and check is in-flight, queue submit and resume after.
function emailExistsSync(em){
  if (!em) return null;
  if (_emailCheckCache[em]) return _emailCheckCache[em].exists;
  return null;  // unknown
}

function doGuestPay(){
  if (processing) return;
  var fn = document.getElementById('tm-fn').value.trim();
  var ln = document.getElementById('tm-ln').value.trim();
  var email = document.getElementById('tm-email').value.trim();
  var email2 = document.getElementById('tm-email2').value.trim();
  var pass = document.getElementById('tm-pass').value;
  var pass2 = document.getElementById('tm-pass2').value;
  var err = document.getElementById('tm-err');
  var btn = document.getElementById('tm-pay-btn');

  var fields = ['tm-fn','tm-ln','tm-email','tm-email2','tm-pass','tm-pass2'];
  fields.forEach(function(id){ document.getElementById(id).classList.remove('err'); });
  var ok = true;
  if (!fn) { document.getElementById('tm-fn').classList.add('err'); ok=false; }
  if (!ln) { document.getElementById('tm-ln').classList.add('err'); ok=false; }
  if (!email || !validateEmail(email)) { document.getElementById('tm-email').classList.add('err'); ok=false; }
  if (email !== email2) { document.getElementById('tm-email2').classList.add('err'); err.textContent=t.emailsDontMatch; if(ok) ok=false; }
  if (!pass || pass.length < 8) { document.getElementById('tm-pass').classList.add('err'); if(!err.textContent) err.textContent=t.passMin; ok=false; }
  if (pass !== pass2) { document.getElementById('tm-pass2').classList.add('err'); err.textContent=t.passDontMatch; ok=false; }
  if (!ok) { if(!err.textContent) err.textContent=t.fillHighlighted; return; }

  // Validate phone, language, city
  var fieldErr = validateModalFields();
  if (fieldErr) { err.textContent = fieldErr; return; }

  // Re-check email-exists (guard against race: user clicked Pay before blur fetch returned)
  var existsResult = emailExistsSync(email);
  if (existsResult === true) {
    // Confirmed: account exists. Surface the existing-email notice and switch to login.
    err.textContent = '';
    showLoginStep(email);
    return;
  }
  if (existsResult === null && _emailCheckInFlight === email) {
    // Check is in-flight; wait briefly then retry submit.
    err.textContent = '';
    btn.textContent = t.processing;
    btn.disabled = true;
    setTimeout(function(){ btn.disabled = false; doGuestPay(); }, 400);
    return;
  }
  if (existsResult === null) {
    // No check yet (user submitted before blur). Fire one synchronously, then retry.
    btn.textContent = t.processing;
    btn.disabled = true;
    fetch(PROXY + '/sabda-api/check-email', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email: email })
    }).then(function(r){ return r.json(); }).then(function(d){
      _emailCheckCache[email] = { exists: !!(d && d.exists), ts: Date.now() };
      btn.disabled = false;
      doGuestPay();
    }).catch(function(){
      // Network error on check — proceed and let Worker handle it.
      btn.disabled = false;
      _emailCheckCache[email] = { exists: false, ts: Date.now() };
      doGuestPay();
    });
    return;
  }

  err.textContent = '';
  processing = true;
  btn.textContent = t.processing;
  btn.disabled = true;

  stripe.createPaymentMethod({
    type: 'card', card: cardEl,
    billing_details: { name: fn + ' ' + ln, email: email }
  }).then(function(result){
    if (result.error) {
      processing = false;
      err.textContent = result.error.message || t.cardError;
      btn.textContent = t.pay18;
      btn.disabled = false;
      return;
    }
    submitPayment({
      stripePaymentMethodId: result.paymentMethod.id,
      email: email, firstName: fn, lastName: ln, password: pass
    });
  }).catch(function(e){
    processing = false;
    err.textContent = t.cardProcError;
    btn.textContent = t.pay18;
    btn.disabled = false;
  });
}

function doLoggedInPay(){
  if (processing) return;
  var err = document.getElementById('tm-err');
  var btn = document.getElementById('tm-pay-btn');

  // Validate phone, language, city
  var fieldErr = validateModalFields();
  if (fieldErr) { err.textContent = fieldErr; return; }

  err.textContent = '';
  processing = true;
  btn.textContent = t.processing;
  btn.disabled = true;

  stripe.createPaymentMethod({
    type: 'card', card: cardEl,
    billing_details: { name: ((loggedInUser.firstName || '') + ' ' + (loggedInUser.lastName || '')).trim() || loggedInUser.email, email: loggedInUser.email }
  }).then(function(result){
    if (result.error) {
      processing = false;
      err.textContent = result.error.message || t.cardError;
      btn.textContent = t.pay18;
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
    err.textContent = t.cardProcError;
    btn.textContent = t.pay18;
    btn.disabled = false;
  });
}

// ── CORE PAYMENT ──
function submitPayment(opts, applePayEvent){
  purchaseEventId = 'modal_' + Date.now() + '_' + Math.random().toString(36).substr(2,9);

  var body = {
    productId: PRODUCT_ID,
    stripePaymentMethodId: opts.stripePaymentMethodId,
    firstName: opts.firstName,
    lastName: opts.lastName,
    email: opts.email,
    password: opts.password || undefined,
    phoneNumber: (function(){
      var cc = (document.getElementById('tm-cc')||{}).value || '';
      var ph = ((document.getElementById('tm-phone')||{}).value || '').replace(/\s/g,'');
      if (!ph || ph.length < 6) return undefined;
      if (!cc.startsWith('+')) cc = '+' + cc;
      return cc + ph;
    })(),
    customerFields: {'164360': (document.getElementById('tm-lang') || {}).value || _cfLang, '164361': (document.getElementById('tm-city') || {}).value || ''},
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
  Object.keys(body).forEach(function(k){ if(body[k] === undefined) delete body[k]; });

  fetch(PROXY + '/sabda-api/pay', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body)
  })
  .then(function(r){ return r.json().then(function(d){ return {ok:r.ok, data:d, status:r.status}; }); })
  .then(function(r){
    if (applePayEvent) {
      if (r.ok && r.data.success) { applePayEvent.complete('success'); }
      else if (r.ok && r.data.clientSecret) { applePayEvent.complete('success'); }
      else { applePayEvent.complete('fail'); }
    }

    if (r.ok && r.data.clientSecret) {
      stripe.confirmCardPayment(r.data.clientSecret).then(function(conf){
        if (conf.error) { showError(conf.error.message || t.cardVerifyFailed); return; }
        try {
          fetch(PROXY + '/sabda-api/capi-purchase', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
              eventName: 'Purchase', fbEventId: purchaseEventId,
              email: opts.email, firstName: opts.firstName, lastName: opts.lastName,
              value: PRICE, currency: 'EUR',
              fbp: getCookie('_fbp'), fbc: getCookie('_fbc'),
              clientUserAgent: navigator.userAgent,
              eventSourceUrl: window.location.href,
              attribution: getAttribution()
            })
          }).catch(function(){});
        } catch(e){}
        if (r.data.enrollKey) {
          try { fetch(PROXY + '/sabda-api/auto-enroll', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({enrollKey:r.data.enrollKey}) }).catch(function(){}); } catch(e){}
        }
        fireBrowserPurchase(opts.email, opts.firstName, opts.lastName);
        showSuccess();
      }).catch(function(e){
        showError(t.verifyFailed);
      });
      return;
    }

    if (r.ok && r.data.success) {
      fireBrowserPurchase(opts.email, opts.firstName, opts.lastName);
      showSuccess();
      return;
    }

    var msg = (r.data && r.data.error) || t.payFailed;
    showError(msg);
  })
  .catch(function(e){
    if (applePayEvent) try { applePayEvent.complete('fail'); } catch(ex){}
    showError(t.connError);
  });
}

function fireBrowserPurchase(email, fn, ln){
  try {
    if (typeof fbq === 'function') {
      fbq('track', 'Purchase', {
        value: PRICE, currency: 'EUR', content_name: 'Trial Class',
        content_ids: [PRODUCT_ID], content_type: 'product',
        checkout_variant: 'modal'
      }, { eventID: purchaseEventId });
    }
    if (typeof gtag === 'function') {
      gtag('event', 'purchase', {
        transaction_id: purchaseEventId, value: PRICE, currency: 'EUR',
        checkout_variant: 'modal',
        items: [{ item_name: 'Trial Class', price: PRICE, quantity: 1 }]
      });
    }
  } catch(e){}
}

function showSuccess(){
  processing = false;
  var bd = document.getElementById('tm-bd');
  bd.innerHTML = '<div class="tm-success">'
    + '<svg viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="27" stroke="#02F3C5" stroke-width="2"/><path d="M17 28l7 7 15-15" stroke="#02F3C5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    + '<h3>' + t.successTitle + '</h3>'
    + '<p>' + t.successBody + '</p>'
    + '<button class="tm-btn" style="margin-top:20px" onclick="SABDA_TM.goSchedule()">' + t.successCta + '</button>'
    + '<button class="tm-btn" style="margin-top:10px;background:transparent;color:rgba(240,239,233,.6);border:1px solid rgba(240,239,233,.12)" onclick="SABDA_TM.forceClose()">' + t.successDone + '</button>'
    + '</div>';
}

function goSchedule(){
  closeModal(true);
  setTimeout(function(){ window.location.href = _scheduleHref; }, 100);
}

function showError(msg){
  processing = false;
  var err = document.getElementById('tm-err');
  var btn = document.getElementById('tm-pay-btn');
  if (err) { err.innerHTML = esc(msg) + ' <a href="https://momence.com/m/443934" target="_blank">Book on Momence &rarr;</a>'; }
  if (btn) { btn.textContent = t.pay18; btn.disabled = false; }
}


// ── PUBLIC API ──
window.SABDA_TM = {
  close: closeModal,
  forceClose: function(){ closeModal(true); },
  showGuestStep: showGuestStep,
  showLoginStep: showLoginStep,
  doGuestPay: doGuestPay,
  doLoggedInPay: doLoggedInPay,
  doLogin: doLogin,
  doMfa: doMfa,
  goSchedule: goSchedule
};

})();
