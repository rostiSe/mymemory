import type { ReactNode } from "react";

/**
 * Shared prop shapes for `Card` variants. Imported by pre-built variant files
 * under `Card/variants/*` so feature code only ever passes the same data
 * shape — no per-card prop bag.
 */

export type EntryCardData = {
  id: string;
  title?: string;
  /** Plain-text or markdown summary; the variant strips markdown when needed. */
  summary?: string;
  type?: "url" | "note";
  /** Pre-formatted display string (e.g. "5h ago"). */
  date?: string;
  /** Secondary line under the title (e.g. word count + language). */
  metaHint?: string;
  heroImageUri?: string;
  isFavorited?: boolean;
  isPinned?: boolean;
  /** When `pending` / `processing`, the variant shows a status chip. */
  processedStatus?: "pending" | "processing" | "done" | "failed";
  /**
   * Semantic search score 0–1 → rendered as a `%` badge on the title row
   * (search results). When set, `date` moves below the summary to match
   * `SearchResultCard` layout.
   */
  similarity?: number;
};

export type SpaceCardCompileStatus =
  | "idle"
  | "compiling"
  | "compiled"
  | "failed"
  | null;

export type SpaceCardData = {
  id: string;
  name: string;
  description?: string | null;
  entryCount: number;
  /** Used by the corner status dot. */
  compilationStatus?: SpaceCardCompileStatus;
  /** ISO timestamp; the variant formats relative ago. */
  lastCompiledAt?: string | null;
  /** "user" → filled accent dot; "agent" → outline accent dot. */
  origin?: "user" | "agent";
};

export type StatusCardTone = "neutral" | "success" | "accent" | "danger";

export type StatusCardProps = {
  tone?: StatusCardTone;
  eyebrow?: string;
  /** Omit when the headline is entirely custom `description` content (e.g. spinner row). */
  title?: string;
  /** Plain string or rich content (paragraphs, `AnimatedExpandSection`, etc.). */
  description?: ReactNode;
  /** Right-side action (typically a `<Button>`). */
  action?: ReactNode;
  /** Optional row of meta chips below the description. */
  meta?: ReactNode;
};
