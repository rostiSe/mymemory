import { PressableFeedback } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { CardBody } from "./Body/index";
import { CardCover } from "./Cover/index";
import { CardFooter } from "./Footer/index";
import { CardHeader } from "./Header/index";
import { cardRootVariants, type CardRootVariants } from "./index.styles";

export type CardRootProps = CardRootVariants & {
  children: ReactNode;
  /** When `interactive`, fires on press. Wraps the card in `PressableFeedback`. */
  onPress?: () => void;
  /** Accessibility label when interactive. */
  accessibilityLabel?: string;
};

/**
 * Card root container.
 *
 * Compound API — sub-parts attach as static properties so consumers do a single
 * import: `Card.Root` / `Card.Cover` / `Card.Header` / `Card.Body` / `Card.Footer`.
 *
 * ```tsx
 * <Card.Root tone="accent-soft" interactive onPress={open}>
 *   <Card.Cover source={uri} aspect="16/9" />
 *   <Card.Header title="Hello" eyebrow="Note" />
 *   <Card.Body>{children}</Card.Body>
 *   <Card.Footer><Chip>Tag</Chip></Card.Footer>
 * </Card.Root>
 * ```
 *
 * For repeated layouts use a pre-built variant under `./variants/` instead.
 */
function CardRoot({
  children,
  tone,
  radius,
  interactive,
  onPress,
  accessibilityLabel,
}: CardRootProps) {
  const className = cardRootVariants({ tone, radius, interactive });

  if (interactive && onPress) {
    return (
      <PressableFeedback
        className={className}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <PressableFeedback.Ripple className="overflow-hidden" />
        {children}
      </PressableFeedback>
    );
  }

  return <View className={className}>{children}</View>;
}

/**
 * `Card` namespace — single import, compound parts attached as static props.
 * Not a barrel re-export; `Card.Root` is the only entry, sub-parts ship from
 * the same module.
 */
export const Card = {
  Root: CardRoot,
  Cover: CardCover,
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
} as const;
