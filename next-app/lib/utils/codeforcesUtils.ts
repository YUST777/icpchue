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

/**
 * A readable message for an error code from the Verdict Helper extension.
 * Returns null for unknown codes so callers can keep their own fallback.
 */
export function extensionErrorMessage(error: unknown): string | null {
    const e = String(error || '');
    if (/context invalidated|receiving end does not exist/i.test(e)) {
        return 'Verdict Helper was just updated. Refresh this page (F5), then try again.';
    }
    if (/NOT_LOGGED_IN/.test(e)) return 'You are not logged into Codeforces. Log in on codeforces.com, then try again.';
    if (/CLOUDFLARE/.test(e)) return 'Codeforces is asking to verify you are human. Open codeforces.com in a tab, complete the check, then try again.';
    if (/COULD_NOT_OPEN_CODEFORCES_TAB|NO_CODEFORCES_TAB/.test(e)) return 'Could not reach Codeforces. Open codeforces.com in a tab, then try again.';
    if (/SUBMISSION_NOT_FOUND/.test(e)) return 'Codeforces did not find this submission on your account.';
    if (/NO_SUBMISSIONS_TABLE/.test(e)) return 'Could not read your Codeforces submissions. Make sure you joined this contest/group on Codeforces.';
    if (/TIMEOUT/.test(e)) return 'Codeforces took too long to answer. Try again in a moment.';
    return null;
}
