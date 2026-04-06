import "dotenv/config";
import { implement, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import { appContract } from "@mymemory/shared";
import { Hono } from "hono";
import { serve } from "@hono/node-server";

// Handlers
import { extractContentFromUrl } from "./modules/ai/tools/extract-content.js";
import { summarizeText } from "./modules/ai/tools/summarize.js";
import { generateEmbedding } from "./modules/ai/tools/generate-embedding.js";
import { processEntry } from "./modules/ai/pipelines/ingest.js";

import { db, eq, desc, and } from "@mymemory/db";
import { entries, spaces } from "@mymemory/db/schema";

const os = implement(appContract);

function requireAuth() {
  return "00000000-0000-0000-0000-000000000000";
}

const router = os.router({
  ping: os.ping.handler(() => "pong"),
  
  entries: {
    list: os.entries.list.handler(async () => {
      const userId = requireAuth();
      const userEntries = await db.select()
        .from(entries)
        .where(eq(entries.userId, userId))
        .orderBy(desc(entries.createdAt));

      // Map to contract types (converting Date to string if needed, though they are returned directly)
      return userEntries as any; 
    }),
    getById: os.entries.getById.handler(async ({ input }) => {
      const userId = requireAuth();
      const [row] = await db
        .select()
        .from(entries)
        .where(and(eq(entries.id, input.id), eq(entries.userId, userId)))
        .limit(1);

      return (row as any) || null;
    }),
    create: os.entries.create.handler(async ({ input }) => {
      const userId = requireAuth();
      const { url, title, type = 'url', content = '' } = input;

      const [newEntry] = await db.insert(entries).values({
        userId,
        url: url || null,
        title: title || null,
        type,
        content,
        processedStatus: 'pending',
      }).returning();

      // Trigger ingest pipeline asynchronously
      processEntry(newEntry.id, userId).catch(console.error);

      return newEntry as any;
    }),
  },

  spaces: {
    list: os.spaces.list.handler(async () => {
      const userId = requireAuth();
      const userSpaces = await db.select()
        .from(spaces)
        .where(eq(spaces.userId, userId));

      return userSpaces as any;
    }),
    getById: os.spaces.getById.handler(async ({ input }) => {
      const userId = requireAuth();
      const [row] = await db
        .select()
        .from(spaces)
        .where(and(eq(spaces.id, input.id), eq(spaces.userId, userId)))
        .limit(1);

      return (row as any) || null;
    }),
    create: os.spaces.create.handler(async ({ input }) => {
      const userId = requireAuth();
      const { name, description } = input;

      const [newSpace] = await db.insert(spaces).values({
        userId,
        name,
        description: description || null,
      }).returning();

      return newSpace as any;
    }),
  },

  ai: {
    ingest: os.ai.ingest.handler(async ({ input }) => {
      const userId = requireAuth();
      const { entryId } = input;

      await processEntry(entryId, userId);

      const [updatedEntry] = await db.select().from(entries).where(eq(entries.id, entryId));

      return {
        success: true,
        data: updatedEntry as any,
      };
    }),
    demo: os.ai.demo.handler(async ({ input }) => {
      const { url, text } = input;

      if (!process.env.JINA_API_KEY || !process.env.OPENAI_API_KEY) {
        throw new Error("Missing AI API keys in backend environment.");
      }

      let extractedText = text || "";

      // Step 1: Jina Reader Extraction
      if (url) {
        extractedText = await extractContentFromUrl(url);
      }

      if (!extractedText) {
        throw new Error("Failed to extract content, or no URL provided.");
      }

      // Step 2: OpenAI Summarization
      const summary = await summarizeText(extractedText);

      // Step 3: OpenAI Embedding
      const embedding = await generateEmbedding(summary);

      return {
        success: true,
        extractedText: url
          ? extractedText.substring(0, 300) + "... (truncated)"
          : extractedText,
        summary,
        embeddingPreview: embedding.slice(0, 5),
        embeddingLength: embedding.length,
      };
    }),
  },
});

const rpcHandler = new RPCHandler(router, {
  plugins: [
    new CORSPlugin({
      origin: () => "*",
      allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    })
  ],
  interceptors: [
    onError((error) => {
      console.error("[orpc server error]", error);
    })
  ]
});

const app = new Hono();

app.all("/api/*", async (c) => {
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: "/api",
    context: {},
  });
  if (matched && response) {
    return response;
  }
  return c.notFound();
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8787;

// Start the Node.js server
serve({
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0", // bind to all interfaces so emulators/devices can reach it
}, (info) => {
  console.log(`Server is running on http://${info.address}:${info.port}`);
});

export default app;
