# Vibe Coding Workflow for CineTrekker

Your AI-assisted development workflow combining Copilot, Cline, and Aider.

---

## 🎯 Quick Start (5 minutes)

### Prerequisites
- VS Code with Cline extension installed
- Aider CLI installed (`pip3 install aider-chat`)
- API key set (Gemini, DeepSeek, or Claude)

### Initial Setup
```powershell
# 1. Set API key (PowerShell)
$env:AIDER_API_KEY = "your_gemini_api_key_here"

# 2. Navigate to project
cd f:\My Own Games\CineTrekker\cinetrekker

# 3. Open Cline in VS Code
# Ctrl+Shift+P → "Cline: Open"
```

---

## 📚 Three Tools, Different Uses

### 🚀 Copilot: Continuous Autocomplete
**What it does**: Real-time code suggestions as you type.

**When to use:**
- Writing boilerplate quickly
- Completing repetitive patterns
- Quick variable/function names

**How to use:** Just type naturally, suggestions appear automatically.

```typescript
// Start typing → autocomplete appears
const [user, setUser] = useState(/* Copilot suggests type */);

// Press Tab to accept, Esc to dismiss
```

### 🤖 Cline: Multi-File Agent (Main Tool)
**What it does**: Autonomous coding agent that explores, plans, and modifies files.

**When to use:**
- Build complete features
- Refactor across multiple files
- Debug complex issues
- Analyze codebase structure

**How to use:**

```
1. Open: Ctrl+Shift+P → "Cline: Open"
2. Type: "Analyze the component structure and suggest improvements"
3. Cline explores codebase automatically
4. Review & accept suggested changes
5. Cline continues execution = agent mode
```

**Example prompts:**
```
"Create a new page component for user settings with TypeScript"
"Fix this error [paste stack trace] in the authentication module"
"Refactor Button.tsx to use composition over props drilling"
"Add dark mode support to existing components"
```

### 🛠️ Aider: Git-Based CLI Refactoring
**What it does**: Interactive CLI tool for precise, git-tracked changes.

**When to use:**
- Large refactors with git history wanted
- Code reviews via diff
- Batch fixing problems (lint, formatting)
- Teaching the tool about your codebase

**How to use:**

```powershell
# Terminal in project root
aider

# Then type commands:
/read src/components/Button.tsx
/ask What patterns can be improved?
Fix all TypeScript issues

# Or one-shot:
aider --message "Add error boundaries to all page components"
```

---

## 🔄 Workflow Templates

### 📝 Template 1: Build a New Feature

**Scenario**: Add a new "Watch Later" feature to CineTrekker.

#### Step 1: Plan in Cline (5 min)
```
Dialog: "I want to add a 'Watch Later' feature to CineTrekker.
        Users can save movies to watch later. 
        Show me the current architecture and recommend where to add this."

Cline:  ✓ Reads src/ structure
        ✓ Reads API routes
        ✓ Reads database schema
        ✓ Suggests implementation approach
```

#### Step 2: Implement in Cline (15-30 min)
```
Dialog: "Implement Watch Later feature:
        1. Add API endpoint: /api/user/watchlist
        2. Create React component: WatchLaterButton
        3. Add to movie detail page
        4. Store in Supabase user_preferences"

Cline:  ✓ Creates new files
        ✓ Modifies existing components
        ✓ Updates database queries
        ✓ Self-reviews changes
```

#### Step 3: Refine in Aider (10 min)
```powershell
aider

/read src/components/WatchLaterButton.tsx
/ask Are there accessibility issues?

Fix all a11y warnings and add ARIA labels

/lint
# Fixes formatting automatically
```

#### Step 4: Test & Commit (10 min)
```powershell
npm run lint      # Verify no errors
npm run build     # Build succeeds
npm test          # Run tests

git add .
git commit -m "feat: add watch later functionality"
```

---

### 🐛 Template 2: Fix a Bug

**Scenario**: Users report 404 on mobile when filtering movies.

#### Step 1: Gather Context
```powershell
# Check error logs
cat logs/error.log | findstr 404

# Share with Cline
```

