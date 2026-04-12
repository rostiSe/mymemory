import { Card } from "heroui-native";
import { Text, View } from "react-native";

type EntryKeyPointsSectionProps = {
  keyPoints: string[];
  contentKey?: string;
};

/**
 * Bullet list of AI key takeaways — only rendered when `keyPoints` is non-empty.
 */
export function EntryKeyPointsSection({
  keyPoints,
  contentKey,
}: EntryKeyPointsSectionProps) {
  if (!keyPoints.length) return null;

  return (
    <Card className="mb-4 rounded-lg border border-border p-0">
      <Card.Body className="gap-2 px-card py-card">
        <Text className="text-foreground text-xs font-semibold uppercase tracking-wide">
          Key takeaways
        </Text>
        <View className="gap-2">
          {keyPoints.map((point, i) => (
            <View key={`${contentKey ?? "kp"}-${i}`} className="flex-row gap-2">
              <Text className="text-muted text-sm">•</Text>
              <Text className="text-foreground flex-1 text-sm leading-5">
                {point}
              </Text>
            </View>
          ))}
        </View>
      </Card.Body>
    </Card>
  );
}
