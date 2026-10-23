import 'server-only';

import { query } from '@/lib/db';
import { decrypt } from '@/lib/security/encryption';
import { analyze, similarity, type Analyzed } from './similarity';

/**
 * Integrity report: students whose submitted code matches each other in ways
 * that are unlikely by chance, plus the "pasted, not typed" behaviour signal.
 *
 * On short beginner problems most students write the same obvious code, so a
 * structural match alone is never evidence. A match counts only when it is
 * rare for that problem:
 *   - identical text (names and layout too) shared by few students,
 *   - distinctive variable names only these students use,
 *   - an unusual solution shared by a small group (most of the class differs).
 * Pairs are then ranked by how many problems they match on.
 */

const MIN_TOKENS = 30;            // shorter solutions are too generic to compare
const STRUCT_THRESHOLD = 0.85;    // structural similarity to call two solutions "the same"
const EXACT_MIN_TOKENS = 40;
const PASTE_MIN_CHARS = 150;      // a solution this long with almost no typing was pasted

export type Reason = 'identical' | 'rare_names' | 'rare_solution';

export interface StudentRef {
    userId: number;
    name: string;
    studentId: string;
    group: string | null;
}

export interface PairProblem {
    contestId: string;
    problem: string;
    label: string;
    similarity: number;
    reasons: Reason[];
    rareNames: string[];
    solvers: number;      // students compared on this problem
    sameCount: number;    // how many of them share this solution
}

export interface PairCase {
    a: StudentRef;
    b: StudentRef;
    problems: PairProblem[];
    score: number;
    level: 'high' | 'medium' | 'low';
}

export interface BehaviourCase {
    student: StudentRef;
    pastedProblems: { contestId: string; problem: string; label: string; chars: number; keystrokes: number; activeSeconds: number }[];
}

export interface IntegrityReport {
    generatedAt: string;
    stats: { codes: number; problems: number; students: number };
    pairs: PairCase[];
    rings: { members: StudentRef[]; problems: number }[];
    behaviour: BehaviourCase[];
}

interface CodeRow { user_id: string; contest_id: string; p: string; code: string }

let cache: { at: number; report: IntegrityReport } | null = null;
const CACHE_MS = 10 * 60 * 1000;

export async function getIntegrityReport(force = false): Promise<IntegrityReport> {
    if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.report;
    const report = await buildReport();
    cache = { at: Date.now(), report };
    return report;
}

/** The two students' code for one problem (for side-by-side comparison). */
export async function codeFor(userIds: number[], contestId: string, problem: string): Promise<Record<number, string>> {
    const rows = await loadCodes(`AND user_id = ANY($1::bigint[]) AND contest_id = $2`, [userIds, contestId]);
    const out: Record<number, string> = {};
    for (const r of rows) if (r.p === problem.toUpperCase()) out[Number(r.user_id)] = r.code;
    return out;
}

async function loadCodes(extra = '', params: unknown[] = []): Promise<CodeRow[]> {
    // Latest accepted submission's code, else the latest saved draft.
    const res = await query(`
        WITH subs AS (
            SELECT DISTINCT ON (user_id, contest_id, upper(problem_index))
                   user_id, contest_id, upper(problem_index) AS p, source_code AS code
              FROM submissions
             WHERE source_code IS NOT NULL AND source_code <> '' AND verdict IN ('Accepted', 'OK') ${extra}
             ORDER BY user_id, contest_id, upper(problem_index), id DESC
        ), drafts AS (
            SELECT DISTINCT ON (user_id, contest_id, upper(regexp_replace(problem_id, '^.*:', '')))
                   user_id, contest_id, upper(regexp_replace(problem_id, '^.*:', '')) AS p, code
              FROM user_code
             WHERE length(code) > 60 ${extra}
             ORDER BY user_id, contest_id, upper(regexp_replace(problem_id, '^.*:', '')), updated_at DESC
        )
        SELECT user_id, contest_id, p, code FROM subs
        UNION ALL
        SELECT d.user_id, d.contest_id, d.p, d.code FROM drafts d
         WHERE NOT EXISTS (SELECT 1 FROM subs s WHERE s.user_id = d.user_id AND s.contest_id = d.contest_id AND s.p = d.p)
    `, params);
    return res.rows as CodeRow[];
}

