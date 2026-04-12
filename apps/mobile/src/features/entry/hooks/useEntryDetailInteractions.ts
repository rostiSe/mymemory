import {
  useDeleteEntry,
  useRetryIngest,
  useSetReviewStatus,
  useToggleEntryField,
} from "@/features/entry/hooks/useEntryMutations";
import type { EntryDetailRow } from "@/features/entry/types";
import { useRouter } from "expo-router";
import { useCallback } from "react";

export type EntryReviewStatus = EntryDetailRow["reviewStatus"];

export function useEntryDetailInteractions(entry: EntryDetailRow | undefined): {
  handleToggleFavorite: () => void;
  handleTogglePin: () => void;
  handleSetReviewStatus: (status: EntryReviewStatus) => void;
  handleRetryIngest: () => void;
  /** Confirms delete in UI (sheet/dialog); closes before navigating back. */
  handleConfirmDelete: () => void;
} {
  const router = useRouter();
  const toggleField = useToggleEntryField();
  const setReviewStatus = useSetReviewStatus();
  const retryIngest = useRetryIngest();
  const deleteEntry = useDeleteEntry();

  const handleToggleFavorite = useCallback(() => {
    if (!entry) return;
    toggleField.mutate({
      id: entry.id,
      field: "isFavorited",
      value: !entry.isFavorited,
    });
  }, [entry, toggleField]);

  const handleTogglePin = useCallback(() => {
    if (!entry) return;
    toggleField.mutate({
      id: entry.id,
      field: "isPinned",
      value: !entry.isPinned,
    });
  }, [entry, toggleField]);

  const handleSetReviewStatus = useCallback(
    (status: EntryReviewStatus) => {
      if (!entry) return;
      const next = entry.reviewStatus === status ? "unreviewed" : status;
      setReviewStatus.mutate({ id: entry.id, status: next });
    },
    [entry, setReviewStatus],
  );

  const handleRetryIngest = useCallback(() => {
    if (!entry) return;
    retryIngest.mutate({ id: entry.id });
  }, [entry, retryIngest]);

  const handleConfirmDelete = useCallback(() => {
    if (!entry) return;
    deleteEntry.mutate({ id: entry.id });
    router.back();
  }, [entry, deleteEntry, router]);

  return {
    handleToggleFavorite,
    handleTogglePin,
    handleSetReviewStatus,
    handleRetryIngest,
    handleConfirmDelete,
  };
}
