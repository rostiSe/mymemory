import { cn } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { cardBodyVariants, type CardBodyVariants } from "./index.styles";

export type CardBodyProps = CardBodyVariants & {
  children: ReactNode;
  className?: string;
};

/** Card content area — sits between optional `Card.Header` / `Card.Footer`. */
export function CardBody({ children, density, className }: CardBodyProps) {
  return (
    <View className={cn(cardBodyVariants({ density }), className)}>
      {children}
    </View>
  );
}
