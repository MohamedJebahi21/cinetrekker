// Supabase Edge Function Cron Configuration
// This function should be invoked daily at 3 AM UTC

// To set up the cron job, add this to your Supabase project:
// Dashboard → Edge Functions → check-new-episodes → Settings → Cron Expression:
// 0 3 * * *

// Or use the CLI:
// supabase functions deploy check-new-episodes --no-verify-jwt
// Then set up a cron job in your Supabase dashboard or use an external scheduler like:
// - GitHub Actions
// - Vercel Cron Jobs
// - cron-job.org

export const cronSchedule = '0 3 * * *'; // Daily at 3 AM UTC
