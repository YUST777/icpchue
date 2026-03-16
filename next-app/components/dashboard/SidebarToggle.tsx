import React from 'react';

/**
 * Custom high-quality Sidebar Toggle Icon
 * Matches the aesthetic of PanelLeftClose/Open but with optimized SVG paths for crisp rendering.
 */
export function SidebarToggle({
    isOpen,
    className = "",
    size = 20,
    strokeWidth = 1.5,
    color = "currentColor"
}: {
    isOpen: boolean;
    className?: string;
    size?: number;
    strokeWidth?: number;
    color?: string;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            {/* Box definition */}
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />

            {/* Vertical Line */}
            <path d="M9 3v18" />

            {/* Arrow/Chevron */}
            {isOpen ? (
                // Pointing Left (Close Sidebar)
                <path d="m15 15-3-3 3-3" />
            ) : (
                // Pointing Right (Open Sidebar)
                <path d="m13 15 3-3-3-3" />
            )}
        </svg>
    );
}
