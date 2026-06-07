# Aider Activator Script
# Use this to easily start Aider with proper venv setup

param(
    [string]$Message = "",
    [switch]$NoActivate = $false
)

$projectRoot = "f:\My Own Games\CineTrekker\cinetrekker"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "CineTrekker Aider Launcher" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if venv exists
if (-not (Test-Path "$projectRoot\.venv")) {
    Write-Host "[SETUP] Creating virtual environment..." -ForegroundColor Blue
    cd $projectRoot
    & python3 -m venv .venv --without-pip
    
    # Bootstrap pip
    Write-Host "[SETUP] Bootstrapping pip..." -ForegroundColor Blue
    & .\.venv\Scripts\python.exe -m ensurepip --upgrade 2>/dev/null
}

# Activate venv
if (-not $NoActivate) {
    Write-Host "[ACTIVATE] Activating virtual environment..." -ForegroundColor Green
    & "$projectRoot\.venv\Scripts\Activate.ps1"
}

# Check if aider is installed
$aiderInstalled = $false
try {
    & aider --version > $null 2>&1
    $aiderInstalled = $true
} catch {
    $aiderInstalled = $false
}

# Install aider if needed
if (-not $aiderInstalled) {
    Write-Host "[INSTALL] Installing aider-chat..." -ForegroundColor Blue
    & pip install aider-chat --upgrade 2>&1 | Select-Object -Last 5
}

# Run aider
Write-Host "[READY] Starting aider..." -ForegroundColor Green
Write-Host ""

if ($Message) {
    & aider --message $Message
} else {
    & aider
}
