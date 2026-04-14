import { isUuid } from "@/features/wiki/types";
import { useRouter } from "expo-router";
import { Chip } from "heroui-native";

export type WikiLinkChipProps = {
  pageId: string;
  label: string;
};

export function WikiLinkChip({ pageId, label }: WikiLinkChipProps) {
  const router = useRouter();
  const valid = isUuid(pageId);

  if (!valid) {
    return (
      <Chip variant="soft" size="sm" color="default" className="opacity-50" disabled>
        <Chip.Label className="max-w-[140px] text-xs" numberOfLines={1}>
          {label}
        </Chip.Label>
      </Chip>
    );
  }

  return (
    <Chip
      variant="soft"
      size="sm"
      color="accent"
      onPress={() => {
        router.push({ pathname: "/wiki/[id]", params: { id: pageId } });
      }}
      accessibilityRole="link"
      accessibilityLabel={`Open wiki page ${label}`}
    >
      <Chip.Label className="max-w-[160px] text-xs" numberOfLines={1}>
        {label}
      </Chip.Label>
    </Chip>
  );
}
