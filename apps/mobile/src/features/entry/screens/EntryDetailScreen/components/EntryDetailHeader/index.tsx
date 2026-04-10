import { Text, View } from "react-native";

export type EntryDetailHeaderProps = {
  title: string;
  subtitle: string;
  metaLine: string;
};

/**
 * Title row + secondary line + compact meta (type, date, URL hint).
 */
export function EntryDetailHeader({
  title,
  subtitle,
  metaLine,
}: EntryDetailHeaderProps) {
  return (
    <View className="gap-1 pb-4">
      <Text className="text-foreground text-2xl font-bold" numberOfLines={3}>
        {title}
      </Text>
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
