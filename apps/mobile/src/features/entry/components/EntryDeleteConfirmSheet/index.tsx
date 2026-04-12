import BottomSheetComponent from "@/components/ui/BottomSheet";
import type { ReactNode } from "react";

export type EntryDeleteConfirmSheetProps = {
  onConfirmDelete: () => void;
  /** Wrapped as the bottom sheet trigger when using uncontrolled open (e.g. header overflow). */
  children?: ReactNode;
  /** Controlled open; omit with `children` for trigger-driven open. */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Shared destructive confirmation for deleting an entry (feed swipe + entry detail overflow).
 */
export function EntryDeleteConfirmSheet({
  onConfirmDelete,
  children,
  isOpen,
  onOpenChange,
}: EntryDeleteConfirmSheetProps) {
  return (
    <BottomSheetComponent
      tone="danger"
      title="Delete this entry?"
      description="This cannot be undone."
      primaryButtonLabel="Delete"
      secondaryButtonLabel="Cancel"
      onPrimaryButtonPress={onConfirmDelete}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      {children}
    </BottomSheetComponent>
  );
}
