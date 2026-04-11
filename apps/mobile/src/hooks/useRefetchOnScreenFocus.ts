import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

/**
 * Refetches when this screen becomes focused (React Navigation).
 *
 * Use with TanStack `refetch` from `useQuery` / `useInfiniteQuery` when you want
 * the latest server data each time the user lands on the tab or returns from a
 * pushed screen. Does not invalidate cache globally—only triggers the query’s
 * refetch function.
 *
 * @example
 * const { refetch } = useFeedEntries();
 * useRefetchOnScreenFocus(refetch);
 */
export function useRefetchOnScreenFocus(refetch: () => unknown): void {
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
}
