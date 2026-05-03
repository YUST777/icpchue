#!/bin/sh
# Certbot deploy hook: reload icpchue nginx so renewed certs are picked up.
# Install: chmod +x ... && sudo ln -sf "$(pwd)/letsencrypt-renew-reload-nginx.sh" \
#   /etc/letsencrypt/renewal-hooks/deploy/reload-icpchue-nginx.sh
docker compose -f /home/ubuntu/icpchue/docker-compose.yml exec -T nginx nginx -s reload
