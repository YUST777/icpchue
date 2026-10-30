import { FileText, Code } from "lucide-react";
import { motion } from "framer-motion";

interface MobileViewToggleProps {
    mobileView: "problem" | "code";
    setMobileView: (view: "problem" | "code") => void;
    /** Style variant: "pill" for the problem/ header, "tabs" for the mirror header */
    variant?: "pill" | "tabs";
}

export function MobileViewToggle({
    mobileView,
    setMobileView,
    variant = "pill",
}: MobileViewToggleProps) {
    if (variant === "tabs") {
        return (
            <div className="flex md:hidden w-full border-t border-white/10">
                <button
                    onClick={() => setMobileView("problem")}
                    className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors relative touch-manipulation active:bg-white/10
                        ${
                            mobileView === "problem"
                                ? "text-white bg-white/5"
                                : "text-white/60 active:text-white active:bg-white/5"
                        }`}
                >
                    <FileText size={14} className="sm:w-4 sm:h-4" />
                    <span>Problem</span>
                    {mobileView === "problem" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8C15A]" />
                    )}
                </button>
                <button
                    onClick={() => setMobileView("code")}
                    className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors relative touch-manipulation active:bg-white/10
                        ${
                            mobileView === "code"
                                ? "text-white bg-white/5"
                                : "text-white/60 active:text-white active:bg-white/5"
                        }`}
                >
                    <Code size={14} className="sm:w-4 sm:h-4" />
                    <span>Code</span>
                    {mobileView === "code" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8C15A]" />
                    )}
                </button>
            </div>
        );
    }

    // "pill" variant
    return (
        <div className="relative flex md:hidden bg-[#1a1a1a] p-0.5 rounded-lg border border-white/10 shrink-0">
            <motion.button
                onClick={() => setMobileView("problem")}
                aria-label="View problem statement"
                aria-pressed={mobileView === "problem"}
                whileTap={{ scale: 0.94 }}
                className={`relative z-10 min-w-[36px] h-8 px-2 flex items-center justify-center gap-1 rounded-md transition-colors text-xs font-semibold ${
                    mobileView === "problem"
                        ? "text-white"
                        : "text-white/40 hover:text-white/60 active:bg-white/5"
                }`}
            >
                {mobileView === "problem" && (
                    <motion.span
                        layoutId="mobile-view-toggle-active"
                        transition={{ type: "spring", stiffness: 480, damping: 34, mass: 0.55 }}
                        className="absolute inset-0 rounded-md border border-white/10 bg-[#2a2a2a] shadow-sm"
                    />
                )}
                <FileText size={14} strokeWidth={2.5} className="relative z-10" />
            </motion.button>
            <motion.button
                onClick={() => setMobileView("code")}
                aria-label="View code editor"
                aria-pressed={mobileView === "code"}
                whileTap={{ scale: 0.94 }}
                className={`relative z-10 min-w-[36px] h-8 px-2 flex items-center justify-center gap-1 rounded-md transition-colors text-xs font-semibold ${
                    mobileView === "code"
                        ? "text-white"
                        : "text-white/40 hover:text-white/60 active:bg-white/5"
                }`}
            >
                {mobileView === "code" && (
                    <motion.span
                        layoutId="mobile-view-toggle-active"
                        transition={{ type: "spring", stiffness: 480, damping: 34, mass: 0.55 }}
                        className="absolute inset-0 rounded-md border border-white/10 bg-[#2a2a2a] shadow-sm"
                    />
                )}
                <Code size={14} strokeWidth={2.5} className="relative z-10" />
            </motion.button>
        </div>
    );
}
