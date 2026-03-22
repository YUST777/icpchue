#!/bin/bash
# Clean up stale Xvfb lock files from previous runs
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99

# Start Xvfb on display :99 (1280x720, 24-bit color)
Xvfb :99 -screen 0 1280x720x24 -nolisten tcp &
export DISPLAY=:99

# Disable dbus to prevent Firefox from hanging
export DBUS_SESSION_BUS_ADDRESS=/dev/null

# Wait for Xvfb to be ready
sleep 1

# Start the app
exec uvicorn main:app --host 0.0.0.0 --port 8787 --workers 1
