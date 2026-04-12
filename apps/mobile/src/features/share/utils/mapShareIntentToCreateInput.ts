import type { ContractRouterClient } from "@orpc/contract";
import type { appContract } from "@mymemory/shared";

export type CreateEntryInput = Parameters<
  ContractRouterClient<typeof appContract>["entries"]["create"]
>[0];

export type ShareQuickInitialProps = {
  shareMimeType?: string;
  shareAction?: string;
  shareText?: string;
  shareSubject?: string;
  shareStreamUri?: string;
  shareStreamUrisJson?: string;
};

function isHttpUrl(text: string): boolean {
  const t = text.trim();
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * When share `subject` is empty or repeats the same URL (common from browsers),
 * omit title so the ingest pipeline can set AI/metadata title.
 */
function titleForUrlEntry(url: string, subject: string): string | undefined {
  const s = subject.trim();
  if (!s) return undefined;
  const u = url.trim();
  if (s === u) return undefined;
  if (isHttpUrl(s)) {
    try {
      if (new URL(s).href === new URL(u).href) return undefined;
    } catch {
      return s;
    }
  }
  return s;
}

function parseUrlFromText(text: string): string | undefined {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (isHttpUrl(line)) return line.trim();
  }
  const match = text.match(/https?:\/\/[^\s]+/);
  if (match?.[0] && isHttpUrl(match[0])) {
    return match[0].replace(/[.,);]+$/u, "");
  }
  return undefined;
}

/**
 * Maps Android share intent props (from ShareQuickActivity launch options) to an oRPC create payload.
 */
export function mapShareIntentToCreateInput(
  props: ShareQuickInitialProps,
):
  | { ok: true; input: CreateEntryInput }
  | { ok: false; message: string } {
  const mime = props.shareMimeType ?? "";
  const text = props.shareText?.trim() ?? "";
  const subject = props.shareSubject?.trim() ?? "";

  let streamUris: string[] = [];
  if (props.shareStreamUrisJson) {
    try {
      const parsed = JSON.parse(props.shareStreamUrisJson) as unknown;
      if (Array.isArray(parsed)) {
        streamUris = parsed.filter((x): x is string => typeof x === "string");
      }
    } catch {
      return { ok: false, message: "Could not read shared files." };
    }
  }
  if (props.shareStreamUri) {
    streamUris = [
      props.shareStreamUri,
      ...streamUris.filter((u) => u !== props.shareStreamUri),
    ];
  }

  const hasStreams = streamUris.length > 0;
  if (hasStreams && streamUris.length > 1) {
    return { ok: false, message: "Multiple files are not supported yet." };
  }
  if (hasStreams && !text) {
    return {
      ok: false,
      message: "Saving files from share isn\u2019t supported yet.",
    };
  }

  if (!text && subject) {
    return {
      ok: true,
      input: {
        type: "note",
        content: subject,
        title: subject.slice(0, 80),
      },
    };
  }

  if (text) {
    const urlFromBody = parseUrlFromText(text);
    if (urlFromBody && (mime.startsWith("text/") || mime === "")) {
      return {
        ok: true,
        input: {
          type: "url",
          url: urlFromBody,
          title: titleForUrlEntry(urlFromBody, subject),
          content: text.length > urlFromBody.length ? text : "",
        },
      };
    }
    return {
      ok: true,
      input: {
        type: "note",
        content: text,
        title: subject || text.slice(0, 80),
      },
    };
  }

  return { ok: false, message: "Nothing to save." };
}
