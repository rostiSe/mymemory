import { Button, Dialog } from "heroui-native";
import { useCallback, useState, type ReactNode } from "react";
import { View } from "react-native";

export type ConfirmDialogProps = {
  children: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Runs when the user confirms; the dialog closes afterward. */
  onConfirm: () => void;
  /** Controlled open state; omit for uncontrolled (trigger-only) usage. */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function ConfirmDialog({
  children,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  isOpen: isOpenControlled,
  onOpenChange,
}: ConfirmDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = isOpenControlled !== undefined;
  const isOpen = isControlled ? isOpenControlled : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const handleConfirm = useCallback(() => {
    onConfirm();
    setOpen(false);
  }, [onConfirm, setOpen]);

  const handleCancel = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  return (
    <Dialog isOpen={isOpen} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Close variant="ghost" />
          <View className="mb-5 gap-1.5">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Description>{description}</Dialog.Description>
          </View>
          <View className="flex-row justify-end gap-3">
            <Button variant="ghost" size="sm" onPress={handleCancel}>
              {cancelLabel}
            </Button>
            <Button size="sm" onPress={handleConfirm}>
              {confirmLabel}
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
