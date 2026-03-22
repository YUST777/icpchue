#!/bin/bash
# Start Xvfb on display :99 (1280x720, 24-bit color)
# Needed for Camoufox headless="virtual" mode
Xvfb :99 -screen 0 1280x720x24 -nolisten tcp &
export DISPLAY=:99

# Wait for Xvfb to be ready
sleep 1

# Start the app (single worker — Camoufox manages its own browser pool)
exec uvicorn main:app --host 0.0.0.0 --port 8787 --workers 1
