import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/mirror/fetch
 * Proxy endpoint for Mirror Service to fetch Codeforces problem content
 * 
 * This endpoint validates that the URL is from the curriculum before calling the Mirror Service
 */
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate-limit for fetching
        const limitResult = await rateLimit(`mirror-fetch:${user.id}`, 15, 60);
        if (!limitResult.success) {
            return NextResponse.json({ error: 'Too many fetch requests. Please wait.' }, { status: 429 });
        }

        const { url } = await req.json();

        if (!url || typeof url !== 'string') {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        // Validate URL is from Codeforces group
        if (!url.includes('codeforces.com/group/MWSDmqGsZm')) {
            return NextResponse.json(
                { error: 'Only curriculum problems are allowed' },
                { status: 403 }
            );
        }

        // TODO: Call Mirror Service
        // For now, return mock data until Mirror Service is integrated
        const mockProblemContent = {
            title: 'Problem Title',
            timeLimit: 1000,
            memoryLimit: 256,
            statement: '<p>This is a placeholder. The Mirror Service will be integrated to fetch real problem content from Codeforces.</p>',
            inputFormat: '<p>Input format will be fetched from Codeforces.</p>',
            outputFormat: '<p>Output format will be fetched from Codeforces.</p>',
            examples: [
                {
                    input: '5',
                    output: '10'
                }
            ],
            notes: '<p>Notes will be fetched from Codeforces.</p>'
        };

        return NextResponse.json({
            success: true,
            problem: mockProblemContent
        }, {
            headers: {
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200'
            }
        });

        // Real implementation (uncomment when Mirror Service is ready):
        /*
        const mirrorServiceUrl = process.env.MIRROR_SERVICE_URL || 'http://localhost:3001';
        const response = await fetch(`${mirrorServiceUrl}/fetch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
            throw new Error(`Mirror Service returned ${response.status}`);
        }

        const data = await response.json();
        
        return NextResponse.json({
            success: true,
            problem: data.problem
        }, {
            headers: {
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200'
            }
        });
        */

    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch problem content' },
            { status: 500 }
        );
    }
}
