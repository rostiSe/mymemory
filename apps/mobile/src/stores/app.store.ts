import { createStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '../lib/mmkv';

export interface AppState {
  isOnboarded: boolean;
  setIsOnboarded: (value: boolean) => void;
  // Add other global/template state here
}

// Use vanilla createStore for React Context integration
export const createAppStore = () => {
  return createStore<AppState>()(
    persist(
      (set) => ({
        isOnboarded: false,
        setIsOnboarded: (value) => set({ isOnboarded: value }),
      }),
      {
        name: 'app-storage', // unique name for MMKV key
        storage: createJSONStorage(() => zustandMMKVStorage),
      }
    )
  );
};

export type AppStore = ReturnType<typeof createAppStore>;
