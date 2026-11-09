$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
dotnet build platform/Api
if ($LASTEXITCODE -ne 0) { throw 'API build failed' }
node tests/platform.integration.cjs
if ($LASTEXITCODE -ne 0) { throw 'Platform HTTP tests failed' }
node tests/proxy-security.cjs
if ($LASTEXITCODE -ne 0) { throw 'Trusted proxy / secure cookie tests failed' }
node tests/fitness-core.test.cjs
if ($LASTEXITCODE -ne 0) { throw 'Website tests failed' }
node tests/access-entry.test.cjs
if ($LASTEXITCODE -ne 0) { throw 'Workspace-entry tests failed' }
node tests/member-nav.test.cjs
if ($LASTEXITCODE -ne 0) { throw 'Public member navigation tests failed' }
npm --prefix platform/Portal ci
if ($LASTEXITCODE -ne 0) { throw 'Frontend installation failed' }
npm --prefix platform/Portal run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
