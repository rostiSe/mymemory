import { Card } from "@/components/ui/Card/index";
import type { SpaceCardData } from "@/components/ui/Card/index.types";
import { MaterialIcons } from "@expo/vector-icons";
import { Chip, useThemeColor } from "heroui-native";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { spaceCardVariants } from "./index.styles";

/**
 * Hermes-safe relative-time formatter — `Intl.RelativeTimeFormat` is missing on
 * some RN builds. Mirror of the function previously inlined in `SpaceListRow`.
 */
function formatCompiledAgo(iso: string | Date | null | undefined): string | null {
  if (iso == null) return null;
  const then = typeof iso === "string" ? new Date(iso) : iso;
  const ts = then.getTime();
  if (Number.isNaN(ts)) return null;

  const secAgo = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (secAgo < 45) return "just now";
  if (secAgo < 3600) return `${Math.floor(secAgo / 60)}m ago`;
  if (secAgo < 86400) return `${Math.floor(secAgo / 3600)}h ago`;
  if (secAgo < 604800) return `${Math.floor(secAgo / 86400)}d ago`;
  return `${Math.floor(secAgo / 604800)}w ago`;
}

function compileDotClassName(item: SpaceCardData): string {
  if (item.compilationStatus === "compiling") return "bg-warning";
  if (item.compilationStatus === "failed") return "bg-danger";
  if (item.compilationStatus === "idle" && item.lastCompiledAt) {
    return "bg-success";
  }
  return "bg-muted";
}

export type SpaceCardProps = {
  item: SpaceCardData;
  /** Optional shared-page count surfaced as a chip (used by RelatedSpaceCard). */
  sharedPageCount?: number;
  /** Indent for hierarchical lists (matches `SpaceListRow` `child` variant). */
  indent?: boolean;
  onPress?: (id: string) => void;
};

/**
 * Pre-built `SpaceCard` variant — consolidates `SpaceListRow` and
 * `RelatedSpaceCard` into a single shape. Pass `sharedPageCount` for the
 * "Related spaces" surface; omit it for a generic space row.
 */
export function SpaceCard({
  item,
  sharedPageCount,
  indent = false,
  onPress,
}: SpaceCardProps) {
  const styles = spaceCardVariants();
  const mutedColor = useThemeColor("muted");
  const origin = item.origin ?? "user";
  const originLabel =
    origin === "user" ? "Your space" : "Agent-created space";

  const compiledLabel = useMemo(
    () => formatCompiledAgo(item.lastCompiledAt),
    [item.lastCompiledAt],
  );

  const dotClass = compileDotClassName(item);

  const sharedLabel =
    sharedPageCount === undefined
      ? null
      : sharedPageCount === 1
        ? "1 shared"
        : `${sharedPageCount} shared`;

  const entriesLabel =
    item.entryCount === 1 ? "1 entry" : `${item.entryCount} entries`;

  return (
    <Card.Root
      tone="surface-secondary"
      radius="md"
      interactive={onPress != null}
      onPress={onPress != null ? () => onPress(item.id) : undefined}
      accessibilityLabel={`Open space ${item.name}, ${entriesLabel}`}
    >
      <Card.Body density={indent ? "compact" : "comfortable"}>
        <View className={styles.headerRow()}>
          <View className={styles.statusDot()} />
          <Text className={styles.title()} numberOfLines={1}>
            {item.name}
          </Text>
          <MaterialIcons name="chevron-right" size={20} color={mutedColor} />
        </View>

        <View className={styles.metaRow()}>
          <Chip
            size="sm"
            variant="soft"
            color={sharedLabel ? "accent" : "default"}
            className="rounded-card"
          >
            <Chip.Label className="text-xs">
              {sharedLabel ?? entriesLabel}
            </Chip.Label>
          </Chip>
          <View
            className={`${styles.chipDot()} ${dotClass}`}
            accessibilityLabel={`Compile status ${item.compilationStatus ?? "idle"}`}
          />
          <View
            className={
              origin === "user" ? styles.originUserDot() : styles.originAgentDot()
            }
            accessibilityLabel={originLabel}
          />
          {compiledLabel ? (
            <Text className={styles.metaText()}>{compiledLabel}</Text>
          ) : null}
        </View>

        {item.description ? (
          <Text className={styles.description()} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
      </Card.Body>
    </Card.Root>
  );
}
