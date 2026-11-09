param([switch]$Recreate, [switch]$Stop)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Read-EnvValue {
    param([string]$Path, [string]$Key)
    $line = Get-Content -LiteralPath $Path | Where-Object { $_ -match "^\s*$([regex]::Escape($Key))=" } | Select-Object -Last 1
    if (-not $line) { throw "Missing $Key in $Path" }
    $value = ($line -split '=', 2)[1].Trim()
    if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    if (-not $value) { throw "Empty $Key in $Path" }
    return $value
}

$dbName = Read-EnvValue (Join-Path $root '.env') 'POSTGRES_DB'
$password = Read-EnvValue (Join-Path $root '.env') 'POSTGRES_PASSWORD'
$serverUrl = Read-EnvValue (Join-Path $root 'server\.env') 'DATABASE_URL'
$uri = [uri]$serverUrl
if ($uri.Host -ne '127.0.0.1' -or $uri.Port -ne 5433) {
    throw 'Expected the existing server DATABASE_URL to point to 127.0.0.1:5433.'
}
$encodedPassword = ($uri.UserInfo -split ':', 2)[1]
if ([uri]::UnescapeDataString($encodedPassword) -cne $password) {
    throw 'The database passwords in .env and server\.env do not match.'
}
$labUrl = $serverUrl.Replace('@127.0.0.1:5433', '@db:5432')
$keys = @('POSTGRES_DB', 'POSTGRES_PASSWORD', 'DATABASE_URL')
$original = @{}
foreach ($key in $keys) {
    $original[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}
try {
    [Environment]::SetEnvironmentVariable('POSTGRES_DB', $dbName, 'Process')
    [Environment]::SetEnvironmentVariable('POSTGRES_PASSWORD', $password, 'Process')
    [Environment]::SetEnvironmentVariable('DATABASE_URL', $labUrl, 'Process')
    Push-Location $root
    try {
        docker compose -f compose.lab.yaml config --quiet
        if ($LASTEXITCODE -ne 0) { throw 'Compose configuration validation failed.' }
        if ($Recreate -or $Stop) {
            docker compose -f compose.lab.yaml down
            if ($LASTEXITCODE -ne 0) { throw 'Compose shutdown failed.' }
        }
        if ($Stop) { return }
        docker compose -f compose.lab.yaml up --build --detach
        if ($LASTEXITCODE -ne 0) { throw 'Compose startup failed.' }
    } finally {
        Pop-Location
    }
} finally {
    foreach ($key in $keys) {
        [Environment]::SetEnvironmentVariable($key, $original[$key], 'Process')
    }
}

