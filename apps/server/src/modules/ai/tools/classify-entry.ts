import { openai } from "@ai-sdk/openai";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";

import {
  classifyEntrySystemPrompt,
  classifyEntryUserPrompt,
  type ClassifyEntryUserPromptOpts,
} from "../prompts.js";

/**
 * Confidence threshold at or above which entries are auto-assigned to a space.
 * Below this threshold, the entry is queued as a `space_suggestion` for manual review.
 * Kept as a module-level constant for now — a future ticket may promote this to a
 * per-user preference.
 */
export const AUTO_ASSIGN_CONFIDENCE_THRESHOLD = 0.7;

export const classifyEntrySchema = z.object({
  assignments: z
    .array(
      z.object({
        spaceId: z
          .string()
          .describe(
            "The id of an existing space from the provided list. Must match exactly.",
          ),
        spaceName: z
          .string()
          .describe("The name of the chosen space (for display/logging)."),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe("How confident you are the entry belongs in this space (0-1)."),
        reason: z
          .string()
          .describe(
            "One sentence explaining why this space is a good fit for the entry.",
          ),
      }),
    )
    .max(3)
    .describe(
      "0-3 space assignments for the entry. Empty array means no existing space fits.",
    ),
});

export type ClassifyEntryResult = z.infer<typeof classifyEntrySchema>;

export async function classifyEntryToSpaces(
  opts: ClassifyEntryUserPromptOpts,
): Promise<ClassifyEntryResult> {
  if (opts.existingSpaces.length === 0) {
    return { assignments: [] };
  }

  try {
    const { output } = await generateText({
      model: openai("gpt-4o-mini"),
      output: Output.object({
        name: "EntrySpaceClassification",
        description:
          "0-3 space assignments for an entry based on its metadata.",
        schema: classifyEntrySchema,
      }),
      system: classifyEntrySystemPrompt(),
      prompt: classifyEntryUserPrompt(opts),
    });

    if (!output) {
      throw new Error(
        "classifyEntryToSpaces: model returned no structured output",
      );
    }

    // Defensive: drop any assignments whose spaceId is not in the provided list.
    const validIds = new Set(opts.existingSpaces.map((s) => s.id));
    const filtered = output.assignments.filter((a) => validIds.has(a.spaceId));

    return { assignments: filtered };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error(
        "classifyEntryToSpaces failed to generate valid object:",
        error.cause,
      );
      console.error("Raw text:", error.text);
    }
    throw error;
  }
}
