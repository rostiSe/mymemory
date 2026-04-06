/**
 * Medium (and common Medium custom domains) via Firecrawl scrape API.
 * Use member cookies or a Firecrawl browser profile so paywalled posts return full text.
 *
 * Env: FIRECRAWL_API_KEY (required). Optional: FIRECRAWL_MEDIUM_COOKIE,
 * FIRECRAWL_MEDIUM_PROFILE, FIRECRAWL_MEDIUM_HEADERS_JSON, FIRECRAWL_MEDIUM_EXTRA_HOSTS.
 */

const FIRECRAWL_SCRAPE_URL =
  process.env.FIRECRAWL_API_URL?.replace(/\/$/, '') ??
  'https://api.firecrawl.dev/v2/scrape';

function hostnameMatchesExtraHosts(
  hostname: string,
  extras: string[],
): boolean {
  const h = hostname.toLowerCase();
  for (const raw of extras) {
    const e = raw.toLowerCase().replace(/^\./, '');
    if (!e) continue;
    if (h === e || h.endsWith(`.${e}`)) return true;
  }
  return false;
}

function parseMediumExtraHosts(): string[] {
  const raw = process.env.FIRECRAWL_MEDIUM_EXTRA_HOSTS;
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Whether this URL should use Firecrawl (Medium member / custom Medium hosts).
 */
export function isMediumArticleUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    const h = hostname.toLowerCase();
    if (h === 'medium.com' || h.endsWith('.medium.com')) return true;
    // Common Medium publication host pattern (e.g. aws.plainenglish.io)
    if (h.endsWith('.plainenglish.io')) return true;
    return hostnameMatchesExtraHosts(h, parseMediumExtraHosts());
  } catch {
    return false;
  }
}

function parseOptionalHeadersJson(
  raw: string | undefined,
): Record<string, string> | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined;
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && k.trim()) out[k] = v;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    console.warn(
      '[firecrawl] FIRECRAWL_MEDIUM_HEADERS_JSON is invalid JSON; ignoring',
    );
    return undefined;
  }
}

type FirecrawlScrapeResponse = {
  success?: boolean;
  error?: string;
  data?: { markdown?: string | null };
};

/**
 * Scrape a Medium article as markdown using Firecrawl (browser + optional auth).
 */
export async function extractMediumArticleWithFirecrawl(
  url: string,
): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'FIRECRAWL_API_KEY is not set (required for Medium URLs in this pipeline)',
    );
  }

  const cookie = process.env.FIRECRAWL_MEDIUM_COOKIE?.trim();
  const profileName = process.env.FIRECRAWL_MEDIUM_PROFILE?.trim();
  const jsonHeaders = parseOptionalHeadersJson(
    process.env.FIRECRAWL_MEDIUM_HEADERS_JSON,
  );

  const headers: Record<string, string> = { ...(jsonHeaders ?? {}) };
  if (cookie) {
    headers.Cookie = cookie;
  }

  const body: Record<string, unknown> = {
    url,
    formats: ['markdown'],
    onlyMainContent: true,
    // Prefer fresh content for paywalled pages (override Firecrawl default cache TTL)
    maxAge: 0,
  };

  if (Object.keys(headers).length > 0) {
    body.headers = headers;
  }

  if (profileName) {
    body.profile = {
      name: profileName,
      saveChanges: true,
    };
  }

  const res = await fetch(FIRECRAWL_SCRAPE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  let json: FirecrawlScrapeResponse;
  try {
    json = (await res.json()) as FirecrawlScrapeResponse;
  } catch {
    throw new Error(
      `Firecrawl returned non-JSON (${res.status} ${res.statusText})`,
    );
  }

  if (!res.ok || json.success === false) {
    const msg =
      typeof json.error === 'string' && json.error.length > 0
        ? json.error
        : `Firecrawl scrape failed (${res.status})`;
    throw new Error(msg);
  }

  const markdown = json.data?.markdown?.trim();
  if (!markdown) {
    throw new Error(
      'Firecrawl returned no markdown (check auth: FIRECRAWL_MEDIUM_COOKIE or FIRECRAWL_MEDIUM_PROFILE)',
    );
  }

  return markdown;
}
