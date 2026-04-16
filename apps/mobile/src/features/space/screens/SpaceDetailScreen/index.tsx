import { ScreenInset } from "@/components/layout/ScreenInset";
import { MaturityBadge } from "@/features/wiki/components/MaturityBadge";
import { PageTypeBadge } from "@/features/wiki/components/PageTypeBadge";
import {
  useCompilationStatus,
  useWikiPages,
} from "@/features/wiki/hooks/useWikiPages";
import {
  estimateSectionCount,
  readMaturityFromProperties,
} from "@/features/wiki/types";
import { RelatedSpacesStrip } from "@/features/space/components/RelatedSpacesStrip";
import { useSpace } from "@/features/space/hooks/useSpaces";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card, Chip } from "heroui-native";
import { Pressable, Text, View } from "react-native";

function normalizeId(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default function SpaceDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const spaceId = normalizeId(rawId);
  const router = useRouter();
  const { data: space, isPending: spacePending, isError: spaceError, error: spaceErr } =
    useSpace(spaceId);
  const { data: pages, isPending: pagesPending, error: pagesError } =
    useWikiPages(spaceId);
  const { data: compileStatus } = useCompilationStatus();

  if (!spaceId) {
    return (
      <ScreenInset className="flex-1 bg-background px-(--spacing-screen)">
        <Text className="text-muted mt-4">Missing space id.</Text>
      </ScreenInset>
    );
  }

  if (spacePending) {
    return (
      <ScreenInset className="flex-1 bg-background px-(--spacing-screen)">
        <Text className="text-muted mt-4">Loading space…</Text>
      </ScreenInset>
    );
  }

  if (spaceError || !space) {
    return (
      <ScreenInset className="flex-1 bg-background px-(--spacing-screen)">
        <View className="mt-4 gap-2 rounded-lg border border-border bg-surface-secondary p-4">
          <Text className="text-foreground font-semibold">Could not load space</Text>
          <Text className="text-sm text-muted" selectable>
            {spaceErr instanceof Error ? spaceErr.message : "Request failed"}
          </Text>
        </View>
      </ScreenInset>
    );
  }

  const statusLabel =
    compileStatus?.status === "compiling"
      ? "Wiki compiling…"
      : compileStatus?.status === "failed"
        ? "Last wiki compile failed"
        : null;

  return (
    <ScreenInset className="flex-1 bg-background px-(--spacing-screen)">
      <View className="pb-tab-clearance pt-4">
        <Text className="text-foreground text-2xl font-bold" selectable>
          {space.name}
        </Text>
        {space.description ? (
          <Text className="text-muted mt-2 text-base leading-6" selectable>
            {space.description}
          </Text>
        ) : null}

        {statusLabel ? (
          <View className="mt-3">
            <Chip variant="soft" size="sm" color="warning">
              <Chip.Label className="text-xs">{statusLabel}</Chip.Label>
            </Chip>
          </View>
        ) : null}

        <Text className="text-foreground mt-6 text-sm font-semibold">Wiki pages</Text>
        {pagesError ? (
          <View className="mt-2 rounded-lg border border-border bg-surface-secondary p-4">
            <Text className="text-foreground font-semibold">Could not load wiki pages</Text>
            <Text className="text-sm text-muted" selectable>
              {pagesError instanceof Error ? pagesError.message : "Request failed"}
            </Text>
          </View>
        ) : pagesPending ? (
          <Text className="text-muted mt-2 text-sm">Loading pages…</Text>
        ) : (pages?.length ?? 0) === 0 ? (
          <Text className="text-muted mt-2 text-sm" selectable>
            No wiki pages yet. Compile your wiki to generate pages.
          </Text>
        ) : (
          <View className="mt-3 gap-3">
            {(pages ?? []).map((page) => {
              const maturity = readMaturityFromProperties(page.properties);
              const sections = estimateSectionCount(page);
              return (
                <Pressable
                  key={page.id}
                  onPress={() =>
                    router.push({ pathname: "/wiki/[id]", params: { id: page.id } })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Open wiki page ${page.title}`}
                >
                  <Card className="rounded-lg border border-border p-0">
                    <Card.Body className="gap-2 px-card py-card">
                      <Text
                        className="text-foreground text-base font-semibold"
                        selectable
                        numberOfLines={2}
                      >
                        {page.title}
                      </Text>
                      <View className="flex-row flex-wrap items-center gap-2">
                        <PageTypeBadge pageType={page.pageType} />
                        {maturity ? <MaturityBadge maturity={maturity} /> : null}
                        <Chip variant="soft" size="sm" color="default">
                          <Chip.Label className="text-xs">
                            {sections} {sections === 1 ? "block" : "blocks"}
                          </Chip.Label>
                        </Chip>
                      </View>
                    </Card.Body>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}

        <RelatedSpacesStrip spaceId={spaceId} />
      </View>
    </ScreenInset>
  );
}
