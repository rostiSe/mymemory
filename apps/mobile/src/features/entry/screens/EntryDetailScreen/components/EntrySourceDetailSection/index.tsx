import type { EntryRow } from "@/features/entry/types";
import { Card } from "heroui-native";
import { Text, View } from "react-native";

type EntrySourceDetailSectionProps = {
  sourceApp: EntryRow["sourceApp"];
  metadata: EntryRow["metadata"];
};

function pickMetaString(
  meta: Record<string, unknown> | null | undefined,
  key: string,
): string | undefined {
  const v = meta?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/**
 * Source / extraction metadata — only when there is something to show.
 */
export function EntrySourceDetailSection({
  sourceApp,
  metadata,
}: EntrySourceDetailSectionProps) {
  const siteName = pickMetaString(metadata ?? undefined, "siteName");
  const author = pickMetaString(metadata ?? undefined, "author");
  const publishedAt =
    pickMetaString(metadata ?? undefined, "publishedAt") ??
    pickMetaString(metadata ?? undefined, "publishedTime");
  const description = pickMetaString(metadata ?? undefined, "description");
  const app = sourceApp?.trim();

  const rows: { label: string; value: string }[] = [];
  if (app) rows.push({ label: "Source app", value: app });
  if (siteName) rows.push({ label: "Site", value: siteName });
  if (author) rows.push({ label: "Author", value: author });
  if (publishedAt) rows.push({ label: "Published", value: publishedAt });
  if (description) {
    rows.push({
      label: "Description",
      value: truncate(description, 280),
    });
  }

  if (!rows.length) return null;

  return (
    <Card className="mb-4 rounded-lg border border-border p-0">
      <Card.Body className="gap-2 px-card py-card">
        <Text className="text-foreground text-xs font-semibold uppercase tracking-wide">
          Source
        </Text>
        <View className="gap-2">
          {rows.map((row) => (
            <View key={row.label} className="gap-0.5">
              <Text className="text-muted text-xs">{row.label}</Text>
              <Text className="text-foreground text-sm leading-5">
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      </Card.Body>
    </Card>
  );
}
