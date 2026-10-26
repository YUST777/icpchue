// Public build: the integrity checks live in a private repo (see scripts/overlay-private.mjs).
export async function integrityVerdicts(): Promise<Map<number, 'likely' | 'suspicious'>> {
    return new Map();
}
