export * from './services/codeforces';

/** Handle with stray edge punctuation (".", "-", "_") removed and lowercased, so
 *  "Omarwehba." and ".Basant_Elsayes" scraped from a page match the linked handle. */
export function normalizeCfHandle(handle: unknown): string {
    return String(handle ?? '').trim().replace(/^[._-]+|[._-]+$/g, '').toLowerCase();
}

export function sameCfHandle(a: unknown, b: unknown): boolean {
    const x = normalizeCfHandle(a);
    return x !== '' && x === normalizeCfHandle(b);
}
