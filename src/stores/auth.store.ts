import type { Session } from "@supabase/supabase-js";
import { createStore } from "zustand/vanilla";
import { supabase } from "@/lib/supabase";

export type AuthState = {
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

export type AuthActions = {
  initialize: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export type AuthStore = AuthState & AuthActions;

export const createAuthStore = () =>
  createStore<AuthStore>()((set) => ({
    session: null,
    isAuthenticated: false,
    isLoading: true,

    initialize: () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        set({
          session,
          isAuthenticated: !!session,
          isLoading: false,
        });
      });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          isAuthenticated: !!session,
        });
      });
    },

    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },

    signUp: async (email, password) => {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    },

    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  }));
