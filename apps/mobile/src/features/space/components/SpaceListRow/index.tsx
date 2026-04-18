import { SpaceCard } from "@/components/ui/Card/variants/SpaceCard/index";
import {
  toSpaceCardData,
  type SpaceRow,
} from "@/features/space/utils/toSpaceCardData";
import { memo } from "react";

export type { SpaceRow };

/**
 * Thin adapter: maps `SpaceRow` → `SpaceCard` for the Spaces list.
 */
export const SpaceListRow = memo(function SpaceListRow({
  item,
  rowVariant,
  onPressSpace,
}: {
  item: SpaceRow;
  rowVariant: "default" | "child";
  onPressSpace: (id: string) => void;
}) {
  return (
    <SpaceCard
      item={toSpaceCardData(item)}
      indent={rowVariant === "child"}
      onPress={onPressSpace}
    />
  );
});
