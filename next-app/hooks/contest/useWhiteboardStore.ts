import { create } from 'zustand';

interface WhiteboardState {
    isExpanded: boolean;
    height: number;
    toggleExpanded: () => void;
    setHeight: (height: number) => void;
}

export const useWhiteboardStore = create<WhiteboardState>((set) => ({
    isExpanded: false,
    height: 400,
    toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),
    setHeight: (height) => set({ height }),
}));
