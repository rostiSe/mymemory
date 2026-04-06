import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY. " +
      "Copy .env.example to .env and fill in your Supabase credentials.",
  );
}

/**
 * SecureStore is native-only. Web SSR (Expo Router server render) runs in Node where
 * `getValueWithKeyAsync` is not available — use localStorage in the browser and no-op on the server.
 */
function createAuthStorage() {
  return {
    getItem: async (key: string): Promise<string | null> => {
      if (typeof window === "undefined") {
        return null;
      }
      if (Platform.OS === "web") {
        try {
          return window.localStorage.getItem(key);
        } catch {
          return null;
        }
      }
      return SecureStore.getItemAsync(key);
    },
    setItem: async (key: string, value: string): Promise<void> => {
      if (typeof window === "undefined") {
        return;
      }
      if (Platform.OS === "web") {
        window.localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    },
    removeItem: async (key: string): Promise<void> => {
      if (typeof window === "undefined") {
        return;
      }
      if (Platform.OS === "web") {
        window.localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    },
  };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createAuthStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
