import type { appContract } from "@mymemory/shared";
import type { InferContractRouterOutputs } from "@orpc/contract";

export type WikiPage = NonNullable<
  InferContractRouterOutputs<typeof appContract>["wiki"]["getPage"]
>;

export type WikiPageVersion = InferContractRouterOutputs<
  typeof appContract
>["wiki"]["getPageVersions"][number];

export type WikiPageType = WikiPage["pageType"];

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
  items: Array<{
    name: string;
    description: string;
    sourceEntryIds: string[];
  }>;
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function asLinkArray(v: unknown): WikiContentLink[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const pageId = o.pageId;
      const label = o.label;
      if (typeof pageId !== "string" || typeof label !== "string") return null;
      return { pageId, label };
    })
    .filter((x): x is WikiContentLink => x !== null);
}

function parseSection(raw: unknown): SynthesisSection | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id;
  const title = o.title;
  const body = o.body;
  if (typeof id !== "string" || typeof title !== "string" || typeof body !== "string") {
    return null;
  }
  return {
    id,
    title,
    body,
    sourceEntryIds: asStringArray(o.sourceEntryIds),
    links: asLinkArray(o.links),
    lastUpdated: typeof o.lastUpdated === "string" ? o.lastUpdated : "",
  };
}

export function parseSynthesisContent(raw: Record<string, unknown>): SynthesisContent {
  const tocRaw = raw.tableOfContents;
  const tableOfContents: SynthesisContent["tableOfContents"] = [];
  if (Array.isArray(tocRaw)) {
    for (const row of tocRaw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      if (typeof r.id !== "string" || typeof r.title !== "string") continue;
      const level = typeof r.level === "number" ? r.level : 1;
      tableOfContents.push({ id: r.id, title: r.title, level });
    }
  }

  const sectionsRaw = raw.sections;
  const sections: SynthesisSection[] = [];
  if (Array.isArray(sectionsRaw)) {
    for (const s of sectionsRaw) {
      const parsed = parseSection(s);
      if (parsed) sections.push(parsed);
    }
  }

  return {
    tableOfContents,
    sections,
    insights: asStringArray(raw.insights),
    contradictions: asStringArray(raw.contradictions),
    openQuestions: asStringArray(raw.openQuestions),
  };
}

export function parseComparisonContent(raw: Record<string, unknown>): ComparisonContent {
  const itemsRaw = raw.items;
  const items: ComparisonContent["items"] = [];
  if (Array.isArray(itemsRaw)) {
    for (const row of itemsRaw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      if (typeof r.name !== "string") continue;
      items.push({
        name: r.name,
        description: typeof r.description === "string" ? r.description : "",
        sourceEntryIds: asStringArray(r.sourceEntryIds),
      });
    }
  }

  const criteria = asStringArray(raw.criteria);
  const matrix: Record<string, Record<string, string>> = {};
  const matrixRaw = raw.matrix;
  if (matrixRaw && typeof matrixRaw === "object" && !Array.isArray(matrixRaw)) {
    for (const [k, row] of Object.entries(matrixRaw as Record<string, unknown>)) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const inner: Record<string, string> = {};
      for (const [ck, cv] of Object.entries(row as Record<string, unknown>)) {
        if (typeof cv === "string") inner[ck] = cv;
      }
      matrix[k] = inner;
    }
  }

  return {
    items,
    criteria,
    matrix,
    verdict: typeof raw.verdict === "string" ? raw.verdict : "",
    sourceEntryIds: asStringArray(raw.sourceEntryIds),
  };
}

export function parseTimelineContent(raw: Record<string, unknown>): TimelineContent {
  const eventsRaw = raw.events;
  const events: TimelineEvent[] = [];
  if (Array.isArray(eventsRaw)) {
    for (const row of eventsRaw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      if (typeof r.title !== "string" || typeof r.body !== "string") continue;
      events.push({
        date: typeof r.date === "string" ? r.date : "",
        title: r.title,
        body: r.body,
        sourceEntryIds: asStringArray(r.sourceEntryIds),
        links: asLinkArray(r.links),
      });
    }
  }
  return {
    events,
    insights: asStringArray(raw.insights),
  };
}

export function parseGlossaryContent(raw: Record<string, unknown>): GlossaryContent {
  const termsRaw = raw.terms;
  const terms: GlossaryTerm[] = [];
  if (Array.isArray(termsRaw)) {
    for (const row of termsRaw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      if (typeof r.term !== "string" || typeof r.definition !== "string") continue;
      terms.push({
        term: r.term,
        definition: r.definition,
        sourceEntryIds: asStringArray(r.sourceEntryIds),
        links: asLinkArray(r.links),
      });
    }
  }
  return { terms };
}

export function parseIndexContent(raw: Record<string, unknown>): IndexContent {
  const spacesRaw = raw.spaces;
  const spaces: IndexSpaceSummary[] = [];
  if (Array.isArray(spacesRaw)) {
    for (const row of spacesRaw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      if (typeof r.spaceId !== "string" || typeof r.name !== "string") continue;
      spaces.push({
        spaceId: r.spaceId,
        name: r.name,
        summary: typeof r.summary === "string" ? r.summary : "",
        pageCount: typeof r.pageCount === "number" ? r.pageCount : 0,
        entryCount: typeof r.entryCount === "number" ? r.entryCount : 0,
      });
    }
  }
  return {
    spaces,
    totalPages: typeof raw.totalPages === "number" ? raw.totalPages : 0,
    totalEntries: typeof raw.totalEntries === "number" ? raw.totalEntries : 0,
    lastCompiled: typeof raw.lastCompiled === "string" ? raw.lastCompiled : "",
  };
}

export type MaturityLevel = "stub" | "draft" | "complete";

export function readMaturityFromProperties(
  properties: Record<string, unknown>,
): MaturityLevel | undefined {
  const raw = properties.maturity;
  if (!raw || typeof raw !== "object") return undefined;
  const v = (raw as Record<string, unknown>).value;
  if (v === "stub" || v === "draft" || v === "complete") return v;
  return undefined;
}

export function readPropertyChips(
  properties: Record<string, unknown>,
): Array<{ key: string; label: string }> {
  const out: Array<{ key: string; label: string }> = [];
  for (const [key, val] of Object.entries(properties)) {
    if (key === "maturity") continue;
    if (!val || typeof val !== "object") continue;
    const o = val as Record<string, unknown>;
    const value = o.value;
    let label: string;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      label = String(value);
    } else {
      continue;
    }
    out.push({ key, label: `${key}: ${label}` });
    if (out.length >= 6) break;
  }
  return out;
}

export function estimateSectionCount(page: WikiPage): number {
  const c = page.content;
  switch (page.pageType) {
    case "synthesis":
      return parseSynthesisContent(c).sections.length;
    case "glossary":
      return parseGlossaryContent(c).terms.length;
    case "timeline":
      return parseTimelineContent(c).events.length;
    case "comparison": {
      const comp = parseComparisonContent(c);
      return comp.items.length > 0 ? comp.items.length + 1 : 0;
    }
    case "index":
      return parseIndexContent(c).spaces.length;
    default:
      return 0;
  }
}

export function countSectionsInContent(
  pageType: WikiPageType,
  content: Record<string, unknown>,
): number {
  switch (pageType) {
    case "synthesis":
      return parseSynthesisContent(content).sections.length;
    case "glossary":
      return parseGlossaryContent(content).terms.length;
    case "timeline":
      return parseTimelineContent(content).events.length;
    case "comparison":
      return parseComparisonContent(content).items.length;
    case "index":
      return parseIndexContent(content).spaces.length;
    default:
      return 0;
  }
}
