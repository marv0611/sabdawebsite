#!/usr/bin/env python3
"""
Daily blog release script.

Reads blog-release-queue.json → finds article with today's release_date OR
force_slug from workflow input → flips its HTML from noindex to index,follow
→ adds its URL back to sitemap.xml → marks queue entry as 'released'.

Run by .github/workflows/blog-daily-release.yml on cron schedule.
Can also be run manually for testing/dispatch.
"""
import json, re, os, sys
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
os.chdir(REPO)

QUEUE_PATH = 'blog-release-queue.json'
SITEMAP_PATH = 'sitemap.xml'

def main():
    queue_data = json.load(open(QUEUE_PATH))
    queue = queue_data['queue']
    
    today = date.today().isoformat()
    force_slug = os.environ.get('FORCE_SLUG', '').strip()
    
    # Find target article
    target = None
    if force_slug:
        for q in queue:
            if q['slug'] == force_slug and q['status'] == 'queued':
                target = q
                print(f'Force-releasing: {force_slug}')
                break
        if not target:
            print(f'No queued article matches force_slug={force_slug}')
            sys.exit(0)
    else:
        # Catch-up logic: pick EARLIEST queued article whose release_date <= today.
        # The queue is already sorted by order/release_date, so iterating in queue
        # order naturally returns the oldest-overdue first. If GH Actions misses a
        # day (outage, rate limit), the next successful run releases the missed
        # article instead of skipping it forever.
        for q in queue:
            if q['release_date'] <= today and q['status'] == 'queued':
                target = q
                if q['release_date'] == today:
                    print(f'Today release ({today}): {q["slug"]}')
                else:
                    print(f'Catch-up release (scheduled {q["release_date"]}, today {today}): {q["slug"]}')
                break
        if not target:
            print(f'No article scheduled for {today}')
            sys.exit(0)
    
    # ─── 1. Flip HTML noindex → index,follow ───
    html_path = target['html_file']
    if not os.path.exists(html_path):
        print(f'ERROR: HTML file not found: {html_path}')
        sys.exit(1)
    
    s = open(html_path).read()
    m = re.search(r'<meta name="robots" content="([^"]+)">', s)
    if not m:
        print(f'ERROR: No robots meta in {html_path}')
        sys.exit(1)
    
    current = m.group(1)
    if 'noindex' not in current:
        print(f'WARNING: {html_path} already indexable ({current}). Skipping HTML flip.')
    else:
        # Replace noindex with index, add max-image-preview if missing
        new = current.replace('noindex', 'index')
        if 'max-image-preview' not in new:
            new = new + ',max-image-preview:large'
        new_meta = f'<meta name="robots" content="{new}">'
        s_new = s[:m.start()] + new_meta + s[m.end():]
        open(html_path, 'w').write(s_new)
        print(f'  ✓ Flipped {html_path}: {current} → {new}')
    
    # Also write publish:true to the MD source so future re-renders preserve indexability
    md_path = target['md_file']
    if os.path.exists(md_path):
        md_content = open(md_path).read()
        if '**publish: true**' not in md_content:
            # Insert after Primary keyword line
            if '**Primary keyword:**' in md_content:
                md_content = re.sub(r'(\*\*Primary keyword:\*\*[^\n]+\n)', r'\1**publish: true**\n', md_content, count=1)
            elif '**Slug:**' in md_content:
                md_content = re.sub(r'(\*\*Slug:\*\*[^\n]+\n)', r'\1**publish: true**\n', md_content, count=1)
            open(md_path, 'w').write(md_content)
            print(f'  ✓ Marked MD {md_path} as publish:true (preserves indexable on re-render)')

    # ─── 1.5 Update datePublished + dateModified to today ───
    # Articles are authored in advance with a placeholder datePublished (e.g.
    # 2026-03-19). On release day we stamp the actual release date so schema
    # and blog-card visible dates match reality. Without this, Google and
    # social previews report stale authoring dates and the "fresh content"
    # SEO signal is lost. Fix also applies retroactively — see
    # /tmp/backfill_dates.py (Apr 20 2026) for the 4-article backfill.
    s2 = open(html_path).read()
    dp_re = r'"datePublished":\s*"\d{4}-\d{2}-\d{2}"'
    dm_re = r'"dateModified":\s*"\d{4}-\d{2}-\d{2}"'
    if re.search(dp_re, s2):
        s2 = re.sub(dp_re, f'"datePublished": "{today}"', s2, count=1)
    if re.search(dm_re, s2):
        s2 = re.sub(dm_re, f'"dateModified": "{today}"', s2, count=1)
    if s2 != open(html_path).read():
        open(html_path, 'w').write(s2)
        print(f'  ✓ Stamped {html_path} datePublished={today}')
    
    # ─── 2. Add URL to sitemap ───
    slug = target['slug']
    full_url = f'https://sabdastudio.com{slug}'
    sitemap = open(SITEMAP_PATH).read()
    
    if full_url in sitemap:
        print(f'  ⊘ {slug} already in sitemap, skipping')
    else:
        # Build URL block
        # Get last-modified date from git for the HTML file
        import subprocess
        try:
            r = subprocess.run(['git','log','-1','--format=%cs','--',html_path],
                               capture_output=True, text=True, timeout=10)
            lastmod = r.stdout.strip() or today
        except Exception:
            lastmod = today
        
        url_block = f'''  <url>
    <loc>{full_url}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
'''
        # Insert before </urlset>
        sitemap_new = sitemap.replace('</urlset>', url_block + '</urlset>')
        open(SITEMAP_PATH, 'w').write(sitemap_new)
        print(f'  ✓ Added {full_url} to sitemap')
    
    # ─── 3. Mark queue entry as released ───
    target['status'] = 'released'
    target['released_at'] = today
    queue_data['meta']['last_release'] = {
        'date': today,
        'slug': slug,
        'order': target['order'],
    }
    open(QUEUE_PATH, 'w').write(json.dumps(queue_data, indent=2))
    print(f'  ✓ Queue updated: {slug} marked released')
    
    # ─── 4. Regenerate /blog/index.html article list ───
    regenerate_blog_index()
    
    # ─── 5. Write marker for commit message ───
    open('/tmp/released_slug.txt', 'w').write(slug)
    
    print(f'\nRelease complete: {slug}')


