#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .env.platform ]]; then echo 'Run python3 deploy/prepare-platform.py first. See docs/PLATFORM-FA.md.' >&2; exit 1; fi
chmod 600 .env.platform
compose=(docker compose --env-file .env.platform -f compose.yml -f compose.platform.yml)
"${compose[@]}" config --quiet
# هیچ پاک‌سازی خودکار image/volume روی میزبان مشترک انجام نمی‌شود.
docker_root=$(docker info --format '{{.DockerRootDir}}')
[[ -d "$docker_root" ]] || docker_root=/
available_kb=$(df -Pk "$docker_root" | awk 'NR==2 {print $4}')
if (( available_kb < 6 * 1024 * 1024 )); then
    echo 'At least 6 GiB free on the Docker filesystem is required for this build. No images/volumes were deleted.' >&2
    exit 1
fi
available_memory_kb=$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)
if (( available_memory_kb < 768 * 1024 )); then
    echo 'Less than 768 MiB available memory. Build the images elsewhere or free resources before deployment.' >&2
    exit 1
fi
# ساخت ترتیبی برای جلوگیری از build هم‌زمان Vue و .NET روی سرور مشترک کم‌حافظه.
"${compose[@]}" build jp-api
"${compose[@]}" build web
"${compose[@]}" up -d --wait redis
"${compose[@]}" run --rm --no-deps jp-migrate
# تصویر جدید web باید جای تصویر استاتیک قبلی قرار بگیرد؛ config bind mount هم دوباره اعمال می‌شود.
"${compose[@]}" up -d --force-recreate --wait --wait-timeout 180 jp-api web
"${compose[@]}" ps
