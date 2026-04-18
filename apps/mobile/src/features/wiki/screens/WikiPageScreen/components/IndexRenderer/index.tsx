import { AnimatedPressScale } from "@/features/wiki/components/animation/AnimatedPressScale";
import { AnimatedStaggerItem } from "@/features/wiki/components/animation/AnimatedStaggerItem";
import type { IndexContent } from "@/features/wiki/types";
import { useRouter } from "expo-router";
import { Badge } from "@/components/ui/Badge/index";
import { Card } from "heroui-native";
import { Text, View } from "react-native";

export type IndexRendererProps = {
  content: IndexContent;
};

export function IndexRenderer({ content }: IndexRendererProps) {
  const router = useRouter();
  const mid = Math.floor(content.spaces.length / 2);

  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <Card className="flex-1 rounded-lg border border-border p-0">
          <Card.Body className="px-card py-card">
            <Text className="text-muted text-xs font-semibold uppercase">Pages</Text>
            <Text
              className="text-foreground text-2xl font-bold"
              style={{ fontVariant: ["tabular-nums"] }}
              selectable
            >
              {content.totalPages}
            </Text>
          </Card.Body>
        </Card>
        <Card className="flex-1 rounded-lg border border-border p-0">
          <Card.Body className="px-card py-card">
            <Text className="text-muted text-xs font-semibold uppercase">Entries</Text>
            <Text
              className="text-foreground text-2xl font-bold"
              style={{ fontVariant: ["tabular-nums"] }}
              selectable
            >
              {content.totalEntries}
            </Text>
          </Card.Body>
        </Card>
      </View>

      {content.lastCompiled ? (
        <Text className="text-muted text-xs" selectable>
          Last compiled: {content.lastCompiled}
        </Text>
      ) : null}

      <View className="gap-3">
        {content.spaces.map((space, i) => {
          const distance = Math.abs(i - mid);
          return (
            <AnimatedStaggerItem key={space.spaceId} index={distance}>
              <AnimatedPressScale
                onPress={() =>
                  router.push({
                    pathname: "/space/[id]",
                    params: { id: space.spaceId },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`Open space ${space.name}`}
              >
                <Card className="rounded-lg border border-border p-0">
                  <Card.Body className="gap-2 px-card py-card">
                    <Text className="text-foreground text-base font-semibold" selectable>
                      {space.name}
                    </Text>
                    {space.summary ? (
                      <Text className="text-muted text-sm leading-5" numberOfLines={2} selectable>
                        {space.summary}
                      </Text>
                    ) : null}
                    <View className="mt-1 flex-row flex-wrap gap-2">
                      <Badge tone="neutral" size="sm">
                        {space.pageCount} pages
                      </Badge>
                      <Badge tone="accent" size="sm">
                        {space.entryCount} entries
                      </Badge>
                    </View>
                  </Card.Body>
                </Card>
              </AnimatedPressScale>
            </AnimatedStaggerItem>
          );
        })}
      </View>

      {content.spaces.length === 0 ? (
        <Text className="text-muted text-sm" selectable>
          Index has no spaces yet.
        </Text>
      ) : null}
    </View>
  );
}
