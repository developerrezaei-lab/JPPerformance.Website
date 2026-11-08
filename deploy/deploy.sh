#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# شبکه مشترک باید از قبل توسط ورودی اصلی سرور ساخته شده باشد.
docker network inspect hosting-edge >/dev/null
docker compose config --quiet
docker compose up -d --wait --wait-timeout 90
printf '\nJP Performance web container is healthy. No host ports were added.\n'
printf 'Connect the domain using deploy/Caddyfile.snippet after reviewing the active Caddy configuration.\n'
