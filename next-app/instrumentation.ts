import type { Instrumentation } from 'next';

/**
 * Persist server-side problems to Supabase (public.app_error_logs):
 * - every console.error / console.warn from our routes and libraries
 * - every uncaught error Next.js captures (route handlers, rendering, actions)
 */

let consoleHooked = false;

export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs' || consoleHooked) return;
    consoleHooked = true;

    const { recordError, describeError } = await import('./lib/observability/error-log');

    // Run the insert after the response when inside a request; otherwise
    // fire-and-forget (Vercel Fluid compute keeps the instance alive).
    const schedule = async (task: () => Promise<void>) => {
        try {
            const { after } = await import('next/server');
            after(task);
        } catch {
            void task();
        }
    };

    const hook = (level: 'error' | 'warn') => {
        const original = console[level].bind(console);
        console[level] = (...args: unknown[]) => {
            original(...args);
            try {
                const firstError = args.find((a) => a instanceof Error);
                const message = args
                    .map((a) => (a instanceof Error ? describeError(a).message : typeof a === 'string' ? a : describeError(a).message))
                    .join(' ');
                // Node runtime notices are platform noise, not app problems.
                if (/^\(node:\d+\) (Experimental|Deprecation)Warning/.test(message)) return;
                const stack = firstError ? describeError(firstError).stack : new Error().stack?.split('\n').slice(2, 8).join('\n') ?? null;
                void schedule(() => recordError({ level, source: 'server', message, stack }));
            } catch {
                // ignore
            }
        };
    };
    hook('error');
    hook('warn');
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;
    const { recordError, describeError } = await import('./lib/observability/error-log');
    const { message, stack } = describeError(err);
    const header = (name: string) => {
        const value = request.headers[name];
        return Array.isArray(value) ? value[0] : value;
    };
    await recordError({
        level: 'error',
        source: 'request',
        message,
        stack,
        path: request.path,
        method: request.method,
        route: `${context.routeType} ${context.routePath}`,
        digest: typeof err === 'object' && err !== null && 'digest' in err ? String((err as { digest: unknown }).digest) : null,
        context: {
            renderSource: context.renderSource,
            userAgent: header('user-agent'),
            referer: header('referer'),
        },
    });
};
