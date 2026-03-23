import { useState, useEffect, useCallback, useRef } from 'react';
import { TEMPLATES } from '@/lib/utils/codeTemplates';

const DEFAULT_LANG = 'cpp';
const DB_SAVE_DEBOUNCE = 2000; // save to DB every 2s of inactivity

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
    const [code, setCode] = useState(TEMPLATES[DEFAULT_LANG]);
    const [language, setLanguage] = useState(DEFAULT_LANG);
    const [isHydrated, setIsHydrated] = useState(false);
    const dbTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedRef = useRef<string>('');
    // In-memory cache of code per language (for fast language switching within a session)
    const codeByLangRef = useRef<Record<string, string>>({});

    // Save code to DB (debounced, non-blocking)
    const saveToDb = useCallback((codeVal: string, lang: string) => {
        if (!contestId || !problemId) return;
        const key = `${contestId}:${problemId}:${lang}:${codeVal}`;
        if (key === lastSavedRef.current) return;
        lastSavedRef.current = key;

        fetch('/api/user/code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                contestId,
                problemId,
                language: lang,
                code: codeVal,
                activeLanguage: lang,
            }),
            keepalive: true,
        }).catch(() => {});
    }, [contestId, problemId]);

    // Schedule a debounced DB save
    const scheduleSave = useCallback((codeVal: string, lang: string) => {
        if (dbTimerRef.current) clearTimeout(dbTimerRef.current);
        dbTimerRef.current = setTimeout(() => saveToDb(codeVal, lang), DB_SAVE_DEBOUNCE);
    }, [saveToDb]);

    // Hydrate from DB only — no localStorage
    useEffect(() => {
        if (!contestId || !problemId) return;

        setIsHydrated(false);
        codeByLangRef.current = {};

        // Migrate: clean up old localStorage keys for this problem
        try {
            const keys = Object.keys(localStorage);
            const safeContestId = Array.isArray(contestId) ? contestId[0] : contestId;
            const safeProblemId = Array.isArray(problemId) ? problemId[0] : problemId;
            for (const key of keys) {
                if (
                    key.startsWith(`verdict-code-${safeContestId}-${safeProblemId}-`) ||
                    key === `verdict-lang-${safeContestId}-${safeProblemId}`
                ) {
                    localStorage.removeItem(key);
                }
            }
        } catch { /* ignore */ }

        // Fetch from DB
        fetch(`/api/user/code?contestId=${contestId}&problemId=${problemId}`, {
            credentials: 'include',
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!data) {
                    setIsHydrated(true);
                    return;
                }

                const dbLang = data.activeLanguage || DEFAULT_LANG;

                // Populate in-memory cache from all DB entries
                if (data.codeByLang) {
                    for (const [lang, entry] of Object.entries(data.codeByLang)) {
                        const e = entry as { code: string; updatedAt: string };
                        if (e.code) codeByLangRef.current[lang] = e.code;
                    }
                }

                const dbCode = codeByLangRef.current[dbLang];
                setLanguage(dbLang);
                setCode(dbCode || TEMPLATES[dbLang] || '');
                setIsHydrated(true);
            })
            .catch(() => {
                setIsHydrated(true);
            });
    }, [contestId, problemId]);

    // Schedule DB save on code changes
    useEffect(() => {
        if (!isHydrated || !contestId || !problemId) return;
        // Update in-memory cache
        codeByLangRef.current[language] = code;
        scheduleSave(code, language);
    }, [code, language, contestId, problemId, isHydrated, scheduleSave]);

    // Flush to DB on unmount
    useEffect(() => {
        return () => {
            if (dbTimerRef.current) {
                clearTimeout(dbTimerRef.current);
                dbTimerRef.current = null;
            }
        };
    }, []);

    // Flush on beforeunload via sendBeacon
    useEffect(() => {
        const handleUnload = () => {
            if (dbTimerRef.current) {
                clearTimeout(dbTimerRef.current);
            }
            if (contestId && problemId) {
                try {
                    const blob = new Blob(
                        [JSON.stringify({ contestId, problemId, language, code, activeLanguage: language })],
                        { type: 'application/json' }
                    );
                    navigator.sendBeacon('/api/user/code', blob);
                } catch {
                    fetch('/api/user/code', {
                        method: 'POST',
                        body: JSON.stringify({ contestId, problemId, language, code, activeLanguage: language }),
                        keepalive: true,
                        headers: { 'Content-Type': 'application/json' },
                    }).catch(() => {});
                }
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [contestId, problemId, language, code]);

    // Language switch: load from in-memory cache or DB cache, fall back to template
    const handleSetLanguage = useCallback((newLang: string) => {
        if (newLang === language) return;
        // Save current code to in-memory cache before switching
        codeByLangRef.current[language] = code;
        // Flush current language's code to DB immediately
        saveToDb(code, language);
        // Load new language's code from in-memory cache
        const cachedCode = codeByLangRef.current[newLang];
        setCode(cachedCode || TEMPLATES[newLang] || '');
        setLanguage(newLang);
    }, [language, code, saveToDb]);

    return { code, setCode, language, setLanguage: handleSetLanguage };
}
