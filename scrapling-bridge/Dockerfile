FROM pyd4vinci/scrapling:latest

ENTRYPOINT []

WORKDIR /app

# Install Xvfb (virtual display) for Camoufox headless="virtual" mode
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Camoufox browser binary
RUN python -m camoufox fetch

COPY main.py .
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 8787

CMD ["./entrypoint.sh"]
