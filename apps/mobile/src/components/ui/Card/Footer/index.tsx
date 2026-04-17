import type { ReactNode } from "react";
import { View } from "react-native";
import { cardFooterVariants, type CardFooterVariants } from "./index.styles";

export type CardFooterProps = CardFooterVariants & {
  children: ReactNode;
};

/** Card footer — actions, meta. Defaults to a left-aligned flex row. */
export function CardFooter({ children, density, justify }: CardFooterProps) {
  return (
    <View className={cardFooterVariants({ density, justify })}>{children}</View>
  );
}
