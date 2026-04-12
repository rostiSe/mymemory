import { EntryDeleteConfirmSheet } from "@/features/entry/components/EntryDeleteConfirmSheet";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { Pressable, Text, View } from "react-native";

export type EntryDetailHeaderProps = {
  title: string;
  subtitle: string;
  metaLine: string;
  isFavorited: boolean;
  isPinned: boolean;
  /** When false, favorite/pin are hidden (e.g. entry still processing). */
  showFavoritePin: boolean;
  onToggleFavorite: () => void;
  onTogglePin: () => void;
  onConfirmDelete: () => void;
};

/**
 * Title row + optional favorite/pin/more actions + subtitle + compact meta.
 * Delete uses a bottom sheet (HeroUI) instead of a system alert.
 */
export function EntryDetailHeader({
  title,
  subtitle,
  metaLine,
  isFavorited,
  isPinned,
  showFavoritePin,
  onToggleFavorite,
  onTogglePin,
  onConfirmDelete,
}: EntryDetailHeaderProps) {
  const mutedColor = useThemeColor("muted");
  const accentColor = useThemeColor("accent");
  const dangerColor = useThemeColor("danger");

  return (
    <View className="gap-1 pb-4">
      <View className="flex-row items-start justify-between gap-2">
        <Text
          className="text-foreground min-w-0 flex-1 text-2xl font-bold"
          numberOfLines={3}
        >
          {title}
        </Text>
        <View className="flex-row items-center gap-2">
          {showFavoritePin ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  isFavorited ? "Remove from favorites" : "Add to favorites"
                }
                onPress={onToggleFavorite}
                hitSlop={8}
              >
                <MaterialIcons
                  name={isFavorited ? "favorite" : "favorite-border"}
                  size={22}
                  color={isFavorited ? dangerColor : mutedColor}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isPinned ? "Unpin entry" : "Pin entry"}
                onPress={onTogglePin}
                hitSlop={8}
              >
                <MaterialIcons
                  name="push-pin"
                  size={22}
                  color={isPinned ? accentColor : mutedColor}
                />
              </Pressable>
            </>
          ) : null}
          <EntryDeleteConfirmSheet onConfirmDelete={onConfirmDelete}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="More actions — delete entry"
              hitSlop={8}
            >
              <MaterialIcons name="more-vert" size={22} color={mutedColor} />
            </Pressable>
          </EntryDeleteConfirmSheet>
        </View>
      </View>
      {!!subtitle && (
        <Text className="text-muted text-base" numberOfLines={2}>
          {subtitle}
        </Text>
      )}
      <Text className="text-muted text-sm" numberOfLines={2}>
        {metaLine}
      </Text>
    </View>
  );
}
