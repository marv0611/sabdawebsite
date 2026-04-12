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

## Noindex HTML emission — Art 40, 49, 52, 54

The workflow `PERMANENT_NOINDEX_SLUGS` guard prevents the scheduled publisher from stripping noindex during auto-publish. When HTML is generated for these articles, the generator MUST emit `<meta name="robots" content="noindex,follow">` in the `<head>`. The `follow` directive preserves link equity to /classes/ and /pricing/.
