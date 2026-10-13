import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EditorSettings {
    fontFamily: string;
    fontSize: number;
    fontLigatures: boolean;
    tabSize: number;
    wordWrap: 'on' | 'off';
    lineNumbers: 'on' | 'relative';
    /** Confetti when Codeforces confirms an Accepted. */
    celebrateAccepted: boolean;
    celebrationSound: boolean;
}

interface EditorStore extends EditorSettings {
    setSetting: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void;
}

export const useEditorStore = create<EditorStore>()(
    persist(
        (set) => ({
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            fontLigatures: true,
            tabSize: 4,
            wordWrap: 'off',
            lineNumbers: 'on',
            celebrateAccepted: true,
            celebrationSound: true,

            setSetting: (key, value) => set((state) => ({ ...state, [key]: value })),
        }),
        {
            name: 'verdict-editor-settings',
        }
    )
);
