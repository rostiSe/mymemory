import { MaterialIcons } from "@expo/vector-icons";
import { BottomSheet, Button, useThemeColor } from "heroui-native";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { View } from "react-native";

type BottomSheetTone = "default" | "danger";

type BottomSheetComponentProps = {
  /**
   * Trigger wrapped in `BottomSheet.Trigger`. Omit when the sheet is **controlled**
   * (`isOpen` / `onOpenChange`) and opened programmatically.
   */
  children?: ReactNode;
  title: string;
  description: string;
  primaryButtonLabel: string;
  secondaryButtonLabel: string;
  onPrimaryButtonPress: () => void;
  onSecondaryButtonPress?: () => void;
  /** Visual tone for icon + primary action (e.g. destructive delete). */
  tone?: BottomSheetTone;
  /** Controlled open state; omit for uncontrolled (trigger-only) usage. */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function BottomSheetComponent({
  title,
  description,
  primaryButtonLabel,
  secondaryButtonLabel,
  onPrimaryButtonPress,
  onSecondaryButtonPress,
  children,
  tone = "default",
  isOpen: isOpenControlled,
  onOpenChange,
}: BottomSheetComponentProps) {
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

  const handlePrimary = useCallback(() => {
    onPrimaryButtonPress();
    setOpen(false);
  }, [onPrimaryButtonPress, setOpen]);

  const handleSecondary = useCallback(() => {
    onSecondaryButtonPress?.();
    setOpen(false);
  }, [onSecondaryButtonPress, setOpen]);

  const iconWrapClass = tone === "danger" ? "bg-danger/10" : "bg-success/10";
  const dangerColor = useThemeColor("danger");
  const successColor = useThemeColor("success");
  const iconColor = tone === "danger" ? dangerColor : successColor;

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={setOpen}>
      {children != null ? (
        <BottomSheet.Trigger asChild>{children}</BottomSheet.Trigger>
      ) : null}
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <View className="items-center mb-5">
            <View
              className={`size-20 items-center justify-center rounded-full ${iconWrapClass}`}
            >
              <MaterialIcons
                name={tone === "danger" ? "delete" : "check"}
                size={22}
                color={iconColor}
              />
            </View>
          </View>
          <View className="mb-8 gap-2 items-center">
            <BottomSheet.Title className="text-center">
              {title}
            </BottomSheet.Title>
            <BottomSheet.Description className="text-center">
              {description}
            </BottomSheet.Description>
          </View>
          <View className="gap-3">
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              onPress={handlePrimary}
            >
              {primaryButtonLabel}
            </Button>
            <Button variant="tertiary" onPress={handleSecondary}>
              {secondaryButtonLabel}
            </Button>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
