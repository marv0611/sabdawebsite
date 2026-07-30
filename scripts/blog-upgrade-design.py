#!/usr/bin/env python3
"""
Apply the blog design layer to already-published articles.

Deliberately NOT a re-render. Re-rendering would revert hand-edited internal
links (several articles had momence.com product links replaced with internal
pricing links during an SEO pass, which never went back into the markdown) and
would restamp the visible month on the article meta line. This only adds and
rewrites presentation:

  - rebuilds pipe tables that leaked into the copy as raw text
  - adds data-label to table cells so they restack as cards on phones
  - converts the Type/Price/Location run into chips
  - injects the design stylesheet and the desktop particle field
  - wraps breadcrumb separators

Idempotent: safe to run repeatedly. Usage: python3 scripts/blog-upgrade-design.py
"""
import re
import sys
import glob
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import blog_enhance

REPO = Path(__file__).resolve().parent.parent
ART_RE = re.compile(r'(<article class="article">)(.*?)(</article>)', re.S)


def upgrade(path):
    doc = open(path, encoding='utf-8').read()
    before = doc

    m = ART_RE.search(doc)
    if not m:
        return 'no-article', 0
    body = m.group(2)
    new_body = blog_enhance.enhance(body)
    if new_body != body:
        doc = doc[:m.start(2)] + new_body + doc[m.end(2):]

    doc = blog_enhance.inject_design(doc)

    if doc == before:
        return 'unchanged', 0
    open(path, 'w', encoding='utf-8').write(doc)
    return 'updated', len(doc) - len(before)


if __name__ == '__main__':
    files = sorted(glob.glob(str(REPO / 'blog' / '*' / 'index.html')))
    stats = {'updated': 0, 'unchanged': 0, 'no-article': 0}
    for f in files:
        status, _ = upgrade(f)
        stats[status] = stats.get(status, 0) + 1
    print(f"blog design upgrade: {stats}")
