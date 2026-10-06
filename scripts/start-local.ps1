param(
    [string]$ConnectionString = "Server=.\SQLEXPRESS;Database=CareLink;Integrated Security=True;TrustServerCertificate=True",
    [int]$ApiPort = 5080,
    [int]$WebPort = 5173,
    [switch]$OpenBrowser
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$local = Join-Path $root ".local"
if (!(Test-Path -LiteralPath $root)) { throw "Project directory not found." }
if (!(Get-Command dotnet -ErrorAction SilentlyContinue)) { throw "Install the .NET 10 SDK first." }
if (!(Test-Path -LiteralPath $local)) { New-Item -ItemType Directory -Path $local | Out-Null }
$running = Join-Path $local "processes.json"
if (Test-Path -LiteralPath $running) {
    $old = Get-Content -LiteralPath $running -Raw | ConvertFrom-Json
    if ((Get-Process -Id $old.api -ErrorAction SilentlyContinue) -and (Get-Process -Id $old.web -ErrorAction SilentlyContinue)) {
        "CareLink is already running: http://localhost:$($old.webPort)"
        "Swagger: http://localhost:$($old.apiPort)/swagger"
        if ($OpenBrowser) { Start-Process "http://localhost:$($old.webPort)" }
        exit 0
    }
}
foreach ($port in @($ApiPort, $WebPort)) { if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { throw "Port $port is in use. Use another port or scripts/stop-local.ps1." } }
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if ($nodeCommand) { $node = $nodeCommand.Source }
else {
    $portable = Join-Path $env:TEMP "opencode\carelink-node\node-v22.22.0-win-x64\node.exe"
    if (Test-Path -LiteralPath $portable) { $node = $portable }
    else {
        $node = Join-Path $local "tools\node-v22.22.0-win-x64\node.exe"
        if (!(Test-Path -LiteralPath $node)) {
            "Downloading portable Node.js 22 (no global installation)..."
            if (!(Test-Path -LiteralPath $local)) { throw "Local tools parent directory is missing." }
            $archive = Join-Path $local "node.zip"
            Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/v22.22.0/node-v22.22.0-win-x64.zip" -OutFile $archive
            Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $local "tools") -Force
        }
    }
}
$env:PATH = (Split-Path -Parent $node) + ";" + $env:PATH
$npm = Join-Path (Split-Path -Parent $node) "npm.cmd"
$web = Join-Path $root "web"
if (!(Test-Path -LiteralPath (Join-Path $web "node_modules\vite\bin\vite.js"))) {
    "Installing frontend dependencies..."
    & $npm ci --prefix $web --no-fund
    if ($LASTEXITCODE -ne 0) { throw "Frontend dependency installation failed." }
}
$settingsFile = Join-Path $local "settings.json"
if (!(Test-Path -LiteralPath $settingsFile)) {
    $bytes = New-Object byte[] 64
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes); $rng.Dispose()
    @{ jwtKey = [Convert]::ToBase64String($bytes) } | ConvertTo-Json | Set-Content -LiteralPath $settingsFile -Encoding UTF8
}
$settings = Get-Content -LiteralPath $settingsFile -Raw | ConvertFrom-Json
& dotnet build (Join-Path $root "src\CareLink.Api\CareLink.Api.csproj") --nologo
if ($LASTEXITCODE -ne 0) { throw "Backend build failed." }
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = "http://localhost:$ApiPort"
$env:ConnectionStrings__Default = $ConnectionString
$env:Jwt__Key = $settings.jwtKey
$env:Cors__Origins__0 = "http://localhost:$WebPort"
$env:Cors__Origins__1 = "http://127.0.0.1:$WebPort"
$env:CARELINK_API_URL = "http://localhost:$ApiPort"
$apiFile = Join-Path $root "src\CareLink.Api\bin\Debug\net10.0\CareLink.Api.dll"
$api = Start-Process -FilePath "dotnet" -ArgumentList ('"' + $apiFile + '"') -WorkingDirectory (Join-Path $root "src\CareLink.Api") -RedirectStandardOutput (Join-Path $local "api.out.log") -RedirectStandardError (Join-Path $local "api.err.log") -WindowStyle Hidden -PassThru
$viteFile = Join-Path $web "node_modules\vite\bin\vite.js"
$frontend = Start-Process -FilePath $node -ArgumentList @(('"' + $viteFile + '"'), "--host", "127.0.0.1", "--port", "$WebPort", "--strictPort") -WorkingDirectory $web -RedirectStandardOutput (Join-Path $local "web.out.log") -RedirectStandardError (Join-Path $local "web.err.log") -WindowStyle Hidden -PassThru
@{ api = $api.Id; web = $frontend.Id; apiPort = $ApiPort; webPort = $WebPort } | ConvertTo-Json | Set-Content -LiteralPath $running -Encoding UTF8
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    if ($api.HasExited -or $frontend.HasExited) { break }
    try { $health = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$ApiPort/health" -TimeoutSec 2; $webResponse = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$WebPort/" -TimeoutSec 2; if ($health.StatusCode -eq 200 -and $webResponse.StatusCode -eq 200) { $ready = $true; break } } catch { }
}
if (!$ready) { if (!$api.HasExited) { Stop-Process -Id $api.Id }; if (!$frontend.HasExited) { Stop-Process -Id $frontend.Id }; throw "Startup failed. See .local/api.out.log and .local/web.err.log. Check SQL Server and connection string." }
"CareLink is ready: http://localhost:$WebPort"
"Swagger: http://localhost:$ApiPort/swagger"
"Stop: powershell -ExecutionPolicy Bypass -File scripts/stop-local.ps1"
if ($OpenBrowser) { Start-Process "http://localhost:$WebPort" }
