import { Button as HeroButton, Spinner, useThemeColor } from "heroui-native";
import { isValidElement, type ReactNode } from "react";
import { View } from "react-native";
import {
  buttonLoadingHiddenLabelVariants,
  buttonRootVariants,
  TONE_TO_HEROUI_VARIANT,
  TONE_TO_SPINNER_COLOR,
} from "./index.styles";
import type { BaseButtonProps } from "./index.types";

export type ButtonProps = BaseButtonProps;

function getPlainLabelString(children: ReactNode): string | undefined {
  if (children == null) return undefined;
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  return undefined;
}

/**
 * App-wrapped button. Locks the prop surface to `tone` / `size` / `leading` /
 * `trailing` / `loading` so call sites stay consistent and theme defaults
 * (from `theme/heroui.ts`) flow through HeroUI's CSS variables. No `className`
 * escape hatch — extend variants in `index.styles.ts` instead.
 *
 * For specialized buttons (e.g. `AnchorButton` that wraps `Link`), extend
 * {@link BaseButtonProps} from `./index.types` rather than re-exposing HeroUI.
 */
export function Button({
  tone = "primary",
  size = "md",
  leading,
  trailing,
  loading = false,
  isDisabled = false,
  fullWidth = false,
  onPress,
  accessibilityLabel,
  children,
}: ButtonProps) {
  const spinnerColor = useThemeColor(TONE_TO_SPINNER_COLOR[tone]);

  const plainLabel = getPlainLabelString(children);
  const resolvedLoadingAccessibilityLabel =
    accessibilityLabel ?? (plainLabel !== undefined ? plainLabel : undefined);
  const showVisuallyHiddenLabelWhileLoading =
    loading &&
    children != null &&
    resolvedLoadingAccessibilityLabel === undefined;

  const renderLabel = () => {
    if (children == null) return null;
    if (typeof children === "string" || typeof children === "number") {
      return <HeroButton.Label>{children}</HeroButton.Label>;
    }
    if (isValidElement(children)) return children;
    return <HeroButton.Label>{String(children)}</HeroButton.Label>;
  };

  return (
    <HeroButton
      variant={TONE_TO_HEROUI_VARIANT[tone]}
      size={size}
      isDisabled={isDisabled || loading}
      onPress={loading ? undefined : onPress}
      accessibilityLabel={
        loading
          ? showVisuallyHiddenLabelWhileLoading
            ? undefined
            : resolvedLoadingAccessibilityLabel
          : accessibilityLabel
      }
      className={buttonRootVariants({ fullWidth })}
    >
      {loading ? (
        <>
          {leading}
          <Spinner
            size="sm"
            color={spinnerColor}
            accessibilityElementsHidden
            aria-hidden={true}
            importantForAccessibility="no"
          />
          {showVisuallyHiddenLabelWhileLoading ? (
            <View className={buttonLoadingHiddenLabelVariants()}>
              {renderLabel()}
            </View>
          ) : null}
          {trailing}
        </>
      ) : (
        <>
          {leading}
          {renderLabel()}
          {trailing}
        </>
      )}
    </HeroButton>
  );
}
