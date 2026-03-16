// DevLog search utility with text indexing and similarity matching
import { devLogs, LogEntry } from './devlog';

interface SearchResult {
    entry: LogEntry;
    score: number;
    matchedFields: string[];
}

/**
 * Normalize text for searching (lowercase, remove special chars)
 */
function normalizeText(text: string): string {
    return text.toLowerCase().trim();
}

/**
 * Calculate similarity score between query and text
 * Uses simple word matching and substring matching
 */
function calculateSimilarity(query: string, text: string): number {
    const normalizedQuery = normalizeText(query);
    const normalizedText = normalizeText(text);

    let score = 0;

    // Exact match (highest score)
    if (normalizedText.includes(normalizedQuery)) {
        score += 100;
    }

    // Word-by-word matching
    const queryWords = normalizedQuery.split(/\s+/);
    const textWords = normalizedText.split(/\s+/);

    queryWords.forEach(queryWord => {
        if (queryWord.length < 2) return; // Skip very short words

        textWords.forEach(textWord => {
            // Exact word match
            if (textWord === queryWord) {
                score += 50;
            }
            // Partial word match
            else if (textWord.includes(queryWord) || queryWord.includes(textWord)) {
                score += 25;
            }
        });
    });

    return score;
}

/**
 * Search through DevLog entries
 * @param query - Search query string
 * @returns Array of search results sorted by relevance
 */
export function searchDevLogs(query: string): SearchResult[] {
    if (!query || query.trim().length === 0) {
        return [];
    }

    const results: SearchResult[] = [];

    devLogs.forEach(entry => {
        let totalScore = 0;
        const matchedFields: string[] = [];

        // Search in title (highest weight)
        const titleScore = calculateSimilarity(query, entry.title);
        if (titleScore > 0) {
            totalScore += titleScore * 3;
            matchedFields.push('title');
        }

        // Search in subtitle
        const subtitleScore = calculateSimilarity(query, entry.subtitle);
        if (subtitleScore > 0) {
            totalScore += subtitleScore * 2;
            matchedFields.push('subtitle');
        }

        // Search in description
        const descriptionScore = calculateSimilarity(query, entry.description);
        if (descriptionScore > 0) {
            totalScore += descriptionScore * 1.5;
            matchedFields.push('description');
        }

        // Search in content (if available)
        if (entry.content) {
            const contentScore = calculateSimilarity(query, entry.content);
            if (contentScore > 0) {
                totalScore += contentScore;
                matchedFields.push('content');
            }
        }

        // Search in version
        const versionScore = calculateSimilarity(query, entry.version_short);
        if (versionScore > 0) {
            totalScore += versionScore * 2;
            matchedFields.push('version');
        }

        // Search in date (year, month)
        const dateStr = new Date(entry.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const dateScore = calculateSimilarity(query, dateStr);
        if (dateScore > 0) {
            totalScore += dateScore * 1.5;
            matchedFields.push('date');
        }

        // Search in highlights
        if (entry.highlights) {
            entry.highlights.forEach(highlight => {
                const highlightScore = calculateSimilarity(query, highlight);
                if (highlightScore > 0) {
                    totalScore += highlightScore * 0.5;
                    if (!matchedFields.includes('highlights')) {
                        matchedFields.push('highlights');
                    }
                }
            });
        }

        // Only include results with a minimum score
        if (totalScore > 0) {
            results.push({
                entry,
                score: totalScore,
                matchedFields
            });
        }
    });

    // Sort by score (highest first)
    return results.sort((a, b) => b.score - a.score);
}

/**
 * Get all unique years from DevLog entries
 */
export function getDevLogYears(): number[] {
    const years = new Set<number>();
    devLogs.forEach(entry => {
        const year = new Date(entry.date).getFullYear();
        years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
}

/**
 * Filter DevLog entries by year
 */
export function filterDevLogsByYear(year: number): LogEntry[] {
    return devLogs.filter(entry => {
        const entryYear = new Date(entry.date).getFullYear();
        return entryYear === year;
    });
}
