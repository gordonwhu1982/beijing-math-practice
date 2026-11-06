# Headless screenshot. Runs outside the IDE browser and always returns.
# Do not call Page.captureScreenshot or resize the IDE viewport.
param(
  [Parameter(Mandatory = $true)][string]$Route,
  [string]$OutFile = ""
)
$ErrorActionPreference = "Stop"
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" }
$shotDir = Join-Path (Split-Path $PSScriptRoot -Parent) "screenshots\density"
if (-not $OutFile) { $OutFile = Join-Path $shotDir ($Route + ".png") }
New-Item -ItemType Directory -Force -Path (Split-Path $OutFile) | Out-Null
if (Test-Path $OutFile) { Remove-Item $OutFile -Force }
$profile = Join-Path $env:TEMP ("mc-shot-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $profile | Out-Null
$url = "http://127.0.0.1:8765/design/ux-redesign/prototype/index.html?fresh=shot#/" + $Route
$args = @(
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--user-data-dir=$profile",
  "--force-device-scale-factor=1",
  "--window-size=2360,1640",
  "--virtual-time-budget=8000",
  "--screenshot=$OutFile",
  $url
)
$proc = Start-Process -FilePath $edge -ArgumentList $args -PassThru -WindowStyle Hidden
$finished = $proc.WaitForExit(12000)
if (-not $finished) {
  & taskkill.exe /PID $proc.Id /T /F | Out-Null
  Write-Output "TIMEOUT $Route"
  exit 2
}
$deadline = (Get-Date).AddSeconds(3)
while (-not (Test-Path $OutFile) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 200 }
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path $OutFile) {
  Write-Output ("OK " + $OutFile + " " + (Get-Item $OutFile).Length)
  exit 0
}
Write-Output "NOFILE $Route"
exit 3
