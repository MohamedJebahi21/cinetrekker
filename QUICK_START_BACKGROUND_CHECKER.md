# Quick Setup Guide - Background Episode Checker

## ⚡ Fast Track Setup (5 minutes)

Since Supabase CLI installation varies by platform, here's the easiest way to get started:

---

## 🎯 **Option 1: Using Supabase Dashboard (Easiest - No CLI needed!)**

### Step 1: Create the Cache Table

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **wzlcekvieglnidfempap**
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste this SQL:

```sql
-- Create cache table for pre-computed new episodes
CREATE TABLE IF NOT EXISTS new_episodes_cache (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  episodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_new_episodes_cache_updated 
ON new_episodes_cache(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE new_episodes_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own cached episodes
CREATE POLICY "Users can read own episode cache"
ON new_episodes_cache
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Service role can insert/update (for background job)
CREATE POLICY "Service role can manage cache"
ON new_episodes_cache
FOR ALL
USING (auth.role() = 'service_role');
```

6. Click **Run** (or press F5)
7. You should see "Success. No rows returned"

### Step 2: Deploy the Edge Function

1. Still in Supabase Dashboard
2. Go to **Edge Functions** (left sidebar)
3. Click **Deploy a new function**
4. Fill in:
   - **Function Name**: `check-new-episodes`
   - **Function Code**: Copy from `supabase/functions/check-new-episodes/index.ts`
5. Click **Deploy Function**

### Step 3: Set Environment Variables

1. In the Edge Function page, click on **check-new-episodes**
2. Go to **Settings** tab
3. Under **Secrets**, add:
   - `TMDB_API_KEY`: (your TMDB API key)
   - `SUPABASE_URL`: (your project URL - should already be set)
   - `SUPABASE_SERVICE_ROLE_KEY`: (check in Settings → API)

### Step 4: Test the Function

1. In the function page, click **Invoke**
2. Check logs to see if it runs successfully
3. Go to **Table Editor** → **new_episodes_cache**
4. You should see entries for each user!

### Step 5: Set Up Scheduled Execution

**Option A: GitHub Actions (Free & Automated)**

1. Your GitHub repo already has the workflow file!
2. Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions
3. Add these secrets:
   - `SUPABASE_URL`: `https://YOUR_PROJECT.supabase.co` (from Supabase Dashboard)
   - `SUPABASE_ANON_KEY`: (from Supabase Dashboard → Settings → API)
4. Done! It will run automatically every day at 3 AM UTC

**Option B: Supabase Cron (If on Pro Plan)**

1. In Edge Functions → check-new-episodes → Settings
2. Add **Cron Schedule**: `0 3 * * *`
3. Save

**Option C: External Cron Service (Free Alternative)**

1. Go to [cron-job.org](https://cron-job.org)
2. Create account (free)
3. Add new cron job:
   - **URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/check-new-episodes`
   - **Schedule**: Daily at 3:00 AM
   - **Method**: POST
   - **Headers**: 
     - `Authorization`: `Bearer YOUR_SUPABASE_ANON_KEY`
     - `Content-Type`: `application/json`

---

## 🎯 **Option 2: Using Supabase CLI (Advanced)**

### Install Supabase CLI:

**Windows (using Scoop):**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Or download directly:**
- Go to: https://github.com/supabase/cli/releases
- Download the Windows binary
- Add to PATH

### After CLI is installed:

```bash
cd "F:\My Own Games\CineTrekker\cinetrekker"

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref wzlcekvieglnidfempap

# Apply migration
supabase db push

# Deploy Edge Function
supabase functions deploy check-new-episodes --no-verify-jwt

# Set secrets
supabase secrets set TMDB_API_KEY=your_key_here

# Test the function
supabase functions invoke check-new-episodes
```

---

## ✅ Verification

After setup, check if it's working:

1. **Check the cache table**:
   - Go to Supabase Dashboard → Table Editor → new_episodes_cache
   - Should have rows with user data

2. **Check your website**:
   - Visit: https://cinetrekker.vercel.app
   - Log in
   - The "Did You Watch?" section should load INSTANTLY!
   - Look for the "Updated [date]" badge

3. **Manual refresh**:
   - Click the "Refresh" button to test real-time loading
   - Should update the cache timestamp

---

## 🐛 Troubleshooting

**"Table already exists" error:**
- That's fine! The migration uses `CREATE TABLE IF NOT EXISTS`

**Function deployment fails:**
- Make sure you copied ALL the code from index.ts
- Check that environment variables are set

**Cache is empty:**
- Function might not have run yet
- Trigger it manually from Supabase Dashboard
- Check function logs for errors

**GitHub Actions not running:**
- Make sure secrets are added correctly
- Check Actions tab in GitHub for run history
- Workflow runs daily at 3 AM UTC

---

## 📊 Expected Results

- **Load time**: From 5-15 seconds → <100ms (instant!)
- **API calls**: From 20-40 per page load → 0 (reads from cache)
- **Cache updates**: Once per day automatically
- **Freshness**: Cache expires after 24 hours, falls back to real-time

---

## 🎉 That's It!

The frontend is already deployed (commit c5913aa). Once you complete the steps above, your "Did You Watch?" section will load instantly for all users!

**Need Help?**
- Check the full guide: BACKGROUND_EPISODE_CHECKER_SETUP.md
- Test the Edge Function manually from Supabase Dashboard
- Monitor logs in Supabase Dashboard → Edge Functions → Logs
