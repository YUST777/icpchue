'use client';

import { useState, useCallback } from 'react';

export function useWhiteboardAPI() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [api, setApi] = useState<any>(null);

    const resetScene = useCallback(() => {
        if (api) {
            api.resetScene();
        }
    }, [api]);

    const updateScene = useCallback((data: any) => {
        if (api && data) {
            api.updateScene(data);
        }
    }, [api]);

    const handleExport = useCallback(async () => {
        if (!api) return;

        try {
            const { exportToBlob } = await import("@excalidraw/excalidraw");

            const blob = await exportToBlob({
                elements: api.getSceneElements(),
                mimeType: "image/png",
                appState: {
                    ...api.getAppState(),
                    theme: "dark",
                    exportWithBlurryLogo: false,
                    exportBackground: true,
                    viewBackgroundColor: "#0B0B0C" // Match dashboard theme
                },
                files: api.getFiles(),
            });

            if (blob) {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `whiteboard-${new Date().getTime()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error("Failed to export whiteboard:", error);
        }
    }, [api]);

    return {
        api,
        setApi,
        resetScene,
        updateScene,
        handleExport
    };
}
