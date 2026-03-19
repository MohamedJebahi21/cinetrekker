# Workspace Recovery

If tracked files in `public/` disappear locally, run:

```bash
npm run workspace:doctor
```

What it does:

- Repairs a broken local `HEAD` branch reference by repointing the current branch to `origin/main` when `HEAD` has no commit.
- Restores the core public assets the app depends on (`favicon*`, `apple-touch-icon.png`, `og-image.png`, and `robots.txt`) when they are missing from disk.

This check also runs automatically before the main local commands:

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run dev:next`
- `npm run build:next`
- `npm run start:next`
