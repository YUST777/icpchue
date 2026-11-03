/** Everything assigned so far in Level 0. Add one entry when a session gives new problems. */
export const ASSIGNMENT_LEVEL = 'level-0';

/** Accounts created on or after this date are "new": they get the later catch-up deadlines. */
export const NEW_MEMBER_FROM = '2026-10-25';

const range = (from: string, to: string) =>
    Array.from({ length: to.charCodeAt(0) - from.charCodeAt(0) + 1 }, (_, i) => String.fromCharCode(from.charCodeAt(0) + i));

export interface Assignment {
    sheet: string;
    label: string;
    name: string;
    letters: string[];
    due: { old: string; new: string };
}

export const ASSIGNMENTS: Assignment[] = [
    { sheet: 'sheet-a', label: 'Sheet A', name: 'Data Types & Conditions', letters: range('A', 'Z'), due: { old: '2026-11-15', new: '2026-11-21' } },
    { sheet: 'sheet-b', label: 'Sheet B', name: 'Loops', letters: range('A', 'P'), due: { old: '2026-11-15', new: '2026-11-21' } },
    { sheet: 'sheet-c', label: 'Sheet C', name: 'Arrays', letters: [...range('A', 'H'), 'T', 'V'], due: { old: '2026-11-15', new: '2026-11-15' } },
];
