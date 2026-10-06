$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (!(Test-Path -LiteralPath $root)) { throw "Project directory not found." }
$file = Join-Path $root ".env"
if (Test-Path -LiteralPath $file) { ".env already exists. Existing settings were preserved."; exit 0 }
function RandomSecret([int]$length) {
    $bytes = New-Object byte[] $length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes); $rng.Dispose()
    return [Convert]::ToBase64String($bytes)
}
@("SQL_PASSWORD=Cl!$(RandomSecret 24)", "JWT_KEY=$(RandomSecret 64)", "ADMIN_PASSWORD=Adm!$(RandomSecret 24)", "WEB_PORT=8080", "API_PORT=5080") | Set-Content -LiteralPath $file -Encoding ASCII
"Created .env with random secrets. Keep it private. Admin password is ADMIN_PASSWORD in this file."
