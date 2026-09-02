import { query, withTransaction } from '@/lib/db/db';

export type BackfillUrlType = 'contest' | 'group' | 'gym';

export interface IncomingBackfillSubmission {
    id: number | string;
    problemIndex?: string;
    verdict?: string;
    timeConsumedMillis?: number;
    memoryConsumedBytes?: number;
    language?: string;
    creationTimeSeconds?: number;
    submittedAt?: string | Date | null;
}

export interface BackfillBatch {
    contestId: string | number;
    sheetId?: string | null;
    urlType?: BackfillUrlType | string;
    groupId?: string | null;
    submissions?: IncomingBackfillSubmission[];
    /** Kept for compatibility with extension versions that sent ACs separately. */
    accepted?: IncomingBackfillSubmission[];
    /** Public API sync must never fall back to private/group mappings. */
    allowGroup?: boolean;
}

interface CurriculumMapping {
    sheetId: string;
    sheetContestId: string;
    canonicalContestId: string;
    problemIndex: string;
    problemId: string;
    urlType: BackfillUrlType;
    groupId: string | null;
}

interface CurriculumIndex {
    exact: Map<string, CurriculumMapping[]>;
    byContestAndProblem: Map<string, CurriculumMapping[]>;
    bySheetContestAndProblem: Map<string, CurriculumMapping[]>;
    groupTargets: Set<string>;
}

interface NormalizedSubmission {
    cfId: number;
    contestId: string;
    problemIndex: string;
    verdict: string;
    timeMs: number;
    memoryKb: number;
    language: string;
    submittedAt: Date | null;
    mappings: CurriculumMapping[];
}

const FINAL_VERDICTS: Record<string, string> = {
    OK: 'Accepted',
    ACCEPTED: 'Accepted',
    WRONG_ANSWER: 'Wrong Answer',
    'WRONG ANSWER': 'Wrong Answer',
    TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
    'TIME LIMIT EXCEEDED': 'Time Limit Exceeded',
    MEMORY_LIMIT_EXCEEDED: 'Memory Limit Exceeded',
    'MEMORY LIMIT EXCEEDED': 'Memory Limit Exceeded',
    RUNTIME_ERROR: 'Runtime Error',
    'RUNTIME ERROR': 'Runtime Error',
    COMPILATION_ERROR: 'Compilation Error',
    'COMPILATION ERROR': 'Compilation Error',
    PRESENTATION_ERROR: 'Presentation Error',
    'PRESENTATION ERROR': 'Presentation Error',
    IDLENESS_LIMIT_EXCEEDED: 'Idleness Limit Exceeded',
    'IDLENESS LIMIT EXCEEDED': 'Idleness Limit Exceeded',
    CHALLENGED: 'Challenged',
    SKIPPED: 'Skipped',
    TESTING: 'Testing',
};

function normalizeUrlType(value: unknown): BackfillUrlType {
    return value === 'group' || value === 'gym' ? value : 'contest';
}

function normalizeGroupId(value: unknown): string | null {
    const group = String(value || '').trim();
    return group || null;
}

function normalizeContestId(value: unknown): string | null {
    const contest = String(value || '').trim();
    return contest || null;
}

function normalizeProblemIndex(value: unknown): string | null {
    const index = String(value || '').trim().toUpperCase();
    return /^[A-Z][A-Z0-9]{0,9}$/.test(index) ? index : null;
}

function targetKey(urlType: BackfillUrlType, groupId: string | null, contestId: string, index: string) {
    return `${urlType}|${groupId || ''}|${contestId}|${index}`;
}

function contestProblemKey(contestId: string, index: string) {
    return `${contestId}|${index}`;
}

function sheetContestProblemKey(sheetId: string, contestId: string, index: string) {
    return `${sheetId}|${contestId}|${index}`;
}

/**
 * Extract the real contest identity from a problem URL. Curriculum sheet
 * metadata has historically contained stale/placeholder contest IDs, while
 * the problem URL still points at the real contest. The URL is authoritative.
 */
