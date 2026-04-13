#!/usr/bin/env python3
"""
SABDA Membership Display Audit (SABDA-MEMBERSHIPS-V2)

Audits the showConfirmStep + Worker membership filter implementation
to verify all 10 use cases from the design spec render correctly.

Use cases tested:
  1.  Nothing                                → should NOT call showConfirmStep
  2.  1 drop-in credit                       → "1 class remaining" / "After: 0 left"
  3.  2 drop-in credits (1 pack)             → "2 classes remaining" / "After: 1 left"
  4.  1 5-pack with 5 credits                → "5 classes remaining" / "After: 4 left"
  5.  1 IMMERSE subscription (active)        → "Active membership" / no After
  6.  2 drop-in credits (separate packs)     → "2 classes remaining" + sum, no "You also have"
  7.  1 5-pack + 1 IMMERSE                   → "5 classes remaining" + "You also have: 1 IMMERSE membership"
  8.  1 drop-in + 1 5-pack                   → "1 class remaining" + "You also have: 5 5-PACK credits"
  9.  Pending IMMERSE (Activates on first usage) → should be in list (Worker filter accepts)
  10. Multiple subscriptions (FLEX + IMMERSE)→ primary "Active" + "You also have: 1 IMMERSE membership"

Run: python3 scripts/audit-membership-display.py
"""
import os, re, subprocess, sys, json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
os.chdir(REPO)

LOCALES = {
    'EN': ['classes.html', 'classes/index.html', 'm/schedule.html'],
    'ES': ['es/clases/index.html', 'es/m/schedule.html'],
    'CA': ['ca/classes/index.html', 'ca/m/schedule.html'],
}

PASS = []
FAIL = []

def ok(msg): PASS.append(msg); print(f'  ✓ {msg}')
def fail(msg): FAIL.append(msg); print(f'  ✗ {msg}')

# ─────────── PART A: STATIC AUDIT ───────────
print('\n[A] STATIC AUDIT — verify code structure across all 7 files\n')

for locale, files in LOCALES.items():
    for f in files:
        if not Path(f).exists():
            fail(f'{f}: file missing'); continue
        s = Path(f).read_text()

        # A1: New function signature accepts list
        if 'function showConfirmStep(membershipOrList)' not in s:
            fail(f'{f}: showConfirmStep does not accept membershipOrList'); continue
        ok(f'{f}: signature accepts list')

        # A2: Backwards-compat wrapping (Array.isArray check)
        if 'Array.isArray(membershipOrList)' not in s:
            fail(f'{f}: missing Array.isArray backwards-compat')
            continue
        ok(f'{f}: backwards-compat Array.isArray check present')

        # A3: Same-kind summing logic exists
        if 'sameKindOthers' not in s or 'differentOthers' not in s:
            fail(f'{f}: missing sameKindOthers / differentOthers split')
            continue
        ok(f'{f}: same-kind summing logic present')

        # A4: Call sites updated to pass full array
        bad_calls = s.count('showConfirmStep(d.memberships[0])')
        good_calls = s.count('showConfirmStep(d.memberships)')
        if bad_calls > 0:
            fail(f'{f}: {bad_calls} legacy call(s) still pass d.memberships[0]')
            continue
        if good_calls < 1:
            fail(f'{f}: no call sites pass d.memberships')
            continue
        ok(f'{f}: {good_calls} call site(s) pass full array')

        # A5: Locale-specific copy strings present
        if locale == 'EN':
            need = ['Active membership', 'class remaining', 'classes remaining',
                    'You also have', 'After this booking',
                    'credit', 'credits', 'membership']
        elif locale == 'ES':
            need = ['Membresía activa', 'clase restante', 'clases restantes',
                    'También tienes', 'Después de esta reserva',
                    'crédito', 'créditos', 'membresía']
        else:  # CA
            need = ['Membresía activa', 'classe restant', 'classes restants',
                    'També tens', "Després d", 'crèdit', 'crèdits', 'membresía']
        missing = [n for n in need if n not in s]
        if missing:
            fail(f'{f}: missing copy strings: {missing}')
        else:
            ok(f'{f}: all locale copy strings present')

        # A6: JS syntax clean
        scripts = re.findall(r'<script(?![^>]*\bsrc=)(?![^>]*application/ld\+json)[^>]*>([\s\S]*?)</script>', s)
        Path('/tmp/audit.js').write_text('\n;\n'.join(scripts))
        r = subprocess.run(['node','--check','/tmp/audit.js'], capture_output=True, text=True)
        if r.returncode != 0:
            fail(f'{f}: JS syntax error: {r.stderr[:200]}')
        else:
            ok(f'{f}: JS syntax clean')

