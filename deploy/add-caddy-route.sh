#!/usr/bin/env bash
set -euo pipefail
# این اسکریپت فقط پس از شناسایی فایل فعال Caddy استفاده شود.
if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  printf 'Usage: bash deploy/add-caddy-route.sh HOST_CADDYFILE CADDY_CONTAINER [CONTAINER_CADDYFILE]\n' >&2
  exit 2
fi
config=$1
container=$2
inside=${3:-/etc/caddy/Caddyfile}
snippet="$(dirname "${BASH_SOURCE[0]}")/Caddyfile.snippet"
[ -f "$config" ] && [ -w "$config" ] || { printf 'Config is missing or not writable.\n' >&2; exit 1; }
# از اضافه‌کردن میزبان تکراری در فایل اصلی جلوگیری می‌شود.
if grep -Fq 'jpperformance.co.uk' "$config"; then
  printf 'Domain already occurs in this file. Review manually; nothing changed.\n' >&2
  exit 1
fi
docker inspect "$container" --format '{{json .NetworkSettings.Networks}}' | grep -Fq '"hosting-edge"' || {
  printf 'Caddy is not connected to hosting-edge. Nothing changed.\n' >&2; exit 1;
}
docker exec "$container" caddy validate --config "$inside" --adapter caddyfile
backup="${config}.jp-backup-$(date -u +%Y%m%dT%H%M%SZ)"
cp -p -- "$config" "$backup"
restore() {
  cat -- "$backup" > "$config"
  printf '\nConfig restored from %s\n' "$backup" >&2
}
# نوشتن در همان فایل، اتصال bind mount تک‌فایلی را حفظ می‌کند.
printf '\n' >> "$config"
cat -- "$snippet" >> "$config"
if ! docker exec "$container" caddy validate --config "$inside" --adapter caddyfile; then
  restore
  exit 1
fi
if ! docker exec "$container" caddy reload --config "$inside" --adapter caddyfile; then
  restore
  docker exec "$container" caddy reload --config "$inside" --adapter caddyfile || true
  exit 1
fi
printf '\nDomain route added. Backup: %s\n' "$backup"
printf 'Verify https://jpperformance.co.uk/ and https://www.jpperformance.co.uk/\n'
