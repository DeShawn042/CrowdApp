-- ============================================================
-- Migration 007: Review Integrity Features
-- Run in Supabase → SQL Editor
-- ============================================================

-- 1. Remove unique constraint so users can submit multiple reviews
--    (after the 2-month window — enforced in app logic)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_user_id_location_id_key;

-- 2. Add moderation columns
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flag_count integer NOT NULL DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden  boolean NOT NULL DEFAULT false;

-- 3. Review flags table (one flag per user per review)
CREATE TABLE IF NOT EXISTS review_flags (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  uuid        NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id    text        NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (review_id, user_id)
);

ALTER TABLE review_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON review_flags FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4. Index for fast flag lookups
CREATE INDEX IF NOT EXISTS review_flags_review_idx ON review_flags (review_id);
CREATE INDEX IF NOT EXISTS reviews_flag_count_idx  ON reviews (flag_count DESC);
CREATE INDEX IF NOT EXISTS reviews_user_location_idx ON reviews (user_id, location_id, created_at DESC);

-- 5. Function to flag a review (increments flag_count atomically, auto-hides at 3+)
CREATE OR REPLACE FUNCTION public.flag_review(p_review_id uuid, p_user_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO review_flags (review_id, user_id) VALUES (p_review_id, p_user_id)
  ON CONFLICT DO NOTHING;

  UPDATE reviews
  SET flag_count = (SELECT COUNT(*) FROM review_flags WHERE review_id = p_review_id),
      is_hidden  = (SELECT COUNT(*) >= 3 FROM review_flags WHERE review_id = p_review_id)
  WHERE id = p_review_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.flag_review(uuid, text) TO anon, authenticated;
