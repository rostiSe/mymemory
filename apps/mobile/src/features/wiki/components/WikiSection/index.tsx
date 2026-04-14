import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { AnimatedStaggerItem } from "@/features/wiki/components/animation/AnimatedStaggerItem";
import { WikiLinkChip } from "@/features/wiki/components/WikiLinkChip";
import { SourceEntryChips } from "@/features/wiki/components/SourceEntryChips";
import { useWikiSectionLayoutHandler } from "@/features/wiki/wiki-section-layout-context";
import type { SynthesisSection } from "@/features/wiki/types";
import { Text, View } from "react-native";
import { wikiSectionVariants, type WikiSectionVariants } from "./index.styles";

export type WikiSectionProps = {
  section: SynthesisSection;
  index: number;
  tone?: WikiSectionVariants["tone"];
  onSectionLayout?: (sectionId: string, y: number) => void;
};

export function WikiSection({
  section,
  index,
  tone = "default",
  onSectionLayout,
}: WikiSectionProps) {
  const fromContext = useWikiSectionLayoutHandler();
  const layoutHandler = onSectionLayout ?? fromContext;

  return (
    <AnimatedStaggerItem index={index}>
      <View
        className={wikiSectionVariants({ tone })}
        onLayout={(e) => {
          layoutHandler?.(section.id, e.nativeEvent.layout.y);
        }}
      >
        <Text
          className="text-foreground mb-2 text-lg font-semibold"
          selectable
          accessibilityRole="header"
        >
          {section.title}
        </Text>
        <MarkdownRenderer markdown={section.body} variant="body" className="mb-3" />
        {section.sourceEntryIds.length > 0 ? (
          <View className="mb-3">
            <SourceEntryChips entryIds={section.sourceEntryIds} />
          </View>
        ) : null}
        {section.links.length > 0 ? (
          <View className="gap-2">
            <Text className="text-muted text-xs font-semibold uppercase tracking-wide">
              Related pages
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {section.links.map((link) => (
                <WikiLinkChip key={`${link.pageId}-${link.label}`} {...link} />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </AnimatedStaggerItem>
  );
}
