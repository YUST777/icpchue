import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getClientIp } from '@/lib/security/request';
import { verifyAuth } from '@/lib/auth/auth';
import { recordError } from '@/lib/observability/error-log';

const MAX_BODY_BYTES = 16 * 1024;
const KINDS = new Set(['error', 'unhandledrejection', 'react', 'fetch']);

const str = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : null);

/** Receives browser-side errors from ClientErrorReporter and error boundaries. */
export async function POST(req: NextRequest) {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
        return new NextResponse(null, { status: 413 });
    }

    const ip = getClientIp(req);
    const limit = await rateLimit(`client-errors:${ip}`, 40, 300);
    if (!limit.success) return new NextResponse(null, { status: 204 });

    const body = await req.json().catch(() => null);
    const message = str(body?.message, 4000);
    if (!message) return new NextResponse(null, { status: 204 });

    const kind = KINDS.has(body?.kind) ? body.kind : 'error';
    const user = await verifyAuth(req).catch(() => null);

    await recordError({
        level: kind === 'fetch' && Number(body?.status) < 500 && body?.status ? 'warn' : 'error',
        source: 'client',
        message,
        stack: str(body?.stack, 8000),
        path: str(body?.path, 1000),
        method: str(body?.method, 10),
        route: kind,
        digest: str(body?.digest, 100),
        userId: user?.id ?? null,
        context: {
            url: str(body?.url, 1000),
            status: typeof body?.status === 'number' ? body.status : undefined,
            source: str(body?.source, 500),
            line: typeof body?.line === 'number' ? body.line : undefined,
            column: typeof body?.column === 'number' ? body.column : undefined,
            userAgent: req.headers.get('user-agent')?.slice(0, 300),
            viewport: str(body?.viewport, 30),
            online: typeof body?.online === 'boolean' ? body.online : undefined,
        },
    });

    return new NextResponse(null, { status: 204 });
}
