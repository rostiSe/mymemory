import { focusManager } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * Maps React Native `AppState` to TanStack Query's `focusManager` so
 * `refetchOnWindowFocus` (default) runs when the app returns to the foreground.
 *
 * This does **not** invalidate queries globally — refetches only happen for
 * mounted queries that are stale. Prefer mutation-time invalidation / cache
 * updates (`applySuccessfulIngestToCache`, etc.) as the source of truth.
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/react-native#refetch-on-app-focus
 *
 * @description When the user comes back to the app, catch up with the server for queries we’re already showing, if they’re stale.
 */
export function useSyncReactQueryAppFocus(): void {
  useEffect(() => {
    focusManager.setFocused(AppState.currentState === "active");
    const sub = AppState.addEventListener(
      "change",
      (status: AppStateStatus) => {
        focusManager.setFocused(status === "active");
      },
    );
    return () => sub.remove();
  }, []);
}
