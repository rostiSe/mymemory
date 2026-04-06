import "dotenv/config";
import { implement, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import { appContract } from "@mymemory/shared";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { extractContentFromUrl } from "./modules/ai/tools/extract-content.js";
import { summarizeText } from "./modules/ai/tools/summarize.js";
import { generateEmbedding } from "./modules/ai/tools/generate-embedding.js";

const os = implement(appContract);

const router = os.router({
  ping: os.ping.handler(() => "pong"),
  ai: {
    ingest: os.ai.ingest.handler(async ({ input }) => {
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
