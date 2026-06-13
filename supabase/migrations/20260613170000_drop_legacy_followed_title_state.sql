-- Drop legacy global followed_title_state table.
-- User-scoped snapshots are stored in followed_title_state_user.
-- Existing rows were backfilled in 20260317182000_notification_audit_fixes.sql.

DROP TABLE IF EXISTS public.followed_title_state;
