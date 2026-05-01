-- Migration 021: Unify training_submissions + cf_submissions into one table
-- Eliminates all UNION ALL queries. Creates user_solve_stats for instant leaderboard.
-- Old tables are kept for rollback safety — drop them in a future migration after verification.
-- ============================================================

-- 1. Unified submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source varchar(20) NOT NULL CHECK (source IN ('judge0', 'codeforces')),
    contest_id varchar(50),
    problem_index varchar(10),
    sheet_id varchar(50),
    verdict varchar(100) NOT NULL,
    time_ms integer DEFAULT 0,
    memory_kb integer DEFAULT 0,
    language varchar(100),
    source_code text,
    test_cases_passed integer,
    total_test_cases integer,
    runtime_error text,
    tab_switches integer DEFAULT 0,
    paste_events integer DEFAULT 0,
    time_to_solve_seconds integer,
    attempt_number integer DEFAULT 1,
    cf_submission_id bigint UNIQUE,
    cf_handle varchar(100),
    url_type varchar(20) DEFAULT 'contest',
    group_id varchar(50),
    compilation_error text,
    details text,
    test_number integer,
    notes text,
    note_color varchar(20),
    ip_address text,
    submitted_at timestamptz DEFAULT now()
);

-- 2. Indexes
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_user_verdict ON submissions(user_id, verdict);
CREATE INDEX idx_submissions_user_contest ON submissions(user_id, contest_id, problem_index);
CREATE INDEX idx_submissions_sheet_verdict ON submissions(sheet_id, verdict) WHERE sheet_id IS NOT NULL;
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at DESC);
CREATE INDEX idx_submissions_cf_id ON submissions(cf_submission_id) WHERE cf_submission_id IS NOT NULL;
CREATE INDEX idx_submissions_user_sheet ON submissions(user_id, sheet_id) WHERE sheet_id IS NOT NULL;
CREATE INDEX idx_submissions_source ON submissions(source);
CREATE INDEX idx_submissions_accepted ON submissions(user_id, contest_id, problem_index) WHERE verdict = 'Accepted' AND source = 'codeforces';

-- 3. RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_submissions" ON submissions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Migrate data
INSERT INTO submissions (user_id, source, contest_id, problem_index, sheet_id, verdict, time_ms, memory_kb, language, source_code, test_cases_passed, total_test_cases, runtime_error, tab_switches, paste_events, time_to_solve_seconds, attempt_number, compilation_error, ip_address, submitted_at, notes, note_color)
SELECT user_id, 'judge0', NULL, problem_id, sheet_id, verdict, time_ms, memory_kb, language, source_code, test_cases_passed, total_test_cases, runtime_error, tab_switches, paste_events, time_to_solve_seconds, attempt_number, compile_error, ip_address, submitted_at, notes, note_color FROM training_submissions;

INSERT INTO submissions (user_id, source, contest_id, problem_index, sheet_id, verdict, time_ms, memory_kb, language, source_code, cf_submission_id, cf_handle, url_type, group_id, compilation_error, details, test_number, submitted_at, notes, note_color)
SELECT user_id, 'codeforces', contest_id, problem_index, sheet_id, verdict, time_ms, memory_kb, language, source_code, cf_submission_id, cf_handle, url_type, group_id, compilation_error, details, test_number, submitted_at, notes, note_color FROM cf_submissions;

-- 5. user_solve_stats (pre-computed leaderboard data)
CREATE TABLE IF NOT EXISTS user_solve_stats (
    user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    distinct_solved integer NOT NULL DEFAULT 0,
    total_submissions integer NOT NULL DEFAULT 0,
    total_accepted integer NOT NULL DEFAULT 0,
    first_solve_at timestamptz,
    last_solve_at timestamptz,
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE user_solve_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_solve_stats" ON user_solve_stats FOR SELECT USING (true);
CREATE POLICY "service_role_all_solve_stats" ON user_solve_stats FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Populate
INSERT INTO user_solve_stats (user_id, distinct_solved, total_submissions, total_accepted, first_solve_at, last_solve_at)
SELECT s.user_id, COUNT(DISTINCT CASE WHEN s.verdict = 'Accepted' AND s.source = 'codeforces' THEN s.contest_id || '-' || s.problem_index END), COUNT(*) FILTER (WHERE s.source = 'codeforces'), COUNT(*) FILTER (WHERE s.verdict = 'Accepted' AND s.source = 'codeforces'), MIN(s.submitted_at) FILTER (WHERE s.verdict = 'Accepted'), MAX(s.submitted_at) FILTER (WHERE s.verdict = 'Accepted')
FROM submissions s GROUP BY s.user_id
ON CONFLICT (user_id) DO UPDATE SET distinct_solved = EXCLUDED.distinct_solved, total_submissions = EXCLUDED.total_submissions, total_accepted = EXCLUDED.total_accepted, first_solve_at = EXCLUDED.first_solve_at, last_solve_at = EXCLUDED.last_solve_at, updated_at = now();

-- 6. Auto-update trigger
CREATE OR REPLACE FUNCTION update_solve_stats_on_submission() RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.source = 'codeforces' THEN
        INSERT INTO user_solve_stats (user_id, distinct_solved, total_submissions, total_accepted, first_solve_at, last_solve_at)
        SELECT NEW.user_id, COUNT(DISTINCT CASE WHEN verdict = 'Accepted' THEN contest_id || '-' || problem_index END), COUNT(*), COUNT(*) FILTER (WHERE verdict = 'Accepted'), MIN(submitted_at) FILTER (WHERE verdict = 'Accepted'), MAX(submitted_at) FILTER (WHERE verdict = 'Accepted')
        FROM submissions WHERE user_id = NEW.user_id AND source = 'codeforces'
        ON CONFLICT (user_id) DO UPDATE SET distinct_solved = EXCLUDED.distinct_solved, total_submissions = EXCLUDED.total_submissions, total_accepted = EXCLUDED.total_accepted, first_solve_at = EXCLUDED.first_solve_at, last_solve_at = EXCLUDED.last_solve_at, updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_solve_stats AFTER INSERT OR UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_solve_stats_on_submission();
