import Link from "next/link";
import { ChevronLeft, ChevronRight, ListVideo, Shuffle } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

interface NavigationBlockProps {
    navigationBaseUrl: string;
    prevId: string | null;
    nextId: string | null;
    prevLabel?: string;
    nextLabel?: string;
    onOpenDrawer?: () => void;
    showShuffle?: boolean;
    onShuffle?: () => string | null;
}

export function NavigationBlock({
    navigationBaseUrl,
    prevId,
    nextId,
    prevLabel,
    nextLabel,
    onOpenDrawer,
    showShuffle = false,
    onShuffle,
}: NavigationBlockProps) {
    return (
        <div className="flex items-center rounded-md h-8 overflow-hidden ml-1 sm:ml-2">
            <Tooltip content="Problem List" position="bottom">
                {onOpenDrawer ? (
                    <button
                        onClick={onOpenDrawer}
                        className="flex items-center gap-2 px-6 h-full text-white/80 hover:bg-[#282828] transition-colors font-medium text-sm whitespace-nowrap"
                    >
                        <ListVideo size={16} className="opacity-70" />
                        <span className="hidden sm:inline">Problem List</span>
                    </button>
                ) : (
                    <Link
                        href={navigationBaseUrl}
                        className="flex items-center gap-2 px-6 h-full text-white/80 hover:bg-[#282828] transition-colors font-medium text-sm whitespace-nowrap"
                    >
                        <ListVideo size={16} className="opacity-70" />
                        <span className="hidden sm:inline">Problem List</span>
                    </Link>
                )}
            </Tooltip>

            <div className="w-px h-full bg-white/10" />

            {/* Previous */}
            <Tooltip content={prevLabel || "Previous problem"} position="bottom">
                <Link
                    href={
                        prevId
                            ? `${navigationBaseUrl}/${prevId.trim()}`
                            : "#"
                    }
                    className={`w-12 h-full flex items-center justify-center transition-colors ${
                        prevId
                            ? "text-white/60 hover:text-white hover:bg-[#282828]"
                            : "text-white/20 cursor-not-allowed pointer-events-none"
                    }`}
                    aria-disabled={!prevId}
                >
                    <ChevronLeft size={16} />
                </Link>
            </Tooltip>

            <div className="w-px h-full bg-white/10" />

            {/* Next */}
            <Tooltip content={nextLabel || "Next problem"} position="bottom">
                <Link
                    href={
                        nextId
                            ? `${navigationBaseUrl}/${nextId.trim()}`
                            : "#"
                    }
                    className={`w-12 h-full flex items-center justify-center transition-colors ${
                        nextId
                            ? "text-white/60 hover:text-white hover:bg-[#282828]"
                            : "text-white/20 cursor-not-allowed pointer-events-none"
                    }`}
                    aria-disabled={!nextId}
                >
                    <ChevronRight size={16} />
                </Link>
            </Tooltip>

            {/* Shuffle */}
            {showShuffle && onShuffle && (
                <>
                    <div className="w-px h-full bg-white/10" />
                    <Tooltip content="Random problem" position="bottom">
                        <Link
                            href={(() => {
                                const rid = onShuffle();
                                return rid
                                    ? `${navigationBaseUrl}/${rid}`
                                    : "#";
                            })()}
                            className="w-12 h-full flex items-center justify-center text-white/60 hover:text-white hover:bg-[#282828] transition-colors"
                        >
                            <Shuffle size={14} />
                        </Link>
                    </Tooltip>
                </>
            )}
        </div>
    );
}
