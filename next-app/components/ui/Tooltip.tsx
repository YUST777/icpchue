import React, { ReactNode, useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipProps {
    children: ReactNode;
    content: string;
    shortcut?: string[]; // New: Array of keys to show in the hint
    position?: "top" | "bottom" | "left" | "right";
    className?: string;
    delay?: number;
}

export function Tooltip({
    children,
    content,
    shortcut,
    position = "bottom",
    className = "",
    delay = 50
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const timeoutId = useRef<NodeJS.Timeout | null>(null);

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let top = 0;
            let left = 0;

            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            switch (position) {
                case "top":
                    top = rect.top + scrollY - 8;
                    left = rect.left + scrollX + rect.width / 2;
                    break;
                case "bottom":
                    top = rect.bottom + scrollY + 8;
                    left = rect.left + scrollX + rect.width / 2;
                    break;
                case "left":
                    top = rect.top + scrollY + rect.height / 2;
                    left = rect.left + scrollX - 8;
                    break;
                case "right":
                    top = rect.top + scrollY + rect.height / 2;
                    left = rect.left + scrollX + rect.width + 8;
                    break;
            }
            setCoords({ top, left });
        }
    };

    useLayoutEffect(() => {
        if (isVisible) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isVisible, position]);

    const handleEnter = () => {
        timeoutId.current = setTimeout(() => setIsVisible(true), delay);
    };

    const handleLeave = () => {
        if (timeoutId.current) clearTimeout(timeoutId.current);
        setIsVisible(false);
    };

    const variants = {
        initial: {
            opacity: 0,
            scale: 0.9,
            x: position === "top" || position === "bottom" ? "-50%" : position === "left" ? 10 : -10,
            y: position === "left" || position === "right" ? "-50%" : position === "top" ? 10 : -10,
        },
        animate: {
            opacity: 1,
            scale: 1,
            x: position === "top" || position === "bottom" ? "-50%" : 0,
            y: position === "left" || position === "right" ? "-50%" : 0,
        },
        exit: {
            opacity: 0,
            scale: 0.95,
        }
    };

    const arrowClasses = {
        top: "bottom-0 left-1/2 translate-y-1/2 -translate-x-1/2 border-r border-b",
        bottom: "top-0 left-1/2 -translate-y-1/2 -translate-x-1/2 border-l border-t",
        left: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 border-r border-t",
        right: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 border-l border-b"
    };

    return (
        <>
            <div 
                ref={triggerRef}
                className={`relative inline-flex items-center justify-center ${className}`}
                onMouseEnter={handleEnter}
                onMouseLeave={handleLeave}
            >
                {children}
            </div>
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isVisible && (
                        <motion.div
                            variants={variants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{ duration: 0.1, ease: "easeOut" }}
                            className="fixed z-[10001] pointer-events-none whitespace-nowrap"
                            style={{ 
                                top: coords.top, 
                                left: coords.left,
                                position: 'absolute'
                            }}
                        >
                            <div className="bg-[#0b0b0c]/95 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] relative flex items-center gap-2.5">
                                <div className={`absolute w-2 h-2 bg-[#0b0b0c] border-white/10 rotate-45 ${arrowClasses[position]}`}></div>
                                <span className="relative z-10 text-[11px] font-bold text-white/90 tracking-wide">
                                    {content}
                                </span>
                                {shortcut && (
                                    <div className="flex items-center gap-1 relative z-10 ml-0.5">
                                        {shortcut.map((key, i) => (
                                            <React.Fragment key={key}>
                                                <div className="min-w-[18px] h-[18px] px-1.5 flex items-center justify-center bg-white/5 border border-white/10 rounded text-[9px] font-black text-white/40 uppercase shadow-[0_1px_0_rgba(255,255,255,0.05)]">
                                                    {key}
                                                </div>
                                                {i < shortcut.length - 1 && <span className="text-[10px] text-white/20 font-bold">+</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
