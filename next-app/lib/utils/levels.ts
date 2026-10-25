/** University year ("1", "Level 1", "First") as "Year 1"; the training level is separate. */
export function yearLabel(academic: string | null | undefined): string {
    const raw = String(academic || '').trim();
    const n = raw.match(/\d+/)?.[0];
    return n ? `Year ${n}` : raw || '—';
}
