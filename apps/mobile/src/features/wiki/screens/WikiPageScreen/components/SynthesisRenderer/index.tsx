import { AnimatedExpandSection } from "@/features/wiki/components/animation/AnimatedExpandSection";
import { InsightCard } from "@/features/wiki/components/InsightCard";
import { WikiSection } from "@/features/wiki/components/WikiSection";
import type { SynthesisContent } from "@/features/wiki/types";
import { Text, View } from "react-native";

export type SynthesisRendererProps = {
  content: SynthesisContent;
};

export function SynthesisRenderer({ content }: SynthesisRendererProps) {
  return (
    <View className="gap-1">
      {content.sections.map((section, i) => (
        <WikiSection key={section.id} section={section} index={i} />
      ))}

      {content.insights.length > 0 ? (
        <AnimatedExpandSection title="Insights">
          <View className="gap-0">
            {content.insights.map((line, i) => (
              <InsightCard key={`in-${i}`} tone="insight" text={line} />
            ))}
          </View>
        </AnimatedExpandSection>
      ) : null}

      {content.contradictions.length > 0 ? (
        <AnimatedExpandSection title="Contradictions">
          <View className="gap-0">
            {content.contradictions.map((line, i) => (
              <InsightCard key={`co-${i}`} tone="contradiction" text={line} />
            ))}
          </View>
        </AnimatedExpandSection>
      ) : null}

      {content.openQuestions.length > 0 ? (
        <AnimatedExpandSection title="Open questions">
          <View className="gap-0">
            {content.openQuestions.map((line, i) => (
              <InsightCard key={`oq-${i}`} tone="question" text={line} />
            ))}
          </View>
        </AnimatedExpandSection>
      ) : null}

      {content.sections.length === 0 &&
      content.insights.length === 0 &&
      content.contradictions.length === 0 &&
      content.openQuestions.length === 0 ? (
        <Text className="text-muted text-sm" selectable>
          No structured sections yet for this page.
        </Text>
      ) : null}
    </View>
  );
}
