FROM pyd4vinci/scrapling:latest

ENTRYPOINT []

WORKDIR /app

# Install Xvfb (virtual display) and xdotool (OS-level mouse clicks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    xdotool \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 8787

CMD ["./entrypoint.sh"]
