import { useState, useEffect, useCallback, useRef } from 'react';
import { TEMPLATES } from '@/lib/utils/codeTemplates';

const DEFAULT_LANG = 'cpp';
const DB_SAVE_DEBOUNCE = 1200; // Save to DB after 1.2s of inactivity

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
    const lastSavedSigRef = useRef<string>('');
    const hasUserEditedRef = useRef<boolean>(false);
    const hasFetchedDbRef = useRef<boolean>(false);
    const currentRef = useRef({ contestId, problemId, code, language });

    // Keep ref updated synchronously for unmount/lifecycle flush
    currentRef.current = { contestId, problemId, code, language };

    const getKeys = useCallback((lang: string, cId = contestId, pId = problemId) => {
        const c = Array.isArray(cId) ? cId[0] : cId;
        const p = Array.isArray(pId) ? pId[0] : pId;
        return {
            codeKey: `verdict-code-${c}-${p}-${lang}`,
            langKey: `verdict-lang-${c}-${p}`,
        };
    }, [contestId, problemId]);

    // Direct flush to DB via keepalive fetch
    const flushToDb = useCallback((cId: string, pId: string, codeVal: string, langVal: string) => {
        if (!cId || !pId || !langVal) return;
        const sig = `${cId}:${pId}:${langVal}:${codeVal}`;
        if (sig === lastSavedSigRef.current) return;
        lastSavedSigRef.current = sig;

        try {
            fetch('/api/user/code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    contestId: cId,
                    problemId: pId,
                    language: langVal,
                    code: codeVal,
                    activeLanguage: langVal,
                }),
                keepalive: true,
            }).catch(() => {});
        } catch {
            // Ignore offline/unload errors
        }
    }, []);

    const scheduleSave = useCallback((codeVal: string, langVal: string) => {
        if (dbTimerRef.current) clearTimeout(dbTimerRef.current);
        dbTimerRef.current = setTimeout(() => {
            flushToDb(contestId, problemId, codeVal, langVal);
            dbTimerRef.current = null;
        }, DB_SAVE_DEBOUNCE);
    }, [contestId, problemId, flushToDb]);

    // Initial Hydration: localStorage first (instant), then DB in background for cross-platform sync
    useEffect(() => {
        if (!contestId || !problemId) return;

        let isCurrent = true;
        hasUserEditedRef.current = false;
        hasFetchedDbRef.current = false;

        // 1. Instant hydrate from localStorage
        const { langKey } = getKeys(DEFAULT_LANG);
        const savedLang = localStorage.getItem(langKey) || DEFAULT_LANG;
        const { codeKey } = getKeys(savedLang);
        const savedCode = localStorage.getItem(codeKey);

        const initialCode = savedCode !== null ? savedCode : (TEMPLATES[savedLang] || '');
        setLanguage(savedLang);
        setCode(initialCode);
        setIsHydrated(true);

        // Mark signature if loaded from local cache so we don't redundantly re-save unchanged template
        if (savedCode === null) {
            lastSavedSigRef.current = `${contestId}:${problemId}:${savedLang}:${initialCode}`;
        }

        // 2. Fetch from DB in background — cross-platform sync without race conditions
        fetch(`/api/user/code?contestId=${contestId}&problemId=${problemId}`, {
            credentials: 'include',
        })
            .then(r => (r.ok ? r.json() : null))
            .then(data => {
                if (!isCurrent || !data) return;
                hasFetchedDbRef.current = true;

                // Sync all languages from DB into localStorage so language switches have cross-platform code
                if (data.codeByLang && typeof data.codeByLang === 'object') {
                    for (const [l, entry] of Object.entries<any>(data.codeByLang)) {
                        if (entry?.code !== undefined) {
                            const keys = getKeys(l);
                            // If local device didn't have code for this language, populate from DB
                            if (!localStorage.getItem(keys.codeKey)) {
                                localStorage.setItem(keys.codeKey, entry.code);
                            }
                        }
                    }
                }

                // If user has NOT typed yet on this device, sync active language and code from DB
                if (!hasUserEditedRef.current) {
                    const targetLang = data.activeLanguage || savedLang;
                    const dbEntry = data.codeByLang?.[targetLang];

                    if (dbEntry && typeof dbEntry.code === 'string') {
                        const targetKeys = getKeys(targetLang);
                        localStorage.setItem(targetKeys.codeKey, dbEntry.code);
                        localStorage.setItem(targetKeys.langKey, targetLang);
                        lastSavedSigRef.current = `${contestId}:${problemId}:${targetLang}:${dbEntry.code}`;
                        setLanguage(targetLang);
                        setCode(dbEntry.code);
                    } else if (data.activeLanguage && data.activeLanguage !== savedLang) {
                        setLanguage(data.activeLanguage);
                        const targetKeys = getKeys(data.activeLanguage);
                        const localLangCode = localStorage.getItem(targetKeys.codeKey);
                        setCode(localLangCode !== null ? localLangCode : (TEMPLATES[data.activeLanguage] || ''));
                    }
                }
            })
            .catch(() => {
                // Offline or fetch failed — localStorage is active
            });

        return () => {
            isCurrent = false;
        };
    }, [contestId, problemId, getKeys]);

    // User-triggered code change
    const handleSetCode = useCallback((newCode: string) => {
        hasUserEditedRef.current = true;
        setCode(newCode);

        // Save immediately to localStorage
        const { codeKey } = getKeys(language);
        try {
            localStorage.setItem(codeKey, newCode);
        } catch {}

        // Schedule DB sync
        scheduleSave(newCode, language);
    }, [language, getKeys, scheduleSave]);

    // User-triggered language switch
    const handleSetLanguage = useCallback((newLang: string) => {
        if (newLang === language) return;
        // Flush any pending save for current language before switching
        if (dbTimerRef.current) {
            clearTimeout(dbTimerRef.current);
            dbTimerRef.current = null;
            flushToDb(contestId, problemId, code, language);
        }

        const { codeKey, langKey } = getKeys(newLang);
        try {
            localStorage.setItem(langKey, newLang);
        } catch {}

        const savedCode = localStorage.getItem(codeKey);
        const nextCode = savedCode !== null ? savedCode : (TEMPLATES[newLang] || '');
        setLanguage(newLang);
        setCode(nextCode);

        // Also save activeLanguage preference to DB
        fetch('/api/user/code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                contestId,
                problemId,
                language: newLang,
                code: nextCode,
                activeLanguage: newLang,
            }),
            keepalive: true,
        }).catch(() => {});
    }, [language, code, contestId, problemId, getKeys, flushToDb]);

    // Flush on unmount (e.g. Next.js navigation between problems or back to sheet)
    useEffect(() => {
        return () => {
            if (dbTimerRef.current) {
                clearTimeout(dbTimerRef.current);
                dbTimerRef.current = null;
            }
            if (hasUserEditedRef.current) {
                const { contestId: c, problemId: p, code: cd, language: lg } = currentRef.current;
                flushToDb(c, p, cd, lg);
            }
        };
    }, [flushToDb]);

    // Flush on mobile app switch / tab close / visibility hidden
    useEffect(() => {
        const handleFlush = () => {
            if (dbTimerRef.current) {
                clearTimeout(dbTimerRef.current);
                dbTimerRef.current = null;
            }
            if (hasUserEditedRef.current) {
                const { contestId: c, problemId: p, code: cd, language: lg } = currentRef.current;
                if (!c || !p) return;
                try {
                    const blob = new Blob(
                        [JSON.stringify({
                            contestId: c,
                            problemId: p,
                            language: lg,
                            code: cd,
                            activeLanguage: lg,
                        })],
                        { type: 'application/json' }
                    );
                    navigator.sendBeacon('/api/user/code', blob);
                } catch {
                    flushToDb(c, p, cd, lg);
                }
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                handleFlush();
            }
        };

        window.addEventListener('beforeunload', handleFlush);
        window.addEventListener('pagehide', handleFlush);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleFlush);
            window.removeEventListener('pagehide', handleFlush);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [flushToDb]);

    return { code, setCode: handleSetCode, language, setLanguage: handleSetLanguage };
}
