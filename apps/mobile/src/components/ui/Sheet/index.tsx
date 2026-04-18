import { Button } from "@/components/ui/Button/index";
import type { ButtonTone } from "@/components/ui/Button/index.types";
import { BottomSheet } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { sheetFormVariants } from "./index.styles";

type SheetFormAction = {
  label: string;
  onPress: () => void;
  /** Render the primary action with this tone (default `primary`). */
  tone?: ButtonTone;
  loading?: boolean;
  isDisabled?: boolean;
};

export type SheetFormProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Form body — inputs, controls, summary text. */
  children?: ReactNode;
  /**
   * When `true` (default), the sheet dismisses after `primaryAction.onPress`.
   * Set `false` for async work that closes via `onOpenChange` from the parent
   * (e.g. create / save mutations).
   */
  closeOnPrimaryPress?: boolean;
  /** Required main action (`Save`, `Confirm`). */
  primaryAction: SheetFormAction;
  /**
   * Optional secondary action (`Cancel`). When provided, renders below the
   * primary action with `tone="ghost"` by default. Pressing `secondaryAction`
   * always closes the sheet on completion.
   */
  secondaryAction?: SheetFormAction;
  /**
   * Optional trigger node — wraps in `BottomSheet.Trigger` for uncontrolled
   * open. Omit when opening programmatically via `isOpen`.
   */
  trigger?: ReactNode;
};

/**
 * Standardized form-shaped bottom sheet — header (`title` + `description`),
 * arbitrary form `children`, and one or two action buttons.
 *
 * Composes HeroUI's `BottomSheet` directly (no duplicate sheet implementation).
 * For the destructive "title + description + 2 buttons" confirmation pattern,
 * keep using `components/ui/BottomSheet/index.tsx`.
 */
function SheetForm({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  closeOnPrimaryPress = true,
  primaryAction,
  secondaryAction,
  trigger,
}: SheetFormProps) {
  const styles = sheetFormVariants();

  const handlePrimary = () => {
    primaryAction.onPress();
    if (closeOnPrimaryPress) {
      onOpenChange(false);
    }
  };

  const handleSecondary = () => {
    secondaryAction?.onPress();
    onOpenChange(false);
  };

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      {trigger != null ? (
        <BottomSheet.Trigger asChild>{trigger}</BottomSheet.Trigger>
      ) : null}
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <View className={styles.header()}>
            <BottomSheet.Title className={styles.title()}>
              {title}
            </BottomSheet.Title>
            {description ? (
              <BottomSheet.Description className={styles.description()}>
                {description}
              </BottomSheet.Description>
            ) : null}
          </View>
          {children != null ? (
            <View className={styles.body()}>{children}</View>
          ) : null}
          <View className={styles.actions()}>
            {secondaryAction ? (
              <Button
                tone={secondaryAction.tone ?? "ghost"}
                isDisabled={secondaryAction.isDisabled}
                fullWidth
                onPress={handleSecondary}
              >
                {secondaryAction.label}
              </Button>
            ) : null}
            <Button
              tone={primaryAction.tone ?? "primary"}
              loading={primaryAction.loading}
              isDisabled={primaryAction.isDisabled}
              fullWidth
              onPress={handlePrimary}
            >
              {primaryAction.label}
            </Button>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

/**
 * `Sheet` namespace — single import, named slots attached as static props.
 * Today only `Sheet.Form` exists; future shapes (`Sheet.Picker`, `Sheet.Detail`)
 * land here. The icon-headed confirmation sheet is intentionally separate
 * (`@/components/ui/BottomSheet`) and not re-exported here to avoid a barrel.
 */
export const Sheet = {
  Form: SheetForm,
} as const;
