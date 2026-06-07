# AI Vibe Coding Setup Guide for CineTrekker

Complete setup for AI-assisted development combining Copilot (autocomplete), Cline (agent), and Aider (CLI refactoring).

---

## ✅ Current Environment Status

- **Node.js**: v25.8.2 ✓
- **npm**: 11.11.1 ✓
- **Git**: 2.53.0 ✓
- **Python**: 3.14.3 ✓
- **Cline Extension**: Configure needed
- **Aider CLI**: Install needed

---

## 🔧 Part 1: Install Cline Extension

### Step 1.1: Install Cline in VS Code

**Option A: Via VS Code UI**
1. Open VS Code
2. Click **Extensions** (Ctrl+Shift+X)
3. Search for "Cline"
4. Install the official Cline extension
5. Reload VS Code

**Option B: Via Command Line**
```powershell
code --install-extension saoudrizwan.claude-dev
```

### Step 1.2: Verify Installation
```powershell
code --list-extensions | Select-String "claude-dev"
```

---

## 🔐 Part 2: Configure Cline with Cloud LLM API

### Step 2.1: Choose Your Cloud LLM Provider

**Recommended (Free/Free-Tier):**

| Provider | Free Tier | Speed | Cost | Setup |
|----------|-----------|-------|------|-------|
| **Gemini API** | 60 req/min free | Fast | Free tier available | Google account |
| **DeepSeek API** | $5 free credit | Very Fast | ~$0.001/1K tokens | Email signup |
| **OpenRouter** | Mix of models | Varies | Pay-as-you-go | API key |
| **Claude API** (Anthropic) | N/A | Very Fast | ~$0.003/1K tokens | Credit card required |

**Recommendation for vibe coding**: **Gemini API (free tier)** or **DeepSeek API** (cheap & fast)

### Step 2.2: Set Up Gemini API (Recommended - Free)

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**
2. Create a new project or select existing
3. Enable **Generative Language API**
4. Create API key (no billing required for free tier)
5. Copy your API key

### Step 2.3: Configure Cline in VS Code

1. Open VS Code **Settings** (Ctrl+,)
2. Search for "Cline"
3. Look for **Claude Models** or **API Provider** section
4. Configure:

**For Gemini:**
```json
{
  "cline.apiKey": "YOUR_GEMINI_API_KEY",
  "cline.modelId": "gemini-2.0-flash",
  "cline.apiProvider": "google"
}
```

**For DeepSeek:**
```json
{
  "cline.apiKey": "YOUR_DEEPSEEK_API_KEY",
  "cline.modelId": "deepseek-chat",
  "cline.apiProvider": "deepseek"
}
```

### Step 2.4: Test Cline Connection

1. Open Cline panel in VS Code (Ctrl+Shift+P → "Cline: Open")
2. Send a test message: "Hello, are you working?"
3. Verify response

---

## 🐍 Part 3: Install Aider CLI

### Step 3.1: Install Aider via pip

```powershell
pip3 install aider-chat
```

**Verify installation:**
```powershell
aider --version
```

### Step 3.2: Configure Aider with API Key

Create `~/.aider.yml` or `.aider.yml` in project root:

```yaml
# For Gemini
model: gemini-2.0-flash
api-key: YOUR_GEMINI_API_KEY

# For DeepSeek
# model: deepseek-chat
# api-key: YOUR_DEEPSEEK_API_KEY
```

**Or set environment variable:**
```powershell
$env:AIDER_API_KEY = "YOUR_API_KEY"
```

### Step 3.3: Test Aider Connection

```powershell
aider --version
cd f:\My Own Games\CineTrekker\cinetrekker
aider --help
```

---

## ⚡ Part 4: Optimize for Performance

### Recommended Settings for Cline

**VS Code settings.json** (Ctrl+Shift+P → "Preferences: Open User Settings (JSON)"):

```json
{
  "cline.autoSave": true,
  "cline.maxTokens": 8000,
  "cline.temperature": 0.3,
  "cline.contextWindow": "smart",
  "cline.parallelTools": true
}
```

### Recommended Settings for Aider

Create `.aider.yml` in project root:

```yaml
model: gemini-2.0-flash
api-key: ${AIDER_API_KEY}
temperature: 0.3
max-thinking-length: 5000
auto-lint: true
auto-test: false
watch: true
```

---

## 📋 Part 5: VS Code Extensions Setup

### Required Extensions

```powershell
# Core development extensions
code --install-extension saoudrizwan.claude-dev
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension eamodio.gitlens
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-python.python
```

### Verify All Extensions

```powershell
code --list-extensions
```

---

## 🎯 Part 6: Workflow Setup

Create `docs/AI_VIBE_CODING_WORKFLOW.md` with this content:

