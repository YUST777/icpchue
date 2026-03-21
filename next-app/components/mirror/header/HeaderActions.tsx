"use client";

import { useEffect, useState } from "react";
import {
    Settings,
    Flame,
    UserPlus,
} from "lucide-react";
import { TimerDropdown } from "./TimerDropdown";
import { SettingsModal } from "./SettingsModal";
import { Tooltip } from "@/components/ui/Tooltip";

export function HeaderActions() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [streak, setStreak] = useState<number | null>(null);

    useEffect(() => {
        const fetchStreak = async () => {
            try {
                const res = await fetch("/api/user/streak");
                const data = await res.json();
                if (data && typeof data.streak === "number") {
                    setStreak(data.streak);
                }
            } catch (e) {
                console.error("Failed to fetch streak:", e);
                setStreak(0);
            }
        };
        fetchStreak();

        // Listen for global settings toggle shortcut (Alt + S)
        const handleToggle = () => setIsSettingsOpen(prev => !prev);
        window.addEventListener('verdict:toggle-settings', handleToggle);
        return () => window.removeEventListener('verdict:toggle-settings', handleToggle);
    }, []);

    return (
        <div className="hidden md:flex items-center gap-1 shrink-0 text-white/60">
            <Tooltip content="Settings" shortcut={["Alt", "S"]} position="bottom">
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-12 h-8 flex items-center justify-center hover:bg-[#282828] rounded-md transition-colors"
                >
                    <Settings size={18} />
                </button>
            </Tooltip>
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
            <Tooltip content={streak !== null ? `${streak} day streak` : "Streak"} position="bottom">
                <div
                    className={`flex items-center gap-2 px-3.5 h-8 hover:bg-[#282828] rounded-md transition-colors cursor-pointer ${
                        streak && streak > 0 ? "text-[#E8C15A]" : "text-white/60"
                    }`}
                >
                    <Flame
                        size={18}
                        fill={streak && streak > 0 ? "currentColor" : "none"}
                    />
                    <span className="text-[13px] font-bold">
                        {streak !== null ? streak : "0"}
                    </span>
                </div>
            </Tooltip>

            {/* Timer/Session grouped block */}
            <div className="flex items-center rounded-md h-8 overflow-hidden ml-1 bg-[#282828]">
                <Tooltip content="Session Timer" position="bottom">
                    <TimerDropdown />
                </Tooltip>
                <div className="w-px h-full bg-white/10" />
                <Tooltip content="Manage Session" position="bottom">
                    <button
                        className="w-11 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                        <UserPlus size={18} />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
}
