import { NextResponse } from 'next/server';

export const revalidate = 300; // Cache on edge/server for 5 minutes

export async function GET() {
    try {
        const res = await fetch('https://api.github.com/repos/YUST777/icpchue', {
            headers: {
                'User-Agent': 'icpchue-app',
                'Accept': 'application/vnd.github.v3+json',
            },
            next: { revalidate: 300 },
        });

        if (!res.ok) {
            return NextResponse.json({ stars: 5 }, {
                headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
            });
        }

        const data = await res.json();
        const stars = typeof data.stargazers_count === 'number' ? data.stargazers_count : 5;

        return NextResponse.json({ stars }, {
            headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
        });
    } catch {
        return NextResponse.json({ stars: 5 }, {
            headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
        });
    }
}
