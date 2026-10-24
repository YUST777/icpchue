---
name: print-docs
description: Make or update ICPC HUE printables in pdf_gen/ — community progress report PDF (EN/AR/EG), A6 pocket booklet, certificates, cheques, and the Gamma presentation deck. Use for any report, booklet, certificate, slides/deck or "PDF" request.
---

# ICPC HUE printables (`pdf_gen/`)

Work only inside the folder for the job. Don't explore the others.

| Job | Edit here | Build | Output |
|---|---|---|---|
| Progress report | `progress-report/{en,ar,eg,old}/pages/page-NN.html` (+ `header.html`/`footer.html` = shared CSS) | `python3 pdf_gen/build.py en` (or `ar`, `eg`, `old`) | `pdf_gen/output/pdf/ICPC-HUE-Report-*.pdf` |
| Pocket booklet (A6, AR) | `booklet/pages/page-NN.html` | `python3 pdf_gen/build.py booklet` | `output/pdf/ICPC-HUE-Pocket-Booklet-*.pdf` |
| Certificates | `certificates/generator/roster.csv` | `cd pdf_gen/certificates/generator && python3 make_all.py` (or `make_all.py 7 23` for some rows) | `certificates/generator/output/` — see its `README.md` |
| Cheques | `certificates/cheques/` | `python3 pdf_gen/certificates/cheques/fill_cheques.py` | `certificates/cheques/filled/` |
| Gamma deck (slides) | `progress-report/gamma/*-Gamma-Import.md` | Paste into gamma.app (Import → text). `build_gamma_report.py` makes a PDF version | `output/pdf/*Gamma-Style.pdf` |

## Rules
- The build assembles header + pages + footer into `output/html/`, then prints with headless `google-chrome`. Check `Pages:` in the output against the expected count in `build.py` `REPORTS`.
- Adding or removing a page: rename the files so they stay `page-01..NN`, and update `pages` in `build.py`.
- Images: put photos and logos in `pdf_gen/assets/` (`brand/` = logos, QR, site shots; `dcc/`, `ecpc_*`, `fb/` = event photos). From a page, reference them as `../../assets/...` (this path is relative to `output/html/`).
- An edit to one language usually needs the same edit in `en`, `ar` and `eg`. Ask before assuming.
- Printables: no highlights or review notes. Small ICPC HUE logo top left.
- To check your work, render only the changed page: `pdftoppm -f N -l N -r 60 -png <pdf> /tmp/p`, then view that image. Don't read the whole PDF.
- `progress-report/past-editions/` holds old finished PDFs. They are read-only.
- Facebook photo scraping: `scripts/fb_scrape.py` (the login is kept in `pdf_gen/.fb_profile/`, which is never committed). Site screenshots: `scripts/site_shots.py`. Run both from `pdf_gen/`.