#### Step 2: Debug in Cline
```
Dialog: "Users get 404 errors on mobile when using movie filters.
        
        Error: GET /api/movies/filter?genre=action 404
        
        This works on desktop. Only fails on mobile.
        What could cause this?"

Cline:  ✓ Explores API routes
        ✓ Checks mobile vs desktop code paths
        ✓ Identifies issue: URL encoding on params
        ✓ Suggests fix
```

#### Step 3: Implement Fix
```
Dialog: "Fix the mobile filter bug in the API route"

Cline:  ✓ Updates query parameter handling
        ✓ Tests with encoded/unencoded values
        ✓ Self-reviews changes
```

#### Step 4: Validate
```powershell
npm run build
# Test manually on device or emulator
git commit -m "fix: resolve mobile filter 404 errors"
```

---

### 🔄 Template 3: Large Refactor

**Scenario**: Migrate from prop drilling to Context API.

#### Step 1: Plan Structure (Aider)
```powershell
aider

/read src/pages/MovieDetail.tsx
/ask What props are drilled more than 2 levels?

# Aider shows you the prop drilling issues
```

#### Step 2: Execute in Cline
```
Dialog: "Refactor MovieDetail.tsx and children to use Context API instead of prop drilling.
        
        Current props: user, favorites, onAddFavorite, onRemoveFavorite
        
        Create MovieContext and update all components."

Cline:  ✓ Creates new context
        ✓ Wraps provider
        ✓ Updates all children
        ✓ Removes prop drilling
```

#### Step 3: Verify with Aider
```powershell
aider

/lint
# Auto-fixes formatting

/ask Are there any remaining prop drilling issues?
```

#### Step 4: Commit
```powershell
npm run test
git commit -m "refactor: migrate MovieDetail to Context API"
```

---

## ⚡ Pro Tips for Speed

### 1. Use Cline's Explore Feature
```
Dialog: "Analyze src/api/user/ and tell me all available endpoints"

Cline will:
- Read all files
- Map endpoints
- Show you relationships
- Suggest improvements
```

### 2. Batch Changes in Aider
```powershell
aider --message "
Format all components to use absolute imports.
Fix unused variables.
Update TypeScript types.
"
```

### 3. Reference Recent Changes
```
Dialog: "Based on the commit history [paste], 
        what needs updating in the auth module?"

Cline sees patterns and maintains consistency.
```

### 4. Use Cline's MCP Tools
```
Dialog: "Search the codebase for all usages of 'useQuery'
        and show me inconsistent patterns."

Cline can:
- Search entire codebase
- Find patterns
- Suggest consolidation
```

---

## 🧪 Testing AI-Generated Code

### Pre-Commit Checklist
```powershell
# 1. Lint check
npm run lint

# 2. Type check
npm run typecheck

# 3. Build test
npm run build

# 4. Unit tests
npm test

# 5. Manual test in browser
npm run dev
# Check key feature works
```

### When to Reject Changes
- ❌ Security vulnerabilities (SQL injection, XSS)
- ❌ Performance regressions (new npm dependencies without justification)
- ❌ Breaking changes without migration
- ❌ Removed important error handling
- ❌ TypeScript errors
- ✅ Accept: Minor style changes, new optimal patterns

---

## 🤝 Copilot + Cline Synergy

### Optimal Workflow
```
1. Copilot autocomplete: Accept quick suggestions
2. Cline for structure: Ask about file organization
3. Copilot again: Quick additions within opened files
4. Aider for cleanup: `aider --lint-and-fix`
5. Copilot: Final touches
```

### When Copilot Gets in the Way
Press `Escape` to dismiss and focus on Cline's work.

```
// Copilot will suggest here - dismiss if you need focus
const ← [Press Esc if you want Cline to take over]
```

---

## 📊 Monitoring Usage & Costs

