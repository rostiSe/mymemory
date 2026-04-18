import type { SpaceCardData } from "@/components/ui/Card/index.types";

type CompileFields = Pick<
  SpaceCardData,
  "compilationStatus" | "lastCompiledAt"
>;

/** Uniwind classes for the compile-status dot on space cards. */
export function compileStatusDotClassName({
  compilationStatus,
  lastCompiledAt,
}: CompileFields): string {
  if (compilationStatus === "compiling") return "bg-warning";
  if (compilationStatus === "failed") return "bg-danger";
  if (compilationStatus === "idle" && lastCompiledAt) return "bg-success";
  return "bg-muted";
}
