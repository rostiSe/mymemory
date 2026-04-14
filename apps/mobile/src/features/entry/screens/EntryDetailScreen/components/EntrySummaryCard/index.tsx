import { CollapsibleClamp } from "@/components/ui/CollapsibleClamp";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { Card, SkeletonGroup } from "heroui-native";
import { Text, View } from "react-native";

type EntrySummaryCardProps = {
  summaryText: string;
  /** Shimmer body while summary is still being generated. */
  loading?: boolean;
  /** Pass entry id so expand/collapse state resets when navigating between entries. */
  contentKey?: string | number;
};

/**
 * Summary / TLDR as markdown inside a card. Collapsible when content exceeds a few lines.
 */
export function EntrySummaryCard({
  summaryText,
  loading = false,
  contentKey,
}: EntrySummaryCardProps) {
  return (
    <Card className="mb-4 rounded-lg p-0 border border-accent-soft">
      <Card.Body className="gap-2 px-card pt-card">
        <Text className="text-foreground text-xs font-semibold uppercase tracking-wide">
          Summary
        </Text>
        {loading ? (
          <SkeletonGroup className="py-2" isLoading variant="shimmer">
            <View className="gap-2">
              <SkeletonGroup.Item className="h-4 w-full rounded-md" />
              <SkeletonGroup.Item className="h-4 w-full rounded-md" />
              <SkeletonGroup.Item className="h-4 w-11/12 rounded-md" />
            </View>
          </SkeletonGroup>
        ) : (
          <CollapsibleClamp contentKey={contentKey} expandHint={summaryText}>
            <MarkdownRenderer
              variant="excerpt"
              markdown={summaryText}
              allowTrailingMargin={false}
            />
          </CollapsibleClamp>
        )}
      </Card.Body>
    </Card>
  );
}
