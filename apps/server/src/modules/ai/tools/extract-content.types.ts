/** Shared return type for all content extraction tools. */
export type ExtractionResult = {
  markdown: string;
  metadata: ExtractionMetadata | null;
};

export type ExtractionMetadata = {
  title?: string;
  description?: string;
  ogImage?: string;
  siteName?: string;
  /** Canonical page URL from the extractor (Firecrawl may send `sourceURL`). */
  sourceUrl?: string;
  author?: string;
  publishedAt?: string;
  [key: string]: unknown;
};