export function parseCodeforcesUrl(url: unknown): { contestId: string; urlType: BackfillUrlType; groupId: string | null } | null {
    const raw = String(url || '').trim();
    if (!raw) return null;

    let match = raw.match(/\/group\/([^/]+)\/contest\/(\d+)/i);
    if (match) return { contestId: match[2], urlType: 'group', groupId: match[1] };

    match = raw.match(/\/(gym|contest)\/(\d+)/i);
    if (match) return { contestId: match[2], urlType: match[1].toLowerCase() as BackfillUrlType, groupId: null };

    // Some links use /problemset/problem/<contest>/<letter>.
    match = raw.match(/\/problemset\/problem\/(\d+)\/([A-Za-z][A-Za-z0-9]?)/i);
    if (match) return { contestId: match[1], urlType: 'contest', groupId: null };

    return null;
}

function deriveMapping(row: any): CurriculumMapping | null {
    const sheetContestId = normalizeContestId(row.sheet_contest_id);
    const problemContestId = normalizeContestId(row.problem_contest_id);
    const fromUrl = parseCodeforcesUrl(row.codeforces_url) || parseCodeforcesUrl(row.contest_url);
    const canonicalContestId = fromUrl?.contestId || problemContestId || sheetContestId;
    const problemIndex = normalizeProblemIndex(row.problem_letter);
    if (!canonicalContestId || !problemIndex || !row.sheet_id) return null;

    const sheetUrlType = row.contest_url?.includes('/group/')
        ? 'group'
        : row.contest_url?.includes('/gym/')
            ? 'gym'
            : 'contest';
    const urlType = fromUrl?.urlType || (row.sheet_group_id ? 'group' : sheetUrlType);
    const groupId = fromUrl?.groupId || normalizeGroupId(row.sheet_group_id);

    return {
        sheetId: String(row.sheet_id),
        sheetContestId: sheetContestId || canonicalContestId,
        canonicalContestId,
        problemIndex,
        problemId: `${sheetContestId || canonicalContestId}:${problemIndex}`,
        urlType,
        groupId,
    };
}

export async function loadCurriculumIndex(): Promise<CurriculumIndex> {
    const result = await query(`
        SELECT
            s.id AS sheet_id,
            s.contest_id AS sheet_contest_id,
            s.contest_url,
            s.group_id AS sheet_group_id,
            p.problem_letter,
            p.contest_id AS problem_contest_id,
            p.codeforces_url
        FROM curriculum_sheets s
        JOIN curriculum_problems p ON p.sheet_id = s.id
        WHERE p.problem_letter IS NOT NULL
    `);

    const index: CurriculumIndex = {
        exact: new Map(),
        byContestAndProblem: new Map(),
        bySheetContestAndProblem: new Map(),
        groupTargets: new Set(),
    };

    for (const row of result.rows) {
        const mapping = deriveMapping(row);
        if (!mapping) continue;

        const exact = targetKey(mapping.urlType, mapping.groupId, mapping.canonicalContestId, mapping.problemIndex);
        const byContest = contestProblemKey(mapping.canonicalContestId, mapping.problemIndex);
        const add = (map: Map<string, CurriculumMapping[]>, key: string) => {
            const existing = map.get(key);
            if (existing) existing.push(mapping);
            else map.set(key, [mapping]);
        };
        add(index.exact, exact);
        add(index.byContestAndProblem, byContest);
        add(index.bySheetContestAndProblem, sheetContestProblemKey(mapping.sheetId, mapping.sheetContestId, mapping.problemIndex));
        if (mapping.urlType === 'group') {
            index.groupTargets.add(targetKey(mapping.urlType, mapping.groupId, mapping.canonicalContestId, mapping.problemIndex));
        }
    }

    return index;
}

function isAccepted(verdict: string) {
    const normalized = verdict.trim().toUpperCase();
    return normalized === 'OK' || normalized === 'ACCEPTED' || normalized === 'AC';
}

export function normalizeVerdict(verdict?: string) {
    const raw = String(verdict || '').trim();
    if (!raw) return 'Unknown';
    return FINAL_VERDICTS[raw.toUpperCase()] || raw;
}

