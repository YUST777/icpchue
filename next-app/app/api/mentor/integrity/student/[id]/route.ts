// Public build: the real endpoint lives in a private repo (see scripts/overlay-private.mjs).
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
}
