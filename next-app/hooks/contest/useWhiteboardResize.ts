'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useWhiteboardStore } from './useWhiteboardStore';

interface UseWhiteboardResizeReturn {
    whiteboardHeight: number;
    isResizingWhiteboard: boolean;
    handleResizeStart: (e: React.MouseEvent | React.TouchEvent) => void;
}

export function useWhiteboardResize(): UseWhiteboardResizeReturn {
    const { height: whiteboardHeight, setHeight: setWhiteboardHeight } = useWhiteboardStore();
    const [isResizingWhiteboard, setIsResizingWhiteboard] = useState(false);
    const whiteboardStartY = useRef(0);
    const whiteboardStartHeight = useRef(0);
    const whiteboardRef = useRef<HTMLDivElement | null>(null);

    const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        // e.preventDefault(); // Remove to allow focus if needed, though usually fine for resizer
        setIsResizingWhiteboard(true);
        if ('touches' in e) {
            whiteboardStartY.current = e.touches[0]?.clientY ?? 0;
        } else {
            whiteboardStartY.current = e.clientY;
        }
        whiteboardStartHeight.current = whiteboardHeight;
    }, [whiteboardHeight]);

    useEffect(() => {
        if (!isResizingWhiteboard) return;

        // Apply global cursor and classes
        document.body.classList.add('is-resizing-whiteboard');
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';

        const handleMouseMove = (e: MouseEvent) => {
            const deltaY = whiteboardStartY.current - e.clientY;
            const maxHeight = window.innerHeight * 0.9;
            const newHeight = Math.max(150, Math.min(maxHeight, whiteboardStartHeight.current + deltaY));

            // Fast DOM update via CSS variable instead of state re-render
            const containers = document.querySelectorAll('.whiteboard-container');
            containers.forEach(el => {
                (el as HTMLElement).style.height = `${newHeight}px`;
            });
        };

        const handleMouseUp = (e: MouseEvent) => {
            const deltaY = whiteboardStartY.current - e.clientY;
            const maxHeight = window.innerHeight * 0.9;
            const finalHeight = Math.max(150, Math.min(maxHeight, whiteboardStartHeight.current + deltaY));

            // Sync with store only at the end
            setWhiteboardHeight(finalHeight);
            setIsResizingWhiteboard(false);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.cancelable) e.preventDefault();
            const touchY = e.touches[0]?.clientY ?? whiteboardStartY.current;
            const deltaY = whiteboardStartY.current - touchY;
            const maxHeight = window.innerHeight * 0.9;
            const newHeight = Math.max(150, Math.min(maxHeight, whiteboardStartHeight.current + deltaY));

            const containers = document.querySelectorAll('.whiteboard-container');
            containers.forEach(el => {
                (el as HTMLElement).style.height = `${newHeight}px`;
            });
        };

        const handleTouchEnd = (e: TouchEvent) => {
            const touchY = e.changedTouches[0]?.clientY ?? whiteboardStartY.current;
            const deltaY = whiteboardStartY.current - touchY;
            const maxHeight = window.innerHeight * 0.9;
            const finalHeight = Math.max(150, Math.min(maxHeight, whiteboardStartHeight.current + deltaY));

            setWhiteboardHeight(finalHeight);
            setIsResizingWhiteboard(false);
        };

        document.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.body.classList.remove('is-resizing-whiteboard');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isResizingWhiteboard, setWhiteboardHeight]);

    return {
        whiteboardHeight,
        isResizingWhiteboard,
        handleResizeStart
    };
}
