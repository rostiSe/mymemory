import { Button as HeroButton, Spinner, useThemeColor } from "heroui-native";
import { isValidElement } from "react";
import {
  buttonRootVariants,
  TONE_TO_HEROUI_VARIANT,
  TONE_TO_SPINNER_COLOR,
} from "./index.styles";
import type { BaseButtonProps } from "./index.types";

export type ButtonProps = BaseButtonProps;

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
      accessibilityLabel={accessibilityLabel}
      className={buttonRootVariants({ fullWidth })}
    >
      {loading ? (
        <Spinner size="sm" color={spinnerColor} />
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
