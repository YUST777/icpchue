import Link from "next/link";
import { ChevronLeft, ChevronRight, ListVideo, Shuffle } from "lucide-react";

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
            {/* Problem List button */}
            {onOpenDrawer ? (
                <button
                    onClick={onOpenDrawer}
                    className="flex items-center gap-2 px-6 h-full text-white/80 hover:bg-[#282828] transition-colors font-medium text-sm whitespace-nowrap"
                    title="Problem List"
                >
                    <ListVideo size={16} className="opacity-70" />
                    <span className="hidden sm:inline">Problem List</span>
                </button>
            ) : (
                <Link
                    href={navigationBaseUrl}
                    className="flex items-center gap-2 px-6 h-full text-white/80 hover:bg-[#282828] transition-colors font-medium text-sm whitespace-nowrap"
                    title="Problem List"
                >
                    <ListVideo size={16} className="opacity-70" />
                    <span className="hidden sm:inline">Problem List</span>
                </Link>
            )}

            <div className="w-px h-full bg-white/10" />

            {/* Previous */}
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
                title={prevLabel || "Previous problem"}
            >
                <ChevronLeft size={16} />
            </Link>

            <div className="w-px h-full bg-white/10" />

            {/* Next */}
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
                title={nextLabel || "Next problem"}
            >
                <ChevronRight size={16} />
            </Link>

            {/* Shuffle */}
            {showShuffle && onShuffle && (
                <>
                    <div className="w-px h-full bg-white/10" />
                    <Link
                        href={(() => {
                            const rid = onShuffle();
                            return rid
                                ? `${navigationBaseUrl}/${rid}`
                                : "#";
                        })()}
                        className="w-12 h-full flex items-center justify-center text-white/60 hover:text-white hover:bg-[#282828] transition-colors"
                        title="Random problem"
                    >
                        <Shuffle size={14} />
                    </Link>
                </>
            )}
        </div>
    );
}
