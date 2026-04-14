import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { WikiLinkChip } from "@/features/wiki/components/WikiLinkChip";
import { SourceEntryChips } from "@/features/wiki/components/SourceEntryChips";
import type { GlossaryContent } from "@/features/wiki/types";
import { Accordion } from "heroui-native";
import { Text, View } from "react-native";

export type GlossaryRendererProps = {
  content: GlossaryContent;
};

function groupByLetter(terms: GlossaryContent["terms"]) {
  const sorted = [...terms].sort((a, b) =>
    a.term.localeCompare(b.term, undefined, { sensitivity: "base" }),
  );
  const groups = new Map<string, typeof sorted>();
  for (const t of sorted) {
    const letter = (t.term.trim().charAt(0) || "#").toUpperCase();
    const key = /[A-Z]/.test(letter) ? letter : "#";
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function GlossaryRenderer({ content }: GlossaryRendererProps) {
  const groups = groupByLetter(content.terms);

  return (
    <View className="gap-6">
      {groups.map(([letter, terms]) => (
        <View key={letter} className="gap-2">
          <Text className="text-muted text-xs font-bold uppercase tracking-widest" selectable>
            {letter}
          </Text>
          <Accordion selectionMode="single" isCollapsible defaultValue={undefined}>
            {terms.map((term, idx) => {
              const value = `${letter}-${idx}-${term.term}`;
              return (
                <Accordion.Item key={value} value={value}>
                  <Accordion.Trigger>
                    <Text className="text-foreground flex-1 pr-2 font-semibold" selectable>
                      {term.term}
                    </Text>
                    <Accordion.Indicator />
                  </Accordion.Trigger>
                  <Accordion.Content>
                    <View className="gap-3 pb-2">
                      <MarkdownRenderer markdown={term.definition} variant="body" />
                      {term.sourceEntryIds.length > 0 ? (
                        <SourceEntryChips entryIds={term.sourceEntryIds} />
                      ) : null}
                      {term.links.length > 0 ? (
                        <View className="flex-row flex-wrap gap-2">
                          {term.links.map((link) => (
                            <WikiLinkChip key={`${link.pageId}-${link.label}`} {...link} />
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </Accordion.Content>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </View>
      ))}
      {content.terms.length === 0 ? (
        <Text className="text-muted text-sm" selectable>
          No glossary terms yet.
        </Text>
      ) : null}
    </View>
  );
}
