import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { Text, View } from "react-native";
import { insightCardVariants, type InsightCardVariants } from "./index.styles";

const ICONS: Record<NonNullable<InsightCardVariants["tone"]>, keyof typeof Ionicons.glyphMap> =
  {
    insight: "bulb-outline",
    contradiction: "alert-circle-outline",
    question: "help-circle-outline",
  };

export type InsightCardProps = {
  tone: NonNullable<InsightCardVariants["tone"]>;
  text: string;
};

export function InsightCard({ tone, text }: InsightCardProps) {
  const muted = useThemeColor("muted");
  const accent = useThemeColor("accent");
  const warning = useThemeColor("warning");

  const iconColor =
    tone === "insight" ? accent : tone === "contradiction" ? warning : muted;

  return (
    <View className={insightCardVariants({ tone })}>
      <View className="flex-row gap-2">
        <Ionicons name={ICONS[tone]} size={18} color={iconColor} />
        <Text className="text-foreground flex-1 text-sm leading-5" selectable>
          {text}
        </Text>
      </View>
    </View>
  );
}
