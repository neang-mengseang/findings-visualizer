# findings-visualizer install script (PowerShell)
# Usage:
#   .\scripts\install.ps1                    # install to default Devin skill dir
#   .\scripts\install.ps1 -Target "C:\path"  # install to custom dir
#   .\scripts\install.ps1 -Target "C:\path" -Force  # overwrite existing

param(
  [string]$Target = "",
  [switch]$Force,
  [switch]$ClaudeCode
)

$ErrorActionPreference = "Stop"
$skillName = "findings-visualizer"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceDir = Split-Path -Parent $scriptDir

# Determine target directory
if ($Target -eq "") {
  if ($ClaudeCode) {
    $Target = Join-Path (Get-Location) ".devin\skills\$skillName"
  } else {
    $appData = $env:APPDATA
    if (-not $appData) { $appData = "$env:USERPROFILE\AppData\Roaming" }
    $Target = Join-Path $appData "devin\skills\$skillName"
  }
}

$destPath = $Target

Write-Host ""
Write-Host "  findings-visualizer installer" -ForegroundColor Cyan
Write-Host "  -----------------------------" -ForegroundColor DarkGray
Write-Host "  Source:  $sourceDir"
Write-Host "  Target:  $destPath"
Write-Host ""

# Validate source has SKILL.md
if (-not (Test-Path (Join-Path $sourceDir "SKILL.md"))) {
  Write-Host "  ERROR: SKILL.md not found in $sourceDir" -ForegroundColor Red
  Write-Host "  Make sure you're running this from the cloned repo." -ForegroundColor Yellow
  exit 1
}

# Check if target exists
if ((Test-Path $destPath) -and -not $Force) {
  Write-Host "  Target already exists: $destPath" -ForegroundColor Yellow
  Write-Host "  Use -Force to overwrite." -ForegroundColor DarkGray
  exit 1
}

# Create target directory
if (Test-Path $destPath) {
  Write-Host "  Removing existing install..." -ForegroundColor DarkGray
  Remove-Item -Path $destPath -Recurse -Force
}

New-Item -ItemType Directory -Path $destPath -Force | Out-Null

# Copy files
$files = @(
  "SKILL.md",
  "plugin.json",
  "marketplace.json",
  "assets\shell.html",
  "assets\logo\logo.png",
  "assets\components\verdict-banner.html",
  "assets\components\summary-cards.html",
  "assets\components\stats-bar.html",
  "assets\components\severity-chart.html",
  "assets\components\category-chart.html",
  "assets\components\effort-chart.html",
  "assets\components\heatmap-chart.html",
  "assets\components\filter-sidebar.html",
  "assets\components\search-bar.html",
  "assets\components\finding-controls.html",
  "assets\components\findings-list.html",
  "assets\components\strengths-list.html",
  "assets\components\theme-toggle.html",
  "assets\components\export-bar.html",
  "assets\components\status-cards.html",
  "assets\components\progress-bar.html",
  "assets\components\feature-list.html",
  "assets\components\checklist-progress.html",
  "assets\components\checklist-list.html",
  "assets\components\comparison-table.html"
)

$copied = 0
foreach ($file in $files) {
  $src = Join-Path $sourceDir $file
  $dst = Join-Path $destPath $file
  if (Test-Path $src) {
    $dstDir = Split-Path -Parent $dst
    if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
    Copy-Item -Path $src -Destination $dst -Force
    $copied++
  } else {
    Write-Host "  WARN: missing $file" -ForegroundColor Yellow
  }
}

Write-Host "  Installed $copied files to $destPath" -ForegroundColor Green
Write-Host ""

# Verify
if (Test-Path (Join-Path $destPath "SKILL.md")) {
  Write-Host "  Verification: SKILL.md present" -ForegroundColor Green
} else {
  Write-Host "  Verification: FAILED - SKILL.md missing" -ForegroundColor Red
  exit 1
}

$compDir = Join-Path $destPath "assets\components"
if (Test-Path $compDir) {
  $compCount = (Get-ChildItem $compDir -Filter "*.html").Count
  Write-Host "  Verification: $compCount components found" -ForegroundColor Green
} else {
  Write-Host "  Verification: FAILED - components dir missing" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "  Done! The skill is ready to use." -ForegroundColor Cyan
Write-Host "  Restart your Devin/Claude session to pick up the new skill." -ForegroundColor DarkGray
Write-Host ""
