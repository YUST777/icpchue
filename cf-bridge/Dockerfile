# Lightweight Codeforces read-bridge — NO headless browser.
# curl_cffi ships a bundled libcurl-impersonate, so the image stays tiny
# (~150MB vs the old scrapling/Playwright image at ~1.5GB).
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api/ ./api/

EXPOSE 8787

CMD ["uvicorn", "api.index:app", "--host", "0.0.0.0", "--port", "8787", "--workers", "2"]
