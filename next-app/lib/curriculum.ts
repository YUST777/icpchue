import { CFProblemData } from '@/components/mirror/types';

// Level 0 Sheets - Newcomers Training (A-J)
export interface Problem {
    id: string;         // A, B, C, etc.
    title: string;
    contestId: string;  // Codeforces contest ID
}

export interface Sheet {
    id: string;          // sheet-a, sheet-b, etc.
    name: string;        // Sheet A, Sheet B, etc.
    title: string;       // Data Types & Conditions
    description: string;
    contestId: string;   // Codeforces contest ID (e.g., 219158)
    groupId: string;     // Codeforces group (e.g., MWSDmqGsZm)
    problems: string[];  // ['A', 'B', 'C', ..., 'Z']
}

export interface Level {
    id: string;          // level0, level1, level2
    slug: string;        // level-0, level-1, level-2
    name: string;        // Level 0, Level 1, Level 2
    title: string;       // Newcomers Training
    description: string;
    duration: string;    // 6 weeks
    image: string;       // /images/lessons/levels/0.webp
    totalProblems: number;
    sheets: Sheet[];
}

// Problem letters helper
const PROBLEM_LETTERS_26 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const PROBLEM_LETTERS_15 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];

export const curriculum: Level[] = [
    {
        id: 'level0',
        slug: 'level-0',
        name: 'Level 0',
        title: 'Newcomers Training',
        description: 'Start here if you\'re new to programming. Learn C++ basics, problem solving fundamentals, and build your foundation.',
        duration: '6 weeks',
        image: '/images/lessons/levels/0.webp',
        totalProblems: 249,
        sheets: [
            {
                id: 'sheet-a',
                name: 'Sheet A',
                title: 'Data Types & Conditions',
                description: 'Learn how to store data in variables, work with different data types, and make decisions using if-else statements.',
                contestId: '219158',
                groupId: 'MWSDmqGsZm',
                problems: PROBLEM_LETTERS_26
            },
            {
                id: 'sheet-b',
                name: 'Sheet B',
                title: 'Loops',
                description: 'Master the art of repetition! Learn how to execute code multiple times using different loop structures.',
                contestId: '219432',
                groupId: 'MWSDmqGsZm',
                problems: PROBLEM_LETTERS_26
            },
            {
                id: 'sheet-c',
                name: 'Sheet C',
                title: 'Arrays',
                description: 'Store and manipulate collections of data efficiently using arrays.',
                contestId: '219774',
                groupId: 'MWSDmqGsZm',
                problems: PROBLEM_LETTERS_26
            },
            {
                id: 'sheet-d',
                name: 'Sheet D',
                title: 'Strings',
                description: 'Work with text data - one of the most common data types in programming.',
                contestId: '219856',
                groupId: 'MWSDmqGsZm',
                problems: PROBLEM_LETTERS_26
            },
            {
                id: 'sheet-e',
                name: 'Sheet E',
                title: 'Functions',
                description: 'Write reusable, organized, and modular code using functions.',
                contestId: '223205',
                groupId: 'MWSDmqGsZm',
                problems: PROBLEM_LETTERS_15
            },
            {
                id: 'sheet-f',
                name: 'Sheet F',
                title: 'Math & Geometry',
                description: 'Essential mathematics and geometry for competitive programming.',
                contestId: '223338',
                groupId: 'MWSDmqGsZm',
                problems: PROBLEM_LETTERS_26
            },
            {
                id: 'sheet-g',
                name: 'Sheet G',
                title: 'Recursion',
                description: 'Learn the powerful technique of solving problems by breaking them into smaller subproblems.',
                contestId: '223339',
                groupId: 'MWSDmqGsZm',
                problems: PROBLEM_LETTERS_26
            },
            {
                id: 'sheet-h',
                name: 'Sheet H',
                title: 'General Easy',
                description: 'Practice with 800-1000 rated Codeforces problems.',
                contestId: '223206',
                groupId: 'MWSDmqGsZm',
                problems: PROBLEM_LETTERS_26
            },
            {
                id: 'sheet-i',
                name: 'Sheet I',
                title: 'General Medium',
                description: 'Practice with 1000-1200 rated Codeforces problems.',
                contestId: '223207',
                groupId: 'MWSDmqGsZm',
                problems: PROBLEM_LETTERS_26
            },
            {
                id: 'sheet-j',
                name: 'Sheet J',
                title: 'General Hard',
                description: 'Practice with 1200-1400 rated Codeforces problems.',
                contestId: '223340',
                groupId: 'MWSDmqGsZm',
                problems: PROBLEM_LETTERS_26
            }
        ]
    },
    {
        id: 'level1',
        slug: 'level-1',
        name: 'Level 1',
        title: 'Intermediate Training',
        description: 'Master STL, algorithms, and intermediate data structures. Build the skills needed for competitive contests.',
        duration: '8 weeks',
        image: '/images/lessons/levels/1.webp',
        totalProblems: 226,
        sheets: [
            {
                id: 'sheet-a',
                name: 'Sheet A',
                title: 'Time Complexity & Vectors',
                description: 'Learn algorithm efficiency, vectors, prefix sum, and frequency arrays.',
                contestId: '372026',
                groupId: '3nQaj5GMG5',
                problems: PROBLEM_LETTERS_26
            },
            {
                id: 'sheet-b',
                name: 'Sheet B',
                title: 'STL Containers',
                description: 'Master Pair, Tuple, Vector, Set, Map, and unordered containers.',
                contestId: '373244',
                groupId: '3nQaj5GMG5',
                problems: PROBLEM_LETTERS_26
            },
            {
                id: 'sheet-c',
                name: 'Sheet C',
                title: 'STL & Sorting',
                description: 'Stack, Queue, Priority Queue, Deque, and custom comparators.',
                contestId: '374321',
                groupId: '3nQaj5GMG5',
                problems: PROBLEM_LETTERS_26
            },
            {
                id: 'sheet-d',
                name: 'Sheet D',
                title: 'Binary Search & Two Pointers',
                description: 'The most important algorithm in competitive programming!',
                contestId: '376466',
                groupId: '3nQaj5GMG5',
                problems: PROBLEM_LETTERS_26
            },
            {
                id: 'sheet-e',
                name: 'Sheet E',
                title: 'Bitmask',
                description: 'Unlock the power of bit manipulation!',
                contestId: '377898',
                groupId: '3nQaj5GMG5',
                problems: PROBLEM_LETTERS_26
            },
            {
                id: 'sheet-f',
                name: 'Sheet F',
                title: 'Number Theory Basics',
                description: 'Essential mathematics for competitive programming.',
                contestId: '219158', // Placeholder, need to verify if this ID is correct from previous scraping or use generic
                groupId: '3nQaj5GMG5',
                problems: PROBLEM_LETTERS_26
            },
            {
                id: 'sheet-g',
                name: 'Sheet G',
                title: 'Prefix Sum & Frequency Array',
                description: 'Essential techniques for range queries and counting.',
                contestId: '219158', // Placeholder
                groupId: '3nQaj5GMG5',
                problems: PROBLEM_LETTERS_26
            },
            {
                id: 'sheet-h',
                name: 'Sheet H',
                title: 'Two Pointers & Sliding Window',
                description: 'Elegant O(n) solutions for array problems.',
                contestId: '219158', // Placeholder
                groupId: '3nQaj5GMG5',
                problems: PROBLEM_LETTERS_26
            }
        ]
    },
    {
        id: 'level2',
        slug: 'level-2',
        name: 'Level 2',
        title: 'Advanced Training',
        description: 'Graphs, Dynamic Programming, and advanced problem-solving techniques.',
        duration: '10 weeks',
        image: '/images/lessons/levels/2.webp',
        totalProblems: 171,
        sheets: []  // Fetched dynamically from database in practice
    }
];


// Helper functions
export function getLevel(levelId: string): Level | undefined {
    return curriculum.find(l => l.id === levelId || l.slug === levelId);
}

export function getSheet(levelId: string, sheetId: string): Sheet | undefined {
    const level = getLevel(levelId);
    return level?.sheets.find(s => s.id === sheetId);
}

export function getProblemUrl(sheet: Sheet, problemId: string): string {
    return `https://codeforces.com/group/${sheet.groupId}/contest/${sheet.contestId}/problem/${problemId}`;
}

// Problem data cache (for use after mirror scraping)
export const problemDataCache: Map<string, CFProblemData> = new Map();
