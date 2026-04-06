# Architecture & Monorepo Structure

This project uses a Turborepo-powered pnpm workspace to orchestrate a mobile app (Expo) and a backend API (Hono) that share perfect end-to-end types using a contract-first oRPC setup.

## Workspace Layout

```text
/apps
  /mobile          # Expo React Native App
  /server          # Hono backend API
/packages
  /shared          # oRPC contracts, schemas, shared utilities
  /db              # Drizzle ORM schema and configurations
```

## How It Works

1. **`@mymemory/shared`**: Contains pure API definitions using `@orpc/contract` and Zod schemas. This package enforces what the API must receive and return. It contains no implementation logic.
2. **`@mymemory/db`**: Isolates all database schema definitions (`drizzle-orm`). The backend (`apps/server`) imports this package to query the database.
3. **`apps/server` (Backend)**: Implements the oRPC contracts from `@mymemory/shared` using `@orpc/server`. It strictly guarantees that the API logic adheres to the established contract. The backend is exposed over HTTP using a Hono adapter and designed to run on Vercel or similar Edge/Node platforms.
4. **`apps/mobile` (Frontend)**: The Expo app consumes the `@mymemory/shared` contracts via `@orpc/client` and `@orpc/tanstack-query`. This provides seamless, fully typed React Query hooks (`useQuery`, `useMutation`) that mirror the API logic without redefining types.

## Local Development

From the root of the project, you can start all apps simultaneously using Turborepo:

```bash
pnpm install
pnpm dev
```

This will run `turbo run dev`, starting both the Expo bundler (on port 8081) and the Hono API server.

## Deployments

- **Backend (`apps/server`)**: Deployed to Vercel (or your preferred host). `apps/server/.env` contains sensitive keys like `DATABASE_URL`.
- **Frontend (`apps/mobile`)**: Built and deployed via EAS (Expo Application Services). The root `eas.json` is configured to target `apps/mobile` via the `baseDirectory` property.

## Environment Variables

- **Mobile App**: Environment variables live in `apps/mobile/.env`. Only variables prefixed with `EXPO_PUBLIC_` will be bundled into the app (e.g., `EXPO_PUBLIC_API_URL`).
- **Backend API**: Environment variables live in `apps/server/.env`. These contain secrets and should never be exposed to the client.
