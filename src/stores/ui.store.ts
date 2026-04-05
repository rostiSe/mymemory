import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandMMKVStorage } from "@/lib/mmkv";
import { Uniwind } from "uniwind";

export type ThemeMode = "light" | "dark" | "system";

export type SearchFilters = {
  type?: string;
  spaceId?: string;
  isReviewed?: boolean;
};

export type UIState = {
  theme: ThemeMode;
  searchFilters: SearchFilters;
  activeTab: string;
  feedScrollPosition: number;
  draftNote: string;
  shareIntentData: string | null;
};

export type UIActions = {
  setTheme: (theme: ThemeMode) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  setActiveTab: (tab: string) => void;
  setFeedScrollPosition: (position: number) => void;
  setDraftNote: (note: string) => void;
  setShareIntentData: (data: string | null) => void;
};

export type UIStore = UIState & UIActions;

export const createUIStore = () =>
  createStore<UIStore>()(
    persist(
      (set) => ({
        theme: "system",
        searchFilters: {},
        activeTab: "feed",
        feedScrollPosition: 0,
        draftNote: "",
        shareIntentData: null,

        setTheme: (theme) => {
          Uniwind.setTheme(theme);
          set({ theme });
        },
        setSearchFilters: (searchFilters) => set({ searchFilters }),
        setActiveTab: (activeTab) => set({ activeTab }),
        setFeedScrollPosition: (feedScrollPosition) =>
          set({ feedScrollPosition }),
        setDraftNote: (draftNote) => set({ draftNote }),
        setShareIntentData: (shareIntentData) => set({ shareIntentData }),
      }),
      {
        name: "ui-store",
        storage: createJSONStorage(() => zustandMMKVStorage),
        partialize: (state) => ({
          theme: state.theme,
          searchFilters: state.searchFilters,
          activeTab: state.activeTab,
        }),
      }
    )
  );
