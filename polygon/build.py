#!/usr/bin/env python3
"""Turn a sheet spec (polygon/sheets/*.py) into Polygon problem folders.

    python3 polygon/build.py polygon/sheets/level0_A.py polygon/level0-sheet1

A spec module defines PROBLEMS, a list of dicts:
    letter, name (Polygon name, unique), title, tl (ms), ml (MB),
    checker (e.g. 'std::wcmp.cpp', 'std::rcmp9.cpp'),
    legend, input, output, notes (Polygon TeX),
    samples: [(input, expected_output), ...]   -- from the original statement
    solution: C++ source of the correct solution
    gen: function(random.Random) -> list of extra test inputs (strings)
    wrong: optional {filename: C++ source} expected to fail some test
    validator: optional testlib validator source

For every problem it compiles the solution, checks it reproduces each sample
output (token-wise, or with 1e-6 tolerance for real-number checkers), and
writes problem.json, statement.json, solution.cpp, wrong-*.cpp, validator.cpp
and tests/NN.txt (samples first). Exits non-zero if any sample mismatches.
"""
import importlib.util
import json
import random
import subprocess
import sys
from pathlib import Path

TMP = Path('/tmp/plg-build')


def tokens_equal(a: str, b: str, real: bool, eps: float = 1e-6) -> bool:
    ta, tb = a.split(), b.split()
    if len(ta) != len(tb):
        return False
    for x, y in zip(ta, tb):
        if x == y:
            continue
        if not real:
            return False
        try:
            fx, fy = float(x), float(y)
        except ValueError:
            return False
        if abs(fx - fy) > eps * max(1.0, abs(fy)):
            return False
    return True


def build(spec_path: Path, out_root: Path) -> bool:
    spec = importlib.util.spec_from_file_location('sheet', spec_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    TMP.mkdir(parents=True, exist_ok=True)
    ok_all = True
    for p in mod.PROBLEMS:
        slug = f"{p['letter']}-{p['name'].removeprefix('hue-')}"
        d = out_root / slug
        (d / 'tests').mkdir(parents=True, exist_ok=True)
        for old in (d / 'tests').glob('*.txt'):
            old.unlink()
        for old in d.glob('wrong-*.cpp'):
            old.unlink()

        src = TMP / f"{p['name']}.cpp"
        exe = TMP / p['name']
        src.write_text(p['solution'])
        r = subprocess.run(['g++', '-O2', '-std=c++17', str(src), '-o', str(exe)], capture_output=True, text=True)
        if r.returncode:
            print(f"{p['letter']}: solution does not compile\n{r.stderr[:500]}")
            ok_all = False
            continue

        chk = p['checker']
        custom = isinstance(chk, dict)
        real = custom or 'rcmp' in chk
        eps = chk.get('eps', 1e-6) if custom else 1e-6
        bad = []
        for i, (inp, exp) in enumerate(p['samples'], 1):
            out = subprocess.run([str(exe)], input=inp if inp.endswith('\n') else inp + '\n',
                                 capture_output=True, text=True, timeout=5).stdout
            if not tokens_equal(out, exp, real, eps):
                bad.append((i, inp, exp, out))
        if bad:
            ok_all = False
            for i, inp, exp, out in bad:
                print(f"{p['letter']}: sample {i} mismatch\n  in: {inp!r}\n  expected: {exp!r}\n  got: {out!r}")

        tests = [s[0] for s in p['samples']] + list(p['gen'](random.Random(f"{p['name']}-v1")))
        seen, uniq = set(), []
        for t in tests:
            t = t if t.endswith('\n') else t + '\n'
            if t not in seen:
                seen.add(t)
                uniq.append(t)
        for i, t in enumerate(uniq, 1):
            (d / 'tests' / f'{i:02d}.txt').write_text(t)

        (d / 'problem.json').write_text(json.dumps({
            'name': p['name'], 'title': p['title'], 'timeLimit': p.get('tl', 1000), 'memoryLimit': p.get('ml', 256),
            'checker': 'checker.cpp' if custom else chk, 'samples': list(range(1, len(p['samples']) + 1)),
        }, indent=2) + '\n')
        (d / 'statement.json').write_text(json.dumps({
            'legend': p['legend'], 'input': p['input'], 'output': p['output'], 'notes': p.get('notes', ''),
        }, indent=2, ensure_ascii=False) + '\n')
        (d / 'solution.cpp').write_text(p['solution'])
        if custom:
            common = Path(__file__).resolve().parent / 'common' / f"{chk['custom']}.cpp"
            head = f"#define TOK_EPS {chk['eps']}\n" if 'eps' in chk else ''
            (d / 'checker.cpp').write_text(head + common.read_text())
        elif (d / 'checker.cpp').exists():
            (d / 'checker.cpp').unlink()
        for fname, code in (p.get('wrong') or {}).items():
            (d / fname).write_text(code)
        if p.get('validator'):
            (d / 'validator.cpp').write_text(p['validator'])
        print(f"{p['letter']} {p['title']}: {len(uniq)} tests, samples {'OK' if not bad else 'MISMATCH'}")
    return ok_all


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    sys.exit(0 if build(Path(sys.argv[1]), Path(sys.argv[2])) else 1)
