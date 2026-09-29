#!/usr/bin/env python3
"""
Apply a dated content refresh, on its date and not before.

Reads blog/refreshes/manifest.json. If one of the refreshes is dated today in
Europe/Madrid, applies its patch to the working tree and leaves the commit to
the caller. The blog-daily-release workflow runs this just before its own
commit step, so a refresh rides out on the same push as that day's article.

Design rules, all deliberate:

  Never fail the build. A refresh that cannot apply is a content problem, not a
  reason to stop the daily article release. Every failure path prints a GitHub
  Actions warning and exits 0. The warning is visible in the run summary.

  Never apply early. Each patch states things that only become true on its date:
  the 17 October one says the show is open. Shipping it a day early publishes a
  false claim, so the date comparison is exact equality, never "on or after".

  Never apply twice. Applied patches are recorded in blog/refreshes/.applied so
  a manual run, a re-run of a failed job or the backup :15 cron cannot double
  apply. git apply would refuse anyway, but the record makes the skip explicit
  rather than looking like a failure.

Run it by hand with --date YYYY-MM-DD to rehearse a future refresh, or with
--check to see what is pending without touching anything.
"""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

REPO = Path(__file__).resolve().parent.parent
DIR = REPO / 'blog' / 'refreshes'
MANIFEST = DIR / 'manifest.json'
APPLIED = DIR / '.applied'
TZ = ZoneInfo('Europe/Madrid')


def warn(msg):
    print(f'::warning title=Content refresh::{msg}')


def applied_already():
    if not APPLIED.exists():
        return set()
    return {l.split('\t')[0] for l in APPLIED.read_text().splitlines() if l.strip()}


def record(patch, when):
    with APPLIED.open('a') as fh:
        fh.write(f'{patch}\t{when}\n')


def main():
    args = sys.argv[1:]
    check_only = '--check' in args
    today = None
    if '--date' in args:
        today = args[args.index('--date') + 1]
    if today is None:
        today = datetime.now(TZ).strftime('%Y-%m-%d')

    if not MANIFEST.exists():
        warn(f'{MANIFEST} is missing; no refreshes can run.')
        return 0

    try:
        refreshes = json.loads(MANIFEST.read_text())['refreshes']
    except Exception as exc:
        warn(f'{MANIFEST} could not be read: {exc}')
        return 0

    done = applied_already()
    due = [r for r in refreshes if r['date'] == today and r['patch'] not in done]

    if check_only:
        print(f'today ({today}, Europe/Madrid)')
        for r in refreshes:
            state = 'applied' if r['patch'] in done else (
                'DUE TODAY' if r['date'] == today else 'pending')
            print(f"  {r['date']}  {state:<10} {r['patch']}")
        return 0

    if not due:
        print(f'No refresh dated {today}. Nothing to do.')
        return 0

    for r in due:
        patch = DIR / r['patch']
        if not patch.exists():
            warn(f"{r['patch']} is dated today but the file is missing from blog/refreshes/.")
            continue

        check = subprocess.run(['git', 'apply', '--check', str(patch)],
                               cwd=REPO, capture_output=True, text=True)
        if check.returncode != 0:
            warn(f"{r['patch']} is dated today but no longer applies: "
                 f"{check.stderr.strip()[:300]}. The articles it targets have changed "
                 f"since it was written. Regenerate it and apply by hand.")
            continue

        run = subprocess.run(['git', 'apply', str(patch)],
                             cwd=REPO, capture_output=True, text=True)
        if run.returncode != 0:
            warn(f"{r['patch']} passed the check but failed to apply: "
                 f"{run.stderr.strip()[:300]}")
            continue

        record(r['patch'], today)
        print(f"Applied {r['patch']}: {r.get('note', '')}")

    return 0


if __name__ == '__main__':
    sys.exit(main())
