# SABDA — Quarterly Content Refresh Checklist

**Why this exists:** AI citations decay sharply once content passes roughly three months old. This is permanent maintenance, not a project. First run: late September 2026. Owner: Marvyn.

---

## THE dateModified RULE (read before touching anything)

**Only bump `dateModified` when the content actually changed.**

A structural or chrome-only pass — footer reorder, hreflang fix, nav unification, CSS change, link absolutisation — must **not** touch `dateModified` or the visible "Last updated" line. Those passes routinely sweep every file in the repo, and letting them update the date turns a real freshness signal into a meaningless one. Google's guidance warns against exactly this, and an inflated date is worse than an old one because it destroys the credibility of every other date on the site.

**Practical test before bumping:** did a reader's understanding change? New price, new fact, rewritten section, corrected claim, added statistic — yes. Everything else — no.

**How the dates got set (August 2026):** from each file's last commit date. Several articles were last touched by chrome passes, so a few dates read later than the last real content edit. Not retro-fixed by decision; the September refresh makes them genuine as each article is actually reviewed.

**Implementation note:** `dateModified` lives in two places per article and both must move together — the `Article` JSON-LD and the visible `<time datetime="...">` inside `.article-meta`. Never update one alone.

---

## EACH QUARTER

### 1. Prices — every one, everywhere
- [ ] Verify every price against **live Momence**, not memory or the last checklist
- [ ] Current reference: trial €18 · drop-in €22 · 3-pack €50 · 5-pack €85 · 10-pack €149 · Flex €99/mo · Ritual €109/mo · Immerse €130/mo · Immerse 3-month €330 · ice bath €12 single, €30 3-pack, €40 5-pack · venue hire from €350
- [ ] Check **structured data prices** too, not just visible copy. They have drifted apart before: Course schema sat at €16 while the page showed €18 for months
- [ ] Competitor prices quoted in guides: re-verify or remove. Never publish a price the article itself does not evidence

### 2. Review counts and ratings
- [ ] Re-verify the Google review count. It moves every quarter and precise numbers extract better than rounded ones
- [ ] August 2026 value: **617 reviews, 4.8 rating**
- [ ] Update visible copy **and** `aggregateRating` `ratingCount` / `reviewCount` together
- [ ] ClassPass figures are **bookings, never reviews**. Current: 20,000+ bookings

### 3. Opening hours
- [ ] Check GBP against the actual Momence schedule, not just against the site
- [ ] GBP has been materially wrong before (it claimed Saturday closed at 13:00 while classes ran to 20:45)
- [ ] Studio hours live in `openingHoursSpecification` on six files: the three homepages and the three contact pages. Café pages carry their own separate hours

### 4. Dated claims
- [ ] Search for the outgoing year and any month name in headings and meta descriptions
- [ ] Exhibition and workshop dates: confirm against what is actually programmed
- [ ] Grep both languages of every month word. September/October corrections have been missed in Catalan twice while Spanish was fixed

### 5. Top 20 pages by impressions
- [ ] Re-read each for factual drift
- [ ] Refresh statistics with current figures
- [ ] Bump `dateModified` **only** where the content genuinely changed (see rule above)

### 6. Verification before closing the pass
- [ ] Cache-busted live curl on every changed URL
- [ ] Title ≤60, description ≤155, character-counted
- [ ] Accents intact, zero em-dashes
- [ ] JSON-LD valid sitewide
- [ ] `.md` and `.html` both updated for released articles
- [ ] Desktop **and** mobile shells, all three languages

---

## STANDING TRAPS

- Language variants are separate files. A fix applied to Spanish is not applied to Catalan. Catalan is missed most often
- The mobile shells are separate documents, not a responsive view. Every content change needs doing twice
- Scoped fixes leak: a rule applied to one component while a sibling keeps the old behaviour has caused several repeat reports. Check every sibling before calling something done
- Verify at paint level, not in the markup. Content can exist in the HTML and still be invisible

---

## AUDITING RULE: greps must account for relative hrefs

Twice in one cycle an audit reported broken or missing links that were working fine, because the search looked only for absolute paths. The blog index was reported as having zero links to its 75 articles; it has 67 working anchors written as `href="pilates-barcelona-guia/"`, relative to `/blog/`. An absolute-path search returns zero and the "fix" would have been to rewrite 67 functioning links.

**Before reporting a link as missing or broken:**
- Search for both forms: `href="/blog/slug/"` **and** `href="slug/"`
- Resolve every candidate against the filesystem from the containing page's directory, not from the site root
- Open the page and count rendered anchors before concluding anything from a grep
- A page that renders links in the browser but shows none to your regex means the regex is wrong, not the page

Both this and the price-verification rule are the same underlying discipline: **verify the claim against the artefact, never against the pattern you expected to find.** Three of the consultant's prices and two of the audit's link findings failed that test and would have introduced errors had they been actioned.
