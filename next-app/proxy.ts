import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.webp|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.glb|.*\\.mp4|.*\\.webm).*)'],
};
