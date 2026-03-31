-- ============================================================
-- Migration 019: Security Fixes
-- RLS policies, function search_path, tightened permissions
-- ============================================================

-- Fix function search_path vulnerability
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- RLS policies for all tables (defense-in-depth)
-- See migration SQL for full policy definitions
-- Key principle: users can only read/write their own data
-- Tracking tables (user_activity, user_sessions, page_navigation, error_logs)
-- require authentication for writes
