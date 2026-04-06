---
name: orpc
description: Use when building type-safe RPC APIs with oRPC (@orpc/server, @orpc/client, @orpc/contract). TRIGGER when code imports from '@orpc/*', user mentions oRPC, or tasks involve end-to-end typesafe procedures, contracts, RPC handlers, or oRPC + TanStack Query / AI SDK integration. Covers procedures, routers, middleware, context, error handling, contract-first development, adapters (HTTP, Hono, WebSocket, React Native), TanStack Query, and AI SDK.
---

# oRPC Skill

Build end-to-end typesafe RPC APIs with **oRPC**. This skill provides inline API knowledge, best practices, and patterns for AI agents. Reference files live in `references/` beside this file.

oRPC (OpenAPI Remote Procedure Call) combines RPC with OpenAPI — define and call remote (or local) procedures through a type-safe API while optionally adhering to the OpenAPI specification. It supports **Zod**, **Valibot**, **ArkType**, or any [Standard Schema](https://github.com/standard-schema/standard-schema) library.

---

## Table of Contents

1. [Installation](#installation)
2. [Core Concepts](#core-concepts)
3. [Procedures](#procedures)
4. [Routers](#routers)
5. [Context](#context)
6. [Middleware](#middleware)
7. [Error Handling](#error-handling)
8. [Contract-First Development](#contract-first-development)
9. [RPC Handler](#rpc-handler)
10. [Adapters](#adapters)
11. [CORS](#cors)
12. [TanStack Query Integration](#tanstack-query-integration)
13. [AI SDK Integration](#ai-sdk-integration)
14. [Best Practices](#best-practices)
15. [Quick Reference](#quick-reference)

---

## Installation

```bash
# Core (server + client)
pnpm add @orpc/server@latest @orpc/client@latest

# Contract-first (optional)
pnpm add @orpc/contract@latest

# TanStack Query integration (optional)
pnpm add @orpc/tanstack-query@latest

# AI SDK integration (optional)
pnpm add @orpc/ai-sdk@latest
```

> **Reference:** `references/getting-started.md`

---

## Core Concepts

oRPC has four pillars:

| Concept       | Purpose                                                        |
| ------------- | -------------------------------------------------------------- |
| **Procedure** | A single RPC endpoint with input/output schemas and a handler  |
| **Router**    | A plain object tree of procedures — nestable, composable       |
| **Context**   | Type-safe dependency injection (initial + execution)           |
| **Middleware** | Intercept, guard, or enrich procedure execution                |

The entry point is `os` from `@orpc/server` (or `implement(contract)` for contract-first).

---

## Procedures

A procedure is defined by chaining `.input()`, `.output()`, `.use()`, and `.handler()` on `os`.

```ts
import { os } from "@orpc/server";
import * as z from "zod";

const PlanetSchema = z.object({
  id: z.number().int().min(1),
  name: z.string(),
  description: z.string().optional(),
});

export const listPlanets = os
  .input(
    z.object({
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.number().int().min(0).default(0),
    }),
  )
  .handler(async ({ input }) => {
    return [{ id: 1, name: "Earth" }];
  });

export const findPlanet = os
  .input(PlanetSchema.pick({ id: true }))
  .handler(async ({ input }) => {
    return { id: input.id, name: "Earth" };
  });
```

### Key rules

- **Always validate input** — use `.input(zodSchema)` (or any Standard Schema).
- Define `.output()` when you need runtime output validation or contract enforcement.
- The handler receives `{ input, context }` — destructure only what you need.
- A procedure is also a valid router (single-procedure router).

> **Reference:** `references/getting-started.md`

---

## Routers

Routers are **plain JavaScript objects** whose leaves are procedures. They nest naturally.

```ts
const router = {
  planet: {
    list: listPlanets,
    find: findPlanet,
    create: createPlanet,
  },
  health: os.handler(async () => "ok"),
};
```

### Extending a router with middleware

Apply middleware to every procedure in a router using `os.use().router()`:

```ts
const protectedRouter = os.use(requireAuth).router({
  planet: { create: createPlanet },
});
```

> **Warning:** If the same middleware is applied at both router and procedure level it may run twice. See [Dedupe Middleware](#dedupe-middleware) below.

### Lazy routers (code splitting)

Defer loading of route subtrees for better cold-start performance:

```ts
import { lazy } from "@orpc/server";

const router = {
  ping,
  planet: lazy(() => import("./planet")), // default export = sub-router
};
```

> Use the standalone `lazy` helper from `@orpc/server` — it is faster for type inference than `os.lazy`.

### Type utilities

```ts
import type {
  InferRouterInputs,
  InferRouterOutputs,
  InferRouterInitialContexts,
  InferRouterCurrentContexts,
} from "@orpc/server";

type Inputs = InferRouterInputs<typeof router>;
type Outputs = InferRouterOutputs<typeof router>;
```

> **Reference:** `references/router.md`

---

## Context

Context is oRPC's **type-safe dependency injection**. Two flavours:

### Initial context — provided at call-site

```ts
const base = os.$context<{ headers: Headers; env: { DB_URL: string } }>();

const handler = new RPCHandler(router);

handler.handle(request, {
  context: {
    headers: request.headers,
    env: { DB_URL: "postgres://..." },
  },
});
```

### Execution context — computed by middleware

```ts
const base = os.use(async ({ next }) =>
  next({
    context: {
      headers: await headers(),
      cookies: await cookies(),
    },
  }),
);
```

### Combining both

Use initial context for environment values and middleware for runtime data:

```ts
const base = os.$context<{ headers: Headers; env: { DB_URL: string } }>();

const requireAuth = base.middleware(async ({ context, next }) => {
  const user = parseJWT(context.headers.get("authorization")?.split(" ")[1]);
  if (!user) throw new ORPCError("UNAUTHORIZED");
  return next({ context: { user } });
});

const dbProvider = base.middleware(async ({ context, next }) => {
  const client = new Client(context.env.DB_URL);
  try {
    await client.connect();
    return next({ context: { db: client } });
  } finally {
    await client.disconnect();
  }
});
```

> **Reference:** `references/context.md`

---

## Middleware

Middleware intercepts handler execution, can inject context, guard access, or modify output.

### Basic middleware

```ts
const authMiddleware = os
  .$context<{ something?: string }>()
  .middleware(async ({ context, next }) => {
    // before handler
    const result = await next({
      context: { user: { id: 1, name: "John" } },
    });
    // after handler
    return result;
  });

const example = os.use(authMiddleware).handler(async ({ context }) => {
  context.user; // { id: 1, name: "John" }
});
```

### Inline middleware

```ts
const example = os
  .use(async ({ context, next }) => {
    return next();
  })
  .handler(async () => "done");
```

### Middleware with input

```ts
const canUpdate = os.middleware(async ({ context, next }, input: number) => {
  // permission check using input
  return next();
});

const updatePlanet = os
  .input(z.object({ id: z.number() }))
  .use(canUpdate, (input) => input.id) // map input
  .handler(async ({ input }) => {
    return { id: input.id, name: "Updated" };
  });
```

### Middleware output (e.g. caching)

```ts
const cacheMid = os.middleware(
  async ({ context, next, path }, input, output) => {
    const cacheKey = path.join("/") + JSON.stringify(input);
    if (cache.has(cacheKey)) return output(cache.get(cacheKey));

    const result = await next({});
    cache.set(cacheKey, result.output);
    return result;
  },
);
```

### Concatenation

```ts
const combined = authMiddleware
  .concat(loggingMiddleware)
  .concat(rateLimitMiddleware);
```

### Built-in lifecycle middlewares

```ts
import { onStart, onSuccess, onError, onFinish } from "@orpc/server";

const example = os
  .use(onStart(() => { /* before handler */ }))
  .use(onSuccess(() => { /* handler succeeded */ }))
  .use(onError((error) => { /* handler failed */ }))
  .use(onFinish(() => { /* always after handler */ }))
  .handler(async () => "result");
```

> **Reference:** `references/middleware.md`

---

## Error Handling

### Normal approach — `ORPCError`

```ts
import { ORPCError } from "@orpc/server";

throw new ORPCError("NOT_FOUND");
throw new ORPCError("RATE_LIMITED", {
  message: "Too many requests",
  data: { retryAfter: 60 },
});
```

> **DANGER:** `ORPCError.data` is sent to the client. **Never include sensitive information.**

### Type-safe approach — `.errors()`

Pre-define error types so clients can infer and handle them:

```ts
const base = os.errors({
  RATE_LIMITED: {
    data: z.object({ retryAfter: z.number() }),
  },
  UNAUTHORIZED: {},
});

const rateLimit = base.middleware(async ({ next, errors }) => {
  throw errors.RATE_LIMITED({
    message: "Too many requests",
    data: { retryAfter: 60 },
  });
  return next();
});

const example = base
  .use(rateLimit)
  .errors({
    NOT_FOUND: { message: "Resource not found" },
  })
  .handler(async ({ errors }) => {
    throw errors.NOT_FOUND();
  });
```

### Client-side error handling

```ts
import { isDefinedError } from "@orpc/client";

if (isDefinedError(error)) {
  // error.code, error.data are fully typed
}
```

### Combining both approaches

You can freely mix `throw new ORPCError(...)` and `throw errors.CODE(...)`. If the code, status, and data match a defined error, oRPC treats them identically.

> **Reference:** `references/error-handling.md`

---

## Contract-First Development

Define the API shape **before** any implementation. This ensures client and server share an exact interface.

### 1. Define the contract

```ts
import { oc } from "@orpc/contract";
import * as z from "zod";

const PlanetSchema = z.object({
  id: z.number().int().min(1),
  name: z.string(),
  description: z.string().optional(),
});

export const contract = {
  planet: {
    list: oc
      .input(z.object({
        limit: z.number().int().min(1).max(100).optional(),
        cursor: z.number().int().min(0).default(0),
      }))
      .output(z.array(PlanetSchema)),
    find: oc
      .input(PlanetSchema.pick({ id: true }))
      .output(PlanetSchema),
    create: oc
      .input(PlanetSchema.omit({ id: true }))
      .output(PlanetSchema),
  },
};
```

### 2. Implement the contract

```ts
import { implement } from "@orpc/server";
import { contract } from "./contract";

const os = implement(contract); // replaces the standard `os`

const listPlanet = os.planet.list.handler(({ input }) => []);
const findPlanet = os.planet.find.handler(({ input }) => ({ id: 1, name: "X" }));
const createPlanet = os.planet.create.handler(({ input }) => ({ id: 1, ...input }));

// .router() enforces the full contract at the type level
const router = os.router({
  planet: { list: listPlanet, find: findPlanet, create: createPlanet },
});
```

### 3. Infer types from contract

```ts
import type { InferContractRouterInputs, InferContractRouterOutputs } from "@orpc/contract";

type Inputs = InferContractRouterInputs<typeof contract>;
type Outputs = InferContractRouterOutputs<typeof contract>;
```

### Router to contract (reverse direction)

If you built the router first, you can export it as a contract for clients:

```ts
import { minifyContractRouter } from "@orpc/contract";

const minified = minifyContractRouter(router);
fs.writeFileSync("./contract.json", JSON.stringify(minified));
```

On the client, cast the JSON back: `import contract from "./contract.json"`.

> **Reference:** `references/contract-first.md`

---

## RPC Handler

`RPCHandler` uses oRPC's proprietary binary-friendly protocol over HTTP. It natively supports: `string`, `number`, `boolean`, `null`, `undefined`, `Date`, `BigInt`, `RegExp`, `URL`, `Set`, `Map`, `Blob`, `File`, `AsyncIteratorObject`.

### Basic setup

```ts
import { RPCHandler } from "@orpc/server/fetch"; // or /node, /fastify, /aws-lambda
import { CORSPlugin } from "@orpc/server/plugins";
import { onError } from "@orpc/server";

const handler = new RPCHandler(router, {
  plugins: [new CORSPlugin()],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});
```

### Handling requests (Fetch API)

```ts
export default async function fetch(request: Request) {
  const { matched, response } = await handler.handle(request, {
    prefix: "/rpc",
    context: {}, // initial context
  });

  if (matched) return response;
  return new Response("Not Found", { status: 404 });
}
```

### Filtering procedures

```ts
const handler = new RPCHandler(router, {
  filter: ({ contract, path }) =>
    !contract["~orpc"].route.tags?.includes("internal"),
});
```

> **Reference:** `references/rpc-handler.md`

---

## Adapters

### HTTP adapters (server)

| Adapter      | Import path                | Target                                  |
| ------------ | -------------------------- | --------------------------------------- |
| `fetch`      | `@orpc/server/fetch`      | Bun, Deno, Cloudflare Workers, browser  |
| `node`       | `@orpc/server/node`       | Node.js `http`/`http2`                  |
| `fastify`    | `@orpc/server/fastify`    | Fastify                                 |
| `aws-lambda` | `@orpc/server/aws-lambda` | AWS Lambda                              |

#### Node.js example

```ts
import { createServer } from "node:http";
import { RPCHandler } from "@orpc/server/node";

const handler = new RPCHandler(router, {
  plugins: [new CORSPlugin()],
  interceptors: [onError((e) => console.error(e))],
});

const server = createServer(async (req, res) => {
  const { matched } = await handler.handle(req, res, {
    prefix: "/rpc",
    context: { headers: req.headers },
  });
  if (!matched) {
    res.statusCode = 404;
    res.end("Not found");
  }
});

server.listen(3000);
```

> **Reference:** `references/http.md`

### Hono adapter

oRPC works with Hono via the `fetch` adapter:

```ts
import { Hono } from "hono";
import { RPCHandler } from "@orpc/server/fetch";

const app = new Hono();

const handler = new RPCHandler(router, {
  interceptors: [onError((e) => console.error(e))],
});

app.use("/rpc/*", async (c, next) => {
  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: "/rpc",
    context: {},
  });
  if (matched) return c.newResponse(response.body, response);
  await next();
});

export default app;
```

#### Fixing "Body Already Used" error

If Hono middleware reads the body before oRPC, proxy the request:

```ts
const BODY_PARSER_METHODS = new Set(["arrayBuffer", "blob", "formData", "json", "text"] as const);
type BodyParserMethod = typeof BODY_PARSER_METHODS extends Set<infer T> ? T : never;

app.use("/rpc/*", async (c, next) => {
  const request = new Proxy(c.req.raw, {
    get(target, prop) {
      if (BODY_PARSER_METHODS.has(prop as BodyParserMethod)) {
        return () => c.req[prop as BodyParserMethod]();
      }
      return Reflect.get(target, prop, target);
    },
  });

  const { matched, response } = await handler.handle(request, {
    prefix: "/rpc",
    context: {},
  });
  if (matched) return c.newResponse(response.body, response);
  await next();
});
```

> **Reference:** `references/hono-adapter.md`

### WebSocket adapters

| Adapter      | Import path                     | Target                                        |
| ------------ | ------------------------------- | --------------------------------------------- |
| `websocket`  | `@orpc/server/websocket`       | MDN WebSocket (Browser, Deno, CF Workers)     |
| `crossws`    | `@orpc/server/crossws`         | Crossws (Node, Bun, Deno, SSE)               |
| `ws`         | `@orpc/server/ws`              | ws library (Node.js)                          |
| `bun-ws`     | `@orpc/server/bun-ws`          | Bun WebSocket Server                          |

#### ws (Node.js) example

```ts
import { WebSocketServer } from "ws";
import { RPCHandler } from "@orpc/server/ws";

const handler = new RPCHandler(router, {
  interceptors: [onError((e) => console.error(e))],
});

const wss = new WebSocketServer({ port: 8080 });
wss.on("connection", (ws) => {
  handler.upgrade(ws, { context: {} });
});
```

#### Client WebSocket link

```ts
import { RPCLink } from "@orpc/client/websocket";

const link = new RPCLink({
  websocket: new WebSocket("ws://localhost:8080"),
});
```

> **Tip:** Use [partysocket](https://www.npmjs.com/package/partysocket) for auto-reconnect logic.

> **Reference:** `references/websocket.md`

### React Native adapter

React Native includes a Fetch API, so oRPC works out of the box:

```ts
import { RPCLink } from "@orpc/client/fetch";

const link = new RPCLink({
  url: "http://localhost:3000/rpc",
  headers: async ({ context }) => ({
    "x-api-key": context?.something ?? "",
  }),
});
```

> **Warning:** RN's Fetch API does not support File/Blob or Event Iterator (streaming). Track [react-native#27741](https://github.com/facebook/react-native/issues/27741).

#### Using `expo/fetch` for streaming support

```ts
const link = new RPCLink({
  url: "http://localhost:3000/rpc",
  async fetch(request, init) {
    const { fetch } = await import("expo/fetch");
    const resp = await fetch(request.url, {
      body: await request.blob(),
      headers: request.headers,
      method: request.method,
      signal: request.signal,
      ...init,
    });
    return resp;
  },
});
```

> **Reference:** `references/react-native.md`

---

## CORS

Use the built-in `CORSPlugin`:

```ts
import { CORSPlugin } from "@orpc/server/plugins";

const handler = new RPCHandler(router, {
  plugins: [
    new CORSPlugin({
      origin: (origin) => origin,
      allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    }),
  ],
});
```

> Do **not** use Hono's CORS middleware alongside `CORSPlugin` — pick one.

> **Reference:** `references/cors.md`

---

## TanStack Query Integration

### Setup

```ts
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { RouterClient } from "@orpc/server";

declare const client: RouterClient<typeof router>;

export const orpc = createTanstackQueryUtils(client);
```

### Avoiding key conflicts (multi-service)

```ts
const userOrpc = createTanstackQueryUtils(userClient, { path: ["user"] });
const postOrpc = createTanstackQueryUtils(postClient, { path: ["post"] });
```

### Query options

```ts
const query = useQuery(
  orpc.planet.find.queryOptions({
    input: { id: 123 },
    context: { cache: true },
  }),
);
```

### Infinite query options

```ts
const query = useInfiniteQuery(
  orpc.planet.list.infiniteOptions({
    input: (pageParam: number | undefined) => ({
      limit: 10,
      offset: pageParam,
    }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageParam,
  }),
);
```

### Mutation options

```ts
const mutation = useMutation(
  orpc.planet.create.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.planet.key() });
    },
  }),
);

mutation.mutate({ name: "Mars" });
```

### Query key helpers

```ts
orpc.planet.key()                              // partial — all planet queries
orpc.planet.key({ type: "query" })             // only regular queries
orpc.planet.find.key({ input: { id: 123 } })   // specific query
orpc.planet.find.queryKey({ input: { id: 123 }}) // full key
```

### Default options

```ts
const orpc = createTanstackQueryUtils(client, {
  experimental_defaults: {
    planet: {
      find: { queryOptions: { staleTime: 60_000, retry: 3 } },
      create: {
        mutationOptions: {
          onSuccess: (_output, _input, _, ctx) => {
            ctx.client.invalidateQueries({ queryKey: orpc.planet.key() });
          },
        },
      },
    },
  },
});
```

### Error handling with TanStack Query

```ts
import { isDefinedError } from "@orpc/client";

const mutation = useMutation(
  orpc.planet.create.mutationOptions({
    onError: (error) => {
      if (isDefinedError(error)) {
        // error.code and error.data are fully typed
      }
    },
  }),
);
```

### `skipToken` for conditional queries

```ts
const query = useQuery(
  orpc.planet.list.queryOptions({
    input: search ? { search } : skipToken,
  }),
);
```

### Streamed / Live query options (Event Iterator)

```ts
// Streamed: data is an array, events appended
const streamed = useQuery(
  orpc.events.experimental_streamedOptions({
    input: { id: 123 },
    queryFnOptions: { refetchMode: "reset", maxChunks: 3 },
    retry: true,
  }),
);

// Live: data is always the latest event
const live = useQuery(
  orpc.events.experimental_liveOptions({
    input: { id: 123 },
    retry: true,
  }),
);
```

### Hydration (SSR)

Use `StandardRPCJsonSerializer` to serialize oRPC types through TanStack Query hydration:

```ts
import { StandardRPCJsonSerializer } from "@orpc/client/standard";

const serializer = new StandardRPCJsonSerializer();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn(queryKey) {
        const [json, meta] = serializer.serialize(queryKey);
        return JSON.stringify({ json, meta });
      },
      staleTime: 60_000,
    },
    dehydrate: {
      serializeData(data) {
        const [json, meta] = serializer.serialize(data);
        return { json, meta };
      },
    },
    hydrate: {
      deserializeData(data) {
        return serializer.deserialize(data.json, data.meta);
      },
    },
  },
});
```

> **Reference:** `references/tanstack-query.md`

---

## AI SDK Integration

oRPC integrates with [AI SDK](https://ai-sdk.dev/) v5.0+ for streaming AI responses through procedures.

### Server — streaming AI responses

```ts
import { os, streamToEventIterator, type } from "@orpc/server";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { google } from "@ai-sdk/google";

export const chat = os
  .input(type<{ chatId: string; messages: UIMessage[] }>())
  .handler(async ({ input }) => {
    const result = streamText({
      model: google("gemini-1.5-flash"),
      system: "You are a helpful assistant.",
      messages: await convertToModelMessages(input.messages),
    });
    return streamToEventIterator(result.toUIMessageStream());
  });
```

### Client — consuming the stream

```ts
import { useChat } from "@ai-sdk/react";
import { eventIteratorToUnproxiedDataStream } from "@orpc/client";

function ChatUI() {
  const { messages, sendMessage, status } = useChat({
    transport: {
      async sendMessages(options) {
        return eventIteratorToUnproxiedDataStream(
          await client.chat(
            { chatId: options.chatId, messages: options.messages },
            { signal: options.abortSignal },
          ),
        );
      },
      reconnectToStream() {
        throw new Error("Unsupported");
      },
    },
  });
  // render messages...
}
```

> **Important:** Prefer `eventIteratorToUnproxiedDataStream` over `eventIteratorToStream`. AI SDK uses `structuredClone` internally, which does not support proxied data.

### `createTool` — procedure as AI SDK tool

```ts
import { createTool, AI_SDK_TOOL_META_SYMBOL, AiSdkToolMeta } from "@orpc/ai-sdk";

interface ORPCMeta extends AiSdkToolMeta {}
const base = os.$meta<ORPCMeta>({});

const getWeather = base
  .meta({ [AI_SDK_TOOL_META_SYMBOL]: { title: "Get Weather" } })
  .route({ summary: "Get weather in a location" })
  .input(z.object({ location: z.string() }))
  .output(z.object({ location: z.string(), temperature: z.number() }))
  .handler(async ({ input }) => ({
    location: input.location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }));

const tool = createTool(getWeather, { context: {} });
```

### `implementTool` — contract as AI SDK tool

```ts
import { implementTool, AI_SDK_TOOL_META_SYMBOL } from "@orpc/ai-sdk";

const tool = implementTool(getWeatherContract, {
  execute: async ({ location }) => ({
    location,
    temperature: 72,
  }),
});
```

> Both helpers require a procedure/contract with an `input` schema defined.

> **Reference:** `references/aisdk.md`

---

## Best Practices

### 1. Prefer contract-first for shared APIs

When the API is consumed by multiple clients (mobile, web, third-party), define a contract with `@orpc/contract`. This:

- Decouples client and server development.
- Generates accurate types for both sides.
- Enables OpenAPI spec generation from the same source.
- Prevents accidental API breakage.

### 2. Dedupe middleware

When a procedure calls another or a router wraps procedures that already have middleware, the same middleware may run multiple times. **Use context to skip re-execution:**

```ts
const dbProvider = os
  .$context<{ db?: Awaited<ReturnType<typeof connectDb>> }>()
  .middleware(async ({ context, next }) => {
    const db = context.db ?? await connectDb(); // skip if already connected
    return next({ context: { db } });
  });
```

oRPC also has **built-in deduplication**: if router middlewares are a subset of the leading procedure middlewares in the same order, they are automatically deduped. Disable with:

```ts
const base = os.$config({ dedupeLeadingMiddlewares: false });
```

### 3. Keep routers as plain objects

oRPC routers are plain `{ key: procedure }` objects — no class instances, no special wrappers. This makes them trivially composable, testable, and splittable.

### 4. Use lazy routers for large APIs

```ts
const router = {
  auth: lazy(() => import("./auth")),
  planet: lazy(() => import("./planet")),
};
```

This splits server code and reduces cold-start time in serverless environments.

### 5. Never expose sensitive data in errors

`ORPCError.data` is transmitted to the client. Log sensitive details server-side with `onError`, and only include user-facing info in the error data.

### 6. Type-safe errors over generic throws

Define errors with `.errors()` so clients get full TypeScript inference. This eliminates stringly-typed error handling on the client.

### 7. Use `onError` interceptor for logging

Always attach an `onError` interceptor to your handler for centralized error logging:

```ts
const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      logger.error(error);
    }),
  ],
});
```

### 8. Scope context narrowly

- Use **initial context** (`$context<T>()`) for environment-specific values (DB URLs, secrets).
- Use **middleware context** for per-request data (auth user, headers).
- Never put request-specific data in initial context of a shared handler instance.

### 9. Monorepo structure

For multi-service or full-stack monorepos:

```
apps/
  api/         # imports core-service, runs RPCHandler
  web/         # imports core-contract, creates client
  mobile/      # imports core-contract, creates client
packages/
  core-contract/   # @orpc/contract — shared types
  core-service/    # @orpc/server — implements contract
```

- Enable `composite: true` in server `tsconfig.json`.
- Add `references: [{ "path": "../core-service" }]` in consumer `tsconfig.json`.
- Avoid alias imports inside server packages; use workspace protocol links.

### 10. SSR optimization

Avoid the server calling its own HTTP API during SSR. Use `createRouterClient` server-side and `createORPCClient` client-side:

```ts
// Server — direct procedure invocation, no HTTP
import { createRouterClient } from "@orpc/server";
globalThis.$client = createRouterClient(router, {
  context: async () => ({ headers: await headers() }),
});

// Client — falls back to HTTP
const link = new RPCLink({ url: `${window.location.origin}/rpc` });
export const client = globalThis.$client ?? createORPCClient(link);
```

### 11. Event Iterator reliability (HTTP)

Configure keep-alive and initial comments to prevent timeouts on long-lived streams:

```ts
const handler = new RPCHandler(router, {
  eventIteratorKeepAliveEnabled: true,
  eventIteratorKeepAliveInterval: 5000,
  eventIteratorInitialCommentEnabled: true,
});
```

### 12. TanStack Query invalidation on mutation

Always invalidate related queries after a mutation:

```ts
const mutation = useMutation(
  orpc.planet.create.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.planet.key() });
    },
  }),
);
```

### 13. Use `skipToken` instead of `enabled: false`

For conditional queries, prefer `skipToken` over the `enabled` option — it is type-safe and prevents passing invalid input:

```ts
orpc.planet.list.queryOptions({
  input: search ? { search } : skipToken,
});
```

---

## Quick Reference

### Imports cheat sheet

```ts
// Server
import { os, ORPCError, implement, lazy, onError, onStart, onSuccess, onFinish, streamToEventIterator } from "@orpc/server";
import type { RouterClient, InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";  // or /node, /fastify, /aws-lambda, /ws, /websocket
import { CORSPlugin } from "@orpc/server/plugins";

// Contract
import { oc, minifyContractRouter } from "@orpc/contract";
import type { InferContractRouterInputs, InferContractRouterOutputs } from "@orpc/contract";

// Client
import { createORPCClient, isDefinedError, eventIteratorToUnproxiedDataStream } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";      // HTTP
import { RPCLink } from "@orpc/client/websocket";   // WebSocket

// TanStack Query
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

// AI SDK
import { createTool, implementTool, AI_SDK_TOOL_META_SYMBOL } from "@orpc/ai-sdk";
```

### Decision tree: which approach?

```
Need OpenAPI spec or multiple clients?
  └─ Yes → Contract-first (@orpc/contract + implement)
  └─ No  → Direct procedures (os from @orpc/server)

Need real-time / bidirectional?
  └─ Yes → WebSocket adapter
  └─ No  → HTTP adapter (fetch / node / hono)

React Native client?
  └─ Yes → RPCLink with expo/fetch for streaming
  └─ No  → Standard RPCLink

AI features?
  └─ Yes → streamToEventIterator + @orpc/ai-sdk
```

---

## Reference File Index

| File | Covers |
| --- | --- |
| `references/getting-started.md` | Installation, first procedure, server/client setup |
| `references/contract-first.md` | Define contract, implement contract, router-to-contract, OpenAPI-to-contract |
| `references/router.md` | Router structure, extending, lazy routers, type utilities |
| `references/middleware.md` | Middleware patterns, input/output, concatenation, built-in lifecycles |
| `references/context.md` | Initial context, execution context, combining both |
| `references/error-handling.md` | ORPCError, type-safe errors with `.errors()`, combining approaches |
| `references/rpc-handler.md` | RPCHandler setup, supported types, filtering, lifecycle diagram |
| `references/http.md` | HTTP adapters (fetch, node, fastify, aws-lambda), Event Iterator options |
| `references/hono-adapter.md` | Hono integration, body-already-used fix |
| `references/websocket.md` | WebSocket server adapters (ws, bun-ws, crossws, MDN), client link |
| `references/react-native.md` | React Native / Expo fetch link, expo/fetch for streaming |
| `references/cors.md` | CORSPlugin configuration |
| `references/tanstack-query.md` | TanStack Query utils, query/mutation/infinite options, keys, hydration |
| `references/aisdk.md` | AI SDK streaming, createTool, implementTool, useChat transport |
