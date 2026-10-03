import { query } from '@/lib/db/db';

/**
 * Persists errors and warnings to public.app_error_logs (Supabase Postgres)
 * so they outlive Vercel's short log retention. Never throws, never logs
 * through console (that would recurse through the console hook).
 */

export type ErrorLogEntry = {
    level: 'error' | 'warn';
    source: 'server' | 'request' | 'client';
    message: string;
    stack?: string | null;
    path?: string | null;
    method?: string | null;
    route?: string | null;
    digest?: string | null;
    userId?: number | null;
    context?: Record<string, unknown>;
};

const MAX_MESSAGE = 4000;
const MAX_STACK = 8000;
const MAX_CONTEXT = 8000;
const DEDUPE_WINDOW_MS = 10_000;
const RETENTION_CLEANUP_PROBABILITY = 0.005;

// Same message from the same place within a few seconds is one incident.
const recent = new Map<string, number>();

// Strip credentials before anything is stored.
const REDACTIONS: Array<[RegExp, string]> = [
    [/(eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})/g, '[jwt]'],
    [/\b(sb_(?:secret|publishable)_[A-Za-z0-9_-]+)/g, '[supabase-key]'],
    [/\b(re_[A-Za-z0-9_]{16,})/g, '[api-key]'],
    [/(bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[token]'],
    [/((?:password|passwd|secret|token|token_hash|access_token|refresh_token|apikey|api_key|authorization|cookie)["']?\s*[:=]\s*["']?)[^"'\s,&}]+/gi, '$1[redacted]'],
    [/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, '$1[redacted]@'],
];

export function redact(value: string): string {
    let out = value;
    for (const [re, rep] of REDACTIONS) out = out.replace(re, rep);
    return out;
}

const clip = (value: string | null | undefined, max: number) =>
    value ? redact(value).slice(0, max) : null;

export function describeError(value: unknown): { message: string; stack: string | null } {
    if (value instanceof Error) {
        const cause = value.cause instanceof Error ? `\nCaused by: ${value.cause.stack || value.cause.message}` : '';
        return { message: `${value.name}: ${value.message}`, stack: (value.stack || '') + cause || null };
    }
    if (typeof value === 'string') return { message: value, stack: null };
    try {
        return { message: JSON.stringify(value), stack: null };
    } catch {
        return { message: String(value), stack: null };
    }
}

export async function recordError(entry: ErrorLogEntry): Promise<void> {
    try {
        if (process.env.NEXT_RUNTIME === 'edge') return;
        if (!process.env.DATABASE_URL) return;

        const message = clip(entry.message, MAX_MESSAGE) || '(no message)';
        const key = `${entry.source}|${entry.path || ''}|${message.slice(0, 300)}`;
        const now = Date.now();
        const last = recent.get(key);
        if (last && now - last < DEDUPE_WINDOW_MS) return;
        recent.set(key, now);
        if (recent.size > 1000) {
            for (const [k, t] of recent) if (now - t > DEDUPE_WINDOW_MS) recent.delete(k);
        }

        let context = '{}';
        if (entry.context) {
            context = redact(JSON.stringify(entry.context));
            if (context.length > MAX_CONTEXT) context = JSON.stringify({ truncated: context.slice(0, MAX_CONTEXT) });
        }

        await query(
            `INSERT INTO public.app_error_logs
                (level, source, message, stack, path, method, route, digest, user_id, deployment, context)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
            [
                entry.level,
                entry.source,
                message,
                clip(entry.stack, MAX_STACK),
                clip(entry.path, 1000),
                entry.method?.slice(0, 10) || null,
                clip(entry.route, 300),
                entry.digest?.slice(0, 100) || null,
                Number.isInteger(entry.userId) ? entry.userId : null,
                process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
                context,
            ]
        );

        if (Math.random() < RETENTION_CLEANUP_PROBABILITY) {
            query("DELETE FROM public.app_error_logs WHERE created_at < now() - interval '30 days'").catch(() => {});
        }
    } catch {
        // Logging must never break the request that is already failing.
    }
}
