# JP Performance website

Corporate website for JP PERFORMANCE LTD, with free BMI/rest tools, an illustrated exercise library and editable workout/meal planners. See `docs/WEBSITE-FITNESS-HUB-FA.md` for the fitness hub and deployment guide.

## Run locally on Windows

Install and start Docker Desktop with Linux containers. From the project directory:

```powershell
docker compose -f compose.local.yml up -d --wait
Start-Process 'http://localhost:8092'
```

No shared server network, Caddy, database or Node installation is required. The first run downloads the Nginx image. Source files are mounted from `site/`; edit and refresh your browser.

```powershell
# Status
docker compose -f compose.local.yml ps
# Logs
docker compose -f compose.local.yml logs --tail=100 web
# Stop this local project
docker compose -f compose.local.yml down
```

The default port is bound only to 127.0.0.1. To choose a different port, copy `.env.example` to `.env` and change `JP_LOCAL_PORT`. Re-run the up command and open the selected port.

## Production

`compose.yml` is for the existing shared Docker server. It uses the external `hosting-edge` network, exposes Nginx internally on port 8080, and publishes no host ports. Caddy handles the public domain and TLS. See `README-FA.md` for deployment and `deploy/Caddyfile.snippet` for the route.

Known Caddy container from the server inventory: `hosting-edge-caddy-1`. The active config file is `/opt/kpdc/deploy/hetzner/edge/config/Caddyfile`; do not add the domain route again during routine updates.

## Repository

Commit `site/`, `deploy/`, `docs/`, both Compose files and the README/configuration files. Do not commit secrets or incorporation documents. No GitHub Actions workflows are included.

## Current scope

This is a static corporate website, with a mailto draft composer and a local-storage workout demo. It is not an Android app. Production deployment, domain email and Play Console registration are separate steps. See `docs/VERIFICATION-FA.md` for validation and limitations.


## Coaching platform 0.2

See [docs/PLATFORM-FA.md](docs/PLATFORM-FA.md) for the separate ASP.NET Core 10 API, Vue member/coach portal, local Docker commands, security tests and production rollout prerequisites. This branch is a private technical preview; production public registration is closed by default. The old static-only deployment command does not enable the portal.
