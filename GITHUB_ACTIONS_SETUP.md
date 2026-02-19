# GitHub Actions Setup for Background Episode Checker

## Overview

GitHub Actions provides **FREE** automated cron job execution for your background episode checker. No Supabase Pro plan needed!

The workflow file (`.github/workflows/check-new-episodes.yml`) is already committed and ready to use.

---

## 🚀 Setup Steps (3 minutes)

### Step 1: Add Repository Secrets

1. Go to your repository on GitHub:
   ```
   https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions
   ```

2. Click **"New repository secret"**

3. Add **SUPABASE_URL**:
   - Name: `SUPABASE_URL`
   - Value: `https://YOUR_PROJECT.supabase.co` (from Supabase Dashboard → Settings → API)
   - Click **Add secret**

4. Add **SUPABASE_ANON_KEY**:
   - Name: `SUPABASE_ANON_KEY`
   - Value: Get from Supabase Dashboard → Settings → API → `anon` `public`
   - Click **Add secret**

### Step 2: Verify Workflow is Active

1. Go to the **Actions** tab in your repository:
   ```
   https://github.com/MohamedJebahi21/cinetrekker/actions
   ```

2. You should see: **"Check New Episodes (Background Job)"**

3. Click on it to view the workflow

### Step 3: Test Manual Run

1. In the workflow page, click **"Run workflow"** dropdown
2. Select branch: `main` (or your default branch)
3. Click **"Run workflow"** button
4. Wait 10-30 seconds
5. Click on the workflow run to see logs
6. Check for success ✅

---

## 📋 What This Workflow Does

**Scheduled Trigger:**
- Runs **daily at 3:00 AM UTC**
- Cron schedule: `0 3 * * *`

**Manual Trigger:**
- You can manually trigger anytime from Actions tab
- Useful for testing

**Execution:**
```yaml
1. Checkout code (gets workflow file)
2. Make HTTP POST request to your Edge Function
3. Check response status (200 = success)
4. Display results in logs
```

**What it calls:**
```bash
POST https://wzlcekvieglnidfempap.supabase.co/functions/v1/check-new-episodes
Headers:
  Authorization: Bearer <SUPABASE_ANON_KEY>
  Content-Type: application/json
```

---

## ✅ Verification

### Check if it's working:

1. **Run manually** (see Step 3 above)

2. **View logs**:
   - Click on the workflow run
   - Click on job name (e.g., "invoke-function")
   - Expand "Invoke Supabase Edge Function"
   - Look for output like:
     ```json
     {"success":true,"usersProcessed":5,"usersUpdated":3}
     ```

3. **Check database**:
   - Go to Supabase Dashboard → Table Editor → `new_episodes_cache`
   - Should see rows with `updated_at` matching workflow run time

4. **Check website**:
   - Visit https://cinetrekker.vercel.app
   - "Did You Watch?" should load instantly
   - Badge should show "Updated [today's date]"

---

## 📊 Monitoring

### View Run History:

1. Go to **Actions** tab
2. Click workflow name
3. See all past runs with status ✅ or ❌

### Email Notifications:

GitHub automatically sends email if workflow fails. You can customize this:
1. Go to GitHub Settings → Notifications
2. Under "Actions", choose notification preferences

### Logs Retention:

GitHub keeps workflow logs for **90 days** (free tier).

---

## 🔧 Customization

### Change Schedule:

Edit `.github/workflows/check-new-episodes.yml`:

```yaml
on:
  schedule:
    - cron: '0 3 * * *'  # Change this line
  workflow_dispatch:
```

**Cron syntax:**
- `0 3 * * *` = Daily at 3:00 AM UTC
- `0 */6 * * *` = Every 6 hours
- `0 0 * * 0` = Weekly on Sunday at midnight

**Important**: Use UTC timezone only!

### Add Notifications:

Add a notification step to the workflow:

```yaml
- name: Send notification on failure
  if: failure()
  run: |
    # Send email, Slack message, etc.
    echo "Job failed!"
```

---

## 🐛 Troubleshooting

### "Secret not found" Error:

- Make sure secrets are added to the **repository** (not your personal account)
- Secret names must match exactly: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Secrets are case-sensitive!

### Workflow not running automatically:

- Check that workflow file is in `main` branch (or default branch)
- Scheduled workflows only run on default branch
- Wait for next scheduled time (3 AM UTC)
- GitHub Actions must be enabled for your repository

### Edge Function returns error:

- Check that Edge Function is deployed (see QUICK_START_BACKGROUND_CHECKER.md)
- Verify `TMDB_API_KEY` is set in Supabase Edge Function secrets
- Check function logs in Supabase Dashboard

### HTTP 401 or 403 Error:

- Verify `SUPABASE_ANON_KEY` in GitHub secrets
- Make sure it's the `anon` `public` key (not service role)
- Edge Function should have `--no-verify-jwt` flag

---

## 💡 Benefits of GitHub Actions

✅ **Free**: Unlimited minutes for public repositories  
✅ **Reliable**: GitHub's infrastructure  
✅ **Easy Setup**: Just add 2 secrets  
✅ **Logs**: Full execution history  
✅ **Manual Control**: Trigger anytime  
✅ **No Credit Card**: Works on free GitHub account  

---

## 🎯 Next Steps

1. ✅ Add secrets (Step 1)
2. ✅ Test manual run (Step 3)
3. ✅ Verify cache is populated
4. ✅ Check website loads instantly
5. ✅ Wait for automatic run tomorrow at 3 AM UTC

---

## 📚 Related Files

- **Workflow**: `.github/workflows/check-new-episodes.yml`
- **Edge Function**: `supabase/functions/check-new-episodes/index.ts`
- **Setup Guide**: `BACKGROUND_EPISODE_CHECKER_SETUP.md`
- **Quick Start**: `QUICK_START_BACKGROUND_CHECKER.md`

---

## ⏱️ Expected Timeline

| Time | Event |
|------|-------|
| Now | Add secrets (2 min) |
| Now + 1 min | Manual test run (30 sec) |
| Now + 2 min | Verify cache populated |
| Tomorrow 3 AM UTC | First automatic run |
| Daily 3 AM UTC | Regular automatic updates |

---

That's it! Your background job will now run automatically every day, keeping the "Did You Watch?" section blazing fast! ⚡
