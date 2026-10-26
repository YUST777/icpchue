// Public build: the real panel lives in a private repo (see scripts/overlay-private.mjs).
export interface StudentIntegrity {
    verdict: 'likely' | 'suspicious' | 'clean';
    matches: unknown[];
    traps: unknown[];
}

export function CodeMatchesPanel(_props: {
    me: { userId: number; name: string; studentId: string; group: string | null };
    data: StudentIntegrity | null;
    loading: boolean;
}) {
    return null;
}
