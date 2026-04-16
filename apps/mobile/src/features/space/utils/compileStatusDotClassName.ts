import type { spaceSchema } from "@mymemory/shared/contracts";
import type { z } from "zod";

type SpaceCompileFields = Pick<
  z.infer<typeof spaceSchema>,
  "compilationStatus" | "lastCompiledAt"
>;

/** Uniwind class for the compile-status dot (matches `SpaceListRow` / `RelatedSpaceCard`). */
export function compileStatusDotClassName({
  compilationStatus,
  lastCompiledAt,
}: SpaceCompileFields): string {
  if (compilationStatus === "compiling") return "bg-warning";
  if (compilationStatus === "failed") return "bg-danger";
  if (compilationStatus === "idle" && lastCompiledAt) return "bg-success";
  return "bg-muted";
}