def regenerate_blog_index():
    """After releasing an article, regenerate /blog/index.html article list
    from currently-indexable blog articles. Called by main() after release."""
    import re, glob
    from datetime import datetime
    
    released = []
    for f in sorted(glob.glob('blog/*/index.html')):
        s = open(f).read()
        m = re.search(r'<meta name="robots" content="([^"]+)">', s)
        if not m or 'noindex' in m.group(1): continue
        
        slug_dir = f.replace('blog/','').replace('/index.html','')
        href = slug_dir + '/'
        
        h1m = re.search(r'<h1>([^<]+)</h1>', s)
        h1 = h1m.group(1).strip() if h1m else slug_dir
        
        md_m = re.search(r'<meta name="description" content="([^"]+)">', s)
        meta_desc = md_m.group(1) if md_m else ''
        
        lang_m = re.search(r'<html lang="([a-z]{2})"', s)
        lang = lang_m.group(1) if lang_m else 'en'
        
        date_m = re.search(r'"datePublished":\s*"(\d{4}-\d{2}-\d{2})"', s)
        pub_date = date_m.group(1) if date_m else ''
        
        body_m = re.search(r'<article class="article">([\s\S]*?)</article>', s)
        if body_m:
            text = re.sub(r'<[^>]+>',' ', body_m.group(1))
            words = len(text.split())
            read_min = max(2, round(words / 220))
        else:
            read_min = 5
        
        released.append({
            'href': href, 'href_abs': '/blog/' + slug_dir + '/', 'h1': h1, 'meta_desc': meta_desc,
            'lang': lang, 'pub_date': pub_date, 'read_min': read_min,
        })
    
    released.sort(key=lambda x: x['pub_date'], reverse=True)
    
    if not released:
        cards_html = '<div class="blog-coming"><p>New articles dropping <em>weekday mornings</em>.<br>Check back tomorrow.</p></div>'
    else:
        def fmt_date(d):
            try:
                return datetime.strptime(d, '%Y-%m-%d').strftime('%B %-d, %Y')
            except: return d
        
        cards = []
        for i, a in enumerate(released):
            cards.append(
              f'<a href="{a["href"]}" class="blog-card rv" data-lang="{a["lang"]}">'
              f'<div class="blog-card-meta" style="margin-bottom:10px"><span style="text-transform:uppercase;font-weight:600;color:var(--cyan)">{a["lang"]}</span> &middot; {a["read_min"]} min read</div>'
              f'<h2>{a["h1"]}</h2><p>{a["meta_desc"]}</p>'
              f'<div class="blog-card-meta" style="margin-top:12px">{fmt_date(a["pub_date"])}</div></a>'
            )
        cards_html = '\n'.join(cards)
    
    # Filter buttons (only show if multiple langs)
    langs = sorted(set(a['lang'] for a in released))
    filter_html = ''
    if len(langs) > 1:
        btns = '<button class="blog-filter on" data-filter="all" style="padding:8px 16px;border:1px solid rgba(2,243,197,.3);background:rgba(2,243,197,.08);color:var(--cyan);border-radius:20px;font-size:.74rem;font-weight:600;letter-spacing:.06em;cursor:pointer;transition:all .2s">All</button>'
        for lg in langs:
            btns += f'<button class="blog-filter" data-filter="{lg}" style="padding:8px 16px;border:1px solid rgba(240,239,233,.12);background:transparent;color:var(--white60);border-radius:20px;font-size:.74rem;font-weight:600;letter-spacing:.06em;cursor:pointer;transition:all .2s">{lg.upper()}</button>'
        filter_html = f'<div class="blog-filters" style="display:flex;gap:8px;margin-bottom:32px">{btns}</div>'
    
    filter_js = """
<script>
document.querySelectorAll('.blog-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    document.querySelectorAll('.blog-filter').forEach(b => {
      b.classList.remove('on');
      b.style.background = 'transparent';
      b.style.color = 'var(--white60)';
      b.style.borderColor = 'rgba(240,239,233,.12)';
    });
    btn.classList.add('on');
    btn.style.background = 'rgba(2,243,197,.08)';
    btn.style.color = 'var(--cyan)';
    btn.style.borderColor = 'rgba(2,243,197,.3)';
    document.querySelectorAll('.blog-card').forEach(card => {
      card.style.display = (filter === 'all' || card.dataset.lang === filter) ? 'block' : 'none';
    });
  });
});
</script>
"""
    
    blog_index_path = 'blog/index.html'
    s = open(blog_index_path).read()
    new_block = f'<div class="blog-list-wrap">{filter_html}<div class="blog-list">{cards_html}</div></div>{filter_js}'
    
    # Replace existing blog-list-wrap. The empty-state block nests 3 divs
    # (wrap > list > blog-coming), the cards-state block nests 2 (wrap > list >
    # <a> cards). The optional `(\s*</div>)?` consumes the 3rd close when present
    # so the empty→cards transition doesn't leave a stray </div>. Replacement
    # always emits 2 structural divs; cards_html supplies its own internal balance.
    if '<div class="blog-list-wrap">' in s:
        s = re.sub(r'<div class="blog-list-wrap">[\s\S]*?</div></div>(\s*</div>)?(?:\s*<script>[\s\S]*?</script>)?', new_block, s, count=1)
    else:
        s = re.sub(r'<div class="blog-list">[\s\S]*?</div>', new_block, s, count=1)
    

    # ─── Also regenerate 3 mobile blog files (m/blog, es/m/blog, ca/m/blog) ───
    # As of Apr 20 2026: mobile now mirrors desktop behaviour — all 3 files
    # render ALL released articles with an inline All/EN/ES/CA filter UI.
    # Previously each file was locale-filtered (m/blog = EN only, etc.),
    # which created confusion for users browsing mobile in one language but
    # wanting to see content in another. Desktop has always been all-langs
    # with a filter, so this brings mobile to parity.
    #
    # Canonical: all 3 mobile URLs now serve identical content. Each file's
    # existing canonical + hreflang cluster remains untouched — the cluster
    # itself tells Google these are cross-language equivalents.
    MOBILE_FILES = ['m/blog.html', 'es/m/blog.html', 'ca/m/blog.html']

    for mob_path in MOBILE_FILES:
        if not os.path.exists(mob_path): continue
        ms = open(mob_path).read()

        # All released articles regardless of language (desktop parity)
        matching = released

        if matching:
            mcards = []
            for i, a in enumerate(matching, 1):
                # Language badge: lowercase 2-letter + cyan — same as desktop
                # blog card badge (see main blog-list-wrap regen above).
                lang_badge = (
                    f'<span class="ct-lang" data-lang="{a["lang"]}" '
                    f'style="display:inline-block;text-transform:uppercase;'
                    f'font-weight:600;color:var(--cyan);font-size:.64rem;'
                    f'letter-spacing:.08em;margin-bottom:4px">{a["lang"]}</span>'
                )
                # Card uses .ct for padding + flex row inside (num + body side by side),
                # .fi for fade-in. NOT wrapped in an outer .ct div — that would make
                # the .ct flex rule stack cards horizontally. Each card is a direct
                # sibling of the wrapper below, stacked vertically via .ct's own
                # border-bottom rhythm.
                mcards.append(
                    f'<a href="{a["href_abs"]}" class="ct fi" data-lang="{a["lang"]}" '
                    f'style="text-decoration:none;color:inherit">'
                    f'<div class="ct-num">{i}</div>'
                    f'<div class="ct-body">'
                    f'{lang_badge}'
                    f'<div class="ct-name">{a["h1"]}</div>'
                    f'<div class="ct-desc">{a["meta_desc"]}</div>'
                    f'</div></a>'
                )
            cards_html = '\n'.join(mcards)
        else:
            cards_html = ''

        # Filter buttons — only render if we have >1 language in the set
        present_langs = sorted(set(a['lang'] for a in matching))
        filter_ui = ''
        if len(present_langs) > 1:
            filter_btns = (
                '<button class="mblog-filter on" data-filter="all" type="button" '
                'style="flex:0 0 auto;padding:8px 14px;background:rgba(2,243,197,.12);'
                'border:1px solid rgba(2,243,197,.3);border-radius:100px;'
                'color:var(--cyan);font-size:.72rem;font-weight:600;'
                'letter-spacing:.06em;font-family:inherit;cursor:pointer;'
                '-webkit-tap-highlight-color:transparent">All</button>'
            )
            for lg in present_langs:
                filter_btns += (
                    f'<button class="mblog-filter" data-filter="{lg}" type="button" '
                    f'style="flex:0 0 auto;padding:8px 14px;background:transparent;'
                    f'border:1px solid rgba(240,239,233,.15);border-radius:100px;'
                    f'color:var(--w60);font-size:.72rem;font-weight:600;'
                    f'letter-spacing:.06em;font-family:inherit;cursor:pointer;'
                    f'-webkit-tap-highlight-color:transparent">{lg.upper()}</button>'
                )
            # padding-top 24px gives air between hero and filter pills so the
            # language tags don't visually touch the hero image bottom edge.
            filter_ui = (
                '<div class="mblog-filters" style="display:flex;gap:8px;'
                'padding:24px 24px 16px;flex-wrap:wrap">' + filter_btns + '</div>'
            )

        filter_js = (
            '<script>(function(){var btns=document.querySelectorAll(".mblog-filter");'
            'if(!btns.length)return;'
            'btns.forEach(function(b){b.addEventListener("click",function(){'
            'var f=b.getAttribute("data-filter");'
            'btns.forEach(function(x){x.classList.remove("on");'
            'x.style.background="transparent";x.style.color="var(--w60)";'
            'x.style.borderColor="rgba(240,239,233,.15)";});'
            'b.classList.add("on");b.style.background="rgba(2,243,197,.12)";'
            'b.style.color="var(--cyan)";b.style.borderColor="rgba(2,243,197,.3)";'
            'document.querySelectorAll("a.ct.fi[data-lang]").forEach(function(c){'
            'c.style.display=(f==="all"||c.getAttribute("data-lang")===f)?"flex":"none";'
            '});});});})();</script>'
        )

        # Replace the cards block between </section> hero and the next
        # downstream anchor. Anchor priority:
        #   1. <section class="blog-intro-offers"> (preserves pricing CTA section)
        #   2. <nav class="tabs"> (fallback if no pricing section)
        # This way when blog-release runs, it only touches cards, leaving the
        # downstream pricing CTA intact.
        if '<section class="blog-intro-offers">' in ms:
            end_anchor_re = r'(<section class="blog-intro-offers">)'
        else:
            end_anchor_re = r'(<nav class="tabs">)'
        pattern = re.compile(
            r'(</section>)([\s\S]*?)' + end_anchor_re,
            re.MULTILINE
        )
        mm = pattern.search(ms)
        if not mm:
            print(f'  ⚠ {mob_path}: could not find hero/end anchor, skipping')
            continue
        # Cards are direct children of document flow — no outer .ct wrapper
        # (that would create a flex row that stacks them horizontally).
        # filter_ui + cards + filter_js, each on its own line for readability.
        replacement = f'\n{filter_ui}\n{cards_html}\n{filter_js}\n'
        ms_new = ms[:mm.end(1)] + replacement + ms[mm.start(3):]

        open(mob_path, 'w').write(ms_new)
        print(f'  ✓ {mob_path} regenerated with {len(matching)} cards (all langs)')

    open(blog_index_path, 'w').write(s)
    print(f'  ✓ blog/index.html regenerated with {len(released)} cards')


if __name__ == '__main__':
    main()
