import { create } from 'zustand';

interface AppState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedBookId: string | null;
  setSelectedBookId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  searchQuery: '',
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  selectedBookId: null,
  setSelectedBookId: (id: string | null) => set({ selectedBookId: id }),
}));
