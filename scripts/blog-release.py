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
        for q in queue:
            if q['release_date'] == today and q['status'] == 'queued':
                target = q
                print(f'Today release ({today}): {q["slug"]}')
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
    
    # ─── 4. Write marker for commit message ───
    open('/tmp/released_slug.txt', 'w').write(slug)
    
    print(f'\nRelease complete: {slug}')

if __name__ == '__main__':
    main()
