import { create } from 'zustand';

interface UIState {
    isSearchOpen: boolean;
    setSearchOpen: (open: boolean) => void;
    toggleSearch: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    isSearchOpen: false,
    setSearchOpen: (open) => set({ isSearchOpen: open }),
    toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
}));
