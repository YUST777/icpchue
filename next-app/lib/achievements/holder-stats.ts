export interface HolderStats { total: number; counts: Record<string, number> }

const KEY = 'icpchue:holder-stats';
const TTL_MS = 10 * 60 * 1000;

let inflight: Promise<HolderStats | null> | null = null;
let memory: { at: number; data: HolderStats } | null = null;

function readStored(): { at: number; data: HolderStats } | null {
    try {
        const raw = sessionStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

/** Instant answer from memory or session storage, or null if nothing fresh is saved. */
export function cachedHolderStats(): HolderStats | null {
    const hit = memory ?? readStored();
    if (!hit || Date.now() - hit.at > TTL_MS) return null;
    memory = hit;
    return hit.data;
}

/** Fetches once per 10 minutes; call early (page load) so the card opens with data. */
export function loadHolderStats(): Promise<HolderStats | null> {
    const fresh = cachedHolderStats();
    if (fresh) return Promise.resolve(fresh);
    inflight ??= fetch('/api/achievements/stats', { credentials: 'include' })
        .then(r => (r.ok ? r.json() : null))
        .then((data: HolderStats | null) => {
            if (data) {
                memory = { at: Date.now(), data };
                try { sessionStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* ignore */ }
            }
            return data;
        })
        .catch(() => null)
        .finally(() => { inflight = null; });
    return inflight;
}
