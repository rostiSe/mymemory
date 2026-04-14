import type { MaturityLevel } from "@/features/wiki/types";
import { Chip } from "heroui-native";

const COLORS: Record<MaturityLevel, "default" | "warning" | "success"> = {
  stub: "default",
  draft: "warning",
  complete: "success",
};

export type MaturityBadgeProps = {
  maturity: MaturityLevel;
};

export function MaturityBadge({ maturity }: MaturityBadgeProps) {
  return (
    <Chip variant="soft" size="sm" color={COLORS[maturity]} className="self-start">
      <Chip.Label className="text-xs font-medium capitalize">{maturity}</Chip.Label>
    </Chip>
  );
}
