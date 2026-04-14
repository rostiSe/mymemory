import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { AnimatedExpandSection } from "@/features/wiki/components/animation/AnimatedExpandSection";
import { AnimatedStaggerItem } from "@/features/wiki/components/animation/AnimatedStaggerItem";
import { InsightCard } from "@/features/wiki/components/InsightCard";
import { WikiLinkChip } from "@/features/wiki/components/WikiLinkChip";
import { SourceEntryChips } from "@/features/wiki/components/SourceEntryChips";
import type { TimelineContent } from "@/features/wiki/types";
import { WIKI_TIMELINE_DOT_SIZE_PX, WIKI_TIMELINE_RAIL_WIDTH_PX } from "@/theme/layout-imperative";
import { Card } from "heroui-native";
import { Text, View } from "react-native";

export type TimelineRendererProps = {
  content: TimelineContent;
};

export function TimelineRenderer({ content }: TimelineRendererProps) {
  return (
    <View className="gap-4">
      <View className="pl-1">
        {content.events.map((ev, i) => (
          <AnimatedStaggerItem key={`${ev.date}-${ev.title}-${i}`} index={i} enterDirection="left">
            <View className="mb-4 flex-row">
              <View className="mr-3 items-center">
                <View
                  className="rounded-full bg-accent"
                  style={{
                    width: WIKI_TIMELINE_DOT_SIZE_PX,
                    height: WIKI_TIMELINE_DOT_SIZE_PX,
                    marginTop: 6,
                  }}
                />
                {i < content.events.length - 1 ? (
                  <View
                    className="mt-1 flex-1 rounded-full bg-border"
                    style={{
                      width: WIKI_TIMELINE_RAIL_WIDTH_PX,
                      minHeight: 40,
                    }}
                  />
                ) : null}
              </View>
              <View className="flex-1">
                <Card className="rounded-lg border border-border p-0">
                  <Card.Body className="gap-2 px-card py-card">
                    {ev.date ? (
                      <Text className="text-muted text-xs font-medium" selectable>
                        {ev.date}
                      </Text>
                    ) : null}
                    <Text className="text-foreground text-base font-semibold" selectable>
                      {ev.title}
                    </Text>
                    <AnimatedExpandSection title="Details" defaultExpanded={ev.body.length < 400}>
                      <MarkdownRenderer markdown={ev.body} variant="body" />
                    </AnimatedExpandSection>
                    {ev.sourceEntryIds.length > 0 ? (
                      <SourceEntryChips entryIds={ev.sourceEntryIds} />
                    ) : null}
                    {ev.links.length > 0 ? (
                      <View className="flex-row flex-wrap gap-2">
                        {ev.links.map((link) => (
                          <WikiLinkChip key={`${link.pageId}-${link.label}`} {...link} />
                        ))}
                      </View>
                    ) : null}
                  </Card.Body>
                </Card>
              </View>
            </View>
          </AnimatedStaggerItem>
        ))}
      </View>

      {content.insights.length > 0 ? (
        <View className="gap-2">
          <Text className="text-foreground text-xs font-semibold uppercase tracking-wide">
            Insights
          </Text>
          {content.insights.map((line, i) => (
            <InsightCard key={`ti-${i}`} tone="insight" text={line} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
