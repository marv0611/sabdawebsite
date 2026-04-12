// SABDA language router — reads Accept-Language and redirects unlocalized entry points
// to /es/ or /ca/ for matching browsers. English is the default.

const LOCALIZED_PREFIXES = ['/es/', '/ca/'];

// Entry points that should auto-route. Other paths pass through unchanged.
const ENTRY_REDIRECTS = {
  '/':               { es: '/es/',               ca: '/ca/' },
  '/intro':          { es: '/es/intro/',         ca: '/ca/intro/' },
  '/intro/':         { es: '/es/intro/',         ca: '/ca/intro/' },
  '/m/intro.html':   { es: '/es/m/intro.html',   ca: '/ca/m/intro.html' },
};

function pickLocale(acceptLang) {
  if (!acceptLang) return null;
  // Parse Accept-Language: "ca,es;q=0.9,en;q=0.8"
  const prefs = acceptLang.split(',').map(tok => {
    const [code, qStr] = tok.trim().split(';q=');
    return { code: code.trim().toLowerCase(), q: parseFloat(qStr) || 1.0 };
  }).sort((a, b) => b.q - a.q);

  for (const p of prefs) {
    if (p.code.startsWith('ca')) return 'ca';
    if (p.code.startsWith('es')) return 'es';
    if (p.code.startsWith('en')) return 'en';
  }
  return null;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Pass through if path isn't an entry point
    const targets = ENTRY_REDIRECTS[path];
    if (!targets) return fetch(request);

    // Pass through if user explicitly opted out
    if (url.searchParams.get('nolang') === '1') return fetch(request);

    // Pass through if user has a stored preference cookie
    const cookie = request.headers.get('cookie') || '';
    const savedMatch = cookie.match(/sabda_lang=([a-z]{2})/);
    if (savedMatch) {
      const saved = savedMatch[1];
      if (saved === 'en') return fetch(request);
      if (targets[saved]) {
        return Response.redirect(url.origin + targets[saved] + url.search, 302);
      }
      return fetch(request);
    }

    // Read Accept-Language and pick locale
    const locale = pickLocale(request.headers.get('accept-language'));
    if (locale === 'en' || locale === null) return fetch(request);
    if (targets[locale]) {
      return Response.redirect(url.origin + targets[locale] + url.search, 302);
    }
    return fetch(request);
  }
};
