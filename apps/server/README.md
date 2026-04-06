# Backend Server (Hono + oRPC)

This is the backend server for MyMemory, running on Hono and heavily utilizing oRPC for end-to-end typesafety between the server and the Expo app.

## Architecture

The server adheres to a strict 3-tier architecture separating contracts, routing, and business logic.

### 1. Contracts (`packages/shared/src/contracts/`)
Contracts define exactly what the API promises. They use Zod to validate inputs and outputs.
- **Zero implementation:** Contracts don't know *how* to get the data, they only know its shape.
- **Zero database logic:** They don't import Drizzle or schemas.
- **Shared universally:** These contracts are exported by `@mymemory/shared` so the mobile app can use them to generate full type-safe React Query hooks.

### 2. Routers (`apps/server/src/router/`)
Routers fulfill the contract promises using the `@orpc/server` builder.
- **Thin layer:** Routers should ideally be 1 line per endpoint.
- **Wiring only:** They extract the input and the user context (like `context.db` and `context.user`), and pass them directly to the Services.
- **No business logic:** Do not write logic inside the handlers!

### 3. Services (`apps/server/src/services/`)
Services contain the actual pure business logic.
- **No HTTP knowledge:** Services do not know about Hono, Request, Response, or oRPC headers.
- **Pure functions:** They take in the `db` instance, the `userId`, and the validated `input` from the router, execute the logic (e.g. Drizzle queries, AI tools), and return the result.
- **Testable:** Because they only rely on pure parameters, they are fully unit-testable in isolation.

### 4. Application Root (`apps/server/src/index.ts`)
The root file initializes the Hono app, sets up `dotenv`, configures CORS, and mounts the `RPCHandler` using the combined root router. 
It knows nothing about business logic.

## Adding a New Endpoint

1. **Define the contract:** Go to `packages/shared/src/contracts/` and define the input/output Zod schemas.
2. **Implement the service:** Create or update a file in `apps/server/src/services/` to perform the DB query or computation.
3. **Bind them in the router:** Wire the contract to the service in `apps/server/src/router/`.
4. **Use it in the client:** Your new endpoint is automatically available on the Expo client under `orpc.yourRouter.yourEndpoint`.

## Running the Server

```bash
# Development (starts the Hono server on port 8787)
pnpm dev

# Build
pnpm build
```
