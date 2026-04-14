import type { WikiPageType } from "@/features/wiki/types";
import { Chip } from "heroui-native";

const LABELS: Record<WikiPageType, string> = {
  synthesis: "Synthesis",
  timeline: "Timeline",
  comparison: "Comparison",
  glossary: "Glossary",
  index: "Index",
};

const COLORS: Record<
  WikiPageType,
  "accent" | "success" | "warning" | "default"
> = {
  synthesis: "accent",
  timeline: "success",
  comparison: "warning",
  glossary: "default",
  index: "default",
};

export type PageTypeBadgeProps = {
  pageType: WikiPageType;
};

export function PageTypeBadge({ pageType }: PageTypeBadgeProps) {
  return (
    <Chip variant="soft" size="sm" color={COLORS[pageType]} className="self-start">
      <Chip.Label className="text-xs font-medium">{LABELS[pageType]}</Chip.Label>
    </Chip>
  );
}
