-- Integrity report: statement copies (with trap names) and the pastes that follow them.
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_activity_statement_copy_idx
    ON public.user_activity (user_id, contest_id, created_at) WHERE action = 'statement_copy';
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_activity_code_paste_idx
    ON public.user_activity (user_id, contest_id, created_at) WHERE action = 'code_paste';
