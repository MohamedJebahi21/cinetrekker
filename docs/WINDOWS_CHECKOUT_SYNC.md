# Windows Checkout Synchronization — CineTrekker

## Verified source branch

On 15 August 2026, the synchronized release checkout confirmed that local `main` and `origin/main` both pointed to commit **`b15ee2b`** before the documentation updates in this task. The Windows development checkout at `F:\My Own Games\CineTrekker\cinetrekker` must pull from `origin/main` to receive that released baseline and the next documentation commit after it is pushed.

## Safe reconciliation procedure

First stop any local development server that is using the repository. Open a new **Command Prompt** in the project folder and review whether local work is present:

```bat
cd /d "F:\My Own Games\CineTrekker\cinetrekker"
git status
git branch --show-current
git fetch origin
git log --oneline HEAD..origin/main
```

If `git status` reports uncommitted changes that must be kept, commit them to a separate branch or make a copy before pulling. Do not discard work merely to make the sync appear clean. If the branch is `main` and the worktree is clean, run the required update and validation sequence:

```bat
git pull origin main
npm install
npm run lint
npm run type-check
npm run build
```

## Expected result and recovery

The expected result is a clean `main` checkout aligned with `origin/main`, a successful dependency installation, and passing lint, type-check, and production build commands. If `git pull` reports a merge conflict, stop before resolving it. Preserve the conflict state, record the output, and reconcile the local work deliberately rather than using `git reset --hard`.

If `npm install` changes `package-lock.json`, inspect the diff before committing anything. No Windows-side changes are made by this procedure automatically; the commands remain a user-executed reconciliation because the Windows filesystem is outside the sandbox.
