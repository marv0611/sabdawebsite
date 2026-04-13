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

### H1 keyword status (corrected after independent verification)
- **48 articles:** primary keyword present in H1 (declension-tolerant) ✅
- **3 articles** flagged for writer attention (down from initially-reported 12):

| Art | Issue | Action |
|---|---|---|
| 03 | CA H1 "Els Millors Plans a Barcelona" doesn't surface "que fer avui" — needs real CA H1 rewrite preserving creative voice | **Writer rewrite** |
| 21 | **Frontmatter/H1 mismatch**: primary_keyword="cuencos tibetanos barcelona" but article is about sound healing | **Fix frontmatter** (set primary_keyword to "sound healing barcelona") — not an H1 problem |
| 10 | False positive on initial sweep — kw "espectaculos barcelona" present in H1 with declension tolerance | No action needed |

> **Original 12-flag list was overly aggressive.** The other 9 (Arts 12, 13, 22, 25, 27, 31, 32, 43, 50, 59) all surface their primary keyword acceptably with declension/synonym tolerance — re-checked manually.

> **Note:** 9 articles separately skipped (deprecated or noindex stubs).

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

### Outbound links ⏳ WRITER TASK — re-scoped after independent verification

**Original scope (8 articles) was wrong.** Independent audit (counting articles with ZERO outbound non-SABDA, non-Momence links) flags **45 articles** missing authoritative external citations. This is a multi-week task, not a session task.

**Two paths forward — marketing decides:**

**Option A — Top-10 priority pass (~10 hours writer time)**
Focus on the 10 highest-traffic-potential articles. Add 1-2 authoritative outbound links per article. Defer the rest until traffic data justifies the effort.

Priority 10 (by Vol/mo from queue manifest):
1. Art 01 things-to-do-in-barcelona (12,100/mo)
2. Art 02 cosas-que-hacer-en-barcelona (5,400/mo)
3. Art 10 espectaculos-barcelona (5,400/mo)
4. Art 11 actividades-barcelona (4,400/mo)
5. Art 16 pilates-barcelona-guia (3,600/mo)
6. Art 15 yoga-barcelona-guia (3,600/mo)
7. Art 03 que-fer-avui-barcelona (CA, ~2,000/mo est)
8. Art 14 ice-bath-barcelona (1,900/mo)
9. Art 17 ecstatic-dance-barcelona (1,300/mo)
10. Art 12 what-is-sound-healing (900/mo)

**Option B — Full coverage as ongoing background task (~20-30 hours)**
Writer adds 1-2 outbound links per article on a rolling basis as part of weekly content review. No deadline pressure. Compound SEO authority benefit over 6-12 months.

**Suggested source categories** (writer picks specific URLs):
- Barcelona-specific: Visit Barcelona Tourism, Barcelona Convention Bureau, El Periódico, Time Out Barcelona, Catalan Tourism Board
- Wellness science: NIH/PubMed papers, peer-reviewed journals, established wellness research bodies
- Corporate/B2B: Harvard Business Review, INSEAD, IESE, Spain Convention Bureau, eventoplus.com
- Industry data: Spain wellness industry reports, corporate events industry data

Rules: high-authority domains only (.gov, .edu, established publication, industry association). No competitor sites, no Wikipedia, no link farms.

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

## STILL PENDING (writer follow-up — corrected scope)

1. **3 H1/frontmatter items** (down from 12):
   - Art 03 CA: real H1 rewrite needed
   - Art 21: fix frontmatter (primary_keyword should be "sound healing barcelona")
   - Art 10: no action (false positive)

2. **Outbound links — 45 articles missing citations** (was incorrectly scoped as 8):
   - Recommend Option A: top-10 priority pass (~10 hours writer time)
   - Or Option B: ongoing rolling task (~20-30 hours over 6-12 months)
   - Marketing decides scope

3. **Art 49 deprecation** — handled, no further action.

**Non-blocking for daily release schedule.** Article 01 publishes Tue 09:00 CET regardless. Writer items affect future articles' SEO quality but don't block the release pipeline.

---

## Files referenced

- `scripts/render-blog.py` — renderer (built this session)
- `scripts/regen-sitemap.py` — sitemap generator
- `scripts/audit-membership-display.py` — booking audit (54/54 PASS, Parts A/B/C/D)
- `/tmp/h1-injection-report.json` — per-article Stage 4 results
- `/tmp/article-inventory.json` — full article metadata (lang, slug, kw, H1, noindex)

## Commit SHAs (Tuesday session)

- Renderer build + 60 HTML regen + Stage 3/4/5/6/7 — see latest commit range ending at HEAD.
