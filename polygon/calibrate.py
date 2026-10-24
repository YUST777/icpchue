#!/usr/bin/env python3
"""Compare our tests with the original judge, using students' real submissions.

    python3 polygon/calibrate.py polygon/level0-sheet1 219158 [LETTERS]

For every problem folder (A-..., B-...), runs each saved Codeforces
submission for that problem in the original contest (code + verdict from the
ICPC HUE database) against our tests and checker, sandboxed (no network,
memory and time limits). Reports, per problem:
  AC->AC, WA->WA     : we agree with the original judge
  AC->WA             : the original accepted it but we reject (our test may be wrong, or stricter)
  WA->AC             : the original rejected it but we accept (our tests may be weaker)
Details go to <sheet>/calibration.json.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WORK = Path('/tmp/plg-cal')
TESTLIB = ROOT / 'level0-sheet1' / 'testlib.h'
STD = {'std::wcmp.cpp': 'wcmp', 'std::rcmp9.cpp': 'rcmp9', 'std::rcmp6.cpp': 'rcmp6', 'std::lcmp.cpp': 'lcmp'}


def sandbox(tl):
    # The CPU cap only backs up the wall-clock timeout, so keep it above it.
    return ['unshare', '-rn', 'prlimit', '--as=512000000', f'--cpu={int(tl) + 2}', '--']


def db_url():
    env = ROOT.parent / 'next-app' / '.env.local'
    for line in env.read_text().splitlines():
        if line.startswith('DATABASE_URL='):
            return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit('DATABASE_URL not found')


def compile_cpp(src: Path, out: Path, include=None):
    cmd = ['g++', '-O2', '-std=c++20', str(src), '-o', str(out)]
    if include:
        cmd[1:1] = [f'-I{include}']
    return subprocess.run(cmd, capture_output=True, timeout=120).returncode == 0


def checker_binary(folder: Path) -> Path:
    meta = json.loads((folder / 'problem.json').read_text())
    name = meta['checker']
    if name == 'checker.cpp':
        out = WORK / f'chk-{folder.name}'
        compile_cpp(folder / 'checker.cpp', out, TESTLIB.parent)
        return out
    std = STD[name]
    out = WORK / f'chk-{std}'
    if not out.exists():
        src = WORK / f'{std}.cpp'
        subprocess.run(['curl', '-sL', '-o', str(src),
                        f'https://raw.githubusercontent.com/MikeMirzayanov/testlib/master/checkers/{std}.cpp'], check=True)
        compile_cpp(src, out, TESTLIB.parent)
    return out


def judge(job):
    """job: (sub_id, verdict, lang, code, tests[(name, inp, ans)], checker, time_limit_s) -> (sub_id, ours, failed_test)"""
    sid, verdict, lang, code, tests, checker, tl = job
    with tempfile.TemporaryDirectory(dir=WORK) as d:
        d = Path(d)
        low = lang.lower()
        if True:
            is_c = low.startswith('gnu c1') or (low == 'gnu' and 'iostream' not in code and 'stdio.h' in code)
            src = d / ('s.c' if is_c else 's.cpp')
            src.write_text(code)
            # -m32: like Codeforces (Windows), `long` is 32-bit, so code that
            # relies on a 64-bit `long` overflows here exactly as it did there.
            # SSE maths: Codeforces' 64-bit compilers do not use x87 registers.
            arch = ['-m32', '-msse2', '-mfpmath=sse']
            comp = (['gcc', *arch, '-O2', '-std=c11', str(src), '-o', str(d / 's'), '-lm'] if is_c
                    else ['g++', *arch, '-O2', '-std=c++20', str(src), '-o', str(d / 's')])
            if subprocess.run(comp, capture_output=True, timeout=120).returncode:
                return sid, 'CE', None
            cmd = [str(d / 's')]
        for name, inp, ans in tests:
            try:
                r = subprocess.run(sandbox(tl) + cmd, input=inp, capture_output=True, timeout=tl, cwd=d)
            except subprocess.TimeoutExpired:
                return sid, 'TLE', name
            if r.returncode != 0:
                return sid, 'RE', name
            (d / 'i').write_bytes(inp); (d / 'o').write_bytes(r.stdout); (d / 'a').write_bytes(ans)
            if subprocess.run([str(checker), str(d / 'i'), str(d / 'o'), str(d / 'a')], capture_output=True).returncode:
                return sid, 'WA', name
        return sid, 'AC', None


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    sheet, contest = Path(sys.argv[1]), sys.argv[2]
    only = set(sys.argv[3]) if len(sys.argv) > 3 else None
    WORK.mkdir(parents=True, exist_ok=True)
    folders = sorted(p for p in sheet.iterdir() if (p / 'problem.json').exists() and (not only or p.name[0] in only))

    q = (f"select id, upper(problem_index), verdict, coalesce(language,''), source_code from submissions "
         f"where contest_id='{contest}' and source_code is not null and source_code <> ''")
    raw = subprocess.run(['psql', db_url(), '-At', '-F', '\x1f', '-R', '\x1e', '-c', q], capture_output=True, text=True, check=True).stdout
    subs = [r.split('\x1f') for r in raw.split('\x1e') if r]

    report, details = [], {}
    for f in folders:
        letter = f.name.split('-')[0]
        sol = WORK / f'sol-{f.name}'
        compile_cpp(f / 'solution.cpp', sol)
        checker = checker_binary(f)
        tests = []
        for t in sorted((f / 'tests').glob('*.txt')):
            inp = t.read_bytes()
            tests.append((t.name, inp, subprocess.run([str(sol)], input=inp, capture_output=True).stdout))
        # The problem's time limit, plus a little for the sandbox start-up.
        tl = json.loads((f / 'problem.json').read_text()).get('timeLimit', 1000) / 1000 * 1.2 + 0.05
        # C++ only: ICPC HUE trains (and will judge) C++. Sources that print
        # nothing are the editor template saved by an old sync, not the real code.
        jobs = [(s[0], s[2], s[3], s[4], tests, checker, tl) for s in subs
                if s[1] == letter and not any(w in s[2].lower() for w in ('compil', 'компил')) and 'py' not in s[3].lower()
                and any(w in s[4] for w in ('cout', 'printf', 'puts', 'putchar'))]
        verdict_of = {s[0]: ('AC' if s[2] in ('Accepted', 'OK', 'Unverified Accepted', 'Полное решение') else 'WA') for s in subs}
        with ProcessPoolExecutor(max_workers=os.cpu_count()) as ex:
            results = list(ex.map(judge, jobs))
        c = {'AC->AC': 0, 'WA->WA': 0, 'AC->WA': 0, 'WA->AC': 0}
        flagged = []
        for sid, ours, failed in results:
            if ours == 'CE':
                continue
            orig = verdict_of[sid]
            ours2 = 'AC' if ours == 'AC' else 'WA'
            c[f'{orig}->{ours2}'] += 1
            if orig != ours2:
                flagged.append({'id': sid, 'orig': orig, 'ours': ours, 'test': failed})
        details[f.name] = flagged
        report.append((f.name, c))
        print(f"{f.name:32s} agree {c['AC->AC'] + c['WA->WA']:4d}  | orig AC, ours rejects {c['AC->WA']:3d}  | orig WA, ours accepts {c['WA->AC']:3d}")
    (sheet / 'calibration.json').write_text(json.dumps(details, indent=1) + '\n')


if __name__ == '__main__':
    main()
