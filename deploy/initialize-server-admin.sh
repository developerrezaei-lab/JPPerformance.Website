#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[[ -f .env.platform ]] || { echo 'Deploy the platform first.' >&2; exit 1; }
trap 'unset Bootstrap__Password Bootstrap__Email' EXIT
read -rp 'New administrator email: ' Bootstrap__Email
read -rsp 'New administrator password (12+ characters): ' Bootstrap__Password
printf '\n'
export Bootstrap__Email Bootstrap__Password
docker compose --env-file .env.platform -f compose.yml -f compose.platform.yml run --rm --no-deps -e Bootstrap__Email -e Bootstrap__Password jp-api --bootstrap-admin
printf 'Administrator initialisation finished. Sign in through /login/.\n'
