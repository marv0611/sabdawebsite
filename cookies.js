/* SABDA Cookie Consent — AEPD compliant, native, vanilla JS */
(function(){
  'use strict';
  if(window.SABDA_cookieInit)return;window.SABDA_cookieInit=true;

  var STORAGE_KEY='sabda_consent';
  var DATE_KEY='sabda_consent_date';

  function getConsent(){
    try{var v=localStorage.getItem(STORAGE_KEY);return v?JSON.parse(v):null}catch(e){return null}
  }
  function setConsent(obj){
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify(obj));
      localStorage.setItem(DATE_KEY,new Date().toISOString());
    }catch(e){}
    window.dispatchEvent(new CustomEvent('sabda:consent',{detail:obj}));
    if(obj.analytics&&typeof window.SABDA_loadAnalytics==='function')window.SABDA_loadAnalytics();
    if(obj.marketing&&typeof window.SABDA_loadMarketing==='function')window.SABDA_loadMarketing();
  }
  // Public API
  window.SABDA_getConsent=getConsent;
  window.SABDA_openCookieSettings=function(){openPanel()};

  function injectCSS(){
    if(document.getElementById('sabda-cc-css'))return;
    var css='\
.sabda-cc-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:99998;background:rgba(14,18,53,.97);backdrop-filter:saturate(1.4) blur(24px);-webkit-backdrop-filter:saturate(1.4) blur(24px);border:1px solid rgba(2,243,197,.25);border-radius:20px;padding:24px 26px;color:#F0EFE9;font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;font-size:14px;line-height:1.55;box-shadow:0 12px 60px rgba(0,0,0,.5),0 0 0 1px rgba(2,243,197,.04);max-width:880px;margin:0 auto;opacity:0;transform:translateY(20px);transition:opacity .35s cubic-bezier(.16,1,.3,1),transform .35s cubic-bezier(.16,1,.3,1)}\
.sabda-cc-banner.show{opacity:1;transform:translateY(0)}\
.sabda-cc-title{font-family:"PT Serif",Georgia,serif;font-size:1.15rem;font-weight:700;margin-bottom:8px;color:#F0EFE9;line-height:1.25}\
.sabda-cc-text{color:rgba(240,239,233,.78);margin-bottom:16px;font-size:.86rem}\
.sabda-cc-text a{color:#02F3C5;text-decoration:none;border-bottom:1px solid rgba(2,243,197,.4);padding-bottom:1px}\
.sabda-cc-text a:hover,.sabda-cc-text a:focus{opacity:.8}\
.sabda-cc-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}\
.sabda-cc-btn{flex:1;min-width:120px;padding:12px 20px;border:none;border-radius:100px;font-size:.84rem;font-weight:700;letter-spacing:.02em;cursor:pointer;font-family:"DM Sans",sans-serif;transition:transform .2s,background .2s,opacity .2s;text-align:center}\
.sabda-cc-btn:focus-visible{outline:2px solid #02F3C5;outline-offset:3px}\
.sabda-cc-accept{background:#02F3C5;color:#0e1235}\
.sabda-cc-accept:hover{background:#00ddb0;transform:translateY(-1px)}\
.sabda-cc-reject{background:rgba(240,239,233,.06);color:#F0EFE9;border:1px solid rgba(240,239,233,.16)}\
.sabda-cc-reject:hover{background:rgba(240,239,233,.1);transform:translateY(-1px)}\
.sabda-cc-customize{background:transparent;color:rgba(240,239,233,.7);padding:12px 8px;flex:0 0 auto;min-width:0;font-weight:600;text-decoration:underline;text-underline-offset:3px}\
.sabda-cc-customize:hover{color:#02F3C5}\
@media(max-width:560px){.sabda-cc-banner{left:12px;right:12px;bottom:12px;padding:20px 22px;border-radius:18px}.sabda-cc-title{font-size:1.05rem}.sabda-cc-actions{flex-direction:column;align-items:stretch}.sabda-cc-btn{flex:1 1 auto}.sabda-cc-customize{margin-top:4px}}\
.sabda-cc-overlay{position:fixed;inset:0;z-index:99999;background:rgba(14,18,53,.75);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;transition:opacity .3s}\
.sabda-cc-overlay.show{opacity:1;pointer-events:auto}\
.sabda-cc-panel{background:#0e1235;border:1px solid rgba(2,243,197,.2);border-radius:22px;max-width:520px;width:100%;max-height:88vh;overflow-y:auto;color:#F0EFE9;font-family:"DM Sans",sans-serif;font-size:14px;line-height:1.55;padding:32px 30px;transform:scale(.96);transition:transform .3s cubic-bezier(.16,1,.3,1);box-shadow:0 24px 80px rgba(0,0,0,.6)}\
.sabda-cc-overlay.show .sabda-cc-panel{transform:scale(1)}\
.sabda-cc-panel h2{font-family:"PT Serif",Georgia,serif;font-size:1.4rem;font-weight:700;margin-bottom:8px;line-height:1.2}\
.sabda-cc-panel-intro{color:rgba(240,239,233,.7);font-size:.85rem;margin-bottom:24px}\
.sabda-cc-row{padding:18px 0;border-top:1px solid rgba(240,239,233,.08);display:flex;gap:14px;align-items:flex-start}\
.sabda-cc-row:first-of-type{border-top:none;padding-top:8px}\
.sabda-cc-row-info{flex:1;min-width:0}\
.sabda-cc-row-name{font-weight:700;font-size:.92rem;color:#F0EFE9;margin-bottom:4px}\
.sabda-cc-row-desc{color:rgba(240,239,233,.62);font-size:.78rem;line-height:1.55}\
.sabda-cc-toggle{position:relative;width:44px;height:26px;flex-shrink:0;margin-top:2px}\
.sabda-cc-toggle input{opacity:0;width:0;height:0;position:absolute}\
.sabda-cc-slider{position:absolute;cursor:pointer;inset:0;background:rgba(240,239,233,.16);border-radius:26px;transition:.25s}\
.sabda-cc-slider:before{content:"";position:absolute;height:20px;width:20px;left:3px;bottom:3px;background:#F0EFE9;border-radius:50%;transition:.25s}\
.sabda-cc-toggle input:checked+.sabda-cc-slider{background:#02F3C5}\
.sabda-cc-toggle input:checked+.sabda-cc-slider:before{transform:translateX(18px);background:#0e1235}\
.sabda-cc-toggle input:disabled+.sabda-cc-slider{opacity:.55;cursor:not-allowed}\
.sabda-cc-toggle input:focus-visible+.sabda-cc-slider{outline:2px solid #02F3C5;outline-offset:3px}\
.sabda-cc-panel-actions{margin-top:24px;display:flex;gap:10px;flex-wrap:wrap}\
.sabda-cc-panel-actions .sabda-cc-btn{flex:1}\
.sabda-cc-panel-link{display:block;text-align:center;margin-top:18px;font-size:.78rem;color:rgba(240,239,233,.5);text-decoration:none}\
.sabda-cc-panel-link a{color:#02F3C5;border-bottom:1px solid rgba(2,243,197,.4);text-decoration:none}\
';
    var s=document.createElement('style');s.id='sabda-cc-css';s.textContent=css;document.head.appendChild(s);
  }

  function getRoot(){
    // Detect if we are in /m/ subfolder so links to root pages still work
    var p=location.pathname;
    if(p.indexOf('/m/')!==-1)return '../';
    if(p.match(/\/(classes|contact|faq|team-building|es|intro|experiencia-inmersiva)\//))return '../';
    if(p.match(/\/classes\/[^\/]+\//))return '../../';
    return '';
  }

  function buildBanner(){
    var root=getRoot();
    var b=document.createElement('div');
    b.className='sabda-cc-banner';b.setAttribute('role','dialog');b.setAttribute('aria-live','polite');b.setAttribute('aria-label','Cookie consent');
    b.innerHTML='<div class="sabda-cc-title">We use cookies</div>'+
      '<div class="sabda-cc-text">We use strictly necessary cookies to make this site work. With your consent, we may also use analytics and marketing cookies to understand how the site is used and improve your experience. Read our <a href="'+root+'cookies.html">Cookie Policy</a> and <a href="'+root+'privacy-policy.html">Privacy Policy</a>.</div>'+
      '<div class="sabda-cc-actions">'+
        '<button type="button" class="sabda-cc-btn sabda-cc-accept" data-act="accept">Accept all</button>'+
        '<button type="button" class="sabda-cc-btn sabda-cc-reject" data-act="reject">Reject all</button>'+
        '<button type="button" class="sabda-cc-btn sabda-cc-customize" data-act="customize">Customize</button>'+
      '</div>';
    document.body.appendChild(b);
    requestAnimationFrame(function(){b.classList.add('show')});
    b.addEventListener('click',function(e){
      var t=e.target.closest('button');if(!t)return;
      var act=t.getAttribute('data-act');
      if(act==='accept'){setConsent({necessary:true,functional:true,analytics:true,marketing:true});hideBanner(b)}
      else if(act==='reject'){setConsent({necessary:true,functional:false,analytics:false,marketing:false});hideBanner(b)}
      else if(act==='customize'){hideBanner(b);openPanel()}
    });
    return b;
  }

  function hideBanner(b){
    if(!b)return;
    b.classList.remove('show');
    setTimeout(function(){if(b&&b.parentNode)b.parentNode.removeChild(b)},400);
  }

  function openPanel(){
    var existing=document.querySelector('.sabda-cc-overlay');if(existing)return;
    var root=getRoot();
    var current=getConsent()||{necessary:true,functional:false,analytics:false,marketing:false};
    var ov=document.createElement('div');ov.className='sabda-cc-overlay';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label','Cookie preferences');
    ov.innerHTML='<div class="sabda-cc-panel">'+
      '<h2>Cookie preferences</h2>'+
      '<p class="sabda-cc-panel-intro">Choose which categories of cookies you allow. You can change these settings at any time.</p>'+
      '<div class="sabda-cc-row"><div class="sabda-cc-row-info"><div class="sabda-cc-row-name">Strictly necessary</div><div class="sabda-cc-row-desc">Required for the site to function. Cannot be disabled.</div></div><label class="sabda-cc-toggle"><input type="checkbox" checked disabled aria-label="Strictly necessary cookies (always on)"><span class="sabda-cc-slider"></span></label></div>'+
      '<div class="sabda-cc-row"><div class="sabda-cc-row-info"><div class="sabda-cc-row-name">Functional</div><div class="sabda-cc-row-desc">Remember your preferences such as language. Improves your experience.</div></div><label class="sabda-cc-toggle"><input type="checkbox" id="cc-functional"'+(current.functional?' checked':'')+' aria-label="Functional cookies"><span class="sabda-cc-slider"></span></label></div>'+
      '<div class="sabda-cc-row"><div class="sabda-cc-row-info"><div class="sabda-cc-row-name">Analytics</div><div class="sabda-cc-row-desc">Help us understand how visitors use the site so we can improve it.</div></div><label class="sabda-cc-toggle"><input type="checkbox" id="cc-analytics"'+(current.analytics?' checked':'')+' aria-label="Analytics cookies"><span class="sabda-cc-slider"></span></label></div>'+
      '<div class="sabda-cc-row"><div class="sabda-cc-row-info"><div class="sabda-cc-row-name">Marketing</div><div class="sabda-cc-row-desc">Allow us to show you relevant ads and measure their effectiveness.</div></div><label class="sabda-cc-toggle"><input type="checkbox" id="cc-marketing"'+(current.marketing?' checked':'')+' aria-label="Marketing cookies"><span class="sabda-cc-slider"></span></label></div>'+
      '<div class="sabda-cc-panel-actions">'+
        '<button type="button" class="sabda-cc-btn sabda-cc-reject" data-act="reject-panel">Reject all</button>'+
        '<button type="button" class="sabda-cc-btn sabda-cc-accept" data-act="save-panel">Save preferences</button>'+
      '</div>'+
      '<div class="sabda-cc-panel-link">Read our <a href="'+root+'cookies.html">Cookie Policy</a></div>'+
      '</div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function(){ov.classList.add('show')});
    ov.addEventListener('click',function(e){
      if(e.target===ov){closePanel(ov);return}
      var btn=e.target.closest('button');if(!btn)return;
      var act=btn.getAttribute('data-act');
      if(act==='save-panel'){
        setConsent({
          necessary:true,
          functional:document.getElementById('cc-functional').checked,
          analytics:document.getElementById('cc-analytics').checked,
          marketing:document.getElementById('cc-marketing').checked
        });
        closePanel(ov);
      }else if(act==='reject-panel'){
        setConsent({necessary:true,functional:false,analytics:false,marketing:false});
        closePanel(ov);
      }
    });
    document.addEventListener('keydown',escClose);
    function escClose(e){if(e.key==='Escape'){closePanel(ov);document.removeEventListener('keydown',escClose)}}
  }

  function closePanel(ov){
    if(!ov)return;
    ov.classList.remove('show');
    setTimeout(function(){if(ov&&ov.parentNode)ov.parentNode.removeChild(ov)},300);
  }

  function init(){
    injectCSS();
    if(getConsent()===null){
      // No consent yet — show banner
      buildBanner();
    }
    // If already consented, banner does not show. User can re-open via SABDA_openCookieSettings()
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();
