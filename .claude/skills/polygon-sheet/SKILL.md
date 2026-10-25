---
name: polygon-sheet
description: Make, fix or push an ICPC HUE Level 0 training sheet as Polygon problems (polygon/level0-sheetN). Use for "make level0-sheet3", new problems, validators, wrong solutions, tests, calibration against the original judge, or pushing to Polygon.
---

# ICPC HUE Polygon sheets (`polygon/`)

Same method for every Level 0 sheet. Work only in `polygon/` and the sheet folder; don't explore the rest. Sonnet is enough; use Opus only for a tricky special checker.

## Folder per problem: `polygon/level0-sheetN/<LETTER>-<slug>/`
`problem.json` (name = plain slug, no prefix; title; timeLimit; memoryLimit; checker; samples), `statement.json` (legend, input, output, notes, in Polygon TeX; write our own wording, same task and limits as the original), `solution.cpp`, `validator.cpp`, at least one `wrong-*.cpp`, `tests/NN.txt` (samples first). `testlib.h` lives in `level0-sheet1/`.

## Rules (all required)
1. **Validator for every problem**, strict (`readSpace`, `readEoln`, `readEof`), with the exact limits from the statement. Must accept every test.
2. **Tests**: samples, min and max of every limit, edge cases (0, negatives, equal values, ties), then random. Answers come from `solution.cpp`. Keep the checker's tolerance and the test inputs inside the statement's limits.
3. **Wrong solutions**: at least one realistic mistake per problem (overflow, off-by-one, wrong rounding, missed case). Each must fail at least one test.
4. **Checker = the original judge's strictness.** The original is whitespace-exact (stray or doubled spaces, blank lines are WA). Use `common/strict.cpp` copied to the folder as `checker.cpp` (`"checker": "checker.cpp"`; add `#define TOK_EPS 1e-5` on top where the original accepts small float differences). Use `std::rcmp6.cpp` only for pure-real outputs. Not `wcmp`: it is too lenient and accepts what the original rejects.
5. Names are plain slugs (`say-hello`, `s2-one-to-n`), unique in the Polygon account. Never rename after pushing: the API cannot rename or delete problems.

## Workflow
1. Write or edit the problem folder (or a spec in `polygon/sheets/*.py` and run `python3 polygon/build.py <spec> <sheet-folder>`; build keeps an existing `validator.cpp`).
2. `python3 polygon/check.py polygon/<sheet>` — validators accept all tests, wrong solutions are caught, solutions run. Fix until all pass.
3. **Calibrate** against the original judge, when the original contest exists in the DB (read-only; prints no student data): `python3 polygon/calibrate.py polygon/<sheet> <contest_id>`. Aim for at least 98% agreement overall and at least 90% per problem. Orig-WA/ours-AC means our tests or checker are too weak. Orig-AC/ours-WA is fine when the submission is truly wrong (hardcoded output, overflow, wrong order). Fix and re-run.
4. `python3 -u polygon/push.py polygon/<sheet>` (idempotent; paces itself; ids go to `<sheet>/polygon-ids.json`). Then open Polygon → Packages and confirm every build passes.
5. Commit only when asked.

## Mobile and submission
Polygon does not judge. Judging happens in a Codeforces Gym contest built from these packages. Students can copy code and submit on the Codeforces site; the site backfills verdicts from the Codeforces API. Auto-submit needs the desktop extension.
