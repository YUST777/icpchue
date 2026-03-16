'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export function useWhiteboardData(contestId: string, problemIndex: string, boardId: string) {
    const storageKey = `whiteboard-${contestId}-${problemIndex}-${boardId}`;
    const legacyKey = boardId === 'primary' ? `whiteboard-${contestId}${problemIndex}` : null;

    const [savedData, setSavedData] = useState<any>(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    const loadSavedData = useCallback(() => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) return JSON.parse(saved);

            if (legacyKey) {
                const legacy = localStorage.getItem(legacyKey);
                if (legacy) {
                    localStorage.setItem(storageKey, legacy);
                    return JSON.parse(legacy);
                }
            }
        } catch (e) {
            console.error('Failed to load whiteboard data:', e);
        }
        return null;
    }, [storageKey, legacyKey]);

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingDataRef = useRef<{ elements: readonly any[]; appState: any } | null>(null);

    const performSave = useCallback(() => {
        if (!pendingDataRef.current) return;

        try {
            const { elements, appState } = pendingDataRef.current;
            const data = {
                elements: [...elements],
                appState: {
                    viewBackgroundColor: appState.viewBackgroundColor,
                    zoom: appState.zoom,
                    scrollX: appState.scrollX,
                    scrollY: appState.scrollY,
                }
            };
            localStorage.setItem(storageKey, JSON.stringify(data));
            pendingDataRef.current = null;
        } catch (e) {
            console.error('Failed to save whiteboard data:', e);
        }
    }, [storageKey]);

    const saveData = useCallback((elements: readonly any[], appState: any) => {
        pendingDataRef.current = { elements, appState };

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            performSave();
        }, 500); // 500ms debounce
    }, [performSave]);

    // Ensure we save on unmount or tab close
    useEffect(() => {
        const handleUnload = () => {
            if (pendingDataRef.current) {
                performSave();
            }
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            if (pendingDataRef.current) {
                performSave();
            }
        };
    }, [performSave]);

    useEffect(() => {
        const data = loadSavedData();
        setSavedData(data);
        setIsDataLoaded(true);
    }, [loadSavedData]);

    const clearData = useCallback(() => {
        localStorage.removeItem(storageKey);
        setSavedData(null);
    }, [storageKey]);

    return {
        savedData,
        isDataLoaded,
        saveData,
        clearData
    };
}
