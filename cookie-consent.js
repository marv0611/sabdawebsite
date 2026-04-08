/* SABDA Cookie Consent Banner — Spanish AEPD compliant
 * Equal-prominence Accept / Reject / Customize buttons
 * Bilingual EN/ES based on localStorage.sabda_lang
 * Floating bottom-fixed, dismissible, no scroll lock
 * Stores consent in localStorage.sabda_cookie_consent
 * Re-openable via window.SABDAcookies.open()
 */
(function(){
  'use strict';
  if (window.SABDAcookies) return; // singleton

  var STORAGE_KEY = 'sabda_cookie_consent';
  var LANG_KEY = 'sabda_lang';

  var T = {
    en: {
      title: 'Your privacy, your choice',
      body: 'We use essential cookies to make this site work. With your permission, we may also use analytics and marketing cookies to understand how visitors use the site and to improve it. You can change your choice anytime.',
      accept: 'Accept all',
      reject: 'Reject all',
      customize: 'Customize',
      save: 'Save preferences',
      necessary: 'Strictly necessary',
      necessaryDesc: 'Required for the site to function. Always on.',
      analytics: 'Analytics',
      analyticsDesc: 'Anonymous usage data so we can improve the experience.',
      marketing: 'Marketing',
      marketingDesc: 'Personalized content and ad measurement on social platforms.',
      learn: 'Cookie Policy',
      always: 'Always on'
    },
    es: {
      title: 'Tu privacidad, tu elección',
      body: 'Usamos cookies esenciales para que el sitio funcione. Con tu permiso, también podemos usar cookies de análisis y marketing para entender cómo se usa el sitio y mejorarlo. Puedes cambiar tu elección en cualquier momento.',
      accept: 'Aceptar todas',
      reject: 'Rechazar todas',
      customize: 'Personalizar',
      save: 'Guardar preferencias',
      necessary: 'Estrictamente necesarias',
      necessaryDesc: 'Necesarias para que el sitio funcione. Siempre activas.',
      analytics: 'Análisis',
      analyticsDesc: 'Datos de uso anónimos para mejorar la experiencia.',
      marketing: 'Marketing',
      marketingDesc: 'Contenido personalizado y medición de anuncios en redes sociales.',
      learn: 'Política de Cookies',
      always: 'Siempre activas'
    },
    ca: {
      title: 'La teva privacitat, la teva elecció',
      body: 'Utilitzem cookies essencials perquè el lloc funcioni. Amb el teu permís, també podem utilitzar cookies d\'anàlisi i màrqueting per entendre com s\'utilitza el lloc i millorar-lo. Pots canviar la teva elecció en qualsevol moment.',
      accept: 'Acceptar totes',
      reject: 'Rebutjar totes',
      customize: 'Personalitzar',
      save: 'Desar preferències',
      necessary: 'Estrictament necessàries',
      necessaryDesc: 'Necessàries perquè el lloc funcioni. Sempre actives.',
      analytics: 'Anàlisi',
      analyticsDesc: 'Dades d\'ús anònimes per millorar l\'experiència.',
      marketing: 'Màrqueting',
      marketingDesc: 'Contingut personalitzat i mesurament d\'anuncis a xarxes socials.',
      learn: 'Política de Cookies',
      always: 'Sempre actives'
    }
  };

  function getLang(){
    try{ var l = localStorage.getItem(LANG_KEY) || 'en'; return T[l] ? l : 'en'; }
    catch(e){ return 'en'; }
  }
  function t(key){ return T[getLang()][key] || T.en[key]; }

  function getConsent(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch(e){ return null; }
  }
  function setConsent(consent){
    try{
      consent.timestamp = new Date().toISOString();
      consent.version = 1;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch(e){}
    applyConsent(consent);
  }

  function applyConsent(consent){
    // Hook for future tracking gating. When Meta Pixel/GA4 are added,
    // they should check window.SABDAcookies.consent before firing.
    window.SABDAcookies.consent = consent;
    document.dispatchEvent(new CustomEvent('sabda:consent', {detail: consent}));
  }

  function relativeBase(){
    // Determine if we're at root or subfolder so cookies.html link resolves
    var p = window.location.pathname;
    // Count slashes after /sabdawebsite/
    var idx = p.indexOf('/sabdawebsite/');
    if (idx === -1){
      // production root
      var afterRoot = p.replace(/^\//, '');
      var depth = (afterRoot.match(/\//g) || []).length;
      return depth > 0 ? '../'.repeat(depth) : '';
    }
    var rest = p.substring(idx + 14);
    var depth = (rest.match(/\//g) || []).length;
    return depth > 0 ? '../'.repeat(depth) : '';
  }

  function injectCSS(){
    if (document.getElementById('sabda-cookie-css')) return;
    var css = ''+
      '.sc-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;background:rgba(14,18,53,.96);backdrop-filter:saturate(1.5) blur(24px);-webkit-backdrop-filter:saturate(1.5) blur(24px);border:1px solid rgba(2,243,197,.22);border-radius:18px;box-shadow:0 16px 48px rgba(0,0,0,.55),0 0 0 1px rgba(2,243,197,.06);padding:22px;color:#F0EFE9;font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;opacity:0;transform:translateY(20px);transition:opacity .35s cubic-bezier(.16,1,.3,1),transform .35s cubic-bezier(.16,1,.3,1);font-size:14px;line-height:1.55}'+
      '.sc-banner.show{opacity:1;transform:translateY(0)}'+
      '.sc-title{font-family:"PT Serif",Georgia,serif;font-size:1.05rem;font-weight:700;color:#F0EFE9;margin:0 0 6px;letter-spacing:-.005em}'+
      '.sc-body{font-size:.82rem;color:rgba(240,239,233,.82);line-height:1.6;margin:0 0 14px}'+
      '.sc-body a{color:#02F3C5;border-bottom:1px solid rgba(2,243,197,.4);text-decoration:none}'+
      '.sc-body a:hover,.sc-body a:focus{opacity:.85}'+
      '.sc-row{display:flex;gap:8px;flex-wrap:wrap}'+
      '.sc-btn{flex:1;min-width:0;padding:11px 14px;border-radius:100px;font-size:.78rem;font-weight:700;font-family:inherit;letter-spacing:.01em;cursor:pointer;border:1px solid;transition:transform .15s,opacity .2s,background .2s;-webkit-tap-highlight-color:transparent;text-align:center;line-height:1;white-space:nowrap}'+
      '.sc-btn:active{transform:scale(.97)}'+
      '.sc-btn:focus-visible{outline:2px solid #02F3C5;outline-offset:2px}'+
      '.sc-btn-primary{background:#02F3C5;color:#0e1235;border-color:#02F3C5}'+
      '.sc-btn-primary:hover{background:#1efad2}'+
      '.sc-btn-secondary{background:rgba(240,239,233,.06);color:#F0EFE9;border-color:rgba(240,239,233,.22)}'+
      '.sc-btn-secondary:hover{background:rgba(240,239,233,.12);border-color:rgba(240,239,233,.4)}'+
      '.sc-btn-text{background:transparent;color:rgba(240,239,233,.7);border-color:transparent;flex:0 0 auto;padding:11px 8px}'+
      '.sc-btn-text:hover{color:#02F3C5}'+
      '.sc-categories{display:none;margin-top:14px;padding-top:14px;border-top:1px solid rgba(240,239,233,.08)}'+
      '.sc-categories.show{display:block}'+
      '.sc-cat{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid rgba(240,239,233,.06)}'+
      '.sc-cat:last-child{border-bottom:none}'+
      '.sc-cat-info{flex:1;min-width:0}'+
      '.sc-cat-name{font-size:.82rem;font-weight:700;color:#F0EFE9;margin-bottom:3px}'+
      '.sc-cat-desc{font-size:.72rem;color:rgba(240,239,233,.55);line-height:1.5}'+
      '.sc-toggle{position:relative;flex-shrink:0;width:36px;height:22px;background:rgba(240,239,233,.18);border-radius:100px;cursor:pointer;transition:background .2s;border:none;padding:0;margin-top:2px}'+
      '.sc-toggle::after{content:"";position:absolute;left:2px;top:2px;width:18px;height:18px;background:#F0EFE9;border-radius:50%;transition:transform .2s,background .2s}'+
      '.sc-toggle.on{background:#02F3C5}'+
      '.sc-toggle.on::after{transform:translateX(14px);background:#0e1235}'+
      '.sc-toggle.locked{cursor:not-allowed;opacity:.85}'+
      '.sc-toggle:focus-visible{outline:2px solid #02F3C5;outline-offset:2px}'+
      '.sc-cat-locked{font-size:.62rem;color:rgba(2,243,197,.7);font-weight:600;letter-spacing:.04em;margin-top:5px;text-transform:uppercase}'+
      '@media(max-width:480px){.sc-banner{left:10px;right:10px;bottom:10px;padding:18px;border-radius:16px}.sc-btn{font-size:.74rem;padding:11px 10px}}'+
      '@media(prefers-reduced-motion:reduce){.sc-banner{transition:none}.sc-toggle::after{transition:none}}';
    var s = document.createElement('style');
    s.id = 'sabda-cookie-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function buildBanner(){
    var base = relativeBase();
    var banner = document.createElement('div');
    banner.className = 'sc-banner';
    banner.id = 'sc-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-labelledby', 'sc-title');
    banner.setAttribute('aria-describedby', 'sc-body');
    banner.innerHTML = ''+
      '<h2 class="sc-title" id="sc-title">'+t('title')+'</h2>'+
      '<p class="sc-body" id="sc-body">'+t('body')+' <a href="'+base+'cookies.html">'+t('learn')+'</a>.</p>'+
      '<div class="sc-row">'+
        '<button type="button" class="sc-btn sc-btn-secondary" id="sc-reject">'+t('reject')+'</button>'+
        '<button type="button" class="sc-btn sc-btn-primary" id="sc-accept">'+t('accept')+'</button>'+
      '</div>'+
      '<div class="sc-row" style="margin-top:8px">'+
        '<button type="button" class="sc-btn sc-btn-text" id="sc-customize">'+t('customize')+'</button>'+
      '</div>'+
      '<div class="sc-categories" id="sc-categories">'+
        '<div class="sc-cat">'+
          '<div class="sc-cat-info">'+
            '<div class="sc-cat-name">'+t('necessary')+'</div>'+
            '<div class="sc-cat-desc">'+t('necessaryDesc')+'</div>'+
            '<div class="sc-cat-locked">'+t('always')+'</div>'+
          '</div>'+
          '<button type="button" class="sc-toggle on locked" aria-label="'+t('necessary')+'" aria-pressed="true" disabled></button>'+
        '</div>'+
        '<div class="sc-cat">'+
          '<div class="sc-cat-info">'+
            '<div class="sc-cat-name">'+t('analytics')+'</div>'+
            '<div class="sc-cat-desc">'+t('analyticsDesc')+'</div>'+
          '</div>'+
          '<button type="button" class="sc-toggle" id="sc-tog-analytics" aria-label="'+t('analytics')+'" aria-pressed="false"></button>'+
        '</div>'+
        '<div class="sc-cat">'+
          '<div class="sc-cat-info">'+
            '<div class="sc-cat-name">'+t('marketing')+'</div>'+
            '<div class="sc-cat-desc">'+t('marketingDesc')+'</div>'+
          '</div>'+
          '<button type="button" class="sc-toggle" id="sc-tog-marketing" aria-label="'+t('marketing')+'" aria-pressed="false"></button>'+
        '</div>'+
        '<div class="sc-row" style="margin-top:14px">'+
          '<button type="button" class="sc-btn sc-btn-primary" id="sc-save">'+t('save')+'</button>'+
        '</div>'+
      '</div>';

    document.body.appendChild(banner);
    requestAnimationFrame(function(){ banner.classList.add('show'); });

    var togA = false, togM = false;
    var ta = banner.querySelector('#sc-tog-analytics');
    var tm = banner.querySelector('#sc-tog-marketing');
    function toggle(btn, val, set){
      btn.classList.toggle('on', val);
      btn.setAttribute('aria-pressed', val ? 'true' : 'false');
      set(val);
    }
    ta.addEventListener('click', function(){ togA = !togA; toggle(ta, togA, function(v){togA=v;}); });
    tm.addEventListener('click', function(){ togM = !togM; toggle(tm, togM, function(v){togM=v;}); });

    banner.querySelector('#sc-accept').addEventListener('click', function(){
      setConsent({necessary:true, analytics:true, marketing:true});
      hide();
    });
    banner.querySelector('#sc-reject').addEventListener('click', function(){
      setConsent({necessary:true, analytics:false, marketing:false});
      hide();
    });
    banner.querySelector('#sc-customize').addEventListener('click', function(){
      banner.querySelector('#sc-categories').classList.toggle('show');
    });
    banner.querySelector('#sc-save').addEventListener('click', function(){
      setConsent({necessary:true, analytics:togA, marketing:togM});
      hide();
    });

    function hide(){
      banner.classList.remove('show');
      setTimeout(function(){ if (banner.parentNode) banner.parentNode.removeChild(banner); }, 400);
    }
  }

  function init(){
    injectCSS();
    var existing = getConsent();
    if (existing){
      applyConsent(existing);
      return;
    }
    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', buildBanner);
    } else {
      buildBanner();
    }
  }

  window.SABDAcookies = {
    open: function(){
      var existing = document.getElementById('sc-banner');
      if (existing) return;
      buildBanner();
    },
    get consent(){ return getConsent(); },
    set consent(v){ /* no-op for getter compat */ },
    reset: function(){
      try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
      var existing = document.getElementById('sc-banner');
      if (existing) existing.parentNode.removeChild(existing);
      buildBanner();
    }
  };

  init();
})();
