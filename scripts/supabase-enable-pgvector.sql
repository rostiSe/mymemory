-- Run this once in Supabase → SQL Editor before `drizzle-kit push` / applying migrations
-- that use `vector(...)` columns (embeddings, space centroids).

CREATE EXTENSION IF NOT EXISTS vector;
