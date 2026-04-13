# Blog HTML Renderer — Build Needed

**Status:** Deferred to dedicated next session (~4 hours focused work)
**Priority:** High — blocks Phase 2A retargets reaching production HTML, blocks Phase 2B em-dash sweep + H1 rewrites

## Why this exists

Existing blog HTML files (21 published articles in `blog/*/index.html`) were rendered manually or by past LLM sessions, not by an automated MD→HTML pipeline. There is no `scripts/render.py` in this repo. As a result, every blog edit currently requires manual HTML updates per file — does not scale.

`.github/workflows/publish-articles.yml` only strips noindex tags from already-existing HTML; it does not generate HTML from MD sources.

## What needs building

`scripts/render-blog.py` — takes one or more `blog/article-XX-*.md` files, generates the corresponding `blog/SLUG/index.html` matching the existing site template.

Required behaviors:

1. **Template extraction** — reverse-engineer from 3 representative existing HTML articles (suggested: Art 02 cosas-que-hacer ES, Art 16 pilates-guia ES, Art 14 ice-bath ES). Extract common structural pattern: `<head>` boilerplate (fonts, meta, schema), `<article class="article">` wrapper, footer/nav, hreflang block.

2. **MD→HTML conversion** — Python `markdown` library with extensions: `extra` (tables, fenced code, attr_list for `{#anchor}` syntax), `toc`, `sane_lists`. Custom frontmatter parser for the inline-bold format used in this repo (`**Slug:** xxx`, `**noindex: true**`, `**Primary keyword:** xxx`, `**Meta description:** xxx`, etc — NOT YAML).

3. **Per-article schema** — generate JSON-LD `BlogPosting`: headline (from H1), description (from `**Meta description:**`), datePublished (git first-commit date for the MD), dateModified (git last-commit), author (SABDA Studio), publisher (Organization). Use existing articles' schema as template.

4. **Hreflang per article** — blog slugs differ across locales per article. Cannot reuse sitemap CLUSTERS (which only covers nav pages). Build a separate `BLOG_HREFLANG_MAP` in the renderer covering all multilingual blog clusters. ~21 mappings to construct by inspection of existing articles.

5. **noindex emission** — frontmatter `**noindex: true**` flag → emit `<meta name="robots" content="noindex,follow">` in head.

6. **Idempotency check** — after build, render Art 14 (which didn't change in Phase 2A) and diff against existing HTML. If diff is non-trivial, the renderer doesn't match the template. **This is the hardest part** — see "Open questions" below.

## Open questions for next session

### Canonicalization (a/b/c)

Existing 21 HTML articles likely have stylistic drift (different schema field orderings, different font URLs, different attribute orderings, different whitespace patterns) from being rendered by different sessions over time. There may not be a single "template" all 21 match.

Marvyn's preference (stated 2026-04-13): **option (a)** — pick cleanest existing article as canonical, render all 21 to match in one big commit. Stylistic drift is silently bad for SEO and brand. Single ugly commit fixing it is better than carrying drift forward.

Pre-build step: audit the 21 existing HTML files. Identify the cleanest one as canonical. Document why.

### Schema variation

Some articles likely have `BlogPosting`, others `Article`, `FAQPage`, `HowTo` depending on content type. Decision needed:
- (a) Auto-detect content type from MD structure (FAQ section → FAQPage, etc.)
- (b) Always emit BlogPosting + secondary schema based on detected sub-elements
- (c) Single BlogPosting schema for all blog articles

Lean toward (c) for simplicity. Sub-elements like FAQ sections within a BlogPosting are valid Schema.org.

### Hreflang per-article mapping

Blog hreflang requires a per-article cluster map. Build by reading the existing 21 HTML articles' hreflang blocks and extracting the slug clusters. Manual work but one-time. Store as Python dict in the renderer.

### Custom frontmatter format

Articles use markdown bold (`**Slug:** /blog/foo/`) instead of YAML frontmatter. Custom parser needed:
```python
def parse_frontmatter(md_content):
    """Extract **Key:** value pairs from the top of an MD file before the first ---"""
    # parse until the first --- separator
    # support **noindex: true** as a boolean flag
    # return dict
```

## Pending work that depends on this

- Phase 2A retargets (Arts 27, 39, 55) — MD updated 2026-04-13, HTML not yet generated
- Phase 2B em-dash sweep (next dedicated SEO commit, ~970 em-dashes already removed from MD on 2026-04-13 but HTML not regenerated)
- Phase 2B H1/intro injection across all retargeted articles
- Future blog publishing on the 60-day rollout schedule

## Estimated effort

4-hour focused session with diff review loop with Marvyn:
- 30 min: audit existing HTML, pick canonical, document deviations
- 60 min: build template extraction + frontmatter parser + MD render + schema gen
- 60 min: build hreflang per-article mapping (manual lookup)
- 60 min: idempotency verification loop with Art 14 baseline (likely 2-3 iteration cycles)
- 30 min: render all 10 Phase 2A articles, push, verify
