import { query } from '../db/db';
import { SOLVED_BADGES, STREAK_TIERS } from '../achievements/catalog';

const DAY = 24 * 3600 * 1000;
const noon = (d: Date | string) => new Date(`${new Date(d).toISOString().slice(0, 10)}T12:00:00Z`);

/** Date on which the n-th day of the first run of at least n consecutive days was reached. */
function streakReached(dates: Date[], n: number): Date | null {
    let runStart = 0;
    for (let i = 0; i < dates.length; i++) {
        if (i > 0 && dates[i].getTime() - dates[i - 1].getTime() !== DAY) runStart = i;
        if (i - runStart + 1 >= n) return dates[i];
    }
    return null;
}

/**
 * When each progress badge was really earned, worked out from the user's own
 * history (solves, daily streaks, logs, enrolments) instead of the moment the
 * badge row was written. Badges with no timestamped event are left out.
 */
export async function earnedTimes(userId: number): Promise<Map<string, Date>> {
    const out = new Map<string, Date>();
    const set = (id: string, t: Date | null | undefined) => { if (t && !Number.isNaN(t.getTime())) out.set(id, t); };

    const [solves, sheets, skills, days, logs, user, seasons] = await Promise.all([
        query(
            `SELECT MIN(solved_at) AS t FROM user_progress
             WHERE user_id = $1 AND status = 'SOLVED' AND solved_at IS NOT NULL
             GROUP BY sheet_id, problem_id ORDER BY t`, [userId]),
        query(
            `SELECT s.sheet_number, s.total_problems,
                    (SELECT array_agg(t ORDER BY t) FROM (
                        SELECT MIN(up.solved_at) AS t FROM user_progress up
                        WHERE up.user_id = $1 AND up.status = 'SOLVED' AND up.solved_at IS NOT NULL AND up.sheet_id = s.id::text
                        GROUP BY up.problem_id) x) AS times
             FROM curriculum_sheets s
             JOIN curriculum_levels l ON l.id = s.level_id AND l.level_number = 0
             WHERE s.sheet_number BETWEEN 1 AND 7 AND s.total_problems > 0`, [userId]),
        query(
            `SELECT (SELECT COALESCE(SUM(s.total_problems), 0) FROM curriculum_sheets s
                       JOIN curriculum_levels l ON l.id = s.level_id AND l.level_number = 0
                      WHERE s.sheet_number BETWEEN 1 AND 7) AS total,
                    (SELECT array_agg(t ORDER BY t) FROM (
                        SELECT MIN(up.solved_at) AS t FROM user_progress up
                        JOIN curriculum_sheets s2 ON s2.id::text = up.sheet_id
                        JOIN curriculum_levels l2 ON l2.id = s2.level_id AND l2.level_number = 0
                        WHERE up.user_id = $1 AND up.status = 'SOLVED' AND up.solved_at IS NOT NULL AND s2.sheet_number BETWEEN 1 AND 7
                        GROUP BY up.sheet_id, up.problem_id) y) AS times`, [userId]),
        query('SELECT DISTINCT solve_date FROM daily_solves WHERE user_id = $1 ORDER BY solve_date', [userId]),
        query(
            `SELECT (week_number - 1) * 7 + day_number AS n, COALESCE(submitted_at, created_at, log_date::timestamptz) AS t
             FROM user_discipline_logs
             WHERE user_id = $1 AND NOT is_missed AND (COALESCE(total_hours, 0) > 0 OR COALESCE(done_tasks, '') <> '')
             ORDER BY n`, [userId]),
        query('SELECT created_at FROM users WHERE id = $1', [userId]),
        query(
            `SELECT (SELECT joined_at FROM season_enrollments WHERE user_id = $1 AND season_year = 2026) AS s2026,
                    (SELECT MIN(r.submitted_at) FROM users u JOIN level0_training_registrations r ON r.application_id = u.application_id
                      WHERE u.id = $1 AND r.season_year = 2027) AS s2027`, [userId]),
    ]);

    const solveTimes: Date[] = solves.rows.map((r: { t: Date }) => new Date(r.t));
    for (const b of SOLVED_BADGES) set(b.id, solveTimes[b.count - 1]);
    set('hello-world', solveTimes[0]);

    for (const r of sheets.rows as { sheet_number: number; total_problems: number; times: Date[] | null }[]) {
        if (r.times && r.times.length >= r.total_problems) set(`sheet-${r.sheet_number}`, new Date(r.times[r.total_problems - 1]));
    }
    const skillTotal = Number(skills.rows[0]?.total || 0);
    const skillTimes: Date[] | null = skills.rows[0]?.times;
    if (skillTotal > 0 && skillTimes) {
        const need = Math.ceil(skillTotal * 0.8);
        if (skillTimes.length >= need) set('level0-skills', new Date(skillTimes[need - 1]));
    }

    const dates: Date[] = days.rows.map((r: { solve_date: Date | string }) => new Date(`${new Date(r.solve_date).toISOString().slice(0, 10)}T00:00:00Z`));
    for (const n of STREAK_TIERS) set(`streak-${n}`, (() => { const d = streakReached(dates, n); return d ? noon(d) : null; })());
    for (let i = 1; i < dates.length; i++) {
        if ((dates[i].getTime() - dates[i - 1].getTime()) / DAY >= 7) { set('comeback', noon(dates[i])); break; }
    }

    // Consecutive program days with something logged.
    const rows = logs.rows as { n: number; t: Date }[];
    let runStart = 0;
    for (let i = 0; i < rows.length; i++) {
        if (i > 0 && rows[i].n - rows[i - 1].n !== 1) runStart = i;
        const len = i - runStart + 1;
        if (len === 7) set('disciplined-7', new Date(rows[i].t));
        if (len === 56) set('disciplined-program', new Date(rows[i].t));
    }

    set('welcome', user.rows[0]?.created_at ? new Date(user.rows[0].created_at) : null);
    set('year-2026', seasons.rows[0]?.s2026 ? new Date(seasons.rows[0].s2026) : null);
    set('year-2027', seasons.rows[0]?.s2027 ? new Date(seasons.rows[0].s2027) : null);
    return out;
}
