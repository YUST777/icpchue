#!/bin/bash
# Start Xvfb on display :99 (1280x720, 24-bit color)
Xvfb :99 -screen 0 1280x720x24 -nolisten tcp &
export DISPLAY=:99

# Wait for Xvfb to be ready
sleep 1

# Start a minimal window manager so browser windows are positioned predictably
# fluxbox/openbox are too heavy; use a simple approach: just let the browser run
# We'll use xdotool to find and position the window after it opens

# Start the app
exec uvicorn main:app --host 0.0.0.0 --port 8787 --workers 2
