import { useState, useEffect, useCallback } from 'react';
import { TEMPLATES } from '@/lib/utils/codeTemplates';

const DEFAULT_LANG = 'cpp';

interface UseCodePersistenceParams {
    contestId: string;
    problemId: string;
}

interface UseCodePersistenceReturn {
    code: string;
    setCode: (code: string) => void;
    language: string;
    setLanguage: (lang: string) => void;
}

export function useCodePersistence({ contestId, problemId }: UseCodePersistenceParams): UseCodePersistenceReturn {
    // Initial state (will be hydrated from storage)
    const [code, setCode] = useState(TEMPLATES[DEFAULT_LANG]);
    const [language, setLanguage] = useState(DEFAULT_LANG);
    const [isHydrated, setIsHydrated] = useState(false);

    // Helper to get safe keys based on IDs
    const getKeys = useCallback((lang: string) => {
        const safeContestId = Array.isArray(contestId) ? contestId[0] : contestId;
        const safeProblemId = Array.isArray(problemId) ? problemId[0] : problemId;
        return {
            codeKey: `verdict-code-${safeContestId}-${safeProblemId}-${lang}`,
            langKey: `verdict-lang-${safeContestId}-${safeProblemId}`
        };
    }, [contestId, problemId]);

    // Hydrate state on mount
    useEffect(() => {
        if (!contestId || !problemId) return;

        const { langKey } = getKeys(DEFAULT_LANG);
        const savedLang = localStorage.getItem(langKey) || DEFAULT_LANG;
        const { codeKey } = getKeys(savedLang);
        const savedCode = localStorage.getItem(codeKey);

        setLanguage(savedLang);
        setCode(savedCode || TEMPLATES[savedLang] || '');
        setIsHydrated(true);
    }, [contestId, problemId, getKeys]);

    // Save code whenever it changes (debounced by React effect cycle, could be optimized)
    useEffect(() => {
        if (!isHydrated || !contestId || !problemId) return;

        const { codeKey } = getKeys(language);
        localStorage.setItem(codeKey, code);
    }, [code, language, contestId, problemId, isHydrated, getKeys]);

    // Save active language whenever it changes
    useEffect(() => {
        if (!isHydrated || !contestId || !problemId) return;

        const { langKey } = getKeys(language);
        localStorage.setItem(langKey, language);
    }, [language, contestId, problemId, isHydrated, getKeys]);

    // Custom setLanguage that handles code switching
    const handleSetLanguage = useCallback((newLang: string) => {
        if (newLang === language) return;

        // 1. Save current code (handled by effect, but let's ensure immediate consistency if needed)
        // Actually, the effect will run on unmount/re-render, so "current" code state is what we have.
        // But we are switching state now.
        // We need to load the *new* language's code.

        const { codeKey } = getKeys(newLang);
        const savedCode = localStorage.getItem(codeKey);

        // 2. Set new code -> stored code or template
        // 3. Set new language

        // Important: Order matters. If we set language first, the effect [code, language] might run with OLD code and NEW language?
        // No, multiple state updates in event handler are batched in React 18.
        // But to be safe against race conditions in effects:
        // The effect [code, language] has `code` and `language` as dependencies.
        // If we change both, it runs once with new values.
        // So we are safe.

        setCode(savedCode || TEMPLATES[newLang] || '');
        setLanguage(newLang);
    }, [language, getKeys]);

    return {
        code,
        setCode,
        language,
        setLanguage: handleSetLanguage
    };
}

