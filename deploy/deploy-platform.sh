#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .env.platform ]]; then echo 'Create .env.platform from .env.platform.example first. See docs/PLATFORM-FA.md.' >&2; exit 1; fi
chmod 600 .env.platform
compose=(docker compose --env-file .env.platform -f compose.yml -f compose.platform.yml)
"${compose[@]}" config --quiet
"${compose[@]}" build
"${compose[@]}" up -d --wait redis
"${compose[@]}" run --rm --no-deps jp-api --migrate
"${compose[@]}" up -d --wait --wait-timeout 180
"${compose[@]}" ps
