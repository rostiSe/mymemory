import { createMMKV } from "react-native-mmkv";
import type { StateStorage } from "zustand/middleware";

export const storage = createMMKV({ id: "mymemory-storage" });

export const zustandMMKVStorage: StateStorage = {
  getItem(name) {
    return storage.getString(name) ?? null;
  },
  setItem(name, value) {
    storage.set(name, value);
  },
  removeItem(name) {
    storage.remove(name);
  },
};
