import { ScreenInset } from "@/components/layout/ScreenInset";
import { useCompilationStatus } from "@/features/wiki/hooks/useWikiPages";
import { useWikiPageById } from "@/features/wiki/hooks/useWikiPageById";
import {
  parseSynthesisContent,
  readMaturityFromProperties,
  readPropertyChips,
} from "@/features/wiki/types";
import { WikiPageShell } from "@/features/wiki/screens/WikiPageScreen/components/WikiPageShell";
import { WikiPageSkeleton } from "@/features/wiki/screens/WikiPageScreen/components/WikiPageSkeleton";
import { WikiPageTypeBody } from "@/features/wiki/screens/WikiPageScreen/components/WikiPageTypeBody";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

function formatLastCompiled(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export default function WikiPageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: page, isPending, isError, error } = useWikiPageById(id);
  const { data: compileStatus } = useCompilationStatus();

  if (isPending) {
    return <WikiPageSkeleton />;
  }

  if (isError) {
    return (
      <ScreenInset className="flex-1 bg-background px-(--spacing-screen)">
        <View className="mt-4 gap-2 rounded-lg border border-border bg-surface-secondary p-4">
          <Text className="text-foreground font-semibold">Could not load wiki page</Text>
          <Text className="text-sm text-muted" selectable>
            {error instanceof Error ? error.message : "Request failed"}
          </Text>
        </View>
      </ScreenInset>
    );
  }

  if (!page) {
    return (
      <ScreenInset className="flex-1 bg-background px-(--spacing-screen)">
        <Text className="text-muted mt-4">Wiki page not found.</Text>
      </ScreenInset>
    );
  }

  const maturity = readMaturityFromProperties(page.properties);
  const propertyChips = readPropertyChips(page.properties);
  const tocItems =
    page.pageType === "synthesis"
      ? parseSynthesisContent(page.content).tableOfContents.map((t) => ({
          id: t.id,
          title: t.title,
        }))
      : undefined;

  const compilationLastAt = formatLastCompiled(compileStatus?.lastCompiledAt);

  return (
    <View className="flex-1 bg-background">
      <WikiPageShell
        title={page.title}
        pageType={page.pageType}
        pageId={page.id}
        maturity={maturity}
        updatedAt={page.updatedAt}
        sourceEntryCount={page.sourceEntryIds.length}
        propertyChips={propertyChips}
        tocItems={tocItems}
        compilationLastAt={compilationLastAt}
      >
        <WikiPageTypeBody pageType={page.pageType} content={page.content} />
      </WikiPageShell>
    </View>
  );
}
