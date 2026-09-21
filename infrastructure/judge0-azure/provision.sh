#!/usr/bin/env bash
# Provisions the Azure infra for the icpchue Judge0 instance from scratch.
# This is a record of how the running deployment was created, not a
# push-button script — re-running it will try to create resources that
# likely already exist. Read it, adapt names/region, and run pieces as needed.
set -euo pipefail

RG="icpchue-judge0-rg"
LOCATION="eastus"
VM_NAME="icpchue-judge0-vm"
VM_SIZE="Standard_B2als_v2"   # 2 vCPU / 4GB burstable; falls back from Standard_B1ms
                              # if that hits a regional capacity restriction.
SSH_KEY_PATH="$HOME/.ssh/icpchue_judge0"

# One-time resource provider registration (needed on a subscription that has
# never deployed VMs/networking before).
az provider register -n Microsoft.Compute
az provider register -n Microsoft.Network

az group create --name "$RG" --location "$LOCATION"

# Dedicated SSH key for this box — do not reuse an unrelated key.
[ -f "$SSH_KEY_PATH" ] || ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -N "" -C "icpchue-judge0-azure"

az vm create \
  --resource-group "$RG" \
  --name "$VM_NAME" \
  --image Ubuntu2404 \
  --size "$VM_SIZE" \
  --admin-username azureuser \
  --ssh-key-values "${SSH_KEY_PATH}.pub" \
  --custom-data cloud-init.yaml \
  --public-ip-sku Standard \
  --public-ip-address-allocation static \
  --os-disk-size-gb 32 \
  --nsg-rule SSH

NSG_NAME="${VM_NAME}NSG"
az network nsg rule create --resource-group "$RG" --nsg-name "$NSG_NAME" --name Allow-HTTP --priority 200 --destination-port-ranges 80 --access Allow --protocol Tcp --direction Inbound
az network nsg rule create --resource-group "$RG" --nsg-name "$NSG_NAME" --name Allow-HTTPS --priority 210 --destination-port-ranges 443 --access Allow --protocol Tcp --direction Inbound
# Port 2358 (Judge0's own port) is deliberately NOT opened here — it stays
# bound to 127.0.0.1 on the VM and is only reachable through the local Nginx
# reverse proxy set up by deploy.sh.

echo "VM public IP:"
az vm show -d --resource-group "$RG" --name "$VM_NAME" --query publicIps -o tsv

echo "Next steps (manual):"
echo "  1. Point DNS: judge.icpchue.com -> the IP above."
echo "  2. Run deploy.sh (see this directory) to configure Judge0 + Nginx + TLS on the VM."
echo "  3. Set JUDGE0_API_URL / JUDGE0_AUTH_TOKEN in Vercel."

# Optional: a cost-alert budget on this resource group, given the project's
# history of losing hosting to unmonitored spend.
SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
ALERT_EMAIL="you@example.com"   # <-- set this
az rest --method put \
  --url "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG}/providers/Microsoft.Consumption/budgets/icpchue-judge0-monthly?api-version=2023-11-01" \
  --body "$(cat <<JSON
{
  "properties": {
    "category": "Cost",
    "amount": 40,
    "timeGrain": "Monthly",
    "timePeriod": { "startDate": "$(date -u +%Y-%m-01T00:00:00Z)", "endDate": "2027-12-31T00:00:00Z" },
    "notifications": {
      "Actual_GreaterThan_50_Percent": { "enabled": true, "operator": "GreaterThan", "threshold": 50, "contactEmails": ["${ALERT_EMAIL}"], "contactRoles": [], "contactGroups": [] },
      "Actual_GreaterThan_90_Percent": { "enabled": true, "operator": "GreaterThan", "threshold": 90, "contactEmails": ["${ALERT_EMAIL}"], "contactRoles": [], "contactGroups": [] }
    }
  }
}
JSON
)"
