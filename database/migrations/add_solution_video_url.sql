-- Migration: Add solution_video_url column to curriculum_problems
-- Description: Stores Google Drive or YouTube video links for problem solutions
-- Date: 2026-02-10

ALTER TABLE public.curriculum_problems 
ADD COLUMN IF NOT EXISTS solution_video_url text;

COMMENT ON COLUMN public.curriculum_problems.solution_video_url IS 'Google Drive or YouTube link to video solution';
