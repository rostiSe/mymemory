import type { StatusCardProps as StatusCardPropsType } from "@/components/ui/Card/index.types";
import { isValidElement } from "react";
import { Text, View } from "react-native";
import { statusCardVariants } from "./index.styles";

export type StatusCardProps = StatusCardPropsType;

/**
 * Pre-built status card — eyebrow + title + description + optional action /
 * meta row. Replaces the `mb-4 rounded-lg border` panel currently inlined in
 * `CompileStatusCard`. Tone maps to the same border/background palette
 * (`neutral` | `success` | `accent` | `danger`).
 */
export function StatusCard({
  tone,
  eyebrow,
  title,
  description,
  action,
  meta,
}: StatusCardProps) {
  const styles = statusCardVariants({ tone });

  return (
    <View className={styles.root()}>
      {eyebrow ? <Text className={styles.eyebrow()}>{eyebrow}</Text> : null}
      {title != null && title.length > 0 ? (
        <Text className={styles.title()}>{title}</Text>
      ) : null}
      {description != null ? (
        typeof description === "string" || typeof description === "number" ? (
          <Text className={styles.description()}>{description}</Text>
        ) : isValidElement(description) ? (
          description
        ) : (
          <Text className={styles.description()}>{String(description)}</Text>
        )
      ) : null}
      {meta ? <View className={styles.metaRow()}>{meta}</View> : null}
      {action ? <View className={styles.actionRow()}>{action}</View> : null}
    </View>
  );
}
