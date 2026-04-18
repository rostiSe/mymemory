import { MaterialIcons } from "@expo/vector-icons";
import type { EntryListFilter } from "@mymemory/shared/contracts";
import { cn, TagGroup, useThemeColor } from "heroui-native";
import type { ComponentProps } from "react";
import { useCallback, useMemo } from "react";
import { ScrollView, View } from "react-native";

export type FeedFilterBarProps = {
  active: EntryListFilter;
  onChange: (filter: EntryListFilter) => void;
  className?: string;
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
 * Feed scope filters (server `entries.list`). HeroUI `TagGroup` single selection.
 */
export function FeedFilterBar({
  active,
  onChange,
  className,
}: FeedFilterBarProps) {
  const mutedColor = useThemeColor("muted");
  const accentSoftFg = useThemeColor("accent-soft-foreground");

  const selectedKeys = useMemo(
    () => new Set<EntryListFilter>([active]),
    [active],
  );

  const onSelectionChange = useCallback(
    (keys: Set<string | number>) => {
      const first = keys.values().next().value;
      if (typeof first === "string") {
        onChange(first as EntryListFilter);
      }
    },
    [onChange],
  );

  return (
    <View className={cn("pb-2 w-full", className)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-12"
        contentContainerClassName="flex-row items-center gap-2 px-screen"
      >
        <TagGroup
          selectionMode="single"
          selectedKeys={selectedKeys}
          onSelectionChange={onSelectionChange}
          size="sm"
          variant="surface"
          className="flex-row"
        >
          <TagGroup.List className="flex-row flex-nowrap gap-2">
            {FILTERS.map(({ id, label, icon }) => (
              <TagGroup.Item
                key={id}
                id={id}
                className="rounded-md min-w-14 h-8"
                accessibilityLabel={label}
              >
                {({ isSelected }) => (
                  <>
                    {icon ? (
                      <MaterialIcons
                        name={icon}
                        size={14}
                        color={isSelected ? accentSoftFg : mutedColor}
                      />
                    ) : null}
                    <TagGroup.ItemLabel className="text-xs font-medium">
                      {label}
                    </TagGroup.ItemLabel>
                  </>
                )}
              </TagGroup.Item>
            ))}
          </TagGroup.List>
        </TagGroup>
      </ScrollView>
    </View>
  );
}
