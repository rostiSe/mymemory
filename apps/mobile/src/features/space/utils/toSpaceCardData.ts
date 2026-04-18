import type { SpaceCardData } from "@/components/ui/Card/index.types";
import type { useSpaces } from "@/features/space/hooks/useSpaces";

export type SpaceRow = NonNullable<ReturnType<typeof useSpaces>["data"]>[number];

function lastCompiledToIso(
  value: SpaceRow["lastCompiledAt"],
): string | null | undefined {
  if (value == null) return null;
  if (typeof value === "string") return value;
  try {
    return value.toISOString();
  } catch {
    return null;
  }
}

/** Maps API list row → `SpaceCard` props shape (single source for list + related surfaces). */
export function toSpaceCardData(row: SpaceRow): SpaceCardData {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    entryCount: row.entryCount,
    compilationStatus: row.compilationStatus ?? undefined,
    lastCompiledAt: lastCompiledToIso(row.lastCompiledAt),
    origin: row.origin ?? "user",
  };
}
