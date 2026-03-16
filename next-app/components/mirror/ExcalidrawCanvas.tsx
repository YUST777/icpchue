'use client';

import { Excalidraw } from "@excalidraw/excalidraw";
import { MainMenu } from "@excalidraw/excalidraw";

interface ExcalidrawCanvasProps {
    apiRef: (api: any) => void;
    initialData: any;
    onChange: (elements: readonly any[], appState: any) => void;
}

export function ExcalidrawCanvas({ apiRef, initialData, onChange }: ExcalidrawCanvasProps) {
    return (
        <Excalidraw
            excalidrawAPI={apiRef}
            initialData={initialData}
            onChange={onChange}
            theme="dark"
            UIOptions={{
                canvasActions: {
                    saveAsImage: true,
                    loadScene: false,
                    export: false,
                    clearCanvas: false,
                },
            }}
        >
            <MainMenu>
                <MainMenu.DefaultItems.ClearCanvas />
                <MainMenu.DefaultItems.SaveAsImage />
                <MainMenu.DefaultItems.ChangeCanvasBackground />
            </MainMenu>
        </Excalidraw>
    );
}
