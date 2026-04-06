import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import { onError } from "@orpc/server";
import { db } from "@mymemory/db";
import { appRouter } from "./router/index.js";

const app = new Hono();

const rpcHandler = new RPCHandler(appRouter, {
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

app.all("/api/*", async (c) => {
  // In a real app, parse the auth token from headers here.
  const userId = "00000000-0000-0000-0000-000000000000";

  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: "/api",
    context: { 
      db,
      user: { id: userId }
    },
  });
  
  if (matched && response) {
    return response;
  }
  return c.notFound();
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8787;

serve({
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0",
}, (info) => {
  console.log(`Server is running on http://${info.address}:${info.port}`);
});

export default app;
