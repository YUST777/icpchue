"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Search, 
    Zap, 
    FileText, 
    Settings, 
    Play, 
    CloudUpload, 
    ChevronRight,
    Command
} from "lucide-react";
import { useUIStore } from "@/hooks/useUIStore";
import { useRouter } from "next/navigation";
import { SheetProblem } from "../problem/ProblemDrawer";

interface CommandPaletteProps {
    problems?: SheetProblem[];
    onRunTests?: () => void;
    onSubmit?: () => void;
    onOpenSettings?: () => void;
}

export function CommandPalette({
    problems = [],
    onRunTests,
    onSubmit,
    onOpenSettings,
}: CommandPaletteProps) {
    const { isSearchOpen, setSearchOpen } = useUIStore();
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Close on escape, toggle on ctrl+k
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setSearchOpen(!isSearchOpen);
            }
            if (e.key === "Escape") {
                setSearchOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isSearchOpen, setSearchOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isSearchOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery("");
            setSelectedIndex(0);
        }
    }, [isSearchOpen]);

    const actions = [
        { id: "run", name: "Run Local Tests", icon: Play, action: onRunTests, shortcut: ["Ctrl", "'"] },
        { id: "submit", name: "Submit to Codeforces", icon: CloudUpload, action: onSubmit, shortcut: ["Ctrl", "Enter"] },
        { id: "settings", name: "Open Settings", icon: Settings, action: onOpenSettings, shortcut: [","] },
    ];

    const filteredActions = actions.filter(a => 
        a.name.toLowerCase().includes(query.toLowerCase())
    );

    const filteredProblems = problems.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        p.index.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);

    const results = [...filteredActions, ...filteredProblems];

    const handleSelect = (item: any) => {
        if (item.action) {
            item.action();
        } else if (item.index) {
            // Problem navigation - this is a simplified version, 
            // the parent should ideally handle real navigation logic
            // but for now we'll just close and let the user know.
            console.log("Problem selected:", item.index);
        }
        setSearchOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === "Enter") {
            if (results[selectedIndex]) {
                handleSelect(results[selectedIndex]);
            }
        }
    };

    return (
        <AnimatePresence>
            {isSearchOpen && (
                <div className="fixed inset-0 z-[100000] flex items-start justify-center pt-[15vh] px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSearchOpen(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Palette */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="relative w-full max-w-[640px] bg-[#1a1a1b]/95 border border-white/10 rounded-2xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden backdrop-blur-xl"
                    >
                        {/* Search Bar */}
                        <div className="flex items-center px-5 h-[64px] border-b border-white/5 bg-white/[0.02]">
                            <Search size={20} className="text-white/30 mr-4" strokeWidth={2.5} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search for problems or actions..."
                                className="flex-1 bg-transparent border-none outline-none text-lg text-white placeholder:text-white/20"
                            />
                            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white/40 uppercase">
                                <Command size={10} />
                                <span>K</span>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="max-h-[420px] overflow-y-auto p-2 scrollbar-none">
                            {results.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredActions.length > 0 && query && (
                                        <div className="px-3 py-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">Actions</div>
                                    )}
                                    {filteredActions.map((item, i) => {
                                        const Icon = item.icon;
                                        const isSelected = selectedIndex === i;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => handleSelect(item)}
                                                onMouseEnter={() => setSelectedIndex(i)}
                                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                                                    isSelected ? "bg-white/10 text-white shadow-lg translate-x-1" : "text-white/50 hover:bg-white/[0.03]"
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-lg ${isSelected ? "bg-[#E8C15A] text-black" : "bg-white/5"}`}>
                                                        <Icon size={18} />
                                                    </div>
                                                    <span className="text-sm font-medium">{item.name}</span>
                                                </div>
                                                {item.shortcut && (
                                                    <div className="flex items-center gap-1 opacity-40">
                                                        {item.shortcut.map(s => (
                                                            <span key={s} className="px-1.5 py-0.5 bg-white/10 border border-white/10 rounded text-[9px] font-mono">{s}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}

                                    {filteredProblems.length > 0 && (
                                        <>
                                            <div className="px-3 py-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Problems</div>
                                            {filteredProblems.map((p, i) => {
                                                const idx = filteredActions.length + i;
                                                const isSelected = selectedIndex === idx;
                                                return (
                                                    <button
                                                        key={`${p.contestId}-${p.index}`}
                                                        onClick={() => handleSelect(p)}
                                                        onMouseEnter={() => setSelectedIndex(idx)}
                                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                                                            isSelected ? "bg-white/10 text-white shadow-lg translate-x-1" : "text-white/50 hover:bg-white/[0.03]"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold font-mono text-sm ${
                                                                isSelected ? "bg-[#E8C15A] text-black" : "bg-white/5 text-white/40"
                                                            }`}>
                                                                {p.index}
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-sm font-medium truncate max-w-[300px]">{p.name}</p>
                                                                <p className="text-[10px] text-white/20 font-mono mt-0.5">#{p.contestId}</p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={16} className={isSelected ? "text-[#E8C15A]" : "text-white/10"} />
                                                    </button>
                                                );
                                            })}
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center text-white/10">
                                    <Zap size={48} strokeWidth={1} />
                                    <p className="mt-4 text-sm">No results for &quot;{query}&quot;</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 h-[48px] border-t border-white/5 bg-black/20 flex items-center gap-6 justify-end text-[10px] font-medium text-white/30">
                            <div className="flex items-center gap-1.5">
                                <span className="p-1 bg-white/5 rounded">↵</span> Select
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="p-1 bg-white/5 rounded">↑↓</span> Navigate
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="p-1 bg-white/5 rounded">ESC</span> Close
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
