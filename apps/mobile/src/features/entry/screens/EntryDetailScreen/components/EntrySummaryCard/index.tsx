import { Text } from "react-native";
import { Card } from "heroui-native";

type EntrySummaryCardProps = {
  summaryText: string;
};

/**
 * Short summary / TLDR (plain text). Card only — topics and tags live in separate sections.
 */
export function EntrySummaryCard({ summaryText }: EntrySummaryCardProps) {
  return (
    <Card className="mb-4">
      <Card.Body className="gap-2 p-4">
        <Text className="text-foreground text-xs font-semibold uppercase tracking-wide">
          Summary
        </Text>
        <Text className="text-foreground text-base leading-relaxed">
          {summaryText}
        </Text>
      </Card.Body>
    </Card>
  );
}
