import { Card } from "@/components/ui/Card/index";
import { CollapsibleClamp } from "@/components/ui/CollapsibleClamp";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { SkeletonGroup } from "heroui-native";
import { View } from "react-native";

type EntrySummarySectionProps = {
  summaryText: string;
  /** Shimmer body while summary is still being generated. */
  loading?: boolean;
  /** Pass entry id so expand/collapse state resets when navigating between entries. */
  contentKey?: string | number;
};

/**
 * Summary / TL;DR as markdown inside the canonical `Card` compound. Collapsible
 * when content exceeds a few lines.
 */
export function EntrySummarySection({
  summaryText,
  loading = false,
  contentKey,
}: EntrySummarySectionProps) {
  return (
    <View className="mb-4">
      <Card.Root tone="accent-soft" radius="lg">
        <Card.Header sectionLabel="Summary" />
        <Card.Body>
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
      </Card.Root>
    </View>
  );
}
