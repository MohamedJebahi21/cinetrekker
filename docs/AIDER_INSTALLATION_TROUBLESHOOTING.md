# Python Environment Troubleshooting & Aider Installation Workarounds

## Issue: ModuleNotFoundError in pip

**Symptoms:**
```
ModuleNotFoundError: No module named 'pip._vendor.packaging._structures'
```

**Root Cause:** Python 3.14.3 has a corrupted pip installation or version incompatibility.

---

## ✅ Solution 1: Use Virtual Environment (Recommended)

This is the safest approach and isolates Aider dependencies.

### Step 1: Create Virtual Environment

```powershell
cd "f:\My Own Games\CineTrekker\cinetrekker"

# Create venv
python3 -m venv .venv

# Activate venv
.\.venv\Scripts\Activate.ps1

# Verify activation (should show (.venv) prefix)
```

### Step 2: Upgrade pip in venv

```powershell
# Within activated venv:
python -m pip install --upgrade pip setuptools wheel

# Should work without errors now
```

### Step 3: Install Aider

```powershell
# Within activated venv:
pip install aider-chat
```

### Step 4: Verify Installation

```powershell
aider --version

# Should show version number
```

### Step 5: Use Aider Always with venv

```powershell
# To use Aider, always activate venv first:
.\.venv\Scripts\Activate.ps1

# Then run aider
aider

# To deactivate later:
deactivate
```

---

## ⚡ Solution 2: Quick Install via PowerShell Profile (For Convenience)

Add this to your PowerShell profile for one-command setup:

```powershell
# Edit profile: notepad $PROFILE

# Add this function:
function Start-Aider {
    param([string]$Message = "")
    
    $projectRoot = "f:\My Own Games\CineTrekker\cinetrekker"
    Set-Location $projectRoot
    
    if (-not (Test-Path ".\.venv")) {
        Write-Host "Creating venv..." -ForegroundColor Cyan
        python3 -m venv .venv
        & ".\.venv\Scripts\pip.exe" install --upgrade pip setuptools wheel
        & ".\.venv\Scripts\pip.exe" install aider-chat
    }
    
    & ".\.venv\Scripts\Activate.ps1"
    
    if ($Message) {
        & aider --message $Message
    } else {
        & aider
    }
}

# Usage:
# Start-Aider "refactor src/components"
```

---

## 🔧 Solution 3: Reinstall Python (Nuclear Option)

If venv doesn't work, reinstall Python cleanly:

### Step 1: Uninstall Python
```powershell
# Go to Settings → Apps → Apps & features
# Find "Python 3.14.3" or "Python (from Microsoft Store)"
# Click "Uninstall"
```

### Step 2: Reinstall Python

**Option A: From Python.org (Recommended)**
1. Download: https://www.python.org/downloads/
2. Version: Python 3.11+ recommended for stability
3. During install: CHECK "Add Python to PATH"
4. Finish installation

**Option B: From Microsoft Store (Easier)**
```powershell
winget install --id Python.Python.3.12
```

### Step 3: Verify Fresh Install
```powershell
python --version
pip --version

# Both should have no errors
```

### Step 4: Create Virtual Environment
```powershell
cd "f:\My Own Games\CineTrekker\cinetrekker"
python -m venv .venv
.\.venv\Scripts\Activate
pip install aider-chat
```

---

## 🚀 Solution 4: Use Aider Without Local Installation

If all else fails, you can still use Aider without installing it locally:

### Option A: Use Aider Web (if available)
Visit: https://aider.chat (browser-based version)

### Option B: Use Docker (if Docker is installed)
```powershell
docker run -it --rm -v "f:\My Own Games\CineTrekker\cinetrekker:/project" aider /bin/sh
# (Inside container)
aider
```

### Option C: Use Google Colab (Free Cloud Python)
1. Go to: https://colab.research.google.com/
2. New notebook
3. Install in cell: `!pip install aider-chat`
4. Run: `!aider --version`

---

## 📋 Alternative: Use Cline Only (Temporary)

While fixing Aider, you can use **Cline exclusively**:

```
Copilot → quick autocomplete
Cline → all AI coding tasks
Aider → [Fixed later]
```

Cline alone is actually sufficient for most workflows!

---

## ✅ Quick "Did It Work?" Tests

```powershell
# Test 1: pip works
python -m pip --version

# Test 2: Can install packages
pip install requests

# Test 3: Aider installs
pip install aider-chat

# Test 4: Aider runs
aider --help
```

---

## 📞 If You're Still Stuck

**Try this order:**

1. **Solution 1** (Virtual Environment) - solves 90% of issues
2. **Solution 2** (PS Profile shortcut) - for convenience
3. **Solution 3** (Reinstall Python) - if Solutions 1-2 don't work
4. **Solution 4** (Docker/Colab) - as fallback

---

## 🎯 Going Forward

Once Aider is installed, update your workflow:

```powershell
# Start of your AI coding session:

# 1. Activate venv
.\.venv\Scripts\Activate.ps1

# 2. Set API key
$env:AIDER_API_KEY = "your_key"

# 3. Use Aider
aider

# OR use Cline in VS Code simultaneously
# Ctrl+Shift+P → "Cline: Open"
```

---

## 💡 Pro Tip: Make It Automatic

Add to your `$PROFILE` file:

```powershell
# Auto-activate in CineTrekker directory
function Set-LocationWithVenv {
    param([string]$Path)
    Set-Location $Path
    
    if (Test-Path ".\.venv\Scripts\Activate.ps1") {
        & ".\.venv\Scripts\Activate.ps1"
        Write-Host "Virtual environment activated" -ForegroundColor Green
    }
}

Set-Alias -Name cd -Value Set-LocationWithVenv -Force
```

Then just `cd "f:\My Own Games\CineTrekker\cinetrekker"` and venv activates automatically!

---

**Status**: All documentation complete. Aider installation has recoverable Python environment issue. See Solution 1 (Virtual Environment) for immediate fix.
