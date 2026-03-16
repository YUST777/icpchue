import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';

// Add type definition for global
declare global {
    var complexityRateLimits: Map<string, number> | undefined;
}

export async function POST(request: NextRequest) {
    try {
        // Clone the request to read body after auth check
        const clonedRequest = request.clone();

        // Verify user authentication
        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 });
        }

        const body = await clonedRequest.json();
        const { sheetId, problemId } = body;

        // Rate Limiting (In-Memory)
        const RATE_LIMIT_DURATION = 10 * 1000; // 10 seconds
        const lastAnalysisTime = global.complexityRateLimits?.get(String(user.id)) || 0;
        const now = Date.now();

        if (now - lastAnalysisTime < RATE_LIMIT_DURATION) {
            const waitSeconds = Math.ceil((RATE_LIMIT_DURATION - (now - lastAnalysisTime)) / 1000);
            return NextResponse.json(
                { error: `Please wait ${waitSeconds}s before analyzing again` },
                { status: 429 }
            );
        }

        // Initialize global map if needed (to persist across hot reloads in dev)
        if (!global.complexityRateLimits) {
            global.complexityRateLimits = new Map();
        }
        global.complexityRateLimits.set(String(user.id), now);

        if (!sheetId || !problemId) {
            return NextResponse.json(
                { error: 'sheetId and problemId are required' },
                { status: 400 }
            );
        }

        // Fetch user's best accepted submission from database
        const submissionResult = await query(
            `SELECT source_code, time_ms, memory_kb 
             FROM training_submissions 
             WHERE sheet_id = $1 AND problem_id = $2 AND user_id = $3 AND verdict = 'Accepted'
             ORDER BY time_ms ASC
             LIMIT 1`,
            [sheetId, problemId, user.id]
        );

        if (submissionResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'No accepted submission found for this problem' },
                { status: 404 }
            );
        }

        const submission = submissionResult.rows[0];
        const code = submission.source_code;

        if (!code) {
            return NextResponse.json(
                { error: 'Submission code not available' },
                { status: 404 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'AI service not configured' },
                { status: 500 }
            );
        }

        const prompt = `Analyze the following C++ code and determine its time and space complexity.

Respond ONLY in this exact JSON format (no markdown, no code blocks, just raw JSON):
{
    "timeComplexity": "O(...)",
    "spaceComplexity": "O(...)",
    "explanation": "Brief explanation of why"
}

Code to analyze:
\`\`\`cpp
${code}
\`\`\``;

        // Using Gemini 2.5 Flash (stable, free model - tested and working)
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 1024,
                    }
                }),
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: 'AI analysis temporarily unavailable' },
                { status: 503 }
            );
        }

        const data = await response.json();

        // Extract the text from Gemini's response
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            return NextResponse.json(
                { error: 'No response from AI analysis' },
                { status: 500 }
            );
        }

        // Parse the JSON from the response (handle potential markdown wrapping)
        let parsedResult;
        try {
            // Try to extract JSON if wrapped in code blocks
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedResult = JSON.parse(jsonMatch[0]);
            } else {
                parsedResult = JSON.parse(textResponse);
            }
        } catch {
            // Return raw response if parsing fails
            return NextResponse.json({
                timeComplexity: 'Unknown',
                spaceComplexity: 'Unknown',
                explanation: textResponse,
                raw: true
            });
        }

        return NextResponse.json({
            timeComplexity: parsedResult.timeComplexity || 'Unknown',
            spaceComplexity: parsedResult.spaceComplexity || 'Unknown',
            explanation: parsedResult.explanation || 'No explanation provided'
        });

    } catch (error) {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
