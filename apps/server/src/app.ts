import { db } from "@mymemory/db";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import "dotenv/config";
import { Hono } from "hono";
import { appRouter } from "./router/index.js";

const app = new Hono();

const rpcHandler = new RPCHandler(appRouter, {
  plugins: [
    new CORSPlugin({
      origin: () => "*",
      allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error("[orpc server error]", error);
    }),
  ],
});

const BODY_PARSER_METHODS = new Set([
  "arrayBuffer",
  "blob",
  "formData",
  "json",
  "text",
] as const);

type BodyParserMethod =
  typeof BODY_PARSER_METHODS extends Set<infer T> ? T : never;

app.all("/api/*", async (c, next) => {
  // In a real app, parse the auth token from headers here.
  const userId = "00000000-0000-0000-0000-000000000000";

  const request = new Proxy(c.req.raw, {
    get(target, prop) {
      if (BODY_PARSER_METHODS.has(prop as BodyParserMethod)) {
        return () => c.req[prop as BodyParserMethod]();
      }
      return Reflect.get(target, prop, target);
    },
  });

  const { matched, response } = await rpcHandler.handle(request, {
    prefix: "/api",
    context: {
      db,
      user: { id: userId },
    },
  });

  if (matched && response) {
    return response;
  }
  return await next();
});

export default app;
