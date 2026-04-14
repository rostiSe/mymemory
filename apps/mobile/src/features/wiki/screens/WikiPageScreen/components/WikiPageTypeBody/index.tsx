import type { WikiPageType } from "@/features/wiki/types";
import {
  parseComparisonContent,
  parseGlossaryContent,
  parseIndexContent,
  parseSynthesisContent,
  parseTimelineContent,
} from "@/features/wiki/types";
import { ComparisonRenderer } from "../ComparisonRenderer";
import { GlossaryRenderer } from "../GlossaryRenderer";
import { IndexRenderer } from "../IndexRenderer";
import { SynthesisRenderer } from "../SynthesisRenderer";
import { TimelineRenderer } from "../TimelineRenderer";

export type WikiPageTypeBodyProps = {
  pageType: WikiPageType;
  content: Record<string, unknown>;
};

export function WikiPageTypeBody({ pageType, content }: WikiPageTypeBodyProps) {
  switch (pageType) {
    case "synthesis":
      return <SynthesisRenderer content={parseSynthesisContent(content)} />;
    case "comparison":
      return <ComparisonRenderer content={parseComparisonContent(content)} />;
    case "timeline":
      return <TimelineRenderer content={parseTimelineContent(content)} />;
    case "glossary":
      return <GlossaryRenderer content={parseGlossaryContent(content)} />;
    case "index":
      return <IndexRenderer content={parseIndexContent(content)} />;
    default:
      return null;
  }
}
