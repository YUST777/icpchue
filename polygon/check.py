#!/usr/bin/env python3
"""Pre-push checks for a sheet, the same every time.

    python3 polygon/check.py polygon/level0-sheet1 [LETTERS]

For every problem folder it verifies:
  - solution.cpp and every wrong-*.cpp compile
  - validator.cpp exists, compiles, and accepts EVERY tests/NN.txt
  - at least one wrong-*.cpp exists, and each one is REJECTED by the problem's real checker on some test
  - the solution prints something for every test and finishes within 2 s
Exits non-zero if anything fails. Needs testlib.h in <sheet>/ (or any folder given by -I).
"""
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import calibrate  # noqa: E402  (checker_binary: the sheet's real checker)

WORK = Path('/tmp/plg-check')


def gpp(src, out, inc):
    r = subprocess.run(['g++', '-O2', '-std=c++17', f'-I{inc}', str(src), '-o', str(out)], capture_output=True, text=True)
    return r.returncode == 0, r.stderr[:200]


def run(exe, inp):
    try:
        r = subprocess.run([str(exe)], input=inp, capture_output=True, timeout=2)
        return r.returncode, r.stdout
    except subprocess.TimeoutExpired:
        return -1, b''


def accepted(checker, out, test, got, want):
    # Judge with the problem's real checker, so a wrong solution that only differs
    # within the checker's tolerance does not count as caught.
    (out / 'i').write_bytes(test.read_bytes()); (out / 'o').write_bytes(got); (out / 'a').write_bytes(want)
    return subprocess.run([str(checker), str(out / 'i'), str(out / 'o'), str(out / 'a')], capture_output=True).returncode == 0


def check(folder, inc):
    errs = []
    tests = sorted((folder / 'tests').glob('*.txt'))
    out = WORK / folder.name
    out.mkdir(parents=True, exist_ok=True)
    ok, e = gpp(folder / 'solution.cpp', out / 'sol', inc)
    if not ok:
        return [f'solution does not compile: {e}']
    if not (folder / 'validator.cpp').exists():
        errs.append('no validator.cpp')
    else:
        ok, e = gpp(folder / 'validator.cpp', out / 'val', inc)
        if not ok:
            errs.append(f'validator does not compile: {e}')
        else:
            for t in tests:
                rc, _ = run(out / 'val', t.read_bytes())
                if rc:
                    errs.append(f'validator rejects {t.name}')
    answers = {}
    for t in tests:
        rc, o = run(out / 'sol', t.read_bytes())
        if rc or not o.strip():
            errs.append(f'solution fails or prints nothing on {t.name}')
        answers[t.name] = o
    checker = calibrate.checker_binary(folder)
    wrongs = sorted(folder.glob('wrong-*.cpp'))
    if not wrongs:
        errs.append('no wrong-*.cpp')
    for w in wrongs:
        ok, e = gpp(w, out / w.stem, inc)
        if not ok:
            errs.append(f'{w.name} does not compile')
        elif all(accepted(checker, out, t, run(out / w.stem, t.read_bytes())[1], answers[t.name]) for t in tests):
            errs.append(f'{w.name} is not caught by any test')
    return errs


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sheet = Path(sys.argv[1])
    only = set(sys.argv[2]) if len(sys.argv) > 2 else None
    inc = next((p.parent for p in [sheet / 'testlib.h', sheet.parent / 'level0-sheet1' / 'testlib.h'] if p.exists()), sheet)
    folders = sorted(p for p in sheet.iterdir() if (p / 'problem.json').exists() and (not only or p.name[0] in only))
    WORK.mkdir(parents=True, exist_ok=True)
    calibrate.WORK.mkdir(parents=True, exist_ok=True)
    for f in folders:
        calibrate.checker_binary(f)  # build/download once, before threads
    bad = 0
    with ThreadPoolExecutor(max_workers=8) as ex:
        for f, errs in zip(folders, ex.map(lambda f: check(f, inc), folders)):
            print(f'{"FAIL" if errs else "ok  "} {f.name}' + ''.join(f'\n       - {e}' for e in errs))
            bad += bool(errs)
    print(f'\n{len(folders) - bad}/{len(folders)} problems pass')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
