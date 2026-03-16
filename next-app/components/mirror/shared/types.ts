import { z } from 'zod';

export interface Example {
    input: string;
    output: string;
    expectedOutput?: string;
    isCustom?: boolean;
}

export const customTestCaseSchema = z.object({
    input: z.string().min(1, 'Input is required').max(50000, 'Input too long (max 50KB)'),
    output: z.string().max(50000, 'Expected output too long (max 50KB)').optional().default(''),
});

export interface Problem {
    id: string;
    title: string;
    timeLimit: number;
    memoryLimit: number;
    statement: string;
    inputFormat: string;
    outputFormat: string;
    examples: Example[];
    testCases?: Example[];
    note?: string;
    codeforcesUrl?: string;
}

export interface Submission {
    id: number;
    verdict: string;
    timeMs: number;
    memoryKb: number;
    testsPassed?: number | null;
    totalTests?: number | null;
    submittedAt: string;
    attemptNumber?: number | null;
    sourceCode?: string;
    source: 'judge0' | 'codeforces';
    language?: string;
    cfSubmissionId?: number | null;
}

export interface TestCaseResult {
    testCase: number;
    verdict: string;
    passed: boolean;
    time?: string;
    memory?: string;
    output?: string;
    compileError?: string;
    runtimeError?: string;
}

export interface SubmissionResult {
    submissionId?: number;
    verdict: string;
    passed: boolean;
    testsPassed: number;
    totalTests: number;
    time?: string;
    memory?: string;
    attemptNumber?: number;
    results: TestCaseResult[];
}

export interface DistributionEntry {
    label: string;
    count: number;
    isUser?: boolean;
}

export interface AnalyticsStats {
    runtimeDistribution: DistributionEntry[];
    memoryDistribution: DistributionEntry[];
    totalSubmissions: number;
    userStats: {
        runtime: { value: number; percentile: number };
        memory: { value: number; percentile: number };
    } | null;
}

export interface ComplexityAnalysis {
    timeComplexity: string;
    spaceComplexity: string;
    explanation: string;
}

export interface CFProblemData {
    meta: {
        title: string;
        timeLimitMs: number;
        memoryLimitMB: number;
        difficulty?: number;
    };
    story: string;
    inputSpec: string;
    outputSpec: string;
    testCases: { input: string; output: string }[];
    note: string;
    tags?: string[];
    codeforcesUrl?: string;
}

export interface CFSubmissionStatus {
    status: 'idle' | 'submitting' | 'waiting' | 'testing' | 'done' | 'error';
    verdict?: string;
    testNumber?: number;
    time?: number;
    memory?: number;
    submissionId?: number;
    error?: string;
    isDuplicate?: boolean;
    compilationError?: string;
    failedTestCase?: number;
    needsCaptcha?: boolean;
    captchaUrl?: string;
}

export interface CFSubmissionTestCase {
    input: string;
    output: string;
    answer: string;
    verdict: string;
    checkerStdoutAndStderr?: string;
}

export type ComplexityResult = ComplexityAnalysis;
