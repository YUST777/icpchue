"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Code,
    Keyboard,
    ChevronDown,
} from "lucide-react";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = "Code Editor" | "Shortcuts";

// Reusable toggle switch
function Toggle({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: (val: boolean) => void;
}) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={`w-9 h-5 rounded-full relative transition-colors ${
                checked ? "bg-[#3B82F6]" : "bg-white/20"
            }`}
        >
            <motion.div
                className="w-4 h-4 bg-white rounded-full absolute top-[2px]"
                animate={{
                    left: checked ? "18px" : "2px",
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
        </button>
    );
}

// Reusable custom dropdown
function Dropdown({
    value,
    options,
    onChange,
}: {
    value: string;
    options: string[];
    onChange: (val: string) => void;
}) {
    return (
        <div className="relative group">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none bg-white/5 hover:bg-white/10 text-white/80 text-sm px-3 py-1.5 pr-8 rounded-md outline-none cursor-pointer transition-colors w-full min-w-[100px]"
            >
                {options.map((opt) => (
                    <option key={opt} value={opt} className="bg-[#2a2a2a]">
                        {opt}
                    </option>
                ))}
            </select>
            <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none group-hover:text-white/80 transition-colors"
            />
        </div>
    );
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>("Code Editor");

    // Stub state for Code Editor tab
    const [font, setFont] = useState("Default");
    const [fontSize, setFontSize] = useState("13px");
    const [fontLigatures, setFontLigatures] = useState(false);
    const [keyBinding, setKeyBinding] = useState("Standard");
    const [tabSize, setTabSize] = useState("4 spaces");
    const [wordWrap, setWordWrap] = useState(true);
    const [relativeLineNumber, setRelativeLineNumber] = useState(false);

    // Close on esc
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    const modal = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-[800px] h-[500px] max-w-[90vw] max-h-[90vh] bg-[#2a2a2a] rounded-xl overflow-hidden flex shadow-2xl"
                    >
                        {/* Sidebar */}
                        <div className="w-[220px] bg-[#1e1e1e] flex flex-col shrink-0">
                            <div className="p-6 pb-4">
                                <h2 className="text-xl text-white font-medium">
                                    Settings
                                </h2>
                            </div>
                            <nav className="flex-1 px-3 space-y-1">
                                {[
                                    { name: "Code Editor", icon: Code },
                                    { name: "Shortcuts", icon: Keyboard },
                                ].map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.name;
                                    return (
                                        <button
                                            key={tab.name}
                                            onClick={() => setActiveTab(tab.name as Tab)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                                                isActive
                                                    ? "bg-white/10 text-white font-medium"
                                                    : "text-white/60 hover:text-white hover:bg-white/5"
                                            }`}
                                        >
                                            <Icon size={18} />
                                            <span>{tab.name}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 relative bg-[#2a2a2a] flex flex-col">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex-1 overflow-y-auto p-8 pt-12 custom-scrollbar">
                                {activeTab === "Code Editor" && (
                                    <div className="space-y-6 max-w-[400px]">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-white/90">
                                                Font
                                            </span>
                                            <Dropdown
                                                value={font}
                                                onChange={setFont}
                                                options={[
                                                    "Default",
                                                    "JetBrains Mono",
                                                    "Fira Code",
                                                    "Consolas",
                                                ]}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-white/90">
                                                Font size
                                            </span>
                                            <Dropdown
                                                value={fontSize}
                                                onChange={setFontSize}
                                                options={[
                                                    "11px",
                                                    "12px",
                                                    "13px",
                                                    "14px",
                                                    "15px",
                                                    "16px",
                                                ]}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-white/90">
                                                Font ligatures
                                            </span>
                                            <Toggle
                                                checked={fontLigatures}
                                                onChange={setFontLigatures}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-white/90">
                                                Key binding
                                            </span>
                                            <Dropdown
                                                value={keyBinding}
                                                onChange={setKeyBinding}
                                                options={["Standard", "Vim", "Emacs"]}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-white/90">
                                                Tab size
                                            </span>
                                            <Dropdown
                                                value={tabSize}
                                                onChange={setTabSize}
                                                options={[
                                                    "2 spaces",
                                                    "4 spaces",
                                                    "8 spaces",
                                                ]}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-white/90">
                                                Word Wrap
                                            </span>
                                            <Toggle
                                                checked={wordWrap}
                                                onChange={setWordWrap}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-white/90">
                                                Relative Line Number
                                            </span>
                                            <Toggle
                                                checked={relativeLineNumber}
                                                onChange={setRelativeLineNumber}
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === "Shortcuts" && (
                                    <div className="space-y-4">
                                        {[
                                            { label: "Run Tests", key: "Ctrl + '" },
                                            { label: "Submit", key: "Ctrl + Enter" },
                                            { label: "Format Code", key: "Alt + Shift + F" },
                                            { label: "Toggle Sidebar", key: "Ctrl + B" },
                                            { label: "Quick Open", key: "Ctrl + P" },
                                            { label: "Command Palette", key: "Ctrl + Shift + P" },
                                        ].map((item) => (
                                            <div
                                                key={item.label}
                                                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                                            >
                                                <span className="text-sm text-white/80">
                                                    {item.label}
                                                </span>
                                                <div className="flex gap-1.5">
                                                    {item.key.split(" + ").map((k) => (
                                                        <kbd
                                                            key={k}
                                                            className="px-2 py-1 bg-white/10 rounded-md text-[10px] text-white/60 font-mono min-w-[30px] text-center border border-white/5 shadow-sm"
                                                        >
                                                            {k}
                                                        </kbd>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    if (typeof document === "undefined") return null;
    return createPortal(modal, document.body);
}
