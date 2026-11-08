#!/usr/bin/env bash
set -euo pipefail
# بررسی فقط‌خواندنی؛ متغیرهای محیطی و کلیدهای خصوصی چاپ نمی‌شوند.
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
printf '\nShared network:\n'
if docker network inspect hosting-edge --format '{{range .Containers}}{{println .Name}}{{end}}'; then :; else
  printf 'hosting-edge was not found. Stop before deploying.\n'
fi
printf '\nCaddy containers and configuration mounts:\n'
while IFS= read -r id; do
  [ -n "$id" ] || continue
  image=$(docker inspect "$id" --format '{{.Config.Image}}')
  case "$image" in
    *caddy*)
      docker inspect "$id" --format 'Name: {{.Name}}{{println}}{{range .Mounts}}Mount: {{.Source}} -> {{.Destination}}{{println}}{{end}}Networks: {{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
      ;;
  esac
done < <(docker ps -q)
