#!/usr/bin/env bash
# Run on the Lightsail VM after staging a reviewed candidate Compose file.
set -Eeuo pipefail
cd "$(dirname "$0")"
candidate=compose.registry.yaml.next
active=compose.registry.yaml
for file in deploy.env "$candidate" "$active"; do
  if [[ ! -f "$file" ]]; then
    printf 'Missing %s in %s\n' "$file" "$PWD" >&2
    exit 1
  fi
done
for command in sudo curl; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Required command is missing: %s\n' "$command" >&2
    exit 1
  fi
done
printf '1/5 Checking the candidate Compose instructions...\n'
sudo docker compose --env-file deploy.env -f "$candidate" config --quiet
printf '2/5 Downloading the candidate API and web images...\n'
sudo docker compose --env-file deploy.env -f "$candidate" pull devops-home-inventory-api web
printf '3/5 Starting the candidate and waiting for service health...\n'
if ! sudo docker compose --env-file deploy.env -f "$candidate" up --no-build --detach --wait --wait-timeout 180; then
  printf 'Startup failed. The active release file was not replaced. Inspect Compose status and logs before rollback.\n' >&2
  exit 1
fi
printf '4/5 Checking the website and database readiness route on VM loopback...\n'
if ! curl --fail --silent --show-error --output /dev/null 'http://127.0.0.1:8084/'; then
  printf 'Website check failed. The active release file was not replaced.\n' >&2
  exit 1
fi
if ! curl --fail --silent --show-error --output /dev/null 'http://127.0.0.1:8084/api/ready'; then
  printf 'Readiness check failed. The active release file was not replaced.\n' >&2
  exit 1
fi
printf '5/5 Saving the previous release instructions and promoting the candidate...\n'
previous="compose.registry.previous.$(date -u +%Y%m%dT%H%M%SZ).yaml"
cp -- "$active" "$previous"
mv -- "$candidate" "$active"
printf 'Release passed VM checks. Previous instructions: %s\n' "$previous"
sudo docker compose --env-file deploy.env -f "$active" ps
printf 'Now check the item workflow through the private SSH tunnel.\n'