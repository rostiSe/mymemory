import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { AnimatedStaggerItem } from "@/features/wiki/components/animation/AnimatedStaggerItem";
import { SourceEntryChips } from "@/features/wiki/components/SourceEntryChips";
import type { ComparisonContent } from "@/features/wiki/types";
import { Card } from "heroui-native";
import { ScrollView, Text, View } from "react-native";

export type ComparisonRendererProps = {
  content: ComparisonContent;
};

export function ComparisonRenderer({ content }: ComparisonRendererProps) {
  const { items, criteria, matrix, verdict, sourceEntryIds } = content;

  return (
    <View className="gap-4">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View className="flex-row border-b border-border bg-surface-secondary">
            <View className="w-28 min-w-[100px] border-r border-border px-2 py-2">
              <Text className="text-muted text-xs font-semibold" selectable>
                Item
              </Text>
            </View>
            {criteria.map((c) => (
              <View
                key={c}
                className="min-w-[96px] max-w-[140px] border-r border-border px-2 py-2"
              >
                <Text className="text-foreground text-xs font-semibold" selectable>
                  {c}
                </Text>
              </View>
            ))}
          </View>
          {items.map((item, rowIndex) => (
            <AnimatedStaggerItem key={item.name} index={rowIndex} enterDirection="left">
              <View className="flex-row border-b border-border">
                <View className="w-28 min-w-[100px] justify-center border-r border-border px-2 py-2">
                  <Text className="text-foreground text-sm font-medium" selectable>
                    {item.name}
                  </Text>
                </View>
                {criteria.map((crit) => {
                  const cell =
                    matrix[item.name]?.[crit] ??
                    matrix[item.name]?.[crit.trim()] ??
                    "—";
                  return (
                    <View
                      key={`${item.name}-${crit}`}
                      className="min-w-[96px] max-w-[140px] justify-center border-r border-border px-2 py-2"
                    >
                      <Text className="text-foreground text-xs leading-5" selectable>
                        {cell}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </AnimatedStaggerItem>
          ))}
        </View>
      </ScrollView>

      {items.map((item, i) =>
        item.description.trim() ? (
          <AnimatedStaggerItem key={`desc-${item.name}`} index={i + items.length}>
            <View className="gap-1">
              <Text className="text-foreground text-sm font-semibold" selectable>
                {item.name}
              </Text>
              <MarkdownRenderer markdown={item.description} variant="body" />
            </View>
          </AnimatedStaggerItem>
        ) : null,
      )}

      {verdict.trim() ? (
        <Card className="rounded-lg border border-accent p-0">
          <Card.Body className="gap-2 px-card py-card">
            <Text className="text-foreground text-xs font-semibold uppercase tracking-wide">
              Verdict
            </Text>
            <MarkdownRenderer markdown={verdict} variant="body" />
          </Card.Body>
        </Card>
      ) : null}

      {sourceEntryIds.length > 0 ? <SourceEntryChips entryIds={sourceEntryIds} /> : null}
    </View>
  );
}
