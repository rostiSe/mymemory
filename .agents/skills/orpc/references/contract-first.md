---
url: /docs/contract-first/define-contract.md
description: Learn how to define a contract for contract-first development in oRPC
---

# Define Contract

**Contract-first development** is a design pattern where you define the API contract before writing any implementation code. This methodology promotes a well-structured codebase that adheres to best practices and facilitates easier maintenance and evolution over time.

In oRPC, a **contract** specifies the rules and expectations for a procedure. It details the input, output, errors,... types and can include constraints or validations to ensure that both client and server share a clear, consistent interface.

## Installation

::: code-group

```sh [npm]
npm install @orpc/contract@latest
```

```sh [yarn]
yarn add @orpc/contract@latest
```

```sh [pnpm]
pnpm add @orpc/contract@latest
```

```sh [bun]
bun add @orpc/contract@latest
```

```sh [deno]
deno add npm:@orpc/contract@latest
```

:::

## Procedure Contract

A procedure contract in oRPC is similar to a standard [procedure](/docs/procedure) definition, but with extraneous APIs removed to better support contract-first development.

```ts twoslash
import * as z from "zod";
// ---cut---
import { oc } from "@orpc/contract";

export const exampleContract = oc
  .input(
    z.object({
      name: z.string(),
      age: z.number().int().min(0),
    }),
  )
  .output(
    z.object({
      id: z.number().int().min(0),
      name: z.string(),
      age: z.number().int().min(0),
    }),
  );
```

## Contract Router

Similar to the standard [router](/docs/router) in oRPC, the contract router organizes your defined contracts into a structured hierarchy. The contract router is streamlined by removing APIs that are not essential for contract-first development.

```ts
export const routerContract = {
  example: exampleContract,
  nested: {
    example: exampleContract,
  },
};
```

## Full Example

Below is a complete example demonstrating how to define a contract for a simple "Planet" service. This example extracted from our [Getting Started](/docs/getting-started) guide.

```ts twoslash
import * as z from "zod";
import { oc } from "@orpc/contract";
// ---cut---
export const PlanetSchema = z.object({
  id: z.number().int().min(1),
  name: z.string(),
  description: z.string().optional(),
});

export const listPlanetContract = oc
  .input(
    z.object({
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.number().int().min(0).default(0),
    }),
  )
  .output(z.array(PlanetSchema));

export const findPlanetContract = oc
  .input(PlanetSchema.pick({ id: true }))
  .output(PlanetSchema);

export const createPlanetContract = oc
  .input(PlanetSchema.omit({ id: true }))
  .output(PlanetSchema);

export const contract = {
  planet: {
    list: listPlanetContract,
    find: findPlanetContract,
    create: createPlanetContract,
  },
};
```

## Utilities

### Infer Contract Router Input

```ts twoslash
import type { contract } from "./shared/planet";
// ---cut---
import type { InferContractRouterInputs } from "@orpc/contract";

export type Inputs = InferContractRouterInputs<typeof contract>;

type FindPlanetInput = Inputs["planet"]["find"];
```

This snippet automatically extracts the expected input types for each procedure in the router.

### Infer Contract Router Output

```ts twoslash
import type { contract } from "./shared/planet";
// ---cut---
import type { InferContractRouterOutputs } from "@orpc/contract";

export type Outputs = InferContractRouterOutputs<typeof contract>;

type FindPlanetOutput = Outputs["planet"]["find"];
```

Similarly, this utility infers the output types, ensuring that your application correctly handles the results from each procedure.

---

url: /docs/contract-first/implement-contract.md
description: Learn how to implement a contract for contract-first development in oRPC

---

# Implement Contract

After defining your contract, the next step is to implement it in your server code. oRPC enforces your contract at runtime, ensuring that your API consistently adheres to its specifications.

## Installation

::: code-group

```sh [npm]
npm install @orpc/server@latest
```

```sh [yarn]
yarn add @orpc/server@latest
```

```sh [pnpm]
pnpm add @orpc/server@latest
```

```sh [bun]
bun add @orpc/server@latest
```

```sh [deno]
deno add npm:@orpc/server@latest
```

:::

## The Implementer

The `implement` function converts your contract into an implementer instance. This instance compatible with the original `os` from `@orpc/server` provides a type-safe interface to define your procedures and supports features like [Middleware](/docs/middleware) and [Context](/docs/context).

```ts twoslash
import { contract } from "./shared/planet";
// ---cut---
import { implement } from "@orpc/server";

const os = implement(contract); // fully replaces the os from @orpc/server
```

## Implementing Procedures

Define a procedure by attaching a `.handler` to its corresponding contract, ensuring it adheres to the contract's specifications.

