-- ============================================================
-- Migration 008: Ensure (user_id, achievement_id) is unique in user_achievements
-- Prevents duplicate achievements per user; required for grantAchievement ON CONFLICT
-- ============================================================

-- Remove duplicates: keep one per (user_id, achievement_id), preferring seen=TRUE then oldest
DELETE FROM user_achievements a
WHERE a.id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY user_id, achievement_id
      ORDER BY seen DESC, id ASC
    ) AS rn
    FROM user_achievements
  ) sub
  WHERE rn > 1
);

-- Add unique constraint (no-op if already exists)
ALTER TABLE public.user_achievements
ADD CONSTRAINT user_achievements_user_achievement_unique UNIQUE (user_id, achievement_id);
