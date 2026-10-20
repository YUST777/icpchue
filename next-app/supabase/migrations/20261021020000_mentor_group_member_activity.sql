-- Track whether each trainee actually opened /group and tapped "Join on WhatsApp",
-- so mentors can follow up with the ones who never did (WhatsApp itself does not
-- tell the site who joined).

ALTER TABLE public.mentor_group_members
    ADD COLUMN IF NOT EXISTS first_opened_at timestamptz,
    ADD COLUMN IF NOT EXISTS last_opened_at timestamptz,
    ADD COLUMN IF NOT EXISTS open_count integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS first_join_click_at timestamptz,
    ADD COLUMN IF NOT EXISTS join_clicks integer NOT NULL DEFAULT 0;

-- Placements made on the page before this tracking existed were opened at placement time.
UPDATE public.mentor_group_members
   SET first_opened_at = assigned_at, last_opened_at = assigned_at, open_count = 1
 WHERE source = 'auto' AND first_opened_at IS NULL;