function parseSubmittedAt(raw: IncomingBackfillSubmission): Date | null {
    if (raw.creationTimeSeconds && Number.isFinite(Number(raw.creationTimeSeconds))) {
        const seconds = Number(raw.creationTimeSeconds);
        if (seconds > 0 && seconds < 4102444800) return new Date(seconds * 1000);
    }
    if (raw.submittedAt) {
        const date = new Date(raw.submittedAt);
        if (!Number.isNaN(date.getTime())) return date;
    }
    return null;
}

function resolveMappings(
    index: CurriculumIndex,
    batch: BackfillBatch,
    contestId: string,
    problemIndex: string,
): CurriculumMapping[] {
    const urlType = normalizeUrlType(batch.urlType);
    const groupId = normalizeGroupId(batch.groupId);
    const exact = index.exact.get(targetKey(urlType, groupId, contestId, problemIndex))
        ?.filter(mapping => !batch.sheetId || mapping.sheetId === String(batch.sheetId))
        .filter(mapping => batch.allowGroup !== false || mapping.urlType !== 'group');
    if (exact?.length) return exact;

    const sheetAliases = batch.sheetId
        ? index.bySheetContestAndProblem.get(sheetContestProblemKey(String(batch.sheetId), contestId, problemIndex))
        : undefined;
    if (sheetAliases?.length) return sheetAliases.filter(mapping => batch.allowGroup !== false || mapping.urlType !== 'group');

    // Legacy payloads used the sheet-level contest ID. Resolve that alias, but
    // never let a public sync accidentally import a private group problem.
    const aliases = index.byContestAndProblem.get(contestProblemKey(contestId, problemIndex)) || [];
    return aliases
        .filter(mapping => !batch.sheetId || mapping.sheetId === String(batch.sheetId))
        .filter(mapping => batch.allowGroup !== false || mapping.urlType !== 'group');
}

export interface BackfillResult {
    acceptedProblems: number;
    attemptedProblems: number;
    matchingSubmissions: number;
    newlyInserted: number;
    newlySolved: number;
    skipped: number;
}

/**
 * Idempotently apply one or more browser/API batches. All writes happen in a
 * transaction and progress references the local submissions.id returned by
 * Postgres (never the external Codeforces submission ID).
 */
