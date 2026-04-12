import type { EntryListFilter } from "@mymemory/shared/contracts";
import { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { ScrollView, View } from "react-native";
import { Chip, useThemeColor } from "heroui-native";

export type FeedFilterBarProps = {
  active: EntryListFilter;
  onChange: (filter: EntryListFilter) => void;
};

type FilterDef = {
  id: EntryListFilter;
  label: string;
  icon?: ComponentProps<typeof MaterialIcons>["name"];
};

const FILTERS: FilterDef[] = [
  { id: "all", label: "All" },
  { id: "favorites", label: "Favorites", icon: "favorite" },
  { id: "pinned", label: "Pinned", icon: "push-pin" },
  { id: "to-review", label: "To review" },
];

/**
 * Horizontal filter chips for the entries feed (server-side `entries.list` filter).
 */
export function FeedFilterBar({ active, onChange }: FeedFilterBarProps) {
  const accentFg = useThemeColor("accent-foreground");
  const mutedColor = useThemeColor("muted");

  return (
    <View className="pb-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-12"
        contentContainerClassName="flex-row items-center gap-2 px-screen"
      >
        {FILTERS.map(({ id, label, icon }) => {
          const isActive = active === id;
          const iconColor = isActive ? accentFg : mutedColor;
          return (
            <Chip
              key={id}
              size="sm"
              variant={isActive ? "primary" : "secondary"}
              color={isActive ? "accent" : "default"}
              onPress={() => onChange(id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              className="shrink-0"
            >
              {icon ? (
                <MaterialIcons name={icon} size={14} color={iconColor} />
              ) : null}
              <Chip.Label className="text-xs font-medium">{label}</Chip.Label>
            </Chip>
          );
        })}
      </ScrollView>
    </View>
  );
}
