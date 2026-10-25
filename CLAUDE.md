# ICPC HUE

Competitive-programming community platform (icpchue.com). Keep answers and exploration short; read only what the task needs.

## Layout
- `next-app/` — main site (Next.js + Supabase, Vercel). For any feature work use the `site-feature` skill.
- `supabase/` — migrations and auth email templates.
- `polygon/` — training sheets as Polygon problems. One folder per sheet (`level0-sheet1/A-say-hello/...`): `problem.json`, `statement.json`, `validator.cpp`, `solution.cpp`, `wrong-*.cpp`, `tests/NN.txt`. Method for every sheet: skill `polygon-sheet`. Push with `python3 polygon/push.py polygon/<sheet>`; ids land in `<sheet>/polygon-ids.json`. Keys in `next-app/.env.local`.
- `pdf_gen/` — progress reports, booklet, certificates, Gamma deck. Use the `print-docs` skill.
- `creative_work/vids/` — recorded sessions edited into chaptered videos. Use the `lesson-video` skill.
- `extension/` — Verdict Helper Chrome extension.
- `whatsapp-worker/`, `icpchue-whatsapp/` — side services.

## Rules
- Printable sheets: no highlights or review notes; small ICPC HUE logo top left.
- Never print or commit secrets (`.env*`). Student ID data is sensitive.
- Commit only when asked.
