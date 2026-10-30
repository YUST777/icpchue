'use client';

import { useState, useRef, useEffect, useCallback, type PointerEvent as ReactPointerEvent } from 'react';
import { useWhiteboardStore } from './useWhiteboardStore';

export function useWhiteboardResize() {
    const setHeight = useWhiteboardStore(state => state.setHeight);
    const [isResizingWhiteboard, setIsResizingWhiteboard] = useState(false);
    const dragRef = useRef<{ board: HTMLElement; startY: number; startHeight: number; scale: number; maxHeight: number; pointerId: number } | null>(null);

    const handleResizeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        const board = event.currentTarget.closest<HTMLElement>('.whiteboard-container');
        if (!board) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
            board,
            startY: event.clientY,
            startHeight: board.offsetHeight,
            scale: board.getBoundingClientRect().height / board.offsetHeight || 1,
            maxHeight: Math.max(240, (board.parentElement?.clientHeight ?? window.innerHeight) * 0.75),
            pointerId: event.pointerId,
        };
        setIsResizingWhiteboard(true);
    }, []);

    useEffect(() => {
        if (!isResizingWhiteboard) return;
        const previousCursor = document.body.style.cursor;
        const previousSelect = document.body.style.userSelect;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';

        const move = (event: PointerEvent) => {
            const drag = dragRef.current;
            if (!drag || event.pointerId !== drag.pointerId) return;
            if (event.cancelable) event.preventDefault();
            const height = drag.startHeight + (drag.startY - event.clientY) / drag.scale;
            drag.board.style.height = `${Math.max(240, Math.min(drag.maxHeight, height))}px`;
        };
        const end = (event: PointerEvent) => {
            const drag = dragRef.current;
            if (!drag || event.pointerId !== drag.pointerId) return;
            setHeight(drag.board.offsetHeight);
            dragRef.current = null;
            setIsResizingWhiteboard(false);
        };
        window.addEventListener('pointermove', move, { passive: false });
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = previousSelect;
        };
    }, [isResizingWhiteboard, setHeight]);

    return { isResizingWhiteboard, handleResizeStart };
}
