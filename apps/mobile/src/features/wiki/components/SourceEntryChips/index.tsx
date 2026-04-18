import { Badge } from "@/components/ui/Badge/index";
import { isUuid } from "@/features/wiki/types";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";

const MAX_VISIBLE = 5;
const LABEL_LEN = 30;

function formatEntryLabel(id: string): string {
  if (id.length <= LABEL_LEN) return id;
  return `${id.slice(0, LABEL_LEN)}…`;
}

export type SourceEntryChipsProps = {
  entryIds: string[];
};

export function SourceEntryChips({ entryIds }: SourceEntryChipsProps) {
  const router = useRouter();
  if (!entryIds.length) return null;

  const visible = entryIds.slice(0, MAX_VISIBLE);
  const overflow = entryIds.length - visible.length;

  return (
    <View className="gap-2">
      <Text className="text-muted text-xs font-semibold uppercase tracking-wide">
        Sources
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-0.5">
        <View className="flex-row flex-wrap gap-2 px-0.5 pb-1">
          {visible.map((id) => {
            const valid = isUuid(id);
            const label = valid ? `Entry · ${id.slice(0, 8)}` : formatEntryLabel(id);
            if (!valid) {
              return (
                <Badge key={id} tone="neutral" size="sm" disabled>
                  {label}
                </Badge>
              );
            }
            return (
              <Badge
                key={id}
                tone="neutral"
                size="sm"
                onPress={() => router.push(`/entry/${id}`)}
                accessibilityRole="link"
                accessibilityLabel="Open source entry"
              >
                {label}
              </Badge>
            );
          })}
          {overflow > 0 ? (
            <Badge tone="neutral" size="sm" disabled>
              +{overflow} more
            </Badge>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
