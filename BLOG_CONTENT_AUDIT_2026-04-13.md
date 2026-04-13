# SABDA Blog Content Audit — 2026-04-13 (post-Tuesday)

**Last updated:** 2026-04-14 (Tuesday session)
**Status:** Phase 2B + 2C executed. 3 writer-dependent items still pending.
**Owner:** Marvyn (dev) + SEO expert (writer spec)

---

## 1. Rendering (STAGE 1–2) ✅ COMPLETE

- **Renderer:** `scripts/render-blog.py` — MD → HTML, canonical template, BlogPosting JSON-LD
- **Total articles rendered:** 60/60 (Option A: all 40 missing + 21 existing regenerated to canonical)
- **Schema:** 60/60 have `"@type": "BlogPosting"` JSON-LD
- **Legacy ghost dir:** `/blog/agenda-barcelona/index.html` retained (no BlogPosting) — scheduled for 301 → `/blog/ocio-barcelona/` via Cloudflare (pending manual rule)

## 2. Em-dash sweep (STAGE 3) ✅ COMPLETE

- MD source: 0 em-dashes (already swept in earlier session)
- Rendered HTML: 0 em-dashes (confirmed by grep post-render)

## 3. H1 + intro keyword injection (STAGE 4) ✅ COMPLETE

Declension-tolerant audit (NFD-normalize, strip accents, sliding window for multi-word kw).

### H1 keyword status
- **39 articles:** primary keyword present in H1 (declension-tolerant) ✅
- **12 articles:** primary keyword MISSING from H1 — **flagged for writer review**, H1 not auto-rewritten (creative field):

| Art | H1 (truncated) | Primary keyword |
|---|---|---|
| 03 | Els Millors Plans a Barcelona... | que fer avui a barcelona |
| 12 | What Is Sound Healing? Everything You Need to Know... | sound healing barcelona |
| 13 | What Is Breathwork? A No-Nonsense Guide... | breathwork barcelona |
| 21 | Qué Es el Sound Healing... | cuencos tibetanos barcelona |
| 22 | Qué Es el Breathwork: Guía Sin Rodeos... | breathwork barcelona |
| 25 | Hatha Yoga vs Vinyasa: Diferencias Reales... | hatha yoga barcelona |
| 27 | Por Qué Damos Pilates Mat en SABDA... | clases de pilates barcelona |
| 31 | Cuencos Tibetanos: Qué Son, Cómo Funcionan... | cuencos tibetanos barcelona |
| 32 | Alquiler de Salas Para Eventos en Barcelona... | alquiler sala barcelona |
| 43 | Corporate Wellness in Barcelona... | corporate events barcelona |
| 50 | 12 Couples Activities in Barcelona That Beat Another Dinner... | date night barcelona |
| 59 | How to Choose a Yoga Style... | yoga barcelona |

> **Note:** 9 articles skipped (deprecated or noindex) — no H1 review needed on those.

### Intro keyword status
- **2 articles:** kw already present in first paragraph
- **49 articles:** INJECTED with lang-matched template sentence:
  - EN: `"If you're looking for {kw}, this guide covers what actually matters."`
  - ES: `"Si buscas {kw}, esta guía cubre lo que realmente importa."`
  - CA: `"Si busques {kw}, aquesta guia cobreix el que realment importa."`
- **9 articles:** skipped (deprecated/noindex)

**Report file:** `/tmp/h1-injection-report.json` (full per-article breakdown)

## 4. Polish pass (STAGE 5) ✅ partial, ⏳ 2 items writer-dependent

### Heading hierarchy (Arts 06/07/08/09) ✅ already clean
Audit ran: all 4 articles already had `##` before any `###`. No orphan H3 detected. (Likely fixed in earlier session's Art 07 H3→H2 sweep; other three were already correct.)

### Art 48 word count ✅ +12 words
Art 48 (`eventos-corporativos-barcelona`): 498 → 510 words. Added clarifying sentence to intro paragraph: "Cada esdeveniment, des de tallers a celebracions, troba aquí el seu format."

### Meta description fixes
| Art | Before | After | Status |
|---|---|---|---|
| 06 | 150 chars | 150 | Already within target (spec said "trim 2-3" but current is 150, spec listed 162 — reality was 150) |
| 08 | 149 | 149 | Already within target |
| 09 | 119 | 151 | ✅ extended |
| 13 | 149 | 149 | Already within target |
| 17 | 149 | 149 | Already within target |
| 20 | 160 | 153 | ✅ trimmed |
| 30 | 150 | 150 | Already within target |
| 44 | 113 | 145 | ✅ extended |
| 54 | — | — | Skipped (noindex) |

> **Spec mismatch:** The spec claimed many articles were at 162/161 chars but actual lengths were already 150/149. Only 3 articles needed real edits. Writer may want to re-audit against live MD state.

### Outbound links ⏳ WRITER TASK (not dev)
Per SEO spec: "Writer picks the actual source per article." Dev cannot invent authoritative sources. Left as TODO for writer:

| Art | Lang | Suggested source category |
|---|---|---|
| 06 despedida-de-soltera | ES | Visit Barcelona Tourism — group experiences |
| 07 team-building-activities | EN | Harvard Business Review / Barcelona Convention Bureau |
| 08 actividades-para-empresas | ES | INSEAD / IESE article on corporate culture |
| 32 alquiler-sala-eventos | ES | Barcelona event venue association / eventoplus.com |
| 39 ecstatic-dance-que-es | ES | NIH/PubMed — conscious dance + stress reduction |
| 48 eventos-corporativos | ES | Spain corporate events industry report |
| 55 ciencia-bienestar-inmersivo | ES | PubMed — multisensory immersion + cortisol |

(Art 49 moot — deprecation stub.)

## 5. Schema verification (STAGE 6) ✅ COMPLETE

```
$ for f in blog/*/index.html; do
    grep -q '"@type": "BlogPosting"' "$f" || echo "MISSING: $f"
  done
MISSING: blog/agenda-barcelona/index.html
```

60/60 rendered articles have BlogPosting. 1 "missing" = legacy ghost dir, scheduled for 301.

## 6. Sitemap regen (STAGE 7) ✅ COMPLETE

Sitemap regenerated via `scripts/regen-sitemap.py`. URL count maintained at 81 (43 EN + 21 ES + 17 CA).
Per-file `lastmod` updated from git.
Ready for GSC re-submit.

---

## STILL PENDING (writer follow-up)

1. **12 H1 rewrites** — writer to add primary keyword to these H1s without killing the creative voice.
2. **7 outbound link source picks** — writer picks high-authority domains from table above.
3. **Art 49 deprecation** — already handled, just confirming no more edits needed.

---

## Files referenced

- `scripts/render-blog.py` — renderer (built this session)
- `scripts/regen-sitemap.py` — sitemap generator
- `scripts/audit-membership-display.py` — booking audit (54/54 PASS, Parts A/B/C/D)
- `/tmp/h1-injection-report.json` — per-article Stage 4 results
- `/tmp/article-inventory.json` — full article metadata (lang, slug, kw, H1, noindex)

## Commit SHAs (Tuesday session)

- Renderer build + 60 HTML regen + Stage 3/4/5/6/7 — see latest commit range ending at HEAD.
