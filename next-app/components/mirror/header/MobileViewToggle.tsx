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
            <div className="flex md:hidden w-full border-t border-white/10 relative">
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
                        <motion.div
                            layoutId="mobile-tabs-active-bar"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8C15A]"
                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
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
                        <motion.div
                            layoutId="mobile-tabs-active-bar"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8C15A]"
                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                    )}
                </button>
            </div>
        );
    }

    // "pill" variant
    return (
        <div className="flex md:hidden bg-[#1a1a1a] p-0.5 rounded-lg border border-white/10 shrink-0 relative">
            <button
                onClick={() => setMobileView("problem")}
                aria-label="View problem statement"
                className={`relative min-w-[36px] h-8 px-2 flex items-center justify-center gap-1 rounded-md transition-colors text-xs font-semibold z-10 ${
                    mobileView === "problem"
                        ? "text-white"
                        : "text-white/40 hover:text-white/60 active:bg-white/5"
                }`}
            >
                {mobileView === "problem" && (
                    <motion.div
                        layoutId="mobile-view-pill-active"
                        className="absolute inset-0 bg-[#2a2a2a] rounded-md shadow-sm border border-white/10 -z-10"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                )}
                <FileText size={14} strokeWidth={2.5} />
            </button>
            <button
                onClick={() => setMobileView("code")}
                aria-label="View code editor"
                className={`relative min-w-[36px] h-8 px-2 flex items-center justify-center gap-1 rounded-md transition-colors text-xs font-semibold z-10 ${
                    mobileView === "code"
                        ? "text-white"
                        : "text-white/40 hover:text-white/60 active:bg-white/5"
                }`}
            >
                {mobileView === "code" && (
                    <motion.div
                        layoutId="mobile-view-pill-active"
                        className="absolute inset-0 bg-[#2a2a2a] rounded-md shadow-sm border border-white/10 -z-10"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                )}
                <Code size={14} strokeWidth={2.5} />
            </button>
        </div>
    );
}
