import type { EntryCardData } from "@/components/ui/Card/index.types";
import { EntryDeleteConfirmSheet } from "@/features/entry/components/EntryDeleteConfirmSheet";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { Pressable, View } from "react-native";
import {
  entryHeaderActionsVariants,
  type EntryHeaderActionsVariants,
} from "./index.styles";

const ICON_DEFAULT = 22;
const ICON_COMPACT = 18;

export type EntryHeaderActionsProps = EntryHeaderActionsVariants & {
  isFavorited: boolean;
  isPinned: boolean;
  processedStatus?: EntryCardData["processedStatus"];
  onToggleFavorite: () => void;
  onTogglePin: () => void;
  onConfirmDelete?: () => void;
  /** Renders the overflow + delete confirmation (entry detail only). */
  showDelete?: boolean;
};

/**
 * Favorite, pin, and optional delete overflow — shared by entry detail hero
 * chrome and feed/search entry card cover overlays.
 */
export function EntryHeaderActions({
  isFavorited,
  isPinned,
  processedStatus,
  onToggleFavorite,
  onTogglePin,
  onConfirmDelete,
  showDelete = false,
  density = "default",
  surface = "inline",
}: EntryHeaderActionsProps) {
  const styles = entryHeaderActionsVariants({ density, surface });
  const mutedColor = useThemeColor("muted");
  const accentColor = useThemeColor("accent");
  const dangerColor = useThemeColor("danger");
  const iconSize = density === "compact" ? ICON_COMPACT : ICON_DEFAULT;

  const showFavoritePin = processedStatus === "done";

  return (
    <View className={styles.root()}>
      {showFavoritePin ? (
        <>
          <Pressable
            className={styles.hit()}
            accessibilityRole="button"
            accessibilityLabel={
              isFavorited ? "Remove from favorites" : "Add to favorites"
            }
            hitSlop={8}
            onPress={onToggleFavorite}
          >
            <MaterialIcons
              name={isFavorited ? "favorite" : "favorite-border"}
              size={iconSize}
              color={isFavorited ? dangerColor : mutedColor}
            />
          </Pressable>
          <Pressable
            className={styles.hit()}
            accessibilityRole="button"
            accessibilityLabel={isPinned ? "Unpin entry" : "Pin entry"}
            hitSlop={8}
            onPress={onTogglePin}
          >
            <MaterialIcons
              name="push-pin"
              size={iconSize}
              color={isPinned ? accentColor : mutedColor}
            />
          </Pressable>
        </>
      ) : null}
      {showDelete && onConfirmDelete != null ? (
        <EntryDeleteConfirmSheet onConfirmDelete={onConfirmDelete}>
          <Pressable
            className={styles.hit()}
            accessibilityRole="button"
            accessibilityLabel="More actions — delete entry"
            hitSlop={8}
          >
            <MaterialIcons name="more-vert" size={iconSize} color={mutedColor} />
          </Pressable>
        </EntryDeleteConfirmSheet>
      ) : null}
    </View>
  );
}
