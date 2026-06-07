# 🎵 AI Vibe Coding Quick Reference Card

**Bookmark this for instant reference while coding!**

---

## 🚀 Three-Tool Quickstart

### Terminal: Launch Aider
```powershell
# Set API key once per session
$env:AIDER_API_KEY = "your_key"

# Navigate to project
cd f:\My Own Games\CineTrekker\cinetrekker

# Start Aider interactive mode
aider

# Or one-shot command
aider --message "Task description"
```

### VS Code: Open Cline
```
Ctrl+Shift+P → "Cline: Open"
```

### IDE: Use Copilot
```
Just start typing → suggestions appear
Tab to accept | Esc to dismiss
```

---

## 📋 Aider: Common Commands

| Command | Usage | Example |
|---------|-------|---------|
| `/help` | Show all commands | `aider> /help` |
| `/read FILE` | Read file into context | `/read src/Button.tsx` |
| `/ask QUESTION` | Ask about code | `/ask Where is auth handled?` |
| `/git COMMAND` | Run git command | `/git status` |
| `/lint` | Auto-fix all lint issues | `/lint` |
| `TASK` | Direct task | `Add error handling to fetchUser()` |
| `/commit` | Commit with auto message | `/commit` |
| `exit` or Ctrl+D | Quit | `exit` |

---

## 💬 Cline: Best Prompting

### ✅ Good Prompts (Specific)
```
"Analyze src/pages/MovieDetail.tsx and suggest refactorings"
"Fix the 404 error in the API filter endpoint (GET /api/movies/filter?genre=...)"
"Create a new component: <SearchBar /> with debounced input"
"Refactor user authentication to use JWT refresh tokens"
```

### ❌ Bad Prompts (Vague)
```
"Make it better"
"Fix everything"
"Add features"
"Optimize this"
```

### 🎯 Structure
```
"I need to [GOAL]
 
Context: [EXPLAIN PROBLEM OR SITUATION]

Requirements:
- [REQUIREMENT 1]
- [REQUIREMENT 2]

Constraints:
- [CONSTRAINT 1]

Show me your plan first before implementing."
```

---

## ⏱️ Workflow Decision Tree

```
What do I want to do?
│
├─ Write code quickly?
│  └─ Use Copilot (Tab/Esc)
│
├─ Build a feature across multiple files?
│  └─ Use Cline (Ctrl+Shift+P → "Cline: Open")
│
├─ Fix formatting & lint issues?
│  └─ Use Aider (aider → /lint)
│
├─ Refactor with git history?
│  └─ Use Aider (aider → describe changes)
│
└─ Code review/debugging?
   └─ Use Aider (/read file → /ask question)
```

---

## 🧪 Pre-Commit Checklist

```powershell
npm run lint      # ESLint compliance
npm run build     # TypeScript compilation
npm test          # Unit tests pass
npm run type-check # Full type checking

git add .
git commit -m "feat|fix|refactor: description"
```

---

## 🔑 API Key Setup

### PowerShell (Per Session)
```powershell
$env:AIDER_API_KEY = "your_actual_key"
```

### PowerShell Profile (Persistent)
```powershell
# Edit profile:
notepad $PROFILE

# Add line:
$env:AIDER_API_KEY = "your_actual_key"

# Reload:
. $PROFILE
```

### Environment Settings
```powershell
# Check if set:
echo $env:AIDER_API_KEY

# Unset:
$env:AIDER_API_KEY = ""
```

---

## 🔍 Debug: What's Wrong?

| Problem | Check | Fix |
|---------|-------|-----|
| Cline won't respond | API key valid? | Check VS Code settings |
| Aider says "no permission" | API key set in PowerShell? | `$env:AIDER_API_KEY = "..."` |
| Rate limit hit | Check API quota | Switch model or wait |
| Copilot suggestions too aggressive | Disable inline suggestions | VS Code → Settings → Copilot |
| "Command not found: aider" | Python in PATH? | `python3 -m pip install aider-chat` |

---

## 📊 API Providers Comparison

| Provider | Free Tier | Speed | Cost Per 1M Tokens |
|----------|-----------|-------|-------------------|
| **Gemini** | 1M/month | ⚡⚡⚡ Fast | Free then $5 |
| **DeepSeek** | $5 credit | ⚡⚡ Medium | $0.27 |
| **OpenRouter** | Mixed | ⚡ Varies | $0.10-$1.00 |
| **Claude (Anthropic)** | None | ⚡⚡⚡⚡ Fastest | $0.30-$3.00 |

**Recommendation**: Gemini free tier for max tokens, DeepSeek for speed.

---

## ✨ Pro Tips

1. **Batch Changes**: Ask Aider to do 5 things at once (faster)
   ```
   aider -m "
   Format all imports as absolute
   Add JSDoc to functions
   Remove console.logs
   Fix TypeScript types
   "
   ```

2. **Emergency Escape**: Press Escape to cancel Copilot, focus on Cline
   
3. **Read First, Edit Second**: Let Aider read the file first
   ```
   /read src/utils/api.ts
   /ask What improvements needed?
   [Then make changes]
   ```

4. **Leverage Git Log**: Show Cline recent commits for context
   ```
   git log --oneline -10
   [Copy & paste to Cline for patterns]
   ```

5. **Use .aider.yml**: Commit config to repo so team shares settings
   ```
   model: gemini-2.0-flash
   temperature: 0.3
   auto-lint: true
   ```

---

## 🎓 Advanced: MCP Tools in Cline

Cline can use these tools automatically:

- **`codebase-search`**: Find patterns across files
  ```
  Dialog: "Search for all API calls to /movies endpoint"
  ```

- **`file-operations`**: Read/modify multiple files
  ```
  Dialog: "Update all imports from './utils' to absolute paths"
  ```

- **`git-integration`**: View commits, diffs
  ```
  Dialog: "What changed in the last 5 commits to auth?"
  ```

---

## 🆘 Emergency Troubleshooting

```powershell
# Reinstall Aider
pip3 install aider-chat --force-reinstall

# Check Python environment
python3 -c "import aider; print(aider.__version__)"

# Test API key works
aider --help

# Max verbosity for debugging
aider --verbose --message "Test"
```

---

## 📱 Quick Links

- **Setup Guide**: [AI_VIBE_CODING_SETUP.md](AI_VIBE_CODING_SETUP.md)
- **Full Workflow**: [AI_VIBE_CODING_WORKFLOW.md](AI_VIBE_CODING_WORKFLOW.md)
- **VS Code Settings**: [VSCODE_SETTINGS.jsonc](VSCODE_SETTINGS.jsonc)
- **Aider Config**: [.aider.yml](.aider.yml)

---

## 🎯 "I Want To..." Quick Guide

```
"Build a new feature"
→ Open Cline → Describe feature → Review changes → Test

"Fix a bug"
→ Share stack trace with Cline → Review fix → Test → Commit

"Refactor code"
→ Open Aider → /read file → /ask improvements → Fix → Commit

"Review code quality"
→ Open Aider → Batch request → Auto-lint → Review → Commit

"Learn about code"
→ Open Aider → /read files → /ask questions → Learn

"Quick syntax fix"
→ Use Copilot → Tab to accept → Move on
```

---

**Last Updated**: April 16, 2026  
**Status**: 🚀 Ready to vibe code!
