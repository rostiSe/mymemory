import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";
import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { storage } from "@/lib/mmkv";

function readMonotonicMarker(key: string): number {
  if (Platform.OS === "web") return 0;
  const raw = storage.getString(key);
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export type CrossSurfaceNudgeConfig = {
  /** MMKV key bumped by another JS root (e.g. ShareQuick). */
  mmkvKey: string;
  /** Called when the marker is newer than the last applied value while app is active. */
  onBump: (queryClient: QueryClient) => void;
  enabled?: boolean;
};

/**
 * When another surface bumps an MMKV monotonic marker, run `onBump` after the app
 * becomes active so TanStack Query reflects cross-root mutations.
 */
export function useCrossSurfaceNudge(config: CrossSurfaceNudgeConfig): void {
  const { mmkvKey, onBump, enabled = true } = config;
  const queryClient = useQueryClient();
  const lastAppliedRef = useRef(0);

  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;

    const applyIfNeeded = (reason: AppStateStatus) => {
      if (reason !== "active") return;
      const at = readMonotonicMarker(mmkvKey);
      if (at > lastAppliedRef.current) {
        lastAppliedRef.current = at;
        onBump(queryClient);
      }
    };

    applyIfNeeded(AppState.currentState);

    const sub = AppState.addEventListener("change", (next) => {
      applyIfNeeded(next);
    });
    return () => sub.remove();
  }, [enabled, mmkvKey, onBump, queryClient]);
}