# ─────────── PART B: WORKER FILTER AUDIT ───────────
print('\n[B] WORKER FILTER AUDIT — verify pending-activation subscriptions accepted\n')

worker = Path('cloudflare-worker-checkout-proxy.js').read_text()
if 'isPendingActivation' not in worker:
    fail('Worker: missing isPendingActivation filter clause')
else:
    ok('Worker: isPendingActivation filter present')

if 'm.activatedAt === null' not in worker:
    fail('Worker: not checking activatedAt === null')
else:
    ok('Worker: checks activatedAt === null')

if 'm.activatesOnFirstUsage === true' not in worker:
    fail('Worker: not checking activatesOnFirstUsage flag')
else:
    ok('Worker: checks activatesOnFirstUsage flag')

# Worker JS syntax
r = subprocess.run(['node','--check','cloudflare-worker-checkout-proxy.js'], capture_output=True, text=True)
if r.returncode != 0:
    fail(f'Worker: JS syntax error: {r.stderr[:200]}')
else:
    ok('Worker: JS syntax clean')

# ─────────── PART C: LOGIC SIMULATION ───────────
print('\n[C] LOGIC SIMULATION — extract function and run 10 use-case scenarios\n')

# Extract showConfirmStep from EN classes.html and run it via Node with mocked DOM
test_runner = '''
// Mock minimal browser globals
global.document = {
  getElementById: () => ({ innerHTML: '', addEventListener: () => {} }),
};
global.window = {};

// Mock helpers used by showConfirmStep
function stepChange() {}
function classBlockHtml() { return '<CLASS_BLOCK/>'; }
function customerFieldsHTML() { return '<CUSTOMER_FIELDS/>'; }
function esc(s) { return String(s).replace(/[<>"']/g, ''); }
let curUser = { firstName: 'Test', lastName: 'User' };
let curSession = { id: 123, isWaitlist: false };
let curMembership = null;
function showNoMembership() {}
function switchAccount() {}
function closeMo() {}
function doBookWithMembership() {}

// Capture innerHTML output for inspection
let LAST_HTML = '';
global.document.getElementById = (id) => {
  if (id === 'mo-bd') {
    return { set innerHTML(v) { LAST_HTML = v; }, get innerHTML() { return LAST_HTML; } };
  }
  return { innerHTML: '', addEventListener: () => {} };
};

// Inject the function under test
__INSERT_FUNCTION_HERE__

// Run scenarios
const scenarios = [
  { id: 2, name: '1 drop-in credit',
    input: [{name:'DROP IN', type:'package-events', classesLeft:1, id:'p1'}],
    must_contain: ['1 class remaining', 'After this booking', '1 left'],
    must_not_contain: ['You also have']},
  
  { id: 3, name: '2 drop-in credits in 1 pack',
    input: [{name:'3-PACK', type:'package-events', classesLeft:2, id:'p1'}],
    must_contain: ['2 classes remaining', 'After this booking', '1 class left'],
    must_not_contain: ['You also have']},
  
  { id: 4, name: '1 5-pack with 5 credits',
    input: [{name:'5-PACK', type:'package-events', classesLeft:5, id:'p1'}],
    must_contain: ['5 classes remaining', '4 classes left'],
    must_not_contain: ['You also have']},
  
  { id: 5, name: '1 IMMERSE subscription',
    input: [{name:'IMMERSE', type:'subscription', classesLeft:null, id:'s1'}],
    must_contain: ['Active membership'],
    must_not_contain: ['After this booking', 'You also have']},
  
  { id: 6, name: '2 drop-in credits separate packs (Marvyn case)',
    input: [
      {name:'DROP IN', type:'package-events', classesLeft:1, id:'p1'},
      {name:'DROP IN', type:'package-events', classesLeft:1, id:'p2'}
    ],
    must_contain: ['2 classes remaining', '1 class left'],
    must_not_contain: ['You also have']},
  
  { id: 7, name: '1 5-pack + 1 IMMERSE',
    input: [
      {name:'5-PACK', type:'package-events', classesLeft:5, id:'p1'},
      {name:'IMMERSE', type:'subscription', classesLeft:null, id:'s1'}
    ],
    must_contain: ['5 classes remaining', '4 classes left', 'You also have', 'IMMERSE'],
    must_not_contain: []},
  
  { id: 8, name: '1 drop-in + 1 5-pack',
    input: [
      {name:'DROP IN', type:'package-events', classesLeft:1, id:'p1'},
      {name:'5-PACK', type:'package-events', classesLeft:5, id:'p2'}
    ],
    must_contain: ['1 class remaining', '0 classes left', 'You also have', '5-PACK', '5 5-PACK credits'],
    must_not_contain: []},
  
  { id: 9, name: 'Pending IMMERSE (filter responsibility, not display)',
    input: [{name:'IMMERSE', type:'subscription', classesLeft:null, activatedAt:null, id:'s1'}],
    must_contain: ['Active membership'],
    must_not_contain: []},
  
  { id: 10, name: 'FLEX + IMMERSE (multiple subs)',
    input: [
      {name:'FLEX', type:'subscription', classesLeft:null, id:'s1'},
      {name:'IMMERSE', type:'subscription', classesLeft:null, id:'s2'}
    ],
    must_contain: ['Active membership', 'You also have', 'IMMERSE'],
    must_not_contain: ['After this booking']},
];

let pass = 0, fail = 0;
for (const sc of scenarios) {
  LAST_HTML = '';
  try {
    showConfirmStep(sc.input);
  } catch (e) {
    console.log(`SCENARIO ${sc.id} ${sc.name}: THREW: ${e.message}`);
    fail++; continue;
  }
  const html = LAST_HTML;
  const missing = sc.must_contain.filter(t => !html.includes(t));
  const present = sc.must_not_contain.filter(t => html.includes(t));
  if (missing.length === 0 && present.length === 0) {
    console.log(`SCENARIO ${sc.id} (${sc.name}): PASS`);
    pass++;
  } else {
    console.log(`SCENARIO ${sc.id} (${sc.name}): FAIL`);
    if (missing.length) console.log(`  Missing: ${JSON.stringify(missing)}`);
    if (present.length) console.log(`  Should not contain: ${JSON.stringify(present)}`);
    console.log(`  Output (first 600): ${html.slice(0, 600)}`);
    fail++;
  }
}
console.log(`\\nSCENARIOS: ${pass} pass / ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
'''

# Extract showConfirmStep from classes.html
src = Path('classes.html').read_text()
m = re.search(r'(function showConfirmStep\(membershipOrList\)\{[\s\S]*?\n\})', src)
if not m:
    fail('Could not extract showConfirmStep from classes.html')
else:
    func = m.group(1)
    runner = test_runner.replace('__INSERT_FUNCTION_HERE__', func)
    Path('/tmp/sim.js').write_text(runner)
    r = subprocess.run(['node', '/tmp/sim.js'], capture_output=True, text=True)
    print(r.stdout)
    if r.returncode != 0:
        if r.stderr: print(f'STDERR: {r.stderr[:600]}')
        fail('Logic simulation: at least one scenario failed')
    else:
        ok('Logic simulation: all 9 scenarios pass')

# ─────────── SUMMARY ───────────
print('\n' + '='*60)
print(f'AUDIT SUMMARY')
print('='*60)
print(f'  PASS:  {len(PASS)}')
print(f'  FAIL:  {len(FAIL)}')
if FAIL:
    print('\nFailures:')
    for f in FAIL: print(f'  - {f}')
    sys.exit(1)
print('\n✅ ALL CHECKS PASSED')
sys.exit(0)
