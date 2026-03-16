import { curriculum } from '@/lib/curriculum';
import problemsMetadata from '@/data/problems-metadata.json';

interface ProblemInfo {
    id: string;
    title: string;
    difficulty?: string;
    tags?: string[];
    topic?: string;
}

interface SheetInfo {
    id: string;
    title: string;
    description?: string;
    totalProblems?: number;
}

// Build lookup maps for fast access
const sheetMap = new Map<string, SheetInfo>();
const problemMap = new Map<string, ProblemInfo>();

// Load from problems-metadata.json (sheet-1 style IDs)
if (problemsMetadata) {
    const meta = problemsMetadata as {
        sheetId: string;
        sheetTitle: string;
        sheetDescription?: string;
        totalProblems?: number;
        problems?: Array<{ id: string; title: string; difficulty?: string; tags?: string[]; topic?: string }>;
    };

    sheetMap.set(meta.sheetId, {
        id: meta.sheetId,
        title: meta.sheetTitle,
        description: meta.sheetDescription,
        totalProblems: meta.totalProblems,
    });

    if (meta.problems) {
        for (const p of meta.problems) {
            problemMap.set(`${meta.sheetId}:${p.id}`, {
                id: p.id,
                title: p.title,
                difficulty: p.difficulty,
                tags: p.tags,
                topic: p.topic,
            });
        }
    }
}

// Load from curriculum (sheet-a style IDs within levels)
for (const level of curriculum) {
    for (const sheet of level.sheets) {
        const sheetKey = `${level.id}:${sheet.id}`;
        // Store by both combined key and plain sheet id
        const sheetInfo: SheetInfo = {
            id: sheet.id,
            title: sheet.title,
            description: sheet.description,
        };
        sheetMap.set(sheetKey, sheetInfo);
        if (!sheetMap.has(sheet.id)) {
            sheetMap.set(sheet.id, sheetInfo);
        }

        // Store problems by letter
        for (const problemLetter of sheet.problems) {
            const key = `${sheet.id}:${problemLetter}`;
            if (!problemMap.has(key)) {
                problemMap.set(key, {
                    id: problemLetter,
                    title: `Problem ${problemLetter}`,
                });
            }
        }
    }
}

/**
 * Get a problem by sheet ID and problem ID
 */
export function getProblem(sheetId: string, problemId: string): ProblemInfo | undefined {
    return problemMap.get(`${sheetId}:${problemId}`);
}

/**
 * Get a sheet by its ID
 */
export function getSheet(sheetId: string): SheetInfo | undefined {
    return sheetMap.get(sheetId);
}