### Gemini API (Recommended)
- **Free tier**: 60 requests/minute, 1M tokens/month
- **Cost after free**: ~$0.000075 per 1K output tokens
- **Check usage**: [Google AI Studio](https://aistudio.google.com)

### DeepSeek
- **Free trial**: $5 credit
- **Cost**: ~$0.001 per 1K tokens (very cheap)
- **Check usage**: Dashboard in account settings

### Track Spending
```powershell
# Check Cline usage in VS Code output panel
# Check Aider usage with verbose flag:
aider --verbose
```

---

## 🚨 Troubleshooting Common Issues

### Cline Stops Responding
```
Fix:
1. Check internet connection
2. Verify API key hasn't expired
3. Check API quota in provider console
4. Restart VS Code
5. Try simpler prompt
```

### Aider Says "No Changes Made"
```
Fix:
1. Be more specific: "Add JSDoc comments to all functions in src/utils"
2. Read files first: /read src/file.ts
3. Break into steps: /ask What improvements? → Then fix each one
4. Check API key: echo $env:AIDER_API_KEY
```

### Generated Code Has Errors
```
Fix:
1. Show error to Cline: "Fix this TypeScript error: [error message]"
2. Share stack trace from browser console
3. Ask for specific fix: "Update this component to match new API response"
```

### Copilot Suggestions Interfere with Cline
```
Fix:
1. Disable Copilot for specific files: 
   VS Code → Settings → Copilot → Exclude Patterns
2. Or just press Escape to dismiss suggestions
```

---

## 📈 Advanced: Custom Workflows

### Workflow 1: Feature Branch with AI Review
```powershell
# Create feature branch
git checkout -b feat/my-feature

# Use Cline to build
# Cline: "Implement my-feature as described in GitHub issue #42"

# Self-review in Aider
aider --message "Review this code for:
- Performance issues
- Security problems
- Code duplication
- Accessibility
"

# Push & create PR
git push origin feat/my-feature
```

### Workflow 2: Refactoring Spree (Low-Risk Files)
```powershell
aider

# Batch refactor low-risk utility files
/read src/utils/helpers.ts
/ask What could be improved? (Performance, types, docs)

# Fix everything at once
Refactor for: performance, TypeScript strictness, and JSDoc

# Commit in one go
/commit "refactor: improve helpers.ts"
```

### Workflow 3: Documentation Generation
```
Dialog in Cline: "Generate comprehensive JSDoc comments for 
                  all exported functions in src/api/"

Cline: ✓ Reads all exports
       ✓ Understands function purposes  
       ✓ Adds JSDoc blocks
```

---

## 🎓 Learning Commands

### Cline Dialog Starters
```
"Explain what [file] does"
"Show me how [feature] is implemented"
"What's the data flow for [feature]?"
"Are there similar patterns elsewhere?"
"What's the best practice for [pattern]?"
```

### Aider Commands
```
aider -m "Task description"     # One-shot fix
aider --help                    # See all options
aider --no-auto-commits         # Manual commit control
aider --lint                    # Auto-fix lint issues
```

---

## ⏱️ Time Estimates Per Task

| Task | Tool | Est. Time |
|------|------|-----------|
| New feature | Cline | 30-60 min |
| Bug fix | Cline | 15-30 min |
| Large refactor | Aider | 30-60 min |
| Code review | Aider | 10-20 min |
| Documentation | Cline | 20-40 min |
| Performance review | Aider | 15-30 min |

---

## ✨ Example Session

```
User: "Cline, analyze the API auth flow and suggest improvements"

Cline: ✓ Reads src/api/_lib/auth.ts (5 files)
       ✓ Finds vulnerabilities (missing rate limiting)
       ✓ Suggests: add cache, improve error handling
       ✓ Asks: "Shall I implement these fixes?"

User: "Yes, also add rate limiting"

Cline: ✓ Creates src/middleware/rateLimit.ts
       ✓ Updates src/api/_lib/auth.ts
       ✓ Adds types
       ✓ Updates tests
       ✓ Self-reviews: "Changes complete, improved security"

User: Opens terminal → aider

Aider: "What shall we improve?"

User: /lint
Aider: ✓ Fixes formatting ✓ Removes unused imports

User: /commit "improve: strengthen auth security"
```

---

**Ready to code with vibes!** 🎵✨

Open CineTrekker and start with: `Ctrl+Shift+P → "Cline: Open"`
