-- ============================================================
-- Migration: fix_notifications_rls
-- Fixes an insecure RLS policy on the notifications table that
-- allowed anonymous guest users (auth.uid() IS NULL) to insert
-- arbitrary notifications.
-- ============================================================

-- Drop the insecure policy
DROP POLICY IF EXISTS notifications_insert_service_role ON public.notifications;

-- Helpful comment
COMMENT ON TABLE public.notifications IS
'Stores per-user notifications. Insertions are restricted to users inserting their own notifications, or service_role which bypasses RLS.';
