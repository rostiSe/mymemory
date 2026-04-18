import { Badge } from "@/components/ui/Badge/index";
import { isUuid } from "@/features/wiki/types";
import { useRouter } from "expo-router";

export type WikiLinkChipProps = {
  pageId: string;
  label: string;
};

export function WikiLinkChip({ pageId, label }: WikiLinkChipProps) {
  const router = useRouter();
  const valid = isUuid(pageId);

  if (!valid) {
    return (
      <Badge
        tone="neutral"
        size="sm"
        className="opacity-50"
        disabled
        labelClassName="max-w-[140px]"
        numberOfLines={1}
      >
        {label}
      </Badge>
    );
  }

  return (
    <Badge
      tone="accent"
      size="sm"
      onPress={() => {
        router.push({ pathname: "/wiki/[id]", params: { id: pageId } });
      }}
      accessibilityRole="link"
      accessibilityLabel={`Open wiki page ${label}`}
      labelClassName="max-w-[160px]"
      numberOfLines={1}
    >
      {label}
    </Badge>
  );
}
