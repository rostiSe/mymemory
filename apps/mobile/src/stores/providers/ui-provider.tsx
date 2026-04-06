import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import { createUIStore, type UIStore } from "@/stores/ui.store";

type UIStoreApi = ReturnType<typeof createUIStore>;

const UIStoreContext = createContext<UIStoreApi | null>(null);

export function UIStoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<UIStoreApi>(null);
  if (!storeRef.current) {
    storeRef.current = createUIStore();
  }

  return (
    <UIStoreContext.Provider value={storeRef.current}>
      {children}
    </UIStoreContext.Provider>
  );
}

export function useUIStore<T>(selector: (state: UIStore) => T): T {
  const store = useContext(UIStoreContext);
  if (!store) {
    throw new Error("useUIStore must be used within UIStoreProvider");
  }
  return useStore(store, selector);
}
