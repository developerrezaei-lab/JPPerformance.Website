[CmdletBinding()]
param([switch]$Build)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$argsList = @('compose', '-f', 'compose.platform.local.yml', 'up', '-d', '--wait', '--wait-timeout', '180')
if ($Build) { $argsList += '--build' }
& docker @argsList
if ($LASTEXITCODE -ne 0) { throw 'Platform did not become healthy. Run docker compose -f compose.platform.local.yml logs --tail=100' }
$port = if ($env:JP_PLATFORM_PORT) { $env:JP_PLATFORM_PORT } else { '8093' }
Start-Process "http://localhost:$port/portal/"