```markdown
# Vibe Coding Workflow

## Quick Start

### 1. Copilot (Inline Suggestions)
- Keep enabled for quick autocomplete
- Typing naturally = instant suggestions
- Press Tab to accept, Esc to dismiss

### 2. Cline (Multi-File AI Agent)
- Open Cline: Ctrl+Shift+P → "Cline: Open"
- Describe what you want: "Create a new feature that..."
- Agentic mode: automatically edits files
- Review changes before accepting

### 3. Aider (CLI Refactoring)
- Terminal: `aider` in project root
- Commands:
  - `/help` - see all commands
  - `/read src/components/Button.tsx` - read file context
  - `/ask What does this function do?` - ask about code
  - `/lint` - fix all lint issues
  - Exit: type `exit` or Ctrl+D

## Workflow Steps

### Feature Development
1. **Plan in Cline**: "I need to add dark mode support"
   - Cline explores codebase
   - Cline suggests architecture
2. **Implement with Cline**: "Implement this in components/Theme"
   - Cline creates/modifies files
   - Cline updates related files
3. **Refine in Aider**: `aider` → `/ask what needs testing?`
4. **Test & Commit**:
   - Run: `npm run lint && npm run build`
   - Commit: `git add . && git commit -m "feat: add dark mode"`

### Bug Fixing
1. **Identify in Cline**: Paste error stack trace
2. **Fix in Cline**: "Fix this error in src/..."
3. **Validate**: Run tests

### Code Refactoring
1. **Use Aider**: `aider`
2. `/ask What could be improved in this file?`
3. `Refactor this component to use hooks`
4. Review changes
5. Commit

## Token Efficiency Tips

- Use Gemini API free tier (high limits)
- Break large features into steps
- Ask Aider to refactor instead of rewriting
- Use `/lint` in Aider to auto-fix style
- Combine multiple small changes in one request
```

---

## ✨ Part 7: Final Configuration

### Create Setup Script

Create `scripts/setup-aider.sh` (Windows: `setup-aider.ps1`):

```powershell
# setup-aider.ps1

Write-Host "🚀 Setting up AI Vibe Coding Environment..." -ForegroundColor Green

# Check Python
python3 --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Python 3 not found" -ForegroundColor Red
    exit 1
}

# Install Aider
Write-Host "📦 Installing Aider..." -ForegroundColor Blue
pip3 install aider-chat --upgrade

# Verify
aider --version
Write-Host "✅ Aider installed successfully" -ForegroundColor Green

# Create .aider.yml if doesn't exist
if (-not (Test-Path ".aider.yml")) {
    Write-Host "📝 Creating .aider.yml template..." -ForegroundColor Blue
    @"
# Aider Configuration
model: gemini-2.0-flash
api-key: `${AIDER_API_KEY}
temperature: 0.3
max-thinking-length: 5000
auto-lint: true
watch: true
"@ | Out-File ".aider.yml" -Encoding UTF8
}

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📌 Next steps:" -ForegroundColor Yellow
Write-Host "1. Set environment variable: " -NoNewline
Write-Host "`$env:AIDER_API_KEY = 'YOUR_API_KEY'" -ForegroundColor Cyan
Write-Host "2. Open Cline in VS Code: Ctrl+Shift+P → 'Cline: Open'"
Write-Host "3. Configure Cline API provider in VS Code settings"
Write-Host "4. Run aider: " -NoNewline
Write-Host "aider" -ForegroundColor Cyan
```

### Run Setup Script

```powershell
cd f:\My Own Games\CineTrekker\cinetrekker
powershell -ExecutionPolicy Bypass -File scripts/setup-aider.ps1
```

---

## 🧪 Testing Everything

### Test Cline
1. Open VS Code
2. Ctrl+Shift+P → "Cline: Open"
3. Send message: "What's in the root directory?"
4. Verify response

### Test Aider
```powershell
cd f:\My Own Games\CineTrekker\cinetrekker
$env:AIDER_API_KEY = "YOUR_GEMINI_API_KEY"
aider --help
```

### Test ESLint & Prettier
```powershell
npm run lint
npm run format
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Cline not responding** | Check API key in VS Code settings, test connection |
| **Aider command not found** | Run `pip3 install aider-chat`, check Python PATH |
| **API authentication fails** | Verify API key has correct permissions, hasn't expired |
| **High latency** | Switch to faster model (Gemini > DeepSeek > Claude) |
| **Token limits** | Use Gemini free tier (1M tokens/month), batch requests |
| **Extension not installing** | Update VS Code, clear cache: `code --extensions-dir` |

---

## 📈 Next Level: CI/CD Integration

Once comfortable, add to GitHub Actions:

```yaml
# .github/workflows/test-ai-changes.yml
name: Test AI-Generated Code
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

---

## 🎓 Resources

- **Cline Docs**: [GitHub - cline](https://github.com/cline/cline)
- **Aider Docs**: [aider.chat](https://aider.chat)
- **Gemini API**: [developers.google.com/generative-ai](https://developers.google.com/generative-ai)
- **DeepSeek API**: [deepseek.com](https://deepseek.com)

---

**Last Updated**: April 16, 2026  
**Status**: Ready for AI Vibe Coding ✨
