import { compileStatusDotClassName } from "@/features/space/utils/compileStatusDotClassName";
import type { RelatedSpace } from "@mymemory/shared/contracts";
import { Chip } from "heroui-native";
import type { FC } from "react";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { relatedSpaceCardVariants } from "./index.styles";

export type RelatedSpaceCardProps = {
  item: RelatedSpace;
  onPress: (spaceId: string) => void;
};

const RelatedSpaceCardInner: FC<RelatedSpaceCardProps> = function RelatedSpaceCardInner({
  item,
  onPress,
}) {
  const { space, sharedPageCount } = item;
  const compileDot = compileStatusDotClassName(space);
  const sharedLabel =
    sharedPageCount === 1 ? "1 shared" : `${sharedPageCount} shared`;

  return (
    <Pressable
      onPress={() => onPress(space.id)}
      accessibilityRole="button"
      accessibilityLabel={`Open related space ${space.name}, ${sharedPageCount} shared pages`}
    >
      <View className={relatedSpaceCardVariants()}>
        <View className="flex-row items-center gap-2">
          <View className="size-6 shrink-0 rounded-card bg-accent" />
          <Text
            className="text-foreground flex-1 min-w-0 text-sm font-semibold"
            numberOfLines={1}
          >
            {space.name}
          </Text>
        </View>
        <View className="mt-2 flex-row items-center gap-2">
          <Chip
            size="sm"
            variant="soft"
            color="accent"
            className="rounded-card"
          >
            <Chip.Label className="text-xs">{sharedLabel}</Chip.Label>
          </Chip>
          <View
            className={`size-2 rounded-full ${compileDot}`}
            accessibilityLabel={`Compile status ${space.compilationStatus ?? "idle"}`}
          />
        </View>
      </View>
    </Pressable>
  );
};

export const RelatedSpaceCard = memo(RelatedSpaceCardInner) as typeof RelatedSpaceCardInner;
