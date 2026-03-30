import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { curriculum } from '@/lib/content/curriculum';
import { verifyAuth } from '@/lib/auth/auth';
import { getCachedData } from '@/lib/cache/cache';

export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        const userId = user?.id ?? -1;

        const cacheKey = `user:${userId}:roadmap`;
        const data = await getCachedData(cacheKey, 300, async () => {
            // Single query: all sheets + per-sheet solved count via LEFT JOIN
            const dbResult = await query(`
                SELECT 
                    s.id,
                    s.sheet_letter,
                    s.sheet_number,
                    s.name,
                    s.slug,
                    s.description AS db_description,
                    s.total_problems,
                    l.level_number,
                    l.slug AS level_slug,
                    COUNT(DISTINCT CASE WHEN up.status = 'SOLVED' THEN p.id END) AS solved_count
                FROM curriculum_sheets s
                JOIN curriculum_levels l ON s.level_id = l.id
                LEFT JOIN curriculum_problems p ON p.sheet_id = s.id
                LEFT JOIN user_progress up 
                    ON up.problem_id = (s.contest_id || ':' || p.problem_letter)
                    AND up.user_id = $1
                GROUP BY s.id, s.sheet_letter, s.sheet_number, s.name, s.slug,
                         s.description, s.total_problems, l.level_number, l.slug
                ORDER BY l.level_number ASC, s.sheet_number ASC
            `, [userId]);

            // Build roadmap structure
            const roadmap: any[] = [
                {
                    levelNumber: 0,
                    title: 'Newcomers Training',
                    description: 'Start here if you\'re new to programming. Learn C++ basics, problem solving fundamentals, and build your foundation.',
                    weeks: [] as any[]
                },
                {
                    levelNumber: 1,
                    title: 'Intermediate Training',
                    description: 'Master STL, algorithms, and intermediate data structures. Build the skills needed for competitive contests.',
                    weeks: [] as any[]
                },
                {
                    levelNumber: 2,
                    title: 'Advanced Training',
                    description: 'Graphs, Dynamic Programming, and advanced problem-solving techniques.',
                    weeks: [] as any[]
                }
            ];

            dbResult.rows.forEach((row: any) => {
                const levelIndex = row.level_number;
                if (levelIndex >= 0 && levelIndex < roadmap.length) {
                    if (!roadmap[levelIndex].image) {
                        const levelData = curriculum.find(l => l.slug === row.level_slug);
                        roadmap[levelIndex].image = levelData?.image || '';
                    }

                    let title = row.name;
                    let description = row.db_description;

                    if (levelIndex < 2) {
                        const levelData = curriculum.find(l => l.id === `level${levelIndex}`);
                        if (levelData) {
                            const staticSheet = levelData.sheets.find(s => s.id === row.slug || s.name === row.name);
                            if (staticSheet) {
                                title = staticSheet.title;
                                description = staticSheet.description;
                            }
                        }
                    }

                    let weekNum = row.sheet_number;
                    if (levelIndex === 0) {
                        if (row.sheet_number <= 5) {
                            weekNum = row.sheet_number;
                        } else if (row.sheet_number === 6 || row.sheet_number === 7) {
                            weekNum = 6;
                        } else {
                            weekNum = row.sheet_number;
                        }
                    }

                    roadmap[levelIndex].weeks.push({
                        id: row.id,
                        slug: row.slug,
                        name: row.name,
                        title: title,
                        description: description,
                        problemCount: row.total_problems,
                        solvedCount: parseInt(row.solved_count) || 0,
                        levelSlug: row.level_slug,
                        sheetNumber: row.sheet_number,
                        weekNumber: weekNum
                    });
                }
            });

            return { roadmap };
        });

        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch roadmap', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
