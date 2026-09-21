#!/usr/bin/env bash
# Deploys/redeploys the Judge0 stack + Nginx/TLS on an already-provisioned VM
# (see provision.sh). Run this FROM YOUR MACHINE; it drives the VM over SSH.
#
# Usage: ./deploy.sh <vm-public-ip>
set -euo pipefail

VM_IP="${1:?Usage: ./deploy.sh <vm-public-ip>}"
SSH_KEY="$HOME/.ssh/icpchue_judge0"
REMOTE="azureuser@${VM_IP}"
JUDGE0_VERSION="1.13.1"

# --- 1. Judge0 release bundle (fetched on the VM, not committed to the repo) ---
ssh -i "$SSH_KEY" "$REMOTE" "curl -fsSL -o /tmp/judge0.zip \
  https://github.com/judge0/judge0/releases/download/v${JUDGE0_VERSION}/judge0-v${JUDGE0_VERSION}.zip \
  && cd /tmp && unzip -o judge0.zip"

# --- 2. Generate fresh secrets locally, build judge0.conf, never commit it ---
if [ ! -f judge0.conf.generated ]; then
  AUTHN_TOKEN=$(openssl rand -hex 32)
  REDIS_PASSWORD=$(openssl rand -hex 24)
  POSTGRES_PASSWORD=$(openssl rand -hex 24)
  cp /tmp/judge0-v${JUDGE0_VERSION}/judge0.conf judge0.conf.generated 2>/dev/null || true
  echo "Generated fresh AUTHN_TOKEN / REDIS_PASSWORD / POSTGRES_PASSWORD."
  echo "AUTHN_TOKEN (save this — it becomes Vercel's JUDGE0_AUTH_TOKEN): $AUTHN_TOKEN"
  sed -i \
    -e "s/^AUTHN_HEADER=.*/AUTHN_HEADER=X-Judge0-Token/" \
    -e "s/^AUTHN_TOKEN=.*/AUTHN_TOKEN=${AUTHN_TOKEN}/" \
    -e "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=${REDIS_PASSWORD}/" \
    -e "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${POSTGRES_PASSWORD}/" \
    -e "s/^COUNT=.*/COUNT=2/" \
    -e "s/^MAX_MEMORY_LIMIT=.*/MAX_MEMORY_LIMIT=600000/" \
    -e "s/^MAX_QUEUE_SIZE=.*/MAX_QUEUE_SIZE=50/" \
    judge0.conf.generated
fi

# --- 3. Ship compose file + generated conf (never the .example) to the VM ---
scp -i "$SSH_KEY" docker-compose.yml "$REMOTE:/opt/judge0/docker-compose.yml"
scp -i "$SSH_KEY" judge0.conf.generated "$REMOTE:/opt/judge0/judge0.conf"
ssh -i "$SSH_KEY" "$REMOTE" "chmod 600 /opt/judge0/judge0.conf"

# --- 4. Bring the stack up (detached from the SSH session so a slow image
#         pull on a small VM doesn't get killed when the connection drops) ---
ssh -i "$SSH_KEY" "$REMOTE" \
  "cd /opt/judge0 && nohup sudo docker compose up -d > up.log 2>&1 < /dev/null & disown"

echo "Started 'docker compose up -d' on the VM in the background."
echo "Poll with: ssh -i $SSH_KEY $REMOTE 'sudo docker compose -f /opt/judge0/docker-compose.yml ps'"

# --- 5. Nginx vhost + TLS (run once DNS for judge.icpchue.com resolves to $VM_IP) ---
scp -i "$SSH_KEY" nginx-judge0.conf "$REMOTE:/tmp/judge0-nginx.conf"
ssh -i "$SSH_KEY" "$REMOTE" "sudo mv /tmp/judge0-nginx.conf /etc/nginx/sites-available/judge0 && \
  sudo ln -sf /etc/nginx/sites-available/judge0 /etc/nginx/sites-enabled/judge0 && \
  sudo nginx -t && sudo systemctl reload nginx && \
  sudo certbot --nginx -d judge.icpchue.com --non-interactive --agree-tos -m you@example.com --redirect"

echo "Done. Verify with: curl https://judge.icpchue.com/system_info -H 'X-Judge0-Token: <token>'"
