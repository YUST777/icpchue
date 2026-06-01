import { useState, useEffect, useRef, useCallback } from 'react';
import { SubmissionResult, Example } from '@/components/mirror/types';

interface UseLocalTestRunnerParams {
    code: string;
    language: string;
    testCases: Example[];
    timeLimit?: number;
    memoryLimit?: number;
    setIsTestPanelVisible: (visible: boolean) => void;
    setTestPanelActiveTab?: (tab: 'testcase' | 'result' | 'codeforces') => void;
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
    setTestPanelActiveTab,
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
        if (setTestPanelActiveTab) setTestPanelActiveTab('result');

        // Bypassing Judge0 for Vercel Serverless environment
        setTimeout(() => {
            setResult({
                verdict: 'Offline',
                passed: false,
                testsPassed: 0,
                totalTests: currentTestCases.length,
                results: [{
                    testCase: 1,
                    verdict: 'Local Testing Disabled',
                    passed: false,
                    output: 'Local test execution is disabled in the serverless environment. Please click the Submit button to solve, test, and submit directly on Codeforces!'
                }]
            });
            setSubmitting(false);
        }, 500);
    }, [submitting, setIsTestPanelVisible, setTestPanelActiveTab]);

    return {
        result,
        runTests,
        submitting
    };
}
