export function mapLanguageToExtension(lang: string): string {
    const map: Record<string, string> = {
        'cpp': 'cpp20',
        'python': 'python3',
        'javascript': 'node',
        'csharp': 'csharp',
        'java': 'java',
        'kotlin': 'kotlin',
        'go': 'go',
        'rust': 'rust'
    };
    return map[lang] || lang;
}

export function getSubmitUrl(contestId: string, problemId: string, urlType: string, groupId?: string): string {
    const safeContestId = Array.isArray(contestId) ? contestId[0] : contestId;
    const safeProblemId = Array.isArray(problemId) ? problemId[0] : problemId;

    if (urlType === 'gym') {
        return `https://codeforces.com/gym/${safeContestId}/submit?problemIndex=${safeProblemId}`;
    } else if (urlType === 'group' && groupId) {
        return `https://codeforces.com/group/${groupId}/contest/${safeContestId}/submit?problemIndex=${safeProblemId}`;
    }
    return `https://codeforces.com/contest/${safeContestId}/submit?problemIndex=${safeProblemId}`;
}

export function mapVerdict(v: string | null): string {
    if (!v) return 'In queue';
    const raw = String(v).trim();
    const normalized = raw.toUpperCase().replace(/[\s-]+/g, '_');
    const map: Record<string, string> = {
        'OK': 'Accepted',
        'WRONG_ANSWER': 'Wrong Answer',
        'TIME_LIMIT_EXCEEDED': 'Time Limit Exceeded',
        'MEMORY_LIMIT_EXCEEDED': 'Memory Limit Exceeded',
        'RUNTIME_ERROR': 'Runtime Error',
        'COMPILATION_ERROR': 'Compilation Error',
        'TESTING': 'Testing',
        'CHALLENGED': 'Challenged',
        'SKIPPED': 'Skipped',
        'PARTIAL': 'Partial'
    };
    if (map[normalized]) return map[normalized];

    // The Codeforces HTML table appends details such as "on test 1". Keep
    // the UI/database verdict buckets stable while retaining the full row in
    // the synced history for mentors.
    if (normalized.includes('WRONG_ANSWER')) return 'Wrong Answer';
    if (normalized.includes('TIME_LIMIT_EXCEEDED')) return 'Time Limit Exceeded';
    if (normalized.includes('MEMORY_LIMIT_EXCEEDED')) return 'Memory Limit Exceeded';
    if (normalized.includes('RUNTIME_ERROR')) return 'Runtime Error';
    if (normalized.includes('COMPILATION_ERROR')) return 'Compilation Error';
    if (normalized === 'ACCEPTED') return 'Accepted';
    return raw;
}

export function getNavigationBaseUrl(contestId: string, urlType: string, groupId?: string): string {
    const safeContestId = Array.isArray(contestId) ? contestId[0] : contestId;

    switch (urlType) {
        case 'gym':
            return `/gym/${safeContestId}/problem`;
        case 'problemset':
            return `/problemset/problem/${safeContestId}`;
        case 'group':
            if (groupId) {
                return `/group/${groupId}/contest/${safeContestId}/problem`;
            }
            return '';
        case 'acmsguru':
            return `/problemsets/acmsguru/problem/99999`;
        default:
            return `/contest/${safeContestId}/problem`;
    }
}

export function getProblemDescriptionUrl(contestId: string, problemId: string, urlType: string, groupId?: string): string {
    const safeContestId = Array.isArray(contestId) ? contestId[0] : contestId;
    const safeProblemId = Array.isArray(problemId) ? problemId[0] : problemId;

    // Use /contest/ format even if it's a group contest, as Codeforces sometimes 
    // allow public viewing via the standard URL even for group contests.
    if (urlType === 'gym') {
        return `https://codeforces.com/gym/${safeContestId}/problem/${safeProblemId}`;
    } else if (urlType === 'group' && groupId) {
        return `https://codeforces.com/group/${groupId}/contest/${safeContestId}/problem/${safeProblemId}`;
    }
    return `https://codeforces.com/contest/${safeContestId}/problem/${safeProblemId}`;
}
