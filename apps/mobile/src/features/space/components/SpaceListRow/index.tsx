import type { useSpaces } from "@/features/space/hooks/useSpaces";
import { compileStatusDotClassName } from "@/features/space/utils/compileStatusDotClassName";
import { MaterialIcons } from "@expo/vector-icons";
import { Chip } from "heroui-native";
import { memo, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { spaceListRowVariants } from "./index.styles";

export type SpaceRow = NonNullable<ReturnType<typeof useSpaces>["data"]>[number];

/**
 * Hermes / some RN builds omit or break `Intl.RelativeTimeFormat` — use a tiny formatter instead.
 */
function formatCompiledAgo(iso: string | Date | undefined): string | null {
  if (iso === undefined) return null;
  const then = typeof iso === "string" ? new Date(iso) : iso;
  const ts = then.getTime();
  if (Number.isNaN(ts)) return null;

  const secAgo = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (secAgo < 45) return "just now";
  if (secAgo < 3600) {
    const m = Math.floor(secAgo / 60);
    return `${m}m ago`;
  }
  if (secAgo < 86400) {
    const h = Math.floor(secAgo / 3600);
    return `${h}h ago`;
  }
  if (secAgo < 604800) {
    const d = Math.floor(secAgo / 86400);
    return `${d}d ago`;
  }
  const w = Math.floor(secAgo / 604800);
  return `${w}w ago`;
}

export const SpaceListRow = memo(function SpaceListRow({
  item,
  rowVariant,
  onPressSpace,
  mutedColor,
}: {
  item: SpaceRow;
  rowVariant: "default" | "child";
  onPressSpace: (id: string) => void;
  mutedColor: string;
}) {
  const origin = item.origin ?? "user";
  const compiledLabel = useMemo(
    () => formatCompiledAgo(item.lastCompiledAt ?? undefined),
    [item.lastCompiledAt],
  );
  const compileDot = compileStatusDotClassName({
    compilationStatus: item.compilationStatus,
    lastCompiledAt: item.lastCompiledAt,
  });
  const originLabel =
    origin === "user" ? "Your space" : "Agent-created space";

  return (
    <Pressable
      onPress={() => onPressSpace(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`Open space ${item.name}, ${item.entryCount} entries`}
    >
      <View className={spaceListRowVariants({ variant: rowVariant })}>
        <View className="flex-row items-center gap-2">
          <View className="size-1.5 rounded-card bg-accent shrink-0" />
          <Text
            className="text-foreground text-base font-semibold flex-1 min-w-0"
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <MaterialIcons name="chevron-right" size={20} color={mutedColor} />
        </View>

        <View className="mt-1 flex-row items-center gap-2 flex-wrap">
          <Chip
            size="sm"
            variant="soft"
            color="default"
            className="rounded-card"
          >
            <Chip.Label className="text-xs">
              {item.entryCount === 1 ? "1 entry" : `${item.entryCount} entries`}
            </Chip.Label>
          </Chip>
          <View
            className={`size-2 rounded-full ${compileDot}`}
            accessibilityLabel={`Compile status ${item.compilationStatus ?? "idle"}`}
          />
          {origin === "user" ? (
            <View
              className="size-2 rounded-full bg-accent"
              accessibilityLabel={originLabel}
            />
          ) : (
            <View
              className="size-2 rounded-full border border-accent bg-transparent"
              accessibilityLabel={originLabel}
            />
          )}
          {compiledLabel ? (
            <Text className="text-muted text-xs">{compiledLabel}</Text>
          ) : null}
        </View>

        {item.description ? (
          <Text className="text-muted text-sm mt-1" numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});
