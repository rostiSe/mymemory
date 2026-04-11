import { Text, View } from "react-native";
import { Card, SkeletonGroup } from "heroui-native";

type EntrySummaryCardProps = {
  summaryText: string;
  /** Shimmer body while summary is still being generated. */
  loading?: boolean;
};

/**
 * Short summary / TLDR (plain text). Card only — topics and tags live in separate sections.
 */
export function EntrySummaryCard({
  summaryText,
  loading = false,
}: EntrySummaryCardProps) {
  return (
    <Card className="mb-4">
      <Card.Body className="gap-2 p-4">
        <Text className="text-foreground text-xs font-semibold uppercase tracking-wide">
          Summary
        </Text>
        {loading ? (
          <SkeletonGroup isLoading variant="shimmer">
            <View className="gap-2">
              <SkeletonGroup.Item className="h-4 w-full rounded-md" />
              <SkeletonGroup.Item className="h-4 w-full rounded-md" />
              <SkeletonGroup.Item className="h-4 w-11/12 rounded-md" />
            </View>
          </SkeletonGroup>
        ) : (
          <Text className="text-foreground text-base leading-relaxed">
            {summaryText}
          </Text>
        )}
      </Card.Body>
    </Card>
  );
}
