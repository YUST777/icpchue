import { useMemo, useCallback } from "react";
import type { SheetProblem } from "../problem/ProblemDrawer";

interface UseNavigationIdsOptions {
    problemId: string;
    sheetProblems?: SheetProblem[];
}

interface NavigationResult {
    prevId: string | null;
    nextId: string | null;
    prevProblem: SheetProblem | null;
    nextProblem: SheetProblem | null;
    currentIndex: number;
    getRandomId: () => string | null;
}

function getNextIdFallback(id: string): string | null {
    if (!id) return null;
    const digitMatch = id.match(/(\d+)$/);
    if (digitMatch) {
        const num = parseInt(digitMatch[1]);
        const prefix = id.slice(0, -digitMatch[0].length);
        return `${prefix}${num + 1}`;
    }
    const charCode = id.charCodeAt(id.length - 1);
    if (charCode >= 65 && charCode < 90)
        return id.slice(0, -1) + String.fromCharCode(charCode + 1);
    return null;
}

function getPrevIdFallback(id: string): string | null {
    if (!id) return null;
    const digitMatch = id.match(/(\d+)$/);
    if (digitMatch) {
        const num = parseInt(digitMatch[1]);
        if (num > 1) {
            const prefix = id.slice(0, -digitMatch[0].length);
            return `${prefix}${num - 1}`;
        }
        return null;
    }
    const charCode = id.charCodeAt(id.length - 1);
    if (charCode > 65 && charCode <= 90)
        return id.slice(0, -1) + String.fromCharCode(charCode - 1);
    return null;
}

export function useNavigationIds({
    problemId,
    sheetProblems,
}: UseNavigationIdsOptions): NavigationResult {
    const currentId = problemId || "";

    const currentIndex = useMemo(
        () =>
            sheetProblems?.findIndex(
                (p) =>
                    p.index.trim().toUpperCase() ===
                    currentId.trim().toUpperCase()
            ) ?? -1,
        [sheetProblems, currentId]
    );

    const prevProblem = useMemo(
        () => (currentIndex > 0 ? sheetProblems![currentIndex - 1] : null),
        [sheetProblems, currentIndex]
    );

    const nextProblem = useMemo(
        () =>
            currentIndex >= 0 &&
            sheetProblems &&
            currentIndex < sheetProblems.length - 1
                ? sheetProblems[currentIndex + 1]
                : null,
        [sheetProblems, currentIndex]
    );

    const prevId = prevProblem
        ? prevProblem.index
        : getPrevIdFallback(currentId);
    const nextId = nextProblem
        ? nextProblem.index
        : getNextIdFallback(currentId);

    const getRandomId = useCallback(() => {
        if (!sheetProblems || sheetProblems.length <= 1) return null;
        const others = sheetProblems.filter(
            (p) => p.index.toUpperCase() !== currentId.toUpperCase()
        );
        if (others.length === 0) return null;
        return others[Math.floor(Math.random() * others.length)].index;
    }, [sheetProblems, currentId]);

    return {
        prevId,
        nextId,
        prevProblem,
        nextProblem,
        currentIndex,
        getRandomId,
    };
}
