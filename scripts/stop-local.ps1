$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$file = Join-Path $root ".local\processes.json"
if (!(Test-Path -LiteralPath $file)) { "CareLink has no recorded local processes."; exit 0 }
$state = Get-Content -LiteralPath $file -Raw | ConvertFrom-Json
foreach ($id in @($state.api, $state.web)) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $id" -ErrorAction SilentlyContinue
    if ($process -and $process.CommandLine -and ($process.CommandLine.Contains($root))) { Stop-Process -Id $id -ErrorAction SilentlyContinue }
}
Remove-Item -LiteralPath $file
"CareLink local processes stopped. Database and uploaded files are preserved."
