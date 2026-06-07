# CineTrekker AI Vibe Coding Environment Setup
# Run from project root: powershell -ExecutionPolicy Bypass -File scripts/setup-vibe-coding.ps1

param(
    [switch]$SkipVsCode = $false,
    [switch]$ApiKeyPrompt = $false
)

$scriptPath = Split-Path -Resolve $MyInvocation.MyCommand.Path
$projectRoot = Split-Path $scriptPath

Write-Host "================================" -ForegroundColor Cyan
Write-Host "AI Vibe Coding Setup Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Blue

$checks = @{
    "Node.js" = { & node --version }
    "npm" = { & npm --version }
    "Python 3" = { & python3 --version }
    "Git" = { & git --version }
}

$allOk = $true
foreach ($tool in $checks.Keys) {
    try {
        $version = & $checks[$tool] 2>&1 | Select-Object -First 1
        Write-Host "[OK] $tool : $version" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] $tool : NOT FOUND" -ForegroundColor Red
        $allOk = $false
    }
}

if (-not $allOk) {
    Write-Host ""
    Write-Host "[ERROR] Some prerequisites are missing. Please install them first." -ForegroundColor Red
    Write-Host "[INFO] See docs/AI_VIBE_CODING_SETUP.md for installation instructions." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "[SUCCESS] All prerequisites found!" -ForegroundColor Green

# Install Aider
Write-Host ""
Write-Host "[INSTALL] Installing/Updating Aider..." -ForegroundColor Blue
& python3 -m pip install aider-chat --upgrade -q

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install Aider" -ForegroundColor Red
    exit 1
}

$aiderVersion = & aider --version 2>&1 | Select-Object -First 1
Write-Host "[OK] Aider installed: $aiderVersion" -ForegroundColor Green

# Install npm dev dependencies if needed
Write-Host ""
Write-Host "[CHECK] Checking npm dependencies..." -ForegroundColor Blue
if ((Test-Path "package.json") -and -not (Test-Path "node_modules")) {
    Write-Host "[Install] Installing npm packages..." -ForegroundColor Cyan
    & npm install -q
    Write-Host "[OK] npm dependencies installed" -ForegroundColor Green
}

# Check for .aider.yml
Write-Host ""
Write-Host "[CONFIG] Configuring Aider..." -ForegroundColor Blue

if (-not (Test-Path ".aider.yml")) {
    Write-Host "[WARN] .aider.yml not found in project root" -ForegroundColor Yellow
    Write-Host "[INFO] Creating template..." -ForegroundColor Cyan
    
    @"
# Aider Configuration
model: gemini-2.0-flash
api-key: `${AIDER_API_KEY}
temperature: 0.3
auto-lint: true
watch: true
"@ | Out-File ".aider.yml" -Encoding UTF8
    
    Write-Host "[OK] Created .aider.yml template" -ForegroundColor Green
}

# Check environment variable
Write-Host ""
Write-Host "[CHECK] Checking API configuration..." -ForegroundColor Blue

if ($env:AIDER_API_KEY) {
    Write-Host "[OK] AIDER_API_KEY environment variable is set" -ForegroundColor Green
} else {
    Write-Host "[WARN] AIDER_API_KEY environment variable not set" -ForegroundColor Yellow
    
    if ($ApiKeyPrompt) {
        Write-Host ""
        Write-Host "Provide your API key to set environment variable:" -ForegroundColor Cyan
        $apiKey = Read-Host "Enter your API key (or press Enter to skip)"
        
        if ($apiKey) {
            $env:AIDER_API_KEY = $apiKey
            Write-Host "[OK] AIDER_API_KEY set for this session" -ForegroundColor Green
            Write-Host ""
            Write-Host "[HINT] To persist across sessions, add to PowerShell profile:" -ForegroundColor Cyan
            Write-Host '   `$env:AIDER_API_KEY = "your_key_here"' -ForegroundColor Gray
        }
    } else {
        Write-Host ""
        Write-Host "[HINT] Set your API key in PowerShell before using Aider:" -ForegroundColor Cyan
        Write-Host '   `$env:AIDER_API_KEY = "your_key_here"' -ForegroundColor Gray
    }
}

# VS Code extensions
if (-not $SkipVsCode) {
    Write-Host ""
    Write-Host "[CHECK] Checking VS Code extensions..." -ForegroundColor Blue
    
    $extensions = @(
        @{ id = "saoudrizwan.claude-dev"; name = "Cline" },
        @{ id = "dbaeumer.vscode-eslint"; name = "ESLint" },
        @{ id = "esbenp.prettier-vscode"; name = "Prettier" },
        @{ id = "eamodio.gitlens"; name = "GitLens" }
    )
    
    foreach ($ext in $extensions) {
        $installed = & code --list-extensions 2>/dev/null | Select-String $ext.id
        if ($installed) {
            Write-Host "[OK] $($ext.name)" -ForegroundColor Green
        } else {
            Write-Host "[INSTALL] $($ext.name) not installed. Installing..." -ForegroundColor Yellow
            & code --install-extension $ext.id 2>/dev/null
            Write-Host "[OK] $($ext.name) installed" -ForegroundColor Green
        }
    }
}

# Final summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  - Setup: docs/AI_VIBE_CODING_SETUP.md" -ForegroundColor Gray
Write-Host "  - Workflow: docs/AI_VIBE_CODING_WORKFLOW.md" -ForegroundColor Gray
Write-Host "  - Quick Ref: docs/QUICK_REFERENCE.md" -ForegroundColor Gray
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Set your API key:" -ForegroundColor Cyan
Write-Host '     `$env:AIDER_API_KEY = "your_api_key"' -ForegroundColor Gray
Write-Host "  2. Open VS Code:" -ForegroundColor Cyan
Write-Host "     code ." -ForegroundColor Gray
Write-Host "  3. Open Cline in VS Code:" -ForegroundColor Cyan
Write-Host "     Ctrl+Shift+P and search for 'Cline: Open'" -ForegroundColor Gray
Write-Host "  4. Or use Aider from terminal:" -ForegroundColor Cyan
Write-Host "     aider" -ForegroundColor Gray
Write-Host ""

Write-Host "[READY] Ready for AI vibe coding!" -ForegroundColor Green
Write-Host ""