export async function applyBackfillBatches(
    userId: number | string,
    cfHandle: string | null,
    batches: BackfillBatch[],
    index?: CurriculumIndex,
): Promise<BackfillResult> {
    const curriculum = index || await loadCurriculumIndex();
    const byCfId = new Map<number, NormalizedSubmission>();
    let skipped = 0;

    for (const batch of batches) {
        const contestId = normalizeContestId(batch.contestId);
        if (!contestId) { skipped++; continue; }
        const incoming = [
            ...(Array.isArray(batch.submissions) ? batch.submissions : []),
            // Older extension versions omitted verdict on the separate AC
            // list; that list is authoritative by definition.
            ...(Array.isArray(batch.accepted)
                ? batch.accepted.map(submission => ({ ...submission, verdict: submission.verdict || 'Accepted' }))
                : []),
        ];

        for (const raw of incoming) {
            const cfId = Number(raw?.id);
            const problemIndex = normalizeProblemIndex(raw?.problemIndex);
            if (!Number.isSafeInteger(cfId) || cfId <= 0 || !problemIndex) { skipped++; continue; }

            const mappings = resolveMappings(curriculum, batch, contestId, problemIndex);
            if (mappings.length === 0) { skipped++; continue; }

            const normalized: NormalizedSubmission = {
                cfId,
                contestId,
                problemIndex,
                verdict: normalizeVerdict(raw.verdict),
                timeMs: Math.max(0, Math.min(2147483647, Number(raw.timeConsumedMillis) || 0)),
                memoryKb: Math.max(0, Math.min(2147483647, Math.round((Number(raw.memoryConsumedBytes) || 0) / 1024))),
                language: String(raw.language || 'C++').slice(0, 100),
                submittedAt: parseSubmittedAt(raw),
                mappings,
            };

            const previous = byCfId.get(cfId);
            // Keep the most useful record if old extension pages repeat an ID.
            if (!previous ||
                (previous.verdict === 'Unknown' && normalized.verdict !== 'Unknown') ||
                (isAccepted(normalized.verdict) && !isAccepted(previous.verdict))) {
                byCfId.set(cfId, normalized);
            }
        }
    }

    const records = Array.from(byCfId.values());
    if (records.length === 0) return { acceptedProblems: 0, attemptedProblems: 0, matchingSubmissions: 0, newlyInserted: 0, newlySolved: 0, skipped };

    return withTransaction(async (client) => {
        const localIds = new Map<number, number>();
        let newlyInserted = 0;
        // 4,000 rows stays below Postgres' 65,535-parameter limit (14 columns)
        // while minimizing statement-level solve-stat recalculations.
        const chunkSize = 4000;

        for (let start = 0; start < records.length; start += chunkSize) {
            const chunk = records.slice(start, start + chunkSize);
            const values: unknown[] = [];
            const placeholders: string[] = [];

            chunk.forEach((record, offset) => {
                const p = offset * 14;
                // Codeforces' group HTML sometimes omits an absolute time;
                // keep that value NULL until a later API/extension run supplies
                // it rather than inventing a misleading current timestamp.
                placeholders.push(`($${p + 1}, 'codeforces', $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5}, $${p + 6}, $${p + 7}, $${p + 8}, $${p + 9}, $${p + 10}, $${p + 11}, $${p + 12}, $${p + 13}, $${p + 14})`);
                const primaryMapping = record.mappings[0];
                values.push(
                    userId,
                    record.cfId,
                    // Store the contest ID from the curriculum mapping. This
                    // repairs stale sheet-level IDs and lets mentor/tries
                    // queries join the canonical problem identity.
                    primaryMapping.canonicalContestId,
                    record.problemIndex,
                    primaryMapping.sheetId,
                    record.verdict,
                    record.timeMs,
                    record.memoryKb,
                    record.language,
                    cfHandle,
                    primaryMapping.urlType,
                    primaryMapping.groupId,
                    record.submittedAt,
                    null,
                );
            });

            const result = await client.query(`
                INSERT INTO submissions (
                    user_id, source, cf_submission_id, contest_id, problem_index, sheet_id,
                    verdict, time_ms, memory_kb, language, cf_handle, url_type, group_id,
                    submitted_at, details
                ) VALUES ${placeholders.join(', ')}
                ON CONFLICT (cf_submission_id) DO UPDATE SET
                    verdict = EXCLUDED.verdict,
                    time_ms = EXCLUDED.time_ms,
                    memory_kb = EXCLUDED.memory_kb,
                    language = EXCLUDED.language,
                    cf_handle = COALESCE(EXCLUDED.cf_handle, submissions.cf_handle),
                    submitted_at = COALESCE(EXCLUDED.submitted_at, submissions.submitted_at),
                    details = COALESCE(EXCLUDED.details, submissions.details)
                WHERE submissions.user_id = EXCLUDED.user_id
                  AND (
                    submissions.verdict IS DISTINCT FROM EXCLUDED.verdict OR
                    submissions.time_ms IS DISTINCT FROM EXCLUDED.time_ms OR
                    submissions.memory_kb IS DISTINCT FROM EXCLUDED.memory_kb OR
                    submissions.language IS DISTINCT FROM EXCLUDED.language OR
                    (EXCLUDED.cf_handle IS NOT NULL AND submissions.cf_handle IS DISTINCT FROM EXCLUDED.cf_handle) OR
                    (EXCLUDED.submitted_at IS NOT NULL AND submissions.submitted_at IS DISTINCT FROM EXCLUDED.submitted_at)
                  )
                RETURNING id, cf_submission_id, (xmax = 0) AS inserted
            `, values);

            for (const row of result.rows) {
                localIds.set(Number(row.cf_submission_id), Number(row.id));
                if (row.inserted) newlyInserted++;
            }

            // RETURNING is empty when the idempotent conflict WHERE clause
            // decides no update is needed. Read those existing local IDs so
            // progress can still be reconciled on every run.
            const missingIds = chunk.map(record => record.cfId).filter(cfId => !localIds.has(cfId));
            if (missingIds.length) {
                const existing = await client.query(
                    `SELECT id, cf_submission_id FROM submissions WHERE user_id = $1 AND cf_submission_id = ANY($2::bigint[])`,
                    [userId, missingIds]
                );
                for (const row of existing.rows) localIds.set(Number(row.cf_submission_id), Number(row.id));
            }
        }

        // A conflicting row owned by another user is intentionally ignored.
        // Never create progress for a submission we could not safely own.
        const usableRecords = records.filter(record => localIds.has(record.cfId));
        const progressByKey = new Map<string, {
            userId: number | string;
            problemId: string;
            sheetId: string;
            status: 'SOLVED' | 'ATTEMPTED';
            submissionId: number;
            solvedAt: Date | null;
            accepted: boolean;
            submittedAt: Date | null;
        }>();

        for (const record of usableRecords) {
            const accepted = isAccepted(record.verdict);
            for (const mapping of record.mappings) {
                // user_progress is unique by (user_id, problem_id). A few
                // legacy sheets point at the same contest/problem, so dedupe
                // by the canonical tracking ID rather than sheet ID.
                const key = mapping.problemId;
                const candidate = {
                    userId,
                    problemId: mapping.problemId,
                    sheetId: mapping.sheetId,
                    status: accepted ? 'SOLVED' as const : 'ATTEMPTED' as const,
                    submissionId: localIds.get(record.cfId)!,
                    solvedAt: accepted ? (record.submittedAt || new Date()) : null,
                    accepted,
                    submittedAt: record.submittedAt,
                };
                const previous = progressByKey.get(key);
                if (!previous || (accepted && !previous.accepted) ||
                    (accepted === previous.accepted && compareDates(record.submittedAt, previous.submittedAt, accepted))) {
                    progressByKey.set(key, candidate);
                }
            }
        }

        const progressRows = Array.from(progressByKey.values());
        const prior = new Map<string, string>();
        if (progressRows.length) {
            // The curriculum is small (currently ~150 problems), so fetching
            // this user's progress once is cheaper and safer than constructing
            // a dynamic composite-key predicate (and handles NULL sheet IDs).
            const existing = await client.query(
                `SELECT sheet_id, problem_id, status FROM user_progress WHERE user_id = $1 FOR UPDATE`,
                [userId]
            );
            for (const row of existing.rows) prior.set(String(row.problem_id), row.status);
        }

        let newlySolved = 0;
        for (let start = 0; start < progressRows.length; start += chunkSize) {
            const chunk = progressRows.slice(start, start + chunkSize);
            const values: unknown[] = [];
            const placeholders: string[] = [];
            chunk.forEach((row, offset) => {
                const p = offset * 6;
                placeholders.push(`($${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5}, $${p + 6})`);
                values.push(row.userId, row.problemId, row.sheetId, row.status, row.submissionId, row.solvedAt);
                if (row.accepted && prior.get(row.problemId) !== 'SOLVED') newlySolved++;
            });

            await client.query(`
                INSERT INTO user_progress (user_id, problem_id, sheet_id, status, submission_id, solved_at)
                VALUES ${placeholders.join(', ')}
                ON CONFLICT (user_id, problem_id) DO UPDATE SET
                    status = CASE WHEN user_progress.status = 'SOLVED' THEN 'SOLVED' ELSE EXCLUDED.status END,
                    sheet_id = COALESCE(user_progress.sheet_id, EXCLUDED.sheet_id),
                    submission_id = CASE WHEN user_progress.status = 'SOLVED' THEN user_progress.submission_id ELSE EXCLUDED.submission_id END,
                    solved_at = CASE
                        WHEN user_progress.status = 'SOLVED' THEN user_progress.solved_at
                        WHEN EXCLUDED.status = 'SOLVED' THEN EXCLUDED.solved_at
                        ELSE user_progress.solved_at
                    END
            `, values);
        }

        return {
            acceptedProblems: progressRows.filter(row => row.accepted).length,
            attemptedProblems: progressRows.filter(row => !row.accepted).length,
            matchingSubmissions: records.length,
            newlyInserted,
            newlySolved,
            skipped,
        };
    });
}

function compareDates(a: Date | null, b: Date | null, accepted: boolean) {
    if (!a || !b) return accepted ? Boolean(a && !b) : Boolean(a);
    return accepted ? a.getTime() < b.getTime() : a.getTime() > b.getTime();
}
