# Judge0 on Azure

Self-hosted Judge0 (code-execution sandbox for the "Run Tests" / local judging
feature), replacing the free public `ce.judge0.com` API that stopped working
reliably. Runs as Docker Compose on a single Azure VM — Judge0's sandbox
(`isolate`) needs privileged/cgroup access that Azure Container Instances and
Container Apps don't allow, so a plain VM (same shape as the project's old,
now-deleted, self-hosted stack) is the only viable target.

## Current deployment

- **Resource group**: `icpchue-judge0-rg` (`eastus`)
- **VM**: `icpchue-judge0-vm`, `Standard_B2als_v2` (2 vCPU / 4GB, burstable AMD).
  `Standard_B1ms` was the original target (~$22/mo vs. ~$34/mo) but hit a
  `SkuNotAvailable` capacity restriction on this subscription in `eastus` at
  deploy time — `B2als_v2` meets Judge0's own documented minimum spec directly
  (2 vCPU/4GB), so no memory-pressure mitigation is strictly needed, though the
  2GB swapfile and the app's 512MB `memoryLimit` clamp are still in place as
  defense in depth.
- **OS**: Ubuntu 24.04 LTS, booted with `systemd.unified_cgroup_hierarchy=0`
  (see "cgroup v1 gotcha" below) — **do not remove this kernel parameter**,
  Judge0 will silently fail every submission with `Internal Error` without it.
- **Exposure**: `https://judge.icpchue.com` → host Nginx (TLS via Let's
  Encrypt/certbot) → `127.0.0.1:2358` (Judge0's own port is never exposed on
  the NSG/publicly — only 22/80/443 are open).
- **Judge0 version**: `judge0/judge0:1.13.1` (official image, not the
  `mrkushalsm/judge0` fork the old deleted setup used).
- **Cost guardrail**: an Azure budget (`icpchue-judge0-monthly`, $40/mo
  threshold, 50%/90% email alerts) is set on the resource group — the project
  has a history of silently running out of hosting credit, don't let it happen
  again unnoticed.

## The cgroup v1 gotcha (read this before touching the VM)

Judge0 1.13.1 bundles `isolate` 1.8.1, which only understands the **legacy
cgroup v1** hierarchy (`/sys/fs/cgroup/memory/box-N/`). Ubuntu 24.04 boots with
**cgroup v2 only** by default, which has no such path — every submission fails
with `{"status":{"id":13,"description":"Internal Error"}}` and no other
explanation. Fixed by adding `systemd.unified_cgroup_hierarchy=0` to
`GRUB_CMDLINE_LINUX_DEFAULT` in `/etc/default/grub`, `sudo update-grub`, and a
reboot. If you ever rebuild this VM from a fresh Ubuntu 24.04+ image, you must
redo this step first — verify with `stat -fc %T /sys/fs/cgroup/` (`tmpfs`/mixed
= good, `cgroup2fs` = still broken) before deploying the stack.

## Files here

- `cloud-init.yaml` — first-boot provisioning (Docker, Nginx, certbot, 2GB swapfile).
- `docker-compose.yml` — the four Judge0 services (server, workers, db, redis),
  adapted from the official `judge0/judge0` v1.13.1 release bundle: server port
  bound to `127.0.0.1` only, and per-service memory limits sized for a 4GB box.
- `judge0.conf.example` — template config. **The real `judge0.conf` (with
  live secrets) is never committed** — it's generated fresh per deploy by
  `deploy.sh` and lives only on the VM (`/opt/judge0/judge0.conf`, `chmod 600`).
  The project's old deleted infra committed real secrets in its very first
  commit and they're permanently visible in git history — don't repeat that.
- `nginx-judge0.conf` — the reverse-proxy vhost for `judge.icpchue.com`.
- `provision.sh` — a record of the `az` commands used to stand this up (not
  fully idempotent — re-running it will try to recreate existing resources).
- `deploy.sh` — (re)deploys the Judge0 stack + Nginx/TLS onto an already-
  provisioned VM over SSH.

## Operating it

```bash
# SSH in
ssh -i ~/.ssh/icpchue_judge0 azureuser@<vm-ip>

# Check container health
cd /opt/judge0 && sudo docker compose ps
sudo docker compose logs -f server

# Restart the stack
sudo docker compose restart

# Rotate a secret (e.g. AUTHN_TOKEN): edit /opt/judge0/judge0.conf, then
sudo docker compose up -d
# ...and update JUDGE0_AUTH_TOKEN in Vercel to match.
```

Health check from anywhere: `curl https://judge.icpchue.com/system_info -H "X-Judge0-Token: <token>"`.

## App-side wiring

The Next.js app (`next-app/`) reads `JUDGE0_API_URL` and `JUDGE0_AUTH_TOKEN`
from Vercel env vars — see `next-app/.env.example`. The `memoryLimit` a client
can request is capped at 512MB in `next-app/app/api/judge/test/route.ts`'s Zod
schema (and clamped server-side in `submit/route.ts`) to stay within this VM's
memory budget; `judge0.conf`'s `MAX_MEMORY_LIMIT=600000` (KB) matches that.
