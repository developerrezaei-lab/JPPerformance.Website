$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:Bootstrap__Email = Read-Host 'New administrator email'
$secret = Read-Host 'Administrator password (12+ characters)' -AsSecureString
try {
    $env:Bootstrap__Password = [System.Net.NetworkCredential]::new('', $secret).Password
    docker compose -f compose.platform.local.yml run --rm --no-deps -e Bootstrap__Email -e Bootstrap__Password jp-api --bootstrap-admin
    if ($LASTEXITCODE -ne 0) { throw 'Administrator bootstrap failed; inspect the error above.' }
} finally {
    Remove-Item Env:Bootstrap__Password -ErrorAction SilentlyContinue
    Remove-Item Env:Bootstrap__Email -ErrorAction SilentlyContinue
    $secret.Dispose()
}
