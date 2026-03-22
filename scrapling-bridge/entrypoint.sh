#!/bin/bash
# Start Xvfb on display :99 (1280x720, 24-bit color)
Xvfb :99 -screen 0 1280x720x24 -nolisten tcp &
export DISPLAY=:99

# Wait for Xvfb to be ready
sleep 1

# Start the app
exec uvicorn main:app --host 0.0.0.0 --port 8787 --workers 2