```ts twoslash
import { contract } from "./shared/planet";
import { implement } from "@orpc/server";

const os = implement(contract);
// ---cut---
export const listPlanet = os.planet.list.handler(({ input }) => {
  // Your logic for listing planets
  return [];
});
```

## Building the Router

To assemble your API, create a router at the root level using `.router`. This ensures that the entire router is type-checked and enforces the contract at runtime.

```ts
const router = os.router({
  // <-- Essential for full contract enforcement
  planet: {
    list: listPlanet,
    find: findPlanet,
    create: createPlanet,
  },
});
```

## Full Implementation Example

Below is a complete implementation of the contract defined in the [previous section](/docs/contract-first/define-contract).

```ts twoslash
import { contract } from "./shared/planet";
import { implement } from "@orpc/server";
// ---cut---
const os = implement(contract);

export const listPlanet = os.planet.list.handler(({ input }) => {
  return [];
});

export const findPlanet = os.planet.find.handler(({ input }) => {
  return { id: 123, name: "Planet X" };
});

export const createPlanet = os.planet.create.handler(({ input }) => {
  return { id: 123, name: "Planet X" };
});

export const router = os.router({
  planet: {
    list: listPlanet,
    find: findPlanet,
    create: createPlanet,
  },
});
```

---

url: /docs/contract-first/router-to-contract.md
description: >-
Learn how to convert a router into a contract, safely export it, and prevent
exposing internal details to the client.

---

# Router to Contract

A normal [router](/docs/router) works as a contract router as long as it does not include a [lazy router](/docs/router#lazy-router). This guide not only shows you how to **unlazy** a router to make it compatible with contracts, but also how to **minify** it and **prevent internal business logic from being exposed to the client**.

## Unlazy the Router

If your router includes a [lazy router](/docs/router#lazy-router), you need to fully resolve it to make it compatible with contract.

```ts
import { unlazyRouter } from "@orpc/server";

const resolvedRouter = await unlazyRouter(router);
```

## Minify & Export the Contract Router for the Client

Sometimes, you'll need to import the contract on the client - for example, to use [OpenAPILink](/docs/openapi/client/openapi-link) or define request methods in [RPCLink](/docs/client/rpc-link#custom-request-method).

If you're using [Contract First](/docs/contract-first/define-contract), this is safe: your contract is already lightweight and free of business logic.

However, if you're deriving the contract from a [router](/docs/router), importing it directly can be heavy and may leak internal logic. To prevent this, follow the steps below to safely minify and export your contract.

1. **Minify the Contract Router and Export to JSON**

   ```ts
   import fs from "node:fs";
   import { minifyContractRouter } from "@orpc/contract";

   const minifiedRouter = minifyContractRouter(router);

   fs.writeFileSync("./contract.json", JSON.stringify(minifiedRouter));
   ```

   ::: warning
   `minifyContractRouter` preserves only the metadata and routing information necessary for the client, all other data will be stripped out.
   :::

2. **Import the Contract JSON on the Client Side**

   ```ts
   import contract from "./contract.json"; // [!code highlight]

   const link = new OpenAPILink(contract as typeof router, {
     url: "http://localhost:3000/api",
   });
   ```

   ::: warning
   Cast `contract` to `typeof router` to ensure type safety, since standard schema types cannot be serialized to JSON so we must manually cast them.
   :::

---

url: /docs/openapi/openapi-to-contract.md
description: >-
Generate an oRPC contract from an existing OpenAPI specification with the Hey
API oRPC plugin.

---

# OpenAPI to Contract

If you already have an [OpenAPI Specification](https://swagger.io/specification/), you can generate an oRPC contract with [Hey API](https://heyapi.dev/)'s `orpc` plugin instead of defining the contract manually.

::: warning
The Hey API `orpc` plugin is currently beta and may introduce breaking changes while the integration stabilizes.
:::

## Example

```sh
npm install -D @hey-api/openapi-ts
```

```ts [openapi-ts.config.ts]
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "https://get.heyapi.dev/hey-api/backend",
  output: "src/client",
  plugins: [
    {
      name: "orpc",
      validator: {
        input: "zod",
      },
    },
  ],
});
```

Then run:

```sh
npx @hey-api/openapi-ts
```

This generates an oRPC-compatible contract from your OpenAPI specification. In this example, `zod` is used for generated input validation.

For more details about configuration options and plugin behavior, see the [Hey API oRPC plugin documentation](https://heyapi.dev/openapi-ts/plugins/orpc).

## What To Do Next

Once the contract is generated, what you do next depends on how you want to use it:

- Implement the contract on your own server with [Implement Contract](/docs/contract-first/implement-contract).
- Create a type-safe client with [OpenAPILink](/docs/openapi/client/openapi-link).
- Use the generated contract as a reference alongside [Define Contract](/docs/contract-first/define-contract) to better understand its structure.
