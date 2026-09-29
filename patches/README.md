# Dated refresh patches

These rewrite live article HTML to match the exhibition launch. Each one is
dated and **must not be applied before its date**: every patch states the show
as already open, quotes October or November facts, and sets `dateModified` to
the day it is meant to land. Applying one early publishes a false date and
claims the show is running before it is.

| Apply on | Patch | Touches |
|---|---|---|
| Fri 17 Oct 2026 | `2-ON-17-OCT-opening-day-refresh.patch` | 6 exhibition articles |
| Thu 22 Oct 2026 | `3-ON-22-OCT-teamlab-refresh.patch` | `blog/teamlab-barcelona/` |
| Mon 2 Nov 2026 | `4-ON-2-NOV-christmas-gift-refresh.patch` | `blog/regalo-experiencia-barcelona/` |

All three were verified to apply cleanly against `main` on 29 September 2026.

To apply on the day:

```
cd ~/Documents/sabdawebsite && git pull
git apply --check patches/2-ON-17-OCT-opening-day-refresh.patch   # confirm first
git apply patches/2-ON-17-OCT-opening-day-refresh.patch
git add -A && git commit -m "17 Oct: opening day article refresh" && git push
```

If `--check` fails because an article moved on in the meantime, do not force it.
The patch content is the writer's, so it needs re-cutting against the new file
rather than a merge.

## Ordering note

`3-ON-22-OCT` depends on `/blog/van-gogh-barcelona/` being live, which it is
from 22 October (article 83). It links there, so applying it earlier would
publish a link to a `noindex` page.

`2-ON-17-OCT` edits `blog/expositions-immersives-barcelone/index.html`, which
is the French reference article for `scripts/render-blog.py`. That is fine, it
only changes body copy, but if the renderer ever starts emitting French pages
with missing chrome, check that this patch did not disturb the head of that
file.
