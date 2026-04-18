import { Chip, cn } from "heroui-native";
import { isValidElement } from "react";
import { badgeLabelVariants, toneToHeroChip } from "./index.styles";
import type { BadgeProps } from "./index.types";

export type { BadgeProps, BadgeSize, BadgeTone } from "./index.types";

/**
 * Semantic capsule labels built on HeroUI `Chip`. Use **`tone`** instead of raw
 * `variant` / `color` so tags, topics, and wiki metadata stay visually consistent.
 */
export function Badge({
  tone = "neutral",
  selected,
  size = "sm",
  children,
  disabled = false,
  className,
  labelClassName,
  numberOfLines,
  accessibilityLabel,
  onPress,
  accessibilityRole,
}: BadgeProps) {
  const { variant, color } = toneToHeroChip(tone, selected);
  const labelClass = badgeLabelVariants({
    size,
    class: labelClassName,
  });

  const renderLabel = () => {
    if (children == null) return null;
    if (typeof children === "string" || typeof children === "number") {
      return (
        <Chip.Label className={labelClass} numberOfLines={numberOfLines}>
          {children}
        </Chip.Label>
      );
    }
    if (isValidElement(children)) return children;
    return (
      <Chip.Label
        className={cn(labelClass, "rounded-none")}
        numberOfLines={numberOfLines}
      >
        {String(children)}
      </Chip.Label>
    );
  };

  return (
    <Chip
      variant={variant}
      color={color}
      size={size}
      disabled={disabled}
      onPress={onPress}
      className={cn("rounded-md px-2", className)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
    >
      {renderLabel()}
    </Chip>
  );
}
