import { useState, useEffect, useCallback, useRef } from 'react';
import { TEMPLATES } from '@/lib/utils/codeTemplates';

const DEFAULT_LANG = 'cpp';
const DB_SAVE_DEBOUNCE = 3000; // save to DB every 3s of inactivity

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

    const getKeys = useCallback((lang: string) => {
        const c = Array.isArray(contestId) ? contestId[0] : contestId;
        const p = Array.isArray(problemId) ? problemId[0] : problemId;
        return {
            codeKey: `verdict-code-${c}-${p}-${lang}`,
            langKey: `verdict-lang-${c}-${p}`,
        };
    }, [contestId, problemId]);

    // Save to DB (non-blocking)
    const saveToDb = useCallback((codeVal: string, lang: string) => {
        if (!contestId || !problemId) return;
        const sig = `${contestId}:${problemId}:${lang}:${codeVal}`;
        if (sig === lastSavedRef.current) return;
        lastSavedRef.current = sig;

        fetch('/api/user/code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ contestId, problemId, language: lang, code: codeVal, activeLanguage: lang }),
            keepalive: true,
        }).catch(() => {});
    }, [contestId, problemId]);

    const scheduleSave = useCallback((codeVal: string, lang: string) => {
        if (dbTimerRef.current) clearTimeout(dbTimerRef.current);
        dbTimerRef.current = setTimeout(() => saveToDb(codeVal, lang), DB_SAVE_DEBOUNCE);
    }, [saveToDb]);

    // Hydrate: localStorage first (instant), then DB in background
    useEffect(() => {
        if (!contestId || !problemId) return;

        // 1. Instant hydrate from localStorage
        const { langKey } = getKeys(DEFAULT_LANG);
        const savedLang = localStorage.getItem(langKey) || DEFAULT_LANG;
        const { codeKey } = getKeys(savedLang);
        const savedCode = localStorage.getItem(codeKey);

        setLanguage(savedLang);
        setCode(savedCode || TEMPLATES[savedLang] || '');
        setIsHydrated(true);

        // 2. Fetch from DB in background — override if DB has data
        fetch(`/api/user/code?contestId=${contestId}&problemId=${problemId}`, {
            credentials: 'include',
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!data) return;
                const dbLang = data.activeLanguage || savedLang;
                const dbEntry = data.codeByLang?.[dbLang];

                if (dbEntry?.code) {
                    // DB has code — use it (source of truth for cross-device)
                    setCode(dbEntry.code);
                    setLanguage(dbLang);
                    // Sync localStorage
                    const keys = getKeys(dbLang);
                    localStorage.setItem(keys.codeKey, dbEntry.code);
                    localStorage.setItem(keys.langKey, dbLang);
                } else if (!savedCode && data.activeLanguage) {
                    setLanguage(data.activeLanguage);
                }
            })
            .catch(() => {}); // DB fetch failed — localStorage is fine
    }, [contestId, problemId, getKeys]);

    // Save to localStorage + schedule DB save on code changes
    useEffect(() => {
        if (!isHydrated || !contestId || !problemId) return;
        const { codeKey } = getKeys(language);
        localStorage.setItem(codeKey, code);
        scheduleSave(code, language);
    }, [code, language, contestId, problemId, isHydrated, getKeys, scheduleSave]);

    // Save language to localStorage
    useEffect(() => {
        if (!isHydrated || !contestId || !problemId) return;
        const { langKey } = getKeys(language);
        localStorage.setItem(langKey, language);
    }, [language, contestId, problemId, isHydrated, getKeys]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (dbTimerRef.current) clearTimeout(dbTimerRef.current);
        };
    }, []);

    // Flush on page close via sendBeacon
    useEffect(() => {
        const handleUnload = () => {
            if (dbTimerRef.current) clearTimeout(dbTimerRef.current);
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

    // Language switch
    const handleSetLanguage = useCallback((newLang: string) => {
        if (newLang === language) return;
        const { codeKey } = getKeys(newLang);
        const savedCode = localStorage.getItem(codeKey);
        setCode(savedCode || TEMPLATES[newLang] || '');
        setLanguage(newLang);
    }, [language, getKeys]);

    return { code, setCode, language, setLanguage: handleSetLanguage };
}
