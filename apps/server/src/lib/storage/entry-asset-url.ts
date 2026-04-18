import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = "entries";

let admin: SupabaseClient | null | undefined;

function getSupabaseAdmin(): SupabaseClient | null {
  if (admin !== undefined) return admin;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    admin = null;
    return null;
  }
  admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

function bucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET;
}

/**
 * Mint a time-limited signed URL for an entry asset path inside the configured bucket.
 * Returns null when Supabase env is not configured or signing fails.
 */
export async function getSignedUrlForEntry(
  objectPath: string,
  expiresSec = 3600,
): Promise<string | null> {
  const trimmed = objectPath.trim();
  if (!trimmed) return null;

  const client = getSupabaseAdmin();
  if (!client) return null;

  const { data, error } = await client.storage
    .from(bucketName())
    .createSignedUrl(trimmed, expiresSec);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
