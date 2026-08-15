# Production Social Migration Execution Notes

On 15 August 2026, the initially prepared public social-profile migration was rejected by the CineTrekker production database before it made changes. The error identified schema drift: `public.comments.contains_spoiler` did not exist.

A read-only production query confirmed that `public.comments` contained nine columns: `id`, `user_id`, `media_id`, `media_type`, `content`, `parent_id`, `likes_count`, `created_at`, and `updated_at`.

The correction adds `contains_spoiler boolean NOT NULL DEFAULT false` with `IF NOT EXISTS` before creating the curated public-profile RPCs. The corrected SQL was entered through the native SQL editor model and executed without a reported SQL failure. A read-only verification query is still required to confirm the column and all five RPCs exist before treating the migration as complete.

## Verification

The read-only verification completed successfully. Production now has `public.comments.contains_spoiler` with the `boolean` type and all five intended functions: `get_public_profile_summary`, `list_public_profiles`, `get_public_profile_connections`, `get_public_profile_comments`, and `get_public_profile_summaries`.