async function buildReport(): Promise<IntegrityReport> {
    const [codes, staffRes, labelsRes, behaviourRes] = await Promise.all([
        loadCodes(),
        query(`SELECT id FROM users WHERE role IN ('mentor', 'instructor', 'owner')`),
        query(`
            SELECT s.contest_id, p.problem_letter, p.title, l.level_number, s.sheet_letter
              FROM curriculum_problems p
              JOIN curriculum_sheets s ON s.id = p.sheet_id
              JOIN curriculum_levels l ON l.id = s.level_id`),
        query(`
            WITH typing AS (
                SELECT user_id, contest_id, upper(problem_id) AS p,
                       SUM(COALESCE((metadata->>'keystrokes')::int, 0)) AS keystrokes
                  FROM user_activity
                 WHERE action = 'problem_leave' AND contest_id IS NOT NULL AND problem_id IS NOT NULL
                 GROUP BY 1, 2, 3
            ), time_on AS (
                SELECT user_id, contest_id, upper(problem_index) AS p, SUM(active_seconds) AS active
                  FROM problem_time_sessions GROUP BY 1, 2, 3
            )
            SELECT t.user_id, t.contest_id, t.p, t.keystrokes, COALESCE(o.active, 0) AS active
              FROM typing t LEFT JOIN time_on o ON o.user_id = t.user_id AND o.contest_id = t.contest_id AND o.p = t.p`),
    ]);
    const staff = new Set(staffRes.rows.map((r: { id: string }) => Number(r.id)));
    const labels = new Map<string, string>();
    for (const r of labelsRes.rows as { contest_id: string; problem_letter: string; title: string; level_number: number; sheet_letter: string }[]) {
        labels.set(`${r.contest_id}:${String(r.problem_letter).toUpperCase()}`, `Lv ${r.level_number} / Sheet ${r.sheet_letter} / ${r.problem_letter}${r.title ? ` · ${r.title}` : ''}`);
    }
    const labelOf = (c: string, p: string) => labels.get(`${c}:${p}`) || `${c} ${p}`;

    // Group code by problem.
    type Item = { userId: number; a: Analyzed; chars: number };
    const byProblem = new Map<string, Item[]>();
    const codeLength = new Map<string, number>();
    for (const r of codes) {
        const userId = Number(r.user_id);
        codeLength.set(`${userId}|${r.contest_id}|${r.p}`, r.code.length);
        if (staff.has(userId)) continue;
        const key = `${r.contest_id}:${r.p}`;
        if (!byProblem.has(key)) byProblem.set(key, []);
        byProblem.get(key)!.push({ userId, a: analyze(r.code), chars: r.code.length });
    }

    const pairMap = new Map<string, { a: number; b: number; problems: PairProblem[] }>();
    for (const [key, all] of byProblem) {
        const list = all.filter((x) => x.a.tokens >= MIN_TOKENS);
        const n = list.length;
        if (n < 2) continue;
        const [contestId, problem] = key.split(':');
        const rareMax = Math.max(2, Math.floor(n * 0.05));
        const familyMax = Math.max(2, Math.floor(n * 0.1));

        const nameFreq = new Map<string, number>();
        const textFreq = new Map<string, number>();
        for (const x of list) {
            for (const id of x.a.identifiers) nameFreq.set(id, (nameFreq.get(id) || 0) + 1);
            textFreq.set(x.a.exactText, (textFreq.get(x.a.exactText) || 0) + 1);
        }
        const sims: number[][] = list.map(() => new Array(n).fill(0));
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) sims[i][j] = sims[j][i] = similarity(list[i].a, list[j].a);
        const family = list.map((_, i) => sims[i].filter((s, j) => j !== i && s >= STRUCT_THRESHOLD).length + 1);

        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            const s = sims[i][j];
            if (s < STRUCT_THRESHOLD) continue;
            const A = list[i].a, B = list[j].a;
            const reasons: Reason[] = [];
            const identical = A.exactText === B.exactText && Math.min(A.tokens, B.tokens) >= EXACT_MIN_TOKENS && (textFreq.get(A.exactText) || 0) <= rareMax;
            if (identical) reasons.push('identical');
            const rareNames = [...A.identifiers].filter((id) => B.identifiers.has(id) && (nameFreq.get(id) || 0) <= rareMax);
            if (rareNames.length) reasons.push('rare_names');
            const sameCount = Math.max(family[i], family[j]);
            if (n >= 6 && sameCount <= familyMax) reasons.push('rare_solution');
            if (!reasons.length) continue;

            const [ua, ub] = list[i].userId < list[j].userId ? [list[i].userId, list[j].userId] : [list[j].userId, list[i].userId];
            const pk = `${ua}~${ub}`;
            if (!pairMap.has(pk)) pairMap.set(pk, { a: ua, b: ub, problems: [] });
            pairMap.get(pk)!.problems.push({
                contestId, problem, label: labelOf(contestId, problem),
                similarity: Math.round(s * 100) / 100, reasons, rareNames: rareNames.slice(0, 5), solvers: n, sameCount,
            });
        }
    }

    // Score: identical text and shared rare names weigh more than a rare structure.
    const scored = [...pairMap.values()].map((p) => {
        const score = p.problems.reduce((t, pr) => t + (pr.reasons.includes('identical') ? 3 : 0) + (pr.reasons.includes('rare_names') ? 2 : 0) + (pr.reasons.includes('rare_solution') ? 1 : 0), 0);
        const level: PairCase['level'] = p.problems.length >= 4 || score >= 10 ? 'high' : p.problems.length >= 2 || score >= 4 ? 'medium' : 'low';
        return { ...p, score, level };
    }).sort((x, y) => y.score - x.score || y.problems.length - x.problems.length);

    // Groups: students linked by pairs that match on 3+ problems.
    const parent = new Map<number, number>();
    const find = (x: number): number => { while (parent.get(x) !== undefined && parent.get(x) !== x) x = parent.get(x)!; return x; };
    for (const p of scored) if (p.problems.length >= 3) {
        if (!parent.has(p.a)) parent.set(p.a, p.a);
        if (!parent.has(p.b)) parent.set(p.b, p.b);
        parent.set(find(p.a), find(p.b));
    }
    const ringMembers = new Map<number, number[]>();
    for (const id of parent.keys()) { const r = find(id); if (!ringMembers.has(r)) ringMembers.set(r, []); ringMembers.get(r)!.push(id); }
    const rings = [...ringMembers.values()].filter((m) => m.length >= 3);

    // Behaviour: long solutions that appeared with almost no typing.
    const pasted = new Map<number, BehaviourCase['pastedProblems']>();
    for (const r of behaviourRes.rows as { user_id: string; contest_id: string; p: string; keystrokes: string; active: string }[]) {
        const userId = Number(r.user_id);
        if (staff.has(userId)) continue;
        const chars = codeLength.get(`${userId}|${r.contest_id}|${r.p}`) || 0;
        const keystrokes = Number(r.keystrokes) || 0;
        if (chars < PASTE_MIN_CHARS || keystrokes > chars * 0.25) continue;
        if (!pasted.has(userId)) pasted.set(userId, []);
        pasted.get(userId)!.push({ contestId: r.contest_id, problem: r.p, label: labelOf(r.contest_id, r.p), chars, keystrokes, activeSeconds: Number(r.active) || 0 });
    }
    const behaviourIds = [...pasted.entries()].filter(([, list]) => list.length >= 3).map(([id]) => id);

    // Names, student IDs and mentor groups for everyone mentioned.
    const ids = [...new Set([...scored.flatMap((p) => [p.a, p.b]), ...behaviourIds])];
    const people = await studentRefs(ids);
    const ref = (id: number): StudentRef => people.get(id) || { userId: id, name: `User ${id}`, studentId: '', group: null };

    const students = new Set(codes.map((r: CodeRow) => Number(r.user_id)));
    return {
        generatedAt: new Date().toISOString(),
        stats: { codes: codes.length, problems: byProblem.size, students: students.size },
        pairs: scored.map((p) => ({ a: ref(p.a), b: ref(p.b), problems: p.problems, score: p.score, level: p.level })),
        rings: rings.map((m) => ({
            members: m.map(ref),
            problems: new Set(scored.filter((p) => m.includes(p.a) && m.includes(p.b)).flatMap((p) => p.problems.map((x) => `${x.contestId}:${x.problem}`))).size,
        })),
        behaviour: behaviourIds
            .map((id) => ({ student: ref(id), pastedProblems: pasted.get(id)!.sort((x, y) => x.label.localeCompare(y.label)) }))
            .sort((x, y) => y.pastedProblems.length - x.pastedProblems.length),
    };
}

async function studentRefs(ids: number[]): Promise<Map<number, StudentRef>> {
    const out = new Map<number, StudentRef>();
    if (!ids.length) return out;
    const res = await query(`
        SELECT u.id, u.codeforces_handle, split_part(au.email, '@', 1) AS sid, ap.name AS enc_name,
               (SELECT string_agg(DISTINCT mt.group_name, ', ') FROM mentor_trainees mt
                 WHERE mt.student_id = split_part(au.email, '@', 1)) AS grp
          FROM users u
          LEFT JOIN auth.users au ON au.id = u.supabase_uid
          LEFT JOIN applications ap ON ap.id = u.application_id
         WHERE u.id = ANY($1::bigint[])`, [ids]);
    for (const r of res.rows as { id: string; codeforces_handle: string | null; sid: string | null; enc_name: string | null; grp: string | null }[]) {
        const studentId = /^\d{5,12}$/.test(r.sid || '') ? r.sid! : '';
        out.set(Number(r.id), {
            userId: Number(r.id),
            name: decrypt(r.enc_name) || r.codeforces_handle || (studentId ? `Student ${studentId}` : `User ${r.id}`),
            studentId,
            group: r.grp,
        });
    }
    return out;
}
