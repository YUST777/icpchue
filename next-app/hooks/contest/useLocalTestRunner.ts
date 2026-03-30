import { useState, useEffect, useRef, useCallback } from 'react';
import { SubmissionResult, Example } from '@/components/mirror/types';

interface UseLocalTestRunnerParams {
    code: string;
    language: string;
    testCases: Example[];
    timeLimit?: number;
    memoryLimit?: number;
    setIsTestPanelVisible: (visible: boolean) => void;
    contestId?: string;
    problemId?: string;
}

interface UseLocalTestRunnerReturn {
    result: SubmissionResult | null;
    runTests: () => Promise<void>;
    submitting: boolean;
}

export function useLocalTestRunner({
    code,
    language,
    testCases,
    timeLimit = 2000,
    memoryLimit = 256,
    setIsTestPanelVisible,
    contestId,
    problemId
}: UseLocalTestRunnerParams): UseLocalTestRunnerReturn {
    const [result, setResult] = useState<SubmissionResult | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Refs for values used inside runTests to keep the callback stable
    const codeRef = useRef(code);
    const languageRef = useRef(language);
    const testCasesRef = useRef(testCases);
    const timeLimitRef = useRef(timeLimit);
    const memoryLimitRef = useRef(memoryLimit);
    codeRef.current = code;
    languageRef.current = language;
    testCasesRef.current = testCases;
    timeLimitRef.current = timeLimit;
    memoryLimitRef.current = memoryLimit;

    // Clear result when problem changes
    useEffect(() => {
        setResult(null);
    }, [contestId, problemId]);

    const runTests = useCallback(async () => {
        const currentCode = codeRef.current;
        const currentTestCases = testCasesRef.current;
        if (!currentCode.trim() || submitting || currentTestCases.length === 0) return;

        setSubmitting(true);
        setIsTestPanelVisible(true);

        try {
            const response = await fetch('/api/judge/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceCode: currentCode,
                    language: languageRef.current,
                    testCases: currentTestCases.map(tc => ({
                        input: tc.input,
                        output: tc.output || tc.expectedOutput || ''
                    })),
                    timeLimit: timeLimitRef.current,
                    memoryLimit: memoryLimitRef.current
                })
            });

            if (!response.ok) {
                const err = await response.json();
                setResult({
                    verdict: 'Error',
                    passed: false,
                    testsPassed: 0,
                    totalTests: currentTestCases.length,
                    results: [{
                        testCase: 1,
                        verdict: err.error || 'Judge Error',
                        passed: false,
                        output: err.details || 'Failed to run tests. Please try again.'
                    }]
                });
                return;
            }

            const data = await response.json();
            setResult({
                verdict: data.verdict,
                passed: data.passed,
                testsPassed: data.testsPassed,
                totalTests: data.totalTests,
                time: data.time,
                results: data.results
            });
        } catch (err) {
            console.error('Test execution error:', err);
            setResult({
                verdict: 'Network Error',
                passed: false,
                testsPassed: 0,
                totalTests: currentTestCases.length,
                results: [{
                    testCase: 1,
                    verdict: 'Network Error',
                    passed: false,
                    output: 'Failed to connect to judge. Check your internet connection.'
                }]
            });
        } finally {
            setSubmitting(false);
        }
    }, [submitting, setIsTestPanelVisible]);

    return {
        result,
        runTests,
        submitting
    };
}
