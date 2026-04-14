/**
 * Shared JSON shapes for wiki agent tools (T-015b).
 * Runtime validation for tool I/O uses Zod in `wiki-tools.ts`; these types document expected structures.
 */

export type PropertyType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array';

export type PropertyValue = {
  type: PropertyType;
  value: unknown;
  values?: string[];
  description?: string;
  createdBy: 'agent' | 'user';
};

/** Optional structured metadata stored on `spaces.content` (agent / product-defined). */
export type SpaceContent = {
  summary?: string;
  insights?: string[];
  /** ISO timestamps or free-form notes */
  lastCompiledNote?: string;
} & Record<string, unknown>;

/** Section link to another wiki page. */
export type WikiContentLink = { pageId: string; label: string };

export type SynthesisSection = {
  id: string;
  title: string;
  body: string;
  sourceEntryIds: string[];
  links: WikiContentLink[];
  lastUpdated: string;
};

export type SynthesisContent = {
  tableOfContents: Array<{ id: string; title: string; level: number }>;
  sections: SynthesisSection[];
  insights: string[];
  contradictions: string[];
  openQuestions: string[];
};

export type ComparisonContent = {
  items: Array<{ name: string; description: string; sourceEntryIds: string[] }>;
  criteria: string[];
  matrix: Record<string, Record<string, string>>;
  verdict: string;
  sourceEntryIds: string[];
};

export type TimelineEvent = {
  date: string;
  title: string;
  body: string;
  sourceEntryIds: string[];
  links: WikiContentLink[];
};

export type TimelineContent = {
  events: TimelineEvent[];
  insights: string[];
};

export type GlossaryTerm = {
  term: string;
  definition: string;
  sourceEntryIds: string[];
  links: WikiContentLink[];
};

export type GlossaryContent = {
  terms: GlossaryTerm[];
};

export type IndexSpaceSummary = {
  spaceId: string;
  name: string;
  summary: string;
  pageCount: number;
  entryCount: number;
};

export type IndexContent = {
  spaces: IndexSpaceSummary[];
  totalPages: number;
  totalEntries: number;
  lastCompiled: string;
};

export type WikiPageContent =
  | SynthesisContent
  | ComparisonContent
  | TimelineContent
  | GlossaryContent
  | IndexContent;
