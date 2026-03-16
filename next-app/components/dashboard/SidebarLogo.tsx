'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarLogoProps {
    isCollapsed: boolean;
}

export function SidebarLogo({ isCollapsed }: SidebarLogoProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [clickCount, setClickCount] = useState(0);

    const handleClick = () => {
        if (isCollapsed) {
            setClickCount(prev => prev + 1);
        }
    };

    return (
        <div
            className="relative"
            onMouseEnter={() => isCollapsed && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
        >
            {isCollapsed ? (
                // Collapsed: Image + Tooltip
                <div className="relative w-10 h-10 flex items-center justify-center cursor-default">
                    <Image
                        src="/icons/icpchue.svg"
                        alt="ICPC HUE Logo"
                        width={40}
                        height={40}
                        className="w-10 h-10 transition-transform hover:scale-105"
                    />
                </div>
            ) : (
                // Expanded: Link with Image + Text
                <Link href="/" className="flex items-center gap-4 group">
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        <Image
                            src="/icons/icpchue.svg"
                            alt="ICPC HUE Logo"
                            width={40}
                            height={40}
                            className="w-10 h-10 transition-transform group-hover:scale-105"
                        />
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className="text-white font-black text-xl leading-none tracking-tight group-hover:text-[#E8C15A] transition-colors whitespace-nowrap">ICPC HUE</span>
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.3em] leading-none mt-1.5 group-hover:text-white/60 transition-colors whitespace-nowrap">Community</span>
                    </div>
                </Link>
            )}

            <AnimatePresence>
                {isCollapsed && isHovered && (
                    <motion.div
                        initial={{ opacity: 0, x: 10, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute left-full ml-4 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap"
                    >
                        <div className="relative bg-[#0B0B0C] border border-white/10 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center gap-2">
                            {/* Arrow */}
                            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#0B0B0C] border-l border-b border-white/10 rotate-45" />

                            <span className="relative z-10 flex items-center gap-2">
                                {clickCount >= 5 ? (
                                    <span className="text-[#E8C15A]">icpchue.com made by tg @yousefmsm1</span>
                                ) : (
                                    <>
                                        Where champions learn to code :)
                                        <span className="text-[#E8C15A]">🏆</span>
                                    </>
                                )}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
