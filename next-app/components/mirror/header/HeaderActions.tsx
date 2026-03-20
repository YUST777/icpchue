"use client";

import { useState } from "react";
import {
    LayoutGrid,
    Settings,
    Flame,
    UserPlus,
    User,
} from "lucide-react";
import { TimerDropdown } from "./TimerDropdown";
import { SettingsModal } from "./SettingsModal";

export function HeaderActions() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="hidden md:flex items-center gap-1 shrink-0 text-white/60">
            <button
                className="w-9 h-8 flex items-center justify-center hover:bg-[#282828] rounded-md transition-colors"
                title="Layout"
            >
                <LayoutGrid size={17} />
            </button>
            <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-9 h-8 flex items-center justify-center hover:bg-[#282828] rounded-md transition-colors"
                title="Settings"
            >
                <Settings size={17} />
            </button>
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
            <div
                className="flex items-center gap-1.5 px-2.5 h-8 hover:bg-[#282828] rounded-md transition-colors cursor-pointer"
                title="Streak"
            >
                <Flame size={17} />
                <span className="text-sm font-medium">0</span>
            </div>

            {/* Timer/Session grouped block */}
            <div className="flex items-center rounded-md h-8 overflow-hidden ml-0.5 bg-[#282828]">
                <TimerDropdown />
                <div className="w-px h-full bg-white/10" />
                <button
                    className="w-9 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    title="Session"
                >
                    <UserPlus size={16} />
                </button>
            </div>

            <div className="ml-1.5 w-8 h-8 rounded-full bg-[#60A5FA] flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-white/20 transition-all overflow-hidden shrink-0">
                <User
                    size={20}
                    className="text-white mt-1.5"
                    strokeWidth={2.5}
                />
            </div>
        </div>
    );
}
