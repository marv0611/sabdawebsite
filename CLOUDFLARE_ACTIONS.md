# Cloudflare Actions Required Post-Deploy

## Art 49 Hen Party → Art 06 Despedida de Soltera (301)

**When:** Immediately after Phase 1 SEO patch is deployed.
**Where:** Cloudflare dashboard → Rules → Redirect Rules → sabdastudio.com zone.

Expression:
(http.host eq "sabdastudio.com" and http.request.uri.path eq "/blog/hen-party-barcelona/") or (http.host eq "sabdastudio.com" and http.request.uri.path eq "/blog/hen-party-barcelona")

Action: Static redirect
Target: https://sabdastudio.com/blog/despedida-de-soltera-barcelona/
Status: 301 (Permanent). Preserve query string: Yes.

Verify: `curl -I https://sabdastudio.com/blog/hen-party-barcelona/` returns HTTP/2 301 with correct Location header.

After 301 is live: remove `<meta http-equiv="refresh">` from Art 49 stub. Keep the `<link rel="canonical">`.

## Noindex HTML emission — Art 40, 49, 52, 53, 54, 58

The workflow `PERMANENT_NOINDEX_SLUGS` guard prevents the scheduled publisher from stripping noindex during auto-publish. When HTML is generated for these articles, the generator MUST emit `<meta name="robots" content="noindex,follow">` in the `<head>`. The `follow` directive preserves link equity to /classes/ and /pricing/.

## Art 54 First Time SABDA -> Art 66 Your First Class at SABDA (301)

**When:** Immediately. Article 66 is the rewritten/expanded replacement and is scheduled to publish organically (2026-07-02 in `blog-release-queue.json`). Art 54 stub has been rewritten to `[DEPRECATED]` with meta-refresh + canonical pointing at Art 66 — 301 is needed to hand off all existing ranking/backlink signal.

Expression:
(http.host eq "sabdastudio.com" and http.request.uri.path eq "/blog/first-time-sabda/") or (http.host eq "sabdastudio.com" and http.request.uri.path eq "/blog/first-time-sabda")

Action: Static redirect
Target: https://sabdastudio.com/blog/your-first-class-at-sabda/
Status: 301. Preserve query string: Yes.

Verify: `curl -I https://sabdastudio.com/blog/first-time-sabda/` returns HTTP/2 301 with correct Location header.

After 301 is live: remove `<meta http-equiv="refresh">` from Art 54 stub. Keep the `<link rel="canonical">`.

## Phase 2A: Art 45 Planes Gratis -> Art 02 #planes-gratis (301)

Expression:
(http.host eq "sabdastudio.com" and http.request.uri.path eq "/blog/planes-barcelona-gratis/") or (http.host eq "sabdastudio.com" and http.request.uri.path eq "/blog/planes-barcelona-gratis")

Action: Static redirect
Target: https://sabdastudio.com/blog/cosas-que-hacer-en-barcelona/#planes-gratis
Status: 301. Preserve query string: Yes.

## Phase 2A: Art 47 Lluvia -> Art 02 #planes-lluvia (301)

Expression:
(http.host eq "sabdastudio.com" and http.request.uri.path eq "/blog/que-hacer-barcelona-lluvia/") or (http.host eq "sabdastudio.com" and http.request.uri.path eq "/blog/que-hacer-barcelona-lluvia")

Action: Static redirect
Target: https://sabdastudio.com/blog/cosas-que-hacer-en-barcelona/#planes-lluvia
Status: 301. Preserve query string: Yes.

## Phase 2A: Art 56 Pilates Espalda -> Art 16 #pilates-espalda (301)

Expression:
(http.host eq "sabdastudio.com" and http.request.uri.path eq "/blog/pilates-dolor-espalda/") or (http.host eq "sabdastudio.com" and http.request.uri.path eq "/blog/pilates-dolor-espalda")

Action: Static redirect
Target: https://sabdastudio.com/blog/pilates-barcelona-guia/#pilates-espalda
Status: 301. Preserve query string: Yes.

## 301 Redirect: agenda-barcelona → ocio-barcelona

**Source URL pattern:** `https://sabdastudio.com/blog/agenda-barcelona/*`
**Destination URL:** `https://sabdastudio.com/blog/ocio-barcelona/`
**Status:** 301
**Reason:** Ghost directory removed from repo (Tuesday session). Was thin orphan HTML
that hurt site quality. /blog/ocio-barcelona/ is the canonical replacement.

To configure (Cloudflare Dashboard → Rules → Redirect Rules):
- Field: URI Path
- Operator: starts with
- Value: /blog/agenda-barcelona/
- Static URL redirect: https://sabdastudio.com/blog/ocio-barcelona/
- Status: 301
- Preserve query string: Yes

> **API attempted, requires manual:** The Page Rules API token doesn't have
> Rulesets:Edit scope. Marvyn needs to add this rule manually via Dashboard:
> Cloudflare → sabdastudio.com → Rules → Redirect Rules → Create rule.
> Free plan allows ~10 dynamic redirects (separate from the 3 Page Rules quota).
